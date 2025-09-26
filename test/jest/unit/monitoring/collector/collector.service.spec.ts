/**
 * CollectorService Unit Tests
 * 测试监控数据收集器服务的数据收集和管理功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CollectorService } from '@monitoring/collector/collector.service';
import { CollectorRepository } from '@monitoring/collector/collector.repository';
import { createLogger } from '@common/logging/index';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

// Mock dependencies
jest.mock('@common/logging/index');
jest.mock('@monitoring/collector/collector.repository');

describe('CollectorService', () => {
  let service: CollectorService;
  let eventBus: jest.Mocked<EventEmitter2>;
  let repository: jest.Mocked<CollectorRepository>;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    } as any;

    repository = {
      saveRawMetrics: jest.fn(),
      getHistoricalMetrics: jest.fn(),
      findMetrics: jest.fn(),
      deleteOldMetrics: jest.fn()
    } as any;

    configService = {
      get: jest.fn()
    } as any;

    // Mock configuration
    configService.get.mockReturnValue({
      systemLimits: {
        maxBufferSize: 1000
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectorService,
        {
          provide: CollectorRepository,
          useValue: repository
        },
        {
          provide: EventEmitter2,
          useValue: eventBus
        },
        {
          provide: ConfigService,
          useValue: configService
        }
      ]
    }).compile();

    service = module.get<CollectorService>(CollectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('CollectorService');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CollectorService initialized - 纯事件驱动数据收集服务已启动'
      );
    });

    it('should setup event listeners on module init', () => {
      service.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith('CollectorService 事件监听器已注册 - 支持数据请求响应');
    });

    it('should cleanup event listeners on module destroy', () => {
      service.onModuleDestroy();

      expect(mockLogger.log).toHaveBeenCalledWith('CollectorService 事件监听器已清理');
    });
  });

  describe('Event Handlers', () => {
    describe('handleDataRequest', () => {
      it('should handle raw metrics data request correctly', async () => {
        const mockRawMetrics = {
          requests: [],
          database: [],
          cache: [],
          system: undefined
        };

        const requestEvent = {
          timestamp: new Date(),
          source: 'analyzer' as const,
          requestId: 'test-request-123',
          requestType: 'raw_metrics' as const,
          startTime: new Date(),
          endTime: new Date(),
          metadata: {},
          filters: {}
        };

        repository.findMetrics.mockResolvedValue(mockRawMetrics);

        await service.handleDataRequest(requestEvent);

        expect(repository.findMetrics).toHaveBeenCalledWith(
          requestEvent.startTime,
          requestEvent.endTime
        );

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.DATA_RESPONSE,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            requestId: 'test-request-123',
            responseType: 'raw_metrics',
            data: mockRawMetrics
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 数据请求处理完成',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'handleDataRequest',
            requestId: 'test-request-123',
            success: true
          })
        );
      });

      it('should handle unknown request type gracefully', async () => {
        const requestEvent = {
          timestamp: new Date(),
          source: 'analyzer' as const,
          requestId: 'test-request-123',
          requestType: 'unknown_type',
          metadata: {},
          filters: {}
        } as any;

        await service.handleDataRequest(requestEvent);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          '未知的数据请求类型',
          { requestType: 'unknown_type' }
        );
      });

      it('should handle data request errors gracefully', async () => {
        const requestEvent = {
          timestamp: new Date(),
          source: 'analyzer' as const,
          requestId: 'test-request-123',
          requestType: 'raw_metrics' as const,
          metadata: {},
          filters: {}
        };

        repository.findMetrics.mockRejectedValue(new Error('Database error'));

        await service.handleDataRequest(requestEvent);

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.DATA_NOT_AVAILABLE,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            requestId: 'test-request-123',
            metadata: { error: 'Database error' }
          })
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          '处理数据请求失败',
          expect.objectContaining({
            requestId: 'test-request-123',
            error: 'Database error'
          })
        );
      });
    });
  });

  describe('Metric Recording', () => {
    describe('recordRequest', () => {
      it('should record HTTP request metrics correctly', () => {
        const timestamp = new Date();
        jest.useFakeTimers().setSystemTime(timestamp);

        service.recordRequest('/api/users', 'GET', 200, 150, { userId: '123' });

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp,
            source: 'collector',
            metricType: 'request',
            metricName: 'http_request',
            metricValue: 150,
            tags: {
              method: 'get',
              status: '200',
              operation: 'data_request',
              endpoint: '/api/users',
              statusCode: 200
            }
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 记录HTTP请求',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'recordRequest',
            method: 'GET',
            endpoint: '/api/users',
            statusCode: 200,
            responseTimeMs: 150,
            success: true
          })
        );

        jest.useRealTimers();
      });
    });

    describe('recordDatabaseOperation', () => {
      it('should record database operation metrics correctly', () => {
        const timestamp = new Date();
        jest.useFakeTimers().setSystemTime(timestamp);

        service.recordDatabaseOperation('find', 50, true, { collection: 'users' });

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp,
            source: 'collector',
            metricType: 'database',
            metricName: 'database_operation',
            metricValue: 50,
            tags: {
              operation: 'find',
              storage_type: 'database',
              success: true
            }
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 记录数据库操作',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'recordDatabaseOperation',
            dbOperation: 'find',
            responseTimeMs: 50,
            success: true
          })
        );

        jest.useRealTimers();
      });
    });

    describe('recordCacheOperation', () => {
      it('should record cache operation metrics correctly', () => {
        const timestamp = new Date();
        jest.useFakeTimers().setSystemTime(timestamp);

        service.recordCacheOperation('get', true, 5, { key: 'user:123' });

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp,
            source: 'collector',
            metricType: 'cache',
            metricName: 'cache_operation',
            metricValue: 1, // Hit = 1
            tags: {
              operation: 'get',
              storage_type: 'cache',
              cache_layer: 'redis',
              hit: true,
              responseTimeMs: 5
            }
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 记录缓存操作',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'recordCacheOperation',
            cacheOperation: 'get',
            hit: true,
            responseTimeMs: 5,
            success: true
          })
        );

        jest.useRealTimers();
      });
    });

    describe('recordSystemMetrics', () => {
      it('should record system metrics correctly', () => {
        const timestamp = new Date();
        jest.useFakeTimers().setSystemTime(timestamp);

        const systemMetrics = {
          memory: { used: 1000000, total: 2000000, percentage: 0.5 },
          cpu: { usage: 0.3 },
          uptime: 3600,
          timestamp: new Date()
        };

        service.recordSystemMetrics(systemMetrics);

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp,
            source: 'collector',
            metricType: 'system',
            metricName: 'system_metrics',
            metricValue: 0.5,
            tags: {
              data_type: 'memory',
              storage_type: 'system'
            }
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 记录系统指标',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'recordSystemMetrics',
            cpuUsage: 0.3,
            memoryPercentage: 0.5,
            uptime: 3600,
            success: true
          })
        );

        jest.useRealTimers();
      });
    });
  });

  describe('Data Collection Methods', () => {
    describe('collectRequestMetrics', () => {
      it('should collect request metrics correctly', async () => {
        const timestamp = new Date();
        const data = {
          timestamp,
          source: 'api',
          layer: 'controller',
          operation: 'getUsers',
          responseTimeMs: 150,
          statusCode: 200,
          success: true,
          metadata: { method: 'GET' }
        };

        await service.collectRequestMetrics(data);

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp,
            source: 'api',
            metricType: 'request',
            metricName: 'performance_request',
            metricValue: 150,
            tags: {
              method: 'GET',
              status: '200',
              operation: 'getUsers',
              provider: 'internal'
            }
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 收集请求性能数据',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'collectRequestMetrics',
            requestOperation: 'getUsers',
            responseTimeMs: 150,
            statusCode: 200,
            source: 'api',
            success: true
          })
        );
      });
    });

    describe('collectPerformanceData', () => {
      it('should collect performance data correctly', async () => {
        const timestamp = new Date();
        const data = {
          timestamp,
          source: 'service',
          layer: 'business',
          operation: 'processData',
          responseTimeMs: 200,
          success: true,
          metadata: { type: 'business' }
        };

        await service.collectPerformanceData(data);

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp,
            source: 'service',
            metricType: 'business',
            metricName: 'processData',
            metricValue: 200,
            tags: {
              operation_type: 'processData',
              provider: 'internal'
            }
          })
        );

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 收集性能数据',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'collectPerformanceData',
            performanceOperation: 'processData',
            metricType: 'business',
            responseTimeMs: 200,
            source: 'service',
            layer: 'business',
            success: true
          })
        );
      });
    });
  });

  describe('Data Retrieval', () => {
    describe('getRawMetrics', () => {
      it('should retrieve raw metrics correctly', async () => {
        const mockRawMetrics = {
          requests: [{ endpoint: '/api/users', method: 'GET', statusCode: 200, responseTimeMs: 150, timestamp: new Date() }],
          database: [{ operation: 'find', responseTimeMs: 50, success: true, timestamp: new Date() }],
          cache: [{ operation: 'get', hit: true, responseTimeMs: 5, timestamp: new Date() }],
          system: {
            memory: { used: 1000000, total: 2000000, percentage: 0.5 },
            cpu: { usage: 0.3 },
            uptime: 3600,
            timestamp: new Date()
          }
        };

        repository.findMetrics.mockResolvedValue(mockRawMetrics);

        const result = await service.getRawMetrics(new Date(), new Date());

        expect(result).toEqual(mockRawMetrics);
        expect(repository.findMetrics).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            metadata: {
              dataPoints: 3,
              timeRange: {
                startTime: expect.any(Date),
                endTime: expect.any(Date)
              }
            }
          })
        );
      });

      it('should return empty metrics on error', async () => {
        repository.findMetrics.mockRejectedValue(new Error('Database error'));

        const result = await service.getRawMetrics(new Date(), new Date());

        expect(result).toEqual({
          requests: [],
          database: [],
          cache: [],
          system: undefined
        });

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            metadata: {
              error: 'Database error',
              operation: 'getRawMetrics'
            }
          })
        );
      });
    });

    describe('getSystemMetrics', () => {
      it('should retrieve system metrics correctly', async () => {
        // Mock system metrics
        jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 1000000,
          heapTotal: 2000000,
          heapUsed: 1500000,
          external: 0,
          arrayBuffers: 0
        } as any);

        jest.mock('v8', () => ({
          getHeapStatistics: () => ({
            heap_size_limit: 2000000
          })
        }));

        jest.mock('os', () => ({
          cpus: () => [{}, {}, {}, {}], // 4 CPUs
          loadavg: () => [1.5, 1.2, 1.0]
        }));

        const result = await service.getSystemMetrics();

        expect(result).toMatchObject({
          memory: {
            used: 1000000,
            total: 2000000
          },
          cpu: {
            usage: expect.any(Number)
          },
          uptime: expect.any(Number)
        });

        expect(result.memory.percentage).toBeCloseTo(0.5, 2);
      });

      it('should return default metrics on error', async () => {
        // Mock error
        jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
          throw new Error('System error');
        });

        const result = await service.getSystemMetrics();

        expect(result).toEqual({
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0 },
          uptime: 0,
          timestamp: expect.any(Date)
        });
      });
    });
  });

  describe('Data Management', () => {
    describe('cleanup', () => {
      it('should cleanup old metrics correctly', async () => {
        const cutoffDate = new Date();
        jest.useFakeTimers().setSystemTime(cutoffDate);

        await service.cleanup();

        expect(repository.deleteOldMetrics).toHaveBeenCalledWith(
          new Date(cutoffDate.getTime() - MONITORING_SYSTEM_LIMITS.DAY_IN_MS)
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          `清理完成: 删除 ${new Date(cutoffDate.getTime() - MONITORING_SYSTEM_LIMITS.DAY_IN_MS).toISOString()} 之前的数据`
        );

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.COLLECTION_CLEANUP,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            metadata: {
              cutoffDate: expect.any(Date)
            }
          })
        );

        jest.useRealTimers();
      });

      it('should handle cleanup errors gracefully', async () => {
        repository.deleteOldMetrics.mockRejectedValue(new Error('Delete error'));

        await service.cleanup();

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            metadata: {
              error: 'Delete error',
              operation: 'cleanup'
            }
          })
        );
      });
    });

    describe('flushBuffer', () => {
      it('should flush buffer correctly', async () => {
        // Add some metrics to buffer
        service.recordRequest('/api/test', 'GET', 200, 100);
        service.recordDatabaseOperation('find', 50, true);

        // Mock repository save
        repository.saveRawMetrics.mockResolvedValue(undefined);

        await service.flushBuffer();

        expect(repository.saveRawMetrics).toHaveBeenCalledWith(expect.any(Array));
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Collector: 刷新缓冲区',
          expect.objectContaining({
            component: 'CollectorService',
            operation: 'flushBuffer',
            metricsCount: 2
          })
        );
      });

      it('should handle flush buffer errors gracefully', async () => {
        // Add some metrics to buffer
        service.recordRequest('/api/test', 'GET', 200, 100);

        // Mock repository error
        repository.saveRawMetrics.mockRejectedValue(new Error('Save error'));

        await service.flushBuffer();

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            metadata: {
              error: 'Save error',
              operation: 'flushBuffer'
            }
          })
        );
      });

      it('should do nothing when buffer is empty', async () => {
        await service.flushBuffer();

        expect(repository.saveRawMetrics).not.toHaveBeenCalled();
      });
    });
  });

  describe('Status Management', () => {
    describe('getCollectorStatus', () => {
      it('should return collector status correctly', () => {
        // Add some metrics to buffer
        service.recordRequest('/api/test', 'GET', 200, 100);

        const result = service.getCollectorStatus();

        expect(result).toEqual({
          bufferSize: 1,
          maxBufferSize: 1000,
          isHealthy: true,
          lastFlush: expect.any(Date)
        });
      });

      it('should indicate unhealthy when buffer is nearly full', () => {
        // Fill buffer to 90% capacity
        for (let i = 0; i < 900; i++) {
          service.recordRequest(`/api/test${i}`, 'GET', 200, 100);
        }

        const result = service.getCollectorStatus();

        expect(result.isHealthy).toBe(false);
      });
    });
  });

  describe('Private Helper Methods', () => {
    describe('addMetricToBuffer', () => {
      it('should add metric to buffer correctly', () => {
        const metric = {
          type: 'request' as const,
          endpoint: '/api/test',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
          metadata: {}
        };

        (service as any).addMetricToBuffer(metric);

        // Access private buffer
        const buffer = (service as any).metricsBuffer;
        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toEqual(metric);
      });

      it('should handle buffer overflow correctly', () => {
        // Set small buffer size
        (service as any).maxBufferSize = 2;

        // Add 3 metrics to trigger overflow
        const metric1 = { type: 'request' as const, endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date(), metadata: {} };
        const metric2 = { type: 'request' as const, endpoint: '/api/test2', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date(), metadata: {} };
        const metric3 = { type: 'request' as const, endpoint: '/api/test3', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date(), metadata: {} };

        (service as any).addMetricToBuffer(metric1);
        (service as any).addMetricToBuffer(metric2);
        (service as any).addMetricToBuffer(metric3);

        const buffer = (service as any).metricsBuffer;
        expect(buffer).toHaveLength(2);
        expect(buffer[0]).toEqual(metric2); // First metric should be removed
        expect(buffer[1]).toEqual(metric3);

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.COLLECTION_BUFFER_FULL,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'collector',
            metadata: {
              bufferSize: 2,
              maxSize: 2
            }
          })
        );
      });
    });
  });
});