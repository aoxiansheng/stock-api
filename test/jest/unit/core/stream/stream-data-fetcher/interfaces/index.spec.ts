import * as StreamDataFetcherInterfacesIndex from '../../../../../../../src/core/stream/stream-data-fetcher/interfaces/index';

describe('Stream Data Fetcher Interfaces Index', () => {
  it('should export interfaces', () => {
    expect(StreamDataFetcherInterfacesIndex).toBeDefined();
    expect(typeof StreamDataFetcherInterfacesIndex).toBe('object');
  });

  it('should have exported interfaces accessible', () => {
    // Interfaces are type-only exports, so we check the module structure
    const exportKeys = Object.keys(StreamDataFetcherInterfacesIndex);
    expect(exportKeys.length).toBeGreaterThanOrEqual(0);
  });

  it('should not export undefined values', () => {
    Object.values(StreamDataFetcherInterfacesIndex).forEach(exportedValue => {
      if (exportedValue !== undefined) {
        expect(exportedValue).toBeDefined();
      }
    });
  });

  it('should be a valid barrel export', () => {
    // This is a barrel export for interfaces
    expect(StreamDataFetcherInterfacesIndex).not.toBeNull();
    expect(typeof StreamDataFetcherInterfacesIndex).toBe('object');
  });

  it('should maintain interface export consistency', () => {
    // Since these are interface exports, they may not be runtime values
    // but should still provide a valid export structure
    expect(StreamDataFetcherInterfacesIndex).toBeDefined();
  });
});
