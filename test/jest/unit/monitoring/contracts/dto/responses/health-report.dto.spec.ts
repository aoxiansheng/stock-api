/**
 * HealthReportDto Unit Tests
 * 测试健康报告DTO的验证和转换逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  HealthReportDto,
  HealthComponentDto,
  HealthOverallDto,
  HealthRecommendationDto,
} from '@monitoring/contracts/dto/responses/health-report.dto';

describe('HealthReportDto', () => {
  describe('Validation', () => {
    it('should validate complete HealthReportDto', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'healthy',
          score: 92.5,
          uptime: 86400,
          version: '1.0.0',
        },
        components: [
          {
            name: 'mongodb',
            status: 'healthy',
            responseTime: 12.5,
            error: null,
            score: 95,
          },
          {
            name: 'redis',
            status: 'degraded',
            responseTime: 25.0,
            error: 'High latency detected',
            score: 75,
          },
        ],
        recommendations: [
          {
            category: 'performance',
            priority: 'medium',
            title: 'Optimize database connection pool',
            description: 'Current database connection pool configuration may cause performance bottlenecks',
            action: 'Increase connection pool size to 50 connections',
            impact: 'Improve database query performance by approximately 15%',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate minimal HealthReportDto', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'healthy',
          score: 100,
          uptime: 3600,
          version: '1.0.0',
        },
        components: [],
        recommendations: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate HealthOverallDto', async () => {
      const dto = plainToInstance(HealthOverallDto, {
        status: 'healthy',
        score: 92.5,
        uptime: 86400,
        version: '1.0.0',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto).toBeInstanceOf(HealthOverallDto);
    });

    it('should validate HealthComponentDto array', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'healthy',
          score: 100,
          uptime: 3600,
          version: '1.0.0',
        },
        components: [
          {
            name: 'api',
            status: 'healthy',
            responseTime: 15.0,
            score: 98,
          },
          {
            name: 'database',
            status: 'healthy',
            responseTime: 20.0,
            error: null,
            score: 95,
          },
          {
            name: 'cache',
            status: 'degraded',
            responseTime: 35.0,
            error: 'High latency',
            score: 80,
          },
        ],
        recommendations: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.components).toHaveLength(3);
      expect(dto.components[0]).toBeInstanceOf(HealthComponentDto);
      expect(dto.components[1]).toBeInstanceOf(HealthComponentDto);
      expect(dto.components[2]).toBeInstanceOf(HealthComponentDto);
    });

    it('should validate HealthRecommendationDto array', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'healthy',
          score: 100,
          uptime: 3600,
          version: '1.0.0',
        },
        components: [],
        recommendations: [
          {
            category: 'performance',
            priority: 'high',
            title: 'Increase memory allocation',
            description: 'System is running low on available memory',
            action: 'Allocate additional 2GB RAM',
            impact: 'Reduce memory pressure by 40%',
          },
          {
            category: 'security',
            priority: 'medium',
            title: 'Update SSL certificates',
            description: 'SSL certificates will expire in 30 days',
            action: 'Renew certificates before expiration',
            impact: 'Maintain secure connections',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.recommendations).toHaveLength(2);
      expect(dto.recommendations[0]).toBeInstanceOf(HealthRecommendationDto);
      expect(dto.recommendations[1]).toBeInstanceOf(HealthRecommendationDto);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to HealthReportDto instance', () => {
      const plain = {
        overall: {
          status: 'healthy',
          score: 95,
          uptime: 7200,
          version: '1.0.0',
        },
        components: [
          {
            name: 'test-component',
            status: 'healthy',
            responseTime: 10.0,
            score: 100,
          },
        ],
        recommendations: [],
      };

      const dto = plainToInstance(HealthReportDto, plain);

      expect(dto).toBeInstanceOf(HealthReportDto);
      expect(dto.overall).toBeInstanceOf(HealthOverallDto);
      expect(dto.components[0]).toBeInstanceOf(HealthComponentDto);
    });

    it('should handle empty arrays correctly', () => {
      const plain = {
        overall: {
          status: 'healthy',
          score: 100,
          uptime: 3600,
          version: '1.0.0',
        },
        components: [],
        recommendations: [],
      };

      const dto = plainToInstance(HealthReportDto, plain);

      expect(dto).toBeInstanceOf(HealthReportDto);
      expect(dto.components).toEqual([]);
      expect(dto.recommendations).toEqual([]);
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid status values', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'invalid-status',
          score: 100,
          uptime: 3600,
          version: '1.0.0',
        },
        components: [],
        recommendations: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid score values', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'healthy',
          score: 150, // Invalid >100 score
          uptime: 3600,
          version: '1.0.0',
        },
        components: [],
        recommendations: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid recommendation categories', async () => {
      const dto = plainToInstance(HealthReportDto, {
        overall: {
          status: 'healthy',
          score: 100,
          uptime: 3600,
          version: '1.0.0',
        },
        components: [],
        recommendations: [
          {
            category: 'invalid-category',
            priority: 'high',
            title: 'Test recommendation',
            description: 'Test description',
            action: 'Test action',
            impact: 'Test impact',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});