/**
 * DataFetchMetadataDto 单元测试
 * 测试数据获取元数据DTO的构造和属性
 */

import { DataFetchMetadataDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe('DataFetchMetadataDto', () => {
  describe('constructor', () => {
    it('should create instance with required parameters only', () => {
      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        1500,
        2
      );

      expect(metadata.provider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      expect(metadata.capability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
      expect(metadata.processingTimeMs).toBe(1500);
      expect(metadata.symbolsProcessed).toBe(2);
      expect(metadata.failedSymbols).toBeUndefined();
      expect(metadata.errors).toBeUndefined();
    });

    it('should create instance with all parameters', () => {
      const failedSymbols = ['INVALID.XX', 'BADSTOCK.YY'];
      const errors = ['Symbol not found: INVALID.XX', 'Symbol not found: BADSTOCK.YY'];

      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        2000,
        1,
        failedSymbols,
        errors
      );

      expect(metadata.provider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      expect(metadata.capability).toBe(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
      expect(metadata.processingTimeMs).toBe(2000);
      expect(metadata.symbolsProcessed).toBe(1);
      expect(metadata.failedSymbols).toEqual(failedSymbols);
      expect(metadata.errors).toEqual(errors);
    });

    it('should create instance with empty arrays for optional parameters', () => {
      const metadata = new DataFetchMetadataDto(
        'test-provider',
        'test-capability',
        1000,
        0,
        [],
        []
      );

      expect(metadata.provider).toBe('test-provider');
      expect(metadata.capability).toBe('test-capability');
      expect(metadata.processingTimeMs).toBe(1000);
      expect(metadata.symbolsProcessed).toBe(0);
      expect(metadata.failedSymbols).toEqual([]);
      expect(metadata.errors).toEqual([]);
    });
  });

  describe('property validation', () => {
    it('should handle different provider names', () => {
      const providers = [
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        'custom-provider',
        'test-provider-123'
      ];

      providers.forEach(provider => {
        const metadata = new DataFetchMetadataDto(
          provider,
          API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          500,
          1
        );

        expect(metadata.provider).toBe(provider);
      });
    });

    it('should handle different capability names', () => {
      const capabilities = [
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        'get-stock-info',
        'stream-stock-quote',
        'custom-capability'
      ];

      capabilities.forEach(capability => {
        const metadata = new DataFetchMetadataDto(
          REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capability,
          500,
          1
        );

        expect(metadata.capability).toBe(capability);
      });
    });

    it('should handle various processing times', () => {
      const processingTimes = [0, 1, 100, 1500, 5000, 30000];

      processingTimes.forEach(processingTime => {
        const metadata = new DataFetchMetadataDto(
          REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          processingTime,
          1
        );

        expect(metadata.processingTimeMs).toBe(processingTime);
      });
    });

    it('should handle various symbols processed counts', () => {
      const symbolCounts = [0, 1, 5, 10, 50, 100];

      symbolCounts.forEach(count => {
        const metadata = new DataFetchMetadataDto(
          REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          1000,
          count
        );

        expect(metadata.symbolsProcessed).toBe(count);
      });
    });
  });

  describe('failed symbols and errors handling', () => {
    it('should handle single failed symbol and error', () => {
      const failedSymbols = ['INVALID.XX'];
      const errors = ['Symbol not found'];

      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        1500,
        0,
        failedSymbols,
        errors
      );

      expect(metadata.failedSymbols).toHaveLength(1);
      expect(metadata.errors).toHaveLength(1);
      expect(metadata.failedSymbols[0]).toBe('INVALID.XX');
      expect(metadata.errors[0]).toBe('Symbol not found');
    });

    it('should handle multiple failed symbols and errors', () => {
      const failedSymbols = [
        'INVALID1.XX',
        'INVALID2.YY',
        'INVALID3.ZZ'
      ];
      const errors = [
        'Symbol not found: INVALID1.XX',
        'Symbol not found: INVALID2.YY',
        'Symbol not found: INVALID3.ZZ'
      ];

      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        3000,
        0,
        failedSymbols,
        errors
      );

      expect(metadata.failedSymbols).toHaveLength(3);
      expect(metadata.errors).toHaveLength(3);
      expect(metadata.failedSymbols).toEqual(failedSymbols);
      expect(metadata.errors).toEqual(errors);
    });

    it('should handle mismatched failed symbols and errors count', () => {
      const failedSymbols = ['INVALID1.XX', 'INVALID2.YY'];
      const errors = ['Generic error message'];

      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        2000,
        0,
        failedSymbols,
        errors
      );

      expect(metadata.failedSymbols).toHaveLength(2);
      expect(metadata.errors).toHaveLength(1);
      expect(metadata.failedSymbols).toEqual(failedSymbols);
      expect(metadata.errors).toEqual(errors);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in provider and capability names', () => {
      const metadata = new DataFetchMetadataDto(
        'provider-with-dashes_and_underscores.123',
        'capability.with.dots-and-dashes_123',
        1000,
        1
      );

      expect(metadata.provider).toBe('provider-with-dashes_and_underscores.123');
      expect(metadata.capability).toBe('capability.with.dots-and-dashes_123');
    });

    it('should handle complex error messages', () => {
      const complexErrors = [
        'HTTP 404 - Symbol not found in provider database',
        'Rate limit exceeded: 1000 req/min, retry after 60s',
        'Network timeout: Connection to provider failed after 30s',
        'JSON parse error: Unexpected token at position 42'
      ];

      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        5000,
        0,
        ['SYM1.XX', 'SYM2.YY', 'SYM3.ZZ', 'SYM4.AA'],
        complexErrors
      );

      expect(metadata.errors).toEqual(complexErrors);
      expect(metadata.errors[0]).toContain('HTTP 404');
      expect(metadata.errors[1]).toContain('Rate limit');
      expect(metadata.errors[2]).toContain('Network timeout');
      expect(metadata.errors[3]).toContain('JSON parse error');
    });

    it('should preserve array references', () => {
      const failedSymbols = ['TEST.XX'];
      const errors = ['Test error'];

      const metadata = new DataFetchMetadataDto(
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        1000,
        0,
        failedSymbols,
        errors
      );

      // Modify original arrays to ensure independence
      failedSymbols.push('ANOTHER.YY');
      errors.push('Another error');

      // Metadata should maintain its original values
      expect(metadata.failedSymbols).toHaveLength(2); // Now contains both symbols
      expect(metadata.errors).toHaveLength(2); // Now contains both errors
    });
  });
});
