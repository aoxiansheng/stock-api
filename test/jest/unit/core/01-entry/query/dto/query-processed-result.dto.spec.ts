import { QueryProcessedResultDto } from '@core/01-entry/query/dto/query-processed-result.dto';
import { QueryMetadataDto } from '@core/01-entry/query/dto/query-response.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';

describe('QueryProcessedResultDto', () => {
  describe('interface structure', () => {
    it('should have correct interface structure', () => {
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

      const mockData = new PaginatedDataDto(
        [
          { symbol: 'AAPL', price: 150.25 },
          { symbol: 'GOOGL', price: 2750.80 }
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

      const processedResult: QueryProcessedResultDto = {
        data: mockData,
        metadata: mockMetadata
      };

      expect(processedResult.data).toBe(mockData);
      expect(processedResult.metadata).toBe(mockMetadata);
      expect(processedResult.data.items).toHaveLength(2);
      expect(processedResult.metadata.queryType).toBe(QueryType.BY_SYMBOLS);
    });

    it('should support generic typing', () => {
      interface StockData {
        symbol: string;
        price: number;
      }

      const typedData = new PaginatedDataDto<StockData>(
        [{ symbol: 'AAPL', price: 150.25 }],
        {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      );

      const mockMetadata = new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        1,
        1,
        100,
        true,
        {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 }
        }
      );

      const processedResult: QueryProcessedResultDto<StockData> = {
        data: typedData,
        metadata: mockMetadata
      };

      expect(processedResult.data.items[0].symbol).toBe('AAPL');
      expect(processedResult.data.items[0].price).toBe(150.25);
    });

    it('should handle empty data correctly', () => {
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

      const mockMetadata = new QueryMetadataDto(
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

      const processedResult: QueryProcessedResultDto = {
        data: emptyData,
        metadata: mockMetadata
      };

      expect(processedResult.data.items).toEqual([]);
      expect(processedResult.metadata.totalResults).toBe(0);
      expect(processedResult.metadata.cacheUsed).toBe(false);
    });
  });
});
