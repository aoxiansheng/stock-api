import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from '@cache/services/cache.service';
import { CACHE_STATUS } from '@cache/constants/status/cache-status.constants';
import { CACHE_DATA_FORMATS } from '@cache/constants/config/data-formats.constants';
import { CacheConfigDto } from '@cache/dto/config/cache-config.dto';

describe('CacheService (Simplified)', () => {
  let service: CacheService;
  let redis: jest.Mocked<Redis>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

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

    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeDefined();
      expect(service.getClient()).toBe(redis);
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

      it('should handle errors', async () => {
        redis.setex.mockRejectedValue(new Error('Redis error'));

        await expect(service.set('test-key', 'test-value')).rejects.toThrow();
      });

      it('should use default TTL when not specified', async () => {
        redis.setex.mockResolvedValue('OK');

        await service.set('test-key', 'test-value');

        expect(redis.setex).toHaveBeenCalledWith('test-key', 300, '"test-value"');
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

      it('should handle errors', async () => {
        redis.get.mockRejectedValue(new Error('Redis error'));

        await expect(service.get('test-key')).rejects.toThrow();
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
    });
  });

  describe('TTL Management', () => {
    describe('getTtlByTimeliness', () => {
      it('should return correct TTL for strong timeliness', () => {
        const result = service.getTtlByTimeliness('strong');
        expect(result).toBe(5);
      });

      it('should return correct TTL for weak timeliness', () => {
        const result = service.getTtlByTimeliness('weak');
        expect(result).toBe(300);
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

  describe('Data Structure Operations', () => {
    describe('List Operations', () => {
      it('should push values to list', async () => {
        redis.lpush.mockResolvedValue(1);

        const result = await service.listPush('test-key', 'value');

        expect(result).toBe(1);
        expect(redis.lpush).toHaveBeenCalledWith('test-key', 'value');
      });

      it('should get list range', async () => {
        redis.lrange.mockResolvedValue(['item1', 'item2']);

        const result = await service.listRange('test-key', 0, -1);

        expect(result).toEqual(['item1', 'item2']);
      });

      it('should return empty array on error (fault tolerant)', async () => {
        redis.lrange.mockRejectedValue(new Error('Redis error'));

        const result = await service.listRange('test-key', 0, -1);

        expect(result).toEqual([]);
      });
    });

    describe('Set Operations', () => {
      it('should add members to set', async () => {
        redis.sadd.mockResolvedValue(1);

        const result = await service.setAdd('test-key', 'member');

        expect(result).toBe(1);
        expect(redis.sadd).toHaveBeenCalledWith('test-key', 'member');
      });

      it('should check set membership', async () => {
        redis.sismember.mockResolvedValue(1);

        const result = await service.setIsMember('test-key', 'member');

        expect(result).toBe(true);
      });

      it('should return false on error (fault tolerant)', async () => {
        redis.sismember.mockRejectedValue(new Error('Redis error'));

        const result = await service.setIsMember('test-key', 'member');

        expect(result).toBe(false);
      });
    });

    describe('Hash Operations', () => {
      it('should set hash field', async () => {
        redis.hset.mockResolvedValue(1);

        const result = await service.hashSet('test-key', 'field', 'value');

        expect(result).toBe(1);
        expect(redis.hset).toHaveBeenCalledWith('test-key', 'field', 'value');
      });

      it('should get all hash fields', async () => {
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
  });

  describe('Rate Limiting Support', () => {
    describe('incr', () => {
      it('should increment value successfully', async () => {
        redis.incr.mockResolvedValue(5);

        const result = await service.incr('counter');

        expect(result).toBe(5);
        expect(redis.incr).toHaveBeenCalledWith('counter');
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
  });

  describe('Batch Operations', () => {
    describe('mget', () => {
      it('should get multiple values', async () => {
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
    });
  });

  describe('Serialization', () => {
    it('should handle undefined values', async () => {
      redis.setex.mockResolvedValue('OK');

      await service.set('test-key', undefined);

      expect(redis.setex).toHaveBeenCalledWith('test-key', 300, 'null');
    });
  });

  describe('Configuration Integration', () => {
    it('should use injected configuration', () => {
      expect(service.getTtlByTimeliness('monitoring')).toBe(300);
      expect(service.getTtlByTimeliness('auth')).toBe(600);
      expect(service.getTtlByTimeliness('long')).toBe(3600);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      redis.setex.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.set('test-key', 'test-value')).rejects.toThrow();
    });
  });
});