import { ValidationArguments } from 'class-validator';
import { SymbolsRequiredForBySymbolsQueryConstraint } from '../../../../../../../src/core/01-entry/query/validators/symbols-required-for-by-symbols.validator';
import { QueryRequestDto, SortDirection } from '../../../../../../../src/core/01-entry/query/dto/query-request.dto';
import { QueryType } from '../../../../../../../src/core/01-entry/query/dto/query-types.dto';

describe('SymbolsRequiredForBySymbolsQueryConstraint', () => {
  let validator: SymbolsRequiredForBySymbolsQueryConstraint;

  beforeEach(() => {
    validator = new SymbolsRequiredForBySymbolsQueryConstraint();
  });

  describe('validate', () => {
    describe('BY_SYMBOLS query type validation', () => {
      it('should return true when symbols array is provided and not empty for BY_SYMBOLS query', () => {
        // Arrange
        const symbols = ['AAPL', 'MSFT', 'GOOGL'];
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true when symbols array has one element for BY_SYMBOLS query', () => {
        // Arrange
        const symbols = ['AAPL'];
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when symbols is undefined for BY_SYMBOLS query', () => {
        // Arrange
        const symbols = undefined;
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false when symbols is empty array for BY_SYMBOLS query', () => {
        // Arrange
        const symbols: string[] = [];
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false when symbols is not an array for BY_SYMBOLS query', () => {
        // Arrange
        const symbols = 'AAPL' as any; // Invalid type
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('Other query types validation', () => {
      it('should return true for BY_MARKET query regardless of symbols value', () => {
        // Arrange
        const symbols = undefined;
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_MARKET,
          market: 'US',
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for BY_PROVIDER query with empty symbols', () => {
        // Arrange
        const symbols: string[] = [];
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_PROVIDER,
          provider: 'longport',
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for BY_CATEGORY query with symbols provided', () => {
        // Arrange
        const symbols = ['AAPL', 'MSFT'];
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_CATEGORY,
          tag: 'AI',
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for BY_TIME_RANGE query without symbols', () => {
        // Arrange
        const symbols = undefined;
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_TIME_RANGE,
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-01-31T23:59:59Z',
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for ADVANCED query with complex parameters', () => {
        // Arrange
        const symbols = undefined;
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.ADVANCED,
          advancedQuery: {
            filters: { marketCap: { min: 1000000000 } },
          },
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should return true when args.object is undefined', () => {
        // Arrange
        const symbols = ['AAPL'];
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: undefined as any,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should return true when args.object is null', () => {
        // Arrange
        const symbols = ['AAPL'];
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: null as any,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true);
      });

      it('should handle symbols as null for BY_SYMBOLS query', () => {
        // Arrange
        const symbols = null as any;
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(false);
      });

      it('should handle symbols as array with null/undefined elements for BY_SYMBOLS query', () => {
        // Arrange
        const symbols = ['AAPL', null, 'MSFT'] as any;
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(true); // Array exists and has length > 0, element validation is handled elsewhere
      });
    });
  });

  describe('defaultMessage', () => {
    describe('BY_SYMBOLS query type messages', () => {
      it('should return appropriate error message for BY_SYMBOLS query', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: undefined,
        };
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('symbols字段对于BY_SYMBOLS查询类型是必需的，且不能为空');
      });

      it('should return error message for BY_SYMBOLS query with empty array', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: [],
        };
        const args: ValidationArguments = {
          value: [],
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('symbols字段对于BY_SYMBOLS查询类型是必需的，且不能为空');
      });
    });

    describe('Other query types messages', () => {
      it('should return empty string for BY_MARKET query', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_MARKET,
          market: 'US',
          symbols: undefined,
        };
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });

      it('should return empty string for BY_PROVIDER query', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_PROVIDER,
          provider: 'longport',
          symbols: undefined,
        };
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });

      it('should return empty string for BY_CATEGORY query', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_CATEGORY,
          tag: 'AI',
          symbols: undefined,
        };
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });

      it('should return empty string for BY_TIME_RANGE query', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.BY_TIME_RANGE,
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-01-31T23:59:59Z',
          symbols: undefined,
        };
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });

      it('should return empty string for ADVANCED query', () => {
        // Arrange
        const mockQueryRequest: QueryRequestDto = {
          queryType: QueryType.ADVANCED,
          advancedQuery: { filters: {} },
          symbols: undefined,
        };
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });
    });

    describe('Edge cases for defaultMessage', () => {
      it('should return empty string when args.object is undefined', () => {
        // Arrange
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: undefined as any,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });

      it('should return empty string when args.object is null', () => {
        // Arrange
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: null as any,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });

      it('should handle object without queryType property', () => {
        // Arrange
        const mockQueryRequest = {} as any; // Missing queryType
        const args: ValidationArguments = {
          value: undefined,
          targetName: 'QueryRequestDto',
          object: mockQueryRequest,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const message = validator.defaultMessage(args);

        // Assert
        expect(message).toBe('');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly with real QueryRequestDto objects', () => {
      // Arrange
      const validBySymbolsQuery: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'MSFT', 'GOOGL'],
        provider: 'longport',
        market: 'US',
      };

      const invalidBySymbolsQuery: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: undefined,
      };

      const byMarketQuery: QueryRequestDto = {
        queryType: QueryType.BY_MARKET,
        market: 'US',
        symbols: undefined,
      };

      // Act & Assert for valid BY_SYMBOLS query
      const validArgs: ValidationArguments = {
        value: validBySymbolsQuery.symbols,
        targetName: 'QueryRequestDto',
        object: validBySymbolsQuery,
        property: 'symbols',
        constraints: [],
      };
      expect(validator.validate(validBySymbolsQuery.symbols, validArgs)).toBe(true);
      expect(validator.defaultMessage(validArgs)).toBe('');

      // Act & Assert for invalid BY_SYMBOLS query
      const invalidArgs: ValidationArguments = {
        value: invalidBySymbolsQuery.symbols,
        targetName: 'QueryRequestDto',
        object: invalidBySymbolsQuery,
        property: 'symbols',
        constraints: [],
      };
      expect(validator.validate(invalidBySymbolsQuery.symbols, invalidArgs)).toBe(false);
      expect(validator.defaultMessage(invalidArgs)).toBe('symbols字段对于BY_SYMBOLS查询类型是必需的，且不能为空');

      // Act & Assert for BY_MARKET query
      const marketArgs: ValidationArguments = {
        value: byMarketQuery.symbols,
        targetName: 'QueryRequestDto',
        object: byMarketQuery,
        property: 'symbols',
        constraints: [],
      };
      expect(validator.validate(byMarketQuery.symbols, marketArgs)).toBe(true);
      expect(validator.defaultMessage(marketArgs)).toBe('');
    });

    it('should handle complex query objects with multiple properties', () => {
      // Arrange
      const complexQuery: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
        market: 'US',
        provider: 'longport',
        queryTypeFilter: 'get-stock-quote',
        maxAge: 300,
        limit: 10,
        page: 1,
        options: {
          useCache: true,
          includeMetadata: true,
        },
        querySort: {
          field: 'symbol',
          direction: SortDirection.ASC,
        },
      };

      const args: ValidationArguments = {
        value: complexQuery.symbols,
        targetName: 'QueryRequestDto',
        object: complexQuery,
        property: 'symbols',
        constraints: [],
      };

      // Act
      const isValid = validator.validate(complexQuery.symbols, args);
      const message = validator.defaultMessage(args);

      // Assert
      expect(isValid).toBe(true);
      expect(message).toBe('');
    });

    it('should validate consistently across different symbol array sizes', () => {
      const testCases = [
        { symbols: ['AAPL'], expected: true },
        { symbols: ['AAPL', 'MSFT'], expected: true },
        { symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NFLX'], expected: true },
        { symbols: [], expected: false },
        { symbols: undefined, expected: false },
      ];

      testCases.forEach(({ symbols, expected }, index) => {
        // Arrange
        const query: QueryRequestDto = {
          queryType: QueryType.BY_SYMBOLS,
          symbols,
        };
        const args: ValidationArguments = {
          value: symbols,
          targetName: 'QueryRequestDto',
          object: query,
          property: 'symbols',
          constraints: [],
        };

        // Act
        const result = validator.validate(symbols, args);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });
});