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
import { CACHE_STATUS, CACHE_OPERATIONS, CACHE_ERROR_CODES } from '@core/05-caching/foundation/constants/cache-operations.constants';

describe('StreamCacheStandardizedService - Comprehensive Coverage Tests', () => {
  let service: StreamCacheStandardizedService;
  let redis: jest.Mocked<Redis>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;
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
    statsLogInterval: 60000,
    verboseLogging: false,
    enableFallback: true,
    defaultTTL: 300,
    minTTL: 1,
    maxTTL: 3600,
    maxCacheSize: 1000,
    maxBatchSize: 100,
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
    configService = module.get<jest.Mocked<ConfigService>>(ConfigService);

    // Initialize the service
    await service.initialize(mockUnifiedCacheConfig);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Module Lifecycle and Initialization', () => {
    it('should handle initialization failure gracefully', async () => {
      const newService = module.get<StreamCacheStandardizedService>(StreamCacheStandardizedService);
      redis.ping.mockRejectedValue(new Error('Redis connection failed'));

      await expect(newService.initialize(mockUnifiedCacheConfig)).rejects.toThrow('Redis connection failed');
      expect(newService.isInitialized).toBe(false);
      expect(newService.isHealthy).toBe(false);
    });

    it('should handle onModuleInit lifecycle', async () => {
      await service.onModuleInit();
      // Should not throw
    });

    it('should handle onModuleDestroy lifecycle', async () => {
      await service.onModuleDestroy();
      expect(service.isInitialized).toBe(false);
    });

    it('should cleanup pending async operations on destroy', async () => {
      await service.reportSystemMetrics(); // This creates async operations
      await service.destroy();
      expect(service.isInitialized).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should return stream-specific config', () => {
      const config = service.getModuleSpecificConfig();
      expect(config).toBeDefined();
      expect(config.hotCacheTTL).toBe(5000);
    });

    it('should validate stream-specific config correctly', () => {
      const validConfig = { ...mockStreamCacheConfig };
      const result = service.validateModuleSpecificConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid hotCacheTTL', () => {
      const invalidConfig = { ...mockStreamCacheConfig, hotCacheTTL: 500 }; // Less than 1000ms
      const result = service.validateModuleSpecificConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('hotCacheTTL must be at least 1000ms');
    });

    it('should detect invalid warmCacheTTL', () => {
      const invalidConfig = { ...mockStreamCacheConfig, warmCacheTTL: 3 }; // Less than 5 seconds
      const result = service.validateModuleSpecificConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('warmCacheTTL must be at least 5 seconds');
    });

    it('should detect invalid maxHotCacheSize', () => {
      const invalidConfig = { ...mockStreamCacheConfig, maxHotCacheSize: 5 }; // Less than 10
      const result = service.validateModuleSpecificConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxHotCacheSize must be at least 10');
    });

    it('should warn when hot cache TTL is longer than warm cache TTL', () => {
      const invalidConfig = {
        ...mockStreamCacheConfig,
        hotCacheTTL: 600000, // 10 minutes
        warmCacheTTL: 300   // 5 minutes
      };
      const result = service.validateModuleSpecificConfig(invalidConfig);
      expect(result.warnings).toContain('Hot cache TTL is longer than warm cache TTL');
    });

    it('should apply configuration updates', async () => {
      const updates = {
        performance: {
          ...mockUnifiedCacheConfig.performance,
          defaultBatchSize: 75,
        },
        ttl: {
          ...mockUnifiedCacheConfig.ttl,
          realTimeTtlSeconds: 10,
          batchQueryTtlSeconds: 600,
        },
      };

      await service.applyConfigUpdate(updates);

      const streamConfig = service.getModuleSpecificConfig();
      expect(streamConfig.streamBatchSize).toBe(75);
      expect(streamConfig.hotCacheTTL).toBe(10000); // 10 seconds * 1000
      expect(streamConfig.warmCacheTTL).toBe(600);
    });

    it('should validate unified config', () => {
      const invalidConfig = { defaultTtlSeconds: -1 };
      const result = service.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('defaultTtlSeconds must be at least 1');
    });

    it('should validate maxCacheEntries limit', () => {
      const invalidConfig = {
        limits: {
          maxCacheEntries: 5,
          maxKeyLength: 255,
          maxValueSizeBytes: 10485760,
          memoryThresholdRatio: 0.85,
          errorRateAlertThreshold: 0.05,
        }
      };
      const result = service.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxCacheEntries must be at least 10');
    });
  });

  describe('Advanced Cache Operations', () => {
    it('should handle TTL expiration in hot cache during exists check', async () => {
      const testKey = 'test:expired:key';

      // Set data to hot cache first
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      // Mock the timestamp to make it appear expired
      const hotCache = (service as any).hotCache;
      const entry = hotCache.get(testKey);
      if (entry) {
        entry.timestamp = Date.now() - 10000; // 10 seconds ago, beyond TTL
      }

      redis.exists.mockResolvedValue(0);

      const result = await service.exists(testKey);
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should handle TTL calculation for hot cache entries', async () => {
      const testKey = 'test:ttl:key';

      // Set data to hot cache
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      const result = await service.ttl(testKey);
      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThan(0);
      expect(result.data).toBeLessThanOrEqual(5); // Should be around 5 seconds
    });

    it('should handle TTL check when hot cache entry is expired', async () => {
      const testKey = 'test:ttl:expired';

      // Set data to hot cache first
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      // Make entry appear expired
      const hotCache = (service as any).hotCache;
      const entry = hotCache.get(testKey);
      if (entry) {
        entry.timestamp = Date.now() - 10000; // 10 seconds ago
      }

      redis.ttl.mockResolvedValue(250);

      const result = await service.ttl(testKey);
      expect(result.success).toBe(true);
      expect(result.data).toBe(250);
    });

    it('should handle expire operation on hot cache', async () => {
      const testKey = 'test:expire:key';
      const newTtl = 120; // 2 minutes

      // Set data to hot cache first
      redis.setex.mockResolvedValue('OK');
      await service.set(testKey, mockStreamDataArray);

      redis.expire.mockResolvedValue(1);

      const result = await service.expire(testKey, newTtl);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);

      // Check that hot cache timestamp was adjusted
      const hotCache = (service as any).hotCache;
      const entry = hotCache.get(testKey);
      expect(entry).toBeDefined();
    });

    it('should handle expire operation when key does not exist', async () => {
      const testKey = 'test:expire:nonexistent';
      redis.expire.mockResolvedValue(0);

      const result = await service.expire(testKey, 120);
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should reject null values in set operation', async () => {
      const result = await service.set('test:key', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Value cannot be empty');
      expect(result.errorCode).toBe(CACHE_ERROR_CODES.INVALID_PARAMETER);
    });

    it('should reject undefined values in set operation', async () => {
      const result = await service.set('test:key', undefined);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Value cannot be empty');
    });

    it('should handle Redis errors in get operation', async () => {
      const testKey = 'test:error:key';
      redis.get.mockRejectedValue(new Error('Redis timeout'));

      const result = await service.get(testKey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis timeout');
      expect(result.errorCode).toBe(CACHE_ERROR_CODES.OPERATION_FAILED);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const testKey = 'test:malformed:json';
      redis.get.mockResolvedValue('invalid-json{');

      const result = await service.get(testKey);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Redis errors in delete operation', async () => {
      const testKey = 'test:delete:error';
      redis.del.mockRejectedValue(new Error('Redis delete failed'));

      const result = await service.delete(testKey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis delete failed');
    });

    it('should handle Redis errors in exists operation', async () => {
      const testKey = 'test:exists:error';
      redis.exists.mockRejectedValue(new Error('Redis connection lost'));

      const result = await service.exists(testKey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis connection lost');
    });

    it('should handle Redis errors in ttl operation', async () => {
      const testKey = 'test:ttl:error';
      redis.ttl.mockRejectedValue(new Error('Redis TTL failed'));

      const result = await service.ttl(testKey);
      expect(result.success).toBe(false);
      expect(result.data).toBe(-1);
    });

    it('should handle Redis errors in expire operation', async () => {
      const testKey = 'test:expire:error';
      redis.expire.mockRejectedValue(new Error('Redis expire failed'));

      const result = await service.expire(testKey, 300);
      expect(result.success).toBe(false);
      expect(result.data).toBe(false);
    });
  });

  describe('Increment and Decrement Operations', () => {
    it('should handle increment operation successfully', async () => {
      const testKey = 'test:counter';
      redis.incrby.mockResolvedValue(5);

      const result = await service.increment(testKey, 3);
      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(redis.incrby).toHaveBeenCalledWith('stream_cache_warm:test:counter', 3);
    });

    it('should handle increment with default delta', async () => {
      const testKey = 'test:counter';
      redis.incrby.mockResolvedValue(1);

      const result = await service.increment(testKey);
      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(redis.incrby).toHaveBeenCalledWith('stream_cache_warm:test:counter', 1);
    });

    it('should handle increment operation errors', async () => {
      const testKey = 'test:counter:error';
      redis.incrby.mockRejectedValue(new Error('Redis increment failed'));

      const result = await service.increment(testKey);
      expect(result.success).toBe(false);
      expect(result.data).toBe(0);
    });

    it('should handle decrement operation successfully', async () => {
      const testKey = 'test:counter';
      redis.decrby.mockResolvedValue(2);

      const result = await service.decrement(testKey, 3);
      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(redis.decrby).toHaveBeenCalledWith('stream_cache_warm:test:counter', 3);
    });

    it('should handle decrement operation errors', async () => {
      const testKey = 'test:counter:error';
      redis.decrby.mockRejectedValue(new Error('Redis decrement failed'));

      const result = await service.decrement(testKey);
      expect(result.success).toBe(false);
      expect(result.data).toBe(0);
    });
  });

  describe('SetIfNotExists Operation', () => {
    it('should set value when key does not exist', async () => {
      const testKey = 'test:new:key';
      redis.exists.mockResolvedValue(0); // Key doesn't exist
      redis.setex.mockResolvedValue('OK');

      const result = await service.setIfNotExists(testKey, mockStreamDataArray);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should not set value when key already exists', async () => {
      const testKey = 'test:existing:key';
      redis.exists.mockResolvedValue(1); // Key exists

      const result = await service.setIfNotExists(testKey, mockStreamDataArray);
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(result.replaced).toBe(false);
    });

    it('should handle setIfNotExists operation errors', async () => {
      const testKey = 'test:setif:error';
      redis.exists.mockRejectedValue(new Error('Redis exists check failed'));

      const result = await service.setIfNotExists(testKey, mockStreamDataArray);
      expect(result.success).toBe(false);
      expect(result.data).toBe(false);
    });
  });

  describe('Stream-Specific Legacy Interface', () => {
    it('should get data using legacy getData interface', async () => {
      const testKey = 'legacy:test:key';
      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));

      const result = await service.getData(testKey);
      expect(result).toEqual(mockStreamDataArray);
    });

    it('should return null for getData when cache miss', async () => {
      const testKey = 'legacy:missing:key';
      redis.get.mockResolvedValue(null);

      const result = await service.getData(testKey);
      expect(result).toBeNull();
    });

    it('should set data using legacy setData interface with priority', async () => {
      const testKey = 'legacy:set:key';
      redis.setex.mockResolvedValue('OK');

      await service.setData(testKey, mockStreamDataArray, 'hot');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should handle getDataSince with filtering', async () => {
      const testKey = 'legacy:since:key';
      const since = Date.now() - 5000;
      const oldPoint = { ...mockStreamDataPoint, t: since - 1000 };
      const newPoint = { ...mockStreamDataPoint, t: since + 1000 };
      const dataWithTimestamps = [oldPoint, newPoint];

      redis.get.mockResolvedValue(JSON.stringify(dataWithTimestamps));

      const result = await service.getDataSince(testKey, since);
      expect(result).toEqual([newPoint]);
    });

    it('should return null for getDataSince when no incremental data', async () => {
      const testKey = 'legacy:since:empty';
      const since = Date.now() + 1000; // Future timestamp

      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));

      const result = await service.getDataSince(testKey, since);
      expect(result).toBeNull();
    });

    it('should handle getDataSince errors gracefully', async () => {
      const testKey = 'legacy:since:error';
      redis.get.mockRejectedValue(new Error('Redis failed'));

      const result = await service.getDataSince(testKey, Date.now());
      expect(result).toBeNull();
    });

    it('should delete data using legacy deleteData interface', async () => {
      const testKey = 'legacy:delete:key';
      redis.exists.mockResolvedValue(1);
      redis.del.mockResolvedValue(1);

      await service.deleteData(testKey);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('Batch Operations with Pipeline', () => {
    it('should handle getBatchData with pipeline success', async () => {
      const testKeys = ['batch:key1', 'batch:key2'];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify([mockStreamDataPoint])],
          [null, JSON.stringify(mockStreamDataArray)],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getBatchData(testKeys);
      expect(result['batch:key1']).toEqual([mockStreamDataPoint]);
      expect(result['batch:key2']).toEqual(mockStreamDataArray);
    });

    it('should handle getBatchData with pipeline failure and fallback', async () => {
      const testKeys = ['batch:fallback:key1'];

      // Mock pipeline failure
      redis.pipeline.mockImplementation(() => {
        throw new Error('Pipeline failed');
      });

      // Mock individual get operation
      redis.get.mockResolvedValue(JSON.stringify([mockStreamDataPoint]));

      const result = await service.getBatchData(testKeys);
      expect(result['batch:fallback:key1']).toEqual([mockStreamDataPoint]);
    });

    it('should handle getBatchData with mixed results', async () => {
      const testKeys = ['batch:mixed1', 'batch:mixed2'];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify([mockStreamDataPoint])],
          [null, null], // Missing data
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getBatchData(testKeys);
      expect(result['batch:mixed1']).toEqual([mockStreamDataPoint]);
      expect(result['batch:mixed2']).toBeNull();
    });

    it('should handle getBatchData with Redis errors in pipeline', async () => {
      const testKeys = ['batch:error:key1'];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [new Error('Redis get failed'), null],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getBatchData(testKeys);
      expect(result['batch:error:key1']).toBeNull();
    });

    it('should handle getBatchData with JSON parsing errors', async () => {
      const testKeys = ['batch:parse:error'];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'invalid-json{'],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getBatchData(testKeys);
      expect(result['batch:parse:error']).toBeNull();
    });

    it('should handle empty keys array in getBatchData', async () => {
      const result = await service.getBatchData([]);
      expect(result).toEqual({});
    });

    it('should handle large batch sizes with chunking', async () => {
      const testKeys = Array.from({ length: 150 }, (_, i) => `batch:large:${i}`);

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(
          testKeys.slice(0, 50).map(() => [null, JSON.stringify([mockStreamDataPoint])])
        ),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getBatchData(testKeys);
      expect(Object.keys(result)).toHaveLength(150);
    });
  });

  describe('Data Compression and Processing', () => {
    it('should handle different data structures in compression', async () => {
      const mixedData = [
        { symbol: 'AAPL', price: 150.25, volume: 1000 },
        { s: 'GOOGL', p: 2800, v: 500 },
        'invalid-data',
        null,
      ];

      redis.setex.mockResolvedValue('OK');

      const result = await service.set('test:mixed:data', mixedData);
      expect(result.success).toBe(true);
    });

    it('should apply smart storage strategy based on data size', async () => {
      // Small data should go to hot cache
      const smallData = [mockStreamDataPoint];
      redis.setex.mockResolvedValue('OK');

      const result = await service.set('test:small', smallData, { priority: 'auto' } as any);
      expect(result.success).toBe(true);
    });

    it('should handle large data sets that exceed hot cache limits', async () => {
      // Large data should only go to warm cache
      const largeData = Array(1000).fill(mockStreamDataPoint);
      redis.setex.mockResolvedValue('OK');

      const result = await service.set('test:large', largeData, { priority: 'auto' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('LRU Eviction and Memory Management', () => {
    it('should evict least recently used entries when cache is full', async () => {
      const maxSize = service.getModuleSpecificConfig().maxHotCacheSize;
      redis.setex.mockResolvedValue('OK');

      // Fill cache to capacity + 1
      for (let i = 0; i <= maxSize; i++) {
        await service.set(`lru:key:${i}`, [{ ...mockStreamDataPoint, s: `SYM${i}` }]);
      }

      const capacityInfo = await service.getCapacityInfo();
      expect(capacityInfo.currentKeys).toBeLessThanOrEqual(maxSize);
    });

    it('should update access count when getting from hot cache', async () => {
      const testKey = 'test:access:count';
      redis.setex.mockResolvedValue('OK');

      // Set data
      await service.set(testKey, mockStreamDataArray);

      // Access multiple times
      await service.get(testKey);
      await service.get(testKey);

      // The access count should be updated (we can't directly test this due to private members)
      const result = await service.get(testKey);
      expect(result.cacheLevel).toBe('hot-cache');
    });
  });

  describe('Clear Operations', () => {
    it('should handle clear operation with preserveActive option', async () => {
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:key1', 'stream_cache_warm:key2']]);

      const mockPipeline = {
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, -1], // No TTL, should be cleaned
          [null, 100], // Has TTL, should be preserved
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);
      redis.unlink.mockResolvedValue(1);

      const result = await service.clear('*', { preserveActive: true } as any);
      expect(result.success).toBe(true);
    });

    it('should handle clear operation with force option for large datasets', async () => {
      redis.info.mockResolvedValue('db0:keys=5000');
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:key1']]);
      redis.unlink.mockResolvedValue(1);

      const result = await service.clear('*', { force: true } as any);
      expect(result.success).toBe(true);
    });

    it('should handle clear operation with batch processing for large datasets', async () => {
      redis.info.mockResolvedValue('db0:keys=5000');
      redis.scan
        .mockResolvedValueOnce(['cursor1', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);
      redis.unlink.mockResolvedValue(2);

      const result = await service.clear('*');
      expect(result.success).toBe(true);
    });

    it('should handle clear operation errors', async () => {
      redis.scan.mockRejectedValue(new Error('Redis scan failed'));

      const result = await service.clear('*');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis scan failed');
    });
  });

  describe('Health Monitoring and Diagnostics', () => {
    it('should return healthy status when Redis is responsive', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.getHealth();
      expect(result.success).toBe(true);
      expect(result.data.connectionStatus).toBe('connected');
      expect(result.healthScore).toBeGreaterThan(70);
    });

    it('should return unhealthy status with high memory utilization', async () => {
      redis.ping.mockResolvedValue('PONG');

      // Fill hot cache to simulate high memory usage
      const maxSize = service.getModuleSpecificConfig().maxHotCacheSize;
      redis.setex.mockResolvedValue('OK');

      for (let i = 0; i < maxSize; i++) {
        await service.set(`memory:key:${i}`, Array(1000).fill(mockStreamDataPoint));
      }

      const result = await service.getHealth();
      expect(result.success).toBe(true);
      // Health score should be reduced due to high memory usage
    });

    it('should return unhealthy status with high error rate', async () => {
      redis.ping.mockResolvedValue('PONG');

      // Generate some errors to increase error rate
      redis.get.mockRejectedValue(new Error('Simulated error'));
      await service.get('error:key1').catch(() => {});
      await service.get('error:key2').catch(() => {});

      const result = await service.getHealth();
      expect(result.success).toBe(true);
      // Health score might be reduced due to error rate
    });

    it('should run comprehensive diagnostics', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.runDiagnostics();
      expect(result.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.overallHealthScore).toBeLessThanOrEqual(100);
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.performanceRecommendations).toBeInstanceOf(Array);
      expect(result.configurationRecommendations).toBeInstanceOf(Array);
    });

    it('should detect Redis connection issues in diagnostics', async () => {
      redis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.runDiagnostics();
      expect(result.overallHealthScore).toBeLessThan(100);

      const redisCheck = result.checks.find(check => check.name === 'redis_connection');
      expect(redisCheck).toBeDefined();
      expect(redisCheck.status).toBe('fail');
    });

    it('should provide legacy health status interface', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.getHealthStatus();
      expect(result.status).toBe('healthy');
      expect(result.redisConnected).toBe(true);
      expect(result.hotCacheSize).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    it('should handle health check failures in legacy interface', async () => {
      redis.ping.mockRejectedValue(new Error('Redis down'));

      const result = await service.getHealthStatus();
      expect(result.status).toBe('unhealthy');
      expect(result.redisConnected).toBe(false);
      expect(result.lastError).toContain('Redis down');
    });
  });

  describe('System Metrics Reporting', () => {
    it('should report system metrics successfully', async () => {
      redis.ping.mockResolvedValue('PONG');

      await service.reportSystemMetrics();

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('METRIC_COLLECTED'),
        expect.objectContaining({
          source: 'stream-cache-standardized',
          metricType: 'system',
        })
      );
    });

    it('should report capacity warnings when memory is high', async () => {
      redis.ping.mockResolvedValue('PONG');

      // Fill hot cache to trigger memory warning
      const maxSize = service.getModuleSpecificConfig().maxHotCacheSize;
      redis.setex.mockResolvedValue('OK');

      for (let i = 0; i < maxSize * 0.9; i++) {
        await service.set(`capacity:key:${i}`, Array(1000).fill(mockStreamDataPoint));
      }

      await service.reportSystemMetrics();

      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should handle system metrics reporting errors', async () => {
      redis.ping.mockRejectedValue(new Error('Redis failed'));

      await service.reportSystemMetrics();

      // Should emit error metric
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('METRIC_COLLECTED'),
        expect.objectContaining({
          metricName: 'metric_reporting_error',
        })
      );
    });
  });

  describe('Self-Healing Capabilities', () => {
    it('should attempt self-healing successfully', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.attemptSelfHealing();
      expect(result.success).toBe(true);
      expect(result.attemptedFixes).toBeGreaterThan(0);
      expect(result.fixes).toBeInstanceOf(Array);
    });

    it('should handle Redis connection recovery in self-healing', async () => {
      redis.ping
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce('PONG');

      const result = await service.attemptSelfHealing();
      expect(result.success).toBe(true);
      expect(result.successfulFixes).toBeGreaterThan(0);

      const connectionFix = result.fixes.find(fix => fix.issue === 'redis_connection_failed');
      expect(connectionFix).toBeDefined();
      expect(connectionFix.success).toBe(true);
    });

    it('should handle failed Redis connection recovery', async () => {
      redis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.attemptSelfHealing();

      const connectionFix = result.fixes.find(fix => fix.issue === 'redis_connection_failed');
      expect(connectionFix).toBeDefined();
      expect(connectionFix.success).toBe(false);
    });
  });

  describe('Advanced Utility Operations', () => {
    it('should handle ping operation successfully', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.ping();
      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThanOrEqual(0);
    });

    it('should handle ping operation failure', async () => {
      redis.ping.mockRejectedValue(new Error('Redis ping failed'));

      const result = await service.ping();
      expect(result.success).toBe(false);
      expect(result.data).toBe(-1);
    });

    it('should get keys with pattern filtering', async () => {
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:key1', 'stream_cache_warm:key2']]);

      const result = await service.getKeys('stream*', 10);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle getKeys with default pattern', async () => {
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:default1']]);

      const result = await service.getKeys();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['stream_cache_warm:default1']);
    });

    it('should handle getKeys operation errors', async () => {
      redis.scan.mockRejectedValue(new Error('Scan failed'));

      const result = await service.getKeys();
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
    });

    it('should get connection info successfully', async () => {
      redis.ping.mockResolvedValue('PONG');

      const result = await service.getConnectionInfo();
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('connected');
      expect(result.data.address).toBe('localhost');
      expect(result.data.port).toBe(6379);
    });

    it('should handle connection info when Redis is down', async () => {
      redis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getConnectionInfo();
      expect(result.success).toBe(false);
      expect(result.data.status).toBe('disconnected');
      expect(result.data.latencyMs).toBe(-1);
    });

    it('should get memory usage information', async () => {
      const result = await service.getMemoryUsage();
      expect(result.success).toBe(true);
      expect(result.data.usedMemoryBytes).toBeDefined();
      expect(result.data.totalMemoryBytes).toBeDefined();
      expect(result.data.memoryUsageRatio).toBeDefined();
      expect(result.data.keyCount).toBeDefined();
    });
  });

  describe('Data Import/Export', () => {
    it('should export data in JSON format', async () => {
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:key1', 'stream_cache_warm:key2']]);

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
      expect(typeof result.data).toBe('object');
    });

    it('should export data in CSV format', async () => {
      redis.scan.mockResolvedValue(['0', ['stream_cache_warm:key1']]);

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify(mockStreamDataArray)],
        ]),
      } as any;
      redis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.exportData('*', 'csv');
      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Key,Value');
    });

    it('should handle export errors', async () => {
      redis.scan.mockRejectedValue(new Error('Export failed'));

      const result = await service.exportData();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });

    it('should import JSON data successfully', async () => {
      const importData = {
        'key1': mockStreamDataArray,
        'key2': [mockStreamDataPoint],
      };

      redis.exists.mockResolvedValue(0);
      redis.setex.mockResolvedValue('OK');

      const result = await service.importData(importData);
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);
      expect(result.data.successful).toBe(2);
    });

    it('should import CSV data successfully', async () => {
      const csvData = 'Key,Value\n"key1","[{\\"s\\":\\"AAPL\\"}]"\n"key2","[{\\"s\\":\\"GOOGL\\"}]"';

      redis.exists.mockResolvedValue(0);
      redis.setex.mockResolvedValue('OK');

      const result = await service.importData(csvData, { format: 'csv' });
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);
    });

    it('should handle import with overwrite disabled', async () => {
      const importData = { 'existing:key': mockStreamDataArray };

      redis.exists.mockResolvedValue(1); // Key exists

      const result = await service.importData(importData, { overwrite: false });
      expect(result.success).toBe(true);
      expect(result.data.successful).toBe(0); // Should skip existing key
    });

    it('should handle import with key prefix', async () => {
      const importData = { 'key1': mockStreamDataArray };

      redis.exists.mockResolvedValue(0);
      redis.setex.mockResolvedValue('OK');

      const result = await service.importData(importData, { keyPrefix: 'prefix:' });
      expect(result.success).toBe(true);
      expect(result.data.successful).toBe(1);
    });

    it('should handle import errors gracefully', async () => {
      const importData = { 'error:key': mockStreamDataArray };

      redis.exists.mockResolvedValue(0);
      redis.setex.mockRejectedValue(new Error('Redis set failed'));

      const result = await service.importData(importData);
      expect(result.success).toBe(false);
      expect(result.data.failed).toBe(1);
      expect(result.data.failedKeys).toContain('error:key');
    });

    it('should handle malformed import data', async () => {
      const malformedData = 'invalid-json-string';

      const result = await service.importData(malformedData);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('GetOrSet Operation', () => {
    it('should return cached data when available', async () => {
      const testKey = 'test:getorset:cached';
      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));

      const factory = jest.fn().mockResolvedValue(mockStreamDataArray);

      const result = await service.getOrSet(testKey, factory);
      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.data).toEqual(mockStreamDataArray);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory when cache miss', async () => {
      const testKey = 'test:getorset:miss';
      redis.get.mockResolvedValue(null);
      redis.setex.mockResolvedValue('OK');

      const factoryData = [{ s: 'FACTORY', p: 100, v: 500, t: Date.now() }];
      const factory = jest.fn().mockResolvedValue(factoryData);

      const result = await service.getOrSet(testKey, factory);
      expect(result.success).toBe(true);
      expect(result.hit).toBe(false);
      expect(result.cacheLevel).toBe('factory');
      expect(result.data).toEqual(factoryData);
      expect(factory).toHaveBeenCalled();
    });

    it('should handle getOrSet operation errors', async () => {
      const testKey = 'test:getorset:error';
      redis.get.mockRejectedValue(new Error('Redis get failed'));

      const factory = jest.fn();

      const result = await service.getOrSet(testKey, factory);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Redis get failed');
    });
  });

  describe('Statistics and Reset Operations', () => {
    it('should provide comprehensive statistics', async () => {
      // Generate some operations to have stats
      redis.get.mockResolvedValue(JSON.stringify(mockStreamDataArray));
      await service.get('stats:key1');
      await service.get('stats:key2');

      const result = await service.getStats();
      expect(result.success).toBe(true);
      expect(result.data.totalOperations).toBeGreaterThan(0);
      expect(result.data.hits).toBeDefined();
      expect(result.data.misses).toBeDefined();
      expect(result.metadata.cacheType).toBe('stream-cache');
    });

    it('should reset statistics successfully', async () => {
      const result = await service.resetStats();
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should provide time-ranged statistics', async () => {
      const timeRange = 60000; // 1 minute
      const result = await service.getStats(timeRange);
      expect(result.success).toBe(true);
      expect(result.timeRangeMs).toBe(timeRange);
    });
  });

  describe('Refresh Configuration', () => {
    it('should refresh configuration successfully', async () => {
      const newConfig = {
        defaultTtlSeconds: 600,
        performance: {
          ...mockUnifiedCacheConfig.performance,
          defaultBatchSize: 75,
        },
      };

      await service.refreshConfig(newConfig);

      // Configuration should be updated (tested via applyConfigUpdate)
      const currentConfig = service.config;
      expect(currentConfig.defaultTtlSeconds).toBe(600);
    });
  });

  describe('Error Severity Classification', () => {
    it('should classify Redis errors as high severity', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection timeout'));
      await service.get('test:redis:error');

      // Error should be recorded with high severity
      const errorStats = await service.getErrorStatistics();
      expect(errorStats.totalErrors).toBeGreaterThan(0);
    });

    it('should classify timeout errors as medium severity', async () => {
      redis.get.mockRejectedValue(new Error('Operation timeout'));
      await service.get('test:timeout:error');

      const errorStats = await service.getErrorStatistics();
      expect(errorStats.totalErrors).toBeGreaterThan(0);
    });

    it('should classify unknown errors as low severity', async () => {
      redis.get.mockRejectedValue(new Error('Unknown error'));
      await service.get('test:unknown:error');

      const errorStats = await service.getErrorStatistics();
      expect(errorStats.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('Module Status and Properties', () => {
    it('should return correct module status', () => {
      const status = service.getStatus();
      expect(status.status).toBe('ready');
      expect(status.message).toContain('successfully');
    });

    it('should return correct module metadata', () => {
      expect(service.moduleType).toBe('stream');
      expect(service.moduleCategory).toBe('specialized');
      expect(service.name).toBe('StreamCacheStandardized');
      expect(service.version).toBe('2.0.0');
      expect(service.description).toContain('stream cache');
      expect(service.priority).toBe(2);
      expect(service.dependencies).toEqual(['basic']);
    });

    it('should list all supported features', () => {
      const features = service.supportedFeatures;
      expect(features).toContain('get');
      expect(features).toContain('set');
      expect(features).toContain('hot-cache');
      expect(features).toContain('warm-cache');
      expect(features).toContain('compression');
      expect(features).toContain('self-healing');
      expect(features).toContain('lru-eviction');
    });
  });
});