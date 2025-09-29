/**
 * GetEndpointMetricsDto Unit Tests
 * 测试端点指标查询参数DTO的验证功能
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { GetEndpointMetricsDto } from '@monitoring/contracts/dto/queries/get-endpoint-metrics.dto';

describe('GetEndpointMetricsDto', () => {
  describe('Basic Validation', () => {
    it('should create instance with default values', () => {
      const dto = new GetEndpointMetricsDto();

      expect(dto.limit).toBe(50);
      expect(dto.page).toBe(1); // inherited from BaseQueryDto
    });

    it('should accept valid limit values', async () => {
      const validLimits = [1, 25, 50, 100, 250, 500];

      for (const limit of validLimits) {
        const dto = new GetEndpointMetricsDto();
        dto.limit = limit;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
        expect(dto.limit).toBe(limit);
      }
    });

    it('should accept valid page values', async () => {
      const validPages = [1, 2, 10, 100, 1000];

      for (const page of validPages) {
        const dto = new GetEndpointMetricsDto();
        dto.page = page;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
        expect(dto.page).toBe(page);
      }
    });
  });

  describe('Limit Validation', () => {
    it('should reject limit less than 1', async () => {
      const invalidLimits = [0, -1, -10];

      for (const limit of invalidLimits) {
        const dto = new GetEndpointMetricsDto();
        dto.limit = limit;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('limit');
        expect(errors[0].constraints).toHaveProperty('min');
        expect(errors[0].constraints.min).toContain('limit 最小值为1');
      }
    });

    it('should reject limit greater than 500', async () => {
      const invalidLimits = [501, 600, 1000, 2000];

      for (const limit of invalidLimits) {
        const dto = new GetEndpointMetricsDto();
        dto.limit = limit;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('limit');
        expect(errors[0].constraints).toHaveProperty('max');
        expect(errors[0].constraints.max).toContain('limit 最大值为500');
      }
    });

    it('should reject non-numeric limit values', async () => {
      const dto = new GetEndpointMetricsDto();
      (dto as any).limit = 'invalid';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('isNumber');
      expect(errors[0].constraints.isNumber).toContain('limit 必须为数字');
    });

    it('should handle string numeric values with transformation', () => {
      const plainObject = {
        limit: '100',
        page: '2'
      };

      const transformed = plainToClass(GetEndpointMetricsDto, plainObject);
      expect(transformed.limit).toBe(100);
      expect(typeof transformed.limit).toBe('number');
      expect(transformed.page).toBe(2);
      expect(typeof transformed.page).toBe('number');
    });
  });

  describe('Optional Properties', () => {
    it('should allow undefined limit', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.limit = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow undefined page', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.page = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle empty object transformation', () => {
      const plainObject = {};
      const transformed = plainToClass(GetEndpointMetricsDto, plainObject);

      expect(transformed.limit).toBe(50); // default value
      expect(transformed.page).toBe(1);   // inherited default value
    });
  });

  describe('Property Override Behavior', () => {
    it('should override inherited limit property with custom validation', async () => {
      const dto = new GetEndpointMetricsDto();

      // Test that the overridden limit has a max of 500, not 1000 from BaseQueryDto
      dto.limit = 1000; // This would be valid for BaseQueryDto but not for GetEndpointMetricsDto

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
      expect(errors[0].constraints.max).toContain('limit 最大值为500');
    });

    it('should inherit page validation from BaseQueryDto', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.page = 0; // Invalid page number

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Find page validation error
      const pageError = errors.find(error => error.property === 'page');
      expect(pageError).toBeDefined();
      expect(pageError?.constraints).toHaveProperty('min');
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal numbers for limit', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.limit = 50.5;

      const errors = await validate(dto);
      expect(errors.length).toBe(0); // IsNumber allows decimals
      expect(dto.limit).toBe(50.5);
    });

    it('should handle very large valid numbers', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.limit = 500;
      dto.page = 999999;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.limit).toBe(500);
      expect(dto.page).toBe(999999);
    });

    it('should validate both properties simultaneously', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.limit = 501;  // Invalid
      dto.page = -1;    // Invalid

      const errors = await validate(dto);
      expect(errors.length).toBe(2);

      const limitError = errors.find(error => error.property === 'limit');
      const pageError = errors.find(error => error.property === 'page');

      expect(limitError).toBeDefined();
      expect(pageError).toBeDefined();
    });
  });

  describe('Transformation Tests', () => {
    it('should transform query parameters correctly', () => {
      const queryParams = {
        limit: '25',
        page: '3'
      };

      const transformed = plainToClass(GetEndpointMetricsDto, queryParams);

      expect(transformed.limit).toBe(25);
      expect(transformed.page).toBe(3);
      expect(typeof transformed.limit).toBe('number');
      expect(typeof transformed.page).toBe('number');
    });

    it('should handle mixed data types', () => {
      const mixedData = {
        limit: 75,        // already number
        page: '5'         // string that needs conversion
      };

      const transformed = plainToClass(GetEndpointMetricsDto, mixedData);

      expect(transformed.limit).toBe(75);
      expect(transformed.page).toBe(5);
      expect(typeof transformed.limit).toBe('number');
      expect(typeof transformed.page).toBe('number');
    });
  });

  describe('Integration with BaseQueryDto', () => {
    it('should properly extend BaseQueryDto functionality', () => {
      const dto = new GetEndpointMetricsDto();

      // Test inherited properties exist
      expect(dto).toHaveProperty('page');
      expect(dto).toHaveProperty('limit');

      // Test default values
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(50);
    });

    it('should maintain BaseQueryDto validation for page while overriding limit', async () => {
      const dto = new GetEndpointMetricsDto();
      dto.page = 0;      // Invalid for BaseQueryDto
      dto.limit = 1000;  // Invalid for GetEndpointMetricsDto override

      const errors = await validate(dto);
      expect(errors.length).toBe(2);

      const pageError = errors.find(error => error.property === 'page');
      const limitError = errors.find(error => error.property === 'limit');

      expect(pageError).toBeDefined();
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.max).toContain('500'); // Our override, not BaseQueryDto's 1000
    });
  });
});