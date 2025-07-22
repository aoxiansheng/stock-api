import { Test, TestingModule } from '@nestjs/testing';
import { QueryResultProcessorService } from '../../../../../../src/core/query/services/query-result-processor.service';
import { QueryExecutionResultDto } from '../../../../../../src/core/query/dto/query-internal.dto';
import { QueryRequestDto, SortDirection } from '../../../../../../src/core/query/dto/query-request.dto';
import { QueryResponseDto, QueryMetadataDto } from '../../../../../../src/core/query/dto/query-response.dto';
import { QueryType } from '../../../../../../src/core/query/enums';
import { QUERY_PERFORMANCE_CONFIG, QUERY_OPERATIONS } from '../../../../../../src/core/query/constants/query.constants';
import { createLogger } from '../../../../../../src/common/config/logger.config';

// Mock the logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe('QueryResultProcessorService', () => {
  let service: QueryResultProcessorService;
  let mockLogger: any;

  const mockExecutionResult: QueryExecutionResultDto = {
    results: [
      { symbol: 'AAPL', price: 150.75, volume: 1000000, market: 'US' },
      { symbol: 'GOOGL', price: 2800.50, volume: 500000, market: 'US' },
      { symbol: 'TSLA', price: 250.25, volume: 2000000, market: 'US' },
    ],
    cacheUsed: false,
    dataSources: {
      cache: { hits: 0, misses: 0 },
      realtime: { hits: 3, misses: 0 }
    },
    errors: [],
  };

  const mockBasicRequest: QueryRequestDto = {
    queryType: QueryType.BY_SYMBOLS,
    symbols: ['AAPL', 'GOOGL', 'TSLA'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryResultProcessorService],
    }).compile();

    service = module.get<QueryResultProcessorService>(QueryResultProcessorService);
    // Directly mock the logger instance on the service
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should process query results with default pagination', () => {
      const result = service.process(
        mockExecutionResult,
        mockBasicRequest,
        'test-query-id',
        1500,
      );

      expect(result).toBeInstanceOf(QueryResponseDto);
      expect(result.data).toHaveLength(3);
      expect(result.metadata).toBeInstanceOf(QueryMetadataDto);
      expect(result.metadata.queryType).toBe(QueryType.BY_SYMBOLS);
      expect(result.metadata.totalResults).toBe(3);
      expect(result.metadata.returnedResults).toBe(3);
      expect(result.metadata.executionTime).toBe(1500);
      expect(result.metadata.cacheUsed).toBe(false);
      expect(result.metadata.dataSources).toEqual({
        cache: { hits: 0, misses: 0 },
        realtime: { hits: 3, misses: 0 }
      });

      expect(result.pagination.limit).toBe(QUERY_PERFORMANCE_CONFIG.DEFAULT_QUERY_LIMIT);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextOffset).toBeUndefined();
    });

    it('should apply custom pagination correctly', () => {
      const requestWithPagination: QueryRequestDto = {
        ...mockBasicRequest,
        limit: 2,
        offset: 1,
      };

      const result = service.process(
        mockExecutionResult,
        requestWithPagination,
        'test-query-id',
        1000,
      );

      expect(result.data).toHaveLength(2);
      expect(result.metadata.totalResults).toBe(3);
      expect(result.metadata.returnedResults).toBe(2);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextOffset).toBeUndefined();
    });

    it('should handle pagination with hasMore flag correctly', () => {
      const requestWithSmallLimit: QueryRequestDto = {
        ...mockBasicRequest,
        limit: 2,
        offset: 0,
      };

      const result = service.process(
        mockExecutionResult,
        requestWithSmallLimit,
        'test-query-id',
        1000,
      );

      expect(result.data).toHaveLength(2);
      expect(result.metadata.totalResults).toBe(3);
      expect(result.metadata.returnedResults).toBe(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextOffset).toBe(2);
    });

    it('should handle empty results gracefully', () => {
      const emptyExecutionResult: QueryExecutionResultDto = {
        results: [],
        cacheUsed: true,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 0 }
        },
        errors: [],
      };

      const result = service.process(
        emptyExecutionResult,
        mockBasicRequest,
        'test-query-id',
        500,
      );

      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalResults).toBe(0);
      expect(result.metadata.returnedResults).toBe(0);
      expect(result.metadata.cacheUsed).toBe(true);
      expect(result.metadata.dataSources).toEqual({
        cache: { hits: 0, misses: 0 },
        realtime: { hits: 0, misses: 0 }
      });
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should log warnings for execution errors', () => {
      const executionWithErrors: QueryExecutionResultDto = {
        results: [{ symbol: 'AAPL', price: 150.75, volume: 1000000 }],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 1, misses: 2 }
        },
        errors: [
          { symbol: 'GOOGL', reason: 'Data not available' },
          { symbol: 'TSLA', reason: 'Service timeout' },
        ],
      };

      const result = service.process(
        executionWithErrors,
        mockBasicRequest,
        'test-query-id',
        2000,
      );

      expect(result.data).toHaveLength(1);
      expect(result.metadata.totalResults).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '部分股票数据获取失败',
        expect.objectContaining({
          queryId: 'test-query-id',
          errors: 'GOOGL: Data not available; TSLA: Service timeout',
          operation: QUERY_OPERATIONS.PROCESS_QUERY_RESULTS,
        })
      );
    });

    it('should apply post-processing when field selection is specified', () => {
      const requestWithFieldSelection: QueryRequestDto = {
        ...mockBasicRequest,
        includeFields: ['symbol', 'price'],
      };

      const result = service.process(
        mockExecutionResult,
        requestWithFieldSelection,
        'test-query-id',
        1000,
      );

      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ symbol: 'AAPL', price: 150.75 });
      expect(result.data[0]).not.toHaveProperty('volume');
      expect(result.data[0]).not.toHaveProperty('market');
    });

    it('should apply post-processing when sorting is specified', () => {
      const requestWithSort: QueryRequestDto = {
        ...mockBasicRequest,
        sort: { field: 'price', direction: SortDirection.DESC },
      };

      const result = service.process(
        mockExecutionResult,
        requestWithSort,
        'test-query-id',
        1000,
      );

      expect(result.data).toHaveLength(3);
      expect((result.data[0] as any).symbol).toBe('GOOGL'); // Highest price
      expect((result.data[1] as any).symbol).toBe('TSLA');
      expect((result.data[2] as any).symbol).toBe('AAPL'); // Lowest price
    });

    it('should apply both field selection and sorting', () => {
      const requestWithBoth: QueryRequestDto = {
        ...mockBasicRequest,
        includeFields: ['symbol', 'volume'],
        sort: { field: 'volume', direction: SortDirection.ASC },
      };

      const result = service.process(
        mockExecutionResult,
        requestWithBoth,
        'test-query-id',
        1000,
      );

      expect(result.data).toHaveLength(3);
      expect((result.data[0] as any)).toEqual({ symbol: 'GOOGL', volume: 500000 }); // Lowest volume
      expect((result.data[1] as any)).toEqual({ symbol: 'AAPL', volume: 1000000 });
      expect((result.data[2] as any)).toEqual({ symbol: 'TSLA', volume: 2000000 }); // Highest volume
    });

    it('should log debug information for successful processing', () => {
      service.process(
        mockExecutionResult,
        mockBasicRequest,
        'debug-query-id',
        800,
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '查询结果处理完成',
        expect.objectContaining({
          queryId: 'debug-query-id',
          totalResults: 3,
          paginatedCount: 3,
          hasErrors: false,
          operation: QUERY_OPERATIONS.PROCESS_QUERY_RESULTS,
        })
      );
    });
  });

  describe('applyPostProcessing', () => {
    const sampleResults = [
      { name: 'Alice', age: 30, city: 'New York' },
      { name: 'Bob', age: 25, city: 'Los Angeles' },
      { name: 'Charlie', age: 35, city: 'Chicago' },
    ];

    it('should return original results when no processing specified', () => {
      const result = service.applyPostProcessing(sampleResults, mockBasicRequest);

      expect(result).toEqual(sampleResults);
      expect(result).not.toBe(sampleResults); // Should be a copy
    });

    it('should apply field inclusion', () => {
      const requestWithIncludes: QueryRequestDto = {
        ...mockBasicRequest,
        includeFields: ['name', 'age'],
      };

      const result = service.applyPostProcessing(sampleResults, requestWithIncludes);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Alice', age: 30 });
      expect(result[0]).not.toHaveProperty('city');
    });

    it('should apply field exclusion', () => {
      const requestWithExcludes: QueryRequestDto = {
        ...mockBasicRequest,
        excludeFields: ['city'],
      };

      const result = service.applyPostProcessing(sampleResults, requestWithExcludes);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Alice', age: 30 });
      expect(result[0]).not.toHaveProperty('city');
    });

    it('should apply sorting', () => {
      const requestWithSort: QueryRequestDto = {
        ...mockBasicRequest,
        sort: { field: 'age', direction: SortDirection.DESC },
      };

      const result = service.applyPostProcessing(sampleResults, requestWithSort);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Charlie'); // Age 35
      expect(result[1].name).toBe('Alice');   // Age 30
      expect(result[2].name).toBe('Bob');     // Age 25
    });

    it('should apply both field selection and sorting', () => {
      const requestWithBoth: QueryRequestDto = {
        ...mockBasicRequest,
        includeFields: ['name', 'age'],
        sort: { field: 'age', direction: SortDirection.ASC },
      };

      const result = service.applyPostProcessing(sampleResults, requestWithBoth);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Bob', age: 25 });
      expect(result[1]).toEqual({ name: 'Alice', age: 30 });
      expect(result[2]).toEqual({ name: 'Charlie', age: 35 });
    });

    it('should handle empty results', () => {
      const result = service.applyPostProcessing([], mockBasicRequest);

      expect(result).toEqual([]);
    });
  });

  describe('applyFieldSelection', () => {
    const sampleItem = {
      symbol: 'AAPL',
      price: 150.75,
      volume: 1000000,
      market: 'US',
      timestamp: '2023-01-01T00:00:00Z',
    };

    it('should return original item when no field selection specified', () => {
      const result = service.applyFieldSelection(sampleItem);

      expect(result).toEqual(sampleItem);
    });

    it('should include only specified fields', () => {
      const result = service.applyFieldSelection(
        sampleItem,
        ['symbol', 'price', 'volume']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.75,
        volume: 1000000,
      });
      expect(result).not.toHaveProperty('market');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('should exclude specified fields', () => {
      const result = service.applyFieldSelection(
        sampleItem,
        undefined,
        ['market', 'timestamp']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.75,
        volume: 1000000,
      });
      expect(result).not.toHaveProperty('market');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('should handle non-existent include fields gracefully', () => {
      const result = service.applyFieldSelection(
        sampleItem,
        ['symbol', 'nonExistentField', 'price']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.75,
      });
      expect(result).not.toHaveProperty('nonExistentField');
    });

    it('should handle non-existent exclude fields gracefully', () => {
      const result = service.applyFieldSelection(
        sampleItem,
        undefined,
        ['nonExistentField']
      );

      expect(result).toEqual(sampleItem);
    });

    it('should prioritize include fields over exclude fields', () => {
      const result = service.applyFieldSelection(
        sampleItem,
        ['symbol', 'price'],
        ['price', 'volume'] // exclude is ignored when include is present
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.75,
      });
    });

    it('should handle empty include fields', () => {
      const result = service.applyFieldSelection(sampleItem, []);

      expect(result).toEqual({});
    });

    it('should handle null and undefined values', () => {
      const itemWithNulls = {
        symbol: 'AAPL',
        price: null,
        volume: undefined,
        market: 'US',
      };

      const result = service.applyFieldSelection(
        itemWithNulls,
        ['symbol', 'price', 'volume', 'market']
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        price: null,
        volume: undefined,
        market: 'US',
      });
    });
  });

  describe('applySorting', () => {
    const sampleResults = [
      { name: 'Alice', age: 30, score: 85.5 },
      { name: 'Bob', age: 25, score: 92.0 },
      { name: 'Charlie', age: 35, score: 78.0 },
      { name: 'David', age: 25, score: 88.5 },
    ];

    it('should sort by string field in ascending order', () => {
      const result = service.applySorting(sampleResults, {
        field: 'name',
        direction: SortDirection.ASC,
      });

      expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });

    it('should sort by string field in descending order', () => {
      const result = service.applySorting(sampleResults, {
        field: 'name',
        direction: SortDirection.DESC,
      });

      expect(result.map(r => r.name)).toEqual(['David', 'Charlie', 'Bob', 'Alice']);
    });

    it('should sort by number field in ascending order', () => {
      const result = service.applySorting(sampleResults, {
        field: 'age',
        direction: SortDirection.ASC,
      });

      expect(result.map(r => r.age)).toEqual([25, 25, 30, 35]);
    });

    it('should sort by number field in descending order', () => {
      const result = service.applySorting(sampleResults, {
        field: 'score',
        direction: SortDirection.DESC,
      });

      expect(result.map(r => r.score)).toEqual([92.0, 88.5, 85.5, 78.0]);
    });

    it('should handle null and undefined values correctly', () => {
      const resultsWithNulls = [
        { name: 'Alice', value: 10 },
        { name: 'Bob', value: null },
        { name: 'Charlie', value: 5 },
        { name: 'David', value: undefined },
        { name: 'Eve', value: 15 },
      ];

      const result = service.applySorting(resultsWithNulls, {
        field: 'value',
        direction: SortDirection.ASC,
      });

      // null and undefined should be sorted to the end
      expect(result.map(r => r.name)).toEqual(['Charlie', 'Alice', 'Eve', 'Bob', 'David']);
    });

    it('should handle sorting by non-existent field', () => {
      const result = service.applySorting(sampleResults, {
        field: 'nonExistentField',
        direction: SortDirection.ASC,
      });

      // All values are undefined, so order should remain stable
      expect(result).toHaveLength(4);
      expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });

    it('should handle empty results', () => {
      const result = service.applySorting([], {
        field: 'name',
        direction: SortDirection.ASC,
      });

      expect(result).toEqual([]);
    });

    it('should maintain stable sort for equal values', () => {
      const result = service.applySorting(sampleResults, {
        field: 'age',
        direction: SortDirection.ASC,
      });

      // Bob and David both have age 25, their relative order should be maintained
      const age25Items = result.filter(r => r.age === 25);
      expect(age25Items.map(r => r.name)).toEqual(['Bob', 'David']);
    });

    it('should handle boolean values', () => {
      const booleanResults = [
        { name: 'A', active: true },
        { name: 'B', active: false },
        { name: 'C', active: true },
        { name: 'D', active: false },
      ];

      const result = service.applySorting(booleanResults, {
        field: 'active',
        direction: SortDirection.DESC,
      });

      expect(result.slice(0, 2).every(r => r.active === true)).toBe(true);
      expect(result.slice(2, 4).every(r => r.active === false)).toBe(true);
    });

    it('should handle date strings', () => {
      const dateResults = [
        { name: 'A', date: '2023-03-01T00:00:00Z' },
        { name: 'B', date: '2023-01-01T00:00:00Z' },
        { name: 'C', date: '2023-02-01T00:00:00Z' },
      ];

      const result = service.applySorting(dateResults, {
        field: 'date',
        direction: SortDirection.ASC,
      });

      expect(result.map(r => r.name)).toEqual(['B', 'C', 'A']); // Chronological order
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large result sets', () => {
      const largeResults = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: Math.random(),
        category: `cat-${i % 100}`,
      }));

      const executionResult: QueryExecutionResultDto = {
        results: largeResults,
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 10000, misses: 0 }
        },
        errors: [],
      };

      const request: QueryRequestDto = {
        ...mockBasicRequest,
        limit: 50,
        offset: 100,
        sort: { field: 'value', direction: SortDirection.DESC },
      };

      const result = service.process(executionResult, request, 'large-query', 5000);

      expect(result.data).toHaveLength(50);
      expect(result.metadata.totalResults).toBe(10000);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should handle offset beyond result set size', () => {
      const request: QueryRequestDto = {
        ...mockBasicRequest,
        limit: 10,
        offset: 100, // Beyond the 3 available results
      };

      const result = service.process(
        mockExecutionResult,
        request,
        'offset-beyond-results',
        1000,
      );

      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalResults).toBe(3);
      expect(result.metadata.returnedResults).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle concurrent processing correctly', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(service.process(
          mockExecutionResult,
          { ...mockBasicRequest, limit: i + 1 },
          `concurrent-query-${i}`,
          1000 + i * 100,
        ))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.data).toHaveLength(Math.min(i + 1, 3));
        expect(result.metadata.executionTime).toBe(1000 + i * 100);
      });
    });

    it('should preserve original data immutability', () => {
      const originalResults = [...mockExecutionResult.results];
      const originalRequest = { ...mockBasicRequest };

      service.process(
        mockExecutionResult,
        mockBasicRequest,
        'immutability-test',
        1000,
      );

      expect(mockExecutionResult.results).toEqual(originalResults);
      expect(mockBasicRequest).toEqual(originalRequest);
    });

    it('should handle complex nested objects in field selection', () => {
      const nestedResults = [
        {
          symbol: 'AAPL',
          quote: { price: 150.75, currency: 'USD' },
          metrics: { volume: 1000000, avgVolume: 800000 },
        },
      ];

      const nestedExecutionResult: QueryExecutionResultDto = {
        results: nestedResults,
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 1, misses: 0 }
        },
        errors: [],
      };

      const request: QueryRequestDto = {
        ...mockBasicRequest,
        includeFields: ['symbol', 'quote'],
      };

      const result = service.process(
        nestedExecutionResult,
        request,
        'nested-test',
        1000,
      );

      expect(result.data[0]).toEqual({
        symbol: 'AAPL',
        quote: { price: 150.75, currency: 'USD' },
      });
      expect(result.data[0]).not.toHaveProperty('metrics');
    });
  });

  describe('Performance and Memory', () => {
    it('should efficiently process large datasets', () => {
      const start = performance.now();
      
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
        value: Math.random(),
      }));

      const executionResult: QueryExecutionResultDto = {
        results: largeResults,
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 1000, misses: 0 }
        },
        errors: [],
      };

      const request: QueryRequestDto = {
        ...mockBasicRequest,
        sort: { field: 'value', direction: SortDirection.DESC },
        includeFields: ['id', 'value'],
        limit: 100,
      };

      service.process(executionResult, request, 'performance-test', 2000);

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms for 1000 items
    });

    it('should handle memory efficiently with field selection', () => {
      const largeObjectResults = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        largeField: 'x'.repeat(10000), // 10KB string
        smallField: `item-${i}`,
        anotherLargeField: Array.from({ length: 1000 }, (_, j) => j),
      }));

      const executionResult: QueryExecutionResultDto = {
        results: largeObjectResults,
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 100, misses: 0 }
        },
        errors: [],
      };

      const request: QueryRequestDto = {
        ...mockBasicRequest,
        includeFields: ['id', 'smallField'], // Exclude large fields
        limit: 50,
      };

      const result = service.process(executionResult, request, 'memory-test', 1500);

      expect(result.data).toHaveLength(50);
      expect(result.data[0]).not.toHaveProperty('largeField');
      expect(result.data[0]).not.toHaveProperty('anotherLargeField');
    });
  });
});