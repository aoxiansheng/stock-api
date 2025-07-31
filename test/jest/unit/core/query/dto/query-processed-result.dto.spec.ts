import { QueryProcessedResultDto } from '@core/query/dto/query-processed-result.dto';
import { QueryMetadataDto } from '@core/query/dto/query-response.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QueryType } from '@core/query/dto/query-types.dto';

interface StockData {
  symbol: string;
  price?: number;
  volume?: number;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  turnover?: number;
  timestamp?: string;
  status?: string;
}

interface NewsData {
  title: string;
  content: string;
  publishedAt: string;
}

describe('QueryProcessedResultDto', () => {
  describe('Interface Structure', () => {
    it('should define correct interface structure', () => {
      const paginatedData = new PaginatedDataDto<StockData>(
        [{ symbol: '00700.HK', price: 425.6 }],
        {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      );

      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        1,
        1,
        150,
        true,
        {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: paginatedData,
        metadata: metadata,
      };

      expect(processedResult).toHaveProperty('data');
      expect(processedResult).toHaveProperty('metadata');
      expect(processedResult.data).toBeInstanceOf(PaginatedDataDto);
      expect(processedResult.metadata).toBeInstanceOf(QueryMetadataDto);
    });

    it('should enforce required properties', () => {
      const paginatedData = new PaginatedDataDto<StockData>([], {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const metadata = new QueryMetadataDto(
        QueryType.BY_MARKET,
        0,
        0,
        50,
        false,
        {
          cache: { hits: 0, misses: 1 },
          realtime: { hits: 0, misses: 1 },
        },
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: paginatedData,
        metadata: metadata,
      };

      expect(processedResult.data).toBeDefined();
      expect(processedResult.metadata).toBeDefined();
    });
  });

  describe('Data Property Integration', () => {
    it('should integrate with PaginatedDataDto correctly', () => {
      const stockData: StockData[] = [
        { symbol: '00700.HK', price: 425.6, volume: 1000000 },
        { symbol: 'AAPL.US', price: 150.25, volume: 2000000 },
      ];

      const paginatedData = new PaginatedDataDto<StockData>(stockData, {
        page: 1,
        limit: 2,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        2,
        2,
        200,
        true,
        {
          cache: { hits: 2, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: paginatedData,
        metadata: metadata,
      };

      expect(processedResult.data.items).toHaveLength(2);
      expect(processedResult.data.items[0].symbol).toBe('00700.HK');
      expect(processedResult.data.items[1].symbol).toBe('AAPL.US');
      expect(processedResult.data.pagination.total).toBe(2);
      expect(processedResult.data.pagination.page).toBe(1);
    });

    it('should handle empty data correctly', () => {
      const emptyPaginatedData = new PaginatedDataDto<StockData>([], {
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
        25,
        false,
        {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 1 },
        },
        [],
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: emptyPaginatedData,
        metadata: metadata,
      };

      expect(processedResult.data.items).toHaveLength(0);
      expect(processedResult.data.pagination.total).toBe(0);
      expect(processedResult.metadata.totalResults).toBe(0);
      expect(processedResult.metadata.returnedResults).toBe(0);
    });

    it('should handle paginated data correctly', () => {
      const pageData: StockData[] = [
        { symbol: 'GOOGL.US', price: 2800.50 },
        { symbol: 'MSFT.US', price: 350.75 },
      ];

      const paginatedData = new PaginatedDataDto<StockData>(pageData, {
        page: 2,
        limit: 2,
        total: 10,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });

      const metadata = new QueryMetadataDto(
        QueryType.BY_MARKET,
        10,
        2,
        180,
        true,
        {
          cache: { hits: 10, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: paginatedData,
        metadata: metadata,
      };

      expect(processedResult.data.pagination.page).toBe(2);
      expect(processedResult.data.pagination.hasNext).toBe(true);
      expect(processedResult.data.pagination.hasPrev).toBe(true);
      expect(processedResult.metadata.totalResults).toBe(10);
      expect(processedResult.metadata.returnedResults).toBe(2);
    });
  });

  describe('Metadata Property Integration', () => {
    it('should integrate with QueryMetadataDto correctly', () => {
      const data = new PaginatedDataDto<{ test: string }>([{ test: 'data' }], {
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        1,
        1,
        125,
        true,
        {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
      );

      metadata.queryParams = {
        symbols: ['00700.HK'],
        market: 'HK',
        provider: 'longport',
        queryTypeFilter: 'get-stock-quote',
      };

      metadata.performance = {
        cacheQueryTime: 10,
        persistentQueryTime: 0,
        realtimeQueryTime: 0,
        dataProcessingTime: 15,
      };

      const processedResult: QueryProcessedResultDto<{ test: string }> = {
        data: data,
        metadata: metadata,
      };

      expect(processedResult.metadata.queryType).toBe(QueryType.BY_SYMBOLS);
      expect(processedResult.metadata.executionTime).toBe(125);
      expect(processedResult.metadata.cacheUsed).toBe(true);
      expect(processedResult.metadata.dataSources.cache.hits).toBe(1);
      expect(processedResult.metadata.queryParams.symbols).toEqual(['00700.HK']);
      expect(processedResult.metadata.performance.cacheQueryTime).toBe(10);
    });

    it('should handle metadata with errors', () => {
      const data = new PaginatedDataDto<StockData>([], {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const errors = [
        {
          symbol: 'INVALID.SYMBOL',
          reason: 'Symbol not found',
          errorCode: 'SYMBOL_NOT_FOUND',
          details: { provider: 'longport', timestamp: '2023-06-01T10:00:00Z' },
        },
      ];

      const metadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        0,
        0,
        300,
        false,
        {
          cache: { hits: 0, misses: 1 },
          realtime: { hits: 0, misses: 1 },
        },
        errors,
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: data,
        metadata: metadata,
      };

      expect(processedResult.metadata.errors).toHaveLength(1);
      expect(processedResult.metadata.errors[0].symbol).toBe('INVALID.SYMBOL');
      expect(processedResult.metadata.errors[0].reason).toBe('Symbol not found');
      expect(processedResult.metadata.errors[0].errorCode).toBe('SYMBOL_NOT_FOUND');
    });

    it('should handle different query types', () => {
      const data = new PaginatedDataDto<{ market: string; status: string }>([{ market: 'HK', status: 'open' }], {
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const queryTypes = [
        QueryType.BY_SYMBOLS,
        QueryType.BY_MARKET,
        QueryType.BY_PROVIDER,
      ];

      queryTypes.forEach(queryType => {
        const metadata = new QueryMetadataDto(
          queryType,
          1,
          1,
          100,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 1, misses: 0 },
          },
        );

        const processedResult: QueryProcessedResultDto<{ market: string; status: string }> = {
          data: data,
          metadata: metadata,
        };

        expect(processedResult.metadata.queryType).toBe(queryType);
      });
    });
  });

  describe('Type Safety and Generics', () => {
    it('should support generic typing through PaginatedDataDto', () => {
      const stockItems: StockData[] = [
        { symbol: '00700.HK', price: 425.6, volume: 1000000 },
        { symbol: 'AAPL.US', price: 150.25, volume: 2000000 },
      ];

      const paginatedData = new PaginatedDataDto<StockData>(stockItems, {
        page: 1,
        limit: 2,
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

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: paginatedData,
        metadata: metadata,
      };

      expect(processedResult.data.items[0].symbol).toBe('00700.HK');
      expect(processedResult.data.items[0].price).toBe(425.6);
      expect(processedResult.data.items[0].volume).toBe(1000000);
      expect(typeof processedResult.data.items[0].symbol).toBe('string');
      expect(typeof processedResult.data.items[0].price).toBe('number');
    });

    it('should support different data types', () => {
      const newsItems: NewsData[] = [
        {
          title: 'Market Update',
          content: 'Market analysis content...',
          publishedAt: '2023-06-01T10:00:00Z',
        },
      ];

      const newsPaginatedData = new PaginatedDataDto<NewsData>(newsItems, {
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const newsMetadata = new QueryMetadataDto(
        QueryType.BY_MARKET,
        1,
        1,
        90,
        false,
        {
          cache: { hits: 0, misses: 1 },
          realtime: { hits: 1, misses: 0 },
        },
      );

      const newsProcessedResult: QueryProcessedResultDto<NewsData> = {
        data: newsPaginatedData,
        metadata: newsMetadata,
      };

      expect(newsProcessedResult.data.items[0].title).toBe('Market Update');
      expect(newsProcessedResult.data.items[0].content).toContain('Market analysis');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    describe('Stock Query Processing', () => {
      it('should handle successful stock quote query result', () => {
        const stockQuotes: StockData[] = [
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

        const paginatedData = new PaginatedDataDto<StockData>(stockQuotes, {
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

        const processedResult: QueryProcessedResultDto<StockData> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.data.items).toHaveLength(2);
        expect(processedResult.data.items[0].symbol).toBe('00700.HK');
        expect(processedResult.data.items[1].symbol).toBe('AAPL.US');
        expect(processedResult.metadata.cacheUsed).toBe(true);
        expect(processedResult.metadata.queryParams.symbols).toHaveLength(2);
        expect(processedResult.metadata.performance.cacheQueryTime).toBe(15);
      });

      it('should handle market-wide query result', () => {
        const marketData: StockData[] = Array.from({ length: 50 }, (_, i) => ({
          symbol: `${String(i).padStart(5, '0')}.HK`,
          price: 100 + Math.random() * 500,
          volume: Math.floor(Math.random() * 10000000),
        }));

        const paginatedData = new PaginatedDataDto<StockData>(marketData.slice(0, 20), {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_MARKET,
          50,
          20,
          450,
          false,
          {
            cache: { hits: 0, misses: 50 },
            realtime: { hits: 50, misses: 0 },
          },
        );

        metadata.queryParams = {
          market: 'HK',
          queryTypeFilter: 'get-stock-quote',
        };

        const processedResult: QueryProcessedResultDto<StockData> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.data.items).toHaveLength(20);
        expect(processedResult.data.pagination.total).toBe(50);
        expect(processedResult.data.pagination.hasNext).toBe(true);
        expect(processedResult.metadata.queryType).toBe(QueryType.BY_MARKET);
        expect(processedResult.metadata.totalResults).toBe(50);
        expect(processedResult.metadata.returnedResults).toBe(20);
      });
    });

    describe('Error Handling Scenarios', () => {
      it('should handle partial failure in multi-symbol query', () => {
        const successfulData: StockData[] = [
          { symbol: '00700.HK', price: 425.6, status: 'success' },
        ];

        const paginatedData = new PaginatedDataDto<StockData>(successfulData, {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const errors = [
          {
            symbol: 'INVALID.SYMBOL',
            reason: 'Symbol not found in any provider',
            errorCode: 'SYMBOL_NOT_FOUND',
            details: {
              attemptedProviders: ['longport', 'longport_sg'],
              timestamp: '2023-06-01T10:00:00Z',
            },
          },
          {
            symbol: 'TIMEOUT.SYMBOL',
            reason: 'Provider timeout',
            errorCode: 'PROVIDER_TIMEOUT',
            details: {
              provider: 'longport',
              timeout: 5000,
              retryCount: 3,
            },
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

        const processedResult: QueryProcessedResultDto<StockData> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.data.items).toHaveLength(1);
        expect(processedResult.metadata.errors).toHaveLength(2);
        expect(processedResult.metadata.errors[0].symbol).toBe('INVALID.SYMBOL');
        expect(processedResult.metadata.errors[1].symbol).toBe('TIMEOUT.SYMBOL');
        expect(processedResult.metadata.dataSources.realtime.misses).toBe(2);
      });

      it('should handle complete query failure', () => {
        const emptyData = new PaginatedDataDto<StockData>([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });

        const errors = [
          {
            symbol: 'ALL.SYMBOLS',
            reason: 'All providers unavailable',
            errorCode: 'ALL_PROVIDERS_DOWN',
            details: {
              providers: ['longport', 'longport_sg', 'itick'],
              lastChecked: '2023-06-01T10:00:00Z',
            },
          },
        ];

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          1000,
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 },
          },
          errors,
        );

        const processedResult: QueryProcessedResultDto<StockData> = {
          data: emptyData,
          metadata: metadata,
        };

        expect(processedResult.data.items).toHaveLength(0);
        expect(processedResult.metadata.totalResults).toBe(0);
        expect(processedResult.metadata.errors).toHaveLength(1);
        expect(processedResult.metadata.errors[0].errorCode).toBe('ALL_PROVIDERS_DOWN');
      });
    });

    describe('Performance Analysis Scenarios', () => {
      it('should track high-performance cached query', () => {
        const fastData: StockData[] = [{ symbol: '00700.HK', price: 425.6 }];

        const paginatedData = new PaginatedDataDto<StockData>(fastData, {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          1,
          1,
          25, // Very fast execution
          true,
          {
            cache: { hits: 1, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
        );

        metadata.performance = {
          cacheQueryTime: 5,
          persistentQueryTime: 0,
          realtimeQueryTime: 0,
          dataProcessingTime: 3,
        };

        const processedResult: QueryProcessedResultDto<StockData> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.metadata.executionTime).toBeLessThan(50);
        expect(processedResult.metadata.cacheUsed).toBe(true);
        expect(processedResult.metadata.performance.cacheQueryTime).toBeLessThan(10);
        expect(processedResult.metadata.dataSources.cache.hits).toBe(1);
      });

      it('should track slow realtime query', () => {
        const realtimeData: StockData[] = [{ symbol: 'SLOW.SYMBOL', price: 100.0 }];

        const paginatedData = new PaginatedDataDto<StockData>(realtimeData, {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          1,
          1,
          3500, // Slow execution
          false,
          {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 1, misses: 0 },
          },
        );

        metadata.performance = {
          cacheQueryTime: 10,
          persistentQueryTime: 0,
          realtimeQueryTime: 3200,
          dataProcessingTime: 50,
        };

        const processedResult: QueryProcessedResultDto<StockData> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.metadata.executionTime).toBeGreaterThan(3000);
        expect(processedResult.metadata.cacheUsed).toBe(false);
        expect(processedResult.metadata.performance.realtimeQueryTime).toBeGreaterThan(3000);
        expect(processedResult.metadata.dataSources.realtime.hits).toBe(1);
      });
    });

    describe('Data Consistency Validation', () => {
      it('should maintain consistency between data and metadata counts', () => {
        const items = [
          { id: 1, value: 'first' },
          { id: 2, value: 'second' },
          { id: 3, value: 'third' },
        ];

        const paginatedData = new PaginatedDataDto<{ id: number; value: string }>(items, {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_MARKET,
          3, // Should match pagination.total
          3, // Should match items.length
          120,
          true,
          {
            cache: { hits: 3, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
        );

        const processedResult: QueryProcessedResultDto<{ id: number; value: string }> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.data.items.length).toBe(processedResult.metadata.returnedResults);
        expect(processedResult.data.pagination.total).toBe(processedResult.metadata.totalResults);
        expect(processedResult.metadata.dataSources.cache.hits).toBe(processedResult.metadata.totalResults);
      });

      it('should handle inconsistent data gracefully', () => {
        const items = [{ id: 1, value: 'only_one' }];

        const paginatedData = new PaginatedDataDto<{ id: number; value: string }>(items, {
          page: 1,
          limit: 10,
          total: 5, // Total says 5 but we only have 1 item
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const metadata = new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          5, // Total found
          1, // Actually returned
          200,
          false,
          {
            cache: { hits: 1, misses: 4 },
            realtime: { hits: 0, misses: 4 },
          },
        );

        const processedResult: QueryProcessedResultDto<{ id: number; value: string }> = {
          data: paginatedData,
          metadata: metadata,
        };

        expect(processedResult.data.items.length).toBe(1);
        expect(processedResult.metadata.returnedResults).toBe(1);
        expect(processedResult.metadata.totalResults).toBe(5);
        expect(processedResult.data.pagination.total).toBe(5);
      });
    });
  });
});
