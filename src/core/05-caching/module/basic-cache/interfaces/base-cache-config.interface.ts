/**
 * 基础缓存配置扩展接口
 * 继承Foundation层的BaseCacheConfig，添加basic-cache模块特有的配置
 *
 * 设计原则：
 * 1. 继承Foundation层标准配置
 * 2. 扩展模块特有配置项
 * 3. 保持依赖方向正确性（basic-cache -> foundation）
 */

import { BaseCacheConfig as FoundationBaseCacheConfig } from '../../../foundation/types/cache-config.types';

// Compression types - inlined since the constants file was unused
type CompressionDataType = "stream" | "batch" | "static" | "large";
type CompressionStrategyName = "REALTIME" | "BATCH" | "STORAGE" | "ARCHIVE";

/**
 * 扩展缓存配置接口
 * 继承Foundation层BaseCacheConfig，添加basic-cache模块特有配置
 */
export interface ExtendedBaseCacheConfig extends FoundationBaseCacheConfig {
  // ============================================================================
  // 容量配置
  // ============================================================================

  /** 最大缓存条目数 */
  readonly maxCacheEntries: number;

  /** 批量操作最大条目数 */
  readonly maxBatchSize: number;

  // ============================================================================
  // 清理配置
  // ============================================================================

  /** 清理任务执行间隔 (毫秒) */
  readonly cleanupIntervalMs: number;

  /** 单次清理最大处理条目数 */
  readonly maxCleanupItems: number;

  /** 内存使用率清理阈值 (0-1) */
  readonly memoryCleanupThreshold: number;

  // ============================================================================
  // 压缩配置扩展
  // ============================================================================

  /** 压缩数据类型 - 用于选择压缩策略 */
  readonly compressionDataType: CompressionDataType;

  /** 压缩策略名称 */
  readonly compressionStrategy?: CompressionStrategyName;

  // ============================================================================
  // 性能监控配置扩展
  // ============================================================================

  /** 慢操作阈值 (毫秒) - 超过此时间的操作被记录为慢查询 */
  readonly slowOperationThresholdMs: number;

  /** 统计日志输出间隔 (毫秒) */
  readonly statsLogIntervalMs: number;

  // ============================================================================
  // 错误处理配置
  // ============================================================================

  /** 最大重试次数 */
  readonly maxRetryAttempts: number;

  /** 重试基础延迟 (毫秒) */
  readonly baseRetryDelayMs: number;

  /** 重试延迟倍数 */
  readonly retryDelayMultiplier: number;

  /** 是否在错误时启用降级策略 */
  readonly enableFallback: boolean;
}

// 为了向后兼容，将ExtendedBaseCacheConfig别名为BaseCacheConfig
export { ExtendedBaseCacheConfig as BaseCacheConfig };

/**
 * 通用缓存配置接口
 * 继承扩展基础配置，用于标准的键值对缓存
 */
export interface CommonCacheConfig extends ExtendedBaseCacheConfig {
  /** 键前缀 */
  keyPrefix: string;

  /** 键的最大长度 */
  maxKeyLength: number;

  /** 值的最大大小 (字节) */
  maxValueSize: number;

  /** 是否启用键空间通知 */
  enableKeyspaceNotifications: boolean;

  /** 序列化方式 */
  serialization: "json" | "msgpack" | "protobuf";
}

/**
 * 符号映射缓存配置接口
 * 继承扩展基础配置，专门用于符号映射的多层缓存
 */
export interface SymbolMapperCacheConfig extends ExtendedBaseCacheConfig {
  /** L1缓存配置 (规则缓存) */
  l1Cache: {
    maxSize: number;
    ttl: number;
  };

  /** L2缓存配置 (符号映射缓存) */
  l2Cache: {
    maxSize: number;
    ttl: number;
  };

  /** L3缓存配置 (批量结果缓存) */
  l3Cache: {
    maxSize: number;
    ttl: number;
  };

  /** 是否启用缓存预热 */
  enableWarmup: boolean;

  /** 预热数据大小 */
  warmupSize: number;
}


/**
 * 缓存配置验证器接口
 */
export interface CacheConfigValidator {
  /**
   * 验证TTL配置
   */
  validateTTLConfig(
    config: Pick<FoundationBaseCacheConfig, "defaultTtlSeconds" | "minTtlSeconds" | "maxTtlSeconds">,
  ): string[];

  /**
   * 验证容量配置
   */
  validateCapacityConfig(
    config: Pick<ExtendedBaseCacheConfig, "maxCacheEntries" | "maxBatchSize">,
  ): string[];

  /**
   * 验证压缩配置
   */
  validateCompressionConfig(
    config: Pick<FoundationBaseCacheConfig, "compressionThresholdBytes" | "compressionEnabled"> &
           Pick<ExtendedBaseCacheConfig, "compressionDataType">,
  ): string[];

  /**
   * 验证性能配置
   */
  validatePerformanceConfig(
    config: Pick<
      ExtendedBaseCacheConfig,
      "slowOperationThresholdMs" | "statsLogIntervalMs"
    >,
  ): string[];
}

/**
 * 环境变量配置映射类型
 * 用于从环境变量创建配置
 */
export type EnvConfigMapping = {
  [K in keyof ExtendedBaseCacheConfig]: {
    envKey: string;
    defaultValue: ExtendedBaseCacheConfig[K];
    parser: (value: string) => ExtendedBaseCacheConfig[K];
  };
};

