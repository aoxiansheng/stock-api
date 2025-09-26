/**
 * TrendAnalyzerService Unit Tests
 * 测试监控趋势分析服务的趋势计算和预测功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrendAnalyzerService } from '@monitoring/analyzer/analyzer-trend.service';
import { AnalyzerMetricsCalculator } from '@monitoring/analyzer/analyzer-metrics.service';
import { CacheService } from '@cache/services/cache.service';
import { createLogger } from '@common/logging/index';
import {
  SYSTEM_STATUS_EVENTS
} from '@monitoring/contracts/events/system-status.events';
import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';
import { MonitoringSerializer } from '@monitoring/utils/monitoring-serializer';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

// Mock dependencies
jest.mock('@common/logging');
jest.mock('@cache/services/cache.service');
jest.mock('@monitoring/analyzer/analyzer-metrics.service');
jest.mock('@monitoring/utils/monitoring-serializer');

describe('TrendAnalyzerService', () => {
  let service: TrendAnalyzerService;
  let eventBus: jest.Mocked<EventEmitter2>;
  let cacheService: jest.Mocked<CacheService>;
  let metricsCalculator: jest.Mocked<AnalyzerMetricsCalculator>;
  let mockLogger: any;

  const mockRawMetrics = {
    requests: [
      {
        endpoint: '/api/users',
        method: 'GET',
        responseTimeMs: 150,
        statusCode: 200,
        timestamp: new Date()
      }
    ],
    database: [
      {
        operation: 'find',
        responseTimeMs: 50,
        success: true,
        timestamp: new Date()
      }
    ],
    cache: [
      {
        operation: 'get',
        hit: true,
        responseTimeMs: 5,
        timestamp: new Date()
      }
    ]
  };

  const mockTrends = {
    responseTimeMs: {
      current: 150,
      previous: 120,
      trend: 'up' as const,
      changePercentage: 25
    },
    errorRate: {
      current: 0,
      previous: 0.05,
      trend: 'down' as const,
      changePercentage: -100
    },
    throughput: {
      current: 60,
      previous: 50,
      trend: 'up' as const,
      changePercentage: 20
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

    metricsCalculator = {
      calculateTrends: jest.fn(),
      calculateAverageResponseTime: jest.fn(),
      calculateErrorRate: jest.fn(),
      calculateThroughput: jest.fn()
    } as any;

    // Mock serializer
    (MonitoringSerializer.serializeTags as jest.Mock).mockReturnValue({
      serialized: 'mock-serialized-data',
      hash: 'mock-hash'
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendAnalyzerService,
        {
          provide: AnalyzerMetricsCalculator,
          useValue: metricsCalculator
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
          provide: 'monitoringUnifiedTtl',
          useValue: { trend: 600 }
        },
        {
          provide: 'monitoringUnifiedLimits',
          useValue: { dataProcessingBatch: { recentMetrics: 5 } }
        }
      ]
    }).compile();

    service = module.get<TrendAnalyzerService>(TrendAnalyzerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('TrendAnalyzerService');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TrendAnalyzerService initialized - 趋势分析服务已启动'
      );
    });
  });

  describe('calculatePerformanceTrends', () => {
    it('should calculate performance trends from cache when available', async () => {
      cacheService.safeGetOrSet.mockResolvedValue(mockTrends);

      const result = await service.calculatePerformanceTrends(mockRawMetrics, mockRawMetrics, '1h');

      expect(result).toEqual(mockTrends);
      expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
        expect.stringContaining('monitoring:trend:performance_1h_'),
        expect.any(Function),
        { ttl: 600 }
      );
    });

    it('should calculate new trends when not cached', async () => {
      cacheService.safeGetOrSet.mockImplementation(async (key, factory, options) => {
        return await factory();
      });
      
      metricsCalculator.calculateTrends.mockReturnValue(mockTrends);

      const result = await service.calculatePerformanceTrends(mockRawMetrics, mockRawMetrics, '1h');

      expect(result).toEqual(mockTrends);
      expect(metricsCalculator.calculateTrends).toHaveBeenCalledWith(mockRawMetrics, mockRawMetrics);
      
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'trend-analyzer',
          metadata: expect.objectContaining({
            type: 'trends_analysis',
            period: '1h'
          })
        })
      );
    });

    it('should return default trends on error', async () => {
      cacheService.safeGetOrSet.mockRejectedValue(new Error('Cache error'));

      const result = await service.calculatePerformanceTrends(mockRawMetrics, mockRawMetrics, '1h');

      expect(result).toEqual({
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

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'trend-analyzer',
          metadata: expect.objectContaining({
            error: 'Cache error',
            operation: 'calculatePerformanceTrends',
            period: '1h'
          })
        })
      );
    });
  });

  describe('getHistoricalTrends', () => {
    it('should analyze historical trends correctly', async () => {
      const metricsHistory = [mockRawMetrics, mockRawMetrics, mockRawMetrics];
      const mockCalculatedTrends = {
        responseTimeMs: {
          current: 150,
          previous: 120,
          trend: 'up' as const,
          changePercentage: 25
        },
        errorRate: {
          current: 0,
          previous: 0.05,
          trend: 'down' as const,
          changePercentage: -100
        },
        throughput: {
          current: 60,
          previous: 50,
          trend: 'up' as const,
          changePercentage: 20
        }
      };

      metricsCalculator.calculateTrends.mockReturnValue(mockCalculatedTrends);

      const result = await service.getHistoricalTrends(metricsHistory, '24h');

      expect(result.trends).toHaveLength(2); // 3 metrics => 2 trends
      expect(result.summary).toBeDefined();
      expect(result.summary.averageResponseTimeMs).toBe(150);
      expect(result.summary.averageErrorRate).toBe(0);
      expect(result.summary.averageThroughput).toBe(60);
    });

    it('should return default historical trends when not enough data', async () => {
      const result = await service.getHistoricalTrends([mockRawMetrics], '24h');

      expect(result).toEqual({
        trends: [],
        summary: {
          averageResponseTimeMs: 0,
          averageErrorRate: 0,
          averageThroughput: 0,
          volatility: {
            responseTimeMs: 0,
            errorRate: 0,
            throughput: 0
          }
        }
      });
    });

    it('should handle historical trends calculation errors', async () => {
      metricsCalculator.calculateTrends.mockImplementation(() => {
        throw new Error('Trends calculation error');
      });

      const result = await service.getHistoricalTrends([mockRawMetrics, mockRawMetrics], '24h');

      expect(result).toEqual({
        trends: [],
        summary: {
          averageResponseTimeMs: 0,
          averageErrorRate: 0,
          averageThroughput: 0,
          volatility: {
            responseTimeMs: 0,
            errorRate: 0,
            throughput: 0
          }
        }
      });
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies correctly', async () => {
      const historicalMetrics = [mockRawMetrics, mockRawMetrics];
      
      // Mock baseline calculations
      metricsCalculator.calculateAverageResponseTime
        .mockReturnValueOnce(300) // Current
        .mockReturnValueOnce(150) // Historical
        .mockReturnValueOnce(150); // Historical
      metricsCalculator.calculateErrorRate
        .mockReturnValueOnce(0.1) // Current
        .mockReturnValueOnce(0.02) // Historical
        .mockReturnValueOnce(0.02); // Historical
      metricsCalculator.calculateThroughput
        .mockReturnValueOnce(120) // Current
        .mockReturnValueOnce(60) // Historical
        .mockReturnValueOnce(60); // Historical

      const result = await service.detectAnomalies(mockRawMetrics, historicalMetrics);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toHaveLength(3); // All three metrics have anomalies
      expect(result.anomalies[0].type).toBe('response_time');
      expect(result.anomalies[1].type).toBe('error_rate');
      expect(result.anomalies[2].type).toBe('throughput');
    });

    it('should return no anomalies when metrics are normal', async () => {
      const historicalMetrics = [mockRawMetrics, mockRawMetrics];
      
      // Mock normal baseline
      metricsCalculator.calculateAverageResponseTime.mockReturnValue(150);
      metricsCalculator.calculateErrorRate.mockReturnValue(0.02);
      metricsCalculator.calculateThroughput.mockReturnValue(60);

      const result = await service.detectAnomalies(mockRawMetrics, historicalMetrics);

      expect(result.hasAnomalies).toBe(false);
      expect(result.anomalies).toHaveLength(0);
    });

    it('should handle anomaly detection when no historical data', async () => {
      const result = await service.detectAnomalies(mockRawMetrics, []);

      expect(result).toEqual({
        hasAnomalies: false,
        anomalies: []
      });
    });

    it('should emit anomaly detected event when anomalies found', async () => {
      const historicalMetrics = [mockRawMetrics, mockRawMetrics];
      
      // Mock anomalous data
      metricsCalculator.calculateAverageResponseTime
        .mockReturnValueOnce(300) // Current (2x baseline)
        .mockReturnValueOnce(150) // Historical
        .mockReturnValueOnce(150); // Historical

      metricsCalculator.calculateErrorRate.mockReturnValue(0.02);
      metricsCalculator.calculateThroughput.mockReturnValue(60);

      await service.detectAnomalies(mockRawMetrics, historicalMetrics);

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANOMALY_DETECTED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'trend-analyzer',
          metadata: expect.objectContaining({
            anomaliesCount: 1,
            highSeverityCount: 0 // Updated to match actual severity calculation
          })
        })
      );
    });
  });

  describe('predictTrends', () => {
    it('should predict trends correctly', async () => {
      const historicalMetrics = [mockRawMetrics, mockRawMetrics, mockRawMetrics];
      
      // Mock calculations for prediction
      metricsCalculator.calculateAverageResponseTime.mockReturnValue(150);
      metricsCalculator.calculateErrorRate.mockReturnValue(0.02);
      metricsCalculator.calculateThroughput.mockReturnValue(60);

      const result = await service.predictTrends(historicalMetrics, 1);

      expect(result.predictions).toBeDefined();
      expect(result.confidence).toBe('high');
      expect(result.factors).toContain('历史数据趋势');
    });

    it('should return default prediction when not enough historical data', async () => {
      const result = await service.predictTrends([mockRawMetrics], 1);

      expect(result).toEqual({
        predictions: {
          responseTime: { value: 150, confidence: 0.3 },
          errorRate: { value: 0.02, confidence: 0.3 },
          throughput: { value: 60, confidence: 0.3 }
        },
        confidence: 'low',
        factors: ['数据量不足']
      });
    });

    it('should handle trend prediction errors', async () => {
      const historicalMetrics = [mockRawMetrics, mockRawMetrics, mockRawMetrics];
      
      metricsCalculator.calculateAverageResponseTime.mockImplementation(() => {
        throw new Error('Prediction error');
      });

      const result = await service.predictTrends(historicalMetrics, 1);

      expect(result).toEqual({
        predictions: {
          responseTime: { value: 0, confidence: 0 },
          errorRate: { value: 0, confidence: 0 },
          throughput: { value: 0, confidence: 0 }
        },
        confidence: 'low',
        factors: ['数据不足']
      });
    });
  });

  describe('invalidateTrendsCache', () => {
    it('should invalidate trends-related cache', async () => {
      await service.invalidateTrendsCache();

      expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:trend:*');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TrendAnalyzer: 趋势相关缓存已失效',
        expect.objectContaining({
          component: 'TrendAnalyzerService',
          operation: 'invalidateTrendsCache',
          success: true
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED,
        expect.objectContaining({
          timestamp: expect.any(Date),
          source: 'trend-analyzer',
          metadata: {
            pattern: 'trends_*',
            reason: 'manual_invalidation'
          }
        })
      );
    });

    it('should handle cache invalidation errors gracefully', async () => {
      cacheService.delByPattern.mockRejectedValue(new Error('Delete error'));

      await service.invalidateTrendsCache();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '趋势缓存失效失败',
        expect.any(String)
      );
    });
  });

  describe('Private Helper Methods', () => {
    describe('calculateBaseline', () => {
      it('should calculate baseline metrics correctly', () => {
        const historicalMetrics = [mockRawMetrics, mockRawMetrics];
        
        metricsCalculator.calculateAverageResponseTime.mockReturnValue(150);
        metricsCalculator.calculateErrorRate.mockReturnValue(0.02);
        metricsCalculator.calculateThroughput.mockReturnValue(60);

        const result = (service as any).calculateBaseline(historicalMetrics);

        expect(result).toEqual({
          averageResponseTimeMs: 150,
          averageErrorRate: 0.02,
          averageThroughput: 60
        });
      });
    });

    describe('calculateTrendsSummary', () => {
      it('should calculate trends summary correctly', () => {
        const trends = [mockTrends, mockTrends];

        const result = (service as any).calculateTrendsSummary(trends);

        expect(result).toEqual({
          averageResponseTimeMs: 150,
          averageErrorRate: 0,
          averageThroughput: 60,
          volatility: {
            responseTimeMs: 0,
            errorRate: 0,
            throughput: 0
          }
        });
      });
    });

    describe('calculateVolatility', () => {
      it('should calculate volatility correctly', () => {
        const values = [100, 120, 110, 130, 105];
        const result = (service as any).calculateVolatility(values);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
      });

      it('should return 0 for insufficient data', () => {
        const result = (service as any).calculateVolatility([100]);
        expect(result).toBe(0);
      });
    });

    describe('getSeverity', () => {
      it('should determine severity correctly', () => {
        const service_any = service as any;
        expect(service_any.getSeverity(1.5)).toBe('high');
        expect(service_any.getSeverity(0.7)).toBe('medium');
        expect(service_any.getSeverity(0.3)).toBe('low');
      });
    });

    describe('calculateLinearTrendPrediction', () => {
      it('should calculate linear trend prediction correctly', () => {
        const historicalMetrics = [mockRawMetrics, mockRawMetrics];
        
        metricsCalculator.calculateAverageResponseTime.mockReturnValue(150);
        metricsCalculator.calculateErrorRate.mockReturnValue(0.02);
        metricsCalculator.calculateThroughput.mockReturnValue(60);

        const result = (service as any).calculateLinearTrendPrediction(historicalMetrics, 1);

        expect(result).toEqual({
          responseTime: { value: 150, confidence: 0.7 },
          errorRate: { value: 0.02, confidence: 0.6 },
          throughput: { value: 60, confidence: 0.7 }
        });
      });

      it('should handle insufficient data for prediction', () => {
        const result = (service as any).calculateLinearTrendPrediction([mockRawMetrics], 1);

        expect(result.responseTime.value).toBe(150);
        expect(result.responseTime.confidence).toBe(0.3);
      });
    });

    describe('assessPredictionConfidence', () => {
      it('should assess prediction confidence correctly', () => {
        const service_any = service as any;
        expect(service_any.assessPredictionConfidence(Array(15).fill(mockRawMetrics))).toBe('high');
        expect(service_any.assessPredictionConfidence(Array(7).fill(mockRawMetrics))).toBe('medium');
        expect(service_any.assessPredictionConfidence([mockRawMetrics])).toBe('low');
      });
    });

    describe('identifyTrendFactors', () => {
      it('should identify trend factors correctly', () => {
        const historicalMetrics = [mockRawMetrics, mockRawMetrics];
        
        metricsCalculator.calculateThroughput.mockReturnValue(150); // High load
        metricsCalculator.calculateErrorRate.mockReturnValue(0.1); // High error rate

        const result = (service as any).identifyTrendFactors(historicalMetrics);

        expect(result).toEqual(
          expect.arrayContaining([
            '历史数据趋势',
            '高负载影响',
            '错误率波动'
          ])
        );
      });

      it('should return default factors when no special conditions', () => {
        const historicalMetrics = [mockRawMetrics, mockRawMetrics];
        
        metricsCalculator.calculateThroughput.mockReturnValue(10); // Low load
        metricsCalculator.calculateErrorRate.mockReturnValue(0.01); // Low error rate

        const result = (service as any).identifyTrendFactors(historicalMetrics);

        expect(result).toEqual(['历史数据趋势']);
      });
    });

    describe('buildTrendsCacheKey', () => {
      it('should build trends cache key correctly', () => {
        const result = (service as any).buildTrendsCacheKey('test', '1h', mockRawMetrics);
        expect(result).toContain('test_1h_');
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

    describe('getDefaultTrends', () => {
      it('should return default trends', () => {
        const result = (service as any).getDefaultTrends();
        
        expect(result).toEqual({
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

    describe('getDefaultHistoricalTrends', () => {
      it('should return default historical trends', () => {
        const result = (service as any).getDefaultHistoricalTrends();
        
        expect(result).toEqual({
          trends: [],
          summary: {
            averageResponseTimeMs: 0,
            averageErrorRate: 0,
            averageThroughput: 0,
            volatility: {
              responseTimeMs: 0,
              errorRate: 0,
              throughput: 0
            }
          }
        });
      });
    });

    describe('getDefaultPrediction', () => {
      it('should return default prediction', () => {
        const result = (service as any).getDefaultPrediction();
        
        expect(result).toEqual({
          predictions: {
            responseTime: { value: 0, confidence: 0 },
            errorRate: { value: 0, confidence: 0 },
            throughput: { value: 0, confidence: 0 }
          },
          confidence: 'low',
          factors: ['数据不足']
        });
      });
    });
  });
});