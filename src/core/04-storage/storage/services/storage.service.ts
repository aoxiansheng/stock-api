import { promisify } from "util";
import * as zlib from "zlib";

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { MetricsRegistryService } from '../../../../monitoring/infrastructure/metrics/metrics-registry.service';
import { MetricsHelper } from "../../../../monitoring/infrastructure/helper/infrastructure-helper";


import {
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
    private readonly metricsRegistry: MetricsRegistryService,
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
        `StorageService现在仅支持PERSISTENT存储类型。对于缓存操作，请使用CommonCacheService。`
      );
    }
    
    // 🎯 记录数据库存储操作指标
    MetricsHelper.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'store',
        storage_type: 'persistent'
      }
    );
    
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

      const storedDocument = await this.storageRepository.upsert(documentToStore);

      this.logger.debug(`数据库存储完成`, {
        key: request.key,
        storedId: storedDocument._id,
        storedKey: storedDocument.key,
        success: !!storedDocument,
      });

      const processingTime = Date.now() - startTime;
      
      // 🎯 记录数据库查询持续时间指标
      MetricsHelper.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime / 1000,
        { 
          query_type: 'store',
          storage_type: 'persistent'
        }
      );
      
      // 🎯 记录数据库数据量指标
      MetricsHelper.setGauge(
        this.metricsRegistry,
        'storageDataVolume',
        dataSize,
        { 
          data_type: request.storageClassification || 'unknown',
          storage_type: 'persistent'
        }
      );

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
    if (request.preferredType && request.preferredType !== StorageType.PERSISTENT) {
      throw new BadRequestException(
        `StorageService现在仅支持PERSISTENT检索类型。对于缓存操作，请使用CommonCacheService。`
      );
    }
    
    // 🎯 记录数据库检索操作指标
    MetricsHelper.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'retrieve',
        storage_type: 'persistent'
      }
    );
    
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
      
      // 🎯 记录数据库检索失败的查询持续时间指标
      MetricsHelper.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime / 1000,
        { 
          query_type: 'retrieve_failed',
          storage_type: 'persistent'
        }
      );
      
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
        `StorageService现在仅支持PERSISTENT删除类型。对于缓存操作，请使用CommonCacheService。`
      );
    }
    
    // 🎯 记录数据库删除操作指标
    MetricsHelper.inc(
      this.metricsRegistry,
      'storageOperationsTotal',
      { 
        operation: 'delete',
        storage_type: 'persistent'
      }
    );
    
    this.logger.log(`从数据库删除数据，键: ${key}`);

    try {
      // 🎯 重构后：仅处理数据库删除
      const persistentResult = await this.storageRepository.deleteByKey(key);
      const deleted = persistentResult.deletedCount > 0;
      
      this.logger.log(
        `数据库删除${deleted ? "成功" : "未找到"}: ${key}`,
        {
          deletedCount: persistentResult.deletedCount,
        },
      );

      const processingTime = Date.now() - startTime;
      
      // 🎯 记录数据库删除查询持续时间指标
      MetricsHelper.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime / 1000,
        { 
          query_type: 'delete',
          storage_type: 'persistent'
        }
      );

      this.logger.log(`数据库删除完成: ${key}`, {
        deleted,
        processingTime,
      });

      return deleted;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      // 🎯 记录数据库删除失败的查询持续时间
      MetricsHelper.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime / 1000,
        { 
          query_type: 'delete_failed',
          storage_type: 'persistent'
        }
      );
      
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
        avgTtl: 0
      };
      
      stats.persistent = persistentStats;
      stats.performance = this.getPerformanceStats();

      this.logger.log("数据库存储统计信息生成成功", {
        totalDocuments: persistentStats.totalDocuments,
        totalSizeBytes: persistentStats.totalSizeBytes,
        categories: Object.keys(persistentStats.categoriesCounts).length,
        providers: Object.keys(persistentStats.providerCounts).length
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
    query: StorageQueryDto
  ): Promise<PaginatedDataDto<PaginatedStorageItemDto>> {
    const startTime = Date.now();
    
    // 🎯 记录分页查询操作指标
    MetricsHelper.inc(
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
          tags: item.tags ? Object.entries(item.tags).map(([k, v]) => `${k}=${v}`) : [],
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
      MetricsHelper.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime / 1000,
        { 
          query_type: 'paginated',
          storage_type: 'persistent'
        }
      );
      
      // 🎯 记录数据量指标
      MetricsHelper.setGauge(
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
      MetricsHelper.observe(
        this.metricsRegistry,
        'storageQueryDuration',
        processingTime / 1000,
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
    if (document.compressed === true && typeof data === 'string') {
      try {
        const buffer = Buffer.from(data, "base64");
        data = JSON.parse((await gunzip(buffer)).toString());
      } catch (error) {
        this.logger.warn("解压持久数据失败 (新格式)", error);
        return null; // Corrupted data
      }
    }
    // Legacy format: Check nested compressed flag for backward compatibility
    else if (data && typeof data === 'object' && data.compressed === true) {
      try {
        const buffer = Buffer.from(data.data, "base64");
        data = JSON.parse((await gunzip(buffer)).toString());
      } catch (error) {
        this.logger.warn("解压持久数据失败 (兼容格式)", error);
        return null; // Corrupted data
      }
    }


    const processingTime = Date.now() - startTime;
    
    // 🎯 记录持久化检索查询持续时间指标
    MetricsHelper.observe(
      this.metricsRegistry,
      'storageQueryDuration',
      processingTime / 1000,
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
      avgStorageTime: 0,    // 可从 storagePersistentQueryDuration 直方图计算平均值
      avgRetrievalTime: 0,  // 可从 storagePersistentQueryDuration 直方图计算平均值  
      operationsPerSecond: this.calculateOperationsPerSecond(),
      errorRate: 0,         // 可从 storagePersistentOperationsTotal 计算错误率
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
      dataSize > 10 * 1024 // 10KB compression threshold
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
    source: "persistent",
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


  private calculateOperationsPerSecond(): number {
    // 🎯 重构后：数据库操作频率，由 Prometheus 指标提供  
    // 在生产环境中应通过 rate(storagePersistentOperationsTotal[1m]) 计算真实频率
    return 0; // 可从 Prometheus storagePersistentOperationsTotal 指标计算速率
  }
}
