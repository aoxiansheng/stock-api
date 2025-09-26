import { ISymbolTransformer } from '@core/02-processing/symbol-transformer/interfaces/symbol-transformer.interface';
import { SymbolTransformResult } from '@core/02-processing/symbol-transformer/interfaces/symbol-transform-result.interface';
import { MappingDirection } from '@core/shared/constants/cache.constants';

describe('ISymbolTransformer Interface', () => {
  let mockTransformer: ISymbolTransformer;

  beforeEach(() => {
    mockTransformer = {
      transformSymbols: jest.fn(),
      transformSingleSymbol: jest.fn(),
    };
  });

  describe('Interface Structure', () => {
    it('should have transformSymbols method', () => {
      expect(mockTransformer.transformSymbols).toBeDefined();
      expect(typeof mockTransformer.transformSymbols).toBe('function');
    });

    it('should have transformSingleSymbol method', () => {
      expect(mockTransformer.transformSingleSymbol).toBeDefined();
      expect(typeof mockTransformer.transformSingleSymbol).toBe('function');
    });
  });

  describe('transformSymbols Method Contract', () => {
    it('should accept provider, symbols, and optional direction', async () => {
      const mockResult: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 100,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(mockResult);

      // Test with array of symbols
      const result1 = await mockTransformer.transformSymbols('longport', ['AAPL'], MappingDirection.TO_STANDARD);
      expect(result1).toBe(mockResult);

      // Test with single symbol string
      const result2 = await mockTransformer.transformSymbols('longport', 'AAPL', MappingDirection.FROM_STANDARD);
      expect(result2).toBe(mockResult);

      // Test with default direction (optional parameter)
      const result3 = await mockTransformer.transformSymbols('longport', ['AAPL']);
      expect(result3).toBe(mockResult);

      expect(mockTransformer.transformSymbols).toHaveBeenCalledTimes(3);
    });

    it('should return SymbolTransformResult', async () => {
      const expectedResult: SymbolTransformResult = {
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
          processingTimeMs: 250.5,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(expectedResult);

      const result = await mockTransformer.transformSymbols('longport', ['AAPL', 'GOOGL']);

      expect(result).toEqual(expectedResult);
      expect(result.mappedSymbols).toBeInstanceOf(Array);
      expect(result.mappingDetails).toBeInstanceOf(Object);
      expect(result.failedSymbols).toBeInstanceOf(Array);
      expect(result.metadata).toBeInstanceOf(Object);
    });
  });

  describe('transformSingleSymbol Method Contract', () => {
    it('should accept provider, symbol, and optional direction', async () => {
      (mockTransformer.transformSingleSymbol as jest.Mock).mockResolvedValue('AAPL.US');

      // Test with direction
      const result1 = await mockTransformer.transformSingleSymbol('longport', 'AAPL', MappingDirection.FROM_STANDARD);
      expect(result1).toBe('AAPL.US');

      // Test without direction (optional parameter)
      const result2 = await mockTransformer.transformSingleSymbol('longport', 'AAPL');
      expect(result2).toBe('AAPL.US');

      expect(mockTransformer.transformSingleSymbol).toHaveBeenCalledTimes(2);
    });

    it('should return string', async () => {
      (mockTransformer.transformSingleSymbol as jest.Mock).mockResolvedValue('AAPL.US');

      const result = await mockTransformer.transformSingleSymbol('longport', 'AAPL');

      expect(typeof result).toBe('string');
      expect(result).toBe('AAPL.US');
    });

    it('should handle transformation failures by returning original symbol', async () => {
      (mockTransformer.transformSingleSymbol as jest.Mock).mockResolvedValue('INVALID_SYMBOL');

      const result = await mockTransformer.transformSingleSymbol('longport', 'INVALID_SYMBOL');

      expect(result).toBe('INVALID_SYMBOL');
    });
  });

  describe('Method Parameter Validation', () => {
    it('should handle different provider values', async () => {
      const mockResult: SymbolTransformResult = {
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: [],
        metadata: {
          provider: '',
          totalSymbols: 0,
          successCount: 0,
          failedCount: 0,
          processingTimeMs: 0,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(mockResult);

      const providers = ['longport', 'futu', 'webull', 'tiger', 'custom-provider'];

      for (const provider of providers) {
        mockResult.metadata.provider = provider;
        await mockTransformer.transformSymbols(provider, ['AAPL']);
      }

      expect(mockTransformer.transformSymbols).toHaveBeenCalledTimes(providers.length);
    });

    it('should handle different symbol formats', async () => {
      const mockResult: SymbolTransformResult = {
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 0,
          successCount: 0,
          failedCount: 0,
          processingTimeMs: 0,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(mockResult);

      // Different symbol formats
      await mockTransformer.transformSymbols('longport', ['AAPL']); // US stock
      await mockTransformer.transformSymbols('longport', ['000001']); // CN stock
      await mockTransformer.transformSymbols('longport', ['700.HK']); // HK stock
      await mockTransformer.transformSymbols('longport', 'SINGLE_SYMBOL'); // Single string
      await mockTransformer.transformSymbols('longport', ['MULTI', 'SYMBOL', 'ARRAY']); // Multiple symbols

      expect(mockTransformer.transformSymbols).toHaveBeenCalledTimes(5);
    });

    it('should handle different mapping directions', async () => {
      const mockResult: SymbolTransformResult = {
        mappedSymbols: ['AAPL.US'],
        mappingDetails: { 'AAPL': 'AAPL.US' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 100,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(mockResult);

      // Test both mapping directions
      await mockTransformer.transformSymbols('longport', ['AAPL'], MappingDirection.TO_STANDARD);
      await mockTransformer.transformSymbols('longport', ['AAPL'], MappingDirection.FROM_STANDARD);

      expect(mockTransformer.transformSymbols).toHaveBeenCalledTimes(2);
      expect(mockTransformer.transformSymbols).toHaveBeenCalledWith('longport', ['AAPL'], MappingDirection.TO_STANDARD);
      expect(mockTransformer.transformSymbols).toHaveBeenCalledWith('longport', ['AAPL'], MappingDirection.FROM_STANDARD);
    });
  });

  describe('Return Type Validation', () => {
    it('should return valid SymbolTransformResult structure', async () => {
      const mockResult: SymbolTransformResult = {
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
          processingTimeMs: 150.25,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(mockResult);

      const result = await mockTransformer.transformSymbols('longport', ['AAPL', 'GOOGL', 'INVALID']);

      // Validate structure
      expect(result).toHaveProperty('mappedSymbols');
      expect(result).toHaveProperty('mappingDetails');
      expect(result).toHaveProperty('failedSymbols');
      expect(result).toHaveProperty('metadata');

      // Validate types
      expect(Array.isArray(result.mappedSymbols)).toBe(true);
      expect(typeof result.mappingDetails).toBe('object');
      expect(Array.isArray(result.failedSymbols)).toBe(true);
      expect(typeof result.metadata).toBe('object');

      // Validate metadata structure
      expect(result.metadata).toHaveProperty('provider');
      expect(result.metadata).toHaveProperty('totalSymbols');
      expect(result.metadata).toHaveProperty('successCount');
      expect(result.metadata).toHaveProperty('failedCount');
      expect(result.metadata).toHaveProperty('processingTimeMs');

      // Validate metadata types
      expect(typeof result.metadata.provider).toBe('string');
      expect(typeof result.metadata.totalSymbols).toBe('number');
      expect(typeof result.metadata.successCount).toBe('number');
      expect(typeof result.metadata.failedCount).toBe('number');
      expect(typeof result.metadata.processingTimeMs).toBe('number');
    });

    it('should handle empty results correctly', async () => {
      const emptyResult: SymbolTransformResult = {
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 0,
          successCount: 0,
          failedCount: 0,
          processingTimeMs: 5.0,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(emptyResult);

      const result = await mockTransformer.transformSymbols('longport', []);

      expect(result.mappedSymbols).toHaveLength(0);
      expect(Object.keys(result.mappingDetails)).toHaveLength(0);
      expect(result.failedSymbols).toHaveLength(0);
      expect(result.metadata.totalSymbols).toBe(0);
      expect(result.metadata.successCount).toBe(0);
      expect(result.metadata.failedCount).toBe(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle async method rejections', async () => {
      const error = new Error('Transformation failed');
      (mockTransformer.transformSymbols as jest.Mock).mockRejectedValue(error);

      await expect(mockTransformer.transformSymbols('longport', ['AAPL'])).rejects.toThrow('Transformation failed');
    });

    it('should handle single symbol transformation errors', async () => {
      const error = new Error('Single symbol transformation failed');
      (mockTransformer.transformSingleSymbol as jest.Mock).mockRejectedValue(error);

      await expect(mockTransformer.transformSingleSymbol('longport', 'AAPL')).rejects.toThrow('Single symbol transformation failed');
    });
  });

  describe('Interface Implementation Requirements', () => {
    it('should require all interface methods to be implemented', () => {
      // Attempt to create an incomplete implementation
      const incompleteImplementation = {
        transformSymbols: jest.fn(),
        // Missing transformSingleSymbol
      };

      // TypeScript would catch this at compile time, but we can test the structure
      expect(incompleteImplementation).toHaveProperty('transformSymbols');
      expect(incompleteImplementation).not.toHaveProperty('transformSingleSymbol');
    });

    it('should ensure method signatures match interface', () => {
      // Verify the mock has the correct method signatures
      expect(mockTransformer.transformSymbols).toBeDefined();
      expect(mockTransformer.transformSingleSymbol).toBeDefined();

      // Both should be functions
      expect(typeof mockTransformer.transformSymbols).toBe('function');
      expect(typeof mockTransformer.transformSingleSymbol).toBe('function');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large symbol arrays efficiently', async () => {
      const largeSymbolArray = new Array(1000).fill(0).map((_, i) => `SYMBOL${i}`);
      const mockResult: SymbolTransformResult = {
        mappedSymbols: largeSymbolArray.map(s => `${s}.US`),
        mappingDetails: largeSymbolArray.reduce((acc, symbol) => {
          acc[symbol] = `${symbol}.US`;
          return acc;
        }, {} as Record<string, string>),
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1000,
          successCount: 1000,
          failedCount: 0,
          processingTimeMs: 500.0,
        },
      };

      (mockTransformer.transformSymbols as jest.Mock).mockResolvedValue(mockResult);

      const startTime = Date.now();
      const result = await mockTransformer.transformSymbols('longport', largeSymbolArray);
      const endTime = Date.now();

      // Mock should execute quickly
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.mappedSymbols).toHaveLength(1000);
    });

    it('should handle concurrent transformations', async () => {
      (mockTransformer.transformSingleSymbol as jest.Mock)
        .mockResolvedValueOnce('AAPL.US')
        .mockResolvedValueOnce('GOOGL.US')
        .mockResolvedValueOnce('MSFT.US');

      const promises = [
        mockTransformer.transformSingleSymbol('longport', 'AAPL'),
        mockTransformer.transformSingleSymbol('longport', 'GOOGL'),
        mockTransformer.transformSingleSymbol('longport', 'MSFT'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(['AAPL.US', 'GOOGL.US', 'MSFT.US']);
      expect(mockTransformer.transformSingleSymbol).toHaveBeenCalledTimes(3);
    });
  });
});