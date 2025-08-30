import  DataFetcherDtoIndex from '../../../../../../../src/core/03-fetching/data-fetcher/dto/index';
import { DataFetchRequestDto } from '../../../../../../../src/core/03-fetching/data-fetcher/dto/data-fetch-request.dto';
import { DataFetchResponseDto } from '../../../../../../../src/core/03-fetching/data-fetcher/dto/data-fetch-response.dto';

describe('Data Fetcher DTO Index', () => {
  it('should export DataFetchRequestDto', () => {
    expect(DataFetcherDtoIndex.DataFetchRequestDto).toBeDefined();
    expect(DataFetcherDtoIndex.DataFetchRequestDto).toBe(DataFetchRequestDto);
  });

  it('should export DataFetchResponseDto', () => {
    expect(DataFetcherDtoIndex.DataFetchResponseDto).toBeDefined();
    expect(DataFetcherDtoIndex.DataFetchResponseDto).toBe(DataFetchResponseDto);
  });

  it('should export all expected DTOs', () => {
    const expectedExports = ['DataFetchRequestDto', 'DataFetchResponseDto'];
    
    expectedExports.forEach(exportName => {
      expect(DataFetcherDtoIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(DataFetcherDtoIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports as constructors', () => {
    Object.values(DataFetcherDtoIndex).forEach(exportedValue => {
      expect(typeof exportedValue).toBe('function');
    });
  });

  it('should support DTO class references', () => {
    expect(DataFetcherDtoIndex.DataFetchRequestDto).toBeInstanceOf(Function);
    expect(DataFetcherDtoIndex.DataFetchResponseDto).toBeInstanceOf(Function);
  });
});
