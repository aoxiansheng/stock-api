/**
 * 最小化缓存基类
 * Phase 9.2: 用于替代AbstractStandardCacheModule的临时基类
 *
 * 这是一个过渡性的基类，提供最小化的默认实现，
 * 帮助foundation层的服务逐步迁移到直接实现接口。
 */

import { Logger } from '@nestjs/common';
import {
  StandardCacheModuleInterface,
  CachePerformanceMetrics,
  CacheCapacityInfo,
  CacheErrorStatistics,
  DiagnosticsResult,
  SelfHealingResult,
} from '../interfaces/standard-cache-module.interface';

import {
  CacheServiceInterface,
  ModuleStatus,
  ModuleInitOptions,
  MemoryUsage,
  ConnectionInfo,
  ImportOptions,
  ImportResult,
} from '../types/cache-module.types';

import {
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

import {
  CACHE_STATUS,
  CACHE_OPERATIONS,
  CACHE_ERROR_CODES,
} from '../constants/cache-operations.constants';

/**
 * 最小化缓存基类实现
 */
export abstract class MinimalCacheBase implements StandardCacheModuleInterface, CacheServiceInterface {
  protected readonly logger: Logger;
  protected moduleStatus: ModuleStatus;
  protected errorHistory: Array<{ timestamp: number; error: any }> = [];
  protected performanceHistory: Array<{ operation: string; duration: number }> = [];

  // 抽象属性 - 子类必须实现
  abstract readonly moduleType: string;
  abstract readonly moduleCategory: 'foundation' | 'specialized' | 'orchestrator';
  abstract readonly name: string;
  abstract readonly version: string;
  abstract config: CacheUnifiedConfigInterface;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
    this.moduleStatus = {
      status: 'initializing',
      message: `${serviceName} is initializing...`,
      lastUpdated: Date.now(),
    };
  }

  // 基本属性的默认实现
  get isInitialized(): boolean {
    return this.moduleStatus.status === 'ready';
  }

  get isHealthy(): boolean {
    return this.moduleStatus.status === 'ready';
  }

  get supportedFeatures(): string[] {
    return ['get', 'set', 'delete', 'exists', 'ttl', 'expire'];
  }

  get dependencies(): string[] {
    return [];
  }

  get priority(): number {
    return 5; // 中等优先级
  }

  get description(): string {
    return `${this.name} cache module`;
  }

  // 状态获取
  getStatus(): ModuleStatus {
    return this.moduleStatus;
  }

  // 抽象方法 - 子类必须实现
  abstract initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void>;
  abstract destroy(): Promise<void>;
  abstract get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>>;
  abstract set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult>;
  abstract delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult>;
  abstract exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>>;
  abstract ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>>;
  abstract expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>>;
  abstract clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult>;

  // 可选方法的默认实现
  async increment(key: string, delta: number = 1, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    const result = await this.get<number>(key, options);
    const currentValue = result.data || 0;
    const newValue = currentValue + delta;
    await this.set(key, newValue, options);
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: newValue,
      timestamp: Date.now(),
    };
  }

  async decrement(key: string, delta: number = 1, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    return this.increment(key, -delta, options);
  }

  async setIfNotExists(key: string, value: any, options?: CacheOperationOptions): Promise<CacheSetResult> {
    const exists = await this.exists(key);
    if (exists.data) {
      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: false,
        ttl: 0,
        replaced: false,
        timestamp: Date.now(),
        duration: 0,
        key,
      };
    }
    return this.set(key, value, options);
  }

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOperationOptions
  ): Promise<CacheGetResult<T>> {
    const result = await this.get<T>(key, options);
    if (result.hit) {
      return result;
    }
    const value = await factory();
    await this.set(key, value, options);
    return {
      success: true,
      status: CACHE_STATUS.MISS,
      operation: CACHE_OPERATIONS.GET,
      data: value,
      hit: false,
      cacheLevel: 'factory',
      remainingTtl: options?.ttl || 0,
      timestamp: Date.now(),
      duration: 0,
      key,
    };
  }

  // 批处理操作的默认实现
  async batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>> {
    const results: BaseCacheResult<T>[] = [];
    for (const key of keys) {
      const result = await this.get<T>(key, options);
      results.push({
        success: result.success,
        status: result.status,
        operation: result.operation,
        data: result.data,
        timestamp: result.timestamp,
        key,
      });
    }
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: results.map(r => r.data),
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalCount: keys.length,
      timestamp: Date.now(),
      duration: 0,
    };
  }

  async batchSet<T = any>(items: Array<{ key: string; value: T; ttl?: number }>, options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    const results: BaseCacheResult<boolean>[] = [];
    for (const item of items) {
      const result = await this.set(item.key, item.value, { ...options, ttl: item.ttl });
      results.push({
        success: result.success,
        status: result.status,
        operation: result.operation,
        data: result.data,
        timestamp: result.timestamp,
        key: result.key,
      });
    }
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: results.map(r => r.data),
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalCount: items.length,
      timestamp: Date.now(),
      duration: 0,
    };
  }

  async batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    const results: BaseCacheResult<boolean>[] = [];
    for (const key of keys) {
      const result = await this.delete(key, options);
      results.push({
        success: result.success,
        status: result.status,
        operation: result.operation,
        data: result.data,
        timestamp: result.timestamp,
        key: result.key,
      });
    }
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.DELETE,
      data: results.map(r => r.data),
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalCount: keys.length,
      timestamp: Date.now(),
      duration: 0,
    };
  }

  // 监控和健康检查的默认实现
  async getStats(timeRangeMs?: number): Promise<CacheStatsResult> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalOperations: 0,
        keyCount: 0,
        memoryUsageBytes: 0,
        memoryUsageRatio: 0,
        avgResponseTimeMs: 0,
        errorCount: 0,
        errorRate: 0,
        lastResetTime: Date.now(),
        lastCleanupTime: Date.now(),
      },
      timeRangeMs: timeRangeMs || 0,
      collectionTime: Date.now(),
      timestamp: Date.now(),
    };
  }

  async resetStats(): Promise<BaseCacheResult<boolean>> {
    this.errorHistory = [];
    this.performanceHistory = [];
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: true,
      timestamp: Date.now(),
    };
  }

  async getHealth(): Promise<CacheHealthResult> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        connectionStatus: CACHE_STATUS.CONNECTED,
        memoryStatus: 'healthy',
        performanceStatus: 'healthy',
        errorRateStatus: 'healthy',
        lastCheckTime: Date.now(),
        uptimeMs: this.moduleStatus.startedAt ? Date.now() - this.moduleStatus.startedAt : 0,
      },
      checks: [],
      healthScore: 100,
      timestamp: Date.now(),
    };
  }

  async getMemoryUsage(): Promise<BaseCacheResult<MemoryUsage>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        usedMemoryBytes: 0,
        totalMemoryBytes: 0,
        memoryUsageRatio: 0,
        keyCount: 0,
        avgKeySize: 0,
      },
      timestamp: Date.now(),
    };
  }

  async getConnectionInfo(): Promise<BaseCacheResult<ConnectionInfo>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        status: 'connected',
        address: 'memory',
        port: 0,
        connectedAt: this.moduleStatus.startedAt,
        lastHeartbeat: Date.now(),
        latencyMs: 0,
      },
      timestamp: Date.now(),
    };
  }

  // 配置管理的默认实现
  getModuleSpecificConfig<T = any>(): T {
    return this.config as T;
  }

  validateModuleSpecificConfig<T = any>(config: T): CacheConfigValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async applyConfigUpdate(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
  }

  validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async refreshConfig(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    await this.applyConfigUpdate(newConfig);
  }

  // 数据导入导出的默认实现
  async ping(): Promise<BaseCacheResult<number>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: 0,
      timestamp: Date.now(),
    };
  }

  async getKeys(pattern?: string, limit?: number): Promise<BaseCacheResult<string[]>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: [],
      timestamp: Date.now(),
    };
  }

  async exportData(pattern?: string, format?: 'json' | 'csv'): Promise<BaseCacheResult<any>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {},
      timestamp: Date.now(),
    };
  }

  async importData(data: any, options?: ImportOptions): Promise<BaseCacheResult<ImportResult>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
      },
      timestamp: Date.now(),
    };
  }

  // 高级监控的默认实现
  async getPerformanceMetrics(): Promise<CachePerformanceMetrics> {
    return {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      hitRate: 0,
      errorRate: 0,
      memoryEfficiency: 0,
    };
  }

  async getCapacityInfo(): Promise<CacheCapacityInfo> {
    return {
      currentKeys: 0,
      maxKeys: 0,
      keyUtilization: 0,
      currentMemory: 0,
      maxMemory: 0,
      memoryUtilization: 0,
      estimatedRemainingCapacity: {
        keys: 0,
        memoryBytes: 0,
        estimatedFullInMs: -1,
      },
    };
  }

  async getErrorStatistics(): Promise<CacheErrorStatistics> {
    return {
      totalErrors: this.errorHistory.length,
      errorsByType: {},
      errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      recentErrors: [],
      errorTrend: [],
    };
  }

  async runDiagnostics(): Promise<DiagnosticsResult> {
    return {
      overallHealthScore: 100,
      checks: [],
      issues: [],
    };
  }

  // 辅助方法
  protected recordError(error: any, context?: any): void {
    this.errorHistory.push({ timestamp: Date.now(), error });
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }
    this.logger.error(`Cache operation error: ${error.message}`, error.stack);
  }

  protected recordPerformance(operation: string, duration: number, success?: boolean): void {
    this.performanceHistory.push({ operation, duration });
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }
}