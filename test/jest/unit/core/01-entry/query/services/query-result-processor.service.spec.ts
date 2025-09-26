import { Test, TestingModule } from '@nestjs/testing';
import { QueryResultProcessorService } from '@core/01-entry/query/services/query-result-processor.service';
import { QueryRequestDto, SortDirection } from '@core/01-entry/query/dto/query-request.dto';
import { QueryExecutionResultDto } from '@core/01-entry/query/dto/query-internal.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { QueryMetadataDto } from '@core/01-entry/query/dto/query-response.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QUERY_OPERATIONS } from '@core/01-entry/query/constants/query.constants';

describe('QueryResultProcessorService', () => {
  let service: QueryResultProcessorService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryResultProcessorService],
    }).compile();

    service = module.get<QueryResultProcessorService>(QueryResultProcessorService);

    // Mock logger
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    const mockRequest: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['AAPL', 'GOOGL'],
      queryTypeFilter: 'get-stock-quote',
      page: 1,
      limit: 10,
    };

    const mockExecutionResult: QueryExecutionResultDto = {
      results: [
        { symbol: 'AAPL', price: 150, volume: 1000 },
        { symbol: 'GOOGL', price: 2800, volume: 500 },
      ],
      cacheUsed: true,
      dataSources: {
        cache: { hits: 1, misses: 1 },
        realtime: { hits: 1, misses: 0 },
      },
      errors: [],
    };

    it('should process query results successfully', () => {
      const queryId = 'test-query-id';
      const executionTime = 150;

      const result = service.process(
        mockExecutionResult,
        mockRequest,
        queryId,
        executionTime
      );

      expect(result.data).toBeInstanceOf(PaginatedDataDto);
      expect(result.data.items).toEqual(mockExecutionResult.results);
      expect(result.metadata).toBeInstanceOf(QueryMetadataDto);
      expect(result.metadata.queryType).toBe(mockRequest.queryType);
      expect(result.metadata.totalResults).toBe(2);
      expect(result.metadata.returnedResults).toBe(2);
      expect(result.metadata.executionTime).toBe(executionTime);
      expect(result.metadata.cacheUsed).toBe(true);
      expect(result.metadata.dataSources).toEqual(mockExecutionResult.dataSources);
    });

    it('should handle results with pagination metadata', () => {
      const executionResultWithPagination = {
        ...mockExecutionResult,
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      };

      const result = service.process(
        executionResultWithPagination,
        mockRequest,
        'test-query-id',
        150
      );

      expect(result.metadata.totalResults).toBe(20); // From pagination total
      expect(result.metadata.pagination).toEqual(executionResultWithPagination.pagination);
      expect(result.data).toBeInstanceOf(PaginatedDataDto);
      expect(result.data.pagination).toEqual(executionResultWithPagination.pagination);
    });

    it('should handle results without pagination metadata', () => {
      const result = service.process(
        mockExecutionResult,
        mockRequest,
        'test-query-id',
        150
      );

      expect(result.metadata.totalResults).toBe(2); // Falls back to results length
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should process results with errors and log warnings', () => {
      const executionResultWithErrors = {
        ...mockExecutionResult,
        errors: [
          { symbol: 'MSFT', reason: 'Symbol not found' },
          { symbol: 'AMZN', reason: 'Rate limit exceeded' },
        ],
      };

      const queryId = 'test-query-id';

      const result = service.process(
        executionResultWithErrors,
        mockRequest,
        queryId,
        150
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '部分股票数据获取失败',
        expect.objectContaining({
          queryId,
          errors: 'MSFT: Symbol not found; AMZN: Rate limit exceeded',
          operation: QUERY_OPERATIONS.PROCESS_QUERY_RESULTS,
        })
      );

      expect(result.metadata.errors).toEqual(executionResultWithErrors.errors);
    });

    it('should log debug information about processing completion', () => {
      const queryId = 'test-query-id';

      service.process(mockExecutionResult, mockRequest, queryId, 150);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '查询结果处理完成',
        expect.objectContaining({
          queryId,
          totalResults: 2,
          paginatedCount: 2,
          hasErrors: false,
          operation: QUERY_OPERATIONS.PROCESS_QUERY_RESULTS,
        })
      );
    });

    it('should handle empty results', () => {
      const emptyExecutionResult = {
        ...mockExecutionResult,
        results: [],
      };

      const result = service.process(
        emptyExecutionResult,
        mockRequest,
        'test-query-id',
        150
      );

      expect(result.data.items).toEqual([]);
      expect(result.metadata.totalResults).toBe(0);
      expect(result.metadata.returnedResults).toBe(0);
    });

    it('should apply post-processing to results', () => {
      const requestWithProcessing: QueryRequestDto = {
        ...mockRequest,
        options: {
          includeFields: ['symbol', 'price'],
        },
        querySort: {
          field: 'price',
          direction: SortDirection.DESC,
        },
      };

      jest.spyOn(service, 'applyPostProcessing').mockReturnValue([
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'AAPL', price: 150 },
      ]);

      const result = service.process(
        mockExecutionResult,
        requestWithProcessing,
        'test-query-id',
        150
      );

      expect(service.applyPostProcessing).toHaveBeenCalledWith(
        mockExecutionResult.results,
        requestWithProcessing
      );
      expect(result.data.items).toEqual([
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'AAPL', price: 150 },
      ]);
    });
  });

  describe('applyPostProcessing', () => {
    const mockResults = [
      { symbol: 'AAPL', price: 150, volume: 1000, marketCap: 2500000 },
      { symbol: 'GOOGL', price: 2800, volume: 500, marketCap: 1800000 },
      { symbol: 'MSFT', price: 300, volume: 800, marketCap: 2200000 },
    ];

    it('should apply field selection when includeFields is specified', () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        options: {
          includeFields: ['symbol', 'price'],
        },
      };

      const result = service.applyPostProcessing(mockResults, request);

      expect(result).toEqual([
        { symbol: 'AAPL', price: 150 },
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'MSFT', price: 300 },
      ]);
    });

    it('should apply field selection when excludeFields is specified', () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        options: {
          excludeFields: ['volume', 'marketCap'],
        },
      };

      const result = service.applyPostProcessing(mockResults, request);

      expect(result).toEqual([
        { symbol: 'AAPL', price: 150 },
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'MSFT', price: 300 },
      ]);
    });

    it('should apply sorting when querySort is specified', () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        querySort: {
          field: 'price',
          direction: SortDirection.DESC,
        },
      };

      const result = service.applyPostProcessing(mockResults, request);

      expect(result).toEqual([
        { symbol: 'GOOGL', price: 2800, volume: 500, marketCap: 1800000 },
        { symbol: 'MSFT', price: 300, volume: 800, marketCap: 2200000 },
        { symbol: 'AAPL', price: 150, volume: 1000, marketCap: 2500000 },
      ]);
    });

    it('should apply both field selection and sorting', () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        options: {
          includeFields: ['symbol', 'price'],
        },
        querySort: {
          field: 'price',
          direction: SortDirection.ASC,
        },
      };

      const result = service.applyPostProcessing(mockResults, request);

      expect(result).toEqual([
        { symbol: 'AAPL', price: 150 },
        { symbol: 'MSFT', price: 300 },
        { symbol: 'GOOGL', price: 2800 },
      ]);
    });

    it('should return original results when no processing is needed', () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
      };

      const result = service.applyPostProcessing(mockResults, request);

      expect(result).toEqual(mockResults);
      expect(result).not.toBe(mockResults); // Should be a copy
    });
  });

  describe('applyFieldSelection', () => {
    const mockItem = {
      symbol: 'AAPL',
      price: 150,
      volume: 1000,
      marketCap: 2500000,
      change: 5.2,
    };

    it('should include only specified fields when includeFields is provided', () => {
      const result = service.applyFieldSelection(
        mockItem,
        ['symbol', 'price', 'change']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150,
        change: 5.2,
      });
    });

    it('should exclude specified fields when excludeFields is provided', () => {
      const result = service.applyFieldSelection(
        mockItem,
        undefined,
        ['volume', 'marketCap']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150,
        change: 5.2,
      });
    });

    it('should return original item when neither includeFields nor excludeFields is provided', () => {
      const result = service.applyFieldSelection(mockItem);

      expect(result).toEqual(mockItem);
    });

    it('should handle includeFields with non-existent fields', () => {
      const result = service.applyFieldSelection(
        mockItem,
        ['symbol', 'nonExistentField', 'price']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150,
      });
    });

    it('should handle excludeFields with non-existent fields', () => {
      const result = service.applyFieldSelection(
        mockItem,
        undefined,
        ['nonExistentField', 'volume']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150,
        marketCap: 2500000,
        change: 5.2,
      });
    });

    it('should handle empty includeFields array', () => {
      const result = service.applyFieldSelection(mockItem, []);

      expect(result).toEqual({});
    });

    it('should handle empty excludeFields array', () => {
      const result = service.applyFieldSelection(mockItem, undefined, []);

      expect(result).toEqual(mockItem);
    });

    it('should handle null and undefined values in item', () => {
      const itemWithNullValues = {
        symbol: 'AAPL',
        price: null,
        volume: undefined,
        change: 5.2,
      };

      const result = service.applyFieldSelection(
        itemWithNullValues,
        ['symbol', 'price', 'volume', 'change']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: null,
        volume: undefined,
        change: 5.2,
      });
    });
  });

  describe('applySorting', () => {
    const mockResults = [
      { symbol: 'AAPL', price: 150, name: 'Apple' },
      { symbol: 'GOOGL', price: 2800, name: 'Google' },
      { symbol: 'MSFT', price: 300, name: 'Microsoft' },
      { symbol: 'AMZN', price: 3200, name: 'Amazon' },
    ];

    it('should sort by numeric field in ascending order', () => {
      const result = service.applySorting(mockResults, {
        field: 'price',
        direction: SortDirection.ASC,
      });

      expect(result.map(r => r.symbol)).toEqual(['AAPL', 'MSFT', 'GOOGL', 'AMZN']);
      expect(result).not.toBe(mockResults); // Should be a copy
    });

    it('should sort by numeric field in descending order', () => {
      const result = service.applySorting(mockResults, {
        field: 'price',
        direction: SortDirection.DESC,
      });

      expect(result.map(r => r.symbol)).toEqual(['AMZN', 'GOOGL', 'MSFT', 'AAPL']);
    });

    it('should sort by string field in ascending order', () => {
      const result = service.applySorting(mockResults, {
        field: 'name',
        direction: SortDirection.ASC,
      });

      expect(result.map(r => r.name)).toEqual(['Amazon', 'Apple', 'Google', 'Microsoft']);
    });

    it('should sort by string field in descending order', () => {
      const result = service.applySorting(mockResults, {
        field: 'name',
        direction: SortDirection.DESC,
      });

      expect(result.map(r => r.name)).toEqual(['Microsoft', 'Google', 'Apple', 'Amazon']);
    });

    it('should handle null and undefined values in ascending sort', () => {
      const resultsWithNulls = [
        { symbol: 'AAPL', price: 150 },
        { symbol: 'NULL1', price: null },
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'UNDEF', price: undefined },
        { symbol: 'MSFT', price: 300 },
      ];

      const result = service.applySorting(resultsWithNulls, {
        field: 'price',
        direction: SortDirection.ASC,
      });

      // Null and undefined values should be at the end
      expect(result.map(r => r.symbol)).toEqual(['AAPL', 'MSFT', 'GOOGL', 'NULL1', 'UNDEF']);
    });

    it('should handle null and undefined values in descending sort', () => {
      const resultsWithNulls = [
        { symbol: 'AAPL', price: 150 },
        { symbol: 'NULL1', price: null },
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'UNDEF', price: undefined },
        { symbol: 'MSFT', price: 300 },
      ];

      const result = service.applySorting(resultsWithNulls, {
        field: 'price',
        direction: SortDirection.DESC,
      });

      // Null and undefined values should be at the end
      expect(result.map(r => r.symbol)).toEqual(['GOOGL', 'MSFT', 'AAPL', 'NULL1', 'UNDEF']);
    });

    it('should handle empty results array', () => {
      const result = service.applySorting([], {
        field: 'price',
        direction: SortDirection.ASC,
      });

      expect(result).toEqual([]);
    });

    it('should handle single item array', () => {
      const singleItem = [{ symbol: 'AAPL', price: 150 }];

      const result = service.applySorting(singleItem, {
        field: 'price',
        direction: SortDirection.DESC,
      });

      expect(result).toEqual(singleItem);
      expect(result).not.toBe(singleItem); // Should be a copy
    });

    it('should handle sorting by non-existent field', () => {
      const result = service.applySorting(mockResults, {
        field: 'nonExistentField',
        direction: SortDirection.ASC,
      });

      // All values are undefined, so order should remain the same
      expect(result.map(r => r.symbol)).toEqual(['AAPL', 'GOOGL', 'MSFT', 'AMZN']);
    });

    it('should handle equal values', () => {
      const resultsWithEqualValues = [
        { symbol: 'AAPL', price: 150 },
        { symbol: 'MSFT', price: 150 },
        { symbol: 'GOOGL', price: 2800 },
        { symbol: 'TSLA', price: 150 },
      ];

      const result = service.applySorting(resultsWithEqualValues, {
        field: 'price',
        direction: SortDirection.ASC,
      });

      // Equal values should maintain their relative order, with lower values first
      const prices = result.map(r => r.price);
      expect(prices).toEqual([150, 150, 150, 2800]);
    });

    it('should handle mixed data types', () => {
      const mixedResults = [
        { symbol: 'AAPL', value: 150 },
        { symbol: 'GOOGL', value: '2800' },
        { symbol: 'MSFT', value: 300 },
        { symbol: 'TSLA', value: '100' },
      ];

      const result = service.applySorting(mixedResults, {
        field: 'value',
        direction: SortDirection.ASC,
      });

      // Should sort based on JavaScript's natural comparison
      expect(result.map(r => r.symbol)).toEqual(['TSLA', 'AAPL', 'MSFT', 'GOOGL']);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null execution result', () => {
      const nullExecutionResult = null as any;

      expect(() => {
        service.process(
          nullExecutionResult,
          { queryType: QueryType.BY_SYMBOLS } as any,
          'test-id',
          100
        );
      }).toThrow();
    });

    it('should handle null request', () => {
      const mockExecutionResult: QueryExecutionResultDto = {
        results: [{ symbol: 'AAPL', price: 150 }],
        cacheUsed: false,
        dataSources: { cache: { hits: 0, misses: 0 }, realtime: { hits: 1, misses: 0 } },
        errors: [],
      };

      expect(() => {
        service.process(mockExecutionResult, null as any, 'test-id', 100);
      }).toThrow();
    });

    it('should handle malformed data in results', () => {
      const malformedResults = [
        { symbol: 'AAPL', price: 150 },
        null,
        undefined,
        { symbol: 'GOOGL', price: 2800 },
        {},
      ];

      const result = service.applyPostProcessing(malformedResults as any, {
        queryType: QueryType.BY_SYMBOLS,
        options: { includeFields: ['symbol', 'price'] },
      } as any);

      expect(result).toEqual([
        { symbol: 'AAPL', price: 150 },
        {},
        {},
        { symbol: 'GOOGL', price: 2800 },
        {},
      ]);
    });
  });
});