import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CollectorService } from '@monitoring/collector/collector.service';
import { CollectorRepository } from '@monitoring/collector/collector.repository';
import { SYSTEM_STATUS_EVENTS, DataRequestEvent } from '@monitoring/contracts/events/system-status.events';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';
import * as os from 'os';
import * as v8 from 'v8';

describe('CollectorService', () => {
  let service: CollectorService;
  let repository: jest.Mocked<CollectorRepository>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    systemLimits: {
      maxBufferSize: 1000,
    },
  };

  beforeEach(async () => {
    const mockRepository = {
      findMetrics: jest.fn(),
      saveRawMetrics: jest.fn(),
      deleteOldMetrics: jest.fn(),
    };

    const mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectorService,
        {
          provide: CollectorRepository,
          useValue: mockRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CollectorService>(CollectorService);
    repository = module.get(CollectorRepository);
    eventBus = module.get(EventEmitter2);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct buffer size from config', () => {
      expect(configService.get).toHaveBeenCalledWith('monitoringUnifiedLimits');
    });
  });

  describe('lifecycle methods', () => {
    it('should handle module initialization', () => {
      service.onModuleInit();
      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle module destruction', () => {
      service.onModuleDestroy();
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('handleDataRequest', () => {
    const mockRequestEvent: DataRequestEvent = {
      timestamp: new Date(),
      source: 'analyzer',
      requestId: 'test-request-123',
      requestType: 'raw_metrics',
      startTime: new Date(Date.now() - 60000),
      endTime: new Date(),
      metadata: {
        requester: 'AnalyzerService',
      },
    };

    it('should handle raw_metrics request successfully', async () => {
      const mockRawData = {
        requests: [
          {
            type: 'request',
            endpoint: '/api/test',
            method: 'GET',
            statusCode: 200,
            responseTimeMs: 100,
            timestamp: new Date(),
          },
        ],
        database: [],
        cache: [],
      };

      repository.findMetrics.mockResolvedValue(mockRawData);

      await service.handleDataRequest(mockRequestEvent);

      expect(repository.findMetrics).toHaveBeenCalledWith(
        mockRequestEvent.startTime,
        mockRequestEvent.endTime,
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.DATA_RESPONSE,
        expect.objectContaining({
          requestId: mockRequestEvent.requestId,
          responseType: 'raw_metrics',
          data: mockRawData,
          dataSize: 1, // requests.length + database.length + cache.length
        }),
      );
    });

    it('should handle unknown request type', async () => {
      const unknownRequestEvent: DataRequestEvent = {
        ...mockRequestEvent,
        requestType: 'unknown_type' as any,
      };

      await service.handleDataRequest(unknownRequestEvent);

      expect(repository.findMetrics).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.DATA_RESPONSE,
        expect.anything(),
      );
    });

    it('should handle repository error', async () => {
      const error = new Error('Repository error');
      repository.findMetrics.mockRejectedValue(error);

      await service.handleDataRequest(mockRequestEvent);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.DATA_NOT_AVAILABLE,
        expect.objectContaining({
          requestId: mockRequestEvent.requestId,
          metadata: { error: error.message },
        }),
      );
    });
  });

  describe('recordRequest', () => {
    it('should record HTTP request metrics', () => {
      const endpoint = '/api/test';
      const method = 'GET';
      const statusCode = 200;
      const responseTimeMs = 150;
      const metadata = { userId: 'user123' };

      service.recordRequest(endpoint, method, statusCode, responseTimeMs, metadata);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'collector',
          metricType: 'request',
          metricName: 'http_request',
          metricValue: responseTimeMs,
          tags: expect.objectContaining({
            method: method.toLowerCase(),
            status: statusCode.toString(),
            operation: 'data_request',
            endpoint,
            statusCode,
          }),
        }),
      );
    });

    it('should handle request recording with minimal data', () => {
      service.recordRequest('/api/minimal', 'POST', 201, 75);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'request',
          metricValue: 75,
          tags: expect.objectContaining({
            method: 'post',
            status: '201',
            endpoint: '/api/minimal',
            statusCode: 201,
          }),
        }),
      );
    });
  });

  describe('recordDatabaseOperation', () => {
    it('should record database operation metrics', () => {
      const operation = 'find';
      const responseTimeMs = 50;
      const success = true;
      const metadata = { collection: 'users' };

      service.recordDatabaseOperation(operation, responseTimeMs, success, metadata);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'collector',
          metricType: 'database',
          metricName: 'database_operation',
          metricValue: responseTimeMs,
          tags: expect.objectContaining({
            operation,
            storage_type: 'database',
            success,
          }),
        }),
      );
    });

    it('should record failed database operations', () => {
      service.recordDatabaseOperation('update', 200, false);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            success: false,
          }),
        }),
      );
    });
  });

  describe('recordCacheOperation', () => {
    it('should record cache hit operation', () => {
      const operation = 'get';
      const hit = true;
      const responseTimeMs = 5;

      service.recordCacheOperation(operation, hit, responseTimeMs);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'collector',
          metricType: 'cache',
          metricName: 'cache_operation',
          metricValue: 1, // hit = true -> 1
          tags: expect.objectContaining({
            operation,
            storage_type: 'cache',
            cache_layer: 'redis',
            hit,
            responseTimeMs,
          }),
        }),
      );
    });

    it('should record cache miss operation', () => {
      service.recordCacheOperation('get', false, 15);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricValue: 0, // hit = false -> 0
          tags: expect.objectContaining({
            hit: false,
          }),
        }),
      );
    });
  });

  describe('recordSystemMetrics', () => {
    it('should record system metrics', () => {
      const metrics = {
        memory: { used: 1024, total: 2048, percentage: 0.5 },
        cpu: { usage: 0.3 },
        uptime: 3600,
        timestamp: new Date(),
      };

      service.recordSystemMetrics(metrics);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'collector',
          metricType: 'system',
          metricName: 'system_metrics',
          metricValue: metrics.memory.percentage,
          tags: expect.objectContaining({
            data_type: 'memory',
            storage_type: 'system',
          }),
          metadata: metrics,
        }),
      );
    });
  });

  describe('collectRequestMetrics', () => {
    it('should collect request performance metrics', async () => {
      const data = {
        timestamp: new Date(),
        source: 'api',
        layer: 'controller',
        operation: 'getUserData',
        responseTimeMs: 120,
        statusCode: 200,
        success: true,
        metadata: { method: 'GET' },
      };

      await service.collectRequestMetrics(data);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: data.source,
          metricType: 'request',
          metricName: 'performance_request',
          metricValue: data.responseTimeMs,
          tags: expect.objectContaining({
            method: 'GET',
            status: '200',
            operation: data.operation,
            provider: 'internal',
          }),
        }),
      );
    });

    it('should handle request metrics without method metadata', async () => {
      const data = {
        timestamp: new Date(),
        source: 'api',
        layer: 'service',
        operation: 'processData',
        responseTimeMs: 90,
        statusCode: 201,
        success: true,
      };

      await service.collectRequestMetrics(data);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            method: 'unknown',
          }),
        }),
      );
    });
  });

  describe('collectPerformanceData', () => {
    it('should collect performance data', async () => {
      const data = {
        timestamp: new Date(),
        source: 'service',
        layer: 'business',
        operation: 'calculateMetrics',
        responseTimeMs: 80,
        success: true,
        metadata: { type: 'computation' },
      };

      await service.collectPerformanceData(data);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'computation',
          metricName: data.operation,
          metricValue: data.responseTimeMs,
          tags: expect.objectContaining({
            operation_type: data.operation,
            provider: 'internal',
          }),
        }),
      );
    });

    it('should handle performance data without type metadata', async () => {
      const data = {
        timestamp: new Date(),
        source: 'worker',
        layer: 'background',
        operation: 'processQueue',
        responseTimeMs: 200,
        success: false,
      };

      await service.collectPerformanceData(data);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'unknown',
        }),
      );
    });
  });

  describe('getRawMetrics', () => {
    it('should get raw metrics successfully', async () => {
      const mockData = {
        requests: [{ type: 'request', endpoint: '/api/test' }],
        database: [{ type: 'database', operation: 'find' }],
        cache: [{ type: 'cache', operation: 'get', hit: true }],
        system: { memory: { used: 1024 }, cpu: { usage: 0.2 } },
      };

      repository.findMetrics.mockResolvedValue(mockData);

      const startTime = new Date(Date.now() - 60000);
      const endTime = new Date();

      const result = await service.getRawMetrics(startTime, endTime);

      expect(repository.findMetrics).toHaveBeenCalledWith(startTime, endTime);
      expect(result).toEqual({
        requests: mockData.requests,
        database: mockData.database,
        cache: mockData.cache,
        system: mockData.system,
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED,
        expect.objectContaining({
          source: 'collector',
          metadata: expect.objectContaining({
            dataPoints: 3, // requests + database + cache
            timeRange: { startTime, endTime },
          }),
        }),
      );
    });

    it('should handle repository error gracefully', async () => {
      const error = new Error('Database connection failed');
      repository.findMetrics.mockRejectedValue(error);

      const result = await service.getRawMetrics();

      expect(result).toEqual({
        requests: [],
        database: [],
        cache: [],
        system: undefined,
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
        expect.objectContaining({
          source: 'collector',
          metadata: { error: error.message, operation: 'getRawMetrics' },
        }),
      );
    });

    it('should handle null data from repository', async () => {
      repository.findMetrics.mockResolvedValue({
        requests: null,
        database: null,
        cache: null,
        system: null,
      });

      const result = await service.getRawMetrics();

      expect(result).toEqual({
        requests: [],
        database: [],
        cache: [],
        system: null,
      });
    });
  });

  describe('getSystemMetrics', () => {
    beforeEach(() => {
      // Mock Node.js system functions
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1024 * 1024 * 100, // 100MB
        heapTotal: 1024 * 1024 * 50,
        heapUsed: 1024 * 1024 * 30,
        external: 1024 * 1024 * 5,
        arrayBuffers: 1024 * 1024 * 2,
      });

      jest.spyOn(v8, 'getHeapStatistics').mockReturnValue({
        heap_size_limit: 1024 * 1024 * 512, // 512MB limit
      } as any);

      jest.spyOn(os, 'cpus').mockReturnValue([
        { model: 'Intel', speed: 2400 } as any,
        { model: 'Intel', speed: 2400 } as any,
      ]);

      jest.spyOn(os, 'loadavg').mockReturnValue([0.8, 0.6, 0.4]);
      jest.spyOn(process, 'uptime').mockReturnValue(7200); // 2 hours
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should get system metrics successfully', async () => {
      const result = await service.getSystemMetrics();

      expect(result).toMatchObject({
        memory: {
          used: 1024 * 1024 * 100,
          total: 1024 * 1024 * 512,
          percentage: expect.any(Number),
        },
        cpu: {
          usage: expect.any(Number),
        },
        uptime: 7200,
        timestamp: expect.any(Date),
      });

      expect(result.memory.percentage).toBeCloseTo(0.1953125); // 100/512
      expect(result.cpu.usage).toBeCloseTo(0.4); // 0.8 / 2 cpus
    });

    it('should handle system metrics error', async () => {
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('System error');
      });

      const result = await service.getSystemMetrics();

      expect(result).toEqual({
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        uptime: 0,
        timestamp: expect.any(Date),
      });
    });

    it('should handle no CPUs available', async () => {
      jest.spyOn(os, 'cpus').mockReturnValue([]);

      const result = await service.getSystemMetrics();

      expect(result.cpu.usage).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup old data successfully', async () => {
      repository.deleteOldMetrics.mockResolvedValue(undefined);

      const olderThan = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      await service.cleanup(olderThan);

      expect(repository.deleteOldMetrics).toHaveBeenCalledWith(olderThan);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_CLEANUP,
        expect.objectContaining({
          source: 'collector',
          metadata: { cutoffDate: olderThan },
        }),
      );
    });

    it('should cleanup with default cutoff date', async () => {
      repository.deleteOldMetrics.mockResolvedValue(undefined);

      await service.cleanup();

      expect(repository.deleteOldMetrics).toHaveBeenCalledWith(
        expect.any(Date),
      );
    });

    it('should handle cleanup error', async () => {
      const error = new Error('Cleanup failed');
      repository.deleteOldMetrics.mockRejectedValue(error);

      await service.cleanup();

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
        expect.objectContaining({
          source: 'collector',
          metadata: { error: error.message, operation: 'cleanup' },
        }),
      );
    });
  });

  describe('flushBuffer', () => {
    it('should flush buffer when buffer has metrics', async () => {
      // First add some metrics to buffer
      service.recordRequest('/api/test', 'GET', 200, 100);

      repository.saveRawMetrics.mockResolvedValue(undefined);

      await service.flushBuffer();

      expect(repository.saveRawMetrics).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'request',
            endpoint: '/api/test',
          }),
        ]),
      );
    });

    it('should not flush empty buffer', async () => {
      await service.flushBuffer();

      expect(repository.saveRawMetrics).not.toHaveBeenCalled();
    });

    it('should handle flush error', async () => {
      service.recordRequest('/api/error', 'POST', 500, 200);

      const error = new Error('Save failed');
      repository.saveRawMetrics.mockRejectedValue(error);

      await service.flushBuffer();

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
        expect.objectContaining({
          source: 'collector',
          metadata: { error: error.message, operation: 'flushBuffer' },
        }),
      );
    });
  });

  describe('getCollectorStatus', () => {
    it('should return collector status', () => {
      const status = service.getCollectorStatus();

      expect(status).toMatchObject({
        bufferSize: expect.any(Number),
        maxBufferSize: 1000,
        isHealthy: expect.any(Boolean),
        lastFlush: expect.any(Date),
      });
    });

    it('should indicate unhealthy when buffer is nearly full', () => {
      // Add metrics to fill buffer to > 90%
      for (let i = 0; i < 950; i++) {
        service.recordRequest(`/api/load-test-${i}`, 'GET', 200, 50);
      }

      const status = service.getCollectorStatus();

      expect(status.isHealthy).toBe(false);
      expect(status.bufferSize).toBeGreaterThan(900);
    });

    it('should emit buffer full event when max size exceeded', () => {
      // Fill buffer beyond max size
      for (let i = 0; i < 1001; i++) {
        service.recordRequest(`/api/overflow-${i}`, 'GET', 200, 50);
      }

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_BUFFER_FULL,
        expect.objectContaining({
          source: 'collector',
          metadata: {
            bufferSize: 1000, // Should be capped at maxBufferSize
            maxSize: 1000,
          },
        }),
      );
    });
  });
});