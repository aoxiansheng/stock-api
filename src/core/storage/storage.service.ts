import { promisify } from "util";
import * as zlib from "zlib";

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

import {
  CACHE_TTL,
  CACHE_CONSTANTS,
} from "../../cache/constants/cache.constants";

import {
  STORAGE_ERROR_MESSAGES,
  STORAGE_WARNING_MESSAGES,
  STORAGE_PERFORMANCE_THRESHOLDS,
  STORAGE_DEFAULTS,
} from "./constants/storage.constants";
import {
  CacheInfoDto,
  StorageCacheStatsDto,
  PersistentStatsDto,
  PerformanceStatsDto,
} from "./dto/storage-internal.dto";
import { StoreDataDto, RetrieveDataDto } from "./dto/storage-request.dto";
import { StorageType, DataClassification } from "./enums/storage-type.enum";
import {
  StorageResponseDto,
  StorageStatsDto,
} from "./dto/storage-response.dto";
import { StorageMetadataDto } from "./dto/storage-metadata.dto";
import { StorageRepository } from "./repositories/storage.repository";
import { RedisUtils } from "./utils/redis.util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class StorageService {
  private readonly logger = createLogger(StorageService.name);
  private readonly performanceMetrics = {
    operations: 0,
    totalStorageTime: 0,
    totalRetrievalTime: 0,
    totalDeleteTime: 0,
    errors: 0,
  };

  constructor(private readonly storageRepository: StorageRepository) {}

  async storeData(request: StoreDataDto): Promise<StorageResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `存储数据，键: ${request.key}`,
      sanitizeLogData({
        key: request.key,
        storageType: request.storageType,
        dataClassification: request.dataClassification,
      }),
    );

    try {
      const { serializedData, compressed, dataSize } = await this._compressData(
        request.data,
        request.options?.compress,
      );
      const cacheTtl = request.options?.cacheTtl || CACHE_TTL.DEFAULT;

      // 持久化存储不应该有TTL过期机制
      const expiresAt =
        request.storageType === StorageType.PERSISTENT
          ? undefined // 纯持久化存储不设置过期时间
          : new Date(Date.now() + cacheTtl * 1000); // 缓存和混合存储设置过期时间

      if (
        request.storageType === StorageType.CACHE ||
        request.storageType === StorageType.BOTH
      ) {
        await this.storageRepository.storeInCache(
          request.key,
          serializedData,
          cacheTtl,
          compressed,
        );
      }

      if (
        request.storageType === StorageType.PERSISTENT ||
        request.storageType === StorageType.BOTH
      ) {
        const documentToStore = {
          key: request.key,
          data: compressed
            ? { compressed: true, data: serializedData }
            : JSON.parse(serializedData),
          dataTypeFilter: request.dataClassification.toString(),
          provider: request.provider,
          market: request.market,
          dataSize,
          compressed,
          tags: request.options?.tags,
          expiresAt,
          storedAt: new Date(),
        };

        this.logger.debug(`准备存储到数据库`, {
          key: request.key,
          hasData: !!documentToStore.data,
          dataTypeFilter: documentToStore.dataTypeFilter,
          dataSize: documentToStore.dataSize,
        });

        const storedDocument =
          await this.storageRepository.upsert(documentToStore);

        this.logger.debug(`数据库存储完成`, {
          key: request.key,
          storedId: storedDocument._id,
          storedKey: storedDocument.key,
          success: !!storedDocument,
        });
      }

      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics("store", processingTime, true);

      const metadata = new StorageMetadataDto(
        request.key,
        request.storageType,
        request.dataClassification,
        request.provider,
        request.market,
        dataSize,
        processingTime,
        compressed,
        request.options?.tags,
        expiresAt?.toISOString(),
      );

      this.logStorageSuccess(processingTime, request.key, dataSize, compressed);
      return new StorageResponseDto(request.data, metadata);
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics("store", processingTime, false);
      this.logger.error(
        `数据存储失败: ${request.key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTime,
        }),
      );
      throw new InternalServerErrorException(
        `${STORAGE_ERROR_MESSAGES.STORAGE_FAILED}: ${error.message}`,
      );
    }
  }

  async retrieveData(request: RetrieveDataDto): Promise<StorageResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `检索数据，键: ${request.key}`,
      sanitizeLogData({
        key: request.key,
        preferredType: request.preferredType,
      }),
    );

    this.logger.debug(`检索请求详情`, {
      key: request.key,
      preferredType: request.preferredType,
      updateCache: request.updateCache,
      willTryCache:
        !request.preferredType ||
        request.preferredType === StorageType.CACHE ||
        request.preferredType === StorageType.BOTH,
      willTryPersistent:
        request.preferredType === StorageType.PERSISTENT ||
        request.preferredType === StorageType.BOTH ||
        !request.preferredType,
    });

    try {
      let response: StorageResponseDto;

      // 先尝试缓存（当preferredType为null、CACHE或BOTH时）
      if (
        !request.preferredType ||
        request.preferredType === StorageType.CACHE ||
        request.preferredType === StorageType.BOTH
      ) {
        response = await this.tryRetrieveFromCache(request, startTime);
        if (response) return response;
      }

      // 再尝试数据库（当preferredType为PERSISTENT、BOTH或null时，且缓存未命中）
      if (
        !response &&
        (request.preferredType === StorageType.PERSISTENT ||
          request.preferredType === StorageType.BOTH ||
          !request.preferredType)
      ) {
        response = await this.tryRetrieveFromPersistent(request, startTime);
        if (response) return response;
      }

      this.logger.warn(
        `${STORAGE_ERROR_MESSAGES.DATA_NOT_FOUND}: ${request.key}`,
      );
      throw new NotFoundException(
        `${STORAGE_ERROR_MESSAGES.DATA_NOT_FOUND}: ${request.key}`,
      );
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics("retrieve", processingTime, false);
      this.logger.error(
        `数据检索失败: ${request.key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTime,
        }),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `${STORAGE_ERROR_MESSAGES.RETRIEVAL_FAILED}: ${error.message}`,
      );
    }
  }

  async deleteData(
    key: string,
    storageType: StorageType = StorageType.BOTH,
  ): Promise<boolean> {
    const startTime = Date.now();
    this.logger.log(`删除数据，键: ${key}`, { storageType });

    let deleted = false;
    let hasErrors = false;

    try {
      // 缓存删除
      if (
        storageType === StorageType.CACHE ||
        storageType === StorageType.BOTH
      ) {
        try {
          const cacheDeleted =
            await this.storageRepository.deleteFromCache(key);
          deleted = deleted || cacheDeleted;
          this.logger.log(
            `缓存删除${cacheDeleted ? "成功" : "未找到"}: ${key}`,
          );
        } catch (cacheError) {
          hasErrors = true;
          this.logger.error(
            `缓存删除失败: ${key}`,
            sanitizeLogData({
              error: cacheError.message,
              stack: cacheError.stack,
            }),
          );
          // 继续执行，不中断整个删除过程
        }
      }

      // 持久化删除
      if (
        storageType === StorageType.PERSISTENT ||
        storageType === StorageType.BOTH
      ) {
        try {
          const persistentResult =
            await this.storageRepository.deleteByKey(key);
          const persistentDeleted = persistentResult.deletedCount > 0;
          deleted = deleted || persistentDeleted;
          this.logger.log(
            `持久化删除${persistentDeleted ? "成功" : "未找到"}: ${key}`,
            {
              deletedCount: persistentResult.deletedCount,
            },
          );
        } catch (persistentError) {
          hasErrors = true;
          this.logger.error(
            `持久化删除失败: ${key}`,
            sanitizeLogData({
              error: persistentError.message,
              stack: persistentError.stack,
            }),
          );
          // 继续执行，不中断整个删除过程
        }
      }

      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics("delete", processingTime, !hasErrors);

      this.logger.log(`数据删除完成: ${key}`, {
        deleted,
        hasErrors,
        storageType,
        processingTime,
      });

      return deleted;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics("delete", processingTime, false);
      this.logger.error(
        `数据删除失败: ${key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTime,
        }),
      );

      throw new InternalServerErrorException(
        `${STORAGE_ERROR_MESSAGES.DELETE_FAILED}: ${error.message}`,
      );
    }
  }

  async getStorageStats(): Promise<StorageStatsDto> {
    this.logger.log("生成存储统计信息");
    try {
      const stats = new StorageStatsDto();
      const [cacheStats, persistentStats] = await Promise.all([
        this.getCacheStats(),
        this.getPersistentStats(),
      ]);
      stats.cache = cacheStats;
      stats.persistent = persistentStats;
      stats.performance = this.getPerformanceStats();

      this.logger.log("存储统计信息生成成功");
      return stats;
    } catch (error: any) {
      this.logger.error("生成存储统计信息失败", error);
      throw new InternalServerErrorException(
        `生成存储统计信息失败: ${error.message}`,
      );
    }
  }

  private async tryRetrieveFromCache(
    request: RetrieveDataDto,
    startTime: number,
  ): Promise<StorageResponseDto | null> {
    this.logger.debug(`尝试从缓存检索数据`, {
      key: request.key,
      operation: "tryRetrieveFromCache",
    });

    const { data, metadata, ttl } =
      await this.storageRepository.retrieveFromCache(request.key);

    this.logger.debug(`缓存查询结果`, {
      key: request.key,
      found: !!data,
      hasMetadata: !!metadata,
      ttl,
    });

    if (!data) {
      this.logger.debug(`缓存未命中，将尝试数据库`, { key: request.key });
      return null;
    }

    let parsedData = data;
    let cacheMetadata: { compressed?: boolean; storedAt?: string } = {};

    try {
      if (metadata) cacheMetadata = JSON.parse(metadata);
      if (cacheMetadata.compressed) {
        const buffer = Buffer.from(data, "base64");
        const decompressed = await gunzip(buffer);
        parsedData = JSON.parse(decompressed.toString());
      } else {
        parsedData = JSON.parse(data);
      }
    } catch (parseError) {
      this.logger.warn(
        STORAGE_WARNING_MESSAGES.METADATA_PARSING_FAILED,
        parseError,
      );
      return null; // Data is corrupted, treat as a miss
    }

    const processingTime = Date.now() - startTime;
    this.updatePerformanceMetrics("retrieve", processingTime, true);
    this.logRetrievalSuccess(processingTime, request.key, "cache");

    const responseMetadata = new StorageMetadataDto(
      request.key,
      StorageType.CACHE,
      DataClassification.GENERAL,
      STORAGE_DEFAULTS.PROVIDER,
      STORAGE_DEFAULTS.MARKET,
      Buffer.byteLength(data),
      processingTime,
      cacheMetadata.compressed,
      {},
      new Date(cacheMetadata.storedAt).toISOString(),
    );
    const cacheInfo: CacheInfoDto = {
      hit: true,
      source: "cache",
      ttlRemaining: ttl,
    };
    return new StorageResponseDto(parsedData, responseMetadata, cacheInfo);
  }

  private async tryRetrieveFromPersistent(
    request: RetrieveDataDto,
    startTime: number,
  ): Promise<StorageResponseDto | null> {
    this.logger.debug(`尝试从数据库检索数据`, {
      key: request.key,
      operation: "tryRetrieveFromPersistent",
    });

    const document = await this.storageRepository.findByKey(request.key);

    this.logger.debug(`数据库查询结果`, {
      key: request.key,
      found: !!document,
      documentId: document?._id,
      documentKey: document?.key,
      hasData: !!document?.data,
    });

    if (!document) {
      this.logger.warn(`数据库中未找到数据`, { key: request.key });
      return null;
    }

    let data = document.data;
    if (document.compressed && data.compressed) {
      try {
        const buffer = Buffer.from(data.data, "base64");
        data = JSON.parse((await gunzip(buffer)).toString());
      } catch (error) {
        this.logger.warn("解压持久数据失败", error);
        return null; // Corrupted data
      }
    }

    if (request.updateCache) {
      try {
        await this.storageRepository.storeInCache(
          request.key,
          JSON.stringify(data),
          CACHE_TTL.DEFAULT,
          false,
        );
      } catch (cacheUpdateError) {
        this.logger.warn(
          STORAGE_WARNING_MESSAGES.CACHE_UPDATE_FAILED,
          cacheUpdateError,
        );
      }
    }

    const processingTime = Date.now() - startTime;
    this.updatePerformanceMetrics("retrieve", processingTime, true);
    this.logRetrievalSuccess(processingTime, request.key, "persistent");

    const responseMetadata = new StorageMetadataDto(
      document.key,
      StorageType.PERSISTENT,
      document.dataTypeFilter as any,
      document.provider,
      document.market,
      document.dataSize,
      processingTime,
      document.compressed,
      document.tags,
      document.storedAt.toISOString(),
    );
    const cacheInfo: CacheInfoDto = { hit: true, source: "persistent" };
    return new StorageResponseDto(data, responseMetadata, cacheInfo);
  }

  private async getCacheStats(): Promise<StorageCacheStatsDto> {
    const { info, dbSize } = await this.storageRepository.getCacheStats();
    if (!info) {
      return { totalKeys: 0, totalMemoryUsage: 0, hitRate: 0, avgTtl: 0 };
    }
    const memoryUsage = RedisUtils.extractValueFromInfo(info, "used_memory");
    return {
      totalKeys: dbSize,
      totalMemoryUsage: memoryUsage ? parseInt(memoryUsage, 10) : 0,
      hitRate: this.calculateCacheHitRate(),
      avgTtl: await this.storageRepository.getAverageTtl(),
    };
  }

  private async getPersistentStats(): Promise<PersistentStatsDto> {
    const [totalDocs, categoryStats, providerStats, sizeStats] =
      await Promise.all([
        this.storageRepository.countAll(),
        this.storageRepository.getDataTypeFilterStats(),
        this.storageRepository.getProviderStats(),
        this.storageRepository.getSizeStats(),
      ]);
    return {
      totalDocuments: totalDocs,
      totalSizeBytes: sizeStats[0]?.totalSize || 0,
      categoriesCounts: categoryStats.reduce(
        (acc, item) => ({ ...acc, [item._id]: item.count }),
        {},
      ),
      providerCounts: providerStats.reduce(
        (acc, item) => ({ ...acc, [item._id]: item.count }),
        {},
      ),
    };
  }

  private getPerformanceStats(): PerformanceStatsDto {
    return {
      avgStorageTime:
        this.performanceMetrics.operations > 0
          ? this.performanceMetrics.totalStorageTime /
            this.performanceMetrics.operations
          : 0,
      avgRetrievalTime:
        this.performanceMetrics.operations > 0
          ? this.performanceMetrics.totalRetrievalTime /
            this.performanceMetrics.operations
          : 0,
      operationsPerSecond: this.calculateOperationsPerSecond(),
      errorRate:
        this.performanceMetrics.operations > 0
          ? this.performanceMetrics.errors / this.performanceMetrics.operations
          : 0,
    };
  }

  private async _compressData(
    data: any,
    compressOption: boolean,
  ): Promise<{
    serializedData: string;
    compressed: boolean;
    dataSize: number;
  }> {
    let serializedData = JSON.stringify(data);
    let compressed = false;
    let dataSize = Buffer.byteLength(serializedData, "utf8");

    if (
      compressOption &&
      dataSize > CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB * 1024
    ) {
      try {
        const compressedBuffer = await gzip(serializedData);
        if (
          compressedBuffer.length <
          dataSize * 0.8 // 使用0.8代替CACHE_CONFIG.COMPRESSION_SAVING_RATIO
        ) {
          serializedData = compressedBuffer.toString("base64");
          compressed = true;
          dataSize = compressedBuffer.length;
        }
      } catch (compressionError) {
        this.logger.warn(
          STORAGE_WARNING_MESSAGES.COMPRESSION_SKIPPED,
          compressionError,
        );
      }
    }
    return { serializedData, compressed, dataSize };
  }

  private updatePerformanceMetrics(
    operation: "store" | "retrieve" | "delete",
    time: number,
    success: boolean,
  ): void {
    this.performanceMetrics.operations++;
    if (operation === "store") this.performanceMetrics.totalStorageTime += time;
    else if (operation === "retrieve")
      this.performanceMetrics.totalRetrievalTime += time;
    else if (operation === "delete")
      this.performanceMetrics.totalDeleteTime += time;
    if (!success) this.performanceMetrics.errors++;
  }

  private logStorageSuccess(
    processingTime: number,
    key: string,
    dataSize: number,
    compressed: boolean,
  ) {
    const logLevel =
      processingTime > STORAGE_PERFORMANCE_THRESHOLDS.SLOW_STORAGE_MS
        ? "warn"
        : "log";
    this.logger[logLevel](`数据存储成功: ${key}`, {
      processingTime,
      dataSize,
      compressed,
    });
    if (logLevel === "warn") {
      this.logger.warn(
        `${STORAGE_WARNING_MESSAGES.SLOW_OPERATION}: ${processingTime}ms`,
      );
    }
    if (dataSize > STORAGE_PERFORMANCE_THRESHOLDS.LARGE_DATA_SIZE_KB * 1024) {
      this.logger.warn(
        `${STORAGE_WARNING_MESSAGES.LARGE_DATA_SIZE}: ${Math.round(dataSize / 1024)}KB`,
      );
    }
  }

  private logRetrievalSuccess(
    processingTime: number,
    key: string,
    source: "cache" | "persistent",
  ) {
    const logLevel =
      processingTime > STORAGE_PERFORMANCE_THRESHOLDS.SLOW_RETRIEVAL_MS
        ? "warn"
        : "log";
    this.logger[logLevel](`数据检索成功: ${key}`, { processingTime, source });
    if (logLevel === "warn") {
      this.logger.warn(
        `${STORAGE_WARNING_MESSAGES.SLOW_OPERATION}: ${processingTime}ms`,
      );
    }
  }

  private calculateCacheHitRate(): number {
    return 0.85; // Placeholder
  }

  private calculateOperationsPerSecond(): number {
    return this.performanceMetrics.operations / 60; // Approximation
  }
}
