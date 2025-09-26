/**
 * cache-result.types.spec.ts
 * 缓存操作结果类型测试
 * 覆盖率目标: 90%
 */

import {
  BaseCacheResult,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheBatchResult,
  CacheStatsResult,
  CacheStats,
  CacheHealthResult,
  CacheHealthStatus,
  HealthCheckItem,
  CacheOperationOptions,
  BatchOperationOptions,
  BatchProgress,
} from '@core/05-caching/foundation/types/cache-result.types';
import { CacheStatusType, CacheOperationType } from '@core/05-caching/foundation/types/cache-config.types';

describe('CacheResultTypes', () => {
  const mockTimestamp = Date.now();
  const mockDuration = 150;
  const mockKey = 'test:cache:key';

  describe('BaseCacheResult Interface', () => {
    it('should create a valid BaseCacheResult with required properties', () => {
      const result: BaseCacheResult<string> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: 'test data',
        timestamp: mockTimestamp,
      };

      expect(result.success).toBe(true);
      expect(result.status).toBe('connected');
      expect(result.operation).toBe('GET');
      expect(result.data).toBe('test data');
      expect(result.timestamp).toBe(mockTimestamp);
    });

    it('should support BaseCacheResult with optional properties', () => {
      const result: BaseCacheResult<number> = {
        success: false,
        status: 'error' as CacheStatusType,
        operation: 'SET' as CacheOperationType,
        error: 'Operation failed',
        errorCode: 'CACHE_ERROR_001',
        duration: mockDuration,
        timestamp: mockTimestamp,
        key: mockKey,
        metadata: { region: 'us-east-1', priority: 'high' },
      };

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.operation).toBe('SET');
      expect(result.error).toBe('Operation failed');
      expect(result.errorCode).toBe('CACHE_ERROR_001');
      expect(result.duration).toBe(mockDuration);
      expect(result.key).toBe(mockKey);
      expect(result.metadata).toEqual({ region: 'us-east-1', priority: 'high' });
    });

    it('should support generic type parameter', () => {
      interface CustomData {
        id: string;
        value: number;
      }

      const result: BaseCacheResult<CustomData> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: { id: 'test-id', value: 42 },
        timestamp: mockTimestamp,
      };

      expect(result.data).toEqual({ id: 'test-id', value: 42 });
    });
  });

  describe('CacheGetResult Interface', () => {
    it('should create a valid CacheGetResult with cache hit', () => {
      const result: CacheGetResult<string> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: 'cached value',
        timestamp: mockTimestamp,
        hit: true,
        remainingTtl: 300,
        dataSize: 12,
        fromCompressed: false,
        cacheLevel: 'L1',
      };

      expect(result.hit).toBe(true);
      expect(result.remainingTtl).toBe(300);
      expect(result.dataSize).toBe(12);
      expect(result.fromCompressed).toBe(false);
      expect(result.cacheLevel).toBe('L1');
    });

    it('should create a valid CacheGetResult with cache miss', () => {
      const result: CacheGetResult<null> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: null,
        timestamp: mockTimestamp,
        hit: false,
      };

      expect(result.hit).toBe(false);
      expect(result.data).toBeNull();
      expect(result.remainingTtl).toBeUndefined();
    });

    it('should support compressed data result', () => {
      const result: CacheGetResult<string> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: 'compressed value',
        timestamp: mockTimestamp,
        hit: true,
        dataSize: 1024,
        fromCompressed: true,
        cacheLevel: 'L2',
      };

      expect(result.fromCompressed).toBe(true);
      expect(result.dataSize).toBe(1024);
      expect(result.cacheLevel).toBe('L2');
    });
  });

  describe('CacheSetResult Interface', () => {
    it('should create a valid CacheSetResult for new key', () => {
      const result: CacheSetResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'SET' as CacheOperationType,
        data: true,
        timestamp: mockTimestamp,
        ttl: 600,
        replaced: false,
        dataSize: 256,
        compressed: false,
      };

      expect(result.data).toBe(true);
      expect(result.ttl).toBe(600);
      expect(result.replaced).toBe(false);
      expect(result.dataSize).toBe(256);
      expect(result.compressed).toBe(false);
    });

    it('should create a valid CacheSetResult for replaced key with compression', () => {
      const result: CacheSetResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'SET' as CacheOperationType,
        data: true,
        timestamp: mockTimestamp,
        ttl: 300,
        replaced: true,
        dataSize: 512,
        compressed: true,
        compressionRatio: 0.7,
      };

      expect(result.replaced).toBe(true);
      expect(result.compressed).toBe(true);
      expect(result.compressionRatio).toBe(0.7);
    });
  });

  describe('CacheDeleteResult Interface', () => {
    it('should create a valid CacheDeleteResult for single key', () => {
      const result: CacheDeleteResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'DELETE' as CacheOperationType,
        data: true,
        timestamp: mockTimestamp,
        deletedCount: 1,
        deletedKeys: ['test:key:1'],
        releasedMemoryBytes: 1024,
      };

      expect(result.data).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.deletedKeys).toEqual(['test:key:1']);
      expect(result.releasedMemoryBytes).toBe(1024);
    });

    it('should create a valid CacheDeleteResult for multiple keys', () => {
      const result: CacheDeleteResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'DELETE' as CacheOperationType,
        data: true,
        timestamp: mockTimestamp,
        deletedCount: 3,
        deletedKeys: ['key1', 'key2', 'key3'],
        releasedMemoryBytes: 2048,
      };

      expect(result.deletedCount).toBe(3);
      expect(result.deletedKeys).toHaveLength(3);
      expect(result.releasedMemoryBytes).toBe(2048);
    });

    it('should handle zero deletions gracefully', () => {
      const result: CacheDeleteResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'DELETE' as CacheOperationType,
        data: false,
        timestamp: mockTimestamp,
        deletedCount: 0,
      };

      expect(result.data).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(result.deletedKeys).toBeUndefined();
      expect(result.releasedMemoryBytes).toBeUndefined();
    });
  });

  describe('CacheBatchResult Interface', () => {
    it('should create a valid CacheBatchResult with partial success', () => {
      const mockResults: BaseCacheResult<string>[] = [
        {
          success: true,
          status: 'connected' as CacheStatusType,
          operation: 'GET' as CacheOperationType,
          data: 'value1',
          timestamp: mockTimestamp,
        },
        {
          success: false,
          status: 'error' as CacheStatusType,
          operation: 'GET' as CacheOperationType,
          error: 'Key not found',
          timestamp: mockTimestamp,
        },
      ];

      const result: CacheBatchResult<string> = {
        success: true,
        status: 'partial' as CacheStatusType,
        operation: 'BATCH_GET' as CacheOperationType,
        data: ['value1'],
        timestamp: mockTimestamp,
        successCount: 1,
        failureCount: 1,
        totalCount: 2,
        results: mockResults,
        failedKeys: ['failed:key'],
        batchSize: 10,
      };

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.totalCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.failedKeys).toEqual(['failed:key']);
      expect(result.batchSize).toBe(10);
    });

    it('should create a valid CacheBatchResult with complete success', () => {
      const result: CacheBatchResult<number> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'BATCH_SET' as CacheOperationType,
        data: [1, 2, 3],
        timestamp: mockTimestamp,
        successCount: 3,
        failureCount: 0,
        totalCount: 3,
      };

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.totalCount).toBe(3);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('CacheStatsResult and CacheStats Interfaces', () => {
    it('should create a valid CacheStatsResult', () => {
      const mockStats: CacheStats = {
        hits: 950,
        misses: 50,
        hitRate: 0.95,
        totalOperations: 1000,
        keyCount: 500,
        memoryUsageBytes: 1048576,
        memoryUsageRatio: 0.25,
        avgResponseTimeMs: 12.5,
        p95ResponseTimeMs: 25,
        p99ResponseTimeMs: 45,
        errorCount: 5,
        errorRate: 0.005,
        lastCleanupTime: mockTimestamp - 3600000,
        lastResetTime: mockTimestamp - 86400000,
      };

      const result: CacheStatsResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'STATS' as CacheOperationType,
        data: mockStats,
        timestamp: mockTimestamp,
        timeRangeMs: 3600000, // 1 hour
        collectionTime: mockTimestamp,
      };

      expect(result.data.hits).toBe(950);
      expect(result.data.misses).toBe(50);
      expect(result.data.hitRate).toBe(0.95);
      expect(result.data.totalOperations).toBe(1000);
      expect(result.timeRangeMs).toBe(3600000);
      expect(result.collectionTime).toBe(mockTimestamp);
    });

    it('should handle CacheStats with optional performance metrics', () => {
      const stats: CacheStats = {
        hits: 100,
        misses: 10,
        hitRate: 0.91,
        totalOperations: 110,
        keyCount: 50,
        memoryUsageBytes: 512000,
        memoryUsageRatio: 0.1,
        avgResponseTimeMs: 8.2,
        errorCount: 0,
        errorRate: 0,
        lastResetTime: mockTimestamp,
      };

      expect(stats.p95ResponseTimeMs).toBeUndefined();
      expect(stats.p99ResponseTimeMs).toBeUndefined();
      expect(stats.lastCleanupTime).toBeUndefined();
      expect(stats.errorCount).toBe(0);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('CacheHealthResult and CacheHealthStatus Interfaces', () => {
    it('should create a valid CacheHealthResult with healthy status', () => {
      const mockHealthChecks: HealthCheckItem[] = [
        {
          name: 'connection',
          status: 'pass',
          value: true,
          description: 'Cache connection is healthy',
          duration: 5,
        },
        {
          name: 'memory_usage',
          status: 'pass',
          value: 0.4,
          threshold: 0.8,
          description: 'Memory usage is within limits',
          duration: 2,
        },
      ];

      const mockHealthStatus: CacheHealthStatus = {
        connectionStatus: 'connected' as CacheStatusType,
        memoryStatus: 'healthy',
        performanceStatus: 'healthy',
        errorRateStatus: 'healthy',
        lastCheckTime: mockTimestamp,
        uptimeMs: 3600000,
      };

      const result: CacheHealthResult = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'HEALTH_CHECK' as CacheOperationType,
        data: mockHealthStatus,
        timestamp: mockTimestamp,
        checks: mockHealthChecks,
        healthScore: 95,
      };

      expect(result.data.connectionStatus).toBe('connected');
      expect(result.data.memoryStatus).toBe('healthy');
      expect(result.data.performanceStatus).toBe('healthy');
      expect(result.data.errorRateStatus).toBe('healthy');
      expect(result.checks).toHaveLength(2);
      expect(result.healthScore).toBe(95);
    });

    it('should create a valid CacheHealthResult with warning status', () => {
      const mockHealthChecks: HealthCheckItem[] = [
        {
          name: 'connection',
          status: 'pass',
          value: true,
        },
        {
          name: 'memory_usage',
          status: 'warn',
          value: 0.85,
          threshold: 0.8,
          description: 'Memory usage is high',
        },
        {
          name: 'error_rate',
          status: 'warn',
          value: 0.05,
          threshold: 0.01,
          description: 'Error rate is elevated',
        },
      ];

      const mockHealthStatus: CacheHealthStatus = {
        connectionStatus: 'connected' as CacheStatusType,
        memoryStatus: 'warning',
        performanceStatus: 'degraded',
        errorRateStatus: 'warning',
        lastCheckTime: mockTimestamp,
        uptimeMs: 1800000,
      };

      const result: CacheHealthResult = {
        success: true,
        status: 'warning' as CacheStatusType,
        operation: 'HEALTH_CHECK' as CacheOperationType,
        data: mockHealthStatus,
        timestamp: mockTimestamp,
        checks: mockHealthChecks,
        healthScore: 68,
      };

      expect(result.data.memoryStatus).toBe('warning');
      expect(result.data.performanceStatus).toBe('degraded');
      expect(result.data.errorRateStatus).toBe('warning');
      expect(result.healthScore).toBe(68);
    });
  });

  describe('HealthCheckItem Interface', () => {
    it('should create a valid HealthCheckItem with all properties', () => {
      const healthCheck: HealthCheckItem = {
        name: 'response_time',
        status: 'pass',
        value: 15.5,
        threshold: 50,
        description: 'Average response time check',
        duration: 3,
      };

      expect(healthCheck.name).toBe('response_time');
      expect(healthCheck.status).toBe('pass');
      expect(healthCheck.value).toBe(15.5);
      expect(healthCheck.threshold).toBe(50);
      expect(healthCheck.description).toBe('Average response time check');
      expect(healthCheck.duration).toBe(3);
    });

    it('should create a valid HealthCheckItem with minimal properties', () => {
      const healthCheck: HealthCheckItem = {
        name: 'basic_check',
        status: 'fail',
      };

      expect(healthCheck.name).toBe('basic_check');
      expect(healthCheck.status).toBe('fail');
      expect(healthCheck.value).toBeUndefined();
      expect(healthCheck.threshold).toBeUndefined();
      expect(healthCheck.description).toBeUndefined();
      expect(healthCheck.duration).toBeUndefined();
    });
  });

  describe('CacheOperationOptions Interface', () => {
    it('should create a valid CacheOperationOptions with all properties', () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      const options: CacheOperationOptions = {
        ttl: 300,
        timeoutMs: 5000,
        compression: true,
        retryAttempts: 3,
        recordMetrics: true,
        priority: 'high',
        tags: { service: 'cache-test', version: '1.0' },
        onSuccess: onSuccessMock,
        onError: onErrorMock,
      };

      expect(options.ttl).toBe(300);
      expect(options.timeoutMs).toBe(5000);
      expect(options.compression).toBe(true);
      expect(options.retryAttempts).toBe(3);
      expect(options.recordMetrics).toBe(true);
      expect(options.priority).toBe('high');
      expect(options.tags).toEqual({ service: 'cache-test', version: '1.0' });
      expect(typeof options.onSuccess).toBe('function');
      expect(typeof options.onError).toBe('function');
    });

    it('should create a valid CacheOperationOptions with minimal properties', () => {
      const options: CacheOperationOptions = {};

      expect(options.ttl).toBeUndefined();
      expect(options.timeoutMs).toBeUndefined();
      expect(options.compression).toBeUndefined();
      expect(options.retryAttempts).toBeUndefined();
      expect(options.recordMetrics).toBeUndefined();
      expect(options.priority).toBeUndefined();
      expect(options.tags).toBeUndefined();
      expect(options.onSuccess).toBeUndefined();
      expect(options.onError).toBeUndefined();
    });
  });

  describe('BatchOperationOptions Interface', () => {
    it('should create a valid BatchOperationOptions with all properties', () => {
      const onProgressMock = jest.fn();

      const options: BatchOperationOptions = {
        ttl: 600,
        compression: false,
        batchSize: 100,
        concurrency: 5,
        parallel: true,
        stopOnFailure: false,
        onProgress: onProgressMock,
      };

      expect(options.ttl).toBe(600);
      expect(options.compression).toBe(false);
      expect(options.batchSize).toBe(100);
      expect(options.concurrency).toBe(5);
      expect(options.parallel).toBe(true);
      expect(options.stopOnFailure).toBe(false);
      expect(typeof options.onProgress).toBe('function');
    });

    it('should extend CacheOperationOptions properties', () => {
      const options: BatchOperationOptions = {
        priority: 'critical',
        tags: { batch: 'true' },
        batchSize: 50,
        parallel: false,
      };

      // Properties from CacheOperationOptions
      expect(options.priority).toBe('critical');
      expect(options.tags).toEqual({ batch: 'true' });

      // Properties specific to BatchOperationOptions
      expect(options.batchSize).toBe(50);
      expect(options.parallel).toBe(false);
    });
  });

  describe('BatchProgress Interface', () => {
    it('should create a valid BatchProgress with all properties', () => {
      const progress: BatchProgress = {
        completed: 75,
        total: 100,
        percentage: 75,
        successes: 70,
        failures: 5,
        estimatedRemainingMs: 30000,
      };

      expect(progress.completed).toBe(75);
      expect(progress.total).toBe(100);
      expect(progress.percentage).toBe(75);
      expect(progress.successes).toBe(70);
      expect(progress.failures).toBe(5);
      expect(progress.estimatedRemainingMs).toBe(30000);
    });

    it('should create a valid BatchProgress with minimal properties', () => {
      const progress: BatchProgress = {
        completed: 10,
        total: 50,
        percentage: 20,
        successes: 8,
        failures: 2,
      };

      expect(progress.completed).toBe(10);
      expect(progress.total).toBe(50);
      expect(progress.percentage).toBe(20);
      expect(progress.successes).toBe(8);
      expect(progress.failures).toBe(2);
      expect(progress.estimatedRemainingMs).toBeUndefined();
    });

    it('should validate progress calculation consistency', () => {
      const progress: BatchProgress = {
        completed: 80,
        total: 100,
        percentage: 80,
        successes: 75,
        failures: 5,
      };

      // Validate that completed = successes + failures
      expect(progress.completed).toBe(progress.successes + progress.failures);

      // Validate that percentage matches completed/total
      expect(progress.percentage).toBe((progress.completed / progress.total) * 100);
    });
  });

  describe('Type Safety and Integration', () => {
    it('should support proper type inheritance chain', () => {
      const baseResult: BaseCacheResult<string> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: 'test',
        timestamp: mockTimestamp,
      };

      const getResult: CacheGetResult<string> = {
        ...baseResult,
        hit: true,
        remainingTtl: 300,
      };

      // Should be assignable to base type
      const asBase: BaseCacheResult<string> = getResult;
      expect(asBase.success).toBe(true);
      expect((asBase as CacheGetResult<string>).hit).toBe(true);
    });

    it('should enforce readonly properties at compile time', () => {
      const result: BaseCacheResult<string> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        timestamp: mockTimestamp,
      };

      // These would cause TypeScript compilation errors:
      // result.success = false; // Cannot assign to 'success' because it is a read-only property
      // result.timestamp = Date.now(); // Cannot assign to 'timestamp' because it is a read-only property

      expect(result.success).toBe(true);
    });

    it('should support complex generic type scenarios', () => {
      interface ComplexData {
        users: Array<{ id: string; name: string }>;
        metadata: {
          total: number;
          page: number;
        };
      }

      const complexResult: CacheGetResult<ComplexData> = {
        success: true,
        status: 'connected' as CacheStatusType,
        operation: 'GET' as CacheOperationType,
        data: {
          users: [
            { id: '1', name: 'John' },
            { id: '2', name: 'Jane' },
          ],
          metadata: {
            total: 2,
            page: 1,
          },
        },
        timestamp: mockTimestamp,
        hit: true,
        cacheLevel: 'L1',
      };

      expect(complexResult.data?.users).toHaveLength(2);
      expect(complexResult.data?.metadata.total).toBe(2);
    });
  });
});