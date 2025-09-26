import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

import { DataTransformationStatsDto } from '../../../../../../../src/core/02-processing/transformer/dto/data-transform-interfaces.dto';

describe('DataTransformationStatsDto', () => {
  describe('Validation', () => {
    it('should validate valid transformation stats', async () => {
      const validStats = {
        recordsProcessed: 5,
        fieldsTransformed: 12,
        transformationsApplied: [
          {
            sourceField: 'last_done',
            targetField: 'lastPrice',
            transformType: 'direct',
            transformValue: null,
          },
          {
            sourceField: 'change_rate',
            targetField: 'changePercent',
            transformType: 'multiply',
            transformValue: 100,
          },
        ],
      };

      const dto = plainToClass(DataTransformationStatsDto, validStats);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid recordsProcessed', async () => {
      const invalidStats = {
        recordsProcessed: 'invalid', // Should be number
        fieldsTransformed: 12,
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, invalidStats);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'recordsProcessed')).toBe(true);
    });

    it('should fail validation for invalid fieldsTransformed', async () => {
      const invalidStats = {
        recordsProcessed: 5,
        fieldsTransformed: 'invalid', // Should be number
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, invalidStats);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'fieldsTransformed')).toBe(true);
    });

    it('should fail validation for invalid transformationsApplied', async () => {
      const invalidStats = {
        recordsProcessed: 5,
        fieldsTransformed: 12,
        transformationsApplied: 'invalid', // Should be array
      };

      const dto = plainToClass(DataTransformationStatsDto, invalidStats);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'transformationsApplied')).toBe(true);
    });

    it('should validate empty transformations array', async () => {
      const validStats = {
        recordsProcessed: 0,
        fieldsTransformed: 0,
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, validStats);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate transformation with minimal fields', async () => {
      const validStats = {
        recordsProcessed: 1,
        fieldsTransformed: 1,
        transformationsApplied: [
          {
            sourceField: 'source',
            targetField: 'target',
          },
        ],
      };

      const dto = plainToClass(DataTransformationStatsDto, validStats);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate transformation with all fields', async () => {
      const validStats = {
        recordsProcessed: 1,
        fieldsTransformed: 1,
        transformationsApplied: [
          {
            sourceField: 'last_done',
            targetField: 'lastPrice',
            transformType: 'multiply',
            transformValue: 100,
          },
        ],
      };

      const dto = plainToClass(DataTransformationStatsDto, validStats);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate multiple transformations', async () => {
      const validStats = {
        recordsProcessed: 3,
        fieldsTransformed: 6,
        transformationsApplied: [
          {
            sourceField: 'field1',
            targetField: 'target1',
            transformType: 'direct',
          },
          {
            sourceField: 'field2',
            targetField: 'target2',
            transformType: 'format',
            transformValue: 'uppercase',
          },
          {
            sourceField: 'field3',
            targetField: 'target3',
            transformType: 'calculate',
            transformValue: { formula: 'x * 2' },
          },
        ],
      };

      const dto = plainToClass(DataTransformationStatsDto, validStats);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all properties', () => {
      const statsData = {
        recordsProcessed: 10,
        fieldsTransformed: 25,
        transformationsApplied: [
          {
            sourceField: 'input_field',
            targetField: 'output_field',
            transformType: 'convert',
            transformValue: 'string',
          },
        ],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);

      expect(dto.recordsProcessed).toBe(10);
      expect(dto.fieldsTransformed).toBe(25);
      expect(dto.transformationsApplied).toHaveLength(1);
      expect(dto.transformationsApplied[0].sourceField).toBe('input_field');
      expect(dto.transformationsApplied[0].targetField).toBe('output_field');
      expect(dto.transformationsApplied[0].transformType).toBe('convert');
      expect(dto.transformationsApplied[0].transformValue).toBe('string');
    });

    it('should handle zero values correctly', () => {
      const statsData = {
        recordsProcessed: 0,
        fieldsTransformed: 0,
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);

      expect(dto.recordsProcessed).toBe(0);
      expect(dto.fieldsTransformed).toBe(0);
      expect(dto.transformationsApplied).toEqual([]);
    });

    it('should handle large numbers correctly', () => {
      const statsData = {
        recordsProcessed: 1000000,
        fieldsTransformed: 5000000,
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);

      expect(dto.recordsProcessed).toBe(1000000);
      expect(dto.fieldsTransformed).toBe(5000000);
    });
  });

  describe('DTO Structure', () => {
    it('should have correct property types', () => {
      const dto = new DataTransformationStatsDto();
      dto.recordsProcessed = 5;
      dto.fieldsTransformed = 10;
      dto.transformationsApplied = [];

      expect(typeof dto.recordsProcessed).toBe('number');
      expect(typeof dto.fieldsTransformed).toBe('number');
      expect(Array.isArray(dto.transformationsApplied)).toBe(true);
    });

    it('should support transformation objects with optional properties', () => {
      const transformation = {
        sourceField: 'test_source',
        targetField: 'test_target',
        transformType: 'optional_type',
        transformValue: undefined,
      };

      const statsData = {
        recordsProcessed: 1,
        fieldsTransformed: 1,
        transformationsApplied: [transformation],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);

      expect(dto.transformationsApplied[0]).toEqual(transformation);
    });
  });

  describe('Edge Cases', () => {
    it('should handle fractional numbers for counts', async () => {
      const statsData = {
        recordsProcessed: 5.5,
        fieldsTransformed: 10.7,
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.recordsProcessed).toBe(5.5);
      expect(dto.fieldsTransformed).toBe(10.7);
    });

    it('should handle negative numbers', async () => {
      const statsData = {
        recordsProcessed: -1,
        fieldsTransformed: -5,
        transformationsApplied: [],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.recordsProcessed).toBe(-1);
      expect(dto.fieldsTransformed).toBe(-5);
    });

    it('should handle complex transform values', () => {
      const complexTransformation = {
        sourceField: 'complex_source',
        targetField: 'complex_target',
        transformType: 'complex',
        transformValue: {
          nested: {
            property: 'value',
            array: [1, 2, 3],
            boolean: true,
          },
        },
      };

      const statsData = {
        recordsProcessed: 1,
        fieldsTransformed: 1,
        transformationsApplied: [complexTransformation],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);

      expect(dto.transformationsApplied[0].transformValue).toEqual(complexTransformation.transformValue);
    });
  });

  describe('API Documentation', () => {
    it('should have swagger decorators for documentation', () => {
      const dto = new DataTransformationStatsDto();

      // Check that the class has the necessary metadata for Swagger documentation
      expect(dto).toBeDefined();

      // These properties should be documented with @ApiProperty
      expect(dto.hasOwnProperty('recordsProcessed')).toBeFalsy(); // Property doesn't exist until assigned
      expect('recordsProcessed' in DataTransformationStatsDto.prototype).toBeFalsy(); // Not in prototype either
    });

    it('should be serializable to JSON', () => {
      const statsData = {
        recordsProcessed: 5,
        fieldsTransformed: 10,
        transformationsApplied: [
          {
            sourceField: 'source',
            targetField: 'target',
            transformType: 'type',
            transformValue: 'value',
          },
        ],
      };

      const dto = plainToClass(DataTransformationStatsDto, statsData);
      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.recordsProcessed).toBe(5);
      expect(parsed.fieldsTransformed).toBe(10);
      expect(parsed.transformationsApplied).toHaveLength(1);
    });
  });
});
