/**
 * PresenterQueryDto Unit Tests
 * 测试监控展示层查询DTO的验证功能
 */

import { validate } from 'class-validator';
import { GetDbPerformanceQueryDto, DateRangeValidator } from '@monitoring/presenter/dto/presenter-query.dto';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

describe('PresenterQueryDto', () => {
  describe('GetDbPerformanceQueryDto', () => {
    it('should validate correct date format', async () => {
      const dto = new GetDbPerformanceQueryDto();
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-01-02T00:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept valid optional dates', async () => {
      const dto = new GetDbPerformanceQueryDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid date format', async () => {
      const dto = new GetDbPerformanceQueryDto();
      dto.startDate = 'invalid-date';
      dto.endDate = '2023-01-02';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('startDate');
      expect(errors[0].constraints).toHaveProperty('isDateString');
    });

    it('should reject end date before start date', async () => {
      const dto = new GetDbPerformanceQueryDto();
      dto.startDate = '2023-01-02T00:00:00Z';
      dto.endDate = '2023-01-01T00:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('endDate');
      expect(errors[0].constraints).toHaveProperty('DateRangeValidator');
    });

    it('should reject date range exceeding 31 days', async () => {
      const dto = new GetDbPerformanceQueryDto();
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-02-02T00:00:00Z'; // 32 days

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('endDate');
      expect(errors[0].constraints).toHaveProperty('DateRangeValidator');
    });

    it('should accept date range within 31 days', async () => {
      const dto = new GetDbPerformanceQueryDto();
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-01-31T00:00:00Z'; // 30 days

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept same start and end date', async () => {
      const dto = new GetDbPerformanceQueryDto();
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-01-01T00:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('DateRangeValidator', () => {
    let validator: DateRangeValidator;

    beforeEach(() => {
      validator = new DateRangeValidator();
    });

    it('should validate correct date range', () => {
      const result = validator.validate('2023-01-02T00:00:00Z', {
        object: { startDate: '2023-01-01T00:00:00Z' },
        constraints: ['startDate'],
        property: 'endDate',
        value: '2023-01-02T00:00:00Z',
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(true);
    });

    it('should validate when start date is missing', () => {
      const result = validator.validate('2023-01-02T00:00:00Z', {
        object: { startDate: undefined },
        constraints: ['startDate'],
        property: 'endDate',
        value: '2023-01-02T00:00:00Z',
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(true);
    });

    it('should validate when end date is missing', () => {
      const result = validator.validate(undefined, {
        object: { startDate: '2023-01-01T00:00:00Z' },
        constraints: ['startDate'],
        property: 'endDate',
        value: undefined,
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(true);
    });

    it('should reject invalid start date', () => {
      const result = validator.validate('2023-01-02T00:00:00Z', {
        object: { startDate: 'invalid-date' },
        constraints: ['startDate'],
        property: 'endDate',
        value: '2023-01-02T00:00:00Z',
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(false);
    });

    it('should reject invalid end date', () => {
      const result = validator.validate('invalid-date', {
        object: { startDate: '2023-01-01T00:00:00Z' },
        constraints: ['startDate'],
        property: 'endDate',
        value: 'invalid-date',
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(false);
    });

    it('should reject end date before start date', () => {
      const result = validator.validate('2023-01-01T00:00:00Z', {
        object: { startDate: '2023-01-02T00:00:00Z' },
        constraints: ['startDate'],
        property: 'endDate',
        value: '2023-01-01T00:00:00Z',
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(false);
    });

    it('should reject date range exceeding 31 days', () => {
      // 32 days difference
      const result = validator.validate('2023-02-02T00:00:00Z', {
        object: { startDate: '2023-01-01T00:00:00Z' },
        constraints: ['startDate'],
        property: 'endDate',
        value: '2023-02-02T00:00:00Z',
        targetName: 'GetDbPerformanceQueryDto',
      } as any);

      expect(result).toBe(false);
    });

    it('should provide default error message', () => {
      const message = validator.defaultMessage();
      expect(message).toBe('Date range cannot exceed 31 days and end date must be after start date');
    });

    it('should use DAY_IN_MS constant for date range validation', () => {
      expect(MONITORING_SYSTEM_LIMITS.DAY_IN_MS).toBe(86400000); // 24 * 60 * 60 * 1000
    });
  });
});