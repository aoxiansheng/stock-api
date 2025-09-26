import {
  SymbolTransformResult,
  SymbolTransformForProviderResult,
} from '@core/02-processing/symbol-transformer/interfaces/symbol-transform-result.interface';

describe('SymbolTransformResult Interface', () => {
  describe('SymbolTransformResult Structure', () => {
    it('should have all required properties', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          'GOOGL': 'GOOGL.US',
        },
        failedSymbols: ['INVALID'],
        metadata: {
          provider: 'longport',
          totalSymbols: 3,
          successCount: 2,
          failedCount: 1,
          processingTimeMs: 150.5,
        },
      };

      expect(result).toHaveProperty('mappedSymbols');
      expect(result).toHaveProperty('mappingDetails');
      expect(result).toHaveProperty('failedSymbols');
      expect(result).toHaveProperty('metadata');
    });

    it('should have correct property types', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 100.25,
        },
      };

      expect(Array.isArray(result.mappedSymbols)).toBe(true);
      expect(typeof result.mappingDetails).toBe('object');
      expect(Array.isArray(result.failedSymbols)).toBe(true);
      expect(typeof result.metadata).toBe('object');
      expect(typeof result.metadata.provider).toBe('string');
      expect(typeof result.metadata.totalSymbols).toBe('number');
      expect(typeof result.metadata.successCount).toBe('number');
      expect(typeof result.metadata.failedCount).toBe('number');
      expect(typeof result.metadata.processingTimeMs).toBe('number');
    });

    it('should handle empty mappedSymbols array', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: ['INVALID1', 'INVALID2'],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 0,
          failedCount: 2,
          processingTimeMs: 50.0,
        },
      };

      expect(result.mappedSymbols).toHaveLength(0);
      expect(Object.keys(result.mappingDetails)).toHaveLength(0);
      expect(result.failedSymbols).toHaveLength(2);
      expect(result.metadata.successCount).toBe(0);
      expect(result.metadata.failedCount).toBe(2);
    });

    it('should handle empty failedSymbols array', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          'GOOGL': 'GOOGL.US',
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: 200.75,
        },
      };

      expect(result.mappedSymbols).toHaveLength(2);
      expect(Object.keys(result.mappingDetails)).toHaveLength(2);
      expect(result.failedSymbols).toHaveLength(0);
      expect(result.metadata.successCount).toBe(2);
      expect(result.metadata.failedCount).toBe(0);
    });
  });

  describe('Metadata Validation', () => {
    it('should have consistent counts in metadata', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          'GOOGL': 'GOOGL.US',
        },
        failedSymbols: ['INVALID'],
        metadata: {
          provider: 'longport',
          totalSymbols: 3,
          successCount: 2,
          failedCount: 1,
          processingTimeMs: 125.0,
        },
      };

      // Verify counts are consistent
      expect(result.metadata.totalSymbols).toBe(result.metadata.successCount + result.metadata.failedCount);
      expect(result.metadata.successCount).toBe(result.mappedSymbols.length);
      expect(result.metadata.successCount).toBe(Object.keys(result.mappingDetails).length);
      expect(result.metadata.failedCount).toBe(result.failedSymbols.length);
    });

    it('should handle zero processing time', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 0.0,
        },
      };

      expect(result.metadata.processingTimeMs).toBe(0.0);
    });

    it('should handle fractional processing time', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 12.345,
        },
      };

      expect(result.metadata.processingTimeMs).toBe(12.345);
    });
  });

  describe('Mapping Details Structure', () => {
    it('should have key-value pairs in mappingDetails', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingDetails: {
          'AAPL': 'AAPL.US',
          'GOOGL': 'GOOGL.US',
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: 100.0,
        },
      };

      expect(result.mappingDetails['AAPL']).toBe('AAPL.US');
      expect(result.mappingDetails['GOOGL']).toBe('GOOGL.US');
      expect(Object.keys(result.mappingDetails)).toContain('AAPL');
      expect(Object.keys(result.mappingDetails)).toContain('GOOGL');
      expect(Object.values(result.mappingDetails)).toContain('AAPL.US');
      expect(Object.values(result.mappingDetails)).toContain('GOOGL.US');
    });

    it('should handle mappingDetails with special characters', () => {
      const result: SymbolTransformResult = {
        mappedSymbols: ['700.HK', 'BRK-A.US'],
        mappingDetails: {
          '0700': '700.HK',
          'BRK.A': 'BRK-A.US',
        },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 2,
          successCount: 2,
          failedCount: 0,
          processingTimeMs: 80.0,
        },
      };

      expect(result.mappingDetails['0700']).toBe('700.HK');
      expect(result.mappingDetails['BRK.A']).toBe('BRK-A.US');
    });
  });
});

describe('SymbolTransformForProviderResult Interface', () => {
  describe('SymbolTransformForProviderResult Structure', () => {
    it('should have all required properties', () => {
      const result: SymbolTransformForProviderResult = {
        transformedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingResults: {
          transformedSymbols: {
            'AAPL': 'AAPL.US',
            'GOOGL': 'GOOGL.US',
          },
          failedSymbols: ['INVALID'],
          metadata: {
            provider: 'longport',
            totalSymbols: 3,
            successfulTransformations: 2,
            failedTransformations: 1,
            processingTimeMs: 150.0,
          },
        },
      };

      expect(result).toHaveProperty('transformedSymbols');
      expect(result).toHaveProperty('mappingResults');
      expect(result.mappingResults).toHaveProperty('transformedSymbols');
      expect(result.mappingResults).toHaveProperty('failedSymbols');
      expect(result.mappingResults).toHaveProperty('metadata');
    });

    it('should have correct property types', () => {
      const result: SymbolTransformForProviderResult = {
        transformedSymbols: ['AAPL.US'],
        mappingResults: {
          transformedSymbols: { 'AAPL': 'AAPL.US' },
          failedSymbols: [],
          metadata: {
            provider: 'longport',
            totalSymbols: 1,
            successfulTransformations: 1,
            failedTransformations: 0,
            processingTimeMs: 75.25,
          },
        },
      };

      expect(Array.isArray(result.transformedSymbols)).toBe(true);
      expect(typeof result.mappingResults).toBe('object');
      expect(typeof result.mappingResults.transformedSymbols).toBe('object');
      expect(Array.isArray(result.mappingResults.failedSymbols)).toBe(true);
      expect(typeof result.mappingResults.metadata).toBe('object');
      expect(typeof result.mappingResults.metadata.provider).toBe('string');
      expect(typeof result.mappingResults.metadata.totalSymbols).toBe('number');
      expect(typeof result.mappingResults.metadata.successfulTransformations).toBe('number');
      expect(typeof result.mappingResults.metadata.failedTransformations).toBe('number');
      expect(typeof result.mappingResults.metadata.processingTimeMs).toBe('number');
    });

    it('should handle empty transformedSymbols array', () => {
      const result: SymbolTransformForProviderResult = {
        transformedSymbols: [],
        mappingResults: {
          transformedSymbols: {},
          failedSymbols: ['INVALID1', 'INVALID2'],
          metadata: {
            provider: 'longport',
            totalSymbols: 2,
            successfulTransformations: 0,
            failedTransformations: 2,
            processingTimeMs: 30.0,
          },
        },
      };

      expect(result.transformedSymbols).toHaveLength(0);
      expect(Object.keys(result.mappingResults.transformedSymbols)).toHaveLength(0);
      expect(result.mappingResults.failedSymbols).toHaveLength(2);
      expect(result.mappingResults.metadata.successfulTransformations).toBe(0);
      expect(result.mappingResults.metadata.failedTransformations).toBe(2);
    });

    it('should handle empty failedSymbols array', () => {
      const result: SymbolTransformForProviderResult = {
        transformedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingResults: {
          transformedSymbols: {
            'AAPL': 'AAPL.US',
            'GOOGL': 'GOOGL.US',
          },
          failedSymbols: [],
          metadata: {
            provider: 'longport',
            totalSymbols: 2,
            successfulTransformations: 2,
            failedTransformations: 0,
            processingTimeMs: 120.0,
          },
        },
      };

      expect(result.transformedSymbols).toHaveLength(2);
      expect(Object.keys(result.mappingResults.transformedSymbols)).toHaveLength(2);
      expect(result.mappingResults.failedSymbols).toHaveLength(0);
      expect(result.mappingResults.metadata.successfulTransformations).toBe(2);
      expect(result.mappingResults.metadata.failedTransformations).toBe(0);
    });
  });

  describe('Nested Metadata Validation', () => {
    it('should have consistent counts in nested metadata', () => {
      const result: SymbolTransformForProviderResult = {
        transformedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingResults: {
          transformedSymbols: {
            'AAPL': 'AAPL.US',
            'GOOGL': 'GOOGL.US',
          },
          failedSymbols: ['INVALID'],
          metadata: {
            provider: 'longport',
            totalSymbols: 3,
            successfulTransformations: 2,
            failedTransformations: 1,
            processingTimeMs: 180.5,
          },
        },
      };

      // Verify counts are consistent
      const metadata = result.mappingResults.metadata;
      expect(metadata.totalSymbols).toBe(metadata.successfulTransformations + metadata.failedTransformations);
      expect(metadata.successfulTransformations).toBe(result.transformedSymbols.length);
      expect(metadata.successfulTransformations).toBe(Object.keys(result.mappingResults.transformedSymbols).length);
      expect(metadata.failedTransformations).toBe(result.mappingResults.failedSymbols.length);
    });
  });

  describe('Dual Symbol Arrays Structure', () => {
    it('should have consistent data between transformedSymbols array and mapping object', () => {
      const result: SymbolTransformForProviderResult = {
        transformedSymbols: ['AAPL.US', 'GOOGL.US'],
        mappingResults: {
          transformedSymbols: {
            'AAPL': 'AAPL.US',
            'GOOGL': 'GOOGL.US',
          },
          failedSymbols: [],
          metadata: {
            provider: 'longport',
            totalSymbols: 2,
            successfulTransformations: 2,
            failedTransformations: 0,
            processingTimeMs: 95.0,
          },
        },
      };

      const mappingValues = Object.values(result.mappingResults.transformedSymbols);

      // transformedSymbols array should contain the same values as mapping object values
      expect(result.transformedSymbols).toHaveLength(mappingValues.length);
      result.transformedSymbols.forEach(symbol => {
        expect(mappingValues).toContain(symbol);
      });
    });
  });
});

describe('Interface Comparison', () => {
  it('should show differences between SymbolTransformResult and SymbolTransformForProviderResult', () => {
    // SymbolTransformResult uses different property names than SymbolTransformForProviderResult
    const transformResult: SymbolTransformResult = {
      mappedSymbols: ['AAPL.US'],
      mappingDetails: { 'AAPL': 'AAPL.US' },
      failedSymbols: [],
      metadata: {
        provider: 'longport',
        totalSymbols: 1,
        successCount: 1,      // Different from successfulTransformations
        failedCount: 0,       // Different from failedTransformations
        processingTimeMs: 100,
      },
    };

    const providerResult: SymbolTransformForProviderResult = {
      transformedSymbols: ['AAPL.US'],
      mappingResults: {
        transformedSymbols: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successfulTransformations: 1,  // Different from successCount
          failedTransformations: 0,      // Different from failedCount
          processingTimeMs: 100,
        },
      },
    };

    // Verify structural differences
    expect(transformResult).toHaveProperty('mappedSymbols');
    expect(transformResult).toHaveProperty('mappingDetails');
    expect(providerResult).toHaveProperty('transformedSymbols');
    expect(providerResult.mappingResults).toHaveProperty('transformedSymbols');

    // Verify metadata property name differences
    expect(transformResult.metadata).toHaveProperty('successCount');
    expect(transformResult.metadata).toHaveProperty('failedCount');
    expect(providerResult.mappingResults.metadata).toHaveProperty('successfulTransformations');
    expect(providerResult.mappingResults.metadata).toHaveProperty('failedTransformations');
  });
});

describe('Interface Usage Scenarios', () => {
  it('should handle large datasets in both interface types', () => {
    const largeSymbolArray = new Array(1000).fill(0).map((_, i) => `SYMBOL${i}.US`);
    const largeMappingDetails = largeSymbolArray.reduce((acc, symbol, index) => {
      acc[`SYMBOL${index}`] = symbol;
      return acc;
    }, {} as Record<string, string>);

    const transformResult: SymbolTransformResult = {
      mappedSymbols: largeSymbolArray,
      mappingDetails: largeMappingDetails,
      failedSymbols: [],
      metadata: {
        provider: 'longport',
        totalSymbols: 1000,
        successCount: 1000,
        failedCount: 0,
        processingTimeMs: 500.0,
      },
    };

    const providerResult: SymbolTransformForProviderResult = {
      transformedSymbols: largeSymbolArray,
      mappingResults: {
        transformedSymbols: largeMappingDetails,
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1000,
          successfulTransformations: 1000,
          failedTransformations: 0,
          processingTimeMs: 500.0,
        },
      },
    };

    expect(transformResult.mappedSymbols).toHaveLength(1000);
    expect(Object.keys(transformResult.mappingDetails)).toHaveLength(1000);
    expect(providerResult.transformedSymbols).toHaveLength(1000);
    expect(Object.keys(providerResult.mappingResults.transformedSymbols)).toHaveLength(1000);
  });

  it('should handle edge cases with special symbol formats', () => {
    const specialSymbols = ['BRK.A', 'BRK-B', '700.HK', 'GOOG-L'];
    const transformedSymbols = ['BRK.A.US', 'BRK-B.US', '700.HK', 'GOOGL.US'];

    const mappingDetails = {
      'BRK.A': 'BRK.A.US',
      'BRK-B': 'BRK-B.US',
      '700.HK': '700.HK',
      'GOOG-L': 'GOOGL.US',
    };

    const transformResult: SymbolTransformResult = {
      mappedSymbols: transformedSymbols,
      mappingDetails,
      failedSymbols: [],
      metadata: {
        provider: 'longport',
        totalSymbols: 4,
        successCount: 4,
        failedCount: 0,
        processingTimeMs: 85.75,
      },
    };

    const providerResult: SymbolTransformForProviderResult = {
      transformedSymbols: transformedSymbols,
      mappingResults: {
        transformedSymbols: mappingDetails,
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 4,
          successfulTransformations: 4,
          failedTransformations: 0,
          processingTimeMs: 85.75,
        },
      },
    };

    expect(transformResult.mappingDetails['BRK.A']).toBe('BRK.A.US');
    expect(transformResult.mappingDetails['BRK-B']).toBe('BRK-B.US');
    expect(providerResult.mappingResults.transformedSymbols['700.HK']).toBe('700.HK');
    expect(providerResult.mappingResults.transformedSymbols['GOOG-L']).toBe('GOOGL.US');
  });
});