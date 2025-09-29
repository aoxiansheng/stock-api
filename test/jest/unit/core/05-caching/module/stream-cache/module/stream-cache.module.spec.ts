import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { StreamCacheModule } from '@core/05-caching/module/stream-cache/module/stream-cache.module';
import { StreamCacheStandardizedService } from '@core/05-caching/module/stream-cache/services/stream-cache-standardized.service';
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
} from '@monitoring/contracts/tokens/injection.tokens';
import {
  STREAM_CACHE_CONFIG,
  DEFAULT_STREAM_CACHE_CONFIG,
} from '@core/05-caching/module/stream-cache/constants/stream-cache.constants';

describe('StreamCacheModule', () => {
  let module: TestingModule;
  let streamCacheModule: StreamCacheModule;
  let configService: jest.Mocked<ConfigService>;
  let redisClient: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      switch (key) {
        case 'redis.host':
          return 'localhost';
        case 'redis.port':
          return 6379;
        case 'redis.password':
          return undefined;
        case 'redis.stream_cache_db':
          return 1;
        case 'stream_cache.hot_ttl_ms':
          return 5000;
        case 'stream_cache.warm_ttl_seconds':
          return 300;
        case 'stream_cache.max_hot_size':
          return 1000;
        case 'stream_cache.cleanup_interval_ms':
          return 60000;
        case 'stream_cache.compression_threshold':
          return 1024;
        default:
          return defaultValue;
      }
    }),
  };

  const mockRedisClient = {
    ping: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [],
        }),
        EventEmitterModule.forRoot(),
        StreamCacheModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(EventEmitter2)
      .useValue(mockEventEmitter)
      .compile();

    streamCacheModule = module.get<StreamCacheModule>(StreamCacheModule);
    configService = module.get<jest.Mocked<ConfigService>>(ConfigService);
    redisClient = module.get<jest.Mocked<Redis>>(CACHE_REDIS_CLIENT_TOKEN);

    // Mock Redis methods for module instance
    Object.assign(redisClient, mockRedisClient);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Compilation', () => {
    it('should compile the module successfully', () => {
      expect(module).toBeDefined();
      expect(streamCacheModule).toBeDefined();
    });

    it('should provide StreamCacheStandardizedService', () => {
      const service = module.get<StreamCacheStandardizedService>(StreamCacheStandardizedService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamCacheStandardizedService);
    });

    it('should provide Redis client with correct token', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();
    });

    it('should provide stream cache config with correct token', () => {
      const config = module.get(STREAM_CACHE_CONFIG_TOKEN);
      expect(config).toBeDefined();
      expect(config).toHaveProperty('hotCacheTTL');
      expect(config).toHaveProperty('warmCacheTTL');
      expect(config).toHaveProperty('maxHotCacheSize');
    });
  });

  describe('Provider Configuration', () => {
    it('should configure Redis client with proper settings', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();

      // Verify ConfigService calls for Redis configuration
      expect(configService.get).toHaveBeenCalledWith('redis.host', 'localhost');
      expect(configService.get).toHaveBeenCalledWith('redis.port', 6379);
      expect(configService.get).toHaveBeenCalledWith('redis.stream_cache_db', 1);
    });

    it('should configure stream cache config with proper values', () => {
      const config = module.get(STREAM_CACHE_CONFIG_TOKEN);

      expect(config.hotCacheTTL).toBe(5000);
      expect(config.warmCacheTTL).toBe(300);
      expect(config.maxHotCacheSize).toBe(1000);
      expect(config.cleanupInterval).toBe(60000);
      expect(config.compressionThreshold).toBe(1024);
    });

    it('should use default values when config is not provided', async () => {
      // Create new module with empty config
      const emptyConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => defaultValue),
      };

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          StreamCacheModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(emptyConfigService)
        .overrideProvider(EventEmitter2)
        .useValue(mockEventEmitter)
        .compile();

      const config = testModule.get(STREAM_CACHE_CONFIG_TOKEN);

      // Should use default values from DEFAULT_STREAM_CACHE_CONFIG
      expect(config).toBeDefined();
      expect(typeof config.hotCacheTTL).toBe('number');
      expect(typeof config.warmCacheTTL).toBe('number');

      await testModule.close();
    });
  });

  describe('Module Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should initialize successfully with valid Redis connection', async () => {
        redisClient.ping.mockResolvedValue('PONG');

        await expect(streamCacheModule.onModuleInit()).resolves.not.toThrow();
        expect(redisClient.ping).toHaveBeenCalled();
      });

      it('should throw error when Redis connection fails', async () => {
        redisClient.ping.mockRejectedValue(new Error('Redis connection failed'));

        await expect(streamCacheModule.onModuleInit()).rejects.toThrow('Redis connection failed');
      });

      it('should log initialization messages', async () => {
        redisClient.ping.mockResolvedValue('PONG');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await streamCacheModule.onModuleInit();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('StreamCacheModule initialized'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('StreamCache config'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('StreamCache Redis connection verified'));

        consoleSpy.mockRestore();
      });
    });

    describe('onModuleDestroy', () => {
      it('should cleanup Redis connections successfully', async () => {
        redisClient.quit.mockResolvedValue('OK');

        await expect(streamCacheModule.onModuleDestroy()).resolves.not.toThrow();

        expect(redisClient.removeAllListeners).toHaveBeenCalledWith('connect');
        expect(redisClient.removeAllListeners).toHaveBeenCalledWith('error');
        expect(redisClient.removeAllListeners).toHaveBeenCalledWith('close');
        expect(redisClient.removeAllListeners).toHaveBeenCalledWith('reconnecting');
        expect(redisClient.quit).toHaveBeenCalled();
      });

      it('should force disconnect when graceful shutdown fails', async () => {
        redisClient.quit.mockRejectedValue(new Error('Quit failed'));

        await expect(streamCacheModule.onModuleDestroy()).resolves.not.toThrow();

        expect(redisClient.disconnect).toHaveBeenCalled();
      });

      it('should log cleanup messages', async () => {
        redisClient.quit.mockResolvedValue('OK');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await streamCacheModule.onModuleDestroy();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cleaning up StreamCache Redis connections'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('StreamCache Redis cleanup completed'));

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Redis Client Factory', () => {
    it('should create Redis client with correct configuration', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();

      // Verify that ConfigService was called for all Redis config parameters
      expect(configService.get).toHaveBeenCalledWith('redis.host', 'localhost');
      expect(configService.get).toHaveBeenCalledWith('redis.port', 6379);
      expect(configService.get).toHaveBeenCalledWith('redis.password');
      expect(configService.get).toHaveBeenCalledWith('redis.stream_cache_db', 1);
    });

    it('should handle Redis client event listeners', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();

      // Event listeners should be set up during factory creation
      expect(redisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should handle ConfigService errors gracefully', async () => {
      const errorConfigService = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Config error');
        }),
      };

      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({ isGlobal: true }),
            EventEmitterModule.forRoot(),
            StreamCacheModule,
          ],
        })
          .overrideProvider(ConfigService)
          .useValue(errorConfigService)
          .compile()
      ).rejects.toThrow();
    });

    it('should handle module initialization with partial config', async () => {
      const partialConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key.includes('redis.host')) return 'localhost';
          if (key.includes('redis.port')) return 6379;
          return defaultValue; // Use defaults for stream cache config
        }),
      };

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          StreamCacheModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(partialConfigService)
        .overrideProvider(EventEmitter2)
        .useValue(mockEventEmitter)
        .compile();

      expect(testModule).toBeDefined();

      const config = testModule.get(STREAM_CACHE_CONFIG_TOKEN);
      expect(config).toBeDefined();

      await testModule.close();
    });
  });

  describe('Export Configuration', () => {
    it('should export StreamCacheStandardizedService', () => {
      const service = module.get<StreamCacheStandardizedService>(StreamCacheStandardizedService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamCacheStandardizedService);
    });

    it('should export Redis client token', () => {
      const redis = module.get(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();
    });

    it('should export stream cache config token', () => {
      const config = module.get(STREAM_CACHE_CONFIG_TOKEN);
      expect(config).toBeDefined();
    });
  });

  describe('Integration with NestJS', () => {
    it('should integrate with NestJS dependency injection system', () => {
      expect(() => {
        module.get<StreamCacheStandardizedService>(StreamCacheStandardizedService);
        module.get(CACHE_REDIS_CLIENT_TOKEN);
        module.get(STREAM_CACHE_CONFIG_TOKEN);
      }).not.toThrow();
    });

    it('should handle module imports correctly', () => {
      // Module should not import ConfigModule (already provided globally)
      // Module should not import EventEmitterModule (already provided globally)
      expect(module).toBeDefined();
    });

    it('should provide all required dependencies for StreamCacheStandardizedService', () => {
      const service = module.get<StreamCacheStandardizedService>(StreamCacheStandardizedService);
      expect(service).toBeDefined();

      // Verify that all required dependencies are available
      expect(module.get(CACHE_REDIS_CLIENT_TOKEN)).toBeDefined();
      expect(module.get(STREAM_CACHE_CONFIG_TOKEN)).toBeDefined();
      expect(module.get(EventEmitter2)).toBeDefined();
      expect(module.get(ConfigService)).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    it('should configure Redis client with performance optimizations', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();

      // Redis configuration should include performance optimizations
      // These are set in the factory but we can verify the client was created
      expect(configService.get).toHaveBeenCalledWith('redis.stream_cache_db', 1);
    });

    it('should handle Redis client pooling configuration', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();

      // Verify Redis client was created with proper configuration
      expect(redis).toBeDefined();
    });
  });

  describe('Advanced Module Configuration Tests', () => {
    it('should handle Redis factory with all configuration options', async () => {
      const fullConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const fullConfig = {
            'redis.host': 'production-redis.example.com',
            'redis.port': 6380,
            'redis.password': 'secure-password',
            'redis.stream_cache_db': 3,
            'stream_cache.hot_ttl_ms': 2000,
            'stream_cache.warm_ttl_seconds': 600,
            'stream_cache.max_hot_size': 5000,
            'stream_cache.cleanup_interval_ms': 30000,
            'stream_cache.compression_threshold': 2048,
          };
          return fullConfig[key] ?? defaultValue;
        }),
      };

      const fullModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          StreamCacheModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(fullConfigService)
        .overrideProvider(EventEmitter2)
        .useValue(mockEventEmitter)
        .compile();

      const config = fullModule.get(STREAM_CACHE_CONFIG_TOKEN);
      const redis = fullModule.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);

      expect(config.hotCacheTTL).toBe(2000);
      expect(config.warmCacheTTL).toBe(600);
      expect(config.maxHotCacheSize).toBe(5000);
      expect(config.cleanupInterval).toBe(30000);
      expect(config.compressionThreshold).toBe(2048);

      expect(redis).toBeDefined();
      expect(fullConfigService.get).toHaveBeenCalledWith('redis.host', 'localhost');
      expect(fullConfigService.get).toHaveBeenCalledWith('redis.port', 6379);
      expect(fullConfigService.get).toHaveBeenCalledWith('redis.password');
      expect(fullConfigService.get).toHaveBeenCalledWith('redis.stream_cache_db', 1);

      await fullModule.close();
    });

    it('should validate configuration types and ranges', () => {
      const config = module.get(STREAM_CACHE_CONFIG_TOKEN);

      // Validate that all configuration values are positive numbers
      expect(config.hotCacheTTL).toBeGreaterThan(0);
      expect(config.warmCacheTTL).toBeGreaterThan(0);
      expect(config.maxHotCacheSize).toBeGreaterThan(0);
      expect(config.cleanupInterval).toBeGreaterThan(0);
      expect(config.compressionThreshold).toBeGreaterThan(0);

      // Validate realistic ranges
      expect(config.hotCacheTTL).toBeLessThan(3600000); // Less than 1 hour in ms
      expect(config.warmCacheTTL).toBeLessThan(86400); // Less than 1 day in seconds
      expect(config.maxHotCacheSize).toBeLessThan(1000000); // Reasonable cache size
    });

    it('should handle edge case configuration values', async () => {
      const edgeConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const edgeConfig = {
            'redis.host': '127.0.0.1',
            'redis.port': 0, // Invalid port
            'redis.password': '', // Empty password
            'redis.stream_cache_db': -1, // Invalid DB
            'stream_cache.hot_ttl_ms': 0, // Edge case TTL
            'stream_cache.warm_ttl_seconds': Number.MAX_SAFE_INTEGER, // Very large TTL
            'stream_cache.max_hot_size': 1, // Minimal cache size
            'stream_cache.cleanup_interval_ms': 1, // Very frequent cleanup
            'stream_cache.compression_threshold': Number.MAX_SAFE_INTEGER, // Never compress
          };
          return edgeConfig[key] ?? defaultValue;
        }),
      };

      const edgeModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          EventEmitterModule.forRoot(),
          StreamCacheModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue(edgeConfigService)
        .overrideProvider(EventEmitter2)
        .useValue(mockEventEmitter)
        .compile();

      const config = edgeModule.get(STREAM_CACHE_CONFIG_TOKEN);

      // Module should handle edge cases gracefully
      expect(config).toBeDefined();
      expect(typeof config.hotCacheTTL).toBe('number');
      expect(typeof config.warmCacheTTL).toBe('number');

      await edgeModule.close();
    });
  });

  describe('Module Constants Integration', () => {
    it('should use constants from STREAM_CACHE_CONFIG correctly', () => {
      const config = module.get(STREAM_CACHE_CONFIG_TOKEN);

      // Verify configuration matches expected constants structure
      expect(config).toHaveProperty('hotCacheTTL');
      expect(config).toHaveProperty('warmCacheTTL');
      expect(config).toHaveProperty('maxHotCacheSize');
      expect(config).toHaveProperty('cleanupInterval');
      expect(config).toHaveProperty('compressionThreshold');
    });

    it('should maintain consistency with DEFAULT_STREAM_CACHE_CONFIG constants', () => {
      const config = module.get(STREAM_CACHE_CONFIG_TOKEN);

      // Verify default values are applied correctly
      expect(config.hotCacheTTL).toBe(DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL);
      expect(config.warmCacheTTL).toBe(DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL);
      expect(config.maxHotCacheSize).toBe(DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize);
      expect(config.cleanupInterval).toBe(DEFAULT_STREAM_CACHE_CONFIG.cleanupInterval);
      expect(config.compressionThreshold).toBe(DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold);
    });

    it('should verify STREAM_CACHE_CONFIG structure', () => {
      // Verify that constants are properly structured
      expect(STREAM_CACHE_CONFIG).toHaveProperty('TTL');
      expect(STREAM_CACHE_CONFIG).toHaveProperty('CAPACITY');
      expect(STREAM_CACHE_CONFIG).toHaveProperty('CLEANUP');
      expect(STREAM_CACHE_CONFIG).toHaveProperty('STREAM_SPECIFIC');
      expect(STREAM_CACHE_CONFIG).toHaveProperty('KEYS');

      expect(STREAM_CACHE_CONFIG.TTL).toHaveProperty('HOT_CACHE_TTL_S');
      expect(STREAM_CACHE_CONFIG.TTL).toHaveProperty('WARM_CACHE_TTL_S');
      expect(STREAM_CACHE_CONFIG.CAPACITY).toHaveProperty('MAX_HOT_CACHE_SIZE');
    });
  });

  describe('Redis Event Handling', () => {
    it('should set up all required Redis event listeners', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);

      // Verify all event listeners are configured
      expect(redisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));

      // Should have been called exactly 4 times for the 4 events
      expect(redisClient.on).toHaveBeenCalledTimes(4);
    });

    it('should handle Redis reconnection logic', () => {
      const redis = module.get<Redis>(CACHE_REDIS_CLIENT_TOKEN);

      // Verify reconnection callback is set up
      expect(redisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup all Redis event listeners during destroy', async () => {
      redisClient.quit.mockResolvedValue('OK');

      await streamCacheModule.onModuleDestroy();

      // Verify all event types are cleaned up
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('connect');
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('error');
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('close');
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('reconnecting');

      // Should have been called exactly 4 times for the 4 event types
      expect(redisClient.removeAllListeners).toHaveBeenCalledTimes(4);
    });

    it('should handle multiple destroy calls gracefully', async () => {
      redisClient.quit.mockResolvedValue('OK');

      // First destroy
      await streamCacheModule.onModuleDestroy();

      // Reset mocks to test second call
      jest.clearAllMocks();
      redisClient.quit.mockResolvedValue('OK');

      // Second destroy should not fail
      await expect(streamCacheModule.onModuleDestroy()).resolves.not.toThrow();
    });

    it('should handle Redis quit errors with disconnect fallback', async () => {
      const quitError = new Error('Redis quit failed');
      redisClient.quit.mockRejectedValue(quitError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await streamCacheModule.onModuleDestroy();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ StreamCache Redis cleanup error:',
        'Redis quit failed'
      );
      expect(redisClient.disconnect).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Initialization Edge Cases', () => {
    it('should handle Redis ping timeout during initialization', async () => {
      const timeoutError = new Error('Redis ping timeout');
      redisClient.ping.mockRejectedValue(timeoutError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(streamCacheModule.onModuleInit()).rejects.toThrow('Redis ping timeout');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ StreamCache Redis connection failed:',
        'Redis ping timeout'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log proper configuration values during initialization', async () => {
      redisClient.ping.mockResolvedValue('PONG');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await streamCacheModule.onModuleInit();

      // Should log the actual TTL values from constants
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Hot TTL=${STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S}s`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Warm TTL=${STREAM_CACHE_CONFIG.TTL.WARM_CACHE_TTL_S}s`)
      );

      consoleSpy.mockRestore();
    });
  });
});