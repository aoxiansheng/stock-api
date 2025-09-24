/**
 * 标准化缓存模块接口
 * Phase 6: 定义所有缓存模块必须遵循的标准接口
 *
 * 这个接口融合了Foundation层的CacheServiceInterface和现有模块的最佳实践
 * 确保所有缓存模块具有一致的API surface和行为
 */

import {
  CacheServiceInterface,
  CacheModuleInterface,
  ModuleInitOptions,
  ModuleStatus,
  MemoryUsage,
  ConnectionInfo,
} from '../types/cache-module.types';

import type {
  CacheUnifiedConfigInterface,
  CacheConfigValidationResult,
} from '../types/cache-config.types';

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
} from '../types/cache-result.types';

/**
 * 标准化缓存模块必须实现的核心接口
 * 继承Foundation层的CacheServiceInterface，添加模块标准化要求
 */
export interface StandardCacheModuleInterface extends CacheServiceInterface {

  // ========================================
  // 模块标识与元数据 (必须实现)
  // ========================================

  /** 模块类型标识 (如: 'basic', 'stream', 'smart', 'data-mapper') */
  readonly moduleType: string;

  /** 模块类别 (如: 'foundation', 'specialized', 'orchestrator') */
  readonly moduleCategory: 'foundation' | 'specialized' | 'orchestrator';

  /** 支持的功能特性列表 */
  readonly supportedFeatures: string[];

  /** 依赖的其他模块列表 */
  readonly dependencies: string[];

  /** 模块优先级 (1-10, 1最高) */
  readonly priority: number;

  // ========================================
  // 配置管理 (标准化要求)
  // ========================================

  /**
   * 获取模块特定配置
   * 返回模块自定义的配置对象，但必须基于统一配置基础
   */
  getModuleSpecificConfig<T = any>(): T;

  /**
   * 验证模块特定配置
   * 除了基础配置验证外，还要验证模块特定的配置项
   */
  validateModuleSpecificConfig<T = any>(config: T): CacheConfigValidationResult;

  /**
   * 应用配置热更新
   * 支持运行时配置更新而无需重启模块
   */
  applyConfigUpdate(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void>;

  // ========================================
  // 生命周期管理 (增强版)
  // ========================================

  /**
   * 预初始化阶段
   * 在正式初始化前进行依赖检查和资源预分配
   */
  preInitialize?(dependencies: Map<string, StandardCacheModuleInterface>): Promise<void>;

  /**
   * 后初始化阶段
   * 在初始化完成后进行最终配置和连接测试
   */
  postInitialize?(): Promise<void>;

  /**
   * 获取初始化进度
   * 用于监控复杂模块的初始化过程
   */
  getInitializationProgress?(): {
    phase: string;
    progress: number; // 0-100
    estimatedRemainingMs: number;
  };

  // ========================================
  // 性能监控 (标准化)
  // ========================================

  /**
   * 获取性能指标
   * 返回标准化的性能指标，便于统一监控
   */
  getPerformanceMetrics(): Promise<CachePerformanceMetrics>;

  /**
   * 获取容量信息
   * 返回当前容量使用情况
   */
  getCapacityInfo(): Promise<CacheCapacityInfo>;

  /**
   * 执行性能基准测试
   * 用于评估模块在当前环境下的性能特征
   */
  runPerformanceBenchmark?(options?: BenchmarkOptions): Promise<BenchmarkResult>;

  // ========================================
  // 故障处理 (标准化)
  // ========================================

  /**
   * 获取错误统计
   * 返回详细的错误分类统计
   */
  getErrorStatistics(): Promise<CacheErrorStatistics>;

  /**
   * 执行自诊断
   * 检测潜在问题并提供修复建议
   */
  runDiagnostics(): Promise<DiagnosticsResult>;

  /**
   * 执行自修复
   * 尝试自动修复检测到的问题
   */
  attemptSelfHealing?(): Promise<SelfHealingResult>;

  // ========================================
  // 数据完整性 (标准化)
  // ========================================

  /**
   * 验证数据完整性
   * 检查缓存数据的一致性和正确性
   */
  validateDataIntegrity?(options?: IntegrityCheckOptions): Promise<IntegrityCheckResult>;

  /**
   * 数据备份
   * 导出关键数据用于备份或迁移
   */
  createBackup?(options?: BackupOptions): Promise<BackupResult>;

  /**
   * 数据恢复
   * 从备份恢复数据
   */
  restoreFromBackup?(backupData: any, options?: RestoreOptions): Promise<RestoreResult>;

  // ========================================
  // 模块间协作 (标准化)
  // ========================================

  /**
   * 注册依赖模块
   * 建立与其他缓存模块的依赖关系
   */
  registerDependency?(moduleType: string, module: StandardCacheModuleInterface): Promise<void>;

  /**
   * 获取依赖模块
   * 获取已注册的依赖模块实例
   */
  getDependency?<T extends StandardCacheModuleInterface>(moduleType: string): T | undefined;

  /**
   * 事件通知
   * 向其他模块发送事件通知
   */
  notifyOtherModules?(event: CacheModuleEvent): Promise<void>;
}

/**
 * 缓存性能指标接口
 */
export interface CachePerformanceMetrics {
  /** 平均响应时间 (毫秒) */
  avgResponseTime: number;

  /** P95响应时间 (毫秒) */
  p95ResponseTime: number;

  /** P99响应时间 (毫秒) */
  p99ResponseTime: number;

  /** 吞吐量 (操作/秒) */
  throughput: number;

  /** 命中率 */
  hitRate: number;

  /** 错误率 */
  errorRate: number;

  /** 内存效率 (有效数据/总内存) */
  memoryEfficiency: number;

  /** CPU使用率 */
  cpuUsage?: number;

  /** 网络使用率 (字节/秒) */
  networkUsage?: number;
}

/**
 * 缓存容量信息接口
 */
export interface CacheCapacityInfo {
  /** 当前键数量 */
  currentKeys: number;

  /** 最大键数量 */
  maxKeys: number;

  /** 键使用率 */
  keyUtilization: number;

  /** 当前内存使用 (字节) */
  currentMemory: number;

  /** 最大内存限制 (字节) */
  maxMemory: number;

  /** 内存使用率 */
  memoryUtilization: number;

  /** 预计剩余容量 (基于当前增长率) */
  estimatedRemainingCapacity: {
    keys: number;
    memoryBytes: number;
    estimatedFullInMs: number;
  };
}

/**
 * 错误统计接口
 */
export interface CacheErrorStatistics {
  /** 总错误次数 */
  totalErrors: number;

  /** 按错误类型分类的统计 */
  errorsByType: Record<string, number>;

  /** 按错误严重程度分类的统计 */
  errorsBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;

  /** 最近错误列表 */
  recentErrors: Array<{
    timestamp: number;
    type: string;
    severity: string;
    message: string;
    context?: Record<string, any>;
  }>;

  /** 错误趋势 (每小时错误数) */
  errorTrend: number[];
}

/**
 * 诊断结果接口
 */
export interface DiagnosticsResult {
  /** 整体健康评分 (0-100) */
  overallHealthScore: number;

  /** 检查项目结果 */
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    score: number;
    message: string;
    recommendation?: string;
  }>;

  /** 发现的问题列表 */
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    impact: string;
    solution?: string;
  }>;

  /** 性能建议 */
  performanceRecommendations?: string[];

  /** 配置建议 */
  configurationRecommendations?: string[];
}

/**
 * 自修复结果接口
 */
export interface SelfHealingResult {
  /** 修复操作是否成功 */
  success: boolean;

  /** 尝试修复的问题数量 */
  attemptedFixes: number;

  /** 成功修复的问题数量 */
  successfulFixes: number;

  /** 修复详情 */
  fixes: Array<{
    issue: string;
    action: string;
    success: boolean;
    message: string;
  }>;

  /** 无法自动修复的问题 */
  remainingIssues?: string[];
}

/**
 * 基准测试选项接口
 */
export interface BenchmarkOptions {
  /** 测试持续时间 (毫秒) */
  durationMs?: number;

  /** 并发数 */
  concurrency?: number;

  /** 测试数据大小 (字节) */
  dataSizeBytes?: number;

  /** 是否包含网络延迟测试 */
  includeNetworkLatency?: boolean;

  /** 自定义测试场景 */
  customScenarios?: BenchmarkScenario[];
}

/**
 * 基准测试场景接口
 */
export interface BenchmarkScenario {
  name: string;
  description: string;
  operations: Array<{
    type: 'get' | 'set' | 'delete' | 'batch';
    weight: number; // 操作权重 (0-1)
    keyPattern?: string;
    valueSize?: number;
  }>;
}

/**
 * 基准测试结果接口
 */
export interface BenchmarkResult {
  /** 测试总时长 (毫秒) */
  totalDuration: number;

  /** 总操作次数 */
  totalOperations: number;

  /** 平均吞吐量 (操作/秒) */
  avgThroughput: number;

  /** 峰值吞吐量 (操作/秒) */
  peakThroughput: number;

  /** 延迟分布 */
  latencyDistribution: {
    p50: number;
    p95: number;
    p99: number;
    p999: number;
  };

  /** 按操作类型的性能数据 */
  performanceByOperation: Record<string, {
    count: number;
    avgLatency: number;
    throughput: number;
    errorRate: number;
  }>;

  /** 资源使用情况 */
  resourceUsage: {
    avgCpuUsage: number;
    maxMemoryUsage: number;
    networkIO: number;
  };
}

/**
 * 数据完整性检查选项
 */
export interface IntegrityCheckOptions {
  /** 检查深度 */
  depth?: 'shallow' | 'deep' | 'comprehensive';

  /** 是否修复发现的问题 */
  autoFix?: boolean;

  /** 检查特定的键模式 */
  keyPattern?: string;

  /** 并发检查数 */
  concurrency?: number;
}

/**
 * 数据完整性检查结果
 */
export interface IntegrityCheckResult {
  /** 检查是否成功完成 */
  success: boolean;

  /** 检查的总键数 */
  totalKeysChecked: number;

  /** 发现的问题数量 */
  issuesFound: number;

  /** 自动修复的问题数量 */
  issuesFixed: number;

  /** 问题详情 */
  issues: Array<{
    key: string;
    type: 'corruption' | 'expiry' | 'format' | 'orphan';
    severity: 'low' | 'medium' | 'high';
    description: string;
    fixed?: boolean;
  }>;

  /** 数据质量评分 (0-100) */
  dataQualityScore: number;
}

/**
 * 备份选项
 */
export interface BackupOptions {
  /** 备份格式 */
  format?: 'json' | 'binary' | 'compressed';

  /** 是否包含元数据 */
  includeMetadata?: boolean;

  /** 备份特定键模式 */
  keyPattern?: string;

  /** 是否增量备份 */
  incremental?: boolean;

  /** 压缩级别 (1-9) */
  compressionLevel?: number;
}

/**
 * 备份结果
 */
export interface BackupResult {
  /** 备份是否成功 */
  success: boolean;

  /** 备份标识符 */
  backupId: string;

  /** 备份的键数量 */
  keyCount: number;

  /** 备份数据大小 (字节) */
  dataSize: number;

  /** 压缩后大小 (字节) */
  compressedSize?: number;

  /** 备份耗时 (毫秒) */
  duration: number;

  /** 备份元数据 */
  metadata: {
    timestamp: number;
    moduleType: string;
    version: string;
    configSnapshot: any;
  };
}

/**
 * 恢复选项
 */
export interface RestoreOptions {
  /** 是否覆盖现有键 */
  overwrite?: boolean;

  /** 键前缀过滤 */
  keyPrefix?: string;

  /** 并发恢复数 */
  concurrency?: number;

  /** 验证数据完整性 */
  validateIntegrity?: boolean;
}

/**
 * 恢复结果
 */
export interface RestoreResult {
  /** 恢复是否成功 */
  success: boolean;

  /** 处理的键数量 */
  totalKeysProcessed: number;

  /** 成功恢复的键数量 */
  keysRestored: number;

  /** 跳过的键数量 */
  keysSkipped: number;

  /** 失败的键数量 */
  keysFailed: number;

  /** 恢复耗时 (毫秒) */
  duration: number;

  /** 失败的键列表 */
  failedKeys: string[];
}

/**
 * 模块间事件接口
 */
export interface CacheModuleEvent {
  /** 事件类型 */
  type: 'config-change' | 'health-change' | 'performance-alert' | 'data-corruption' | 'custom';

  /** 事件源模块 */
  sourceModule: string;

  /** 事件时间戳 */
  timestamp: number;

  /** 事件数据 */
  data: any;

  /** 事件严重程度 */
  severity?: 'info' | 'warn' | 'error' | 'critical';

  /** 是否需要响应 */
  requiresResponse?: boolean;
}