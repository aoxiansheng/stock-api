import { QueryMetadataDto, QueryResponseDto, BulkQueryResponseDto, QueryStatsDto } from '@core/query/dto/query-response.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QueryErrorInfoDto } from '@core/query/dto/query-internal.dto';
import { QueryType } from '@core/query/dto/query-types.dto';

interface StockData {
  symbol: string;
  price?: number; // 修改为可选属性
  volume?: number;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  turnover?: number;
  timestamp?: string;
  status?: string;
}

interface MarketData {
  market: string;
  count: number;
}

interface NewsItem {
  title: string;
  content: string;
  publishedAt: string;
}

describe('Query Response DTOs', () => {
  describe('QueryMetadataDto', () => {
    describe('Constructor', () => {
      it('should create instance with required parameters', () => {
        const queryType = QueryType.BY_SYMBOLS;
        const totalResults = 5;
        const returnedResults = 5;
        const executionTime = 150;
        const cacheUsed = true;
        const dataSources = {
          cache: { hits: 5, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        };

        const metadata = new QueryMetadataDto(
          queryType,
          totalResults,
          returnedResults,
          executionTime,
          cacheUsed,
          dataSources,
        );

        expect(metadata.queryType).toBe(QueryType.BY_SYMBOLS);
        expect(metadata.totalResults).toBe(5);
        expect(metadata.returnedResults).toBe(5);
        expect(metadata.executionTime).toBe(150);
        expect(metadata.cacheUsed).toBe(true);
        expect(metadata.dataSources.cache.hits).toBe(5);
        expect(metadata.dataSources.realtime.hits).toBe(0);
        expect(metadata.timestamp).toBeDefined();
        expect(typeof metadata.timestamp).toBe('string');
      });

      it('should create instance with errors', () => {
        const errors: QueryErrorInfoDto[] = [
          {
            symbol: 'INVALID.SYMBOL',
            reason: 'Symbol not found',
            errorCode: 'SYMBOL_NOT_FOUND',
            details: { provider: 'longport' },
          },
        ];

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          200,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 },
          },
          errors,
        );

        expect(metadata.errors).toHaveLength(1);
        expect(metadata.errors[0].symbol).toBe('INVALID.SYMBOL');
        expect(metadata.errors[0].reason).toBe('Symbol not found');
        expect(metadata.errors[0].errorCode).toBe('SYMBOL_NOT_FOUND');
      });

      it('should auto-generate timestamp', () => {
        const beforeTime = Date.now();

        const metadata = new QueryMetadataDto(
          QueryType.BY_MARKET,
          1,
          1,
          100,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 1, misses: 0 },
          },
        );

        const afterTime = Date.now();
        const metadataTime = new Date(metadata.timestamp).getTime();

        expect(metadataTime).toBeGreaterThanOrEqual(beforeTime);
        expect(metadataTime).toBeLessThanOrEqual(afterTime);
        expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('Optional Properties', () => {
      it('should handle queryParams correctly', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          2,
          2,
          180,
          true,
          {
            cache: { hits: 2, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
        );

        metadata.queryParams = {
          symbols: ['00700.HK', 'AAPL.US'],
          market: 'MIXED',
          provider: 'longport',
          queryTypeFilter: 'get-stock-quote',
          timeRange: {
            start: '2023-06-01T00:00:00Z',
            end: '2023-06-01T23:59:59Z',
          },
          queryFiltersCount: 3,
        };

        expect(metadata.queryParams.symbols).toEqual(['00700.HK', 'AAPL.US']);
        expect(metadata.queryParams.market).toBe('MIXED');
        expect(metadata.queryParams.provider).toBe('longport');
        expect(metadata.queryParams.queryTypeFilter).toBe('get-stock-quote');
        expect(metadata.queryParams.timeRange.start).toBe('2023-06-01T00:00:00Z');
        expect(metadata.queryParams.queryFiltersCount).toBe(3);
      });

      it('should handle performance breakdown', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          1,
          1,
          200,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 1, misses: 0 },
          },
        );

        metadata.performance = {
          cacheQueryTime: 15,
          persistentQueryTime: 25,
          realtimeQueryTime: 120,
          dataProcessingTime: 40,
        };

        expect(metadata.performance.cacheQueryTime).toBe(15);
        expect(metadata.performance.persistentQueryTime).toBe(25);
        expect(metadata.performance.realtimeQueryTime).toBe(120);
        expect(metadata.performance.dataProcessingTime).toBe(40);
        expect(
          metadata.performance.cacheQueryTime +
          metadata.performance.persistentQueryTime +
          metadata.performance.realtimeQueryTime +
          metadata.performance.dataProcessingTime
        ).toBe(200);
      });
    });

    describe('Data Sources Statistics', () => {
      it('should track cache statistics correctly', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_MARKET,
          10,
          8,
          300,
          true,
          {
            cache: { hits: 8, misses: 2 },
            realtime: { hits: 2, misses: 0 },
          },
        );

        expect(metadata.dataSources.cache.hits).toBe(8);
        expect(metadata.dataSources.cache.misses).toBe(2);
        expect(metadata.dataSources.realtime.hits).toBe(2);
        expect(metadata.dataSources.realtime.misses).toBe(0);
      });

      it('should calculate hit rates correctly', () => {
        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          100,
          100,
          500,
          true,
          {
            cache: { hits: 70, misses: 30 },
            realtime: { hits: 30, misses: 0 },
          },
        );

        const cacheHitRate = metadata.dataSources.cache.hits / 
          (metadata.dataSources.cache.hits + metadata.dataSources.cache.misses);
        const realtimeHitRate = metadata.dataSources.realtime.hits / 
          (metadata.dataSources.realtime.hits + metadata.dataSources.realtime.misses || 1);

        expect(cacheHitRate).toBe(0.7); // 70%
        expect(realtimeHitRate).toBe(1.0); // 100%
      });
    });
  });

  describe('QueryResponseDto', () => {
    describe('Constructor', () => {
      it('should create instance with data and metadata', () => {
        const stockData: StockData[] = [
          { symbol: '00700.HK', price: 425.6, volume: 1000000 },
          { symbol: 'AAPL.US', price: 150.25, volume: 2000000 },
        ];

        const paginatedData = new PaginatedDataDto<StockData>(stockData, {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          2,
          2,
          175,
          true,
          {
            cache: { hits: 2, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
        );

        const response = new QueryResponseDto<StockData>(paginatedData, metadata);

        expect(response.data).toBe(paginatedData);
        expect(response.metadata).toBe(metadata);
        expect(response.data.items).toHaveLength(2);
        expect(response.metadata.queryType).toBe(QueryType.BY_SYMBOLS);
      });

      it('should handle empty results', () => {
        const emptyData = new PaginatedDataDto<any>([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_PROVIDER,
          0,
          0,
          50,
          false,
          {
            cache: { hits: 0, misses: 0 },
            realtime: { hits: 0, misses: 1 },
          },
        );

        const response = new QueryResponseDto<any>(emptyData, metadata);

        expect(response.data.items).toHaveLength(0);
        expect(response.metadata.totalResults).toBe(0);
        expect(response.metadata.returnedResults).toBe(0);
      });
    });

    describe('Generic Type Support', () => {
      it('should support typed data', () => {
        const newsItems: NewsItem[] = [
          {
            title: 'Market Update',
            content: 'Market analysis...',
            publishedAt: '2023-06-01T10:00:00Z',
          },
        ];

        const paginatedData = new PaginatedDataDto<NewsItem>(newsItems, {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_MARKET,
          1,
          1,
          85,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 1, misses: 0 },
          },
        );

        const response = new QueryResponseDto<NewsItem>(paginatedData, metadata);

        expect(response.data.items[0].title).toBe('Market Update');
        expect(response.data.items[0].content).toBe('Market analysis...');
        expect(response.data.items[0].publishedAt).toBe('2023-06-01T10:00:00Z');
      });
    });
  });

  describe('BulkQueryResponseDto', () => {
    describe('Constructor', () => {
      it('should create instance with multiple query results', () => {
        const result1 = new QueryResponseDto<StockData>(
          new PaginatedDataDto<StockData>([{ symbol: '00700.HK', price: 425.6 }], {
            page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
          }),
          new QueryMetadataDto(QueryType.BY_SYMBOLS, 1, 1, 100, true, {
            cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 },
          }),
        );

        const result2 = new QueryResponseDto<StockData>(
          new PaginatedDataDto<StockData>([{ symbol: 'AAPL.US', price: 150.25 }], {
            page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
          }),
          new QueryMetadataDto(QueryType.BY_SYMBOLS, 1, 1, 150, false, {
            cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 },
          }),
        );

        const totalQueriesAttempted = 2;

        const bulkResponse = new BulkQueryResponseDto([result1, result2], totalQueriesAttempted);

        expect(bulkResponse.results).toHaveLength(2);
        expect(bulkResponse.summary.totalQueries).toBe(2);
        expect(bulkResponse.summary.totalExecutionTime).toBe(250); // 100 + 150
        expect(bulkResponse.summary.averageExecutionTime).toBe(125); // 250 / 2
        expect(bulkResponse.timestamp).toBeDefined();
      });

      it('should handle empty results', () => {
        const results: QueryResponseDto<any>[] = [];
        const totalQueriesAttempted = 5; // Some queries failed completely

        const bulkResponse = new BulkQueryResponseDto(results, totalQueriesAttempted);

        expect(bulkResponse.results).toHaveLength(0);
        expect(bulkResponse.summary.totalQueries).toBe(5);
        expect(bulkResponse.summary.totalExecutionTime).toBe(0);
        expect(bulkResponse.summary.averageExecutionTime).toBe(0);
      });

      it('should handle partial failures', () => {
        const successResult = new QueryResponseDto<StockData>(
          new PaginatedDataDto<StockData>([{ symbol: '00700.HK', price: 425.6 }], {
            page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
          }),
          new QueryMetadataDto(QueryType.BY_SYMBOLS, 1, 1, 200, true, {
            cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 },
          }),
        );

        const totalQueriesAttempted = 3; // 1 success, 2 failures

        const bulkResponse = new BulkQueryResponseDto([successResult], totalQueriesAttempted);

        expect(bulkResponse.results).toHaveLength(1);
        expect(bulkResponse.summary.totalQueries).toBe(3);
        expect(bulkResponse.summary.totalExecutionTime).toBe(200);
        expect(bulkResponse.summary.averageExecutionTime).toBe(200); // Only successful queries counted
      });

      it('should auto-generate timestamp', () => {
        const beforeTime = Date.now();
        const result = new QueryResponseDto<any>(
          new PaginatedDataDto<any>([], { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false }),
          new QueryMetadataDto(QueryType.BY_SYMBOLS, 0, 0, 50, false, {
            cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 },
          }),
        );

        const bulkResponse = new BulkQueryResponseDto([result], 1);
        const afterTime = Date.now();
        const responseTime = new Date(bulkResponse.timestamp).getTime();

        expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
        expect(responseTime).toBeLessThanOrEqual(afterTime);
        expect(bulkResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('Statistics Calculation', () => {
      it('should calculate complex statistics correctly', () => {
        const results = [
          new QueryResponseDto<any>(
            new PaginatedDataDto<any>([{ id: 1 }], { page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false }),
            new QueryMetadataDto(QueryType.BY_SYMBOLS, 1, 1, 100, true, { cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 } }),
          ),
          new QueryResponseDto<any>(
            new PaginatedDataDto<any>([{ id: 2 }], { page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false }),
            new QueryMetadataDto(QueryType.BY_SYMBOLS, 1, 1, 200, false, { cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 } }),
          ),
          new QueryResponseDto<any>(
            new PaginatedDataDto<any>([{ id: 3 }], { page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false }),
            new QueryMetadataDto(QueryType.BY_SYMBOLS, 1, 1, 300, false, { cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 } }),
          ),
        ];

        const bulkResponse = new BulkQueryResponseDto(results, 5); // 3 success, 2 failures

        expect(bulkResponse.summary.totalQueries).toBe(5);
        expect(bulkResponse.summary.totalExecutionTime).toBe(600); // 100 + 200 + 300
        expect(bulkResponse.summary.averageExecutionTime).toBe(200); // 600 / 3
      });
    });
  });

  describe('QueryStatsDto', () => {
    describe('Constructor', () => {
      it('should create instance with auto-generated timestamp', () => {
        const beforeTime = Date.now();

        const stats = new QueryStatsDto();
        const afterTime = Date.now();
        const statsTime = new Date(stats.timestamp).getTime();

        expect(statsTime).toBeGreaterThanOrEqual(beforeTime);
        expect(statsTime).toBeLessThanOrEqual(afterTime);
        expect(stats.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('Statistics Structure', () => {
      it('should support comprehensive performance statistics', () => {
        const stats = new QueryStatsDto();
        stats.performance = {
          totalQueries: 10000,
          averageExecutionTime: 150,
          cacheHitRate: 0.85,
          errorRate: 0.02,
          queriesPerSecond: 50,
        };

        expect(stats.performance.totalQueries).toBe(10000);
        expect(stats.performance.averageExecutionTime).toBe(150);
        expect(stats.performance.cacheHitRate).toBe(0.85);
        expect(stats.performance.errorRate).toBe(0.02);
        expect(stats.performance.queriesPerSecond).toBe(50);
      });

      it('should support query type distribution', () => {
        const stats = new QueryStatsDto();
        stats.queryTypes = {
          [QueryType.BY_SYMBOLS]: {
            count: 5000,
            averageTime: 120,
            successRate: 0.98,
          },
          [QueryType.BY_MARKET]: {
            count: 3000,
            averageTime: 200,
            successRate: 0.95,
          },
          [QueryType.BY_PROVIDER]: {
            count: 2000,
            averageTime: 180,
            successRate: 0.97,
          },
        };

        expect(stats.queryTypes[QueryType.BY_SYMBOLS].count).toBe(5000);
        expect(stats.queryTypes[QueryType.BY_MARKET].averageTime).toBe(200);
        expect(stats.queryTypes[QueryType.BY_PROVIDER].successRate).toBe(0.97);
      });

      it('should support data source statistics', () => {
        const stats = new QueryStatsDto();
        stats.dataSources = {
          cache: {
            queries: 8500,
            avgTime: 15,
            successRate: 0.99,
          },
          persistent: {
            queries: 1000,
            avgTime: 80,
            successRate: 0.98,
          },
          realtime: {
            queries: 500,
            avgTime: 300,
            successRate: 0.92,
          },
        };

        expect(stats.dataSources.cache.queries).toBe(8500);
        expect(stats.dataSources.cache.avgTime).toBe(15);
        expect(stats.dataSources.persistent.successRate).toBe(0.98);
        expect(stats.dataSources.realtime.avgTime).toBe(300);
      });

      it('should support popular query patterns', () => {
        const stats = new QueryStatsDto();
        stats.popularQueries = [
          {
            pattern: 'symbols:HK_stocks',
            count: 2500,
            averageTime: 100,
            lastExecuted: '2023-06-01T10:00:00Z',
          },
          {
            pattern: 'market:US',
            count: 2000,
            averageTime: 180,
            lastExecuted: '2023-06-01T09:30:00Z',
          },
          {
            pattern: 'provider:longport',
            count: 1500,
            averageTime: 120,
            lastExecuted: '2023-06-01T09:45:00Z',
          },
        ];

        expect(stats.popularQueries).toHaveLength(3);
        expect(stats.popularQueries[0].pattern).toBe('symbols:HK_stocks');
        expect(stats.popularQueries[0].count).toBe(2500);
        expect(stats.popularQueries[1].averageTime).toBe(180);
        expect(stats.popularQueries[2].lastExecuted).toBe('2023-06-01T09:45:00Z');
      });
    });
  });

  describe('Real-world Integration Scenarios', () => {
    describe('Stock Market Query Response', () => {
      it('should handle comprehensive stock query response', () => {
        const stockData: StockData[] = [
          {
            symbol: '00700.HK',
            lastPrice: 425.6,
            change: 5.2,
            changePercent: 0.0124,
            volume: 12500000,
            turnover: 5312500000,
            timestamp: '2023-06-01T10:00:00Z',
          },
          {
            symbol: 'AAPL.US',
            lastPrice: 150.25,
            change: -2.1,
            changePercent: -0.0138,
            volume: 45000000,
            turnover: 6761250000,
            timestamp: '2023-06-01T10:00:00Z',
          },
        ];

        const paginatedData = new PaginatedDataDto<StockData>(stockData, {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          2,
          2,
          185,
          true,
          {
            cache: { hits: 2, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
        );

        metadata.queryParams = {
          symbols: ['00700.HK', 'AAPL.US'],
          queryTypeFilter: 'get-stock-quote',
        };

        metadata.performance = {
          cacheQueryTime: 15,
          persistentQueryTime: 0,
          realtimeQueryTime: 0,
          dataProcessingTime: 20,
        };

        const response = new QueryResponseDto<StockData>(paginatedData, metadata);

        expect(response.data.items).toHaveLength(2);
        expect(response.data.items[0].symbol).toBe('00700.HK');
        expect(response.data.items[1].symbol).toBe('AAPL.US');
        expect(response.metadata.cacheUsed).toBe(true);
        expect(response.metadata.executionTime).toBe(185);
        expect(response.metadata.queryParams.symbols).toEqual(['00700.HK', 'AAPL.US']);
      });

      it('should handle bulk market query response', () => {
        const hkResult = new QueryResponseDto<MarketData>(
          new PaginatedDataDto<MarketData>([{ market: 'HK', count: 1000 }], {
            page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
          }),
          new QueryMetadataDto(QueryType.BY_MARKET, 1, 1, 200, false, {
            cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 },
          }),
        );

        const usResult = new QueryResponseDto<MarketData>(
          new PaginatedDataDto<MarketData>([{ market: 'US', count: 2000 }], {
            page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
          }),
          new QueryMetadataDto(QueryType.BY_MARKET, 1, 1, 300, false, {
            cache: { hits: 0, misses: 1 }, realtime: { hits: 1, misses: 0 },
          }),
        );

        const bulkResponse = new BulkQueryResponseDto([hkResult, usResult], 2);

        expect(bulkResponse.results).toHaveLength(2);
        expect((bulkResponse.results[0].data.items[0] as MarketData).market).toBe('HK');
        expect((bulkResponse.results[1].data.items[0] as MarketData).market).toBe('US');
        expect(bulkResponse.summary.totalQueries).toBe(2);
        expect(bulkResponse.summary.totalExecutionTime).toBe(500);
        expect(bulkResponse.summary.averageExecutionTime).toBe(250);
      });
    });

    describe('Error Handling Scenarios', () => {
      it('should handle query with partial errors', () => {
        const partialData: StockData[] = [
          { symbol: '00700.HK', price: 425.6, status: 'success' },
        ];

        const paginatedData = new PaginatedDataDto<StockData>(partialData, {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const errors: QueryErrorInfoDto[] = [
          {
            symbol: 'INVALID.SYMBOL',
            reason: 'Symbol not found in any provider',
            errorCode: 'SYMBOL_NOT_FOUND',
          },
          {
            symbol: 'TIMEOUT.SYMBOL',
            reason: 'Provider timeout',
            errorCode: 'PROVIDER_TIMEOUT',
          },
        ];

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          1,
          1,
          5200,
          false,
          {
            cache: { hits: 0, misses: 3 },
            realtime: { hits: 1, misses: 2 },
          },
          errors,
        );

        const response = new QueryResponseDto<StockData>(paginatedData, metadata);

        expect(response.data.items).toHaveLength(1);
        expect(response.metadata.errors).toHaveLength(2);
        expect(response.metadata.errors[0].symbol).toBe('INVALID.SYMBOL');
        expect(response.metadata.errors[1].symbol).toBe('TIMEOUT.SYMBOL');
        expect(response.metadata.dataSources.realtime.misses).toBe(2);
      });
    });

    describe('Performance Analysis', () => {
      it('should provide comprehensive performance statistics', () => {
        const stats = new QueryStatsDto();
        
        stats.performance = {
          totalQueries: 50000,
          averageExecutionTime: 125,
          cacheHitRate: 0.78,
          errorRate: 0.015,
          queriesPerSecond: 75,
        };

        stats.queryTypes = {
          [QueryType.BY_SYMBOLS]: { count: 30000, averageTime: 110, successRate: 0.985 },
          [QueryType.BY_MARKET]: { count: 15000, averageTime: 150, successRate: 0.975 },
          [QueryType.BY_PROVIDER]: { count: 5000, averageTime: 140, successRate: 0.980 },
        };

        stats.dataSources = {
          cache: { queries: 39000, avgTime: 12, successRate: 0.995 },
          persistent: { queries: 8000, avgTime: 65, successRate: 0.990 },
          realtime: { queries: 3000, avgTime: 280, successRate: 0.920 },
        };

        stats.popularQueries = [
          { pattern: 'HK_tech_stocks', count: 8500, averageTime: 95, lastExecuted: '2023-06-01T10:00:00Z' },
          { pattern: 'US_large_cap', count: 7200, averageTime: 130, lastExecuted: '2023-06-01T09:55:00Z' },
          { pattern: 'market_overview', count: 5800, averageTime: 180, lastExecuted: '2023-06-01T09:50:00Z' },
        ];

        expect(stats.performance.cacheHitRate).toBeGreaterThan(0.75);
        expect(stats.performance.errorRate).toBeLessThan(0.02);
        expect(stats.queryTypes[QueryType.BY_SYMBOLS].successRate).toBeGreaterThan(0.98);
        expect(stats.dataSources.cache.avgTime).toBeLessThan(15);
        expect(stats.popularQueries[0].count).toBeGreaterThan(8000);
      });
    });

    describe('Edge Cases and Boundary Testing', () => {
      describe('Large Dataset Handling', () => {
        it('should handle large paginated responses', () => {
          const largeDataset: StockData[] = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            symbol: `STOCK${i}.HK`,
            price: 100 + Math.random() * 400,
          }));

          const paginatedData = new PaginatedDataDto<StockData>(largeDataset.slice(0, 100), {
            page: 1,
            limit: 100,
            total: 1000,
            totalPages: 10,
            hasNext: true,
            hasPrev: false,
          });

          const metadata = new QueryMetadataDto(
            QueryType.BY_MARKET,
            1000,
            100,
            2500,
            false,
            {
              cache: { hits: 0, misses: 1000 },
              realtime: { hits: 1000, misses: 0 },
            },
          );

          const response = new QueryResponseDto<StockData>(paginatedData, metadata);

          expect(response.data.items).toHaveLength(100);
          expect(response.data.pagination.total).toBe(1000);
          expect(response.data.pagination.hasNext).toBe(true);
          expect(response.metadata.totalResults).toBe(1000);
          expect(response.metadata.returnedResults).toBe(100);
        });
      });

      describe('Zero and Null Handling', () => {
        it('should handle zero execution times', () => {
          const metadata = new QueryMetadataDto(
            QueryType.BY_SYMBOLS,
            1,
            1,
            0, // Zero execution time
            true,
            {
              cache: { hits: 1, misses: 0 },
              realtime: { hits: 0, misses: 0 },
            },
          );

          expect(metadata.executionTime).toBe(0);
          expect(metadata.cacheUsed).toBe(true);
        });

        it('should handle empty statistics in bulk response', () => {
          const bulkResponse = new BulkQueryResponseDto([], 0);

          expect(bulkResponse.results).toHaveLength(0);
          expect(bulkResponse.summary.totalQueries).toBe(0);
          expect(bulkResponse.summary.totalExecutionTime).toBe(0);
          expect(bulkResponse.summary.averageExecutionTime).toBe(0);
        });
      });
    });
  });
});
