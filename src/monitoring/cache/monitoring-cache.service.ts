import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "../../app/config/logger.config";
import { CacheService } from "@cache/services/cache.service";
import {
  MonitoringConfig,
  getMonitoringConfigForEnvironment,
} from "../config/monitoring.config";
import { SYSTEM_STATUS_EVENTS } from "../contracts/events/system-status.events";
import { MONITORING_HEALTH_STATUS, ExtendedHealthStatus } from "../constants";

/**
 * 监控专用缓存服务
 * 职责：为监控组件提供架构独立的专用缓存功能
 * 设计理念：架构独立 + 能力复用 + 优雅降级 + 专用优化
 */
@Injectable()
export class MonitoringCacheService {
  private readonly config: MonitoringConfig;
  private readonly logger = createLogger(MonitoringCacheService.name);

  // 内部指标统计（支持性能监控）
  private metrics = {
    operations: { hits: 0, misses: 0, errors: 0 },
    latency: { p50: 0, p95: 0, p99: 0 },
    startTime: Date.now(),
    operationTimes: [] as number[], // 操作时延记录
    fallbackCount: 0, // 回退次数统计
  };

  constructor(
    private readonly cacheService: CacheService, // 复用系统能力
    @Optional() private readonly eventBus?: EventEmitter2, // 可选注入，保持向后兼容
  ) {
    // 加载环境特定配置
    this.config = getMonitoringConfigForEnvironment();
    this.logger.log("MonitoringCacheService初始化", {
      namespace: this.config.cache.namespace,
      compressionThreshold: this.config.cache.compressionThreshold,
      batchSize: this.config.cache.batchSize,
      environment: process.env.NODE_ENV || "development",
      eventBusEnabled: !!this.eventBus,
    });

    // 如果eventBus未注入，记录警告但不影响功能
    if (!this.eventBus) {
      this.logger.warn("EventEmitter2未注入，事件功能将被禁用");
    }
  }

  // 私有方法：构建监控专用键（带输入验证）
  private buildKey(category: string, key: string): string {
    // 输入参数验证
    if (!category || typeof category !== "string") {
      throw new Error(`监控缓存键类别无效: ${category}`);
    }

    if (!key || typeof key !== "string") {
      throw new Error(`监控缓存键名称无效: ${key}`);
    }

    // 检查禁止字符
    const forbiddenChars = /[:\*\?\[\]\{\}\s]/;
    if (forbiddenChars.test(category)) {
      throw new Error(`监控缓存类别包含禁止字符: ${category}`);
    }

    if (forbiddenChars.test(key)) {
      throw new Error(`监控缓存键名包含禁止字符: ${key}`);
    }

    // 长度限制
    if (category.length > 50) {
      throw new Error(`监控缓存类别过长 (>${50}): ${category}`);
    }

    if (key.length > 100) {
      throw new Error(`监控缓存键名过长 (>${100}): ${key}`);
    }

    return `${this.config.cache.namespace}:${category}:${key}`;
  }

  // 私有方法：获取监控专用TTL
  private getTTL(category: string): number {
    const ttlConfig = this.config.cache.ttl;
    switch (category) {
      case "health":
        return ttlConfig.health;
      case "trend":
        return ttlConfig.trend;
      case "performance":
        return ttlConfig.performance;
      case "alert":
        return ttlConfig.alert;
      case "cache_stats":
        return ttlConfig.cacheStats;
      default:
        return ttlConfig.health; // 默认使用health TTL
    }
  }

  // ==================== 监控专用API：健康数据 ====================

  async getHealthData<T>(key: string): Promise<T | null> {
    const cacheKey = this.buildKey("health", key);
    return this.safeGet<T>(cacheKey, "health");
  }

  async setHealthData(key: string, value: any): Promise<void> {
    const cacheKey = this.buildKey("health", key);
    const ttl = this.getTTL("health");
    await this.safeSet(cacheKey, value, ttl, "health");
    // 维护键前缀索引
    await this.addToKeyIndex("health", cacheKey);
  }

  // ==================== 监控专用API：趋势数据 ====================

  async getTrendData<T>(key: string): Promise<T | null> {
    const cacheKey = this.buildKey("trend", key);
    return this.safeGet<T>(cacheKey, "trend");
  }

  async setTrendData(key: string, value: any): Promise<void> {
    const cacheKey = this.buildKey("trend", key);
    const ttl = this.getTTL("trend");
    await this.safeSet(cacheKey, value, ttl, "trend");
    await this.addToKeyIndex("trend", cacheKey);
  }

  // ==================== 监控专用API：性能数据 ====================

  async getPerformanceData<T>(key: string): Promise<T | null> {
    const cacheKey = this.buildKey("performance", key);
    return this.safeGet<T>(cacheKey, "performance");
  }

  async setPerformanceData(key: string, value: any): Promise<void> {
    const cacheKey = this.buildKey("performance", key);
    const ttl = this.getTTL("performance");
    await this.safeSet(cacheKey, value, ttl, "performance");
    await this.addToKeyIndex("performance", cacheKey);
  }

  // ==================== getOrSet热点路径优化 ====================

  // 热点路径优化：自动分布式锁与缓存回填
  async getOrSetHealthData<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.buildKey("health", key);
    const ttl = this.getTTL("health");
    const startTime = Date.now();

    try {
      // 首先尝试直接获取缓存
      const cached = await this.cacheService.get<T>(cacheKey);

      if (cached !== null) {
        // 缓存命中
        const duration = Date.now() - startTime;
        this.recordOperationTime(duration);
        this.metrics.operations.hits++;

        // 🎯 发送缓存命中事件（仅在eventBus存在时）
        if (this.eventBus) {
          try {
            this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_HIT, {
              timestamp: new Date(),
              source: "cache",
              key: cacheKey,
              metadata: {
                duration,
                ttl,
                cache_type: "monitoring",
                category: "health",
              },
            });
          } catch (eventError) {
            // 静默处理事件发送错误，不影响缓存操作
            this.logger.debug("事件发送失败", {
              event: "CACHE_HIT",
              error: eventError.message,
            });
          }
        }

        this.logger.debug("监控缓存命中", {
          category: "health",
          key,
          hit: true,
          duration,
          source: "cache",
        });

        return cached;
      }

      // 缓存未命中，需要回填
      // 🎯 发送缓存未命中事件
      if (this.eventBus) {
        try {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_MISS, {
            timestamp: new Date(),
            source: "cache",
            key: cacheKey,
            metadata: {
              duration: Date.now() - startTime,
              cache_type: "monitoring",
              category: "health",
            },
          });
        } catch (eventError) {
          this.logger.debug("事件发送失败", {
            event: "CACHE_MISS",
            error: eventError.message,
          });
        }
      }

      this.logger.debug("监控缓存未命中，开始回填", {
        category: "health",
        key,
        hit: false,
      });

      const factoryStartTime = Date.now();
      const result = await factory();
      const factoryDuration = Date.now() - factoryStartTime;

      // 将结果写入缓存
      try {
        await this.cacheService.set(cacheKey, result, {
          ttl,
          compressionThreshold: this.config.cache.compressionThreshold,
        });
        await this.addToKeyIndex("health", cacheKey);

        // 🎯 发送缓存设置事件
        if (this.eventBus) {
          try {
            this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_SET, {
              timestamp: new Date(),
              source: "cache",
              key: cacheKey,
              metadata: {
                ttl,
                size: JSON.stringify(result).length,
                cache_type: "monitoring",
                category: "health",
              },
            });
          } catch (eventError) {
            this.logger.debug("事件发送失败", {
              event: "CACHE_SET",
              error: eventError.message,
            });
          }
        }
      } catch (cacheError) {
        // 🎯 发送缓存错误事件
        if (this.eventBus) {
          try {
            this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_ERROR, {
              timestamp: new Date(),
              source: "cache",
              key: cacheKey,
              metadata: {
                error: cacheError.message,
                operation: "set",
                cache_type: "monitoring",
                category: "health",
              },
            });
          } catch (eventError) {
            this.logger.debug("事件发送失败", {
              event: "CACHE_ERROR",
              error: eventError.message,
            });
          }
        }

        this.logger.warn("缓存写入失败", {
          category: "health",
          key,
          error: cacheError.message,
        });
      }

      // 统计回填指标
      const totalDuration = Date.now() - startTime;
      this.recordOperationTime(totalDuration);
      this.metrics.operations.misses++;

      this.logger.debug("监控缓存回填完成", {
        category: "health",
        key,
        hit: false,
        totalDuration,
        factoryDuration,
        cacheWriteDuration: totalDuration - factoryDuration,
        source: "factory",
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordOperationTime(duration);
      this.metrics.operations.errors++;

      // 🎯 发送缓存错误事件
      if (this.eventBus) {
        try {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_ERROR, {
            timestamp: new Date(),
            source: "cache",
            key: cacheKey,
            metadata: {
              error: error.message,
              duration,
              operation: "getOrSet",
              cache_type: "monitoring",
              category: "health",
              fallback: true,
            },
          });
        } catch (eventError) {
          this.logger.debug("事件发送失败", {
            event: "CACHE_ERROR",
            error: eventError.message,
          });
        }
      }

      this.logger.warn("监控缓存操作失败，降级处理", {
        category: "health",
        key,
        duration,
        error: error.message,
        fallback: true,
      });

      // 降级到直接调用factory
      try {
        return await factory();
      } catch (factoryError) {
        this.logger.error("监控缓存全面失败", {
          category: "health",
          key,
          cacheError: error.message,
          factoryError: factoryError.message,
        });
        throw factoryError;
      }
    }
  }

  async getOrSetTrendData<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.buildKey("trend", key);
    const ttl = this.getTTL("trend");

    try {
      const result = await this.cacheService.getOrSet<T>(cacheKey, factory, {
        ttl,
        compressionThreshold: this.config.cache.compressionThreshold,
      });

      this.metrics.operations.hits++;
      await this.addToKeyIndex("trend", cacheKey);
      return result;
    } catch (error) {
      this.metrics.operations.errors++;
      this.logger.warn(`监控趋势缓存失败: trend`, {
        key,
        error: error.message,
      });
      return await factory();
    }
  }

  async getOrSetPerformanceData<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.buildKey("performance", key);
    const ttl = this.getTTL("performance");

    try {
      return await this.cacheService.getOrSet<T>(cacheKey, factory, {
        ttl,
        compressionThreshold: this.config.cache.compressionThreshold,
      });
    } catch (error) {
      this.metrics.operations.errors++;
      this.logger.warn(`监控性能缓存失败: performance`, {
        key,
        error: error.message,
      });
      return await factory();
    }
  }

  // ==================== 安全方法（含性能监控）====================

  // 通用的安全获取方法（带性能监控）
  private async safeGet<T>(key: string, category: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const result = await this.cacheService.get<T>(key);
      const duration = Date.now() - startTime;
      this.recordOperationTime(duration);

      if (result !== null) {
        this.metrics.operations.hits++;
        this.logger.debug(`监控缓存命中: ${category}`, { key, duration });
      } else {
        this.metrics.operations.misses++;
        this.logger.debug(`监控缓存未命中: ${category}`, { key, duration });
      }
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordOperationTime(duration);
      this.metrics.operations.errors++;
      this.logger.warn(`监控缓存读取失败: ${category}`, {
        key,
        duration,
        error: error.message,
      });
      return null; // 优雅降级，不影响监控逻辑
    }
  }

  // 通用的安全设置方法（统一序列化策略）
  private async safeSet(
    key: string,
    value: any,
    ttl: number,
    category: string,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      // 统一序列化策略：默认JSON，大对象启用压缩
      const options = {
        ttl,
        compressionThreshold: this.config.cache.compressionThreshold,
        serializer: "json" as const,
      };

      await this.cacheService.set(key, value, options);
      const duration = Date.now() - startTime;
      this.recordOperationTime(duration);

      this.logger.debug(`监控缓存写入成功: ${category}`, {
        key,
        ttl,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordOperationTime(duration);
      this.metrics.operations.errors++;
      this.logger.warn(`监控缓存写入失败: ${category}`, {
        key,
        duration,
        error: error.message,
      });
      // 不抛出异常，保证监控逻辑继续执行
    }
  }

  // 性能指标计算
  private recordOperationTime(duration: number): void {
    this.metrics.operationTimes.push(duration);
    // 保持最近1000次操作的记录
    if (this.metrics.operationTimes.length > 1000) {
      this.metrics.operationTimes = this.metrics.operationTimes.slice(-1000);
    }
  }

  private calculateLatencyPercentiles(): {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  } {
    const times = [...this.metrics.operationTimes].sort((a, b) => a - b);
    const len = times.length;

    if (len === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0 };
    }

    return {
      p50: times[Math.floor((len - 1) * 0.5)] || 0,
      p95: times[Math.floor((len - 1) * 0.95)] || 0,
      p99: times[Math.floor((len - 1) * 0.99)] || 0,
      avg: times.reduce((sum, time) => sum + time, 0) / len,
    };
  }

  // ==================== 键前缀索引机制 ====================

  // 维护键前缀索引
  private async addToKeyIndex(
    category: string,
    cacheKey: string,
  ): Promise<void> {
    try {
      const indexKey = `${this.config.cache.keyIndexPrefix}:${category}`;
      await this.cacheService.setAdd(indexKey, cacheKey);
      // 索引键的TTL设置为数据TTL的2倍，确保不会过早失效
      const dataTtl = this.getTTL(category);
      await this.cacheService.expire(indexKey, dataTtl * 2);
    } catch (error) {
      // 索引失败不影响主流程
      this.logger.debug(`维护键索引失败: ${category}`, {
        cacheKey,
        error: error.message,
      });
    }
  }

  // 基于键前缀索引的批量删除
  private async invalidateByKeyIndex(category: string): Promise<void> {
    const indexKey = `${this.config.cache.keyIndexPrefix}:${category}`;
    try {
      // 获取该分类下的所有键
      const keys = await this.cacheService.setMembers(indexKey);

      if (keys && keys.length > 0) {
        // 使用并发控制的批量删除
        await this.batchDeleteWithConcurrencyControl(keys);

        // 清空索引
        await this.cacheService.del(indexKey);

        // 🎯 发送缓存失效事件
        if (this.eventBus) {
          try {
            this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED, {
              timestamp: new Date(),
              source: "cache",
              pattern: `${category}:*`,
              metadata: {
                count: keys.length,
                method: "index_based",
                cache_type: "monitoring",
                category,
              },
            });
          } catch (eventError) {
            this.logger.debug("事件发送失败", {
              event: "CACHE_INVALIDATED",
              error: eventError.message,
            });
          }
        }

        this.logger.debug(`基于索引批量删除监控缓存: ${category}`, {
          count: keys.length,
        });
      }
    } catch (error) {
      this.logger.warn(`索引式批量删除失败，回退到模式删除: ${category}`, {
        error: error.message,
      });
      // 使用受保护的回退模式删除
      await this.fallbackPatternDelete(
        `${this.config.cache.namespace}:${category}:*`,
      );
    }
  }

  // ==================== 模式删除和批量失效 ====================

  // 监控专用的批量失效
  async invalidateHealthCache(): Promise<void> {
    await this.invalidateByPattern("health:*");
  }

  async invalidateTrendCache(): Promise<void> {
    await this.invalidateByPattern("trend:*");
  }

  async invalidatePerformanceCache(): Promise<void> {
    await this.invalidateByPattern("performance:*");
  }

  async invalidateAllMonitoringCache(): Promise<void> {
    await this.invalidateByPattern("*");
  }

  // 使用键前缀索引实现高效模式删除（避免KEYS全量扫描）
  private async invalidateByPattern(pattern: string): Promise<void> {
    const fullPattern = `${this.config.cache.namespace}:${pattern}`;
    try {
      // 优先使用键前缀索引方式
      if (pattern === "*") {
        // 删除所有监控缓存，使用受保护的模式删除
        await this.fallbackPatternDelete(fullPattern);
      } else if (
        pattern.endsWith(":*") &&
        pattern.indexOf("*") === pattern.length - 1
      ) {
        const category = pattern.slice(0, -2); // 去掉':*'
        await this.invalidateByKeyIndex(category);
      } else {
        // 回退到受保护的模式删除
        await this.fallbackPatternDelete(fullPattern);
      }
      this.logger.debug("监控缓存模式失效成功", { pattern: fullPattern });
    } catch (error) {
      this.logger.warn("监控缓存模式失效失败", {
        pattern: fullPattern,
        error: error.message,
      });
    }
  }

  /**
   * 回退模式删除，带有性能保护和告警机制
   */
  private async fallbackPatternDelete(pattern: string): Promise<void> {
    // 统计回退次数
    this.metrics.fallbackCount++;

    // 检查回退频率是否过高
    if (this.metrics.fallbackCount > this.config.cache.fallbackThreshold) {
      this.logger.error("模式删除回退次数过多，可能存在性能问题", {
        count: this.metrics.fallbackCount,
        threshold: this.config.cache.fallbackThreshold,
        pattern,
        suggestion: "考虑检查Redis连接或索引系统是否工作正常",
      });
    }

    try {
      // 执行模式删除前记录时间
      const startTime = Date.now();

      await this.cacheService.delByPattern(pattern);

      const duration = Date.now() - startTime;
      this.recordOperationTime(duration);

      this.logger.debug("回退模式删除完成", {
        pattern,
        duration,
        fallbackCount: this.metrics.fallbackCount,
      });

      // 如果操作时间过长，记录警告
      if (duration > 1000) {
        // 1秒以上认为过长
        this.logger.warn("KEYS模式删除耗时过长", {
          pattern,
          duration,
          suggestion: "考虑优化索引系统或分批处理",
        });
      }
    } catch (error) {
      this.logger.error("回退模式删除失败", {
        pattern,
        fallbackCount: this.metrics.fallbackCount,
        error: error.message,
      });
      throw error; // 重新抛出异常，让上层处理
    }
  }

  /**
   * 重置回退计数器（可用于定期清理或重置）
   */
  resetFallbackCounter(): void {
    const oldCount = this.metrics.fallbackCount;
    this.metrics.fallbackCount = 0;
    this.logger.log("回退计数器已重置", { oldCount, newCount: 0 });
  }

  /**
   * 带有并发控制的批量删除，防止连接池耗尽
   */
  private async batchDeleteWithConcurrencyControl(
    keys: string[],
  ): Promise<void> {
    const batchSize = this.config.cache.batchSize;
    const totalBatches = Math.ceil(keys.length / batchSize);

    this.logger.debug("开始并发控制批量删除", {
      totalKeys: keys.length,
      batchSize,
      totalBatches,
    });

    // 统计成功和失败数量
    let successCount = 0;
    let failureCount = 0;
    const startTime = Date.now();

    // 分批处理，每批控制并发数
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize) + 1;

      try {
        // 并发处理当前批次
        const results = await Promise.allSettled(
          batch.map(async (key) => {
            try {
              await this.cacheService.del(key);
              return { key, success: true };
            } catch (error) {
              this.logger.warn("删除单个缓存键失败", {
                key,
                error: error.message,
              });
              return { key, success: false, error: error.message };
            }
          }),
        );

        // 统计当前批次结果
        const batchSuccess = results.filter(
          (r) => r.status === "fulfilled" && r.value.success,
        ).length;
        const batchFailure = results.filter(
          (r) => r.status === "rejected" || !r.value?.success,
        ).length;

        successCount += batchSuccess;
        failureCount += batchFailure;

        this.logger.debug(`批次 ${batchIndex}/${totalBatches} 完成`, {
          batchSize: batch.length,
          success: batchSuccess,
          failure: batchFailure,
        });

        // 批次间间隔防止压力过大（仅在大批量时）
        if (keys.length > 100 && batchIndex < totalBatches) {
          await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms 间隔
        }
      } catch (error) {
        this.logger.error(`批次 ${batchIndex} 处理失败`, {
          batchSize: batch.length,
          error: error.message,
        });
        failureCount += batch.length;
      }
    }

    const totalTime = Date.now() - startTime;

    // 记录最终统计结果
    this.logger.debug("并发控制批量删除完成", {
      totalKeys: keys.length,
      successCount,
      failureCount,
      totalTime,
      averageTimePerKey: totalTime / keys.length,
      successRate: ((successCount / keys.length) * 100).toFixed(2) + "%",
    });

    // 如果失败率过高，记录警告
    const failureRate = failureCount / keys.length;
    if (failureRate > 0.1) {
      // 10%以上认为异常
      this.logger.warn("批量删除失败率过高", {
        failureRate: (failureRate * 100).toFixed(2) + "%",
        failureCount,
        totalKeys: keys.length,
        suggestion: "请检查Redis连接状态或网络状况",
      });
    }
  }

  // ==================== 健康检查和性能指标 ====================

  // 监控缓存自身的健康检查（暴露内部健康指标）
  async healthCheck(): Promise<{
    status: ExtendedHealthStatus;
    metrics: {
      hitRate: number;
      errorRate: number;
      totalOperations: number;
      uptime: number;
      latency: {
        p50: number;
        p95: number;
        p99: number;
        avg: number;
      };
      fallbackCount: number;
      fallbackThreshold: number;
    };
  }> {
    const testKey = this.buildKey("health_check", "test");
    const testValue = { timestamp: Date.now() };

    try {
      // 测试写入和读取
      await this.cacheService.set(testKey, testValue, { ttl: 10 });
      const retrieved = await this.cacheService.get(testKey);

      const totalOps =
        this.metrics.operations.hits + this.metrics.operations.misses;
      const hitRate =
        totalOps > 0 ? this.metrics.operations.hits / totalOps : 0;
      const errorRate =
        totalOps > 0 ? this.metrics.operations.errors / totalOps : 0;

      // 计算时延分位数
      const latencyStats = this.calculateLatencyPercentiles();

      return {
        status: retrieved && errorRate < 0.1 ? MONITORING_HEALTH_STATUS.HEALTHY : MONITORING_HEALTH_STATUS.DEGRADED,
        metrics: {
          hitRate,
          errorRate,
          totalOperations: totalOps,
          uptime: Date.now() - this.metrics.startTime,
          latency: latencyStats,
          fallbackCount: this.metrics.fallbackCount, // 添加回退计数
          fallbackThreshold: this.config.cache.fallbackThreshold,
        },
      };
    } catch (error) {
      return {
        status: MONITORING_HEALTH_STATUS.UNHEALTHY,
        metrics: {
          hitRate: 0,
          errorRate: 1,
          totalOperations: 0,
          uptime: Date.now() - this.metrics.startTime,
          latency: { p50: 0, p95: 0, p99: 0, avg: 0 },
          fallbackCount: this.metrics.fallbackCount,
          fallbackThreshold: this.config.cache.fallbackThreshold,
        },
      };
    }
  }

  // 获取性能指标（用于外部监控系统）
  getMetrics() {
    const totalOps =
      this.metrics.operations.hits + this.metrics.operations.misses;
    const hitRate = totalOps > 0 ? this.metrics.operations.hits / totalOps : 0;
    const errorRate =
      totalOps > 0 ? this.metrics.operations.errors / totalOps : 0;
    const latencyStats = this.calculateLatencyPercentiles();

    return {
      operations: {
        total: totalOps,
        hits: this.metrics.operations.hits,
        misses: this.metrics.operations.misses,
        errors: this.metrics.operations.errors,
        hitRate,
        errorRate,
      },
      latency: latencyStats,
      uptime: Date.now() - this.metrics.startTime,
      status: errorRate < 0.1 ? MONITORING_HEALTH_STATUS.HEALTHY : MONITORING_HEALTH_STATUS.DEGRADED,
    };
  }
}
