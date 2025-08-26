/**
 * 简化版 MetricsRegistryService 测试
 * 🔧 Phase 1.5: 验证基本功能和模块依赖
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MetricsRegistryService } from '../../../../src/monitoring/infrastructure/metrics/metrics-registry.service';
import { FeatureFlags } from '../../../../src/common/config/feature-flags.config';

describe('MetricsRegistryService Basic Test', () => {
  let testingModule: TestingModule;
  let metricsService: MetricsRegistryService;

  beforeAll(async () => {
    // 创建 mock FeatureFlags
    const mockFeatureFlags = {
      isEnabled: jest.fn().mockReturnValue(true),
      getConfig: jest.fn().mockReturnValue({}),
      get: jest.fn().mockReturnValue(true),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        MetricsRegistryService,
        {
          provide: FeatureFlags,
          useValue: mockFeatureFlags,
        },
      ],
    }).compile();

    metricsService = testingModule.get<MetricsRegistryService>(MetricsRegistryService);
  });

  afterAll(async () => {
    if (testingModule) {
      await testingModule.close();
    }
  });

  it('should be defined', () => {
    expect(metricsService).toBeDefined();
    console.log('✅ MetricsRegistryService 创建成功');
  });

  it('should have getMetrics method', () => {
    expect(typeof metricsService.getMetrics).toBe('function');
    console.log('✅ MetricsRegistryService.getMetrics 方法存在');
  });

  it('should have metrics properties', () => {
    expect(metricsService.receiverRequestsTotal).toBeDefined();
    expect(metricsService.streamSymbolsProcessedTotal).toBeDefined();
    console.log('✅ MetricsRegistryService 指标属性存在');
  });
});