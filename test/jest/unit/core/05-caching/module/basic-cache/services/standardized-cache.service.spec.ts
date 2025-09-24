/**
 * StandardizedCacheService 单元测试
 * 测试Module层统一标准化缓存服务的所有功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StandardizedCacheService } from '@core/05-caching/module/basic-cache/services/standardized-cache.service';
import { CacheCompressionService } from '@core/05-caching/module/basic-cache/services/cache-compression.service';
import { CollectorService } from '@monitoring/services/collector.service';
import { CACHE_REDIS_CLIENT_TOKEN } from '@monitoring/contracts';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
  ping: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  keys: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  incrby: jest.fn(),
  decrby: jest.fn(),
  setex: jest.fn(),
  setnx: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
};

// Mock CollectorService
const mockCollectorService = {
  recordMetric: jest.fn(),
  recordEvent: jest.fn(),
  getMetrics: jest.fn(),
};

// Mock CacheCompressionService
const mockCompressionService = {
  compress: jest.fn(),
  decompress: jest.fn(),
  shouldCompress: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn(),
};

describe('StandardizedCacheService', () => {
  let service: StandardizedCacheService;
  let redisClient: Redis;
  let compressionService: CacheCompressionService;
  let collectorService: CollectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandardizedCacheService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: mockRedisClient as any,
        },
        {
          provide: CacheCompressionService,
          useValue: mockCompressionService as any,
        },
        {
          provide: CollectorService,
          useValue: mockCollectorService as any,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService as any,
        },
      ],
    }).compile();

    service = module.get<StandardizedCacheService>(StandardizedCacheService);
    redisClient = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
    compressionService = module.get<CacheCompressionService>(CacheCompressionService);
    collectorService = module.get<CollectorService>(CollectorService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (mockRedisClient.ping as jest.Mock).mockResolvedValue('PONG');
    (mockRedisClient.info as jest.Mock).mockResolvedValue('used_memory:1048576\r\nmaxmemory:16777216');
    (mockCompressionService.shouldCompress as jest.Mock).mockReturnValue(false);
    (mockCompressionService.compress as jest.Mock).mockImplementation((data) => JSON.stringify(data));
    (mockCompressionService.decompress as jest.Mock).mockImplementation((data) => JSON.parse(data));
  });

  afterEach(async () => {
    if (service) {
      service.cleanup();
    }
  });

  describe('Module Identity', () => {
    it('should have correct module identity properties', () => {
      expect(service.moduleType).toBe('basic-cache');
      expect(service.moduleCategory).toBe('foundation');
      expect(service.supportedFeatures).toContain('redis-distributed-cache');
      expect(service.supportedFeatures).toContain('compression');
      expect(service.supportedFeatures).toContain('batch-operations');
      expect(service.supportedFeatures).toContain('monitoring');
      expect(service.dependencies).toHaveLength(0);
      expect(service.priority).toBe(1);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };

      await service.initialize(config);

      expect(service.isInitialized()).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      (mockRedisClient.ping as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };

      await expect(service.initialize(config)).rejects.toThrow('Connection failed');
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };
      await service.initialize(config);
    });

    describe('get operation', () => {
      it('should get value successfully when key exists', async () => {
        const testValue = { data: 'test-value', number: 42 };
        (mockRedisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(testValue));
        (mockRedisClient.ttl as jest.Mock).mockResolvedValue(250);

        const result = await service.get<typeof testValue>('test-key');

        expect(result.success).toBe(true);
        expect(result.hit).toBe(true);
        expect(result.data).toEqual(testValue);
        expect(result.remainingTtl).toBe(250);
        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
        expect(mockCollectorService.recordMetric).toHaveBeenCalledWith(
          'cache_operation',
          1,
          expect.objectContaining({ operation: 'get', status: 'hit' })
        );
      });

      it('should handle cache miss correctly', async () => {
        (mockRedisClient.get as jest.Mock).mockResolvedValue(null);

        const result = await service.get('non-existent-key');

        expect(result.success).toBe(true);
        expect(result.hit).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.remainingTtl).toBeUndefined();
        expect(mockCollectorService.recordMetric).toHaveBeenCalledWith(
          'cache_operation',
          1,
          expect.objectContaining({ operation: 'get', status: 'miss' })
        );
      });

      it('should handle Redis errors gracefully', async () => {
        (mockRedisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

        const result = await service.get('error-key');

        expect(result.success).toBe(false);
        expect(result.hit).toBe(false);
        expect(result.error).toContain('Redis error');
        expect(mockCollectorService.recordMetric).toHaveBeenCalledWith(
          'cache_operation',
          1,
          expect.objectContaining({ operation: 'get', status: 'error' })
        );
      });
    });

    describe('set operation', () => {
      it('should set value successfully', async () => {
        const testValue = { data: 'test-value', number: 42 };
        (mockRedisClient.exists as jest.Mock).mockResolvedValue(0);
        (mockRedisClient.setex as jest.Mock).mockResolvedValue('OK');

        const result = await service.set('test-key', testValue);

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(result.ttl).toBe(300);
        expect(result.replaced).toBe(false);
        expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testValue));
        expect(mockCollectorService.recordMetric).toHaveBeenCalledWith(
          'cache_operation',
          1,
          expect.objectContaining({ operation: 'set', status: 'success' })
        );
      });

      it('should handle replacing existing keys', async () => {
        const testValue = 'new-value';
        (mockRedisClient.exists as jest.Mock).mockResolvedValue(1);
        (mockRedisClient.setex as jest.Mock).mockResolvedValue('OK');

        const result = await service.set('existing-key', testValue);

        expect(result.success).toBe(true);
        expect(result.replaced).toBe(true);
      });

      it('should respect custom TTL', async () => {
        const testValue = 'test-value';
        (mockRedisClient.exists as jest.Mock).mockResolvedValue(0);
        (mockRedisClient.setex as jest.Mock).mockResolvedValue('OK');

        const result = await service.set('test-key', testValue, { ttl: 600 });

        expect(result.success).toBe(true);
        expect(result.ttl).toBe(600);
        expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 600, JSON.stringify(testValue));
      });

      it('should use compression when enabled', async () => {
        const config = {
          ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
          compression: { enabled: true, thresholdBytes: 100 },
          performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
          batch: { maxBatchSize: 1000, timeoutMs: 5000 },
        };
        await service.initialize(config);

        const largeValue = 'x'.repeat(200);
        (mockCompressionService.shouldCompress as jest.Mock).mockReturnValue(true);
        (mockCompressionService.compress as jest.Mock).mockReturnValue('compressed-data');
        (mockRedisClient.exists as jest.Mock).mockResolvedValue(0);
        (mockRedisClient.setex as jest.Mock).mockResolvedValue('OK');

        const result = await service.set('large-key', largeValue);

        expect(result.success).toBe(true);
        expect(mockCompressionService.shouldCompress).toHaveBeenCalled();
        expect(mockCompressionService.compress).toHaveBeenCalledWith(largeValue);
        expect(mockRedisClient.setex).toHaveBeenCalledWith('large-key', 300, 'compressed-data');
      });
    });

    describe('delete operation', () => {
      it('should delete existing key', async () => {
        (mockRedisClient.del as jest.Mock).mockResolvedValue(1);

        const result = await service.delete('test-key');

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(result.deletedCount).toBe(1);
        expect(result.deletedKeys).toEqual(['test-key']);
        expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
        expect(mockCollectorService.recordMetric).toHaveBeenCalledWith(
          'cache_operation',
          1,
          expect.objectContaining({ operation: 'delete', status: 'success' })
        );
      });

      it('should handle deleting non-existent key', async () => {
        (mockRedisClient.del as jest.Mock).mockResolvedValue(0);

        const result = await service.delete('non-existent-key');

        expect(result.success).toBe(true);
        expect(result.data).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.deletedKeys).toEqual([]);
      });
    });

    describe('exists and ttl operations', () => {
      it('should check key existence correctly', async () => {
        (mockRedisClient.exists as jest.Mock).mockResolvedValue(1);

        const result = await service.exists('test-key');

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
      });

      it('should get TTL correctly', async () => {
        (mockRedisClient.ttl as jest.Mock).mockResolvedValue(150);

        const result = await service.ttl('test-key');

        expect(result.success).toBe(true);
        expect(result.data).toBe(150);
        expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
      });

      it('should set expiration correctly', async () => {
        (mockRedisClient.expire as jest.Mock).mockResolvedValue(1);

        const result = await service.expire('test-key', 120);

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 120);
      });
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };
      await service.initialize(config);
    });

    describe('batchGet', () => {
      it('should get multiple keys successfully', async () => {
        const keys = ['key1', 'key2', 'key3'];
        const values = ['value1', 'value2', 'value3'];
        (mockRedisClient.mget as jest.Mock).mockResolvedValue(values.map(v => JSON.stringify(v)));

        const result = await service.batchGet<string>(keys);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(result.data).toEqual(values);
        expect(mockRedisClient.mget).toHaveBeenCalledWith(keys);
      });

      it('should handle partial results correctly', async () => {
        const keys = ['key1', 'key2', 'key3'];
        const redisResult = [JSON.stringify('value1'), null, JSON.stringify('value3')];
        (mockRedisClient.mget as jest.Mock).mockResolvedValue(redisResult);

        const result = await service.batchGet<string>(keys);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(1);
        expect(result.data).toEqual(['value1', undefined, 'value3']);
      });
    });

    describe('batchSet', () => {
      it('should set multiple key-value pairs successfully', async () => {
        const items = [
          { key: 'key1', value: 'value1', ttl: 300 },
          { key: 'key2', value: 'value2', ttl: 600 },
          { key: 'key3', value: 'value3' },
        ];

        (mockRedisClient.setex as jest.Mock).mockResolvedValue('OK');

        const result = await service.batchSet(items);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(mockRedisClient.setex).toHaveBeenCalledTimes(3);
        expect(mockRedisClient.setex).toHaveBeenNthCalledWith(1, 'key1', 300, JSON.stringify('value1'));
        expect(mockRedisClient.setex).toHaveBeenNthCalledWith(2, 'key2', 600, JSON.stringify('value2'));
        expect(mockRedisClient.setex).toHaveBeenNthCalledWith(3, 'key3', 300, JSON.stringify('value3'));
      });
    });

    describe('batchDelete', () => {
      it('should delete multiple keys successfully', async () => {
        const keys = ['key1', 'key2', 'key3'];
        (mockRedisClient.del as jest.Mock).mockResolvedValue(3);

        const result = await service.batchDelete(keys);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(result.deletedCount).toBe(3);
        expect(result.deletedKeys).toEqual(keys);
        expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
      });
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };
      await service.initialize(config);
    });

    describe('increment and decrement', () => {
      it('should increment number correctly', async () => {
        (mockRedisClient.incrby as jest.Mock).mockResolvedValue(6);

        const result = await service.increment('counter', 5);

        expect(result.success).toBe(true);
        expect(result.data).toBe(6);
        expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter', 5);
      });

      it('should decrement number correctly', async () => {
        (mockRedisClient.decrby as jest.Mock).mockResolvedValue(3);

        const result = await service.decrement('counter', 2);

        expect(result.success).toBe(true);
        expect(result.data).toBe(3);
        expect(mockRedisClient.decrby).toHaveBeenCalledWith('counter', 2);
      });
    });

    describe('getOrSet', () => {
      it('should return cached value if exists', async () => {
        const cachedValue = 'cached-value';
        (mockRedisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedValue));
        (mockRedisClient.ttl as jest.Mock).mockResolvedValue(200);

        const factory = jest.fn().mockReturnValue('factory-value');
        const result = await service.getOrSet('test-key', factory);

        expect(result.hit).toBe(true);
        expect(result.data).toBe(cachedValue);
        expect(factory).not.toHaveBeenCalled();
      });

      it('should call factory and cache result if key does not exist', async () => {
        const factoryValue = 'factory-value';
        (mockRedisClient.get as jest.Mock).mockResolvedValue(null);
        (mockRedisClient.exists as jest.Mock).mockResolvedValue(0);
        (mockRedisClient.setex as jest.Mock).mockResolvedValue('OK');

        const factory = jest.fn().mockReturnValue(factoryValue);
        const result = await service.getOrSet('test-key', factory);

        expect(result.hit).toBe(true);
        expect(result.data).toBe(factoryValue);
        expect(factory).toHaveBeenCalled();
        expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(factoryValue));
      });
    });

    describe('setIfNotExists', () => {
      it('should set value if key does not exist', async () => {
        (mockRedisClient.setnx as jest.Mock).mockResolvedValue(1);

        const result = await service.setIfNotExists('new-key', 'new-value');

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(mockRedisClient.setnx).toHaveBeenCalledWith('new-key', JSON.stringify('new-value'));
      });

      it('should not set value if key exists', async () => {
        (mockRedisClient.setnx as jest.Mock).mockResolvedValue(0);

        const result = await service.setIfNotExists('existing-key', 'new-value');

        expect(result.success).toBe(false);
        expect(result.data).toBe(false);
      });
    });
  });

  describe('Monitoring and Health', () => {
    beforeEach(async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };
      await service.initialize(config);
    });

    describe('ping', () => {
      it('should return pong response time', async () => {
        (mockRedisClient.ping as jest.Mock).mockResolvedValue('PONG');

        const result = await service.ping();

        expect(result.success).toBe(true);
        expect(typeof result.data).toBe('number');
        expect(result.data).toBeGreaterThanOrEqual(0);
        expect(mockRedisClient.ping).toHaveBeenCalled();
      });
    });

    describe('getStats', () => {
      it('should return cache statistics', async () => {
        const result = await service.getStats();

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('hits');
        expect(result.data).toHaveProperty('misses');
        expect(result.data).toHaveProperty('totalOperations');
        expect(result.data).toHaveProperty('hitRate');
        expect(result.data).toHaveProperty('keyCount');
        expect(result.data.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.data.hitRate).toBeLessThanOrEqual(1);
      });
    });

    describe('getHealth', () => {
      it('should return health status', async () => {
        (mockRedisClient.ping as jest.Mock).mockResolvedValue('PONG');

        const result = await service.getHealth();

        expect(result.success).toBe(true);
        expect(result.data.connectionStatus).toBe('connected');
        expect(result.data.performanceStatus).toMatch(/^(healthy|degraded|poor)$/);
        expect(result.data.memoryStatus).toMatch(/^(healthy|warning|critical)$/);
        expect(result.data.errorRateStatus).toMatch(/^(healthy|warning|critical)$/);
        expect(result.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.healthScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(result.checks)).toBe(true);
      });
    });

    describe('getMemoryUsage', () => {
      it('should return memory usage information', async () => {
        const result = await service.getMemoryUsage();

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('usedMemoryBytes');
        expect(result.data).toHaveProperty('totalMemoryBytes');
        expect(result.data).toHaveProperty('memoryUsageRatio');
        expect(result.data).toHaveProperty('keyCount');
        expect(result.data.memoryUsageRatio).toBeGreaterThanOrEqual(0);
        expect(result.data.memoryUsageRatio).toBeLessThanOrEqual(1);
      });
    });

    describe('getConnectionInfo', () => {
      it('should return connection information', async () => {
        const result = await service.getConnectionInfo();

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('status');
        expect(result.data).toHaveProperty('address');
        expect(result.data).toHaveProperty('port');
        expect(result.data).toHaveProperty('database');
        expect(result.data.status).toBe('connected');
      });
    });
  });

  describe('Configuration Management', () => {
    it('should get module specific configuration', () => {
      const config = service.getModuleSpecificConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('moduleType', 'basic-cache');
      expect(config).toHaveProperty('redisConfig');
      expect(config).toHaveProperty('compressionConfig');
      expect(config).toHaveProperty('batchConfig');
    });

    it('should validate module specific configuration', () => {
      const validConfig = {
        enabled: true,
        ttl: 300,
        compression: true,
        batchSize: 100,
      };

      const result = service.validateModuleSpecificConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should apply configuration updates', async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };
      await service.initialize(config);

      const newConfig = {
        ttl: { defaultSeconds: 600, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: true, thresholdBytes: 512 },
        performance: { maxMemoryMb: 2048, defaultBatchSize: 200 },
        batch: { maxBatchSize: 2000, timeoutMs: 10000 },
      };

      await service.applyConfigUpdate(newConfig);

      const moduleConfig = service.getModuleSpecificConfig();
      expect(moduleConfig.ttl.defaultSeconds).toBe(600);
      expect(moduleConfig.compression.enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const config = {
        ttl: { defaultSeconds: 300, minSeconds: 1, maxSeconds: 3600 },
        compression: { enabled: false, thresholdBytes: 1024 },
        performance: { maxMemoryMb: 1024, defaultBatchSize: 100 },
        batch: { maxBatchSize: 1000, timeoutMs: 5000 },
      };
      await service.initialize(config);
    });

    it('should handle Redis connection errors gracefully', async () => {
      (mockRedisClient.get as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      const result = await service.get('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection lost');
    });

    it('should handle invalid JSON data gracefully', async () => {
      (mockRedisClient.get as jest.Mock).mockResolvedValue('invalid-json{');

      const result = await service.get('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse cached data');
    });

    it('should handle batch operation failures', async () => {
      const keys = ['key1', 'key2', 'key3'];
      (mockRedisClient.mget as jest.Mock).mockRejectedValue(new Error('Batch operation failed'));

      const result = await service.batchGet(keys);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Batch operation failed');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      service.cleanup();

      expect(mockRedisClient.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockRedisClient.removeAllListeners).toHaveBeenCalledWith('connect');
      expect(mockRedisClient.removeAllListeners).toHaveBeenCalledWith('ready');
      expect(mockRedisClient.removeAllListeners).toHaveBeenCalledWith('close');
    });
  });
});