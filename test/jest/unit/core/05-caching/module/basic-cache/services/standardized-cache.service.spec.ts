import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { StandardizedCacheService } from '@core/05-caching/module/basic-cache/services/standardized-cache.service';
import { CacheCompressionService } from '@core/05-caching/module/basic-cache/services/cache-compression.service';
import { CACHE_REDIS_CLIENT_TOKEN } from '@monitoring/contracts';
import { redisMockFactory, eventEmitterMockFactory } from '@test/testbasic/mocks';

describe('StandardizedCacheService', () => {
  let service: StandardizedCacheService;
  let module: TestingModule;
  let redisClient: jest.Mocked<Redis>;
  let compressionService: jest.Mocked<CacheCompressionService>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0,
    },
    ttl: {
      defaultSeconds: 300,
      minSeconds: 1,
      maxSeconds: 86400,
    },
    compression: {
      enabled: true,
      thresholdBytes: 1024,
      algorithm: 'gzip',
    },
    batch: {
      maxBatchSize: 100,
      timeoutMs: 5000,
    },
    decompression: {
      enabled: true,
      maxConcurrent: 10,
      timeoutMs: 5000,
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    },
  };

  beforeEach(async () => {
    const redisMock = redisMockFactory();
    const eventEmitterMock = eventEmitterMockFactory();

    module = await Test.createTestingModule({
      providers: [
        StandardizedCacheService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: redisMock,
        },
        {
          provide: CacheCompressionService,
          useValue: {
            compress: jest.fn().mockResolvedValue(Buffer.from('compressed')),
            decompress: jest.fn().mockResolvedValue(Buffer.from('decompressed')),
            shouldCompress: jest.fn().mockReturnValue(true),
            getCompressionRatio: jest.fn().mockReturnValue(0.5),
            getCompressionStats: jest.fn().mockReturnValue({
              totalCompressed: 100,
              totalDecompressed: 50,
              averageRatio: 0.6,
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'basicCache') return mockConfig;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(StandardizedCacheService);
    redisClient = module.get(CACHE_REDIS_CLIENT_TOKEN);
    compressionService = module.get(CacheCompressionService);
    eventBus = module.get(EventEmitter2);
    configService = module.get(ConfigService);

    // Initialize service with config
    await service.initialize(mockConfig);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with valid config', async () => {
      const newService = new StandardizedCacheService(
        redisClient as any,
        compressionService,
        eventBus,
        configService,
      );

      await expect(newService.initialize(mockConfig)).resolves.not.toThrow();
      expect(newService.isInitialized).toBe(true);
      expect(newService.isHealthy).toBe(true);
    });

    it('should throw error if already initialized', async () => {
      await expect(service.initialize(mockConfig)).rejects.toThrow(
        'Service already initialized',
      );
    });

    it('should validate config on initialization', async () => {
      const newService = new StandardizedCacheService(
        redisClient as any,
        compressionService,
        eventBus,
        configService,
      );

      const invalidConfig = { ...mockConfig, ttl: { defaultSeconds: -1 } };
      await expect(newService.initialize(invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('Basic Cache Operations', () => {
    describe('get', () => {
      it('should get value from cache', async () => {
        const testValue = { data: 'test' };
        (redisClient.get as jest.Mock).mockResolvedValue(
          JSON.stringify(testValue),
        );

        const result = await service.get('test-key');

        expect(redisClient.get).toHaveBeenCalledWith('test-key');
        expect(result).toEqual(testValue);
      });

      it('should return null for non-existent key', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);

        const result = await service.get('non-existent');

        expect(result).toBeNull();
      });

      it('should handle compressed data', async () => {
        const compressedData = Buffer.from('compressed').toString('base64');
        (redisClient.get as jest.Mock).mockResolvedValue(
          JSON.stringify({ _compressed: true, data: compressedData }),
        );
        (compressionService.decompress as jest.Mock).mockResolvedValue(
          Buffer.from(JSON.stringify({ data: 'test' })),
        );

        const result = await service.get('compressed-key');

        expect(compressionService.decompress).toHaveBeenCalled();
        expect(result).toEqual({ data: 'test' });
      });

      it('should record metrics for get operation', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue('{"data":"test"}');

        await service.get('test-key');

        const stats = await service.getStats();
        expect(stats.data.hits).toBeGreaterThan(0);
      });

      it('should handle get errors', async () => {
        (redisClient.get as jest.Mock).mockRejectedValue(
          new Error('Redis error'),
        );

        await expect(service.get('error-key')).rejects.toThrow('Redis error');

        const stats = await service.getStats();
        expect(stats.data.errorCount).toBeGreaterThan(0);
      });
    });

    describe('set', () => {
      it('should set value in cache', async () => {
        const testValue = { data: 'test' };
        (redisClient.setex as jest.Mock).mockResolvedValue('OK');

        await service.set('test-key', testValue);

        expect(redisClient.setex).toHaveBeenCalledWith(
          'test-key',
          300, // default TTL
          JSON.stringify(testValue),
        );
      });

      it('should set value with custom TTL', async () => {
        (redisClient.setex as jest.Mock).mockResolvedValue('OK');

        await service.set('test-key', 'value', { ttl: 600 });

        expect(redisClient.setex).toHaveBeenCalledWith(
          'test-key',
          600,
          JSON.stringify('value'),
        );
      });

      it('should compress large values', async () => {
        const largeValue = 'x'.repeat(2000);
        (compressionService.shouldCompress as jest.Mock).mockReturnValue(true);
        (compressionService.compress as jest.Mock).mockResolvedValue(
          Buffer.from('compressed'),
        );
        (redisClient.setex as jest.Mock).mockResolvedValue('OK');

        await service.set('large-key', largeValue);

        expect(compressionService.compress).toHaveBeenCalled();
        expect(redisClient.setex).toHaveBeenCalledWith(
          'large-key',
          300,
          expect.stringContaining('_compressed'),
        );
      });

      it('should record metrics for set operation', async () => {
        (redisClient.setex as jest.Mock).mockResolvedValue('OK');

        await service.set('test-key', 'value');

        const stats = await service.getStats();
        expect(stats.data.totalOperations).toBeGreaterThan(0);
      });

      it('should handle set errors', async () => {
        (redisClient.setex as jest.Mock).mockRejectedValue(
          new Error('Redis error'),
        );

        await expect(service.set('error-key', 'value')).rejects.toThrow(
          'Redis error',
        );

        const stats = await service.getStats();
        expect(stats.data.errorCount).toBeGreaterThan(0);
      });
    });

    describe('delete', () => {
      it('should delete key from cache', async () => {
        (redisClient.del as jest.Mock).mockResolvedValue(1);

        const result = await service.delete('test-key');

        expect(redisClient.del).toHaveBeenCalledWith('test-key');
        expect(result).toBe(true);
      });

      it('should return false if key does not exist', async () => {
        (redisClient.del as jest.Mock).mockResolvedValue(0);

        const result = await service.delete('non-existent');

        expect(result).toBe(false);
      });

      it('should record metrics for delete operation', async () => {
        (redisClient.del as jest.Mock).mockResolvedValue(1);

        await service.delete('test-key');

        const stats = await service.getStats();
        expect(stats.data.totalOperations).toBeGreaterThan(0);
      });
    });

    describe('exists', () => {
      it('should check if key exists', async () => {
        (redisClient.exists as jest.Mock).mockResolvedValue(1);

        const result = await service.exists('test-key');

        expect(redisClient.exists).toHaveBeenCalledWith('test-key');
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        (redisClient.exists as jest.Mock).mockResolvedValue(0);

        const result = await service.exists('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('ttl', () => {
      it('should get TTL for key', async () => {
        (redisClient.pttl as jest.Mock).mockResolvedValue(60000);

        const result = await service.ttl('test-key');

        expect(redisClient.pttl).toHaveBeenCalledWith('test-key');
        expect(result).toBe(60); // milliseconds to seconds
      });

      it('should return -1 for non-existent key', async () => {
        (redisClient.pttl as jest.Mock).mockResolvedValue(-2);

        const result = await service.ttl('non-existent');

        expect(result).toBe(-1);
      });

      it('should return -1 for key without expiry', async () => {
        (redisClient.pttl as jest.Mock).mockResolvedValue(-1);

        const result = await service.ttl('no-expiry');

        expect(result).toBe(-1);
      });
    });

    describe('expire', () => {
      it('should set expiry for key', async () => {
        (redisClient.expire as jest.Mock).mockResolvedValue(1);

        const result = await service.expire('test-key', 600);

        expect(redisClient.expire).toHaveBeenCalledWith('test-key', 600);
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        (redisClient.expire as jest.Mock).mockResolvedValue(0);

        const result = await service.expire('non-existent', 600);

        expect(result).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear all keys with pattern', async () => {
        (redisClient.scan as jest.Mock).mockResolvedValue(['0', ['key1', 'key2']]);
        (redisClient.del as jest.Mock).mockResolvedValue(2);

        const result = await service.clear('test:*');

        expect(redisClient.scan).toHaveBeenCalled();
        expect(redisClient.del).toHaveBeenCalledWith('key1', 'key2');
        expect(result).toBe(2);
      });

      it('should handle multiple scan iterations', async () => {
        (redisClient.scan as jest.Mock)
          .mockResolvedValueOnce(['1', ['key1', 'key2']])
          .mockResolvedValueOnce(['0', ['key3']]);
        (redisClient.del as jest.Mock).mockResolvedValue(1);

        const result = await service.clear('test:*');

        expect(redisClient.scan).toHaveBeenCalledTimes(2);
        expect(result).toBe(3);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchGet', () => {
      it('should get multiple values', async () => {
        (redisClient.mget as jest.Mock).mockResolvedValue([
          '{"data":"value1"}',
          null,
          '{"data":"value3"}',
        ]);

        const result = await service.batchGet(['key1', 'key2', 'key3']);

        expect(redisClient.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
        expect(result).toEqual([
          { key: 'key1', value: { data: 'value1' }, success: true },
          { key: 'key2', value: null, success: true },
          { key: 'key3', value: { data: 'value3' }, success: true },
        ]);
      });

      it('should handle batch size limits', async () => {
        const keys = Array.from({ length: 150 }, (_, i) => `key${i}`);
        (redisClient.mget as jest.Mock).mockResolvedValue(
          new Array(100).fill('{"data":"value"}'),
        );

        await service.batchGet(keys);

        expect(redisClient.mget).toHaveBeenCalledTimes(2); // 100 + 50
      });

      it('should handle compressed values in batch', async () => {
        const compressedData = Buffer.from('compressed').toString('base64');
        (redisClient.mget as jest.Mock).mockResolvedValue([
          JSON.stringify({ _compressed: true, data: compressedData }),
          '{"data":"normal"}',
        ]);
        (compressionService.decompress as jest.Mock).mockResolvedValue(
          Buffer.from(JSON.stringify({ data: 'decompressed' })),
        );

        const result = await service.batchGet(['key1', 'key2']);

        expect(compressionService.decompress).toHaveBeenCalled();
        expect(result[0].value).toEqual({ data: 'decompressed' });
        expect(result[1].value).toEqual({ data: 'normal' });
      });
    });

    describe('batchSet', () => {
      it('should set multiple values', async () => {
        const pipelineMock = {
          setex: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 'OK']]),
        };
        (redisClient.pipeline as jest.Mock).mockReturnValue(pipelineMock);

        const items = [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2', ttl: 600 },
        ];

        const result = await service.batchSet(items);

        expect(pipelineMock.setex).toHaveBeenCalledWith(
          'key1',
          300,
          JSON.stringify('value1'),
        );
        expect(pipelineMock.setex).toHaveBeenCalledWith(
          'key2',
          600,
          JSON.stringify('value2'),
        );
        expect(result).toEqual([
          { key: 'key1', success: true },
          { key: 'key2', success: true },
        ]);
      });

      it('should handle batch size limits', async () => {
        const pipelineMock = {
          setex: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(new Array(100).fill([null, 'OK'])),
        };
        (redisClient.pipeline as jest.Mock).mockReturnValue(pipelineMock);

        const items = Array.from({ length: 150 }, (_, i) => ({
          key: `key${i}`,
          value: `value${i}`,
        }));

        await service.batchSet(items);

        expect(redisClient.pipeline).toHaveBeenCalledTimes(2); // 100 + 50
      });
    });

    describe('batchDelete', () => {
      it('should delete multiple keys', async () => {
        const pipelineMock = {
          del: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([[null, 1], [null, 0], [null, 1]]),
        };
        (redisClient.pipeline as jest.Mock).mockReturnValue(pipelineMock);

        const result = await service.batchDelete(['key1', 'key2', 'key3']);

        expect(pipelineMock.del).toHaveBeenCalledTimes(3);
        expect(result).toEqual([
          { key: 'key1', success: true },
          { key: 'key2', success: true },
          { key: 'key3', success: true },
        ]);
      });
    });
  });

  describe('Advanced Operations', () => {
    describe('getOrSet', () => {
      it('should return existing value', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue('{"data":"existing"}');

        const factory = jest.fn().mockResolvedValue({ data: 'new' });
        const result = await service.getOrSet('test-key', factory);

        expect(result).toEqual({ data: 'existing' });
        expect(factory).not.toHaveBeenCalled();
      });

      it('should set and return new value if not exists', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setex as jest.Mock).mockResolvedValue('OK');

        const factory = jest.fn().mockResolvedValue({ data: 'new' });
        const result = await service.getOrSet('test-key', factory);

        expect(result).toEqual({ data: 'new' });
        expect(factory).toHaveBeenCalled();
        expect(redisClient.setex).toHaveBeenCalled();
      });
    });

    describe('increment/decrement', () => {
      it('should increment value', async () => {
        (redisClient.incr as jest.Mock).mockResolvedValue(5);

        const result = await service.increment('counter');

        expect(redisClient.incr).toHaveBeenCalledWith('counter');
        expect(result).toBe(5);
      });

      it('should decrement value', async () => {
        (redisClient.decr as jest.Mock).mockResolvedValue(3);

        const result = await service.decrement('counter');

        expect(redisClient.decr).toHaveBeenCalledWith('counter');
        expect(result).toBe(3);
      });
    });

    describe('setIfNotExists', () => {
      it('should set value if not exists', async () => {
        (redisClient.setnx as jest.Mock).mockResolvedValue(1);

        const result = await service.setIfNotExists('new-key', 'value');

        expect(redisClient.setnx).toHaveBeenCalledWith(
          'new-key',
          JSON.stringify('value'),
        );
        expect(result).toBe(true);
      });

      it('should not set value if exists', async () => {
        (redisClient.setnx as jest.Mock).mockResolvedValue(0);

        const result = await service.setIfNotExists('existing-key', 'value');

        expect(result).toBe(false);
      });
    });
  });

  describe('Health and Monitoring', () => {
    describe('ping', () => {
      it('should ping Redis', async () => {
        (redisClient.ping as jest.Mock).mockResolvedValue('PONG');

        const result = await service.ping();

        expect(result).toBe(true);
      });

      it('should return false on ping failure', async () => {
        (redisClient.ping as jest.Mock).mockRejectedValue(
          new Error('Connection failed'),
        );

        const result = await service.ping();

        expect(result).toBe(false);
      });
    });

    describe('getHealth', () => {
      it('should return health status', async () => {
        (redisClient.ping as jest.Mock).mockResolvedValue('PONG');
        (redisClient.info as jest.Mock).mockResolvedValue(
          'used_memory:1000000\nconnected_clients:10',
        );

        const health = await service.getHealth();

        expect(health).toMatchObject({
          status: 'healthy',
          isConnected: true,
          stats: expect.any(Object),
        });
      });
    });

    describe('getStats', () => {
      it('should return cache statistics', async () => {
        // Perform some operations to generate stats
        (redisClient.get as jest.Mock).mockResolvedValue('{"data":"test"}');
        await service.get('test-key');

        (redisClient.setex as jest.Mock).mockResolvedValue('OK');
        await service.set('test-key', 'value');

        const stats = await service.getStats();

        expect(stats.data).toMatchObject({
          hits: expect.any(Number),
          misses: expect.any(Number),
          totalOperations: expect.any(Number),
          errorCount: expect.any(Number),
          hitRate: expect.any(Number),
        });
      });

      it('should reset stats', async () => {
        // Generate some stats
        (redisClient.get as jest.Mock).mockResolvedValue('{"data":"test"}');
        await service.get('test-key');

        service.resetStats();

        const stats = await service.getStats();
        expect(stats.data.hits).toBe(0);
        expect(stats.data.totalOperations).toBe(0);
      });
    });

    describe('getMemoryUsage', () => {
      it('should return memory usage information', async () => {
        (redisClient.info as jest.Mock).mockResolvedValue(
          'used_memory:1048576\nused_memory_human:1M\nused_memory_rss:2097152',
        );

        const memory = await service.getMemoryUsage();

        expect(memory).toMatchObject({
          used: expect.any(Number),
          rss: expect.any(Number),
          human: expect.any(String),
        });
      });
    });

    describe('runDiagnostics', () => {
      it('should run comprehensive diagnostics', async () => {
        (redisClient.ping as jest.Mock).mockResolvedValue('PONG');
        (redisClient.info as jest.Mock).mockResolvedValue(
          'redis_version:6.2.0\nconnected_clients:10',
        );
        (redisClient.time as jest.Mock).mockResolvedValue(['1234567', '123']);
        (redisClient.config as jest.Mock).mockResolvedValue(['maxmemory', '0']);

        const diagnostics = await service.runDiagnostics();

        expect(diagnostics).toMatchObject({
          timestamp: expect.any(Date),
          connectivity: expect.any(Object),
          performance: expect.any(Object),
          configuration: expect.any(Object),
          memory: expect.any(Object),
          statistics: expect.any(Object),
        });
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', async () => {
      service.cleanup();

      expect(service.isInitialized).toBe(false);
      expect(service.isHealthy).toBe(false);
    });

    it('should call cleanup on module destroy', async () => {
      const cleanupSpy = jest.spyOn(service, 'cleanup');

      await service.onModuleDestroy();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue('invalid json');

      await expect(service.get('bad-json')).rejects.toThrow();

      const stats = await service.getStats();
      expect(stats.data.errorCount).toBeGreaterThan(0);
    });

    it('should handle compression errors', async () => {
      (compressionService.compress as jest.Mock).mockRejectedValue(
        new Error('Compression failed'),
      );
      (compressionService.shouldCompress as jest.Mock).mockReturnValue(true);

      await expect(service.set('key', 'x'.repeat(2000))).rejects.toThrow(
        'Compression failed',
      );
    });

    it('should handle decompression errors', async () => {
      const compressedData = Buffer.from('compressed').toString('base64');
      (redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({ _compressed: true, data: compressedData }),
      );
      (compressionService.decompress as jest.Mock).mockRejectedValue(
        new Error('Decompression failed'),
      );

      await expect(service.get('compressed-key')).rejects.toThrow(
        'Decompression failed',
      );
    });

    it('should emit error events', async () => {
      (redisClient.get as jest.Mock).mockRejectedValue(
        new Error('Redis error'),
      );

      try {
        await service.get('error-key');
      } catch (e) {
        // Expected error
      }

      expect(eventBus.emit).toHaveBeenCalledWith(
        'cache.error',
        expect.objectContaining({
          operation: 'get',
          error: expect.any(Error),
        }),
      );
    });
  });
});
