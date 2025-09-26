/**
 * HealthAnalyzerService Unit Tests
 * 测试监控健康分析服务的健康报告生成和分析功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigType } from '@nestjs/config';
import { HealthAnalyzerService } from '@monitoring/analyzer/analyzer-health.service';
import { AnalyzerHealthScoreCalculator } from '@monitoring/analyzer/analyzer-score.service';
import { CacheService } from '@cache/services/cache.service';
import { createLogger } from '@common/logging/index';
import { MonitoringUnifiedTtl, MonitoringUnifiedTtlConfig } from '@monitoring/config/unified/monitoring-unified-ttl.config';
import { MONITORING_HEALTH_STATUS } from '@monitoring/constants';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';

// Mock dependencies
jest.mock('@common/logging');
jest.mock('@cache/services/cache.service');
jest.mock('@monitoring/analyzer/analyzer-score.service');

describe('HealthAnalyzerService', () => {
  let service: HealthAnalyzerService;
  let eventBus: jest.Mocked<EventEmitter2>;
  let cacheService: jest.Mocked<CacheService>;
  let healthScoreCalculator: jest.Mocked<AnalyzerHealthScoreCalculator>;
  let ttlConfig: ConfigType<typeof MonitoringUnifiedTtl>;
  let mockLogger: any;

  const mockRawMetrics = {
    requests: [
      {
        endpoint: '/api/users',
        method: 'GET',
        responseTimeMs: 150,
        statusCode: 200,
        timestamp: new Date()
      },
      {
        endpoint: '/api/orders',
        method: 'POST',
        responseTimeMs: 300,
        statusCode: 500,
        timestamp: new Date()
      }
    ],
    database: [
      {
        operation: 'find',
        collection: 'users',
        responseTimeMs: 50,
        success: true,
        timestamp: new Date()
      },
      {
        operation: 'update',
        collection: 'orders',
        responseTimeMs: 150,
        success: false,
        timestamp: new Date()
      }
    ],
    cache: [
      {
        operation: 'get',
        key: 'user:123',
        hit: true,
        responseTimeMs: 5,
        timestamp: new Date()
      },
      {
        operation: 'get',
        key: 'order:456',
        hit: false,
        responseTimeMs: 10,
        timestamp: new Date()
      }
    ],
    system: {
      memory: { used: 1000000, total: 2000000, percentage: 0.5 },
      cpu: { usage: 0.3 },
      uptime: 3600,
      timestamp: new Date()
    }
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

    healthScoreCalculator = {
      calculateOverallHealthScore: jest.fn(),
      getHealthGrade: jest.fn(),
      getHealthStatus: jest.fn(),
      generateHealthRecommendations: jest.fn(),
      calculateApiHealthScore: jest.fn(),
      calculateDatabaseHealthScore: jest.fn(),
      calculateCacheHealthScore: jest.fn(),
      calculateSystemHealthScore: jest.fn()
    } as any;

    ttlConfig = new MonitoringUnifiedTtlConfig();
    ttlConfig.health = 300;
    ttlConfig.trend = 600;
    ttlConfig.performance = 180;
    ttlConfig.alert = 60;
    ttlConfig.cacheStats = 120;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthAnalyzerService,
        {
          provide: AnalyzerHealthScoreCalculator,
          useValue: healthScoreCalculator
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

    service = module.get<HealthAnalyzerService>(HealthAnalyzerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('HealthAnalyzerService');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'HealthAnalyzerService initialized - 健康分析服务已启动'
      );
    });
  });

  describe('generateHealthReport', () => {
    beforeEach(() => {
      // Mock calculator methods
      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(75);
      healthScoreCalculator.getHealthGrade.mockReturnValue('fair');
      healthScoreCalculator.getHealthStatus.mockReturnValue(MONITORING_HEALTH_STATUS.WARNING);
      healthScoreCalculator.calculateApiHealthScore.mockReturnValue(70);
      healthScoreCalculator.calculateDatabaseHealthScore.mockReturnValue(80);
      healthScoreCalculator.calculateCacheHealthScore.mockReturnValue(60);
      healthScoreCalculator.calculateSystemHealthScore.mockReturnValue(90);
      healthScoreCalculator.generateHealthRecommendations.mockReturnValue([
        '优化API响应时间',
        '提高缓存命中率'
      ]);
    });

    it('should generate health report from cache when available', async () => {
      const mockHealthReport = {
        overall: {
          healthScore: 75,
          status: MONITORING_HEALTH_STATUS.WARNING,
          timestamp: new Date()
        },
        components: {
          api: {
            healthScore: 70,
            responseTimeMs: 225,
            errorRate: 0.5
          },
          database: {
            healthScore: 80,
            responseTimeMs: 100,
            errorRate: 0.5
          },
          cache: {
            healthScore: 60,
            hitRate: 0.5,
            responseTimeMs: 8
          },
          system: {
            healthScore: 90,
            memoryUsage: 0.5,
            cpuUsage: 0.3
          }
        },
        recommendations: ['优化API响应时间', '提高缓存命中率']
      };

      cacheService.safeGetOrSet.mockResolvedValue(mockHealthReport);

      const result = await service.generateHealthReport(mockRawMetrics);

      expect(result).toEqual(mockHealthReport);
      expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
        expect.stringContaining('monitoring:health:report_'),
        expect.any(Function),
        { ttl: ttlConfig.health }
      );
    });

    it('should generate new health report when not cached', async () => {
      cacheService.safeGetOrSet.mockImplementation(async (key, factory, options) => {
        return await factory();
      });

      const result = await service.generateHealthReport(mockRawMetrics);

      expect(result).toMatchObject({
        overall: {
          healthScore: 75,
          status: MONITORING_HEALTH_STATUS.WARNING
        },
        components: {
          api: {
            healthScore: 70
          },
          database: {
            healthScore: 80
          },
          cache: {
            healthScore: 60
          },
          system: {
            healthScore: 90
          }
        },
        recommendations: ['优化API响应时间', '提高缓存命中率']
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'health-analyzer',
          metadata: expect.objectContaining({
            type: 'health_analysis',
            healthScore: 75,
            healthStatus: MONITORING_HEALTH_STATUS.WARNING
          })
        })
      );
    });

    it('should emit health warning event when health score is low', async () => {
      cacheService.safeGetOrSet.mockImplementation(async (key, factory, options) => {
        return await factory();
      });
      
      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(30);
      healthScoreCalculator.getHealthStatus.mockReturnValue(MONITORING_HEALTH_STATUS.UNHEALTHY);

      await service.generateHealthReport(mockRawMetrics);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'health-analyzer',
          metadata: expect.objectContaining({
            healthScore: 30,
            trend: MONITORING_HEALTH_STATUS.UNHEALTHY
          })
        })
      );
    });

    it('should return default health report on error', async () => {
      cacheService.safeGetOrSet.mockRejectedValue(new Error('Cache error'));

      const result = await service.generateHealthReport(mockRawMetrics);

      expect(result).toMatchObject({
        overall: {
          healthScore: 50,
          status: MONITORING_HEALTH_STATUS.WARNING
        },
        components: {
          api: {
            healthScore: 50
          },
          database: {
            healthScore: 50
          },
          cache: {
            healthScore: 50
          },
          system: {
            healthScore: 50
          }
        },
        recommendations: ['系统健康检查异常，请检查监控系统状态']
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'health-analyzer',
          metadata: expect.objectContaining({
            error: 'Cache error',
            operation: 'generateHealthReport'
          })
        })
      );
    });
  });

  describe('quickHealthCheck', () => {
    it('should perform quick health check correctly', async () => {
      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(80);
      healthScoreCalculator.getHealthStatus.mockReturnValue(MONITORING_HEALTH_STATUS.HEALTHY);
      healthScoreCalculator.calculateApiHealthScore.mockReturnValue(85);
      healthScoreCalculator.calculateDatabaseHealthScore.mockReturnValue(75);
      healthScoreCalculator.calculateCacheHealthScore.mockReturnValue(90);
      healthScoreCalculator.calculateSystemHealthScore.mockReturnValue(70);

      const result = await service.quickHealthCheck(mockRawMetrics);

      expect(result).toEqual({
        isHealthy: true,
        healthScore: 80,
        status: MONITORING_HEALTH_STATUS.HEALTHY,
        criticalIssues: []
      });
    });

    it('should identify critical issues in quick health check', async () => {
      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(20);
      healthScoreCalculator.getHealthStatus.mockReturnValue(MONITORING_HEALTH_STATUS.UNHEALTHY);
      healthScoreCalculator.calculateApiHealthScore.mockReturnValue(10);
      healthScoreCalculator.calculateDatabaseHealthScore.mockReturnValue(15);
      healthScoreCalculator.calculateCacheHealthScore.mockReturnValue(25);
      healthScoreCalculator.calculateSystemHealthScore.mockReturnValue(30);

      const result = await service.quickHealthCheck(mockRawMetrics);

      expect(result).toEqual({
        isHealthy: false,
        healthScore: 20,
        status: MONITORING_HEALTH_STATUS.UNHEALTHY,
        criticalIssues: [
          'api组件健康分过低: 10',
          'database组件健康分过低: 15',
          'cache组件健康分过低: 25',
          'system组件健康分过低: 30'
        ]
      });
    });

    it('should handle quick health check errors', async () => {
      healthScoreCalculator.calculateOverallHealthScore.mockImplementation(() => {
        throw new Error('Health check error');
      });

      const result = await service.quickHealthCheck(mockRawMetrics);

      expect(result).toEqual({
        isHealthy: false,
        healthScore: 0,
        status: MONITORING_HEALTH_STATUS.UNHEALTHY,
        criticalIssues: ['健康检查系统异常']
      });
    });
  });

  describe('getHealthTrends', () => {
    it('should calculate health trends correctly', async () => {
      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(80);

      const historicalMetrics = [
        { requests: [], database: [], cache: [], system: undefined },
        { requests: [], database: [], cache: [], system: undefined }
      ];
      
      // Mock historical scores
      healthScoreCalculator.calculateOverallHealthScore
        .mockReturnValueOnce(80) // Current score
        .mockReturnValueOnce(70) // Historical score 1
        .mockReturnValueOnce(75); // Historical score 2

      const result = await service.getHealthTrends(mockRawMetrics, historicalMetrics);

      // Average historical score: (70 + 75) / 2 = 72.5
      // Change percentage: ((80 - 72.5) / 72.5) * 100 = 10.34%
      expect(result).toEqual({
        currentScore: 80,
        trend: 'improving',
        changePercentage: 10.34,
        periodComparison: '相比过去2个周期'
      });
    });

    it('should return stable trend when no historical data', async () => {
      const result = await service.getHealthTrends(mockRawMetrics);

      expect(result).toEqual({
        currentScore: 50,
        trend: 'stable',
        changePercentage: 0,
        periodComparison: '无历史数据'
      });
    });

    it('should handle health trends calculation errors', async () => {
      healthScoreCalculator.calculateOverallHealthScore.mockImplementation(() => {
        throw new Error('Trends error');
      });

      const result = await service.getHealthTrends(mockRawMetrics);

      expect(result).toEqual({
        currentScore: 50,
        trend: 'stable',
        changePercentage: 0,
        periodComparison: '趋势分析异常'
      });
    });
  });

  describe('invalidateHealthCache', () => {
    it('should invalidate health-related cache', async () => {
      await service.invalidateHealthCache();

      expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:health:*');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'HealthAnalyzer: 健康相关缓存已失效',
        expect.objectContaining({
          component: 'HealthAnalyzerService',
          operation: 'invalidateHealthCache',
          success: true
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'health-analyzer',
          metadata: {
            pattern: 'health_*',
            reason: 'manual_invalidation'
          }
        })
      );
    });

    it('should handle cache invalidation errors gracefully', async () => {
      cacheService.delByPattern.mockRejectedValue(new Error('Delete error'));

      await service.invalidateHealthCache();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '健康缓存失效失败',
        expect.any(String)
      );
    });
  });

  describe('Private Helper Methods', () => {
    describe('identifyCriticalIssues', () => {
      it('should identify critical issues correctly', () => {
        const componentScores = {
          api: 25,
          database: 30,
          cache: 40,
          system: 80
        };

        const result = (service as any).identifyCriticalIssues(mockRawMetrics, componentScores);

        expect(result).toEqual([
          'api组件健康分过低: 25',
          'database组件健康分过低: 30',
          'cache组件健康分过低: 40'
        ]);
      });

      it('should identify specific metric issues', () => {
        const componentScores = {
          api: 50,
          database: 50,
          cache: 50,
          system: 50
        };

        // Create metrics with issues
        const badMetrics = {
          requests: [
            { statusCode: 500, responseTimeMs: 3000, timestamp: new Date() },
            { statusCode: 500, responseTimeMs: 3000, timestamp: new Date() },
            { statusCode: 200, responseTimeMs: 3000, timestamp: new Date() }
          ],
          database: [
            { responseTimeMs: 2000, success: false, timestamp: new Date() }
          ],
          cache: [],
          system: {
            memory: { percentage: 0.95 },
            cpu: { usage: 0.95 },
            uptime: 3600
          }
        };

        const result = (service as any).identifyCriticalIssues(badMetrics, componentScores);

        expect(result).toEqual(
          expect.arrayContaining([
            expect.stringContaining('API错误率过高'),
            expect.stringContaining('API响应时间过慢'),
            expect.stringContaining('数据库失败率过高'),
            expect.stringContaining('CPU使用率过高'),
            expect.stringContaining('内存使用率过高')
          ])
        );
      });
    });

    describe('analyzeHealthTrends', () => {
      it('should analyze health trends correctly', () => {
        const result = (service as any).analyzeHealthTrends(40, {
          api: 30,
          database: 50,
          cache: 60,
          system: 20
        });

        expect(result).toBe('整体健康状况需要关注；api、system组件需要优化');
      });

      it('should return positive message for healthy system', () => {
        const result = (service as any).analyzeHealthTrends(80, {
          api: 80,
          database: 85,
          cache: 75,
          system: 90
        });

        expect(result).toBe('系统运行良好');
      });
    });

    describe('buildCacheKey', () => {
      it('should build cache key correctly', () => {
        const result = (service as any).buildCacheKey('test', mockRawMetrics);
        expect(result).toContain('test_');
        expect(typeof result).toBe('string');
      });
    });

    describe('generateMetricsHash', () => {
      it('should generate metrics hash correctly', () => {
        const result = (service as any).generateMetricsHash(mockRawMetrics);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('getDefaultHealthReport', () => {
      it('should return default health report', () => {
        const result = (service as any).getDefaultHealthReport();
        
        expect(result).toMatchObject({
          overall: {
            healthScore: 50,
            status: MONITORING_HEALTH_STATUS.WARNING
          },
          components: {
            api: { healthScore: 50 },
            database: { healthScore: 50 },
            cache: { healthScore: 50 },
            system: { healthScore: 50 }
          },
          recommendations: ['系统健康检查异常，请检查监控系统状态']
        });
      });
    });
  });
});