import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SharedServicesModule } from '@core/shared/module/shared-services.module';
import { MarketStatusService } from '@core/shared/services/market-status.service';
import { BaseFetcherService } from '@core/shared/services/base-fetcher.service';
import { FieldMappingService } from '@core/shared/services/field-mapping.service';
import { DataChangeDetectorService } from '@core/shared/services/data-change-detector.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
// // import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';
import { FeatureFlags } from '@appcore/config/feature-flags.config';
// // import { ExtendedHealthService } from '@monitoring/health/extended-health.service';

describe('SharedServicesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    };

    // 模拟PaginationService
    const mockPaginationService = {
      normalizePaginationQuery: jest.fn(),
      createPaginatedResponse: jest.fn(),
      createPaginatedResponseFromQuery: jest.fn(),
      validatePaginationParams: jest.fn(),
      getDefaultPage: jest.fn().mockReturnValue(1),
      getDefaultLimit: jest.fn().mockReturnValue(10),
      getMaxLimit: jest.fn().mockReturnValue(100),
      calculateSkip: jest.fn(),
      createPagination: jest.fn(),
    };

    // 模拟FeatureFlags
    const mockFeatureFlags = {
      symbolMappingCacheEnabled: true,
      dataTransformCacheEnabled: true,
      objectPoolEnabled: true,
      ruleCompilationEnabled: true,
      dynamicLogLevelEnabled: true,
      getAllFlags: jest.fn().mockReturnValue({}),
      isCacheOptimizationEnabled: jest.fn().mockReturnValue(true),
      isPerformanceOptimizationEnabled: jest.fn().mockReturnValue(true),
    };

    // 模拟MetricsRegistryService
    // const mockMetricsRegistryService = {
    //   getMetrics: jest.fn(),
    //   getMetricsSummary: jest.fn(),
    //   resetMetrics: jest.fn(),
    //   getMetricValue: jest.fn(),
    //   getHealthStatus: jest.fn(),
    //   // 添加所有需要的指标属性
    //   streamSymbolsProcessedTotal: { inc: jest.fn() },
    //   streamRulesCompiledTotal: { inc: jest.fn() },
    //   streamProcessingTimeMs: { set: jest.fn() },
    //   streamCacheHitRate: { set: jest.fn() },
    //   streamErrorRate: { set: jest.fn() },
    //   streamThroughputPerSecond: { set: jest.fn() },
    //   streamConcurrentConnections: { set: jest.fn() },
    //   streamPushLatencyMs: { observe: jest.fn() },
    //   // ... 其他需要的指标
    // };

    // const mockExtendedHealthService = {
    //   getFullHealthStatus: jest.fn(),
    //   getConfigHealthStatus: jest.fn(),
    //   getDependenciesHealthStatus: jest.fn(),
    //   performStartupCheck: jest.fn(),
    // };

    const moduleRef = Test.createTestingModule({
      imports: [SharedServicesModule],
      providers: [
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    });

    // 替换所有需要的服务
    moduleRef.overrideProvider(PaginationService).useValue(mockPaginationService);
    moduleRef.overrideProvider(FeatureFlags).useValue(mockFeatureFlags);
//     moduleRef.overrideProvider(MetricsRegistryService).useValue(mockMetricsRegistryService);
//     moduleRef.overrideProvider(ExtendedHealthService).useValue(mockExtendedHealthService);
    
    module = await moduleRef.compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide MarketStatusService', () => {
    const service = module.get<MarketStatusService>(MarketStatusService);
    expect(service).toBeInstanceOf(MarketStatusService);
  });

  it('should provide BaseFetcherService', () => {
    const service = module.get<BaseFetcherService>(BaseFetcherService);
    expect(service).toBeInstanceOf(BaseFetcherService);
  });

  it('should provide FieldMappingService', () => {
    const service = module.get<FieldMappingService>(FieldMappingService);
    expect(service).toBeInstanceOf(FieldMappingService);
  });

  it('should provide DataChangeDetectorService', () => {
    const service = module.get<DataChangeDetectorService>(DataChangeDetectorService);
    expect(service).toBeInstanceOf(DataChangeDetectorService);
  });

  describe('Module configuration', () => {
    it('should be a valid NestJS module', () => {
      expect(module).toBeDefined();
    });

    it('should export all services', async () => {
      const marketStatusService = module.get<MarketStatusService>(MarketStatusService);
      const baseFetcherService = module.get<BaseFetcherService>(BaseFetcherService);
      const fieldMappingService = module.get<FieldMappingService>(FieldMappingService);
      const dataChangeDetectorService = module.get<DataChangeDetectorService>(DataChangeDetectorService);

      expect(marketStatusService).toBeDefined();
      expect(baseFetcherService).toBeDefined();
      expect(fieldMappingService).toBeDefined();
      expect(dataChangeDetectorService).toBeDefined();
    });
  });
});
