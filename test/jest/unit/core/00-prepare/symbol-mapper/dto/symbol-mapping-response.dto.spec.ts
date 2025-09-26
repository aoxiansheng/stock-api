import {
  SymbolMappingResponseDto,
  MappingRuleResponseDto,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/dto/symbol-mapping-response.dto';
import { SymbolMappingRuleDocumentType } from '../../../../../../../src/core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';

describe('SymbolMappingResponseDto', () => {
  const mockDate = new Date('2023-01-01T00:00:00Z');

  const mockDocument: Partial<SymbolMappingRuleDocumentType> = {
    _id: '507f1f77bcf86cd799439011' as any,
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
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockLeanObject = {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
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
    ],
    description: 'LongPort symbol mapping configuration',
    version: '1.0.0',
    isActive: true,
    createdBy: 'admin',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  describe('SymbolMappingResponseDto', () => {
    it('should create instance with all properties', () => {
      const dto = new SymbolMappingResponseDto();
      dto.id = '507f1f77bcf86cd799439011';
      dto.dataSourceName = 'longport';
      dto.SymbolMappingRule = [];
      dto.description = 'Test description';
      dto.version = '1.0.0';
      dto.isActive = true;
      dto.createdBy = 'admin';
      dto.createdAt = mockDate;
      dto.updatedAt = mockDate;

      expect(dto.id).toBe('507f1f77bcf86cd799439011');
      expect(dto.dataSourceName).toBe('longport');
      expect(dto.SymbolMappingRule).toEqual([]);
      expect(dto.description).toBe('Test description');
      expect(dto.version).toBe('1.0.0');
      expect(dto.isActive).toBe(true);
      expect(dto.createdBy).toBe('admin');
      expect(dto.createdAt).toBe(mockDate);
      expect(dto.updatedAt).toBe(mockDate);
    });

    describe('fromDocument static method', () => {
      it('should convert document to DTO correctly', () => {
        const dto = SymbolMappingResponseDto.fromDocument(mockDocument as SymbolMappingRuleDocumentType);

        expect(dto).toBeInstanceOf(SymbolMappingResponseDto);
        expect(dto.id).toBe('507f1f77bcf86cd799439011');
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.SymbolMappingRule).toHaveLength(2);
        expect(dto.SymbolMappingRule[0].standardSymbol).toBe('700.HK');
        expect(dto.SymbolMappingRule[0].sdkSymbol).toBe('00700');
        expect(dto.SymbolMappingRule[1].standardSymbol).toBe('AAPL.US');
        expect(dto.SymbolMappingRule[1].sdkSymbol).toBe('AAPL');
        expect(dto.description).toBe('LongPort symbol mapping configuration');
        expect(dto.version).toBe('1.0.0');
        expect(dto.isActive).toBe(true);
        expect(dto.createdBy).toBe('admin');
        expect(dto.createdAt).toBe(mockDate);
        expect(dto.updatedAt).toBe(mockDate);
      });

      it('should handle document with null SymbolMappingRule', () => {
        const documentWithNullRules = {
          ...mockDocument,
          SymbolMappingRule: null,
        };

        const dto = SymbolMappingResponseDto.fromDocument(documentWithNullRules as any);

        expect(dto.SymbolMappingRule).toEqual([]);
      });

      it('should handle document with undefined SymbolMappingRule', () => {
        const documentWithUndefinedRules = {
          ...mockDocument,
          SymbolMappingRule: undefined,
        };

        const dto = SymbolMappingResponseDto.fromDocument(documentWithUndefinedRules as any);

        expect(dto.SymbolMappingRule).toEqual([]);
      });

      it('should handle document without optional fields', () => {
        const minimalDocument = {
          _id: '507f1f77bcf86cd799439011' as any,
          dataSourceName: 'longport',
          SymbolMappingRule: [],
          isActive: true,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const dto = SymbolMappingResponseDto.fromDocument(minimalDocument as SymbolMappingRuleDocumentType);

        expect(dto.id).toBe('507f1f77bcf86cd799439011');
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.SymbolMappingRule).toEqual([]);
        expect(dto.isActive).toBe(true);
        expect(dto.createdAt).toBe(mockDate);
        expect(dto.updatedAt).toBe(mockDate);
        expect(dto.description).toBeUndefined();
        expect(dto.version).toBeUndefined();
        expect(dto.createdBy).toBeUndefined();
      });
    });

    describe('fromLeanObject static method', () => {
      it('should convert lean object to DTO correctly', () => {
        const dto = SymbolMappingResponseDto.fromLeanObject(mockLeanObject);

        expect(dto).toBeInstanceOf(SymbolMappingResponseDto);
        expect(dto.id).toBe('507f1f77bcf86cd799439011');
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.SymbolMappingRule).toHaveLength(1);
        expect(dto.SymbolMappingRule[0].standardSymbol).toBe('700.HK');
        expect(dto.SymbolMappingRule[0].sdkSymbol).toBe('00700');
        expect(dto.description).toBe('LongPort symbol mapping configuration');
        expect(dto.version).toBe('1.0.0');
        expect(dto.isActive).toBe(true);
        expect(dto.createdBy).toBe('admin');
        expect(dto.createdAt).toBe(mockDate.toISOString());
        expect(dto.updatedAt).toBe(mockDate.toISOString());
      });

      it('should use _id converted to string when both _id and id exist', () => {
        const leanObjectWithBoth = {
          ...mockLeanObject,
          _id: '507f1f77bcf86cd799439011',
          id: '507f1f77bcf86cd799439012',
        };

        const dto = SymbolMappingResponseDto.fromLeanObject(leanObjectWithBoth);

        expect(dto.id).toBe('507f1f77bcf86cd799439011');
      });

      it('should use _id converted to string when id is not present', () => {
        const leanObjectWithOnlyObjectId = {
          ...mockLeanObject,
          id: undefined,
          _id: { toString: () => '507f1f77bcf86cd799439013' },
        };

        const dto = SymbolMappingResponseDto.fromLeanObject(leanObjectWithOnlyObjectId);

        expect(dto.id).toBe('507f1f77bcf86cd799439013');
      });

      it('should handle dates that are not Date objects', () => {
        const leanObjectWithStringDates = {
          ...mockLeanObject,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
        };

        expect(() => {
          SymbolMappingResponseDto.fromLeanObject(leanObjectWithStringDates);
        }).toThrow();
      });

      it('should handle null/undefined date fields', () => {
        const leanObjectWithNullDates = {
          ...mockLeanObject,
          createdAt: null,
          updatedAt: undefined,
        };

        const dto = SymbolMappingResponseDto.fromLeanObject(leanObjectWithNullDates);

        expect(dto.createdAt).toBeUndefined();
        expect(dto.updatedAt).toBeUndefined();
      });

      it('should handle lean object without optional fields', () => {
        const minimalLeanObject = {
          _id: '507f1f77bcf86cd799439011',
          dataSourceName: 'longport',
          SymbolMappingRule: [],
          isActive: true,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const dto = SymbolMappingResponseDto.fromLeanObject(minimalLeanObject);

        expect(dto.id).toBe('507f1f77bcf86cd799439011');
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.SymbolMappingRule).toEqual([]);
        expect(dto.isActive).toBe(true);
        expect(dto.createdAt).toBe(mockDate.toISOString());
        expect(dto.updatedAt).toBe(mockDate.toISOString());
        expect(dto.description).toBeUndefined();
        expect(dto.version).toBeUndefined();
        expect(dto.createdBy).toBeUndefined();
      });
    });
  });

  describe('MappingRuleResponseDto', () => {
    it('should create instance with all properties', () => {
      const dto = new MappingRuleResponseDto();
      dto.standardSymbol = '700.HK';
      dto.sdkSymbol = '00700';
      dto.market = 'HK';
      dto.symbolType = 'stock';
      dto.isActive = true;
      dto.description = 'Tencent Holdings Limited';

      expect(dto.standardSymbol).toBe('700.HK');
      expect(dto.sdkSymbol).toBe('00700');
      expect(dto.market).toBe('HK');
      expect(dto.symbolType).toBe('stock');
      expect(dto.isActive).toBe(true);
      expect(dto.description).toBe('Tencent Holdings Limited');
    });

    it('should handle optional fields as undefined', () => {
      const dto = new MappingRuleResponseDto();
      dto.standardSymbol = '700.HK';
      dto.sdkSymbol = '00700';

      expect(dto.standardSymbol).toBe('700.HK');
      expect(dto.sdkSymbol).toBe('00700');
      expect(dto.market).toBeUndefined();
      expect(dto.symbolType).toBeUndefined();
      expect(dto.isActive).toBeUndefined();
      expect(dto.description).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle fromDocument with null input gracefully', () => {
      expect(() => {
        SymbolMappingResponseDto.fromDocument(null as any);
      }).toThrow();
    });

    it('should handle fromLeanObject with null input gracefully', () => {
      expect(() => {
        SymbolMappingResponseDto.fromLeanObject(null);
      }).toThrow();
    });

    it('should handle fromDocument with invalid _id', () => {
      const documentWithInvalidId = {
        ...mockDocument,
        _id: null,
      };

      expect(() => {
        SymbolMappingResponseDto.fromDocument(documentWithInvalidId as any);
      }).toThrow();
    });
  });

  describe('Data integrity', () => {
    it('should preserve all mapping rules from document', () => {
      const documentWithMultipleRules = {
        ...mockDocument,
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
            isActive: false,
            description: 'Apple Inc.',
          },
          {
            standardSymbol: '0001.HK',
            sdkSymbol: '00001',
            market: 'HK',
            symbolType: 'stock',
            isActive: true,
          },
        ],
      };

      const dto = SymbolMappingResponseDto.fromDocument(documentWithMultipleRules as SymbolMappingRuleDocumentType);

      expect(dto.SymbolMappingRule).toHaveLength(3);
      expect(dto.SymbolMappingRule[0].standardSymbol).toBe('700.HK');
      expect(dto.SymbolMappingRule[1].isActive).toBe(false);
      expect(dto.SymbolMappingRule[2].description).toBeUndefined();
    });

    it('should maintain data types correctly', () => {
      const dto = SymbolMappingResponseDto.fromDocument(mockDocument as SymbolMappingRuleDocumentType);

      expect(typeof dto.id).toBe('string');
      expect(typeof dto.dataSourceName).toBe('string');
      expect(Array.isArray(dto.SymbolMappingRule)).toBe(true);
      expect(typeof dto.isActive).toBe('boolean');
      expect(dto.createdAt).toBeInstanceOf(Date);
      expect(dto.updatedAt).toBeInstanceOf(Date);
    });
  });
});