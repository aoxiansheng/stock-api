import { Test, TestingModule } from '@nestjs/testing';
import { MinimalCacheBase } from '@core/05-caching/foundation/base/minimal-cache-base';
import { CacheUnifiedConfigInterface } from '@core/05-caching/foundation/types/cache-config.types';
import { CACHE_STATUS, CACHE_OPERATIONS } from '@core/05-caching/foundation/constants/cache-operations.constants';
import {
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  BaseCacheResult,
  CacheOperationOptions,
  BatchOperationOptions,
} from '@core/05-caching/foundation/types/cache-result.types';
import { ModuleInitOptions } from '@core/05-caching/foundation/types/cache-module.types';

class TestMinimalCacheBase extends MinimalCacheBase {
  moduleType = 'test';
  moduleCategory: 'foundation' = 'foundation';
  name = 'TestCache';
  version = '1.0.0';
  config: CacheUnifiedConfigInterface = {
    name: 'TestCache',
    defaultTtlSeconds: 300,
    maxTtlSeconds: 3600,
    minTtlSeconds: 1,
    compressionEnabled: true,
    compressionThresholdBytes: 1024,
    metricsEnabled: true,
    performanceMonitoringEnabled: true,
    ttl: {
      realTimeTtlSeconds: 5,
      nearRealTimeTtlSeconds: 30,
      batchQueryTtlSeconds: 300,
      offHoursTtlSeconds: 3600,
      weekendTtlSeconds: 7200,
    },
    performance: {
      maxMemoryMb: 128,
      defaultBatchSize: 100,
      maxConcurrentOperations: 10,
      slowOperationThresholdMs: 1000,
      connectionTimeoutMs: 5000,
      operationTimeoutMs: 5000,
    },
    intervals: {
      cleanupIntervalMs: 60000,
      healthCheckIntervalMs: 30000,
      metricsCollectionIntervalMs: 10000,
      statsLogIntervalMs: 300000,
      heartbeatIntervalMs: 30000,
    },
    limits: {
      maxKeyLength: 250,
      maxValueSizeBytes: 1048576,
      maxCacheEntries: 10000,
      memoryThresholdRatio: 0.8,
      errorRateAlertThreshold: 0.01,
    },
    retry: {
      maxRetryAttempts: 3,
      baseRetryDelayMs: 100,
      retryDelayMultiplier: 2,
      maxRetryDelayMs: 5000,
      exponentialBackoffEnabled: true,
    },
  };

  async initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void> {
    this.config = config;
    this.moduleStatus = {
      status: 'ready',
      message: 'Test cache initialized',
      lastUpdated: Date.now(),
      startedAt: Date.now(),
    };
  }

  async destroy(): Promise<void> {
    this.moduleStatus = {
      status: 'destroyed',
      message: 'Test cache destroyed',
      lastUpdated: Date.now(),
    };
  }

  async get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
    return {
      success: true,
      status: CACHE_STATUS.HIT,
      operation: CACHE_OPERATIONS.GET,
      data: ('test-value' as unknown) as T,
      hit: true,
      cacheLevel: 'L1',
      remainingTtl: 300,
      timestamp: Date.now(),
      duration: 10,
      key,
    };
  }

  async set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: true,
      ttl: options?.ttl || 300,
      replaced: false,
      timestamp: Date.now(),
      duration: 5,
      key,
    };
  }

  async delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.DELETE,
      data: true,
      deletedCount: 1,
      timestamp: Date.now(),
      duration: 3,
      key,
    };
  }

  async exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: true,
      timestamp: Date.now(),
    };
  }

  async ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.GET,
      data: 300,
      timestamp: Date.now(),
    };
  }

  async expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.SET,
      data: true,
      timestamp: Date.now(),
    };
  }

  async clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
    return {
      success: true,
      status: CACHE_STATUS.SUCCESS,
      operation: CACHE_OPERATIONS.DELETE,
      data: true,
      deletedCount: 10,
      timestamp: Date.now(),
      duration: 50,
      key: pattern || '*',
    };
  }
}

describe('MinimalCacheBase', () => {
  let cache: TestMinimalCacheBase;
  let mockConfig: CacheUnifiedConfigInterface;

  beforeEach(async () => {
    mockConfig = {
      name: 'TestCache',
      defaultTtlSeconds: 300,
      maxTtlSeconds: 3600,
      minTtlSeconds: 1,
      compressionEnabled: true,
      compressionThresholdBytes: 1024,
      metricsEnabled: true,
      performanceMonitoringEnabled: true,
      ttl: {
        realTimeTtlSeconds: 5,
        nearRealTimeTtlSeconds: 30,
        batchQueryTtlSeconds: 300,
        offHoursTtlSeconds: 3600,
        weekendTtlSeconds: 7200,
      },
      performance: {
        maxMemoryMb: 128,
        defaultBatchSize: 100,
        maxConcurrentOperations: 10,
        slowOperationThresholdMs: 1000,
        connectionTimeoutMs: 5000,
        operationTimeoutMs: 5000,
      },
      intervals: {
        cleanupIntervalMs: 60000,
        healthCheckIntervalMs: 30000,
        metricsCollectionIntervalMs: 10000,
        statsLogIntervalMs: 300000,
        heartbeatIntervalMs: 30000,
      },
      limits: {
        maxKeyLength: 250,
        maxValueSizeBytes: 1048576,
        maxCacheEntries: 10000,
        memoryThresholdRatio: 0.8,
        errorRateAlertThreshold: 0.01,
      },
      retry: {
        maxRetryAttempts: 3,
        baseRetryDelayMs: 100,
        retryDelayMultiplier: 2,
        maxRetryDelayMs: 5000,
        exponentialBackoffEnabled: true,
      },
    };

    cache = new TestMinimalCacheBase('TestCache');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Properties and Status', () => {
    it('should initialize with correct properties', () => {
      expect(cache.moduleType).toBe('test');
      expect(cache.moduleCategory).toBe('foundation');
      expect(cache.name).toBe('TestCache');
      expect(cache.version).toBe('1.0.0');
      expect(cache.priority).toBe(5);
      expect(cache.description).toBe('TestCache cache module');
    });

    it('should start with initializing status', () => {
      const status = cache.getStatus();
      expect(status.status).toBe('initializing');
      expect(status.message).toContain('TestCache is initializing');
      expect(status.lastUpdated).toBeDefined();
    });

    it('should report not initialized and not healthy initially', () => {
      expect(cache.isInitialized).toBe(false);
      expect(cache.isHealthy).toBe(false);
    });

    it('should have correct supported features', () => {
      expect(cache.supportedFeatures).toEqual(['get', 'set', 'delete', 'exists', 'ttl', 'expire']);
    });

    it('should have empty dependencies by default', () => {
      expect(cache.dependencies).toEqual([]);
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await cache.initialize(mockConfig);

      expect(cache.isInitialized).toBe(true);
      expect(cache.isHealthy).toBe(true);
      expect(cache.config).toEqual(mockConfig);

      const status = cache.getStatus();
      expect(status.status).toBe('ready');
      expect(status.startedAt).toBeDefined();
    });

    it('should destroy successfully', async () => {
      await cache.initialize(mockConfig);
      await cache.destroy();

      const status = cache.getStatus();
      expect(status.status).toBe('destroyed');
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should get value successfully', async () => {
      const result = await cache.get('test-key');

      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.data).toBe('test-value');
      expect(result.key).toBe('test-key');
      expect(result.cacheLevel).toBe('L1');
    });

    it('should set value successfully', async () => {
      const result = await cache.set('test-key', 'test-value');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.key).toBe('test-key');
      expect(result.ttl).toBe(300);
      expect(result.replaced).toBe(false);
    });

    it('should set value with custom TTL', async () => {
      const result = await cache.set('test-key', 'test-value', { ttl: 600 });

      expect(result.success).toBe(true);
      expect(result.ttl).toBe(600);
    });

    it('should delete value successfully', async () => {
      const result = await cache.delete('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.key).toBe('test-key');
    });

    it('should check if key exists', async () => {
      const result = await cache.exists('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should get TTL for key', async () => {
      const result = await cache.ttl('test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe(300);
    });

    it('should set expiration for key', async () => {
      const result = await cache.expire('test-key', 600);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should clear cache', async () => {
      const result = await cache.clear();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.deletedCount).toBe(10);
    });

    it('should clear cache with pattern', async () => {
      const result = await cache.clear('test:*');

      expect(result.success).toBe(true);
      expect(result.key).toBe('test:*');
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should increment value', async () => {
      const result = await cache.increment('counter');

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // 0 + 1
    });

    it('should increment with custom delta', async () => {
      const result = await cache.increment('counter', 5);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should decrement value', async () => {
      const result = await cache.decrement('counter');

      expect(result.success).toBe(true);
      expect(result.data).toBe(-1); // 0 - 1
    });

    it('should decrement with custom delta', async () => {
      const result = await cache.decrement('counter', 3);

      expect(result.success).toBe(true);
      expect(result.data).toBe(-3);
    });

    it('should set if not exists when key does not exist', async () => {
      // Mock exists to return false
      const originalExists = cache.exists;
      cache.exists = jest.fn().mockResolvedValue({
        success: true,
        status: CACHE_STATUS.SUCCESS,
        operation: CACHE_OPERATIONS.GET,
        data: false,
        timestamp: Date.now(),
      });

      const result = await cache.setIfNotExists('new-key', 'new-value');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      // Restore original method
      cache.exists = originalExists;
    });

    it('should not set if key already exists', async () => {
      const result = await cache.setIfNotExists('existing-key', 'new-value');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(result.replaced).toBe(false);
    });

    it('should get or set when cache hit', async () => {
      const factory = jest.fn().mockResolvedValue('factory-value');
      const result = await cache.getOrSet('test-key', factory);

      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.data).toBe('test-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should get or set when cache miss', async () => {
      // Mock get to return miss
      const originalGet = cache.get;
      cache.get = jest.fn().mockResolvedValue({
        success: true,
        status: CACHE_STATUS.MISS,
        operation: CACHE_OPERATIONS.GET,
        data: null,
        hit: false,
        cacheLevel: 'none',
        remainingTtl: 0,
        timestamp: Date.now(),
        duration: 0,
        key: 'test-key',
      });

      const factory = jest.fn().mockResolvedValue('factory-value');
      const result = await cache.getOrSet('test-key', factory);

      expect(result.success).toBe(true);
      expect(result.hit).toBe(false);
      expect(result.data).toBe('factory-value');
      expect(result.cacheLevel).toBe('factory');
      expect(factory).toHaveBeenCalled();

      // Restore original method
      cache.get = originalGet;
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should perform batch get', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const result = await cache.batchGet(keys);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.totalCount).toBe(3);
    });

    it('should perform batch set', async () => {
      const items = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2', ttl: 600 },
        { key: 'key3', value: 'value3' },
      ];
      const result = await cache.batchSet(items);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.totalCount).toBe(3);
    });

    it('should perform batch delete', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const result = await cache.batchDelete(keys);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.totalCount).toBe(3);
    });
  });

  describe('Monitoring and Health', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should get cache statistics', async () => {
      const result = await cache.getStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.hits).toBe(0);
      expect(result.data.misses).toBe(0);
      expect(result.data.hitRate).toBe(0);
      expect(result.data.totalOperations).toBe(0);
      expect(result.data.keyCount).toBe(0);
      expect(result.data.memoryUsageBytes).toBe(0);
      expect(result.data.errorCount).toBe(0);
      expect(result.data.errorRate).toBe(0);
    });

    it('should get cache statistics with time range', async () => {
      const result = await cache.getStats(60000);

      expect(result.success).toBe(true);
      expect(result.timeRangeMs).toBe(60000);
    });

    it('should reset statistics', async () => {
      // Add some error history first
      (cache as any).recordError(new Error('Test error'));
      expect((cache as any).errorHistory).toHaveLength(1);

      const result = await cache.resetStats();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect((cache as any).errorHistory).toHaveLength(0);
      expect((cache as any).performanceHistory).toHaveLength(0);
    });

    it('should get health status', async () => {
      const result = await cache.getHealth();

      expect(result.success).toBe(true);
      expect(result.data.connectionStatus).toBe(CACHE_STATUS.CONNECTED);
      expect(result.data.memoryStatus).toBe('healthy');
      expect(result.data.performanceStatus).toBe('healthy');
      expect(result.data.errorRateStatus).toBe('healthy');
      expect(result.data.lastCheckTime).toBeDefined();
      expect(result.data.uptimeMs).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBe(100);
      expect(result.checks).toEqual([]);
    });

    it('should get memory usage', async () => {
      const result = await cache.getMemoryUsage();

      expect(result.success).toBe(true);
      expect(result.data.usedMemoryBytes).toBe(0);
      expect(result.data.totalMemoryBytes).toBe(0);
      expect(result.data.memoryUsageRatio).toBe(0);
      expect(result.data.keyCount).toBe(0);
      expect(result.data.avgKeySize).toBe(0);
    });

    it('should get connection info', async () => {
      const result = await cache.getConnectionInfo();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('connected');
      expect(result.data.address).toBe('memory');
      expect(result.data.port).toBe(0);
      expect(result.data.connectedAt).toBeDefined();
      expect(result.data.lastHeartbeat).toBeDefined();
      expect(result.data.latencyMs).toBe(0);
    });

    it('should ping successfully', async () => {
      const result = await cache.ping();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should get keys', async () => {
      const result = await cache.getKeys();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should get keys with pattern and limit', async () => {
      const result = await cache.getKeys('test:*', 100);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('Data Import/Export', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should export data', async () => {
      const result = await cache.exportData();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should export data with pattern and format', async () => {
      const result = await cache.exportData('test:*', 'json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should import data', async () => {
      const testData = { 'key1': 'value1', 'key2': 'value2' };
      const result = await cache.importData(testData);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(0);
      expect(result.data.successful).toBe(0);
      expect(result.data.failed).toBe(0);
      expect(result.data.skipped).toBe(0);
      expect(result.data.durationMs).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should get performance metrics', async () => {
      const result = await cache.getPerformanceMetrics();

      expect(result.avgResponseTime).toBe(0);
      expect(result.p95ResponseTime).toBe(0);
      expect(result.p99ResponseTime).toBe(0);
      expect(result.throughput).toBe(0);
      expect(result.hitRate).toBe(0);
      expect(result.errorRate).toBe(0);
      expect(result.memoryEfficiency).toBe(0);
    });

    it('should get capacity info', async () => {
      const result = await cache.getCapacityInfo();

      expect(result.currentKeys).toBe(0);
      expect(result.maxKeys).toBe(0);
      expect(result.keyUtilization).toBe(0);
      expect(result.currentMemory).toBe(0);
      expect(result.maxMemory).toBe(0);
      expect(result.memoryUtilization).toBe(0);
      expect(result.estimatedRemainingCapacity.keys).toBe(0);
      expect(result.estimatedRemainingCapacity.memoryBytes).toBe(0);
      expect(result.estimatedRemainingCapacity.estimatedFullInMs).toBe(-1);
    });

    it('should get error statistics', async () => {
      const result = await cache.getErrorStatistics();

      expect(result.totalErrors).toBe(0);
      expect(result.errorsByType).toEqual({});
      expect(result.errorsBySeverity.low).toBe(0);
      expect(result.errorsBySeverity.medium).toBe(0);
      expect(result.errorsBySeverity.high).toBe(0);
      expect(result.errorsBySeverity.critical).toBe(0);
      expect(result.recentErrors).toEqual([]);
      expect(result.errorTrend).toEqual([]);
    });

    it('should run diagnostics', async () => {
      const result = await cache.runDiagnostics();

      expect(result.overallHealthScore).toBe(100);
      expect(result.checks).toEqual([]);
      expect(result.issues).toEqual([]);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should get module specific config', () => {
      const config = cache.getModuleSpecificConfig();

      expect(config).toEqual(mockConfig);
    });

    it('should validate module specific config', () => {
      const result = cache.validateModuleSpecificConfig(mockConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should apply config update', async () => {
      const newConfig = {
        ttl: {
          realTimeTtlSeconds: 10,
          nearRealTimeTtlSeconds: 60,
          batchQueryTtlSeconds: 600,
          offHoursTtlSeconds: 3600,
          weekendTtlSeconds: 7200,
        }
      };
      await cache.applyConfigUpdate(newConfig);

      expect(cache.config.ttl.realTimeTtlSeconds).toBe(10);
    });

    it('should validate config', () => {
      const result = cache.validateConfig({
        ttl: {
          realTimeTtlSeconds: 10,
          nearRealTimeTtlSeconds: 60,
          batchQueryTtlSeconds: 600,
          offHoursTtlSeconds: 3600,
          weekendTtlSeconds: 7200,
        }
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should refresh config', async () => {
      const newConfig = {
        ttl: {
          realTimeTtlSeconds: 15,
          nearRealTimeTtlSeconds: 90,
          batchQueryTtlSeconds: 900,
          offHoursTtlSeconds: 3600,
          weekendTtlSeconds: 7200,
        },
        compressionThresholdBytes: 2048
      };
      await cache.refreshConfig(newConfig);

      expect(cache.config.ttl.realTimeTtlSeconds).toBe(15);
      expect(cache.config.compressionThresholdBytes).toBe(2048);
    });
  });

  describe('Error Handling and Performance Tracking', () => {
    beforeEach(async () => {
      await cache.initialize(mockConfig);
    });

    it('should record error properly', () => {
      const testError = new Error('Test error message');
      (cache as any).recordError(testError);

      expect((cache as any).errorHistory).toHaveLength(1);
      expect((cache as any).errorHistory[0].error).toBe(testError);
      expect((cache as any).errorHistory[0].timestamp).toBeDefined();
    });

    it('should limit error history size', () => {
      // Add 150 errors (more than the 100 limit)
      for (let i = 0; i < 150; i++) {
        (cache as any).recordError(new Error(`Error ${i}`));
      }

      expect((cache as any).errorHistory).toHaveLength(50); // Should be trimmed to 50
    });

    it('should record performance metrics', () => {
      (cache as any).recordPerformance('get', 25, true);
      (cache as any).recordPerformance('set', 15, true);

      expect((cache as any).performanceHistory).toHaveLength(2);
      expect((cache as any).performanceHistory[0].operation).toBe('get');
      expect((cache as any).performanceHistory[0].duration).toBe(25);
    });

    it('should limit performance history size', () => {
      // Add 1500 performance records (more than the 1000 limit)
      for (let i = 0; i < 1500; i++) {
        (cache as any).recordPerformance(`operation${i}`, i, true);
      }

      expect((cache as any).performanceHistory).toHaveLength(500); // Should be trimmed to 500
    });
  });
});