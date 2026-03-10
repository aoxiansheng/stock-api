import { promisify } from "util";
import zlib from "zlib";

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

// 统一错误处理基础设施
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
  BusinessException,
} from "@common/core/exceptions";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";


import { STORAGE_CONFIG, STORAGE_WARNING_MESSAGES } from "../constants/storage.constants";
import { CacheInfoDto, PersistentStatsDto } from "../dto/storage-internal.dto";
import { StoreDataDto, RetrieveDataDto } from "../dto/storage-request.dto";
import { StorageQueryDto } from "../dto/storage-query.dto";
import { StorageType } from "../enums/storage-type.enum";
import {
  StorageResponseDto,
  StorageStatsDto,
  PaginatedStorageItemDto,
} from "../dto/storage-response.dto";
import { StorageMetadataDto } from "../dto/storage-metadata.dto";
import { StorageRepository } from "../repositories/storage.repository";
import { StandardRetry, PersistentRetry } from "../decorators/retryable.decorator";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class StorageService {
  private readonly logger = createLogger(StorageService.name);

  constructor(
    private readonly storageRepository: StorageRepository,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 数据库持久化存储
   * 🎯 重构后：仅负责数据库写入，不再处理缓存操作
   * @param request 存储请求（仅支持PERSISTENT类型）
   * @returns 存储响应
   */
  @PersistentRetry('storeData')
  async storeData(request: StoreDataDto): Promise<StorageResponseDto> {
    const startTime = Date.now();

    // 🎯 重构后：仅支持数据库存储
    if (request.storageType !== StorageType.PERSISTENT) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'storeData',
        message: 'StorageService only supports PERSISTENT storage type. Use StandardizedCacheService for cache operations.',
        context: {
          requestedStorageType: request.storageType,
          supportedTypes: [StorageType.PERSISTENT],
          alternativeService: 'StandardizedCacheService'
        }
      });
    }

    this.validateReservedTags(request.options?.tags, 'storeData');

    this.logger.log(
      `存储数据到数据库，键: ${request.key}`,
      sanitizeLogData({
        key: request.key,
        storageClassification: request.storageClassification,
      }),
    );

    try {
      const { serializedData, compressed, dataSize } = await this._compressData(
        request.data,
        request.options?.compress,
      );

      // 🎯 重构后：支持可选的TTL过期机制
      const expiresAt = request.options?.persistentTtlSeconds
        ? new Date(Date.now() + request.options.persistentTtlSeconds * 1000)
        : undefined;

      const documentToStore = {
        key: request.key,
        data: compressed
          ? serializedData // Store as base64 string directly when compressed
          : JSON.parse(serializedData), // Store as object when not compressed
        storageClassification: request.storageClassification.toString(),
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
        storageClassification: documentToStore.storageClassification,
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

      const processingTimeMs = Date.now() - startTime;

      // 监控已移除，仅保留业务日志

      const metadata = new StorageMetadataDto(
        request.key,
        StorageType.PERSISTENT,
        request.storageClassification,
        request.provider,
        request.market,
        dataSize,
        processingTimeMs,
        compressed,
        request.options?.tags,
        expiresAt?.toISOString(),
      );

      this.logStorageSuccess(processingTimeMs, request.key, dataSize, compressed);
      return new StorageResponseDto(request.data, metadata);
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      // 监控已移除，仅保留错误日志

      this.logger.error(
        `数据库存储失败: ${request.key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTimeMs,
        }),
      );
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'storeData',
        message: `Database storage operation failed: ${error.message}`,
        context: {
          key: request.key,
          storageType: request.storageType,
          originalError: error.message,
          processingTimeMs,
          operation: 'database_store'
        }
      });
    }
  }

  /**
   * 数据库持久化检索
   * 🎯 重构后：仅负责数据库检索，不再处理缓存操作
   * @param request 检索请求（仅支持PERSISTENT类型）
   * @returns 检索响应
   */
  async retrieveData(request: RetrieveDataDto): Promise<StorageResponseDto> {
    const startTime = Date.now();

    // 🎯 重构后：仅支持数据库检索
    if (
      request.preferredType &&
      request.preferredType !== StorageType.PERSISTENT
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'retrieveData',
        message: 'StorageService only supports PERSISTENT retrieval type. Use StandardizedCacheService for cache operations.',
        context: {
          requestedType: request.preferredType,
          supportedTypes: [StorageType.PERSISTENT],
          alternativeService: 'StandardizedCacheService'
        }
      });
    }

    this.logger.log(
      `从数据库检索数据，键: ${request.key}`,
      sanitizeLogData({
        key: request.key,
      }),
    );

    try {
      // 🎯 重构后：直接从数据库检索
      const response = await this.tryRetrieveFromPersistent(request, startTime);
      if (response) {
        // 监控已移除，仅保留业务日志
        return response;
      }

      this.logger.debug(
        `Data not found: ${request.key}`,
      );
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'retrieveData',
        message: `Requested data not found in storage: ${request.key}`,
        context: {
          key: request.key,
          preferredType: request.preferredType,
          operation: 'data_retrieval'
        }
      });
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      if (
        BusinessException.isBusinessException(error) &&
        error.errorCode === BusinessErrorCode.DATA_NOT_FOUND
      ) {
        this.logger.debug(`Data not found during retrieval: ${request.key}`);
        throw error;
      }

      // 监控已移除，仅保留错误日志

      this.logger.error(
        `数据库检索失败: ${request.key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTimeMs,
        }),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'retrieveData',
        message: `Data retrieval operation failed: ${error.message}`,
        context: {
          key: request.key,
          originalError: error.message,
          operation: 'database_retrieve'
        }
      });
    }
  }

  async tryAcquirePersistentLease(
    key: string,
    owner: string,
    ttlSeconds: number,
    metadata: {
      storageClassification: string;
      provider: string;
      market: string;
      tags?: Record<string, string>;
    },
  ): Promise<boolean> {
    this.validatePersistentLeaseTtl(
      ttlSeconds,
      'tryAcquirePersistentLease',
    );
    this.validateReservedTags(metadata.tags, 'tryAcquirePersistentLease');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return this.storageRepository.tryAcquireLease(
      key,
      owner,
      expiresAt,
      metadata,
    );
  }

  async releasePersistentLease(key: string, owner: string): Promise<void> {
    await this.storageRepository.releaseLease(key, owner);
  }

  async renewPersistentLease(
    key: string,
    owner: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    this.validatePersistentLeaseTtl(
      ttlSeconds,
      'renewPersistentLease',
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return this.storageRepository.renewLease(key, owner, expiresAt);
  }

  /**
   * 数据库持久化删除
   * 🎯 重构后：仅负责数据库删除，不再处理缓存操作
   * @param key 删除的键
   * @param storageType 存储类型（仅支持PERSISTENT）
   * @returns 是否删除成功
   */
  @StandardRetry('deleteData')
  async deleteData(
    key: string,
    storageType: StorageType = StorageType.PERSISTENT,
  ): Promise<boolean> {
    const startTime = Date.now();

    // 🎯 重构后：仅支持数据库删除
    if (storageType !== StorageType.PERSISTENT) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'deleteData',
        message: 'StorageService only supports PERSISTENT delete type. Use StandardizedCacheService for cache operations.',
        context: {
          requestedStorageType: storageType,
          supportedTypes: [StorageType.PERSISTENT],
          alternativeService: 'StandardizedCacheService',
          operation: 'delete_validation'
        }
      });
    }

    this.logger.log(`从数据库删除数据，键: ${key}`);

    try {
      // 🎯 重构后：仅处理数据库删除
      const persistentResult = await this.storageRepository.deleteByKey(key);
      const deleted = persistentResult.deletedCount > 0;

      this.logger.log(`数据库删除${deleted ? "成功" : "未找到"}: ${key}`, {
        deletedCount: persistentResult.deletedCount,
      });

      const processingTimeMs = Date.now() - startTime;

      // 监控已移除，仅保留业务日志

      this.logger.log(`数据库删除完成: ${key}`, {
        deleted,
        processingTimeMs,
      });

      return deleted;
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      // 监控已移除，仅保留错误日志

      this.logger.error(
        `数据库删除失败: ${key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTimeMs,
        }),
      );

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'deleteData',
        message: `Data deletion operation failed: ${error.message}`,
        context: {
          key: key,
          storageType: storageType,
          originalError: error.message,
          operation: 'database_delete'
        }
      });
    }
  }

  /**
   * 数据库统计信息
   * 🎯 重构后：仅负责数据库统计，不再处理缓存统计
   * @returns 数据库存储统计信息
   */
  async getStorageStats(): Promise<StorageStatsDto> {
    this.logger.log("生成数据库存储统计信息");
    try {
      const stats = new StorageStatsDto();

      // 🎯 重构后：仅生成数据库统计
      const persistentStats = await this.getPersistentStats();
      (stats as any).persistent = persistentStats;

      this.logger.log("数据库存储统计信息生成成功", {
        totalDocuments: persistentStats.totalDocuments,
        totalSizeBytes: persistentStats.totalSizeBytes,
        categories: Object.keys(persistentStats.categoriesCounts).length,
        providers: Object.keys(persistentStats.providerCounts).length,
      });
      return stats;
    } catch (error: any) {
      this.logger.error("生成数据库存储统计信息失败", error);
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_PROCESSING_FAILED,
        operation: 'getStorageStats',
        message: `Database storage statistics generation failed: ${error.message}`,
        context: {
          originalError: error.message,
          operation: 'statistics_generation',
          errorType: 'persistent_stats_failure'
        }
      });
    }
  }

  /**
   * 获取分页存储数据
   * @param query 查询参数
   * @returns 分页数据
   */
  @StandardRetry('findPaginated')
  async findPaginated(
    query: StorageQueryDto,
  ): Promise<PaginatedDataDto<PaginatedStorageItemDto>> {
    const startTime = Date.now();

    this.logger.log(
      `获取分页存储数据`,
      sanitizeLogData({
        page: query.page,
        limit: query.limit,
        keySearch: query.keySearch,
      }),
    );

    try {
      const { items, total } = await this.storageRepository.findPaginated(query);

      // 转换为响应DTO
      const responseItems = items.map((item) => {
        return {
          id: item._id.toString(),
          key: item.key,
          provider: item.provider,
          market: item.market,
          storageClassification: item.storageClassification,
          compressed: item.compressed,
          dataSize: item.dataSize,
          tags: item.tags
            ? Object.entries(item.tags).map(([k, v]) => `${k}=${v}`)
            : [],
          storedAt: item.storedAt?.toISOString(),
          expiresAt: item.expiresAt?.toISOString(),
        } as PaginatedStorageItemDto;
      });

      // 使用通用分页服务
      const result = this.paginationService.createPaginatedResponseFromQuery(
        responseItems,
        query,
        total,
      );

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(`分页数据检索完成`, {
        totalItems: total,
        pageItems: responseItems.length,
        processingTimeMs,
      });

      return result;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      this.logger.error(
        `获取分页数据失败`,
        sanitizeLogData({
          query,
          error: error.message,
          processingTimeMs,
        }),
      );
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'findPaginated',
        message: `Paginated data retrieval operation failed: ${error.message}`,
        context: {
          query: query,
          page: query.page || 1,
          limit: query.limit || 10,
          originalError: error.message,
          operation: 'database_paginated_query'
        }
      });
    }
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
      this.logger.debug(`数据库中未找到数据`, { key: request.key });
      return null;
    }

    let data = document.data;

    // New format: Check root-level compressed flag first
    if (document.compressed === true && typeof data === "string") {
      try {
        const buffer = Buffer.from(data, "base64");
        data = JSON.parse((await gunzip(buffer)).toString());
      } catch (error) {
        this.logger.warn("解压持久数据失败 (新格式)", error);
        return null; // Corrupted data
      }
    }

    const processingTimeMs = Date.now() - startTime;

    this.logRetrievalSuccess(processingTimeMs, request.key, "persistent");

    const responseMetadata = new StorageMetadataDto(
      document.key,
      StorageType.PERSISTENT,
      document.storageClassification as any,
      document.provider,
      document.market,
      document.dataSize,
      processingTimeMs,
      document.compressed,
      document.tags,
      undefined,
    );
    responseMetadata.storedAt = document.storedAt.toISOString();
    const cacheInfo: CacheInfoDto = { hit: true, source: "persistent" };
    return new StorageResponseDto(data, responseMetadata, cacheInfo);
  }

  private async getPersistentStats(): Promise<PersistentStatsDto> {
    const [totalDocs, categoryStats, providerStats, sizeStats] =
      await Promise.all([
        this.storageRepository.countAll(),
        this.storageRepository.getStorageClassificationStats(),
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

  private validatePersistentLeaseTtl(
    ttlSeconds: number,
    operation: 'tryAcquirePersistentLease' | 'renewPersistentLease',
  ): void {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation,
        message: 'ttlSeconds must be a positive integer',
        context: {
          ttlSeconds,
          validationRule: 'positive_integer',
        }
      });
    }
  }

  private validateReservedTags(
    tags: Record<string, string> | undefined,
    operation: 'storeData' | 'tryAcquirePersistentLease',
  ): void {
    if (!tags) {
      return;
    }

    const invalidTagKey = Object.keys(tags).find(
      (tagKey) => tagKey === '__lease' || tagKey.startsWith('__'),
    );

    if (invalidTagKey) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STORAGE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation,
        message: `tags contains reserved key: ${invalidTagKey}`,
        context: {
          invalidTagKey,
          validationRule: 'reserved_tag_key',
          reservedPrefixes: ['__'],
          reservedKeys: ['__lease'],
        }
      });
    }
  }

  // 监控相关方法已移除

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
      dataSize > STORAGE_CONFIG.DEFAULT_COMPRESSION_THRESHOLD
    ) {
      try {
        const compressedBuffer = await gzip(serializedData);
        if (
          compressedBuffer.length <
          dataSize * STORAGE_CONFIG.DEFAULT_COMPRESSION_RATIO
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

  private logStorageSuccess(
    processingTimeMs: number,
    key: string,
    dataSize: number,
    compressed: boolean,
  ) {
    // 简化日志，不再依据性能阈值产生监控告警
    this.logger.log(`数据存储成功: ${key}`, {
      processingTimeMs,
      dataSize,
      compressed,
    });
  }

  private logRetrievalSuccess(
    processingTimeMs: number,
    key: string,
    source: "persistent",
  ) {
    // 简化日志，不再依据性能阈值产生监控告警
    this.logger.log(`数据检索成功: ${key}`, { processingTimeMs, source });
  }

  // calculateOperationsPerSecond 和 emitDatabaseOperationEvent 已移除

  // ✅ 新增键模式提取方法
  private extractKeyPattern(key: string): string {
    // 提取键的模式，隐藏敏感信息
    const parts = key.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:*`;
    }
    return key.length > 20 ? `${key.substring(0, 20)}...` : key;
  }

  // ✅ 新增过滤器类型分析
  private getFilterTypes(query: StorageQueryDto): string[] {
    const filters = [];
    if (query.keySearch) filters.push("key_search");
    if (query.provider) filters.push("provider");
    if (query.market) filters.push("market");
    if (query.storageClassification) filters.push("classification");
    if (query.tags?.length) filters.push("tags");
    if (query.startDate || query.endDate) filters.push("date_range");
    return filters;
  }
}
