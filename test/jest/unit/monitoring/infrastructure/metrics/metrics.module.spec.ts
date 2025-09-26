/**
 * MetricsModule Unit Tests
 * 测试基础设施指标模块的配置和依赖注入
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MetricsModule } from '@monitoring/infrastructure/metrics/metrics.module';
import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';
import { FeatureFlags } from '@appcore/config/feature-flags.config';

describe('MetricsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MetricsModule],
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

    it('should provide MetricsRegistryService', () => {
      const service = module.get<MetricsRegistryService>(MetricsRegistryService);
      expect(service).toBeDefined();
    });

    it('should provide FeatureFlags', () => {
      const featureFlags = module.get<FeatureFlags>(FeatureFlags);
      expect(featureFlags).toBeDefined();
    });

    it('should export MetricsRegistryService', async () => {
      const testModule = await Test.createTestingModule({
        imports: [MetricsModule],
      }).compile();

      expect(() => testModule.get(MetricsRegistryService)).not.toThrow();
      await testModule.close();
    });
  });

  describe('Provider Configuration', () => {
    it('should configure required providers', () => {
      const providers = Reflect.getMetadata('providers', MetricsModule) || [];
      
      expect(providers).toContain(MetricsRegistryService);
      expect(providers).toContain(FeatureFlags);
    });

    it('should export required services', () => {
      const exports = Reflect.getMetadata('exports', MetricsModule) || [];
      
      expect(exports).toContain(MetricsRegistryService);
    });
  });

  describe('Module Integration', () => {
    it('should successfully compile the module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [MetricsModule],
      }).compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });
  });
});