/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Query Internal DTO 单元测试
 * 测试查询内部数据传输对象
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  QueryStatsRecordDto,
  QueryExecutionResultDto,
  QueryErrorInfoDto,
  SymbolDataResultDto,
  FieldSelectionDto,
  SortConfigDto,
  PostProcessingConfigDto,
  QueryPerformanceMetricsDto,
  StorageKeyParamsDto,
  BulkQueryExecutionConfigDto,
  QueryLogContextDto,
  DataSourceStatsDto,
  DataSourceCounterDto,
} from '../../../../../../../src/core/restapi/query/dto/query-internal.dto';
import { DataSourceType } from '../../../../../../../src/core/restapi/query/enums/data-source-type.enum';

describe('Query Internal DTOs', () => {
  describe('QueryStatsRecordDto', () => {
    let dto: QueryStatsRecordDto;

    beforeEach(() => {
      dto = new QueryStatsRecordDto();
    });

    describe('Valid Data', () => {
      it('should create instance with valid data', () => {
        // Arrange
        dto.count = 100;
        dto.totalTime = 1500;
        dto.errors = 2;

        // Assert
        expect(dto.count).toBe(100);
        expect(dto.totalTime).toBe(1500);
        expect(dto.errors).toBe(2);
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.count = 50;
        dto.totalTime = 800;
        dto.errors = 0;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with non-numeric values', async () => {
        // Arrange
        dto.count = 'invalid' as any;
        dto.totalTime = 'invalid' as any;
        dto.errors = 'invalid' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(3);
        expect(errors.some(e => e.property === 'count')).toBe(true);
        expect(errors.some(e => e.property === 'totalTime')).toBe(true);
        expect(errors.some(e => e.property === 'errors')).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero values', () => {
        // Arrange
        dto.count = 0;
        dto.totalTime = 0;
        dto.errors = 0;

        // Assert
        expect(dto.count).toBe(0);
        expect(dto.totalTime).toBe(0);
        expect(dto.errors).toBe(0);
      });

      it('should handle large values', () => {
        // Arrange
        dto.count = 1000000;
        dto.totalTime = 3600000; // 1 hour in ms
        dto.errors = 100;

        // Assert
        expect(dto.count).toBe(1000000);
        expect(dto.totalTime).toBe(3600000);
        expect(dto.errors).toBe(100);
      });
    });
  });

  describe('QueryExecutionResultDto', () => {
    let dto: QueryExecutionResultDto;

    beforeEach(() => {
      dto = new QueryExecutionResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete data', () => {
        // Arrange
        dto.results = [{ symbol: '00700.HK', price: 425.6 }];
        dto.cacheUsed = true;
        dto.dataSources = {
          cache: { hits: 5, misses: 1 },
          realtime: { hits: 1, misses: 0 },
        };
        dto.errors = [];
        dto.pagination = {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        };

        // Assert
        expect(dto.results).toHaveLength(1);
        expect(dto.cacheUsed).toBe(true);
        expect(dto.dataSources.cache.hits).toBe(5);
        expect(dto.pagination.total).toBe(1);
      });

      it('should validate successfully with minimal data', async () => {
        // Arrange
        dto.results = [];
        dto.cacheUsed = false;
        
        const dataSources = new DataSourceStatsDto();
        dataSources.cache = new DataSourceCounterDto();
        dataSources.cache.hits = 0;
        dataSources.cache.misses = 0;
        dataSources.realtime = new DataSourceCounterDto();
        dataSources.realtime.hits = 0;
        dataSources.realtime.misses = 0;
        dto.dataSources = dataSources;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Generic Type Handling', () => {
      it('should handle different result types', () => {
        // Arrange & Act & Assert
        const stockDto = new QueryExecutionResultDto<any>();
        stockDto.results = [{ symbol: 'AAPL', price: 150.25 }];
        expect(stockDto.results[0].symbol).toBe('AAPL');

        const newsDto = new QueryExecutionResultDto<any>();
        newsDto.results = [{ title: 'Market News', content: 'Content...' }];
        expect(newsDto.results[0].title).toBe('Market News');
      });
    });

    describe('Pagination', () => {
      it('should handle pagination correctly', () => {
        // Arrange
        dto.pagination = {
          page: 2,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: true,
        };

        // Assert
        expect(dto.pagination.page).toBe(2);
        expect(dto.pagination.hasNext).toBe(true);
        expect(dto.pagination.hasPrev).toBe(true);
      });
    });
  });

  describe('QueryErrorInfoDto', () => {
    let dto: QueryErrorInfoDto;

    beforeEach(() => {
      dto = new QueryErrorInfoDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete error info', () => {
        // Arrange
        dto.symbol = '00700.HK';
        dto.reason = 'Provider timeout';
        dto.errorCode = 'TIMEOUT_ERROR';
        dto.details = {
          _provider: 'longport',
          timeout: 5000,
          retryCount: 3,
        };

        // Assert
        expect(dto.symbol).toBe('00700.HK');
        expect(dto.reason).toBe('Provider timeout');
        expect(dto.errorCode).toBe('TIMEOUT_ERROR');
        expect(dto.details.provider).toBe('longport');
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.symbol = 'AAPL';
        dto.reason = 'Market closed';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Optional Fields', () => {
      it('should handle missing optional fields', async () => {
        // Arrange
        dto.symbol = 'AAPL';
        dto.reason = 'Unknown error';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
        expect(dto.errorCode).toBeUndefined();
        expect(dto.details).toBeUndefined();
      });
    });
  });

  describe('SymbolDataResultDto', () => {
    let dto: SymbolDataResultDto;

    beforeEach(() => {
      dto = new SymbolDataResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with stock data', () => {
        // Arrange
        dto.data = { symbol: '00700.HK', price: 425.6, volume: 1000000 };
        dto.source = DataSourceType.CACHE;
        dto.timestamp = '2023-06-01T10:00:00Z';
        dto.ttlRemaining = 300;

        // Assert
        expect(dto.data.symbol).toBe('00700.HK');
        expect(dto.source).toBe(DataSourceType.CACHE);
        expect(dto.timestamp).toBe('2023-06-01T10:00:00Z');
        expect(dto.ttlRemaining).toBe(300);
      });

      it('should handle different data sources', () => {
        // Arrange
        const sources = [DataSourceType.CACHE, DataSourceType.REALTIME, DataSourceType.PERSISTENT];

        sources.forEach(source => {
          dto.data = { test: 'data' };
          dto.source = source;

          // Assert
          expect(dto.source).toBe(source);
        });
      });
    });

    describe('Generic Type Support', () => {
      it('should support different data types', () => {
        // Arrange & Act & Assert
        const stockDto = new SymbolDataResultDto<{ symbol: string; price: number }>();
        stockDto.data = { symbol: 'AAPL', price: 150.25 };
        stockDto.source = DataSourceType.REALTIME;
        expect(stockDto.data.symbol).toBe('AAPL');

        const newsDto = new SymbolDataResultDto<{ title: string; content: string }>();
        newsDto.data = { title: 'News', content: 'Content' };
        newsDto.source = DataSourceType.CACHE;
        expect(newsDto.data.title).toBe('News');
      });
    });
  });

  describe('FieldSelectionDto', () => {
    let dto: FieldSelectionDto;

    beforeEach(() => {
      dto = new FieldSelectionDto();
    });

    describe('Valid Data', () => {
      it('should create instance with include fields', () => {
        // Arrange
        dto.includeFields = ['symbol', 'price', 'volume'];

        // Assert
        expect(dto.includeFields).toEqual(['symbol', 'price', 'volume']);
        expect(dto.excludeFields).toBeUndefined();
      });

      it('should create instance with exclude fields', () => {
        // Arrange
        dto.excludeFields = ['timestamp', 'metadata'];

        // Assert
        expect(dto.excludeFields).toEqual(['timestamp', 'metadata']);
        expect(dto.includeFields).toBeUndefined();
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.includeFields = ['field1', 'field2'];
        dto.excludeFields = ['field3'];

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with non-string array elements', async () => {
        // Arrange
        dto.includeFields = ['valid', 123 as any, 'another'];

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty arrays', async () => {
        // Arrange
        dto.includeFields = [];
        dto.excludeFields = [];

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
        expect(dto.includeFields).toHaveLength(0);
        expect(dto.excludeFields).toHaveLength(0);
      });
    });
  });

  describe('SortConfigDto', () => {
    let dto: SortConfigDto;

    beforeEach(() => {
      dto = new SortConfigDto();
    });

    describe('Valid Data', () => {
      it('should create instance with ascending sort', () => {
        // Arrange
        dto.field = 'price';
        dto.direction = 'ASC';

        // Assert
        expect(dto.field).toBe('price');
        expect(dto.direction).toBe('ASC');
      });

      it('should create instance with descending sort', () => {
        // Arrange
        dto.field = 'timestamp';
        dto.direction = 'DESC';

        // Assert
        expect(dto.field).toBe('timestamp');
        expect(dto.direction).toBe('DESC');
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.field = 'volume';
        dto.direction = 'ASC';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid direction', async () => {
        // Arrange
        dto.field = 'price';
        dto.direction = 'INVALID' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.property === 'direction')).toBe(true);
      });
    });
  });

  describe('PostProcessingConfigDto', () => {
    let dto: PostProcessingConfigDto;

    beforeEach(() => {
      dto = new PostProcessingConfigDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete config', () => {
        // Arrange
        dto.fieldSelection = {
          includeFields: ['symbol', 'price'],
          excludeFields: ['metadata'],
        };
        dto.sort = {
          field: 'price',
          direction: 'DESC',
        };
        dto.limit = 50;
        dto.offset = 0;

        // Assert
        expect(dto.fieldSelection.includeFields).toEqual(['symbol', 'price']);
        expect(dto.sort.field).toBe('price');
        expect(dto.limit).toBe(50);
        expect(dto.offset).toBe(0);
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.limit = 10;
        dto.offset = 20;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });

      it('should validate nested objects', async () => {
        // Arrange
        const fieldSelection = new FieldSelectionDto();
        fieldSelection.includeFields = ['test'];
        fieldSelection.excludeFields = [];

        const sort = new SortConfigDto();
        sort.field = 'timestamp';
        sort.direction = 'ASC';

        dto.fieldSelection = fieldSelection;
        dto.sort = sort;
        dto.limit = 100;
        dto.offset = 0;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid nested data', async () => {
        // Arrange
        dto.fieldSelection = {
          includeFields: [123 as any], // Invalid
        };
        dto.sort = {
          field: 'price',
          direction: 'INVALID' as any, // Invalid
        };
        dto.limit = 'invalid' as any;
        dto.offset = 'invalid' as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('QueryPerformanceMetricsDto', () => {
    let dto: QueryPerformanceMetricsDto;

    beforeEach(() => {
      dto = new QueryPerformanceMetricsDto();
    });

    describe('Valid Data', () => {
      it('should create instance with performance metrics', () => {
        // Arrange
        dto.cacheQueryTime = 10;
        dto.persistentQueryTime = 50;
        dto.realtimeQueryTime = 200;
        dto.dataProcessingTime = 30;
        dto.totalExecutionTime = 290;
        dto.isSlowQuery = true;

        // Assert
        expect(dto.cacheQueryTime).toBe(10);
        expect(dto.persistentQueryTime).toBe(50);
        expect(dto.realtimeQueryTime).toBe(200);
        expect(dto.dataProcessingTime).toBe(30);
        expect(dto.totalExecutionTime).toBe(290);
        expect(dto.isSlowQuery).toBe(true);
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.cacheQueryTime = 5;
        dto.persistentQueryTime = 15;
        dto.realtimeQueryTime = 100;
        dto.dataProcessingTime = 10;
        dto.totalExecutionTime = 130;
        dto.isSlowQuery = false;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Performance Analysis', () => {
      it('should identify fast queries', () => {
        // Arrange
        dto.cacheQueryTime = 2;
        dto.persistentQueryTime = 0;
        dto.realtimeQueryTime = 0;
        dto.dataProcessingTime = 3;
        dto.totalExecutionTime = 5;
        dto.isSlowQuery = false;

        // Assert
        expect(dto.totalExecutionTime).toBeLessThan(10);
        expect(dto.isSlowQuery).toBe(false);
      });

      it('should identify slow queries', () => {
        // Arrange
        dto.cacheQueryTime = 100;
        dto.persistentQueryTime = 500;
        dto.realtimeQueryTime = 2000;
        dto.dataProcessingTime = 400;
        dto.totalExecutionTime = 3000;
        dto.isSlowQuery = true;

        // Assert
        expect(dto.totalExecutionTime).toBeGreaterThan(1000);
        expect(dto.isSlowQuery).toBe(true);
      });
    });
  });

  describe('StorageKeyParamsDto', () => {
    let dto: StorageKeyParamsDto;

    beforeEach(() => {
      dto = new StorageKeyParamsDto();
    });

    describe('Valid Data', () => {
      it('should create instance with all parameters', () => {
        // Arrange
        dto.symbol = '00700.HK';
        dto.provider = 'longport';
        dto.queryTypeFilter = 'get-stock-quote';
        dto.market = 'HK';

        // Assert
        expect(dto.symbol).toBe('00700.HK');
        expect(dto.provider).toBe('longport');
        expect(dto.queryTypeFilter).toBe('get-stock-quote');
        expect(dto.market).toBe('HK');
      });

      it('should validate successfully with minimal data', async () => {
        // Arrange
        dto.symbol = 'AAPL';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Key Generation Scenarios', () => {
      it('should support HK stock keys', () => {
        // Arrange
        dto.symbol = '00700.HK';
        dto.provider = 'longport';
        dto.market = 'HK';

        // Assert
        expect(dto.symbol).toContain('.HK');
        expect(dto.market).toBe('HK');
      });

      it('should support US stock keys', () => {
        // Arrange
        dto.symbol = 'AAPL.US';
        dto.provider = 'longport';
        dto.market = 'US';

        // Assert
        expect(dto.symbol).toContain('.US');
        expect(dto.market).toBe('US');
      });
    });
  });

  describe('BulkQueryExecutionConfigDto', () => {
    let dto: BulkQueryExecutionConfigDto;

    beforeEach(() => {
      dto = new BulkQueryExecutionConfigDto();
    });

    describe('Valid Data', () => {
      it('should create instance with parallel execution', () => {
        // Arrange
        dto.parallel = true;
        dto.continueOnError = true;
        dto.maxConcurrency = 10;
        dto.timeout = 5000;

        // Assert
        expect(dto.parallel).toBe(true);
        expect(dto.continueOnError).toBe(true);
        expect(dto.maxConcurrency).toBe(10);
        expect(dto.timeout).toBe(5000);
      });

      it('should create instance with sequential execution', () => {
        // Arrange
        dto.parallel = false;
        dto.continueOnError = false;

        // Assert
        expect(dto.parallel).toBe(false);
        expect(dto.continueOnError).toBe(false);
        expect(dto.maxConcurrency).toBeUndefined();
        expect(dto.timeout).toBeUndefined();
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.parallel = true;
        dto.continueOnError = false;
        dto.maxConcurrency = 5;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Execution Strategies', () => {
      it('should configure high-performance bulk query', () => {
        // Arrange
        dto.parallel = true;
        dto.continueOnError = true;
        dto.maxConcurrency = 20;
        dto.timeout = 10000;

        // Assert
        expect(dto.parallel).toBe(true);
        expect(dto.maxConcurrency).toBe(20);
        expect(dto.timeout).toBe(10000);
      });

      it('should configure safe sequential query', () => {
        // Arrange
        dto.parallel = false;
        dto.continueOnError = false;
        dto.timeout = 30000;

        // Assert
        expect(dto.parallel).toBe(false);
        expect(dto.continueOnError).toBe(false);
        expect(dto.timeout).toBe(30000);
      });
    });
  });

  describe('QueryLogContextDto', () => {
    let dto: QueryLogContextDto;

    beforeEach(() => {
      dto = new QueryLogContextDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete log context', () => {
        // Arrange
        dto.queryId = 'query-123';
        dto.queryType = 'bysymbols';
        dto.operation = 'executeQuery';
        dto.executionTime = 150;
        dto.symbols = ['00700.HK', 'AAPL.US'];
        dto.error = null;

        // Assert
        expect(dto.queryId).toBe('query-123');
        expect(dto.queryType).toBe('by_symbols');
        expect(dto.operation).toBe('executeQuery');
        expect(dto.executionTime).toBe(150);
        expect(dto.symbols).toEqual(['00700.HK', 'AAPL.US']);
      });

      it('should create instance with error context', () => {
        // Arrange
        dto.queryId = 'query-error-456';
        dto.queryType = 'by_market';
        dto.operation = 'executeQuery';
        dto.error = 'Provider timeout after 5000ms';

        // Assert
        expect(dto.queryId).toBe('query-error-456');
        expect(dto.error).toBe('Provider timeout after 5000ms');
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.queryId = 'valid-query-id';
        dto.queryType = 'by_provider';
        dto.operation = 'processResults';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Logging Scenarios', () => {
      it('should log successful query execution', () => {
        // Arrange
        dto.queryId = 'success-query-789';
        dto.queryType = 'by_symbols';
        dto.operation = 'executeQuery';
        dto.executionTime = 85;
        dto.symbols = ['00700.HK'];

        // Assert
        expect(dto.queryId).toBeDefined();
        expect(dto.executionTime).toBeLessThan(100);
        expect(dto.error).toBeUndefined();
      });

      it('should log failed query execution', () => {
        // Arrange
        dto.queryId = 'failed-query-101';
        dto.queryType = 'by_symbols';
        dto.operation = 'executeQuery';
        dto.executionTime = 5000;
        dto.symbols = ['INVALID.SYMBOL'];
        dto.error = 'Symbol not found: INVALID.SYMBOL';

        // Assert
        expect(dto.queryId).toBeDefined();
        expect(dto.executionTime).toBeGreaterThan(1000);
        expect(dto.error).toContain('Symbol not found');
      });
    });
  });

  describe('Class Transformer Integration', () => {
    describe('Complex DTO Transformation', () => {
      it('should transform QueryExecutionResultDto from plain object', () => {
        // Arrange
        const plainObject = {
          results: [{ symbol: 'AAPL', price: 150.25 }],
          cacheUsed: 'true',
          dataSources: {
            cache: { hits: '5', misses: '1' },
            realtime: { hits: '0', misses: '1' },
          },
        };

        // Act
        const dto = plainToClass(QueryExecutionResultDto, plainObject);

        // Assert
        expect(dto).toBeInstanceOf(QueryExecutionResultDto);
        expect(dto.results[0].symbol).toBe('AAPL');
        expect(dto.cacheUsed).toBe('true'); // String preserved
      });

      it('should transform nested DTOs correctly', () => {
        // Arrange
        const plainObject = {
          fieldSelection: {
            includeFields: ['symbol', 'price'],
            excludeFields: ['metadata'],
          },
          sort: {
            field: 'price',
            direction: 'DESC',
          },
          limit: '50',
          offset: '0',
        };

        // Act
        const dto = plainToClass(PostProcessingConfigDto, plainObject);

        // Assert
        expect(dto).toBeInstanceOf(PostProcessingConfigDto);
        expect(dto.fieldSelection).toBeDefined();
        expect(dto.sort).toBeDefined();
        expect(dto.limit).toBe('50'); // String preserved until validation
      });
    });
  });

  describe('Real-world Integration Scenarios', () => {
    describe('Stock Query Results', () => {
      it('should handle successful stock query result', () => {
        // Arrange
        const result = new QueryExecutionResultDto<any>();
        result.results = [
          {
            symbol: '00700.HK',
            lastPrice: 425.6,
            change: 5.2,
            changePercent: 0.0124,
            volume: 12500000,
          },
        ];
        result.cacheUsed = true;
        result.dataSources = {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        };

        // Assert
        expect(result.results[0].symbol).toBe('00700.HK');
        expect(result.cacheUsed).toBe(true);
        expect(result.dataSources.cache.hits).toBe(1);
      });

      it('should handle query with errors', () => {
        // Arrange
        const result = new QueryExecutionResultDto<any>();
        result.results = [];
        result.cacheUsed = false;
        result.dataSources = {
          cache: { hits: 0, misses: 1 },
          realtime: { hits: 0, misses: 1 },
        };
        result.errors = [
          {
            symbol: 'INVALID.SYMBOL',
            reason: 'Symbol not found',
            errorCode: 'SYMBOL_NOT_FOUND',
          },
        ];

        // Assert
        expect(result.results).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].symbol).toBe('INVALID.SYMBOL');
      });
    });

    describe('Performance Monitoring', () => {
      it('should track query performance metrics', () => {
        // Arrange
        const metrics = new QueryPerformanceMetricsDto();
        metrics.cacheQueryTime = 5;
        metrics.persistentQueryTime = 0;
        metrics.realtimeQueryTime = 150;
        metrics.dataProcessingTime = 10;
        metrics.totalExecutionTime = 165;
        metrics.isSlowQuery = false;

        // Assert
        expect(metrics.totalExecutionTime).toBe(165);
        expect(metrics.realtimeQueryTime).toBeGreaterThan(metrics.cacheQueryTime);
        expect(metrics.isSlowQuery).toBe(false);
      });

      it('should log query execution context', () => {
        // Arrange
        const context = new QueryLogContextDto();
        context.queryId = 'perf-test-001';
        context.queryType = 'by_symbols';
        context.operation = 'executeParallelQuery';
        context.executionTime = 250;
        context.symbols = ['00700.HK', 'AAPL.US', 'GOOGL.US'];

        // Assert
        expect(context.queryId).toBe('perf-test-001');
        expect(context.symbols).toHaveLength(3);
        expect(context.executionTime).toBe(250);
      });
    });
  });
});