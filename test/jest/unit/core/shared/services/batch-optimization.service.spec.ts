import { Test, TestingModule } from '@nestjs/testing';
import { BatchOptimizationService } from '../../../../../../src/core/shared/services/batch-optimization.service';
import { SymbolMapperService } from '../../../../../../src/core/symbol-mapper/services/symbol-mapper.service';
import { FlexibleMappingRuleService } from '../../../../../../src/core/data-mapper/services/flexible-mapping-rule.service';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { MetricsRegistryService } from '../../../../../../src/monitoring/metrics/services/metrics-registry.service';

const mockSymbolMapperService = {
  mapSymbol: jest.fn(),
};

const mockFlexibleMappingRuleService = {};

const mockFeatureFlags = {
  symbolMappingCacheEnabled: true,
  dataTransformCacheEnabled: true,
  batchProcessingEnabled: true,
  objectPoolEnabled: true,
  ruleCompilationEnabled: true,
  dynamicLogLevelEnabled: true,
  metricsLegacyModeEnabled: true,
  symbolCacheMaxSize: 2000,
  symbolCacheTtl: 5 * 60 * 1000,
  ruleCacheMaxSize: 100,
  ruleCacheTtl: 10 * 60 * 1000,
  objectPoolSize: 100,
  batchSizeThreshold: 10,
  batchTimeWindowMs: 1,
  getAllFlags: jest.fn().mockReturnValue({
    symbolMappingCacheEnabled: true,
    dataTransformCacheEnabled: true,
    batchProcessingEnabled: true,
    objectPoolEnabled: true,
    ruleCompilationEnabled: true,
    dynamicLogLevelEnabled: true,
    metricsLegacyModeEnabled: true,
  }),
  isCacheOptimizationEnabled: jest.fn().mockReturnValue(true),
  isPerformanceOptimizationEnabled: jest.fn().mockReturnValue(true),
};

describe('BatchOptimizationService (unit)', () => {
  let service: BatchOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchOptimizationService,
        {
          provide: SymbolMapperService,
          useValue: mockSymbolMapperService,
        },
        {
          provide: FlexibleMappingRuleService,
          useValue: mockFlexibleMappingRuleService,
        },
        {
          provide: FeatureFlags,
          useValue: mockFeatureFlags,
        },
        {
          provide: MetricsRegistryService,
          useValue: {
            batchOptimizationRequestsTotal: { inc: jest.fn() },
            batchOptimizationSuccessTotal: { inc: jest.fn() },
            batchOptimizationFailureTotal: { inc: jest.fn() },
            batchOptimizationProcessingDuration: { observe: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<BatchOptimizationService>(BatchOptimizationService);
  });

  it('应成功实例化', () => {
    expect(service).toBeDefined();
  });
});