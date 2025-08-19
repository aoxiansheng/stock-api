import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CommonCacheService } from '@core/05-caching/common-cache/services/common-cache.service';
import { CacheCompressionService } from '@core/05-caching/common-cache/services/cache-compression.service';
import { CACHE_CONFIG } from '@core/05-caching/common-cache/constants/cache-config.constants';
import { REDIS_SPECIAL_VALUES } from '@core/05-caching/common-cache/constants/cache.constants';

describe('CommonCacheService', () => {
  let service: CommonCacheService;
  let mockRedis: any;
  let mockCompressionService: any;
  let mockMetricsRegistry: any;

  beforeEach(async () => {
    // Mock Redis客户端
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      pttl: jest.fn(),
      pipeline: jest.fn(() => ({
        setex: jest.fn(),
        exec: jest.fn(),
      })),
      ping: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
    };

    // Mock压缩服务
    mockCompressionService = {
      shouldCompress: jest.fn().mockReturnValue(false),
      compress: jest.fn(),
      decompress: jest.fn(),
    };

    // Mock指标注册表
    mockMetricsRegistry = {
      inc: jest.fn(),
      observe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonCacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
        {
          provide: CacheCompressionService,
          useValue: mockCompressionService,
        },
        {
          provide: 'METRICS_REGISTRY',
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<CommonCacheService>(CommonCacheService);
  });

  describe('get', () => {
    it('should return cached data with TTL when key exists', async () => {
      const key = 'test:key';
      const cachedData = { value: 'test' };
      const envelope = JSON.stringify({
        data: cachedData,
        storedAt: Date.now(),
        compressed: false,
      });

      mockRedis.get.mockResolvedValue(envelope);
      mockRedis.pttl.mockResolvedValue(300000); // 300秒 in ms

      const result = await service.get<typeof cachedData>(key);

      expect(result).toEqual({
        data: cachedData,
        ttlRemaining: 300, // 转换为秒
      });
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(mockRedis.pttl).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'test:key';
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.pttl.mockResolvedValue(REDIS_SPECIAL_VALUES.PTTL_KEY_NOT_EXISTS);

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle pttl special values correctly', async () => {
      const key = 'test:key';
      const cachedData = { value: 'test' };
      const envelope = JSON.stringify({
        data: cachedData,
        storedAt: Date.now(),
        compressed: false,
      });

      mockRedis.get.mockResolvedValue(envelope);
      
      // 测试 pttl = -1 (无过期时间)
      mockRedis.pttl.mockResolvedValue(REDIS_SPECIAL_VALUES.PTTL_NO_EXPIRE);

      const result = await service.get(key);

      expect(result).toEqual({
        data: cachedData,
        ttlRemaining: CACHE_CONFIG.TTL.NO_EXPIRE_DEFAULT, // 365天
      });
    });

    it('should return null when Redis operation fails', async () => {
      const key = 'test:key';
      
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRedis.pttl.mockResolvedValue(300000);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
        'cacheOperationsTotal',
        { op: 'get', status: 'error' }
      );
    });
  });

  describe('set', () => {
    it('should set data with correct TTL', async () => {
      const key = 'test:key';
      const data = { value: 'test' };
      const ttl = 3600;

      mockRedis.setex.mockResolvedValue('OK');
      mockCompressionService.shouldCompress.mockReturnValue(false);

      await service.set(key, data, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        expect.stringContaining('"data":{"value":"test"}')
      );
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
        'cacheOperationsTotal',
        { op: 'set', status: 'success' }
      );
    });

    it('should enforce TTL limits', async () => {
      const key = 'test:key';
      const data = { value: 'test' };
      const tooSmallTtl = 10; // 小于最小值30
      const tooLargeTtl = 100000; // 大于最大值86400

      mockRedis.setex.mockResolvedValue('OK');

      // 测试过小的TTL
      await service.set(key, data, tooSmallTtl);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        CACHE_CONFIG.TTL.MIN_SECONDS, // 应该使用最小值
        expect.any(String)
      );

      // 测试过大的TTL
      await service.set(key, data, tooLargeTtl);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        CACHE_CONFIG.TTL.MAX_SECONDS, // 应该使用最大值
        expect.any(String)
      );
    });

    it('should not throw when Redis operation fails', async () => {
      const key = 'test:key';
      const data = { value: 'test' };
      const ttl = 3600;

      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.set(key, data, ttl)).resolves.not.toThrow();
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
        'cacheOperationsTotal',
        { op: 'set', status: 'error' }
      );
    });
  });

  describe('delete', () => {
    it('should delete key and return true when key exists', async () => {
      const key = 'test:key';
      
      mockRedis.del.mockResolvedValue(1);

      const result = await service.delete(key);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should return false when key does not exist', async () => {
      const key = 'test:key';
      
      mockRedis.del.mockResolvedValue(0);

      const result = await service.delete(key);

      expect(result).toBe(false);
    });
  });

  describe('mget', () => {
    it('should return results in the same order as input keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const data1 = { value: 'test1' };
      const data2 = { value: 'test2' };
      
      const envelope1 = JSON.stringify({ data: data1, storedAt: Date.now(), compressed: false });
      const envelope2 = JSON.stringify({ data: data2, storedAt: Date.now(), compressed: false });

      mockRedis.mget.mockResolvedValue([envelope1, null, envelope2]);
      mockRedis.pttl.mockResolvedValueOnce(300000)
                    .mockResolvedValueOnce(REDIS_SPECIAL_VALUES.PTTL_KEY_NOT_EXISTS)
                    .mockResolvedValueOnce(600000);

      const results = await service.mget(keys);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ data: data1, ttlRemaining: 300 });
      expect(results[1]).toBeNull();
      expect(results[2]).toEqual({ data: data2, ttlRemaining: 600 });
    });

    it('should handle batch size limit', async () => {
      const keys = new Array(CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE + 1).fill('key');

      const results = await service.mget(keys);

      expect(results).toEqual(keys.map(() => null));
      expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
        'cacheOperationsTotal',
        { op: 'mget', status: 'error' }
      );
    });
  });

  describe('getWithFallback', () => {
    it('should return cached data when cache hit', async () => {
      const key = 'test:key';
      const cachedData = { value: 'cached' };
      const fetchFn = jest.fn().mockResolvedValue({ value: 'fresh' });
      const ttl = 3600;

      // Mock缓存命中
      jest.spyOn(service, 'get').mockResolvedValue({
        data: cachedData,
        ttlRemaining: 300,
      });

      const result = await service.getWithFallback(key, fetchFn, ttl);

      expect(result).toEqual({
        data: cachedData,
        hit: true,
        ttlRemaining: 300,
      });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cache miss', async () => {
      const key = 'test:key';
      const freshData = { value: 'fresh' };
      const fetchFn = jest.fn().mockResolvedValue(freshData);
      const ttl = 3600;

      // Mock缓存未命中
      jest.spyOn(service, 'get').mockResolvedValue(null);
      jest.spyOn(service, 'set').mockResolvedValue(undefined);

      const result = await service.getWithFallback(key, fetchFn, ttl);

      expect(result).toEqual({
        data: freshData,
        hit: false,
      });
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should throw when both cache and fetch fail', async () => {
      const key = 'test:key';
      const fetchError = new Error('Fetch failed');
      const fetchFn = jest.fn().mockRejectedValue(fetchError);
      const ttl = 3600;

      // Mock缓存未命中
      jest.spyOn(service, 'get').mockResolvedValue(null);

      await expect(service.getWithFallback(key, fetchFn, ttl)).rejects.toThrow(fetchError);
    });
  });

  describe('generateCacheKey', () => {
    it('should generate cache key with prefix and parts', () => {
      const result = CommonCacheService.generateCacheKey('test', 'part1', 'part2');
      expect(result).toBe('test:part1:part2');
    });

    it('should filter out empty parts', () => {
      const result = CommonCacheService.generateCacheKey('test', 'part1', '', 'part2', null as any);
      expect(result).toBe('test:part1:part2');
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis responds to ping', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when Redis ping fails', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });
});