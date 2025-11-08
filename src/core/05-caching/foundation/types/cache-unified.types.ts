/**
 * 统一缓存类型定义 - Caching 模块唯一真实来源 (Single Source of Truth)
 *
 * 🎯 设计原则：
 * - 所有 05-caching 子模块必须从此文件导入缓存类型
 * - 禁止在其他文件重复定义相同语义的类型/接口
 * - 使用 readonly 确保配置不可变性
 * - 提供清晰的类型继承关系
 *
 * 📦 导出内容：
 * - BaseCacheConfig: 基础缓存配置接口
 * - TtlStrategyConfig: TTL 策略配置
 * - PerformanceConfig: 性能配置
 * - CacheUnifiedConfigInterface: 完整统一配置
 * - CacheResult: 缓存操作结果
 *
 * @module core/05-caching/shared/types
 */

import {
  CacheOperationType,
  CacheStrategyType,
  CacheStatusType,
  CacheResultStatusType,
  CachePriorityType,
} from '../constants/cache-unified.constants';

// ============================================================
// 基础配置接口
// ============================================================

/**
 * 基础缓存配置接口
 *
 * 🎯 用途：所有缓存模块配置的基础接口
 * 📋 扩展：各模块应扩展此接口添加特定配置
 *
 * @example
 * interface SmartCacheConfig extends BaseCacheConfig {
 *   strategy: CacheStrategyType;
 * }
 */
export interface BaseCacheConfig {
  /** 缓存实例名称 */
  readonly name: string;

  /** 默认 TTL (秒) */
  readonly defaultTtlSeconds: number;

  /** 最大 TTL (秒) */
  readonly maxTtlSeconds: number;

  /** 最小 TTL (秒) */
  readonly minTtlSeconds: number;

  /** 是否启用压缩 */
  readonly compressionEnabled: boolean;

  /** 压缩阈值 (字节) */
  readonly compressionThresholdBytes: number;

  /** 是否启用监控 */
  readonly metricsEnabled: boolean;

  /** 是否启用性能监控 */
  readonly performanceMonitoringEnabled: boolean;
}

/**
 * TTL 策略配置接口
 *
 * 🎯 用途：定义不同场景下的 TTL 配置
 * 📊 应用：根据数据时效性要求选择合适的 TTL
 */
export interface TtlStrategyConfig {
  /** 实时数据 TTL (秒) - 强时效性 */
  readonly realTimeTtlSeconds: number;

  /** 准实时数据 TTL (秒) */
  readonly nearRealTimeTtlSeconds: number;

  /** 批量查询 TTL (秒) - 弱时效性 */
  readonly batchQueryTtlSeconds: number;

  /** 交易时段 TTL (秒) */
  readonly tradingHoursTtlSeconds: number;

  /** 非交易时段 TTL (秒) */
  readonly offHoursTtlSeconds: number;

  /** 周末 TTL (秒) */
  readonly weekendTtlSeconds: number;

  /** 归档数据 TTL (秒) */
  readonly archiveTtlSeconds: number;
}

/**
 * 性能配置接口
 *
 * 🎯 用途：控制缓存系统的性能参数
 * ⚡ 调优：根据实际负载调整这些参数
 */
export interface PerformanceConfig {
  /** 最大内存使用 (MB) */
  readonly maxMemoryMb: number;

  /** 默认批次大小 */
  readonly defaultBatchSize: number;

  /** 最大并发操作数 */
  readonly maxConcurrentOperations: number;

  /** 最小并发操作数 */
  readonly minConcurrentOperations: number;

  /** 慢操作阈值 (毫秒) */
  readonly slowOperationThresholdMs: number;

  /** 连接超时 (毫秒) */
  readonly connectionTimeoutMs: number;

  /** 操作超时 (毫秒) */
  readonly operationTimeoutMs: number;
}

/**
 * 间隔配置接口
 *
 * 🎯 用途：定义各类定时任务的执行间隔
 * ⏰ 调优：根据系统负载调整间隔时间
 */
export interface IntervalConfig {
  /** 清理间隔 (毫秒) */
  readonly cleanupIntervalMs: number;

  /** 内存清理间隔 (毫秒) */
  readonly memoryCleanupIntervalMs: number;

  /** 健康检查间隔 (毫秒) */
  readonly healthCheckIntervalMs: number;

  /** 监控指标收集间隔 (毫秒) */
  readonly metricsCollectionIntervalMs: number;

  /** 统计日志间隔 (毫秒) */
  readonly statsLogIntervalMs: number;

  /** 心跳间隔 (毫秒) */
  readonly heartbeatIntervalMs: number;
}

/**
 * 限制配置接口
 *
 * 🎯 用途：定义缓存系统的各类限制
 * 🛡️ 保护：防止资源滥用和系统过载
 */
export interface LimitConfig {
  /** 最大键长度 */
  readonly maxKeyLength: number;

  /** 最大值大小 (字节) */
  readonly maxValueSizeBytes: number;

  /** 最大缓存条目数 */
  readonly maxCacheEntries: number;

  /** 内存阈值比例 */
  readonly memoryThresholdRatio: number;

  /** 错误率告警阈值 */
  readonly errorRateAlertThreshold: number;

  /** LRU 排序批次大小 */
  readonly lruSortBatchSize: number;
}

/**
 * 重试配置接口
 *
 * 🎯 用途：控制失败操作的重试策略
 * 🔄 策略：支持指数退避
 */
export interface RetryConfig {
  /** 最大重试次数 */
  readonly maxRetryAttempts: number;

  /** 基础重试延迟 (毫秒) */
  readonly baseRetryDelayMs: number;

  /** 重试延迟倍数 */
  readonly retryDelayMultiplier: number;

  /** 最大重试延迟 (毫秒) */
  readonly maxRetryDelayMs: number;

  /** 是否启用指数退避 */
  readonly exponentialBackoffEnabled: boolean;
}

/**
 * 统一缓存配置接口
 *
 * 🎯 用途：整合所有配置子类型的完整配置定义
 * 📦 使用：配置服务应返回此接口类型的对象
 *
 * @example
 * const config: CacheUnifiedConfigInterface = {
 *   name: 'smart-cache',
 *   defaultTtlSeconds: 300,
 *   ttl: { ... },
 *   performance: { ... },
 *   intervals: { ... },
 *   limits: { ... },
 *   retry: { ... }
 * };
 */
export interface CacheUnifiedConfigInterface extends BaseCacheConfig {
  /** TTL 策略配置 */
  readonly ttl: TtlStrategyConfig;

  /** 性能配置 */
  readonly performance: PerformanceConfig;

  /** 间隔配置 */
  readonly intervals: IntervalConfig;

  /** 限制配置 */
  readonly limits: LimitConfig;

  /** 重试配置 */
  readonly retry: RetryConfig;
}

// ============================================================
// 缓存操作相关类型
// ============================================================

/**
 * 缓存操作选项
 *
 * 🎯 用途：控制单次缓存操作的行为
 */
export interface CacheOperationOptions {
  /** 自定义 TTL (秒) - 覆盖默认值 */
  readonly ttlSeconds?: number;

  /** 优先级 */
  readonly priority?: CachePriorityType;

  /** 是否压缩 */
  readonly compress?: boolean;

  /** 是否记录指标 */
  readonly recordMetrics?: boolean;

  /** 操作超时 (毫秒) */
  readonly timeoutMs?: number;
}

/**
 * 缓存结果接口
 *
 * 🎯 用途：标准化缓存操作的返回结果
 * 📊 监控：包含性能和状态信息
 *
 * @template T 缓存值的类型
 */
export interface CacheResult<T = unknown> {
  /** 缓存键 */
  readonly key: string;

  /** 缓存值 */
  readonly value: T | null;

  /** 操作状态 */
  readonly status: CacheResultStatusType;

  /** 是否命中 */
  readonly hit: boolean;

  /** 响应时间 (毫秒) */
  readonly responseTimeMs: number;

  /** 数据大小 (字节) */
  readonly sizeBytes?: number;

  /** 是否压缩 */
  readonly compressed?: boolean;

  /** 剩余 TTL (秒) */
  readonly remainingTtlSeconds?: number;

  /** 错误信息 */
  readonly error?: string;
}

/**
 * 批量缓存结果接口
 *
 * 🎯 用途：标准化批量缓存操作的返回结果
 * 📊 统计：包含整体性能和命中率
 *
 * @template T 缓存值的类型
 */
export interface BatchCacheResult<T = unknown> {
  /** 单个结果列表 */
  readonly results: CacheResult<T>[];

  /** 总数 */
  readonly total: number;

  /** 命中数 */
  readonly hits: number;

  /** 未命中数 */
  readonly misses: number;

  /** 命中率 */
  readonly hitRate: number;

  /** 总响应时间 (毫秒) */
  readonly totalResponseTimeMs: number;

  /** 平均响应时间 (毫秒) */
  readonly averageResponseTimeMs: number;
}

/**
 * 缓存统计信息接口
 *
 * 🎯 用途：提供缓存系统的实时统计数据
 * 📊 监控：用于健康检查和性能分析
 */
export interface CacheStatistics {
  /** 总请求数 */
  readonly totalRequests: number;

  /** 命中数 */
  readonly hits: number;

  /** 未命中数 */
  readonly misses: number;

  /** 命中率 */
  readonly hitRate: number;

  /** 错误数 */
  readonly errors: number;

  /** 错误率 */
  readonly errorRate: number;

  /** 平均响应时间 (毫秒) */
  readonly averageResponseTimeMs: number;

  /** P95 响应时间 (毫秒) */
  readonly p95ResponseTimeMs: number;

  /** P99 响应时间 (毫秒) */
  readonly p99ResponseTimeMs: number;

  /** 当前键数量 */
  readonly keyCount: number;

  /** 内存使用 (字节) */
  readonly memoryUsageBytes: number;
}

/**
 * 缓存健康状态接口
 *
 * 🎯 用途：标识缓存服务的健康状态
 * 🏥 诊断：包含详细的诊断信息
 */
export interface CacheHealthStatus {
  /** 服务状态 */
  readonly status: CacheStatusType;

  /** 是否健康 */
  readonly healthy: boolean;

  /** 连接状态 */
  readonly connected: boolean;

  /** 响应时间 (毫秒) */
  readonly responseTimeMs: number;

  /** 内存使用率 */
  readonly memoryUsageRatio: number;

  /** 错误率 */
  readonly errorRate: number;

  /** 详细信息 */
  readonly details?: Record<string, unknown>;

  /** 检查时间戳 */
  readonly timestamp: number;
}

// ============================================================
// 高级类型定义
// ============================================================

/**
 * 缓存策略枚举
 *
 * 🎯 用途：提供类型安全的缓存策略枚举
 * 📋 使用：在需要枚举而非字符串字面量时使用
 */
export enum CacheStrategy {
  /** 强实时性缓存 - 适用于 Receiver */
  STRONG_TIMELINESS = 'STRONG_TIMELINESS',
  /** 弱实时性缓存 - 适用于 Query */
  WEAK_TIMELINESS = 'WEAK_TIMELINESS',
  /** 市场感知缓存 - 根据市场状态动态调整 */
  MARKET_AWARE = 'MARKET_AWARE',
  /** 自适应缓存 - 根据访问模式自动优化 */
  ADAPTIVE = 'ADAPTIVE',
  /** 无缓存策略 - 直接透传数据 */
  NO_CACHE = 'NO_CACHE',
}

/**
 * 缓存键构建器函数类型
 *
 * 🎯 用途：标准化缓存键的构建方式
 */
export type CacheKeyBuilder = (...parts: string[]) => string;

/**
 * 缓存值序列化器类型
 *
 * 🎯 用途：自定义缓存值的序列化方式
 */
export type CacheSerializer<T = unknown> = {
  serialize: (value: T) => string;
  deserialize: (serialized: string) => T;
};

/**
 * TTL 计算器函数类型
 *
 * 🎯 用途：动态计算 TTL 的函数签名
 * 📊 应用：根据业务逻辑和市场状态计算 TTL
 */
export type TtlCalculator = (context: {
  strategy: CacheStrategyType;
  marketOpen: boolean;
  dataType: string;
}) => number;
