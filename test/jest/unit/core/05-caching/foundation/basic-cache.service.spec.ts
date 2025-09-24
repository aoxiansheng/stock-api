/**
 * BasicCacheService 单元测试
 * 测试Foundation层基础缓存服务的所有功能
 */

import { BasicCacheService } from '@core/05-caching/foundation/services/basic-cache.service';
import {
  CacheUnifiedConfigInterface,
  CacheOperationOptions,
  BatchOperationOptions
} from '@core/05-caching/foundation/types/cache-config.types';
import { CACHE_STATUS, CACHE_OPERATIONS } from '@core/05-caching/foundation/constants/cache-operations.constants';

describe('BasicCacheService', () => {
  let service: BasicCacheService;
  let testConfig: CacheUnifiedConfigInterface;

  beforeEach(async () => {
    // 创建测试配置
    testConfig = {
      name: 'test-cache',
      type: 'memory',
      defaultTtlSeconds: 300,
      limits: {
        maxKeyLength: 250,
        maxValueSizeBytes: 1024 * 1024, // 1MB
        maxConcurrentOps: 100,
        maxMemoryMb: 512,
      },
      performance: {
        maxMemoryMb: 512,
        enableCompression: false,
        compressionThreshold: 1024,
      },
      intervals: {
        cleanupIntervalMs: 30000,
        statsCollectionIntervalMs: 60000,
      },
      redis: {
        enabled: false,
        host: 'localhost',
        port: 6379,
        database: 0,
      },
    };

    service = new BasicCacheService();
    await service.initialize(testConfig);
  });

  afterEach(async () => {
    await service.destroy();
  });

  describe('Module Lifecycle', () => {
    it('should initialize successfully with valid config', async () => {
      const newService = new BasicCacheService();
      await newService.initialize(testConfig);

      expect(newService.isInitialized).toBe(true);
      expect(newService.isHealthy).toBe(true);
      expect(newService.name).toBe('basic-cache-foundation');
      expect(newService.version).toBe('1.0.0');
      expect(newService.config).toEqual(testConfig);

      await newService.destroy();
    });

    it('should handle initialization failure gracefully', async () => {
      const invalidConfig = { ...testConfig, name: undefined } as any;
      const newService = new BasicCacheService();

      await expect(newService.initialize(invalidConfig)).rejects.toThrow();
      expect(newService.isInitialized).toBe(false);
      expect(newService.getStatus().status).toBe('error');
    });

    it('should validate config correctly', () => {
      const validConfig = { ...testConfig };
      const result = service.validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const invalidConfig = { ...testConfig, name: '', defaultTtlSeconds: -1 };
      const invalidResult = service.validateConfig(invalidConfig);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should destroy cleanly', async () => {
      await service.set('test-key', 'test-value');
      await service.destroy();

      const status = service.getStatus();
      expect(status.status).toBe('destroyed');
    });
  });

  describe('Basic Cache Operations', () => {
    describe('get/set operations', () => {
      it('should set and get values successfully', async () => {
        const key = 'test-key';
        const value = { data: 'test-value', number: 42 };

        // Set value
        const setResult = await service.set(key, value);
        expect(setResult.success).toBe(true);
        expect(setResult.status).toBe(CACHE_STATUS.SUCCESS);
        expect(setResult.operation).toBe(CACHE_OPERATIONS.SET);
        expect(setResult.data).toBe(true);
        expect(setResult.ttl).toBe(testConfig.defaultTtlSeconds);
        expect(setResult.replaced).toBe(false);

        // Get value
        const getResult = await service.get(key);
        expect(getResult.success).toBe(true);
        expect(getResult.hit).toBe(true);
        expect(getResult.data).toEqual(value);
        expect(getResult.remainingTtl).toBeGreaterThan(0);
      });

      it('should handle cache miss correctly', async () => {
        const result = await service.get('non-existent-key');
        expect(result.success).toBe(true);
        expect(result.hit).toBe(false);
        expect(result.data).toBeUndefined();
      });

      it('should replace existing values', async () => {
        const key = 'replace-test';

        // Set initial value
        await service.set(key, 'initial-value');

        // Replace with new value
        const setResult = await service.set(key, 'new-value');
        expect(setResult.replaced).toBe(true);

        // Verify new value
        const getResult = await service.get(key);
        expect(getResult.data).toBe('new-value');
      });

      it('should respect custom TTL', async () => {
        const key = 'ttl-test';
        const customTtl = 10;

        await service.set(key, 'test', { ttl: customTtl });

        const ttlResult = await service.ttl(key);
        expect(ttlResult.data).toBeLessThanOrEqual(customTtl);
        expect(ttlResult.data).toBeGreaterThan(0);
      });

      it('should handle invalid keys', async () => {
        const longKey = 'a'.repeat(1000); // Exceeds maxKeyLength

        const setResult = await service.set(longKey, 'value');
        expect(setResult.success).toBe(false);

        const getResult = await service.get(longKey);
        expect(getResult.success).toBe(false);
      });
    });

    describe('delete operations', () => {
      it('should delete existing keys', async () => {
        const key = 'delete-test';
        await service.set(key, 'value');

        const deleteResult = await service.delete(key);
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.data).toBe(true);
        expect(deleteResult.deletedCount).toBe(1);
        expect(deleteResult.deletedKeys).toContain(key);

        // Verify key is gone
        const getResult = await service.get(key);
        expect(getResult.hit).toBe(false);
      });

      it('should handle deleting non-existent keys', async () => {
        const deleteResult = await service.delete('non-existent');
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.data).toBe(false);
        expect(deleteResult.deletedCount).toBe(0);
      });
    });

    describe('exists and ttl operations', () => {
      it('should check key existence correctly', async () => {
        const key = 'exists-test';

        let existsResult = await service.exists(key);
        expect(existsResult.data).toBe(false);

        await service.set(key, 'value');

        existsResult = await service.exists(key);
        expect(existsResult.data).toBe(true);
      });

      it('should get TTL correctly', async () => {
        const key = 'ttl-test';
        const ttl = 100;

        await service.set(key, 'value', { ttl });

        const ttlResult = await service.ttl(key);
        expect(ttlResult.data).toBeLessThanOrEqual(ttl);
        expect(ttlResult.data).toBeGreaterThan(0);
      });

      it('should set expiration correctly', async () => {
        const key = 'expire-test';
        await service.set(key, 'value');

        const expireResult = await service.expire(key, 50);
        expect(expireResult.success).toBe(true);
        expect(expireResult.data).toBe(true);

        const ttlResult = await service.ttl(key);
        expect(ttlResult.data).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Batch Operations', () => {
    it('should batch get multiple keys', async () => {
      const keys = ['batch1', 'batch2', 'batch3'];
      const values = ['value1', 'value2', 'value3'];

      // Set up test data
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }

      const batchResult = await service.batchGet(keys);
      expect(batchResult.success).toBe(true);
      expect(batchResult.successCount).toBe(3);
      expect(batchResult.failureCount).toBe(0);
      expect(batchResult.data).toEqual(values);
    });

    it('should batch set multiple key-value pairs', async () => {
      const items = [
        { key: 'batch-set1', value: 'value1', ttl: 100 },
        { key: 'batch-set2', value: 'value2' },
        { key: 'batch-set3', value: 'value3', ttl: 200 },
      ];

      const batchResult = await service.batchSet(items);
      expect(batchResult.success).toBe(true);
      expect(batchResult.successCount).toBe(3);
      expect(batchResult.failureCount).toBe(0);

      // Verify values were set
      for (const item of items) {
        const getResult = await service.get(item.key);
        expect(getResult.hit).toBe(true);
        expect(getResult.data).toBe(item.value);
      }
    });

    it('should batch delete multiple keys', async () => {
      const keys = ['del1', 'del2', 'del3'];

      // Set up test data
      for (const key of keys) {
        await service.set(key, `value-${key}`);
      }

      const batchDeleteResult = await service.batchDelete(keys);
      expect(batchDeleteResult.success).toBe(true);
      expect(batchDeleteResult.successCount).toBe(3);
      expect(batchDeleteResult.failureCount).toBe(0);

      // Verify keys are deleted
      for (const key of keys) {
        const getResult = await service.get(key);
        expect(getResult.hit).toBe(false);
      }
    });

    it('should clear cache with pattern', async () => {
      // Set up test data
      await service.set('pattern:test1', 'value1');
      await service.set('pattern:test2', 'value2');
      await service.set('other:test3', 'value3');

      const clearResult = await service.clear('pattern:*');
      expect(clearResult.success).toBe(true);
      expect(clearResult.deletedCount).toBe(2);

      // Verify pattern keys deleted, others remain
      expect((await service.get('pattern:test1')).hit).toBe(false);
      expect((await service.get('pattern:test2')).hit).toBe(false);
      expect((await service.get('other:test3')).hit).toBe(true);
    });
  });

  describe('Advanced Operations', () => {
    it('should increment and decrement numbers', async () => {
      const key = 'counter';

      // Start from 0
      let incResult = await service.increment(key);
      expect(incResult.success).toBe(true);
      expect(incResult.data).toBe(1);

      // Increment by custom amount
      incResult = await service.increment(key, 5);
      expect(incResult.data).toBe(6);

      // Decrement
      const decResult = await service.decrement(key, 2);
      expect(decResult.success).toBe(true);
      expect(decResult.data).toBe(4);
    });

    it('should implement getOrSet correctly', async () => {
      const key = 'get-or-set-test';
      let factoryCalled = false;

      const factory = jest.fn(() => {
        factoryCalled = true;
        return 'factory-value';
      });

      // First call should execute factory
      let result = await service.getOrSet(key, factory);
      expect(result.hit).toBe(true);
      expect(result.data).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1);

      // Second call should use cached value
      result = await service.getOrSet(key, factory);
      expect(result.hit).toBe(true);
      expect(result.data).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should implement setIfNotExists correctly', async () => {
      const key = 'set-if-not-exists';

      // First set should succeed
      let setResult = await service.setIfNotExists(key, 'first-value');
      expect(setResult.success).toBe(true);
      expect(setResult.data).toBe(true);

      // Second set should fail
      setResult = await service.setIfNotExists(key, 'second-value');
      expect(setResult.success).toBe(false);
      expect(setResult.data).toBe(false);

      // Value should remain unchanged
      const getResult = await service.get(key);
      expect(getResult.data).toBe('first-value');
    });
  });

  describe('Monitoring and Statistics', () => {
    it('should collect and return statistics', async () => {
      // Perform some operations
      await service.set('stats-test1', 'value1');
      await service.set('stats-test2', 'value2');
      await service.get('stats-test1'); // hit
      await service.get('non-existent'); // miss

      const statsResult = await service.getStats();
      expect(statsResult.success).toBe(true);
      expect(statsResult.data.hits).toBeGreaterThan(0);
      expect(statsResult.data.misses).toBeGreaterThan(0);
      expect(statsResult.data.totalOperations).toBeGreaterThan(0);
      expect(statsResult.data.keyCount).toBe(2);
      expect(statsResult.data.hitRate).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      // Perform operations to generate stats
      await service.set('reset-test', 'value');
      await service.get('reset-test');

      // Reset stats
      const resetResult = await service.resetStats();
      expect(resetResult.success).toBe(true);

      // Verify stats are reset
      const statsResult = await service.getStats();
      expect(statsResult.data.hits).toBe(0);
      expect(statsResult.data.misses).toBe(0);
      expect(statsResult.data.totalOperations).toBe(0);
    });

    it('should provide health information', async () => {
      const healthResult = await service.getHealth();
      expect(healthResult.success).toBe(true);
      expect(healthResult.data.connectionStatus).toBe(CACHE_STATUS.CONNECTED);
      expect(healthResult.data.memoryStatus).toBeDefined();
      expect(healthResult.data.performanceStatus).toBeDefined();
      expect(healthResult.healthScore).toBeGreaterThan(0);
      expect(healthResult.checks).toBeInstanceOf(Array);
    });

    it('should provide memory usage information', async () => {
      const memoryResult = await service.getMemoryUsage();
      expect(memoryResult.success).toBe(true);
      expect(memoryResult.data.usedMemoryBytes).toBeGreaterThanOrEqual(0);
      expect(memoryResult.data.totalMemoryBytes).toBeGreaterThan(0);
      expect(memoryResult.data.memoryUsageRatio).toBeGreaterThanOrEqual(0);
      expect(memoryResult.data.keyCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide connection information', async () => {
      const connectionResult = await service.getConnectionInfo();
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.data.status).toBe('connected');
      expect(connectionResult.data.address).toBe('memory');
      expect(connectionResult.data.port).toBe(0);
    });
  });

  describe('Extended Features', () => {
    it('should refresh configuration', async () => {
      const newConfig = { ...testConfig, defaultTtlSeconds: 600 };

      await service.refreshConfig(newConfig);
      expect(service.config.defaultTtlSeconds).toBe(600);
    });

    it('should respond to ping', async () => {
      const pingResult = await service.ping();
      expect(pingResult.success).toBe(true);
      expect(typeof pingResult.data).toBe('number');
      expect(pingResult.data).toBeGreaterThanOrEqual(0);
    });

    it('should get keys with pattern', async () => {
      await service.set('prefix:key1', 'value1');
      await service.set('prefix:key2', 'value2');
      await service.set('other:key3', 'value3');

      const keysResult = await service.getKeys('prefix:*');
      expect(keysResult.success).toBe(true);
      expect(keysResult.data).toHaveLength(2);
      expect(keysResult.data).toContain('prefix:key1');
      expect(keysResult.data).toContain('prefix:key2');
    });

    it('should export and import data', async () => {
      // Set up test data
      const testData = {
        'export-key1': 'value1',
        'export-key2': { nested: 'value2' },
        'export-key3': 42,
      };

      for (const [key, value] of Object.entries(testData)) {
        await service.set(key, value);
      }

      // Export data
      const exportResult = await service.exportData('export-*');
      expect(exportResult.success).toBe(true);
      expect(exportResult.data).toEqual(testData);

      // Clear and import
      await service.clear('export-*');

      const importResult = await service.importData(testData);
      expect(importResult.success).toBe(true);
      expect(importResult.data.successful).toBe(3);
      expect(importResult.data.failed).toBe(0);

      // Verify imported data
      for (const [key, expectedValue] of Object.entries(testData)) {
        const getResult = await service.get(key);
        expect(getResult.data).toEqual(expectedValue);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle value size limit exceeded', async () => {
      const largeValue = 'x'.repeat(2 * 1024 * 1024); // 2MB, exceeds 1MB limit

      const setResult = await service.set('large-key', largeValue);
      expect(setResult.success).toBe(false);
      expect(setResult.error).toContain('too large');
    });

    it('should handle invalid configuration refresh', async () => {
      const invalidConfig = { defaultTtlSeconds: -1 };

      await expect(service.refreshConfig(invalidConfig)).rejects.toThrow();
    });
  });

  describe('TTL and Expiration', () => {
    it('should handle expired keys correctly', async () => {
      const key = 'expire-test';

      // Set with very short TTL
      await service.set(key, 'value', { ttl: 1 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const getResult = await service.get(key);
      expect(getResult.hit).toBe(false);
    });

    it('should clean up expired keys automatically', async () => {
      // This test verifies the TTL cleanup timer works
      const key = 'cleanup-test';

      await service.set(key, 'value', { ttl: 1 });

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1200));

      const statsResult = await service.getStats();
      // The key should not be counted after cleanup
      expect(statsResult.data.keyCount).toBe(0);
    });
  });
});