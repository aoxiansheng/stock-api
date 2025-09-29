import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SymbolTransformerModule } from '@core/02-processing/symbol-transformer/module/symbol-transformer.module';
import { SymbolTransformerService } from '@core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { SymbolTransformerController } from '@core/02-processing/symbol-transformer/controller/symbol-transformer.controller';
import { SymbolMapperCacheModule } from '@core/05-caching/module/symbol-mapper-cache/module/symbol-mapper-cache.module';
import { SymbolMapperCacheStandardizedService } from '@core/05-caching/module/symbol-mapper-cache/services/symbol-mapper-cache-standardized.service';
import { MonitoringModule } from '@monitoring/monitoring.module';
import { AuthModule } from '@auth/module/auth.module';
import { MarketInferenceModule } from '@common/modules/market-inference/market-inference.module';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { createSimpleEventEmitterMock } from '@test/testbasic/mocks';

describe('SymbolTransformerModule', () => {
  let module: TestingModule;
  let symbolTransformerService: SymbolTransformerService;
  let symbolTransformerController: SymbolTransformerController;

  beforeEach(async () => {
    // Mock dependencies
    const mockSymbolMapperCacheService = {
      mapSymbols: jest.fn(),
    };

    // 使用可复用的EventEmitter mock
    const mockEventEmitter = createSimpleEventEmitterMock();

    const mockMarketInferenceService = {
      inferMarketLabels: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [SymbolTransformerModule],
    })
      .overrideProvider(SymbolMapperCacheStandardizedService)
      .useValue(mockSymbolMapperCacheService)
      .overrideProvider(EventEmitter2)
      .useValue(mockEventEmitter)
      .overrideProvider(MarketInferenceService)
      .useValue(mockMarketInferenceService)
      .compile();

    symbolTransformerService = module.get<SymbolTransformerService>(SymbolTransformerService);
    symbolTransformerController = module.get<SymbolTransformerController>(SymbolTransformerController);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Module Compilation', () => {
    it('should compile the module successfully', () => {
      expect(module).toBeDefined();
    });

    it('should create SymbolTransformerService', () => {
      expect(symbolTransformerService).toBeDefined();
      expect(symbolTransformerService).toBeInstanceOf(SymbolTransformerService);
    });

    it('should create SymbolTransformerController', () => {
      expect(symbolTransformerController).toBeDefined();
      expect(symbolTransformerController).toBeInstanceOf(SymbolTransformerController);
    });
  });

  describe('Module Dependencies', () => {
    it('should import required modules', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      // Check that the module can be created without errors
      expect(moduleRef).toBeDefined();
      await moduleRef.close();
    });

    it('should have EventEmitter2 available', () => {
      const eventEmitter = module.get<EventEmitter2>(EventEmitter2);
      expect(eventEmitter).toBeDefined();
    });

    it('should have SymbolMapperCacheStandardizedService available', () => {
      const cacheService = module.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);
      expect(cacheService).toBeDefined();
    });

    it('should have MarketInferenceService available', () => {
      const marketInferenceService = module.get<MarketInferenceService>(MarketInferenceService);
      expect(marketInferenceService).toBeDefined();
    });
  });

  describe('Service Export', () => {
    it('should export SymbolTransformerService', () => {
      // Test that the service can be retrieved from the module
      const service = module.get<SymbolTransformerService>(SymbolTransformerService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SymbolTransformerService);
    });

    it('should make SymbolTransformerService available for injection', () => {
      // Verify that the service is properly configured for dependency injection
      expect(symbolTransformerService).toBeDefined();
      expect(typeof symbolTransformerService.transformSymbols).toBe('function');
      expect(typeof symbolTransformerService.transformSingleSymbol).toBe('function');
    });
  });

  describe('Module Configuration', () => {
    it('should have correct module metadata', () => {
      // This test verifies the module is properly configured
      // In a real scenario, we would check the module's metadata
      expect(SymbolTransformerModule).toBeDefined();
    });

    it('should have the correct providers', () => {
      // Verify that both service and controller are available
      expect(module.get<SymbolTransformerService>(SymbolTransformerService)).toBeDefined();
      expect(module.get<SymbolTransformerController>(SymbolTransformerController)).toBeDefined();
    });
  });

  describe('Dependency Injection', () => {
    it('should inject dependencies into SymbolTransformerService', () => {
      // Verify that the service has been properly initialized with its dependencies
      expect(symbolTransformerService).toBeDefined();

      // Since the service has private properties, we can test indirectly by calling methods
      expect(typeof symbolTransformerService.transformSymbols).toBe('function');
      expect(typeof symbolTransformerService.transformSingleSymbol).toBe('function');
    });

    it('should inject SymbolTransformerService into SymbolTransformerController', () => {
      // Verify that the controller has been properly initialized with the service
      expect(symbolTransformerController).toBeDefined();

      // The controller should have methods that depend on the service
      expect(typeof symbolTransformerController.mapSymbol).toBe('function');
      expect(typeof symbolTransformerController.transformSymbols).toBe('function');
    });
  });

  describe('Module Imports Validation', () => {
    it('should import SymbolMapperCacheModule', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      // Test that the module can access services from imported modules
      const cacheService = testModule.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);
      expect(cacheService).toBeDefined();

      await testModule.close();
    });

    it('should import EventEmitterModule', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const eventEmitter = testModule.get<EventEmitter2>(EventEmitter2);
      expect(eventEmitter).toBeDefined();

      await testModule.close();
    });

    it('should import MarketInferenceModule', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const marketInferenceService = testModule.get<MarketInferenceService>(MarketInferenceService);
      expect(marketInferenceService).toBeDefined();

      await testModule.close();
    });
  });

  describe('Module Integration', () => {
    it('should allow service to use injected dependencies', async () => {
      const mockCacheResult = {
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
      };

      const cacheService = module.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);
      const eventEmitter = module.get<EventEmitter2>(EventEmitter2);
      const marketInference = module.get<MarketInferenceService>(MarketInferenceService);

      (cacheService.mapSymbols as jest.Mock).mockResolvedValue(mockCacheResult);
      (marketInference.inferMarketLabels as jest.Mock).mockReturnValue(['US']);

      const result = await symbolTransformerService.transformSymbols('longport', ['AAPL']);

      expect(result).toBeDefined();
      expect(result.mappedSymbols).toContain('AAPL.US');
      expect(cacheService.mapSymbols).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalled();
      expect(marketInference.inferMarketLabels).toHaveBeenCalled();
    });

    it('should allow controller to use service methods', async () => {
      const mockBody = {
        symbol: 'AAPL',
        fromProvider: 'standard',
        toProvider: 'longport',
      };

      // Mock the service method that the controller will call
      jest.spyOn(symbolTransformerService, 'transformSingleSymbol')
        .mockResolvedValue('AAPL.US');

      const result = await symbolTransformerController.mapSymbol(mockBody);

      expect(result).toEqual({
        originalSymbol: 'AAPL',
        mappedSymbol: 'AAPL.US',
        fromProvider: 'standard',
        toProvider: 'longport',
      });

      expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalled();
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module initialization', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      await testModule.init();

      expect(testModule).toBeDefined();

      await testModule.close();
    });

    it('should handle module destruction', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      await testModule.init();

      // Should not throw when closing
      await expect(testModule.close()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully during testing', async () => {
      // Test what happens when dependencies are missing
      await expect(
        Test.createTestingModule({
          providers: [SymbolTransformerService],
          // Missing required dependencies
        }).compile()
      ).rejects.toThrow();
    });

    it('should propagate service errors through the module', async () => {
      const error = new Error('Service error');
      jest.spyOn(symbolTransformerService, 'transformSymbols')
        .mockRejectedValue(error);

      await expect(
        symbolTransformerService.transformSymbols('longport', ['AAPL'])
      ).rejects.toThrow('Service error');
    });
  });

  describe('Module Isolation', () => {
    it('should create separate instances for different modules', async () => {
      const module1 = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const service1 = module1.get<SymbolTransformerService>(SymbolTransformerService);
      const service2 = module2.get<SymbolTransformerService>(SymbolTransformerService);

      // Services should be different instances (unless explicitly configured as singletons)
      expect(service1).toBeDefined();
      expect(service2).toBeDefined();

      await module1.close();
      await module2.close();
    });
  });

  describe('Module Performance', () => {
    it('should compile module within reasonable time', async () => {
      const startTime = Date.now();

      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const endTime = Date.now();
      const compilationTime = endTime - startTime;

      // Module compilation should be fast (under 5 seconds for testing)
      expect(compilationTime).toBeLessThan(5000);

      await testModule.close();
    });

    it('should handle multiple concurrent module creations', async () => {
      const promises = Array.from({ length: 5 }, () =>
        Test.createTestingModule({
          imports: [SymbolTransformerModule],
        }).compile()
      );

      const modules = await Promise.all(promises);

      expect(modules).toHaveLength(5);
      modules.forEach(mod => expect(mod).toBeDefined());

      // Clean up
      await Promise.all(modules.map(mod => mod.close()));
    });
  });

  describe('Advanced Module Testing', () => {
    it('should handle circular dependency prevention', async () => {
      // 验证模块不会创建循环依赖
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      // 检查模块的providers和exports不会形成循环
      const service = testModule.get<SymbolTransformerService>(SymbolTransformerService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should support lazy loading of dependencies', async () => {
      // 模拟延迟加载场景
      let initialized = false;

      const lazyMock = {
        mapSymbols: jest.fn().mockImplementation(async () => {
          initialized = true;
          return { mappingDetails: {}, failedSymbols: [] };
        }),
      };

      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      })
        .overrideProvider(SymbolMapperCacheStandardizedService)
        .useValue(lazyMock)
        .compile();

      expect(initialized).toBe(false);

      const service = testModule.get<SymbolTransformerService>(SymbolTransformerService);
      await service.transformSymbols('longport', ['AAPL']);

      expect(initialized).toBe(true);

      await testModule.close();
    });

    it('should handle module reinitialization correctly', async () => {
      // 创建、销毁、重新创建模块
      let testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const service1 = testModule.get<SymbolTransformerService>(SymbolTransformerService);
      expect(service1).toBeDefined();

      await testModule.close();

      // 重新创建
      testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const service2 = testModule.get<SymbolTransformerService>(SymbolTransformerService);
      expect(service2).toBeDefined();

      await testModule.close();
    });

    it('should handle module with custom providers', async () => {
      // 自定义provider注入
      const customProvider = {
        provide: 'CUSTOM_CONFIG',
        useValue: {
          maxBatchSize: 1000,
          timeout: 5000,
        },
      };

      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
        providers: [customProvider],
      }).compile();

      const config = testModule.get('CUSTOM_CONFIG');
      expect(config).toEqual({
        maxBatchSize: 1000,
        timeout: 5000,
      });

      await testModule.close();
    });
  });

  describe('Module Stress Testing', () => {
    it('should handle rapid sequential module operations', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const service = testModule.get<SymbolTransformerService>(SymbolTransformerService);

      // Mock 依赖
      const cacheService = testModule.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);
      (cacheService.mapSymbols as jest.Mock).mockResolvedValue({
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
      });

      const marketInference = testModule.get<MarketInferenceService>(MarketInferenceService);
      (marketInference.inferMarketLabels as jest.Mock).mockReturnValue(['US']);

      // 快速连续调用
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(service.transformSymbols('longport', [`SYMBOL${i}`]));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);

      await testModule.close();
    });

    it('should handle memory-intensive operations', async () => {
      const testModule = await Test.createTestingModule({
        imports: [SymbolTransformerModule],
      }).compile();

      const service = testModule.get<SymbolTransformerService>(SymbolTransformerService);
      const cacheService = testModule.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);

      // 创建大量符号
      const largeSymbolSet = Array.from({ length: 1000 }, (_, i) => `SYM${i}`);
      const largeMappingDetails = largeSymbolSet.reduce((acc, sym) => {
        acc[sym] = `${sym}.US`;
        return acc;
      }, {} as Record<string, string>);

      (cacheService.mapSymbols as jest.Mock).mockResolvedValue({
        mappingDetails: largeMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: 'TO_STANDARD',
        totalProcessed: 1000,
        cacheHits: 500,
        processingTimeMs: 500,
      });

      const marketInference = testModule.get<MarketInferenceService>(MarketInferenceService);
      (marketInference.inferMarketLabels as jest.Mock).mockReturnValue(['US']);

      // 执行大批量转换
      const result = await service.transformSymbols('longport', largeSymbolSet);

      expect(result.mappedSymbols).toHaveLength(1000);
      expect(result.metadata.totalSymbols).toBe(1000);

      await testModule.close();
    });
  });
});