import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CreateSymbolMappingDto,
  SymbolMappingRuleDto,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto';

describe('CreateSymbolMappingDto', () => {
  describe('SymbolMappingRuleDto', () => {
    const validRuleData = {
      standardSymbol: '700.HK',
      sdkSymbol: '00700',
      market: 'HK',
      symbolType: 'stock',
      isActive: true,
      description: 'Tencent Holdings Limited',
    };

    it('should pass validation with valid data', async () => {
      const dto = plainToClass(SymbolMappingRuleDto, validRuleData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    describe('standardSymbol validation', () => {
      it('should fail if standardSymbol is empty', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          standardSymbol: '',
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isNotEmpty).toContain('系统标准格式代码不能为空');
      });

      it('should fail if standardSymbol is too long', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          standardSymbol: 'A'.repeat(21), // 21 characters, exceeds 20 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should fail if standardSymbol is not a string', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          standardSymbol: 123,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });
    });

    describe('sdkSymbol validation', () => {
      it('should fail if sdkSymbol is empty', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          sdkSymbol: '',
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isNotEmpty).toContain('厂商SDK格式代码不能为空');
      });

      it('should fail if sdkSymbol is too long', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          sdkSymbol: 'A'.repeat(21), // 21 characters, exceeds 20 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should fail if sdkSymbol is not a string', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          sdkSymbol: 123,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });
    });

    describe('optional fields validation', () => {
      it('should pass with minimal required fields only', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          standardSymbol: '700.HK',
          sdkSymbol: '00700',
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate market field length', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          market: 'A'.repeat(11), // 11 characters, exceeds 10 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should validate symbolType field length', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          symbolType: 'A'.repeat(21), // 21 characters, exceeds 20 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should validate description field length', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          description: 'A'.repeat(501), // 501 characters, exceeds 500 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should validate isActive is boolean', async () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          ...validRuleData,
          isActive: 'true', // string instead of boolean
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isBoolean)).toBe(true);
      });

      it('should default isActive to true when not provided', () => {
        const dto = plainToClass(SymbolMappingRuleDto, {
          standardSymbol: '700.HK',
          sdkSymbol: '00700',
        });
        expect(dto.isActive).toBe(true);
      });
    });
  });

  describe('CreateSymbolMappingDto', () => {
    const validMappingData = {
      dataSourceName: 'longport',
      SymbolMappingRule: [
        {
          standardSymbol: '700.HK',
          sdkSymbol: '00700',
          market: 'HK',
          symbolType: 'stock',
          isActive: true,
          description: 'Tencent Holdings Limited',
        },
        {
          standardSymbol: 'AAPL.US',
          sdkSymbol: 'AAPL',
          market: 'US',
          symbolType: 'stock',
          isActive: true,
          description: 'Apple Inc.',
        },
      ],
      description: 'LongPort symbol mapping configuration',
      version: '1.0.0',
      isActive: true,
      createdBy: 'admin',
    };

    it('should pass validation with valid data', async () => {
      const dto = plainToClass(CreateSymbolMappingDto, validMappingData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    describe('dataSourceName validation', () => {
      it('should fail if dataSourceName is empty', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          dataSourceName: '',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty || error.constraints?.minLength)).toBe(true);
      });

      it('should fail if dataSourceName is too long', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          dataSourceName: 'A'.repeat(51), // 51 characters, exceeds 50 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should fail if dataSourceName contains invalid characters', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          dataSourceName: 'invalid.source', // contains dot
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.matches)).toBe(true);
      });

      it('should pass with valid dataSourceName patterns', async () => {
        const validNames = ['longport', 'iex_cloud', 'twelve-data', 'test123'];

        for (const name of validNames) {
          const dto = plainToClass(CreateSymbolMappingDto, {
            ...validMappingData,
            dataSourceName: name,
          });
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });
    });

    describe('SymbolMappingRule validation', () => {
      it('should fail if SymbolMappingRule is empty array', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          SymbolMappingRule: [],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.arrayMinSize)).toBe(true);
      });

      it('should fail if SymbolMappingRule exceeds maximum size', async () => {
        const largeArray = Array(10001).fill(validMappingData.SymbolMappingRule[0]);
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          SymbolMappingRule: largeArray,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.arrayMaxSize)).toBe(true);
      });

      it('should fail if SymbolMappingRule is not an array', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          SymbolMappingRule: 'not-an-array',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isArray)).toBe(true);
      });

      it('should validate nested SymbolMappingRuleDto objects', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          SymbolMappingRule: [
            {
              standardSymbol: '', // invalid - empty
              sdkSymbol: '00700',
            },
          ],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('optional fields validation', () => {
      it('should pass with minimal required fields only', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          dataSourceName: 'longport',
          SymbolMappingRule: [
            {
              standardSymbol: '700.HK',
              sdkSymbol: '00700',
            },
          ],
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate description field length', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          description: 'A'.repeat(1001), // 1001 characters, exceeds 1000 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should validate version format', async () => {
        const invalidVersions = ['1.0', '1', 'v1.0.0', '1.0.0-beta', ''];

        for (const version of invalidVersions) {
          const dto = plainToClass(CreateSymbolMappingDto, {
            ...validMappingData,
            version,
          });
          const errors = await validate(dto);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some(error => error.constraints?.matches)).toBe(true);
        }
      });

      it('should validate version field length', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          version: '1.0.0'.repeat(10), // exceeds 20 characters
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should validate isActive is boolean', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          isActive: 'true', // string instead of boolean
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isBoolean)).toBe(true);
      });

      it('should validate createdBy field length', async () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          ...validMappingData,
          createdBy: 'A'.repeat(101), // 101 characters, exceeds 100 max
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.maxLength)).toBe(true);
      });

      it('should default isActive to true when not provided', () => {
        const dto = plainToClass(CreateSymbolMappingDto, {
          dataSourceName: 'longport',
          SymbolMappingRule: [
            {
              standardSymbol: '700.HK',
              sdkSymbol: '00700',
            },
          ],
        });
        expect(dto.isActive).toBe(true);
      });
    });

    describe('valid version formats', () => {
      it('should accept valid semantic version formats', async () => {
        const validVersions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];

        for (const version of validVersions) {
          const dto = plainToClass(CreateSymbolMappingDto, {
            ...validMappingData,
            version,
          });
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });
    });

    describe('transformation behavior', () => {
      it('should preserve nested SymbolMappingRule objects after transformation', () => {
        const dto = plainToClass(CreateSymbolMappingDto, validMappingData);

        expect(dto.SymbolMappingRule).toHaveLength(2);
        expect(dto.SymbolMappingRule[0]).toBeInstanceOf(SymbolMappingRuleDto);
        expect(dto.SymbolMappingRule[1]).toBeInstanceOf(SymbolMappingRuleDto);
        expect(dto.SymbolMappingRule[0].standardSymbol).toBe('700.HK');
        expect(dto.SymbolMappingRule[1].standardSymbol).toBe('AAPL.US');
      });
    });
  });
});