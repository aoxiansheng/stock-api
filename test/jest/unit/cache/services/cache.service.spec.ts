import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from '@cache/services/cache.service';
import { CACHE_DATA_FORMATS } from '@cache/constants/config/data-formats.constants';
import * as zlib from 'zlib';
import { promisify } from 'util';

// Mock interface for CacheConfigDto
interface CacheConfigDto {
  ttl?: number;
  serializer?: 'json' | 'msgpack';
  compressionThreshold?: number;
}

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

describe('CacheService', () => {
  let service: CacheService;
  let redis: jest.Mocked<Redis>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;
  let cacheUnifiedConfig: any;

  const mockCacheUnifiedConfig = {
    defaultTtl: 300,
    compressionThreshold: 1024,
    maxBatchSize: 100,
    lockTtl: 30,
    retryDelayMs: 100,
    slowOperationMs: 1000,
    strongTimelinessTtl: 5,
    realtimeTtl: 60,
    longTermTtl: 3600,
    monitoringTtl: 300,
    authTtl: 600,
    transformerTtl: 900,
    suggestionTtl: 1800,
    maxValueSizeMB: 10
  };

  beforeEach(async () => {
    const redisModule = {
      provide: 'default_IORedisModuleConnectionToken',
      useValue: {
        get: jest.fn(),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        mget: jest.fn(),
        pipeline: jest.fn(),
        scan: jest.fn(),
        lpush: jest.fn(),
        ltrim: jest.fn(),
        lrange: jest.fn(),
        sadd: jest.fn(),
        sismember: jest.fn(),
        smembers: jest.fn(),
        srem: jest.fn(),
        hincrby: jest.fn(),
        hset: jest.fn(),
        hgetall: jest.fn(),
        expire: jest.fn(),
        eval: jest.fn(),
        zcard: jest.fn(),
        zrange: jest.fn(),
        incr: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          }
        },
        redisModule,
        {
          provide: 'cacheUnified',
          useValue: mockCacheUnifiedConfig,
        }
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redis = module.get('default_IORedisModuleConnectionToken');
    eventBus = module.get<EventEmitter2>(EventEmitter2) as jest.Mocked<EventEmitter2>;
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
    cacheUnifiedConfig = module.get('cacheUnified');

    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeDefined();
      expect(service.getClient()).toBe(redis);
    });

    it('should throw error when cacheUnifiedConfig is missing', async () => {
      const module = await Test.createTestingModule({
        providers: [
          CacheService,
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: ConfigService, useValue: { get: jest.fn() } },
          { provide: 'default_IORedisModuleConnectionToken', useValue: redis },
          { provide: 'cacheUnified', useValue: null }
        ],
      }).compile();

      expect(() => {
        module.get<CacheService>(CacheService);
      }).toThrow();
    });
  });

  describe('Basic Operations', () => {
    describe('set', () => {
      it('should set cache value successfully', async () => {
        redis.setex.mockResolvedValue('OK');

        const result = await service.set('test-key', 'test-value', { ttl: 300 });

        expect(result).toBe(true);
        expect(redis.setex).toHaveBeenCalledWith('test-key', 300, '"test-value"');
      });

      it('should handle Redis connection errors', async () => {
        redis.setex.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(service.set('test-key', 'test-value')).rejects.toThrow();
      });

      it('should compress large values', async () => {
        redis.setex.mockResolvedValue('OK');
        const largeValue = 'x'.repeat(2000); // Exceeds compression threshold

        await service.set('test-key', largeValue);

        expect(redis.setex).toHaveBeenCalled();
        const storedValue = redis.setex.mock.calls[0][2];
        expect(storedValue).toContain(CACHE_DATA_FORMATS.COMPRESSION_PREFIX);
      });

      it('should use default TTL when not specified', async () => {
        redis.setex.mockResolvedValue('OK');

        await service.set('test-key', 'test-value');

        expect(redis.setex).toHaveBeenCalledWith('test-key', 300, '"test-value"');
      });

      it('should emit cache events', async () => {
        redis.setex.mockResolvedValue('OK');
        jest.spyOn(Math, 'random').mockReturnValue(0.05); // Force event emission

        await service.set('test-key', 'test-value');

        expect(eventBus.emit).toHaveBeenCalled();
      });
    });

    describe('get', () => {
      it('should get cache value successfully', async () => {
        redis.get.mockResolvedValue('"test-value"');

        const result = await service.get<string>('test-key');

        expect(result).toBe('test-value');
        expect(redis.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null for cache miss', async () => {
        redis.get.mockResolvedValue(null);

        const result = await service.get('test-key');

        expect(result).toBeNull();
      });

      it('should decompress compressed values', async () => {
        const compressedValue = CACHE_DATA_FORMATS.COMPRESSION_PREFIX +
          Buffer.from(await gzip('"test-value"')).toString('base64');
        redis.get.mockResolvedValue(compressedValue);

        const result = await service.get<string>('test-key');

        expect(result).toBe('test-value');
      });

      it('should handle Redis connection errors', async () => {
        redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(service.get('test-key')).rejects.toThrow();
      });

      it('should emit cache miss events', async () => {
        redis.get.mockResolvedValue(null);
        jest.spyOn(Math, 'random').mockReturnValue(0.05);

        await service.get('test-key');

        expect(eventBus.emit).toHaveBeenCalled();
      });
    });

    describe('del', () => {
      it('should delete single key', async () => {
        redis.del.mockResolvedValue(1);

        const result = await service.del('test-key');

        expect(result).toBe(1);
        expect(redis.del).toHaveBeenCalledWith('test-key');
      });

      it('should delete multiple keys', async () => {
        redis.del.mockResolvedValue(2);

        const result = await service.del(['key1', 'key2']);

        expect(result).toBe(2);
        expect(redis.del).toHaveBeenCalledWith('key1', 'key2');
      });

      it('should handle connection errors', async () => {
        redis.del.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(service.del('test-key')).rejects.toThrow();
      });
    });
  });

  describe('Advanced Operations', () => {
    describe('getOrSet', () => {
      it('should return cached value if exists', async () => {
        redis.get.mockResolvedValue('"cached-value"');
        const callback = jest.fn().mockResolvedValue('new-value');

        const result = await service.getOrSet('test-key', callback);

        expect(result).toBe('cached-value');
        expect(callback).not.toHaveBeenCalled();
      });

      it('should execute callback and cache result if cache miss', async () => {
        redis.get.mockResolvedValue(null);
        redis.set.mockResolvedValue('OK');
        redis.setex.mockResolvedValue('OK');
        const callback = jest.fn().mockResolvedValue('new-value');

        const result = await service.getOrSet('test-key', callback);

        expect(result).toBe('new-value');
        expect(callback).toHaveBeenCalled();
        expect(redis.setex).toHaveBeenCalled();
      });

      it('should handle lock acquisition', async () => {
        redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
        redis.set.mockResolvedValue('OK'); // Lock acquired
        redis.setex.mockResolvedValue('OK');
        const callback = jest.fn().mockResolvedValue('new-value');

        const result = await service.getOrSet('test-key', callback);

        expect(result).toBe('new-value');
        expect(redis.set).toHaveBeenCalledWith(
          expect.stringContaining('lock:test-key'),
          expect.any(String),
          'EX',
          30,
          'NX'
        );
      });

      it('should handle lock timeout scenario', async () => {
        redis.get.mockResolvedValue(null);
        redis.set.mockResolvedValue(null); // Lock not acquired
        const callback = jest.fn().mockResolvedValue('fallback-value');

        const result = await service.getOrSet('test-key', callback);

        expect(result).toBe('fallback-value');
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('mget', () => {
      it('should get multiple cache values', async () => {
        redis.mget.mockResolvedValue(['"value1"', '"value2"', null]);

        const result = await service.mget(['key1', 'key2', 'key3']);

        expect(result.size).toBe(2);
        expect(result.get('key1')).toBe('value1');
        expect(result.get('key2')).toBe('value2');
        expect(result.has('key3')).toBeFalsy();
      });

      it('should handle empty keys array', async () => {
        const result = await service.mget([]);

        expect(result.size).toBe(0);
        expect(redis.mget).not.toHaveBeenCalled();
      });

      it('should enforce batch size limit', async () => {
        const largeKeyArray = Array.from({ length: 150 }, (_, i) => `key${i}`);

        await expect(service.mget(largeKeyArray)).rejects.toThrow();
      });
    });

    describe('mset', () => {
      it('should set multiple cache values', async () => {
        const pipeline = {
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([['null', 'OK'], ['null', 'OK']])
        } as any; // Type assertion to avoid ChainableCommander complexity
        redis.pipeline.mockReturnValue(pipeline);

        const entries = new Map([['key1', 'value1'], ['key2', 'value2']]);
        const result = await service.mset(entries, 300);

        expect(result).toBe(true);
        expect(pipeline.setex).toHaveBeenCalledTimes(2);
      });

      it('should handle empty entries', async () => {
        const result = await service.mset(new Map());

        expect(result).toBe(true);
        expect(redis.pipeline).not.toHaveBeenCalled();
      });

      it('should enforce batch size limit', async () => {
        const largeEntries = new Map();
        for (let i = 0; i < 150; i++) {
          largeEntries.set(`key${i}`, `value${i}`);
        }

        await expect(service.mset(largeEntries)).rejects.toThrow();
      });
    });
  });

  describe('Redis Data Structure Operations', () => {
    describe('List Operations', () => {
      describe('listPush', () => {
        it('should push single value to list', async () => {
          redis.lpush.mockResolvedValue(1);

          const result = await service.listPush('test-key', 'value');

          expect(result).toBe(1);
          expect(redis.lpush).toHaveBeenCalledWith('test-key', 'value');
        });

        it('should push multiple values to list', async () => {
          redis.lpush.mockResolvedValue(3);

          const result = await service.listPush('test-key', ['value1', 'value2', 'value3']);

          expect(result).toBe(3);
          expect(redis.lpush).toHaveBeenCalledWith('test-key', 'value1', 'value2', 'value3');
        });
      });

      describe('listRange', () => {
        it('should return list range', async () => {
          redis.lrange.mockResolvedValue(['item1', 'item2', 'item3']);

          const result = await service.listRange('test-key', 0, -1);

          expect(result).toEqual(['item1', 'item2', 'item3']);
        });

        it('should return empty array on error (fault tolerant)', async () => {
          redis.lrange.mockRejectedValue(new Error('Redis error'));

          const result = await service.listRange('test-key', 0, -1);

          expect(result).toEqual([]);
        });
      });

      describe('listTrim', () => {
        it('should trim list successfully', async () => {
          redis.ltrim.mockResolvedValue('OK');

          const result = await service.listTrim('test-key', 0, 99);

          expect(result).toBe('OK');
          expect(redis.ltrim).toHaveBeenCalledWith('test-key', 0, 99);
        });
      });
    });

    describe('Set Operations', () => {
      describe('setAdd', () => {
        it('should add single member to set', async () => {
          redis.sadd.mockResolvedValue(1);

          const result = await service.setAdd('test-key', 'member');

          expect(result).toBe(1);
          expect(redis.sadd).toHaveBeenCalledWith('test-key', 'member');
        });

        it('should add multiple members to set', async () => {
          redis.sadd.mockResolvedValue(2);

          const result = await service.setAdd('test-key', ['member1', 'member2']);

          expect(result).toBe(2);
          expect(redis.sadd).toHaveBeenCalledWith('test-key', 'member1', 'member2');
        });
      });

      describe('setIsMember', () => {
        it('should return true for existing member', async () => {
          redis.sismember.mockResolvedValue(1);

          const result = await service.setIsMember('test-key', 'member');

          expect(result).toBe(true);
        });

        it('should return false for non-existing member', async () => {
          redis.sismember.mockResolvedValue(0);

          const result = await service.setIsMember('test-key', 'member');

          expect(result).toBe(false);
        });

        it('should return false on error (fault tolerant)', async () => {
          redis.sismember.mockRejectedValue(new Error('Redis error'));

          const result = await service.setIsMember('test-key', 'member');

          expect(result).toBe(false);
        });
      });

      describe('setMembers', () => {
        it('should return set members', async () => {
          redis.smembers.mockResolvedValue(['member1', 'member2']);

          const result = await service.setMembers('test-key');

          expect(result).toEqual(['member1', 'member2']);
        });

        it('should return empty array on error (fault tolerant)', async () => {
          redis.smembers.mockRejectedValue(new Error('Redis error'));

          const result = await service.setMembers('test-key');

          expect(result).toEqual([]);
        });
      });

      describe('setRemove', () => {
        it('should remove members from set', async () => {
          redis.srem.mockResolvedValue(2);

          const result = await service.setRemove('test-key', ['member1', 'member2']);

          expect(result).toBe(2);
          expect(redis.srem).toHaveBeenCalledWith('test-key', 'member1', 'member2');
        });
      });
    });

    describe('Hash Operations', () => {
      describe('hashSet', () => {
        it('should set hash field', async () => {
          redis.hset.mockResolvedValue(1);

          const result = await service.hashSet('test-key', 'field', 'value');

          expect(result).toBe(1);
          expect(redis.hset).toHaveBeenCalledWith('test-key', 'field', 'value');
        });
      });

      describe('hashGetAll', () => {
        it('should return all hash fields', async () => {
          redis.hgetall.mockResolvedValue({ field1: 'value1', field2: 'value2' });

          const result = await service.hashGetAll('test-key');

          expect(result).toEqual({ field1: 'value1', field2: 'value2' });
        });

        it('should return empty object on error (fault tolerant)', async () => {
          redis.hgetall.mockRejectedValue(new Error('Redis error'));

          const result = await service.hashGetAll('test-key');

          expect(result).toEqual({});
        });
      });

      describe('hashIncrementBy', () => {
        it('should increment hash field by value', async () => {
          redis.hincrby.mockResolvedValue(10);

          const result = await service.hashIncrementBy('test-key', 'field', 5);

          expect(result).toBe(10);
          expect(redis.hincrby).toHaveBeenCalledWith('test-key', 'field', 5);
        });
      });
    });
  });

  describe('TTL Management', () => {
    describe('getTtlByTimeliness', () => {
      it('should return correct TTL for strong timeliness', () => {
        const result = service.getTtlByTimeliness('strong');
        expect(result).toBe(5);
      });

      it('should return correct TTL for moderate timeliness', () => {
        const result = service.getTtlByTimeliness('moderate');
        expect(result).toBe(60);
      });

      it('should return correct TTL for weak timeliness', () => {
        const result = service.getTtlByTimeliness('weak');
        expect(result).toBe(300);
      });

      it('should return correct TTL for long timeliness', () => {
        const result = service.getTtlByTimeliness('long');
        expect(result).toBe(3600);
      });

      it('should return default TTL for unknown timeliness', () => {
        const result = service.getTtlByTimeliness('unknown' as any);
        expect(result).toBe(300);
      });
    });

    describe('expire', () => {
      it('should set expiration successfully', async () => {
        redis.expire.mockResolvedValue(1);

        const result = await service.expire('test-key', 3600);

        expect(result).toBe(true);
        expect(redis.expire).toHaveBeenCalledWith('test-key', 3600);
      });

      it('should return false when key does not exist', async () => {
        redis.expire.mockResolvedValue(0);

        const result = await service.expire('test-key', 3600);

        expect(result).toBe(false);
      });
    });
  });

  describe('Pattern Operations', () => {
    describe('delByPattern', () => {
      it('should delete keys by pattern', async () => {
        redis.scan.mockImplementation((cursor, ...args) => {
          if (cursor === '0') {
            return Promise.resolve(['0', ['key1', 'key2']]);
          }
          return Promise.resolve(['0', []]);
        });
        redis.del.mockResolvedValue(2);

        const result = await service.delByPattern('test:*');

        expect(result).toBe(2);
        expect(redis.del).toHaveBeenCalledWith('key1', 'key2');
      });

      it('should return 0 when no keys match', async () => {
        redis.scan.mockResolvedValue(['0', []]);

        const result = await service.delByPattern('nonexistent:*');

        expect(result).toBe(0);
        expect(redis.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cache Warmup', () => {
    describe('warmup', () => {
      it('should warmup cache with provided data', async () => {
        const pipeline = {
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([['null', 'OK'], ['null', 'OK']])
        } as any; // Type assertion to avoid ChainableCommander complexity
        redis.pipeline.mockReturnValue(pipeline);

        const warmupData = new Map([['key1', 'value1'], ['key2', 'value2']]);
        await service.warmup(warmupData, { ttl: 600 });

        expect(pipeline.setex).toHaveBeenCalledTimes(2);
      });

      it('should handle warmup errors gracefully', async () => {
        const pipeline = {
          setex: jest.fn(),
          exec: jest.fn().mockRejectedValue(new Error('Pipeline error'))
        } as any; // Type assertion to avoid ChainableCommander complexity
        redis.pipeline.mockReturnValue(pipeline);

        const warmupData = new Map([['key1', 'value1']]);

        await expect(service.warmup(warmupData)).resolves.not.toThrow();
      });
    });
  });

  describe('Fault Tolerant Methods', () => {
    describe('safeGet', () => {
      it('should return value on success', async () => {
        redis.get.mockResolvedValue('"test-value"');

        const result = await service.safeGet<string>('test-key');

        expect(result).toBe('test-value');
      });

      it('should return null on error', async () => {
        redis.get.mockRejectedValue(new Error('Redis error'));

        const result = await service.safeGet('test-key');

        expect(result).toBeNull();
      });
    });

    describe('safeSet', () => {
      it('should set value successfully', async () => {
        redis.setex.mockResolvedValue('OK');

        await expect(service.safeSet('test-key', 'test-value')).resolves.not.toThrow();
      });

      it('should handle errors gracefully', async () => {
        redis.setex.mockRejectedValue(new Error('Redis error'));

        await expect(service.safeSet('test-key', 'test-value')).resolves.not.toThrow();
      });
    });

    describe('safeGetOrSet', () => {
      it('should return cached value when available', async () => {
        redis.get.mockResolvedValue('"cached-value"');
        const factory = jest.fn();

        const result = await service.safeGetOrSet('test-key', factory);

        expect(result).toBe('cached-value');
        expect(factory).not.toHaveBeenCalled();
      });

      it('should fallback to factory on cache error', async () => {
        redis.get.mockRejectedValue(new Error('Redis error'));
        const factory = jest.fn().mockResolvedValue('factory-value');

        const result = await service.safeGetOrSet('test-key', factory);

        expect(result).toBe('factory-value');
        expect(factory).toHaveBeenCalled();
      });
    });
  });

  describe('Rate Limiting Support', () => {
    describe('multi', () => {
      it('should return pipeline instance', () => {
        const pipeline = { setex: jest.fn() } as any; // Type assertion to avoid ChainableCommander complexity
        redis.pipeline.mockReturnValue(pipeline);

        const result = service.multi();

        expect(result).toBe(pipeline);
      });
    });

    describe('eval', () => {
      it('should execute Lua script successfully', async () => {
        redis.eval.mockResolvedValue(1);

        const result = await service.eval('return 1', 0);

        expect(result).toBe(1);
        expect(redis.eval).toHaveBeenCalledWith('return 1', 0);
      });

      it('should handle connection errors', async () => {
        redis.eval.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(service.eval('return 1', 0)).rejects.toThrow();
      });
    });

    describe('incr', () => {
      it('should increment value successfully', async () => {
        redis.incr.mockResolvedValue(5);

        const result = await service.incr('counter');

        expect(result).toBe(5);
        expect(redis.incr).toHaveBeenCalledWith('counter');
      });

      it('should handle connection errors', async () => {
        redis.incr.mockRejectedValue(new Error('ECONNREFUSED'));

        await expect(service.incr('counter')).rejects.toThrow();
      });
    });

    describe('zcard', () => {
      it('should return sorted set cardinality', async () => {
        redis.zcard.mockResolvedValue(10);

        const result = await service.zcard('sorted-set');

        expect(result).toBe(10);
      });

      it('should return 0 on error (fault tolerant)', async () => {
        redis.zcard.mockRejectedValue(new Error('Redis error'));

        const result = await service.zcard('sorted-set');

        expect(result).toBe(0);
      });
    });

    describe('zrange', () => {
      it('should return sorted set range', async () => {
        redis.zrange.mockResolvedValue(['item1', 'item2']);

        const result = await service.zrange('sorted-set', 0, -1);

        expect(result).toEqual(['item1', 'item2']);
      });

      it('should return empty array on error (fault tolerant)', async () => {
        redis.zrange.mockRejectedValue(new Error('Redis error'));

        const result = await service.zrange('sorted-set', 0, -1);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Serialization and Compression', () => {
    describe('serialization', () => {
      it('should handle undefined values', async () => {
        redis.setex.mockResolvedValue('OK');

        await service.set('test-key', undefined);

        expect(redis.setex).toHaveBeenCalledWith('test-key', 300, 'null');
      });

      it('should handle msgpack serialization', async () => {
        redis.setex.mockResolvedValue('OK');

        await service.set('test-key', { data: 'test' }, {
          ttl: 300,
          serializer: 'msgpack'
        });

        expect(redis.setex).toHaveBeenCalled();
      });

      it('should throw error for unsupported serialization type', async () => {
        await expect(
          service.set('test-key', 'test', {
            serializer: 'unsupported' as any
          })
        ).rejects.toThrow();
      });

      it('should enforce JSON bomb protection', async () => {
        const hugeObject = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB

        await expect(
          service.set('test-key', hugeObject)
        ).rejects.toThrow();
      });
    });

    describe('compression', () => {
      it('should not compress small values', async () => {
        redis.setex.mockResolvedValue('OK');
        const smallValue = 'small';

        await service.set('test-key', smallValue);

        const storedValue = redis.setex.mock.calls[0][2];
        expect(storedValue).not.toContain(CACHE_DATA_FORMATS.COMPRESSION_PREFIX);
      });

      it('should handle compression errors gracefully', async () => {
        redis.setex.mockResolvedValue('OK');
        const largeValue = 'x'.repeat(2000);

        // Mock compression to throw error
        jest.spyOn(zlib, 'gzip').mockImplementation(() => {
          throw new Error('Compression failed');
        });

        await service.set('test-key', largeValue);

        // Should fallback to uncompressed value
        expect(redis.setex).toHaveBeenCalled();
      });

      it('should handle decompression errors gracefully', async () => {
        const invalidCompressedValue = CACHE_DATA_FORMATS.COMPRESSION_PREFIX + 'invalid-base64';
        redis.get.mockResolvedValue(invalidCompressedValue);

        const result = await service.get('test-key');

        // Should return the original value when decompression fails
        expect(result).toBe(invalidCompressedValue);
      });
    });
  });

  describe('Error Handling', () => {
    it('should identify connection errors correctly', () => {
      const connectionErrors = [
        new Error('ECONNREFUSED'),
        new Error('connection failed'),
        new Error('ENOTFOUND'),
        new Error('redis server error')
      ];

      connectionErrors.forEach(error => {
        expect(() => {
          // Use reflection to test private method
          const isConnectionError = (service as any).isConnectionError(error);
          expect(isConnectionError).toBe(true);
        }).not.toThrow();
      });
    });

    it('should emit slow operation warnings', async () => {
      redis.get.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('"value"'), 1500); // Exceeds slow operation threshold
        });
      });

      await service.get('test-key');

      // Should log warning for slow operation (tested via spy on logger if needed)
    });
  });

  describe('Event Emission', () => {
    it('should emit cache hit events', async () => {
      redis.get.mockResolvedValue('"test-value"');
      jest.spyOn(Math, 'random').mockReturnValue(0.05); // Force event emission

      await service.get('test-key');

      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should emit cache miss events', async () => {
      redis.get.mockResolvedValue(null);
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      await service.get('test-key');

      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should sample events correctly', async () => {
      redis.get.mockResolvedValue('"test-value"');
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Should not emit

      await service.get('test-key');

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});