import { promisify } from "util";
import * as zlib from "zlib";
import * as msgpack from "msgpack-lite";

import { InjectRedis } from "@nestjs-modules/ioredis";
import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// 🎯 复用 common 模块的日志配置
import Redis from "ioredis";

import { createLogger, sanitizeLogData } from "@appcore/config/logger.config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../monitoring/contracts/events/system-status.events";
import { CacheConfig } from "../config/cache.config";

// Import modern structured constants directly
import { CACHE_MESSAGES } from "../constants/messages/cache-messages.constants";
import { CACHE_KEYS } from "../constants/config/cache-keys.constants";
import { 
  CACHE_CORE_OPERATIONS,
  CACHE_EXTENDED_OPERATIONS, 
  CACHE_INTERNAL_OPERATIONS 
} from "../constants/operations/cache-operations.constants";
import { CACHE_DATA_FORMATS, SerializerType, SERIALIZER_TYPE_VALUES } from "../constants/config/data-formats.constants";

// 🎯 Gzip 压缩/解压缩
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
// 🎯 使用统一的压缩前缀常量，替代硬编码魔法字符串

// 🎯 使用内部 DTO 类型替换原始接口定义
import {
  CacheConfigDto,
  RedisCacheRuntimeStatsDto,
  CacheHealthCheckResultDto,
} from "../dto/cache-internal.dto";

// 🎯 为了向后兼容，保留类型别名
export type CacheStats = RedisCacheRuntimeStatsDto;

@Injectable()
export class CacheService {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(CacheService.name);
  private readonly cacheConfig: CacheConfig;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventBus: EventEmitter2, // 🎯 事件驱动监控
    private readonly configService: ConfigService,
  ) {
    this.cacheConfig = this.configService.get<CacheConfig>('cache');
    if (!this.cacheConfig) {
      throw new Error('Cache configuration not found');
    }
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
  async set<T = any>(
    key: string,
    value: T,
    options: CacheConfigDto = { ttl: this.cacheConfig.defaultTtl },
  ): Promise<boolean> {
    // 检查键长度
    this.validateKeyLength(key);

    const startTime = Date.now();
    try {
      const serializedValue = this.serialize(value, options.serializer);
      const compressedValue = this.shouldCompress(
        serializedValue,
        options.compressionThreshold ?? this.cacheConfig.compressionThreshold,
      )
        ? await this.compress(serializedValue)
        : serializedValue;

      const result = await this.redis.setex(key, options.ttl, compressedValue);

      // 🎯 事件驱动监控
      this.emitCacheEvent("set", key, startTime, {
        ttl: options.ttl,
        compressed: compressedValue !== serializedValue,
      });

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.cacheConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.SET,
          key,
          duration,
          threshold: this.cacheConfig.slowOperationMs,
        });
      }

      return result === "OK";
    } catch (error) {
      this.logger.error(
        `${CACHE_MESSAGES.ERRORS.SET_FAILED} ${key}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.SET_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 智能缓存获取
   */
  async get<T>(
    key: string,
    deserializer?: SerializerType,
  ): Promise<T | null> {
    // 检查键长度
    this.validateKeyLength(key);

    const startTime = Date.now();
    try {
      const value = await this.redis.get(key);

      if (value === null) {
        // 🎯 事件驱动监控 - 缓存未命中
        this.emitCacheEvent("get_miss", key, startTime);
        return null;
      }

      // 🎯 事件驱动监控 - 缓存命中
      this.emitCacheEvent("get_hit", key, startTime, {
        compressed: this.isCompressed(value),
      });

      // 解压缩和反序列化
      const decompressedValue = this.isCompressed(value)
        ? await this.decompress(value)
        : value;

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.cacheConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.GET,
          key,
          duration,
          threshold: this.cacheConfig.slowOperationMs,
        });
      }

      return this.deserialize(decompressedValue, deserializer);
    } catch (error) {
      this.logger.error(
        `${CACHE_MESSAGES.ERRORS.GET_FAILED} ${key}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 事件驱动监控 - 错误导致未命中
      this.emitCacheEvent("get_miss", key, startTime, { error: error.message });
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.GET_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 带回调的缓存获取（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheConfigDto = { ttl: this.cacheConfig.defaultTtl },
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key, options.serializer);
    if (cached !== null) {
      return cached;
    }

    // 使用分布式锁防止缓存击穿
    const lockKey = `${CACHE_KEYS.PREFIXES.LOCK}${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockTtl = this.cacheConfig.lockTtl;

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
          this.cacheConfig.retryDelayMs / 2 +
            Math.random() * (this.cacheConfig.retryDelayMs / 2),
        );

        const retryResult = await this.get<T>(key, options.serializer);
        if (retryResult !== null) {
          return retryResult;
        }

        // 仍然没有缓存，直接执行回调（可能会有短暂的重复计算）
        this.logger.warn(CACHE_MESSAGES.WARNINGS.LOCK_TIMEOUT, { key });
        return await callback();
      }
    } catch (error) {
      this.logger.error(
        `${CACHE_MESSAGES.ERRORS.GET_OR_SET_FAILED} ${key}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常，而不是回退到直接调用 callback
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.GET_OR_SET_FAILED}: ${error.message}`,
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
        CACHE_MESSAGES.ERRORS.SET_FAILED,
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
        CACHE_MESSAGES.ERRORS.DELETE_FAILED,
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
        CACHE_MESSAGES.ERRORS.GET_FAILED,
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
        CACHE_MESSAGES.ERRORS.SET_FAILED,
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
        CACHE_MESSAGES.ERRORS.GET_FAILED,
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
        CACHE_MESSAGES.ERRORS.GET_FAILED,
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
        CACHE_MESSAGES.ERRORS.DELETE_FAILED,
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
        CACHE_MESSAGES.ERRORS.SET_FAILED,
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
        CACHE_MESSAGES.ERRORS.SET_FAILED,
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
        CACHE_MESSAGES.ERRORS.GET_FAILED,
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
        CACHE_MESSAGES.ERRORS.SET_FAILED,
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
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (keys.length === 0) return result;

    // 检查批量大小
    if (keys.length > this.cacheConfig.maxBatchSize) {
      this.logger.warn(CACHE_MESSAGES.WARNINGS.LARGE_VALUE_WARNING, {
        operation: CACHE_CORE_OPERATIONS.MGET,
        batchSize: keys.length,
        limit: this.cacheConfig.maxBatchSize,
      });
    }

    const startTime = Date.now();
    try {
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];

        if (value !== null) {
          // 🎯 事件驱动监控 - mget 命中
          this.emitCacheEvent("get_hit", key, startTime, {
            compressed: this.isCompressed(value),
            batch: true,
          });
          const decompressedValue = this.isCompressed(value)
            ? await this.decompress(value)
            : value;
          result.set(key, this.deserialize(decompressedValue));
        } else {
          // 🎯 事件驱动监控 - mget 未命中
          this.emitCacheEvent("get_miss", key, startTime, { batch: true });
        }
      }

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.cacheConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.MGET,
          batchSize: keys.length,
          duration,
          threshold: this.cacheConfig.slowOperationMs,
        });
      }
    } catch (error) {
      this.logger.error(
        CACHE_MESSAGES.ERRORS.BATCH_GET_FAILED,
        sanitizeLogData({ error }),
      );
      // 🎯 事件驱动监控 - mget 错误导致未命中
      keys.forEach((key) =>
        this.emitCacheEvent("get_miss", key, startTime, {
          error: error.message,
          batch: true,
        }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.BATCH_GET_FAILED}: ${error.message}`,
      );
    }

    return result;
  }

  /**
   * 批量设置缓存
   */
  async mset<T>(
    entries: Map<string, T>,
    ttl: number = this.cacheConfig.defaultTtl,
  ): Promise<boolean> {
    if (entries.size === 0) return true;

    // 检查批量大小
    if (entries.size > this.cacheConfig.maxBatchSize) {
      this.logger.warn(CACHE_MESSAGES.WARNINGS.LARGE_VALUE_WARNING, {
        operation: CACHE_CORE_OPERATIONS.MSET,
        batchSize: entries.size,
        limit: this.cacheConfig.maxBatchSize,
      });
    }

    const startTime = Date.now();
    try {
      const pipeline = this.redis.pipeline();

      for (const [key, value] of entries) {
        const serializedValue = this.serialize(value);
        pipeline.setex(key, ttl, serializedValue);
        // 🎯 事件驱动监控 - mset 操作
        this.emitCacheEvent("mset", key, startTime, { ttl, batch: true });
      }

      const results = await pipeline.exec();

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.cacheConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.MSET,
          batchSize: entries.size,
          duration,
          threshold: this.cacheConfig.slowOperationMs,
        });
      }

      return results.every((result) => result[1] === "OK");
    } catch (error) {
      this.logger.error(
        CACHE_MESSAGES.ERRORS.BATCH_SET_FAILED,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.BATCH_SET_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string | string[]): Promise<number> {
    try {
      if (Array.isArray(key)) {
        return await this.redis.del(...key);
      } else {
        return await this.redis.del(key);
      }
    } catch (error) {
      this.logger.error(
        CACHE_MESSAGES.ERRORS.DELETE_FAILED,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.DELETE_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 模式删除缓存
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(
        `${CACHE_MESSAGES.ERRORS.PATTERN_DELETE_FAILED} ${pattern}:`,
        sanitizeLogData({ error }),
      );
      // 🎯 修正: 抛出标准异常
      throw new ServiceUnavailableException(
        `${CACHE_MESSAGES.ERRORS.PATTERN_DELETE_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * 缓存预热
   */
  async warmup<T>(
    warmupData: Map<string, T>,
    options: CacheConfigDto = { ttl: this.cacheConfig.defaultTtl },
  ): Promise<void> {
    this.logger.log(
      `${CACHE_MESSAGES.SUCCESS.WARMUP_STARTED}，共 ${warmupData.size} 个项目...`,
    );
    const startTime = Date.now();

    try {
      await this.mset(warmupData, options.ttl);
      const duration = Date.now() - startTime;
      this.logger.log(
        `${CACHE_MESSAGES.SUCCESS.WARMUP_COMPLETED}，耗时 ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(CACHE_MESSAGES.ERRORS.WARMUP_FAILED, error);
    }
  }


  // 私有辅助方法
  private serialize<T>(
    value: T,
    serializerType: SerializerType = CACHE_DATA_FORMATS.SERIALIZATION.JSON,
  ): string {
    if (value === undefined) {
      // JSON.stringify(undefined) returns undefined, which cannot be stored in Redis
      return "null";
    }
    
    let serialized: string;
    switch (serializerType) {
      case 'json':
        serialized = JSON.stringify(value);
        break;
      case 'msgpack':
        // msgpack序列化并转为base64字符串存储
        serialized = msgpack.encode(value).toString('base64');
        break;
      default:
        throw new BadRequestException(`不支持的序列化类型: ${serializerType}`);
    }

    // 检查序列化后的大小
    const sizeInBytes = Buffer.byteLength(serialized, "utf8");
    const maxSizeBytes =
      this.cacheConfig.maxValueSizeMB * 1024 * 1024;

    if (sizeInBytes > maxSizeBytes) {
      this.logger.warn(CACHE_MESSAGES.WARNINGS.LARGE_VALUE_WARNING, {
        operation: CACHE_INTERNAL_OPERATIONS.SERIALIZE,
        sizeInBytes,
        maxSizeBytes,
        sizeMB: Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100,
      });
    }

    return serialized;
  }

  private deserialize<T>(
    value: string,
    deserializerType: SerializerType = CACHE_DATA_FORMATS.SERIALIZATION.JSON,
  ): T {
    if (value === null) {
      return null;
    }
    
    switch (deserializerType) {
      case 'json':
        return JSON.parse(value);
      case 'msgpack':
        // 从base64字符串解码并反序列化
        const buffer = Buffer.from(value, 'base64');
        return msgpack.decode(buffer);
      default:
        throw new BadRequestException(`不支持的反序列化类型: ${deserializerType}`);
    }
  }

  private shouldCompress(
    value: string,
    threshold: number = this.cacheConfig.compressionThreshold,
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
      return CACHE_DATA_FORMATS.COMPRESSION_PREFIX + compressedBuffer.toString("base64");
    } catch (error) {
      this.logger.error(
        CACHE_MESSAGES.ERRORS.COMPRESSION_FAILED,
        sanitizeLogData({ error }),
      );
      // 压缩失败则返回原始值
      return value;
    }
  }

  private async decompress(value: string): Promise<string> {
    try {
      // 🎯 移除前缀并解压
      const compressedData = value.substring(CACHE_DATA_FORMATS.COMPRESSION_PREFIX.length);
      const buffer = Buffer.from(compressedData, "base64");
      const decompressedBuffer = await gunzip(buffer);
      return decompressedBuffer.toString("utf8");
    } catch (error) {
      this.logger.error(
        CACHE_MESSAGES.ERRORS.DECOMPRESSION_FAILED,
        sanitizeLogData({ error }),
      );
      // 解压失败则返回原始值（可能未被压缩）
      return value;
    }
  }

  private isCompressed(value: string): boolean {
    // 🎯 通过前缀判断是否压缩
    return value.startsWith(CACHE_DATA_FORMATS.COMPRESSION_PREFIX);
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
        CACHE_MESSAGES.ERRORS.LOCK_RELEASE_FAILED,
        sanitizeLogData({
          operation: CACHE_EXTENDED_OPERATIONS.RELEASE_LOCK,
          lockKey,
          error: error.message,
        }),
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractKeyPattern(key: string): string {
    // 简化处理，可根据实际情况扩展
    const parts = key.split(":");
    if (parts.length > 1) {
      return `${parts[0]}:*`;
    }
    return "general";
  }

  /**
   * 🎯 事件驱动监控 - 替代内部统计系统
   */
  private emitCacheEvent(
    operation: "set" | "get_hit" | "get_miss" | "del" | "mget" | "mset",
    key: string,
    startTime?: number,
    additionalData?: Record<string, any>,
  ): void {
    setImmediate(() => {
      const eventData = {
        timestamp: new Date(),
        source: "cache_service",
        metricType: "cache" as const,
        metricName: `cache_${operation}`,
        metricValue: startTime ? Date.now() - startTime : 0,
        tags: {
          operation,
          key_pattern: this.extractKeyPattern(key),
          ...additionalData,
        },
      };

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, eventData);
    });
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

  /**
   * 检查并记录缓存健康状况
   */

  /**
   * 清理不再使用的缓存键统计信息
   */

  /**
   * 验证缓存键长度
   */
  private validateKeyLength(key: string): void {
    if (key.length > this.cacheConfig.maxKeyLength) {
      const errorMessage = `${
        CACHE_MESSAGES.ERRORS.INVALID_KEY_LENGTH
      }: 键 '${key.substring(0, 50)}...' 的长度 ${key.length} 超过了最大限制 ${
        this.cacheConfig.maxKeyLength
      }`;
      this.logger.error(errorMessage, {
        operation: "validateKeyLength",
        keyLength: key.length,
        maxLength: this.cacheConfig.maxKeyLength,
      });
      throw new BadRequestException(errorMessage);
    }
  }
}
