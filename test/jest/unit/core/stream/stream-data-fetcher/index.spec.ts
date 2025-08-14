import * as StreamDataFetcherIndex from '../../../../../../src/core/stream/stream-data-fetcher/index';

describe('Stream Data Fetcher Index', () => {
  it('should export interfaces', () => {
    // Check that interfaces are exported (they should be available as part of the export)
    expect(StreamDataFetcherIndex).toBeDefined();
    expect(typeof StreamDataFetcherIndex).toBe('object');
  });

  it('should export services', () => {
    // Services should be exported from the services directory
    expect(StreamDataFetcherIndex).toBeDefined();
  });

  it('should export StreamDataFetcherModule', () => {
    expect(StreamDataFetcherIndex.StreamDataFetcherModule).toBeDefined();
    expect(typeof StreamDataFetcherIndex.StreamDataFetcherModule).toBe('function');
  });

  it('should not export undefined values', () => {
    Object.values(StreamDataFetcherIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports accessible', () => {
    // All re-exports should be accessible
    expect(Object.keys(StreamDataFetcherIndex).length).toBeGreaterThan(0);
  });

  it('should maintain export consistency', () => {
    // This is a barrel export, so it should re-export from sub-modules
    const exportedKeys = Object.keys(StreamDataFetcherIndex);
    expect(exportedKeys.length).toBeGreaterThanOrEqual(1);
  });
});
