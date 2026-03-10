import { Injectable } from "@nestjs/common";
import {
  BusinessErrorCode,
  BusinessException,
} from "@common/core/exceptions";
import { createLogger } from "@common/logging/index";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { StorageService } from "../../../04-storage/storage/services/storage.service";
import { StorageType } from "../../../04-storage/storage/enums/storage-type.enum";
import { StoreDataDto } from "../../../04-storage/storage/dto/storage-request.dto";
import { FIELD_MAPPING_CONFIG } from "../../../shared/types/field-naming.types";
import {
  buildSupportListCurrentKey,
  buildSupportListDeltaKey,
  buildSupportListRefreshLockKey,
  buildSupportListMetaKey,
  resolveSupportListMaxItems,
  resolveSupportListMaxPayloadBytes,
  SUPPORT_LIST_DELTA_TTL_SECONDS,
  SUPPORT_LIST_REFRESH_LOCK_TTL_SECONDS,
  SUPPORT_LIST_META_PROVIDER,
  SUPPORT_LIST_RETENTION_DAYS,
} from "../constants/support-list.constants";
import {
  SupportListDiffResult,
  SupportListItemRecord,
} from "./support-list-diff.service";

export interface SupportListHistoryEntry {
  version: string;
  updatedAt: string;
}

export interface SupportListCurrentRecord {
  type: string;
  provider: string;
  version: string;
  updatedAt: string;
  items: SupportListItemRecord[];
}

export interface SupportListMetaRecord {
  type: string;
  currentVersion: string;
  lastUpdated: string;
  retentionDays: number;
  history: SupportListHistoryEntry[];
}

export interface SupportListDeltaRecord extends SupportListDiffResult {
  type: string;
  provider: string;
  from: string;
  to: string;
  updatedAt: string;
}

@Injectable()
export class SupportListStoreService {
  private readonly logger = createLogger(SupportListStoreService.name);
  private readonly supportListMaxItems = resolveSupportListMaxItems();
  private readonly supportListMaxPayloadBytes = resolveSupportListMaxPayloadBytes();

  constructor(private readonly storageService: StorageService) {}

  async readCurrent(type: string): Promise<SupportListCurrentRecord | null> {
    return this.retrieveByKey<SupportListCurrentRecord>(
      buildSupportListCurrentKey(type),
    );
  }

  async readMeta(type: string): Promise<SupportListMetaRecord | null> {
    const record = await this.retrieveByKey<SupportListMetaRecord>(
      buildSupportListMetaKey(type),
    );
    if (!record) {
      return null;
    }
    return {
      ...record,
      retentionDays: record.retentionDays || SUPPORT_LIST_RETENTION_DAYS,
      history: Array.isArray(record.history) ? record.history : [],
    };
  }

  async readDelta(
    type: string,
    toVersion: string,
  ): Promise<SupportListDeltaRecord | null> {
    return this.retrieveByKey<SupportListDeltaRecord>(
      buildSupportListDeltaKey(type, toVersion),
    );
  }

  async writeCurrent(record: SupportListCurrentRecord): Promise<void> {
    this.assertItemsWithinLimit(record.items || [], "current", record.type);
    await this.storeByKey(
      buildSupportListCurrentKey(record.type),
      record,
      record.provider,
      record.type,
    );
  }

  async writeMeta(record: SupportListMetaRecord): Promise<void> {
    await this.storeByKey(
      buildSupportListMetaKey(record.type),
      record,
      SUPPORT_LIST_META_PROVIDER,
      record.type,
    );
  }

  async writeDelta(record: SupportListDeltaRecord): Promise<void> {
    const deltaItemsCount =
      (record.added?.length || 0) +
      (record.updated?.length || 0) +
      (record.removed?.length || 0);
    if (deltaItemsCount > this.supportListMaxItems) {
      throw new Error(
        `support-list delta items 超出上限(${deltaItemsCount}>${this.supportListMaxItems})`,
      );
    }
    await this.storeByKey(
      buildSupportListDeltaKey(record.type, record.to),
      record,
      record.provider,
      record.type,
      SUPPORT_LIST_DELTA_TTL_SECONDS,
    );
  }

  async deleteCurrent(type: string): Promise<void> {
    await this.storageService.deleteData(buildSupportListCurrentKey(type));
  }

  async deleteMeta(type: string): Promise<void> {
    await this.storageService.deleteData(buildSupportListMetaKey(type));
  }

  async tryAcquireRefreshLock(type: string, owner: string): Promise<boolean> {
    return this.storageService.tryAcquirePersistentLease(
      buildSupportListRefreshLockKey(type),
      owner,
      SUPPORT_LIST_REFRESH_LOCK_TTL_SECONDS,
      {
        storageClassification:
          FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION[
            CAPABILITY_NAMES.GET_SUPPORT_LIST
          ],
        provider: SUPPORT_LIST_META_PROVIDER,
        market: type,
        tags: {
          capability: CAPABILITY_NAMES.GET_SUPPORT_LIST,
          lock: "support-list-refresh",
        },
      },
    );
  }

  async releaseRefreshLock(type: string, owner: string): Promise<void> {
    await this.storageService.releasePersistentLease(
      buildSupportListRefreshLockKey(type),
      owner,
    );
  }

  async extendRefreshLock(type: string, owner: string): Promise<boolean> {
    return this.storageService.renewPersistentLease(
      buildSupportListRefreshLockKey(type),
      owner,
      SUPPORT_LIST_REFRESH_LOCK_TTL_SECONDS,
    );
  }

  async isRefreshLockOwnedBy(type: string, owner: string): Promise<boolean> {
    const lockData = await this.retrieveByKey<{ owner?: string }>(
      buildSupportListRefreshLockKey(type),
    );
    return lockData?.owner === owner;
  }

  private async retrieveByKey<T>(key: string): Promise<T | null> {
    try {
      const result = await this.storageService.retrieveData({
        key,
        preferredType: StorageType.PERSISTENT,
      });
      return (result?.data || null) as T | null;
    } catch (error) {
      if (
        BusinessException.isBusinessException(error) &&
        error.errorCode === BusinessErrorCode.DATA_NOT_FOUND
      ) {
        return null;
      }
      this.logger.warn("读取 support-list 存储失败", {
        key,
        error: (error as Error)?.message || String(error),
      });
      throw error;
    }
  }

  private async storeByKey(
    key: string,
    data: object,
    provider: string,
    market: string,
    persistentTtlSeconds?: number,
  ): Promise<void> {
    this.assertPayloadBytesWithinLimit(key, data);
    const storageRequest: StoreDataDto = {
      key,
      data,
      storageType: StorageType.PERSISTENT,
      storageClassification:
        FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION[
          CAPABILITY_NAMES.GET_SUPPORT_LIST
        ],
      provider,
      market,
      options: {
        compress: true,
        persistentTtlSeconds,
        tags: {
          capability: CAPABILITY_NAMES.GET_SUPPORT_LIST,
          market,
        },
      },
    };

    await this.storageService.storeData(storageRequest);
  }

  private assertItemsWithinLimit(
    items: unknown[],
    scope: string,
    type: string,
  ): void {
    if (items.length <= this.supportListMaxItems) {
      return;
    }
    throw new Error(
      `support-list ${scope} items 超出上限(${items.length}>${this.supportListMaxItems}) type=${type}`,
    );
  }

  private assertPayloadBytesWithinLimit(key: string, payload: unknown): void {
    const payloadBytes = this.calculatePayloadBytes(payload);
    if (payloadBytes <= this.supportListMaxPayloadBytes) {
      return;
    }
    throw new Error(
      `support-list payload 超出上限(${payloadBytes}>${this.supportListMaxPayloadBytes}) key=${key}`,
    );
  }

  private calculatePayloadBytes(payload: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(payload ?? null), "utf8");
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }
}
