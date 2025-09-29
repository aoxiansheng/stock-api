/**
 * GetTrendsDto Unit Tests
 * 测试趋势查询参数DTO的验证功能
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { GetTrendsDto } from '@monitoring/contracts/dto/queries/get-trends.dto';

describe('GetTrendsDto', () => {
  describe('Basic Validation', () => {
    it('should create instance with default values', () => {
      const dto = new GetTrendsDto();

      expect(dto.period).toBe('1h');
      expect(dto.page).toBe(1);   // inherited from BaseQueryDto
      expect(dto.limit).toBe(50); // inherited from BaseQueryDto
    });

    it('should accept all valid period values', async () => {
      const validPeriods = ['1h', '4h', '12h', '24h', '7d', '30d'];

      for (const period of validPeriods) {
        const dto = new GetTrendsDto();
        dto.period = period;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
        expect(dto.period).toBe(period);
      }
    });

    it('should inherit BaseQueryDto validation for page and limit', async () => {
      const dto = new GetTrendsDto();
      dto.page = 5;
      dto.limit = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(5);
      expect(dto.limit).toBe(100);
    });
  });

  describe('Period Validation', () => {
    it('should reject invalid period values', async () => {
      const invalidPeriods = ['2h', '6h', '8h', '1d', '2d', '14d', '60d', 'invalid'];

      for (const period of invalidPeriods) {
        const dto = new GetTrendsDto();
        dto.period = period;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('period');
        expect(errors[0].constraints).toHaveProperty('isIn');
        expect(errors[0].constraints.isIn).toContain('period 必须是以下值之一: 1h, 4h, 12h, 24h, 7d, 30d');
      }
    });

    it('should reject non-string period values', async () => {
      const dto = new GetTrendsDto();
      (dto as any).period = 1; // number instead of string

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('period');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should be case sensitive for period values', async () => {
      const caseSensitivePeriods = ['1H', '4H', '12H', '24H', '7D', '30D'];

      for (const period of caseSensitivePeriods) {
        const dto = new GetTrendsDto();
        dto.period = period;

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('period');
        expect(errors[0].constraints).toHaveProperty('isIn');
      }
    });
  });

  describe('Optional Properties', () => {
    it('should allow undefined period (uses default)', async () => {
      const dto = new GetTrendsDto();
      dto.period = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow undefined page and limit', async () => {
      const dto = new GetTrendsDto();
      dto.page = undefined;
      dto.limit = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle empty object transformation with defaults', () => {
      const plainObject = {};
      const transformed = plainToClass(GetTrendsDto, plainObject);

      expect(transformed.period).toBe('1h'); // default value
      expect(transformed.page).toBe(1);      // inherited default
      expect(transformed.limit).toBe(50);    // inherited default
    });
  });

  describe('Period Categories', () => {
    it('should accept hourly periods', async () => {
      const hourlyPeriods = ['1h', '4h', '12h', '24h'];

      for (const period of hourlyPeriods) {
        const dto = new GetTrendsDto();
        dto.period = period;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
        expect(dto.period).toBe(period);
        expect(dto.period).toMatch(/\d+h$/);
      }
    });

    it('should accept daily periods', async () => {
      const dailyPeriods = ['7d', '30d'];

      for (const period of dailyPeriods) {
        const dto = new GetTrendsDto();
        dto.period = period;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
        expect(dto.period).toBe(period);
        expect(dto.period).toMatch(/\d+d$/);
      }
    });
  });

  describe('Transformation Tests', () => {
    it('should transform query parameters correctly', () => {
      const queryParams = {
        period: '7d',
        page: '2',
        limit: '25'
      };

      const transformed = plainToClass(GetTrendsDto, queryParams);

      expect(transformed.period).toBe('7d');
      expect(transformed.page).toBe(2);
      expect(transformed.limit).toBe(25);
      expect(typeof transformed.period).toBe('string');
      expect(typeof transformed.page).toBe('number');
      expect(typeof transformed.limit).toBe('number');
    });

    it('should handle partial query parameters', () => {
      const queryParams = {
        period: '12h'
        // page and limit omitted
      };

      const transformed = plainToClass(GetTrendsDto, queryParams);

      expect(transformed.period).toBe('12h');
      expect(transformed.page).toBe(1);  // default
      expect(transformed.limit).toBe(50); // default
    });

    it('should preserve string type for period during transformation', () => {
      const queryParams = {
        period: '24h'
      };

      const transformed = plainToClass(GetTrendsDto, queryParams);

      expect(transformed.period).toBe('24h');
      expect(typeof transformed.period).toBe('string');
    });
  });

  describe('Inherited BaseQueryDto Validation', () => {
    it('should validate inherited page property', async () => {
      const dto = new GetTrendsDto();
      dto.page = 0; // Invalid page number

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const pageError = errors.find(error => error.property === 'page');
      expect(pageError).toBeDefined();
      expect(pageError?.constraints).toHaveProperty('min');
    });

    it('should validate inherited limit property', async () => {
      const dto = new GetTrendsDto();
      dto.limit = 0; // Invalid limit

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const limitError = errors.find(error => error.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints).toHaveProperty('min');
    });

    it('should allow maximum inherited limit value', async () => {
      const dto = new GetTrendsDto();
      dto.limit = 1000; // Max for BaseQueryDto

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.limit).toBe(1000);
    });

    it('should reject over-maximum inherited limit value', async () => {
      const dto = new GetTrendsDto();
      dto.limit = 1001; // Over max for BaseQueryDto

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const limitError = errors.find(error => error.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints).toHaveProperty('max');
    });
  });

  describe('Combined Validation', () => {
    it('should validate all properties together', async () => {
      const dto = new GetTrendsDto();
      dto.period = '30d';
      dto.page = 10;
      dto.limit = 200;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.period).toBe('30d');
      expect(dto.page).toBe(10);
      expect(dto.limit).toBe(200);
    });

    it('should report multiple validation errors', async () => {
      const dto = new GetTrendsDto();
      dto.period = 'invalid';  // Invalid period
      dto.page = -1;           // Invalid page
      dto.limit = 2000;        // Invalid limit

      const errors = await validate(dto);
      expect(errors.length).toBe(3);

      const properties = errors.map(error => error.property);
      expect(properties).toContain('period');
      expect(properties).toContain('page');
      expect(properties).toContain('limit');
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in period', async () => {
      const dto = new GetTrendsDto();
      dto.period = ' 1h '; // With whitespace

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('period');
    });

    it('should handle empty string period', async () => {
      const dto = new GetTrendsDto();
      dto.period = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('period');
    });

    it('should handle null period', async () => {
      const dto = new GetTrendsDto();
      (dto as any).period = null;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('period');
    });
  });

  describe('Integration Tests', () => {
    it('should work correctly in realistic API query scenario', () => {
      // Simulate a typical API query transformation
      const apiQuery = {
        period: '7d',
        page: '1',
        limit: '100'
      };

      const transformed = plainToClass(GetTrendsDto, apiQuery);

      expect(transformed).toBeInstanceOf(GetTrendsDto);
      expect(transformed.period).toBe('7d');
      expect(transformed.page).toBe(1);
      expect(transformed.limit).toBe(100);
    });

    it('should handle minimal valid query', async () => {
      const dto = new GetTrendsDto();
      // Only set required fields, use defaults for others

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.period).toBe('1h'); // default
      expect(dto.page).toBe(1);      // default
      expect(dto.limit).toBe(50);    // default
    });
  });
});