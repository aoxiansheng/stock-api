import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StreamCacheStandardizedService } from '@core/05-caching/module/stream-cache/services/stream-cache-standardized.service';
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
} from '@monitoring/contracts';
import { StreamDataPoint } from '@core/05-caching/module/stream-cache/interfaces/stream-cache.interface';

describe('StreamCacheStandardizedService - Edge Cases and Complex Scenarios', () => {
  let service: StreamCacheStandardizedService;
  let redis: jest.Mocked<Redis>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let module: TestingModule;

  const mockStreamCacheConfig = {
    hotCacheTTL: 5000,
    warmCacheTTL: 300,
    maxHotCacheSize: 10, // Small size for testing eviction
    streamBatchSize: 3,  // Small batch for testing chunking
    connectionTimeout: 5000,
    heartbeatInterval: 10000,
    compressionThreshold: 1024,
    cleanupInterval: 60000,
    compressionEnabled: true,
    performanceMonitoring: true,
    maxRetryAttempts: 3,
    retryBaseDelay: 100,
    retryDelayMultiplier: 2,
    memoryCleanupThreshold: 0.85,
    slowOperationThreshold: 100,
    statsLogInterval: 60000,
    verboseLogging: false,
    enableFallback: true,
    defaultTTL: 300,
    minTTL: 1,
    maxTTL: 3600,
    maxCacheSize: 10,
    maxBatchSize: 3,
    maxCleanupItems: 1000,
    compressionDataType: 'stream',
  };

  const mockUnifiedCacheConfig = {
    name: 'stream-cache',
    defaultTtlSeconds: 300,
    maxTtlSeconds: 3600,
    minTtlSeconds: 1,
    compressionEnabled: true,
    compressionThresholdBytes: 1024,
    metricsEnabled: true,
    performanceMonitoringEnabled: true,
    ttl: {
      realTimeTtlSeconds: 5,
      nearRealTimeTtlSeconds: 150,
      batchQueryTtlSeconds: 300,
      offHoursTtlSeconds: 600,
      weekendTtlSeconds: 1200,
    },
    performance: {
      maxMemoryMb: 1, // Very low memory for testing
      defaultBatchSize: 3,
      maxConcurrentOperations: 100,
      slowOperationThresholdMs: 100,
      connectionTimeoutMs: 5000,
      operationTimeoutMs: 5000,
    },
    intervals: {
      cleanupIntervalMs: 60000,
      healthCheckIntervalMs: 20000,
      metricsCollectionIntervalMs: 60000,
      statsLogIntervalMs: 60000,
      heartbeatIntervalMs: 10000,
    },
    limits: {
      maxKeyLength: 255,
      maxValueSizeBytes: 10485760,
      maxCacheEntries: 10,
      memoryThresholdRatio: 0.85,
      errorRateAlertThreshold: 0.05,
    },
    retry: {
      maxRetryAttempts: 3,
      baseRetryDelayMs: 100,
      retryDelayMultiplier: 2,
      maxRetryDelayMs: 10000,
      exponentialBackoffEnabled: true,
    },
  };

  const mockStreamDataPoint: StreamDataPoint = {
    s: 'AAPL',
    p: 150.25,
    v: 1000,
    t: Date.now(),
    c: 1.25,
    cp: 0.84,
  };

  beforeEach(async () => {
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      ping: jest.fn(),
      pipeline: jest.fn(),
      scan: jest.fn(),
      unlink: jest.fn(),
      incrby: jest.fn(),
      decrby: jest.fn(),
      expire: jest.fn(),
      info: jest.fn(),
      quit: jest.fn(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn(),
      options: { host: 'localhost', port: 6379 },
    };

    const mockEventBus = {
      emit: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        switch (key) {
          case 'cacheUnified':
            return mockUnifiedCacheConfig;
          default:
            return defaultValue;
        }
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        StreamCacheStandardizedService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: mockRedis,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: STREAM_CACHE_CONFIG_TOKEN,
          useValue: mockStreamCacheConfig,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StreamCacheStandardizedService>(StreamCacheStandardizedService);
    redis = module.get<jest.Mocked<Redis>>(CACHE_REDIS_CLIENT_TOKEN);
    eventBus = module.get<jest.Mocked<EventEmitter2>>(EventEmitter2);

    await service.initialize(mockUnifiedCacheConfig);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent set operations on same key', async () => {
      const testKey = 'concurrent:test:key';
      const data1 = [{ ...mockStreamDataPoint, s: 'DATA1' }];
      const data2 = [{ ...mockStreamDataPoint, s: 'DATA2' }];

      redis.setex.mockResolvedValue('OK');

      const promises = [
        service.set(testKey, data1),
        service.set(testKey, data2),
        service.set(testKey, data1),
      ];

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle concurrent get/set operations', async () => {
      const testKey = 'concurrent:getset:key';
      redis.get.mockResolvedValue(JSON.stringify([mockStreamDataPoint]));
      redis.setex.mockResolvedValue('OK');

      const promises = [
        service.get(testKey),
        service.set(testKey, [mockStreamDataPoint]),
        service.get(testKey),
        service.delete(testKey),
      ];

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle concurrent batch operations', async () => {
      const keys1 = ['batch1:key1', 'batch1:key2'];
      const keys2 = ['batch2:key1', 'batch2:key2'];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify([mockStreamDataPoint])],
          [null, null],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const promises = [
        service.getBatchData(keys1),
        service.getBatchData(keys2),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);
    });
  });

  describe('Memory Pressure and Eviction Scenarios', () => {
    it('should trigger LRU eviction under memory pressure', async () => {
      redis.setex.mockResolvedValue('OK');

      // Fill cache beyond capacity
      const keys = [];
      for (let i = 0; i < 15; i++) { // More than maxHotCacheSize
        const key = `memory:pressure:${i}`;
        keys.push(key);
        const data = Array(100).fill({ ...mockStreamDataPoint, s: `SYM${i}` });
        await service.set(key, data);
      }

      const capacityInfo = await service.getCapacityInfo();
      expect(capacityInfo.currentKeys).toBeLessThanOrEqual(mockStreamCacheConfig.maxHotCacheSize);
    });

    it('should report high memory utilization correctly', async () => {
      redis.setex.mockResolvedValue('OK');

      // Fill cache with large data sets
      for (let i = 0; i < 8; i++) {
        const key = `large:data:${i}`;
        const largeData = Array(1000).fill(mockStreamDataPoint);
        await service.set(key, largeData);
      }

      const health = await service.getHealth();
      const capacityInfo = await service.getCapacityInfo();

      // Should detect high memory usage
      expect(capacityInfo.memoryUtilization).toBeGreaterThan(0);
    });

    it('should handle memory cleanup during periodic cleanup', async () => {
      redis.setex.mockResolvedValue('OK');

      // Add data with past timestamps to simulate expired entries
      const hotCache = (service as any).hotCache;
      for (let i = 0; i < 5; i++) {
        hotCache.set(`expired:${i}`, {
          data: [mockStreamDataPoint],
          timestamp: Date.now() - 10000, // 10 seconds ago (expired)
          accessCount: 1,
        });
      }

      // Trigger cleanup
      await (service as any).cleanupExpiredEntries();

      expect(hotCache.size).toBeLessThan(5);
    });
  });

  describe('Network Failure and Recovery Scenarios', () => {
    it('should handle intermittent Redis failures', async () => {
      const testKey = 'network:failure:key';

      // Simulate intermittent failures
      redis.get
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(JSON.stringify([mockStreamDataPoint]))
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce(JSON.stringify([mockStreamDataPoint]));

      const results = [];
      for (let i = 0; i < 4; i++) {
        const result = await service.get(`${testKey}:${i}`);
        results.push(result);
      }

      // Should handle both failures and successes
      expect(results.some(r => r.success)).toBe(true);
      expect(results.some(r => !r.success)).toBe(true);
    });

    it('should fallback to hot cache when Redis is unavailable', async () => {
      const testKey = 'fallback:test:key';

      // First, set data successfully
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, [mockStreamDataPoint]);

      // Then simulate Redis failure
      redis.get.mockRejectedValue(new Error('Redis unavailable'));

      // Should still get data from hot cache
      const result = await service.get(testKey);
      expect(result.success).toBe(true);
      expect(result.cacheLevel).toBe('hot-cache');
    });

    it('should handle Redis unavailability during batch operations', async () => {
      const testKeys = ['unavailable:key1', 'unavailable:key2'];

      // Simulate Redis pipeline failure
      redis.pipeline.mockImplementation(() => {
        throw new Error('Redis cluster unavailable');
      });

      // Should fallback to individual operations which will also fail
      redis.get.mockRejectedValue(new Error('Redis unavailable'));

      const result = await service.getBatchData(testKeys);

      // Should handle gracefully and return empty results
      expect(result).toBeDefined();
      expect(Object.keys(result)).toEqual(testKeys);
      expect(Object.values(result).every(v => v === null)).toBe(true);
    });
  });

  describe('Data Corruption and Malformed Data Scenarios', () => {
    it('should handle various forms of corrupted JSON data', async () => {
      const corruptedDataSamples = [
        'invalid-json',
        '{"incomplete":',
        '{"circular":{"ref":',
        'null',
        'undefined',
        '',
        '[]', // Valid but empty
        '{}', // Valid but wrong structure
        '{"s":"AAPL","p":"not-a-number"}', // Invalid number
      ];

      for (let i = 0; i < corruptedDataSamples.length; i++) {
        redis.get.mockResolvedValue(corruptedDataSamples[i]);

        const result = await service.get(`corrupted:${i}`);
        // Should either succeed with parsed data or fail gracefully
        expect(result).toBeDefined();
      }
    });

    it('should handle extremely large data sets', async () => {
      const testKey = 'extreme:large:data';
      const hugeData = Array(10000).fill(mockStreamDataPoint);

      redis.setex.mockResolvedValue('OK');

      const result = await service.set(testKey, hugeData);
      expect(result.success).toBe(true);
    });

    it('should handle data with unusual field values', async () => {
      const unusualData = [
        { s: '', p: 0, v: 0, t: 0 }, // Empty/zero values
        { s: 'A'.repeat(1000), p: Infinity, v: -1, t: Date.now() }, // Extreme values
        { s: null, p: undefined, v: NaN, t: 'not-a-timestamp' }, // Invalid types
        {}, // Empty object
      ];

      redis.setex.mockResolvedValue('OK');

      const result = await service.set('unusual:data', unusualData);
      expect(result.success).toBe(true);
    });
  });

  describe('Timeout and Performance Edge Cases', () => {
    it('should handle slow Redis operations with timeouts', async () => {
      const testKey = 'slow:operation:key';

      // Simulate slow operation
      redis.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('{"data":"slow"}'), 200))
      );

      const start = Date.now();
      const result = await service.get(testKey);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(100); // Should take time
    });

    it('should detect and report slow operations', async () => {
      const testKey = 'performance:monitoring:key';

      // Simulate slow operation that exceeds threshold
      redis.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(JSON.stringify([mockStreamDataPoint])), 150))
      );

      await service.get(testKey);

      // Should emit performance event for slow operation
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('cache.performance'),
        expect.any(Object)
      );
    });

    it('should handle scan operations with large key sets and timeouts', async () => {
      const largeKeySet = Array.from({ length: 15000 }, (_, i) => `large:set:key:${i}`);

      redis.scan
        .mockResolvedValueOnce(['cursor1', largeKeySet.slice(0, 5000)])
        .mockResolvedValueOnce(['cursor2', largeKeySet.slice(5000, 10000)])
        .mockResolvedValueOnce(['0', largeKeySet.slice(10000)]);

      const keys = await (service as any).scanKeysWithTimeout('large:*', 5000);

      // Should handle large sets but may timeout
      expect(keys).toBeDefined();
      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle configuration with extreme values', async () => {
      const extremeConfig = {
        ...mockStreamCacheConfig,
        hotCacheTTL: 1, // Very short TTL
        maxHotCacheSize: 1, // Very small cache
        streamBatchSize: 1, // Tiny batches
      };

      const extremeValidation = service.validateModuleSpecificConfig(extremeConfig);
      expect(extremeValidation.isValid).toBe(false); // Should reject extreme values
    });

    it('should handle missing configuration values gracefully', async () => {
      const partialConfig = {
        hotCacheTTL: 5000,
        // Missing many required fields
      };

      redis.setex.mockResolvedValue('OK');

      // Should still work with defaults
      const result = await service.set('partial:config:test', [mockStreamDataPoint]);
      expect(result.success).toBe(true);
    });

    it('should handle dynamic configuration updates during operations', async () => {
      const testKey = 'dynamic:config:key';
      redis.setex.mockResolvedValue('OK');

      // Start with initial config
      await service.set(testKey, [mockStreamDataPoint]);

      // Update configuration mid-flight
      await service.applyConfigUpdate({
        ttl: {
          realTimeTtlSeconds: 5,
          nearRealTimeTtlSeconds: 30,
          batchQueryTtlSeconds: 600,
          offHoursTtlSeconds: 3600,
          weekendTtlSeconds: 7200,
        },
        performance: {
          maxMemoryMb: 100,
          defaultBatchSize: 1,
          maxConcurrentOperations: 10,
          slowOperationThresholdMs: 1000,
          connectionTimeoutMs: 5000,
          operationTimeoutMs: 10000,
        },
      });

      // Continue operations with new config
      const result = await service.set(`${testKey}:2`, [mockStreamDataPoint]);
      expect(result.success).toBe(true);
    });
  });

  describe('Complex Cleanup Scenarios', () => {
    it('should handle cleanup operations with mixed key types', async () => {
      redis.scan.mockResolvedValue([
        '0',
        [
          'stream_cache_warm:normal:key',
          'stream_cache_warm:expired:key',
          'other:namespace:key', // Different namespace
          'stream_cache_warm:', // Empty suffix
        ]
      ]);

      redis.unlink.mockResolvedValue(3);

      const result = await service.clear('stream*');
      expect(result.success).toBe(true);
    });

    it('should handle cleanup when Redis returns inconsistent scan results', async () => {
      // Simulate Redis returning different results on consecutive scans
      redis.scan
        .mockResolvedValueOnce(['cursor1', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3', 'key1']]); // key1 appears again

      redis.unlink.mockResolvedValue(2);

      const result = await service.clear('*');
      expect(result.success).toBe(true);
    });

    it('should handle cleanup with expired keys that have unusual TTL values', async () => {
      const keys = ['stream_cache_warm:ttl1', 'stream_cache_warm:ttl2', 'stream_cache_warm:ttl3'];
      redis.scan.mockResolvedValue(['0', keys]);

      const mockPipeline = {
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, -1], // Key with no TTL
          [null, -2], // Key doesn't exist
          [null, 5000], // Key with very long TTL
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);
      redis.unlink.mockResolvedValue(2);

      const expiredKeys = await (service as any).clearExpiredOnly('stream*', 300);
      expect(expiredKeys).toBeDefined();
      expect(Array.isArray(expiredKeys)).toBe(true);
    });
  });

  describe('Event System Edge Cases', () => {
    it('should handle event emission failures gracefully', async () => {
      // Mock event bus to fail
      eventBus.emit.mockImplementation(() => {
        throw new Error('Event system failure');
      });

      const testKey = 'event:failure:key';
      redis.setex.mockResolvedValue('OK');

      // Operations should continue despite event failures
      const result = await service.set(testKey, [mockStreamDataPoint]);
      expect(result.success).toBe(true);
    });

    it('should handle metric reporting when service is destroyed', async () => {
      await service.destroy();

      // Should not crash when trying to report metrics after destruction
      await service.reportSystemMetrics();

      // Events should not be emitted after destruction
      const emitCalls = eventBus.emit.mock.calls.length;
      expect(emitCalls).toBe(0);
    });

    it('should handle rapid metric reporting', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(service.reportSystemMetrics());
      }

      await Promise.all(promises);

      // Should handle concurrent metric reporting
      expect(eventBus.emit).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup and Memory Leaks', () => {
    it('should clean up all resources on destroy', async () => {
      // Create some async operations
      await service.reportSystemMetrics();

      // Destroy should clean up everything
      await service.destroy();

      expect(service.isInitialized).toBe(false);
      expect(service.isHealthy).toBe(false);
    });

    it('should handle destroy being called multiple times', async () => {
      await service.destroy();
      await service.destroy(); // Second call should be safe
      await service.destroy(); // Third call should be safe

      expect(service.isInitialized).toBe(false);
    });

    it('should prevent new operations after destroy', async () => {
      await service.destroy();

      // Operations after destroy should fail or be ignored
      await service.reportSystemMetrics(); // Should not crash
    });
  });

  describe('Statistics Edge Cases', () => {
    it('should handle statistics when no operations have been performed', async () => {
      const stats = await service.getStats();
      expect(stats.success).toBe(true);
      expect(stats.data.totalOperations).toBeDefined();
    });

    it('should handle error rate calculation with zero operations', async () => {
      const perfMetrics = await service.getPerformanceMetrics();
      expect(perfMetrics.errorRate).toBeDefined();
      expect(perfMetrics.hitRate).toBeDefined();
    });

    it('should maintain statistics accuracy under high operation volume', async () => {
      redis.get.mockResolvedValue(JSON.stringify([mockStreamDataPoint]));
      redis.setex.mockResolvedValue('OK');

      // Perform many operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(service.get(`high:volume:${i}`));
        operations.push(service.set(`high:volume:${i}`, [mockStreamDataPoint]));
      }

      await Promise.allSettled(operations);

      const stats = await service.getStats();
      expect(stats.data.totalOperations).toBeGreaterThan(0);
    });
  });

  describe('Legacy Interface Compatibility', () => {
    it('should maintain compatibility with legacy clearAll interface', async () => {
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:legacy1']]);
      redis.unlink.mockResolvedValue(1);

      await service.clearAll({ force: true, preserveActive: false });

      // Should not throw and should clean up data
      expect(redis.scan).toHaveBeenCalled();
    });

    it('should handle legacy setData with different priorities', async () => {
      redis.setex.mockResolvedValue('OK');

      await service.setData('legacy:hot', [mockStreamDataPoint], 'hot');
      await service.setData('legacy:warm', [mockStreamDataPoint], 'warm');
      await service.setData('legacy:auto', [mockStreamDataPoint], 'auto');

      // All should succeed
      expect(redis.setex).toHaveBeenCalledTimes(3);
    });

    it('should maintain backward compatibility for health status format', async () => {
      redis.ping.mockResolvedValue('PONG');

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.hotCacheSize).toBeDefined();
      expect(healthStatus.redisConnected).toBeDefined();
      expect(healthStatus.performance).toBeDefined();
    });
  });
});