import { CacheService } from '../../../../src/cache/cache.service';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService, RedisModule } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

describe('CacheService', () => {
  let service: CacheService;
  let redisService: RedisService;
  let redisClient: jest.Mocked<Redis>;

  beforeEach(async () => {
    // 确保每个测试开始前都有干净的环境
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    const mockRedisClient = {
      // 基础 Redis 操作 - 提供默认的成功响应
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      ttl: jest.fn().mockResolvedValue(-1),
      ping: jest.fn().mockResolvedValue('PONG'),
      mget: jest.fn().mockResolvedValue([]),
      dbsize: jest.fn().mockResolvedValue(0),
      
      // info 方法 - 提供智能的默认响应
      info: jest.fn().mockImplementation((section?: string) => {
        if (section === 'memory') {
          return Promise.resolve('used_memory:1024000\r\nmaxmemory:2048000\r\n');
        }
        if (section === 'keyspace') {
          return Promise.resolve('db0:keys=0,expires=0,avg_ttl=0\r\n');
        }
        // 无参数时返回包含 keyspace_hits 和 keyspace_misses 的信息
        return Promise.resolve('keyspace_hits:0\r\nkeyspace_misses:0\r\nused_memory:1024000\r\n');
      }),
      
      // pipeline 方法 - 提供默认的成功响应
      pipeline: jest.fn(() => ({
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 'OK']]), // 修复：使用正确的 Redis pipeline.exec() 格式
      })),
      
      // eval 方法 - 用于锁操作
      eval: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<Redis>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisService = module.get<RedisService>(RedisService);
    redisClient = redisService.getOrThrow() as jest.Mocked<Redis>;
  });

  afterEach(() => {
    // 强化 Mock 清理，确保彻底的环境隔离
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // 显式重置 Redis Client Mock 的所有方法
    Object.keys(redisClient).forEach(key => {
      if (typeof redisClient[key].mockReset === 'function') {
        redisClient[key].mockReset();
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return deserialized value from cache', async () => {
      const key = 'test_key';
      const value = { data: 'test_data' };
      redisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(redisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null if key does not exist', async () => {
      const key = 'non_existent_key';
      redisClient.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle compressed values', async () => {
      const key = 'compressed_key';
      const value = { data: 'test_data' };
      // 修复：使用真正的 gzip 压缩数据
      const zlib = require('zlib');
      const compressedBuffer = zlib.gzipSync(JSON.stringify(value));
      const compressedData = compressedBuffer.toString('base64');
      redisClient.get.mockResolvedValue(`COMPRESSED::${compressedData}`);

      const result = await service.get(key);

      expect(result).toEqual(value);
    });
  });

  describe('set', () => {
    it('should serialize and set value in cache with TTL', async () => {
      const key = 'test_key';
      const value = { data: 'test_data' };
      const options = { ttl: 3600 };
      redisClient.setex.mockResolvedValue('OK');

      const result = await service.set(key, value, options);

      expect(result).toBe(true);
      expect(redisClient.setex).toHaveBeenCalledWith(
        key,
        options.ttl,
        JSON.stringify(value),
      );
    });

    it('should handle compression for large values', async () => {
      const key = 'large_key';
      const value = { data: 'x'.repeat(2000) };
      const options = { ttl: 3600, compressionThreshold: 1000 };
      redisClient.setex.mockResolvedValue('OK');

      const result = await service.set(key, value, options);

      expect(result).toBe(true);
      expect(redisClient.setex).toHaveBeenCalledWith(
        key,
        options.ttl,
        expect.stringContaining('COMPRESSED::'),
      );
    });
  });

  describe('getOrSet', () => {
    it('should return from cache if value exists', async () => {
      const key = 'test_key';
      const cachedValue = { data: 'cached_data' };
      const callback = jest.fn().mockResolvedValue({ data: 'new_data' });
      redisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      const result = await service.getOrSet(key, callback);

      expect(result).toEqual(cachedValue);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback and set cache if value does not exist', async () => {
      const key = 'test_key';
      const newValue = { data: 'new_data' };
      const callback = jest.fn().mockResolvedValue(newValue);
      redisClient.get.mockResolvedValue(null);
      redisClient.set.mockResolvedValue('OK');
      redisClient.setex.mockResolvedValue('OK');

      const result = await service.getOrSet(key, callback);

      expect(result).toEqual(newValue);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(redisClient.setex).toHaveBeenCalled();
    });

    it('should handle distributed locking', async () => {
      const key = 'test_key';
      const newValue = { data: 'new_data' };
      const callback = jest.fn().mockResolvedValue(newValue);
      
      redisClient.get.mockResolvedValueOnce(null);
      redisClient.set.mockResolvedValue('OK');
      redisClient.setex.mockResolvedValue('OK');
      redisClient.eval.mockResolvedValue(1);

      const result = await service.getOrSet(key, callback);

      expect(result).toEqual(newValue);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('mget', () => {
    it('should return multiple cached values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = [
        JSON.stringify({ data: 'value1' }),
        null,
        JSON.stringify({ data: 'value3' }),
      ];
            redisClient.mget.mockResolvedValue(values);
      
      const result = await service.mget(keys);

      expect(result.size).toBe(2);
      expect(result.get('key1')).toEqual({ data: 'value1' });
      expect(result.get('key3')).toEqual({ data: 'value3' });
      expect(result.has('key2')).toBe(false);
    });

    it('should handle empty keys array', async () => {
      const result = await service.mget([]);
      expect(result.size).toBe(0);
    });
  });

  describe('mset', () => {
    it('should set multiple cache entries', async () => {
      const entries = new Map([
        ['key1', { data: 'value1' }],
        ['key2', { data: 'value2' }],
      ]);
      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 'OK']]),
      };
      redisClient.pipeline.mockReturnValue(mockPipeline as any);

      const result = await service.mset(entries, 3600);

      expect(result).toBe(true);
      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
      expect(mockPipeline.setex).toHaveBeenCalledWith('key1', 3600, JSON.stringify({ data: 'value1' }));
    });

    it('should handle empty entries map', async () => {
      const result = await service.mset(new Map(), 3600);
      expect(result).toBe(true);
      expect(redisClient.pipeline().exec).not.toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should delete single key', async () => {
      redisClient.del.mockResolvedValue(1);

      const result = await service.del('test_key');

      expect(result).toBe(1);
      expect(redisClient.del).toHaveBeenCalledWith('test_key');
    });

    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      redisClient.del.mockResolvedValue(3);

      const result = await service.del(keys);

      expect(result).toBe(3);
      expect(redisClient.del).toHaveBeenCalledWith(...keys);
    });
  });

  describe('delByPattern', () => {
    it('should delete keys matching a pattern', async () => {
      const pattern = 'user:*';
      const keys = ['user:1', 'user:2'];
      redisClient.keys.mockResolvedValue(keys);
      redisClient.del.mockResolvedValue(keys.length);

      const result = await service.delByPattern(pattern);

      expect(result).toBe(keys.length);
      expect(redisClient.keys).toHaveBeenCalledWith(pattern);
      expect(redisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle empty pattern results', async () => {
      redisClient.keys.mockResolvedValue([]);

      const result = await service.delByPattern('nonexistent:*');

      expect(result).toBe(0);
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('warmup', () => {
    it('should call mset with warmup data', async () => {
      const warmupData = new Map([
        ['warmup1', { data: 'warm_data1' }],
        ['warmup2', { data: 'warm_data2' }],
      ]);
      jest.spyOn(service, 'mset').mockResolvedValue(true);

      await service.warmup(warmupData);

      expect(service.mset).toHaveBeenCalledWith(warmupData, 3600);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // 完全重置所有 Mock，确保环境隔离
      jest.clearAllMocks();
      
      // 对于 info 方法的多次调用，使用 mockImplementation 来区分不同的参数
      redisClient.info.mockImplementation((section?: string) => {
        if (section === 'memory') {
          return Promise.resolve('used_memory:1024000\r\nmaxmemory:2048000\r\n');
        }
        if (section === 'keyspace') {
          return Promise.resolve('db0:keys=100,expires=50,avg_ttl=3600\r\n');
        }
        // 无参数时返回包含 keyspace_hits 和 keyspace_misses 的信息
        return Promise.resolve('keyspace_hits:1000\r\nkeyspace_misses:200\r\nused_memory:1024000\r\n');
      });
      
      redisClient.dbsize.mockResolvedValue(100);

      const stats = await service.getStats();

      expect(stats).toHaveProperty('memoryUsage', 1024000);
      expect(stats).toHaveProperty('keyCount', 100);
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.avgTtl).toBeGreaterThanOrEqual(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status if redis is responsive', async () => {
      // 完全重新创建服务实例，确保彻底的环境隔离
      const freshMockRedisClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockImplementation((key: string) => {
          // 健康检查的读写测试
          if (key.startsWith('health_check:')) {
            return Promise.resolve('test'); // 健康检查期望原始字符串，不是JSON
          }
          // 其他缓存操作
          if (key === 'test_key_1' || key === 'test_key_2') {
            return Promise.resolve('"cached_value"'); // 返回JSON格式的字符串
          }
          return Promise.resolve(null); // 未命中
        }),
        del: jest.fn().mockResolvedValue(1),
        info: jest.fn().mockImplementation((section: string) => {
          if (section === 'memory') {
            return Promise.resolve('used_memory:512000\r\n');
          }
          if (section === 'keyspace') {
            return Promise.resolve('db0:keys=10\r\n');
          }
          return Promise.resolve('');
        }),
        keys: jest.fn().mockResolvedValue(['key1']),
        ttl: jest.fn().mockResolvedValue(3600),
        pipeline: jest.fn(() => ({
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, 'OK']]),
        })),
        mget: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue('OK'),
        eval: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<Redis>;

      const freshModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: RedisService,
            useValue: {
              getOrThrow: jest.fn().mockReturnValue(freshMockRedisClient),
            },
          },
        ],
      }).compile();

      const freshService = freshModule.get<CacheService>(CacheService);

      // 🔧 关键修复：在健康检查前建立缓存统计历史
      // 直接操作缓存统计，确保命中率 >= 0.5
      const cacheStatsMap = (freshService as any).cacheStats;
      cacheStatsMap.set('test_pattern', { hits: 10, misses: 5 }); // 命中率 = 10/15 = 0.67 > 0.5

      const health = await freshService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.errors).toHaveLength(0);
    });

    it('should return unhealthy status on error', async () => {
      // 创建独立的失败 Mock 客户端
      const failingMockRedisClient = {
        ping: jest.fn().mockRejectedValue(new Error('Connection error')),
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('test'),
        del: jest.fn().mockResolvedValue(1),
        info: jest.fn().mockResolvedValue(''),
        keys: jest.fn().mockResolvedValue([]),
        ttl: jest.fn().mockResolvedValue(-1),
        pipeline: jest.fn(() => ({
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, 'OK']]),
        })),
        mget: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue('OK'),
        eval: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<Redis>;

      const failingModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: RedisService,
            useValue: {
              getOrThrow: jest.fn().mockReturnValue(failingMockRedisClient),
            },
          },
        ],
      }).compile();

      const failingService = failingModule.get<CacheService>(CacheService);

      const health = await failingService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.errors).toContain('缓存健康检查失败');
    });

    it('should detect high memory usage', async () => {
      // 创建独立的高内存使用 Mock 客户端
      const highMemoryMockRedisClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('test'),
        del: jest.fn().mockResolvedValue(1),
        info: jest.fn().mockImplementation((section: string) => {
          if (section === 'memory') {
            return Promise.resolve('used_memory:2147483648\r\nmaxmemory:2000000000\r\n'); // 2GB used, 2GB max - 触发高内存警告
          }
          if (section === 'keyspace') {
            return Promise.resolve('db0:keys=10\r\n');
          }
          return Promise.resolve('');
        }),
        keys: jest.fn().mockResolvedValue(['key1']),
        ttl: jest.fn().mockResolvedValue(3600),
        pipeline: jest.fn(() => ({
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, 'OK']]),
        })),
        mget: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue('OK'),
        eval: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<Redis>;

      const highMemoryModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: RedisService,
            useValue: {
              getOrThrow: jest.fn().mockReturnValue(highMemoryMockRedisClient),
            },
          },
        ],
      }).compile();

      const highMemoryService = highMemoryModule.get<CacheService>(CacheService);

      const health = await highMemoryService.healthCheck();

      expect(health.errors).toContain('Redis 内存使用率超过90%');
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // 创建独立的错误服务实例，完全隔离
      const errorMockRedisClient = {
        get: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        ttl: jest.fn().mockResolvedValue(-1),
        info: jest.fn().mockResolvedValue(''),
        ping: jest.fn().mockResolvedValue('PONG'),
        mget: jest.fn().mockResolvedValue([]),
        pipeline: jest.fn(() => ({
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, 'OK']]),
        })),
        eval: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<Redis>;

      const errorModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: RedisService,
            useValue: {
              getOrThrow: jest.fn().mockReturnValue(errorMockRedisClient),
            },
          },
        ],
      }).compile();

      const errorService = errorModule.get<CacheService>(CacheService);

      await expect(errorService.get('test_key')).rejects.toThrow('缓存获取失败: Redis connection failed');
    });

    it('should handle set operation errors', async () => {
      // 创建独立的设置错误服务实例
      const setErrorMockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockRejectedValue(new Error('Redis set failed')),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        ttl: jest.fn().mockResolvedValue(-1),
        info: jest.fn().mockResolvedValue(''),
        ping: jest.fn().mockResolvedValue('PONG'),
        mget: jest.fn().mockResolvedValue([]),
        pipeline: jest.fn(() => ({
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, 'OK']]),
        })),
        eval: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<Redis>;

      const setErrorModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: RedisService,
            useValue: {
              getOrThrow: jest.fn().mockReturnValue(setErrorMockRedisClient),
            },
          },
        ],
      }).compile();

      const setErrorService = setErrorModule.get<CacheService>(CacheService);

      await expect(setErrorService.set('test_key', { data: 'test' })).rejects.toThrow('缓存设置失败: Redis set failed');
    });

    it('should handle getOrSet callback errors', async () => {
      // 创建独立的回调错误服务实例
      const callbackErrorMockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        ttl: jest.fn().mockResolvedValue(-1),
        info: jest.fn().mockResolvedValue(''),
        ping: jest.fn().mockResolvedValue('PONG'),
        mget: jest.fn().mockResolvedValue([]),
        pipeline: jest.fn(() => ({
          setex: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, 'OK']]),
        })),
        eval: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<Redis>;

      const callbackErrorModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: RedisService,
            useValue: {
              getOrThrow: jest.fn().mockReturnValue(callbackErrorMockRedisClient),
            },
          },
        ],
      }).compile();

      const callbackErrorService = callbackErrorModule.get<CacheService>(CacheService);

      const callback = jest.fn().mockRejectedValue(new Error('Callback failed'));

      await expect(callbackErrorService.getOrSet('test_key', callback)).rejects.toThrow('Callback failed');
    });
  });
});
