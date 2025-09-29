import { QueryMetadataDto, QueryResponseDto, BulkQueryResponseDto, QueryStatsDto } from '@core/01-entry/query/dto/query-response.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QueryErrorInfoDto } from '@core/01-entry/query/dto/query-internal.dto';

describe('Query Response DTOs', () => {
  describe('QueryMetadataDto', () => {
    const mockDataSources = {
      cache: { hits: 5, misses: 2 },
      realtime: { hits: 3, misses: 1 }
    };

    const mockErrors: QueryErrorInfoDto[] = [
      { symbol: 'INVALID', reason: 'Symbol not found' }
    ];

    describe('constructor', () => {
      it('should create metadata with all required properties', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          10,
          8,
          150,
          true,
          mockDataSources,
          mockErrors
        );

        expect(metadata.queryType).toBe(QueryType.BY_SYMBOLS);
        expect(metadata.totalResults).toBe(10);
        expect(metadata.returnedResults).toBe(8);
        expect(metadata.executionTime).toBe(150);
        expect(metadata.cacheUsed).toBe(true);
        expect(metadata.dataSources).toEqual(mockDataSources);
        expect(metadata.errors).toEqual(mockErrors);
        expect(metadata.timestamp).toBeDefined();
        expect(typeof metadata.timestamp).toBe('string');
      });

      it('should generate ISO timestamp automatically', () => {
        const beforeCreate = new Date().toISOString();
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          5,
          5,
          100,
          false,
          mockDataSources
        );
        const afterCreate = new Date().toISOString();

        expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(metadata.timestamp >= beforeCreate).toBe(true);
        expect(metadata.timestamp <= afterCreate).toBe(true);
      });

      it('should handle undefined errors parameter', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_MARKET,
          20,
          15,
          200,
          true,
          mockDataSources
        );

        expect(metadata.errors).toBeUndefined();
      });

      it('should handle empty errors array', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_PROVIDER,
          5,
          5,
          75,
          false,
          mockDataSources,
          []
        );

        expect(metadata.errors).toEqual([]);
      });

      it('should handle zero values correctly', () => {
        const zeroDataSources = {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 0 }
        };

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          0,
          false,
          zeroDataSources
        );

        expect(metadata.totalResults).toBe(0);
        expect(metadata.returnedResults).toBe(0);
        expect(metadata.executionTime).toBe(0);
        expect(metadata.cacheUsed).toBe(false);
        expect(metadata.dataSources).toEqual(zeroDataSources);
      });
    });

    describe('optional properties', () => {
      it('should allow performance property to be set', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          5,
          5,
          100,
          true,
          mockDataSources
        );

        metadata.performance = {
          cacheQueryTime: 10,
          persistentQueryTime: 50,
          realtimeQueryTime: 30,
          dataProcessingTime: 10
        };

        expect(metadata.performance).toBeDefined();
        expect(metadata.performance.cacheQueryTime).toBe(10);
        expect(metadata.performance.persistentQueryTime).toBe(50);
        expect(metadata.performance.realtimeQueryTime).toBe(30);
        expect(metadata.performance.dataProcessingTime).toBe(10);
      });

      it('should allow pagination property to be set', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          100,
          10,
          200,
          true,
          mockDataSources
        );

        metadata.pagination = {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10
        };

        expect(metadata.pagination).toBeDefined();
        expect(metadata.pagination.page).toBe(1);
        expect(metadata.pagination.limit).toBe(10);
      });
    });
  });

  describe('QueryResponseDto', () => {
    const mockPaginatedData = new PaginatedDataDto(
      [
        { symbol: 'AAPL', price: 150.25, volume: 1000000 },
        { symbol: 'GOOGL', price: 2750.80, volume: 500000 }
      ],
      {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    );

    const mockMetadata = new QueryMetadataDto(
      QueryType.BY_SYMBOLS,
      2,
      2,
      150,
      true,
      {
        cache: { hits: 2, misses: 0 },
        realtime: { hits: 0, misses: 0 }
      }
    );

    describe('constructor', () => {
      it('should create response with data and metadata', () => {
        const response = new QueryResponseDto(mockPaginatedData, mockMetadata);

        expect(response.data).toBe(mockPaginatedData);
        expect(response.metadata).toBe(mockMetadata);
      });

      it('should support generic typing', () => {
        interface StockData {
          symbol: string;
          price: number;
          volume: number;
        }

        const typedData = new PaginatedDataDto<StockData>(
          [{ symbol: 'AAPL', price: 150.25, volume: 1000000 }],
          {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        );

        const response = new QueryResponseDto<StockData>(typedData, mockMetadata);

        expect(response.data).toBe(typedData);
        expect(response.metadata).toBe(mockMetadata);
      });

      it('should handle empty data', () => {
        const emptyData = new PaginatedDataDto(
          [],
          {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        );

        const emptyMetadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          50,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 }
          }
        );

        const response = new QueryResponseDto(emptyData, emptyMetadata);

        expect(response.data.items).toEqual([]);
        expect(response.metadata.totalResults).toBe(0);
      });
    });
  });

  describe('BulkQueryResponseDto', () => {
    const createMockQueryResponse = (executionTime: number, resultCount: number) => {
      const data = new PaginatedDataDto(
        Array.from({ length: resultCount }, (_, i) => ({ symbol: `SYM${i}`, price: 100 + i })),
        {
          page: 1,
          limit: 10,
          total: resultCount,
          totalPages: Math.ceil(resultCount / 10),
          hasNext: false,
          hasPrev: false
        }
      );

      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        resultCount,
        resultCount,
        executionTime,
        true,
        {
          cache: { hits: resultCount, misses: 0 },
          realtime: { hits: 0, misses: 0 }
        }
      );

      return new QueryResponseDto(data, metadata);
    };

    describe('constructor', () => {
      it('should create bulk response with results and calculated summary', () => {
        const results = [
          createMockQueryResponse(100, 2),
          createMockQueryResponse(150, 3),
          createMockQueryResponse(200, 1)
        ];

        const bulkResponse = new BulkQueryResponseDto(results, 3);

        expect(bulkResponse.results).toBe(results);
        expect(bulkResponse.summary.totalQueries).toBe(3);
        expect(bulkResponse.summary.totalExecutionTime).toBe(450); // 100 + 150 + 200
        expect(bulkResponse.summary.averageExecutionTime).toBe(150); // 450 / 3
        expect(bulkResponse.timestamp).toBeDefined();
        expect(typeof bulkResponse.timestamp).toBe('string');
      });

      it('should handle empty results array', () => {
        const bulkResponse = new BulkQueryResponseDto([], 0);

        expect(bulkResponse.results).toEqual([]);
        expect(bulkResponse.summary.totalQueries).toBe(0);
        expect(bulkResponse.summary.totalExecutionTime).toBe(0);
        expect(bulkResponse.summary.averageExecutionTime).toBe(0);
      });

      it('should handle case where some queries failed (totalQueriesAttempted > results.length)', () => {
        const results = [
          createMockQueryResponse(120, 1),
          createMockQueryResponse(180, 2)
        ];

        const bulkResponse = new BulkQueryResponseDto(results, 5); // 5 attempted, 2 succeeded

        expect(bulkResponse.results.length).toBe(2);
        expect(bulkResponse.summary.totalQueries).toBe(5);
        expect(bulkResponse.summary.totalExecutionTime).toBe(300); // 120 + 180
        expect(bulkResponse.summary.averageExecutionTime).toBe(150); // 300 / 2 (only successful)
      });

      it('should calculate average execution time correctly for single result', () => {
        const results = [createMockQueryResponse(250, 5)];
        const bulkResponse = new BulkQueryResponseDto(results, 1);

        expect(bulkResponse.summary.averageExecutionTime).toBe(250);
      });

      it('should handle zero execution times', () => {
        const results = [
          createMockQueryResponse(0, 1),
          createMockQueryResponse(0, 1)
        ];

        const bulkResponse = new BulkQueryResponseDto(results, 2);

        expect(bulkResponse.summary.totalExecutionTime).toBe(0);
        expect(bulkResponse.summary.averageExecutionTime).toBe(0);
      });

      it('should generate ISO timestamp automatically', () => {
        const beforeCreate = new Date().toISOString();
        const bulkResponse = new BulkQueryResponseDto([], 0);
        const afterCreate = new Date().toISOString();

        expect(bulkResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(bulkResponse.timestamp >= beforeCreate).toBe(true);
        expect(bulkResponse.timestamp <= afterCreate).toBe(true);
      });
    });

    describe('summary calculations', () => {
      it('should correctly calculate totals for large number of results', () => {
        const results = Array.from({ length: 10 }, (_, i) =>
          createMockQueryResponse((i + 1) * 10, i + 1)
        );

        const bulkResponse = new BulkQueryResponseDto(results, 10);

        // Total execution time: 10 + 20 + 30 + ... + 100 = 550
        expect(bulkResponse.summary.totalExecutionTime).toBe(550);
        expect(bulkResponse.summary.averageExecutionTime).toBe(55);
        expect(bulkResponse.summary.totalQueries).toBe(10);
      });

      it('should handle floating point execution times', () => {
        const results = [
          createMockQueryResponse(99.5, 1),
          createMockQueryResponse(100.7, 1),
          createMockQueryResponse(101.3, 1)
        ];

        const bulkResponse = new BulkQueryResponseDto(results, 3);

        expect(bulkResponse.summary.totalExecutionTime).toBeCloseTo(301.5, 1);
        expect(bulkResponse.summary.averageExecutionTime).toBeCloseTo(100.5, 1);
      });
    });
  });

  describe('QueryStatsDto', () => {
    describe('constructor', () => {
      it('should create stats with timestamp', () => {
        const beforeCreate = new Date().toISOString();
        const stats = new QueryStatsDto();
        const afterCreate = new Date().toISOString();

        expect(stats.timestamp).toBeDefined();
        expect(typeof stats.timestamp).toBe('string');
        expect(stats.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(stats.timestamp >= beforeCreate).toBe(true);
        expect(stats.timestamp <= afterCreate).toBe(true);
      });

      it('should initialize with undefined properties that can be set later', () => {
        const stats = new QueryStatsDto();

        // Properties should be settable
        stats.performance = {
          totalQueries: 1000,
          averageExecutionTime: 150,
          cacheHitRate: 0.85,
          errorRate: 0.02,
          queriesPerSecond: 10.5
        };

        stats.queryTypes = {
          'by_symbols': { count: 750, averageTime: 120, successRate: 0.98 },
          'by_market': { count: 250, averageTime: 200, successRate: 0.95 }
        };

        stats.dataSources = {
          cache: { queries: 800, avgTime: 15, successRate: 0.99 },
          persistent: { queries: 150, avgTime: 180, successRate: 0.97 },
          realtime: { queries: 50, avgTime: 300, successRate: 0.93 }
        };

        stats.popularQueries = [
          {
            pattern: 'AAPL,GOOGL,MSFT',
            count: 45,
            averageTime: 95,
            lastExecuted: '2024-01-01T12:00:00.000Z'
          }
        ];

        expect(stats.performance.totalQueries).toBe(1000);
        expect(stats.queryTypes['by_symbols'].count).toBe(750);
        expect(stats.dataSources.cache.queries).toBe(800);
        expect(stats.popularQueries[0].pattern).toBe('AAPL,GOOGL,MSFT');
      });
    });

    describe('property structure validation', () => {
      it('should support complex performance metrics', () => {
        const stats = new QueryStatsDto();

        stats.performance = {
          totalQueries: 50000,
          averageExecutionTime: 125.7,
          cacheHitRate: 0.923,
          errorRate: 0.015,
          queriesPerSecond: 25.8
        };

        expect(stats.performance.totalQueries).toBe(50000);
        expect(stats.performance.cacheHitRate).toBeCloseTo(0.923, 3);
        expect(stats.performance.errorRate).toBeCloseTo(0.015, 3);
      });

      it('should support multiple query types with detailed statistics', () => {
        const stats = new QueryStatsDto();

        stats.queryTypes = {
          'by_symbols': { count: 15000, averageTime: 95, successRate: 0.985 },
          'by_market': { count: 5000, averageTime: 180, successRate: 0.97 },
          'by_provider': { count: 2000, averageTime: 220, successRate: 0.93 },
          'by_tag': { count: 1000, averageTime: 160, successRate: 0.95 }
        };

        expect(Object.keys(stats.queryTypes)).toHaveLength(4);
        expect(stats.queryTypes['by_symbols'].successRate).toBeCloseTo(0.985, 3);
        expect(stats.queryTypes['by_provider'].averageTime).toBe(220);
      });

      it('should support detailed data source statistics', () => {
        const stats = new QueryStatsDto();

        stats.dataSources = {
          cache: { queries: 18500, avgTime: 12, successRate: 0.998 },
          persistent: { queries: 3200, avgTime: 165, successRate: 0.975 },
          realtime: { queries: 1300, avgTime: 425, successRate: 0.89 }
        };

        expect(stats.dataSources.cache.successRate).toBeCloseTo(0.998, 3);
        expect(stats.dataSources.realtime.avgTime).toBe(425);
      });

      it('should support popular query patterns tracking', () => {
        const stats = new QueryStatsDto();

        stats.popularQueries = [
          {
            pattern: 'AAPL,GOOGL,MSFT',
            count: 245,
            averageTime: 89,
            lastExecuted: '2024-01-01T15:30:00.000Z'
          },
          {
            pattern: '700.HK,0700.HK',
            count: 178,
            averageTime: 125,
            lastExecuted: '2024-01-01T15:25:00.000Z'
          },
          {
            pattern: 'TSLA',
            count: 156,
            averageTime: 67,
            lastExecuted: '2024-01-01T15:28:00.000Z'
          }
        ];

        expect(stats.popularQueries).toHaveLength(3);
        expect(stats.popularQueries[0].count).toBe(245);
        expect(stats.popularQueries[1].pattern).toBe('700.HK,0700.HK');
        expect(stats.popularQueries[2].lastExecuted).toBe('2024-01-01T15:28:00.000Z');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should support typical query workflow with all DTOs', () => {
      // Create metadata
      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        5,
        5,
        180,
        true,
        {
          cache: { hits: 3, misses: 2 },
          realtime: { hits: 2, misses: 0 }
        }
      );

      // Create response
      const data = new PaginatedDataDto(
        [
          { symbol: 'AAPL', price: 150 },
          { symbol: 'GOOGL', price: 2750 }
        ],
        {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      );

      const response = new QueryResponseDto(data, metadata);

      // Create bulk response
      const bulkResponse = new BulkQueryResponseDto([response], 1);

      expect(response.metadata.queryType).toBe(QueryType.BY_SYMBOLS);
      expect(bulkResponse.results).toHaveLength(1);
      expect(bulkResponse.summary.totalQueries).toBe(1);
    });

    it('should handle error scenarios with metadata', () => {
      const errors: QueryErrorInfoDto[] = [
        { symbol: 'INVALID1', reason: 'Symbol not found' },
        { symbol: 'INVALID2', reason: 'Provider unavailable' }
      ];

      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        3,
        1,
        250,
        false,
        {
          cache: { hits: 0, misses: 3 },
          realtime: { hits: 1, misses: 2 }
        },
        errors
      );

      expect(metadata.errors).toHaveLength(2);
      expect(metadata.totalResults).toBeGreaterThan(metadata.returnedResults);
      expect(metadata.cacheUsed).toBe(false);
    });
  });
});
