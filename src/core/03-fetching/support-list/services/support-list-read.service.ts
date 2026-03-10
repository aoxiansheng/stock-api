import { Injectable, BadRequestException, HttpStatus } from "@nestjs/common";
import { BusinessException, ComponentIdentifier } from "@common/core/exceptions";
import { createLogger } from "@common/logging/index";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";
import {
  assertSupportListTypeSupported,
  parseSupportListTimestampVersion,
  SUPPORT_LIST_RETENTION_DAYS,
} from "../constants/support-list.constants";
import {
  SupportListCurrentRecord,
  SupportListDeltaRecord,
  SupportListMetaRecord,
  SupportListStoreService,
} from "./support-list-store.service";
import { SupportListItemRecord } from "./support-list-diff.service";
import { SupportListSyncService } from "./support-list-sync.service";

type SymbolChangeState =
  | { kind: "added"; item: SupportListItemRecord }
  | { kind: "updated"; item: SupportListItemRecord }
  | { kind: "removed" };

export interface SupportListMetaReadRequest {
  type: string;
}

export interface SupportListReadRequest extends SupportListMetaReadRequest {
  since?: string;
  symbols?: string[];
}

export interface SupportListMetaReadResponse {
  type: string;
  currentVersion: string;
  lastUpdated: string;
  retentionDays: number;
}

export interface SupportListFullReadResponse {
  full: true;
  version: string;
  items: SupportListItemRecord[];
}

export interface SupportListDeltaReadResponse {
  full: false;
  from: string;
  to: string;
  added: SupportListItemRecord[];
  updated: SupportListItemRecord[];
  removed: string[];
}

@Injectable()
export class SupportListReadService {
  private readonly logger = createLogger(SupportListReadService.name);

  constructor(
    private readonly supportListStoreService: SupportListStoreService,
    private readonly supportListSyncService: SupportListSyncService,
  ) {}

  async getMeta(
    request: SupportListMetaReadRequest,
  ): Promise<SupportListMetaReadResponse> {
    const type = assertSupportListTypeSupported(request.type);
    await this.supportListSyncService.ensureTypeInitialized(type);

    const { meta, current, isVersionAligned } =
      await this.readMetaCurrentSnapshot(type);
    if (!meta && !current) {
      throw new BadRequestException(`type=${type} 暂无可用版本`);
    }

    if (current && (!meta || !isVersionAligned)) {
      this.logVersionMismatch(type, null, meta, current, "getMeta 使用 current 视角");
      return {
        type,
        currentVersion: current.version,
        lastUpdated: current.updatedAt,
        retentionDays: meta?.retentionDays || SUPPORT_LIST_RETENTION_DAYS,
      };
    }

    if (!meta) {
      throw new BadRequestException(`type=${type} 暂无可用版本`);
    }

    return {
      type,
      currentVersion: meta.currentVersion,
      lastUpdated: meta.lastUpdated,
      retentionDays: meta.retentionDays,
    };
  }

  async getSupportList(
    request: SupportListReadRequest,
  ): Promise<SupportListFullReadResponse | SupportListDeltaReadResponse> {
    const type = assertSupportListTypeSupported(request.type);
    await this.supportListSyncService.ensureTypeInitialized(type);

    const { meta, current, isVersionAligned } =
      await this.readMetaCurrentSnapshot(type);
    if (!meta || !current) {
      throw new BadRequestException(`type=${type} 暂无可用数据`);
    }

    const since = request.since;
    if (since) {
      this.validateSince(since, current.version);
    }
    const symbolSet = this.buildSymbolSet(request.symbols);

    if (since && isVersionAligned) {
      const historyTailVersion = meta.history[meta.history.length - 1]?.version;
      if (historyTailVersion !== meta.currentVersion) {
        this.throwResyncRequired(
          type,
          since,
          meta.currentVersion,
          "HISTORY_TAIL_VERSION_MISMATCH",
        );
      }
    }
    if (since && isVersionAligned && since === current.version) {
      return this.buildEmptyDeltaResponse(since, current.version);
    }

    if (!isVersionAligned) {
      if (since) {
        this.logVersionMismatch(
          type,
          since,
          meta,
          current,
          "返回 409，要求重同步",
        );
        this.throwResyncRequired(
          type,
          since,
          current.version,
          "META_CURRENT_VERSION_MISMATCH",
        );
      }
      this.logVersionMismatch(type, since, meta, current, "无 since 回退全量");
      return this.buildFullResponse(current.version, current.items, symbolSet);
    }

    if (!since) {
      return this.buildFullResponse(current.version, current.items, symbolSet);
    }

    if (since === meta.currentVersion) {
      return this.buildEmptyDeltaResponse(since, meta.currentVersion);
    }

    const sinceIndex = meta.history.findIndex(
      (entry) => entry.version === since,
    );
    if (sinceIndex < 0) {
      this.throwResyncRequired(
        type,
        since,
        meta.currentVersion,
        "SINCE_NOT_FOUND_IN_HISTORY",
      );
    }

    const targetVersions = meta.history
      .slice(sinceIndex + 1)
      .map((entry) => entry.version);
    if (targetVersions.length === 0) {
      return this.buildEmptyDeltaResponse(since, meta.currentVersion);
    }
    if (targetVersions[targetVersions.length - 1] !== meta.currentVersion) {
      this.throwResyncRequired(
        type,
        since,
        meta.currentVersion,
        "TARGET_VERSION_MISMATCH",
      );
    }

    const deltas: SupportListDeltaRecord[] = [];
    for (const toVersion of targetVersions) {
      const delta = await this.supportListStoreService.readDelta(type, toVersion);
      if (!delta) {
        this.logger.warn("support-list 增量链路缺失，返回 409 要求重同步", {
          type,
          since,
          missingDeltaVersion: toVersion,
        });
        this.throwResyncRequired(
          type,
          since,
          meta.currentVersion,
          "DELTA_CHAIN_BROKEN",
        );
      }
      deltas.push(delta);
    }

    const aggregated = this.aggregateDeltas(deltas);
    return {
      full: false,
      from: since,
      to: meta.currentVersion,
      added: this.filterItemsBySymbolSet(aggregated.added, symbolSet),
      updated: this.filterItemsBySymbolSet(aggregated.updated, symbolSet),
      removed: this.filterRemovedBySymbolSet(aggregated.removed, symbolSet),
    };
  }

  private buildFullResponse(
    version: string,
    items: SupportListItemRecord[],
    symbolSet: Set<string> | null,
  ): SupportListFullReadResponse {
    const dedupedItems = this.deduplicateItemsBySymbolLastWin(items);
    return {
      full: true,
      version,
      items: this.filterItemsBySymbolSet(dedupedItems, symbolSet),
    };
  }

  private buildEmptyDeltaResponse(
    from: string,
    to: string,
  ): SupportListDeltaReadResponse {
    return {
      full: false,
      from,
      to,
      added: [],
      updated: [],
      removed: [],
    };
  }

  private aggregateDeltas(deltas: SupportListDeltaRecord[]): {
    added: SupportListItemRecord[];
    updated: SupportListItemRecord[];
    removed: string[];
  } {
    const stateBySymbol = new Map<string, SymbolChangeState>();

    for (const delta of deltas) {
      for (const item of delta.added || []) {
        const symbol = this.extractSymbol(item);
        if (!symbol) {
          continue;
        }

        const existing = stateBySymbol.get(symbol);
        if (!existing) {
          stateBySymbol.set(symbol, { kind: "added", item });
          continue;
        }

        if (existing.kind === "removed") {
          stateBySymbol.set(symbol, { kind: "updated", item });
          continue;
        }

        stateBySymbol.set(symbol, { kind: existing.kind, item });
      }

      for (const item of delta.updated || []) {
        const symbol = this.extractSymbol(item);
        if (!symbol) {
          continue;
        }

        const existing = stateBySymbol.get(symbol);
        if (!existing) {
          stateBySymbol.set(symbol, { kind: "updated", item });
          continue;
        }

        if (existing.kind === "added") {
          stateBySymbol.set(symbol, { kind: "added", item });
          continue;
        }

        stateBySymbol.set(symbol, { kind: "updated", item });
      }

      for (const symbolRaw of delta.removed || []) {
        const symbol = this.normalizeSymbol(symbolRaw);
        if (!symbol) {
          continue;
        }

        const existing = stateBySymbol.get(symbol);
        if (!existing) {
          stateBySymbol.set(symbol, { kind: "removed" });
          continue;
        }

        if (existing.kind === "added") {
          stateBySymbol.delete(symbol);
          continue;
        }

        stateBySymbol.set(symbol, { kind: "removed" });
      }
    }

    const added: SupportListItemRecord[] = [];
    const updated: SupportListItemRecord[] = [];
    const removed: string[] = [];

    for (const [symbol, state] of stateBySymbol.entries()) {
      if (state.kind === "added") {
        added.push({
          ...state.item,
          symbol,
        });
      } else if (state.kind === "updated") {
        updated.push({
          ...state.item,
          symbol,
        });
      } else {
        removed.push(symbol);
      }
    }

    return {
      added: this.sortItemsBySymbol(added),
      updated: this.sortItemsBySymbol(updated),
      removed: removed.sort((a, b) => a.localeCompare(b)),
    };
  }

  private sortItemsBySymbol(
    items: SupportListItemRecord[],
  ): SupportListItemRecord[] {
    return [...items].sort((a, b) =>
      this.extractSymbol(a).localeCompare(this.extractSymbol(b)),
    );
  }

  private buildSymbolSet(symbols?: string[]): Set<string> | null {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return null;
    }
    return new Set(symbols.map((symbol) => this.normalizeSymbol(symbol)));
  }

  private filterItemsBySymbolSet(
    items: SupportListItemRecord[],
    symbolSet: Set<string> | null,
  ): SupportListItemRecord[] {
    if (!symbolSet) {
      return items;
    }
    return items.filter((item) => symbolSet.has(this.extractSymbol(item)));
  }

  private deduplicateItemsBySymbolLastWin(
    items: SupportListItemRecord[],
  ): SupportListItemRecord[] {
    const deduplicated = new Map<string, SupportListItemRecord>();
    for (const item of items || []) {
      const symbol = this.extractSymbol(item);
      if (!symbol) {
        continue;
      }
      if (deduplicated.has(symbol)) {
        deduplicated.delete(symbol);
      }
      deduplicated.set(symbol, {
        ...item,
        symbol,
      });
    }
    return [...deduplicated.values()];
  }

  private filterRemovedBySymbolSet(
    removed: string[],
    symbolSet: Set<string> | null,
  ): string[] {
    if (!symbolSet) {
      return removed;
    }
    return removed.filter((symbol) => symbolSet.has(this.normalizeSymbol(symbol)));
  }

  private validateSince(since: string, currentVersion?: string): void {
    const parsed = parseSupportListTimestampVersion(since);
    if (!parsed) {
      throw new BadRequestException("since 必须是 14 位版本号(YYYYMMDDHHmmss)");
    }
    if (parsed.getTime() > Date.now()) {
      const currentParsed = currentVersion
        ? parseSupportListTimestampVersion(currentVersion)
        : null;
      const allowFutureSinceWithinCurrentFutureWindow =
        !!currentParsed &&
        currentParsed.getTime() > Date.now() &&
        since <= currentVersion;
      if (allowFutureSinceWithinCurrentFutureWindow) {
        return;
      }
      throw new BadRequestException("since 不能是未来时间");
    }
  }

  private throwResyncRequired(
    type: string,
    since: string,
    currentVersion: string,
    reason: string,
  ): never {
    throw new BusinessException({
      message: "since 对应版本链不可用，请先执行不带 since 的全量同步后重试",
      errorCode: "SUPPORT_LIST_RESYNC_REQUIRED",
      operation: "getSupportList",
      component: ComponentIdentifier.DATA_FETCHER,
      statusCode: HttpStatus.CONFLICT,
      context: {
        type,
        since,
        currentVersion,
        reason,
      },
    });
  }

  private async readMetaCurrentSnapshot(type: string): Promise<{
    meta: SupportListMetaRecord | null;
    current: SupportListCurrentRecord | null;
    isVersionAligned: boolean;
  }> {
    const [meta, current] = await Promise.all([
      this.supportListStoreService.readMeta(type),
      this.supportListStoreService.readCurrent(type),
    ]);
    return {
      meta,
      current,
      isVersionAligned: !!meta && !!current && meta.currentVersion === current.version,
    };
  }

  private logVersionMismatch(
    type: string,
    since: string | null | undefined,
    meta: SupportListMetaRecord | null,
    current: SupportListCurrentRecord | null,
    decision: string,
  ): void {
    this.logger.warn("support-list meta/current 版本不一致", {
      type,
      since: since || null,
      decision,
      metaCurrentVersion: meta?.currentVersion || null,
      currentVersion: current?.version || null,
    });
  }

  private normalizeSymbol(value: unknown): string {
    return typeof value === "string"
      ? SymbolValidationUtils.normalizeSymbol(value)
      : "";
  }

  private extractSymbol(item: SupportListItemRecord): string {
    return this.normalizeSymbol(item?.symbol);
  }
}
