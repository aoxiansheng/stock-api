/**
 * 基础缓存配置接口
 * 定义所有缓存模块通用的配置结构和标准
 * 
 * 设计原则：
 * 1. 通用性：涵盖所有缓存场景的基础配置项
 * 2. 可扩展：支持模块级个性化扩展
 * 3. 类型安全：严格的TypeScript类型定义
 * 4. 向后兼容：保持与现有配置的兼容性
 */

import { CompressionDataType, CompressionStrategyName } from '../constants/compression-thresholds.constants';

/**
 * 基础缓存配置接口
 * 所有缓存模块都应继承此接口
 */
export interface BaseCacheConfig {
  // ============================================================================
  // TTL 配置 (Time To Live)
  // ============================================================================
  
  /** 默认TTL时间 (秒) */
  defaultTTL: number;
  
  /** 最小TTL时间 (秒) - 防止设置过短的缓存时间 */
  minTTL: number;
  
  /** 最大TTL时间 (秒) - 防止设置过长的缓存时间 */
  maxTTL: number;

  // ============================================================================
  // 容量配置
  // ============================================================================
  
  /** 最大缓存条目数 */
  maxCacheSize: number;
  
  /** 批量操作最大条目数 */
  maxBatchSize: number;

  // ============================================================================
  // 清理配置  
  // ============================================================================
  
  /** 清理任务执行间隔 (毫秒) */
  cleanupInterval: number;
  
  /** 单次清理最大处理条目数 */
  maxCleanupItems: number;
  
  /** 内存使用率清理阈值 (0-1) */
  memoryCleanupThreshold: number;

  // ============================================================================
  // 压缩配置
  // ============================================================================
  
  /** 压缩阈值 (字节) */
  compressionThreshold: number;
  
  /** 是否启用压缩 */
  compressionEnabled: boolean;
  
  /** 压缩数据类型 - 用于选择压缩策略 */
  compressionDataType: CompressionDataType;
  
  /** 压缩策略名称 */
  compressionStrategy?: CompressionStrategyName;

  // ============================================================================
  // 性能监控配置
  // ============================================================================
  
  /** 慢操作阈值 (毫秒) - 超过此时间的操作被记录为慢查询 */
  slowOperationThreshold: number;
  
  /** 统计日志输出间隔 (毫秒) */
  statsLogInterval: number;
  
  /** 是否启用性能监控 */
  performanceMonitoring: boolean;
  
  /** 是否启用详细日志 */
  verboseLogging: boolean;

  // ============================================================================
  // 错误处理配置
  // ============================================================================
  
  /** 最大重试次数 */
  maxRetryAttempts: number;
  
  /** 重试基础延迟 (毫秒) */
  retryBaseDelay: number;
  
  /** 重试延迟倍数 */
  retryDelayMultiplier: number;
  
  /** 是否在错误时启用降级策略 */
  enableFallback: boolean;
}

/**
 * 流缓存配置接口
 * 继承基础配置，专门用于实时数据流缓存
 */
export interface StreamCacheConfig extends BaseCacheConfig {
  /** 热缓存TTL (毫秒) - 高频访问数据的短期缓存 */
  hotCacheTTL: number;
  
  /** 温缓存TTL (秒) - 中频访问数据的长期缓存 */
  warmCacheTTL: number;
  
  /** 热缓存最大容量 */
  maxHotCacheSize: number;
  
  /** 流数据批量处理大小 */
  streamBatchSize: number;
  
  /** 连接超时时间 (毫秒) */
  connectionTimeout: number;
  
  /** 心跳间隔 (毫秒) */
  heartbeatInterval: number;
}

/**
 * 通用缓存配置接口  
 * 继承基础配置，用于标准的键值对缓存
 */
export interface CommonCacheConfig extends BaseCacheConfig {
  /** 键前缀 */
  keyPrefix: string;
  
  /** 键的最大长度 */
  maxKeyLength: number;
  
  /** 值的最大大小 (字节) */
  maxValueSize: number;
  
  /** 是否启用键空间通知 */
  enableKeyspaceNotifications: boolean;
  
  /** 序列化方式 */
  serialization: 'json' | 'msgpack' | 'protobuf';
}

/**
 * 符号映射缓存配置接口
 * 继承基础配置，专门用于符号映射的多层缓存
 */
export interface SymbolMapperCacheConfig extends BaseCacheConfig {
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
 * 缓存配置工厂接口
 * 用于创建不同类型的缓存配置
 */
export interface CacheConfigFactory {
  /**
   * 创建流缓存配置
   * @param overrides 覆盖的配置项
   * @returns 流缓存配置
   */
  createStreamCacheConfig(overrides?: Partial<StreamCacheConfig>): StreamCacheConfig;
  
  /**
   * 创建通用缓存配置
   * @param overrides 覆盖的配置项
   * @returns 通用缓存配置
   */
  createCommonCacheConfig(overrides?: Partial<CommonCacheConfig>): CommonCacheConfig;
  
  /**
   * 创建符号映射缓存配置
   * @param overrides 覆盖的配置项  
   * @returns 符号映射缓存配置
   */
  createSymbolMapperCacheConfig(overrides?: Partial<SymbolMapperCacheConfig>): SymbolMapperCacheConfig;
  
  /**
   * 验证缓存配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validateCacheConfig(config: BaseCacheConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * 缓存配置验证器接口
 */
export interface CacheConfigValidator {
  /**
   * 验证TTL配置
   */
  validateTTLConfig(config: Pick<BaseCacheConfig, 'defaultTTL' | 'minTTL' | 'maxTTL'>): string[];
  
  /**
   * 验证容量配置
   */
  validateCapacityConfig(config: Pick<BaseCacheConfig, 'maxCacheSize' | 'maxBatchSize'>): string[];
  
  /**
   * 验证压缩配置
   */
  validateCompressionConfig(config: Pick<BaseCacheConfig, 'compressionThreshold' | 'compressionEnabled' | 'compressionDataType'>): string[];
  
  /**
   * 验证性能配置
   */
  validatePerformanceConfig(config: Pick<BaseCacheConfig, 'slowOperationThreshold' | 'statsLogInterval'>): string[];
}

/**
 * 环境变量配置映射类型
 * 用于从环境变量创建配置
 */
export type EnvConfigMapping = {
  [K in keyof BaseCacheConfig]: {
    envKey: string;
    defaultValue: BaseCacheConfig[K];
    parser: (value: string) => BaseCacheConfig[K];
  };
};

/**
 * 缓存配置事件类型
 */
export type CacheConfigEvent = {
  type: 'config_updated' | 'config_validated' | 'config_error';
  config: BaseCacheConfig;
  timestamp: Date;
  source: string;
  details?: any;
};

/**
 * 缓存配置监听器接口
 */
export interface CacheConfigListener {
  onConfigChange(event: CacheConfigEvent): void;
}