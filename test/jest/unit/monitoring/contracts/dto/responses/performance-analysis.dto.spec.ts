/**
 * PerformanceAnalysisDto Unit Tests
 * 测试性能分析DTO的验证和转换逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  PerformanceAnalysisDto,
  PerformanceAnalysisSummaryDto,
  PerformanceTrendsDto,
  EndpointMetricDto,
  DatabaseMetricsDto,
  CacheMetricsDto,
} from '@monitoring/contracts/dto/responses/performance-analysis.dto';

describe('PerformanceAnalysisDto', () => {
  describe('Validation', () => {
    it('should validate complete PerformanceAnalysisDto', async () => {
      const dto = plainToInstance(PerformanceAnalysisDto, {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 92.5,
        summary: {
          totalOperations: 15420,
          averageResponseTime: 128.5,
          errorRate: 0.12,
          requestsPerSecond: 45.2,
        },
        trends: {
          responseTime: [120, 135, 142, 128],
          errorRate: [0.1, 0.15, 0.08, 0.12],
          throughput: [42, 45, 48, 45],
          timeLabels: ['10:00', '10:15', '10:30', '10:45'],
        },
        endpointMetrics: [
          {
            endpoint: '/api/v1/receiver/get-stock-quote',
            requestCount: 1250,
            averageResponseTime: 85.2,
            errorCount: 2,
            maxResponseTime: 450.8,
          },
        ],
        databaseMetrics: {
          mongoConnections: 25,
          mongoAverageQueryTime: 12.5,
          mongoSlowQueries: 3,
          redisConnections: 15,
          redisHitRate: 94.2,
        },
        cacheMetrics: {
          smartCacheHitRate: 92.5,
          symbolCacheHitRate: 88.7,
          totalCacheSize: 145.8,
          cacheEntryCount: 8942,
          averageAccessTime: 2.1,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate PerformanceAnalysisSummaryDto', async () => {
      const dto = plainToInstance(PerformanceAnalysisSummaryDto, {
        totalOperations: 15420,
        averageResponseTime: 128.5,
        errorRate: 0.12,
        requestsPerSecond: 45.2,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(PerformanceAnalysisSummaryDto);
    });

    it('should validate PerformanceTrendsDto', async () => {
      const dto = plainToInstance(PerformanceTrendsDto, {
        responseTime: [120, 135, 142, 128],
        errorRate: [0.1, 0.15, 0.08, 0.12],
        throughput: [42, 45, 48, 45],
        timeLabels: ['10:00', '10:15', '10:30', '10:45'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(PerformanceTrendsDto);
    });

    it('should validate EndpointMetricDto array', async () => {
      const dto = plainToInstance(PerformanceAnalysisDto, {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 92.5,
        summary: {
          totalOperations: 0,
          averageResponseTime: 0,
          errorRate: 0,
          requestsPerSecond: 0,
        },
        endpointMetrics: [
          {
            endpoint: '/api/v1/users',
            requestCount: 500,
            averageResponseTime: 65.2,
            errorCount: 1,
            maxResponseTime: 320.5,
          },
          {
            endpoint: '/api/v1/orders',
            requestCount: 350,
            averageResponseTime: 95.8,
            errorCount: 3,
            maxResponseTime: 580.2,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.endpointMetrics).toHaveLength(2);
      expect(dto.endpointMetrics[0]).toBeInstanceOf(EndpointMetricDto);
      expect(dto.endpointMetrics[1]).toBeInstanceOf(EndpointMetricDto);
    });

    it('should validate DatabaseMetricsDto', async () => {
      const dto = plainToInstance(DatabaseMetricsDto, {
        mongoConnections: 25,
        mongoAverageQueryTime: 12.5,
        mongoSlowQueries: 3,
        redisConnections: 15,
        redisHitRate: 94.2,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(DatabaseMetricsDto);
    });

    it('should validate CacheMetricsDto', async () => {
      const dto = plainToInstance(CacheMetricsDto, {
        smartCacheHitRate: 92.5,
        symbolCacheHitRate: 88.7,
        totalCacheSize: 145.8,
        cacheEntryCount: 8942,
        averageAccessTime: 2.1,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(CacheMetricsDto);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to PerformanceAnalysisDto instance', () => {
      const plain = {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 95,
        summary: {
          totalOperations: 1000,
          averageResponseTime: 50,
          errorRate: 0.05,
          requestsPerSecond: 20,
        },
        trends: {
          responseTime: [45, 50, 55, 50],
          errorRate: [0.04, 0.05, 0.06, 0.05],
          throughput: [18, 20, 22, 20],
          timeLabels: ['09:00', '09:15', '09:30', '09:45'],
        },
      };

      const dto = plainToInstance(PerformanceAnalysisDto, plain);

      expect(dto).toBeInstanceOf(PerformanceAnalysisDto);
      expect(dto.summary).toBeInstanceOf(PerformanceAnalysisSummaryDto);
      expect(dto.trends).toBeInstanceOf(PerformanceTrendsDto);
    });

    it('should handle partial data correctly', () => {
      const plain = {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 95,
        summary: {
          totalOperations: 1000,
          averageResponseTime: 50,
          errorRate: 0.05,
          requestsPerSecond: 20,
        },
      };

      const dto = plainToInstance(PerformanceAnalysisDto, plain);

      expect(dto).toBeInstanceOf(PerformanceAnalysisDto);
      expect(dto.trends).toBeUndefined();
      expect(dto.endpointMetrics).toBeUndefined();
      expect(dto.databaseMetrics).toBeUndefined();
      expect(dto.cacheMetrics).toBeUndefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid health score values', async () => {
      const dto = plainToInstance(PerformanceAnalysisDto, {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 150, // Invalid >100 score
        summary: {
          totalOperations: 0,
          averageResponseTime: 0,
          errorRate: 0,
          requestsPerSecond: 0,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid error rate values', async () => {
      const dto = plainToInstance(PerformanceAnalysisDto, {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 95,
        summary: {
          totalOperations: 0,
          averageResponseTime: 0,
          errorRate: 1.5, // Invalid >1 error rate
          requestsPerSecond: 0,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid cache hit rate values', async () => {
      const dto = plainToInstance(PerformanceAnalysisDto, {
        timestamp: '2024-09-17T10:30:00.000Z',
        healthScore: 95,
        summary: {
          totalOperations: 0,
          averageResponseTime: 0,
          errorRate: 0,
          requestsPerSecond: 0,
        },
        cacheMetrics: {
          smartCacheHitRate: 150, // Invalid >100 hit rate
          symbolCacheHitRate: 88.7,
          totalCacheSize: 145.8,
          cacheEntryCount: 8942,
          averageAccessTime: 2.1,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});