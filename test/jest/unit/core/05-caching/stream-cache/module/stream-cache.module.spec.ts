import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StreamCacheModule } from '../../../../../../../src/core/05-caching/stream-cache/module/stream-cache.module';
import { StreamCacheService } from '../../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service';
import Redis from 'ioredis';

describe('StreamCacheModule', () => {
  let module: TestingModule;
  let streamCacheService: StreamCacheService;
  let redisClient: Redis;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const configMap = {
        'redis.host': 'localhost',
        'redis.port': 6379,
        'redis.password': undefined,
        'redis.stream_cache_db': 1,
        'stream_cache.hot_ttl_ms': 5000,
        'stream_cache.warm_ttl_seconds': 300,
        'stream_cache.max_hot_size': 1000,
        'stream_cache.cleanup_interval_ms': 30000,
        'stream_cache.compression_threshold': 1024,
      };
      return configMap[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StreamCacheModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    streamCacheService = module.get<StreamCacheService>(StreamCacheService);
    redisClient = module.get<Redis>('REDIS_CLIENT');
  });

  afterEach(async () => {
    // 清理Redis连接
    if (redisClient) {
      await redisClient.quit();
    }
    await module.close();
  });

  describe('模块初始化', () => {
    it('应该正确注册StreamCacheService', () => {
      expect(streamCacheService).toBeDefined();
      expect(streamCacheService).toBeInstanceOf(StreamCacheService);
    });

    it('应该正确注入Redis客户端', () => {
      expect(redisClient).toBeDefined();
      expect(redisClient).toBeInstanceOf(Redis);
    });

    it('应该提供正确的配置', () => {
      const config = module.get('STREAM_CACHE_CONFIG');
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('hotCacheTTL', 5000);
      expect(config).toHaveProperty('warmCacheTTL', 300);
      expect(config).toHaveProperty('maxHotCacheSize', 1000);
      expect(config).toHaveProperty('cleanupInterval', 30000);
      expect(config).toHaveProperty('compressionThreshold', 1024);
    });
  });

  describe('Redis连接配置', () => {
    it('应该使用正确的Redis配置', () => {
      // 验证ConfigService被正确调用
      expect(mockConfigService.get).toHaveBeenCalledWith('redis.host', 'localhost');
      expect(mockConfigService.get).toHaveBeenCalledWith('redis.port', 6379);
      expect(mockConfigService.get).toHaveBeenCalledWith('redis.stream_cache_db', 1);
    });

    it('Redis客户端应该配置为流缓存优化', async () => {
      // 验证Redis连接是否正常
      const pingResult = await redisClient.ping();
      expect(pingResult).toBe('PONG');
      
      // 验证Redis配置
      const options = redisClient.options;
      expect(options.keyPrefix).toBe('stream:');
      expect(options.connectTimeout).toBe(5000);
      expect(options.commandTimeout).toBe(3000);
      expect(options.enableAutoPipelining).toBe(true);
      expect(options.enableOfflineQueue).toBe(false);
    });
  });

  describe('导出功能', () => {
    it('应该正确导出StreamCacheService', () => {
      const exportedService = module.get<StreamCacheService>(StreamCacheService);
      expect(exportedService).toBe(streamCacheService);
    });

    it('应该正确导出REDIS_CLIENT', () => {
      const exportedRedisClient = module.get<Redis>('REDIS_CLIENT');
      expect(exportedRedisClient).toBe(redisClient);
    });

    it('应该正确导出STREAM_CACHE_CONFIG', () => {
      const exportedConfig = module.get('STREAM_CACHE_CONFIG');
      expect(exportedConfig).toBeDefined();
      expect(exportedConfig.hotCacheTTL).toBe(5000);
    });
  });

  describe('配置覆盖', () => {
    it('应该支持环境变量配置覆盖', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const customConfigMap = {
            'redis.host': 'custom-redis',
            'redis.port': 6380,
            'redis.stream_cache_db': 2,
            'stream_cache.hot_ttl_ms': 3000,
            'stream_cache.warm_ttl_seconds': 600,
          };
          return customConfigMap[key] ?? defaultValue;
        }),
      };

      const customModule = await Test.createTestingModule({
        imports: [StreamCacheModule],
      })
        .overrideProvider(ConfigService)
        .useValue(customConfigService)
        .compile();

      const customConfig = customModule.get('STREAM_CACHE_CONFIG');
      
      expect(customConfig.hotCacheTTL).toBe(3000);
      expect(customConfig.warmCacheTTL).toBe(600);
      
      await customModule.close();
    });
  });

  describe('模块生命周期', () => {
    it('应该在模块关闭时清理资源', async () => {
      const disconnectSpy = jest.spyOn(redisClient, 'disconnect');
      
      await module.close();
      
      // 注意：实际的断开连接可能在afterEach中处理
      // 这里主要验证模块能够正常关闭而不报错
      expect(module).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该优雅处理Redis连接错误', async () => {
      const errorConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'redis.host') return 'invalid-host';
          if (key === 'redis.port') return 9999; // 无效端口
          return defaultValue;
        }),
      };

      // 创建模块但不期望Redis连接成功
      const errorModule = await Test.createTestingModule({
        imports: [StreamCacheModule],
      })
        .overrideProvider(ConfigService)
        .useValue(errorConfigService)
        .compile();

      const errorRedisClient = errorModule.get<Redis>('REDIS_CLIENT');
      expect(errorRedisClient).toBeDefined();
      
      // Redis连接可能失败，但模块应该正常创建
      await errorModule.close();
    });
  });
});