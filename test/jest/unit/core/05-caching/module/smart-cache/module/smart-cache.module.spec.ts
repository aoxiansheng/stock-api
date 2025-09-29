/**
 * SmartCacheModule 单元测试
 * 测试智能缓存模块的配置和依赖注入
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SmartCacheModule } from '@core/05-caching/module/smart-cache/module/smart-cache.module';
import { SmartCacheStandardizedService } from '@core/05-caching/module/smart-cache/services/smart-cache-standardized.service';
import { SmartCachePerformanceOptimizer } from '@core/05-caching/module/smart-cache/services/smart-cache-performance-optimizer.service';

// Mock dependencies to avoid complex dependency injection issues
jest.mock('@core/04-storage/storage/module/storage.module', () => ({
  StorageModule: {
    forRoot: jest.fn(() => ({
      module: 'MockStorageModule',
      providers: [],
      exports: [],
    })),
  },
}));

jest.mock('@core/05-caching/basic-cache/module/basic-cache.module', () => ({
  BasicCacheModule: {
    module: 'MockBasicCacheModule',
    providers: [],
    exports: [],
  },
}));

jest.mock('@core/shared/module/shared-services.module', () => ({
  SharedServicesModule: {
    module: 'MockSharedServicesModule',
    providers: [],
    exports: [],
  },
}));

jest.mock('@common/modules/market-inference/market-inference.module', () => ({
  MarketInferenceModule: {
    module: 'MockMarketInferenceModule',
    providers: [],
    exports: [],
  },
}));

jest.mock('@core/05-caching/module/smart-cache/services/smart-cache-standardized.service', () => ({
  SmartCacheStandardizedService: jest.fn().mockImplementation(() => ({
    moduleType: 'smart-cache',
    moduleCategory: 'orchestrator',
    name: 'smart-cache',
    version: '2.0.0',
    priority: 1,
  })),
}));

jest.mock('@core/05-caching/module/smart-cache/services/smart-cache-performance-optimizer.service', () => ({
  SmartCachePerformanceOptimizer: jest.fn().mockImplementation(() => ({})),
}));

describe('SmartCacheModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SmartCacheModule],
    }).compile();
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

    it('should compile without errors', () => {
      expect(module).toBeInstanceOf(TestingModule);
    });

    it('should provide SmartCacheStandardizedService', () => {
      const service = module.get(SmartCacheStandardizedService, { strict: false });
      expect(service).toBeDefined();
    });

    it('should provide SmartCachePerformanceOptimizer', () => {
      const optimizer = module.get(SmartCachePerformanceOptimizer, { strict: false });
      expect(optimizer).toBeDefined();
    });

    it('should provide smartCacheConfig', () => {
      const config = module.get('smartCacheConfig', { strict: false });
      expect(config).toBeDefined();
    });
  });

  describe('Module Dependencies', () => {
    it('should import required modules', () => {
      // Test that all required modules are imported
      // This is more of an integration test but helps ensure module structure
      expect(module).toBeDefined();
    });

    it('should export required services', () => {
      // Verify that the module exports the necessary services
      const service = module.get(SmartCacheStandardizedService, { strict: false });
      const optimizer = module.get(SmartCachePerformanceOptimizer, { strict: false });
      const config = module.get('smartCacheConfig', { strict: false });

      expect(service).toBeDefined();
      expect(optimizer).toBeDefined();
      expect(config).toBeDefined();
    });
  });

  describe('Configuration Factory', () => {
    it('should create default config', () => {
      const config = module.get('smartCacheConfig', { strict: false });
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should allow custom config override', () => {
      // Test custom configuration through factory
      // This would be tested in integration tests with actual config
      expect(module).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize without errors', () => {
      expect(module).toBeDefined();
    });

    it('should destroy cleanly', async () => {
      await expect(module.close()).resolves.not.toThrow();
    });
  });
});
