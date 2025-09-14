import { promisify } from "util";
import zlib from "zlib";

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";

import {
  STORAGE_CONFIG,
  STORAGE_ERROR_MESSAGES,
  STORAGE_WARNING_MESSAGES,
  STORAGE_PERFORMANCE_THRESHOLDS,
} from "../constants/storage.constants";
import {
  CacheInfoDto,
  PersistentStatsDto,
  PerformanceStatsDto,
} from "../dto/storage-internal.dto";
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

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class StorageService {
  private readonly logger = createLogger(StorageService.name);

  constructor(
    private readonly storageRepository: StorageRepository,
    private readonly paginationService: PaginationService,
    private readonly eventBus: EventEmitter2,
  ) {}

  /**
   * 数据库持久化存储
   * 🎯 重构后：仅负责数据库写入，不再处理缓存操作
   * @param request 存储请求（仅支持PERSISTENT类型）
   * @returns 存储响应
   */
  async storeData(request: StoreDataDto): Promise<StorageResponseDto> {
    const startTime = Date.now();

    // 🎯 重构后：仅支持数据库存储
    if (request.storageType !== StorageType.PERSISTENT) {
      throw new BadRequestException(
        `StorageService现在仅支持PERSISTENT存储类型。对于缓存操作，请使用CommonCacheService。`,
      );
    }

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

      const processingTime = Date.now() - startTime;

      // ✅ 事件驱动监控：数据存储成功
      this.emitDatabaseOperationEvent("upsert", processingTime, true, {
        storage_type: "persistent",
        data_size: dataSize,
        compressed: compressed,
        classification: request.storageClassification,
        provider: request.provider,
        market: request.market,
        ttl_seconds: request.options?.persistentTtlSeconds,
        has_tags: !!request.options?.tags,
        operation_type: "store",
      });

      const metadata = new StorageMetadataDto(
        request.key,
        StorageType.PERSISTENT,
        request.storageClassification,
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

      // ✅ 事件驱动监控：数据存储失败
      this.emitDatabaseOperationEvent("upsert", processingTime, false, {
        storage_type: "persistent",
        error_type: error.constructor.name,
        classification: request.storageClassification,
        provider: request.provider,
        key_pattern: this.extractKeyPattern(request.key),
        operation_type: "store",
      });

      this.logger.error(
        `数据库存储失败: ${request.key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTime,
        }),
      );
      throw new BadRequestException(
        `${STORAGE_ERROR_MESSAGES.STORAGE_FAILED}: ${error.message}`,
      );
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
      throw new BadRequestException(
        `StorageService现在仅支持PERSISTENT检索类型。对于缓存操作，请使用CommonCacheService。`,
      );
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
        // ✅ 事件驱动监控：数据检索成功
        this.emitDatabaseOperationEvent(
          "findOne",
          Date.now() - startTime,
          true,
          {
            storage_type: "persistent",
            data_source: "mongodb",
            key_pattern: this.extractKeyPattern(request.key),
            cache_hit: response.cacheInfo?.hit || false,
            decompressed: response.metadata?.compressed || false,
            operation_type: "retrieve",
          },
        );
        return response;
      }

      this.logger.warn(
        `${STORAGE_ERROR_MESSAGES.DATA_NOT_FOUND}: ${request.key}`,
      );
      throw new NotFoundException(
        `${STORAGE_ERROR_MESSAGES.DATA_NOT_FOUND}: ${request.key}`,
      );
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      // ✅ 事件驱动监控：数据检索失败
      this.emitDatabaseOperationEvent("findOne", processingTime, false, {
        storage_type: "persistent",
        error_type: error.constructor.name,
        key_pattern: this.extractKeyPattern(request.key),
        is_not_found: error instanceof NotFoundException,
        operation_type: "retrieve",
      });

      this.logger.error(
        `数据库检索失败: ${request.key}`,
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
      throw new BadRequestException(
        `${STORAGE_ERROR_MESSAGES.RETRIEVAL_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 数据库持久化删除
   * 🎯 重构后：仅负责数据库删除，不再处理缓存操作
   * @param key 删除的键
   * @param storageType 存储类型（仅支持PERSISTENT）
   * @returns 是否删除成功
   */
  async deleteData(
    key: string,
    storageType: StorageType = StorageType.PERSISTENT,
  ): Promise<boolean> {
    const startTime = Date.now();

    // 🎯 重构后：仅支持数据库删除
    if (storageType !== StorageType.PERSISTENT) {
      throw new BadRequestException(
        `StorageService现在仅支持PERSISTENT删除类型。对于缓存操作，请使用CommonCacheService。`,
      );
    }

    this.logger.log(`从数据库删除数据，键: ${key}`);

    try {
      // 🎯 重构后：仅处理数据库删除
      const persistentResult = await this.storageRepository.deleteByKey(key);
      const deleted = persistentResult.deletedCount > 0;

      this.logger.log(`数据库删除${deleted ? "成功" : "未找到"}: ${key}`, {
        deletedCount: persistentResult.deletedCount,
      });

      const processingTime = Date.now() - startTime;

      // ✅ 事件驱动监控：数据删除成功
      this.emitDatabaseOperationEvent("deleteOne", processingTime, true, {
        storage_type: "persistent",
        deleted_count: persistentResult.deletedCount,
        actually_deleted: deleted,
        key_pattern: this.extractKeyPattern(key),
        operation_type: "delete",
      });

      this.logger.log(`数据库删除完成: ${key}`, {
        deleted,
        processingTime,
      });

      return deleted;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      // ✅ 事件驱动监控：数据删除失败
      this.emitDatabaseOperationEvent("deleteOne", processingTime, false, {
        storage_type: "persistent",
        error_type: error.constructor.name,
        key_pattern: this.extractKeyPattern(key),
        operation_type: "delete",
      });

      this.logger.error(
        `数据库删除失败: ${key}`,
        sanitizeLogData({
          error: error.message,
          stack: error.stack,
          processingTime,
        }),
      );

      throw new BadRequestException(
        `${STORAGE_ERROR_MESSAGES.DELETE_FAILED}: ${error.message}`,
      );
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

      // 🎯 重构后：仅生成数据库统计，缓存统计由CommonCacheService负责
      const persistentStats = await this.getPersistentStats();

      // 缓存统计设为空对象，提示用户使用专用缓存服务
      stats.cache = {
        totalKeys: 0,
        totalMemoryUsage: 0,
        hitRate: 0,
        avgTtl: 0,
      };

      stats.persistent = persistentStats;
      stats.performance = this.getPerformanceStats();

      this.logger.log("数据库存储统计信息生成成功", {
        totalDocuments: persistentStats.totalDocuments,
        totalSizeBytes: persistentStats.totalSizeBytes,
        categories: Object.keys(persistentStats.categoriesCounts).length,
        providers: Object.keys(persistentStats.providerCounts).length,
      });
      return stats;
    } catch (error: any) {
      this.logger.error("生成数据库存储统计信息失败", error);
      throw new BadRequestException(
        `生成数据库存储统计信息失败: ${error.message}`,
      );
    }
  }

  /**
   * 获取分页存储数据
   * @param query 查询参数
   * @returns 分页数据
   */
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
      const { items, total } =
        await this.storageRepository.findPaginated(query);

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

      const processingTime = Date.now() - startTime;

      // ✅ 事件驱动监控：分页查询成功
      this.emitDatabaseOperationEvent("findPaginated", processingTime, true, {
        storage_type: "persistent",
        page: query.page || 1,
        limit: query.limit || 10,
        total_results: total,
        page_results: responseItems.length,
        has_filters: !!(query.keySearch || query.provider || query.market),
        filter_types: this.getFilterTypes(query),
        operation_type: "paginated_query",
      });

      this.logger.log(`分页数据检索完成`, {
        totalItems: total,
        pageItems: responseItems.length,
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // ✅ 事件驱动监控：分页查询失败
      this.emitDatabaseOperationEvent("findPaginated", processingTime, false, {
        storage_type: "persistent",
        error_type: error.constructor.name,
        page: query.page || 1,
        limit: query.limit || 10,
        operation_type: "paginated_query",
      });

      this.logger.error(
        `获取分页数据失败`,
        sanitizeLogData({
          query,
          error: error.message,
          processingTime,
        }),
      );
      throw new BadRequestException(
        `${STORAGE_ERROR_MESSAGES.RETRIEVAL_FAILED}: ${error.message}`,
      );
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
      this.logger.warn(`数据库中未找到数据`, { key: request.key });
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
    // Legacy format: Check nested compressed flag for backward compatibility
    else if (data && typeof data === "object" && data.compressed === true) {
      try {
        const buffer = Buffer.from(data.data, "base64");
        data = JSON.parse((await gunzip(buffer)).toString());
      } catch (error) {
        this.logger.warn("解压持久数据失败 (兼容格式)", error);
        return null; // Corrupted data
      }
    }

    const processingTime = Date.now() - startTime;

    this.logRetrievalSuccess(processingTime, request.key, "persistent");

    const responseMetadata = new StorageMetadataDto(
      document.key,
      StorageType.PERSISTENT,
      document.storageClassification as any,
      document.provider,
      document.market,
      document.dataSize,
      processingTime,
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

  private getPerformanceStats(): PerformanceStatsDto {
    // 🎯 重构后：数据库性能统计，由 Prometheus 指标提供
    // 在生产环境中应通过 Grafana/Prometheus 查询真实的性能数据
    return {
      avgStorageTime: 0, // 可从 storagePersistentQueryDuration 直方图计算平均值
      avgRetrievalTime: 0, // 可从 storagePersistentQueryDuration 直方图计算平均值
      operationsPerSecond: this.calculateOperationsPerSecond(),
      errorRate: 0, // 可从 storagePersistentOperationsTotal 计算错误率
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
    const logLevel =
      processingTimeMs > STORAGE_PERFORMANCE_THRESHOLDS.SLOW_STORAGE_MS
        ? "warn"
        : "log";
    this.logger[logLevel](`数据存储成功: ${key}`, {
      processingTimeMs,
      dataSize,
      compressed,
    });
    if (logLevel === "warn") {
      this.logger.warn(
        `${STORAGE_WARNING_MESSAGES.SLOW_OPERATION}: ${processingTimeMs}ms`,
      );
    }
    if (dataSize > STORAGE_PERFORMANCE_THRESHOLDS.LARGE_DATA_SIZE_KB * 1024) {
      this.logger.warn(
        `${STORAGE_WARNING_MESSAGES.LARGE_DATA_SIZE}: ${Math.round(dataSize / 1024)}KB`,
      );
    }
  }

  private logRetrievalSuccess(
    processingTimeMs: number,
    key: string,
    source: "persistent",
  ) {
    const logLevel =
      processingTimeMs > STORAGE_PERFORMANCE_THRESHOLDS.SLOW_RETRIEVAL_MS
        ? "warn"
        : "log";
    this.logger[logLevel](`数据检索成功: ${key}`, { processingTimeMs, source });
    if (logLevel === "warn") {
      this.logger.warn(
        `${STORAGE_WARNING_MESSAGES.SLOW_OPERATION}: ${processingTimeMs}ms`,
      );
    }
  }

  private calculateOperationsPerSecond(): number {
    // 🎯 重构后：数据库操作频率，由 Prometheus 指标提供
    // 在生产环境中应通过 rate(storagePersistentOperationsTotal[1m]) 计算真实频率
    return 0; // 可从 Prometheus storagePersistentOperationsTotal 指标计算速率
  }

  /**
   * ✅ 事件驱动监控：发送数据库操作监控事件
   * 通过事件总线异步发送监控数据，实现业务逻辑与监控的完全解耦
   */
  private emitDatabaseOperationEvent(
    operation: string,
    duration: number,
    success: boolean,
    metadata: Record<string, any>,
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "storage_service",
        metricType: "database",
        metricName: success ? `${operation}_success` : `${operation}_failed`,
        metricValue: duration,
        tags: {
          operation,
          status: success ? "success" : "error",
          ...metadata,
        },
      });
    });
  }

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
