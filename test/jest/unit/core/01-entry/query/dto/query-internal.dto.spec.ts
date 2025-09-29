import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  QueryStatsRecordDto,
  DataSourceCounterDto,
  DataSourceStatsDto,
  QueryExecutionResultDto,
  QueryErrorInfoDto,
  SymbolDataResultDto,
  CacheQueryResultDto,
  RealtimeQueryResultDto,
  FieldSelectionDto,
  SortConfigDto,
  PostProcessingConfigDto,
  QueryPerformanceMetricsDto,
  StorageKeyParamsDto,
  BulkQueryExecutionConfigDto,
  QueryLogContextDto
} from '@core/01-entry/query/dto/query-internal.dto';
import { DataSourceType } from '@core/01-entry/query/enums/data-source-type.enum';
import { SortDirection } from '@core/01-entry/query/dto/query-request.dto';

describe('Query Internal DTOs', () => {
  describe('QueryStatsRecordDto', () => {
    it('should validate a valid stats record', async () => {
      const data = {
        count: 100,
        totalTime: 15000,
        errors: 2
      };

      const dto = plainToInstance(QueryStatsRecordDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.count).toBe(100);
      expect(dto.totalTime).toBe(15000);
      expect(dto.errors).toBe(2);
    });

    it('should fail validation for invalid types', async () => {
      const data = {
        count: 'invalid',
        totalTime: 'invalid',
        errors: 'invalid'
      };

      const dto = plainToInstance(QueryStatsRecordDto, data);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'count')).toBe(true);
      expect(errors.some(error => error.property === 'totalTime')).toBe(true);
      expect(errors.some(error => error.property === 'errors')).toBe(true);
    });
  });

  describe('DataSourceCounterDto', () => {
    it('should validate valid counter data', async () => {
      const data = {
        hits: 85,
        misses: 15
      };

      const dto = plainToInstance(DataSourceCounterDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.hits).toBe(85);
      expect(dto.misses).toBe(15);
    });

    it('should handle zero values', async () => {
      const data = {
        hits: 0,
        misses: 0
      };

      const dto = plainToInstance(DataSourceCounterDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.hits).toBe(0);
      expect(dto.misses).toBe(0);
    });
  });

  describe('DataSourceStatsDto', () => {
    it('should validate nested data source stats', async () => {
      const data = {
        cache: {
          hits: 80,
          misses: 20
        },
        realtime: {
          hits: 15,
          misses: 5
        }
      };

      const dto = plainToInstance(DataSourceStatsDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.cache.hits).toBe(80);
      expect(dto.cache.misses).toBe(20);
      expect(dto.realtime.hits).toBe(15);
      expect(dto.realtime.misses).toBe(5);
    });

    it('should fail validation for missing nested properties', async () => {
      const data = {
        cache: { hits: 10 }, // missing misses
        realtime: { misses: 5 } // missing hits
      };

      const dto = plainToInstance(DataSourceStatsDto, data);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('QueryExecutionResultDto', () => {
    it('should validate complete execution result', async () => {
      const data = {
        results: [
          { symbol: 'AAPL', price: 150.25 },
          { symbol: 'GOOGL', price: 2750.80 }
        ],
        cacheUsed: true,
        dataSources: {
          cache: { hits: 2, misses: 0 },
          realtime: { hits: 0, misses: 0 }
        },
        errors: [
          { symbol: 'INVALID', reason: 'Symbol not found' }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      const dto = plainToInstance(QueryExecutionResultDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.results).toHaveLength(2);
      expect(dto.cacheUsed).toBe(true);
      expect(dto.dataSources.cache.hits).toBe(2);
      expect(dto.errors).toHaveLength(1);
      expect(dto.pagination?.page).toBe(1);
    });

    it('should validate with optional fields omitted', async () => {
      const data = {
        results: [],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 1 },
          realtime: { hits: 0, misses: 1 }
        }
      };

      const dto = plainToInstance(QueryExecutionResultDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.results).toEqual([]);
      expect(dto.errors).toBeUndefined();
      expect(dto.pagination).toBeUndefined();
    });
  });

  describe('QueryErrorInfoDto', () => {
    it('should validate complete error info', async () => {
      const data = {
        symbol: 'INVALID_SYMBOL',
        reason: 'Symbol not found in provider database',
        errorCode: 'SYMBOL_NOT_FOUND',
        details: {
          provider: 'longport',
          market: 'US',
          searchAttempts: 3
        }
      };

      const dto = plainToInstance(QueryErrorInfoDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.symbol).toBe('INVALID_SYMBOL');
      expect(dto.reason).toBe('Symbol not found in provider database');
      expect(dto.errorCode).toBe('SYMBOL_NOT_FOUND');
      expect(dto.details?.provider).toBe('longport');
    });

    it('should validate minimal error info', async () => {
      const data = {
        symbol: 'TEST',
        reason: 'Generic error'
      };

      const dto = plainToInstance(QueryErrorInfoDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.symbol).toBe('TEST');
      expect(dto.reason).toBe('Generic error');
      expect(dto.errorCode).toBeUndefined();
      expect(dto.details).toBeUndefined();
    });

    it('should fail validation for missing required fields', async () => {
      const data = {
        symbol: 'TEST'
        // missing reason
      };

      const dto = plainToInstance(QueryErrorInfoDto, data);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'reason')).toBe(true);
    });
  });

  describe('SymbolDataResultDto', () => {
    it('should validate symbol data result with all fields', async () => {
      const data = {
        data: { symbol: 'AAPL', price: 150.25, volume: 1000000 },
        source: DataSourceType.DATASOURCETYPECACHE,
        timestamp: '2024-01-01T12:00:00.000Z',
        ttlRemaining: 300
      };

      const dto = plainToInstance(SymbolDataResultDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.data.symbol).toBe('AAPL');
      expect(dto.source).toBe(DataSourceType.DATASOURCETYPECACHE);
      expect(dto.timestamp).toBe('2024-01-01T12:00:00.000Z');
      expect(dto.ttlRemaining).toBe(300);
    });

    it('should validate with only required fields', async () => {
      const data = {
        data: { symbol: 'GOOGL', price: 2750.80 },
        source: DataSourceType.REALTIME
      };

      const dto = plainToInstance(SymbolDataResultDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.data.symbol).toBe('GOOGL');
      expect(dto.source).toBe(DataSourceType.REALTIME);
      expect(dto.timestamp).toBeUndefined();
      expect(dto.ttlRemaining).toBeUndefined();
    });
  });

  describe('FieldSelectionDto', () => {
    it('should validate field selection with include and exclude fields', async () => {
      const data = {
        includeFields: ['symbol', 'price', 'volume'],
        excludeFields: ['rawData', 'debug']
      };

      const dto = plainToInstance(FieldSelectionDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.includeFields).toEqual(['symbol', 'price', 'volume']);
      expect(dto.excludeFields).toEqual(['rawData', 'debug']);
    });

    it('should validate with empty arrays', async () => {
      const data = {
        includeFields: [],
        excludeFields: []
      };

      const dto = plainToInstance(FieldSelectionDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.includeFields).toEqual([]);
      expect(dto.excludeFields).toEqual([]);
    });

    it('should validate with omitted optional fields', async () => {
      const data = {};

      const dto = plainToInstance(FieldSelectionDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.includeFields).toBeUndefined();
      expect(dto.excludeFields).toBeUndefined();
    });

    it('should fail validation for non-string array elements', async () => {
      const data = {
        includeFields: ['symbol', 123, 'price'],
        excludeFields: ['rawData', null]
      };

      const dto = plainToInstance(FieldSelectionDto, data);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SortConfigDto', () => {
    it('should validate ascending sort configuration', async () => {
      const data = {
        field: 'symbol',
        direction: SortDirection.ASC
      };

      const dto = plainToInstance(SortConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.field).toBe('symbol');
      expect(dto.direction).toBe(SortDirection.ASC);
    });

    it('should validate descending sort configuration', async () => {
      const data = {
        field: 'price',
        direction: SortDirection.DESC
      };

      const dto = plainToInstance(SortConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.field).toBe('price');
      expect(dto.direction).toBe(SortDirection.DESC);
    });

    it('should fail validation for invalid direction', async () => {
      const data = {
        field: 'price',
        direction: 'invalid'
      };

      const dto = plainToInstance(SortConfigDto, data);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'direction')).toBe(true);
    });
  });

  describe('PostProcessingConfigDto', () => {
    it('should validate complete post-processing config', async () => {
      const data = {
        fieldSelection: {
          includeFields: ['symbol', 'price'],
          excludeFields: ['rawData']
        },
        sort: {
          field: 'symbol',
          direction: SortDirection.ASC
        },
        limit: 10,
        offset: 0
      };

      const dto = plainToInstance(PostProcessingConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.fieldSelection?.includeFields).toEqual(['symbol', 'price']);
      expect(dto.sort?.field).toBe('symbol');
      expect(dto.limit).toBe(10);
      expect(dto.offset).toBe(0);
    });

    it('should validate with only required fields', async () => {
      const data = {
        limit: 20,
        offset: 10
      };

      const dto = plainToInstance(PostProcessingConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(20);
      expect(dto.offset).toBe(10);
      expect(dto.fieldSelection).toBeUndefined();
      expect(dto.sort).toBeUndefined();
    });
  });

  describe('QueryPerformanceMetricsDto', () => {
    it('should validate performance metrics', async () => {
      const data = {
        cacheQueryTime: 15,
        persistentQueryTime: 120,
        realtimeQueryTime: 350,
        dataProcessingTime: 25,
        totalExecutionTime: 510,
        isSlowQuery: true
      };

      const dto = plainToInstance(QueryPerformanceMetricsDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.cacheQueryTime).toBe(15);
      expect(dto.persistentQueryTime).toBe(120);
      expect(dto.realtimeQueryTime).toBe(350);
      expect(dto.dataProcessingTime).toBe(25);
      expect(dto.totalExecutionTime).toBe(510);
      expect(dto.isSlowQuery).toBe(true);
    });

    it('should validate fast query metrics', async () => {
      const data = {
        cacheQueryTime: 10,
        persistentQueryTime: 0,
        realtimeQueryTime: 0,
        dataProcessingTime: 5,
        totalExecutionTime: 15,
        isSlowQuery: false
      };

      const dto = plainToInstance(QueryPerformanceMetricsDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.totalExecutionTime).toBe(15);
      expect(dto.isSlowQuery).toBe(false);
    });
  });

  describe('StorageKeyParamsDto', () => {
    it('should validate complete storage key params', async () => {
      const data = {
        symbol: 'AAPL',
        provider: 'longport',
        queryTypeFilter: 'get-stock-quote',
        market: 'US'
      };

      const dto = plainToInstance(StorageKeyParamsDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.symbol).toBe('AAPL');
      expect(dto.provider).toBe('longport');
      expect(dto.queryTypeFilter).toBe('get-stock-quote');
      expect(dto.market).toBe('US');
    });

    it('should validate with only required symbol', async () => {
      const data = {
        symbol: 'GOOGL'
      };

      const dto = plainToInstance(StorageKeyParamsDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.symbol).toBe('GOOGL');
      expect(dto.provider).toBeUndefined();
      expect(dto.queryTypeFilter).toBeUndefined();
      expect(dto.market).toBeUndefined();
    });
  });

  describe('BulkQueryExecutionConfigDto', () => {
    it('should validate complete bulk execution config', async () => {
      const data = {
        parallel: true,
        continueOnError: false,
        maxConcurrency: 5,
        timeout: 30000
      };

      const dto = plainToInstance(BulkQueryExecutionConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.parallel).toBe(true);
      expect(dto.continueOnError).toBe(false);
      expect(dto.maxConcurrency).toBe(5);
      expect(dto.timeout).toBe(30000);
    });

    it('should validate with only required fields', async () => {
      const data = {
        parallel: false,
        continueOnError: true
      };

      const dto = plainToInstance(BulkQueryExecutionConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.parallel).toBe(false);
      expect(dto.continueOnError).toBe(true);
      expect(dto.maxConcurrency).toBeUndefined();
      expect(dto.timeout).toBeUndefined();
    });
  });

  describe('QueryLogContextDto', () => {
    it('should validate complete log context', async () => {
      const data = {
        queryId: 'query_12345',
        queryType: 'by_symbols',
        operation: 'execute_query',
        executionTime: 150,
        symbols: ['AAPL', 'GOOGL'],
        error: 'Timeout occurred'
      };

      const dto = plainToInstance(QueryLogContextDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queryId).toBe('query_12345');
      expect(dto.queryType).toBe('by_symbols');
      expect(dto.operation).toBe('execute_query');
      expect(dto.executionTime).toBe(150);
      expect(dto.symbols).toEqual(['AAPL', 'GOOGL']);
      expect(dto.error).toBe('Timeout occurred');
    });

    it('should validate with only required fields', async () => {
      const data = {
        queryId: 'query_67890',
        queryType: 'by_market',
        operation: 'validate_request'
      };

      const dto = plainToInstance(QueryLogContextDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queryId).toBe('query_67890');
      expect(dto.queryType).toBe('by_market');
      expect(dto.operation).toBe('validate_request');
      expect(dto.executionTime).toBeUndefined();
      expect(dto.symbols).toBeUndefined();
      expect(dto.error).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should validate complex nested DTO structure', async () => {
      const data = {
        results: [
          { symbol: 'AAPL', price: 150.25 },
          { symbol: 'GOOGL', price: 2750.80 }
        ],
        cacheUsed: true,
        dataSources: {
          cache: { hits: 1, misses: 1 },
          realtime: { hits: 1, misses: 0 }
        },
        errors: [
          {
            symbol: 'INVALID',
            reason: 'Symbol not found',
            errorCode: 'SYMBOL_NOT_FOUND',
            details: { attempts: 3 }
          }
        ]
      };

      const dto = plainToInstance(QueryExecutionResultDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.results).toHaveLength(2);
      expect(dto.dataSources.cache.hits).toBe(1);
      expect(dto.errors?.[0].errorCode).toBe('SYMBOL_NOT_FOUND');
    });

    it('should handle validation chain for post-processing config', async () => {
      const data = {
        fieldSelection: {
          includeFields: ['symbol', 'price', 'volume'],
          excludeFields: ['debug']
        },
        sort: {
          field: 'price',
          direction: SortDirection.DESC
        },
        limit: 50,
        offset: 25
      };

      const dto = plainToInstance(PostProcessingConfigDto, data);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.fieldSelection?.includeFields).toContain('symbol');
      expect(dto.sort?.direction).toBe(SortDirection.DESC);
      expect(dto.limit).toBe(50);
    });
  });
});
