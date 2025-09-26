/**
 * Monitoring Contracts Index Unit Tests
 * 测试监控合约模块的统一导出功能
 */

import {
  // Core interfaces (as types only)
  type ICollector,
  type RawMetric,
  type SystemMetricsDto,
  type RawMetricsDto,
  type IAnalyzer,
  type AnalysisOptions,
  type PerformanceSummary,
  type SuggestionDto,
  type BaseHealthMetrics,
  type BaseTimestamp,
  type BaseTrendMetric,
  type BasePerformanceSummary,
  type BaseEndpointIdentifier,
  type BaseCacheMetrics,
  type TimestampedHealthMetrics,
  type TimestampedPerformanceSummary,
  type ComponentHealthStatus,

  // DTO Classes (for instantiation - core DTOs)
  CollectedDataDto,
  RequestMetricDto,
  DatabaseMetricDto,
  CacheMetricDto,
  SystemMetricDto,
  PerformanceSummaryDto,
  EndpointMetricDto,
  DatabaseAnalysisDto,
  CacheAnalysisDto,
  BaseHealthDto,
  ApiHealthDto,
  DatabaseHealthDto,
  CacheHealthDto,
  SystemHealthDto,
  SystemComponentsHealthDto,
  PerformanceSummaryDataDto,
  OptimizationSuggestionDto,
  AnalyzedDataDto,

  // Note: Response DTOs are not directly exported from main contracts index

  // Events
  SYSTEM_STATUS_EVENTS,
  type SystemStatusEventData,
  type MetricCollectedEvent,
  type AnalysisCompletedEvent,
  type DataRequestEvent,
  type DataResponseEvent,
  type CacheOperationEvent,
  type HealthCheckEvent,
  type TrendDetectedEvent,
  type ApiRequestEvent,
  type ErrorHandledEvent,
  type CrossLayerOperationEvent,
  type SystemPerformanceAlertEvent,
  type SystemStatusEventMap,

  // Enums
  OperationStatus,
  isSuccessOperation,
  isFailureOperation,
  isInProgressOperation,
  ALL_OPERATION_STATUSES,

  // Tokens
  MONITORING_COLLECTOR_TOKEN,
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
  COMMON_CACHE_CONFIG_TOKEN,
} from '@monitoring/contracts';

describe('MonitoringContractsIndex', () => {
  describe('Interface Exports', () => {
    it('should export collector interfaces', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const rawMetric: RawMetric = {
        type: 'request',
        responseTimeMs: 100,
        timestamp: new Date(),
      };
      
      const systemMetrics: SystemMetricsDto = {
        memory: { used: 100, total: 200, percentage: 0.5 },
        cpu: { usage: 0.5 },
        uptime: 3600,
        timestamp: new Date(),
      };
      
      const rawMetrics: RawMetricsDto = {
        requests: [],
        database: [],
        cache: [],
      };
      
      expect(rawMetric).toBeDefined();
      expect(systemMetrics).toBeDefined();
      expect(rawMetrics).toBeDefined();
    });

    it('should export analyzer interfaces', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const options: AnalysisOptions = {
        startTime: new Date(),
        endTime: new Date(),
      };
      
      const summary: PerformanceSummary = {
        totalOperations: 100,
        successfulRequests: 90,
        failedRequests: 10,
        responseTimeMs: 50,
        errorRate: 0.1,
      };
      
      expect(options).toBeDefined();
      expect(summary).toBeDefined();
    });

    it('should export base interfaces', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseHealth: BaseHealthMetrics = {
        healthScore: 90,
        responseTimeMs: 50,
        errorRate: 0.1,
      };
      
      const baseTimestamp: BaseTimestamp = {
        timestamp: new Date(),
      };
      
      const baseTrend: BaseTrendMetric<number> = {
        current: 100,
        previous: 90,
        trend: 'up',
        changePercentage: 10,
      };
      
      expect(baseHealth).toBeDefined();
      expect(baseTimestamp).toBeDefined();
      expect(baseTrend).toBeDefined();
    });
  });

  describe('DTO Exports', () => {
    it('should export collected data DTOs', () => {
      const dto = new CollectedDataDto();
      expect(dto).toBeInstanceOf(CollectedDataDto);
      
      const requestDto = new RequestMetricDto();
      expect(requestDto).toBeInstanceOf(RequestMetricDto);
      
      const dbDto = new DatabaseMetricDto();
      expect(dbDto).toBeInstanceOf(DatabaseMetricDto);
      
      const cacheDto = new CacheMetricDto();
      expect(cacheDto).toBeInstanceOf(CacheMetricDto);
      
      const systemDto = new SystemMetricDto();
      expect(systemDto).toBeInstanceOf(SystemMetricDto);
    });

    it('should export analyzed data DTOs', () => {
      const dto = new AnalyzedDataDto();
      expect(dto).toBeInstanceOf(AnalyzedDataDto);
      
      const summaryDto = new PerformanceSummaryDto();
      expect(summaryDto).toBeInstanceOf(PerformanceSummaryDto);
      
      const endpointDto = new EndpointMetricDto();
      expect(endpointDto).toBeInstanceOf(EndpointMetricDto);
      
      const dbDto = new DatabaseAnalysisDto();
      expect(dbDto).toBeInstanceOf(DatabaseAnalysisDto);
      
      const cacheDto = new CacheAnalysisDto();
      expect(cacheDto).toBeInstanceOf(CacheAnalysisDto);
    });

    it('should export additional analysis DTOs', () => {
      const perfSummaryDto = new PerformanceSummaryDataDto();
      expect(perfSummaryDto).toBeInstanceOf(PerformanceSummaryDataDto);

      const optimizationDto = new OptimizationSuggestionDto();
      expect(optimizationDto).toBeInstanceOf(OptimizationSuggestionDto);

      const systemHealthDto = new SystemHealthDto();
      expect(systemHealthDto).toBeInstanceOf(SystemHealthDto);

      const systemComponentsDto = new SystemComponentsHealthDto();
      expect(systemComponentsDto).toBeInstanceOf(SystemComponentsHealthDto);
    });
  });

  describe('Event Exports', () => {
    it('should export system status events', () => {
      expect(SYSTEM_STATUS_EVENTS).toBeDefined();
      expect(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED).toBe('system-status.metric.collected');
      expect(SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED).toBe('system-status.analysis.completed');
    });

    it('should export event data types', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const eventData: SystemStatusEventData = {
        timestamp: new Date(),
        source: 'collector',
      };
      
      const metricEvent: MetricCollectedEvent = {
        timestamp: new Date(),
        source: 'collector',
        metricType: 'request',
        metricName: 'test',
        metricValue: 100,
      };
      
      expect(eventData).toBeDefined();
      expect(metricEvent).toBeDefined();
    });
  });

  describe('Enum Exports', () => {
    it('should export operation status enum', () => {
      expect(OperationStatus).toBeDefined();
      expect(OperationStatus.SUCCESS).toBe('success');
      expect(OperationStatus.FAILED).toBe('failed');
    });

    it('should export operation status utility functions', () => {
      expect(typeof isSuccessOperation).toBe('function');
      expect(typeof isFailureOperation).toBe('function');
      expect(typeof isInProgressOperation).toBe('function');
      
      expect(isSuccessOperation(OperationStatus.SUCCESS)).toBe(true);
      expect(isFailureOperation(OperationStatus.FAILED)).toBe(true);
      expect(isInProgressOperation(OperationStatus.PENDING)).toBe(true);
    });

    it('should export all operation statuses array', () => {
      expect(Array.isArray(ALL_OPERATION_STATUSES)).toBe(true);
      expect(ALL_OPERATION_STATUSES.length).toBeGreaterThan(0);
    });
  });

  describe('Token Exports', () => {
    it('should export injection tokens', () => {
      expect(MONITORING_COLLECTOR_TOKEN).toBeDefined();
      expect(CACHE_REDIS_CLIENT_TOKEN).toBeDefined();
      expect(STREAM_CACHE_CONFIG_TOKEN).toBeDefined();
      expect(COMMON_CACHE_CONFIG_TOKEN).toBeDefined();
      
      // Verify they are symbols
      expect(typeof MONITORING_COLLECTOR_TOKEN).toBe('symbol');
      expect(typeof CACHE_REDIS_CLIENT_TOKEN).toBe('symbol');
      expect(typeof STREAM_CACHE_CONFIG_TOKEN).toBe('symbol');
      expect(typeof COMMON_CACHE_CONFIG_TOKEN).toBe('symbol');
    });
  });
});