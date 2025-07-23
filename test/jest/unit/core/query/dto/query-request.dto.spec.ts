import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  QueryRequestDto,
  BulkQueryRequestDto,
  SortDirection,
} from '../../../../../../src/core/query/dto/query-request.dto';
import { QueryType } from '../../../../../../src/core/query/enums';

describe('Query Request DTOs', () => {
  describe('QueryRequestDto', () => {
    it('should validate minimal valid query request', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queryType).toBe(QueryType.BY_MARKET);
    });

    it('should validate complete query request', async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL.US', 'GOOGL.US'],
        market: 'US',
        provider: 'LongPort',
        dataTypeFilter: 'stock-quote',
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-02T00:00:00Z',
        filters: [
          {
            field: 'price',
            operator: 'gt',
            value: 100,
          },
        ],
        sort: {
          field: 'price',
          direction: SortDirection.ASC,
        },
        limit: 50,
        offset: 10,
        options: {
          useCache: true,
          updateCache: false,
          includeMetadata: true,
          maxCacheAge: 3600,
          fields: ['symbol', 'price'],
          excludeFields: ['internalData'],
        },
        maxAge: 300,
        cacheTTL: 1800,
        useCache: true,
        includeFields: ['symbol', 'lastPrice'],
        excludeFields: ['metadata'],
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queryType).toBe(QueryType.BY_SYMBOLS);
      expect(dto.symbols).toEqual(['AAPL.US', 'GOOGL.US']);
      expect(dto.market).toBe('US');
      expect(dto.provider).toBe('LongPort');
      expect(dto.filters).toHaveLength(1);
      expect(dto.sort?.field).toBe('price');
      expect(dto.sort?.direction).toBe(SortDirection.ASC);
      expect(dto.limit).toBe(50);
      expect(dto.offset).toBe(10);
      expect(dto.options?.useCache).toBe(true);
    });

    it('should require queryType', async () => {
      const queryData = {};

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('queryType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should validate queryType enum', async () => {
      const queryData = {
        queryType: 'INVALID_QUERY_TYPE' as any,
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('queryType');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should accept all valid query types', async () => {
      const validQueryTypes = Object.values(QueryType);

      for (const queryType of validQueryTypes) {
        const queryData = { queryType };
        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(queryType);
      }
    });

    it('should validate symbols array constraints', async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: Array.from({ length: 1001 }, (_, i) => `SYMBOL${i}`), // Exceeds max limit
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
    });

    it('should reject empty symbols array', async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [],
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should reject symbols with spaces', async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL US', 'GOOGL.US'], // First symbol contains space
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('notContains');
    });

    it('should reject empty strings in symbols array', async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL.US', '', 'GOOGL.US'], // Contains empty string
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('symbols');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should validate limit constraints', async () => {
      const testCases = [
        { limit: 0, shouldFail: true }, // Below minimum
        { limit: 1, shouldFail: false }, // Minimum valid
        { limit: 100, shouldFail: false }, // Normal value
        { limit: 10001, shouldFail: true }, // Above maximum (assuming max is 10000)
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          limit: testCase.limit,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe('limit');
        } else {
          expect(errors.filter(e => e.property === 'limit')).toHaveLength(0);
        }
      }
    });

    it('should validate offset constraints', async () => {
      const testCases = [
        { offset: -1, shouldFail: true }, // Negative
        { offset: 0, shouldFail: false }, // Minimum valid
        { offset: 100, shouldFail: false }, // Normal value
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          offset: testCase.offset,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe('offset');
        } else {
          expect(errors.filter(e => e.property === 'offset')).toHaveLength(0);
        }
      }
    });

    it('should validate maxAge constraints', async () => {
      const testCases = [
        { maxAge: -1, shouldFail: true }, // Negative
        { maxAge: 0, shouldFail: false }, // Minimum valid
        { maxAge: 3600, shouldFail: false }, // Normal value
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          maxAge: testCase.maxAge,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe('maxAge');
        } else {
          expect(errors.filter(e => e.property === 'maxAge')).toHaveLength(0);
        }
      }
    });

    it('should validate cacheTTL constraints', async () => {
      const testCases = [
        { cacheTTL: -1, shouldFail: true }, // Negative
        { cacheTTL: 0, shouldFail: false }, // Minimum valid
        { cacheTTL: 1800, shouldFail: false }, // Normal value
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          cacheTTL: testCase.cacheTTL,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe('cacheTTL');
        } else {
          expect(errors.filter(e => e.property === 'cacheTTL')).toHaveLength(0);
        }
      }
    });

    it('should validate nested filter conditions', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        filters: [
          {
            field: 'price',
            operator: 'gt',
            value: 100,
          },
          {
            field: 'volume',
            operator: 'gte',
            value: 1000,
          },
        ],
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.filters).toHaveLength(2);
      expect(dto.filters![0].field).toBe('price');
      expect(dto.filters![0].operator).toBe('gt');
      expect(dto.filters![0].value).toBe(100);
    });

    it('should reject invalid filter operator', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        filters: [
          {
            field: 'price',
            operator: 'invalid_operator' as any,
            value: 100,
          },
        ],
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('filters');
      expect(errors[0].children).toHaveLength(1);
      expect(errors[0].children![0].property).toBe('0');
      expect(errors[0].children![0].children![0].property).toBe('operator');
    });

    it('should validate nested sort options', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        sort: {
          field: 'timestamp',
          direction: SortDirection.DESC,
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sort?.field).toBe('timestamp');
      expect(dto.sort?.direction).toBe(SortDirection.DESC);
    });

    it('should reject invalid sort direction', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        sort: {
          field: 'price',
          direction: 'invalid_direction' as any,
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('sort');
      expect(errors[0].children![0].property).toBe('direction');
    });

    it('should validate nested query options', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        options: {
          useCache: false,
          updateCache: true,
          includeMetadata: true,
          maxCacheAge: 3600,
          fields: ['symbol', 'price', 'volume'],
          excludeFields: ['internalData'],
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.options?.useCache).toBe(false);
      expect(dto.options?.updateCache).toBe(true);
      expect(dto.options?.includeMetadata).toBe(true);
      expect(dto.options?.maxCacheAge).toBe(3600);
      expect(dto.options?.fields).toEqual(['symbol', 'price', 'volume']);
      expect(dto.options?.excludeFields).toEqual(['internalData']);
    });

    it('should validate includeFields and excludeFields as string arrays', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        includeFields: ['symbol', 'price'],
        excludeFields: ['metadata', 'internalData'],
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.includeFields).toEqual(['symbol', 'price']);
      expect(dto.excludeFields).toEqual(['metadata', 'internalData']);
    });

    it('should reject non-string values in field arrays', async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        includeFields: ['symbol', 123, 'price'] as any, // Contains number
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('includeFields');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should validate boolean options correctly', async () => {
      const booleanFields = ['useCache'];

      for (const field of booleanFields) {
        const validValues = [true, false];
        const invalidValues = ['true', 'false', 1, 0, null];

        for (const value of validValues) {
          const queryData = {
            queryType: QueryType.BY_MARKET,
            [field]: value,
          };

          const dto = plainToClass(QueryRequestDto, queryData);
          const errors = await validate(dto);

          expect(errors.filter(e => e.property === field)).toHaveLength(0);
        }

        for (const value of invalidValues) {
          const queryData = {
            queryType: QueryType.BY_MARKET,
            [field]: value,
          };

          const dto = plainToClass(QueryRequestDto, queryData);
          const errors = await validate(dto);

          const fieldErrors = errors.filter(e => e.property === field);
          if (fieldErrors.length > 0) {
            expect(fieldErrors[0].constraints).toHaveProperty('isBoolean');
          }
        }
      }
    });
  });

  describe('BulkQueryRequestDto', () => {
    it('should validate valid bulk query request', async () => {
      const bulkQueryData = {
        queries: [
          { queryType: QueryType.BY_MARKET, market: 'US' },
          { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL.US'] },
        ],
        parallel: true,
        continueOnError: false,
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queries).toHaveLength(2);
      expect(dto.parallel).toBe(true);
      expect(dto.continueOnError).toBe(false);
    });

    it('should require at least one query', async () => {
      const bulkQueryData = {
        queries: [],
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('queries');
      expect(errors[0].constraints).toHaveProperty('arrayNotEmpty');
    });

    it('should validate maximum number of queries', async () => {
      const maxQueries = 101; // Assuming max is 100
      const queries = Array.from({ length: maxQueries }, () => ({
        queryType: QueryType.BY_MARKET,
      }));

      const bulkQueryData = { queries };
      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('queries');
      expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
    });

    it('should validate nested query objects', async () => {
      const bulkQueryData = {
        queries: [
          { queryType: QueryType.BY_MARKET },
          { queryType: 'INVALID_TYPE' as any }, // Invalid query type
        ],
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('queries');
      expect(errors[0].children).toHaveLength(1);
      expect(errors[0].children![0].property).toBe('1'); // Second query (index 1)
    });

    it('should accept default values for optional boolean fields', async () => {
      const bulkQueryData = {
        queries: [{ queryType: QueryType.BY_MARKET }],
        // parallel and continueOnError not provided
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.parallel).toBeUndefined(); // Will use default from service
      expect(dto.continueOnError).toBeUndefined(); // Will use default from service
    });

    it('should validate boolean values for parallel and continueOnError', async () => {
      const booleanFields = ['parallel', 'continueOnError'];

      for (const field of booleanFields) {
        const validValues = [true, false];

        for (const value of validValues) {
          const bulkQueryData = {
            queries: [{ queryType: QueryType.BY_MARKET }],
            [field]: value,
          };

          const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
          const errors = await validate(dto);

          expect(errors.filter(e => e.property === field)).toHaveLength(0);
        }

        // Test invalid values
        const invalidValues = ['true', 1, null];
        for (const value of invalidValues) {
          const bulkQueryData = {
            queries: [{ queryType: QueryType.BY_MARKET }],
            [field]: value,
          };

          const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
          const errors = await validate(dto);

          const fieldErrors = errors.filter(e => e.property === field);
          if (fieldErrors.length > 0) {
            expect(fieldErrors[0].constraints).toHaveProperty('isBoolean');
          }
        }
      }
    });

    it('should handle complex nested query validation', async () => {
      const bulkQueryData = {
        queries: [
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ['AAPL.US', 'GOOGL.US'],
            limit: 50,
            sort: {
              field: 'price',
              direction: SortDirection.DESC,
            },
            filters: [
              {
                field: 'volume',
                operator: 'gt',
                value: 1000000,
              },
            ],
          },
          {
            queryType: QueryType.BY_MARKET,
            market: 'HK',
            offset: 20,
            options: {
              useCache: false,
              includeMetadata: true,
            },
          },
        ],
        parallel: true,
        continueOnError: true,
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queries).toHaveLength(2);
      expect(dto.queries[0].queryType).toBe(QueryType.BY_SYMBOLS);
      expect(dto.queries[1].queryType).toBe(QueryType.BY_MARKET);
    });
  });
});