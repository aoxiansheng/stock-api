import { promisify } from "util";
import * as zlib from "zlib";
import * as msgpack from "msgpack-lite";

import { InjectRedis } from "@nestjs-modules/ioredis";
import {
  Injectable,
  BadRequestException,
  Inject,
  HttpStatus,
} from "@nestjs/common";
import {
  CacheSerializationException,
} from "../exceptions";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { CACHE_ERROR_CODES } from '../constants/cache-error-codes.constants';
import { ConfigService } from "@nestjs/config";
// 🎯 复用 common 模块的日志配置
import Redis from "ioredis";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../monitoring/contracts/events/system-status.events";
// 导入统一配置
import cacheUnifiedConfig from "../config/cache-unified.config";
import type { ConfigType } from "@nestjs/config";

// Import modern structured constants directly
import { CACHE_MESSAGES } from "../constants/messages/cache-messages.constants";
import { CACHE_KEYS } from "../constants/config/cache-keys.constants";
import {
  CACHE_CORE_OPERATIONS,
  CACHE_EXTENDED_OPERATIONS,
  CACHE_INTERNAL_OPERATIONS,
} from "../constants/operations/cache-operations.constants";
import type { SerializerType } from "../constants/config/data-formats.constants";

import { CACHE_DATA_FORMATS } from "../constants/config/data-formats.constants";

// Gzip 压缩/解压缩工具
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
// 压缩工具函数

// DTO 类型导入
import {
  CacheConfigDto,
  RedisCacheRuntimeStatsDto,
  CacheHealthCheckResultDto,
} from "../dto/cache-internal.dto";

// 类型别名
export type CacheStats = RedisCacheRuntimeStatsDto;

@Injectable()
export class CacheService {
  // 日志记录器
  private readonly logger = createLogger(CacheService.name);
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventBus: EventEmitter2, // 事件总线
    private readonly configService: ConfigService,
    // 统一配置注入
    @Inject("cacheUnified")
    private readonly CacheUnifiedConfig: ConfigType<typeof cacheUnifiedConfig>,
  ) {
    this.logger.debug("CacheService初始化开始", {
      context: "CacheService",
      operation: "constructor",
      timestamp: new Date().toISOString(),
    });

    if (!this.CacheUnifiedConfig) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'constructor',
        message: 'Cache unified configuration not found',
        context: { service: 'CacheService', configType: 'CacheUnifiedConfig' }
      });
    }

    this.logger.debug("CacheService初始化完成", {
      context: "CacheService",
      operation: "constructor",
      defaultTtl: this.CacheUnifiedConfig.defaultTtl,
      compressionThreshold: this.CacheUnifiedConfig.compressionThreshold,
      maxBatchSize: this.CacheUnifiedConfig.maxBatchSize,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取底层的 ioredis 客户端实例
   * 警告：仅在 CacheService 无法满足需求时使用，优先在 CacheService 中扩展方法
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 获取默认TTL
   */
  private getDefaultTtl(): number {
    return this.CacheUnifiedConfig.defaultTtl;
  }

  /**
   * 检测是否为Redis连接错误
   * 简化版错误检测，用于替代CacheExceptionFactory.fromError
   */
  private isConnectionError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("connection") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("redis")
    );
  }

  /**
   * 根据时效性获取TTL
   * 提供基于业务场景的TTL获取
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
        return this.CacheUnifiedConfig.strongTimelinessTtl;
      case "moderate":
        return this.CacheUnifiedConfig.realtimeTtl;
      case "weak":
        return this.CacheUnifiedConfig.defaultTtl;
      case "long":
        return this.CacheUnifiedConfig.longTermTtl;
      case "monitoring":
        return this.CacheUnifiedConfig.monitoringTtl;
      case "auth":
        return this.CacheUnifiedConfig.authTtl;
      case "transformer":
        return this.CacheUnifiedConfig.transformerTtl;
      case "suggestion":
        return this.CacheUnifiedConfig.suggestionTtl;
      default:
        return this.CacheUnifiedConfig.defaultTtl;
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
    // 键长度验证在DTO层面进行

    const startTime = Date.now();
    try {
      const serializedValue = this.serialize(value, options.serializer);
      const shouldCompress = this.shouldCompress(
        serializedValue,
        options.compressionThreshold ??
          this.CacheUnifiedConfig.compressionThreshold,
      );
      const compressedValue = shouldCompress
        ? await this.compress(serializedValue)
        : serializedValue;

      this.logger.debug("缓存设置操作详情", {
        context: "CacheService",
        operation: "set",
        key,
        ttl: options.ttl,
        compressed: shouldCompress,
        originalSize: serializedValue.length,
        finalSize: compressedValue.length,
        timestamp: new Date().toISOString(),
      });

      const result = await this.redis.setex(key, options.ttl, compressedValue);

      // 发送监控事件
      this.emitCacheEvent("set", key, startTime, {
        ttl: options.ttl,
        compressed: compressedValue !== serializedValue,
      });

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.CacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.SET,
          key,
          duration,
          threshold: this.CacheUnifiedConfig.slowOperationMs,
        });
      }

      return result === "OK";
    } catch (error) {
      // 使用统一异常处理
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: CACHE_CORE_OPERATIONS.SET,
          message: `缓存连接错误: ${CACHE_CORE_OPERATIONS.SET} (key: ${key})`,
          context: {
            key,
            operation: CACHE_CORE_OPERATIONS.SET,
            connectionError: true,
            originalError: error.message
          }
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: CACHE_CORE_OPERATIONS.SET,
        message: `缓存设置失败: ${CACHE_CORE_OPERATIONS.SET} (key: ${key})`,
        context: {
          key,
          operation: CACHE_CORE_OPERATIONS.SET,
          originalError: error.message
        }
      });
    }
  }

  /**
   * 智能缓存获取
   */
  async get<T>(key: string, deserializer?: SerializerType): Promise<T | null> {
    // 键长度验证在DTO层面进行

    const startTime = Date.now();
    try {
      const value = await this.redis.get(key);

      if (value === null) {
        // 发送监控事件 - 缓存未命中
        this.emitCacheEvent("get_miss", key, startTime);
        return null;
      }

      // 发送监控事件 - 缓存命中
      this.emitCacheEvent("get_hit", key, startTime, {
        compressed: this.isCompressed(value),
      });

      // 解压缩和反序列化
      const isCompressed = this.isCompressed(value);
      const decompressedValue = isCompressed
        ? await this.decompress(value)
        : value;

      this.logger.debug("缓存获取操作详情", {
        context: "CacheService",
        operation: "get",
        key,
        compressed: isCompressed,
        valueSize: value.length,
        timestamp: new Date().toISOString(),
      });

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.CacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.GET,
          key,
          duration,
          threshold: this.CacheUnifiedConfig.slowOperationMs,
        });
      }

      return this.deserialize(decompressedValue, deserializer);
    } catch (error) {
      // 发送监控事件 - 错误导致未命中
      this.emitCacheEvent("get_miss", key, startTime, { error: error.message });
      // 使用统一异常处理
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: CACHE_CORE_OPERATIONS.GET,
          message: `缓存连接错误: ${CACHE_CORE_OPERATIONS.GET} (key: ${key})`,
          context: {
            key,
            operation: CACHE_CORE_OPERATIONS.GET,
            connectionError: true,
            originalError: error.message
          }
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: CACHE_CORE_OPERATIONS.GET,
        message: `缓存获取失败: ${CACHE_CORE_OPERATIONS.GET} (key: ${key})`,
        context: {
          key,
          operation: CACHE_CORE_OPERATIONS.GET,
          originalError: error.message
        }
      });
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
    const lockTtl = this.CacheUnifiedConfig.lockTtl;

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
          this.CacheUnifiedConfig.retryDelayMs / 2 +
            Math.random() * (this.CacheUnifiedConfig.retryDelayMs / 2),
        );

        const retryResult = await this.get<T>(key, options.serializer);
        if (retryResult !== null) {
          return retryResult;
        }

        // 仍然没有缓存，直接执行回调（可能会有短暂的重复计算）
        this.logger.warn(CACHE_MESSAGES.WARNINGS.LOCK_TIMEOUT, {
          context: "CacheService",
          operation: "getOrSet",
          key,
          timestamp: new Date().toISOString(),
        });
        return await callback();
      }
    } catch (error) {
      // 使用统一异常处理
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'getOrSet',
          message: 'Cache connection failed during get or set operation',
          context: {
            key,
            operation: CACHE_CORE_OPERATIONS.GET_OR_SET,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'getOrSet',
        message: 'Cache get or set operation failed',
        context: {
          key,
          operation: CACHE_CORE_OPERATIONS.GET_OR_SET,
          originalError: (error as Error).message,
          errorType: CACHE_ERROR_CODES.OPERATION_TIMEOUT
        },
        retryable: true
      });
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
      // 使用统一异常处理
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'listPush',
          message: 'Cache connection failed during list push operation',
          context: {
            key,
            values: Array.isArray(values) ? values.length : 1,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'listPush',
        message: 'Cache list push operation failed',
        context: {
          key,
          values: Array.isArray(values) ? values.length : 1,
          originalError: (error as Error).message,
          errorType: CACHE_ERROR_CODES.OPERATION_TIMEOUT
        },
        retryable: true
      });
    }
  }

  async listTrim(key: string, start: number, stop: number): Promise<"OK"> {
    try {
      return await this.redis.ltrim(key, start, stop);
    } catch (error) {
      // 使用统一异常处理
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'listTrim',
          message: 'Cache connection failed during list trim operation',
          context: {
            key,
            start,
            stop,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'listTrim',
        message: 'Cache list trim operation failed',
        context: {
          key,
          start,
          stop,
          originalError: (error as Error).message,
          errorType: CACHE_ERROR_CODES.OPERATION_TIMEOUT
        },
        retryable: true
      });
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
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'setAdd',
          message: 'Cache connection failed during set add operation',
          context: {
            key,
            members: Array.isArray(members) ? members : [members],
            operation: 'setAdd',
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'setAdd',
        message: 'Set add operation failed',
        context: {
          key,
          members: Array.isArray(members) ? members : [members],
          operation: 'setAdd',
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
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
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'setRemove',
          message: 'Cache connection failed during set remove operation',
          context: {
            key,
            members: Array.isArray(members) ? members : [members],
            operation: 'setRemove',
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'setRemove',
        message: 'Set remove operation failed',
        context: {
          key,
          members: Array.isArray(members) ? members : [members],
          operation: 'setRemove',
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
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
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'hashIncrementBy',
          message: 'Cache connection failed during hash increment operation',
          context: {
            key,
            field,
            value,
            operation: 'hashIncrementBy',
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'hashIncrementBy',
        message: 'Hash increment operation failed',
        context: {
          key,
          field,
          value,
          operation: 'hashIncrementBy',
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
    }
  }

  async hashSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.redis.hset(key, field, value);
    } catch (error) {
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'hashSet',
          message: 'Cache connection failed during hash set operation',
          context: {
            key,
            field,
            value,
            operation: 'hashSet',
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'hashSet',
        message: 'Hash set operation failed',
        context: {
          key,
          field,
          value,
          operation: 'hashSet',
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
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
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'expire',
          message: 'Cache connection failed during expire operation',
          context: {
            key,
            seconds,
            operation: 'expire',
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'expire',
        message: 'Expire operation failed',
        context: {
          key,
          seconds,
          operation: 'expire',
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
    }
  }

  /**
   * 批量获取缓存
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (keys.length === 0) return result;

    // 检查批量大小
    const maxBatchSize = this.CacheUnifiedConfig.maxBatchSize;
    if (keys.length > maxBatchSize) {
      // 使用标准异常处理
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'mget',
        message: `Batch get operation exceeds limit: requested ${keys.length} keys, maximum allowed ${maxBatchSize}`,
        context: {
          requestedKeys: keys.length,
          maxAllowed: maxBatchSize,
          operation: 'mget',
          validationRule: 'maxBatchSize'
        }
      });
    }

    const startTime = Date.now();
    try {
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];

        if (value !== null) {
          // 发送监控事件 - mget 命中
          this.emitCacheEvent("get_hit", key, startTime, {
            compressed: this.isCompressed(value),
            batch: true,
          });
          const decompressedValue = this.isCompressed(value)
            ? await this.decompress(value)
            : value;
          result.set(key, this.deserialize(decompressedValue));
        } else {
          // 发送监控事件 - mget 未命中
          this.emitCacheEvent("get_miss", key, startTime, { batch: true });
        }
      }

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.CacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.MGET,
          batchSize: keys.length,
          duration,
          threshold: this.CacheUnifiedConfig.slowOperationMs,
        });
      }
    } catch (error) {
      // 发送监控事件 - mget 错误导致未命中
      keys.forEach((key) =>
        this.emitCacheEvent("get_miss", key, startTime, {
          error: error.message,
          batch: true,
        }),
      );
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'mget',
          message: 'Cache connection failed during batch get operation',
          context: {
            keys: keys.join(","),
            batchSize: keys.length,
            operation: CACHE_CORE_OPERATIONS.MGET,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'mget',
        message: 'Batch get operation failed',
        context: {
          keys: keys.join(","),
          batchSize: keys.length,
          operation: CACHE_CORE_OPERATIONS.MGET,
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED,
          errorMessage: error.message
        },
        retryable: false
      });
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
    const maxBatchSize = this.CacheUnifiedConfig.maxBatchSize;
    if (entries.size > maxBatchSize) {
      // 使用标准异常处理
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'mset',
        message: `Batch set operation exceeds limit: requested ${entries.size} entries, maximum allowed ${maxBatchSize}`,
        context: {
          requestedEntries: entries.size,
          maxAllowed: maxBatchSize,
          operation: 'mset',
          validationRule: 'maxBatchSize'
        }
      });
    }

    const startTime = Date.now();
    try {
      const pipeline = this.redis.pipeline();

      for (const [key, value] of entries) {
        const serializedValue = this.serialize(value);
        pipeline.setex(key, ttl, serializedValue);
        // 发送监控事件 - mset 操作
        this.emitCacheEvent("mset", key, startTime, { ttl, batch: true });
      }

      const results = await pipeline.exec();

      // 检查慢操作
      const duration = Date.now() - startTime;
      if (duration > this.CacheUnifiedConfig.slowOperationMs) {
        this.logger.warn(CACHE_MESSAGES.WARNINGS.SLOW_OPERATION, {
          operation: CACHE_CORE_OPERATIONS.MSET,
          batchSize: entries.size,
          duration,
          threshold: this.CacheUnifiedConfig.slowOperationMs,
        });
      }

      return results.every((result) => result[1] === "OK");
    } catch (error) {
      if (this.isConnectionError(error)) {
        const keyList = Array.from(entries.keys()).join(",");
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'mset',
          message: 'Cache connection failed during batch set operation',
          context: {
            keys: keyList,
            batchSize: entries.size,
            operation: CACHE_CORE_OPERATIONS.MSET,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'mset',
        message: 'Batch set operation failed',
        context: {
          keys: Array.from(entries.keys()).join(","),
          batchSize: entries.size,
          operation: CACHE_CORE_OPERATIONS.MSET,
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED,
          errorMessage: error.message
        },
        retryable: false
      });
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
      const cacheKey = Array.isArray(key) ? key.join(",") : key;
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'del',
          message: 'Cache connection failed during delete operation',
          context: {
            key: cacheKey,
            operation: CACHE_CORE_OPERATIONS.DELETE,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'del',
        message: 'Delete operation failed',
        context: {
          key: cacheKey,
          operation: CACHE_CORE_OPERATIONS.DELETE,
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
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
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'delByPattern',
          message: 'Cache connection failed during pattern delete operation',
          context: {
            pattern,
            operation: CACHE_EXTENDED_OPERATIONS.DELETE_BY_PATTERN,
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'delByPattern',
        message: 'Pattern delete operation failed',
        context: {
          pattern,
          operation: CACHE_EXTENDED_OPERATIONS.DELETE_BY_PATTERN,
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
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
      {
        context: "CacheService",
        operation: "warmup",
        itemCount: warmupData.size,
        timestamp: new Date().toISOString(),
      },
    );
    const startTime = Date.now();

    try {
      await this.mset(warmupData, options.ttl);
      const duration = Date.now() - startTime;
      this.logger.log(
        `${CACHE_MESSAGES.SUCCESS.WARMUP_COMPLETED}，耗时 ${duration}ms`,
        {
          context: "CacheService",
          operation: "warmup",
          itemCount: warmupData.size,
          duration,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      this.logger.error(
        CACHE_MESSAGES.ERRORS.WARMUP_FAILED,
        sanitizeLogData({
          context: "CacheService",
          operation: "warmup",
          itemCount: warmupData.size,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  // 私有辅助方法

  /**
   * 使用SCAN扫描匹配的键
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
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.DATA_SERIALIZATION_FAILED,
          operation: 'serialize',
          message: `Unsupported serialization type: ${serializerType}`,
          context: {
            serializerType,
            supportedTypes: ['json', 'msgpack'],
            operation: CACHE_INTERNAL_OPERATIONS.SERIALIZE
          }
        });
    }

    // 检查序列化后的大小
    const sizeInBytes = Buffer.byteLength(serialized, "utf8");
    const maxSizeBytes = this.CacheUnifiedConfig.maxValueSizeMB * 1024 * 1024;

    if (sizeInBytes > maxSizeBytes) {
      this.logger.warn(CACHE_MESSAGES.WARNINGS.LARGE_VALUE_WARNING, {
        context: "CacheService",
        operation: CACHE_INTERNAL_OPERATIONS.SERIALIZE,
        sizeInBytes,
        maxSizeBytes,
        sizeMB: Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100,
        recommendation:
          "Consider compressing large values or reducing data size",
        timestamp: new Date().toISOString(),
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
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.DATA_SERIALIZATION_FAILED,
          operation: 'deserialize',
          message: `Unsupported deserialization type: ${deserializerType}`,
          context: {
            deserializerType,
            supportedTypes: ['json', 'msgpack'],
            operation: CACHE_INTERNAL_OPERATIONS.DESERIALIZE
          }
        });
    }
  }

  private shouldCompress(
    value: string,
    threshold: number = this.CacheUnifiedConfig.compressionThreshold,
  ): boolean {
    if (!value) {
      return false;
    }
    return value.length > threshold;
  }

  private async compress(value: string): Promise<string> {
    try {
      const compressedBuffer = await gzip(value);
      // 添加压缩标识前缀
      return (
        CACHE_DATA_FORMATS.COMPRESSION_PREFIX +
        compressedBuffer.toString("base64")
      );
    } catch (error) {
      this.logger.warn(
        CACHE_MESSAGES.ERRORS.COMPRESSION_FAILED,
        sanitizeLogData({
          context: "CacheService",
          operation: "compress",
          error: error.message,
          impact: "fallback_to_uncompressed",
          timestamp: new Date().toISOString(),
        }),
      );
      // 压缩失败则返回原始值
      return value;
    }
  }

  private async decompress(value: string): Promise<string> {
    try {
      // 移除前缀并解压
      const compressedData = value.substring(
        CACHE_DATA_FORMATS.COMPRESSION_PREFIX.length,
      );
      const buffer = Buffer.from(compressedData, "base64");
      const decompressedBuffer = await gunzip(buffer);
      return decompressedBuffer.toString("utf8");
    } catch (error) {
      this.logger.warn(
        CACHE_MESSAGES.ERRORS.DECOMPRESSION_FAILED,
        sanitizeLogData({
          context: "CacheService",
          operation: "decompress",
          error: error.message,
          impact: "fallback_to_original_value",
          timestamp: new Date().toISOString(),
        }),
      );
      // 解压失败则返回原始值（可能未被压缩）
      return value;
    }
  }

  private isCompressed(value: string): boolean {
    // 通过前缀判断是否压缩
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
      this.logger.warn(
        CACHE_MESSAGES.ERRORS.LOCK_RELEASE_FAILED,
        sanitizeLogData({
          context: "CacheService",
          operation: CACHE_EXTENDED_OPERATIONS.RELEASE_LOCK,
          lockKey,
          error: error.message,
          impact: "possible_resource_leak",
          timestamp: new Date().toISOString(),
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
   * 发送缓存监控事件
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

  // 键长度验证已迁移至DTO层面，使用@IsValidCacheKey装饰器

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
      this.logger.warn(
        "缓存读取失败，优雅降级",
        sanitizeLogData({
          context: "CacheService",
          operation: "safeGet",
          key,
          error: error.message,
          impact: "fallback_to_null",
          timestamp: new Date().toISOString(),
        }),
      );
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
      this.logger.warn(
        "缓存写入失败，忽略错误",
        sanitizeLogData({
          context: "CacheService",
          operation: "safeSet",
          key,
          error: error.message,
          impact: "cache_miss_on_next_read",
          timestamp: new Date().toISOString(),
        }),
      );
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
      this.logger.warn(
        "缓存操作失败，直接调用工厂方法",
        sanitizeLogData({
          context: "CacheService",
          operation: "safeGetOrSet",
          key,
          error: error.message,
          impact: "fallback_to_factory",
          timestamp: new Date().toISOString(),
        }),
      );
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
      // 使用统一异常处理
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'eval',
          message: 'Cache connection failed during Lua script execution',
          context: {
            script: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
            numKeys,
            scriptId: args[0] || "lua_script",
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'eval',
        message: 'Lua script execution failed',
        context: {
          script: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
          numKeys,
          scriptId: args[0] || "lua_script",
          originalError: (error as Error).message,
          errorType: CACHE_ERROR_CODES.REDIS_SERVER_ERROR
        },
        retryable: false
      });
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
      this.logger.error(
        "获取有序集合大小失败",
        sanitizeLogData({
          context: "CacheService",
          operation: "zcard",
          key,
          error: error.message,
          impact: "returned_zero",
          timestamp: new Date().toISOString(),
        }),
      );
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
      this.logger.error(
        "获取有序集合范围失败",
        sanitizeLogData({
          context: "CacheService",
          operation: "zrange",
          key,
          start,
          stop,
          error: error.message,
          impact: "returned_empty_array",
          timestamp: new Date().toISOString(),
        }),
      );
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
      if (this.isConnectionError(error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: 'incr',
          message: 'Cache connection failed during increment operation',
          context: {
            key,
            operation: 'incr',
            errorType: CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED
          },
          retryable: true
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'incr',
        message: 'Increment operation failed',
        context: {
          key,
          operation: 'incr',
          errorType: CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED
        },
        retryable: false
      });
    }
  }
}
