import { promisify } from "util";
import * as zlib from "zlib";

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { MetricsRegistryService } from "../../../monitoring/metrics/metrics-registry.service";
import { Metrics } from "../../../monitoring/metrics/metrics-helper";

import {
  CACHE_TTL,
  CACHE_CONSTANTS,
} from "../../../cache/constants/cache.constants";

import {
  STORAGE_ERROR_MESSAGES,
  STORAGE_WARNING_MESSAGES,
  STORAGE_PERFORMANCE_THRESHOLDS,
  STORAGE_DEFAULTS,
} from "../constants/storage.constants";
import {
  CacheInfoDto,
  StorageCacheStatsDto,
  PersistentStatsDto,
  PerformanceStatsDto,
} from "../dto/storage-internal.dto";
import { StoreDataDto, RetrieveDataDto } from "../dto/storage-request.dto";
import { StorageQueryDto } from "../dto/storage-query.dto";
import { StorageType, StorageClassification } from "../enums/storage-type.enum";
import {
  StorageResponseDto,
  StorageStatsDto,
  PaginatedStorageItemDto,
} from "../dto/storage-response.dto";
import { StorageMetadataDto } from "../dto/storage-metadata.dto";
import { SmartCacheOptionsDto, SmartCacheResultDto } from "../dto/smart-cache-request.dto"; // 🔥 新增智能缓存导入
import { StorageRepository } from "../repositories/storage.repository";
import { RedisUtils } from "../utils/redis.util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class StorageService {
  private readonly logger = createLogger(StorageService.name);

  constructor(
    private readonly storageRepository: StorageRepository,
    private readonly paginationService: PaginationService,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {}

  async storeData(request: StoreDataDto): Promise<StorageResponseDto> {
    const startTime = Date.now();
    
    // 🎯 记录存储操作指标
    Metrics.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'store',
        storage_type: request.storageType || 'unknown'
      }
    );
    
    this.logger.log(
      `存储数据，键: ${request.key}`,
      sanitizeLogData({
        key: request.key,
        storageType: request.storageType,
        storageClassification: request.storageClassification,
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
      }

      const processingTime = Date.now() - startTime;
      
      // 🎯 记录查询持续时间指标
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'store',
          storage_type: request.storageType || 'unknown'
        }
      );
      
      // 🎯 记录数据量指标
      Metrics.setGauge(
        this.metricsRegistry,
        'storageDataVolume',
        dataSize,
        { 
          data_type: request.storageClassification || 'unknown',
          storage_type: request.storageType || 'unknown'
        }
      );

      const metadata = new StorageMetadataDto(
        request.key,
        request.storageType,
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
    
    // 🎯 记录检索操作指标
    Metrics.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'retrieve',
        storage_type: request.preferredType || 'both'
      }
    );
    
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
      
      // 🎯 记录检索失败的查询持续时间指标
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'retrieve_failed',
          storage_type: request.preferredType || 'both'
        }
      );
      
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
    
    // 🎯 记录删除操作指标
    Metrics.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'delete',
        storage_type: storageType || 'both'
      }
    );
    
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
      
      // 🎯 记录删除查询持续时间指标
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'delete',
          storage_type: storageType || 'both'
        }
      );

      this.logger.log(`数据删除完成: ${key}`, {
        deleted,
        hasErrors,
        storageType,
        processingTime,
      });

      return deleted;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      // 🎯 记录删除失败的查询持续时间
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'delete_failed',
          storage_type: storageType || 'both'
        }
      );
      
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

  /**
   * 获取分页存储数据
   * @param query 查询参数
   * @returns 分页数据
   */
  async findPaginated(
    query: StorageQueryDto
  ): Promise<PaginatedDataDto<PaginatedStorageItemDto>> {
    const startTime = Date.now();
    
    // 🎯 记录分页查询操作指标
    Metrics.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'paginated_query',
        storage_type: 'persistent'
      }
    );
    
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
      const responseItems = items.map(item => {
        return {
          id: item._id.toString(),
          key: item.key,
          provider: item.provider,
          market: item.market,
          storageClassification: item.storageClassification,
          compressed: item.compressed,
          dataSize: item.dataSize,
          tags: item.tags || [],
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
      
      // 🎯 记录分页查询持续时间指标
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'paginated',
          storage_type: 'persistent'
        }
      );
      
      // 🎯 记录数据量指标
      Metrics.setGauge(
        this.metricsRegistry,
        'storageDataVolume',
        total,
        { 
          data_type: 'paginated_results',
          storage_type: 'persistent'
        }
      );
      
      this.logger.log(`分页数据检索完成`, {
        totalItems: total,
        pageItems: responseItems.length,
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 🎯 记录分页查询失败持续时间
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'paginated_failed',
          storage_type: 'persistent'
        }
      );
      
      this.logger.error(
        `获取分页数据失败`,
        sanitizeLogData({
          query,
          error: error.message,
          processingTime,
        }),
      );
      throw new InternalServerErrorException(
        `${STORAGE_ERROR_MESSAGES.RETRIEVAL_FAILED}: ${error.message}`,
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
    
    // 🎯 记录缓存检索查询持续时间指标
    Metrics.observe(
      this.metricsRegistry,
      'storageQueryDuration',
      processingTime,
      { 
        query_type: 'cache_retrieve',
        storage_type: 'cache'
      }
    );
    
    this.logRetrievalSuccess(processingTime, request.key, "cache");

    const responseMetadata = new StorageMetadataDto(
      request.key,
      StorageType.CACHE,
      StorageClassification.GENERAL,
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
    
    // 🎯 记录持久化检索查询持续时间指标
    Metrics.observe(
      this.metricsRegistry,
      'storageQueryDuration',
      processingTime,
      { 
        query_type: 'persistent_retrieve',
        storage_type: 'persistent'
      }
    );
    
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
    // 🎯 统计数据现在由 Prometheus 指标提供，这里返回默认值
    // 在生产环境中应通过 Grafana/Prometheus 查询真实的性能数据
    return {
      avgStorageTime: 0,    // 可从 storageQueryDuration 直方图计算平均值
      avgRetrievalTime: 0,  // 可从 storageQueryDuration 直方图计算平均值  
      operationsPerSecond: this.calculateOperationsPerSecond(),
      errorRate: 0,         // 可从 storageOperationsTotal 计算错误率
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
    // 🎯 缓存命中率现在由 Prometheus 指标提供，这里返回默认值
    // 在生产环境中应通过 storageCacheEfficiency 指标查询真实数据
    return 0; // 可从 Prometheus storageCacheEfficiency 指标获取
  }

  private calculateOperationsPerSecond(): number {
    // 🎯 操作频率现在由 Prometheus 指标提供，这里返回默认值  
    // 在生产环境中应通过 rate(storageOperationsTotal[1m]) 计算真实频率
    return 0; // 可从 Prometheus storageOperationsTotal 指标计算速率
  }

  /**
   * 智能缓存：支持动态TTL和市场状态感知的缓存策略
   * 🚀 统一缓存入口，替代Receiver中的实时缓存逻辑
   * 
   * @param key 缓存键
   * @param fetchFn 数据获取函数
   * @param options 智能缓存选项
   * @returns 智能缓存结果
   */
  async getWithSmartCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: SmartCacheOptionsDto,
  ): Promise<SmartCacheResultDto<T>> {
    const startTime = Date.now();
    const fullKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : key;

    // 🎯 记录智能缓存操作指标
    Metrics.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'smart_cache_query',
        storage_type: 'smart_cache'
      }
    );

    this.logger.debug('智能缓存查询开始', {
      key: fullKey,
      symbols: options.symbols.slice(0, 5), // 只记录前5个符号
      forceRefresh: options.forceRefresh,
    });

    try {
      // 1. 计算动态TTL
      const dynamicTtl = this.calculateDynamicTTL(options);

      // 2. 强制刷新则跳过缓存
      if (!options.forceRefresh) {
        const cachedResult = await this.tryGetFromSmartCache<T>(fullKey);
        if (cachedResult) {
          const processingTime = Date.now() - startTime;
          
          // 🎯 记录缓存命中指标
          Metrics.observe(
            this.metricsRegistry,
            'storageQueryDuration',
            processingTime,
            { 
              query_type: 'smart_cache_hit',
              storage_type: 'smart_cache'
            }
          );

          this.logger.debug('智能缓存命中', {
            key: fullKey,
            ttlRemaining: cachedResult.ttlRemaining,
            processingTime,
          });

          return SmartCacheResultDto.hit(
            cachedResult.data,
            fullKey,
            dynamicTtl,
            cachedResult.ttlRemaining,
          );
        }
      }

      // 3. 缓存未命中或强制刷新，获取新数据
      this.logger.debug('智能缓存未命中，获取新数据', {
        key: fullKey,
        forceRefresh: options.forceRefresh,
      });

      const freshData = await fetchFn();

      // 4. 将新数据存储到缓存
      await this.storeToSmartCache(fullKey, freshData, dynamicTtl);

      const processingTime = Date.now() - startTime;

      // 🎯 记录缓存未命中指标
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'smart_cache_miss',
          storage_type: 'smart_cache'
        }
      );

      this.logger.debug('智能缓存存储完成', {
        key: fullKey,
        dynamicTtl,
        processingTime,
      });

      return SmartCacheResultDto.miss(freshData, fullKey, dynamicTtl);

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // 🎯 记录缓存错误指标
      Metrics.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime,
        { 
          query_type: 'smart_cache_error',
          storage_type: 'smart_cache'
        }
      );

      this.logger.error('智能缓存操作失败', {
        key: fullKey,
        error: error.message,
        processingTime,
      });

      throw new InternalServerErrorException(
        `智能缓存操作失败: ${error.message}`
      );
    }
  }

  /**
   * 批量智能缓存操作
   * 
   * @param requests 批量请求
   * @returns 批量结果
   */
  async batchGetWithSmartCache<T>(
    requests: Array<{
      key: string;
      fetchFn: () => Promise<T>;
      options: SmartCacheOptionsDto;
    }>,
  ): Promise<SmartCacheResultDto<T>[]> {
    this.logger.debug('批量智能缓存查询', {
      requestCount: requests.length,
    });

    // 并行执行所有缓存查询
    const results = await Promise.allSettled(
      requests.map(({ key, fetchFn, options }) => 
        this.getWithSmartCache(key, fetchFn, options)
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error('批量缓存查询部分失败', {
          index,
          key: requests[index].key,
          error: result.reason.message,
        });
        
        // 返回错误结果
        return SmartCacheResultDto.miss(
          null as T,
          requests[index].key,
          0,
        );
      }
    });
  }

  /**
   * 计算基于市场状态的动态TTL
   * 
   * @param options 缓存选项
   * @returns TTL（秒）
   */
  private calculateDynamicTTL(options: SmartCacheOptionsDto): number {
    const { symbols, marketStatus, minCacheTtl = 30, maxCacheTtl = 3600 } = options;

    if (!marketStatus || Object.keys(marketStatus).length === 0) {
      // 没有市场状态信息，使用默认值
      return Math.floor((minCacheTtl + maxCacheTtl) / 2);
    }

    let minTtl = maxCacheTtl; // 从最大值开始

    // 遍历所有涉及的市场，取最小TTL
    symbols.forEach(symbol => {
      const market = this.inferMarketFromSymbol(symbol);
      const status = marketStatus[market];

      if (status && status.realtimeCacheTTL) {
        minTtl = Math.min(minTtl, status.realtimeCacheTTL);
      }
    });

    // 确保TTL在合理范围内
    return Math.max(
      Math.min(minTtl, maxCacheTtl),
      minCacheTtl
    );
  }

  /**
   * 从智能缓存中尝试获取数据
   */
  private async tryGetFromSmartCache<T>(key: string): Promise<{
    data: T;
    ttlRemaining: number;
  } | null> {
    try {
      const { data, metadata, ttl } = await this.storageRepository.retrieveFromCache(key);
      
      if (!data) {
        return null;
      }

      let parsedData: T;
      let cacheMetadata: any = {};

      try {
        if (metadata) {
          cacheMetadata = JSON.parse(metadata);
        }
        
        if (cacheMetadata.compressed) {
          const buffer = Buffer.from(data, 'base64');
          const decompressed = await gunzip(buffer);
          parsedData = JSON.parse(decompressed.toString());
        } else {
          parsedData = JSON.parse(data);
        }
      } catch (parseError) {
        this.logger.warn('智能缓存数据解析失败', {
          key,
          error: parseError.message,
        });
        return null;
      }

      return {
        data: parsedData,
        ttlRemaining: ttl || 0,
      };

    } catch (error) {
      this.logger.debug('智能缓存获取失败', {
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 将数据存储到智能缓存
   */
  private async storeToSmartCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      const dataSize = Buffer.byteLength(serializedData, 'utf8');
      
      // 判断是否需要压缩
      const shouldCompress = dataSize > 10 * 1024; // 大于10KB才压缩
      let finalData = serializedData;
      let compressed = false;

      if (shouldCompress) {
        try {
          const compressedBuffer = await gzip(serializedData);
          if (compressedBuffer.length < dataSize * 0.8) {
            finalData = compressedBuffer.toString('base64');
            compressed = true;
          }
        } catch (compressionError) {
          this.logger.warn('智能缓存压缩失败', {
            key,
            error: compressionError.message,
          });
        }
      }

      // 存储元数据
      const metadata = JSON.stringify({
        compressed,
        storedAt: new Date().toISOString(),
        dataSize,
      });

      await this.storageRepository.storeInCache(
        key,
        finalData,
        ttl,
        compressed,
        metadata,
      );

    } catch (error) {
      this.logger.error('智能缓存存储失败', {
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 从股票代码推断市场
   * 🔄 复用Receiver中的逻辑，保持一致性
   */
  private inferMarketFromSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase().trim();

    // 香港市场: .HK 后缀或5位数字
    if (upperSymbol.includes('.HK') || /^\d{5}$/.test(upperSymbol)) {
      return 'HK';
    }

    // 美国市场: 1-5位字母
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return 'US';
    }

    // 深圳市场: .SZ 后缀或 00/30 前缀
    if (
      upperSymbol.includes('.SZ') ||
      ['00', '30'].some(prefix => upperSymbol.startsWith(prefix))
    ) {
      return 'SZ';
    }

    // 上海市场: .SH 后缀或 60/68 前缀
    if (
      upperSymbol.includes('.SH') ||
      ['60', '68'].some(prefix => upperSymbol.startsWith(prefix))
    ) {
      return 'SH';
    }

    // 默认美股
    return 'US';
  }
}
