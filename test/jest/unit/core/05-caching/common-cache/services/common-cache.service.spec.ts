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

  // ✅ 新增：缓存解压功能测试
  describe('Cache Decompression Functionality', () => {
    
    beforeEach(() => {
      // 确保解压功能启用
      process.env.CACHE_DECOMPRESSION_ENABLED = 'true';
      // 重置mock
      jest.clearAllMocks();
    });

    afterEach(() => {
      // 恢复环境变量
      delete process.env.CACHE_DECOMPRESSION_ENABLED;
    });

    describe('基础解压功能', () => {
      it('应正确解压大于10KB的数据', async () => {
        const largeData = { 
          symbol: "700.HK", 
          quotes: new Array(1000).fill({ price: 100, volume: 1000 }) 
        };
        const compressedValue = JSON.stringify({
          data: 'H4sIAAAAAAAAA+fake_base64_data',
          compressed: true,
          storedAt: Date.now(),
          metadata: { originalSize: 15000, compressedSize: 5000 }
        });

        mockRedis.get.mockResolvedValue(compressedValue);
        mockRedis.pttl.mockResolvedValue(300000);
        mockCompressionService.decompress.mockResolvedValue(largeData);

        const result = await service.get('large-data-key');

        expect(result).not.toBeNull();
        expect(result.data).toEqual(largeData);
        expect(typeof result.data).toBe('object');
        expect(mockCompressionService.decompress).toHaveBeenCalledWith(
          'H4sIAAAAAAAAA+fake_base64_data',
          expect.objectContaining({ compressed: true })
        );
      });

      it('应保持小于10KB数据的原有行为', async () => {
        const smallData = { test: 'small data' };
        const uncompressedValue = JSON.stringify({
          data: smallData,
          compressed: false,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(uncompressedValue);
        mockRedis.pttl.mockResolvedValue(300000);

        const result = await service.get('small-data-key');

        expect(result).not.toBeNull();
        expect(result.data).toEqual(smallData);
        expect(mockCompressionService.decompress).not.toHaveBeenCalled();
      });

      it('解压开关关闭时应返回原始数据', async () => {
        process.env.CACHE_DECOMPRESSION_ENABLED = 'false';
        
        const compressedValue = JSON.stringify({
          data: 'H4sIAAAAAAAAA+fake_base64_data',
          compressed: true,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(compressedValue);
        mockRedis.pttl.mockResolvedValue(300000);

        const result = await service.get('switch-test-key');

        expect(result).not.toBeNull();
        expect(result.data).toBe('H4sIAAAAAAAAA+fake_base64_data');
        expect(mockCompressionService.decompress).not.toHaveBeenCalled();
      });
    });

    describe('批量操作解压', () => {
      it('mget应正确处理混合大小数据', async () => {
        const smallData = { type: 'small' };
        const largeData = { type: 'large', data: new Array(100).fill('x') };
        
        const values = [
          JSON.stringify({ data: smallData, compressed: false, storedAt: Date.now() }),
          JSON.stringify({ data: 'compressed_base64', compressed: true, storedAt: Date.now() })
        ];

        mockRedis.mget.mockResolvedValue(values);
        mockRedis.pttl.mockResolvedValueOnce(300000).mockResolvedValueOnce(300000);
        mockCompressionService.decompress.mockResolvedValue(largeData);

        const results = await service.mget(['small', 'large']);

        expect(results).toHaveLength(2);
        expect(results[0].data).toEqual(smallData);
        expect(results[1].data).toEqual(largeData);
        expect(mockCompressionService.decompress).toHaveBeenCalledTimes(1);
      });

      it('批量操作中单个解压失败应回退到原数据', async () => {
        const validData = { test: 'valid' };
        const values = [
          JSON.stringify({ data: validData, compressed: false, storedAt: Date.now() }),
          JSON.stringify({ data: 'invalid-base64-data', compressed: true, storedAt: Date.now() })
        ];

        mockRedis.mget.mockResolvedValue(values);
        mockRedis.pttl.mockResolvedValueOnce(300000).mockResolvedValueOnce(300000);
        
        // 第一次调用成功，第二次失败
        mockCompressionService.decompress.mockImplementation((data) => {
          if (data === 'invalid-base64-data') {
            throw new Error('Invalid base64 format');
          }
          return Promise.resolve({ decompressed: 'data' });
        });

        const results = await service.mget(['valid-key', 'corrupted-key']);

        expect(results).toHaveLength(2);
        expect(results[0].data).toEqual(validData);
        // 损坏数据应回退到原始值
        expect(results[1].data).toBe('invalid-base64-data');
      });
    });

    describe('错误处理和类型安全', () => {
      it('解压失败时应返回null(resilient behavior)', async () => {
        const corruptedValue = JSON.stringify({
          data: 'invalid-base64-data',
          compressed: true,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(corruptedValue);
        mockRedis.pttl.mockResolvedValue(300000);
        mockCompressionService.decompress.mockRejectedValue(new Error('Invalid base64 format'));

        const result = await service.get('corrupted-key');

        // 缓存服务应该是resilient的，返回null而不是抛出异常
        expect(result).toBeNull();
        expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
          'cacheOperationsTotal',
          { op: 'get', status: 'error' }
        );
      });

      it('缺少metadata时应安全处理并补充默认值', async () => {
        const dataWithoutMetadata = JSON.stringify({
          data: 'H4sIAAAAAAAAA+test_data',
          compressed: true
          // 缺少metadata和storedAt
        });

        mockRedis.get.mockResolvedValue(dataWithoutMetadata);
        mockRedis.pttl.mockResolvedValue(300000);
        mockCompressionService.decompress.mockResolvedValue({ test: 'decompressed' });

        const result = await service.get('legacy-key');

        expect(result).not.toBeNull();
        expect(mockCompressionService.decompress).toHaveBeenCalledWith(
          'H4sIAAAAAAAAA+test_data',
          expect.objectContaining({
            compressed: true,
            storedAt: expect.any(Number),
            originalSize: 0,
            compressedSize: 0
          })
        );
      });

      it('非字符串压缩数据应返回null(resilient behavior)', async () => {
        const invalidFormatValue = JSON.stringify({
          data: { invalid: 'object' }, // 非字符串
          compressed: true,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(invalidFormatValue);
        mockRedis.pttl.mockResolvedValue(300000);

        const result = await service.get('invalid-format-key');

        // 缓存服务应该是resilient的，返回null而不是抛出异常
        expect(result).toBeNull();
      });
    });

    describe('性能和并发控制', () => {
      it('应记录解压成功指标', async () => {
        const testData = { test: 'data' };
        const compressedValue = JSON.stringify({
          data: 'H4sIAAAAAAAAA+test',
          compressed: true,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(compressedValue);
        mockRedis.pttl.mockResolvedValue(300000);
        mockCompressionService.decompress.mockResolvedValue(testData);

        await service.get('test-key');

        expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
          'cacheDecompressionTotal',
          expect.objectContaining({ status: 'success', error_type: 'success' })
        );
        expect(mockMetricsRegistry.observe).toHaveBeenCalledWith(
          'cacheDecompressionDuration',
          expect.any(Number)
        );
      });

      it('应记录解压失败指标', async () => {
        const corruptedValue = JSON.stringify({
          data: 'invalid-data',
          compressed: true,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(corruptedValue);
        mockRedis.pttl.mockResolvedValue(300000);
        mockCompressionService.decompress.mockRejectedValue(new Error('base64 decode failed'));

        try {
          await service.get('corrupted-key');
        } catch {
          // 预期的异常
        }

        expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
          'cacheDecompressionTotal',
          expect.objectContaining({ status: 'error', error_type: 'base64_decode_failed' })
        );
      });

      it('应正确分类不同类型的解压错误', async () => {
        const testCases = [
          { error: new Error('base64 invalid'), expectedType: 'base64_decode_failed' },
          { error: new Error('gunzip failed'), expectedType: 'gzip_decompress_failed' },
          { error: new Error('JSON parse error'), expectedType: 'json_parse_failed' },
          { error: new Error('metadata missing'), expectedType: 'metadata_invalid' },
          { error: new Error('unknown issue'), expectedType: 'unknown_error' }
        ];

        for (const testCase of testCases) {
          jest.clearAllMocks();
          
          const compressedValue = JSON.stringify({
            data: 'test-data',
            compressed: true,
            storedAt: Date.now()
          });

          mockRedis.get.mockResolvedValue(compressedValue);
          mockRedis.pttl.mockResolvedValue(300000);
          mockCompressionService.decompress.mockRejectedValue(testCase.error);

          try {
            await service.get('error-test-key');
          } catch {
            // 预期的异常
          }

          expect(mockMetricsRegistry.inc).toHaveBeenCalledWith(
            'cacheDecompressionTotal',
            expect.objectContaining({ 
              status: 'error', 
              error_type: testCase.expectedType 
            })
          );
        }
      });
    });

    describe('边界条件测试', () => {
      it('应处理空缓存值', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.pttl.mockResolvedValue(-2);

        const result = await service.get('non-existent-key');

        expect(result).toBeNull();
        expect(mockCompressionService.decompress).not.toHaveBeenCalled();
      });

      it('应处理Unicode和特殊字符', async () => {
        const unicodeData = {
          chinese: "这是中文测试数据",
          emoji: "😀😃😄😁😆😅🤣😂",
          special: "!@#$%^&*()_+-=[]{}|;:,.<>?",
          mixed: "Mixed content: 中文 + English + 123 + 🎉"
        };

        const compressedValue = JSON.stringify({
          data: 'H4sIAAAAAAAAA+unicode_data',
          compressed: true,
          storedAt: Date.now()
        });

        mockRedis.get.mockResolvedValue(compressedValue);
        mockRedis.pttl.mockResolvedValue(300000);
        mockCompressionService.decompress.mockResolvedValue(unicodeData);

        const result = await service.get('unicode-test');

        expect(result).not.toBeNull();
        expect(result.data).toEqual(unicodeData);
      });
    });
  });
});