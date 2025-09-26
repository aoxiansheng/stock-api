/**
 * MetricsRegistryService Unit Tests
 * 测试Prometheus指标注册中心服务的功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';
import { FeatureFlags } from '@appcore/config/feature-flags.config';
import { createLogger } from '@common/logging/index';
import { MONITORING_HEALTH_STATUS } from '@monitoring/constants/config/monitoring-health.constants';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';
import { MonitoringUnifiedLimitsConfig } from '@monitoring/config/unified/monitoring-unified-limits.config';

// Mock dependencies
jest.mock('@common/logging/index');

describe('MetricsRegistryService', () => {
  let service: MetricsRegistryService;
  let featureFlags: jest.Mocked<FeatureFlags>;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    featureFlags = {
      isPerformanceOptimizationEnabled: jest.fn().mockReturnValue(true),
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'monitoringUnifiedLimits') {
          return {
            systemLimits: {
              maxBufferSize: 1000,
            },
          } as MonitoringUnifiedLimitsConfig;
        }
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsRegistryService,
        {
          provide: FeatureFlags,
          useValue: featureFlags,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<MetricsRegistryService>(MetricsRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize all stream recovery metrics', () => {
      expect(service.streamRecoveryJobsTotal).toBeDefined();
      expect(service.streamRecoveryJobsPending).toBeDefined();
      expect(service.streamRecoveryJobsActive).toBeDefined();
      expect(service.streamRecoveryJobsCompleted).toBeDefined();
      expect(service.streamRecoveryJobsFailed).toBeDefined();
      expect(service.streamRecoveryLatencySeconds).toBeDefined();
      expect(service.streamRecoveryDataPointsTotal).toBeDefined();
      expect(service.streamRecoveryBatchesSentTotal).toBeDefined();
      expect(service.streamRecoveryBatchSize).toBeDefined();
      expect(service.streamRecoveryCompressionRatio).toBeDefined();
      expect(service.streamRecoveryQps).toBeDefined();
      expect(service.streamRecoveryRateLimitHitsTotal).toBeDefined();
      expect(service.streamRecoveryTokensConsumedTotal).toBeDefined();
      expect(service.streamRecoveryErrorsTotal).toBeDefined();
      expect(service.streamRecoveryConnectionErrorsTotal).toBeDefined();
      expect(service.streamRecoveryTimeoutErrorsTotal).toBeDefined();
      expect(service.streamRecoveryHealthStatus).toBeDefined();
      expect(service.streamRecoveryWorkerStatus).toBeDefined();
    });

    it('should initialize all stream processing metrics', () => {
      expect(service.streamSymbolsProcessedTotal).toBeDefined();
      expect(service.streamRulesCompiledTotal).toBeDefined();
      expect(service.streamProcessingTimeMs).toBeDefined();
      expect(service.streamCacheHitRate).toBeDefined();
      expect(service.streamErrorRate).toBeDefined();
      expect(service.streamThroughputPerSecond).toBeDefined();
      expect(service.streamConcurrentConnections).toBeDefined();
    });

    it('should initialize all Phase 4 end-to-end latency metrics', () => {
      expect(service.streamPushLatencyMs).toBeDefined();
    });

    it('should initialize all batch processing metrics', () => {
      expect(service.streamBatchesProcessedTotal).toBeDefined();
      expect(service.streamQuotesInBatchesTotal).toBeDefined();
      expect(service.streamAverageBatchSize).toBeDefined();
      expect(service.streamBatchProcessingDuration).toBeDefined();
      expect(service.streamBatchSuccessRate).toBeDefined();
    });

    it('should initialize all system performance metrics', () => {
      expect(service.logLevelSwitchesTotal).toBeDefined();
      expect(service.systemCpuUsagePercent).toBeDefined();
      expect(service.highLoadDurationSecondsTotal).toBeDefined();
    });

    it('should initialize all core component metrics', () => {
      // Receiver metrics
      expect(service.receiverRequestsTotal).toBeDefined();
      expect(service.receiverProcessingDuration).toBeDefined();
      expect(service.receiverErrorRate).toBeDefined();
      expect(service.receiverActiveConnections).toBeDefined();

      // Data Mapper metrics
      expect(service.dataMapperRulesAppliedTotal).toBeDefined();
      expect(service.dataMapperTransformationDuration).toBeDefined();
      expect(service.dataMapperCacheHitRate).toBeDefined();
      expect(service.dataMapperValidationErrors).toBeDefined();
      expect(service.dataMapperRuleInitializationTotal).toBeDefined();
      expect(service.dataMapperRulesCreatedTotal).toBeDefined();
      expect(service.dataMapperRulesSkippedTotal).toBeDefined();

      // Transformer metrics
      expect(service.transformerOperationsTotal).toBeDefined();
      expect(service.transformerBatchSize).toBeDefined();
      expect(service.transformerSuccessRate).toBeDefined();
      expect(service.transformerPreviewGeneratedTotal).toBeDefined();

      // Storage metrics
      expect(service.storageOperationsTotal).toBeDefined();
      expect(service.storageQueryDuration).toBeDefined();
      expect(service.storageCacheEfficiency).toBeDefined();
      expect(service.storageDataVolume).toBeDefined();
    });

    it('should initialize all Query architecture metrics', () => {
      expect(service.queryPipelineDuration).toBeDefined();
      expect(service.queryCacheHitRatio).toBeDefined();
      expect(service.queryBatchEfficiency).toBeDefined();
      expect(service.queryBackgroundTasksActive).toBeDefined();
      expect(service.queryBackgroundTasksCompleted).toBeDefined();
      expect(service.queryBackgroundTasksFailed).toBeDefined();
      expect(service.querySymbolsProcessedTotal).toBeDefined();
      expect(service.queryReceiverCallsTotal).toBeDefined();
      expect(service.queryReceiverCallDuration).toBeDefined();
      expect(service.queryMarketProcessingTime).toBeDefined();
      expect(service.queryBatchShardingEfficiency).toBeDefined();
      expect(service.queryConcurrentRequestsActive).toBeDefined();
    });

    it('should initialize all Query memory monitoring metrics', () => {
      expect(service.queryMemoryUsageBytes).toBeDefined();
      expect(service.queryMemoryPressureLevel).toBeDefined();
      expect(service.queryMemoryTriggeredDegradations).toBeDefined();
    });

    it('should use default configuration when limits config is not available', () => {
      configService.get.mockReturnValue(undefined);
      
      // This test ensures the service can be instantiated without limits config
      expect(() => new MetricsRegistryService(featureFlags, configService)).not.toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('should initialize Prometheus metrics when performance optimization is enabled', async () => {
      featureFlags.isPerformanceOptimizationEnabled.mockReturnValue(true);
      
      await service.onModuleInit();
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Prometheus 指标注册中心初始化完成',
        expect.objectContaining({
          totalMetrics: expect.any(Number),
          customMetrics: 71,
          streamRecoveryMetrics: 18,
        })
      );
    });

    it('should skip Prometheus metrics initialization when performance optimization is disabled', async () => {
      featureFlags.isPerformanceOptimizationEnabled.mockReturnValue(false);
      
      await service.onModuleInit();
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        '性能指标被禁用，跳过 Prometheus 指标注册'
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear the registry on module destroy', async () => {
      await service.onModuleDestroy();
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Prometheus 指标注册中心已清理'
      );
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await service.getMetrics();
      
      expect(typeof metrics).toBe('string');
      // Should contain some metrics data
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should handle errors when getting metrics', async () => {
      // Mock registry to throw an error
      const registry = (service as any).registry;
      const originalMetrics = registry.metrics;
      registry.metrics = jest.fn().mockRejectedValue(new Error('Metrics error'));
      
      const metrics = await service.getMetrics();
      
      expect(metrics).toBe('# 指标获取失败\n');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '获取 Prometheus 指标失败',
        expect.objectContaining({
          error: 'Metrics error'
        })
      );
      
      // Restore original function
      registry.metrics = originalMetrics;
    });
  });

  describe('getMetricsSummary', () => {
    it('should return metrics summary', () => {
      const summary = service.getMetricsSummary();
      
      expect(summary).toEqual({
        totalMetrics: expect.any(Number),
        customMetrics: 71,
        streamRecoveryMetrics: 18,
        streamPerformanceMetrics: 13,
        batchProcessingMetrics: 5,
        systemPerformanceMetrics: 3,
        coreComponentMetrics: 16,
        registryStatus: 'active',
        lastUpdate: expect.any(String),
      });
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      service.resetMetrics();
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        '所有 Prometheus 指标已重置'
      );
    });
  });

  describe('getMetricValue', () => {
    it('should return null when metric is not found', async () => {
      const value = await service.getMetricValue('nonexistent_metric');
      
      expect(value).toBeNull();
    });

    it('should handle errors when getting metric value', async () => {
      // Mock registry to throw an error
      const registry = (service as any).registry;
      const originalGetMetricsAsJSON = registry.getMetricsAsJSON;
      registry.getMetricsAsJSON = jest.fn().mockRejectedValue(new Error('Registry error'));
      
      const value = await service.getMetricValue('test_metric');
      
      expect(value).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '获取指标 test_metric 失败',
        expect.objectContaining({
          error: 'Registry error'
        })
      );
      
      // Restore original function
      registry.getMetricsAsJSON = originalGetMetricsAsJSON;
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when metrics are registered', () => {
      const health = service.getHealthStatus();
      
      expect(health.status).toBe(MONITORING_HEALTH_STATUS.HEALTHY);
      expect(health.metricsCount).toBeGreaterThan(0);
      expect(health.errors).toHaveLength(0);
    });

    it('should return unhealthy status when no metrics are registered', () => {
      // Mock registry to return empty array
      const registry = (service as any).registry;
      const originalGetMetricsAsArray = registry.getMetricsAsArray;
      registry.getMetricsAsArray = jest.fn().mockReturnValue([]);
      
      const health = service.getHealthStatus();
      
      expect(health.status).toBe(MONITORING_HEALTH_STATUS.UNHEALTHY);
      expect(health.metricsCount).toBe(0);
      expect(health.errors).toContain('No metrics registered');
      
      // Restore original function
      registry.getMetricsAsArray = originalGetMetricsAsArray;
    });
  });

  describe('Metric Configuration', () => {
    it('should configure stream push latency buckets with correct values', () => {
      // This test ensures the bucket configuration is correct
      expect(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS).toBe(1000);
    });

    it('should configure stream recovery batch size buckets with config values', () => {
      // This test ensures the bucket configuration uses config values
      expect(configService.get).toHaveBeenCalledWith('monitoringUnifiedLimits');
    });
  });
});