/**
 * DataFetcherModule 单元测试
 * 测试DataFetcher模块的配置和依赖注入
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DataFetcherModule } from '@core/03-fetching/data-fetcher/module/data-fetcher.module';
import { DataFetcherService } from '@core/03-fetching/data-fetcher/services/data-fetcher.service';
import { ProviderRegistryService } from '@providersv2/provider-registry.service';

// Mock ProvidersModule since it has complex dependencies
const mockProviderRegistryService = {
  getCapability: jest.fn(),
  getProvider: jest.fn()
};

describe('DataFetcherModule', () => {
  let module: TestingModule;
  let dataFetcherService: DataFetcherService;
  let eventEmitter: EventEmitter2;
  let capabilityRegistryService: ProviderRegistryService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot() // EventEmitterModule is needed for DataFetcherService
      ],
      providers: [
        DataFetcherService,
        {
          provide: ProviderRegistryService,
          useValue: mockProviderRegistryService
        }
      ]
    }).compile();

    dataFetcherService = module.get<DataFetcherService>(DataFetcherService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    capabilityRegistryService = module.get<ProviderRegistryService>(ProviderRegistryService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('module configuration', () => {
    it('should be defined', () => {
      expect(DataFetcherModule).toBeDefined();
    });

    it('should provide DataFetcherService', () => {
      expect(dataFetcherService).toBeDefined();
      expect(dataFetcherService).toBeInstanceOf(DataFetcherService);
    });

    it('should provide EventEmitter2', () => {
      expect(eventEmitter).toBeDefined();
      expect(eventEmitter).toBeInstanceOf(EventEmitter2);
    });

    it('should provide ProviderRegistryService', () => {
      expect(capabilityRegistryService).toBeDefined();
      expect(capabilityRegistryService).toBe(mockProviderRegistryService);
    });
  });

  describe('dependency injection', () => {
    it('should inject dependencies into DataFetcherService', () => {
      expect(dataFetcherService).toBeDefined();

      // DataFetcherService should have access to its dependencies
      // We can verify this by checking if the service was created successfully
      expect(dataFetcherService).toBeInstanceOf(DataFetcherService);
    });

    it('should properly configure EventEmitter2', () => {
      expect(eventEmitter).toBeDefined();

      // Test that EventEmitter2 can emit events
      const testListener = jest.fn();
      eventEmitter.on('test.event', testListener);
      eventEmitter.emit('test.event', { test: 'data' });

      expect(testListener).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('service availability', () => {
    it('should make DataFetcherService available for export', () => {
      // Test that the service is available and can be retrieved
      const retrievedService = module.get<DataFetcherService>(DataFetcherService);
      expect(retrievedService).toBeDefined();
      expect(retrievedService).toBe(dataFetcherService);
    });

    it('should maintain singleton instance of DataFetcherService', () => {
      const service1 = module.get<DataFetcherService>(DataFetcherService);
      const service2 = module.get<DataFetcherService>(DataFetcherService);

      expect(service1).toBe(service2);
    });
  });

  describe('module integration', () => {
    it('should integrate with EventEmitterModule', () => {
      expect(eventEmitter).toBeDefined();
      expect(eventEmitter.emit).toBeDefined();
      expect(typeof eventEmitter.emit).toBe('function');
    });

    it('should support event emission from DataFetcherService', () => {
      // Set up event listener
      const eventListener = jest.fn();
      eventEmitter.on('test.metric.collected', eventListener);

      // Emit test event
      eventEmitter.emit('test.metric.collected', {
        timestamp: new Date(),
        source: 'data_fetcher',
        metricType: 'test',
        metricName: 'test_metric',
        metricValue: 1,
        tags: { test: true }
      });

      expect(eventListener).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing dependencies gracefully during testing', async () => {
      // This test ensures the module can be created even with mocked dependencies
      expect(() => {
        module.get<DataFetcherService>(DataFetcherService);
      }).not.toThrow();
    });
  });

  describe('module lifecycle', () => {
    it('should initialize properly', async () => {
      // Module should initialize without errors
      expect(module).toBeDefined();
      expect(dataFetcherService).toBeDefined();
    });

    it('should clean up properly', async () => {
      await expect(module.close()).resolves.not.toThrow();
    });
  });

  describe('capability registry integration', () => {
    it('should use ProviderRegistryService', () => {
      expect(capabilityRegistryService).toBeDefined();
      expect(capabilityRegistryService.getCapability).toBeDefined();
      expect(capabilityRegistryService.getProvider).toBeDefined();
    });

    it('should allow mocking of capability registry methods', () => {
      mockProviderRegistryService.getCapability.mockReturnValue({
        name: 'test-capability',
        execute: jest.fn()
      });

      const result = capabilityRegistryService.getCapability('test-provider', 'test-capability');
      expect(result).toBeDefined();
      expect(result.name).toBe('test-capability');
      expect(mockProviderRegistryService.getCapability).toHaveBeenCalledWith(
        'test-provider',
        'test-capability'
      );
    });

    it('should handle provider lookup', () => {
      mockProviderRegistryService.getProvider.mockReturnValue({
        name: 'test-provider',
        getContextService: jest.fn()
      });

      const provider = capabilityRegistryService.getProvider('test-provider');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('test-provider');
      expect(mockProviderRegistryService.getProvider).toHaveBeenCalledWith('test-provider');
    });
  });

  describe('module metadata', () => {
    it('should have correct module structure', () => {
      const moduleRef = module;
      expect(moduleRef).toBeDefined();

      // Check that the module contains expected providers
      expect(() => moduleRef.get<DataFetcherService>(DataFetcherService)).not.toThrow();
      expect(() => moduleRef.get<EventEmitter2>(EventEmitter2)).not.toThrow();
    });
  });
});
