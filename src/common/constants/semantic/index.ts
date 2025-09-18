/**
 * Semantic层统一导出
 * 🎯 语义层 - 业务无关的语义分类
 * 🔧 基于Foundation层构建，解决语义混淆和命名不一致问题
 */

// 导出所有语义常量
export {
  HTTP_STATUS_CODES,
  HTTP_TIMEOUTS,
  HTTP_BATCH_SEMANTICS,
  HTTP_HEADERS,
  HTTP_METHODS,
  HTTP_METHOD_ARRAYS,
  HTTP_CONTENT_TYPES,
  HTTP_SUCCESS_MESSAGES,
} from "./http-semantics.constants";

export {
  CACHE_KEY_SEMANTICS,
  CACHE_STRATEGY_SEMANTICS,
  CACHE_SIZE_SEMANTICS,
  CACHE_PERFORMANCE_SEMANTICS,
  CACHE_OPERATIONS,
} from "./cache-semantics.constants";

export {
  RETRY_DELAY_SEMANTICS,
  RETRY_COUNT_SEMANTICS,
  RETRY_STRATEGY_SEMANTICS,
  RETRYABLE_ERROR_SEMANTICS,
  RETRY_CONFIG_TEMPLATES,
} from "./retry-semantics.constants";

export {
  BATCH_SIZE_SEMANTICS,
  CONCURRENCY_SEMANTICS,
  BATCH_TIMEOUT_SEMANTICS,
  BATCH_STRATEGY_SEMANTICS,
  BATCH_CONFIG_TEMPLATES,
} from "./batch-semantics.constants";

export {
  HTTP_STATUS_SEMANTICS,
  STATUS_CODE_SEMANTICS,
} from "./status-codes-semantics.constants";

export {
  MESSAGE_SEMANTICS,
  MESSAGE_TEMPLATE_SEMANTICS,
  MESSAGE_FORMAT_SEMANTICS,
} from "./message-semantics.constants";

export {
  ERROR_MESSAGES,
  AUTH_ERROR_MESSAGES,
  HTTP_ERROR_MESSAGES,
  DB_ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  VALIDATION_TRANSLATIONS,
  SYSTEM_ERROR_MESSAGES,
  BUSINESS_ERROR_MESSAGES,
} from "./error-messages.constants";

// 导出类型定义
// 导入用于对象定义的常量

// 导入用于对象定义
import {
  HTTP_STATUS_CODES,
  HTTP_TIMEOUTS,
  HTTP_BATCH_SEMANTICS,
  HTTP_HEADERS,
  HTTP_METHODS,
  HTTP_CONTENT_TYPES,
  HTTP_SUCCESS_MESSAGES,
} from "./http-semantics.constants";

import {
  CACHE_KEY_SEMANTICS,
  CACHE_STRATEGY_SEMANTICS,
  CACHE_SIZE_SEMANTICS,
  CACHE_PERFORMANCE_SEMANTICS,
  CACHE_OPERATIONS,
} from "./cache-semantics.constants";

import {
  RETRY_DELAY_SEMANTICS,
  RETRY_COUNT_SEMANTICS,
  RETRY_STRATEGY_SEMANTICS,
  RETRYABLE_ERROR_SEMANTICS,
  RETRY_CONFIG_TEMPLATES,
} from "./retry-semantics.constants";

import {
  BATCH_SIZE_SEMANTICS,
  CONCURRENCY_SEMANTICS,
  BATCH_TIMEOUT_SEMANTICS,
  BATCH_STRATEGY_SEMANTICS,
  BATCH_CONFIG_TEMPLATES,
} from "./batch-semantics.constants";

import {
  ERROR_MESSAGES,
  AUTH_ERROR_MESSAGES,
  HTTP_ERROR_MESSAGES,
  DB_ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  VALIDATION_TRANSLATIONS,
  SYSTEM_ERROR_MESSAGES,
  BUSINESS_ERROR_MESSAGES,
} from "./error-messages.constants";

// Semantic层统一常量对象
export const SEMANTIC_CONSTANTS = Object.freeze({
  // HTTP语义
  HTTP: {
    STATUS_CODES: HTTP_STATUS_CODES,
    TIMEOUTS: HTTP_TIMEOUTS,
    BATCH: HTTP_BATCH_SEMANTICS,
    METHODS: HTTP_METHODS,
    SUCCESS_MESSAGES: HTTP_SUCCESS_MESSAGES,
  },

  // 缓存语义
  CACHE: {
    KEYS: CACHE_KEY_SEMANTICS,
    SIZES: CACHE_SIZE_SEMANTICS,
    PERFORMANCE: CACHE_PERFORMANCE_SEMANTICS,
    OPERATIONS: CACHE_OPERATIONS,
  },

  // 重试语义
  RETRY: {
    DELAYS: RETRY_DELAY_SEMANTICS,
    COUNTS: RETRY_COUNT_SEMANTICS,
    TEMPLATES: RETRY_CONFIG_TEMPLATES,
  },

  // 批量处理语义
  BATCH: {
    SIZES: BATCH_SIZE_SEMANTICS,
    CONCURRENCY: CONCURRENCY_SEMANTICS,
    TIMEOUTS: BATCH_TIMEOUT_SEMANTICS,
    TEMPLATES: BATCH_CONFIG_TEMPLATES,
  },

  // 错误消息语义
  ERROR_MESSAGES,
  AUTH_ERROR_MESSAGES,
  HTTP_ERROR_MESSAGES,
  DB_ERROR_MESSAGES,
  VALIDATION_MESSAGES,
  VALIDATION_TRANSLATIONS,
  SYSTEM_ERROR_MESSAGES,
  BUSINESS_ERROR_MESSAGES,
} as const);

/**
 * Semantic层工具函数集合
 */
export class SemanticUtils {
  /**
   * 获取所有语义层常量
   */
  static getAllConstants() {
    return SEMANTIC_CONSTANTS;
  }

  /**
   * 验证配置完整性
   */
  static validateSemanticConfig(config: any): boolean {
    // 基础验证逻辑
    return !!(config && typeof config === "object");
  }

  /**
   * 获取语义层统计信息
   */
  static getSemanticStats() {
    return {
      httpStatusCodes: Object.keys(HTTP_STATUS_CODES).length,
      cacheStrategies: Object.keys(CACHE_STRATEGY_SEMANTICS.STRATEGIES).length,
      retryTemplates: Object.keys(RETRY_CONFIG_TEMPLATES).length,
      batchTemplates: Object.keys(BATCH_CONFIG_TEMPLATES).length,
      totalSemanticGroups: 4,
    };
  }

  /**
   * 根据场景推荐配置
   */
  static getRecommendedConfigForScenario(scenario: string) {
    const recommendations: Record<string, any> = {
      "high-performance": {
        http: HTTP_TIMEOUTS.REQUEST.FAST_MS,
        retry: RETRY_CONFIG_TEMPLATES.CRITICAL_OPERATION,
        batch: BATCH_CONFIG_TEMPLATES.HIGH_PERFORMANCE,
      },
      "high-reliability": {
        http: HTTP_TIMEOUTS.REQUEST.SLOW_MS,
        retry: RETRY_CONFIG_TEMPLATES.NETWORK_OPERATION,
        batch: BATCH_CONFIG_TEMPLATES.HIGH_RELIABILITY,
      },
      "resource-efficient": {
        http: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,
        retry: RETRY_CONFIG_TEMPLATES.DATABASE_OPERATION,
        batch: BATCH_CONFIG_TEMPLATES.RESOURCE_EFFICIENT,
      },
    };

    return recommendations[scenario] || recommendations["high-reliability"];
  }
}
