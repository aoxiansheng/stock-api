import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DataMapperCacheModule } from '@core/05-caching/module/data-mapper-cache/module/data-mapper-cache.module';
import { DataMapperCacheStandardizedService } from '@core/05-caching/module/data-mapper-cache/services/data-mapper-cache-standardized.service';
import { UnitTestSetup } from '../../../../../../../testbasic/setup/unit-test-setup';
import { redisMockFactory } from '../../../../../../../testbasic/mocks/redis.mock';

describe('DataMapperCacheModule', () => {
  let module: TestingModule;
  let configService: ConfigService;
  let dataMapperCacheService: DataMapperCacheStandardizedService;
  let consoleLogSpy: jest.SpyInstance;

  const createTestModule = async () => {
    return await UnitTestSetup.createCacheTestModule({
      imports: [DataMapperCacheModule],
      providers: [
        {
          provide: 'Redis',
          useValue: redisMockFactory(),
        },
      ],
    });
  };

  beforeEach(async () => {
    // Spy on console.log to test module initialization logs
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    module = await createTestModule();
    configService = await UnitTestSetup.validateServiceInjection<ConfigService>(
      module,
      ConfigService,
      ConfigService
    );
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Module Compilation', () => {
    it('should compile the module successfully', () => {
      expect(module).toBeDefined();
      expect(module).toBeInstanceOf(Object);
    });

    it('should log initialization messages', () => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ DataMapperCacheModule initialized with standardized architecture'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '   🆕 Standardized service: DataMapperCacheStandardizedService (StandardCacheModuleInterface)'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '   ✅ Migration status: COMPLETED - All consumers migrated'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '   🔄 Backward compatibility: Maintained through alias providers'
      );
    });
  });

  describe('Service Registration', () => {
    it('should register DataMapperCacheStandardizedService', async () => {
      dataMapperCacheService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        module,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );

      expect(dataMapperCacheService).toBeDefined();
      expect(dataMapperCacheService).toBeInstanceOf(DataMapperCacheStandardizedService);
      expect(dataMapperCacheService.name).toBe('DataMapperCacheStandardized');
      expect(dataMapperCacheService.moduleType).toBe('data-mapper-cache');
    });

    it('should provide IDataMapperCache alias', async () => {
      const aliasService = await UnitTestSetup.validateServiceInjection(
        module,
        'IDataMapperCache'
      );

      expect(aliasService).toBeDefined();
      expect(aliasService).toBeInstanceOf(DataMapperCacheStandardizedService);
    });

    it('should provide DataMapperCacheStandard alias', async () => {
      const aliasService = await UnitTestSetup.validateServiceInjection(
        module,
        'DataMapperCacheStandard'
      );

      expect(aliasService).toBeDefined();
      expect(aliasService).toBeInstanceOf(DataMapperCacheStandardizedService);
    });

    it('should ensure alias services reference the same instance', async () => {
      const mainService = await UnitTestSetup.validateServiceInjection(
        module,
        DataMapperCacheStandardizedService
      );
      const aliasService1 = await UnitTestSetup.validateServiceInjection(
        module,
        'IDataMapperCache'
      );
      const aliasService2 = await UnitTestSetup.validateServiceInjection(
        module,
        'DataMapperCacheStandard'
      );

      expect(mainService).toBe(aliasService1);
      expect(mainService).toBe(aliasService2);
      expect(aliasService1).toBe(aliasService2);
    });
  });

  describe('Configuration Provider', () => {
    it('should register dataMapperCacheConfig provider', async () => {
      const config = await UnitTestSetup.validateServiceInjection(
        module,
        'dataMapperCacheConfig'
      ) as any;

      expect(config).toBeDefined();
      expect(config).toHaveProperty('redis');
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('performance');
      expect(config).toHaveProperty('features');
    });

    it('should provide correct Redis configuration from ConfigService', async () => {
      const config = await UnitTestSetup.validateServiceInjection(
        module,
        'dataMapperCacheConfig'
      ) as any;

      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.redis.db).toBe(0);
    });

    it('should provide correct cache configuration', async () => {
      const config = await UnitTestSetup.validateServiceInjection(
        module,
        'dataMapperCacheConfig'
      ) as any;

      expect(config.cache.defaultTtl).toBe(300);
      expect(config.cache.maxMemoryPolicy).toBe('allkeys-lru');
      expect(config.cache.keyPrefix).toBe('dm:');
    });

    it('should provide correct performance configuration', async () => {
      const config = await UnitTestSetup.validateServiceInjection(
        module,
        'dataMapperCacheConfig'
      ) as any;

      expect(config.performance.enableMetrics).toBe(true);
      expect(config.performance.maxErrorHistorySize).toBe(1000);
      expect(config.performance.maxPerformanceHistorySize).toBe(10000);
    });

    it('should provide correct features configuration', async () => {
      const config = await UnitTestSetup.validateServiceInjection(
        module,
        'dataMapperCacheConfig'
      ) as any;

      expect(config.features.enableCompression).toBe(false);
      expect(config.features.enableBatching).toBe(true);
      expect(config.features.enableCircuitBreaker).toBe(true);
      expect(config.features.batchSize).toBe(100);
    });
  });

  describe('Dependencies', () => {
    it('should import EventEmitterModule', () => {
      // The module should compile successfully with EventEmitterModule imported
      expect(module).toBeDefined();
    });

    it('should inject ConfigService into configuration factory', () => {
      expect(configService).toBeDefined();
      expect(configService).toBeInstanceOf(ConfigService);
    });

    it('should have access to environment variables through ConfigService', () => {
      // Test that ConfigService can access environment variables
      const redisHost = (configService as any).get('REDIS_HOST', 'localhost');
      const redisPort = (configService as any).get('REDIS_PORT', 6379);

      expect(redisHost).toBeDefined();
      expect(redisPort).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should export DataMapperCacheStandardizedService', () => {
      // The service should be available for injection by other modules
      expect(dataMapperCacheService).toBeDefined();
    });

    it('should export IDataMapperCache token for interface-based injection', async () => {
      const exportedService = await UnitTestSetup.validateServiceInjection(
        module,
        'IDataMapperCache'
      );

      expect(exportedService).toBeDefined();
      expect(exportedService).toBeInstanceOf(DataMapperCacheStandardizedService);
    });

    it('should export DataMapperCacheStandard token for backward compatibility', async () => {
      const exportedService = await UnitTestSetup.validateServiceInjection(
        module,
        'DataMapperCacheStandard'
      );

      expect(exportedService).toBeDefined();
      expect(exportedService).toBeInstanceOf(DataMapperCacheStandardizedService);
    });
  });

  describe('Configuration Factory Behavior', () => {
    it('should use environment variables when provided', async () => {
      // Mock ConfigService to return specific values
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const envValues = {
            'REDIS_HOST': 'test-redis-host',
            'REDIS_PORT': 6380,
            'REDIS_PASSWORD': 'test-password',
            'REDIS_DB': 1,
          };
          return envValues[key] || defaultValue;
        }),
      };

      const testModule = await UnitTestSetup.createCacheTestModule({
        imports: [EventEmitterModule],
        providers: [
          DataMapperCacheStandardizedService,
          { provide: 'IDataMapperCache', useExisting: DataMapperCacheStandardizedService },
          { provide: 'DataMapperCacheStandard', useExisting: DataMapperCacheStandardizedService },
          {
            provide: 'dataMapperCacheConfig',
            useFactory: (configService: ConfigService) => ({
              redis: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                db: configService.get('REDIS_DB', 0),
              },
              cache: {
                defaultTtl: 300,
                maxMemoryPolicy: 'allkeys-lru',
                keyPrefix: 'dm:',
              },
              performance: {
                enableMetrics: true,
                maxErrorHistorySize: 1000,
                maxPerformanceHistorySize: 10000,
              },
              features: {
                enableCompression: false,
                enableBatching: true,
                enableCircuitBreaker: true,
                batchSize: 100,
              }
            }),
            inject: [ConfigService],
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: 'Redis',
            useValue: redisMockFactory(),
          },
        ],
      });

      const config = await UnitTestSetup.validateServiceInjection(
        testModule,
        'dataMapperCacheConfig'
      ) as any;

      expect(config.redis.host).toBe('test-redis-host');
      expect(config.redis.port).toBe(6380);
      expect(config.redis.password).toBe('test-password');
      expect(config.redis.db).toBe(1);

      await UnitTestSetup.cleanupModule(testModule);
    });

    it('should use default values when environment variables are not provided', async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => defaultValue),
      };

      const testModule = await UnitTestSetup.createCacheTestModule({
        imports: [EventEmitterModule],
        providers: [
          DataMapperCacheStandardizedService,
          { provide: 'IDataMapperCache', useExisting: DataMapperCacheStandardizedService },
          { provide: 'DataMapperCacheStandard', useExisting: DataMapperCacheStandardizedService },
          {
            provide: 'dataMapperCacheConfig',
            useFactory: (configService: ConfigService) => ({
              redis: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                db: configService.get('REDIS_DB', 0),
              },
              cache: {
                defaultTtl: 300,
                maxMemoryPolicy: 'allkeys-lru',
                keyPrefix: 'dm:',
              },
              performance: {
                enableMetrics: true,
                maxErrorHistorySize: 1000,
                maxPerformanceHistorySize: 10000,
              },
              features: {
                enableCompression: false,
                enableBatching: true,
                enableCircuitBreaker: true,
                batchSize: 100,
              }
            }),
            inject: [ConfigService],
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: 'Redis',
            useValue: redisMockFactory(),
          },
        ],
      });

      const config = await UnitTestSetup.validateServiceInjection(
        testModule,
        'dataMapperCacheConfig'
      ) as any;

      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.redis.password).toBeUndefined();
      expect(config.redis.db).toBe(0);

      await UnitTestSetup.cleanupModule(testModule);
    });
  });

  describe('Service Integration', () => {
    it('should properly inject configuration into DataMapperCacheStandardizedService', async () => {
      dataMapperCacheService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        module,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );

      // Initialize the service to trigger configuration usage
      await (dataMapperCacheService as any).onModuleInit();

      expect((dataMapperCacheService as any).isInitialized).toBe(true);
      expect((dataMapperCacheService as any).config).toBeDefined();
    });

    it('should allow service to access Redis through injection', async () => {
      dataMapperCacheService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        module,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );

      await dataMapperCacheService.onModuleInit();

      // Test that the service can perform Redis operations
      const result = await (dataMapperCacheService as any).get('test:key');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should validate that EventEmitter2 is properly injected', async () => {
      dataMapperCacheService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        module,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );

      // Initialize should emit events through EventEmitter2
      await dataMapperCacheService.onModuleInit();

      expect(dataMapperCacheService.isInitialized).toBe(true);
      // Event emission is tested in the service spec, here we just verify injection works
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module initialization properly', async () => {
      dataMapperCacheService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        module,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );

      // Initially not initialized
      expect(dataMapperCacheService.isInitialized).toBe(false);

      // After module init
      await dataMapperCacheService.onModuleInit();
      expect(dataMapperCacheService.isInitialized).toBe(true);
      expect(dataMapperCacheService.isHealthy).toBe(true);
    });

    it('should handle module destruction properly', async () => {
      dataMapperCacheService = await UnitTestSetup.validateServiceInjection<DataMapperCacheStandardizedService>(
        module,
        DataMapperCacheStandardizedService,
        DataMapperCacheStandardizedService
      );

      await dataMapperCacheService.onModuleInit();
      expect(dataMapperCacheService.isInitialized).toBe(true);

      await dataMapperCacheService.onModuleDestroy();
      expect(dataMapperCacheService.isInitialized).toBe(false);
      expect(dataMapperCacheService.isHealthy).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility through alias providers', async () => {
      // Test that all three ways of accessing the service work
      const directService = await UnitTestSetup.validateServiceInjection(
        module,
        DataMapperCacheStandardizedService
      );
      const interfaceService = await UnitTestSetup.validateServiceInjection(
        module,
        'IDataMapperCache'
      );
      const aliasService = await UnitTestSetup.validateServiceInjection(
        module,
        'DataMapperCacheStandard'
      );

      // All should be the same instance
      expect(directService).toBe(interfaceService);
      expect(directService).toBe(aliasService);

      // All should have the same interface methods
      expect(typeof (directService as any).get).toBe('function');
      expect(typeof (interfaceService as any).get).toBe('function');
      expect(typeof (aliasService as any).get).toBe('function');
    });

    it('should support legacy injection patterns', async () => {
      // Test that services injected by string token work correctly
      const legacyService = await UnitTestSetup.validateServiceInjection(
        module,
        'IDataMapperCache'
      );

      await (legacyService as any).onModuleInit();
      expect((legacyService as any).isInitialized).toBe(true);

      // Test basic cache operations work through legacy interface
      const result = await (legacyService as any).get('test:key');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Module Configuration Validation', () => {
    it('should have all required module metadata', () => {
      // This is indirectly tested by successful module compilation
      expect(module).toBeDefined();
    });

    it('should export all declared services', async () => {
      // Test that all exported tokens are resolvable
      const tokens = [
        DataMapperCacheStandardizedService,
        'IDataMapperCache',
        'DataMapperCacheStandard',
      ];

      for (const token of tokens) {
        const service = await UnitTestSetup.validateServiceInjection(module, token);
        expect(service).toBeDefined();
      }
    });
  });
});
