/**
 * cache-module.types.spec.ts
 * 缓存模块类型测试
 * 覆盖率目标: 90%
 */

import {
  CacheModuleInterface,
  CacheOperationsInterface,
  CacheBatchOperationsInterface,
  CacheAdvancedOperationsInterface,
  CacheMonitoringInterface,
  CacheServiceInterface,
  ModuleInitOptions,
  ModuleStatus,
  MemoryUsage,
  ConnectionInfo,
  ImportOptions,
  ImportResult,
} from '@core/05-caching/foundation/types/cache-module.types';
import {
  CacheUnifiedConfigInterface,
  CacheConfigValidationResult
} from '@core/05-caching/foundation/types/cache-config.types';
import {
  BaseCacheResult,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheBatchResult,
  CacheStatsResult,
  CacheHealthResult,
  CacheOperationOptions,
  BatchOperationOptions
} from '@core/05-caching/foundation/types/cache-result.types';

describe('CacheModuleTypes', () => {
  const mockTimestamp = Date.now();

  describe('CacheModuleInterface', () => {
    it('should define a complete module interface', () => {
      const mockConfig: CacheUnifiedConfigInterface = {
        name: 'test-cache',
        defaultTtlSeconds: 300,
        maxTtlSeconds: 3600,
        minTtlSeconds: 10,
        compressionEnabled: true,
        compressionThresholdBytes: 1024,
        metricsEnabled: true,
        performanceMonitoringEnabled: true,
        ttl: {
          realTimeTtlSeconds: 5,
          nearRealTimeTtlSeconds: 30,
          batchQueryTtlSeconds: 300,
          offHoursTtlSeconds: 1800,
          weekendTtlSeconds: 3600,
        },
        performance: {
          maxMemoryMb: 256,
          defaultBatchSize: 100,
          maxConcurrentOperations: 50,
          slowOperationThresholdMs: 1000,
          connectionTimeoutMs: 5000,
          operationTimeoutMs: 3000,
        },
        intervals: {
          cleanupIntervalMs: 60000,
          healthCheckIntervalMs: 30000,
          metricsCollectionIntervalMs: 10000,
          statsLogIntervalMs: 300000,
          heartbeatIntervalMs: 5000,
        },
        limits: {
          maxKeyLength: 256,
          maxValueSizeBytes: 1048576,
          maxCacheEntries: 10000,
          memoryThresholdRatio: 0.8,
          errorRateAlertThreshold: 0.05,
        },
        retry: {
          maxRetryAttempts: 3,
          baseRetryDelayMs: 100,
          retryDelayMultiplier: 2,
          maxRetryDelayMs: 8000,
          exponentialBackoffEnabled: true,
        },
      };

      class TestModule implements CacheModuleInterface {
        readonly name = 'test-module';
        readonly version = '1.0.0';
        readonly description = 'Test cache module';
        readonly isInitialized = true;
        readonly isHealthy = true;
        config = mockConfig;

        async initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void> {
          this.config = config;
        }

        async destroy(): Promise<void> {
          // Cleanup logic
        }

        getStatus(): ModuleStatus {
          return {
            status: 'ready',
            message: 'Module is ready',
            lastUpdated: mockTimestamp,
            startedAt: mockTimestamp - 10000,
          };
        }

        validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
          return {
            isValid: true,
            errors: [],
            warnings: [],
          };
        }
      }

      const module = new TestModule();

      expect(module.name).toBe('test-module');
      expect(module.version).toBe('1.0.0');
      expect(module.description).toBe('Test cache module');
      expect(module.isInitialized).toBe(true);
      expect(module.isHealthy).toBe(true);
      expect(typeof module.initialize).toBe('function');
      expect(typeof module.destroy).toBe('function');
      expect(typeof module.getStatus).toBe('function');
      expect(typeof module.validateConfig).toBe('function');
    });

    it('should handle module with minimal properties', () => {
      const mockConfig: CacheUnifiedConfigInterface = {
        name: 'minimal-cache',
        defaultTtlSeconds: 300,
        maxTtlSeconds: 3600,
        minTtlSeconds: 10,
        compressionEnabled: false,
        compressionThresholdBytes: 1024,
        metricsEnabled: false,
        performanceMonitoringEnabled: false,
        ttl: {
          realTimeTtlSeconds: 5,
          nearRealTimeTtlSeconds: 30,
          batchQueryTtlSeconds: 300,
          offHoursTtlSeconds: 1800,
          weekendTtlSeconds: 3600,
        },
        performance: {
          maxMemoryMb: 128,
          defaultBatchSize: 50,
          maxConcurrentOperations: 25,
          slowOperationThresholdMs: 2000,
          connectionTimeoutMs: 3000,
          operationTimeoutMs: 2000,
        },
        intervals: {
          cleanupIntervalMs: 120000,
          healthCheckIntervalMs: 60000,
          metricsCollectionIntervalMs: 30000,
          statsLogIntervalMs: 600000,
          heartbeatIntervalMs: 10000,
        },
        limits: {
          maxKeyLength: 128,
          maxValueSizeBytes: 524288,
          maxCacheEntries: 1000,
          memoryThresholdRatio: 0.7,
          errorRateAlertThreshold: 0.01,
        },
        retry: {
          maxRetryAttempts: 2,
          baseRetryDelayMs: 200,
          retryDelayMultiplier: 1.5,
          maxRetryDelayMs: 3000,
          exponentialBackoffEnabled: false,
        },
      };

      class MinimalModule implements CacheModuleInterface {
        readonly name = 'minimal-module';
        readonly version = '0.1.0';
        readonly description = undefined;
        readonly isInitialized = false;
        readonly isHealthy = false;
        config = mockConfig;

        async initialize(config: CacheUnifiedConfigInterface): Promise<void> {
          this.config = config;
        }

        async destroy(): Promise<void> {}

        getStatus(): ModuleStatus {
          return {
            status: 'initializing',
            lastUpdated: mockTimestamp,
          };
        }

        validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
          return {
            isValid: false,
            errors: ['Configuration incomplete'],
            warnings: [],
          };
        }
      }

      const module = new MinimalModule();

      expect(module.name).toBe('minimal-module');
      expect(module.version).toBe('0.1.0');
      expect(module.description).toBeUndefined();
      expect(module.isInitialized).toBe(false);
      expect(module.isHealthy).toBe(false);
    });
  });

  describe('CacheOperationsInterface', () => {
    class TestCacheOperations implements CacheOperationsInterface {
      async get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
        return {
          success: true,
          status: 'success',
          operation: 'get',
          data: `value-${key}` as T,
          timestamp: mockTimestamp,
          hit: true,
          remainingTtl: 300,
        };
      }

      async set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
        return {
          success: true,
          status: 'success',
          operation: 'set',
          data: true,
          timestamp: mockTimestamp,
          ttl: options?.ttl || 300,
          replaced: false,
        };
      }

      async delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
        return {
          success: true,
          status: 'success',
          operation: 'delete',
          data: true,
          timestamp: mockTimestamp,
          deletedCount: 1,
          deletedKeys: [key],
        };
      }

      async exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
        return {
          success: true,
          status: 'success',
          operation: 'exists',
          data: true,
          timestamp: mockTimestamp,
        };
      }

      async ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
        return {
          success: true,
          status: 'success',
          operation: 'ttl',
          data: 300,
          timestamp: mockTimestamp,
        };
      }

      async expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
        return {
          success: true,
          status: 'success',
          operation: 'expire',
          data: true,
          timestamp: mockTimestamp,
        };
      }
    }

    it('should implement all basic cache operations', async () => {
      const operations = new TestCacheOperations();

      // Test get operation
      const getResult = await operations.get('test-key');
      expect(getResult.success).toBe(true);
      expect(getResult.operation).toBe('get');
      expect(getResult.data).toBe('value-test-key');
      expect(getResult.hit).toBe(true);

      // Test set operation
      const setResult = await operations.set('test-key', 'test-value');
      expect(setResult.success).toBe(true);
      expect(setResult.operation).toBe('set');
      expect(setResult.data).toBe(true);
      expect(setResult.replaced).toBe(false);

      // Test delete operation
      const deleteResult = await operations.delete('test-key');
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.operation).toBe('delete');
      expect(deleteResult.deletedCount).toBe(1);
      expect(deleteResult.deletedKeys).toEqual(['test-key']);

      // Test exists operation
      const existsResult = await operations.exists('test-key');
      expect(existsResult.success).toBe(true);
      expect(existsResult.operation).toBe('exists');
      expect(existsResult.data).toBe(true);

      // Test ttl operation
      const ttlResult = await operations.ttl('test-key');
      expect(ttlResult.success).toBe(true);
      expect(ttlResult.operation).toBe('ttl');
      expect(ttlResult.data).toBe(300);

      // Test expire operation
      const expireResult = await operations.expire('test-key', 600);
      expect(expireResult.success).toBe(true);
      expect(expireResult.operation).toBe('expire');
      expect(expireResult.data).toBe(true);
    });

    it('should handle operations with options', async () => {
      const operations = new TestCacheOperations();
      const options: CacheOperationOptions = {
        ttl: 600,
        compression: true,
        priority: 'high',
        tags: { service: 'test' },
      };

      const result = await operations.set('test-key', 'test-value', options);
      expect(result.ttl).toBe(600);
    });
  });

  describe('CacheBatchOperationsInterface', () => {
    class TestBatchOperations implements CacheBatchOperationsInterface {
      async batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>> {
        return {
          success: true,
          status: 'success',
          operation: 'batchGet',
          data: keys.map(key => `value-${key}`) as T[],
          timestamp: mockTimestamp,
          successCount: keys.length,
          failureCount: 0,
          totalCount: keys.length,
        };
      }

      async batchSet<T = any>(items: Array<{key: string, value: T, ttl?: number}>, options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
        return {
          success: true,
          status: 'success',
          operation: 'batchSet',
          data: items.map(() => true),
          timestamp: mockTimestamp,
          successCount: items.length,
          failureCount: 0,
          totalCount: items.length,
        };
      }

      async batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
        return {
          success: true,
          status: 'success',
          operation: 'batchDelete',
          data: keys.map(() => true),
          timestamp: mockTimestamp,
          successCount: keys.length,
          failureCount: 0,
          totalCount: keys.length,
        };
      }

      async clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
        return {
          success: true,
          status: 'success',
          operation: 'clear',
          data: true,
          timestamp: mockTimestamp,
          deletedCount: 100,
          releasedMemoryBytes: 1048576,
        };
      }
    }

    it('should implement batch operations', async () => {
      const batchOps = new TestBatchOperations();

      // Test batch get
      const keys = ['key1', 'key2', 'key3'];
      const batchGetResult = await batchOps.batchGet(keys);
      expect(batchGetResult.success).toBe(true);
      expect(batchGetResult.data).toEqual(['value-key1', 'value-key2', 'value-key3']);
      expect(batchGetResult.successCount).toBe(3);
      expect(batchGetResult.totalCount).toBe(3);

      // Test batch set
      const items = [
        { key: 'key1', value: 'value1', ttl: 300 },
        { key: 'key2', value: 'value2', ttl: 600 },
      ];
      const batchSetResult = await batchOps.batchSet(items);
      expect(batchSetResult.success).toBe(true);
      expect(batchSetResult.data).toEqual([true, true]);
      expect(batchSetResult.successCount).toBe(2);

      // Test batch delete
      const batchDeleteResult = await batchOps.batchDelete(['key1', 'key2']);
      expect(batchDeleteResult.success).toBe(true);
      expect(batchDeleteResult.data).toEqual([true, true]);
      expect(batchDeleteResult.successCount).toBe(2);

      // Test clear
      const clearResult = await batchOps.clear('test:*');
      expect(clearResult.success).toBe(true);
      expect(clearResult.deletedCount).toBe(100);
      expect(clearResult.releasedMemoryBytes).toBe(1048576);
    });
  });

  describe('CacheAdvancedOperationsInterface', () => {
    class TestAdvancedOperations implements CacheAdvancedOperationsInterface {
      async increment(key: string, increment?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
        return {
          success: true,
          status: 'success',
          operation: 'increment',
          data: (increment || 1) + 10, // Simulate current value + increment
          timestamp: mockTimestamp,
        };
      }

      async decrement(key: string, decrement?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
        return {
          success: true,
          status: 'success',
          operation: 'decrement',
          data: 10 - (decrement || 1), // Simulate current value - decrement
          timestamp: mockTimestamp,
        };
      }

      async getOrSet<T = any>(
        key: string,
        factory: () => Promise<T> | T,
        options?: CacheOperationOptions
      ): Promise<CacheGetResult<T>> {
        const value = await Promise.resolve(factory());
        return {
          success: true,
          status: 'success',
          operation: 'get',
          data: value,
          timestamp: mockTimestamp,
          hit: false, // Simulates cache miss, value was set
          remainingTtl: options?.ttl || 300,
        };
      }

      async setIfNotExists<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
        return {
          success: true,
          status: 'success',
          operation: 'set',
          data: true,
          timestamp: mockTimestamp,
          ttl: options?.ttl || 300,
          replaced: false,
        };
      }
    }

    it('should implement advanced operations', async () => {
      const advancedOps = new TestAdvancedOperations();

      // Test increment
      const incrementResult = await advancedOps.increment('counter', 5);
      expect(incrementResult.success).toBe(true);
      expect(incrementResult.data).toBe(15); // 10 + 5

      // Test decrement
      const decrementResult = await advancedOps.decrement('counter', 3);
      expect(decrementResult.success).toBe(true);
      expect(decrementResult.data).toBe(7); // 10 - 3

      // Test getOrSet
      const factory = jest.fn().mockResolvedValue('factory-value');
      const getOrSetResult = await advancedOps.getOrSet('new-key', factory);
      expect(getOrSetResult.success).toBe(true);
      expect(getOrSetResult.data).toBe('factory-value');
      expect(getOrSetResult.hit).toBe(false);
      expect(factory).toHaveBeenCalled();

      // Test setIfNotExists
      const setIfNotExistsResult = await advancedOps.setIfNotExists('unique-key', 'unique-value');
      expect(setIfNotExistsResult.success).toBe(true);
      expect(setIfNotExistsResult.data).toBe(true);
      expect(setIfNotExistsResult.replaced).toBe(false);
    });
  });

  describe('CacheMonitoringInterface', () => {
    class TestMonitoring implements CacheMonitoringInterface {
      async getStats(timeRangeMs?: number): Promise<CacheStatsResult> {
        return {
          success: true,
          status: 'success',
          operation: 'get',
          data: {
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
            lastResetTime: mockTimestamp,
          },
          timestamp: mockTimestamp,
          timeRangeMs: timeRangeMs || 3600000,
          collectionTime: mockTimestamp,
        };
      }

      async resetStats(): Promise<BaseCacheResult<boolean>> {
        return {
          success: true,
          status: 'success',
          operation: 'clear',
          data: true,
          timestamp: mockTimestamp,
        };
      }

      async getHealth(): Promise<CacheHealthResult> {
        return {
          success: true,
          status: 'success',
          operation: 'get',
          data: {
            connectionStatus: 'connected',
            memoryStatus: 'healthy',
            performanceStatus: 'healthy',
            errorRateStatus: 'healthy',
            lastCheckTime: mockTimestamp,
            uptimeMs: 3600000,
          },
          timestamp: mockTimestamp,
          checks: [
            { name: 'connection', status: 'pass', value: true },
            { name: 'memory', status: 'pass', value: 0.25 },
          ],
          healthScore: 95,
        };
      }

      async getMemoryUsage(): Promise<BaseCacheResult<MemoryUsage>> {
        return {
          success: true,
          status: 'success',
          operation: 'get',
          data: {
            usedMemoryBytes: 1048576,
            totalMemoryBytes: 4194304,
            memoryUsageRatio: 0.25,
            keyCount: 500,
            avgKeySize: 2048,
            fragmentationRatio: 0.15,
          },
          timestamp: mockTimestamp,
        };
      }

      async getConnectionInfo(): Promise<BaseCacheResult<ConnectionInfo>> {
        return {
          success: true,
          status: 'success',
          operation: 'get',
          data: {
            status: 'connected',
            address: '127.0.0.1',
            port: 6379,
            connectedAt: mockTimestamp - 3600000,
            lastHeartbeat: mockTimestamp - 1000,
            latencyMs: 5,
            poolInfo: {
              totalConnections: 10,
              activeConnections: 3,
              idleConnections: 7,
            },
          },
          timestamp: mockTimestamp,
        };
      }
    }

    it('should implement monitoring operations', async () => {
      const monitoring = new TestMonitoring();

      // Test getStats
      const statsResult = await monitoring.getStats(3600000);
      expect(statsResult.success).toBe(true);
      expect(statsResult.data.hits).toBe(950);
      expect(statsResult.data.hitRate).toBe(0.95);
      expect(statsResult.timeRangeMs).toBe(3600000);

      // Test resetStats
      const resetResult = await monitoring.resetStats();
      expect(resetResult.success).toBe(true);
      expect(resetResult.data).toBe(true);

      // Test getHealth
      const healthResult = await monitoring.getHealth();
      expect(healthResult.success).toBe(true);
      expect(healthResult.data.connectionStatus).toBe('connected');
      expect(healthResult.healthScore).toBe(95);
      expect(healthResult.checks).toHaveLength(2);

      // Test getMemoryUsage
      const memoryResult = await monitoring.getMemoryUsage();
      expect(memoryResult.success).toBe(true);
      expect(memoryResult.data.usedMemoryBytes).toBe(1048576);
      expect(memoryResult.data.memoryUsageRatio).toBe(0.25);
      expect(memoryResult.data.fragmentationRatio).toBe(0.15);

      // Test getConnectionInfo
      const connectionResult = await monitoring.getConnectionInfo();
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.data.status).toBe('connected');
      expect(connectionResult.data.address).toBe('127.0.0.1');
      expect(connectionResult.data.port).toBe(6379);
      expect(connectionResult.data.poolInfo?.totalConnections).toBe(10);
    });
  });

  describe('ModuleInitOptions Interface', () => {
    it('should define complete initialization options', () => {
      const customValidator = jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] });
      const onInitialized = jest.fn();
      const onError = jest.fn();

      const options: ModuleInitOptions = {
        autoConnect: true,
        timeoutMs: 5000,
        enableHealthCheck: true,
        enableStats: true,
        customValidators: [customValidator],
        onInitialized,
        onError,
      };

      expect(options.autoConnect).toBe(true);
      expect(options.timeoutMs).toBe(5000);
      expect(options.enableHealthCheck).toBe(true);
      expect(options.enableStats).toBe(true);
      expect(options.customValidators).toHaveLength(1);
      expect(typeof options.onInitialized).toBe('function');
      expect(typeof options.onError).toBe('function');
    });

    it('should support minimal initialization options', () => {
      const options: ModuleInitOptions = {};

      expect(options.autoConnect).toBeUndefined();
      expect(options.timeoutMs).toBeUndefined();
      expect(options.enableHealthCheck).toBeUndefined();
      expect(options.enableStats).toBeUndefined();
      expect(options.customValidators).toBeUndefined();
      expect(options.onInitialized).toBeUndefined();
      expect(options.onError).toBeUndefined();
    });
  });

  describe('ModuleStatus Interface', () => {
    it('should define complete module status', () => {
      const status: ModuleStatus = {
        status: 'ready',
        message: 'Module is fully operational',
        lastUpdated: mockTimestamp,
        startedAt: mockTimestamp - 10000,
        metrics: {
          totalOperations: 1000,
          avgResponseTime: 15.5,
          errorRate: 0.001,
        },
      };

      expect(status.status).toBe('ready');
      expect(status.message).toBe('Module is fully operational');
      expect(status.lastUpdated).toBe(mockTimestamp);
      expect(status.startedAt).toBe(mockTimestamp - 10000);
      expect(status.metrics?.totalOperations).toBe(1000);
      expect(status.metrics?.avgResponseTime).toBe(15.5);
      expect(status.metrics?.errorRate).toBe(0.001);
    });

    it('should support different status types', () => {
      const statuses = [
        { status: 'initializing' as const, lastUpdated: mockTimestamp },
        { status: 'ready' as const, lastUpdated: mockTimestamp },
        { status: 'error' as const, lastUpdated: mockTimestamp, error: 'Connection failed' },
        { status: 'destroyed' as const, lastUpdated: mockTimestamp },
      ];

      statuses.forEach((status) => {
        expect(['initializing', 'ready', 'error', 'destroyed']).toContain(status.status);
        expect(status.lastUpdated).toBe(mockTimestamp);
      });

      expect(statuses[2].error).toBe('Connection failed');
    });
  });

  describe('MemoryUsage Interface', () => {
    it('should define complete memory usage information', () => {
      const memoryUsage: MemoryUsage = {
        usedMemoryBytes: 2097152, // 2MB
        totalMemoryBytes: 8388608, // 8MB
        memoryUsageRatio: 0.25,
        keyCount: 1000,
        avgKeySize: 2048,
        fragmentationRatio: 0.12,
      };

      expect(memoryUsage.usedMemoryBytes).toBe(2097152);
      expect(memoryUsage.totalMemoryBytes).toBe(8388608);
      expect(memoryUsage.memoryUsageRatio).toBe(0.25);
      expect(memoryUsage.keyCount).toBe(1000);
      expect(memoryUsage.avgKeySize).toBe(2048);
      expect(memoryUsage.fragmentationRatio).toBe(0.12);
    });

    it('should support memory usage without fragmentation info', () => {
      const memoryUsage: MemoryUsage = {
        usedMemoryBytes: 1048576,
        totalMemoryBytes: 4194304,
        memoryUsageRatio: 0.25,
        keyCount: 500,
        avgKeySize: 2048,
      };

      expect(memoryUsage.fragmentationRatio).toBeUndefined();
      expect(memoryUsage.usedMemoryBytes).toBe(1048576);
      expect(memoryUsage.totalMemoryBytes).toBe(4194304);
    });
  });

  describe('ConnectionInfo Interface', () => {
    it('should define complete connection information', () => {
      const connectionInfo: ConnectionInfo = {
        status: 'connected',
        address: '192.168.1.100',
        port: 6379,
        connectedAt: mockTimestamp - 7200000,
        lastHeartbeat: mockTimestamp - 500,
        latencyMs: 8,
        poolInfo: {
          totalConnections: 20,
          activeConnections: 5,
          idleConnections: 15,
        },
      };

      expect(connectionInfo.status).toBe('connected');
      expect(connectionInfo.address).toBe('192.168.1.100');
      expect(connectionInfo.port).toBe(6379);
      expect(connectionInfo.connectedAt).toBe(mockTimestamp - 7200000);
      expect(connectionInfo.lastHeartbeat).toBe(mockTimestamp - 500);
      expect(connectionInfo.latencyMs).toBe(8);
      expect(connectionInfo.poolInfo?.totalConnections).toBe(20);
      expect(connectionInfo.poolInfo?.activeConnections).toBe(5);
      expect(connectionInfo.poolInfo?.idleConnections).toBe(15);
    });

    it('should support different connection statuses', () => {
      const statuses: ConnectionInfo['status'][] = ['connected', 'disconnected', 'reconnecting'];

      statuses.forEach((status) => {
        const connectionInfo: ConnectionInfo = {
          status,
          address: 'localhost',
          port: 6379,
        };

        expect(['connected', 'disconnected', 'reconnecting']).toContain(connectionInfo.status);
        expect(connectionInfo.address).toBe('localhost');
        expect(connectionInfo.port).toBe(6379);
      });
    });

    it('should support minimal connection info', () => {
      const connectionInfo: ConnectionInfo = {
        status: 'disconnected',
        address: 'localhost',
        port: 6379,
      };

      expect(connectionInfo.status).toBe('disconnected');
      expect(connectionInfo.connectedAt).toBeUndefined();
      expect(connectionInfo.lastHeartbeat).toBeUndefined();
      expect(connectionInfo.latencyMs).toBeUndefined();
      expect(connectionInfo.poolInfo).toBeUndefined();
    });
  });

  describe('ImportOptions Interface', () => {
    it('should define complete import options', () => {
      const validator = jest.fn().mockReturnValue(true);

      const options: ImportOptions = {
        overwrite: true,
        format: 'json',
        ttl: 3600,
        keyPrefix: 'imported:',
        batchSize: 100,
        validator,
      };

      expect(options.overwrite).toBe(true);
      expect(options.format).toBe('json');
      expect(options.ttl).toBe(3600);
      expect(options.keyPrefix).toBe('imported:');
      expect(options.batchSize).toBe(100);
      expect(typeof options.validator).toBe('function');
    });

    it('should support different import formats', () => {
      const jsonOptions: ImportOptions = { format: 'json' };
      const csvOptions: ImportOptions = { format: 'csv' };

      expect(jsonOptions.format).toBe('json');
      expect(csvOptions.format).toBe('csv');
    });

    it('should support minimal import options', () => {
      const options: ImportOptions = {};

      expect(options.overwrite).toBeUndefined();
      expect(options.format).toBeUndefined();
      expect(options.ttl).toBeUndefined();
      expect(options.keyPrefix).toBeUndefined();
      expect(options.batchSize).toBeUndefined();
      expect(options.validator).toBeUndefined();
    });
  });

  describe('ImportResult Interface', () => {
    it('should define complete import result', () => {
      const result: ImportResult = {
        total: 1000,
        successful: 950,
        failed: 30,
        skipped: 20,
        failedKeys: ['invalid:key1', 'invalid:key2', 'duplicate:key3'],
        durationMs: 15000,
      };

      expect(result.total).toBe(1000);
      expect(result.successful).toBe(950);
      expect(result.failed).toBe(30);
      expect(result.skipped).toBe(20);
      expect(result.failedKeys).toHaveLength(3);
      expect(result.durationMs).toBe(15000);

      // Validate totals add up correctly
      expect(result.successful + result.failed + result.skipped).toBe(result.total);
    });

    it('should support import result without failed keys', () => {
      const result: ImportResult = {
        total: 100,
        successful: 100,
        failed: 0,
        skipped: 0,
        durationMs: 2000,
      };

      expect(result.total).toBe(100);
      expect(result.successful).toBe(100);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failedKeys).toBeUndefined();
      expect(result.durationMs).toBe(2000);
    });

    it('should validate import result consistency', () => {
      const result: ImportResult = {
        total: 500,
        successful: 400,
        failed: 75,
        skipped: 25,
        durationMs: 8000,
      };

      // Total should equal sum of successful, failed, and skipped
      expect(result.successful + result.failed + result.skipped).toBe(result.total);

      // All counts should be non-negative
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Interface Integration and Type Safety', () => {
    it('should support complete cache service interface', async () => {
      // This test demonstrates how all interfaces work together
      class CompleteCacheService implements CacheServiceInterface {
        readonly name = 'complete-cache';
        readonly version = '2.0.0';
        readonly description = 'Complete cache service implementation';
        readonly isInitialized = true;
        readonly isHealthy = true;
        config: CacheUnifiedConfigInterface = {} as any; // Simplified for test

        // Module interface methods
        async initialize(config: CacheUnifiedConfigInterface, options?: ModuleInitOptions): Promise<void> {}
        async destroy(): Promise<void> {}
        getStatus(): ModuleStatus {
          return { status: 'ready', lastUpdated: mockTimestamp };
        }
        validateConfig(config: Partial<CacheUnifiedConfigInterface>): CacheConfigValidationResult {
          return { isValid: true, errors: [], warnings: [] };
        }

        // Operations interface methods
        async get<T = any>(key: string, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
          return { success: true, status: 'success', operation: 'get', data: undefined, timestamp: mockTimestamp, hit: false };
        }
        async set<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
          return { success: true, status: 'success', operation: 'set', data: true, timestamp: mockTimestamp, ttl: 300, replaced: false };
        }
        async delete(key: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
          return { success: true, status: 'success', operation: 'delete', data: true, timestamp: mockTimestamp, deletedCount: 1 };
        }
        async exists(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
          return { success: true, status: 'success', operation: 'exists', data: true, timestamp: mockTimestamp };
        }
        async ttl(key: string, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
          return { success: true, status: 'success', operation: 'ttl', data: 300, timestamp: mockTimestamp };
        }
        async expire(key: string, ttl: number, options?: CacheOperationOptions): Promise<BaseCacheResult<boolean>> {
          return { success: true, status: 'success', operation: 'expire', data: true, timestamp: mockTimestamp };
        }

        // Batch operations
        async batchGet<T = any>(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<T>> {
          return { success: true, status: 'success', operation: 'batchGet', data: [], timestamp: mockTimestamp, successCount: 0, failureCount: 0, totalCount: 0 };
        }
        async batchSet<T = any>(items: Array<{key: string, value: T, ttl?: number}>, options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
          return { success: true, status: 'success', operation: 'batchSet', data: [], timestamp: mockTimestamp, successCount: 0, failureCount: 0, totalCount: 0 };
        }
        async batchDelete(keys: string[], options?: BatchOperationOptions): Promise<CacheBatchResult<boolean>> {
          return { success: true, status: 'success', operation: 'batchDelete', data: [], timestamp: mockTimestamp, successCount: 0, failureCount: 0, totalCount: 0 };
        }
        async clear(pattern?: string, options?: CacheOperationOptions): Promise<CacheDeleteResult> {
          return { success: true, status: 'success', operation: 'clear', data: true, timestamp: mockTimestamp, deletedCount: 0 };
        }

        // Advanced operations
        async increment(key: string, increment?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
          return { success: true, status: 'success', operation: 'increment', data: 1, timestamp: mockTimestamp };
        }
        async decrement(key: string, decrement?: number, options?: CacheOperationOptions): Promise<BaseCacheResult<number>> {
          return { success: true, status: 'success', operation: 'decrement', data: 0, timestamp: mockTimestamp };
        }
        async getOrSet<T = any>(key: string, factory: () => Promise<T> | T, options?: CacheOperationOptions): Promise<CacheGetResult<T>> {
          const value = await Promise.resolve(factory());
          return { success: true, status: 'success', operation: 'get', data: value, timestamp: mockTimestamp, hit: false };
        }
        async setIfNotExists<T = any>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheSetResult> {
          return { success: true, status: 'success', operation: 'set', data: true, timestamp: mockTimestamp, ttl: 300, replaced: false };
        }

        // Monitoring operations
        async getStats(timeRangeMs?: number): Promise<CacheStatsResult> {
          return {
            success: true, status: 'success', operation: 'get', timestamp: mockTimestamp, timeRangeMs: 3600000, collectionTime: mockTimestamp,
            data: { hits: 0, misses: 0, hitRate: 0, totalOperations: 0, keyCount: 0, memoryUsageBytes: 0, memoryUsageRatio: 0, avgResponseTimeMs: 0, errorCount: 0, errorRate: 0, lastResetTime: mockTimestamp }
          };
        }
        async resetStats(): Promise<BaseCacheResult<boolean>> {
          return { success: true, status: 'success', operation: 'clear', data: true, timestamp: mockTimestamp };
        }
        async getHealth(): Promise<CacheHealthResult> {
          return {
            success: true, status: 'success', operation: 'get', timestamp: mockTimestamp, checks: [], healthScore: 100,
            data: { connectionStatus: 'connected', memoryStatus: 'healthy', performanceStatus: 'healthy', errorRateStatus: 'healthy', lastCheckTime: mockTimestamp, uptimeMs: 0 }
          };
        }
        async getMemoryUsage(): Promise<BaseCacheResult<MemoryUsage>> {
          return {
            success: true, status: 'success', operation: 'get', timestamp: mockTimestamp,
            data: { usedMemoryBytes: 0, totalMemoryBytes: 0, memoryUsageRatio: 0, keyCount: 0, avgKeySize: 0 }
          };
        }
        async getConnectionInfo(): Promise<BaseCacheResult<ConnectionInfo>> {
          return {
            success: true, status: 'success', operation: 'get', timestamp: mockTimestamp,
            data: { status: 'connected', address: 'localhost', port: 6379 }
          };
        }

        // Additional service methods
        async refreshConfig(newConfig: Partial<CacheUnifiedConfigInterface>): Promise<void> {}
        async ping(): Promise<BaseCacheResult<number>> {
          return { success: true, status: 'success', operation: 'get', data: 1, timestamp: mockTimestamp };
        }
        async getKeys(pattern?: string, limit?: number): Promise<BaseCacheResult<string[]>> {
          return { success: true, status: 'success', operation: 'get', data: [], timestamp: mockTimestamp };
        }
        async exportData(pattern?: string, format?: 'json' | 'csv'): Promise<BaseCacheResult<any>> {
          return { success: true, status: 'success', operation: 'get', data: {}, timestamp: mockTimestamp };
        }
        async importData(data: any, options?: ImportOptions): Promise<BaseCacheResult<ImportResult>> {
          return {
            success: true, status: 'success', operation: 'set', timestamp: mockTimestamp,
            data: { total: 0, successful: 0, failed: 0, skipped: 0, durationMs: 0 }
          };
        }
      }

      const service = new CompleteCacheService();

      expect(service.name).toBe('complete-cache');
      expect(service.version).toBe('2.0.0');
      expect(service.isInitialized).toBe(true);
      expect(service.isHealthy).toBe(true);

      // Test that all interface methods are available
      expect(typeof service.get).toBe('function');
      expect(typeof service.set).toBe('function');
      expect(typeof service.batchGet).toBe('function');
      expect(typeof service.getOrSet).toBe('function');
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.ping).toBe('function');

      // Test some operations work
      const pingResult = await service.ping();
      expect(pingResult.success).toBe(true);
      expect(pingResult.data).toBe(1);

      const healthResult = await service.getHealth();
      expect(healthResult.success).toBe(true);
      expect(healthResult.data.connectionStatus).toBe('connected');
    });

    it('should enforce type safety across interfaces', () => {
      // Demonstrate that interfaces properly enforce type constraints
      const memoryUsage: MemoryUsage = {
        usedMemoryBytes: 1048576,
        totalMemoryBytes: 4194304,
        memoryUsageRatio: 0.25,
        keyCount: 500,
        avgKeySize: 2048,
      };

      const connectionInfo: ConnectionInfo = {
        status: 'connected',
        address: '127.0.0.1',
        port: 6379,
      };

      const importResult: ImportResult = {
        total: 100,
        successful: 95,
        failed: 3,
        skipped: 2,
        durationMs: 5000,
      };

      // All should compile successfully
      expect(typeof memoryUsage.usedMemoryBytes).toBe('number');
      expect(typeof connectionInfo.status).toBe('string');
      expect(typeof importResult.total).toBe('number');
    });
  });
});