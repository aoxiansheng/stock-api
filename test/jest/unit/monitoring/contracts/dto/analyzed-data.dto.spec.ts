/**
 * AnalyzedDataDto Unit Tests
 * 测试监控数据分析DTO的验证和转换逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  AnalyzedDataDto,
  PerformanceSummaryDto,
  EndpointMetricDto,
  DatabaseAnalysisDto,
  CacheAnalysisDto,
  ApiHealthDto,
  DatabaseHealthDto,
  CacheHealthDto,
  SystemHealthDto,
  SystemComponentsHealthDto,
  PerformanceSummaryDataDto,
  OptimizationSuggestionDto,
} from '@monitoring/contracts/dto/analyzed-data.dto';

describe('AnalyzedDataDto', () => {
  describe('Validation', () => {
    it('should validate complete AnalyzedDataDto', async () => {
      const dto = plainToInstance(AnalyzedDataDto, {
        timestamp: new Date().toISOString(),
        summary: {
          totalOperations: 1000,
          successfulOperations: 950,
          failedOperations: 50,
          responseTimeMs: 150,
          errorRate: 0.05,
        },
        responseTimeMs: 150,
        errorRate: 0.05,
        throughput: 100,
        healthScore: 92,
        trends: {
          responseTimeTrend: [140, 145, 150, 148],
          errorRateTrend: [0.04, 0.05, 0.05, 0.045],
          throughputTrend: [95, 100, 100, 98],
        },
        endpointMetrics: [
          {
            endpoint: '/api/test',
            method: 'GET',
            totalOperations: 500,
            responseTimeMs: 120,
            errorRate: 0.02,
            lastUsed: new Date().toISOString(),
          },
        ],
        databaseMetrics: {
          totalOperations: 200,
          responseTimeMs: 80,
          slowQueries: 5,
          failedOperations: 10,
          errorRate: 0.05,
        },
        cacheMetrics: {
          totalOperations: 800,
          hits: 750,
          misses: 50,
          hitRate: 0.9375,
          responseTimeMs: 5,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate minimal AnalyzedDataDto', async () => {
      const dto = plainToInstance(AnalyzedDataDto, {
        timestamp: new Date().toISOString(),
        summary: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          responseTimeMs: 0,
          errorRate: 0,
        },
        responseTimeMs: 0,
        errorRate: 0,
        throughput: 0,
        healthScore: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested PerformanceSummaryDto', async () => {
      const dto = plainToInstance(PerformanceSummaryDto, {
        totalOperations: 1000,
        successfulOperations: 950,
        failedOperations: 50,
        responseTimeMs: 150,
        errorRate: 0.05,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(PerformanceSummaryDto);
    });

    it('should validate nested EndpointMetricDto array', async () => {
      const dto = plainToInstance(AnalyzedDataDto, {
        timestamp: new Date().toISOString(),
        summary: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          responseTimeMs: 0,
          errorRate: 0,
        },
        responseTimeMs: 0,
        errorRate: 0,
        throughput: 0,
        healthScore: 0,
        endpointMetrics: [
          {
            endpoint: '/api/users',
            method: 'GET',
            totalOperations: 100,
            responseTimeMs: 50,
            errorRate: 0.01,
            lastUsed: new Date().toISOString(),
          },
          {
            endpoint: '/api/orders',
            method: 'POST',
            totalOperations: 50,
            responseTimeMs: 120,
            errorRate: 0.04,
            lastUsed: new Date().toISOString(),
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.endpointMetrics).toHaveLength(2);
      expect(dto.endpointMetrics[0]).toBeInstanceOf(EndpointMetricDto);
      expect(dto.endpointMetrics[1]).toBeInstanceOf(EndpointMetricDto);
    });

    it('should validate nested DatabaseAnalysisDto', async () => {
      const dto = plainToInstance(DatabaseAnalysisDto, {
        totalOperations: 200,
        responseTimeMs: 80,
        slowQueries: 5,
        failedOperations: 10,
        errorRate: 0.05,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(DatabaseAnalysisDto);
    });

    it('should validate nested CacheAnalysisDto', async () => {
      const dto = plainToInstance(CacheAnalysisDto, {
        totalOperations: 800,
        hits: 750,
        misses: 50,
        hitRate: 0.9375,
        responseTimeMs: 5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(CacheAnalysisDto);
    });
  });

  describe('Health DTOs', () => {
    it('should validate ApiHealthDto', async () => {
      const dto = plainToInstance(ApiHealthDto, {
        healthScore: 95,
        responseTimeMs: 45,
        errorRate: 0.03,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(ApiHealthDto);
    });

    it('should validate DatabaseHealthDto', async () => {
      const dto = plainToInstance(DatabaseHealthDto, {
        healthScore: 85,
        responseTimeMs: 75,
        errorRate: 0.08,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(DatabaseHealthDto);
    });

    it('should validate CacheHealthDto', async () => {
      const dto = plainToInstance(CacheHealthDto, {
        healthScore: 92,
        hits: 180,
        misses: 20,
        responseTimeMs: 4,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(CacheHealthDto);
    });

    it('should validate SystemHealthDto', async () => {
      const dto = plainToInstance(SystemHealthDto, {
        healthScore: 88,
        memoryUsage: 0.65,
        cpuUsage: 0.35,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(SystemHealthDto);
    });

    it('should validate SystemComponentsHealthDto', async () => {
      const dto = plainToInstance(SystemComponentsHealthDto, {
        api: {
          healthScore: 95,
          responseTimeMs: 45,
          errorRate: 0.03,
        },
        database: {
          healthScore: 85,
          responseTimeMs: 75,
          errorRate: 0.08,
        },
        cache: {
          healthScore: 92,
          hits: 180,
          misses: 20,
          responseTimeMs: 4,
        },
        system: {
          healthScore: 88,
          memoryUsage: 0.65,
          cpuUsage: 0.35,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(SystemComponentsHealthDto);
    });
  });

  describe('Optimization Suggestion DTO', () => {
    it('should validate OptimizationSuggestionDto', async () => {
      const dto = plainToInstance(OptimizationSuggestionDto, {
        category: 'performance',
        priority: 'high',
        title: 'Optimize database queries',
        description: 'Some queries are taking too long',
        action: 'Add indexes to frequently queried fields',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(OptimizationSuggestionDto);
    });

    it('should reject invalid enum values', async () => {
      const dto = plainToInstance(OptimizationSuggestionDto, {
        category: 'invalid-category',
        priority: 'high',
        title: 'Test suggestion',
        description: 'Test description',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to AnalyzedDataDto instance', () => {
      const plain = {
        timestamp: '2023-01-01T00:00:00.000Z',
        summary: {
          totalOperations: 100,
          successfulOperations: 95,
          failedOperations: 5,
          responseTimeMs: 50,
          errorRate: 0.05,
        },
        responseTimeMs: 50,
        errorRate: 0.05,
        throughput: 20,
        healthScore: 95,
      };

      const dto = plainToInstance(AnalyzedDataDto, plain);

      expect(dto).toBeInstanceOf(AnalyzedDataDto);
      expect(dto.summary).toBeInstanceOf(PerformanceSummaryDto);
      expect(dto.timestamp).toBeInstanceOf(Date);
    });

    it('should handle undefined optional fields', () => {
      const plain = {
        timestamp: '2023-01-01T00:00:00.000Z',
        summary: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          responseTimeMs: 0,
          errorRate: 0,
        },
        responseTimeMs: 0,
        errorRate: 0,
        throughput: 0,
        healthScore: 0,
      };

      const dto = plainToInstance(AnalyzedDataDto, plain);

      expect(dto).toBeInstanceOf(AnalyzedDataDto);
      expect(dto.trends).toBeUndefined();
      expect(dto.endpointMetrics).toBeUndefined();
      expect(dto.databaseMetrics).toBeUndefined();
      expect(dto.cacheMetrics).toBeUndefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid health score values', async () => {
      const dto = plainToInstance(AnalyzedDataDto, {
        timestamp: new Date().toISOString(),
        summary: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          responseTimeMs: 0,
          errorRate: 0,
        },
        responseTimeMs: -100, // Invalid negative time
        errorRate: 0,
        throughput: 0,
        healthScore: 150, // Invalid >100 score
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid error rate values', async () => {
      const dto = plainToInstance(AnalyzedDataDto, {
        timestamp: new Date().toISOString(),
        summary: {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          responseTimeMs: 0,
          errorRate: 0,
        },
        responseTimeMs: 0,
        errorRate: 1.5, // Invalid >1 error rate
        throughput: 0,
        healthScore: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});