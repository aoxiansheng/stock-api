/**
 * 断路器领域常量
 * 🏢 Domain层 - 断路器相关的业务领域专用常量
 * ⚡ 基于Semantic层构建，专注于断路器业务逻辑
 */

import { HTTP_TIMEOUTS } from "../semantic";
import {
  RETRY_BUSINESS_SCENARIOS,
  RETRY_CONDITION_SEMANTICS,
} from "../semantic/retry-semantics.constants";
import { NUMERIC_CONSTANTS } from "../core";
import { CORE_VALUES } from "../foundation";

/**
 * 断路器状态枚举
 * 🎯 统一断路器状态管理
 */
export enum CircuitState {
  CLOSED = "CLOSED", // 正常状态：允许请求通过
  OPEN = "OPEN", // 熔断状态：拒绝所有请求
  HALF_OPEN = "HALF_OPEN", // 半开状态：允许部分请求测试服务恢复
}

/**
 * 断路器配置接口
 * 🎯 统一断路器配置结构
 */
export interface CircuitBreakerConfig {
  /** 失败阈值：连续失败多少次后触发熔断 */
  failureThreshold: number;
  /** 成功阈值：半开状态下连续成功多少次后恢复 */
  successThreshold: number;
  /** 操作超时时间（毫秒） */
  timeout: number;
  /** 熔断恢复等待时间（毫秒） */
  resetTimeout: number;
}

/**
 * 业务场景断路器配置
 * 🎯 从Unified层迁移的业务场景特定断路器策略
 */
export const CIRCUIT_BREAKER_BUSINESS_SCENARIOS = Object.freeze({
  /**
   * 符号转换服务 - 快速失败，快速恢复
   * 🎯 基于Semantic层重试配置优化
   */
  SYMBOL_TRANSFORMER: {
    failureThreshold: RETRY_BUSINESS_SCENARIOS.SYMBOL_MAPPER.maxAttempts, // 3次失败即熔断
    successThreshold: 2, // 2次成功即恢复
    timeout: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒超时
    resetTimeout: NUMERIC_CONSTANTS.N_30000, // 30秒后重试
  } as CircuitBreakerConfig,

  /**
   * 数据获取服务 - 容忍更多失败，慢恢复
   * 🎯 基于Foundation层时间常量
   */
  DATA_FETCHER: {
    failureThreshold: 8, // 8次失败后熔断
    successThreshold: RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.maxAttempts, // 5次成功后恢复
    timeout: HTTP_TIMEOUTS.REQUEST.SLOW_MS / 4, // 15秒超时
    resetTimeout: NUMERIC_CONSTANTS.N_120000, // 2分钟后重试
  } as CircuitBreakerConfig,

  /**
   * 缓存服务 - 宽松配置，避免频繁熔断
   * 🎯 基于Semantic层配置
   */
  CACHE_SERVICE: {
    failureThreshold: 10, // 10次失败后熔断
    successThreshold: RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts, // 3次成功后恢复
    timeout: HTTP_TIMEOUTS.REQUEST.FAST_MS / 2, // 3秒超时
    resetTimeout: NUMERIC_CONSTANTS.N_30000, // 30秒后重试
  } as CircuitBreakerConfig,

  /**
   * 外部API调用 - 严格保护
   * 🎯 基于外部API重试语义
   */
  EXTERNAL_API: {
    failureThreshold: RETRY_BUSINESS_SCENARIOS.EXTERNAL_API.maxAttempts, // 5次失败即熔断
    successThreshold: RETRY_BUSINESS_SCENARIOS.EXTERNAL_API.maxAttempts, // 5次成功才恢复
    timeout: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒超时
    resetTimeout: NUMERIC_CONSTANTS.N_300000, // 5分钟后重试
  } as CircuitBreakerConfig,

  /**
   * 数据库操作 - 保守配置
   * 🎯 基于数据库操作语义
   */
  DATABASE: {
    failureThreshold:
      RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts + 2, // 5次失败后熔断
    successThreshold: RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts, // 3次成功后恢复
    timeout: HTTP_TIMEOUTS.REQUEST.SLOW_MS / 3, // 20秒超时
    resetTimeout: NUMERIC_CONSTANTS.N_60000, // 1分钟后重试
  } as CircuitBreakerConfig,

  /**
   * WebSocket连接 - 快速恢复
   * 🎯 基于WebSocket重连语义
   */
  WEBSOCKET: {
    failureThreshold: 2, // 2次失败即熔断
    successThreshold: 1, // 1次成功即恢复
    timeout: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒超时
    resetTimeout: NUMERIC_CONSTANTS.N_10000, // 10秒后重试
  } as CircuitBreakerConfig,
});

/**
 * 性能等级断路器配置
 * 🎯 基于Foundation层性能分类
 */
export const CIRCUIT_BREAKER_PERFORMANCE_LEVELS = Object.freeze({
  /**
   * 高性能要求 - 快速失败，快速恢复
   */
  HIGH_PERFORMANCE: {
    failureThreshold: 2,
    successThreshold: 1,
    timeout: NUMERIC_CONSTANTS.N_3000, // 3秒
    resetTimeout: NUMERIC_CONSTANTS.N_15000, // 15秒
  } as CircuitBreakerConfig,

  /**
   * 标准性能要求 - 平衡配置
   */
  STANDARD_PERFORMANCE: {
    failureThreshold:
      RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts + 2, // 5
    successThreshold: RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts, // 3
    timeout: NUMERIC_CONSTANTS.N_1000, // 10秒
    resetTimeout: NUMERIC_CONSTANTS.N_60000, // 60秒
  } as CircuitBreakerConfig,

  /**
   * 低性能要求 - 容错配置
   */
  LOW_PERFORMANCE: {
    failureThreshold: 10,
    successThreshold: 5,
    timeout: NUMERIC_CONSTANTS.N_30000, // 30秒
    resetTimeout: NUMERIC_CONSTANTS.N_180000, // 3分钟
  } as CircuitBreakerConfig,
});

/**
 * 环境相关断路器配置
 * 🎯 基于部署环境调整断路器策略
 */
export const CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS = Object.freeze({
  /**
   * 开发环境 - 宽松配置，便于调试
   */
  DEVELOPMENT: {
    failureThreshold: 10,
    successThreshold: 2,
    timeout: NUMERIC_CONSTANTS.N_30000, // 30秒
    resetTimeout: NUMERIC_CONSTANTS.N_30000, // 30秒
  } as CircuitBreakerConfig,

  /**
   * 测试环境 - 快速失败，便于测试
   */
  TEST: {
    failureThreshold: 2,
    successThreshold: 1,
    timeout: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒
    resetTimeout: NUMERIC_CONSTANTS.N_10000, // 10秒
  } as CircuitBreakerConfig,

  /**
   * 生产环境 - 严格保护，稳定恢复
   */
  PRODUCTION: {
    failureThreshold:
      RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts + 2, // 5
    successThreshold:
      RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts + 2, // 5
    timeout: HTTP_TIMEOUTS.REQUEST.SLOW_MS / 4, // 15秒
    resetTimeout: NUMERIC_CONSTANTS.N_120000, // 2分钟
  } as CircuitBreakerConfig,
});

/**
 * 断路器键名配置
 * 🎯 统一断路器键名管理
 */
export const CIRCUIT_BREAKER_KEY_CONFIG = Object.freeze({
  /** 键名前缀 */
  PREFIX: "circuit",
  /** 键名分隔符 */
  SEPARATOR: ":",
  /** 可用的键类型 */
  TYPES: {
    CACHE_OPERATION: "cache",
  } as const,
} as const);

/**
 * 断路器监控阈值配置
 * 🎯 基于Foundation层性能阈值
 */
export const CIRCUIT_BREAKER_MONITORING_THRESHOLDS = Object.freeze({
  /** 熔断率告警阈值（超过此比例发出告警） */
  CIRCUIT_OPEN_RATE_ALERT: 0.1, // 10%
  /** 恢复时间过长告警阈值（毫秒） */
  RECOVERY_TIME_ALERT: NUMERIC_CONSTANTS.N_300000, // 5分钟
  /** 失败率告警阈值 */
  /** 性能下降告警阈值 */
});

/**
 * 默认断路器配置
 * 🎯 基于Semantic层的统一默认配置
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig =
  Object.freeze({
    failureThreshold:
      RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts + 2, // 5次失败后熔断
    successThreshold: RETRY_CONDITION_SEMANTICS.DEFAULT_SETTINGS.maxAttempts, // 3次成功后恢复
    timeout: HTTP_TIMEOUTS.REQUEST.NORMAL_MS / 3, // 10秒操作超时
    resetTimeout: NUMERIC_CONSTANTS.N_60000, // 60秒后尝试恢复
  });

/**
 * 断路器领域工具函数
 */
export class CircuitBreakerDomainUtil {
  /**
   * 根据环境获取调整后的配置
   */
  static getEnvironmentAdjustedConfig(
    baseConfig: CircuitBreakerConfig,
  ): CircuitBreakerConfig {
    const env = (process.env.NODE_ENV ||
      "development") as keyof typeof CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS;
    const envConfig = CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS[env];

    if (!envConfig) {
      return baseConfig;
    }

    return {
      failureThreshold: Math.min(
        baseConfig.failureThreshold,
        envConfig.failureThreshold,
      ),
      successThreshold: Math.max(
        baseConfig.successThreshold,
        envConfig.successThreshold,
      ),
      timeout: Math.max(baseConfig.timeout, envConfig.timeout),
      resetTimeout: Math.max(baseConfig.resetTimeout, envConfig.resetTimeout),
    };
  }

  /**
   * 验证断路器配置
   */
  static validateConfig(config: CircuitBreakerConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.failureThreshold <= 0) {
      errors.push("failureThreshold 必须大于 0");
    }

    if (config.successThreshold <= 0) {
      errors.push("successThreshold 必须大于 0");
    }

    if (config.timeout <= 0) {
      errors.push("timeout 必须大于 0");
    }

    if (config.resetTimeout <= 0) {
      errors.push("resetTimeout 必须大于 0");
    }

    if (config.successThreshold > config.failureThreshold) {
      errors.push(
        "successThreshold 大于 failureThreshold，可能导致频繁状态切换",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 创建断路器键
   */
  static createCircuitBreakerKey(type: string, identifier: string): string {
    return `${CIRCUIT_BREAKER_KEY_CONFIG.PREFIX}${CIRCUIT_BREAKER_KEY_CONFIG.SEPARATOR}${type}${CIRCUIT_BREAKER_KEY_CONFIG.SEPARATOR}${identifier}`;
  }

  /**
   * 根据业务场景获取推荐配置
   */
  static getRecommendedConfig(
    scenario: keyof typeof CIRCUIT_BREAKER_BUSINESS_SCENARIOS,
  ): CircuitBreakerConfig {
    return (
      CIRCUIT_BREAKER_BUSINESS_SCENARIOS[scenario] ||
      DEFAULT_CIRCUIT_BREAKER_CONFIG
    );
  }

  /**
   * 根据性能等级获取配置
   */
  static getPerformanceConfig(
    level: keyof typeof CIRCUIT_BREAKER_PERFORMANCE_LEVELS,
  ): CircuitBreakerConfig {
    return (
      CIRCUIT_BREAKER_PERFORMANCE_LEVELS[level] ||
      CIRCUIT_BREAKER_PERFORMANCE_LEVELS.STANDARD_PERFORMANCE
    );
  }

  /**
   * 判断是否需要告警
   */
  static shouldAlert(failureRate: number, recoveryTime: number): boolean {
    return (
      failureRate >
        CIRCUIT_BREAKER_MONITORING_THRESHOLDS.CIRCUIT_OPEN_RATE_ALERT ||
      recoveryTime > CIRCUIT_BREAKER_MONITORING_THRESHOLDS.RECOVERY_TIME_ALERT
    );
  }

  /**
   * 计算推荐的重置超时时间
   */
  static calculateResetTimeout(failureThreshold: number): number {
    // 基于失败阈值动态计算重置时间
    const baseTimeout = NUMERIC_CONSTANTS.N_60000;
    const multiplier = Math.ceil(failureThreshold / 3);
    return Math.min(baseTimeout * multiplier, NUMERIC_CONSTANTS.N_300000);
  }
}

/**
 * 类型定义
 */
export type BusinessScenario = keyof typeof CIRCUIT_BREAKER_BUSINESS_SCENARIOS;
export type PerformanceLevel = keyof typeof CIRCUIT_BREAKER_PERFORMANCE_LEVELS;
export type Environment = keyof typeof CIRCUIT_BREAKER_ENVIRONMENT_CONFIGS;
export type KeyType = keyof typeof CIRCUIT_BREAKER_KEY_CONFIG.TYPES;

