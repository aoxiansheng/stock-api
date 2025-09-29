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

describe('StreamCacheStandardizedService - Enhanced Tests', () => {
  let service: StreamCacheStandardizedService;
  let redis: jest.Mocked<Redis>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let module: TestingModule;

  const mockStreamCacheConfig = {
    hotCacheTTL: 5000,
    warmCacheTTL: 300,
    maxHotCacheSize: 1000,
    streamBatchSize: 100,
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
      maxMemoryMb: 256,
      defaultBatchSize: 50,
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
      maxCacheEntries: 1000,
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

  const mockStreamDataArray: StreamDataPoint[] = [
    mockStreamDataPoint,
    { s: 'GOOGL', p: 2800.50, v: 500, t: Date.now() + 1000 },
  ];

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
          case 'cacheUnified.defaultTtlSeconds':
            return 300;
          case 'cacheUnified.compressionThresholdBytes':
            return 1024;
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

    // Initialize the service
    await service.initialize(mockUnifiedCacheConfig);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Service Lifecycle', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service.moduleType).toBe('stream');
      expect(service.moduleCategory).toBe('specialized');
      expect(service.name).toBe('StreamCacheStandardized');
      expect(service.version).toBe('2.0.0');
      expect(service.isInitialized).toBe(true);
      expect(service.isHealthy).toBe(true);
    });

    it('should have correct supported features', () => {
      const features = service.supportedFeatures;
      expect(features).toContain('get');
      expect(features).toContain('set');
      expect(features).toContain('hot-cache');
      expect(features).toContain('warm-cache');
      expect(features).toContain('compression');
      expect(features).toContain('health-check');
      expect(features).toContain('performance-metrics');
      expect(features).toContain('self-healing');
    });

    it('should cleanup properly on destroy', async () => {
      await service.destroy();
      expect(service.isInitialized).toBe(false);
      expect(service.isHealthy).toBe(false);
    });
  });

  describe('Core Cache Operations', () => {
    it('should handle get operation with hot cache hit', async () => {
      const testKey = 'test:AAPL';

      // First set data to populate hot cache
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      // Clear redis mock to ensure hot cache is used
      redis.get.mockClear();

      const result = await service.get(testKey);

      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.cacheLevel).toBe('hot-cache');
      expect(result.data).toEqual(mockStreamDataArray);
    });

    it('should handle get operation with warm cache fallback', async () => {
      const testKey = 'stream:test:AAPL';
      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));

      const result = await service.get(testKey);

      expect(redis.get).toHaveBeenCalledWith(testKey);
      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.cacheLevel).toBe('warm-cache');
      expect(result.data).toEqual(mockStreamDataArray);
    });

    it('should handle cache miss gracefully', async () => {
      const testKey = 'stream:test:NONEXISTENT';
      redis.get.mockResolvedValue(null);

      const result = await service.get(testKey);

      expect(result.success).toBe(true);
      expect(result.hit).toBe(false);
      expect(result.data).toBeNull();
    });

    it('should handle set operation to both hot and warm cache', async () => {
      const testKey = 'test:AAPL';
      redis.setex.mockResolvedValue('OK');

      const result = await service.set(testKey, mockStreamDataArray);

      expect(redis.setex).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should reject empty data in set operation', async () => {
      const testKey = 'test:EMPTY';

      const result = await service.set(testKey, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Value cannot be empty');
    });

    it('should handle delete operation from both caches', async () => {
      const testKey = 'test:AAPL';

      // Set data first
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      // Mock delete operation
      redis.del.mockResolvedValue(1);

      const result = await service.delete(testKey);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThan(0);
    });

    it('should check existence in hot cache first', async () => {
      const testKey = 'test:AAPL';

      // Set data to hot cache
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      const result = await service.exists(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return TTL for hot cache entries', async () => {
      const testKey = 'test:AAPL';

      // Set data to hot cache
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      const result = await service.ttl(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThan(0);
    });
  });

  describe('Stream-Specific Operations', () => {
    it('should get stream data using legacy interface', async () => {
      const testKey = 'AAPL:quote';
      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));

      const result = await service.getData(testKey);

      expect(result).toEqual(mockStreamDataArray);
    });

    it('should set stream data with priority handling', async () => {
      const testKey = 'AAPL:quote';
      redis.setex.mockResolvedValue('OK');

      await service.setData(testKey, mockStreamDataArray, 'hot');

      expect(redis.setex).toHaveBeenCalled();
    });

    it('should handle batch data retrieval efficiently', async () => {
      const testKeys = ['AAPL:quote', 'GOOGL:quote'];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify([mockStreamDataPoint])],
          [null, JSON.stringify(mockStreamDataArray)],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getBatchData(testKeys);

      expect(result).toEqual({
        'AAPL:quote': [mockStreamDataPoint],
        'GOOGL:quote': mockStreamDataArray,
      });
    });

    it('should filter incremental data by timestamp', async () => {
      const testKey = 'AAPL:quote';
      const since = Date.now() - 5000;
      const futurePoint = { ...mockStreamDataPoint, t: Date.now() + 1000 };
      const pastPoint = { ...mockStreamDataPoint, t: since - 1000 };
      const dataWithTimestamps = [pastPoint, futurePoint];

      redis.get.mockResolvedValue(JSON.stringify(dataWithTimestamps));

      const result = await service.getDataSince(testKey, since);

      expect(result).toEqual([futurePoint]);
    });

    it('should clear all cache data with proper pattern matching', async () => {
      const mockKeys = ['stream::AAPL:quote', 'stream::GOOGL:quote'];
      redis.scan.mockResolvedValue(['0', mockKeys]);
      redis.unlink.mockResolvedValue(mockKeys.length);

      await service.clearAll();

      expect(redis.scan).toHaveBeenCalled();
      expect(redis.unlink).toHaveBeenCalledWith(...mockKeys);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      const result = await service.getStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.hits).toBeDefined();
      expect(result.data.misses).toBeDefined();
      expect(result.data.hitRate).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.cacheType).toBe('stream-cache');
    });

    it('should provide health status with Redis connectivity', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.getHealth();

      expect(result.success).toBe(true);
      expect(result.healthScore).toBeGreaterThan(70);
    });

    it('should run comprehensive diagnostics', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.runDiagnostics();

      expect(result.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.overallHealthScore).toBeLessThanOrEqual(100);
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should provide detailed performance metrics', async () => {
      const result = await service.getPerformanceMetrics();

      expect(result.avgResponseTime).toBeDefined();
      expect(result.hitRate).toBeDefined();
      expect(result.errorRate).toBeDefined();
      expect(result.memoryEfficiency).toBeDefined();
    });

    it('should attempt self-healing when issues detected', async () => {
      redis.ping
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce('PONG');

      const result = await service.attemptSelfHealing();

      expect(result.success).toBe(true);
      expect(result.attemptedFixes).toBeGreaterThan(0);
      expect(result.fixes).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const testKey = 'stream:test:ERROR';
      redis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get(testKey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis connection failed');
    });

    it('should handle malformed JSON data gracefully', async () => {
      const testKey = 'stream:test:MALFORMED';
      redis.get.mockResolvedValue('invalid-json-data');

      const result = await service.get(testKey);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should emit system events for monitoring', async () => {
      redis.ping.mockResolvedValue('PONG');

      await service.reportSystemMetrics();

      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should handle concurrent operations safely', async () => {
      const testKey = 'stream:test:CONCURRENT';
      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));
      redis.setex.mockResolvedValue('OK');

      const getPromise = service.get(testKey);
      const setPromise = service.set(testKey, mockStreamDataArray);

      const [getResult, setResult] = await Promise.all([getPromise, setPromise]);

      expect(getResult.success).toBe(true);
      expect(setResult.success).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration properly', () => {
      const result = service.validateConfig(mockUnifiedCacheConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = { ...mockUnifiedCacheConfig, defaultTtlSeconds: -1 };

      const result = service.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should apply configuration updates', async () => {
      const newConfig = {
        defaultTtlSeconds: 600,
        performance: {
          ...mockUnifiedCacheConfig.performance,
          defaultBatchSize: 75,
        },
      };

      await service.applyConfigUpdate(newConfig);

      const currentConfig = service.config;
      expect(currentConfig.defaultTtlSeconds).toBe(600);
    });
  });

  describe('Memory Management', () => {
    it('should provide accurate capacity information', async () => {
      const capacityInfo = await service.getCapacityInfo();

      expect(capacityInfo.currentKeys).toBeDefined();
      expect(capacityInfo.maxKeys).toBeDefined();
      expect(capacityInfo.keyUtilization).toBeDefined();
      expect(capacityInfo.currentMemory).toBeDefined();
      expect(capacityInfo.maxMemory).toBeDefined();
      expect(capacityInfo.memoryUtilization).toBeDefined();
    });

    it('should respect hot cache size limits through LRU eviction', async () => {
      redis.setex.mockResolvedValue('OK');

      // Fill cache beyond limit
      for (let i = 0; i < mockStreamCacheConfig.maxHotCacheSize + 10; i++) {
        await service.set(`test:key:${i}`, mockStreamDataArray);
      }

      const capacityInfo = await service.getCapacityInfo();
      expect(capacityInfo.currentKeys).toBeLessThanOrEqual(mockStreamCacheConfig.maxHotCacheSize);
    });
  });

  describe('Advanced Batch Operations', () => {
    it('should handle batch get operations efficiently', async () => {
      const testKeys = ['key1', 'key2'];
      redis.get
        .mockResolvedValueOnce(JSON.stringify(mockStreamDataArray))
        .mockResolvedValueOnce(null);

      const result = await service.batchGet(testKeys);

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should handle batch set operations efficiently', async () => {
      const items = [
        { key: 'key1', value: mockStreamDataArray },
        { key: 'key2', value: mockStreamDataArray, ttl: 600 },
      ];
      redis.setex.mockResolvedValue('OK');

      const result = await service.batchSet(items);

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should handle batch delete operations efficiently', async () => {
      const testKeys = ['key1', 'key2'];
      redis.del.mockResolvedValue(1);

      const result = await service.batchDelete(testKeys);

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
    });
  });

  describe('Data Import/Export Functionality', () => {
    it('should export cache data in JSON format', async () => {
      const mockKeys = ['stream::AAPL', 'stream::GOOGL'];
      redis.scan.mockResolvedValue(['0', mockKeys]);

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify(mockStreamDataArray)],
          [null, JSON.stringify([mockStreamDataPoint])],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.exportData();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('object');
    });

    it('should import cache data from JSON', async () => {
      const importData = {
        'test:key1': mockStreamDataArray,
        'test:key2': [mockStreamDataPoint],
      };
      redis.setex.mockResolvedValue('OK');

      const result = await service.importData(importData);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);
      expect(result.data.successful).toBe(2);
    });
  });

  describe('Incremental Operations', () => {
    it('should support increment operations on Redis keys', async () => {
      redis.incrby = jest.fn().mockResolvedValue(5);

      const result = await service.increment('counter:key', 3);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(redis.incrby).toHaveBeenCalledWith('stream::counter:key', 3);
    });

    it('should support decrement operations on Redis keys', async () => {
      redis.decrby = jest.fn().mockResolvedValue(2);

      const result = await service.decrement('counter:key', 3);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(redis.decrby).toHaveBeenCalledWith('stream::counter:key', 3);
    });

    it('should support setIfNotExists operations', async () => {
      redis.exists.mockResolvedValue(0); // Key doesn't exist
      redis.setex.mockResolvedValue('OK');

      const result = await service.setIfNotExists('new:key', mockStreamDataArray);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('Connection Management', () => {
    it('should provide connection information', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.getConnectionInfo();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('connected');
      expect(result.data.address).toBe('localhost');
      expect(result.data.port).toBe(6379);
    });

    it('should handle ping operations', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThanOrEqual(0);
    });

    it('should provide memory usage information', async () => {
      const result = await service.getMemoryUsage();

      expect(result.success).toBe(true);
      expect(result.data.usedMemoryBytes).toBeDefined();
      expect(result.data.totalMemoryBytes).toBeDefined();
      expect(result.data.memoryUsageRatio).toBeDefined();
      expect(result.data.keyCount).toBeDefined();
    });
  });
});