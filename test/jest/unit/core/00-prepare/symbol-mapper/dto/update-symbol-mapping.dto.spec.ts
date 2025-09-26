import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  UpdateSymbolMappingDto,
  TransformSymbolsDto,
  TransformSymbolsResponseDto,
  AddSymbolMappingRuleDto,
  UpdateSymbolMappingRuleDto,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto';

describe('Update Symbol Mapping DTOs', () => {
  describe('UpdateSymbolMappingDto', () => {
    it('should extend from CreateSymbolMappingDto with all fields optional', async () => {
      const dto = plainToClass(UpdateSymbolMappingDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial data', async () => {
      const dto = plainToClass(UpdateSymbolMappingDto, {
        description: 'Updated description',
        version: '1.1.0',
        isActive: false,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all fields provided', async () => {
      const dto = plainToClass(UpdateSymbolMappingDto, {
        dataSourceName: 'updated-longport',
        SymbolMappingRule: [
          {
            standardSymbol: '700.HK',
            sdkSymbol: '00700',
            market: 'HK',
            symbolType: 'stock',
            isActive: true,
            description: 'Tencent Holdings Limited',
          },
        ],
        description: 'Updated LongPort symbol mapping configuration',
        version: '1.1.0',
        isActive: false,
        createdBy: 'updated-admin',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should inherit validation from CreateSymbolMappingDto when fields are provided', async () => {
      const dto = plainToClass(UpdateSymbolMappingDto, {
        dataSourceName: 'invalid.source', // Contains invalid character (dot)
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.constraints?.matches)).toBe(true);
    });
  });

  describe('TransformSymbolsDto', () => {
    const validTransformData = {
      dataSourceName: 'longport',
      symbols: ['700.HK', 'AAPL.US', '0001.HK'],
    };

    it('should pass validation with valid data', async () => {
      const dto = plainToClass(TransformSymbolsDto, validTransformData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    describe('dataSourceName validation', () => {
      it('should fail if dataSourceName is empty', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          ...validTransformData,
          dataSourceName: '',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should fail if dataSourceName is not a string', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          ...validTransformData,
          dataSourceName: 123,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });

      it('should fail if dataSourceName is missing', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          symbols: ['700.HK'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });
    });

    describe('symbols validation', () => {
      it('should fail if symbols array is empty', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          ...validTransformData,
          symbols: [],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.arrayNotEmpty)).toBe(true);
      });

      it('should fail if symbols is not an array', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          ...validTransformData,
          symbols: 'not-an-array',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isArray)).toBe(true);
      });

      it('should fail if symbols array contains non-string elements', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          ...validTransformData,
          symbols: ['700.HK', 123, 'AAPL.US'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });

      it('should fail if symbols array contains empty strings', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          ...validTransformData,
          symbols: ['700.HK', '', 'AAPL.US'],
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should pass with various valid symbol formats', async () => {
        const dto = plainToClass(TransformSymbolsDto, {
          dataSourceName: 'longport',
          symbols: ['700.HK', 'AAPL.US', '000001.SZ', 'BTC-USD', 'INDEX123'],
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('TransformSymbolsResponseDto', () => {
    it('should create instance with all properties', () => {
      const dto = new TransformSymbolsResponseDto();
      dto.dataSourceName = 'longport';
      dto.transformedSymbols = { '700.HK': '00700' };
      dto.failedSymbols = ['INVALID.SYMBOL'];
      dto.processingTimeMs = 150;

      expect(dto.dataSourceName).toBe('longport');
      expect(dto.transformedSymbols).toEqual({ '700.HK': '00700' });
      expect(dto.failedSymbols).toEqual(['INVALID.SYMBOL']);
      expect(dto.processingTimeMs).toBe(150);
    });

    it('should handle empty results', () => {
      const dto = new TransformSymbolsResponseDto();
      dto.dataSourceName = 'longport';
      dto.transformedSymbols = {};
      dto.failedSymbols = [];
      dto.processingTimeMs = 50;

      expect(dto.transformedSymbols).toEqual({});
      expect(dto.failedSymbols).toEqual([]);
      expect(dto.processingTimeMs).toBe(50);
    });
  });

  describe('AddSymbolMappingRuleDto', () => {
    const validAddRuleData = {
      dataSourceName: 'longport',
      symbolMappingRule: {
        standardSymbol: '700.HK',
        sdkSymbol: '00700',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      },
    };

    it('should pass validation with valid data', async () => {
      const dto = plainToClass(AddSymbolMappingRuleDto, validAddRuleData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    describe('dataSourceName validation', () => {
      it('should fail if dataSourceName is empty', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          ...validAddRuleData,
          dataSourceName: '',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should fail if dataSourceName is not a string', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          ...validAddRuleData,
          dataSourceName: 123,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });

      it('should fail if dataSourceName is missing', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          symbolMappingRule: validAddRuleData.symbolMappingRule,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });
    });

    describe('symbolMappingRule validation', () => {
      it('should fail if symbolMappingRule is missing', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          dataSourceName: 'longport',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should fail if symbolMappingRule is null', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          symbolMappingRule: null,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should NOT validate nested SymbolMappingRuleDto (no @ValidateNested decorator)', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          symbolMappingRule: {
            standardSymbol: '', // Invalid but not validated due to missing @ValidateNested
            sdkSymbol: '00700',
          },
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should pass with minimal required rule data', async () => {
        const dto = plainToClass(AddSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          symbolMappingRule: {
            standardSymbol: '700.HK',
            sdkSymbol: '00700',
          },
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('UpdateSymbolMappingRuleDto', () => {
    const validUpdateRuleData = {
      dataSourceName: 'longport',
      standardSymbol: '700.HK',
      symbolMappingRule: {
        sdkSymbol: '00700-updated',
        market: 'HK',
        symbolType: 'stock',
        isActive: false,
        description: 'Updated Tencent Holdings Limited',
      },
    };

    it('should pass validation with valid data', async () => {
      const dto = plainToClass(UpdateSymbolMappingRuleDto, validUpdateRuleData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    describe('dataSourceName validation', () => {
      it('should fail if dataSourceName is empty', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          ...validUpdateRuleData,
          dataSourceName: '',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should fail if dataSourceName is not a string', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          ...validUpdateRuleData,
          dataSourceName: 123,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });
    });

    describe('standardSymbol validation', () => {
      it('should fail if standardSymbol is empty', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          ...validUpdateRuleData,
          standardSymbol: '',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should fail if standardSymbol is not a string', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          ...validUpdateRuleData,
          standardSymbol: 123,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isString)).toBe(true);
      });
    });

    describe('symbolMappingRule validation', () => {
      it('should fail if symbolMappingRule is missing', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          standardSymbol: '700.HK',
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.constraints?.isNotEmpty)).toBe(true);
      });

      it('should pass with partial symbolMappingRule update', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          standardSymbol: '700.HK',
          symbolMappingRule: {
            isActive: false,
          },
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should pass with empty symbolMappingRule object', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          standardSymbol: '700.HK',
          symbolMappingRule: {},
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should NOT validate individual fields in symbolMappingRule (no @ValidateNested decorator)', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          standardSymbol: '700.HK',
          symbolMappingRule: {
            sdkSymbol: 'A'.repeat(21), // Too long but not validated due to missing @ValidateNested
          },
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('complete update scenarios', () => {
      it('should handle updating all fields', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          standardSymbol: '700.HK',
          symbolMappingRule: {
            sdkSymbol: '00700-v2',
            market: 'HK',
            symbolType: 'stock',
            isActive: false,
            description: 'Updated description for Tencent',
          },
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle updating only specific fields', async () => {
        const dto = plainToClass(UpdateSymbolMappingRuleDto, {
          dataSourceName: 'longport',
          standardSymbol: '700.HK',
          symbolMappingRule: {
            description: 'New description only',
          },
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('DTO relationships and type compatibility', () => {
    it('should ensure AddSymbolMappingRuleDto accepts full SymbolMappingRuleDto', async () => {
      const fullRule = {
        standardSymbol: '700.HK',
        sdkSymbol: '00700',
        market: 'HK',
        symbolType: 'stock',
        isActive: true,
        description: 'Tencent Holdings Limited',
      };

      const dto = plainToClass(AddSymbolMappingRuleDto, {
        dataSourceName: 'longport',
        symbolMappingRule: fullRule,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should ensure UpdateSymbolMappingRuleDto accepts partial SymbolMappingRuleDto', () => {
      const partialRule = {
        sdkSymbol: '00700-updated',
        isActive: false,
      };

      const dto = plainToClass(UpdateSymbolMappingRuleDto, {
        dataSourceName: 'longport',
        standardSymbol: '700.HK',
        symbolMappingRule: partialRule,
      });

      expect(dto.symbolMappingRule).toEqual(partialRule);
      expect(dto.symbolMappingRule.sdkSymbol).toBe('00700-updated');
      expect(dto.symbolMappingRule.isActive).toBe(false);
      expect(dto.symbolMappingRule.market).toBeUndefined();
    });
  });
});