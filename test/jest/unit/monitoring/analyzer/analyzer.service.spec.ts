/**
 * AnalyzerService Unit Tests
 * 测试监控分析器服务的事件驱动架构、性能分析和数据处理功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigType } from '@nestjs/config';
import { AnalyzerService } from '@monitoring/analyzer/analyzer.service';
import { AnalyzerMetricsCalculator } from '@monitoring/analyzer/analyzer-metrics.service';
import { AnalyzerHealthScoreCalculator } from '@monitoring/analyzer/analyzer-score.service';
import { HealthAnalyzerService } from '@monitoring/analyzer/analyzer-health.service';
import { TrendAnalyzerService } from '@monitoring/analyzer/analyzer-trend.service';
import { CacheService } from '@cache/services/cache.service';
import { createLogger } from '@common/logging/index';
import { MonitoringUnifiedTtl } from '@monitoring/config/unified/monitoring-unified-ttl.config';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { MONITORING_ERROR_CODES } from '@monitoring/constants/monitoring-error-codes.constants';
import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';
import { EndpointMetricsDto } from '@monitoring/contracts/interfaces/analyzer.interface';

// Mock dependencies
jest.mock('@common/logging/index');
jest.mock('@cache/services/cache.service');
jest.mock('@monitoring/analyzer/analyzer-metrics.service');
jest.mock('@monitoring/analyzer/analyzer-score.service');
jest.mock('@monitoring/analyzer/analyzer-health.service');
jest.mock('@monitoring/analyzer/analyzer-trend.service');

describe('AnalyzerService', () => {
  let service: AnalyzerService;
  let eventBus: jest.Mocked<EventEmitter2>;
  let cacheService: jest.Mocked<CacheService>;
  let metricsCalculator: jest.Mocked<AnalyzerMetricsCalculator>;
  let healthScoreCalculator: jest.Mocked<AnalyzerHealthScoreCalculator>;
  let healthAnalyzer: jest.Mocked<HealthAnalyzerService>;
  let trendAnalyzer: jest.Mocked<TrendAnalyzerService>;
  let ttlConfig: ConfigType<typeof MonitoringUnifiedTtl>;
  let mockLogger: any;

  const mockRawMetrics = {
    requests: [
      {
        endpoint: '/api/users',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
        timestamp: new Date()
      },
      {
        endpoint: '/api/orders',
        method: 'POST',
        responseTime: 300,
        statusCode: 201,
        timestamp: new Date()
      }
    ],
    database: [
      {
        operation: 'find',
        collection: 'users',
        executionTime: 50,
        success: true,
        timestamp: new Date()
      }
    ],
    cache: [
      {
        operation: 'get',
        key: 'user:123',
        hit: true,
        responseTime: 5,
        timestamp: new Date()
      }
    ]
  };

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

    cacheService = {
      safeGet: jest.fn(),
      safeSet: jest.fn(),
      safeGetOrSet: jest.fn(),
      delByPattern: jest.fn()
    } as any;

    metricsCalculator = {
      calculatePerformanceSummary: jest.fn(),
      calculateAverageResponseTime: jest.fn(),
      calculateErrorRate: jest.fn(),
      calculateThroughput: jest.fn(),
      calculateEndpointMetrics: jest.fn(),
      calculateDatabaseMetrics: jest.fn(),
      calculateCacheMetrics: jest.fn()
    } as any;

    healthScoreCalculator = {
      calculateOverallHealthScore: jest.fn()
    } as any;

    healthAnalyzer = {
      generateHealthReport: jest.fn(),
      invalidateHealthCache: jest.fn()
    } as any;

    trendAnalyzer = {
      calculatePerformanceTrends: jest.fn(),
      invalidateTrendsCache: jest.fn()
    } as any;

    ttlConfig = {
      health: 300,
      trend: 600,
      performance: 180,
      alert: 60,
      cacheStats: 120,
      getDefaultHealthTtl: jest.fn().mockReturnValue(300),
      getDefaultTrendTtl: jest.fn().mockReturnValue(600),
      getDefaultPerformanceTtl: jest.fn().mockReturnValue(180),
      getDefaultAlertTtl: jest.fn().mockReturnValue(60),
      getDefaultCacheStatsTtl: jest.fn().mockReturnValue(120),
      adjustForEnvironment: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyzerService,
        {
          provide: AnalyzerMetricsCalculator,
          useValue: metricsCalculator
        },
        {
          provide: AnalyzerHealthScoreCalculator,
          useValue: healthScoreCalculator
        },
        {
          provide: HealthAnalyzerService,
          useValue: healthAnalyzer
        },
        {
          provide: TrendAnalyzerService,
          useValue: trendAnalyzer
        },
        {
          provide: CacheService,
          useValue: cacheService
        },
        {
          provide: EventEmitter2,
          useValue: eventBus
        },
        {
          provide: MonitoringUnifiedTtl.KEY,
          useValue: ttlConfig
        }
      ]
    }).compile();

    service = module.get<AnalyzerService>(AnalyzerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('AnalyzerService');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'AnalyzerService initialized - 事件驱动分析器服务已启动'
      );
    });

    it('should setup event listeners on module init', () => {
      service.onModuleInit();

      expect(eventBus.on).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED,
        expect.any(Function)
      );
      expect(eventBus.on).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
        expect.any(Function)
      );
      expect(mockLogger.log).toHaveBeenCalledWith('事件监听器已注册');
    });

    it('should cleanup event listeners on module destroy', () => {
      service.onModuleInit();

      // Mock some pending requests
      const mockRequestId = 'test-request-123';
      (service as any).dataRequestPromises.set(mockRequestId, {
        resolve: jest.fn(),
        reject: jest.fn(),
        timeout: setTimeout(() => {}, 1000)
      });

      service.onModuleDestroy();

      expect(eventBus.off).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('事件监听器已清理');
    });
  });

  describe('Event Handlers', () => {
    describe('handleDataResponse', () => {
      it('should handle data response events correctly', async () => {
        const requestId = 'test-request-123';
        const mockResolve = jest.fn();
        const mockTimeout = setTimeout(() => {}, 1000);

        // Setup pending request
        (service as any).dataRequestPromises.set(requestId, {
          resolve: mockResolve,
          reject: jest.fn(),
          timeout: mockTimeout
        });

        const responseEvent = {
          requestId,
          responseType: "raw_metrics" as const,
          source: "collector" as const,
          data: mockRawMetrics,
          dataSize: 1024,
          timestamp: new Date()
        };

        service.handleDataResponse(responseEvent);

        expect(mockResolve).toHaveBeenCalledWith(mockRawMetrics);
        expect((service as any).dataRequestPromises.has(requestId)).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Analyzer: 数据响应处理完成',
          expect.objectContaining({
            component: 'AnalyzerService',
            operation: 'handleDataResponse',
            requestId,
            success: true
          })
        );
      });

      it('should handle unknown request ID gracefully', () => {
        const responseEvent = {
          requestId: 'unknown-request',
          responseType: "raw_metrics" as const,
          source: "collector" as const,
          data: mockRawMetrics,
          dataSize: 1024,
          timestamp: new Date()
        };

        service.handleDataResponse(responseEvent);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          '收到未知请求ID的数据响应',
          { requestId: 'unknown-request' }
        );
      });
    });

    describe('handleDataNotAvailable', () => {
      it('should handle data not available events', () => {
        const requestId = 'test-request-123';
        const mockReject = jest.fn();
        const mockTimeout = setTimeout(() => {}, 1000);

        // Setup pending request
        (service as any).dataRequestPromises.set(requestId, {
          resolve: jest.fn(),
          reject: mockReject,
          timeout: mockTimeout
        });

        const errorEvent = {
          requestId,
          metadata: { error: 'Data source unavailable' },
          timestamp: new Date()
        };

        service.handleDataNotAvailable(errorEvent);

        expect(mockReject).toHaveBeenCalled();
        expect((service as any).dataRequestPromises.has(requestId)).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Analyzer: 数据不可用事件处理完成',
          expect.objectContaining({
            component: 'AnalyzerService',
            operation: 'handleDataNotAvailable',
            requestId,
            success: false
          })
        );
      });
    });
  });

  describe('Performance Analysis', () => {
    beforeEach(() => {
      // Mock successful data request
      jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockRawMetrics);

      // Mock calculator methods
      metricsCalculator.calculatePerformanceSummary.mockReturnValue({
        totalOperations: 100,
        successfulRequests: 95,
        failedRequests: 5,
        responseTimeMs: 200,
        errorRate: 0.05
      });
      metricsCalculator.calculateAverageResponseTime.mockReturnValue(200);
      metricsCalculator.calculateErrorRate.mockReturnValue(0.05);
      metricsCalculator.calculateThroughput.mockReturnValue(50);
      metricsCalculator.calculateEndpointMetrics.mockReturnValue([]);
      metricsCalculator.calculateDatabaseMetrics.mockReturnValue({
        totalOperations: 10,
        responseTimeMs: 50,
        slowQueries: 1,
        failedOperations: 0,
        errorRate: 0
      });
      metricsCalculator.calculateCacheMetrics.mockReturnValue({
        totalOperations: 20,
        hits: 18,
        misses: 2,
        hitRate: 0.9,
        responseTimeMs: 5
      });

      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(85);
    });

    describe('getPerformanceAnalysis', () => {
      it('should return complete performance analysis with details', async () => {
        const mockTrends = {
          responseTimeMs: { current: 200, previous: 180, trend: 'up' as const, changePercentage: 11.1 },
          errorRate: { current: 0.05, previous: 0.03, trend: 'up' as const, changePercentage: 66.7 },
          throughput: { current: 50, previous: 45, trend: 'up' as const, changePercentage: 11.1 }
        };

        jest.spyOn(service, 'calculateTrends').mockResolvedValue(mockTrends);

        const result = await service.getPerformanceAnalysis();

        expect(result).toMatchObject({
          timestamp: expect.any(Date),
          summary: expect.any(Object),
          responseTimeMs: 200,
          errorRate: 0.05,
          throughput: 50,
          healthScore: 85,
          trends: mockTrends,
          endpointMetrics: expect.any(Array),
          databaseMetrics: expect.any(Object),
          cacheMetrics: expect.any(Object)
        });

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'analyzer',
            metadata: expect.objectContaining({
              type: 'performance_analysis',
              healthScore: 85
            })
          })
        );
      });

      it('should return analysis without details when includeDetails is false', async () => {
        const result = await service.getPerformanceAnalysis({ includeDetails: false });

        expect(result.trends).toBeUndefined();
        expect(result.endpointMetrics).toBeUndefined();
        expect(result.databaseMetrics).toBeUndefined();
        expect(result.cacheMetrics).toBeUndefined();
        expect(result.healthScore).toBe(85);
      });

      it('should handle analysis errors gracefully', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Data request failed')
        );

        await expect(service.getPerformanceAnalysis()).rejects.toThrow('Data request failed');

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'analyzer',
            metadata: {
              error: 'Data request failed',
              operation: 'getPerformanceAnalysis'
            }
          })
        );
      });
    });

    describe('getHealthScore', () => {
      it('should return health score from cache or calculate new one', async () => {
        cacheService.safeGetOrSet.mockResolvedValue(85);

        const result = await service.getHealthScore();

        expect(result).toBe(85);
        expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
          MonitoringCacheKeys.health('score'),
          expect.any(Function),
          { ttl: ttlConfig.health }
        );
      });

      it('should return default health score on error', async () => {
        cacheService.safeGetOrSet.mockRejectedValue(new Error('Cache error'));

        const result = await service.getHealthScore();

        expect(result).toBe(50);
        expect(mockLogger.error).toHaveBeenCalledWith(
          '健康分获取失败',
          expect.any(String)
        );
      });

      it('should emit health score updated event', async () => {
        const mockFactory = jest.fn().mockResolvedValue(75);
        cacheService.safeGetOrSet.mockImplementation(async (key, factory, options) => {
          return await factory();
        });
        jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockRawMetrics);
        healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(75);

        await service.getHealthScore();

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'analyzer',
            metadata: expect.objectContaining({
              healthScore: 75,
              trend: expect.any(String)
            })
          })
        );
      });
    });

    describe('getHealthReport', () => {
      it('should return health report from health analyzer', async () => {
        const mockHealthReport = {
          overall: {
            healthScore: 85,
            status: 'healthy' as const,
            timestamp: new Date()
          },
          components: {
            api: {
              healthScore: 85,
              responseTimeMs: 120,
              errorRate: 0.01
            },
            database: {
              healthScore: 90,
              responseTimeMs: 80,
              errorRate: 0.001
            },
            cache: {
              healthScore: 95,
              hitRate: 0.9,
              responseTimeMs: 5
            },
            system: {
              healthScore: 80,
              memoryUsage: 0.7,
              cpuUsage: 0.4
            }
          },
          recommendations: ['优化数据库查询以提高性能', '添加索引到慢查询', '实施缓存策略']
        };

        jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockRawMetrics);
        healthAnalyzer.generateHealthReport.mockResolvedValue(mockHealthReport);

        const result = await service.getHealthReport();

        expect(result).toBe(mockHealthReport);
        expect(healthAnalyzer.generateHealthReport).toHaveBeenCalledWith(mockRawMetrics);
      });

      it('should handle health report generation errors', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Data unavailable')
        );

        await expect(service.getHealthReport()).rejects.toThrow('Data unavailable');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '健康报告获取失败',
          expect.any(String)
        );
      });
    });
  });

  describe('Trends Analysis', () => {
    describe('calculateTrends', () => {
      it('should calculate and cache trends for given period', async () => {
        const mockTrends = {
          responseTimeMs: { current: 200, previous: 180, trend: 'up' as const, changePercentage: 11.1 },
          errorRate: { current: 0.05, previous: 0.03, trend: 'up' as const, changePercentage: 66.7 },
          throughput: { current: 50, previous: 45, trend: 'up' as const, changePercentage: 11.1 }
        };

        trendAnalyzer.calculatePerformanceTrends.mockResolvedValue(mockTrends);
        cacheService.safeGetOrSet.mockImplementation(async (key, factory, options) => {
          return await factory();
        });
        jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockRawMetrics);

        const result = await service.calculateTrends('1h');

        expect(result).toBe(mockTrends);
        expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
          MonitoringCacheKeys.trend('trends_1h'),
          expect.any(Function),
          { ttl: ttlConfig.trend }
        );
        expect(trendAnalyzer.calculatePerformanceTrends).toHaveBeenCalled();
      });

      it('should return default trends on error', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Data error')
        );

        const result = await service.calculateTrends('1h');

        expect(result).toMatchObject({
          responseTimeMs: {
            current: 0,
            previous: 0,
            trend: 'stable',
            changePercentage: 0
          },
          errorRate: {
            current: 0,
            previous: 0,
            trend: 'stable',
            changePercentage: 0
          },
          throughput: {
            current: 0,
            previous: 0,
            trend: 'stable',
            changePercentage: 0
          }
        });
      });
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockRawMetrics);
    });

    describe('getEndpointMetrics', () => {
      it('should return endpoint metrics', async () => {
        const mockEndpointMetrics: EndpointMetricsDto[] = [
        {
          endpoint: '/api/search',
          method: 'GET',
          totalOperations: 200,
          responseTimeMs: 300,
          errorRate: 0.07,
          lastUsed: new Date()
        }
      ];

        metricsCalculator.calculateEndpointMetrics.mockReturnValue(mockEndpointMetrics);

        const result = await service.getEndpointMetrics();

        expect(result).toBe(mockEndpointMetrics);
        expect(metricsCalculator.calculateEndpointMetrics).toHaveBeenCalledWith(mockRawMetrics);
      });

      it('should return limited endpoint metrics when limit is specified', async () => {
        const mockEndpointMetrics = Array(10).fill(null).map((_, i) => ({
          endpoint: `/api/endpoint${i}`,
          method: 'GET',
          totalOperations: 100,
          responseTimeMs: 150,
          errorRate: 0.02,
          lastUsed: new Date()
        }));

        metricsCalculator.calculateEndpointMetrics.mockReturnValue(mockEndpointMetrics);

        const result = await service.getEndpointMetrics(5);

        expect(result).toHaveLength(5);
      });

      it('should return empty array on error', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Request failed')
        );

        const result = await service.getEndpointMetrics();

        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          '端点指标获取失败',
          expect.any(String)
        );
      });
    });

    describe('getEndpointMetricsWithPagination', () => {
      it('should return paginated endpoint metrics', async () => {
        const paginatedMetrics: EndpointMetricsDto[] = [
        {
          endpoint: '/api/orders',
          method: 'GET',
          totalOperations: 75,
          responseTimeMs: 180,
          errorRate: 0.03,
          lastUsed: new Date()
        },
        {
          endpoint: '/api/customers',
          method: 'POST',
          totalOperations: 60,
          responseTimeMs: 220,
          errorRate: 0.01,
          lastUsed: new Date()
        }
      ];

        metricsCalculator.calculateEndpointMetrics.mockReturnValue(paginatedMetrics);

        const result = await service.getEndpointMetricsWithPagination(2, 5);

        expect(result.items).toHaveLength(5);
        expect(result.total).toBe(20);
        expect(result.items[0].endpoint).toBe('/api/endpoint5'); // Page 2, starting from index 5
      });
    });

    describe('getDatabaseMetrics', () => {
      it('should return database metrics', async () => {
        const mockDbMetrics = {
          totalOperations: 10,
          responseTimeMs: 50,
          slowQueries: 1,
          failedOperations: 0,
          errorRate: 0
        };

        metricsCalculator.calculateDatabaseMetrics.mockReturnValue(mockDbMetrics);

        const result = await service.getDatabaseMetrics();

        expect(result).toBe(mockDbMetrics);
        expect(metricsCalculator.calculateDatabaseMetrics).toHaveBeenCalledWith(mockRawMetrics);
      });

      it('should return default metrics on error', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Database error')
        );

        const result = await service.getDatabaseMetrics();

        expect(result).toMatchObject({
          totalOperations: 0,
          responseTimeMs: 0,
          slowQueries: 0,
          failedOperations: 0,
          errorRate: 0
        });
      });
    });

    describe('getCacheMetrics', () => {
      it('should return cache metrics', async () => {
        const mockCacheMetrics = {
          totalOperations: 20,
          hits: 18,
          misses: 2,
          hitRate: 0.9,
          responseTimeMs: 5
        };

        metricsCalculator.calculateCacheMetrics.mockReturnValue(mockCacheMetrics);

        const result = await service.getCacheMetrics();

        expect(result).toBe(mockCacheMetrics);
        expect(metricsCalculator.calculateCacheMetrics).toHaveBeenCalledWith(mockRawMetrics);
      });

      it('should return default metrics on error', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Cache error')
        );

        const result = await service.getCacheMetrics();

        expect(result).toMatchObject({
          totalOperations: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          responseTimeMs: 0
        });
      });
    });
  });

  describe('Optimization Suggestions', () => {
    describe('getOptimizationSuggestions', () => {
      it('should return cached optimization suggestions if available', async () => {
        const mockSuggestions = [
          {
            category: 'performance' as const,
            priority: 'high' as const,
            title: '响应时间优化',
            description: '平均响应时间过高',
            action: '优化查询逻辑',
            impact: '显著提升性能'
          }
        ];

        cacheService.safeGet.mockResolvedValue(mockSuggestions);

        const result = await service.getOptimizationSuggestions();

        expect(result).toBe(mockSuggestions);
        expect(cacheService.safeGet).toHaveBeenCalledWith(
          MonitoringCacheKeys.performance('optimization_suggestions')
        );
      });

      it('should generate new suggestions when not cached', async () => {
        const mockHealthReport = {
          overall: {
            healthScore: 60,
            status: 'degraded' as const,
            timestamp: new Date()
          },
          components: {
            api: {
              healthScore: 60,
              responseTimeMs: 250,
              errorRate: 0.08
            },
            database: {
              healthScore: 50,
              responseTimeMs: 200,
              errorRate: 0.05
            },
            cache: {
              healthScore: 70,
              hitRate: 0.8,
              responseTimeMs: 10
            },
            system: {
              healthScore: 65,
              memoryUsage: 0.8,
              cpuUsage: 0.6
            }
          },
          recommendations: ['优化数据库慢查询以提升性能', '添加索引到关键查询', '配置Redis缓存以减少延迟']
        };

        cacheService.safeGet.mockResolvedValue(null);
        jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockRawMetrics);
        healthAnalyzer.generateHealthReport.mockResolvedValue(mockHealthReport);
        metricsCalculator.calculateAverageResponseTime.mockReturnValue(2500);
        metricsCalculator.calculateErrorRate.mockReturnValue(0.08);
        metricsCalculator.calculateThroughput.mockReturnValue(8);

        const result = await service.getOptimizationSuggestions();

        expect(result.length).toBeGreaterThan(0);
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              category: expect.any(String),
              priority: expect.any(String),
              title: expect.any(String),
              description: expect.any(String),
              action: expect.any(String),
              impact: expect.any(String)
            })
          ])
        );

        expect(cacheService.safeSet).toHaveBeenCalledWith(
          MonitoringCacheKeys.performance('optimization_suggestions'),
          expect.any(Array),
          { ttl: ttlConfig.performance }
        );
      });

      it('should return empty array on error', async () => {
        cacheService.safeGet.mockRejectedValue(new Error('Cache error'));

        const result = await service.getOptimizationSuggestions();

        expect(result).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          '优化建议生成失败',
          expect.any(String)
        );
      });
    });
  });

  describe('Cache Management', () => {
    describe('invalidateCache', () => {
      it('should invalidate cache by pattern', async () => {
        await service.invalidateCache('health');

        expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:health:*');
        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'analyzer',
            metadata: {
              pattern: 'health',
              reason: 'manual_invalidation'
            }
          })
        );
      });

      it('should invalidate all cache when no pattern specified', async () => {
        await service.invalidateCache();

        expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:*');
        expect(healthAnalyzer.invalidateHealthCache).toHaveBeenCalled();
        expect(trendAnalyzer.invalidateTrendsCache).toHaveBeenCalled();
      });

      it('should handle invalidation errors gracefully', async () => {
        cacheService.delByPattern.mockRejectedValue(new Error('Delete failed'));

        await service.invalidateCache();

        expect(mockLogger.error).toHaveBeenCalledWith(
          '缓存失效失败',
          expect.any(String)
        );
      });
    });

    describe('getCacheStats', () => {
      it('should calculate cache statistics from metrics', async () => {
        const mockMetricsWithCache = [
          { type: 'cache', metadata: { hit: true } },
          { type: 'cache', metadata: { hit: true } },
          { type: 'cache', metadata: { hit: false } },
          { type: 'cache', metadata: { hit: true } },
          { type: 'api', metadata: {} } // Non-cache metric
        ];

        jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue(mockMetricsWithCache);

        const result = await service.getCacheStats();

        expect(result).toMatchObject({
          hitRate: 0.75, // 3 hits out of 4 cache operations
          totalOperations: 4,
          totalHits: 3,
          totalMisses: 1
        });
      });

      it('should return zero stats when no cache metrics available', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockResolvedValue([]);

        const result = await service.getCacheStats();

        expect(result).toMatchObject({
          hitRate: 0,
          totalOperations: 0,
          totalHits: 0,
          totalMisses: 0
        });
      });

      it('should handle cache stats calculation errors', async () => {
        jest.spyOn(service as any, 'requestRawMetrics').mockRejectedValue(
          new Error('Stats error')
        );

        const result = await service.getCacheStats();

        expect(result).toMatchObject({
          hitRate: 0,
          totalOperations: 0,
          totalHits: 0,
          totalMisses: 0
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          '缓存统计获取失败',
          expect.any(String)
        );
      });
    });
  });

  describe('Private Helper Methods', () => {
    describe('parsePeriodToMs', () => {
      it('should parse different period formats correctly', () => {
        const service_any = service as any;

        expect(service_any.parsePeriodToMs('30s')).toBe(30000);
        expect(service_any.parsePeriodToMs('5m')).toBe(300000);
        expect(service_any.parsePeriodToMs('2h')).toBe(7200000);
        expect(service_any.parsePeriodToMs('1d')).toBe(86400000);
        expect(service_any.parsePeriodToMs('invalid')).toBe(3600000); // Default 1 hour
      });
    });

    describe('categorizeRecommendation', () => {
      it('should categorize recommendations correctly', () => {
        const service_any = service as any;

        expect(service_any.categorizeRecommendation('优化响应时间')).toBe('performance');
        expect(service_any.categorizeRecommendation('减少内存使用')).toBe('resource');
        expect(service_any.categorizeRecommendation('增强安全性')).toBe('security');
        expect(service_any.categorizeRecommendation('其他优化')).toBe('optimization');
      });
    });

    describe('prioritizeRecommendation', () => {
      it('should prioritize recommendations based on health score and content', () => {
        const service_any = service as any;

        expect(service_any.prioritizeRecommendation('严重问题', 30)).toBe('high');
        expect(service_any.prioritizeRecommendation('重要问题', 60)).toBe('medium');
        expect(service_any.prioritizeRecommendation('一般问题', 80)).toBe('low');
      });
    });

    describe('generateAction', () => {
      it('should generate appropriate actions for different recommendation types', () => {
        const service_any = service as any;

        const responseTimeAction = service_any.generateAction('优化响应时间');
        const errorRateAction = service_any.generateAction('降低错误率');
        const cpuAction = service_any.generateAction('优化CPU使用');
        const memoryAction = service_any.generateAction('减少内存占用');
        const cacheAction = service_any.generateAction('改进缓存策略');
        const defaultAction = service_any.generateAction('其他建议');

        expect(responseTimeAction).toContain('优化查询逻辑');
        expect(errorRateAction).toContain('检查错误日志');
        expect(cpuAction).toContain('优化计算密集型操作');
        expect(memoryAction).toContain('检查内存泄漏');
        expect(cacheAction).toContain('优化缓存策略');
        expect(defaultAction).toContain('详细分析问题原因');
      });
    });

    describe('estimateImpact', () => {
      it('should estimate impact based on recommendation type and health score', () => {
        const service_any = service as any;

        const highImpact = service_any.estimateImpact('优化响应时间', 30);
        const mediumImpact = service_any.estimateImpact('优化性能', 60);
        const lowImpact = service_any.estimateImpact('性能调优', 80);

        expect(highImpact).toContain('高影响');
        expect(mediumImpact).toContain('中影响');
        expect(lowImpact).toContain('低影响');
      });
    });
  });

  describe('Data Request Management', () => {
    describe('requestRawMetrics', () => {
      it('should emit data request event and handle response', async () => {
        const mockRequestId = 'test-request-123';
        jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
          return 'mock-timeout' as any;
        });

        // Mock UUID generation
        jest.doMock('uuid', () => ({
          v4: () => 'mock-uuid-12345678'
        }));

        // Start the request
        const requestPromise = (service as any).requestRawMetrics();

        // Simulate successful response
        setTimeout(() => {
          const pendingRequests = (service as any).dataRequestPromises as Map<string, any>;
          const requestEntry = Array.from(pendingRequests.entries())[0];
          if (requestEntry) {
            const [requestId, { resolve }] = requestEntry;
            resolve(mockRawMetrics);
          }
        }, 10);

        const result = await requestPromise;

        expect(eventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.DATA_REQUEST,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'analyzer',
            requestType: 'raw_metrics',
            metadata: {
              requester: 'AnalyzerService'
            }
          })
        );
      });

      it('should handle request timeout', async () => {
        jest.useFakeTimers();

        const requestPromise = (service as any).requestRawMetrics();

        // Advance timers to trigger timeout
        jest.advanceTimersByTime(5001);

        await expect(requestPromise).rejects.toThrow();

        jest.useRealTimers();
      });
    });
  });

  describe('Event-driven Data Collection Integration', () => {
    it('should trigger automatic health analysis on collection completed', async () => {
      const mockHealthScore = 75;
      cacheService.safeGetOrSet.mockResolvedValue(mockHealthScore);

      service.onModuleInit();

      // Find the collection completed handler
      const collectionCompletedCall = eventBus.on.mock.calls.find(
        call => call[0] === SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED
      );
      expect(collectionCompletedCall).toBeDefined();

      // Execute the handler
      const handler = collectionCompletedCall[1];
      await handler({ type: 'metrics', timestamp: new Date() });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Analyzer: 数据收集完成，触发分析流程',
        expect.objectContaining({
          component: 'AnalyzerService',
          operation: 'setupEventListeners',
          success: true
        })
      );
    });

    it('should handle collection error events', async () => {
      service.onModuleInit();

      // Find the collection error handler
      const collectionErrorCall = eventBus.on.mock.calls.find(
        call => call[0] === SYSTEM_STATUS_EVENTS.COLLECTION_ERROR
      );
      expect(collectionErrorCall).toBeDefined();

      // Execute the handler
      const handler = collectionErrorCall[1];
      await handler({ error: 'Collection failed', timestamp: new Date() });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '数据收集错误，可能影响分析准确性',
        expect.objectContaining({
          error: 'Collection failed'
        })
      );
    });
  });
});