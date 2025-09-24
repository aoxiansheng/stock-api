/**
 * 标准化流缓存服务
 * Phase 8: 基于StandardCacheModuleInterface的标准化实现
 *
 * 继承原有StreamCacheService的核心功能：
 * - Hot Cache (LRU内存): 毫秒级访问的最热数据
 * - Warm Cache (Redis): 10ms级访问的温数据
 * - 数据压缩: 减少内存和网络开销
 * - 智能缓存策略: 根据访问频率自动选择存储层
 *
 * 新增标准化功能：
 * - StandardCacheModuleInterface实现
 * - 统一配置管理
 * - 标准化错误处理
 * - 性能监控和诊断
 * - 模块间协作
 */

import {
  Injectable,
  Inject,
  ServiceUnavailableException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";

// Foundation layer imports
import {
  StandardCacheModuleInterface,
  CachePerformanceMetrics,
  CacheCapacityInfo,
  CacheErrorStatistics,
  DiagnosticsResult,
  SelfHealingResult,
} from '../../../foundation/interfaces/standard-cache-module.interface';

import {
  CacheUnifiedConfigInterface,
  CacheConfigValidationResult,
} from '../../../foundation/types/cache-config.types';

import {
  ModuleInitOptions,
  ModuleStatus,
  MemoryUsage,
  ConnectionInfo,
  ImportOptions,
  ImportResult,
} from '../../../foundation/types/cache-module.types';

import {
  BaseCacheResult,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheStatsResult,
  CacheHealthResult,
  CacheOperationOptions,
  BatchOperationOptions,
  CacheBatchResult,
} from '../../../foundation/types/cache-result.types';

import {
  CACHE_STATUS,
  CACHE_OPERATIONS,
  CACHE_ERROR_CODES,
} from '../../../foundation/constants/cache-operations.constants';

// Stream-specific imports
import {
  IStreamCache,
  StreamDataPoint,
  StreamCacheConfig,
} from '../interfaces/stream-cache.interface';

import {
  STREAM_CACHE_CONFIG,
  DEFAULT_STREAM_CACHE_CONFIG,
} from '../constants/stream-cache.constants';

import { STREAM_CACHE_ERROR_CODES } from '../constants/stream-cache-error-codes.constants';

// Common imports
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalRetryHandler
} from "@common/core/exceptions";

// Monitoring contracts
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
} from "../../../../../monitoring/contracts";
import { SYSTEM_STATUS_EVENTS } from "../../../../../monitoring/contracts/events/system-status.events";

/**
 * 健康检查状态接口
 */
interface StreamCacheHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  hotCacheSize: number;
  redisConnected: boolean;
  lastError: string | null;
  performance?: {
    avgHotCacheHitTime: number;
    avgWarmCacheHitTime: number;
    compressionRatio: number;
  };
}

/**
 * 标准化流缓存服务
 *
 * 实现双重接口：
 * 1. StandardCacheModuleInterface - 标准化缓存模块接口
 * 2. IStreamCache - 流缓存特定接口 (向后兼容)
 */
@Injectable()
export class StreamCacheStandardizedService
  implements StandardCacheModuleInterface, IStreamCache, OnModuleInit, OnModuleDestroy {

  // ========================================
  // 模块标识与元数据
  // ========================================

  readonly moduleType = 'stream';
  readonly moduleCategory: 'specialized' = 'specialized';
  readonly name = 'StreamCacheStandardized';
  readonly version = '2.0.0';

  /** 支持的功能特性 */
  get supportedFeatures(): string[] {
    return [
      'get', 'set', 'delete', 'exists', 'ttl', 'expire',
      'batch-operations', 'hot-cache', 'warm-cache', 'compression',
      'health-check', 'performance-metrics', 'self-healing',
      'stream-data', 'incremental-queries', 'redis-pipeline',
      'lru-eviction', 'smart-tiering', 'data-compression'
    ];
  }

  /** 依赖的其他模块 */
  get dependencies(): string[] {
    return ['basic']; // 依赖基础缓存模块
  }

  /** 模块优先级 - 高优先级，用于实时数据 */
  get priority(): number {
    return 2; // 高优先级
  }

  /** 模块描述 */
  get description(): string {
    return 'Specialized stream cache with hot/warm dual-layer architecture for real-time data processing';
  }

  // ========================================
  // 私有属性和状态管理
  // ========================================

  // 初始化状态
  private _isInitialized = false;
  private _isHealthy = false;
  private _config: CacheUnifiedConfigInterface;

  // 模块状态
  private _moduleStatus: ModuleStatus = {
    status: 'initializing',
    message: 'Stream cache module is starting...',
    lastUpdated: Date.now(),
  };

  // Hot Cache - LRU in-memory cache
  private readonly hotCache = new Map<
    string,
    {
      data: StreamDataPoint[];
      timestamp: number;
      accessCount: number;
    }
  >();

  // 流缓存特定配置
  private streamConfig: StreamCacheConfig;

  // 定时器管理
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  // 内存泄漏防护机制
  private isDestroyed = false;
  private readonly pendingAsyncOperations = new Set<NodeJS.Immediate>();

  // 性能监控数据
  private operationStats = {
    totalOperations: 0,
    totalHits: 0,
    totalMisses: 0,
    hotCacheHits: 0,
    warmCacheHits: 0,
    totalDuration: 0,
    errorCount: 0,
    lastResetTime: Date.now(),
  };

  // 错误历史记录
  private errorHistory: Array<{
    timestamp: number;
    type: string;
    severity: string;
    message: string;
    context?: Record<string, any>;
  }> = [];

  // 性能记录
  private performanceHistory: Array<{
    operation: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }> = [];

  // Logger实例
  private readonly logger = new Logger(StreamCacheStandardizedService.name);

  // ========================================
  // 构造函数
  // ========================================

  constructor(
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis,
    private readonly eventBus: EventEmitter2,
    @Inject(STREAM_CACHE_CONFIG_TOKEN) streamConfigPartial?: Partial<StreamCacheConfig>,
  ) {
    // 合并流缓存配置
    this.streamConfig = { ...DEFAULT_STREAM_CACHE_CONFIG, ...streamConfigPartial };

    this.logger.log("StreamCacheStandardizedService initialized", {
      moduleType: this.moduleType,
      version: this.version,
      hotCacheTTL: this.streamConfig.hotCacheTTL,
      warmCacheTTL: this.streamConfig.warmCacheTTL,
      maxHotCacheSize: this.streamConfig.maxHotCacheSize,
    });
  }

  // ========================================
  // 生命周期管理 - StandardCacheModuleInterface
  // ========================================

  async onModuleInit(): Promise<void> {
    this.logger.log('StreamCacheStandardizedService module initializing...');
  }

  async onModuleDestroy(): Promise<void> {
    await this.destroy();
  }

  async initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void> {
    this._moduleStatus = {
      status: 'initializing',
      message: 'Stream cache initializing...',
      lastUpdated: Date.now(),
    };

    try {
      // 更新配置
      this._config = config;

      // 启动定期清理
      this.setupPeriodicCleanup();

      // 测试Redis连接
      await this.redisClient.ping();

      this._moduleStatus = {
        status: 'ready',
        message: 'Stream cache initialized successfully',
        lastUpdated: Date.now(),
        startedAt: Date.now(),
      };

      this._isInitialized = true;
      this._isHealthy = true;

      this.logger.log('Stream cache module initialized successfully');
    } catch (error) {
      this._moduleStatus = {
        status: 'error',
        message: `Stream cache initialization failed: ${error.message}`,
        lastUpdated: Date.now(),
      };
      this._isInitialized = false;
      this._isHealthy = false;
      throw error;
    }
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this._isInitialized = false;
    this._isHealthy = false;

    // 清理定时器
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    // 清理待执行的异步操作
    if (this.pendingAsyncOperations.size > 0) {
      this.pendingAsyncOperations.forEach(clearImmediate);
      this.pendingAsyncOperations.clear();
    }

    // 清理Hot Cache
    this.hotCache.clear();

    this.logger.log('Stream cache module destroyed successfully');
  }

  // ========================================
  // 配置管理 - StandardCacheModuleInterface
  // ========================================

  get config(): CacheUnifiedConfigInterface {
    return this._config;
  }

  get moduleStatus(): ModuleStatus {
    return this._moduleStatus;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * 映射流缓存配置到统一配置接口
   */
  private mapStreamConfigToUnified(streamConfig: StreamCacheConfig): CacheUnifiedConfigInterface {
    return {
      name: 'stream-cache',
      defaultTtlSeconds: streamConfig.warmCacheTTL,
      maxTtlSeconds: Math.max(streamConfig.warmCacheTTL * 2, 3600),
      minTtlSeconds: Math.min(streamConfig.hotCacheTTL / 1000, 1),
      compressionEnabled: streamConfig.compressionEnabled || true,
      compressionThresholdBytes: streamConfig.compressionThreshold || 1024,
      metricsEnabled: streamConfig.performanceMonitoring || true,
      performanceMonitoringEnabled: streamConfig.performanceMonitoring || true,

      ttl: {
        realTimeTtlSeconds: streamConfig.hotCacheTTL / 1000,
        nearRealTimeTtlSeconds: streamConfig.warmCacheTTL / 2,
        batchQueryTtlSeconds: streamConfig.warmCacheTTL,
        offHoursTtlSeconds: streamConfig.warmCacheTTL * 2,
        weekendTtlSeconds: streamConfig.warmCacheTTL * 4,
      },

      performance: {
        maxMemoryMb: 256, // 流缓存使用较少内存
        defaultBatchSize: streamConfig.streamBatchSize || 50,
        maxConcurrentOperations: 100,
        slowOperationThresholdMs: streamConfig.slowOperationThreshold || 100,
        connectionTimeoutMs: streamConfig.connectionTimeout,
        operationTimeoutMs: streamConfig.connectionTimeout,
      },

      intervals: {
        cleanupIntervalMs: streamConfig.cleanupInterval,
        healthCheckIntervalMs: streamConfig.heartbeatInterval * 2,
        metricsCollectionIntervalMs: streamConfig.statsLogInterval || 60000,
        statsLogIntervalMs: streamConfig.statsLogInterval || 60000,
        heartbeatIntervalMs: streamConfig.heartbeatInterval,
      },

      limits: {
        maxKeyLength: 255,
        maxValueSizeBytes: 10 * 1024 * 1024, // 10MB for stream data
        maxCacheEntries: streamConfig.maxHotCacheSize,
        memoryThresholdRatio: streamConfig.memoryCleanupThreshold || 0.85,
        errorRateAlertThreshold: 0.05,
      },

      retry: {
        maxRetryAttempts: streamConfig.maxRetryAttempts || 3,
        baseRetryDelayMs: streamConfig.retryBaseDelay || 100,
        retryDelayMultiplier: streamConfig.retryDelayMultiplier || 2,
        maxRetryDelayMs: 10000,
        exponentialBackoffEnabled: true,
      },
    };
  }

  getModuleSpecificConfig<T = StreamCacheConfig>(): T {
    return this.streamConfig as T;
  }

  validateModuleSpecificConfig<T = StreamCacheConfig>(config: T): CacheConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const streamConfig = config as any as StreamCacheConfig;

    // 验证流缓存特定配置
    if (streamConfig.hotCacheTTL && streamConfig.hotCacheTTL < 1000) {
      errors.push('hotCacheTTL must be at least 1000ms');
    }

    if (streamConfig.warmCacheTTL && streamConfig.warmCacheTTL < 5) {
      errors.push('warmCacheTTL must be at least 5 seconds');
    }

    if (streamConfig.maxHotCacheSize && streamConfig.maxHotCacheSize < 10) {
      errors.push('maxHotCacheSize must be at least 10');
    }

    // 业务逻辑验证
    if (streamConfig.hotCacheTTL && streamConfig.warmCacheTTL) {
      if (streamConfig.hotCacheTTL / 1000 > streamConfig.warmCacheTTL) {
        warnings.push('Hot cache TTL is longer than warm cache TTL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async applyConfigUpdate(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    // 更新统一配置
    this._config = { ...this._config, ...newConfig };

    // 如果有流缓存特定的配置更新，也要应用
    if (newConfig.performance?.defaultBatchSize) {
      this.streamConfig.streamBatchSize = newConfig.performance.defaultBatchSize;
    }

    if (newConfig.ttl?.realTimeTtlSeconds) {
      this.streamConfig.hotCacheTTL = newConfig.ttl.realTimeTtlSeconds * 1000;
    }

    if (newConfig.ttl?.batchQueryTtlSeconds) {
      this.streamConfig.warmCacheTTL = newConfig.ttl.batchQueryTtlSeconds;
    }

    this.logger.log(`Stream cache configuration updated`);
  }

  validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础验证
    if (config.defaultTtlSeconds && config.defaultTtlSeconds < 1) {
      errors.push('defaultTtlSeconds must be at least 1');
    }

    if (config.limits?.maxCacheEntries && config.limits.maxCacheEntries < 10) {
      errors.push('maxCacheEntries must be at least 10');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================
  // 核心缓存操作 - StandardCacheModuleInterface
  // ========================================

  async get<T = StreamDataPoint[]>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
    const startTime = Date.now();

    try {
      this.operationStats.totalOperations++;

      // 1. 检查 Hot Cache
      const hotCacheData = this.getFromHotCache(key);
      if (hotCacheData) {
        const duration = Date.now() - startTime;
        this.operationStats.totalHits++;
        this.operationStats.hotCacheHits++;
        this.operationStats.totalDuration += duration;

        this.recordPerformance('get', duration, true);
        this.emitCacheMetric("get", true, duration, {
          cacheType: "stream-cache",
          layer: "hot",
        });

        return {
          success: true,
          status: CACHE_STATUS.HIT,
          operation: CACHE_OPERATIONS.GET,
          data: hotCacheData as T,
          hit: true,
          cacheLevel: 'hot-cache',
          remainingTtl: Math.floor(this.streamConfig.hotCacheTTL / 1000),
          timestamp: Date.now(),
          duration,
          key,
        };
      }

      // 2. 检查 Warm Cache (Redis)
      const warmCacheData = await this.getFromWarmCache(key);
      if (warmCacheData) {
        const duration = Date.now() - startTime;
        this.operationStats.totalHits++;
        this.operationStats.warmCacheHits++;
        this.operationStats.totalDuration += duration;

        this.recordPerformance('get', duration, true);

        // 提升到 Hot Cache
        this.setToHotCache(key, warmCacheData);

        this.emitCacheMetric("get", true, duration, {
          cacheType: "stream-cache",
          layer: "warm",
        });

        return {
          success: true,
          status: CACHE_STATUS.HIT,
          operation: CACHE_OPERATIONS.GET,
          data: warmCacheData as T,
          hit: true,
          cacheLevel: 'warm-cache',
          remainingTtl: this.streamConfig.warmCacheTTL,
          timestamp: Date.now(),
          duration,
          key,
        };
      }

      // 3. Cache miss
      const duration = Date.now() - startTime;
      this.operationStats.totalMisses++;
      this.operationStats.totalDuration += duration;

      this.recordPerformance('get', duration, true);
      this.emitCacheMetric("get", false, duration, {
        cacheType: "stream-cache",
        layer: "miss",
      });

      return {
        success: true,
        status: CACHE_STATUS.MISS,
        operation: CACHE_OPERATIONS.GET,
        data: null as T,
        hit: false,
        cacheLevel: 'none',
        remainingTtl: 0,
        timestamp: Date.now(),
        duration,
        key,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.operationStats.errorCount++;
      this.operationStats.totalDuration += duration;

      this.recordError(error, { operation: 'get', key });
      this.recordPerformance('get', duration, false);

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: null as T,
        hit: false,
        cacheLevel: 'error',
        remainingTtl: 0,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration,
        key,
      };
    }
  }

  async set<T = StreamDataPoint[]>(
    key: string,
    value: T,
    options?: CacheOperationOptions
  ): Promise<CacheSetResult> {
    const startTime = Date.now();

    try {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return {
          success: false,
          status: CACHE_STATUS.ERROR,
          operation: CACHE_OPERATIONS.SET,
          data: false,
          ttl: 0,
          replaced: false,
          error: 'Value cannot be empty',
          errorCode: CACHE_ERROR_CODES.INVALID_PARAMETER,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          key,
        };
      }

      // 数据压缩
      const compressedData = this.compressData(Array.isArray(value) ? value : [value]);
      const dataSize = JSON.stringify(compressedData).length;

      // TTL处理
      const ttl = options?.ttl || this.streamConfig.warmCacheTTL;

      // 智能存储策略
      const priority = (options as any)?.priority || "auto";
      const shouldUseHotCache =
        priority === "hot" ||
        (priority === "auto" && dataSize < 10000 && compressedData.length < 100);

      if (shouldUseHotCache) {
        this.setToHotCache(key, compressedData);
      }

      // 总是同时存储到 Warm Cache 作为备份
      await this.setToWarmCache(key, compressedData);

      const duration = Date.now() - startTime;
      this.operationStats.totalOperations++;
      this.operationStats.totalDuration += duration;

      this.recordPerformance('set', duration, true);
      this.emitCacheMetric("set", true, duration, {
        cacheType: "stream-cache",
        layer: shouldUseHotCache ? "both" : "warm",
        dataSize,
        compressionRatio: compressedData.length / (Array.isArray(value) ? value.length : 1),
      });

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: true,
        ttl,
        replaced: (await this.exists(key)).data || false,
        timestamp: Date.now(),
        duration,
        key,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.operationStats.errorCount++;
      this.operationStats.totalDuration += duration;

      this.recordError(error, { operation: 'set', key });
      this.recordPerformance('set', duration, false);

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: false,
        ttl: 0,
        replaced: false,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration,
        key,
      };
    }
  }

  async delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    const startTime = Date.now();

    try {
      const existed = await this.exists(key);

      // 删除 Hot Cache (始终成功)
      const hotCacheDeleted = this.hotCache.delete(key);

      // 删除 Warm Cache (容错处理)
      let warmCacheDeleted = false;
      try {
        const result = await this.redisClient.del(this.buildWarmCacheKey(key));
        warmCacheDeleted = result > 0;
      } catch (error) {
        this.logger.warn("Warm cache deletion failed", { key, error: error.message });
      }

      const duration = Date.now() - startTime;
      this.operationStats.totalOperations++;
      this.operationStats.totalDuration += duration;

      this.recordPerformance('delete', duration, true);

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.DELETE,
        data: hotCacheDeleted || warmCacheDeleted,
        deletedCount: (hotCacheDeleted ? 1 : 0) + (warmCacheDeleted ? 1 : 0),
        deletedKeys: hotCacheDeleted || warmCacheDeleted ? [key] : [],
        timestamp: Date.now(),
        duration,
        key,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.operationStats.errorCount++;
      this.operationStats.totalDuration += duration;

      this.recordError(error, { operation: 'delete', key });
      this.recordPerformance('delete', duration, false);

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.DELETE,
        data: false,
        deletedCount: 0,
        deletedKeys: [],
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration,
        key,
      };
    }
  }

  async exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    const startTime = Date.now();

    try {
      // 检查 Hot Cache
      if (this.hotCache.has(key)) {
        const entry = this.hotCache.get(key);
        if (entry && Date.now() - entry.timestamp <= this.streamConfig.hotCacheTTL) {
          return {
            success: true,
            status: CACHE_STATUS.SUCCESS,
            operation: CACHE_OPERATIONS.EXISTS,
            data: true,
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            key,
          };
        }
      }

      // 检查 Warm Cache
      const warmExists = await this.redisClient.exists(this.buildWarmCacheKey(key));

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.EXISTS,
        data: warmExists > 0,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      this.recordError(error, { operation: 'exists', key });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.EXISTS,
        data: false,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    const startTime = Date.now();

    try {
      // 检查 Hot Cache
      if (this.hotCache.has(key)) {
        const entry = this.hotCache.get(key);
        if (entry) {
          const remainingTtl = Math.max(0, this.streamConfig.hotCacheTTL - (Date.now() - entry.timestamp));
          if (remainingTtl > 0) {
            return {
              success: true,
              status: CACHE_STATUS.SUCCESS,
              operation: CACHE_OPERATIONS.TTL,
              data: Math.floor(remainingTtl / 1000), // 返回秒数
              timestamp: Date.now(),
              duration: Date.now() - startTime,
              key,
            };
          }
        }
      }

      // 检查 Warm Cache
      const warmTtl = await this.redisClient.ttl(this.buildWarmCacheKey(key));

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.TTL,
        data: warmTtl,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      this.recordError(error, { operation: 'ttl', key });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.TTL,
        data: -1,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    const startTime = Date.now();

    try {
      let success = false;

      // 更新 Hot Cache TTL (通过重新设置时间戳)
      if (this.hotCache.has(key)) {
        const entry = this.hotCache.get(key);
        if (entry) {
          // 调整时间戳使其在指定TTL后过期
          entry.timestamp = Date.now() - (this.streamConfig.hotCacheTTL - (ttl * 1000));
          success = true;
        }
      }

      // 更新 Warm Cache TTL
      const warmResult = await this.redisClient.expire(this.buildWarmCacheKey(key), ttl);
      success = success || warmResult === 1;

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.EXPIRE,
        data: success,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      this.recordError(error, { operation: 'expire', key });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.EXPIRE,
        data: false,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  // ========================================
  // 必需的StandardCacheModuleInterface方法
  // ========================================

  async increment(key: string, delta: number = 1, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    const startTime = Date.now();

    try {
      const result = await this.redisClient.incrby(this.buildWarmCacheKey(key), delta);
      
      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: result,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    } catch (error) {
      this.recordError(error, { operation: 'increment', key });
      
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: 0,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async decrement(key: string, delta: number = 1, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    const startTime = Date.now();

    try {
      const result = await this.redisClient.decrby(this.buildWarmCacheKey(key), delta);
      
      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: result,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    } catch (error) {
      this.recordError(error, { operation: 'decrement', key });
      
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: 0,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async setIfNotExists(key: string, value: any, options?: CacheOperationOptions): Promise<CacheSetResult> {
    const startTime = Date.now();

    try {
      const exists = await this.exists(key);
      if (exists.data) {
        return {
          success: true,
          status: CACHE_STATUS.SUCCESS,
          operation: CACHE_OPERATIONS.SET,
          data: false, // Key already exists
          ttl: 0,
          replaced: false,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          key,
        };
      }

      const setResult = await this.set(key, value, options);

      return {
        success: setResult.success,
        status: setResult.status,
        operation: CACHE_OPERATIONS.SET,
        data: setResult.success,
        ttl: setResult.ttl || 0,
        replaced: setResult.replaced || false,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    } catch (error) {
      this.recordError(error, { operation: 'setIfNotExists', key });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: false,
        ttl: 0,
        replaced: false,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>> {
    const startTime = Date.now();
    const results: BaseCacheResult<T>[] = [];

    try {
      for (const key of keys) {
        const result = await this.get<T>(key, options);
        results.push({
          success: result.success,
          status: result.status,
          operation: result.operation,
          data: result.data,
          timestamp: result.timestamp,
          duration: result.duration,
          key: result.key,
          error: result.error,
        });
      }

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: results.map(r => r.data),
        results,
        totalCount: keys.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        failedKeys: results.filter(r => !r.success).map(r => r.key || ''),
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.recordError(error, { operation: 'batchGet', keys });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: [],
        results,
        totalCount: keys.length,
        successCount: 0,
        failureCount: keys.length,
        failedKeys: keys,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  async batchSet<T = any>(items: Array<{ key: string; value: T; ttl?: number }>, options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    const startTime = Date.now();
    const results: BaseCacheResult<boolean>[] = [];

    try {
      for (const item of items) {
        const result = await this.set(item.key, item.value, { ...options, ttl: item.ttl });
        results.push({
          success: result.success,
          status: result.status,
          operation: result.operation,
          data: result.data,
          timestamp: result.timestamp,
          duration: result.duration,
          key: result.key,
          error: result.error,
        });
      }

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: results.map(r => r.data),
        results,
        totalCount: items.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        failedKeys: results.filter(r => !r.success).map(r => r.key || ''),
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.recordError(error, { operation: 'batchSet', itemCount: items.length });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: [],
        results,
        totalCount: items.length,
        successCount: 0,
        failureCount: items.length,
        failedKeys: items.map(item => item.key),
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  async batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    const startTime = Date.now();
    const results: BaseCacheResult<boolean>[] = [];

    try {
      for (const key of keys) {
        const result = await this.delete(key, options);
        results.push({
          success: result.success,
          status: result.status,
          operation: result.operation,
          data: result.data,
          timestamp: result.timestamp,
          duration: result.duration,
          key: result.key,
          error: result.error,
        });
      }

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.DELETE,
        data: results.map(r => r.data),
        results,
        totalCount: keys.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        failedKeys: results.filter(r => !r.success).map(r => r.key || ''),
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.recordError(error, { operation: 'batchDelete', keys });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.DELETE,
        data: [],
        results,
        totalCount: keys.length,
        successCount: 0,
        failureCount: keys.length,
        failedKeys: keys,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  // ========================================
  // 流缓存特定方法 - IStreamCache接口实现
  // ========================================

  /**
   * 获取数据 - IStreamCache接口实现
   */
  async getData(key: string): Promise<StreamDataPoint[] | null> {
    const result = await this.get<StreamDataPoint[]>(key);
    return result.success && result.hit ? result.data : null;
  }

  /**
   * 设置数据到缓存 - IStreamCache接口实现
   */
  async setData(
    key: string,
    data: any[],
    priority: "hot" | "warm" | "auto" = "auto",
  ): Promise<void> {
    await this.set(key, data as StreamDataPoint[], { priority } as any);
  }

  /**
   * 获取自指定时间戳以来的数据 - IStreamCache接口实现
   */
  async getDataSince(key: string, since: number): Promise<StreamDataPoint[] | null> {
    try {
      const allData = await this.getData(key);
      if (!allData) return null;

      // 过滤出指定时间戳之后的数据
      const incrementalData = allData.filter((point) => point.t > since);

      this.logger.debug("Incremental data query", {
        key,
        since,
        totalPoints: allData.length,
        incrementalPoints: incrementalData.length,
      });

      return incrementalData.length > 0 ? incrementalData : null;
    } catch (error) {
      this.recordError(error, { operation: 'getDataSince', key });
      return null;
    }
  }

  /**
   * 批量获取数据 - IStreamCache接口实现
   * 增强版：使用Redis Pipeline优化 + 降级策略
   */
  async getBatchData(keys: string[]): Promise<Record<string, StreamDataPoint[] | null>> {
    const result: Record<string, StreamDataPoint[] | null> = {};

    if (!keys || keys.length === 0) return result;

    try {
      const batchSize = this.streamConfig.streamBatchSize || 50; // 配置化批次大小

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);

        try {
          // 优先使用Redis Pipeline进行批量获取
          await this.getBatchWithPipeline(batch, result);
        } catch (pipelineError) {
          this.logger.warn("Pipeline批量获取失败，降级到单个获取", {
            batch,
            error: pipelineError.message
          });
          // 降级到单个获取
          await this.fallbackToSingleGets(batch, result);
        }
      }

      return result;
    } catch (error) {
      this.recordError(error, { operation: 'getBatchData', keys: keys.join(",") });

      // 最终降级：使用原始的batchGet方法
      this.logger.warn("批量获取完全失败，使用原始方法", {
        error: error.message,
        keyCount: keys.length
      });

      const batchResult = await this.batchGet<StreamDataPoint[]>(keys);
      keys.forEach((key, index) => {
        const itemResult = batchResult.results[index];
        result[key] = itemResult?.success ? itemResult.data : null;
      });

      return result;
    }
  }

  /**
   * 删除缓存数据 - IStreamCache接口实现
   */
  async deleteData(key: string): Promise<void> {
    await this.delete(key);
  }

  /**
   * 清空所有缓存 - IStreamCache接口实现
   */
  async clearAll(options: { force?: boolean; preserveActive?: boolean; maxAge?: number } = {}): Promise<void> {
    await this.clear('*', options as CacheOperationOptions);
  }

  // ========================================
  // 清理操作增强实现
  // ========================================

  async clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    const startTime = Date.now();

    try {
      // 清空 Hot Cache
      this.hotCache.clear();

      // 清空 Warm Cache 中的流数据
      const warmCachePattern = `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}*`;
      let deletedCount = 0;
      let deletedKeys: string[] = [];

      const preserveActive = (options as any)?.preserveActive;
      const maxAge = (options as any)?.maxAge;
      const force = (options as any)?.force;

      if (preserveActive) {
        // 保留活跃流数据，只清理过期数据
        const expiredKeys = await this.clearExpiredOnly(warmCachePattern, maxAge || 3600);
        deletedCount = expiredKeys.length;
        deletedKeys = expiredKeys;
      } else {
        // 智能选择清理策略
        const cacheStats = await this.getCacheStats();
        const estimatedKeys = cacheStats.keyCount || 0;

        if (estimatedKeys < 1000 || force) {
          // 小量数据，直接SCAN+UNLINK
          const keys = await this.scanAndClear(warmCachePattern);
          deletedCount = keys.length;
          deletedKeys = keys;
        } else {
          // 大量数据，分批清理避免阻塞
          deletedCount = await this.batchClearWithProgress(warmCachePattern);
        }
      }

      const duration = Date.now() - startTime;
      this.operationStats.totalOperations++;
      this.operationStats.totalDuration += duration;

      this.recordPerformance('clear', duration, true);

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.CLEAR,
        data: true,
        deletedCount,
        deletedKeys,
        timestamp: Date.now(),
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.operationStats.errorCount++;
      this.operationStats.totalDuration += duration;

      this.recordError(error, { operation: 'clear' });
      this.recordPerformance('clear', duration, false);

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.CLEAR,
        data: false,
        deletedCount: 0,
        deletedKeys: [],
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration,
      };
    }
  }

  // ========================================
  // 性能监控 - 标准化实现
  // ========================================

  async getPerformanceMetrics(): Promise<CachePerformanceMetrics> {
    const totalOps = this.operationStats.totalOperations || 1;
    const avgResponseTime = this.operationStats.totalDuration / totalOps;

    return {
      avgResponseTime,
      p95ResponseTime: avgResponseTime * 1.5, // 估算
      p99ResponseTime: avgResponseTime * 2.0, // 估算
      throughput: totalOps / ((Date.now() - this.operationStats.lastResetTime) / 1000),
      hitRate: this.operationStats.totalHits / Math.max(1, this.operationStats.totalHits + this.operationStats.totalMisses),
      errorRate: this.operationStats.errorCount / totalOps,
      memoryEfficiency: Math.min(1.0, this.hotCache.size / this.streamConfig.maxHotCacheSize),
      cpuUsage: 0, // 需要外部监控
      networkUsage: 0, // 需要外部监控
    };
  }

  async getCapacityInfo(): Promise<CacheCapacityInfo> {
    const currentKeys = this.hotCache.size;
    const maxKeys = this.streamConfig.maxHotCacheSize;

    // 估算内存使用
    let currentMemory = 0;
    for (const entry of this.hotCache.values()) {
      currentMemory += JSON.stringify(entry.data).length;
    }

    const maxMemory = this._config.performance.maxMemoryMb * 1024 * 1024;

    return {
      currentKeys,
      maxKeys,
      keyUtilization: currentKeys / maxKeys,
      currentMemory,
      maxMemory,
      memoryUtilization: currentMemory / maxMemory,
      estimatedRemainingCapacity: {
        keys: maxKeys - currentKeys,
        memoryBytes: maxMemory - currentMemory,
        estimatedFullInMs: currentKeys === 0 ? -1 :
          (maxKeys - currentKeys) * ((Date.now() - this.operationStats.lastResetTime) / currentKeys),
      },
    };
  }

  async getErrorStatistics(): Promise<CacheErrorStatistics> {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };

    // 分析错误历史
    this.errorHistory.forEach(error => {
      const type = error.type || 'unknown';
      const severity = error.severity || 'medium';

      errorsByType[type] = (errorsByType[type] || 0) + 1;
      errorsBySeverity[severity as keyof typeof errorsBySeverity]++;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(-10),
      errorTrend: new Array(24).fill(0), // 简化实现
    };
  }

  async runDiagnostics(): Promise<DiagnosticsResult> {
    const checks = [];
    const issues = [];
    let overallScore = 100;

    // 检查Redis连接
    try {
      await this.redisClient.ping();
      checks.push({
        name: 'redis_connection',
        status: 'pass' as const,
        score: 100,
        message: 'Redis connection is healthy',
      });
    } catch (error) {
      overallScore -= 30;
      checks.push({
        name: 'redis_connection',
        status: 'fail' as const,
        score: 0,
        message: 'Redis connection failed',
        recommendation: 'Check Redis server status and connection settings',
      });
      issues.push({
        severity: 'critical' as const,
        category: 'connectivity',
        description: 'Redis connection is unavailable',
        impact: 'Warm cache operations will fail',
        solution: 'Restart Redis service or check network connectivity',
      });
    }

    // 检查内存使用
    const capacityInfo = await this.getCapacityInfo();
    if (capacityInfo.memoryUtilization > 0.9) {
      overallScore -= 20;
      checks.push({
        name: 'memory_usage',
        status: 'warn' as const,
        score: 70,
        message: `Memory utilization is high: ${(capacityInfo.memoryUtilization * 100).toFixed(1)}%`,
        recommendation: 'Consider increasing memory limits or implementing more aggressive cleanup',
      });
      issues.push({
        severity: 'high' as const,
        category: 'performance',
        description: 'Memory utilization exceeds 90%',
        impact: 'Cache performance may degrade',
        solution: 'Increase memory allocation or optimize data compression',
      });
    } else {
      checks.push({
        name: 'memory_usage',
        status: 'pass' as const,
        score: 100,
        message: `Memory utilization is healthy: ${(capacityInfo.memoryUtilization * 100).toFixed(1)}%`,
      });
    }

    // 检查错误率
    const perfMetrics = await this.getPerformanceMetrics();
    if (perfMetrics.errorRate > 0.05) {
      overallScore -= 15;
      checks.push({
        name: 'error_rate',
        status: 'warn' as const,
        score: 80,
        message: `Error rate is elevated: ${(perfMetrics.errorRate * 100).toFixed(2)}%`,
        recommendation: 'Investigate error patterns and improve error handling',
      });
    } else {
      checks.push({
        name: 'error_rate',
        status: 'pass' as const,
        score: 100,
        message: `Error rate is acceptable: ${(perfMetrics.errorRate * 100).toFixed(2)}%`,
      });
    }

    return {
      overallHealthScore: Math.max(0, overallScore),
      checks,
      issues,
      performanceRecommendations: [
        'Monitor hit rate and adjust TTL strategies if needed',
        'Consider implementing data partitioning for large datasets',
        'Regularly analyze access patterns for optimization opportunities',
      ],
      configurationRecommendations: [
        'Ensure hot cache size is appropriate for workload',
        'Verify compression settings are optimal for data types',
        'Review cleanup intervals based on data volatility',
      ],
    };
  }

  async attemptSelfHealing(): Promise<SelfHealingResult> {
    const fixes = [];
    let successfulFixes = 0;

    // 尝试修复Redis连接
    try {
      await this.redisClient.ping();
    } catch (error) {
      try {
        // 尝试重新连接（这里简化处理）
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.redisClient.ping();

        fixes.push({
          issue: 'redis_connection_failed',
          action: 'attempted_reconnection',
          success: true,
          message: 'Redis connection restored',
        });
        successfulFixes++;
      } catch (reconnectError) {
        fixes.push({
          issue: 'redis_connection_failed',
          action: 'attempted_reconnection',
          success: false,
          message: 'Failed to restore Redis connection',
        });
      }
    }

    // 清理过期的Hot Cache条目
    try {
      this.cleanupExpiredEntries();
      fixes.push({
        issue: 'memory_cleanup',
        action: 'cleaned_expired_entries',
        success: true,
        message: 'Cleaned up expired hot cache entries',
      });
      successfulFixes++;
    } catch (error) {
      fixes.push({
        issue: 'memory_cleanup',
        action: 'cleaned_expired_entries',
        success: false,
        message: 'Failed to clean up expired entries',
      });
    }

    return {
      success: successfulFixes > 0,
      attemptedFixes: fixes.length,
      successfulFixes,
      fixes,
      remainingIssues: fixes.filter(f => !f.success).map(f => f.issue),
    };
  }

  // ========================================
  // 监控和统计增强
  // ========================================

  async getStats(timeRangeMs?: number): Promise<CacheStatsResult> {
    const perfMetrics = await this.getPerformanceMetrics();
    const capacityInfo = await this.getCapacityInfo();

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        hits: this.operationStats.totalHits,
        misses: this.operationStats.totalMisses,
        hitRate: perfMetrics.hitRate,
        totalOperations: this.operationStats.totalOperations,
        keyCount: capacityInfo.currentKeys,
        memoryUsageBytes: capacityInfo.currentMemory,
        memoryUsageRatio: capacityInfo.memoryUtilization,
        avgResponseTimeMs: perfMetrics.avgResponseTime,
        errorCount: this.operationStats.errorCount,
        errorRate: perfMetrics.errorRate,
        lastResetTime: this.operationStats.lastResetTime,
        // Note: Additional stream-specific stats could be added to metadata
        lastCleanupTime: Date.now(),
      },
      timeRangeMs: timeRangeMs || (Date.now() - this.operationStats.lastResetTime),
      collectionTime: Date.now(),
      timestamp: Date.now(),
      metadata: {
        // Stream-specific statistics
        hotCacheHits: this.operationStats.hotCacheHits,
        warmCacheHits: this.operationStats.warmCacheHits,
        compressionRatio: 0.8, // 估算值
        cacheType: 'stream-cache',
        version: this.version,
      },
    };
  }

  async resetStats(): Promise<BaseCacheResult<boolean>> {
    this.operationStats = {
      totalOperations: 0,
      totalHits: 0,
      totalMisses: 0,
      hotCacheHits: 0,
      warmCacheHits: 0,
      totalDuration: 0,
      errorCount: 0,
      lastResetTime: Date.now(),
    };

    // 重置错误和性能历史
    this.errorHistory = [];
    this.performanceHistory = [];

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: true,
      timestamp: Date.now(),
    };
  }

  async getHealth(): Promise<CacheHealthResult> {
    try {
      // Redis连接测试
      await this.redisClient.ping();

      const perfMetrics = await this.getPerformanceMetrics();
      const capacityInfo = await this.getCapacityInfo();

      // 计算健康分数
      let healthScore = 100;
      const checks = [];

      // 内存使用检查
      if (capacityInfo.memoryUtilization > 0.9) {
        healthScore -= 20;
        checks.push({
          name: 'memory_usage',
          status: 'warn' as const,
          value: capacityInfo.memoryUtilization,
          description: 'Memory utilization high',
        });
      } else {
        checks.push({
          name: 'memory_usage',
          status: 'pass' as const,
          value: capacityInfo.memoryUtilization,
          description: 'Memory utilization normal',
        });
      }

      // 错误率检查
      if (perfMetrics.errorRate > 0.05) {
        healthScore -= 15;
        checks.push({
          name: 'error_rate',
          status: 'warn' as const,
          value: perfMetrics.errorRate,
          description: 'Error rate elevated',
        });
      } else {
        checks.push({
          name: 'error_rate',
          status: 'pass' as const,
          value: perfMetrics.errorRate,
          description: 'Error rate acceptable',
        });
      }

      // 命中率检查
      if (perfMetrics.hitRate < 0.7) {
        healthScore -= 10;
        checks.push({
          name: 'hit_rate',
          status: 'warn' as const,
          value: perfMetrics.hitRate,
          description: 'Hit rate below optimal',
        });
      } else {
        checks.push({
          name: 'hit_rate',
          status: 'pass' as const,
          value: perfMetrics.hitRate,
          description: 'Hit rate healthy',
        });
      }

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: {
          connectionStatus: CACHE_STATUS.CONNECTED,
          memoryStatus: capacityInfo.memoryUtilization > 0.9 ? 'critical' : 'healthy',
          performanceStatus: perfMetrics.errorRate > 0.05 ? 'degraded' : 'healthy',
          errorRateStatus: perfMetrics.errorRate > 0.1 ? 'critical' : perfMetrics.errorRate > 0.05 ? 'warning' : 'healthy',
          lastCheckTime: Date.now(),
          uptimeMs: this._moduleStatus.startedAt ? Date.now() - this._moduleStatus.startedAt : 0,
        },
        checks,
        healthScore,
        timestamp: Date.now(),
      };

    } catch (error) {
      this.recordError(error, { operation: 'healthCheck' });
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: {
          connectionStatus: CACHE_STATUS.ERROR,
          memoryStatus: 'critical',
          performanceStatus: 'poor',
          errorRateStatus: 'critical',
          lastCheckTime: Date.now(),
          uptimeMs: this._moduleStatus.startedAt ? Date.now() - this._moduleStatus.startedAt : 0,
        },
        checks: [{
          name: 'basic_health',
          status: 'fail',
          value: false,
          description: `Health check failed: ${error.message}`,
        }],
        healthScore: 0,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  async getMemoryUsage(): Promise<BaseCacheResult<MemoryUsage>> {
    const capacityInfo = await this.getCapacityInfo();

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        usedMemoryBytes: capacityInfo.currentMemory,
        totalMemoryBytes: capacityInfo.maxMemory,
        memoryUsageRatio: capacityInfo.memoryUtilization,
        keyCount: capacityInfo.currentKeys,
        avgKeySize: capacityInfo.currentKeys > 0 ? capacityInfo.currentMemory / capacityInfo.currentKeys : 0,
      },
      timestamp: Date.now(),
    };
  }

  async getConnectionInfo(): Promise<BaseCacheResult<ConnectionInfo>> {
    try {
      const startTime = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - startTime;

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: {
          status: 'connected',
          address: this.redisClient.options.host || 'localhost',
          port: this.redisClient.options.port || 6379,
          connectedAt: this._moduleStatus.startedAt,
          lastHeartbeat: Date.now(),
          latencyMs: latency,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: {
          status: 'disconnected',
          address: this.redisClient.options.host || 'localhost',
          port: this.redisClient.options.port || 6379,
          connectedAt: this._moduleStatus.startedAt,
          lastHeartbeat: Date.now(),
          latencyMs: -1,
        },
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ========================================
  // 从旧系统移植的缺失功能
  // ========================================

  /**
   * 系统级指标监控报告 - 事件驱动实现
   * 从旧系统移植的功能，提供向后兼容性
   */
  async reportSystemMetrics(): Promise<void> {
    try {
      // 获取健康状态
      const healthResult = await this.getHealth();
      const capacityInfo = await this.getCapacityInfo();
      const perfMetrics = await this.getPerformanceMetrics();

      // 核心系统指标上报
      this.emitSystemEvent("cache_hot_size", this.hotCache.size, {
        maxSize: this.streamConfig.maxHotCacheSize,
        utilizationRatio: this.hotCache.size / this.streamConfig.maxHotCacheSize,
      });

      // 健康状态指标 (0=unhealthy, 1=healthy)
      const healthStatus = healthResult.success && healthResult.healthScore > 70 ? 1 : 0;
      this.emitSystemEvent("health_status", healthStatus, {
        healthScore: healthResult.healthScore || 0,
        connectionStatus: healthResult.success ? "connected" : "disconnected",
      });

      // 内存使用指标
      this.emitSystemEvent("memory_usage_bytes", capacityInfo.currentMemory, {
        maxMemory: capacityInfo.maxMemory,
        utilizationRatio: capacityInfo.memoryUtilization,
        keyCount: capacityInfo.currentKeys,
      });

      // 性能指标
      this.emitSystemEvent("hit_rate", perfMetrics.hitRate, {
        totalHits: this.operationStats.totalHits,
        totalMisses: this.operationStats.totalMisses,
        hotCacheHits: this.operationStats.hotCacheHits,
        warmCacheHits: this.operationStats.warmCacheHits,
      });

      this.emitSystemEvent("avg_response_time", perfMetrics.avgResponseTime, {
        totalOperations: this.operationStats.totalOperations,
        errorRate: perfMetrics.errorRate,
      });

      // 错误指标
      this.emitSystemEvent("error_count", this.operationStats.errorCount, {
        errorRate: perfMetrics.errorRate,
        lastResetTime: this.operationStats.lastResetTime,
      });

      // 容量告警指标
      if (capacityInfo.memoryUtilization > 0.8) {
        this.emitSystemEvent("capacity_warning", 1, {
          type: "memory_high",
          utilizationRatio: capacityInfo.memoryUtilization,
          threshold: 0.8,
        });
      }

      if (capacityInfo.keyUtilization > 0.9) {
        this.emitSystemEvent("capacity_warning", 1, {
          type: "keys_high",
          utilizationRatio: capacityInfo.keyUtilization,
          threshold: 0.9,
        });
      }

      this.logger.debug('System metrics reported successfully', {
        hotCacheSize: this.hotCache.size,
        memoryUsage: capacityInfo.currentMemory,
        hitRate: perfMetrics.hitRate,
        healthScore: healthResult.healthScore,
      });

    } catch (error) {
      this.recordError(error, { operation: 'reportSystemMetrics' });
      this.emitSystemEvent("metric_reporting_error", 1, {
        errorMessage: error.message,
        errorType: error.constructor.name,
      });
      this.logger.error('Failed to report system metrics', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 向后兼容的健康状态接口
   * 返回旧系统期望的StreamCacheHealthStatus格式
   */
  async getHealthStatus(): Promise<StreamCacheHealthStatus> {
    try {
      // 简单Redis连接测试
      await this.redisClient.ping();
      const perfMetrics = await this.getPerformanceMetrics();

      return {
        status: "healthy",
        hotCacheSize: this.hotCache.size,
        redisConnected: true,
        lastError: null,
        performance: {
          avgHotCacheHitTime: perfMetrics.avgResponseTime * 0.1, // 估算Hot Cache平均响应时间
          avgWarmCacheHitTime: perfMetrics.avgResponseTime * 0.9, // 估算Warm Cache平均响应时间
          compressionRatio: 0.8, // 估算压缩比
        },
      };
    } catch (error) {
      this.recordError(error, { operation: 'getHealthStatus' });
      return {
        status: "unhealthy",
        hotCacheSize: this.hotCache.size,
        redisConnected: false,
        lastError: error.message,
      };
    }
  }

  /**
   * 使用Redis Pipeline进行批量获取 - 性能优化
   * 从旧系统移植的高性能批量操作
   */
  private async getBatchWithPipeline(
    keys: string[],
    result: Record<string, StreamDataPoint[] | null>
  ): Promise<void> {
    // 先检查Hot Cache
    const hotCacheMisses: string[] = [];
    for (const key of keys) {
      const hotData = this.getFromHotCache(key);
      if (hotData) {
        result[key] = hotData;
      } else {
        hotCacheMisses.push(key);
      }
    }

    if (hotCacheMisses.length === 0) return;

    // 使用Pipeline批量获取Warm Cache
    const pipeline = this.redisClient.pipeline();
    hotCacheMisses.forEach(key => {
      const redisKey = this.buildWarmCacheKey(key);
      pipeline.get(redisKey);
    });

    const pipelineResults = await pipeline.exec();

    // 处理Pipeline结果
    hotCacheMisses.forEach((key, index) => {
      const [error, data] = pipelineResults[index];
      if (error) {
        this.logger.warn(`Redis获取失败: ${key}`, { error: error.message });
        result[key] = null;
      } else {
        if (data) {
          try {
            const parsedData = JSON.parse(data as string);
            result[key] = parsedData;
            // 提升到Hot Cache
            this.setToHotCache(key, parsedData);
          } catch (parseError) {
            this.logger.warn(`数据解析失败: ${key}`, { error: parseError.message });
            result[key] = null;
          }
        } else {
          result[key] = null;
        }
      }
    });
  }

  /**
   * 降级方法：Pipeline失败时的备选方案
   * 从旧系统移植的容错机制
   */
  private async fallbackToSingleGets(
    keys: string[],
    result: Record<string, StreamDataPoint[] | null>
  ): Promise<void> {
    const batchPromises = keys.map(async (key) => ({
      key,
      data: await this.getData(key), // 使用现有的getData方法
    }));

    const batchResults = await Promise.allSettled(batchPromises);

    // 处理Promise.allSettled结果
    batchResults.forEach((promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') {
        const { key, data } = promiseResult.value;
        result[key] = data;
      } else {
        // 记录失败的key，用于监控和重试
        const failedKey = keys[index];
        this.logger.warn(`批量获取失败: ${failedKey}`, {
          error: promiseResult.reason?.message
        });
        result[failedKey] = null;
      }
    });
  }

  /**
   * 发送系统级事件监控
   */
  private emitSystemEvent(
    metricName: string,
    value: number,
    tags: any = {},
  ): void {
    this.safeAsyncExecute(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream-cache-standardized",
        metricType: "system",
        metricName,
        metricValue: value,
        tags: {
          component: "StreamCacheStandardized",
          version: this.version,
          ...tags,
        },
      });
    });
  }

  // ========================================
  // 缺失的CacheServiceInterface方法
  // ========================================

  async refreshConfig(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    await this.applyConfigUpdate(newConfig);
  }

  async ping(): Promise<BaseCacheResult<number>> {
    const startTime = Date.now();

    try {
      await this.redisClient.ping();
      const latency = Date.now() - startTime;

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: latency,
        timestamp: Date.now(),
        duration: latency,
      };
    } catch (error) {
      this.recordError(error, { operation: 'ping' });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: -1,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  async getKeys(pattern?: string, limit?: number): Promise<BaseCacheResult<string[]>> {
    const startTime = Date.now();

    try {
      const searchPattern = pattern || `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}*`;
      const keys = await this.scanKeysWithTimeout(searchPattern, 5000);
      const limitedKeys = limit ? keys.slice(0, limit) : keys;

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: limitedKeys,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.recordError(error, { operation: 'getKeys', pattern });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: [],
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  async exportData(pattern?: string, format?: 'json' | 'csv'): Promise<BaseCacheResult<any>> {
    const startTime = Date.now();

    try {
      const searchPattern = pattern || `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}*`;
      const keys = await this.scanKeysWithTimeout(searchPattern, 10000);
      const exportData: Record<string, any> = {};

      // 批量获取数据
      for (let i = 0; i < keys.length; i += 100) {
        const batch = keys.slice(i, i + 100);
        const pipeline = this.redisClient.pipeline();

        batch.forEach(key => pipeline.get(key));
        const results = await pipeline.exec();

        batch.forEach((key, index) => {
          const [error, value] = results[index];
          if (!error && value) {
            try {
              exportData[key] = JSON.parse(value as string);
            } catch {
              exportData[key] = value;
            }
          }
        });
      }

      let result: any = exportData;
      if (format === 'csv') {
        // 简化的CSV转换
        const csvLines = Object.entries(exportData).map(([key, value]) => {
          return `"${key}","${JSON.stringify(value).replace(/"/g, '""')}"`;
        });
        result = ['Key,Value', ...csvLines].join('\n');
      }

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: result,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.recordError(error, { operation: 'exportData', pattern, format });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: null,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  getStatus(): ModuleStatus {
    return this._moduleStatus;
  }

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOperationOptions
  ): Promise<CacheGetResult<T>> {
    const startTime = Date.now();

    try {
      // 首先尝试获取
      const getResult = await this.get<T>(key, options);
      if (getResult.hit && getResult.data !== null) {
        return getResult;
      }

      // 缓存未命中，使用工厂函数生成数据
      const factoryData = await factory();

      // 存储到缓存
      await this.set(key, factoryData, options);

      // 返回生成的数据
      return {
        success: true,
        status: CACHE_STATUS.MISS,
        operation: CACHE_OPERATIONS.GET,
        data: factoryData,
        hit: false,
        cacheLevel: 'factory',
        remainingTtl: options?.ttl || this.streamConfig.warmCacheTTL,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    } catch (error) {
      this.recordError(error, { operation: 'getOrSet', key });

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        data: null as T,
        hit: false,
        cacheLevel: 'error',
        remainingTtl: 0,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async importData(data: any, options?: ImportOptions): Promise<BaseCacheResult<ImportResult>> {
    const startTime = Date.now();
    let total = 0;
    let successful = 0;
    let failed = 0;
    const failedKeys: string[] = [];

    try {
      let entries: Record<string, any>;

      if (typeof data === 'string') {
        if (options?.format === 'csv') {
          // 简化的CSV解析
          const lines = data.split('\n');
          entries = {};
          for (let i = 1; i < lines.length; i++) { // 跳过标题行
            const [key, value] = lines[i].split(',');
            if (key && value) {
              try {
                entries[key.replace(/"/g, '')] = JSON.parse(value.replace(/"/g, ''));
              } catch {
                entries[key.replace(/"/g, '')] = value.replace(/"/g, '');
              }
            }
          }
        } else {
          entries = JSON.parse(data);
        }
      } else {
        entries = data;
      }

      const overwrite = options?.overwrite ?? true;
      const keyPrefix = options?.keyPrefix || '';

      total = Object.keys(entries).length;

      for (const [key, value] of Object.entries(entries)) {
        const fullKey = keyPrefix + key;

        try {
          if (!overwrite) {
            const exists = await this.exists(fullKey);
            if (exists.data) continue;
          }

          await this.set(fullKey, value);
          successful++;
        } catch (error) {
          failed++;
          failedKeys.push(fullKey);
          this.logger.warn(`Failed to import key: ${fullKey}`, { error: error.message });
        }
      }

      const result: ImportResult = {
        total,
        successful,
        failed,
        skipped: 0, // No skipped logic implemented yet
        failedKeys,
        durationMs: Date.now() - startTime,
      };

      return {
        success: failed === 0,
        status: failed === 0 ? CACHE_STATUS.SUCCESS : CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: result,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.recordError(error, { operation: 'importData', total, successful, failed });

      const result: ImportResult = {
        total,
        successful,
        failed: total - successful,
        skipped: 0,
        failedKeys,
        durationMs: Date.now() - startTime,
      };

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: result,
        error: error.message,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  // ========================================
  // 私有辅助方法
  // ========================================

  /**
   * 记录错误
   */
  private recordError(error: any, context: Record<string, any> = {}): void {
    const errorEntry = {
      timestamp: Date.now(),
      type: error.constructor.name || 'UnknownError',
      severity: this.determineSeverity(error),
      message: error.message || 'Unknown error',
      context,
    };

    this.errorHistory.push(errorEntry);

    // 保持错误历史记录在合理大小
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    this.logger.error('Stream cache operation error', errorEntry);
  }

  /**
   * 记录性能
   */
  private recordPerformance(operation: string, duration: number, success: boolean): void {
    const perfEntry = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
    };

    this.performanceHistory.push(perfEntry);

    // 保持性能历史记录在合理大小
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(error: any): string {
    if (error.message?.includes('Redis') || error.message?.includes('connection')) {
      return 'high';
    }
    if (error.message?.includes('timeout') || error.message?.includes('slow')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * 安全异步执行器 - 防止内存泄漏
   */
  private safeAsyncExecute(operation: () => void): void {
    if (this.isDestroyed) {
      return;
    }

    const immediateId = setImmediate(() => {
      if (!this.isDestroyed) {
        try {
          operation();
        } catch (error) {
          this.logger.warn("异步操作执行失败", { error: error.message });
        }
      }
      this.pendingAsyncOperations.delete(immediateId);
    });

    this.pendingAsyncOperations.add(immediateId);
  }

  /**
   * 发送缓存操作监控事件
   */
  private emitCacheMetric(
    operation: string,
    success: boolean,
    duration: number,
    metadata: any = {},
  ): void {
    this.safeAsyncExecute(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream-cache-standardized",
        metricType: "cache",
        metricName: `cache_${operation}_${success ? "success" : "failed"}`,
        metricValue: duration,
        tags: {
          operation,
          success: success.toString(),
          component: "StreamCacheStandardized",
          version: this.version,
          ...metadata,
        },
      });
    });
  }

  /**
   * 从 Hot Cache 获取数据
   */
  private getFromHotCache(key: string): StreamDataPoint[] | null {
    const entry = this.hotCache.get(key);
    if (!entry) return null;

    // 检查TTL
    if (Date.now() - entry.timestamp > this.streamConfig.hotCacheTTL) {
      this.hotCache.delete(key);
      return null;
    }

    // 更新访问计数
    entry.accessCount++;
    return entry.data;
  }

  /**
   * 设置数据到 Hot Cache
   */
  private setToHotCache(key: string, data: StreamDataPoint[]): void {
    // LRU 清理
    if (this.hotCache.size >= this.streamConfig.maxHotCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.hotCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * 从 Warm Cache (Redis) 获取数据
   */
  private async getFromWarmCache(key: string): Promise<StreamDataPoint[] | null> {
    try {
      return await UniversalRetryHandler.networkRetry(
        async () => {
          const cacheKey = this.buildWarmCacheKey(key);
          const cachedData = await this.redisClient.get(cacheKey);

          if (cachedData) {
            return JSON.parse(cachedData as string);
          }
          return null;
        },
        'getFromWarmCache',
        ComponentIdentifier.STREAM_CACHE
      );
    } catch (error) {
      this.logger.warn("Warm cache access failed", { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置数据到 Warm Cache (Redis)
   */
  private async setToWarmCache(key: string, data: StreamDataPoint[]): Promise<void> {
    try {
      await UniversalRetryHandler.networkRetry(
        async () => {
          const cacheKey = this.buildWarmCacheKey(key);
          const serializedData = JSON.stringify(data);

          // 设置TTL
          await this.redisClient.setex(
            cacheKey,
            this.streamConfig.warmCacheTTL,
            serializedData,
          );
          return true;
        },
        'setToWarmCache',
        ComponentIdentifier.STREAM_CACHE
      );
    } catch (error) {
      this.logger.warn("Warm cache set operation failed", { key, error: error.message });
    }
  }

  /**
   * 构建 Warm Cache 键
   */
  private buildWarmCacheKey(key: string): string {
    return `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}:${key}`;
  }

  /**
   * 数据压缩 - 将原始数据转换为压缩格式
   */
  private compressData(data: any[]): StreamDataPoint[] {
    const now = Date.now();

    return data.map((item, index) => {
      // 根据数据结构进行压缩映射
      if (typeof item === "object" && item !== null) {
        return {
          s: item.symbol || item.s || "",
          p: item.price || item.lastPrice || item.p || 0,
          v: item.volume || item.v || 0,
          t: item.timestamp || item.t || now + index,
          c: item.change || item.c,
          cp: item.changePercent || item.cp,
        };
      }
      return item;
    });
  }

  /**
   * LRU 清理最少使用的条目
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey = "";
    let lruAccessCount = Infinity;
    let lruTimestamp = Date.now();

    for (const [key, entry] of this.hotCache.entries()) {
      if (
        entry.accessCount < lruAccessCount ||
        (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)
      ) {
        lruKey = key;
        lruAccessCount = entry.accessCount;
        lruTimestamp = entry.timestamp;
      }
    }

    if (lruKey) {
      this.hotCache.delete(lruKey);
      this.logger.debug("LRU cleaned cache entry", {
        key: lruKey,
        accessCount: lruAccessCount,
      });
    }
  }

  /**
   * 设置周期性清理
   */
  private setupPeriodicCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.streamConfig.cleanupInterval);

    this.logger.debug("Cache cleanup scheduler started", {
      interval: this.streamConfig.cleanupInterval,
    });
  }

  /**
   * 清理过期缓存条目
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.hotCache.entries()) {
      if (now - entry.timestamp > this.streamConfig.hotCacheTTL) {
        this.hotCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug("Cleaned expired cache entries", {
        cleanedCount,
        remainingSize: this.hotCache.size,
      });
    }
  }

  /**
   * 使用SCAN命令安全地查找并清理keys
   */
  private async scanAndClear(pattern: string): Promise<string[]> {
    const keys = await this.scanKeysWithTimeout(pattern, 10000);
    if (keys.length > 0) {
      await this.redisClient.unlink(...keys);
      this.logger.log("SCAN清理完成", { clearedCount: keys.length });
    }
    return keys;
  }

  /**
   * 使用SCAN命令查找keys，带超时保护
   */
  private async scanKeysWithTimeout(
    pattern: string,
    timeoutMs: number = 10000,
  ): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    const startTime = Date.now();

    try {
      do {
        if (Date.now() - startTime > timeoutMs) {
          this.logger.warn("SCAN操作超时", {
            pattern,
            scannedKeys: keys.length,
            timeoutMs
          });
          break;
        }

        const result = await this.redisClient.scan(
          cursor,
          "MATCH", pattern,
          "COUNT", 200,
        );
        cursor = result[0];
        keys.push(...result[1]);

        if (keys.length > 10000) {
          this.logger.warn("SCAN发现大量keys，分批处理", {
            pattern,
            keysFound: keys.length
          });
          break;
        }
      } while (cursor !== "0");

      return keys;
    } catch (error) {
      this.logger.error("SCAN操作失败", { pattern, error: error.message });
      return [];
    }
  }

  /**
   * 分批清理方法，避免阻塞Redis
   */
  private async batchClearWithProgress(pattern: string): Promise<number> {
    let totalCleared = 0;
    let cursor = "0";
    const batchSize = 500;

    do {
      const result = await this.redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await this.redisClient.unlink(...keys);
        totalCleared += keys.length;

        this.logger.debug("分批清理进度", {
          clearedKeys: totalCleared,
          currentBatch: keys.length
        });
      }

      if (keys.length === batchSize) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } while (cursor !== "0");

    this.logger.log("分批清理完成", { totalCleared });
    return totalCleared;
  }

  /**
   * 只清理过期数据，保留活跃流
   */
  private async clearExpiredOnly(pattern: string, maxAgeSeconds: number): Promise<string[]> {
    const keys = await this.scanKeysWithTimeout(pattern);
    const expiredKeys: string[] = [];

    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      const pipeline = this.redisClient.pipeline();

      batch.forEach(key => pipeline.ttl(key));
      const ttlResults = await pipeline.exec();

      batch.forEach((key, index) => {
        const [error, ttl] = ttlResults[index];
        if (!error && (ttl === -1 || (typeof ttl === 'number' && ttl > maxAgeSeconds))) {
          expiredKeys.push(key);
        }
      });
    }

    if (expiredKeys.length > 0) {
      await this.redisClient.unlink(...expiredKeys);
      this.logger.log("清理过期流缓存", { expiredCount: expiredKeys.length });
    }

    return expiredKeys;
  }

  /**
   * 获取缓存统计信息
   */
  private async getCacheStats(): Promise<{ keyCount: number }> {
    try {
      const info = await this.redisClient.info('keyspace');
      const dbMatch = info.match(/db\d+:keys=(\d+)/);
      const keyCount = dbMatch ? parseInt(dbMatch[1]) : 0;

      return { keyCount };
    } catch (error) {
      this.logger.warn("无法获取缓存统计", { error: error.message });
      return { keyCount: 1000 };
    }
  }
}