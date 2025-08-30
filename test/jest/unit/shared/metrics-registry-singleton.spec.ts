/**
 * MetricsRegistryService 单例验证测试
 * 🔧 Phase 1.5: 验证修复重复提供者后的单例模式
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';
import { SharedServicesModule } from '../../../../src/core/shared/module/shared-services.module';
import { InfrastructureModule } from '@monitoring/infrastructure/infrastructure.module';
import { FeatureFlags } from '@config/feature-flags.config';

describe('MetricsRegistryService Singleton Validation', () => {
  let testingModule: TestingModule;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [SharedServicesModule, InfrastructureModule],
      providers: [
        // 提供 FeatureFlags 因为 MetricsRegistryService 需要它
        {
          provide: FeatureFlags,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
            getConfig: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();
  });

  afterAll(async () => {
    if (testingModule) {
      await testingModule.close();
    }
  });

  it('should maintain single instance across different injection contexts', () => {
    try {
      const metricsInstance1 = testingModule.get(MetricsRegistryService, { strict: false });
      const metricsInstance2 = testingModule.get(MetricsRegistryService, { strict: false });
      
      expect(metricsInstance1).toBeDefined();
      expect(metricsInstance2).toBeDefined();
      expect(metricsInstance1).toBe(metricsInstance2);
      
      console.log('✅ MetricsRegistryService 单例验证通过');
    } catch (error) {
      console.log('❌ MetricsRegistryService 单例验证失败:', error.message);
      throw error;
    }
  });

  it('should be injectable from InfrastructureModule', () => {
    try {
      const metricsInstance = testingModule.get(MetricsRegistryService, { strict: false });
      expect(metricsInstance).toBeDefined();
      expect(typeof metricsInstance.getMetrics).toBe('function');
      
      console.log('✅ MetricsRegistryService 从 InfrastructureModule 注入成功');
    } catch (error) {
      console.log('❌ MetricsRegistryService 注入失败:', error.message);
      throw error;
    }
  });
});