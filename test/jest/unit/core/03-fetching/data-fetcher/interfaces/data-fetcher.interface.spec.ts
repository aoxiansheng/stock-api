/**
 * DataFetcher 接口单元测试
 * 测试DataFetcher模块的接口定义和类型约束
 */

import {
  DataFetchParams,
  RawDataResult,
  IDataFetcher
} from '@core/03-fetching/data-fetcher/interfaces/data-fetcher.interface';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

// Mock implementation for testing interface
class MockDataFetcher implements IDataFetcher {
  async fetchRawData(params: DataFetchParams): Promise<RawDataResult> {
    return {
      data: [{ symbol: params.symbols[0], price: 100 }],
      metadata: {
        provider: params.provider,
        capability: params.capability,
        processingTimeMs: 1000,
        symbolsProcessed: params.symbols.length
      }
    };
  }

  async supportsCapability(provider: string, capability: string): Promise<boolean> {
    return provider === 'longport' && capability === 'get-stock-quote';
  }

  async getProviderContext(provider: string): Promise<any> {
    return { provider, initialized: true };
  }
}

describe('DataFetcher Interfaces', () => {
  describe('DataFetchParams interface', () => {
    it('should define correct structure for data fetch parameters', () => {
      const params: DataFetchParams = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, 'AAPL.US'],
        requestId: 'req_123456789',
        apiType: 'rest',
        contextService: null,
        options: { timeout: 5000 }
      };

      // Required fields
      expect(params.provider).toBeDefined();
      expect(params.capability).toBeDefined();
      expect(params.symbols).toBeDefined();
      expect(params.requestId).toBeDefined();

      // Optional fields
      expect(params.apiType).toBeDefined();
      expect(params.contextService).toBeDefined();
      expect(params.options).toBeDefined();
    });

    it('should support minimal required parameters', () => {
      const minimalParams: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-request-123'
      };

      expect(minimalParams.provider).toBe('test-provider');
      expect(minimalParams.capability).toBe('test-capability');
      expect(minimalParams.symbols).toEqual(['TEST.XX']);
      expect(minimalParams.requestId).toBe('test-request-123');
      expect(minimalParams.apiType).toBeUndefined();
      expect(minimalParams.contextService).toBeUndefined();
      expect(minimalParams.options).toBeUndefined();
    });

    it('should support both rest and stream apiType values', () => {
      const restParams: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-request-123',
        apiType: 'rest'
      };

      const streamParams: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-request-123',
        apiType: 'stream'
      };

      expect(restParams.apiType).toBe('rest');
      expect(streamParams.apiType).toBe('stream');
    });

    it('should support flexible options object', () => {
      const complexOptions = {
        timeout: 10000,
        retryCount: 3,
        cacheEnabled: true,
        metadata: {
          source: 'api',
          priority: 'high'
        },
        filters: ['real-time', 'extended-hours']
      };

      const params: DataFetchParams = {
        provider: 'test-provider',
        capability: 'test-capability',
        symbols: ['TEST.XX'],
        requestId: 'test-request-123',
        options: complexOptions
      };

      expect(params.options).toEqual(complexOptions);
      expect(params.options?.timeout).toBe(10000);
      expect(params.options?.metadata.source).toBe('api');
      expect(params.options?.filters).toContain('real-time');
    });
  });

  describe('RawDataResult interface', () => {
    it('should define correct structure for raw data result', () => {
      const result: RawDataResult = {
        data: [{ symbol: 'AAPL.US', price: 150.50 }],
        metadata: {
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          processingTimeMs: 1500,
          symbolsProcessed: 1
        }
      };

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBeDefined();
      expect(result.metadata.capability).toBeDefined();
      expect(result.metadata.processingTimeMs).toBeDefined();
      expect(result.metadata.symbolsProcessed).toBeDefined();
    });

    it('should support empty data array', () => {
      const emptyResult: RawDataResult = {
        data: [],
        metadata: {
          provider: 'test-provider',
          capability: 'test-capability',
          processingTimeMs: 500,
          symbolsProcessed: 0
        }
      };

      expect(emptyResult.data).toEqual([]);
      expect(emptyResult.metadata.symbolsProcessed).toBe(0);
    });

    it('should support optional metadata fields', () => {
      const resultWithErrors: RawDataResult = {
        data: [{ symbol: 'VALID.XX', price: 100 }],
        metadata: {
          provider: 'test-provider',
          capability: 'test-capability',
          processingTimeMs: 2000,
          symbolsProcessed: 1,
          failedSymbols: ['INVALID.YY'],
          errors: ['Symbol not found: INVALID.YY']
        }
      };

      expect(resultWithErrors.metadata.failedSymbols).toEqual(['INVALID.YY']);
      expect(resultWithErrors.metadata.errors).toEqual(['Symbol not found: INVALID.YY']);
    });

    it('should support complex nested data objects', () => {
      const complexData = [{
        symbol: 'AAPL.US',
        quote: {
          price: 150.50,
          volume: 1000000,
          indicators: {
            rsi: 65.5,
            macd: {
              value: 2.3,
              signal: 1.8
            }
          }
        },
        metadata: {
          lastUpdated: '2025-01-15T10:30:00Z',
          source: 'real-time'
        }
      }];

      const result: RawDataResult = {
        data: complexData,
        metadata: {
          provider: 'test-provider',
          capability: 'advanced-quote',
          processingTimeMs: 1200,
          symbolsProcessed: 1
        }
      };

      expect(result.data[0].quote.indicators.macd.value).toBe(2.3);
    });
  });

  describe('IDataFetcher interface', () => {
    let mockFetcher: IDataFetcher;

    beforeEach(() => {
      mockFetcher = new MockDataFetcher();
    });

    it('should implement fetchRawData method', async () => {
      const params: DataFetchParams = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        requestId: 'test-request-123'
      };

      const result = await mockFetcher.fetchRawData(params);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBe(params.provider);
      expect(result.metadata.capability).toBe(params.capability);
    });

    it('should implement supportsCapability method', async () => {
      const supported = await mockFetcher.supportsCapability('longport', 'get-stock-quote');
      const notSupported = await mockFetcher.supportsCapability('unknown', 'unknown-capability');

      expect(supported).toBe(true);
      expect(notSupported).toBe(false);
    });

    it('should implement getProviderContext method', async () => {
      const context = await mockFetcher.getProviderContext('longport');

      expect(context).toBeDefined();
      expect(context.provider).toBe('longport');
      expect(context.initialized).toBe(true);
    });

    it('should have all required interface methods', () => {
      expect(typeof mockFetcher.fetchRawData).toBe('function');
      expect(typeof mockFetcher.supportsCapability).toBe('function');
      expect(typeof mockFetcher.getProviderContext).toBe('function');
    });
  });

  describe('interface type validation', () => {
    it('should enforce proper typing for DataFetchParams', () => {
      // TypeScript should catch these at compile time
      // These tests verify the interface structure is correct

      const validParams: DataFetchParams = {
        provider: 'string',
        capability: 'string',
        symbols: ['array', 'of', 'strings'],
        requestId: 'string',
        apiType: 'rest', // Should only accept 'rest' | 'stream'
        contextService: {}, // Can be any object
        options: {} // Should be Record<string, any>
      };

      expect(validParams.provider).toEqual(expect.any(String));
      expect(validParams.capability).toEqual(expect.any(String));
      expect(Array.isArray(validParams.symbols)).toBe(true);
      expect(validParams.requestId).toEqual(expect.any(String));
    });

    it('should enforce proper typing for RawDataResult', () => {
      const validResult: RawDataResult = {
        data: [], // Should be any[]
        metadata: {
          provider: 'string',
          capability: 'string',
          processingTimeMs: 1000, // Should be number
          symbolsProcessed: 1, // Should be number
          failedSymbols: ['optional'], // Optional string[]
          errors: ['optional'] // Optional string[]
        }
      };

      expect(Array.isArray(validResult.data)).toBe(true);
      expect(typeof validResult.metadata.processingTimeMs).toBe('number');
      expect(typeof validResult.metadata.symbolsProcessed).toBe('number');
    });
  });
});
