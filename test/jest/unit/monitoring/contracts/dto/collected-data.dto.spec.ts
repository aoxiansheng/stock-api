/**
 * CollectedDataDto Unit Tests
 * 测试监控数据收集DTO的验证和转换逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CollectedDataDto,
  RequestMetricDto,
  DatabaseMetricDto,
  CacheMetricDto,
  SystemMetricDto,
} from '@monitoring/contracts/dto/collected-data.dto';

describe('CollectedDataDto', () => {
  describe('Validation', () => {
    it('should validate empty CollectedDataDto', async () => {
      const dto = new CollectedDataDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate CollectedDataDto with all optional fields', async () => {
      const dto = plainToInstance(CollectedDataDto, {
        requests: [
          {
            endpoint: '/api/test',
            method: 'GET',
            responseTimeMs: 100,
            statusCode: 200,
            timestamp: new Date().toISOString(),
          },
        ],
        database: [
          {
            operation: 'find',
            collection: 'users',
            responseTimeMs: 50,
            success: true,
            timestamp: new Date().toISOString(),
          },
        ],
        cache: [
          {
            operation: 'get',
            key: 'user:123',
            hit: true,
            responseTimeMs: 5,
            timestamp: new Date().toISOString(),
          },
        ],
        system: {
          memory: {
            used: 1000000,
            total: 2000000,
            percentage: 50
          },
          cpu: {
            usage: 45.5
          },
          uptime: 3600,
          timestamp: new Date().toISOString(),
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested RequestMetricDto array', async () => {
      const dto = plainToInstance(CollectedDataDto, {
        requests: [
          {
            endpoint: '/api/users',
            method: 'POST',
            responseTimeMs: 150,
            statusCode: 201,
            timestamp: new Date().toISOString(),
            userId: 'user123',
            authType: 'jwt',
          },
          {
            endpoint: '/api/products',
            method: 'GET',
            responseTimeMs: 80,
            statusCode: 200,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.requests).toHaveLength(2);
      expect(dto.requests[0]).toBeInstanceOf(RequestMetricDto);
      expect(dto.requests[1]).toBeInstanceOf(RequestMetricDto);
    });

    it('should validate nested SystemMetricDto', async () => {
      const dto = plainToInstance(CollectedDataDto, {
        system: {
          cpuUsage: 85.7,
          memoryUsage: 90.3,
          diskUsage: 65.8,
          timestamp: new Date().toISOString(),
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.system).toBeInstanceOf(SystemMetricDto);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to CollectedDataDto instance', () => {
      const plain = {
        requests: [
          {
            endpoint: '/api/test',
            method: 'GET',
            responseTime: 100,
            statusCode: 200,
            timestamp: '2023-01-01T00:00:00.000Z',
          },
        ],
        system: {
          cpuUsage: 50.0,
          memoryUsage: 70.0,
          diskUsage: 40.0,
          timestamp: '2023-01-01T00:00:00.000Z',
        },
      };

      const dto = plainToInstance(CollectedDataDto, plain);

      expect(dto).toBeInstanceOf(CollectedDataDto);
      expect(dto.requests[0]).toBeInstanceOf(RequestMetricDto);
      expect(dto.system).toBeInstanceOf(SystemMetricDto);
    });

    it('should handle empty arrays correctly', () => {
      const plain = {
        requests: [],
        database: [],
        cache: [],
      };

      const dto = plainToInstance(CollectedDataDto, plain);

      expect(dto).toBeInstanceOf(CollectedDataDto);
      expect(dto.requests).toEqual([]);
      expect(dto.database).toEqual([]);
      expect(dto.cache).toEqual([]);
    });

    it('should handle undefined optional fields', () => {
      const plain = {};

      const dto = plainToInstance(CollectedDataDto, plain);

      expect(dto).toBeInstanceOf(CollectedDataDto);
      expect(dto.requests).toBeUndefined();
      expect(dto.database).toBeUndefined();
      expect(dto.cache).toBeUndefined();
      expect(dto.system).toBeUndefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid response time values', async () => {
      const dto = plainToInstance(CollectedDataDto, {
        requests: [
          {
            endpoint: '/api/test',
            method: 'GET',
            responseTimeMs: -100, // Invalid negative time
            statusCode: 200,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid system metrics', async () => {
      const dto = plainToInstance(CollectedDataDto, {
        system: {
          cpuUsage: -50.0, // Invalid negative usage
          memoryUsage: 150.0, // Invalid >100% usage
          diskUsage: 'not-a-number', // Invalid type
          timestamp: new Date().toISOString(),
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    it('should enforce proper typing for all fields', () => {
      const dto = new CollectedDataDto();

      // TypeScript should enforce these types
      dto.requests = [] as RequestMetricDto[];
      dto.database = [] as DatabaseMetricDto[];
      dto.cache = [] as CacheMetricDto[];
      dto.system = {} as SystemMetricDto;

      expect(dto.requests).toBeDefined();
      expect(dto.database).toBeDefined();
      expect(dto.cache).toBeDefined();
      expect(dto.system).toBeDefined();
    });

    it('should allow undefined for all optional fields', () => {
      const dto = new CollectedDataDto();

      expect(dto.requests).toBeUndefined();
      expect(dto.database).toBeUndefined();
      expect(dto.cache).toBeUndefined();
      expect(dto.system).toBeUndefined();
    });
  });
});