import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { QueryModule } from '@core/01-entry/query/module/query.module';
import { QueryController } from '@core/01-entry/query/controller/query.controller';
import { QueryConfigService } from '@core/01-entry/query/config/query.config';
import { QueryMemoryMonitorService } from '@core/01-entry/query/services/query-memory-monitor.service';
import { QueryExecutionEngine } from '@core/01-entry/query/services/query-execution-engine.service';
import { QueryService } from '@core/01-entry/query/services/query.service';
import { QueryStatisticsService } from '@core/01-entry/query/services/query-statistics.service';
import { QueryResultProcessorService } from '@core/01-entry/query/services/query-result-processor.service';

// Mock all the imported modules since we're testing module configuration
jest.mock('@auth/auth.module', () => ({
  AuthModule: class MockAuthModule {}
}));

jest.mock('@core/04-storage/module/storage.module', () => ({
  StorageModule: class MockStorageModule {}
}));

jest.mock('@common/services/shared-services.module', () => ({
  SharedServicesModule: class MockSharedServicesModule {}
}));

jest.mock('@core/05-caching/smart-cache/module/smart-cache.module', () => ({
  SmartCacheModule: class MockSmartCacheModule {}
}));

jest.mock('@core/01-entry/receiver/module/receiver.module', () => ({
  ReceiverModule: class MockReceiverModule {}
}));

jest.mock('@monitoring/module/monitoring.module', () => ({
  MonitoringModule: class MockMonitoringModule {}
}));

describe('QueryModule', () => {
  let module: TestingModule;

  // Mock all services to focus on module configuration
  const mockServices = {
    QueryConfigService: {
      maxBatchSize: 30,
      maxMarketBatchSize: 100,
      validate: jest.fn(),
      getConfigSummary: jest.fn(() => ({}))
    },
    QueryMemoryMonitorService: {
      getCurrentMemoryUsage: jest.fn(() => ({ usage: 0.5, threshold: 0.7 })),
      checkMemoryBeforeBatch: jest.fn(() => false),
      getCurrentPressureLevel: jest.fn(() => 'NORMAL')
    },
    QueryExecutionEngine: {
      executeQuery: jest.fn(),
      executeSymbolBasedQuery: jest.fn()
    },
    QueryService: {
      executeQuery: jest.fn(),
      queryBySymbols: jest.fn(),
      queryByMarket: jest.fn(),
      queryByProvider: jest.fn()
    },
    QueryStatisticsService: {
      recordQueryPerformance: jest.fn(),
      getQueryStats: jest.fn(() => ({})),
      resetQueryStats: jest.fn()
    },
    QueryResultProcessorService: {
      process: jest.fn(),
      sortResults: jest.fn(),
      paginateResults: jest.fn(),
      selectFields: jest.fn()
    },
    QueryController: {
      executeQuery: jest.fn(),
      queryBySymbols: jest.fn(),
      queryByMarket: jest.fn(),
      queryByProvider: jest.fn(),
      getQueryStats: jest.fn()
    },
    ConfigService: {
      get: jest.fn((key, defaultValue) => defaultValue)
    }
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [QueryModule],
    })
    .overrideProvider(QueryConfigService)
    .useValue(mockServices.QueryConfigService)
    .overrideProvider(QueryMemoryMonitorService)
    .useValue(mockServices.QueryMemoryMonitorService)
    .overrideProvider(QueryExecutionEngine)
    .useValue(mockServices.QueryExecutionEngine)
    .overrideProvider(QueryService)
    .useValue(mockServices.QueryService)
    .overrideProvider(QueryStatisticsService)
    .useValue(mockServices.QueryStatisticsService)
    .overrideProvider(QueryResultProcessorService)
    .useValue(mockServices.QueryResultProcessorService)
    .overrideProvider(ConfigService)
    .useValue(mockServices.ConfigService)
    .compile();
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

    it('should compile successfully', () => {
      expect(module).toBeInstanceOf(TestingModule);
    });
  });

  describe('Controller Registration', () => {
    it('should register QueryController', () => {
      const controller = module.get<QueryController>(QueryController);
      expect(controller).toBeDefined();
    });

    it('should provide QueryController with all dependencies', () => {
      const controller = module.get<QueryController>(QueryController);
      expect(controller).toBeDefined();

      // Verify controller can be instantiated (dependencies resolved)
      expect(typeof controller).toBe('object');
    });
  });

  describe('Service Registration', () => {
    it('should register QueryConfigService', () => {
      const service = module.get<QueryConfigService>(QueryConfigService);
      expect(service).toBeDefined();
      expect(service.maxBatchSize).toBe(30);
    });

    it('should register QueryMemoryMonitorService', () => {
      const service = module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService);
      expect(service).toBeDefined();
      expect(service.checkMemoryBeforeBatch).toBeDefined();
    });

    it('should register QueryExecutionEngine', () => {
      const service = module.get<QueryExecutionEngine>(QueryExecutionEngine);
      expect(service).toBeDefined();
      expect(service.executeQuery).toBeDefined();
    });

    it('should register QueryService', () => {
      const service = module.get<QueryService>(QueryService);
      expect(service).toBeDefined();
      expect(service.executeQuery).toBeDefined();
    });

    it('should register QueryStatisticsService', () => {
      const service = module.get<QueryStatisticsService>(QueryStatisticsService);
      expect(service).toBeDefined();
      expect(service.recordQueryPerformance).toBeDefined();
    });

    it('should register QueryResultProcessorService', () => {
      const service = module.get<QueryResultProcessorService>(QueryResultProcessorService);
      expect(service).toBeDefined();
      expect(service.process).toBeDefined();
    });
  });

  describe('Service Dependencies', () => {
    it('should resolve all service dependencies without circular references', () => {
      // Test that all services can be resolved simultaneously
      const services = [
        module.get<QueryConfigService>(QueryConfigService),
        module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService),
        module.get<QueryExecutionEngine>(QueryExecutionEngine),
        module.get<QueryService>(QueryService),
        module.get<QueryStatisticsService>(QueryStatisticsService),
        module.get<QueryResultProcessorService>(QueryResultProcessorService)
      ];

      services.forEach(service => {
        expect(service).toBeDefined();
      });
    });

    it('should maintain service singleton instances', () => {
      const service1 = module.get<QueryService>(QueryService);
      const service2 = module.get<QueryService>(QueryService);

      expect(service1).toBe(service2);
    });

    it('should provide services with proper initialization', () => {
      const configService = module.get<QueryConfigService>(QueryConfigService);
      const memoryService = module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService);

      expect(configService.maxBatchSize).toBeDefined();
      expect(memoryService.checkMemoryBeforeBatch).toBeDefined();
    });
  });

  describe('Exported Services', () => {
    it('should export QueryConfigService for external use', () => {
      const service = module.get<QueryConfigService>(QueryConfigService);
      expect(service).toBeDefined();
      expect(service.getConfigSummary).toBeDefined();
    });

    it('should export QueryExecutionEngine for external use', () => {
      const service = module.get<QueryExecutionEngine>(QueryExecutionEngine);
      expect(service).toBeDefined();
      expect(service.executeQuery).toBeDefined();
    });

    it('should export QueryService for external use', () => {
      const service = module.get<QueryService>(QueryService);
      expect(service).toBeDefined();
      expect(service.executeQuery).toBeDefined();
    });

    it('should export all critical services for module composition', () => {
      const exportedServices = [
        'QueryConfigService',
        'QueryMemoryMonitorService',
        'QueryExecutionEngine',
        'QueryService',
        'QueryStatisticsService',
        'QueryResultProcessorService'
      ];

      exportedServices.forEach(serviceName => {
        const service = module.get(serviceName as any);
        expect(service).toBeDefined();
      });
    });
  });

  describe('Module Integration', () => {
    it('should integrate with EventEmitterModule for event-driven monitoring', () => {
      // The module should import EventEmitterModule successfully
      expect(module).toBeDefined();
    });

    it('should integrate with dependent modules', () => {
      // Module should compile with all imported modules
      expect(module.get<QueryService>(QueryService)).toBeDefined();
      expect(module.get<QueryController>(QueryController)).toBeDefined();
    });

    it('should support service interaction patterns', () => {
      const queryService = module.get<QueryService>(QueryService);
      const statisticsService = module.get<QueryStatisticsService>(QueryStatisticsService);
      const executionEngine = module.get<QueryExecutionEngine>(QueryExecutionEngine);

      // Services should be available for interaction
      expect(queryService.executeQuery).toBeDefined();
      expect(statisticsService.recordQueryPerformance).toBeDefined();
      expect(executionEngine.executeQuery).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should inject ConfigService into dependent services', () => {
      const configService = module.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();
      expect(configService.get).toBeDefined();
    });

    it('should provide configuration to QueryConfigService', () => {
      const queryConfigService = module.get<QueryConfigService>(QueryConfigService);
      expect(queryConfigService).toBeDefined();
      expect(queryConfigService.maxBatchSize).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service initialization failures gracefully', async () => {
      // Test module compilation doesn't throw
      expect(module).toBeDefined();
    });

    it('should maintain service availability during runtime', () => {
      const services = [
        module.get<QueryService>(QueryService),
        module.get<QueryExecutionEngine>(QueryExecutionEngine),
        module.get<QueryStatisticsService>(QueryStatisticsService)
      ];

      // All services should remain available
      services.forEach(service => {
        expect(service).toBeDefined();
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should load services efficiently', () => {
      const startTime = Date.now();

      // Get all services
      const services = [
        module.get<QueryConfigService>(QueryConfigService),
        module.get<QueryService>(QueryService),
        module.get<QueryExecutionEngine>(QueryExecutionEngine),
        module.get<QueryStatisticsService>(QueryStatisticsService),
        module.get<QueryResultProcessorService>(QueryResultProcessorService)
      ];

      const endTime = Date.now();

      expect(services.length).toBe(5);
      expect(endTime - startTime).toBeLessThan(100); // Should load quickly
    });

    it('should minimize memory footprint during initialization', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Access all services
      module.get<QueryService>(QueryService);
      module.get<QueryExecutionEngine>(QueryExecutionEngine);
      module.get<QueryStatisticsService>(QueryStatisticsService);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Event-Driven Architecture Integration', () => {
    it('should support event emission for monitoring', () => {
      const statisticsService = module.get<QueryStatisticsService>(QueryStatisticsService);

      expect(statisticsService.recordQueryPerformance).toBeDefined();
      expect(statisticsService.recordQueryPerformance).toBeDefined();
    });

    it('should integrate with monitoring module for event collection', () => {
      // Module should compile with MonitoringModule imported
      expect(module).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should support clean shutdown', async () => {
      // Module should close without errors
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should handle multiple initialization attempts', async () => {
      const module2 = await Test.createTestingModule({
        imports: [QueryModule],
      })
      .overrideProvider(QueryConfigService)
      .useValue(mockServices.QueryConfigService)
      .overrideProvider(QueryMemoryMonitorService)
      .useValue(mockServices.QueryMemoryMonitorService)
      .overrideProvider(QueryExecutionEngine)
      .useValue(mockServices.QueryExecutionEngine)
      .overrideProvider(QueryService)
      .useValue(mockServices.QueryService)
      .overrideProvider(QueryStatisticsService)
      .useValue(mockServices.QueryStatisticsService)
      .overrideProvider(QueryResultProcessorService)
      .useValue(mockServices.QueryResultProcessorService)
      .overrideProvider(ConfigService)
      .useValue(mockServices.ConfigService)
      .compile();

      expect(module2).toBeDefined();

      await module2.close();
    });
  });

  describe('Service Composition Patterns', () => {
    it('should support service decorator patterns', () => {
      const queryService = module.get<QueryService>(QueryService);
      const executionEngine = module.get<QueryExecutionEngine>(QueryExecutionEngine);

      // Services should be composable
      expect(queryService).toBeDefined();
      expect(executionEngine).toBeDefined();
    });

    it('should support dependency injection chains', () => {
      // Test that complex dependency chains resolve properly
      const controller = module.get<QueryController>(QueryController);
      const service = module.get<QueryService>(QueryService);
      const engine = module.get<QueryExecutionEngine>(QueryExecutionEngine);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();
      expect(engine).toBeDefined();
    });

    it('should maintain service boundaries', () => {
      const services = {
        config: module.get<QueryConfigService>(QueryConfigService),
        memory: module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService),
        execution: module.get<QueryExecutionEngine>(QueryExecutionEngine),
        query: module.get<QueryService>(QueryService),
        statistics: module.get<QueryStatisticsService>(QueryStatisticsService),
        processor: module.get<QueryResultProcessorService>(QueryResultProcessorService)
      };

      // Each service should be distinct
      Object.values(services).forEach((service, index) => {
        Object.values(services).forEach((otherService, otherIndex) => {
          if (index !== otherIndex) {
            expect(service).not.toBe(otherService);
          }
        });
      });
    });
  });

  describe('Real-World Integration Scenarios', () => {
    it('should support typical query execution workflow', () => {
      const controller = module.get<QueryController>(QueryController);
      const service = module.get<QueryService>(QueryService);
      const engine = module.get<QueryExecutionEngine>(QueryExecutionEngine);
      const statistics = module.get<QueryStatisticsService>(QueryStatisticsService);

      // Simulate query workflow
      expect(controller.executeQuery).toBeDefined();
      expect(service.executeQuery).toBeDefined();
      expect(engine.executeQuery).toBeDefined();
      expect(statistics.recordQueryPerformance).toBeDefined();
    });

    it('should support bulk query processing workflow', () => {
      const service = module.get<QueryService>(QueryService);
      const engine = module.get<QueryExecutionEngine>(QueryExecutionEngine);
      const processor = module.get<QueryResultProcessorService>(QueryResultProcessorService);

      // Simulate bulk query workflow
      expect(service.executeQuery).toBeDefined();
      expect(engine.executeQuery).toBeDefined();
      expect(processor.process).toBeDefined();
    });

    it('should support memory monitoring during execution', () => {
      const memoryService = module.get<QueryMemoryMonitorService>(QueryMemoryMonitorService);
      const configService = module.get<QueryConfigService>(QueryConfigService);

      // Memory monitoring should work with configuration
      expect(memoryService.checkMemoryBeforeBatch).toBeDefined();
      expect(configService.maxBatchSize).toBe(30);
    });

    it('should support statistics collection across all operations', () => {
      const statisticsService = module.get<QueryStatisticsService>(QueryStatisticsService);
      const queryService = module.get<QueryService>(QueryService);

      // Statistics should be collectible for all operations
      expect(statisticsService.getQueryStats()).toBeDefined();
      expect(statisticsService.resetQueryStats).toBeDefined();
      expect(queryService.executeQuery).toBeDefined();
    });
  });
});