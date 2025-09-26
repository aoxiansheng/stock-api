/**
 * AnalyzerHealthScoreCalculator Unit Tests
 * 测试监控分析器健康分计算服务的各种计算功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerHealthScoreCalculator } from '@monitoring/analyzer/analyzer-score.service';
import { createLogger } from '@common/logging/index';
import {
  MONITORING_SYSTEM_LIMITS,
  MonitoringSystemLimitUtils
} from '@monitoring/constants/config/monitoring-system.constants';
import { MONITORING_HEALTH_STATUS } from '@monitoring/constants/status/monitoring-status.constants';

// Mock logger
jest.mock('@common/logging');

// Mock MonitoringSystemLimitUtils
jest.mock('@monitoring/constants/config/monitoring-system.constants', () => {
  const actual = jest.requireActual('@monitoring/constants/config/monitoring-system.constants');
  return {
    ...actual,
    MonitoringSystemLimitUtils: {
      isSlowRequest: jest.fn((time) => time > 1000),
      isSlowQuery: jest.fn((time) => time > 1000)
    }
  };
});

describe('AnalyzerHealthScoreCalculator', () => {
  let service: AnalyzerHealthScoreCalculator;
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
      providers: [AnalyzerHealthScoreCalculator]
    }).compile();

    service = module.get<AnalyzerHealthScoreCalculator>(AnalyzerHealthScoreCalculator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('AnalyzerHealthScoreCalculator');
    });
  });

  describe('calculateOverallHealthScore', () => {
    it('should calculate overall health score correctly', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/test2', method: 'POST', statusCode: 500, responseTimeMs: 200, timestamp: new Date() }
        ],
        database: [
          { operation: 'find', responseTimeMs: 50, success: true, timestamp: new Date() }
        ],
        cache: [
          { operation: 'get', responseTimeMs: 5, hit: true, timestamp: new Date() }
        ],
        system: {
          memory: { used: 4000, total: 8000, percentage: 0.5 },
          cpu: { usage: 0.3 },
          uptime: 3600,
          timestamp: new Date()
        }
      };

      // Mock individual score calculations
      jest.spyOn(service, 'calculateApiHealthScore').mockReturnValue(80);
      jest.spyOn(service, 'calculateDatabaseHealthScore').mockReturnValue(90);
      jest.spyOn(service, 'calculateCacheHealthScore').mockReturnValue(85);
      jest.spyOn(service, 'calculateSystemHealthScore').mockReturnValue(95);

      const result = service.calculateOverallHealthScore(mockRawMetrics);

      // Weighted average: (80*0.4) + (90*0.2) + (85*0.2) + (95*0.2) = 32 + 18 + 17 + 19 = 86
      expect(result).toBe(86);
    });

    it('should return default score on calculation error', () => {
      const mockRawMetrics = { requests: [] };

      jest.spyOn(service, 'calculateApiHealthScore').mockImplementation(() => {
        throw new Error('Calculation error');
      });

      const result = service.calculateOverallHealthScore(mockRawMetrics);

      expect(result).toBe(50); // Default score
      expect(mockLogger.error).toHaveBeenCalledWith(
        '健康分计算失败',
        expect.any(String)
      );
    });
  });

  describe('calculateApiHealthScore', () => {
    it('should calculate API health score correctly', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/test2', method: 'POST', statusCode: 201, responseTimeMs: 150, timestamp: new Date() },
          { endpoint: '/api/test3', method: 'GET', statusCode: 500, responseTimeMs: 2000, timestamp: new Date() }, // Slow and error
          { endpoint: '/api/test4', method: 'DELETE', statusCode: 404, responseTimeMs: 50, timestamp: new Date() }
        ]
      };

      const result = service.calculateApiHealthScore(mockRawMetrics);

      // Error rate: 2/4 = 50% (>10% => errorScore = 0)
      // Avg response time: (100+150+2000+50)/4 = 575ms (>500ms => responseScore = 40)
      // Total: 0 + 40 = 40
      expect(result).toBe(40);
    });

    it('should return full score for no requests', () => {
      const mockRawMetrics = { requests: [] };

      const result = service.calculateApiHealthScore(mockRawMetrics);

      expect(result).toBe(100);
    });

    it('should calculate score for good performance', () => {
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/test1', method: 'GET', statusCode: 200, responseTimeMs: 100, timestamp: new Date() },
          { endpoint: '/api/test2', method: 'POST', statusCode: 201, responseTimeMs: 150, timestamp: new Date() },
          { endpoint: '/api/test3', method: 'GET', statusCode: 200, responseTimeMs: 200, timestamp: new Date() }
        ]
      };

      const result = service.calculateApiHealthScore(mockRawMetrics);

      // Error rate: 0/3 = 0% (errorScore = 40)
      // Avg response time: (100+150+200)/3 = 150ms (<500ms => responseScore = 60)
      // Total: 40 + 60 = 100
      expect(result).toBe(100);
    });
  });

  describe('calculateDatabaseHealthScore', () => {
    it('should calculate database health score correctly', () => {
      const mockRawMetrics = {
        database: [
          { operation: 'find', responseTimeMs: 50, success: true, timestamp: new Date() },
          { operation: 'update', responseTimeMs: 150, success: true, timestamp: new Date() },
          { operation: 'insert', responseTimeMs: 250, success: false, timestamp: new Date() },
          { operation: 'aggregate', responseTimeMs: 300, success: true, timestamp: new Date() } // Slow query
        ]
      };

      const result = service.calculateDatabaseHealthScore(mockRawMetrics);

      // Failure rate: 1/4 = 25% (>5% => failureScore = 25)
      // Avg query time: (50+150+250+300)/4 = 187.5ms (<500ms => queryScore = 50)
      // Total: 25 + 50 = 75
      expect(result).toBe(75);
    });

    it('should return full score for no database operations', () => {
      const mockRawMetrics = { database: [] };

      const result = service.calculateDatabaseHealthScore(mockRawMetrics);

      expect(result).toBe(100);
    });
  });

  describe('calculateCacheHealthScore', () => {
    it('should calculate cache health score correctly', () => {
      const mockRawMetrics = {
        cache: [
          { operation: 'get', responseTimeMs: 5, hit: true, timestamp: new Date() },
          { operation: 'get', responseTimeMs: 10, hit: true, timestamp: new Date() },
          { operation: 'get', responseTimeMs: 15, hit: false, timestamp: new Date() },
          { operation: 'get', responseTimeMs: 20, hit: true, timestamp: new Date() },
          { operation: 'set', responseTimeMs: 25, hit: true, timestamp: new Date() }
        ]
      };

      const result = service.calculateCacheHealthScore(mockRawMetrics);

      // Hit rate: 4/5 = 80% (>=70% => hitScore = 50)
      // Avg response time: (5+10+15+20+25)/5 = 15ms (<50ms => responseScore = 30)
      // Total: 50 + 30 = 80
      expect(result).toBe(80);
    });

    it('should return full score for no cache operations', () => {
      const mockRawMetrics = { cache: [] };

      const result = service.calculateCacheHealthScore(mockRawMetrics);

      expect(result).toBe(100);
    });
  });

  describe('calculateSystemHealthScore', () => {
    it('should calculate system health score correctly', () => {
      const mockRawMetrics = {
        system: {
          memory: { used: 6000, total: 8000, percentage: 0.75 },
          cpu: { usage: 0.85 },
          uptime: 7200,
          timestamp: new Date()
        }
      };

      const result = service.calculateSystemHealthScore(mockRawMetrics);

      // CPU usage: 85% (>80% => cpuScore = 0)
      // Memory usage: 75% (>70% => memoryScore = 20)
      // Uptime: 7200s (>3600s => uptimeScore = 15)
      // Total: 0 + 20 + 15 = 35
      expect(result).toBe(35);
    });

    it('should return full score when no system metrics', () => {
      const mockRawMetrics = { system: undefined };

      const result = service.calculateSystemHealthScore(mockRawMetrics);

      expect(result).toBe(100);
    });

    it('should calculate score for healthy system', () => {
      const mockRawMetrics = {
        system: {
          memory: { used: 4000, total: 8000, percentage: 0.5 },
          cpu: { usage: 0.3 },
          uptime: 86400,
          timestamp: new Date()
        }
      };

      const result = service.calculateSystemHealthScore(mockRawMetrics);

      // CPU usage: 30% (<70% => cpuScore = 40)
      // Memory usage: 50% (<70% => memoryScore = 40)
      // Uptime: 86400s (>86400s => uptimeScore = 20)
      // Total: 40 + 40 + 20 = 100
      expect(result).toBe(100);
    });
  });

  describe('getHealthGrade', () => {
    it('should return correct health grade based on score', () => {
      expect(service.getHealthGrade(95)).toBe('excellent');
      expect(service.getHealthGrade(85)).toBe('good');
      expect(service.getHealthGrade(65)).toBe('fair');
      expect(service.getHealthGrade(45)).toBe('poor');
      expect(service.getHealthGrade(25)).toBe('critical');
    });
  });

  describe('getHealthStatus', () => {
    it('should return correct health status based on score', () => {
      expect(service.getHealthStatus(85)).toBe(MONITORING_HEALTH_STATUS.HEALTHY);
      expect(service.getHealthStatus(55)).toBe(MONITORING_HEALTH_STATUS.WARNING);
      expect(service.getHealthStatus(35)).toBe(MONITORING_HEALTH_STATUS.UNHEALTHY);
    });
  });

  describe('generateHealthRecommendations', () => {
    it('should generate health recommendations correctly', () => {
      // Mock the utility functions
      (MonitoringSystemLimitUtils.isSlowRequest as jest.Mock).mockImplementation((time) => time > 1000);
      
      const mockRawMetrics = {
        requests: [
          { endpoint: '/api/error', method: 'GET', statusCode: 500, responseTimeMs: 2000, timestamp: new Date() }
        ],
        database: [
          { operation: 'find', responseTimeMs: 1500, success: false, timestamp: new Date() }
        ],
        cache: [
          { operation: 'get', responseTimeMs: 50, hit: false, timestamp: new Date() }
        ],
        system: {
          memory: { used: 6800, total: 8000, percentage: 0.85 },
          cpu: { usage: 0.85 },
          uptime: 1800,
          timestamp: new Date()
        }
      };

      const result = service.generateHealthRecommendations(mockRawMetrics);

      expect(result).toHaveLength(6);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('API错误率过高'),
          expect.stringContaining('API响应时间过慢'),
          expect.stringContaining('数据库查询时间过长'),
          expect.stringContaining('数据库操作失败率过高'),
          expect.stringContaining('缓存命中率偏低'),
          expect.stringContaining('CPU使用率过高')
        ])
      );
    });

    it('should return default recommendation on error', () => {
      const mockRawMetrics = { requests: [] };

      // Mock an error
      jest.spyOn(service, 'generateHealthRecommendations').mockImplementation(() => {
        throw new Error('Recommendation error');
      });

      const result = service.generateHealthRecommendations(mockRawMetrics);

      expect(result).toEqual(['系统运行正常，建议定期监控各项指标']);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '生成健康建议失败',
        expect.any(String)
      );
    });
  });
});