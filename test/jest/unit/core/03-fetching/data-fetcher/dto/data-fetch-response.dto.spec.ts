/**
 * DataFetchResponseDto 单元测试
 * 测试数据获取响应DTO的构造和静态方法
 */

import { DataFetchResponseDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-response.dto';
import { DataFetchMetadataDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe('DataFetchResponseDto', () => {
  const mockData = [
    {
      symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
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
    REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    API_OPERATIONS.STOCK_DATA.GET_QUOTE,
    1500,
    2
  );

  describe('constructor', () => {
    it('should create instance with all properties', () => {
      const response = new DataFetchResponseDto(mockData, mockMetadata, true);

      expect(response.data).toEqual(mockData);
      expect(response.metadata).toEqual(mockMetadata);
      expect(response.hasPartialFailures).toBe(true);
    });

    it('should create instance with default hasPartialFailures', () => {
      const response = new DataFetchResponseDto(mockData, mockMetadata);

      expect(response.data).toEqual(mockData);
      expect(response.metadata).toEqual(mockMetadata);
      expect(response.hasPartialFailures).toBe(false);
    });
  });

  describe('success static method', () => {
    it('should create success response with correct metadata', () => {
      const response = DataFetchResponseDto.success(
        mockData,
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        1500,
        2
      );

      expect(response.data).toEqual(mockData);
      expect(response.hasPartialFailures).toBe(false);
      expect(response.metadata.provider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      expect(response.metadata.capability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
      expect(response.metadata.processingTimeMs).toBe(1500);
      expect(response.metadata.symbolsProcessed).toBe(2);
      expect(response.metadata.failedSymbols).toBeUndefined();
      expect(response.metadata.errors).toBeUndefined();
    });

    it('should handle empty data array', () => {
      const response = DataFetchResponseDto.success(
        [],
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        100,
        0
      );

      expect(response.data).toEqual([]);
      expect(response.hasPartialFailures).toBe(false);
      expect(response.metadata.symbolsProcessed).toBe(0);
    });
  });

  describe('partialSuccess static method', () => {
    it('should create partial success response with failed symbols and errors', () => {
      const failedSymbols = ['INVALID.XX'];
      const errors = ['Symbol not found: INVALID.XX'];

      const response = DataFetchResponseDto.partialSuccess(
        mockData,
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        2000,
        1,
        failedSymbols,
        errors
      );

      expect(response.data).toEqual(mockData);
      expect(response.hasPartialFailures).toBe(true);
      expect(response.metadata.provider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      expect(response.metadata.capability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
      expect(response.metadata.processingTimeMs).toBe(2000);
      expect(response.metadata.symbolsProcessed).toBe(1);
      expect(response.metadata.failedSymbols).toEqual(failedSymbols);
      expect(response.metadata.errors).toEqual(errors);
    });

    it('should handle multiple failed symbols and errors', () => {
      const failedSymbols = ['INVALID.XX', 'BADSTOCK.YY'];
      const errors = [
        'Symbol not found: INVALID.XX',
        'Symbol not found: BADSTOCK.YY'
      ];

      const response = DataFetchResponseDto.partialSuccess(
        [],
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        3000,
        0,
        failedSymbols,
        errors
      );

      expect(response.data).toEqual([]);
      expect(response.hasPartialFailures).toBe(true);
      expect(response.metadata.symbolsProcessed).toBe(0);
      expect(response.metadata.failedSymbols).toHaveLength(2);
      expect(response.metadata.errors).toHaveLength(2);
    });
  });

  describe('data structure validation', () => {
    it('should handle complex nested data objects', () => {
      const complexData = [
        {
          symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
          quote: {
            price: 385.6,
            volume: 12345600,
            nested: {
              deep: {
                value: 'test'
              }
            }
          },
          metadata: {
            source: 'api',
            timestamp: Date.now()
          }
        }
      ];

      const response = DataFetchResponseDto.success(
        complexData,
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        1200,
        1
      );

      expect(response.data).toEqual(complexData);
      expect(response.data[0].quote.nested.deep.value).toBe('test');
    });
  });

  describe('metadata integration', () => {
    it('should properly integrate with DataFetchMetadataDto', () => {
      const customMetadata = new DataFetchMetadataDto(
        'custom-provider',
        'custom-capability',
        5000,
        10,
        ['FAILED1.XX'],
        ['Custom error message']
      );

      const response = new DataFetchResponseDto(
        mockData,
        customMetadata,
        true
      );

      expect(response.metadata).toBeInstanceOf(DataFetchMetadataDto);
      expect(response.metadata.provider).toBe('custom-provider');
      expect(response.metadata.capability).toBe('custom-capability');
      expect(response.metadata.failedSymbols).toEqual(['FAILED1.XX']);
      expect(response.metadata.errors).toEqual(['Custom error message']);
    });
  });
});
