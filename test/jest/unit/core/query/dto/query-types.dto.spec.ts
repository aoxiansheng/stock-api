import { QueryType } from '@core/query/dto/query-types.dto';

describe('QueryType Enum', () => {
  describe('Enum Values', () => {
    it('should define all query types correctly', () => {
      expect(QueryType.BY_SYMBOLS).toBe('by_symbols');
      expect(QueryType.BY_MARKET).toBe('by_market');
      expect(QueryType.BY_PROVIDER).toBe('by_provider');
      expect(QueryType.BY_CATEGORY).toBe('by_tag');
      expect(QueryType.BY_TIME_RANGE).toBe('by_time_range');
      expect(QueryType.ADVANCED).toBe('advanced');
    });

    it('should have correct number of enum values', () => {
      const enumValues = Object.values(QueryType);
      expect(enumValues).toHaveLength(6);
    });

    it('should use snake_case naming convention', () => {
      const enumValues = Object.values(QueryType);
      enumValues.forEach(value => {
        expect(value).toMatch(/^[a-z_]+$/);
        expect(value).not.toContain('-');
        expect(value).not.toContain(' ');
        expect(value).not.toContain('.');
      });
    });
  });

  describe('Enum Keys', () => {
    it('should define all enum keys correctly', () => {
      const enumKeys = Object.keys(QueryType);
      expect(enumKeys).toContain('BY_SYMBOLS');
      expect(enumKeys).toContain('BY_MARKET');
      expect(enumKeys).toContain('BY_PROVIDER');
      expect(enumKeys).toContain('BY_CATEGORY');
      expect(enumKeys).toContain('BY_TIME_RANGE');
      expect(enumKeys).toContain('ADVANCED');
    });

    it('should use UPPER_CASE naming convention for keys', () => {
      const enumKeys = Object.keys(QueryType);
      enumKeys.forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
        expect(key).not.toContain('-');
        expect(key).not.toContain(' ');
        expect(key).not.toContain('.');
      });
    });
  });

  describe('Enum Mapping', () => {
    it('should map keys to values correctly', () => {
      expect(QueryType['BY_SYMBOLS']).toBe('by_symbols');
      expect(QueryType['BY_MARKET']).toBe('by_market');
      expect(QueryType['BY_PROVIDER']).toBe('by_provider');
      expect(QueryType['BY_CATEGORY']).toBe('by_tag');
      expect(QueryType['BY_TIME_RANGE']).toBe('by_time_range');
      expect(QueryType['ADVANCED']).toBe('advanced');
    });

    it('should support reverse mapping', () => {
      expect(QueryType[QueryType.BY_SYMBOLS]).toBeUndefined(); // String enums don't support reverse mapping
      expect(QueryType[QueryType.BY_MARKET]).toBeUndefined(); // String enums don't support reverse mapping
      expect(QueryType[QueryType.BY_PROVIDER]).toBeUndefined(); // String enums don't support reverse mapping
      expect(QueryType[QueryType.BY_CATEGORY]).toBeUndefined(); // String enums don't support reverse mapping
      expect(QueryType[QueryType.BY_TIME_RANGE]).toBeUndefined(); // String enums don't support reverse mapping
      expect(QueryType[QueryType.ADVANCED]).toBeUndefined(); // String enums don't support reverse mapping
    });
  });

  describe('Type Safety', () => {
    it('should support type-safe assignment', () => {
      const queryType1: QueryType = QueryType.BY_SYMBOLS;
      const queryType2: QueryType = QueryType.BY_MARKET;
      const queryType3: QueryType = QueryType.BY_PROVIDER;
      const queryType4: QueryType = QueryType.BY_CATEGORY;
      const queryType5: QueryType = QueryType.BY_TIME_RANGE;
      const queryType6: QueryType = QueryType.ADVANCED;

      expect(queryType1).toBe(QueryType.BY_SYMBOLS);
      expect(queryType2).toBe(QueryType.BY_MARKET);
      expect(queryType3).toBe(QueryType.BY_PROVIDER);
      expect(queryType4).toBe(QueryType.BY_CATEGORY);
      expect(queryType5).toBe(QueryType.BY_TIME_RANGE);
      expect(queryType6).toBe(QueryType.ADVANCED);
    });

    it('should support switch statements', () => {
      // 使用字符串类型而不是枚举类型来避免类型错误
      const testQueryType = QueryType.BY_SYMBOLS as string;
      let result: string;

      switch (testQueryType) {
        case QueryType.BY_SYMBOLS:
          result = 'symbols query';
          break;
        case QueryType.BY_MARKET:
          result = 'market query';
          break;
        case QueryType.BY_PROVIDER:
          result = 'provider query';
          break;
        case QueryType.BY_CATEGORY:
          result = 'category query';
          break;
        case QueryType.BY_TIME_RANGE:
          result = 'time range query';
          break;
        case QueryType.ADVANCED:
          result = 'advanced query';
          break;
        default:
          result = 'unknown query';
      }

      expect(result).toBe('symbols query');
    });

    it('should support array operations', () => {
      const queryTypes: QueryType[] = [
        QueryType.BY_SYMBOLS,
        QueryType.BY_MARKET,
        QueryType.BY_PROVIDER,
      ];

      expect(queryTypes).toHaveLength(3);
      expect(queryTypes).toContain(QueryType.BY_SYMBOLS);
      expect(queryTypes).toContain(QueryType.BY_MARKET);
      expect(queryTypes).toContain(QueryType.BY_PROVIDER);
      expect(queryTypes).not.toContain(QueryType.ADVANCED);
    });
  });

  describe('Comparison Operations', () => {
    it('should support equality comparison', () => {
      // 使用字符串值进行比较而不是枚举值
      const queryType1 = QueryType.BY_SYMBOLS;
      const queryType2 = QueryType.BY_SYMBOLS;
      const queryType3 = QueryType.BY_MARKET;

      expect(queryType1 === queryType2).toBe(true);
      expect(String(queryType1) === String(queryType3)).toBe(false);
      expect(String(queryType1) !== String(queryType3)).toBe(true);
    });

    it('should support string comparison', () => {
      const queryTypeValue = 'by_symbols';

      expect(QueryType.BY_SYMBOLS === queryTypeValue).toBe(true);
      expect(String(QueryType.BY_MARKET) === queryTypeValue).toBe(false);
    });

    it('should support Object.values() operations', () => {
      const allQueryTypes = Object.values(QueryType);

      expect(allQueryTypes).toContain('by_symbols');
      expect(allQueryTypes).toContain('by_market');
      expect(allQueryTypes).toContain('by_provider');
      expect(allQueryTypes).toContain('by_tag');
      expect(allQueryTypes).toContain('by_time_range');
      expect(allQueryTypes).toContain('advanced');
    });
  });

  describe('Business Logic Integration', () => {
    describe('Query Type Categorization', () => {
      it('should identify basic query types', () => {
        const basicQueryTypes = [
          QueryType.BY_SYMBOLS,
          QueryType.BY_MARKET,
          QueryType.BY_PROVIDER,
        ];

        basicQueryTypes.forEach(queryType => {
          expect(queryType).not.toBe(QueryType.ADVANCED);
          expect(['by_symbols', 'by_market', 'by_provider']).toContain(queryType);
        });
      });

      it('should identify complex query types', () => {
        const complexQueryTypes = [
          QueryType.BY_CATEGORY,
          QueryType.BY_TIME_RANGE,
          QueryType.ADVANCED,
        ];

        complexQueryTypes.forEach(queryType => {
          expect(['by_tag', 'by_time_range', 'advanced']).toContain(queryType);
        });
      });
    });

    describe('Query Type Validation', () => {
      it('should validate supported query types', () => {
        const supportedTypes = Object.values(QueryType);
        const testType = 'by_symbols';

        const isSupported = supportedTypes.includes(testType as QueryType);

        expect(isSupported).toBe(true);
      });

      it('should reject unsupported query types', () => {
        const supportedTypes = Object.values(QueryType);
        const testType = 'by_invalid_type';

        const isSupported = supportedTypes.includes(testType as QueryType);

        expect(isSupported).toBe(false);
      });

      it('should support query type filtering', () => {
        const allTypes = Object.values(QueryType);
        const symbolsAndMarketTypes = [QueryType.BY_SYMBOLS, QueryType.BY_MARKET];

        const filteredTypes = allTypes.filter(type => 
          symbolsAndMarketTypes.includes(type)
        );

        expect(filteredTypes).toHaveLength(2);
        expect(filteredTypes).toContain(QueryType.BY_SYMBOLS);
        expect(filteredTypes).toContain(QueryType.BY_MARKET);
        expect(filteredTypes).not.toContain(QueryType.BY_PROVIDER);
      });
    });

    describe('Query Type Priority', () => {
      it('should define query complexity levels', () => {
        const getComplexityLevel = (queryType: QueryType): number => {
          switch (queryType) {
            case QueryType.BY_SYMBOLS:
              return 1; // Simple
            case QueryType.BY_MARKET:
              return 2; // Moderate
            case QueryType.BY_PROVIDER:
              return 2; // Moderate
            case QueryType.BY_CATEGORY:
              return 3; // Complex
            case QueryType.BY_TIME_RANGE:
              return 4; // Very complex
            case QueryType.ADVANCED:
              return 5; // Most complex
            default:
              return 0;
          }
        };

        expect(getComplexityLevel(QueryType.BY_SYMBOLS)).toBe(1);
        expect(getComplexityLevel(QueryType.BY_MARKET)).toBe(2);
        expect(getComplexityLevel(QueryType.BY_PROVIDER)).toBe(2);
        expect(getComplexityLevel(QueryType.BY_CATEGORY)).toBe(3);
        expect(getComplexityLevel(QueryType.BY_TIME_RANGE)).toBe(4);
        expect(getComplexityLevel(QueryType.ADVANCED)).toBe(5);
      });

      it('should support query type grouping', () => {
        const queryTypeGroups = {
          simple: [QueryType.BY_SYMBOLS],
          moderate: [QueryType.BY_MARKET, QueryType.BY_PROVIDER],
          complex: [QueryType.BY_CATEGORY, QueryType.BY_TIME_RANGE, QueryType.ADVANCED],
        };

        expect(queryTypeGroups.simple).toContain(QueryType.BY_SYMBOLS);
        expect(queryTypeGroups.moderate).toContain(QueryType.BY_MARKET);
        expect(queryTypeGroups.moderate).toContain(QueryType.BY_PROVIDER);
        expect(queryTypeGroups.complex).toContain(QueryType.BY_CATEGORY);
        expect(queryTypeGroups.complex).toContain(QueryType.BY_TIME_RANGE);
        expect(queryTypeGroups.complex).toContain(QueryType.ADVANCED);
      });
    });

    describe('Request Parameter Mapping', () => {
      it('should map to API parameter names', () => {
        const getApiParameterName = (queryType: QueryType): string => {
          switch (queryType) {
            case QueryType.BY_SYMBOLS:
              return 'symbols';
            case QueryType.BY_MARKET:
              return 'market';
            case QueryType.BY_PROVIDER:
              return 'provider';
            case QueryType.BY_CATEGORY:
              return 'tags';
            case QueryType.BY_TIME_RANGE:
              return 'timeRange';
            case QueryType.ADVANCED:
              return 'advancedFilters';
            default:
              return 'unknown';
          }
        };

        expect(getApiParameterName(QueryType.BY_SYMBOLS)).toBe('symbols');
        expect(getApiParameterName(QueryType.BY_MARKET)).toBe('market');
        expect(getApiParameterName(QueryType.BY_PROVIDER)).toBe('provider');
        expect(getApiParameterName(QueryType.BY_CATEGORY)).toBe('tags');
        expect(getApiParameterName(QueryType.BY_TIME_RANGE)).toBe('timeRange');
        expect(getApiParameterName(QueryType.ADVANCED)).toBe('advancedFilters');
      });

      it('should support query type detection from parameters', () => {
        const detectQueryType = (params: Record<string, any>): QueryType | null => {
          if (params.symbols && params.symbols.length > 0) {
            return QueryType.BY_SYMBOLS;
          }
          if (params.market) {
            return QueryType.BY_MARKET;
          }
          if (params.provider) {
            return QueryType.BY_PROVIDER;
          }
          if (params.tags) {
            return QueryType.BY_CATEGORY;
          }
          if (params.timeRange) {
            return QueryType.BY_TIME_RANGE;
          }
          if (params.advancedFilters) {
            return QueryType.ADVANCED;
          }
          return null;
        };

        expect(detectQueryType({ symbols: ['AAPL', 'GOOGL'] })).toBe(QueryType.BY_SYMBOLS);
        expect(detectQueryType({ market: 'US' })).toBe(QueryType.BY_MARKET);
        expect(detectQueryType({ provider: 'longport' })).toBe(QueryType.BY_PROVIDER);
        expect(detectQueryType({ tags: ['tech'] })).toBe(QueryType.BY_CATEGORY);
        expect(detectQueryType({ timeRange: { start: '2023-01-01', end: '2023-12-31' } })).toBe(QueryType.BY_TIME_RANGE);
        expect(detectQueryType({ advancedFilters: {} })).toBe(QueryType.ADVANCED);
        expect(detectQueryType({})).toBeNull();
      });
    });

    describe('Query Optimization', () => {
      it('should support cache strategy by query type', () => {
        const getCacheStrategy = (queryType: QueryType): { ttl: number; priority: string } => {
          switch (queryType) {
            case QueryType.BY_SYMBOLS:
              return { ttl: 300, priority: 'high' }; // 5 minutes, high priority
            case QueryType.BY_MARKET:
              return { ttl: 600, priority: 'medium' }; // 10 minutes, medium priority
            case QueryType.BY_PROVIDER:
              return { ttl: 900, priority: 'medium' }; // 15 minutes, medium priority
            case QueryType.BY_CATEGORY:
              return { ttl: 1800, priority: 'low' }; // 30 minutes, low priority
            case QueryType.BY_TIME_RANGE:
              return { ttl: 3600, priority: 'low' }; // 1 hour, low priority
            case QueryType.ADVANCED:
              return { ttl: 600, priority: 'low' }; // 10 minutes, low priority
            default:
              return { ttl: 300, priority: 'medium' };
          }
        };

        expect(getCacheStrategy(QueryType.BY_SYMBOLS)).toEqual({ ttl: 300, priority: 'high' });
        expect(getCacheStrategy(QueryType.BY_MARKET)).toEqual({ ttl: 600, priority: 'medium' });
        expect(getCacheStrategy(QueryType.BY_PROVIDER)).toEqual({ ttl: 900, priority: 'medium' });
        expect(getCacheStrategy(QueryType.BY_CATEGORY)).toEqual({ ttl: 1800, priority: 'low' });
        expect(getCacheStrategy(QueryType.BY_TIME_RANGE)).toEqual({ ttl: 3600, priority: 'low' });
        expect(getCacheStrategy(QueryType.ADVANCED)).toEqual({ ttl: 600, priority: 'low' });
      });

      it('should support rate limiting by query type', () => {
        const getRateLimit = (queryType: QueryType): { requestsPerMinute: number; burstLimit: number } => {
          switch (queryType) {
            case QueryType.BY_SYMBOLS:
              return { requestsPerMinute: 100, burstLimit: 20 }; // High frequency allowed
            case QueryType.BY_MARKET:
              return { requestsPerMinute: 60, burstLimit: 15 }; // Moderate frequency
            case QueryType.BY_PROVIDER:
              return { requestsPerMinute: 60, burstLimit: 15 }; // Moderate frequency
            case QueryType.BY_CATEGORY:
              return { requestsPerMinute: 30, burstLimit: 10 }; // Lower frequency
            case QueryType.BY_TIME_RANGE:
              return { requestsPerMinute: 20, burstLimit: 5 }; // Low frequency
            case QueryType.ADVANCED:
              return { requestsPerMinute: 10, burstLimit: 3 }; // Very low frequency
            default:
              return { requestsPerMinute: 60, burstLimit: 10 };
          }
        };

        expect(getRateLimit(QueryType.BY_SYMBOLS)).toEqual({ requestsPerMinute: 100, burstLimit: 20 });
        expect(getRateLimit(QueryType.BY_MARKET)).toEqual({ requestsPerMinute: 60, burstLimit: 15 });
        expect(getRateLimit(QueryType.ADVANCED)).toEqual({ requestsPerMinute: 10, burstLimit: 3 });
      });
    });
  });

  describe('Logging and Monitoring', () => {
    it('should support query type analytics', () => {
      const queryTypeMetrics = {
        [QueryType.BY_SYMBOLS]: { count: 5000, avgTime: 120, successRate: 0.98 },
        [QueryType.BY_MARKET]: { count: 2000, avgTime: 200, successRate: 0.95 },
        [QueryType.BY_PROVIDER]: { count: 1500, avgTime: 180, successRate: 0.97 },
        [QueryType.BY_CATEGORY]: { count: 800, avgTime: 250, successRate: 0.93 },
        [QueryType.BY_TIME_RANGE]: { count: 400, avgTime: 350, successRate: 0.90 },
        [QueryType.ADVANCED]: { count: 200, avgTime: 500, successRate: 0.85 },
      };

      expect(queryTypeMetrics[QueryType.BY_SYMBOLS].count).toBe(5000);
      expect(queryTypeMetrics[QueryType.BY_MARKET].avgTime).toBe(200);
      expect(queryTypeMetrics[QueryType.ADVANCED].successRate).toBe(0.85);
    });

    it('should support query type logging', () => {
      const formatLogMessage = (queryType: QueryType, executionTime: number): string => {
        return `Query executed: type=${queryType}, time=${executionTime}ms`;
      };

      expect(formatLogMessage(QueryType.BY_SYMBOLS, 150))
        .toBe('Query executed: type=by_symbols, time=150ms');
      expect(formatLogMessage(QueryType.ADVANCED, 500))
        .toBe('Query executed: type=advanced, time=500ms');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined and null comparisons', () => {
      const undefinedValue: QueryType | undefined = undefined;
      const nullValue: QueryType | null = null;

      expect(QueryType.BY_SYMBOLS === undefinedValue).toBe(false);
      expect(QueryType.BY_SYMBOLS === nullValue).toBe(false);
      expect(undefinedValue === undefined).toBe(true);
      expect(nullValue === null).toBe(true);
    });

    it('should handle invalid enum casting', () => {
      const invalidValue = 'invalid_query_type';

      expect(Object.values(QueryType)).not.toContain(invalidValue);
      expect(String(QueryType.BY_SYMBOLS) === invalidValue).toBe(false);
    });

    it('should support enum enumeration', () => {
      const enumEntries = Object.entries(QueryType);
      const enumKeys = Object.keys(QueryType);
      const enumValues = Object.values(QueryType);

      expect(enumEntries).toHaveLength(6); // 6 key-value pairs
      expect(enumKeys.filter(key => isNaN(Number(key)))).toHaveLength(6); // Only string keys
      expect(enumValues.filter(value => typeof value === 'string')).toHaveLength(6); // Only string values
    });
  });
});
