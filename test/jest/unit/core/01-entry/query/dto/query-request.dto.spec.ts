import { validate } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { QueryRequestDto, BulkQueryRequestDto } from '../../../../../../../src/core/01-entry/query/dto/query-request.dto';
import { QueryType } from '../../../../../../../src/core/01-entry/query/dto/query-types.dto';

describe('Query Request DTOs Validation', () => {
  describe('QueryRequestDto', () => {
    describe('Valid QueryRequestDto Instances', () => {
      it('should validate a complete BY_SYMBOLS query', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
          provider: 'longport',
          market: 'US',
          queryTypeFilter: 'get-stock-quote',
          limit: 10,
          page: 1,
          maxAge: 300,
          options: {
            useCache: true,
            includeMetadata: true,
            includeFields: ['symbol', 'price', 'change'],
            excludeFields: ['rawData'],
          },
          querySort: {
            field: 'symbol',
            direction: 'asc',
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_SYMBOLS);
        expect(dto.symbols).toEqual(['AAPL', 'MSFT', 'GOOGL']);
        expect(dto.provider).toBe('longport');
        expect(dto.market).toBe('US');
        expect(dto.queryTypeFilter).toBe('get-stock-quote');
        expect(dto.limit).toBe(10);
        expect(dto.page).toBe(1);
        expect(dto.maxAge).toBe(300);
        expect(dto.options?.useCache).toBe(true);
        expect(dto.options?.includeMetadata).toBe(true);
        expect(dto.options?.includeFields).toEqual(['symbol', 'price', 'change']);
        expect(dto.options?.excludeFields).toEqual(['rawData']);
        expect(dto.querySort?.field).toBe('symbol');
        expect(dto.querySort?.direction).toBe('asc');
      });

      it('should validate a minimal BY_SYMBOLS query', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_SYMBOLS);
        expect(dto.symbols).toEqual(['AAPL']);
      });

      it('should validate BY_MARKET query', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_MARKET,
          market: 'US',
          provider: 'longport',
          limit: 50,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_MARKET);
        expect(dto.market).toBe('US');
        expect(dto.provider).toBe('longport');
        expect(dto.limit).toBe(50);
      });

      it('should validate BY_PROVIDER query', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_PROVIDER,
          provider: 'longport',
          market: 'US',
          queryTypeFilter: 'get-stock-info',
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_PROVIDER);
        expect(dto.provider).toBe('longport');
        expect(dto.market).toBe('US');
        expect(dto.queryTypeFilter).toBe('get-stock-info');
      });

      it('should validate BY_CATEGORY query with tag', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_CATEGORY,
          tag: 'AI',
          market: 'US',
          limit: 25,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_CATEGORY);
        expect(dto.tag).toBe('AI');
        expect(dto.market).toBe('US');
        expect(dto.limit).toBe(25);
      });

      it('should validate BY_TIME_RANGE query with time parameters', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_TIME_RANGE,
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-01-31T23:59:59Z',
          symbols: ['AAPL'],
          limit: 100,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_TIME_RANGE);
        expect(dto.startTime).toBe('2023-01-01T00:00:00Z');
        expect(dto.endTime).toBe('2023-01-31T23:59:59Z');
        expect(dto.symbols).toEqual(['AAPL']);
        expect(dto.limit).toBe(100);
      });

      it('should validate ADVANCED query with complex parameters', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.ADVANCED,
          advancedQuery: {
            filters: {
              marketCap: { min: 1000000000, max: 10000000000 },
              sector: ['Technology', 'Healthcare'],
              pe: { max: 25 },
            },
            aggregations: {
              groupBy: 'sector',
              metrics: ['avgPrice', 'totalVolume'],
            },
            customSort: {
              field: 'marketCap',
              direction: 'desc',
            },
          },
          limit: 50,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.ADVANCED);
        expect(dto.advancedQuery).toBeDefined();
        expect(dto.advancedQuery?.filters).toBeDefined();
        expect(dto.advancedQuery?.aggregations).toBeDefined();
        expect(dto.advancedQuery?.customSort).toBeDefined();
        expect(dto.limit).toBe(50);
      });

      it('should validate query with all optional parameters', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 'MSFT'],
          market: 'US',
          provider: 'longport',
          tag: 'tech',
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-12-31T23:59:59Z',
          advancedQuery: { test: 'value' },
          maxAge: 600,
          queryTypeFilter: 'get-stock-quote',
          limit: 20,
          page: 2,
          offset: 10,
          options: {
            useCache: false,
            includeMetadata: true,
          },
          querySort: {
            field: 'price',
            direction: 'desc',
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(QueryType.BY_SYMBOLS);
        expect(dto.symbols).toEqual(['AAPL', 'MSFT']);
        expect(dto.market).toBe('US');
        expect(dto.provider).toBe('longport');
        expect(dto.tag).toBe('tech');
        expect(dto.startTime).toBe('2023-01-01T00:00:00Z');
        expect(dto.endTime).toBe('2023-12-31T23:59:59Z');
        expect(dto.advancedQuery).toEqual({ test: 'value' });
        expect(dto.maxAge).toBe(600);
        expect(dto.queryTypeFilter).toBe('get-stock-quote');
        expect(dto.limit).toBe(20);
        expect(dto.page).toBe(2);
        expect(dto.options?.useCache).toBe(false);
        expect(dto.options?.includeMetadata).toBe(true);
        expect(dto.querySort?.field).toBe('price');
        expect(dto.querySort?.direction).toBe('desc');
      });
    });

    describe('Invalid QueryRequestDto Instances', () => {
      it('should fail validation when queryType is missing', async () => {
        // Arrange
        const queryData = {
          symbols: ['AAPL'],
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queryType');
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].constraints?.isNotEmpty).toBeDefined();
        expect(errors[0].constraints?.isEnum).toBeDefined();
      });

      it('should fail validation when queryType is invalid enum value', async () => {
        // Arrange
        const queryData = {
          queryType: 'invalid_type',
          symbols: ['AAPL'],
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queryType');
        expect(errors[0].constraints?.isEnum).toBeDefined();
      });

      it('should fail validation when symbols array contains empty strings', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', '', 'MSFT'],
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('symbols');
        expect(errors[0].constraints?.isNotEmpty).toBeDefined();
      });

      it('should fail validation when symbols array contains non-strings', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 123, 'MSFT'],
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('symbols');
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when symbols is not an array', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: 'AAPL',
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('symbols');
        expect(errors[0].constraints?.isArray).toBeDefined();
      });

      it('should fail validation when market is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_MARKET,
          market: 123,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('market');
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when provider is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_PROVIDER,
          provider: [],
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('provider');
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when tag is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_CATEGORY,
          tag: { name: 'AI' },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('tag');
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when startTime is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_TIME_RANGE,
          startTime: new Date(),
          endTime: '2023-01-31T23:59:59Z',
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('startTime');
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when endTime is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_TIME_RANGE,
          startTime: '2023-01-01T00:00:00Z',
          endTime: 1234567890,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('endTime');
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when advancedQuery is not an object', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.ADVANCED,
          advancedQuery: 'invalid',
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('advancedQuery');
        expect(errors[0].constraints?.isObject).toBeDefined();
      });

      it('should fail validation when maxAge is not a number', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          maxAge: 'invalid',
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('maxAge');
        expect(errors[0].constraints?.isNumber).toBeDefined();
      });

      it('should fail validation when maxAge is less than 1', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          maxAge: 0,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('maxAge');
        expect(errors[0].constraints?.min).toBeDefined();
      });

      it('should fail validation when queryTypeFilter is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          queryTypeFilter: 123,
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queryTypeFilter');
        expect(errors[0].constraints?.isString).toBeDefined();
      });
    });

    describe('Nested Object Validation', () => {
      it('should validate nested QueryOptionsDto correctly', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          options: {
            useCache: true,
            includeMetadata: false,
            includeFields: ['symbol', 'price'],
            excludeFields: ['internal'],
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.options?.useCache).toBe(true);
        expect(dto.options?.includeMetadata).toBe(false);
        expect(dto.options?.includeFields).toEqual(['symbol', 'price']);
        expect(dto.options?.excludeFields).toEqual(['internal']);
      });

      it('should fail validation when QueryOptionsDto useCache is not boolean', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          options: {
            useCache: 'true',
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('options');
        expect(errors[0].children).toHaveLength(1);
        expect(errors[0].children![0].property).toBe('useCache');
        expect(errors[0].children![0].constraints?.isBoolean).toBeDefined();
      });

      it('should fail validation when QueryOptionsDto includeFields contains non-strings', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          options: {
            includeFields: ['symbol', 123, 'price'],
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('options');
        expect(errors[0].children).toHaveLength(1);
        expect(errors[0].children![0].property).toBe('includeFields');
        expect(errors[0].children![0].constraints?.isString).toBeDefined();
      });

      it('should validate nested SortOptionsDto correctly', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          querySort: {
            field: 'symbol',
            direction: 'asc',
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.querySort?.field).toBe('symbol');
        expect(dto.querySort?.direction).toBe('asc');
      });

      it('should fail validation when SortOptionsDto field is not a string', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          querySort: {
            field: 123,
            direction: 'asc',
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('querySort');
        expect(errors[0].children).toHaveLength(1);
        expect(errors[0].children![0].property).toBe('field');
        expect(errors[0].children![0].constraints?.isString).toBeDefined();
      });

      it('should fail validation when SortOptionsDto direction is invalid enum', async () => {
        // Arrange
        const queryData = {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          querySort: {
            field: 'symbol',
            direction: 'invalid',
          },
        };

        // Act
        const dto = plainToInstance(QueryRequestDto, queryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('querySort');
        expect(errors[0].children).toHaveLength(1);
        expect(errors[0].children![0].property).toBe('direction');
        expect(errors[0].children![0].constraints?.isEnum).toBeDefined();
      });
    });
  });

  describe('BulkQueryRequestDto', () => {
    describe('Valid BulkQueryRequestDto Instances', () => {
      it('should validate a complete bulk query request', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL'],
            },
            {
              queryType: QueryType.BY_MARKET,
              market: 'US',
            },
          ],
          parallel: true,
          continueOnError: false,
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queries).toHaveLength(2);
        expect(dto.queries[0].queryType).toBe(QueryType.BY_SYMBOLS);
        expect(dto.queries[0].symbols).toEqual(['AAPL']);
        expect(dto.queries[1].queryType).toBe(QueryType.BY_MARKET);
        expect(dto.queries[1].market).toBe('US');
        expect(dto.parallel).toBe(true);
        expect(dto.continueOnError).toBe(false);
      });

      it('should validate bulk query with default values', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL'],
            },
          ],
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queries).toHaveLength(1);
        expect(dto.parallel).toBe(true); // Default value
        expect(dto.continueOnError).toBe(false); // Default value
      });

      it('should validate bulk query with multiple complex queries', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL', 'MSFT'],
              provider: 'longport',
              options: {
                useCache: true,
                includeMetadata: true,
              },
            },
            {
              queryType: QueryType.BY_TIME_RANGE,
              startTime: '2023-01-01T00:00:00Z',
              endTime: '2023-01-31T23:59:59Z',
              symbols: ['GOOGL'],
            },
            {
              queryType: QueryType.ADVANCED,
              advancedQuery: {
                filters: { marketCap: { min: 1000000000 } },
              },
            },
          ],
          parallel: false,
          continueOnError: true,
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queries).toHaveLength(3);
        expect(dto.queries[0].queryType).toBe(QueryType.BY_SYMBOLS);
        expect(dto.queries[1].queryType).toBe(QueryType.BY_TIME_RANGE);
        expect(dto.queries[2].queryType).toBe(QueryType.ADVANCED);
        expect(dto.parallel).toBe(false);
        expect(dto.continueOnError).toBe(true);
      });
    });

    describe('Invalid BulkQueryRequestDto Instances', () => {
      it('should fail validation when queries array is empty', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [],
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queries');
        expect(errors[0].constraints?.arrayMinSize).toBeDefined();
      });

      it('should fail validation when queries is not an array', async () => {
        // Arrange
        const bulkQueryData = {
          queries: 'invalid',
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queries');
        expect(errors[0].constraints?.isArray).toBeDefined();
      });

      it('should fail validation when parallel is not a boolean', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL'],
            },
          ],
          parallel: 'true',
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('parallel');
        expect(errors[0].constraints?.isBoolean).toBeDefined();
      });

      it('should fail validation when continueOnError is not a boolean', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL'],
            },
          ],
          continueOnError: 1,
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('continueOnError');
        expect(errors[0].constraints?.isBoolean).toBeDefined();
      });

      it('should fail validation when nested query validation fails', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL'],
            },
            {
              queryType: 'invalid_type',
              symbols: ['MSFT'],
            },
          ],
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queries');
        expect(errors[0].children).toHaveLength(1);
        expect(errors[0].children![0].property).toBe('1');
        expect(errors[0].children![0].children).toHaveLength(1);
        expect(errors[0].children![0].children![0].property).toBe('queryType');
        expect(errors[0].children![0].children![0].constraints?.isEnum).toBeDefined();
      });

      it('should propagate nested validation errors correctly', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_SYMBOLS,
              symbols: ['AAPL', '', 'MSFT'], // Empty string should fail
            },
          ],
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('queries');
        expect(errors[0].children).toHaveLength(1);
        expect(errors[0].children![0].property).toBe('0');
        expect(errors[0].children![0].children).toHaveLength(1);
        expect(errors[0].children![0].children![0].property).toBe('symbols');
        expect(errors[0].children![0].children![0].constraints?.isNotEmpty).toBeDefined();
      });
    });

    describe('Array Size Validation', () => {
      it('should validate bulk query with maximum allowed queries', async () => {
        // Arrange - Create array with QUERY_LIMITS.BULK_QUERIES items (assuming it's a reasonable number like 10-100)
        const queries = Array.from({ length: 10 }, (_, i) => ({
          queryType: QueryType.BY_SYMBOLS,
          symbols: [`SYMBOL${i}`],
        }));

        const bulkQueryData = {
          queries: queries,
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queries).toHaveLength(10);
      });

      it('should handle single query in bulk request', async () => {
        // Arrange
        const bulkQueryData = {
          queries: [
            {
              queryType: QueryType.BY_PROVIDER,
              provider: 'longport',
              market: 'US',
            },
          ],
        };

        // Act
        const dto = plainToInstance(BulkQueryRequestDto, bulkQueryData);
        const errors = await validate(dto);

        // Assert
        expect(errors).toHaveLength(0);
        expect(dto.queries).toHaveLength(1);
        expect(dto.queries[0].queryType).toBe(QueryType.BY_PROVIDER);
        expect(dto.queries[0].provider).toBe('longport');
      });
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle undefined optional fields correctly', async () => {
      // Arrange
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
        market: undefined,
        provider: undefined,
        options: undefined,
        querySort: undefined,
      };

      // Act
      const dto = plainToInstance(QueryRequestDto, queryData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.market).toBeUndefined();
      expect(dto.provider).toBeUndefined();
      expect(dto.options).toBeUndefined();
      expect(dto.querySort).toBeUndefined();
    });

    it('should handle null values as invalid for required fields', async () => {
      // Arrange
      const queryData = {
        queryType: null,
        symbols: ['AAPL'],
      };

      // Act
      const dto = plainToInstance(QueryRequestDto, queryData);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('queryType');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should validate complex nested structure with all features', async () => {
      // Arrange
      const complexQuery = {
        queryType: QueryType.ADVANCED,
        advancedQuery: {
          filters: {
            complex: {
              nested: {
                value: 'test',
                array: [1, 2, 3],
              },
            },
          },
        },
        options: {
          useCache: false,
          includeMetadata: true,
          includeFields: ['field1', 'field2', 'field3'],
          excludeFields: ['sensitive', 'internal'],
        },
        querySort: {
          field: 'customField',
          direction: 'desc',
        },
        maxAge: 1800,
        limit: 75,
        page: 3,
      };

      // Act
      const dto = plainToInstance(QueryRequestDto, complexQuery);
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
      expect(dto.advancedQuery?.filters?.complex?.nested?.value).toBe('test');
      expect(dto.options?.includeFields).toEqual(['field1', 'field2', 'field3']);
      expect(dto.options?.excludeFields).toEqual(['sensitive', 'internal']);
      expect(dto.querySort?.direction).toBe('desc');
      expect(dto.maxAge).toBe(1800);
    });
  });
});