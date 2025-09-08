/**
 * 数据接收配置相关常量
 * 包含基础配置、重试配置、缓存配置、健康检查配置等
 */

import { CORE_VALUES } from "@common/constants/foundation/core-values.constants";
import { RETRY_BUSINESS_SCENARIOS } from "@common/constants/semantic/retry-semantics.constants";

/**
 * 数据接收基础配置常量 - 避免重复定义
 */
const RECEIVER_BASE_CONFIG = Object.freeze({
  DEFAULT_TIMEOUT_MS: CORE_VALUES.TIMEOUT_MS.DEFAULT, // 默认超时时间 - 使用统一配置
  MAX_RETRY_ATTEMPTS: RETRY_BUSINESS_SCENARIOS.RECEIVER.maxAttempts, // 最大重试次数 - 使用统一配置  
  RETRY_DELAY_MS: RETRY_BUSINESS_SCENARIOS.RECEIVER.initialDelayMs, // 重试延迟 - 使用统一配置
} as const);

/**
 * 数据接收重试配置对象 - 统一重试策略
 */
export const RECEIVER_RETRY_CONFIG = Object.freeze({
  MAX_ATTEMPTS: RECEIVER_BASE_CONFIG.MAX_RETRY_ATTEMPTS,
  DELAY_MS: RECEIVER_BASE_CONFIG.RETRY_DELAY_MS,
  MAX_DELAY_MS: 10000, // 最大重试延迟
  TIMEOUT_MS: RECEIVER_BASE_CONFIG.DEFAULT_TIMEOUT_MS,
} as const);

/**
 * 数据接收配置常量
 */
export const RECEIVER_CONFIG = Object.freeze({
  ...RECEIVER_BASE_CONFIG,
  MAX_CONCURRENT_REQUESTS: 10, // 最大并发请求数
  REQUEST_ID_LENGTH: 36, // 请求ID长度（UUID）
  LOG_TRUNCATE_LENGTH: 1000, // 日志截断长度
  PERFORMANCE_SAMPLE_SIZE: 100, // 性能样本大小
} as const);

/**
 * 数据接收默认值常量
 */
export const RECEIVER_DEFAULTS = Object.freeze({
  TIMEOUT_MS: RECEIVER_BASE_CONFIG.DEFAULT_TIMEOUT_MS, // 引用基础配置避免重复
  RETRY_ATTEMPTS: RECEIVER_BASE_CONFIG.MAX_RETRY_ATTEMPTS, // 引用基础配置避免重复  
  LOG_LEVEL: "info", // 默认日志级别
  ENABLE_PERFORMANCE_MONITORING: true, // 默认启用性能监控
  ENABLE_METRICS_COLLECTION: true, // 默认启用指标收集
  ENABLE_SYMBOL_TRANSFORMATION: true, // 默认启用股票代码转换
  ENABLE_PROVIDER_FALLBACK: true, // 默认启用提供商回退
  MAX_LOG_SYMBOLS: 10, // 引用性能阈值常量
} as const);

/**
 * 数据接收缓存配置常量 - 参考smart-cache模式优化
 */
export const RECEIVER_CACHE_CONFIG = Object.freeze({
  // TTL配置（秒）
  TTL_SECONDS: {
    PROVIDER_SELECTION: 300, // 提供商选择缓存TTL（5分钟）
    MARKET_INFERENCE: 600,   // 市场推断缓存TTL（10分钟）
    VALIDATION_RESULT: 60,   // 验证结果缓存TTL（1分钟）
    QUICK_LOOKUP: 30,        // 快速查找缓存（30秒）
  },
  
  // 容量限制
  CAPACITY_LIMITS: {
    MAX_CACHE_ENTRIES: 1000,    // 最大缓存条目数
    MAX_MEMORY_MB: 50,          // 最大内存使用（MB）
    EVICTION_RATIO: 0.2,        // 清理比例（20%）
  },
  
  // 键前缀配置
  KEY_PREFIXES: {
    PROVIDER_SELECTION: "receiver:provider:",
    MARKET_INFERENCE: "receiver:market:",
    VALIDATION: "receiver:validation:",
    BASE: "receiver:",
  },
  
  // 性能阈值
  PERFORMANCE_THRESHOLDS: {
    HIT_RATE_TARGET: 0.85,      // 目标命中率85%
    MEMORY_PRESSURE_LIMIT: 0.80, // 内存压力阈值80%
  },
} as const);

/**
 * 数据接收健康检查配置常量
 */
export const RECEIVER_HEALTH_CONFIG = Object.freeze({
  CHECK_INTERVAL_MS: CORE_VALUES.MONITORING.HEALTH_CHECK_INTERVAL_MS, // 健康检查间隔 - 使用统一配置
  TIMEOUT_MS: CORE_VALUES.TIMEOUT_MS.QUICK, // 健康检查超时 - 使用统一配置
  MAX_FAILURES: 3, // 最大失败次数
  RECOVERY_THRESHOLD: 5, // 恢复阈值
  METRICS_WINDOW_SIZE: 100, // 指标窗口大小
} as const);