/**
 * AnalyzerMetricsCalculator Unit Tests
 * 测试监控分析器指标计算服务的各种计算功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerMetricsCalculator } from '@monitoring/analyzer/analyzer-metrics.service';
import { createLogger } from '@common/logging/index';
import {
  MONITORING_SYSTEM_LIMITS
} from '@monitoring/constants/config/monitoring-system.constants';

// Mock logger
jest.mock('@common/logging');

describe('AnalyzerMetricsCalculator', () => {
  let service: AnalyzerMetricsCalculator;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyzerMetricsCalculator]
    }).compile();

    service = module.get<AnalyzerMetricsCalculator>(AnalyzerMetricsCalculator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('AnalyzerMetricsCalculator');
    });
  });

  describe('calculatePerformanceSummary', () => {
    it('should calculate performance summary correctly', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/user', method: 'POST', statusCode: 201, responseTimeMs: 150, timestamp: new Date() },
          { endpoint: '/api/error', method: 'GET', statusCode: 500, responseTimeMs: 200, timestamp: new Date() }
        ]
      };

      const result = service.calculatePerformanceSummary(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 3,
        successfulRequests: 2,
        failedRequests: 1,
        responseTimeMs: 150,
        errorRate: 0.3333
      });
    });

    it('should handle empty requests array', () => {
      const mockRawMetrics = { requests: [] };

      const result = service.calculatePerformanceSummary(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimeMs: 0,
        errorRate: 0
      });
    });

    it('should handle calculation errors gracefully', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() }
        ]
      };

      // Mock an error in calculateAverageResponseTime
      jest.spyOn(service, 'calculateAverageResponseTime').mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const result = service.calculatePerformanceSummary(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimeMs: 0,
        errorRate: 0
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '性能摘要计算失败',
        expect.any(String)
      );
    });
  });

  describe('calculateAverageResponseTime', () => {
    it('should calculate average response time correctly', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/test2', method: 'POST', statusCode: 200, responseTimeMs: 200, timestamp: new Date() },
          { endpoint: '/api/test3', method: 'GET', statusCode: 200, responseTimeMs: 300, timestamp: new Date() }
        ]
      };

      const result = service.calculateAverageResponseTime(mockRawMetrics);

      expect(result).toBe(200);
    });

    it('should return 0 for empty requests array', () => {
      const mockRawMetrics = { requests: [] };

      const result = service.calculateAverageResponseTime(mockRawMetrics);

      expect(result).toBe(0);
    });

    it('should handle requests with missing responseTimeMs', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/test2', method: 'POST', statusCode: 200, responseTimeMs: 0, timestamp: new Date() }, // Missing responseTimeMs -> 0
          { endpoint: '/api/test3', method: 'GET', statusCode: 200, responseTimeMs: 300, timestamp: new Date() }
        ]
      };

      const result = service.calculateAverageResponseTime(mockRawMetrics);

      expect(result).toBe(150); // (100 + 0 + 300) / 3
    });
  });

  describe('calculateErrorRate', () => {
    it('should calculate error rate correctly', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/test2', method: 'POST', statusCode: 201, responseTimeMs: 150, timestamp: new Date() },
          { endpoint: '/api/test3', method: 'GET', statusCode: 500, responseTimeMs: 200, timestamp: new Date() },
          { endpoint: '/api/test4', method: 'DELETE', statusCode: 404, responseTimeMs: 250, timestamp: new Date() }
        ]
      };

      const result = service.calculateErrorRate(mockRawMetrics);

      expect(result).toBe(0.5); // 2 errors out of 4 requests
    });

    it('should return 0 for empty requests array', () => {
      const mockRawMetrics = { requests: [] };

      const result = service.calculateErrorRate(mockRawMetrics);

      expect(result).toBe(0);
    });

    it('should handle all successful requests', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/success1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/success2', method: 'POST', statusCode: 201, responseTimeMs: 150, timestamp: new Date() },
          { endpoint: '/api/success3', method: 'PUT', statusCode: 204, responseTimeMs: 120, timestamp: new Date() }
        ]
      };

      const result = service.calculateErrorRate(mockRawMetrics);

      expect(result).toBe(0);
    });
  });

  describe('calculateThroughput', () => {
    it('should calculate throughput correctly', () => {
      const mockRawMetrics = {
        requests: Array(120).fill(null).map((_, i) => ({
          endpoint: `/api/test${i}`,
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date()
        }))
      };

      const result = service.calculateThroughput(mockRawMetrics);

      expect(result).toBe(120); // 120 requests per minute
    });

    it('should return 0 for empty requests array', () => {
      const mockRawMetrics = { requests: [] };

      const result = service.calculateThroughput(mockRawMetrics);

      expect(result).toBe(0);
    });
  });

  describe('calculateEndpointMetrics', () => {
    it('should calculate endpoint metrics correctly', () => {
      const mockRawMetrics = {
        requests: [
          { method: 'GET', endpoint: '/api/users', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { method: 'GET', endpoint: '/api/users', statusCode: 200, responseTimeMs: 150, timestamp: new Date() },
          { method: 'POST', endpoint: '/api/users', statusCode: 201, responseTimeMs: 200, timestamp: new Date() },
          { method: 'GET', endpoint: '/api/orders', statusCode: 404, responseTimeMs: 300, timestamp: new Date() }
        ]
      };

      const result = service.calculateEndpointMetrics(mockRawMetrics);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        endpoint: '/api/users',
        method: 'GET',
        totalOperations: 2,
        responseTimeMs: 125,
        errorRate: 0
      });
      expect(result[1]).toMatchObject({
        endpoint: '/api/users',
        method: 'POST',
        totalOperations: 1,
        responseTimeMs: 200,
        errorRate: 0
      });
      expect(result[2]).toMatchObject({
        endpoint: '/api/orders',
        method: 'GET',
        totalOperations: 1,
        responseTimeMs: 300,
        errorRate: 1
      });
    });

    it('should return empty array for empty requests', () => {
      const mockRawMetrics = { requests: [] };

      const result = service.calculateEndpointMetrics(mockRawMetrics);

      expect(result).toEqual([]);
    });

    it('should handle calculation errors gracefully', () => {
      const mockRawMetrics = {
        requests: [
          { method: 'GET', endpoint: '/api/users', statusCode: 200, responseTimeMs: 100, timestamp: new Date() }
        ]
      };

      // Mock an error in the calculation
      jest.spyOn(global.Date, 'now').mockImplementationOnce(() => {
        throw new Error('Date error');
      });

      const result = service.calculateEndpointMetrics(mockRawMetrics);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '端点指标计算失败',
        expect.any(String)
      );
    });
  });

  describe('calculateDatabaseMetrics', () => {
    it('should calculate database metrics correctly', () => {
      const mockRawMetrics = {
        database: [
          { operation: 'find', responseTimeMs: 50, success: true, timestamp: new Date() },
          { operation: 'update', responseTimeMs: 150, success: true, timestamp: new Date() },
          { operation: 'insert', responseTimeMs: 250, success: false, timestamp: new Date() },
          { operation: 'aggregate', responseTimeMs: 300, success: true, timestamp: new Date() } // Slow query
        ]
      };

      const result = service.calculateDatabaseMetrics(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 4,
        responseTimeMs: 188,
        slowQueries: 1,
        failedOperations: 1,
        errorRate: 0.25
      });
    });

    it('should return default metrics for empty database operations', () => {
      const mockRawMetrics = { database: [] };

      const result = service.calculateDatabaseMetrics(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 0,
        responseTimeMs: 0,
        slowQueries: 0,
        failedOperations: 0,
        errorRate: 0
      });
    });

    it('should handle calculation errors gracefully', () => {
      const mockRawMetrics = {
        database: [
          { operation: 'find', responseTimeMs: 50, success: true, timestamp: new Date() }
        ]
      };

      // Mock an error
      jest.spyOn(service, 'calculateDatabaseMetrics').mockImplementation(() => {
        throw new Error('Database calculation error');
      });

      const result = service.calculateDatabaseMetrics(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 0,
        responseTimeMs: 0,
        slowQueries: 0,
        failedOperations: 0,
        errorRate: 0
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '数据库指标计算失败',
        expect.any(String)
      );
    });
  });

  describe('calculateCacheMetrics', () => {
    it('should calculate cache metrics correctly', () => {
      const mockRawMetrics = {
        cache: [
          { operation: 'get', responseTimeMs: 5, hit: true, timestamp: new Date() },
          { operation: 'get', responseTimeMs: 10, hit: true, timestamp: new Date() },
          { operation: 'set', responseTimeMs: 15, hit: false, timestamp: new Date() },
          { operation: 'get', responseTimeMs: 20, hit: true, timestamp: new Date() }
        ]
      };

      const result = service.calculateCacheMetrics(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 4,
        hits: 3,
        misses: 1,
        hitRate: 0.75,
        responseTimeMs: 13
      });
    });

    it('should return default metrics for empty cache operations', () => {
      const mockRawMetrics = { cache: [] };

      const result = service.calculateCacheMetrics(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        responseTimeMs: 0
      });
    });

    it('should handle calculation errors gracefully', () => {
      const mockRawMetrics = {
        cache: [
          { operation: 'get', responseTimeMs: 5, hit: true, timestamp: new Date() }
        ]
      };

      // Mock an error
      jest.spyOn(service, 'calculateCacheMetrics').mockImplementation(() => {
        throw new Error('Cache calculation error');
      });

      const result = service.calculateCacheMetrics(mockRawMetrics);

      expect(result).toEqual({
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        responseTimeMs: 0
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '缓存指标计算失败',
        expect.any(String)
      );
    });
  });

  describe('calculateTrends', () => {
    it('should calculate trends correctly with previous metrics', () => {
      const currentMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', responseTimeMs: 200, statusCode: 200, timestamp: new Date() },
          { endpoint: '/api/test', method: 'POST', responseTimeMs: 300, statusCode: 500, timestamp: new Date() }
        ],
        database: [],
        cache: []
      };

      const previousMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', responseTimeMs: 100, statusCode: 200, timestamp: new Date() },
          { endpoint: '/api/test', method: 'GET', responseTimeMs: 150, statusCode: 200, timestamp: new Date() }
        ],
        database: [],
        cache: []
      };

      const result = service.calculateTrends(currentMetrics, previousMetrics);

      expect(result).toEqual({
        responseTimeMs: {
          current: 250,
          previous: 125,
          trend: 'up',
          changePercentage: 100
        },
        errorRate: {
          current: 0.5,
          previous: 0,
          trend: 'up',
          changePercentage: 10000
        },
        throughput: {
          current: 2,
          previous: 2,
          trend: 'stable',
          changePercentage: 0
        }
      });
    });

    it('should return stable trends when no previous metrics', () => {
      const currentMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', responseTimeMs: 200, statusCode: 200, timestamp: new Date() }
        ],
        database: [],
        cache: []
      };

      const result = service.calculateTrends(currentMetrics);

      expect(result).toEqual({
        responseTimeMs: {
          current: 200,
          previous: 0,
          trend: 'up',
          changePercentage: 10000
        },
        errorRate: {
          current: 0,
          previous: 0,
          trend: 'stable',
          changePercentage: 0
        },
        throughput: {
          current: 1,
          previous: 0,
          trend: 'up',
          changePercentage: 10000
        }
      });
    });

    it('should handle calculation errors gracefully', () => {
      const currentMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', responseTimeMs: 200, statusCode: 200, timestamp: new Date() }
        ],
        database: [],
        cache: []
      };

      const previousMetrics = {
        requests: [
          { endpoint: '/api/test', method: 'GET', responseTimeMs: 100, statusCode: 200, timestamp: new Date() }
        ],
        database: [],
        cache: []
      };

      // Mock an error
      jest.spyOn(service, 'calculateAverageResponseTime').mockImplementation(() => {
        throw new Error('Trend calculation error');
      });

      const result = service.calculateTrends(currentMetrics, previousMetrics);

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
      expect(mockLogger.error).toHaveBeenCalledWith(
        '趋势分析计算失败',
        expect.any(String)
      );
    });
  });

  describe('calculateChangePercentage', () => {
    it('should calculate change percentage correctly', () => {
      const service_any = service as any;

      expect(service_any.calculateChangePercentage(150, 100)).toBe(50);
      expect(service_any.calculateChangePercentage(100, 150)).toBe(-33.33);
      expect(service_any.calculateChangePercentage(100, 0)).toBe(10000); // 100% increase
      expect(service_any.calculateChangePercentage(0, 100)).toBe(-100);
    });
  });

  describe('getTrend', () => {
    it('should determine trend direction correctly', () => {
      const service_any = service as any;

      expect(service_any.getTrend(6)).toBe('up'); // >5% change
      expect(service_any.getTrend(-6)).toBe('down'); // <-5% change
      expect(service_any.getTrend(3)).toBe('stable'); // <5% change
      expect(service_any.getTrend(-3)).toBe('stable'); // <5% change
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate percentile correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(service.calculatePercentile(values, 50)).toBe(5); // 50th percentile (median)
      expect(service.calculatePercentile(values, 95)).toBe(9); // 95th percentile
      expect(service.calculatePercentile(values, 99)).toBe(10); // 99th percentile
    });

    it('should return 0 for empty array', () => {
      const values: number[] = [];

      expect(service.calculatePercentile(values, 50)).toBe(0);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate statistics correctly', () => {
      const values = [10, 20, 30, 40, 50];

      const result = service.calculateStatistics(values);

      expect(result).toEqual({
        min: 10,
        max: 50,
        avg: 30,
        p50: 30,
        p95: 50,
        p99: 50
      });
    });

    it('should return zeros for empty array', () => {
      const values: number[] = [];

      const result = service.calculateStatistics(values);

      expect(result).toEqual({
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0
      });
    });
  });
});