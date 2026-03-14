import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  assertSupportListTypeSupported,
  buildSupportListVersion,
  parseSupportListTimestampVersion,
  resolveSupportListMaxItems,
  resolveSupportListMaxPayloadBytes,
  SUPPORT_LIST_REFRESH_LOCK_TTL_SECONDS,
  SUPPORT_LIST_RETENTION_DAYS,
  SUPPORT_LIST_TYPES,
  SUPPORT_LIST_VERSION_PATTERN,
} from "../constants/support-list.constants";
import {
  SupportListDiffService,
  SupportListDiffResult,
} from "./support-list-diff.service";
import {
  SupportListCurrentRecord,
  SupportListHistoryEntry,
  SupportListMetaRecord,
  SupportListStoreService,
} from "./support-list-store.service";
import { SupportListFetchGatewayService } from "./support-list-fetch-gateway.service";

interface RefreshLockHeartbeatState {
  lost: boolean;
  stopped: boolean;
  pendingRenewal: Promise<void> | null;
}

interface RefreshLockHeartbeat {
  timer: NodeJS.Timeout;
  state: RefreshLockHeartbeatState;
}

@Injectable()
export class SupportListSyncService {
  private readonly logger = createLogger(SupportListSyncService.name);
  private readonly refreshLockWaitTimeoutMs = this.getPositiveIntEnv(
    "SUPPORT_LIST_REFRESH_LOCK_WAIT_TIMEOUT_MS",
    5000,
  );
  private readonly refreshLockPollIntervalMs = this.getPositiveIntEnv(
    "SUPPORT_LIST_REFRESH_LOCK_POLL_INTERVAL_MS",
    200,
  );
  private readonly supportListMaxItems = resolveSupportListMaxItems();
  private readonly supportListMaxPayloadBytes = resolveSupportListMaxPayloadBytes();
  private readonly refreshInFlightByType = new Map<
    string,
    Promise<SupportListMetaRecord>
  >();

  constructor(
    private readonly supportListFetchGatewayService: SupportListFetchGatewayService,
    private readonly supportListStoreService: SupportListStoreService,
    private readonly supportListDiffService: SupportListDiffService,
  ) {}

  async ensureTypeInitialized(type: string): Promise<void> {
    const normalizedType = assertSupportListTypeSupported(type);
    const [meta, current] = await Promise.all([
      this.supportListStoreService.readMeta(normalizedType),
      this.supportListStoreService.readCurrent(normalizedType),
    ]);
    if (meta && current && meta.currentVersion === current.version) {
      return;
    }
    if (meta && current && meta.currentVersion !== current.version) {
      this.logger.warn("support-list 初始化检测到 meta/current 失配，触发自愈刷新", {
        type: normalizedType,
        metaCurrentVersion: meta.currentVersion,
        currentVersion: current.version,
      });
    }
    await this.refreshType(normalizedType);
  }

  async refreshAllTypes(): Promise<void> {
    for (const type of SUPPORT_LIST_TYPES) {
      try {
        await this.refreshType(type);
      } catch (error) {
        this.logger.warn("support-list 定时刷新失败(单类型已忽略)", {
          type,
          error: (error as Error)?.message || String(error),
        });
      }
    }
  }

  async refreshType(type: string): Promise<SupportListMetaRecord> {
    const normalizedType = assertSupportListTypeSupported(type);
    const inFlightRefresh = this.refreshInFlightByType.get(normalizedType);
    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    const refreshPromise = this.refreshTypeInternal(normalizedType);
    this.refreshInFlightByType.set(normalizedType, refreshPromise);
    refreshPromise
      .finally(() => {
        if (this.refreshInFlightByType.get(normalizedType) === refreshPromise) {
          this.refreshInFlightByType.delete(normalizedType);
        }
      })
      .catch(() => undefined);
    return refreshPromise;
  }

  private async refreshTypeInternal(
    normalizedType: string,
  ): Promise<SupportListMetaRecord> {
    const lockOwner = this.buildRefreshLockOwner();
    const lockAcquired = await this.supportListStoreService.tryAcquireRefreshLock(
      normalizedType,
      lockOwner,
    );
    if (!lockAcquired) {
      this.logger.warn("support-list 刷新锁被占用，等待其他实例完成", {
        type: normalizedType,
      });
      const existingMeta = await this.waitForMetaAfterLockMiss(normalizedType);
      if (existingMeta) {
        return existingMeta;
      }
      throw new ServiceUnavailableException(
        `support-list type=${normalizedType} 初始化中，请稍后重试`,
      );
    }
    const heartbeat = this.startRefreshLockHeartbeat(normalizedType, lockOwner);

    try {
    const [previousMeta, previousCurrent] = await Promise.all([
      this.supportListStoreService.readMeta(normalizedType),
      this.supportListStoreService.readCurrent(normalizedType),
    ]);

    const fetched =
      await this.supportListFetchGatewayService.fetchFullList(normalizedType);
    this.assertFetchedPayloadWithinLimit(
      normalizedType,
      fetched.provider,
      fetched.items,
    );
    await this.checkpointRefreshLock(heartbeat, normalizedType, lockOwner);
    const now = new Date();
    const nowIso = now.toISOString();
    const previousVersionForNext = this.selectVersionBaseline(
      previousCurrent?.version,
      previousMeta?.currentVersion,
    );
    const version = this.buildNextVersion(previousVersionForNext, now);

    const currentRecord: SupportListCurrentRecord = {
      type: normalizedType,
      provider: fetched.provider,
      version,
      updatedAt: nowIso,
      items: fetched.items,
    };

    const metaAheadOfCurrent =
      !!previousMeta?.currentVersion &&
      !!previousCurrent?.version &&
      previousMeta.currentVersion > previousCurrent.version;
    const fromVersion = metaAheadOfCurrent
      ? ""
      : (previousCurrent?.version || "");
    if (metaAheadOfCurrent) {
      this.logger.warn("support-list 检测到 meta 领先于 current，跳过本轮增量写入", {
        type: normalizedType,
        metaCurrentVersion: previousMeta?.currentVersion || null,
        currentVersion: previousCurrent?.version || null,
      });
    }
    if (fromVersion && previousCurrent?.items) {
      await this.checkpointRefreshLock(heartbeat, normalizedType, lockOwner);
      const diff = this.supportListDiffService.diff(
        previousCurrent.items,
        fetched.items,
        normalizedType,
      );
      await this.supportListStoreService.writeDelta({
        type: normalizedType,
        provider: fetched.provider,
        from: fromVersion,
        to: version,
        updatedAt: nowIso,
        ...diff,
      });
      this.logDiffSummary(normalizedType, fromVersion, version, diff);
    }

    const history = this.buildHistory(
      this.extendHistoryWithPreviousCurrent(previousMeta?.history || [], previousCurrent),
      { version, updatedAt: nowIso },
      now,
    );
    const metaRecord: SupportListMetaRecord = {
      type: normalizedType,
      currentVersion: version,
      lastUpdated: nowIso,
      retentionDays: SUPPORT_LIST_RETENTION_DAYS,
      history,
    };
    await this.checkpointRefreshLock(heartbeat, normalizedType, lockOwner);
    await this.writeCurrentAndMetaWithCompensation(
      normalizedType,
      currentRecord,
      metaRecord,
      lockOwner,
      previousCurrent,
    );

    this.logger.log("support-list 刷新完成", {
      type: normalizedType,
      provider: fetched.provider,
      version,
      count: fetched.items.length,
      historySize: history.length,
    });

    return metaRecord;
    } finally {
      await this.stopRefreshLockHeartbeat(heartbeat);
      await this.releaseRefreshLockSafe(normalizedType, lockOwner);
    }
  }

  private buildHistory(
    previousHistory: SupportListHistoryEntry[],
    current: SupportListHistoryEntry,
    now: Date,
  ): SupportListHistoryEntry[] {
    const cutoffTime =
      now.getTime() - SUPPORT_LIST_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const historyMap = new Map<string, SupportListHistoryEntry>();

    for (const entry of previousHistory || []) {
      const entryTime = Date.parse(entry.updatedAt);
      if (!Number.isFinite(entryTime) || entryTime < cutoffTime) {
        continue;
      }
      historyMap.set(entry.version, entry);
    }

    historyMap.set(current.version, current);

    return Array.from(historyMap.values()).sort((a, b) => {
      const versionCompare = a.version.localeCompare(b.version);
      if (versionCompare !== 0) {
        return versionCompare;
      }
      return a.updatedAt.localeCompare(b.updatedAt);
    });
  }

  private buildNextVersion(previousVersion: string | undefined, now: Date): string {
    const candidate = buildSupportListVersion(now);
    this.assertVersionFormat(candidate, "candidate");
    if (!previousVersion) {
      return candidate;
    }

    this.assertVersionFormat(previousVersion, "previous");
    if (candidate > previousVersion) {
      return candidate;
    }
    const previousParsed = parseSupportListTimestampVersion(previousVersion);
    if (!previousParsed) {
      throw new Error(`support-list previous version 时间语义非法: ${previousVersion}`);
    }
    const nextVersion = buildSupportListVersion(
      new Date(previousParsed.getTime() + 1000),
    );
    this.assertVersionFormat(nextVersion, "next");
    return nextVersion;
  }

  private selectVersionBaseline(
    previousCurrentVersion?: string,
    previousMetaVersion?: string,
  ): string | undefined {
    const currentVersion = previousCurrentVersion || "";
    const metaVersion = previousMetaVersion || "";
    if (!currentVersion) {
      return metaVersion || undefined;
    }
    if (!metaVersion) {
      return currentVersion;
    }
    this.assertVersionFormat(currentVersion, "previousCurrent");
    this.assertVersionFormat(metaVersion, "previousMeta");
    return currentVersion >= metaVersion ? currentVersion : metaVersion;
  }

  private extendHistoryWithPreviousCurrent(
    previousHistory: SupportListHistoryEntry[],
    previousCurrent: SupportListCurrentRecord | null,
  ): SupportListHistoryEntry[] {
    if (!previousCurrent) {
      return previousHistory;
    }
    this.assertVersionFormat(previousCurrent.version, "previousCurrent");
    return [
      ...previousHistory,
      {
        version: previousCurrent.version,
        updatedAt: previousCurrent.updatedAt,
      },
    ];
  }

  private assertVersionFormat(version: string, field: string): void {
    if (!SUPPORT_LIST_VERSION_PATTERN.test(version)) {
      throw new Error(`support-list ${field} version 非法: ${version}`);
    }
  }

  private logDiffSummary(
    type: string,
    from: string,
    to: string,
    diff: SupportListDiffResult,
  ): void {
    this.logger.log("support-list 增量生成完成", {
      type,
      from,
      to,
      added: diff.added.length,
      updated: diff.updated.length,
      removed: diff.removed.length,
    });
  }

  private buildRefreshLockOwner(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async waitForMetaAfterLockMiss(
    type: string,
  ): Promise<SupportListMetaRecord | null> {
    const deadline = Date.now() + this.refreshLockWaitTimeoutMs;
    while (Date.now() <= deadline) {
      const [meta, current] = await Promise.all([
        this.supportListStoreService.readMeta(type),
        this.supportListStoreService.readCurrent(type),
      ]);
      if (meta && current && meta.currentVersion === current.version) {
        return meta;
      }
      await this.sleep(this.refreshLockPollIntervalMs);
    }
    return null;
  }

  private async releaseRefreshLockSafe(type: string, owner: string): Promise<void> {
    try {
      await this.supportListStoreService.releaseRefreshLock(type, owner);
    } catch (error) {
      this.logger.warn("support-list 刷新锁释放失败", {
        type,
        owner,
        error: (error as Error)?.message || String(error),
      });
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private assertFetchedPayloadWithinLimit(
    type: string,
    provider: string,
    items: unknown[],
  ): void {
    if (items.length > this.supportListMaxItems) {
      throw new ServiceUnavailableException(
        `support-list type=${type} provider=${provider} items 超出上限(${items.length}>${this.supportListMaxItems})`,
      );
    }
    const payloadBytes = this.calculatePayloadBytes(items);
    if (payloadBytes > this.supportListMaxPayloadBytes) {
      throw new ServiceUnavailableException(
        `support-list type=${type} provider=${provider} payload 超出上限(${payloadBytes}>${this.supportListMaxPayloadBytes})`,
      );
    }
  }

  private calculatePayloadBytes(payload: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(payload ?? null), "utf8");
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  private getPositiveIntEnv(envKey: string, fallback: number): number {
    const raw = process.env[envKey];
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private startRefreshLockHeartbeat(
    type: string,
    owner: string,
  ): RefreshLockHeartbeat {
    const state: RefreshLockHeartbeatState = {
      lost: false,
      stopped: false,
      pendingRenewal: null,
    };
    const intervalMs = Math.max(
      1000,
      Math.floor((SUPPORT_LIST_REFRESH_LOCK_TTL_SECONDS * 1000) / 3),
    );
    const timer = setInterval(() => {
      if (state.stopped || state.pendingRenewal) {
        return;
      }
      state.pendingRenewal = this.supportListStoreService
        .extendRefreshLock(type, owner)
        .then((renewed) => {
          if (!renewed) {
            state.lost = true;
            this.logger.warn("support-list 刷新锁续租失败", { type, owner });
          }
        })
        .catch((error) => {
          state.lost = true;
          this.logger.warn("support-list 刷新锁续租异常", {
            type,
            owner,
            error: (error as Error)?.message || String(error),
          });
        })
        .finally(() => {
          state.pendingRenewal = null;
        });
    }, intervalMs);

    if (typeof timer.unref === "function") {
      timer.unref();
    }
    return { timer, state };
  }

  private async stopRefreshLockHeartbeat(
    heartbeat: RefreshLockHeartbeat,
  ): Promise<void> {
    heartbeat.state.stopped = true;
    clearInterval(heartbeat.timer);
    if (heartbeat.state.pendingRenewal) {
      await heartbeat.state.pendingRenewal;
    }
  }

  private assertRefreshLockActive(
    state: RefreshLockHeartbeatState,
    type: string,
  ): void {
    if (!state.lost) {
      return;
    }
    throw new ServiceUnavailableException(
      `support-list type=${type} 刷新锁续租失败，已中止本次刷新`,
    );
  }

  private async awaitRefreshLockAndAssert(
    heartbeat: RefreshLockHeartbeat,
    type: string,
  ): Promise<void> {
    if (heartbeat.state.pendingRenewal) {
      await heartbeat.state.pendingRenewal;
    }
    this.assertRefreshLockActive(heartbeat.state, type);
  }

  private async checkpointRefreshLock(
    heartbeat: RefreshLockHeartbeat,
    type: string,
    owner: string,
  ): Promise<void> {
    await this.awaitRefreshLockAndAssert(heartbeat, type);
    if (heartbeat.state.pendingRenewal) {
      await heartbeat.state.pendingRenewal;
    }

    heartbeat.state.pendingRenewal = this.supportListStoreService
      .extendRefreshLock(type, owner)
      .then((renewed) => {
        if (!renewed) {
          heartbeat.state.lost = true;
          this.logger.warn("support-list 写入前锁检查点续租失败", { type, owner });
        }
      })
      .catch((error) => {
        heartbeat.state.lost = true;
        this.logger.warn("support-list 写入前锁检查点续租异常", {
          type,
          owner,
          error: (error as Error)?.message || String(error),
        });
      })
      .finally(() => {
        heartbeat.state.pendingRenewal = null;
      });

    await heartbeat.state.pendingRenewal;
    const ownerMatched = await this.supportListStoreService.isRefreshLockOwnedBy(
      type,
      owner,
    );
    if (!ownerMatched) {
      heartbeat.state.lost = true;
      this.logger.warn("support-list 写入前锁所有权校验失败", { type, owner });
    }
    this.assertRefreshLockActive(heartbeat.state, type);
  }

  private async writeCurrentAndMetaWithCompensation(
    type: string,
    currentRecord: SupportListCurrentRecord,
    metaRecord: SupportListMetaRecord,
    lockOwner: string,
    previousCurrent: SupportListCurrentRecord | null,
  ): Promise<void> {
    let currentWritten = false;
    try {
      await this.assertRefreshLockOwnership(type, lockOwner);
      await this.supportListStoreService.writeCurrent(currentRecord);
      currentWritten = true;
      await this.assertRefreshLockOwnership(type, lockOwner);
      await this.supportListStoreService.writeMeta(metaRecord);
    } catch (error) {
      await this.rollbackCurrentAndMeta(
        type,
        lockOwner,
        previousCurrent,
        currentWritten,
      );
      throw error;
    }
  }

  private async assertRefreshLockOwnership(
    type: string,
    owner: string,
  ): Promise<void> {
    const owned = await this.supportListStoreService.isRefreshLockOwnedBy(
      type,
      owner,
    );
    if (owned) {
      return;
    }
    throw new ServiceUnavailableException(
      `support-list type=${type} 刷新锁所有权校验失败，已中止本次刷新`,
    );
  }

  private async rollbackCurrentAndMeta(
    type: string,
    lockOwner: string,
    previousCurrent: SupportListCurrentRecord | null,
    currentWritten: boolean,
  ): Promise<void> {
    try {
      const ownerStillHeld = await this.supportListStoreService.isRefreshLockOwnedBy(
        type,
        lockOwner,
      );
      if (!ownerStillHeld) {
        this.logger.warn("support-list 补偿阶段检测到锁已失效，跳过回滚写入", {
          type,
          lockOwner,
        });
        return;
      }
      if (currentWritten) {
        if (previousCurrent) {
          await this.supportListStoreService.writeCurrent(previousCurrent);
        } else {
          await this.supportListStoreService.deleteCurrent(type);
        }
      }
    } catch (rollbackError) {
      this.logger.error("support-list 写入补偿失败", {
        type,
        currentWritten,
        rollbackError:
          (rollbackError as Error)?.message || String(rollbackError),
      });
    }
  }
}
