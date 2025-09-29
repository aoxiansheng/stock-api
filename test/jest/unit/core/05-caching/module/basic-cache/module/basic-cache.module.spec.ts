import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BasicCacheModule } from '@core/05-caching/module/basic-cache/module/basic-cache.module';
import { StandardizedCacheService } from '@core/05-caching/module/basic-cache/services/standardized-cache.service';
import { CacheCompressionService } from '@core/05-caching/module/basic-cache/services/cache-compression.service';
import { CacheConfigValidator } from '@core/05-caching/module/basic-cache/validators/cache-config.validator';
import { CACHE_REDIS_CLIENT_TOKEN } from '@monitoring/contracts';
import { TestInfrastructureModule } from '@test/testbasic/modules/test-infrastructure.module';
import { redisMockFactory } from '@test/testbasic/mocks';
import { MonitoringModule } from '@monitoring/monitoring.module';

describe('BasicCacheModule', () => {
  let module: TestingModule;
  let redisClient: jest.Mocked<Redis>;
  let standardizedCacheService: StandardizedCacheService;
  let configValidator: CacheConfigValidator;

  beforeEach(async () => {
    // 创建Redis Mock
    const redisMock = redisMockFactory();

    module = await Test.createTestingModule({
      imports: [
        TestInfrastructureModule,
        {
          module: MonitoringModule,
          providers: [
            {
              provide: 'CollectorService',
              useValue: {
                collect: jest.fn(),
                getMetrics: jest.fn(),
              },
            },
          ],
          exports: ['CollectorService'],
        },
      ],
      providers: [
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: redisMock,
        },
        {
          provide: StandardizedCacheService,
          useValue: {
            initialize: jest.fn().mockResolvedValue(undefined),
            cleanup: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            exists: jest.fn(),
            ttl: jest.fn(),
            expire: jest.fn(),
            ping: jest.fn().mockResolvedValue('PONG'),
            getStats: jest.fn().mockReturnValue({
              hits: 0,
              misses: 0,
              sets: 0,
              deletes: 0,
              errors: 0,
            }),
          },
        },
        {
          provide: CacheCompressionService,
          useValue: {
            compress: jest.fn(),
            decompress: jest.fn(),
            shouldCompress: jest.fn(),
            getCompressionStats: jest.fn(),
          },
        },
        {
          provide: CacheConfigValidator,
          useValue: {
            validateConfig: jest.fn().mockReturnValue({
              valid: true,
              errors: [],
              warnings: [],
              recommendations: [],
              config: {
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
                },
                batch: {
                  maxBatchSize: 100,
                  timeoutMs: 5000,
                },
                decompression: {
                  maxConcurrent: 10,
                  timeoutMs: 5000,
                },
              },
            }),
            getConfigSummary: jest.fn().mockReturnValue('Config validation summary'),
            isProductionReady: jest.fn().mockReturnValue({
              ready: true,
              issues: [],
            }),
          },
        },
      ],
    }).compile();

    redisClient = module.get(CACHE_REDIS_CLIENT_TOKEN);
    standardizedCacheService = module.get(StandardizedCacheService);
    configValidator = module.get(CacheConfigValidator);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Module Initialization', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide CACHE_REDIS_CLIENT_TOKEN', () => {
      const redis = module.get(CACHE_REDIS_CLIENT_TOKEN);
      expect(redis).toBeDefined();
      expect(redis.ping).toBeDefined();
    });

    it('should provide StandardizedCacheService', () => {
      const service = module.get(StandardizedCacheService);
      expect(service).toBeDefined();
      expect(service.initialize).toBeDefined();
    });

    it('should provide CacheCompressionService', () => {
      const service = module.get(CacheCompressionService);
      expect(service).toBeDefined();
      expect(service.compress).toBeDefined();
    });

    it('should provide CacheConfigValidator', () => {
      const validator = module.get(CacheConfigValidator);
      expect(validator).toBeDefined();
      expect(validator.validateConfig).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    let basicCacheModule: BasicCacheModule;

    beforeEach(() => {
      const configService = module.get(ConfigService);
      basicCacheModule = new BasicCacheModule(
        configService,
        redisClient as any,
        configValidator,
        standardizedCacheService,
      );
    });

    it('should validate configuration on init', async () => {
      await basicCacheModule.onModuleInit();

      expect(configValidator.validateConfig).toHaveBeenCalled();
      expect(configValidator.isProductionReady).toHaveBeenCalled();
    });

    it('should throw error if configuration is invalid', async () => {
      (configValidator.validateConfig as jest.Mock).mockReturnValueOnce({
        valid: false,
        errors: ['Invalid configuration'],
        warnings: [],
        recommendations: [],
      });

      await expect(basicCacheModule.onModuleInit()).rejects.toThrow();
    });

    it('should verify Redis connection', async () => {
      await basicCacheModule.onModuleInit();

      expect(redisClient.ping).toHaveBeenCalled();
    });

    it('should initialize StandardizedCacheService', async () => {
      await basicCacheModule.onModuleInit();

      expect(standardizedCacheService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          redis: expect.any(Object),
          ttl: expect.any(Object),
          compression: expect.any(Object),
        }),
      );
    });

    it('should handle Redis connection failure', async () => {
      (redisClient.ping as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      await expect(basicCacheModule.onModuleInit()).rejects.toThrow(
        'Connection failed',
      );
    });

    it('should log production readiness warnings', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (configValidator.isProductionReady as jest.Mock).mockReturnValueOnce({
        ready: false,
        issues: ['Issue 1', 'Issue 2'],
      });

      await basicCacheModule.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Production readiness issues'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    let basicCacheModule: BasicCacheModule;

    beforeEach(() => {
      const configService = module.get(ConfigService);
      basicCacheModule = new BasicCacheModule(
        configService,
        redisClient as any,
        configValidator,
        standardizedCacheService,
      );
    });

    it('should cleanup StandardizedCacheService', async () => {
      await basicCacheModule.onModuleDestroy();

      expect(standardizedCacheService.cleanup).toHaveBeenCalled();
    });

    it('should remove Redis event listeners', async () => {
      await basicCacheModule.onModuleDestroy();

      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('connect');
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('error');
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('close');
      expect(redisClient.removeAllListeners).toHaveBeenCalledWith('reconnecting');
    });

    it('should quit Redis connection gracefully', async () => {
      await basicCacheModule.onModuleDestroy();

      expect(redisClient.quit).toHaveBeenCalled();
    });

    it('should force disconnect on cleanup error', async () => {
      (redisClient.quit as jest.Mock).mockRejectedValueOnce(
        new Error('Quit failed'),
      );

      await basicCacheModule.onModuleDestroy();

      expect(redisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle service cleanup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (standardizedCacheService.cleanup as jest.Mock).mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      await basicCacheModule.onModuleDestroy();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('StandardizedCacheService cleanup error'),
        'Cleanup failed',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Module Exports', () => {
    it('should export StandardizedCacheService', () => {
      const exportedService = module.get(StandardizedCacheService);
      expect(exportedService).toBeDefined();
    });

    it('should export CacheCompressionService', () => {
      const exportedService = module.get(CacheCompressionService);
      expect(exportedService).toBeDefined();
    });

    it('should export CacheConfigValidator', () => {
      const exportedValidator = module.get(CacheConfigValidator);
      expect(exportedValidator).toBeDefined();
    });

    it('should export CACHE_REDIS_CLIENT_TOKEN', () => {
      const exportedRedis = module.get(CACHE_REDIS_CLIENT_TOKEN);
      expect(exportedRedis).toBeDefined();
    });
  });

  describe('Redis Connection Events', () => {
    it('should handle Redis connect event', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const configService = module.get(ConfigService);

      // 模拟Redis工厂创建过程
      const redisConfig = {
        host: 'localhost',
        port: 6379,
      };

      const redis = new Redis(redisConfig);
      redis.emit('connect');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis connected'),
      );

      consoleSpy.mockRestore();
      redis.disconnect();
    });

    it('should handle Redis error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const redis = new Redis({ host: 'localhost' });
      redis.emit('error', new Error('Connection error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error'),
        'Connection error',
      );

      consoleSpy.mockRestore();
      redis.disconnect();
    });
  });
});
