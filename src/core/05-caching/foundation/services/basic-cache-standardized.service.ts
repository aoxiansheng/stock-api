/**
 * 标准化的BasicCacheService实现
 * Phase 6: 继承自MinimalCacheBase，只实现核心缓存方法
 *
 * 这个版本展示了如何使用标准化接口重构现有缓存服务
 */

import { Injectable } from '@nestjs/common';
import { MinimalCacheBase } from '../base/minimal-cache-base';

import type {
  CacheUnifiedConfigInterface,
  CacheConfigValidationResult,
} from '../types/cache-config.types';

import {
  BaseCacheResult,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheStatsResult,
  CacheHealthResult,
  CacheOperationOptions,
  CacheStats,
} from '../types/cache-result.types';

import {
  ModuleInitOptions,
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
 * 标准化BasicCacheService - Phase 6重构版本
 * 零依赖内存缓存实现，遵循StandardCacheModuleInterface规范
 */
@Injectable()
export class StandardizedBasicCacheService extends MinimalCacheBase {
  // ========================================
  // Phase 6 标准化模块元数据
  // ========================================

  readonly moduleType = 'basic';
  readonly moduleCategory = 'foundation' as const;
  readonly name = 'standardized-basic-cache';
  readonly version = '2.0.0';

  get description(): string {
    return 'Standardized foundation layer basic cache service with zero dependencies';
  }

  get supportedFeatures(): string[] {
    return [
      'get', 'set', 'delete', 'exists', 'ttl', 'expire',
      'batch-operations', 'advanced-operations', 'health-check',
      'statistics', 'memory-management', 'ttl-cleanup'
    ];
  }

  get priority(): number {
    return 1; // 最高优先级 - 基础服务
  }

  // ========================================
  // 服务特定属性
  // ========================================

  config: CacheUnifiedConfigInterface;
  private stats: any; // Use any for mutable stats instead of readonly CacheStats
  private memoryStore = new Map<string, any>();
  private ttlStore = new Map<string, number>();
  private isDestroyed = false;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    super('StandardizedBasicCacheService');
    this.config = {} as CacheUnifiedConfigInterface;
    this.initializeStats();
  }

  // ========================================
  // 核心缓存方法实现 (必须实现)
  // ========================================

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
        message: 'StandardizedBasicCacheService initialized successfully',
        lastUpdated: Date.now(),
        startedAt: Date.now(),
      };

      this.logger.log(`StandardizedBasicCacheService initialized with config: ${config.name}`);

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

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.memoryStore.clear();
    this.ttlStore.clear();

    this.moduleStatus = {
      status: 'destroyed',
      message: 'StandardizedBasicCacheService destroyed',
      lastUpdated: Date.now(),
    };

    this.logger.log('StandardizedBasicCacheService destroyed');
  }

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
        this.recordPerformance('get', Date.now() - startTime, true);

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
        this.recordPerformance('get', Date.now() - startTime, true);

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
      this.recordError(error, { operation: 'get', key });
      this.recordPerformance('get', Date.now() - startTime, false);

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
      this.recordPerformance('set', Date.now() - startTime, true);

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
      this.recordError(error, { operation: 'set', key });
      this.recordPerformance('set', Date.now() - startTime, false);

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
      this.recordPerformance('delete', Date.now() - startTime, true);

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
      this.recordError(error, { operation: 'delete', key });
      this.recordPerformance('delete', Date.now() - startTime, false);

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
      this.recordPerformance('exists', Date.now() - startTime, true);

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
      this.recordError(error, { operation: 'exists', key });
      this.recordPerformance('exists', Date.now() - startTime, false);

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
      this.recordPerformance('ttl', Date.now() - startTime, true);

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
      this.recordError(error, { operation: 'ttl', key });
      this.recordPerformance('ttl', Date.now() - startTime, false);

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
        this.recordPerformance('expire', Date.now() - startTime, true);

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
        this.recordPerformance('expire', Date.now() - startTime, true);

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
      this.recordError(error, { operation: 'expire', key, ttl });
      this.recordPerformance('expire', Date.now() - startTime, false);

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

      const duration = Date.now() - startTime;
      this.recordPerformance('clear', duration, true);

      return {
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.CLEAR,
        data: true,
        deletedCount: deletedKeys.length,
        deletedKeys,
        timestamp: Date.now(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError(error, { operation: 'clear', pattern });
      this.recordPerformance('clear', duration, false);

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
        duration,
      };
    }
  }

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
  // Phase 6 增强方法重写
  // ========================================

  async getStats(timeRangeMs?: number): Promise<CacheStatsResult> {
    const stats = { ...this.stats };

    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: stats,
      timeRangeMs: timeRangeMs || 0,
      collectionTime: Date.now(),
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
  // 模块特定配置管理 (Phase 6)
  // ========================================

  getModuleSpecificConfig(): any {
    return {
      memoryStoreSize: this.memoryStore.size,
      ttlStoreSize: this.ttlStore.size,
      cleanupInterval: this.config.intervals?.cleanupIntervalMs || 30000,
      memoryThreshold: this.config.limits?.maxCacheEntries || 10000,
    };
  }

  validateModuleSpecificConfig(config: any): CacheConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.memoryThreshold && config.memoryThreshold < 100) {
      warnings.push('Memory threshold is very low');
    }

    if (config.cleanupInterval && config.cleanupInterval < 1000) {
      errors.push('Cleanup interval too short (minimum 1000ms)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
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

    this.cleanupTimer = setInterval(() => {
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
}