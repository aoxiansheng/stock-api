import { promisify } from "util";
import * as zlib from "zlib";
import * as msgpack from "msgpack-lite";

import { InjectRedis } from "@nestjs-modules/ioredis";
import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  Inject,
  HttpStatus,
} from "@nestjs/common";
import { CacheConnectionException, CacheSerializationException } from "../exceptions";
import { ConfigService } from "@nestjs/config";
// 🎯 复用 common 模块的日志配置
import Redis from "ioredis";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../monitoring/contracts/events/system-status.events";
import { CacheConfig } from "../config/cache-legacy.config";
// 统一配置类型已移除导入
import type { CacheUnifiedConfig } from "../config/cache-unified.config";
// CacheLimitsProvider 已移除，限制配置通过统一配置获取

// Import modern structured constants directly
import { CACHE_MESSAGES } from "../constants/messages/cache-messages.constants";
import { CACHE_KEYS } from "../constants/config/cache-keys.constants";
import {
  CACHE_CORE_OPERATIONS,
  CACHE_EXTENDED_OPERATIONS,
  CACHE_INTERNAL_OPERATIONS,
} from "../constants/operations/cache-operations.constants";
import {
  CACHE_DATA_FORMATS,
  SerializerType,
  SERIALIZER_TYPE_VALUES,
} from "../constants/config/data-formats.constants";

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
  private readonly cacheUnifiedConfig: CacheUnifiedConfig;
  private readonly legacyCacheConfig: CacheConfig; // 保留用于向后兼容

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventBus: EventEmitter2, // 🎯 事件驱动监控
    private readonly configService: ConfigService,
    // 🎯 所有配置现在通过统一配置获取，移除冗余的Provider依赖
    @Inject("cacheTtl") private readonly ttlConfig: CacheUnifiedConfig, // 🎯 TTL统一配置（兼容）
  ) {
    // 🎯 优先使用统一配置
    this.cacheUnifiedConfig =
      this.configService.get<CacheUnifiedConfig>("cacheUnified");
    if (!this.cacheUnifiedConfig) {
      throw new Error("Cache unified configuration not found");
    }

    // 🎯 向后兼容：检查旧配置
    this.legacyCacheConfig = this.configService.get<CacheConfig>("cache");
    if (this.legacyCacheConfig) {
      this.logger.warn(
        "⚠️  DEPRECATED: 检测到旧版cache配置，请迁移到cacheUnified配置",
        {
          migrationGuide: "docs/cache-migration-guide.md",
          newConfigNamespace: "cacheUnified",
        },
      );

      // 运行时废弃警告：提醒开发者迁移到统一配置
      this.logger.warn(
        "⚠️  DEPRECATED: CacheConfig 已废弃，请迁移到 CacheUnifiedConfig",
        {
          currentValue: this.cacheUnifiedConfig.defaultTtl,
          migrationGuide: "Use @Inject('cacheUnified') CacheUnifiedConfig",
          migrationNote: "当前已自动使用统一配置",
        },
      );
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
   * 🎯 获取默认TTL - 使用统一配置
   * 优先使用CacheUnifiedConfig，向后兼容旧配置
   */
  private getDefaultTtl(): number {
    return this.cacheUnifiedConfig.defaultTtl;
  }

  /**
   * 检测是否为Redis连接错误
   * 简化版错误检测，用于替代CacheExceptionFactory.fromError
   */
  private isConnectionError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes('connection') || 
           msg.includes('econnrefused') || 
           msg.includes('enotfound') || 
           msg.includes('redis');
  }

  /**
   * 根据时效性获取TTL
   * 🎯 新增方法：提供基于业务场景的TTL获取
   */
  getTtlByTimeliness(
    timeliness:
      | "strong"
      | "moderate"
      | "weak"
      | "long"
      | "monitoring"
      | "auth"
      | "transformer"
      | "suggestion",
  ): number {
    switch (timeliness) {
      case "strong":
        return this.cacheUnifiedConfig.strongTimelinessTtl;
      case "moderate":
        return this.cacheUnifiedConfig.realtimeTtl;
      case "weak":
        return this.cacheUnifiedConfig.defaultTtl;
      case "long":
        return this.cacheUnifiedConfig.longTermTtl;
      case "monitoring":
        return this.cacheUnifiedConfig.monitoringTtl;
      case "auth":
        return this.cacheUnifiedConfig.authTtl;
      case "transformer":
        return this.cacheUnifiedConfig.transformerTtl;
      case "suggestion":
        return this.cacheUnifiedConfig.suggestionTtl;
      default:
        return this.cacheUnifiedConfig.defaultTtl;
    }
  }

  /**
   * 智能缓存设置
   */
  async set<T = any>(
    key: string,
    value: T,
    options: CacheConfigDto = { ttl: this.getDefaultTtl() },
  ): Promise<boolean> {
    // 🎯 重构: 键长度验证已移至DTO层面，使用@IsValidCacheKey装饰器

    const startTime = Date.now();
    try {
      const serializedValue = this.serialize(value, options.serializer);
      const compressedValue = this.shouldCompress(
        serializedValue,
        options.compressionThreshold ??
          this.cacheUnifiedConfig.compressionThreshold,
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
      if (duration > this.cacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.SET,
          key,
          duration,
          threshold: this.cacheUnifiedConfig.slowOperationMs,
        });
      }

      return result === "OK";
    } catch (error) {
      // 🔧 简化异常处理: 使用标准NestJS异常替代自定义工厂
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException(CACHE_CORE_OPERATIONS.SET, key);
      }
      throw new ServiceUnavailableException(`缓存设置失败: ${CACHE_CORE_OPERATIONS.SET} (key: ${key})`);
    }
  }

  /**
   * 智能缓存获取
   */
  async get<T>(key: string, deserializer?: SerializerType): Promise<T | null> {
    // 🎯 重构: 键长度验证已移至DTO层面，使用@IsValidCacheKey装饰器

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
      if (duration > this.cacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.GET,
          key,
          duration,
          threshold: this.cacheUnifiedConfig.slowOperationMs,
        });
      }

      return this.deserialize(decompressedValue, deserializer);
    } catch (error) {
      // 🎯 事件驱动监控 - 错误导致未命中
      this.emitCacheEvent("get_miss", key, startTime, { error: error.message });
      // 🔧 简化异常处理: 使用标准NestJS异常替代自定义工厂
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException(CACHE_CORE_OPERATIONS.GET, key);
      }
      throw new ServiceUnavailableException(`缓存获取失败: ${CACHE_CORE_OPERATIONS.GET} (key: ${key})`);
    }
  }

  /**
   * 带回调的缓存获取（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheConfigDto = { ttl: this.getDefaultTtl() },
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key, options.serializer);
    if (cached !== null) {
      return cached;
    }

    // 使用分布式锁防止缓存击穿
    const lockKey = `${CACHE_KEYS.PREFIXES.LOCK}${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockTtl = this.cacheUnifiedConfig.lockTtl;

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
          this.cacheUnifiedConfig.retryDelayMs / 2 +
            Math.random() * (this.cacheUnifiedConfig.retryDelayMs / 2),
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
      // 🔧 简化异常处理: 使用标准NestJS异常替代自定义工厂
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException(CACHE_EXTENDED_OPERATIONS.GET_OR_SET, key);
      }
      throw new ServiceUnavailableException(`缓存获取或设置失败: ${CACHE_EXTENDED_OPERATIONS.GET_OR_SET} (key: ${key})`);
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
      // 🔧 简化异常处理: 使用标准NestJS异常替代自定义工厂
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("listPush", key);
      }
      throw new ServiceUnavailableException(`列表推送失败: listPush (key: ${key})`);
    }
  }

  async listTrim(key: string, start: number, stop: number): Promise<"OK"> {
    try {
      return await this.redis.ltrim(key, start, stop);
    } catch (error) {
      // 🔧 简化异常处理: 使用标准NestJS异常替代自定义工厂
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("listTrim", key);
      }
      throw new ServiceUnavailableException(`列表修剪失败: listTrim (key: ${key})`);
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
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("setAdd", key);
      }
      throw new ServiceUnavailableException(`集合添加失败: setAdd (key: ${key})`);
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
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("setRemove", key);
      }
      throw new ServiceUnavailableException(`集合移除失败: setRemove (key: ${key})`);
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
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("hashIncrementBy", key);
      }
      throw new ServiceUnavailableException(`哈希增加失败: hashIncrementBy (key: ${key})`);
    }
  }

  async hashSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.redis.hset(key, field, value);
    } catch (error) {
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("hashSet", key);
      }
      throw new ServiceUnavailableException(`哈希设置失败: hashSet (key: ${key})`);
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
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("expire", key);
      }
      throw new ServiceUnavailableException(`设置过期失败: expire (key: ${key})`);
    }
  }

  /**
   * 批量获取缓存
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (keys.length === 0) return result;

    // 检查批量大小
    const maxBatchSize = this.cacheUnifiedConfig.maxBatchSize;
    if (keys.length > maxBatchSize) {
      // 🔧 简化异常处理: 使用标准NestJS异常
      throw new BadRequestException(
        `批量获取超过限制: 请求${keys.length}个键，最大允许${maxBatchSize}个`
      );
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
      if (duration > this.cacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.MGET,
          batchSize: keys.length,
          duration,
          threshold: this.cacheUnifiedConfig.slowOperationMs,
        });
      }
    } catch (error) {
      // 🎯 事件驱动监控 - mget 错误导致未命中
      keys.forEach((key) =>
        this.emitCacheEvent("get_miss", key, startTime, {
          error: error.message,
          batch: true,
        }),
      );
      // 🔧 简化异常处理: 使用标净NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException(CACHE_CORE_OPERATIONS.MGET, keys.join(','));
      }
      throw new ServiceUnavailableException(`批量获取操作失败: ${error.message}`);
    }

    return result;
  }

  /**
   * 批量设置缓存
   */
  async mset<T>(
    entries: Map<string, T>,
    ttl: number = this.getDefaultTtl(),
  ): Promise<boolean> {
    if (entries.size === 0) return true;

    // 检查批量大小
    const maxBatchSize = this.cacheUnifiedConfig.maxBatchSize;
    if (entries.size > maxBatchSize) {
      // 🔧 简化异常处理: 使用标准NestJS异常
      throw new BadRequestException(
        `批量设置超过限制: 请求${entries.size}个条目，最大允许${maxBatchSize}个`
      );
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
      if (duration > this.cacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.MSET,
          batchSize: entries.size,
          duration,
          threshold: this.cacheUnifiedConfig.slowOperationMs,
        });
      }

      return results.every((result) => result[1] === "OK");
    } catch (error) {
      // 🔧 简化异帰处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        const keyList = Array.from(entries.keys()).join(',');
        throw new CacheConnectionException(CACHE_CORE_OPERATIONS.MSET, keyList);
      }
      throw new ServiceUnavailableException(`批量设置操作失败: ${error.message}`);
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
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      const cacheKey = Array.isArray(key) ? key.join(",") : key;
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException(CACHE_CORE_OPERATIONS.DELETE, cacheKey);
      }
      throw new ServiceUnavailableException(`缓存删除失败: ${CACHE_CORE_OPERATIONS.DELETE} (key: ${cacheKey})`);
    }
  }

  /**
   * 模式删除缓存 - 使用SCAN优化版本
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(pattern); // 🔥 核心修复：KEYS→SCAN

      if (keys.length === 0) return 0;
      return await this.redis.del(...keys);
    } catch (error) {
      // 🔧 重构: 使用 Cache 专用异常替代手动异常处理
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException(CACHE_EXTENDED_OPERATIONS.DELETE_BY_PATTERN, pattern);
      }
      throw new ServiceUnavailableException(`模式删除失败: ${CACHE_EXTENDED_OPERATIONS.DELETE_BY_PATTERN} (pattern: ${pattern})`);
    }
  }

  /**
   * 缓存预热
   */
  async warmup<T>(
    warmupData: Map<string, T>,
    options: CacheConfigDto = { ttl: this.getDefaultTtl() },
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

  /**
   * 使用SCAN替代KEYS - 简洁版本
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    let cursor = "0";
    const keys: string[] = [];

    do {
      const [newCursor, scanKeys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      keys.push(...scanKeys);
      cursor = newCursor;
    } while (cursor !== "0");

    return keys;
  }

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
      case "json":
        serialized = JSON.stringify(value);
        break;
      case "msgpack":
        // msgpack序列化并转为base64字符串存储
        serialized = msgpack.encode(value).toString("base64");
        break;
      default:
        throw new CacheSerializationException(
          CACHE_INTERNAL_OPERATIONS.SERIALIZE,
          serializerType
        );
    }

    // 检查序列化后的大小
    const sizeInBytes = Buffer.byteLength(serialized, "utf8");
    const maxSizeBytes = this.cacheUnifiedConfig.maxValueSizeMB * 1024 * 1024;

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
      case "json":
        return JSON.parse(value);
      case "msgpack":
        // 从base64字符串解码并反序列化
        const buffer = Buffer.from(value, "base64");
        return msgpack.decode(buffer);
      default:
        throw new CacheSerializationException(
          CACHE_INTERNAL_OPERATIONS.DESERIALIZE,
          deserializerType
        );
    }
  }

  private shouldCompress(
    value: string,
    threshold: number = this.cacheUnifiedConfig.compressionThreshold,
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
      return (
        CACHE_DATA_FORMATS.COMPRESSION_PREFIX +
        compressedBuffer.toString("base64")
      );
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
      const compressedData = value.substring(
        CACHE_DATA_FORMATS.COMPRESSION_PREFIX.length,
      );
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
    // 🔥 简单的采样：只发送10%的事件，减少90%的setImmediate调用
    if (Math.random() > 0.1) return;

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
          sampled: true, // 标记为采样事件
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
  // 🗑️ 已移除: validateKeyLength方法已被@IsValidCacheKey装饰器替代
  // 键长度验证现在在DTO层面进行，符合NestJS最佳实践

  // ==================== 容错方法 (为监控组件重构添加) ====================

  /**
   * 安全的缓存读取方法 - 容错版本
   * 缓存失败时返回null而不抛出异常，保证监控逻辑继续执行
   * @param key 缓存键
   * @returns 缓存值或null
   */
  async safeGet<T>(key: string): Promise<T | null> {
    try {
      return await this.get<T>(key);
    } catch (error) {
      this.logger.warn("缓存读取失败，优雅降级", {
        key,
        error: error.message,
        operation: "safeGet",
      });
      return null;
    }
  }

  /**
   * 安全的缓存写入方法 - 容错版本
   * 缓存失败时记录警告但不抛出异常，保证监控逻辑继续执行
   * @param key 缓存键
   * @param value 缓存值
   * @param options 缓存选项
   */
  async safeSet(
    key: string,
    value: any,
    options?: CacheConfigDto,
  ): Promise<void> {
    try {
      await this.set(key, value, options);
    } catch (error) {
      this.logger.warn("缓存写入失败，忽略错误", {
        key,
        error: error.message,
        operation: "safeSet",
      });
      // 不抛出异常，保证监控逻辑继续执行
    }
  }

  /**
   * 安全的缓存获取或设置方法 - 容错版本
   * 缓存操作失败时直接调用工厂方法，保证监控逻辑继续执行
   * @param key 缓存键
   * @param factory 数据工厂方法
   * @param options 缓存选项
   * @returns 缓存值或工厂方法返回值
   */
  async safeGetOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheConfigDto,
  ): Promise<T> {
    try {
      return await this.getOrSet<T>(key, factory, options);
    } catch (error) {
      this.logger.warn("缓存操作失败，直接调用工厂方法", {
        key,
        error: error.message,
        operation: "safeGetOrSet",
      });
      return await factory();
    }
  }

  // ==================== Rate Limiting Support Methods ====================

  /**
   * 创建Redis pipeline - 用于原子性批量操作
   * 主要为限流服务提供支持
   */
  multi() {
    return this.redis.pipeline();
  }

  /**
   * 执行Lua脚本 - 用于复杂的原子性操作
   * 主要为限流服务的滑动窗口算法提供支持
   */
  async eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    try {
      return await this.redis.eval(script, numKeys, ...args);
    } catch (error) {
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("eval", args[0] || "lua_script");
      }
      throw new ServiceUnavailableException(`Lua脚本执行失败: eval`);
    }
  }

  /**
   * 获取有序集合的元素数量
   * 主要为限流服务的滑动窗口统计提供支持
   */
  async zcard(key: string): Promise<number> {
    try {
      return await this.redis.zcard(key);
    } catch (error) {
      this.logger.error("获取有序集合大小失败", {
        operation: "zcard",
        key,
        error: error.message,
      });
      // 限流相关的非关键功能，返回0而不是抛异常
      return 0;
    }
  }

  /**
   * 获取有序集合指定范围的元素
   * 主要为限流服务的滑动窗口统计提供支持
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.zrange(key, start, stop);
    } catch (error) {
      this.logger.error("获取有序集合范围失败", {
        operation: "zrange",
        key,
        start,
        stop,
        error: error.message,
      });
      // 限流相关的非关键功能，返回空数组而不是抛异常
      return [];
    }
  }

  /**
   * 原子性地增加计数器值
   * 主要为限流服务的固定窗口算法提供支持
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      // 🔧 简化异常处理: 使用标准NestJS异常
      if (this.isConnectionError(error)) {
        throw new CacheConnectionException("incr", key);
      }
      throw new ServiceUnavailableException(`计数器增加失败: incr (key: ${key})`);
    }
  }
}
