import { DataFetchResponseDto } from '../../../../../../src/core/data-fetcher/dto/data-fetch-response.dto';
import { DataFetchMetadataDto } from '../../../../../../src/core/data-fetcher/dto/data-fetch-request.dto';

describe('DataFetchResponseDto', () => {
  const mockData = [
    {
      symbol: '700.HK',
      last_done: 385.6,
      prev_close: 389.8,
      open: 387.2,
      high: 390.1,
      low: 384.5,
      volume: 12345600,
      turnover: 4765432100,
      timestamp: 1704110400000,
      trade_status: 1,
    },
  ];

  const mockMetadata = new DataFetchMetadataDto(
    'longport',
    'get-stock-quote',
    150,
    1,
  );

  describe('constructor', () => {
    it('should create instance with all fields', () => {
      const dto = new DataFetchResponseDto(mockData, mockMetadata, false);

      expect(dto.data).toEqual(mockData);
      expect(dto.metadata).toEqual(mockMetadata);
      expect(dto.hasPartialFailures).toBe(false);
    });

    it('should create instance with default hasPartialFailures', () => {
      const dto = new DataFetchResponseDto(mockData, mockMetadata);

      expect(dto.data).toEqual(mockData);
      expect(dto.metadata).toEqual(mockMetadata);
      expect(dto.hasPartialFailures).toBe(false);
    });
  });

  describe('static success', () => {
    it('should create successful response', () => {
      const response = DataFetchResponseDto.success(
        mockData,
        'longport',
        'get-stock-quote',
        150,
        1,
      );

      expect(response.data).toEqual(mockData);
      expect(response.metadata.provider).toBe('longport');
      expect(response.metadata.capability).toBe('get-stock-quote');
      expect(response.metadata.processingTime).toBe(150);
      expect(response.metadata.symbolsProcessed).toBe(1);
      expect(response.metadata.failedSymbols).toBeUndefined();
      expect(response.metadata.errors).toBeUndefined();
      expect(response.hasPartialFailures).toBe(false);
    });
  });

  describe('static partialSuccess', () => {
    it('should create partial success response', () => {
      const failedSymbols = ['INVALID.XX'];
      const errors = ['Symbol not found: INVALID.XX'];

      const response = DataFetchResponseDto.partialSuccess(
        mockData,
        'longport',
        'get-stock-quote',
        150,
        1,
        failedSymbols,
        errors,
      );

      expect(response.data).toEqual(mockData);
      expect(response.metadata.provider).toBe('longport');
      expect(response.metadata.capability).toBe('get-stock-quote');
      expect(response.metadata.processingTime).toBe(150);
      expect(response.metadata.symbolsProcessed).toBe(1);
      expect(response.metadata.failedSymbols).toEqual(failedSymbols);
      expect(response.metadata.errors).toEqual(errors);
      expect(response.hasPartialFailures).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const emptyData: any[] = [];
      const metadata = new DataFetchMetadataDto(
        'longport',
        'get-stock-quote',
        50,
        0,
      );

      const dto = new DataFetchResponseDto(emptyData, metadata);

      expect(dto.data).toEqual([]);
      expect(dto.metadata.symbolsProcessed).toBe(0);
      expect(dto.hasPartialFailures).toBe(false);
    });

    it('should handle large data arrays', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        symbol: `STOCK${i}.HK`,
        price: 100 + i,
        volume: 10000 * (i + 1),
      }));

      const metadata = new DataFetchMetadataDto(
        'longport',
        'get-stock-quote',
        500,
        100,
      );

      const dto = new DataFetchResponseDto(largeData, metadata);

      expect(dto.data).toHaveLength(100);
      expect(dto.metadata.symbolsProcessed).toBe(100);
      expect(dto.hasPartialFailures).toBe(false);
    });
  });
});