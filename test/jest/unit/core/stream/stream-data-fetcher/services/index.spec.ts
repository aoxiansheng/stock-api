import * as StreamDataFetcherServicesIndex from '../../../../../../../src/core/stream/stream-data-fetcher/services/index';
import { StreamDataFetcherService } from '../../../../../../../src/core/stream/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamConnectionImpl } from '../../../../../../../src/core/stream/stream-data-fetcher/services/stream-connection.impl';

describe('Stream Data Fetcher Services Index', () => {
  it('should export StreamDataFetcherService', () => {
    expect(StreamDataFetcherServicesIndex.StreamDataFetcherService).toBeDefined();
    expect(StreamDataFetcherServicesIndex.StreamDataFetcherService).toBe(StreamDataFetcherService);
  });

  it('should export StreamConnectionImpl', () => {
    expect(StreamDataFetcherServicesIndex.StreamConnectionImpl).toBeDefined();
    expect(StreamDataFetcherServicesIndex.StreamConnectionImpl).toBe(StreamConnectionImpl);
  });

  it('should export all expected services', () => {
    const expectedExports = ['StreamDataFetcherService', 'StreamConnectionImpl'];
    
    expectedExports.forEach(exportName => {
      expect(StreamDataFetcherServicesIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(StreamDataFetcherServicesIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports as constructors', () => {
    Object.values(StreamDataFetcherServicesIndex).forEach(exportedValue => {
      expect(typeof exportedValue).toBe('function');
    });
  });
});
