import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import type { Request } from "express";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { MONITORING_ERROR_CODES } from '../constants/monitoring-error-codes.constants';

/**
 * 监控组件缓存键管理工具类
 * 替代 MonitoringCacheService.buildKey() 功能
 * 提供统一的键前缀和命名规范
 * 🆕 集成通用工具增强键名生成和验证
 */
export class MonitoringCacheKeys {
  private static readonly NAMESPACE = "monitoring";

  /**
   * 构建健康数据缓存键
   * @param key 业务键名
   * @param req 可选的请求对象，用于生成客户端相关键名
   * @returns 完整的缓存键 monitoring:health:key 或 monitoring:health:key:clientId
   */
  static health(key: string, req?: Request): string {
    // 基础键名验证
    const validatedKey = this.validateKey(key);

    if (!req) {
      return `${this.NAMESPACE}:health:${validatedKey}`;
    }

    // 使用HttpHeadersUtil生成安全的客户端标识符
    try {
      const clientId = HttpHeadersUtil.getSecureClientIdentifier(req);
      const sanitizedClientId = this.sanitizeClientId(clientId);
      return `${this.NAMESPACE}:health:${validatedKey}:${sanitizedClientId}`;
    } catch (error) {
      // 如果无法获取客户端标识符，回退到基础键名
      return `${this.NAMESPACE}:health:${validatedKey}`;
    }
  }

  /**
   * 构建趋势数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:trend:key
   */
  static trend(key: string): string {
    const validatedKey = this.validateKey(key);
    return `${this.NAMESPACE}:trend:${validatedKey}`;
  }

  /**
   * 构建性能数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:performance:key
   */
  static performance(key: string): string {
    const validatedKey = this.validateKey(key);
    return `${this.NAMESPACE}:performance:${validatedKey}`;
  }

  /**
   * 构建告警数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:alert:key
   */
  static alert(key: string): string {
    const validatedKey = this.validateKey(key);
    return `${this.NAMESPACE}:alert:${validatedKey}`;
  }

  /**
   * 构建缓存统计数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:cache_stats:key
   */
  static cacheStats(key: string): string {
    const validatedKey = this.validateKey(key);
    return `${this.NAMESPACE}:cache_stats:${validatedKey}`;
  }

  /**
   * 验证缓存键名格式
   * @param key 键名
   * @returns 验证并清理后的键名
   * @throws Error 如果键名无效
   */
  static validateKey(key: string): string {
    if (!key || typeof key !== "string") {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.MONITORING,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateKey',
        message: 'Cache key name cannot be empty and must be a string',
        context: {
          key,
          keyType: typeof key,
          errorType: MONITORING_ERROR_CODES.INVALID_CACHE_KEY_NAME
        }
      });
    }

    const trimmedKey = key.trim();
    if (trimmedKey.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.MONITORING,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateKey',
        message: 'Cache key name cannot be empty string',
        context: {
          originalKey: key,
          trimmedKey,
          errorType: MONITORING_ERROR_CODES.EMPTY_CACHE_KEY_NAME
        }
      });
    }

    // 检查非法字符：冒号、空格、换行符等
    if (/[:\s\n\r\t]/.test(trimmedKey)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.MONITORING,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateKey',
        message: 'Cache key name cannot contain colons, spaces, or newline characters',
        context: {
          key: trimmedKey,
          invalidChars: trimmedKey.match(/[:\s\n\r\t]/g),
          errorType: MONITORING_ERROR_CODES.INVALID_CACHE_KEY_CHARS
        }
      });
    }

    // 检查长度限制
    if (trimmedKey.length > 200) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.MONITORING,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateKey',
        message: 'Cache key name length cannot exceed 200 characters',
        context: {
          key: trimmedKey,
          currentLength: trimmedKey.length,
          maxLength: 200,
          errorType: MONITORING_ERROR_CODES.CACHE_KEY_NAME_TOO_LONG
        }
      });
    }

    return trimmedKey;
  }

  /**
   * 清理客户端标识符，确保缓存键安全
   * @param clientId 客户端标识符
   * @returns 清理后的客户端标识符
   */
  private static sanitizeClientId(clientId: string): string {
    // 移除不安全字符，保留字母数字和连字符
    return clientId.replace(/[^a-zA-Z0-9:-]/g, "").substring(0, 32);
  }

  /**
   * 批量生成缓存键
   * @param type 缓存类型 (health, trend, performance, alert, cacheStats)
   * @param keys 键名数组
   * @param req 可选的请求对象
   * @returns 生成的缓存键数组
   */
  static batch(
    type: "health" | "trend" | "performance" | "alert" | "cacheStats",
    keys: string[],
    req?: Request,
  ): string[] {
    if (!Array.isArray(keys)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.MONITORING,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'batch',
        message: 'Keys must be an array',
        context: {
          keys,
          keysType: typeof keys,
          errorType: MONITORING_ERROR_CODES.INVALID_KEY_ARRAY
        }
      });
    }

    return keys.map((key) => {
      switch (type) {
        case "health":
          return this.health(key, req);
        case "trend":
          return this.trend(key);
        case "performance":
          return this.performance(key);
        case "alert":
          return this.alert(key);
        case "cacheStats":
          return this.cacheStats(key);
        default:
          throw UniversalExceptionFactory.createBusinessException({
            component: ComponentIdentifier.MONITORING,
            errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
            operation: 'batch',
            message: `Unsupported cache type: ${type}`,
            context: {
              type,
              supportedTypes: ['health', 'trend', 'performance', 'alert', 'cacheStats'],
              errorType: MONITORING_ERROR_CODES.UNSUPPORTED_CACHE_TYPE
            }
          });
      }
    });
  }

  /**
   * 生成带时间戳的唯一键名
   * @param baseKey 基础键名
   * @param ttlMs 可选的TTL毫秒数，用于生成时间相关的键
   * @returns 带时间戳的键名
   */
  static withTimestamp(baseKey: string, ttlMs?: number): string {
    const validatedKey = this.validateKey(baseKey);
    const timestamp = Date.now();

    if (ttlMs && ttlMs > 0) {
      // 基于TTL生成时间窗口键（便于批量过期）
      const window = Math.floor(timestamp / ttlMs);
      return `${validatedKey}:w${window}`;
    }

    return `${validatedKey}:${timestamp}`;
  }

  /**
   * 生成聚合数据的缓存键
   * @param type 缓存类型
   * @param aggregationType 聚合类型 (sum, avg, max, min, count)
   * @param timeWindow 时间窗口 (1h, 24h, 7d)
   * @param identifier 标识符
   * @returns 聚合缓存键
   */
  static aggregate(
    type: "health" | "trend" | "performance" | "alert" | "cacheStats",
    aggregationType: "sum" | "avg" | "max" | "min" | "count",
    timeWindow: string,
    identifier: string,
  ): string {
    const validatedId = this.validateKey(identifier);
    const validatedWindow = this.validateKey(timeWindow);
    const validatedAggType = this.validateKey(aggregationType);

    return `${this.NAMESPACE}:${type}:agg:${validatedAggType}:${validatedWindow}:${validatedId}`;
  }
}
