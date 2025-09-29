import { QueryType } from '@core/01-entry/query/dto/query-types.dto';

describe('QueryType', () => {
  describe('enum values', () => {
    it('should have correct enum values', () => {
      expect(QueryType.BY_SYMBOLS).toBe('by_symbols');
      expect(QueryType.BY_MARKET).toBe('by_market');
      expect(QueryType.BY_PROVIDER).toBe('by_provider');
      expect(QueryType.BY_CATEGORY).toBe('by_tag');
      expect(QueryType.BY_TIME_RANGE).toBe('by_time_range');
      expect(QueryType.ADVANCED).toBe('advanced');
    });

    it('should contain all expected query types', () => {
      const expectedValues = [
        'by_symbols',
        'by_market',
        'by_provider',
        'by_tag',
        'by_time_range',
        'advanced'
      ];

      const actualValues = Object.values(QueryType);
      expect(actualValues).toEqual(expectedValues);
      expect(actualValues).toHaveLength(6);
    });

    it('should have unique enum values', () => {
      const values = Object.values(QueryType);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should provide correct string representation', () => {
      // Test string conversion for API usage
      expect(String(QueryType.BY_SYMBOLS)).toBe('by_symbols');
      expect(String(QueryType.BY_MARKET)).toBe('by_market');
      expect(String(QueryType.BY_PROVIDER)).toBe('by_provider');
      expect(String(QueryType.BY_CATEGORY)).toBe('by_tag');
      expect(String(QueryType.BY_TIME_RANGE)).toBe('by_time_range');
      expect(String(QueryType.ADVANCED)).toBe('advanced');
    });

    it('should be usable in array operations', () => {
      const supportedTypes = [
        QueryType.BY_SYMBOLS,
        QueryType.BY_MARKET,
        QueryType.BY_PROVIDER
      ];

      expect(supportedTypes).toContain(QueryType.BY_SYMBOLS);
      expect(supportedTypes).toContain(QueryType.BY_MARKET);
      expect(supportedTypes).not.toContain(QueryType.ADVANCED);
    });

    it('should support enum comparison', () => {
      expect(QueryType.BY_SYMBOLS === QueryType.BY_SYMBOLS).toBe(true);
      expect(QueryType.BY_SYMBOLS === (QueryType.BY_MARKET as any)).toBe(false);
      expect(QueryType.BY_SYMBOLS !== (QueryType.BY_MARKET as any)).toBe(true);
    });

    it('should be compatible with switch statements', () => {
      const getQueryDescription = (type: QueryType): string => {
        switch (type) {
          case QueryType.BY_SYMBOLS:
            return 'Query by stock symbols';
          case QueryType.BY_MARKET:
            return 'Query by market';
          case QueryType.BY_PROVIDER:
            return 'Query by data provider';
          case QueryType.BY_CATEGORY:
            return 'Query by category/tag';
          case QueryType.BY_TIME_RANGE:
            return 'Query by time range';
          case QueryType.ADVANCED:
            return 'Advanced query';
          default:
            return 'Unknown query type';
        }
      };

      expect(getQueryDescription(QueryType.BY_SYMBOLS)).toBe('Query by stock symbols');
      expect(getQueryDescription(QueryType.BY_MARKET)).toBe('Query by market');
      expect(getQueryDescription(QueryType.ADVANCED)).toBe('Advanced query');
    });

    it('should handle JSON serialization correctly', () => {
      const testObject = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL']
      };

      const serialized = JSON.stringify(testObject);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.queryType).toBe('by_symbols');
      expect(deserialized.symbols).toEqual(['AAPL', 'GOOGL']);
    });
  });

  describe('enum usage patterns', () => {
    it('should work with Object.keys and Object.values', () => {
      const keys = Object.keys(QueryType);
      const values = Object.values(QueryType);

      expect(keys).toContain('BY_SYMBOLS');
      expect(keys).toContain('BY_MARKET');
      expect(values).toContain('by_symbols');
      expect(values).toContain('by_market');
    });

    it('should support type validation patterns', () => {
      const isValidQueryType = (value: string): value is QueryType => {
        return Object.values(QueryType).includes(value as QueryType);
      };

      expect(isValidQueryType('by_symbols')).toBe(true);
      expect(isValidQueryType('by_market')).toBe(true);
      expect(isValidQueryType('invalid_type')).toBe(false);
      expect(isValidQueryType('')).toBe(false);
    });

    it('should work with conditional logic', () => {
      const requiresSymbols = (type: QueryType): boolean => {
        return type === QueryType.BY_SYMBOLS;
      };

      const requiresMarket = (type: QueryType): boolean => {
        return [QueryType.BY_MARKET, QueryType.BY_PROVIDER].includes(type);
      };

      expect(requiresSymbols(QueryType.BY_SYMBOLS)).toBe(true);
      expect(requiresSymbols(QueryType.BY_MARKET)).toBe(false);
      expect(requiresMarket(QueryType.BY_MARKET)).toBe(true);
      expect(requiresMarket(QueryType.BY_SYMBOLS)).toBe(false);
    });
  });
});
