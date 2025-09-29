/**
 * PresenterResponseDto Unit Tests
 * 测试监控展示层响应DTO的类型安全和数据转换功能
 */

import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  HealthStatusResponseDto,
  PerformanceAnalysisResponseDto,
  TrendsDataDto,
  CriticalIssueDto,
  OptimizationSuggestionDto,
  DashboardResponseDto
} from '@monitoring/presenter/dto/presenter-response.dto';

describe('PresenterResponseDto', () => {
  describe('HealthStatusResponseDto', () => {
    it('should create instance with valid data', () => {
      const healthStatus = new HealthStatusResponseDto();
      healthStatus.status = 'healthy';
      healthStatus.healthScore = 95;
      healthStatus.components = { database: 'ok', cache: 'ok' };
      healthStatus.timestamp = new Date();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.healthScore).toBe(95);
      expect(healthStatus.components).toEqual({ database: 'ok', cache: 'ok' });
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
    });

    it('should handle all status types', () => {
      const statuses: Array<'healthy' | 'degraded' | 'unhealthy'> = ['healthy', 'degraded', 'unhealthy'];

      statuses.forEach(status => {
        const healthStatus = new HealthStatusResponseDto();
        healthStatus.status = status;
        expect(healthStatus.status).toBe(status);
      });
    });

    it('should transform timestamp from string to Date', () => {
      const plainObject = {
        status: 'healthy',
        healthScore: 95,
        components: {},
        timestamp: '2023-01-01T00:00:00Z'
      };

      const transformed = plainToClass(HealthStatusResponseDto, plainObject);
      expect(transformed.timestamp).toBeInstanceOf(Date);
      expect(transformed.timestamp.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should validate timestamp as Date', async () => {
      const healthStatus = new HealthStatusResponseDto();
      healthStatus.status = 'healthy';
      healthStatus.healthScore = 95;
      healthStatus.components = {};
      healthStatus.timestamp = new Date();

      const errors = await validate(healthStatus);
      expect(errors.length).toBe(0);
    });

    it('should handle optional details property', () => {
      const healthStatus = new HealthStatusResponseDto();
      healthStatus.details = { additionalInfo: 'test data' };

      expect(healthStatus.details).toEqual({ additionalInfo: 'test data' });
    });
  });

  describe('PerformanceAnalysisResponseDto', () => {
    it('should create instance with complete performance data', () => {
      const performance = new PerformanceAnalysisResponseDto();
      performance.summary = {
        responseTimeMs: 150,
        errorRate: 0.01,
        throughput: 1000,
        uptime: 99.9
      };
      performance.healthScore = 95;
      performance.trends = {
        responseTimeMs: [100, 120, 150],
        errorRate: [0.005, 0.007, 0.01],
        throughput: [900, 950, 1000]
      };
      performance.endpointMetrics = [{
        endpoint: '/api/v1/test',
        method: 'GET',
        totalOperations: 100,
        responseTimeMs: 120,
        errorRate: 0.01
      }];
      performance.databaseMetrics = {
        totalOperations: 50,
        responseTimeMs: 80,
        slowQueries: 2,
        errorRate: 0.02
      };
      performance.cacheMetrics = {
        totalOperations: 200,
        hitRate: 0.85,
        responseTimeMs: 10
      };
      performance.timestamp = new Date();

      expect(performance.summary.responseTimeMs).toBe(150);
      expect(performance.healthScore).toBe(95);
      expect(performance.trends.responseTimeMs).toHaveLength(3);
      expect(performance.endpointMetrics).toHaveLength(1);
      expect(performance.databaseMetrics.totalOperations).toBe(50);
      expect(performance.cacheMetrics.hitRate).toBe(0.85);
      expect(performance.timestamp).toBeInstanceOf(Date);
    });

    it('should handle empty endpoint metrics array', () => {
      const performance = new PerformanceAnalysisResponseDto();
      performance.endpointMetrics = [];

      expect(performance.endpointMetrics).toEqual([]);
      expect(performance.endpointMetrics).toHaveLength(0);
    });

    it('should transform timestamp correctly', () => {
      const plainObject = {
        summary: { responseTimeMs: 100, errorRate: 0.01, throughput: 1000, uptime: 99.9 },
        healthScore: 95,
        trends: { responseTimeMs: [], errorRate: [], throughput: [] },
        endpointMetrics: [],
        databaseMetrics: { totalOperations: 0, responseTimeMs: 0, slowQueries: 0, errorRate: 0 },
        cacheMetrics: { totalOperations: 0, hitRate: 0, responseTimeMs: 0 },
        timestamp: '2023-01-01T12:00:00Z'
      };

      const transformed = plainToClass(PerformanceAnalysisResponseDto, plainObject);
      expect(transformed.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('TrendsDataDto', () => {
    it('should implement TrendDataInterface', () => {
      const trendsData = new TrendsDataDto();
      trendsData.responseTimeTrend = [100, 110, 120];
      trendsData.errorRateTrend = [0.01, 0.015, 0.02];
      trendsData.throughputTrend = [900, 950, 1000];

      expect(trendsData.responseTimeTrend).toEqual([100, 110, 120]);
      expect(trendsData.errorRateTrend).toEqual([0.01, 0.015, 0.02]);
      expect(trendsData.throughputTrend).toEqual([900, 950, 1000]);
    });

    it('should handle empty trend arrays', () => {
      const trendsData = new TrendsDataDto();
      trendsData.responseTimeTrend = [];
      trendsData.errorRateTrend = [];
      trendsData.throughputTrend = [];

      expect(trendsData.responseTimeTrend).toHaveLength(0);
      expect(trendsData.errorRateTrend).toHaveLength(0);
      expect(trendsData.throughputTrend).toHaveLength(0);
    });

    it('should handle numeric trend data', () => {
      const trendsData = new TrendsDataDto();
      const responseData = [95.5, 102.3, 108.7, 115.2];
      trendsData.responseTimeTrend = responseData;

      expect(trendsData.responseTimeTrend).toEqual(responseData);
      expect(trendsData.responseTimeTrend.every(val => typeof val === 'number')).toBe(true);
    });
  });

  describe('CriticalIssueDto', () => {
    it('should create instance with all severity levels', () => {
      const severities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

      severities.forEach(severity => {
        const issue = new CriticalIssueDto();
        issue.severity = severity;
        issue.category = 'database';
        issue.message = 'Test issue';
        issue.timestamp = new Date();

        expect(issue.severity).toBe(severity);
        expect(issue.category).toBe('database');
        expect(issue.message).toBe('Test issue');
        expect(issue.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should transform timestamp from string', () => {
      const plainObject = {
        severity: 'high',
        category: 'performance',
        message: 'High response time detected',
        timestamp: '2023-01-01T10:30:00Z'
      };

      const transformed = plainToClass(CriticalIssueDto, plainObject);
      expect(transformed.timestamp).toBeInstanceOf(Date);
      expect(transformed.severity).toBe('high');
    });

    it('should validate timestamp as Date', async () => {
      const issue = new CriticalIssueDto();
      issue.severity = 'medium';
      issue.category = 'cache';
      issue.message = 'Cache miss rate high';
      issue.timestamp = new Date();

      const errors = await validate(issue);
      expect(errors.length).toBe(0);
    });
  });

  describe('OptimizationSuggestionDto', () => {
    it('should create instance with all priority levels', () => {
      const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

      priorities.forEach(priority => {
        const suggestion = new OptimizationSuggestionDto();
        suggestion.priority = priority;
        suggestion.title = 'Test suggestion';
        suggestion.description = 'Test description';
        suggestion.action = 'Test action';

        expect(suggestion.priority).toBe(priority);
        expect(suggestion.title).toBe('Test suggestion');
        expect(suggestion.description).toBe('Test description');
        expect(suggestion.action).toBe('Test action');
      });
    });

    it('should handle complex suggestion data', () => {
      const suggestion = new OptimizationSuggestionDto();
      suggestion.priority = 'high';
      suggestion.title = 'Optimize database queries';
      suggestion.description = 'Several slow queries detected in the system';
      suggestion.action = 'Add database indexes for frequently queried columns';

      expect(suggestion.title).toContain('database');
      expect(suggestion.description).toContain('slow queries');
      expect(suggestion.action).toContain('indexes');
    });
  });

  describe('DashboardResponseDto', () => {
    it('should create complete dashboard response', () => {
      const dashboard = new DashboardResponseDto();
      dashboard.healthScore = 92;
      dashboard.performanceSummary = {
        responseTimeMs: 145,
        errorRate: 0.008,
        throughput: 1200,
        memoryUsage: 0.65,
        cpuUsage: 0.45
      };
      dashboard.trendsData = new TrendsDataDto();
      dashboard.trendsData.responseTimeTrend = [120, 135, 145];
      dashboard.trendsData.errorRateTrend = [0.005, 0.007, 0.008];
      dashboard.trendsData.throughputTrend = [1100, 1150, 1200];

      dashboard.criticalIssues = [];
      dashboard.suggestions = [];
      dashboard.timestamp = new Date();

      expect(dashboard.healthScore).toBe(92);
      expect(dashboard.performanceSummary.responseTimeMs).toBe(145);
      expect(dashboard.trendsData).toBeInstanceOf(TrendsDataDto);
      expect(dashboard.criticalIssues).toHaveLength(0);
      expect(dashboard.suggestions).toHaveLength(0);
      expect(dashboard.timestamp).toBeInstanceOf(Date);
    });

    it('should handle multiple critical issues and suggestions', () => {
      const dashboard = new DashboardResponseDto();

      const issue1 = new CriticalIssueDto();
      issue1.severity = 'high';
      issue1.category = 'database';
      issue1.message = 'Connection pool exhausted';
      issue1.timestamp = new Date();

      const issue2 = new CriticalIssueDto();
      issue2.severity = 'medium';
      issue2.category = 'cache';
      issue2.message = 'High cache miss rate';
      issue2.timestamp = new Date();

      dashboard.criticalIssues = [issue1, issue2];

      const suggestion1 = new OptimizationSuggestionDto();
      suggestion1.priority = 'high';
      suggestion1.title = 'Increase connection pool size';
      suggestion1.description = 'Current pool size is insufficient';
      suggestion1.action = 'Update database configuration';

      dashboard.suggestions = [suggestion1];

      expect(dashboard.criticalIssues).toHaveLength(2);
      expect(dashboard.suggestions).toHaveLength(1);
      expect(dashboard.criticalIssues[0]).toBeInstanceOf(CriticalIssueDto);
      expect(dashboard.suggestions[0]).toBeInstanceOf(OptimizationSuggestionDto);
    });

    it('should transform nested objects with class-transformer', () => {
      const plainObject = {
        healthScore: 88,
        performanceSummary: {
          responseTimeMs: 200,
          errorRate: 0.02,
          throughput: 800,
          memoryUsage: 0.8,
          cpuUsage: 0.6
        },
        trendsData: {
          responseTimeTrend: [180, 190, 200],
          errorRateTrend: [0.015, 0.018, 0.02],
          throughputTrend: [750, 775, 800]
        },
        criticalIssues: [{
          severity: 'high',
          category: 'performance',
          message: 'High response time',
          timestamp: '2023-01-01T15:00:00Z'
        }],
        suggestions: [{
          priority: 'medium',
          title: 'Cache optimization',
          description: 'Implement better caching strategy',
          action: 'Review cache configuration'
        }],
        timestamp: '2023-01-01T15:00:00Z'
      };

      const transformed = plainToClass(DashboardResponseDto, plainObject);

      expect(transformed.healthScore).toBe(88);
      expect(transformed.trendsData).toBeInstanceOf(TrendsDataDto);
      expect(transformed.criticalIssues[0]).toBeInstanceOf(CriticalIssueDto);
      expect(transformed.suggestions[0]).toBeInstanceOf(OptimizationSuggestionDto);
      expect(transformed.timestamp).toBeInstanceOf(Date);
      expect(transformed.criticalIssues[0].timestamp).toBeInstanceOf(Date);
    });

    it('should validate timestamp field', async () => {
      const dashboard = new DashboardResponseDto();
      dashboard.healthScore = 90;
      dashboard.performanceSummary = {
        responseTimeMs: 100,
        errorRate: 0.01,
        throughput: 1000,
        memoryUsage: 0.5,
        cpuUsage: 0.3
      };
      dashboard.trendsData = new TrendsDataDto();
      dashboard.criticalIssues = [];
      dashboard.suggestions = [];
      dashboard.timestamp = new Date();

      const errors = await validate(dashboard);
      expect(errors.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex nested transformation scenario', () => {
      const complexPlainObject = {
        healthScore: 85,
        performanceSummary: {
          responseTimeMs: 250,
          errorRate: 0.03,
          throughput: 600,
          memoryUsage: 0.9,
          cpuUsage: 0.8
        },
        trendsData: {
          responseTimeTrend: [200, 225, 250],
          errorRateTrend: [0.02, 0.025, 0.03],
          throughputTrend: [550, 575, 600]
        },
        criticalIssues: [
          {
            severity: 'high',
            category: 'memory',
            message: 'Memory usage critical',
            timestamp: '2023-01-01T16:00:00Z'
          },
          {
            severity: 'medium',
            category: 'performance',
            message: 'Response time degraded',
            timestamp: '2023-01-01T16:05:00Z'
          }
        ],
        suggestions: [
          {
            priority: 'high',
            title: 'Memory optimization',
            description: 'Reduce memory footprint',
            action: 'Review object lifecycle management'
          },
          {
            priority: 'medium',
            title: 'Performance tuning',
            description: 'Optimize slow operations',
            action: 'Profile and optimize hotspots'
          }
        ],
        timestamp: '2023-01-01T16:00:00Z'
      };

      const transformed = plainToClass(DashboardResponseDto, complexPlainObject);

      // 验证所有嵌套对象都被正确转换
      expect(transformed).toBeInstanceOf(DashboardResponseDto);
      expect(transformed.trendsData).toBeInstanceOf(TrendsDataDto);
      expect(transformed.criticalIssues).toHaveLength(2);
      expect(transformed.criticalIssues[0]).toBeInstanceOf(CriticalIssueDto);
      expect(transformed.criticalIssues[1]).toBeInstanceOf(CriticalIssueDto);
      expect(transformed.suggestions).toHaveLength(2);
      expect(transformed.suggestions[0]).toBeInstanceOf(OptimizationSuggestionDto);
      expect(transformed.suggestions[1]).toBeInstanceOf(OptimizationSuggestionDto);

      // 验证日期转换
      expect(transformed.timestamp).toBeInstanceOf(Date);
      expect(transformed.criticalIssues[0].timestamp).toBeInstanceOf(Date);
      expect(transformed.criticalIssues[1].timestamp).toBeInstanceOf(Date);
    });
  });
});