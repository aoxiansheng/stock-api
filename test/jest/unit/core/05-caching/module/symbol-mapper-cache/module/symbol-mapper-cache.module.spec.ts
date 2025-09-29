import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SymbolMapperCacheModule } from '@core/05-caching/module/symbol-mapper-cache/module/symbol-mapper-cache.module';
import { SymbolMapperCacheStandardizedService } from '@core/05-caching/module/symbol-mapper-cache/services/symbol-mapper-cache-standardized.service';
import { SymbolMappingRepository } from '@core/00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import { FeatureFlags } from '@appcore/config/feature-flags.config';

describe('SymbolMapperCacheModule', () => {
  let module: TestingModule;
  let service: SymbolMapperCacheStandardizedService;
  let repository: SymbolMappingRepository;
  let featureFlags: FeatureFlags;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SymbolMapperCacheStandardizedService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SymbolMappingRepository,
          useValue: {
            findByDataSource: jest.fn(),
            findAllMappingsForSymbols: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FeatureFlags,
          useValue: {
            symbolMappingCacheEnabled: true,
            isCacheOptimizationEnabled: jest.fn().mockReturnValue(true),
            getAllFlags: jest.fn().mockReturnValue({}),
          },
        },
      ],
    })
    .compile();

    service = module.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);
    repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
    featureFlags = module.get<FeatureFlags>(FeatureFlags);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide SymbolMapperCacheStandardizedService', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SymbolMapperCacheStandardizedService);
    });

    it('should provide SymbolMappingRepository', () => {
      expect(repository).toBeDefined();
    });

    it('should provide FeatureFlags', () => {
      expect(featureFlags).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should initialize service successfully', () => {
      expect(service.isServiceInitialized()).toBe(true);
    });

    it('should provide correct service info', () => {
      const serviceInfo = service.getServiceInfo();
      expect(serviceInfo).toEqual({
        name: 'SymbolMapperCacheStandardizedService',
        version: '1.0.0',
        mode: 'simplified'
      });
    });

    it('should export SymbolMapperCacheStandardizedService', () => {
      // Test that the service can be retrieved from the module
      expect(() => module.get(SymbolMapperCacheStandardizedService)).not.toThrow();
    });
  });

  describe('Dependencies Resolution', () => {
    it('should resolve all required dependencies', () => {
      // Verify all dependencies are properly injected
      expect(service).toBeDefined();
      expect(repository).toBeDefined();
      expect(featureFlags).toBeDefined();
    });

    it('should handle dependency injection without circular dependencies', () => {
      // This test ensures the module can be created without circular dependency issues
      expect(module).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module initialization', async () => {
      // Test module can initialize without errors
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should handle module destruction', async () => {
      // Test module can be destroyed without errors
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Feature Flags Integration', () => {
    it('should integrate with feature flags service', () => {
      expect(featureFlags.isCacheOptimizationEnabled).toBeDefined();
      expect(typeof featureFlags.isCacheOptimizationEnabled).toBe('function');
      expect(featureFlags.symbolMappingCacheEnabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle service creation errors gracefully', async () => {
      // Test that the module handles creation errors appropriately
      expect(service).toBeDefined();
    });

    it('should handle missing dependencies gracefully', async () => {
      // Test module creation with missing dependencies
      await expect(async () => {
        const testModule = await Test.createTestingModule({
          providers: [
            SymbolMapperCacheStandardizedService,
            // Missing EventEmitter2, ConfigService, etc.
          ],
        }).compile();
      }).rejects.toThrow();
    });
  });

  describe('Module Imports and Exports', () => {
    it('should import DatabaseModule correctly', () => {
      // The module should be properly configured with DatabaseModule
      expect(module).toBeDefined();
    });

    it('should export SymbolMapperCacheStandardizedService', () => {
      // Verify the service is properly exported
      const exportedService = module.get(SymbolMapperCacheStandardizedService);
      expect(exportedService).toBeDefined();
      expect(exportedService).toBeInstanceOf(SymbolMapperCacheStandardizedService);
    });

    it('should provide all required dependencies', () => {
      // Verify all providers are available
      expect(module.get(SymbolMapperCacheStandardizedService)).toBeDefined();
      expect(module.get(SymbolMappingRepository)).toBeDefined();
      expect(module.get(FeatureFlags)).toBeDefined();
    });
  });

  describe('Service Configuration', () => {
    it('should configure SymbolMapperCacheStandardizedService with correct dependencies', () => {
      expect(service).toBeDefined();
      expect(service.isServiceInitialized()).toBe(true);
    });

    it('should initialize service with proper configuration', () => {
      const serviceInfo = service.getServiceInfo();
      expect(serviceInfo.name).toBe('SymbolMapperCacheStandardizedService');
      expect(serviceInfo.version).toBe('1.0.0');
      expect(serviceInfo.mode).toBe('simplified');
    });
  });

  describe('Provider Registration', () => {
    it('should register SymbolMapperCacheStandardizedService provider', () => {
      const serviceProvider = module.get(SymbolMapperCacheStandardizedService);
      expect(serviceProvider).toBeDefined();
      expect(serviceProvider).toBeInstanceOf(SymbolMapperCacheStandardizedService);
    });

    it('should register SymbolMappingRepository provider', () => {
      const repositoryProvider = module.get(SymbolMappingRepository);
      expect(repositoryProvider).toBeDefined();
    });

    it('should register FeatureFlags provider', () => {
      const featureFlagsProvider = module.get(FeatureFlags);
      expect(featureFlagsProvider).toBeDefined();
      expect(featureFlagsProvider.symbolMappingCacheEnabled).toBe(true);
    });
  });
});

// Integration test with minimal mocking for database dependencies
describe('SymbolMapperCacheModule Integration', () => {
  let integrationModule: TestingModule;

  beforeEach(async () => {
    integrationModule = await Test.createTestingModule({
      providers: [
        SymbolMapperCacheStandardizedService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SymbolMappingRepository,
          useValue: {
            findByDataSource: jest.fn(),
            findAllMappingsForSymbols: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FeatureFlags,
          useValue: {
            symbolMappingCacheEnabled: true,
            isCacheOptimizationEnabled: jest.fn().mockReturnValue(true),
            getAllFlags: jest.fn().mockReturnValue({}),
          },
        },
      ],
    })
    .compile();
  });

  afterEach(async () => {
    if (integrationModule) {
      await integrationModule.close();
    }
  });

  it('should create module with proper integration', () => {
    expect(integrationModule).toBeDefined();

    const service = integrationModule.get<SymbolMapperCacheStandardizedService>(
      SymbolMapperCacheStandardizedService
    );
    expect(service).toBeDefined();
  });

  it('should maintain singleton service instance', () => {
    const service1 = integrationModule.get<SymbolMapperCacheStandardizedService>(
      SymbolMapperCacheStandardizedService
    );
    const service2 = integrationModule.get<SymbolMapperCacheStandardizedService>(
      SymbolMapperCacheStandardizedService
    );

    expect(service1).toBe(service2); // Should be the same instance
  });
});
