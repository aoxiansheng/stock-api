import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { BusinessException } from "@common/core/exceptions/business.exception";
import { CacheSetOptions } from "./types";

const DEFAULT_TTL_SECONDS = 300;
const JSON_BOMB_HARD_LIMIT_BYTES = 1024 * 1024; // 1MB 硬限制

@Injectable()
export class CacheService {
  private readonly logger = createLogger(CacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  // 基础 API

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.get(key);
      if (val === null) return null;
      return JSON.parse(val) as T;
    } catch (error) {
      if (this.isConnectionError(error as Error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: "get",
          message: `缓存连接失败: get (key: ${key})`,
          context: { key, originalError: (error as Error).message },
          retryable: true,
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: "get",
        message: `缓存获取失败: get (key: ${key})`,
        context: { key, originalError: (error as Error).message },
      });
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean> {
    const ttl = options?.ttl ?? DEFAULT_TTL_SECONDS;
    try {
      const payload = JSON.stringify(value ?? null);

      // 1MB 硬限制，防止 JSON 炸弹
      const size = Buffer.byteLength(payload, "utf8");
      if (size > JSON_BOMB_HARD_LIMIT_BYTES) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: "set",
          message: `缓存写入值超过上限: ${(size / (1024 * 1024)).toFixed(2)}MB > 1MB`,
          context: { key, sizeBytes: size, limitBytes: JSON_BOMB_HARD_LIMIT_BYTES },
        });
      }

      const result = await this.redis.setex(key, ttl, payload);
      return result === "OK";
    } catch (error) {
      if (this.isConnectionError(error as Error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: "set",
          message: `缓存连接失败: set (key: ${key})`,
          context: { key, originalError: (error as Error).message },
          retryable: true,
        });
      }
      // 透传上面的 DATA_VALIDATION_FAILED
      if (BusinessException.isBusinessException(error)) {
        throw error;
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: "set",
        message: `缓存写入失败: set (key: ${key})`,
        context: { key, originalError: (error as Error).message },
      });
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.redis.del(key);
    } catch (error) {
      if (this.isConnectionError(error as Error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: "del",
          message: `缓存连接失败: del (key: ${key})`,
          context: { key, originalError: (error as Error).message },
          retryable: true,
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: "del",
        message: `缓存删除失败: del (key: ${key})`,
        context: { key, originalError: (error as Error).message },
      });
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      if (this.isConnectionError(error as Error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: "incr",
          message: `缓存连接失败: incr (key: ${key})`,
          context: { key, originalError: (error as Error).message },
          retryable: true,
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: "incr",
        message: `缓存自增失败: incr (key: ${key})`,
        context: { key, originalError: (error as Error).message },
      });
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return (await this.redis.expire(key, seconds)) === 1;
    } catch (error) {
      if (this.isConnectionError(error as Error)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.CACHE,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: "expire",
          message: `缓存连接失败: expire (key: ${key})`,
          context: { key, seconds, originalError: (error as Error).message },
          retryable: true,
        });
      }
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.CACHE,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: "expire",
        message: `设置过期失败: expire (key: ${key})`,
        context: { key, seconds, originalError: (error as Error).message },
      });
    }
  }

  // 辅助
  private isConnectionError(error: Error): boolean {
    const msg = (error?.message || "").toLowerCase();
    return (
      msg.includes("connection") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("redis")
    );
  }
}
