/**
 * DataFetcher DTO Index 单元测试
 * 测试DTO导出的完整性和正确性
 */

import * as DTOIndex from '@core/03-fetching/data-fetcher/dto/index';
import { DataFetchRequestDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-request.dto';
import { DataFetchResponseDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-response.dto';
import { DataFetchMetadataDto } from '@core/03-fetching/data-fetcher/dto/data-fetch-metadata.dto';

describe('DataFetcher DTO Index', () => {
  describe('exports validation', () => {
    it('should export DataFetchRequestDto', () => {
      expect(DTOIndex.DataFetchRequestDto).toBeDefined();
      expect(DTOIndex.DataFetchRequestDto).toBe(DataFetchRequestDto);
    });

    it('should export DataFetchResponseDto', () => {
      expect(DTOIndex.DataFetchResponseDto).toBeDefined();
      expect(DTOIndex.DataFetchResponseDto).toBe(DataFetchResponseDto);
    });

    it('should export DataFetchMetadataDto', () => {
      expect(DTOIndex.DataFetchMetadataDto).toBeDefined();
      expect(DTOIndex.DataFetchMetadataDto).toBe(DataFetchMetadataDto);
    });
  });

  describe('export completeness', () => {
    it('should export all expected DTO classes', () => {
      const exportedKeys = Object.keys(DTOIndex);
      const expectedExports = [
        'DataFetchRequestDto',
        'DataFetchResponseDto',
        'DataFetchMetadataDto'
      ];

      expectedExports.forEach(expectedExport => {
        expect(exportedKeys).toContain(expectedExport);
      });
    });

    it('should only export expected classes (no unexpected exports)', () => {
      const exportedKeys = Object.keys(DTOIndex);
      const expectedExports = [
        'DataFetchRequestDto',
        'DataFetchResponseDto',
        'DataFetchMetadataDto'
      ];

      expect(exportedKeys.sort()).toEqual(expectedExports.sort());
    });
  });

  describe('exported class functionality', () => {
    it('should be able to instantiate DataFetchRequestDto', () => {
      expect(() => new DTOIndex.DataFetchRequestDto()).not.toThrow();
    });

    it('should be able to instantiate DataFetchMetadataDto', () => {
      expect(() => new DTOIndex.DataFetchMetadataDto(
        'test-provider',
        'test-capability',
        1000,
        1
      )).not.toThrow();
    });

    it('should be able to instantiate DataFetchResponseDto', () => {
      const metadata = new DTOIndex.DataFetchMetadataDto(
        'test-provider',
        'test-capability',
        1000,
        1
      );

      expect(() => new DTOIndex.DataFetchResponseDto(
        [{ test: 'data' }],
        metadata
      )).not.toThrow();
    });
  });

  describe('static method exports', () => {
    it('should export static methods from DataFetchResponseDto', () => {
      expect(DTOIndex.DataFetchResponseDto.success).toBeDefined();
      expect(DTOIndex.DataFetchResponseDto.partialSuccess).toBeDefined();
      expect(typeof DTOIndex.DataFetchResponseDto.success).toBe('function');
      expect(typeof DTOIndex.DataFetchResponseDto.partialSuccess).toBe('function');
    });

    it('should be able to use static methods', () => {
      const successResponse = DTOIndex.DataFetchResponseDto.success(
        [{ test: 'data' }],
        'test-provider',
        'test-capability',
        1000,
        1
      );

      expect(successResponse).toBeInstanceOf(DTOIndex.DataFetchResponseDto);
      expect(successResponse.hasPartialFailures).toBe(false);
    });
  });

  describe('import consistency', () => {
    it('should maintain consistent exports with individual imports', () => {
      // Verify that importing from index gives same result as individual imports
      expect(DTOIndex.DataFetchRequestDto).toBe(DataFetchRequestDto);
      expect(DTOIndex.DataFetchResponseDto).toBe(DataFetchResponseDto);
      expect(DTOIndex.DataFetchMetadataDto).toBe(DataFetchMetadataDto);
    });

    it('should maintain constructor signatures', () => {
      // Test that constructors work the same way when imported from index
      const metadata1 = new DataFetchMetadataDto('provider', 'capability', 1000, 1);
      const metadata2 = new DTOIndex.DataFetchMetadataDto('provider', 'capability', 1000, 1);

      expect(metadata1.provider).toBe(metadata2.provider);
      expect(metadata1.capability).toBe(metadata2.capability);
      expect(metadata1.processingTimeMs).toBe(metadata2.processingTimeMs);
      expect(metadata1.symbolsProcessed).toBe(metadata2.symbolsProcessed);
    });
  });
});
