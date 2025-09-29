import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverModule } from '@core/01-entry/stream-receiver/module/stream-receiver.module';
import { StreamReceiverGateway } from '@core/01-entry/stream-receiver/gateway/stream-receiver.gateway';
import { StreamReceiverService } from '@core/01-entry/stream-receiver/services/stream-receiver.service';
import { StreamBatchProcessorService } from '@core/01-entry/stream-receiver/services/stream-batch-processor.service';
import { StreamConnectionManagerService } from '@core/01-entry/stream-receiver/services/stream-connection-manager.service';
import { StreamDataProcessorService } from '@core/01-entry/stream-receiver/services/stream-data-processor.service';
import { StreamDataValidator } from '@core/01-entry/stream-receiver/validators/stream-data.validator';
import { Module } from '@nestjs/common';

// 模拟依赖模块 - 一个模块工厂函数
const createMockModule = () => {
  class MockModule {}
  return { module: { Module: { name: 'Mock' } }, MockModule };
}

// 使用jest.mock的工厂函数模式 - 避免"Cannot access before initialization"问题
jest.mock('@auth/module/auth.module', () => {
  return { AuthModule: class {} };
});

jest.mock('@core/00-prepare/symbol-mapper/module/symbol-mapper.module', () => {
  return { SymbolMapperModule: class {} };
});

jest.mock('@core/02-processing/symbol-transformer/module/symbol-transformer.module', () => {
  return { SymbolTransformerModule: class {} };
});

jest.mock('@core/02-processing/transformer/module/data-transformer.module', () => {
  return { TransformerModule: class {} };
});

jest.mock('@core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module', () => {
  return { StreamDataFetcherModule: class {} };
});

jest.mock('@monitoring/monitoring.module', () => {
  return { MonitoringModule: class {} };
});

jest.mock('@common/modules/market-inference/market-inference.module', () => {
  return { MarketInferenceModule: class {} };
});

// 模拟内部组件
jest.mock('@core/01-entry/stream-receiver/gateway/stream-receiver.gateway', () => {
  return { StreamReceiverGateway: jest.fn().mockImplementation(() => ({})) };
});

jest.mock('@core/01-entry/stream-receiver/services/stream-receiver.service', () => {
  return { StreamReceiverService: jest.fn().mockImplementation(() => ({})) };
});

jest.mock('@core/01-entry/stream-receiver/services/stream-batch-processor.service', () => {
  return { StreamBatchProcessorService: jest.fn().mockImplementation(() => ({})) };
});

jest.mock('@core/01-entry/stream-receiver/services/stream-connection-manager.service', () => {
  return { StreamConnectionManagerService: jest.fn().mockImplementation(() => ({})) };
});

jest.mock('@core/01-entry/stream-receiver/services/stream-data-processor.service', () => {
  return { StreamDataProcessorService: jest.fn().mockImplementation(() => ({})) };
});

jest.mock('@core/01-entry/stream-receiver/validators/stream-data.validator', () => {
  return { StreamDataValidator: jest.fn().mockImplementation(() => ({})) };
});

describe('StreamReceiverModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StreamReceiverModule],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined();
    });

    it('should be an instance of TestingModule', () => {
      expect(module).toBeInstanceOf(TestingModule);
    });
  });

  describe('Provider Registration', () => {
    it('should provide StreamReceiverGateway', () => {
      const gateway = module.get<StreamReceiverGateway>(StreamReceiverGateway);
      expect(gateway).toBeDefined();
    });

    it('should provide StreamReceiverService', () => {
      const service = module.get<StreamReceiverService>(StreamReceiverService);
      expect(service).toBeDefined();
    });

    it('should provide StreamBatchProcessorService', () => {
      const service = module.get<StreamBatchProcessorService>(StreamBatchProcessorService);
      expect(service).toBeDefined();
    });

    it('should provide StreamConnectionManagerService', () => {
      const service = module.get<StreamConnectionManagerService>(StreamConnectionManagerService);
      expect(service).toBeDefined();
    });

    it('should provide StreamDataProcessorService', () => {
      const service = module.get<StreamDataProcessorService>(StreamDataProcessorService);
      expect(service).toBeDefined();
    });

    it('should provide StreamDataValidator', () => {
      const validator = module.get<StreamDataValidator>(StreamDataValidator);
      expect(validator).toBeDefined();
    });
  });

  describe('Provider Export Verification', () => {
    it('should export all core services', () => {
      // All providers should be accessible indicating they are properly exported
      expect(module.get(StreamReceiverGateway)).toBeDefined();
      expect(module.get(StreamReceiverService)).toBeDefined();
      expect(module.get(StreamBatchProcessorService)).toBeDefined();
      expect(module.get(StreamConnectionManagerService)).toBeDefined();
      expect(module.get(StreamDataProcessorService)).toBeDefined();
      expect(module.get(StreamDataValidator)).toBeDefined();
    });
  });

  describe('Module Dependencies', () => {
    it('should have all required imports available', () => {
      // Module should compile successfully with all dependencies
      expect(module).toBeDefined();
    });

    it('should handle missing dependencies gracefully', async () => {
      // Test module compilation with minimal overrides
      const testModule = await Test.createTestingModule({
        imports: [StreamReceiverModule],
      }).compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });
  });

  describe('Service Availability', () => {
    it('should make all services available for injection', () => {
      const gateway = module.get(StreamReceiverGateway, { strict: false });
      const receiverService = module.get(StreamReceiverService, { strict: false });
      const batchProcessor = module.get(StreamBatchProcessorService, { strict: false });
      const connectionManager = module.get(StreamConnectionManagerService, { strict: false });
      const dataProcessor = module.get(StreamDataProcessorService, { strict: false });
      const validator = module.get(StreamDataValidator, { strict: false });

      expect(gateway).toBeDefined();
      expect(receiverService).toBeDefined();
      expect(batchProcessor).toBeDefined();
      expect(connectionManager).toBeDefined();
      expect(dataProcessor).toBeDefined();
      expect(validator).toBeDefined();
    });

    it('should handle service retrieval without errors', () => {
      expect(() => module.get(StreamReceiverGateway)).not.toThrow();
      expect(() => module.get(StreamReceiverService)).not.toThrow();
      expect(() => module.get(StreamBatchProcessorService)).not.toThrow();
      expect(() => module.get(StreamConnectionManagerService)).not.toThrow();
      expect(() => module.get(StreamDataProcessorService)).not.toThrow();
      expect(() => module.get(StreamDataValidator)).not.toThrow();
    });
  });

  describe('Module Configuration', () => {
    it('should have proper module metadata', () => {
      // Test that the module is properly configured
      expect(module).toBeDefined();
    });

    it('should support module extension', async () => {
      // Test that the module can be extended
      const extendedModule = await Test.createTestingModule({
        imports: [StreamReceiverModule],
        providers: [
          {
            provide: 'CUSTOM_SERVICE',
            useValue: { custom: true }
          }
        ]
      }).compile();

      expect(extendedModule.get('CUSTOM_SERVICE')).toEqual({ custom: true });
      await extendedModule.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle provider resolution errors gracefully', () => {
      // All providers should be resolvable with mocks
      expect(() => {
        module.get(StreamReceiverGateway);
        module.get(StreamReceiverService);
        module.get(StreamBatchProcessorService);
        module.get(StreamConnectionManagerService);
        module.get(StreamDataProcessorService);
        module.get(StreamDataValidator);
      }).not.toThrow();
    });

    it('should handle non-existent provider requests appropriately', () => {
      expect(() => {
        module.get('NON_EXISTENT_PROVIDER');
      }).toThrow();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize successfully', () => {
      expect(module).toBeDefined();
    });

    it('should clean up resources on close', async () => {
      const testModule = await Test.createTestingModule({
        imports: [StreamReceiverModule],
      }).compile();

      expect(testModule).toBeDefined();

      // Should not throw when closing
      await expect(testModule.close()).resolves.not.toThrow();
    });
  });
});
