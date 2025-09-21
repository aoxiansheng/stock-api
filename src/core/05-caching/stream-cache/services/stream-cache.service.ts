import {
  Injectable,
  OnModuleDestroy,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";
import {
  IStreamCache,
  StreamDataPoint,
  StreamCacheConfig,
} from "../interfaces/stream-cache.interface";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier, UniversalRetryHandler } from "@common/core/exceptions";
import { STREAM_CACHE_ERROR_CODES } from "../constants/stream-cache-error-codes.constants";

// 健康检查状态接口
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
import {
  STREAM_CACHE_CONFIG,
  DEFAULT_STREAM_CACHE_CONFIG,
} from "../constants/stream-cache.constants";
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
} from "../../../../monitoring/contracts";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import Redis from "ioredis";

/**
 * 专用流数据缓存服务
 *
 * 🎯 核心功能：
 * - Hot Cache (LRU内存): 毫秒级访问的最热数据
 * - Warm Cache (Redis): 10ms级访问的温数据
 * - 数据压缩: 减少内存和网络开销
 * - 智能缓存策略: 根据访问频率自动选择存储层
 */
@Injectable()
export class StreamCacheService implements IStreamCache, OnModuleDestroy {
  private readonly logger = createLogger("StreamCache");

  // Hot Cache - LRU in-memory cache
  private readonly hotCache = new Map<
    string,
    {
      data: StreamDataPoint[];
      timestamp: number;
      accessCount: number;
    }
  >();

  // 配置参数
  private readonly config: StreamCacheConfig;

  // 定时器管理
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis,
    private readonly eventBus: EventEmitter2,
    @Inject(STREAM_CACHE_CONFIG_TOKEN) config?: Partial<StreamCacheConfig>,
  ) {
    this.config = { ...DEFAULT_STREAM_CACHE_CONFIG, ...config };
    this.setupPeriodicCleanup();
    this.logger.log("StreamCacheService initialized", {
      hotCacheTTL: this.config.hotCacheTTL,
      warmCacheTTL: this.config.warmCacheTTL,
      maxHotCacheSize: this.config.maxHotCacheSize,
    });
  }

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
      this.logger.debug("Cache cleanup scheduler stopped");
    }
  }

  // === 事件驱动监控方法 ===

  /**
   * 发送缓存操作监控事件
   */
  private emitCacheMetric(
    operation: string,
    success: boolean,
    duration: number,
    metadata: any = {},
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream-cache",
        metricType: "cache",
        metricName: `cache_${operation}_${success ? "success" : "failed"}`,
        metricValue: duration,
        tags: {
          operation,
          success: success.toString(),
          component: "StreamCache",
          ...metadata,
        },
      });
    });
  }

  /**
   * 发送系统指标监控事件
   */
  private emitSystemMetric(
    metricName: string,
    value: number,
    tags: any = {},
  ): void {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream-cache",
        metricType: "system",
        metricName,
        metricValue: value,
        tags: {
          component: "StreamCache",
          ...tags,
        },
      });
    });
  }

  // === 标准化异常处理方法 ===

  /**
   * 统一错误处理
   */
  private handleError<T>(
    operation: string,
    error: Error,
    key?: string,
    throwError = false,
  ): T | null {
    this.logger.error(`Cache operation ${operation} failed`, {
      key,
      error: error.message,
      stack: error.stack,
    });

    this.emitCacheMetric(operation, false, 0, {
      errorType: throwError ? "critical_error" : "recoverable_error",
      errorMessage: error.message,
    });

    if (throwError) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: operation,
        message: `StreamCache ${operation} failed: ${error.message}`,
        context: {
          key,
          errorType: "cache_operation_failed"
        }
      });
    }
    return null;
  }


  /**
   * 获取数据 - 智能多层缓存查找
   * @param key 缓存键
   * @returns 数据或null
   */
  async getData(key: string): Promise<StreamDataPoint[] | null> {
    const startTime = Date.now();

    try {
      // 1. 检查 Hot Cache
      const hotCacheData = this.getFromHotCache(key);
      if (hotCacheData) {
        const duration = Date.now() - startTime;
        this.emitCacheMetric("get", true, duration, {
          cacheType: "stream-cache",
          layer: "hot",
        });
        this.logger.debug("Hot cache hit", { key, duration });
        return hotCacheData;
      }

      // 2. 检查 Warm Cache (Redis)
      const warmCacheData = await this.getFromWarmCache(key);
      if (warmCacheData) {
        const duration = Date.now() - startTime;
        this.emitCacheMetric("get", true, duration, {
          cacheType: "stream-cache",
          layer: "warm",
        });
        // 提升到 Hot Cache
        this.setToHotCache(key, warmCacheData);
        this.logger.debug("Warm cache hit, promoted to Hot cache", { key, duration });
        return warmCacheData;
      }

      const duration = Date.now() - startTime;
      this.emitCacheMetric("get", false, duration, {
        cacheType: "stream-cache",
        layer: "miss",
      });
      this.logger.debug("Cache miss", { key, duration });
      return null;
    } catch (error) {
      return this.handleError("getData", error, key);
    }
  }

  /**
   * 设置数据到缓存 - 智能存储策略
   * @param key 缓存键
   * @param data 原始数据
   * @param priority 优先级 ('hot' | 'warm' | 'auto')
   */
  async setData(
    key: string,
    data: any[],
    priority: "hot" | "warm" | "auto" = "auto",
  ): Promise<void> {
    if (!data || data.length === 0) return;

    try {
      const startTime = Date.now();

      // 数据压缩
      const compressedData = this.compressData(data);
      const dataSize = JSON.stringify(compressedData).length;

      // 智能存储策略
      const shouldUseHotCache =
        priority === "hot" ||
        (priority === "auto" && dataSize < 10000 && data.length < 100);

      if (shouldUseHotCache) {
        this.setToHotCache(key, compressedData);
      }

      // 总是同时存储到 Warm Cache 作为备份
      await this.setToWarmCache(key, compressedData);

      const duration = Date.now() - startTime;
      this.emitCacheMetric("set", true, duration, {
        cacheType: "stream-cache",
        layer: shouldUseHotCache ? "both" : "warm",
        dataSize,
        compressionRatio: compressedData.length / data.length,
      });

      this.logger.debug("Data cached", {
        key,
        dataSize,
        compressedSize: JSON.stringify(compressedData).length,
        hotCache: shouldUseHotCache,
        warmCache: true,
      });
    } catch (error) {
      this.handleError("setData", error, key, true);
    }
  }

  /**
   * 获取自指定时间戳以来的数据 - 增量查询优化
   * @param key 缓存键
   * @param since 时间戳
   * @returns 增量数据
   */
  async getDataSince(
    key: string,
    since: number,
  ): Promise<StreamDataPoint[] | null> {
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
      return this.handleError("getDataSince", error, key);
    }
  }

  /**
   * 批量获取数据
   * @param keys 缓存键数组
   * @returns 键值对映射
   */
  async getBatchData(
    keys: string[],
  ): Promise<Record<string, StreamDataPoint[] | null>> {
    const result: Record<string, StreamDataPoint[] | null> = {};

    try {
      const promises = keys.map(async (key) => {
        const data = await this.getData(key);
        result[key] = data;
      });

      await Promise.all(promises);
      return result;
    } catch (error) {
      return this.handleError("getBatchData", error, keys.join(","));
    }
  }

  /**
   * 删除缓存数据
   * @param key 缓存键
   */
  async deleteData(key: string): Promise<void> {
    // 删除 Hot Cache (始终成功)
    this.hotCache.delete(key);

    // 删除 Warm Cache (容错处理)
    try {
      await this.redisClient.del(this.buildWarmCacheKey(key));
    } catch (error) {
      this.logger.warn("Warm cache deletion failed", { key, error: error.message });
    }

    this.logger.debug("Cache data deleted", { key });
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    // 清空 Hot Cache (始终成功)
    this.hotCache.clear();

    // 清空 Warm Cache 中的流数据 (容错处理)
    try {
      const pattern = `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}*`;
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      this.logger.warn("Warm cache clear failed", { error: error.message });
    }

    this.logger.log("All cache cleared");
  }


  /**
   * 获取StreamCache健康状态 - 简化版本
   */
  async getHealthStatus(): Promise<StreamCacheHealthStatus> {
    try {
      // 简单Redis连接测试
      await this.redisClient.ping();

      return {
        status: "healthy",
        hotCacheSize: this.hotCache.size,
        redisConnected: true,
        lastError: null,
      };
    } catch (error) {
      this.handleError("healthCheck", error);
      return {
        status: "unhealthy",
        hotCacheSize: this.hotCache.size,
        redisConnected: false,
        lastError: error.message,
      };
    }
  }

  /**
   * 事件化监控指标报告 - 简化版本
   */
  async reportSystemMetrics(): Promise<void> {
    try {
      const healthStatus = await this.getHealthStatus();

      // 核心指标上报
      this.emitSystemMetric("cache_hot_size", this.hotCache.size);
      this.emitSystemMetric("health_status", healthStatus.status === "healthy" ? 1 : 0);
    } catch (error) {
      this.handleError("reportMetrics", error);
    }
  }

  // === 私有方法 ===

  /**
   * 从 Hot Cache 获取数据
   */
  private getFromHotCache(key: string): StreamDataPoint[] | null {
    const entry = this.hotCache.get(key);
    if (!entry) return null;

    // 检查TTL
    if (Date.now() - entry.timestamp > this.config.hotCacheTTL) {
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
    if (this.hotCache.size >= this.config.maxHotCacheSize) {
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
  private async getFromWarmCache(
    key: string,
  ): Promise<StreamDataPoint[] | null> {
    try {
      return await UniversalRetryHandler.networkRetry(
        async () => {
          const cacheKey = this.buildWarmCacheKey(key);
          const cachedData = await this.redisClient.get(cacheKey);

          if (cachedData) {
            return JSON.parse(cachedData);
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
  private async setToWarmCache(
    key: string,
    data: StreamDataPoint[],
  ): Promise<void> {
    try {
      await UniversalRetryHandler.networkRetry(
        async () => {
          const cacheKey = this.buildWarmCacheKey(key);
          const serializedData = JSON.stringify(data);

          // 设置TTL
          await this.redisClient.setex(
            cacheKey,
            this.config.warmCacheTTL,
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
    return `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}${key}`;
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
          t: item.timestamp || item.t || now + index, // 简单fallback，保持递增
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
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);

    this.logger.debug("Cache cleanup scheduler started", {
      interval: this.config.cleanupInterval,
    });
  }

  /**
   * 清理过期缓存条目
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.hotCache.entries()) {
      if (now - entry.timestamp > this.config.hotCacheTTL) {
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
}
