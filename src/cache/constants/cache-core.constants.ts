/**
 * Cache核心常量定义
 * 🎯 符合四层配置体系标准 - Layer 4: Semantic Constants Layer
 * ✅ 固定业务标准和技术规范，不可配置的核心常量
 *
 * 四层架构说明：
 * - Layer 1: Environment Variables Layer (环境变量层)
 * - Layer 2: Unified Configuration Layer (统一配置层)
 * - Layer 3: Compatibility Wrapper Layer (兼容包装层)
 * - Layer 4: Semantic Constants Layer (语义常量层) ← 本文件
 *
 * 📋 合规性要求：
 * - ✅ 只包含固定业务标准，不受环境变量影响
 * - ✅ 提供语义化标识符和业务规则常量
 * - ✅ 保持向后兼容性和类型安全
 * - ✅ 避免与配置层重叠
 *
 * @version 3.0.0
 * @created 2025-01-16
 * @author Cache Team
 */

// ============================================================================
// Core Cache Identifiers - 核心缓存标识符
// ============================================================================

/**
 * 缓存类型语义标识
 * 🎯 固定业务分类，用于系统内部识别不同用途的缓存
 */
export const CACHE_TYPE_SEMANTICS = Object.freeze({
  // 数据缓存类型
  DATA: Object.freeze({
    STOCK_QUOTE: "stock_quote", // 股票报价数据
    STOCK_INFO: "stock_info", // 股票基础信息
    MARKET_DATA: "market_data", // 市场数据
    INDEX_DATA: "index_data", // 指数数据
    REAL_TIME: "real_time", // 实时数据流
    HISTORICAL: "historical", // 历史数据
  }),

  // 系统缓存类型
  SYSTEM: Object.freeze({
    AUTH: "auth", // 认证缓存
    PERMISSION: "permission", // 权限缓存
    SESSION: "session", // 会话缓存
    CONFIG: "config", // 配置缓存
    MAPPING: "mapping", // 映射缓存
    RULE: "rule", // 规则缓存
  }),

  // 功能缓存类型
  FUNCTIONAL: Object.freeze({
    MONITORING: "monitoring", // 监控缓存
    METRICS: "metrics", // 指标缓存
    ALERT: "alert", // 告警缓存
    NOTIFICATION: "notification", // 通知缓存
    ANALYTICS: "analytics", // 分析缓存
    REPORT: "report", // 报告缓存
  }),

  // 操作缓存类型
  OPERATIONAL: Object.freeze({
    LOCK: "lock", // 分布式锁
    QUEUE: "queue", // 队列缓存
    BATCH: "batch", // 批处理缓存
    TEMP: "temp", // 临时缓存
    BACKUP: "backup", // 备份缓存
    SYNC: "sync", // 同步缓存
  },
} as const);

/**
 * 缓存键前缀语义标准
 * 🎯 统一的键命名规范，确保系统一致性
 */
export const CACHE_KEY_PREFIX_SEMANTICS = Object.freeze({
  // 核心业务前缀
  RECEIVER: "receiver", // 接收器组件缓存
  QUERY: "query", // 查询组件缓存
  STREAM: "stream", // 流数据缓存
  TRANSFORMER: "transformer", // 转换器缓存
  MAPPER: "mapper", // 映射器缓存
  STORAGE: "storage", // 存储层缓存

  // 系统组件前缀
  AUTH: "auth", // 认证系统缓存
  MONITORING: "monitoring", // 监控系统缓存
  METRICS: "metrics", // 指标系统缓存
  ALERT: "alert", // 告警系统缓存
  SECURITY: "security", // 安全系统缓存

  // 通用功能前缀
  SMART_CACHE: "smart_cache", // 智能缓存
  SYMBOL_CACHE: "symbol_cache", // 符号缓存
  DATA_CACHE: "data_cache", // 数据缓存
  CONFIG_CACHE: "config_cache", // 配置缓存

  // 临时和操作前缀
  TEMP: "temp", // 临时数据
  LOCK: "lock", // 分布式锁
  BATCH: "batch", // 批处理
  PENDING: "pending", // 待处理数据
} as const);

// ============================================================================
// Cache Operation Standards - 缓存操作标准
// ============================================================================

/**
 * 缓存操作语义标准
 * 🎯 定义标准的缓存操作类型和行为
 */
export const CACHE_OPERATION_SEMANTICS = Object.freeze({
  // 基础操作
  BASIC: {
    GET: "get", // 获取操作
    SET: "set", // 设置操作
    DELETE: "delete", // 删除操作
    EXISTS: "exists", // 存在检查
    EXPIRE: "expire", // 设置过期
    TTL: "ttl", // 获取TTL
  },

  // 批量操作
  BATCH: {
    MGET: "mget", // 批量获取
    MSET: "mset", // 批量设置
    MDEL: "mdel", // 批量删除
    PIPELINE: "pipeline", // 管道操作
    TRANSACTION: "transaction", // 事务操作
  },

  // 高级操作
  ADVANCED: {
    SCAN: "scan", // 扫描操作
    PATTERN: "pattern", // 模式匹配
    ATOMIC: "atomic", // 原子操作
    CONDITION: "condition", // 条件操作
    LOCK: "lock", // 锁操作
    UNLOCK: "unlock", // 解锁操作
  },

  // 监控操作
  MONITORING: {
    STATS: "stats", // 统计信息
    HEALTH: "health", // 健康检查
    PERFORMANCE: "performance", // 性能监控
    USAGE: "usage", // 使用情况
    MEMORY: "memory", // 内存使用
    CONNECTION: "connection", // 连接状态
  },
} as const);

// ============================================================================
// Cache Status Standards - 缓存状态标准
// ============================================================================

/**
 * 缓存状态语义标准
 * 🎯 统一的状态定义，用于监控和诊断
 */
export const CACHE_STATUS_SEMANTICS = Object.freeze({
  // 基础状态
  BASIC: {
    ACTIVE: "active", // 活跃状态
    INACTIVE: "inactive", // 非活跃状态
    CONNECTING: "connecting", // 连接中
    CONNECTED: "connected", // 已连接
    DISCONNECTED: "disconnected", // 已断开
    RECONNECTING: "reconnecting", // 重连中
  },

  // 健康状态
  HEALTH: {
    HEALTHY: "healthy", // 健康
    DEGRADED: "degraded", // 降级
    UNHEALTHY: "unhealthy", // 不健康
    CRITICAL: "critical", // 严重
    MAINTENANCE: "maintenance", // 维护中
    UNKNOWN: "unknown", // 未知状态
  },

  // 性能状态
  PERFORMANCE: {
    OPTIMAL: "optimal", // 最优
    GOOD: "good", // 良好
    FAIR: "fair", // 一般
    POOR: "poor", // 较差
    OVERLOADED: "overloaded", // 过载
    TIMEOUT: "timeout", // 超时
  },

  // 操作状态
  OPERATION: {
    PENDING: "pending", // 等待中
    PROCESSING: "processing", // 处理中
    COMPLETED: "completed", // 已完成
    FAILED: "failed", // 已失败
    CANCELLED: "cancelled", // 已取消
    RETRYING: "retrying", // 重试中
  },
} as const);

// ============================================================================
// Cache Quality Standards - 缓存质量标准
// ============================================================================

/**
 * 缓存质量标准
 * 🎯 固定的质量指标阈值和评估标准
 */
export const CACHE_QUALITY_STANDARDS = Object.freeze({
  // 命中率标准
  HIT_RATE: {
    EXCELLENT: 0.95, // 优秀: 95%+
    GOOD: 0.85, // 良好: 85%+
    ACCEPTABLE: 0.7, // 可接受: 70%+
    POOR: 0.5, // 较差: 50%+
    CRITICAL: 0.3, // 严重: 30%以下
  },

  // 响应时间标准 (毫秒)
  RESPONSE_TIME: {
    EXCELLENT: 10, // 优秀: 10ms以下
    GOOD: 50, // 良好: 50ms以下
    ACCEPTABLE: 100, // 可接受: 100ms以下
    POOR: 500, // 较差: 500ms以下
    CRITICAL: 1000, // 严重: 1000ms以上
  },

  // 错误率标准
  ERROR_RATE: {
    EXCELLENT: 0.001, // 优秀: 0.1%以下
    GOOD: 0.01, // 良好: 1%以下
    ACCEPTABLE: 0.05, // 可接受: 5%以下
    POOR: 0.1, // 较差: 10%以下
    CRITICAL: 0.2, // 严重: 20%以上
  },

  // 内存使用率标准
  MEMORY_USAGE: {
    EXCELLENT: 0.6, // 优秀: 60%以下
    GOOD: 0.75, // 良好: 75%以下
    ACCEPTABLE: 0.85, // 可接受: 85%以下
    POOR: 0.95, // 较差: 95%以下
    CRITICAL: 0.98, // 严重: 98%以上
  },
} as const);

// ============================================================================
// Cache Business Rules - 缓存业务规则
// ============================================================================

/**
 * 缓存业务规则常量
 * 🎯 固定的业务逻辑规则和约束
 */
export const CACHE_BUSINESS_RULES = Object.freeze({
  // 数据一致性规则
  CONSISTENCY: {
    STRONG_CONSISTENCY_TYPES: [
      CACHE_TYPE_SEMANTICS.DATA.STOCK_QUOTE,
      CACHE_TYPE_SEMANTICS.DATA.REAL_TIME,
      CACHE_TYPE_SEMANTICS.SYSTEM.AUTH,
    ],

    EVENTUAL_CONSISTENCY_TYPES: [
      CACHE_TYPE_SEMANTICS.DATA.HISTORICAL,
      CACHE_TYPE_SEMANTICS.SYSTEM.CONFIG,
      CACHE_TYPE_SEMANTICS.FUNCTIONAL.ANALYTICS,
    ],

    WEAK_CONSISTENCY_TYPES: [
      CACHE_TYPE_SEMANTICS.FUNCTIONAL.MONITORING,
      CACHE_TYPE_SEMANTICS.FUNCTIONAL.METRICS,
      CACHE_TYPE_SEMANTICS.OPERATIONAL.TEMP,
    ],
  },

  // 过期策略规则
  EXPIRATION: {
    IMMEDIATE_EXPIRE: [
      CACHE_TYPE_SEMANTICS.OPERATIONAL.LOCK,
      CACHE_TYPE_SEMANTICS.OPERATIONAL.TEMP,
    ],

    SHORT_TTL: [
      CACHE_TYPE_SEMANTICS.DATA.STOCK_QUOTE,
      CACHE_TYPE_SEMANTICS.DATA.REAL_TIME,
    ],

    MEDIUM_TTL: [
      CACHE_TYPE_SEMANTICS.SYSTEM.AUTH,
      CACHE_TYPE_SEMANTICS.SYSTEM.SESSION,
    ],

    LONG_TTL: [
      CACHE_TYPE_SEMANTICS.DATA.STOCK_INFO,
      CACHE_TYPE_SEMANTICS.SYSTEM.CONFIG,
    ],
  },

  // 优先级规则
  PRIORITY: {
    CRITICAL: [
      CACHE_TYPE_SEMANTICS.DATA.STOCK_QUOTE,
      CACHE_TYPE_SEMANTICS.SYSTEM.AUTH,
      CACHE_TYPE_SEMANTICS.OPERATIONAL.LOCK,
    ],

    HIGH: [
      CACHE_TYPE_SEMANTICS.DATA.REAL_TIME,
      CACHE_TYPE_SEMANTICS.SYSTEM.SESSION,
      CACHE_TYPE_SEMANTICS.FUNCTIONAL.ALERT,
    ],

    MEDIUM: [
      CACHE_TYPE_SEMANTICS.DATA.MARKET_DATA,
      CACHE_TYPE_SEMANTICS.SYSTEM.PERMISSION,
      CACHE_TYPE_SEMANTICS.FUNCTIONAL.MONITORING,
    ],

    LOW: [
      CACHE_TYPE_SEMANTICS.DATA.HISTORICAL,
      CACHE_TYPE_SEMANTICS.FUNCTIONAL.ANALYTICS,
      CACHE_TYPE_SEMANTICS.OPERATIONAL.TEMP,
    ],
  },
} as const);

// ============================================================================
// Type Definitions - 类型定义
// ============================================================================

/**
 * 缓存类型语义类型定义
 */
export type CacheTypeSemantics = typeof CACHE_TYPE_SEMANTICS;
export type CacheDataType =
  (typeof CACHE_TYPE_SEMANTICS.DATA)[keyof typeof CACHE_TYPE_SEMANTICS.DATA];
export type CacheSystemType =
  (typeof CACHE_TYPE_SEMANTICS.SYSTEM)[keyof typeof CACHE_TYPE_SEMANTICS.SYSTEM];
export type CacheFunctionalType =
  (typeof CACHE_TYPE_SEMANTICS.FUNCTIONAL)[keyof typeof CACHE_TYPE_SEMANTICS.FUNCTIONAL];
export type CacheOperationalType =
  (typeof CACHE_TYPE_SEMANTICS.OPERATIONAL)[keyof typeof CACHE_TYPE_SEMANTICS.OPERATIONAL];

/**
 * 缓存键前缀类型定义
 */
export type CacheKeyPrefix =
  (typeof CACHE_KEY_PREFIX_SEMANTICS)[keyof typeof CACHE_KEY_PREFIX_SEMANTICS];

/**
 * 缓存操作类型定义
 */
export type CacheOperationBasic =
  (typeof CACHE_OPERATION_SEMANTICS.BASIC)[keyof typeof CACHE_OPERATION_SEMANTICS.BASIC];
export type CacheOperationBatch =
  (typeof CACHE_OPERATION_SEMANTICS.BATCH)[keyof typeof CACHE_OPERATION_SEMANTICS.BATCH];
export type CacheOperationAdvanced =
  (typeof CACHE_OPERATION_SEMANTICS.ADVANCED)[keyof typeof CACHE_OPERATION_SEMANTICS.ADVANCED];
export type CacheOperationMonitoring =
  (typeof CACHE_OPERATION_SEMANTICS.MONITORING)[keyof typeof CACHE_OPERATION_SEMANTICS.MONITORING];

/**
 * 缓存状态类型定义
 */
export type CacheStatusBasic =
  (typeof CACHE_STATUS_SEMANTICS.BASIC)[keyof typeof CACHE_STATUS_SEMANTICS.BASIC];
export type CacheStatusHealth =
  (typeof CACHE_STATUS_SEMANTICS.HEALTH)[keyof typeof CACHE_STATUS_SEMANTICS.HEALTH];
export type CacheStatusPerformance =
  (typeof CACHE_STATUS_SEMANTICS.PERFORMANCE)[keyof typeof CACHE_STATUS_SEMANTICS.PERFORMANCE];
export type CacheStatusOperation =
  (typeof CACHE_STATUS_SEMANTICS.OPERATION)[keyof typeof CACHE_STATUS_SEMANTICS.OPERATION];

// ============================================================================
// Utility Functions - 工具函数
// ============================================================================

/**
 * 检查缓存类型是否为强一致性类型
 */
export function isStrongConsistencyType(cacheType: string): boolean {
  return CACHE_BUSINESS_RULES.CONSISTENCY.STRONG_CONSISTENCY_TYPES.includes(
    cacheType as any,
  );
}

/**
 * 检查缓存类型是否为关键优先级
 */
export function isCriticalPriority(cacheType: string): boolean {
  return CACHE_BUSINESS_RULES.PRIORITY.CRITICAL.includes(cacheType as any);
}

/**
 * 生成标准缓存键
 */
export function generateCacheKey(
  prefix: CacheKeyPrefix,
  ...parts: string[]
): string {
  return [prefix, ...parts.filter((part) => part && part.trim())].join(":");
}

/**
 * 验证缓存键格式
 */
export function validateCacheKey(key: string): boolean {
  // 缓存键格式：prefix:part1:part2:...
  // 长度限制、字符限制等在配置层定义
  const parts = key.split(":");
  return parts.length >= 2 && parts.every((part) => part.length > 0);
}

/**
 * 从质量标准获取等级
 */
export function getQualityLevel(
  value: number,
  standards: Record<string, number>,
): string {
  const entries = Object.entries(standards).sort(([, a], [, b]) => a - b);

  for (const [level, threshold] of entries) {
    if (value <= threshold) {
      return level.toLowerCase();
    }
  }

  return "critical";
}

// ============================================================================
// Cache Core Constants Export - 核心常量导出
// ============================================================================

/**
 * 统一导出对象
 * 🎯 提供一站式访问所有核心常量
 */
export const CACHE_CORE_CONSTANTS = Object.freeze({
  TYPE_SEMANTICS: CACHE_TYPE_SEMANTICS,
  KEY_PREFIX_SEMANTICS: CACHE_KEY_PREFIX_SEMANTICS,
  OPERATION_SEMANTICS: CACHE_OPERATION_SEMANTICS,
  STATUS_SEMANTICS: CACHE_STATUS_SEMANTICS,
  QUALITY_STANDARDS: CACHE_QUALITY_STANDARDS,
  BUSINESS_RULES: CACHE_BUSINESS_RULES,

  // 工具函数
  utils: {
    isStrongConsistencyType,
    isCriticalPriority,
    generateCacheKey,
    validateCacheKey,
    getQualityLevel,
  },
} as const);

/**
 * 默认导出
 */
export default CACHE_CORE_CONSTANTS;
