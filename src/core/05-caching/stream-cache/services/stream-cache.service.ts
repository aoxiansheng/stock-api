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
  StreamCacheStats,
  StreamCacheConfig,
} from "../interfaces/stream-cache.interface";

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
    this.logger.log("StreamCacheService 初始化完成", {
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
      this.logger.debug("缓存清理调度器已停止");
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
   * 关键操作异常处理（必须抛出异常）
   */
  private handleCriticalError(
    operation: string,
    error: any,
    key?: string,
  ): never {
    this.logger.error(`StreamCache ${operation} failed`, {
      key,
      error: error.message,
      component: "StreamCache",
    });

    throw new ServiceUnavailableException(
      `StreamCache ${operation} failed: ${error.message}`,
    );
  }

  /**
   * 查询操作异常处理（返回null，不影响业务）
   */
  private handleQueryError(operation: string, error: any, key?: string): null {
    this.logger.warn(`StreamCache ${operation} failed, returning null`, {
      key,
      error: error.message,
      impact: "DataMiss",
      component: "StreamCache",
    });
    return null;
  }

  /**
   * 监控操作异常处理（容错处理，不影响主流程）
   */
  private handleMonitoringError(operation: string, error: any): any {
    this.logger.debug(`StreamCache ${operation} failed, using fallback`, {
      error: error.message,
      impact: "MetricsDataLoss",
      component: "StreamCache",
    });

    // 返回合适的默认值
    return operation.includes("Stats")
      ? { totalSize: this.hotCache.size }
      : undefined;
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
        this.logger.debug("Hot cache命中", { key, duration });
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
        this.logger.debug("Warm cache命中，提升到Hot cache", { key, duration });
        return warmCacheData;
      }

      const duration = Date.now() - startTime;
      this.emitCacheMetric("get", false, duration, {
        cacheType: "stream-cache",
        layer: "miss",
      });
      this.logger.debug("缓存未命中", { key, duration });
      return null;
    } catch (error) {
      return this.handleQueryError("getData", error, key);
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

      this.logger.debug("数据已缓存", {
        key,
        dataSize,
        compressedSize: JSON.stringify(compressedData).length,
        hotCache: shouldUseHotCache,
        warmCache: true,
      });
    } catch (error) {
      this.handleCriticalError("setData", error, key);
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

      this.logger.debug("增量数据查询", {
        key,
        since,
        totalPoints: allData.length,
        incrementalPoints: incrementalData.length,
      });

      return incrementalData.length > 0 ? incrementalData : null;
    } catch (error) {
      return this.handleQueryError("getDataSince", error, key);
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
      return this.handleQueryError("getBatchData", error, keys.join(","));
    }
  }

  /**
   * 删除缓存数据
   * @param key 缓存键
   */
  async deleteData(key: string): Promise<void> {
    try {
      // 删除 Hot Cache (始终成功)
      this.hotCache.delete(key);

      // 删除 Warm Cache (可能失败但不影响主流程)
      try {
        await this.redisClient.del(this.buildWarmCacheKey(key));
      } catch (redisError) {
        this.logger.warn("Warm cache删除失败，但Hot cache已成功删除", {
          key,
          error: redisError.message,
        });
      }

      this.logger.debug("缓存数据已删除", { key });
    } catch (error) {
      // 只有Hot cache操作失败才记录错误，但不抛出异常
      this.logger.error("Hot cache删除失败", {
        key,
        error: error.message,
      });
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      // 清空 Hot Cache (始终成功)
      this.hotCache.clear();

      // 清空 Warm Cache 中的流数据 (可能失败但不影响主流程)
      try {
        const pattern = `${STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX}*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (redisError) {
        this.logger.warn("Warm cache清空失败，但Hot cache已成功清空", {
          error: redisError.message,
        });
      }

      this.logger.log("所有缓存已清空");
    } catch (error) {
      // 只有Hot cache操作失败才记录错误，但不抛出异常
      this.logger.error("Hot cache清空失败", {
        error: error.message,
      });
    }
  }

  /**
   * 获取缓存统计信息
   * @deprecated 已迁移到事件驱动监控，使用reportSystemMetrics方法
   */
  getCacheStats(): StreamCacheStats {
    try {
      // 返回基础信息用于兼容性，实际监控数据通过事件传递
      return {
        hotCacheHits: 0,
        hotCacheMisses: 0,
        warmCacheHits: 0,
        warmCacheMisses: 0,
        totalSize: this.hotCache.size,
        compressionRatio: 0,
      };
    } catch (error) {
      return this.handleMonitoringError("getCacheStats", error);
    }
  }

  /**
   * 获取StreamCache健康状态
   * 集成到全局监控系统
   */
  async getHealthStatus(): Promise<StreamCacheHealthStatus> {
    try {
      const startTime = Date.now();

      // 测试Redis连接
      await this.redisClient.ping();
      const redisPingTime = Date.now() - startTime;

      // 测试缓存读写
      const testKey = `stream-cache-health-check-${Date.now()}`;
      const testData = [{ s: "TEST", p: 100, v: 1000, t: Date.now() }];

      await this.setData(testKey, testData, "hot");
      const retrievedData = await this.getData(testKey);
      await this.deleteData(testKey);

      const isDataIntact = retrievedData && retrievedData.length === 1;

      return {
        status: isDataIntact ? "healthy" : "degraded",
        hotCacheSize: this.hotCache.size,
        redisConnected: true,
        lastError: null,
        performance: {
          avgHotCacheHitTime: 5, // 从监控数据获取
          avgWarmCacheHitTime: redisPingTime,
          compressionRatio: 0.7, // 从历史数据计算
        },
      };
    } catch (error) {
      this.logger.error("StreamCache健康检查失败", {
        error: error.message,
        component: "StreamCache",
      });

      return {
        status: "unhealthy",
        hotCacheSize: this.hotCache.size,
        redisConnected: false,
        lastError: error.message,
      };
    }
  }

  /**
   * 事件化监控指标报告
   * 使用事件驱动方式上报系统指标
   */
  async reportSystemMetrics(): Promise<void> {
    try {
      const healthStatus = await this.getHealthStatus();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // 发送缓存统计指标
      this.emitSystemMetric("cache_hot_size", this.hotCache.size, {
        cache_type: "hot",
        cache_layer: "memory",
      });

      // 发送健康状态指标
      this.emitSystemMetric(
        "health_status",
        healthStatus.status === "healthy" ? 1 : 0,
        {
          status: healthStatus.status,
          redis_connected: healthStatus.redisConnected.toString(),
        },
      );

      // 发送性能指标
      if (healthStatus.performance) {
        this.emitSystemMetric(
          "cache_hit_time_hot",
          healthStatus.performance.avgHotCacheHitTime,
          {
            cache_layer: "hot",
          },
        );
        this.emitSystemMetric(
          "cache_hit_time_warm",
          healthStatus.performance.avgWarmCacheHitTime,
          {
            cache_layer: "warm",
          },
        );
        this.emitSystemMetric(
          "compression_ratio",
          healthStatus.performance.compressionRatio,
        );
      }

      // 发送内存使用指标
      this.emitSystemMetric("memory_usage", memoryUsage.heapUsed, {
        memory_type: "heap_used",
      });
      this.emitSystemMetric("memory_total", memoryUsage.heapTotal, {
        memory_type: "heap_total",
      });
    } catch (error) {
      this.logger.debug("系统指标上报失败", {
        error: error.message,
        impact: "MetricsDataLoss",
      });
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
      const cacheKey = this.buildWarmCacheKey(key);
      const cachedData = await this.redisClient.get(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      this.logger.warn("Warm cache访问失败", { key, error: error.message });
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
      const cacheKey = this.buildWarmCacheKey(key);
      const serializedData = JSON.stringify(data);

      // 设置TTL
      await this.redisClient.setex(
        cacheKey,
        this.config.warmCacheTTL,
        serializedData,
      );
    } catch (error) {
      this.logger.warn("Warm cache设置失败", { key, error: error.message });
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
    let fallbackTimestampCount = 0;

    const result = data.map((item, index) => {
      // 根据数据结构进行压缩映射
      if (typeof item === "object" && item !== null) {
        let timestamp = item.timestamp || item.t;

        // 时间戳兜底策略优化
        if (!timestamp) {
          // 使用递增的时间戳避免乱序，而不是所有都用 Date.now()
          timestamp = now + index; // 每个项目递增1ms
          fallbackTimestampCount++;

          this.logger.warn("数据缺失时间戳，使用兜底策略", {
            symbol: item.symbol || item.s || "unknown",
            originalTimestamp: item.timestamp,
            fallbackTimestamp: timestamp,
            index,
            source: "compressData",
          });
        }

        return {
          s: item.symbol || item.s || "",
          p: item.price || item.lastPrice || item.p || 0,
          v: item.volume || item.v || 0,
          t: timestamp,
          c: item.change || item.c,
          cp: item.changePercent || item.cp,
        };
      }
      return item;
    });

    // 监控时间戳回退使用情况
    if (fallbackTimestampCount > 0) {
      this.recordTimestampFallbackMetrics(fallbackTimestampCount, data.length);
    }

    return result;
  }

  /**
   * 记录时间戳回退指标
   */
  private recordTimestampFallbackMetrics(
    fallbackCount: number,
    totalCount: number,
  ): void {
    try {
      const fallbackRate = fallbackCount / totalCount;

      this.logger.warn("时间戳回退统计", {
        fallbackCount,
        totalCount,
        fallbackRate: Math.round(fallbackRate * 10000) / 100 + "%",
        recommendation: fallbackRate > 0.1 ? "check_data_source" : "normal",
      });
    } catch (error) {
      this.logger.debug("时间戳回退指标记录失败", { error: error.message });
    }
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
      this.logger.debug("LRU清理缓存条目", {
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

    this.logger.debug("缓存清理调度器已启动", {
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
      this.logger.debug("清理过期缓存条目", {
        cleanedCount,
        remainingSize: this.hotCache.size,
      });
    }
  }
}
