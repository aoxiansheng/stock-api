/**
 * 缓存操作结果类型定义
 * 统一缓存操作的返回类型，提供类型安全和一致性
 */

import { CacheStatusType, CacheOperationType } from './cache-config.types';

/**
 * 基础缓存操作结果接口
 */
export interface BaseCacheResult<T = any> {
  /** 操作是否成功 */
  readonly success: boolean;

  /** 操作状态 */
  readonly status: CacheStatusType;

  /** 操作类型 */
  readonly operation: CacheOperationType;

  /** 操作数据 */
  readonly data?: T;

  /** 错误信息 */
  readonly error?: string;

  /** 错误代码 */
  readonly errorCode?: string;

  /** 操作耗时 (毫秒) */
  readonly duration?: number;

  /** 操作时间戳 */
  readonly timestamp: number;

  /** 缓存键 */
  readonly key?: string;

  /** 附加元数据 */
  readonly metadata?: Record<string, any>;
}

/**
 * 缓存获取操作结果
 */
export interface CacheGetResult<T = any> extends BaseCacheResult<T> {
  /** 是否命中缓存 */
  readonly hit: boolean;

  /** 剩余TTL (秒) */
  readonly remainingTtl?: number;

  /** 数据大小 (字节) */
  readonly dataSize?: number;

  /** 是否来自压缩数据 */
  readonly fromCompressed?: boolean;

  /** 缓存层级 (L1, L2, L3等) */
  readonly cacheLevel?: string;
}

/**
 * 缓存设置操作结果
 */
export interface CacheSetResult extends BaseCacheResult<boolean> {
  /** 设置的TTL (秒) */
  readonly ttl: number;

  /** 是否替换了现有值 */
  readonly replaced: boolean;

  /** 数据大小 (字节) */
  readonly dataSize?: number;

  /** 是否进行了压缩 */
  readonly compressed?: boolean;

  /** 压缩比例 */
  readonly compressionRatio?: number;
}

/**
 * 缓存删除操作结果
 */
export interface CacheDeleteResult extends BaseCacheResult<boolean> {
  /** 删除的键数量 */
  readonly deletedCount: number;

  /** 被删除的键列表 */
  readonly deletedKeys?: string[];

  /** 释放的内存大小 (字节) */
  readonly releasedMemoryBytes?: number;
}

/**
 * 批量操作结果
 */
export interface CacheBatchResult<T = any> extends BaseCacheResult<T[]> {
  /** 成功操作数量 */
  readonly successCount: number;

  /** 失败操作数量 */
  readonly failureCount: number;

  /** 总操作数量 */
  readonly totalCount: number;

  /** 部分成功的详细结果 */
  readonly results?: BaseCacheResult<T>[];

  /** 失败的键列表 */
  readonly failedKeys?: string[];

  /** 批处理大小 */
  readonly batchSize?: number;
}

/**
 * 缓存统计结果
 */
export interface CacheStatsResult extends BaseCacheResult<CacheStats> {
  /** 统计时间范围 (毫秒) */
  readonly timeRangeMs: number;

  /** 统计数据收集时间 */
  readonly collectionTime: number;
}

/**
 * 缓存统计数据
 */
export interface CacheStats {
  /** 命中次数 */
  readonly hits: number;

  /** 未命中次数 */
  readonly misses: number;

  /** 命中率 */
  readonly hitRate: number;

  /** 总操作次数 */
  readonly totalOperations: number;

  /** 当前键数量 */
  readonly keyCount: number;

  /** 内存使用量 (字节) */
  readonly memoryUsageBytes: number;

  /** 内存使用率 */
  readonly memoryUsageRatio: number;

  /** 平均响应时间 (毫秒) */
  readonly avgResponseTimeMs: number;

  /** P95响应时间 (毫秒) */
  readonly p95ResponseTimeMs?: number;

  /** P99响应时间 (毫秒) */
  readonly p99ResponseTimeMs?: number;

  /** 错误次数 */
  readonly errorCount: number;

  /** 错误率 */
  readonly errorRate: number;

  /** 最后清理时间 */
  readonly lastCleanupTime?: number;

  /** 上次统计重置时间 */
  readonly lastResetTime: number;
}

/**
 * 缓存健康检查结果
 */
export interface CacheHealthResult extends BaseCacheResult<CacheHealthStatus> {
  /** 健康检查项目结果 */
  readonly checks: HealthCheckItem[];

  /** 整体健康评分 (0-100) */
  readonly healthScore: number;
}

/**
 * 缓存健康状态
 */
export interface CacheHealthStatus {
  /** 连接状态 */
  readonly connectionStatus: CacheStatusType;

  /** 内存状态 */
  readonly memoryStatus: 'healthy' | 'warning' | 'critical';

  /** 性能状态 */
  readonly performanceStatus: 'healthy' | 'degraded' | 'poor';

  /** 错误率状态 */
  readonly errorRateStatus: 'healthy' | 'warning' | 'critical';

  /** 最后检查时间 */
  readonly lastCheckTime: number;

  /** 运行时间 (毫秒) */
  readonly uptimeMs: number;
}

/**
 * 健康检查项目
 */
export interface HealthCheckItem {
  /** 检查项目名称 */
  readonly name: string;

  /** 检查状态 */
  readonly status: 'pass' | 'warn' | 'fail';

  /** 检查值 */
  readonly value?: any;

  /** 阈值 */
  readonly threshold?: any;

  /** 检查描述 */
  readonly description?: string;

  /** 检查耗时 (毫秒) */
  readonly duration?: number;
}

/**
 * 缓存操作选项
 */
export interface CacheOperationOptions {
  /** TTL覆盖 (秒) */
  readonly ttl?: number;

  /** 操作超时 (毫秒) */
  readonly timeoutMs?: number;

  /** 是否启用压缩 */
  readonly compression?: boolean;

  /** 重试次数 */
  readonly retryAttempts?: number;

  /** 是否记录指标 */
  readonly recordMetrics?: boolean;

  /** 优先级 */
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';

  /** 标签 (用于分类和监控) */
  readonly tags?: Record<string, string>;

  /** 回调函数 */
  readonly onSuccess?: (result: BaseCacheResult) => void;
  readonly onError?: (error: Error) => void;
}

/**
 * 批量操作选项
 */
export interface BatchOperationOptions extends CacheOperationOptions {
  /** 批次大小 */
  readonly batchSize?: number;

  /** 并发限制 */
  readonly concurrency?: number;

  /** 是否并行处理 */
  readonly parallel?: boolean;

  /** 失败时是否停止 */
  readonly stopOnFailure?: boolean;

  /** 进度回调 */
  readonly onProgress?: (progress: BatchProgress) => void;
}

/**
 * 批量操作进度
 */
export interface BatchProgress {
  /** 已完成数量 */
  readonly completed: number;

  /** 总数量 */
  readonly total: number;

  /** 进度百分比 */
  readonly percentage: number;

  /** 成功数量 */
  readonly successes: number;

  /** 失败数量 */
  readonly failures: number;

  /** 估计剩余时间 (毫秒) */
  readonly estimatedRemainingMs?: number;
}