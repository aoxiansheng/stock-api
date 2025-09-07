/**
 * 统一断路器常量配置
 * 集中管理所有模块的断路器配置，避免分散配置和重复定义
 * 
 * @description
 * - 提供不同业务场景的断路器预设配置
 * - 支持自定义配置扩展
 * - 确保配置一致性和可维护性
 */

/**
 * 断路器状态枚举
 */
export enum CircuitState {
  CLOSED = "CLOSED",        // 正常状态：允许请求通过
  OPEN = "OPEN",           // 熔断状态：拒绝所有请求
  HALF_OPEN = "HALF_OPEN", // 半开状态：允许部分请求测试服务恢复
}

/**
 * 断路器配置接口
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
 * 断路器常量配置
 */
export const CIRCUIT_BREAKER_CONSTANTS = {
  /**
   * 默认断路器配置
   * 适用于一般性服务调用
   */
  DEFAULT_CONFIG: {
    failureThreshold: 5,      // 5次失败后熔断
    successThreshold: 3,      // 3次成功后恢复
    timeout: 10000,           // 10秒操作超时
    resetTimeout: 60000,      // 60秒后尝试恢复
  } as CircuitBreakerConfig,

  /**
   * 业务场景预设配置
   */
  BUSINESS_SCENARIOS: {
    /**
     * 符号转换服务 - 快速失败，快速恢复
     */
    SYMBOL_TRANSFORMER: {
      failureThreshold: 3,    // 3次失败即熔断（快速保护）
      successThreshold: 2,    // 2次成功即恢复（快速恢复）
      timeout: 5000,          // 5秒超时
      resetTimeout: 30000,    // 30秒后重试
    } as CircuitBreakerConfig,

    /**
     * 数据获取服务 - 容忍更多失败，慢恢复
     */
    DATA_FETCHER: {
      failureThreshold: 8,    // 8次失败后熔断
      successThreshold: 5,    // 5次成功后恢复
      timeout: 15000,         // 15秒超时
      resetTimeout: 120000,   // 2分钟后重试
    } as CircuitBreakerConfig,

    /**
     * 缓存服务 - 宽松配置，避免频繁熔断
     */
    CACHE_SERVICE: {
      failureThreshold: 10,   // 10次失败后熔断
      successThreshold: 3,    // 3次成功后恢复
      timeout: 3000,          // 3秒超时
      resetTimeout: 30000,    // 30秒后重试
    } as CircuitBreakerConfig,

    /**
     * 外部API调用 - 严格保护
     */
    EXTERNAL_API: {
      failureThreshold: 3,    // 3次失败即熔断
      successThreshold: 5,    // 5次成功才恢复
      timeout: 30000,         // 30秒超时
      resetTimeout: 300000,   // 5分钟后重试
    } as CircuitBreakerConfig,

    /**
     * 数据库操作 - 保守配置
     */
    DATABASE: {
      failureThreshold: 5,    // 5次失败后熔断
      successThreshold: 3,    // 3次成功后恢复
      timeout: 20000,         // 20秒超时
      resetTimeout: 60000,    // 1分钟后重试
    } as CircuitBreakerConfig,

    /**
     * WebSocket连接 - 快速恢复
     */
    WEBSOCKET: {
      failureThreshold: 2,    // 2次失败即熔断
      successThreshold: 1,    // 1次成功即恢复
      timeout: 5000,          // 5秒超时
      resetTimeout: 10000,    // 10秒后重试
    } as CircuitBreakerConfig,
  },

  /**
   * 性能等级配置
   */
  PERFORMANCE_LEVELS: {
    /**
     * 高性能要求 - 快速失败，快速恢复
     */
    HIGH_PERFORMANCE: {
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 3000,
      resetTimeout: 15000,
    } as CircuitBreakerConfig,

    /**
     * 标准性能要求 - 平衡配置
     */
    STANDARD_PERFORMANCE: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 10000,
      resetTimeout: 60000,
    } as CircuitBreakerConfig,

    /**
     * 低性能要求 - 容错配置
     */
    LOW_PERFORMANCE: {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 30000,
      resetTimeout: 180000,
    } as CircuitBreakerConfig,
  },

  /**
   * 环境相关配置
   */
  ENVIRONMENT_CONFIGS: {
    /**
     * 开发环境 - 宽松配置，便于调试
     */
    DEVELOPMENT: {
      failureThreshold: 10,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 30000,
    } as CircuitBreakerConfig,

    /**
     * 测试环境 - 快速失败，便于测试
     */
    TEST: {
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 5000,
      resetTimeout: 10000,
    } as CircuitBreakerConfig,

    /**
     * 生产环境 - 严格保护，稳定恢复
     */
    PRODUCTION: {
      failureThreshold: 5,
      successThreshold: 5,
      timeout: 15000,
      resetTimeout: 120000,
    } as CircuitBreakerConfig,
  },

  /**
   * 断路器键名常量 - 简化版本
   * 复杂的键生成逻辑已移至专用工具类
   * @see CircuitBreakerKeyUtil - 位于 src/common/utils/circuit-breaker-key.util.ts
   */
  KEY_CONFIG: {
    /** 键名前缀 */
    PREFIX: 'circuit',
    /** 键名分隔符 */
    SEPARATOR: ':',
    /** 可用的键类型 */
    TYPES: {
      PROVIDER_API: 'provider',
      SERVICE_METHOD: 'service',
      DATABASE_OPERATION: 'db', 
      CACHE_OPERATION: 'cache',
      EXTERNAL_API: 'external',
    } as const,
  } as const,

  /**
   * 监控阈值配置
   */
  MONITORING_THRESHOLDS: {
    /** 熔断率告警阈值（超过此比例发出告警） */
    CIRCUIT_OPEN_RATE_ALERT: 0.1, // 10%
    /** 恢复时间过长告警阈值（毫秒） */
    RECOVERY_TIME_ALERT: 300000,   // 5分钟
    /** 失败率告警阈值 */
    FAILURE_RATE_ALERT: 0.5,       // 50%
  },
} as const;

/**
 * 类型定义
 */
export type BusinessScenario = keyof typeof CIRCUIT_BREAKER_CONSTANTS.BUSINESS_SCENARIOS;
export type PerformanceLevel = keyof typeof CIRCUIT_BREAKER_CONSTANTS.PERFORMANCE_LEVELS;
export type Environment = keyof typeof CIRCUIT_BREAKER_CONSTANTS.ENVIRONMENT_CONFIGS;

/**
 * 工具函数：根据环境获取配置
 * @param baseConfig 基础配置
 * @returns 环境调整后的配置
 */
export function getEnvironmentAdjustedConfig(
  baseConfig: CircuitBreakerConfig
): CircuitBreakerConfig {
  const env = (process.env.NODE_ENV || 'development') as keyof typeof CIRCUIT_BREAKER_CONSTANTS.ENVIRONMENT_CONFIGS;
  const envConfig = CIRCUIT_BREAKER_CONSTANTS.ENVIRONMENT_CONFIGS[env];
  
  if (!envConfig) {
    return baseConfig;
  }

  return {
    failureThreshold: Math.min(baseConfig.failureThreshold, envConfig.failureThreshold),
    successThreshold: Math.max(baseConfig.successThreshold, envConfig.successThreshold),
    timeout: Math.max(baseConfig.timeout, envConfig.timeout),
    resetTimeout: Math.max(baseConfig.resetTimeout, envConfig.resetTimeout),
  };
}

/**
 * 工具函数：验证断路器配置
 * @param config 断路器配置
 * @throws Error 配置无效时抛出错误
 */
export function validateCircuitBreakerConfig(config: CircuitBreakerConfig): void {
  if (config.failureThreshold <= 0) {
    throw new Error('failureThreshold 必须大于 0');
  }
  
  if (config.successThreshold <= 0) {
    throw new Error('successThreshold 必须大于 0');
  }
  
  if (config.timeout <= 0) {
    throw new Error('timeout 必须大于 0');
  }
  
  if (config.resetTimeout <= 0) {
    throw new Error('resetTimeout 必须大于 0');
  }
  
  if (config.successThreshold > config.failureThreshold) {
    console.warn('successThreshold 大于 failureThreshold，可能导致频繁状态切换');
  }
}

/**
 * 工具函数：创建断路器键
 * @param template 键模板函数
 * @param params 模板参数
 * @returns 断路器键
 */
export function createCircuitBreakerKey<T extends (...args: any[]) => string>(
  template: T,
  ...params: Parameters<T>
): string {
  return template(...params);
}