/**
 * 基础接口定义
 * 🎯 减少DTO字段重复，提供统一的基础字段定义
 */

/**
 * 基础健康指标接口
 * 包含健康评分、响应时间、错误率等核心健康指标
 */
export interface BaseHealthMetrics {
  /** 健康评分 (0-100) */
  healthScore: number;

  /** 响应时间（毫秒） */
  responseTimeMs: number;

  /** 错误率 (0-1) */
  errorRate: number;
}

/**
 * 基础时间戳接口
 * 为所有需要时间戳的对象提供统一的时间字段
 */
export interface BaseTimestamp {
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 基础趋势指标接口
 * 定义趋势分析中的通用字段结构
 */
export interface BaseTrendMetric<T = number> {
  /** 当前值 */
  current: T;

  /** 历史值 */
  previous: T;

  /** 趋势方向 */
  trend: "up" | "down" | "stable";

  /** 变化百分比 */
  changePercentage: number;
}

/**
 * 基础性能摘要接口
 * 包含总操作数、成功数、失败数等核心统计信息
 */
export interface BasePerformanceSummary {
  /** 总操作数 */
  totalOperations: number;

  /** 成功操作数 */
  successfulOperations: number;

  /** 失败操作数 */
  failedOperations: number;
}

/**
 * 基础端点标识接口
 * 统一端点相关的字段
 */
export interface BaseEndpointIdentifier {
  /** 端点路径 */
  endpoint: string;

  /** HTTP方法 */
  method: string;
}

/**
 * 基础缓存指标接口
 * 统一缓存相关的指标字段
 */
export interface BaseCacheMetrics {
  /** 命中次数 */
  hits: number;

  /** 未命中次数 */
  misses: number;

  /** 命中率 (0-1) */
  hitRate: number;
}

/**
 * 组合接口：带时间戳的健康指标
 */
export interface TimestampedHealthMetrics
  extends BaseHealthMetrics,
    BaseTimestamp {}

/**
 * 组合接口：带时间戳的性能摘要
 */
export interface TimestampedPerformanceSummary
  extends BasePerformanceSummary,
    BaseTimestamp {}

/**
 * 组合接口：完整的组件健康状态
 */
export interface ComponentHealthStatus
  extends BaseHealthMetrics,
    BaseTimestamp {
  /** 组件名称 */
  componentName: string;

  /** 组件类型 */
  componentType: string;
}
