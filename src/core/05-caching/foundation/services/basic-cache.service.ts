/**
 * Foundation层基础缓存服务
 * 实现统一的缓存服务接口，零依赖设计，基于Foundation配置
 */

import { Injectable, Logger } from '@nestjs/common';
import { MinimalCacheBase } from '../base/minimal-cache-base';
import {
  CacheServiceInterface,
  ModuleInitOptions,
  ModuleStatus,
  ImportOptions,
  ImportResult
} from '../types/cache-module.types';

import type {
  CacheUnifiedConfigInterface,
  CacheConfigValidationResult
} from '../types/cache-config.types';

import {
  BaseCacheResult,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheBatchResult,
  CacheStatsResult,
  CacheHealthResult,
  CacheStats,
  CacheOperationOptions,
  BatchOperationOptions,
} from '../types/cache-result.types';

import {
  MemoryUsage,
  ConnectionInfo,
} from '../types/cache-module.types';

import {
  CACHE_OPERATIONS,
  CACHE_STATUS,
  CACHE_ERROR_CODES
} from '../constants/cache-operations.constants';

import { CACHE_CORE_VALUES } from '../constants/core-values.constants';

/**
 * Foundation层基础缓存服务实现
 * 零依赖设计，专注于核心缓存功能
 * 现在继承自MinimalCacheBase，准备迁移到直接实现接口
 */
@Injectable()
export class BasicCacheService extends MinimalCacheBase {
  // Module metadata - Phase 6 requirements
  readonly moduleType = 'basic';
  readonly moduleCategory = 'foundation' as const;
  readonly name = 'basic-cache-foundation';
  readonly version = '1.0.0';

  // Service-specific properties
  config: CacheUnifiedConfigInterface;
  private stats: any; // Use any instead of readonly CacheStats for internal mutations
  private memoryStore: Map<string, any> = new Map();
  private ttlStore: Map<string, number> = new Map();
  private isDestroyed = false;

  constructor() {
    super('BasicCacheService');
    // Initialize with default config - will be overridden in initialize()
    this.config = {} as CacheUnifiedConfigInterface;
    this.initializeStats();
  }

  // ========================================
  // 模块生命周期管理
  // ========================================

  get description(): string {
    return 'Foundation layer basic cache service with zero dependencies';
  }

  async initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void> {
    try {
      this.config = config;

      // 初始化内存存储
      this.memoryStore.clear();
      this.ttlStore.clear();

      // 启动TTL清理定时器
      if (options?.enableHealthCheck !== false) {
        this.startTtlCleanupTimer();
      }

      this.moduleStatus = {
        status: 'ready',
        message: 'BasicCacheService initialized successfully',
        lastUpdated: Date.now(),
        startedAt: Date.now(),
      };

      this.logger.log(`BasicCacheService initialized with config: ${config.name}`);

      if (options?.onInitialized) {
        options.onInitialized();
      }

    } catch (error) {
      this.moduleStatus = {
        status: 'error',
        message: `Initialization failed: ${error.message}`,
        lastUpdated: Date.now(),
        error: error.message,
      };

      if (options?.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.memoryStore.clear();
    this.ttlStore.clear();

    this.moduleStatus = {
      status: 'destroyed',
      message: 'BasicCacheService destroyed',
      lastUpdated: Date.now(),
    };

    this.logger.log('BasicCacheService destroyed');
  }

  // getStatus() is inherited from MinimalCacheBase

  validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.name) {
      errors.push('Config name is required');
    }

    if (config.defaultTtlSeconds && config.defaultTtlSeconds <= 0) {
      errors.push('Default TTL must be positive');
    }

    if (config.performance?.maxMemoryMb && config.performance.maxMemoryMb < 64) {
      warnings.push('Max memory is very low, consider increasing it');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================
  // 基础缓存操作
  // ========================================

  async get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
    const startTime = Date.now();

    try {
      if (!this.isValidKey(key)) {
        throw new Error(`Invalid key format: ${key}`);
      }

      const hasKey = this.memoryStore.has(key);
      const isExpired = this.isKeyExpired(key);

      if (hasKey && !isExpired) {
        const data = this.memoryStore.get(key);
        const remainingTtl = this.getRemainingTtl(key);

        this.updateStats('hit');

        return {
          success: true,
          status: CACHE_STATUS.SUCCESS,
          operation: CACHE_OPERATIONS.GET,
          data,
          hit: true,
          remainingTtl,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          key,
        };
      } else {
        if (isExpired) {
          this.memoryStore.delete(key);
          this.ttlStore.delete(key);
        }

        this.updateStats('miss');

        return {
          success: true,
          status: CACHE_STATUS.SUCCESS,
          operation: CACHE_OPERATIONS.GET,
          hit: false,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          key,
        };
      }

    } catch (error) {
      this.updateStats('error');

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.GET,
        hit: false,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
    const startTime = Date.now();

    try {
      if (!this.isValidKey(key)) {
        throw new Error(`Invalid key format: ${key}`);
      }

      const serializedData = this.serializeValue(value);
      const dataSize = this.getDataSize(serializedData);

      if (dataSize > this.config.limits.maxValueSizeBytes) {
        throw new Error(`Value too large: ${dataSize} bytes exceeds limit`);
      }

      const replaced = this.memoryStore.has(key);
      const ttl = options?.ttl || this.config.defaultTtlSeconds;

      this.memoryStore.set(key, serializedData);
      this.ttlStore.set(key, Date.now() + (ttl * 1000));

      this.updateStats('set');

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: true,
        ttl,
        replaced,
        dataSize,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      this.updateStats('error');

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: false,
        ttl: 0,
        replaced: false,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    const startTime = Date.now();

    try {
      const existed = this.memoryStore.has(key);

      if (existed) {
        this.memoryStore.delete(key);
        this.ttlStore.delete(key);
      }

      this.updateStats('delete');

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.DELETE,
        data: existed,
        deletedCount: existed ? 1 : 0,
        deletedKeys: existed ? [key] : [],
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      this.updateStats('error');

      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.DELETE,
        data: false,
        deletedCount: 0,
        deletedKeys: [],
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    const startTime = Date.now();

    try {
      const exists = this.memoryStore.has(key) && !this.isKeyExpired(key);

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.EXISTS,
        data: exists,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.EXISTS,
        data: false,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    const startTime = Date.now();

    try {
      const remainingTtl = this.getRemainingTtl(key);

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.TTL,
        data: remainingTtl,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };

    } catch (error) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.TTL,
        data: -2,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  async expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    const startTime = Date.now();

    try {
      if (this.memoryStore.has(key)) {
        this.ttlStore.set(key, Date.now() + (ttl * 1000));

        return {
          success: true,
          status: CACHE_STATUS.SUCCESS,
          operation: CACHE_OPERATIONS.EXPIRE,
          data: true,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          key,
        };
      } else {
        return {
          success: true,
          status: CACHE_STATUS.SUCCESS,
          operation: CACHE_OPERATIONS.EXPIRE,
          data: false,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          key,
        };
      }

    } catch (error) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.EXPIRE,
        data: false,
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        key,
      };
    }
  }

  // ========================================
  // 批量操作 (简化实现)
  // ========================================

  async batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>> {
    const startTime = Date.now();
    const results: BaseCacheResult<T>[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const key of keys) {
      const result = await this.get<T>(key, options);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      status: failureCount === 0 ? CACHE_STATUS.SUCCESS : CACHE_STATUS.PARTIAL_HIT,
      operation: CACHE_OPERATIONS.BATCH_GET,
      data: results.map(r => r.data),
      successCount,
      failureCount,
      totalCount: keys.length,
      results,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  }

  async batchSet<T = any>(
    items: Array<{key: string, value: T, ttl?: number}>,
    options?: BatchOperationOptions
  ): Promise<CacheBatchResult<boolean>> {
    const startTime = Date.now();
    const results: BaseCacheResult<boolean>[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const item of items) {
      const result = await this.set(item.key, item.value, { ...options, ttl: item.ttl });
      results.push({
        success: result.success,
        status: result.status,
        operation: CACHE_OPERATIONS.SET,
        data: result.data,
        timestamp: result.timestamp,
        key: item.key,
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      status: failureCount === 0 ? CACHE_STATUS.SUCCESS : CACHE_STATUS.PARTIAL_HIT,
      operation: CACHE_OPERATIONS.BATCH_SET,
      data: results.map(r => r.data),
      successCount,
      failureCount,
      totalCount: items.length,
      results,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  }

  async batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
    const startTime = Date.now();
    const results: BaseCacheResult<boolean>[] = [];
    let successCount = 0;
    let failureCount = 0;
    const deletedKeys: string[] = [];

    for (const key of keys) {
      const result = await this.delete(key, options);
      results.push({
        success: result.success,
        status: result.status,
        operation: CACHE_OPERATIONS.DELETE,
        data: result.data,
        timestamp: result.timestamp,
        key,
      });

      if (result.success) {
        successCount++;
        if (result.data) {
          deletedKeys.push(key);
        }
      } else {
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      status: failureCount === 0 ? CACHE_STATUS.SUCCESS : CACHE_STATUS.PARTIAL_HIT,
      operation: CACHE_OPERATIONS.BATCH_DELETE,
      data: results.map(r => r.data),
      successCount,
      failureCount,
      totalCount: keys.length,
      results,
      failedKeys: results.filter(r => !r.success).map(r => r.key),
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  }

  async clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    const startTime = Date.now();

    try {
      let deletedKeys: string[] = [];

      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        deletedKeys = Array.from(this.memoryStore.keys()).filter(key => regex.test(key));
      } else {
        deletedKeys = Array.from(this.memoryStore.keys());
      }

      deletedKeys.forEach(key => {
        this.memoryStore.delete(key);
        this.ttlStore.delete(key);
      });

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.CLEAR,
        data: true,
        deletedCount: deletedKeys.length,
        deletedKeys,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.CLEAR,
        data: false,
        deletedCount: 0,
        deletedKeys: [],
        error: error.message,
        errorCode: CACHE_ERROR_CODES.OPERATION_FAILED,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  // ========================================
  // 高级操作 (基础实现)
  // ========================================

  async increment(key: string, increment?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    const inc = increment || 1;
    const current = await this.get<number>(key, options);
    const newValue = (current.data || 0) + inc;

    await this.set(key, newValue, options);

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.INCREMENT,
      data: newValue,
      timestamp: Date.now(),
      key,
    };
  }

  async decrement(key: string, decrement?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    return this.increment(key, -(decrement || 1), options);
  }

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    options?: CacheOperationOptions
  ): Promise<CacheGetResult<T>> {
    const existing = await this.get<T>(key, options);

    if (existing.hit) {
      return existing;
    }

    const value = await factory();
    await this.set(key, value, options);

    return this.get<T>(key, options);
  }

  async setIfNotExists<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
    const existing = await this.exists(key, options);

    if (existing.data) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: false,
        ttl: 0,
        replaced: false,
        timestamp: Date.now(),
        key,
        error: 'Key already exists',
      };
    }

    return this.set(key, value, options);
  }

  // ========================================
  // 监控和统计
  // ========================================

  async getStats(timeRangeMs?: number): Promise<CacheStatsResult> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: { ...this.stats },
      timeRangeMs: timeRangeMs || 0,
      collectionTime: Date.now(),
      timestamp: Date.now(),
    };
  }

  async resetStats(): Promise<BaseCacheResult<boolean>> {
    this.initializeStats();

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.CLEAR,
      data: true,
      timestamp: Date.now(),
    };
  }

  async getHealth(): Promise<CacheHealthResult> {
    const memoryUsage = this.getMemoryUsageSync();
    const isHealthy = memoryUsage.memoryUsageRatio < 0.9;

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: {
        connectionStatus: CACHE_STATUS.CONNECTED,
        memoryStatus: isHealthy ? 'healthy' : 'warning',
        performanceStatus: 'healthy',
        errorRateStatus: this.stats.errorRate < 0.01 ? 'healthy' : 'warning',
        lastCheckTime: Date.now(),
        uptimeMs: this.moduleStatus.startedAt ? Date.now() - this.moduleStatus.startedAt : 0,
      },
      checks: [
        {
          name: 'memory_usage',
          status: isHealthy ? 'pass' : 'warn',
          value: memoryUsage.memoryUsageRatio,
          threshold: 0.9,
          description: 'Memory usage ratio',
        },
        {
          name: 'error_rate',
          status: this.stats.errorRate < 0.01 ? 'pass' : 'warn',
          value: this.stats.errorRate,
          threshold: 0.01,
          description: 'Error rate threshold',
        }
      ],
      healthScore: isHealthy && this.stats.errorRate < 0.01 ? 100 : 75,
      timestamp: Date.now(),
    };
  }

  async getMemoryUsage(): Promise<BaseCacheResult<MemoryUsage>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: this.getMemoryUsageSync(),
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

  // ========================================
  // 扩展功能 (基础实现)
  // ========================================

  async refreshConfig(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {
    const merged = { ...this.config, ...newConfig };
    const validation = this.validateConfig(merged);

    if (!validation.isValid) {
      throw new Error(`Config validation failed: ${validation.errors.join(', ')}`);
    }

    this.config = merged as CacheUnifiedConfigInterface;
    this.logger.log('Config refreshed successfully');
  }

  async ping(): Promise<BaseCacheResult<number>> {
    const startTime = Date.now();

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  async getKeys(pattern?: string, limit?: number): Promise<BaseCacheResult<string[]>> {
    let keys = Array.from(this.memoryStore.keys());

    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      keys = keys.filter(key => regex.test(key));
    }

    if (limit && limit > 0) {
      keys = keys.slice(0, limit);
    }

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: keys,
      timestamp: Date.now(),
    };
  }

  async exportData(pattern?: string, format?: 'json' | 'csv'): Promise<BaseCacheResult<any>> {
    const keys = (await this.getKeys(pattern)).data;
    const data: Record<string, any> = {};

    for (const key of keys) {
      const result = await this.get(key);
      if (result.hit) {
        data[key] = result.data;
      }
    }

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: format === 'csv' ? this.toCsv(data) : data,
      timestamp: Date.now(),
    };
  }

  async importData(data: any, options?: ImportOptions): Promise<BaseCacheResult<ImportResult>> {
    const startTime = Date.now();
    let total = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const failedKeys: string[] = [];

    try {
      const entries = Object.entries(data);
      total = entries.length;

      for (const [key, value] of entries) {
        const finalKey = options?.keyPrefix ? `${options.keyPrefix}${key}` : key;

        if (options?.validator && !options.validator(finalKey, value)) {
          skipped++;
          continue;
        }

        if (!options?.overwrite && (await this.exists(finalKey)).data) {
          skipped++;
          continue;
        }

        const result = await this.set(finalKey, value, { ttl: options?.ttl });

        if (result.success) {
          successful++;
        } else {
          failed++;
          failedKeys.push(finalKey);
        }
      }

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.SET,
        data: {
          total,
          successful,
          failed,
          skipped,
          failedKeys,
          durationMs: Date.now() - startTime,
        },
        timestamp: Date.now(),
      };

    } catch (error) {
      return {
        success: false,
        status: CACHE_STATUS.ERROR,
        operation: CACHE_OPERATIONS.SET,
        data: {
          total,
          successful,
          failed,
          skipped,
          failedKeys,
          durationMs: Date.now() - startTime,
        },
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ========================================
  // 私有辅助方法
  // ========================================

  private initializeStats(): void {
    this.stats = {
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
      lastCleanupTime: Date.now(),
      lastResetTime: Date.now(),
    };
  }

  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete' | 'error'): void {
    this.stats.totalOperations++;

    switch (operation) {
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'error':
        this.stats.errorCount++;
        break;
    }

    this.stats.hitRate = this.stats.totalOperations > 0
      ? this.stats.hits / this.stats.totalOperations
      : 0;

    this.stats.errorRate = this.stats.totalOperations > 0
      ? this.stats.errorCount / this.stats.totalOperations
      : 0;

    this.stats.keyCount = this.memoryStore.size;

    const memoryUsage = this.getMemoryUsageSync();
    this.stats.memoryUsageBytes = memoryUsage.usedMemoryBytes;
    this.stats.memoryUsageRatio = memoryUsage.memoryUsageRatio;
  }

  private isValidKey(key: string): boolean {
    if (!key) return false;
    const maxLength = this.config?.limits?.maxKeyLength || CACHE_CORE_VALUES.MAX_KEY_LENGTH;
    return key.length <= maxLength;
  }

  private isKeyExpired(key: string): boolean {
    const expireTime = this.ttlStore.get(key);
    return expireTime ? Date.now() > expireTime : false;
  }

  private getRemainingTtl(key: string): number {
    const expireTime = this.ttlStore.get(key);
    if (!expireTime) return -1; // No expiration

    const remaining = Math.max(0, Math.ceil((expireTime - Date.now()) / 1000));
    return remaining > 0 ? remaining : -2; // Key expired
  }

  private serializeValue(value: any): any {
    // 简单序列化，生产环境应该使用更robust的序列化方案
    return value;
  }

  private getDataSize(data: any): number {
    // 简单估算，生产环境应该使用更准确的计算方法
    return JSON.stringify(data).length;
  }

  private getMemoryUsageSync(): MemoryUsage {
    const usedMemoryBytes = this.memoryStore.size * 100; // 简单估算
    const totalMemoryBytes = (this.config?.performance?.maxMemoryMb || 512) * 1024 * 1024;

    return {
      usedMemoryBytes,
      totalMemoryBytes,
      memoryUsageRatio: usedMemoryBytes / totalMemoryBytes,
      keyCount: this.memoryStore.size,
      avgKeySize: this.memoryStore.size > 0 ? usedMemoryBytes / this.memoryStore.size : 0,
    };
  }

  private startTtlCleanupTimer(): void {
    const cleanupInterval = this.config?.intervals?.cleanupIntervalMs || 30000;

    setInterval(() => {
      if (this.isDestroyed) return;

      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, expireTime] of this.ttlStore.entries()) {
        if (now > expireTime) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => {
        this.memoryStore.delete(key);
        this.ttlStore.delete(key);
      });

      if (expiredKeys.length > 0) {
        this.logger.debug(`Cleaned up ${expiredKeys.length} expired keys`);
      }

      this.stats.lastCleanupTime = now;
    }, cleanupInterval);
  }

  private toCsv(data: Record<string, any>): string {
    const entries = Object.entries(data);
    if (entries.length === 0) return '';

    const header = 'key,value\n';
    const rows = entries.map(([key, value]) =>
      `${key},"${JSON.stringify(value).replace(/"/g, '""')}"`
    ).join('\n');

    return header + rows;
  }
}