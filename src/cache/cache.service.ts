import { promisify } from "util";
import * as zlib from "zlib";

import { RedisService } from "@liaoliaots/nestjs-redis";
import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
// 🎯 复用 common 模块的日志配置
import Redis from "ioredis";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

// 🎯 复用 common 模块的缓存常量
import { CachePerformance } from "../metrics/decorators/database-performance.decorator";

import {
  CACHE_ERROR_MESSAGES,
  CACHE_WARNING_MESSAGES,
  CACHE_SUCCESS_MESSAGES,
  CACHE_TTL,
  CACHE_KEYS,
  CACHE_OPERATIONS,
  CACHE_CONSTANTS,
} from "./constants/cache.constants";

// 🎯 Gzip 压缩/解压缩
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const COMPRESSION_PREFIX = "COMPRESSED::";

// 🎯 使用内部 DTO 类型替换原始接口定义
import {
  CacheConfigDto,
  CacheStatsDto,
  CacheHealthCheckResultDto,
} from "./dto/cache-internal.dto";

// 🎯 为了向后兼容，保留类型别名
export type CacheConfig = CacheConfigDto;
export type CacheStats = CacheStatsDto;

@Injectable()
export class CacheService {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(CacheService.name);
  private cacheStats = new Map<string, { hits: number; misses: number }>();

  private get redis(): Redis {
    return this.redisService.getOrThrow();
  }

  constructor(private readonly redisService: RedisService) {
    // 启动缓存优化任务
    this.startOptimizationTasks();
  }

  /**
   * 获取底层的 ioredis 客户端实例
   * 警告：仅在 CacheService 无法满足需求时使用，优先在 CacheService 中扩展方法
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 智能缓存设置
   */
  @CachePerformance("set")
  async set<T = any>(
    key: string,
    value: T,
    options: CacheConfigDto = { ttl: CACHE_TTL.DEFAULT },
  ): Promise<boolean> {
    // 检查键长度
    this.validateKeyLength(key);

    const startTime = Date.now();
    try {
      const serializedValue = this.serialize(value, options.serializer);
      const compressedValue = this.shouldCompress(
        serializedValue,
        options.compressionThreshold,
      )
        ? await this.compress(serializedValue)
        : serializedValue;

      const result = await this.redis.setex(key, options.ttl, compressedValue);

      // 记录缓存指标
      this.updateCacheMetrics(key, "set");

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS) {
        this.logger.warn(CACHE_WARNING_MESSAGES.SLOW_OPERATION, {
          operation: CACHE_OPERATIONS.SET,
          key,
          duration,
          threshold: CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS,
        });
      }

      return result === "OK";
    } catch (error) {
      this.logger.error(
        `${CACHE_ERROR_MESSAGES.SET_FAILED} ${key}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.SET_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 智能缓存获取
   */
  @CachePerformance("get")
  async get<T>(
    key: string,
    deserializer?: "json" | "msgpack",
  ): Promise<T | null> {
    // 检查键长度
    this.validateKeyLength(key);

    const startTime = Date.now();
    try {
      const value = await this.redis.get(key);

      if (value === null) {
        this.updateCacheMetrics(key, "miss");
        return null;
      }

      this.updateCacheMetrics(key, "hit");

      // 解压缩和反序列化
      const decompressedValue = this.isCompressed(value)
        ? await this.decompress(value)
        : value;

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS) {
        this.logger.warn(CACHE_WARNING_MESSAGES.SLOW_OPERATION, {
          operation: CACHE_OPERATIONS.GET,
          key,
          duration,
          threshold: CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS,
        });
      }

      return this.deserialize(decompressedValue, deserializer);
    } catch (error) {
      this.logger.error(
        `${CACHE_ERROR_MESSAGES.GET_FAILED} ${key}:`,
        sanitizeLogData({ error }),
      );
      this.updateCacheMetrics(key, "miss");
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.GET_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 带回调的缓存获取（缓存穿透保护）
   */
  @CachePerformance("get_or_set")
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheConfigDto = { ttl: CACHE_TTL.DEFAULT },
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key, options.serializer);
    if (cached !== null) {
      return cached;
    }

    // 使用分布式锁防止缓存击穿
    const lockKey = `${CACHE_KEYS.LOCK_PREFIX}${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockTtl = CACHE_TTL.LOCK_TTL;

    try {
      // 尝试获取锁
      const lockAcquired = await this.redis.set(
        lockKey,
        lockValue,
        "EX",
        lockTtl,
        "NX",
      );

      if (lockAcquired) {
        try {
          // 获得锁，执行回调并缓存结果
          const result = await callback();
          await this.set(key, result, options);
          return result;
        } finally {
          // 释放锁
          await this.releaseLock(lockKey, lockValue);
        }
      } else {
        // 未获得锁，等待一段时间后重试获取缓存
        await this.sleep(
          CACHE_CONSTANTS.REDIS_CONFIG.RETRY_DELAY_MS / 2 +
            Math.random() * (CACHE_CONSTANTS.REDIS_CONFIG.RETRY_DELAY_MS / 2),
        );

        const retryResult = await this.get<T>(key, options.serializer);
        if (retryResult !== null) {
          return retryResult;
        }

        // 仍然没有缓存，直接执行回调（可能会有短暂的重复计算）
        this.logger.warn(CACHE_WARNING_MESSAGES.LOCK_TIMEOUT, { key });
        return await callback();
      }
    } catch (error) {
      this.logger.error(
        `${CACHE_ERROR_MESSAGES.GET_OR_SET_FAILED} ${key}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常，而不是回退到直接调用 callback
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.GET_OR_SET_FAILED}: ${error.message}`,
      );
    }
  }

  // --- Redis List Operations ---

  async listPush(key: string, values: string | string[]): Promise<number> {
    try {
      return await this.redis.lpush(
        key,
        ...(Array.isArray(values) ? values : [values]),
      );
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.SET_FAILED,
        sanitizeLogData({
          operation: "listPush",
          key,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(
        `List push failed: ${error.message}`,
      );
    }
  }

  async listTrim(key: string, start: number, stop: number): Promise<"OK"> {
    try {
      return await this.redis.ltrim(key, start, stop);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.DELETE_FAILED,
        sanitizeLogData({
          operation: "listTrim",
          key,
          start,
          stop,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(
        `List trim failed: ${error.message}`,
      );
    }
  }

  async listRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.lrange(key, start, stop);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.GET_FAILED,
        sanitizeLogData({
          operation: "listRange",
          key,
          start,
          stop,
          error: error.message,
          impact: "MetricsDataLoss",
          component: "CacheService",
        }),
      );
      // 性能监控是非关键功能，返回空数组而不是抛异常
      return [];
    }
  }

  // --- Redis Set Operations ---

  async setAdd(key: string, members: string | string[]): Promise<number> {
    try {
      return await this.redis.sadd(
        key,
        ...(Array.isArray(members) ? members : [members]),
      );
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.SET_FAILED,
        sanitizeLogData({
          operation: "setAdd",
          key,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(`Set add failed: ${error.message}`);
    }
  }

  async setIsMember(key: string, member: string): Promise<boolean> {
    try {
      return (await this.redis.sismember(key, member)) === 1;
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.GET_FAILED,
        sanitizeLogData({
          operation: "setIsMember",
          key,
          member,
          error: error.message,
          impact: "MetricsDataLoss",
          component: "CacheService",
        }),
      );
      // 性能监控是非关键功能，返回false而不是抛异常
      return false;
    }
  }

  async setMembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.GET_FAILED,
        sanitizeLogData({
          operation: "setMembers",
          key,
          error: error.message,
          impact: "MetricsDataLoss",
          component: "CacheService",
        }),
      );
      // 性能监控是非关键功能，返回空数组而不是抛异常
      return [];
    }
  }

  async setRemove(key: string, members: string | string[]): Promise<number> {
    try {
      return await this.redis.srem(
        key,
        ...(Array.isArray(members) ? members : [members]),
      );
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.DELETE_FAILED,
        sanitizeLogData({
          operation: "setRemove",
          key,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(
        `Set remove failed: ${error.message}`,
      );
    }
  }

  // --- Redis Hash Operations ---

  async hashIncrementBy(
    key: string,
    field: string,
    value: number,
  ): Promise<number> {
    try {
      return await this.redis.hincrby(key, field, value);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.SET_FAILED,
        sanitizeLogData({
          operation: "hashIncrement",
          key,
          field,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(
        `Hash increment failed: ${error.message}`,
      );
    }
  }

  async hashSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.redis.hset(key, field, value);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.SET_FAILED,
        sanitizeLogData({
          operation: "hashSet",
          key,
          field,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(
        `Hash set failed: ${error.message}`,
      );
    }
  }

  async hashGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.GET_FAILED,
        sanitizeLogData({
          operation: "hashGetAll",
          key,
          error: error.message,
          impact: "MetricsDataLoss",
          component: "CacheService",
        }),
      );
      // 性能监控是非关键功能，返回空对象而不是抛异常
      return {};
    }
  }

  // --- Redis Key Operations ---

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return (await this.redis.expire(key, seconds)) === 1;
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.SET_FAILED,
        sanitizeLogData({
          operation: "expire",
          key,
          seconds,
          error: error.message,
        }),
      );
      throw new ServiceUnavailableException(
        `Expire set failed: ${error.message}`,
      );
    }
  }

  /**
   * 批量获取缓存
   */
  @CachePerformance("mget")
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (keys.length === 0) return result;

    // 检查批量大小
    if (keys.length > CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE) {
      this.logger.warn(CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING, {
        operation: CACHE_OPERATIONS.MGET,
        batchSize: keys.length,
        limit: CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE,
      });
    }

    const startTime = Date.now();
    try {
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];

        if (value !== null) {
          this.updateCacheMetrics(key, "hit");
          const decompressedValue = this.isCompressed(value)
            ? await this.decompress(value)
            : value;
          result.set(key, this.deserialize(decompressedValue));
        } else {
          this.updateCacheMetrics(key, "miss");
        }
      }

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS) {
        this.logger.warn(CACHE_WARNING_MESSAGES.SLOW_OPERATION, {
          operation: CACHE_OPERATIONS.MGET,
          batchSize: keys.length,
          duration,
          threshold: CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS,
        });
      }
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.BATCH_GET_FAILED,
        sanitizeLogData({ error }),
      );
      keys.forEach((key) => this.updateCacheMetrics(key, "miss"));
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.BATCH_GET_FAILED}: ${error.message}`,
      );
    }

    return result;
  }

  /**
   * 批量设置缓存
   */
  @CachePerformance("mset")
  async mset<T>(
    entries: Map<string, T>,
    ttl: number = CACHE_TTL.DEFAULT,
  ): Promise<boolean> {
    if (entries.size === 0) return true;

    // 检查批量大小
    if (entries.size > CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE) {
      this.logger.warn(CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING, {
        operation: CACHE_OPERATIONS.MSET,
        batchSize: entries.size,
        limit: CACHE_CONSTANTS.SIZE_LIMITS.MAX_BATCH_SIZE,
      });
    }

    const startTime = Date.now();
    try {
      const pipeline = this.redis.pipeline();

      for (const [key, value] of entries) {
        const serializedValue = this.serialize(value);
        pipeline.setex(key, ttl, serializedValue);
        this.updateCacheMetrics(key, "set");
      }

      const results = await pipeline.exec();

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS) {
        this.logger.warn(CACHE_WARNING_MESSAGES.SLOW_OPERATION, {
          operation: CACHE_OPERATIONS.MSET,
          batchSize: entries.size,
          duration,
          threshold: CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS,
        });
      }

      return results.every((result) => result[1] === "OK");
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.BATCH_SET_FAILED,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.BATCH_SET_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 删除缓存
   */
  @CachePerformance("del")
  async del(key: string | string[]): Promise<number> {
    try {
      if (Array.isArray(key)) {
        return await this.redis.del(...key);
      } else {
        return await this.redis.del(key);
      }
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.DELETE_FAILED,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.DELETE_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 模式删除缓存
   */
  @CachePerformance("pattern_del")
  async delByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(
        `${CACHE_ERROR_MESSAGES.PATTERN_DELETE_FAILED} ${pattern}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_ERROR_MESSAGES.PATTERN_DELETE_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 缓存预热
   */
  async warmup<T>(
    warmupData: Map<string, T>,
    options: CacheConfigDto = { ttl: CACHE_TTL.DEFAULT },
  ): Promise<void> {
    this.logger.log(
      `${CACHE_SUCCESS_MESSAGES.WARMUP_STARTED}，共 ${warmupData.size} 个项目...`,
    );
    const startTime = Date.now();

    try {
      await this.mset(warmupData, options.ttl);
      const duration = Date.now() - startTime;
      this.logger.log(
        `${CACHE_SUCCESS_MESSAGES.WARMUP_COMPLETED}，耗时 ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(CACHE_ERROR_MESSAGES.WARMUP_FAILED, error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStatsDto> {
    // 从 Redis 获取服务器级别的统计数据
    const [info, dbSize, keyspace] = await Promise.all([
      this.redis.info(),
      this.redis.dbsize(),
      this.redis.info("keyspace"),
    ]);

    // 从内存中计算准确的命中/未命中次数
    let totalHits = 0;
    let totalMisses = 0;
    for (const stats of this.cacheStats.values()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }

    const totalRequests = totalHits + totalMisses;

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      memoryUsage: this.parseRedisInfo(info, "used_memory"),
      keyCount: dbSize,
      avgTtl: this.parseRedisKeyspace(keyspace),
    };
  }

  /**
   * 缓存健康检查
   */
  async healthCheck(): Promise<CacheHealthCheckResultDto> {
    const errors: string[] = [];
    let status: "healthy" | "warning" | "unhealthy" = "healthy";
    let latency = 0;

    try {
      const startTime = Date.now();
      const pong = await this.redis.ping();
      latency = Date.now() - startTime;

      if (pong !== "PONG") {
        errors.push(CACHE_ERROR_MESSAGES.REDIS_PING_FAILED);
        status = "unhealthy";
      }

      // 检查内存使用
      const info = await this.redis.info("memory");
      const memoryUsage = this.parseRedisInfo(info, "used_memory");
      const maxMemory = this.parseRedisInfo(info, "maxmemory");

      if (
        maxMemory > 0 &&
        memoryUsage / maxMemory >
          CACHE_CONSTANTS.MONITORING_CONFIG.ALERT_THRESHOLD_PERCENT / 100
      ) {
        errors.push(CACHE_ERROR_MESSAGES.MEMORY_USAGE_HIGH);
        status = "warning";
      }
    } catch (error) {
      errors.push(CACHE_ERROR_MESSAGES.HEALTH_CHECK_FAILED);
      status = "unhealthy";
      this.logger.error(CACHE_ERROR_MESSAGES.HEALTH_CHECK_FAILED, {
        operation: CACHE_OPERATIONS.HEALTH_CHECK,
        error: error.message,
      });
    }

    return { status, latency, errors };
  }

  // 私有辅助方法
  private serialize<T>(
    value: T,
    serializerType: "json" | "msgpack" = "json",
  ): string {
    if (value === undefined) {
      // JSON.stringify(undefined) returns undefined, which cannot be stored in Redis
      return "null";
    }
    // TODO: support msgpack when serializerType is 'msgpack'
    const serialized =
      serializerType === "json" ? JSON.stringify(value) : JSON.stringify(value);

    // 检查序列化后的大小
    const sizeInBytes = Buffer.byteLength(serialized, "utf8");
    const maxSizeBytes =
      CACHE_CONSTANTS.SIZE_LIMITS.MAX_VALUE_SIZE_MB * 1024 * 1024;

    if (sizeInBytes > maxSizeBytes) {
      this.logger.warn(CACHE_WARNING_MESSAGES.LARGE_VALUE_WARNING, {
        operation: CACHE_OPERATIONS.SERIALIZE,
        sizeInBytes,
        maxSizeBytes,
        sizeMB: Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100,
      });
    }

    return serialized;
  }

  private deserialize<T>(
    value: string,
    deserializerType: "json" | "msgpack" = "json",
  ): T {
    if (value === null) {
      return null;
    }
    // TODO: support msgpack when deserializerType is 'msgpack'
    return deserializerType === "json" ? JSON.parse(value) : JSON.parse(value);
  }

  private shouldCompress(
    value: string,
    threshold: number = CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB *
      1024,
  ): boolean {
    if (!value) {
      return false;
    }
    return value.length > threshold;
  }

  private async compress(value: string): Promise<string> {
    try {
      const compressedBuffer = await gzip(value);
      // 🎯 添加前缀以标识压缩数据
      return COMPRESSION_PREFIX + compressedBuffer.toString("base64");
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.COMPRESSION_FAILED,
        sanitizeLogData({ error }),
      );
      // 压缩失败则返回原始值
      return value;
    }
  }

  private async decompress(value: string): Promise<string> {
    try {
      // 🎯 移除前缀并解压
      const compressedData = value.substring(COMPRESSION_PREFIX.length);
      const buffer = Buffer.from(compressedData, "base64");
      const decompressedBuffer = await gunzip(buffer);
      return decompressedBuffer.toString("utf8");
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.DECOMPRESSION_FAILED,
        sanitizeLogData({ error }),
      );
      // 解压失败则返回原始值（可能未被压缩）
      return value;
    }
  }

  private isCompressed(value: string): boolean {
    // 🎯 通过前缀判断是否压缩
    return value.startsWith(COMPRESSION_PREFIX);
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    // 使用Lua脚本确保原子性
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      await this.redis.eval(script, 1, lockKey, lockValue);
    } catch (error) {
      this.logger.error(
        CACHE_ERROR_MESSAGES.LOCK_RELEASE_FAILED,
        sanitizeLogData({
          operation: CACHE_OPERATIONS.RELEASE_LOCK,
          lockKey,
          error: error.message,
        }),
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updateCacheMetrics(
    key: string,
    operation: "hit" | "miss" | "set",
  ): void {
    const pattern = this.extractKeyPattern(key);
    const stats = this.cacheStats.get(pattern) || { hits: 0, misses: 0 };

    if (operation === "hit") {
      stats.hits++;
    } else if (operation === "miss") {
      stats.misses++;
    }

    this.cacheStats.set(pattern, stats);

    // 检查缓存命中率
    const total = stats.hits + stats.misses;
    if (total > 100) {
      // 只在有足够样本时检查
      const missRate = stats.misses / total;
      if (
        missRate >
        CACHE_CONSTANTS.MONITORING_CONFIG.ALERT_THRESHOLD_PERCENT / 100
      ) {
        this.logger.warn(CACHE_WARNING_MESSAGES.HIGH_MISS_RATE, {
          operation: CACHE_OPERATIONS.UPDATE_METRICS,
          pattern,
          missRate: Math.round(missRate * 100) / 100,
          threshold:
            CACHE_CONSTANTS.MONITORING_CONFIG.ALERT_THRESHOLD_PERCENT / 100,
          totalRequests: total,
        });
      }
    }
  }

  private extractKeyPattern(key: string): string {
    // 简化处理，可根据实际情况扩展
    const parts = key.split(":");
    if (parts.length > 1) {
      return `${parts[0]}:*`;
    }
    return "general";
  }

  private parseRedisInfo(info: string, key: string): number {
    const match = info.match(new RegExp(`^${key}:(\\d+(\\.\\d+)?)`, "m"));
    return match ? parseFloat(match[1]) : 0;
  }

  private parseRedisKeyspace(keyspace: string): number {
    const matches = keyspace.matchAll(/avg_ttl=(\d+)/g);
    let totalTtl = 0;
    let count = 0;

    for (const match of matches) {
      totalTtl += parseInt(match[1], 10);
      count++;
    }

    return count > 0 ? totalTtl / count : -1;
  }

  // --- 定期任务 ---
  /**
   * 启动后台优化任务
   */
  private startOptimizationTasks(): void {
    this.logger.log(CACHE_SUCCESS_MESSAGES.OPTIMIZATION_TASKS_STARTED, {
      operation: CACHE_OPERATIONS.UPDATE_METRICS,
      statsCleanupInterval:
        CACHE_CONSTANTS.MONITORING_CONFIG.METRICS_INTERVAL_MS * 10,
      healthCheckInterval:
        CACHE_CONSTANTS.MONITORING_CONFIG.METRICS_INTERVAL_MS * 3,
    });

    // 定期清理内存中的统计信息
    setInterval(
      () => this.cleanupStats(),
      CACHE_CONSTANTS.MONITORING_CONFIG.METRICS_INTERVAL_MS * 10,
    );

    // 定期检查缓存健康状况
    setInterval(
      () => this.checkAndLogHealth(),
      CACHE_CONSTANTS.MONITORING_CONFIG.METRICS_INTERVAL_MS * 3,
    );
  }

  /**
   * 检查并记录缓存健康状况
   */
  private async checkAndLogHealth(): Promise<void> {
    const health = await this.healthCheck();
    if (health.status !== "healthy") {
      this.logger.warn(
        CACHE_WARNING_MESSAGES.HEALTH_CHECK_WARNING,
        sanitizeLogData({
          status: health.status,
          latency: health.latency,
          errors: health.errors,
        }),
      );
    }
  }

  /**
   * 清理不再使用的缓存键统计信息
   */
  private cleanupStats(): void {
    const activeKeys = new Set(this.cacheStats.keys());
    this.logger.log(
      `开始清理缓存统计`,
      sanitizeLogData({
        operation: CACHE_OPERATIONS.CLEANUP_STATS,
        activeKeysCount: activeKeys.size,
      }),
    );

    // 假设长时间未访问的键可以被清理
    // 这里需要更复杂的逻辑来判断键是否“不再使用”
    // 此处为简化实现，不执行清理

    this.logger.log(
      CACHE_SUCCESS_MESSAGES.STATS_CLEANUP_COMPLETED,
      sanitizeLogData({
        operation: CACHE_OPERATIONS.CLEANUP_STATS,
        activeKeysCount: activeKeys.size,
      }),
    );
  }

  /**
   * 验证缓存键长度
   */
  private validateKeyLength(key: string): void {
    if (key.length > CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH) {
      const errorMessage = `${
        CACHE_ERROR_MESSAGES.INVALID_KEY_LENGTH
      }: 键 '${key.substring(0, 50)}...' 的长度 ${key.length} 超过了最大限制 ${
        CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH
      }`;
      this.logger.error(errorMessage, {
        operation: "validateKeyLength",
        keyLength: key.length,
        maxLength: CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH,
      });
      throw new BadRequestException(errorMessage);
    }
  }
}
