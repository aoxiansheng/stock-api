/**
 * 缓存模块标准接口类型定义
 * 定义所有缓存模块必须实现的标准接口，确保一致性和互操作性
 */

import type {
  CacheUnifiedConfigInterface,
  CacheConfigCreateOptions,
  CacheConfigValidationResult
} from './cache-config.types';

import {
  BaseCacheResult,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheBatchResult,
  CacheStatsResult,
  CacheHealthResult,
  CacheOperationOptions,
  BatchOperationOptions,
  CacheStats,
  CacheHealthStatus
} from './cache-result.types';

/**
 * 缓存模块基础接口
 * 所有缓存模块必须实现的核心接口
 */
export interface CacheModuleInterface {
  /** 模块名称 */
  readonly name: string;

  /** 模块版本 */
  readonly version: string;

  /** 模块描述 */
  readonly description?: string;

  /** 是否已初始化 */
  readonly isInitialized: boolean;

  /** 是否健康 */
  readonly isHealthy: boolean;

  /** 配置 */
  config: CacheUnifiedConfigInterface;

  /**
   * 初始化模块
   * @param config 配置对象
   * @param options 初始化选项
   */
  initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void>;

  /**
   * 销毁模块，清理资源
   */
  destroy(): Promise<void>;

  /**
   * 获取模块状态
   */
  getStatus(): ModuleStatus;

  /**
   * 验证配置
   * @param config 待验证的配置
   */
  validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult;
}

/**
 * 缓存操作接口
 * 定义基础的缓存CRUD操作
 */
export interface CacheOperationsInterface {
  /**
   * 获取缓存值
   * @param key 缓存键
   * @param options 操作选项
   */
  get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>>;

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param options 操作选项
   */
  set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult>;

  /**
   * 删除缓存值
   * @param key 缓存键
   * @param options 操作选项
   */
  delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult>;

  /**
   * 检查键是否存在
   * @param key 缓存键
   * @param options 操作选项
   */
  exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>>;

  /**
   * 获取键的TTL
   * @param key 缓存键
   * @param options 操作选项
   */
  ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>>;

  /**
   * 设置键的过期时间
   * @param key 缓存键
   * @param ttl TTL(秒)
   * @param options 操作选项
   */
  expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>>;
}

/**
 * 批量操作接口
 */
export interface CacheBatchOperationsInterface {
  /**
   * 批量获取
   * @param keys 键数组
   * @param options 批量操作选项
   */
  batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>>;

  /**
   * 批量设置
   * @param items 键值对数组
   * @param options 批量操作选项
   */
  batchSet<T = any>(items: Array<{key: string, value: T, ttl?: number}>, options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>>;

  /**
   * 批量删除
   * @param keys 键数组
   * @param options 批量操作选项
   */
  batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>>;

  /**
   * 清空所有缓存
   * @param pattern 键模式 (可选)
   * @param options 操作选项
   */
  clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult>;
}

/**
 * 高级操作接口
 */
export interface CacheAdvancedOperationsInterface {
  /**
   * 原子递增
   * @param key 缓存键
   * @param increment 递增值
   * @param options 操作选项
   */
  increment(key: string, increment?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>>;

  /**
   * 原子递减
   * @param key 缓存键
   * @param decrement 递减值
   * @param options 操作选项
   */
  decrement(key: string, decrement?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>>;

  /**
   * 获取或设置 (如果不存在则设置)
   * @param key 缓存键
   * @param factory 值工厂函数
   * @param options 操作选项
   */
  getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    options?: CacheOperationOptions
  ): Promise<CacheGetResult<T>>;

  /**
   * 条件设置 (仅当不存在时设置)
   * @param key 缓存键
   * @param value 缓存值
   * @param options 操作选项
   */
  setIfNotExists<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult>;
}

/**
 * 监控和统计接口
 */
export interface CacheMonitoringInterface {
  /**
   * 获取缓存统计信息
   * @param timeRangeMs 时间范围 (毫秒)
   */
  getStats(timeRangeMs?: number): Promise<CacheStatsResult>;

  /**
   * 重置统计信息
   */
  resetStats(): Promise<BaseCacheResult<boolean>>;

  /**
   * 获取健康状态
   */
  getHealth(): Promise<CacheHealthResult>;

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): Promise<BaseCacheResult<MemoryUsage>>;

  /**
   * 获取连接信息
   */
  getConnectionInfo(): Promise<BaseCacheResult<ConnectionInfo>>;
}

/**
 * 完整的缓存服务接口
 * 集成所有功能接口
 */
export interface CacheServiceInterface extends
  CacheModuleInterface,
  CacheOperationsInterface,
  CacheBatchOperationsInterface,
  CacheAdvancedOperationsInterface,
  CacheMonitoringInterface {

  /**
   * 刷新配置
   * @param newConfig 新配置
   */
  refreshConfig(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void>;

  /**
   * 测试连接
   */
  ping(): Promise<BaseCacheResult<number>>;

  /**
   * 获取所有键
   * @param pattern 键模式
   * @param limit 返回数量限制
   */
  getKeys(pattern?: string, limit?: number): Promise<BaseCacheResult<string[]>>;

  /**
   * 导出数据
   * @param pattern 键模式
   * @param format 导出格式
   */
  exportData(pattern?: string, format?: 'json' | 'csv'): Promise<BaseCacheResult<any>>;

  /**
   * 导入数据
   * @param data 导入数据
   * @param options 导入选项
   */
  importData(data: any, options?: ImportOptions): Promise<BaseCacheResult<ImportResult>>;
}

/**
 * 模块初始化选项
 */
export interface ModuleInitOptions {
  /** 是否自动连接 */
  readonly autoConnect?: boolean;

  /** 初始化超时 (毫秒) */
  readonly timeoutMs?: number;

  /** 是否启用健康检查 */
  readonly enableHealthCheck?: boolean;

  /** 是否启用统计 */
  readonly enableStats?: boolean;

  /** 自定义验证器 */
  readonly customValidators?: Array<(config: CacheUnifiedConfigInterface) => CacheConfigValidationResult>;

  /** 初始化回调 */
  readonly onInitialized?: () => void;
  readonly onError?: (error: Error) => void;
}

/**
 * 模块状态
 */
export interface ModuleStatus {
  /** 状态类型 */
  readonly status: 'initializing' | 'ready' | 'error' | 'destroyed';

  /** 状态消息 */
  readonly message?: string;

  /** 最后更新时间 */
  readonly lastUpdated: number;

  /** 启动时间 */
  readonly startedAt?: number;

  /** 错误信息 */
  readonly error?: string;

  /** 性能指标 */
  readonly metrics?: {
    readonly totalOperations: number;
    readonly avgResponseTime: number;
    readonly errorRate: number;
  };
}

/**
 * 内存使用情况
 */
export interface MemoryUsage {
  /** 已使用内存 (字节) */
  readonly usedMemoryBytes: number;

  /** 总内存 (字节) */
  readonly totalMemoryBytes: number;

  /** 内存使用率 */
  readonly memoryUsageRatio: number;

  /** 键数量 */
  readonly keyCount: number;

  /** 平均键大小 (字节) */
  readonly avgKeySize: number;

  /** 碎片率 */
  readonly fragmentationRatio?: number;
}

/**
 * 连接信息
 */
export interface ConnectionInfo {
  /** 连接状态 */
  readonly status: 'connected' | 'disconnected' | 'reconnecting';

  /** 连接地址 */
  readonly address: string;

  /** 连接端口 */
  readonly port: number;

  /** 连接时间 */
  readonly connectedAt?: number;

  /** 最后心跳时间 */
  readonly lastHeartbeat?: number;

  /** 网络延迟 (毫秒) */
  readonly latencyMs?: number;

  /** 连接池信息 */
  readonly poolInfo?: {
    readonly totalConnections: number;
    readonly activeConnections: number;
    readonly idleConnections: number;
  };
}

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 是否覆盖现有键 */
  readonly overwrite?: boolean;

  /** 导入格式 */
  readonly format?: 'json' | 'csv';

  /** TTL覆盖 (秒) */
  readonly ttl?: number;

  /** 键前缀 */
  readonly keyPrefix?: string;

  /** 批次大小 */
  readonly batchSize?: number;

  /** 验证器 */
  readonly validator?: (key: string, value: any) => boolean;
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 导入总数 */
  readonly total: number;

  /** 成功数量 */
  readonly successful: number;

  /** 失败数量 */
  readonly failed: number;

  /** 跳过数量 */
  readonly skipped: number;

  /** 失败的键列表 */
  readonly failedKeys?: string[];

  /** 导入耗时 (毫秒) */
  readonly durationMs: number;
}