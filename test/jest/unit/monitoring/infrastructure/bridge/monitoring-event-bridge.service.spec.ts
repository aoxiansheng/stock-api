/**
 * MonitoringEventBridgeService Unit Tests
 * 测试监控事件桥接服务的事件处理、批处理和指标聚合功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { MonitoringEventBridgeService } from '@monitoring/infrastructure/bridge/monitoring-event-bridge.service';
import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';
import { createLogger } from '@common/logging/index';
import { EventBatcher } from '@monitoring/infrastructure/bridge/event-batcher';
import { performanceDecoratorBus } from '@monitoring/infrastructure/decorators/infrastructure-database.decorator';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

// Mock dependencies
jest.mock('@common/logging/index');
jest.mock('@monitoring/infrastructure/bridge/event-batcher');
jest.mock('@monitoring/infrastructure/decorators/infrastructure-database.decorator', () => ({
  performanceDecoratorBus: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

describe('MonitoringEventBridgeService', () => {
  let service: MonitoringEventBridgeService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let metricsRegistry: jest.Mocked<MetricsRegistryService>;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: any;
  let mockBatcher: jest.Mocked<EventBatcher>;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    } as any;

    metricsRegistry = {
      receiverRequestsTotal: { inc: jest.fn() },
      storageCacheEfficiency: { set: jest.fn() },
      storageOperationsTotal: { inc: jest.fn() },
      streamSymbolsProcessedTotal: { inc: jest.fn() },
      querySymbolsProcessedTotal: { inc: jest.fn() },
      receiverProcessingDuration: { observe: jest.fn() },
      transformerOperationsTotal: { inc: jest.fn() },
      transformerBatchSize: { observe: jest.fn() },
      receiverActiveConnections: { inc: jest.fn(), dec: jest.fn() },
      receiverErrorRate: { set: jest.fn() },
      storageDataVolume: { set: jest.fn() },
      systemCpuUsagePercent: { set: jest.fn() },
      streamErrorRate: { set: jest.fn() },
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'monitoringUnifiedLimits') {
          return {
            dataProcessingBatch: { standard: 10 },
            systemLimits: { maxQueueSize: 10000 },
          };
        }
        return undefined;
      }),
    } as any;

    mockBatcher = {
      add: jest.fn(),
      flushAll: jest.fn(),
      flushType: jest.fn(),
      shutdown: jest.fn(),
      getMetrics: jest.fn(),
      getStatus: jest.fn(),
    } as any;

    (EventBatcher as jest.Mock).mockImplementation(() => mockBatcher);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringEventBridgeService,
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: MetricsRegistryService,
          useValue: metricsRegistry,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<MonitoringEventBridgeService>(MonitoringEventBridgeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('monitoringUnifiedLimits');
      expect(EventBatcher).toHaveBeenCalledWith(200, 10, 10000);
    });

    it('should handle missing configuration gracefully', () => {
      configService.get.mockReturnValue(undefined);

      const module = Test.createTestingModule({
        providers: [
          MonitoringEventBridgeService,
          { provide: EventEmitter2, useValue: eventEmitter },
          { provide: MetricsRegistryService, useValue: metricsRegistry },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      expect(module).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize properly on module init', () => {
      service.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith('监控事件桥接层已启动', {
        eventsSupported: ['METRIC_COLLECTED', 'CACHE_HIT/MISS', 'ANALYSIS_COMPLETED', 'API_REQUEST_*'],
      });
      expect(performanceDecoratorBus.on).toHaveBeenCalledWith('performance-metric', expect.any(Function));
    });

    it('should handle decorator event subscription failure gracefully', () => {
      (performanceDecoratorBus.on as jest.Mock).mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      expect(() => service.onModuleInit()).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '监控事件桥接层已启动',
        expect.any(Object)
      );
    });

    it('should shutdown gracefully on module destroy', async () => {
      mockBatcher.shutdown.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockLogger.log).toHaveBeenCalledWith('监控事件桥接层正在关闭...');
      expect(mockBatcher.shutdown).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('事件批处理器已关闭');
    });
  });

  describe('Performance Decorator Bridge', () => {
    it('should bridge performance decorator events to system events', () => {
      service.onModuleInit();

      const performanceMetricCallback = (performanceDecoratorBus.on as jest.Mock).mock.calls[0][1];
      const testPayload = { metric: 'test', value: 100 };

      performanceMetricCallback(testPayload);

      expect(eventEmitter.emit).toHaveBeenCalledWith(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, testPayload);
    });

    it('should handle performance decorator bridge errors gracefully', () => {
      service.onModuleInit();
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      const performanceMetricCallback = (performanceDecoratorBus.on as jest.Mock).mock.calls[0][1];

      expect(() => performanceMetricCallback({ metric: 'test' })).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'EventBridge: 装饰器事件桥接失败',
        expect.objectContaining({
          component: 'MonitoringEventBridge',
          operation: 'decoratorEventBridge',
          success: false,
        })
      );
    });
  });

  describe('Metric Collected Event Handling', () => {
    beforeEach(() => {
      mockBatcher.add.mockReturnValue({ accepted: true, shouldFlush: false });
    });

    it('should handle metric collected event with batching', () => {
      const event = {
        metricType: 'request',
        metricName: 'api_requests',
        metricValue: 1,
        tags: { method: 'GET' },
      };

      service.handleMetricCollected(event);

      expect(mockBatcher.add).toHaveBeenCalledWith('request', event);
    });

    it('should handle events with missing metricType', () => {
      const event = {
        metricName: 'api_requests',
        metricValue: 1,
        tags: { method: 'GET' },
      };

      service.handleMetricCollected(event);

      expect(mockBatcher.add).toHaveBeenCalledWith('unknown', event);
    });

    it('should handle batch queue full scenario', () => {
      mockBatcher.add.mockReturnValue({
        accepted: false,
        reason: 'queue_full',
        droppedCount: 5,
      });

      const event = { metricType: 'request', metricValue: 1 };

      service.handleMetricCollected(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '事件批处理队列已满，事件被丢弃',
        {
          reason: 'queue_full',
          droppedCount: 5,
        }
      );
    });

    it('should trigger batch processing when shouldFlush is true', () => {
      mockBatcher.add.mockReturnValue({ accepted: true, shouldFlush: true });
      mockBatcher.flushType.mockReturnValue({
        events: [{ metricName: 'test', metricValue: 1 }],
        count: 1,
        firstTimestamp: Date.now() - 100,
        lastTimestamp: Date.now(),
        type: 'request',
      });

      const event = { metricType: 'request', metricValue: 1 };

      service.handleMetricCollected(event);

      expect(mockBatcher.flushType).toHaveBeenCalledWith('request');
    });

    it('should force flush when event counter threshold reached', () => {
      mockBatcher.flushAll.mockReturnValue([]);

      // Simulate reaching threshold
      for (let i = 0; i < MONITORING_SYSTEM_LIMITS.EVENT_COUNTER_THRESHOLD; i++) {
        service.handleMetricCollected({ metricType: 'test', metricValue: 1 });
      }

      expect(mockBatcher.flushAll).toHaveBeenCalled();
    });

    it('should handle metric collected event processing errors gracefully', () => {
      mockBatcher.add.mockImplementation(() => {
        throw new Error('Batcher error');
      });

      const event = { metricType: 'request', metricValue: 1 };

      expect(() => service.handleMetricCollected(event)).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'EventBridge: 指标收集事件处理失败',
        expect.objectContaining({
          component: 'MonitoringEventBridge',
          operation: 'handleMetricCollected',
          success: false,
        })
      );
    });
  });

  describe('Event Aggregation', () => {
    it('should aggregate events with same metric name and tags', () => {
      const events = [
        { metricName: 'api_requests', metricValue: 1, tags: { method: 'GET' } },
        { metricName: 'api_requests', metricValue: 1, tags: { method: 'GET' } },
        { metricName: 'api_requests', metricValue: 2, tags: { method: 'POST' } },
      ];

      const result = (service as any).aggregateEvents(events);

      expect(result.size).toBe(2); // Two unique metric+tag combinations

      const entries = Array.from(result.values());
      const getMetric = entries.find((e: any) => e.tags?.method === 'GET') as any;
      const postMetric = entries.find((e: any) => e.tags?.method === 'POST') as any;

      expect(getMetric?.count).toBe(2);
      expect(getMetric?.value).toBe(2);
      expect(postMetric?.count).toBe(1);
      expect(postMetric?.value).toBe(2);
    });

    it('should handle events without tags', () => {
      const events = [
        { metricName: 'api_requests', metricValue: 1 },
        { metricName: 'api_requests', metricValue: 2 },
      ];

      const result = (service as any).aggregateEvents(events);

      expect(result.size).toBe(1);
      const metric = Array.from(result.values())[0] as any;
      expect(metric?.count).toBe(2);
      expect(metric?.value).toBe(3);
      expect(metric?.tags).toEqual({});
    });
  });

  describe('Batch Metrics Update', () => {
    it('should update request metrics for request event type', () => {
      const aggregatedMetrics = new Map();
      aggregatedMetrics.set('key1', {
        count: 5,
        value: 10,
        tags: { method: 'GET', endpoint: '/api/test' },
        metricName: 'api_requests',
      });

      (service as any).updateMetricsBatch('request', aggregatedMetrics);

      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith(
        { method: 'GET', endpoint: '/api/test' },
        5
      );
    });

    it('should update cache metrics with label filtering', () => {
      const aggregatedMetrics = new Map();
      aggregatedMetrics.set('key1', {
        count: 2,
        value: 100,
        tags: { cache_type: 'redis', operation: 'get', extra_tag: 'ignored' },
        metricName: 'cache_efficiency',
      });

      (service as any).updateMetricsBatch('cache', aggregatedMetrics);

      expect(metricsRegistry.storageCacheEfficiency.set).toHaveBeenCalledWith(
        { cache_type: 'redis', operation: 'get' },
        50 // value / count = 100 / 2
      );
    });

    it('should update database metrics', () => {
      const aggregatedMetrics = new Map();
      aggregatedMetrics.set('key1', {
        count: 3,
        value: 6,
        tags: { operation: 'insert' },
        metricName: 'db_operations',
      });

      (service as any).updateMetricsBatch('database', aggregatedMetrics);

      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith(
        { operation: 'insert' },
        3
      );
    });

    it('should handle unknown event types with default metrics', () => {
      const aggregatedMetrics = new Map();
      aggregatedMetrics.set('key1', {
        count: 1,
        value: 1,
        tags: { custom: 'tag' },
        metricName: 'custom_metric',
      });

      (service as any).updateMetricsBatch('unknown_type', aggregatedMetrics);

      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith(
        { custom: 'tag', metric_type: 'unknown_type' },
        1
      );
    });

    it('should handle metrics update errors gracefully', () => {
      (metricsRegistry.receiverRequestsTotal.inc as jest.Mock).mockImplementation(() => {
        throw new Error('Metrics error');
      });

      const aggregatedMetrics = new Map();
      aggregatedMetrics.set('key1', {
        count: 1,
        value: 1,
        tags: {},
        metricName: 'test_metric',
      });

      expect(() => (service as any).updateMetricsBatch('request', aggregatedMetrics)).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'EventBridge: 批量指标更新失败',
        expect.objectContaining({
          component: 'MonitoringEventBridge',
          operation: 'updateMetricsBatch',
          success: false,
        })
      );
    });
  });

  describe('Cache Event Handlers', () => {
    it('should handle cache hit event', () => {
      const event = {
        type: SYSTEM_STATUS_EVENTS.CACHE_HIT,
        key: 'test_key',
        metadata: { cache_type: 'redis' },
      };

      service.handleCacheEvent(event);

      expect(metricsRegistry.storageCacheEfficiency.set).toHaveBeenCalledWith(
        { cache_type: 'redis', operation: 'test_key' },
        1
      );
      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith({
        operation: 'cache_hit',
        storage_type: 'redis',
      });
    });

    it('should handle cache miss event', () => {
      const event = {
        type: SYSTEM_STATUS_EVENTS.CACHE_MISS,
        key: 'test_key',
        metadata: { cache_type: 'memory' },
      };

      service.handleCacheEvent(event);

      expect(metricsRegistry.storageCacheEfficiency.set).toHaveBeenCalledWith(
        { cache_type: 'memory', operation: 'test_key' },
        0
      );
      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith({
        operation: 'cache_miss',
        storage_type: 'redis',
      });
    });

    it('should handle cache set event with metadata', () => {
      const event = {
        metadata: { size: 1024 },
      };

      service.handleCacheSetEvent(event);

      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith({
        operation: 'cache_set',
        storage_type: 'redis',
      });
      expect(metricsRegistry.storageDataVolume.set).toHaveBeenCalledWith(
        { data_type: 'cache', storage_type: 'redis' },
        1024
      );
    });

    it('should handle cache invalidation event', () => {
      const event = {};

      service.handleCacheInvalidatedEvent(event);

      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith({
        operation: 'cache_invalidated',
        storage_type: 'redis',
      });
    });

    it('should handle cache error event', () => {
      const event = {};

      service.handleCacheErrorEvent(event);

      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith({
        operation: 'cache_error',
        storage_type: 'redis',
      });
      expect(metricsRegistry.receiverErrorRate.set).toHaveBeenCalledWith(
        { error_type: 'cache' },
        1
      );
    });
  });

  describe('API Event Handlers', () => {
    it('should handle API request started event', () => {
      const event = {
        method: 'GET',
        endpoint: '/api/users',
      };

      service.handleApiRequestStarted(event);

      expect(metricsRegistry.receiverActiveConnections.inc).toHaveBeenCalledWith({
        connection_type: 'api',
      });
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        status: 'started',
        provider: 'api',
        operation: '/api/users',
      });
    });

    it('should handle API request completed event', () => {
      const event = {
        duration: 150,
        statusCode: 200,
        method: 'POST',
        endpoint: '/api/data',
      };

      service.handleApiRequestCompleted(event);

      expect(metricsRegistry.receiverActiveConnections.dec).toHaveBeenCalledWith({
        connection_type: 'api',
      });
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'POST',
        status: '200',
        provider: 'api',
        operation: '/api/data',
      });
      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
    });

    it('should handle API request error event', () => {
      const event = {
        duration: 300,
        statusCode: 500,
        method: 'PUT',
        endpoint: '/api/update',
        metadata: { errorType: 'validation_error' },
      };

      service.handleApiRequestError(event);

      expect(metricsRegistry.receiverActiveConnections.dec).toHaveBeenCalledWith({
        connection_type: 'api',
      });
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'PUT',
        status: 'error',
        provider: 'api',
        operation: '/api/update',
        error_type: 'validation_error',
      });
      expect(metricsRegistry.receiverErrorRate.set).toHaveBeenCalledWith(
        { error_type: 'api' },
        1
      );
    });
  });

  describe('Analysis Event Handler', () => {
    it('should handle analysis completed event', () => {
      const event = {
        duration: 5000,
        dataPoints: 100,
        analysisType: 'trend_analysis',
      };

      service.handleAnalysisCompleted(event);

      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
      expect(metricsRegistry.transformerOperationsTotal.inc).toHaveBeenCalledWith({
        operation_type: 'analysis_trend_analysis',
        provider: 'internal',
      });
      expect(metricsRegistry.transformerBatchSize.observe).toHaveBeenCalledWith(
        { operation_type: 'analysis' },
        100
      );
    });

    it('should handle analysis event without optional fields', () => {
      const event = { duration: 1000 };

      service.handleAnalysisCompleted(event);

      expect(metricsRegistry.transformerOperationsTotal.inc).toHaveBeenCalledWith({
        operation_type: 'analysis_general',
        provider: 'internal',
      });
    });
  });

  describe('Health and Trend Event Handlers', () => {
    it('should handle health score updated event', () => {
      const event = {
        component: 'api',
        score: 85,
        status: 'healthy',
      };

      service.handleHealthScoreUpdated(event);

      expect(metricsRegistry.systemCpuUsagePercent.set).toHaveBeenCalledWith(0.85);
      expect(metricsRegistry.storageOperationsTotal.inc).toHaveBeenCalledWith({
        operation: 'health_check',
        storage_type: 'api',
      });
    });

    it('should handle trend detected event', () => {
      const event = {
        metric: 'response_time',
        trendType: 'increasing',
        changePercentage: 25,
        severity: 'high',
      };

      service.handleTrendDetected(event);

      expect(metricsRegistry.transformerOperationsTotal.inc).toHaveBeenCalledWith({
        operation_type: 'trend_analysis',
        provider: 'internal',
      });
      expect(metricsRegistry.streamErrorRate.set).toHaveBeenCalledWith(
        { error_category: 'trend_anomaly' },
        0.25
      );
    });

    it('should handle trend event without high severity', () => {
      const event = {
        metric: 'response_time',
        trendType: 'stable',
        changePercentage: 5,
        severity: 'low',
      };

      service.handleTrendDetected(event);

      expect(metricsRegistry.transformerOperationsTotal.inc).toHaveBeenCalled();
      expect(metricsRegistry.streamErrorRate.set).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should return event bridge metrics', () => {
      const mockBatcherMetrics = {
        totalEvents: 100,
        droppedEvents: 2,
        batchCount: 5,
        isShuttingDown: false,
        queueUtilization: 45.5,
      };
      const mockBatcherStatus = {
        status: 'healthy' as const,
        reason: undefined,
        metrics: {
          totalEvents: 100,
          droppedEvents: 0,
          batchCount: 5,
          isShuttingDown: false,
          queueUtilization: 0,
        },
      };

      mockBatcher.getMetrics.mockReturnValue(mockBatcherMetrics);
      mockBatcher.getStatus.mockReturnValue(mockBatcherStatus);

      const metrics = service.getEventBridgeMetrics();

      expect(metrics).toEqual({
        totalEventsProcessed: expect.any(Number),
        lastFlushTime: expect.any(String),
        status: 'active',
        batcher: {
          metrics: mockBatcherMetrics,
          status: 'healthy',
          reason: undefined,
        },
      });
    });

    it('should return batcher status', () => {
      const mockStatus = {
        status: 'degraded' as const,
        reason: 'high_utilization',
        metrics: {
          totalEvents: 1000,
          droppedEvents: 50,
          batchCount: 25,
          isShuttingDown: false,
          queueUtilization: 85.0,
        },
      };

      mockBatcher.getStatus.mockReturnValue(mockStatus);

      const status = service.getBatcherStatus();

      expect(status).toBe(mockStatus);
    });

    it('should force flush batches', () => {
      mockBatcher.flushAll.mockReturnValue([]);

      service.forceFlushBatches();

      expect(mockBatcher.flushAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle all event handler errors gracefully', () => {
      const eventHandlers = [
        'handleCacheEvent',
        'handleCacheSetEvent',
        'handleCacheInvalidatedEvent',
        'handleCacheErrorEvent',
        'handleAnalysisCompleted',
        'handleApiRequestStarted',
        'handleApiRequestCompleted',
        'handleApiRequestError',
        'handleHealthScoreUpdated',
        'handleTrendDetected',
      ];

      eventHandlers.forEach(handlerName => {
        // Mock metrics to throw errors
        Object.values(metricsRegistry).forEach((metric: any) => {
          if (metric.inc) (metric.inc as jest.Mock).mockImplementationOnce(() => { throw new Error('Metric error'); });
          if (metric.set) (metric.set as jest.Mock).mockImplementationOnce(() => { throw new Error('Metric error'); });
          if (metric.observe) (metric.observe as jest.Mock).mockImplementationOnce(() => { throw new Error('Metric error'); });
          if (metric.dec) (metric.dec as jest.Mock).mockImplementationOnce(() => { throw new Error('Metric error'); });
        });

        expect(() => (service as any)[handlerName]({})).not.toThrow();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('事件处理失败'),
          expect.objectContaining({ success: false })
        );
      });
    });

    it('should handle batch processing errors', () => {
      mockBatcher.flushType.mockReturnValue({
        events: [{ metricName: 'test', metricValue: 1 }],
        count: 1,
        firstTimestamp: Date.now() - 100,
        lastTimestamp: Date.now(),
        type: 'request',
      });

      (metricsRegistry.receiverRequestsTotal.inc as jest.Mock).mockImplementation(() => {
        throw new Error('Processing error');
      });

      expect(() => (service as any).processBatch('request')).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'EventBridge: 批处理失败',
        expect.objectContaining({
          component: 'MonitoringEventBridge',
          operation: 'processBatch',
          success: false,
        })
      );
    });

    it('should handle flush all batches errors', () => {
      mockBatcher.flushAll.mockReturnValue([
        {
          events: [{ metricName: 'test', metricValue: 1 }],
          count: 1,
          type: 'request',
          firstTimestamp: Date.now(),
          lastTimestamp: Date.now(),
        },
      ]);

      (metricsRegistry.receiverRequestsTotal.inc as jest.Mock).mockImplementation(() => {
        throw new Error('Flush error');
      });

      expect(() => (service as any).flushAllBatches()).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'EventBridge: 批量刷新失败',
        expect.objectContaining({
          component: 'MonitoringEventBridge',
          operation: 'flushAllBatches',
          success: false,
        })
      );
    });
  });

  describe('Event Processing Flow', () => {
    it('should process complete event flow from collection to metrics', () => {
      // Setup batch to trigger flush
      mockBatcher.add.mockReturnValue({ accepted: true, shouldFlush: true });
      mockBatcher.flushType.mockReturnValue({
        events: [
          { metricName: 'api_requests', metricValue: 1, tags: { method: 'GET' } },
          { metricName: 'api_requests', metricValue: 1, tags: { method: 'GET' } },
        ],
        count: 2,
        firstTimestamp: Date.now() - 100,
        lastTimestamp: Date.now(),
        type: 'request',
      });

      const event = {
        metricType: 'request',
        metricName: 'api_requests',
        metricValue: 1,
        tags: { method: 'GET' },
      };

      service.handleMetricCollected(event);

      expect(mockBatcher.add).toHaveBeenCalledWith('request', event);
      expect(mockBatcher.flushType).toHaveBeenCalledWith('request');
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith(
        { method: 'GET' },
        2 // Aggregated count
      );
    });
  });
});