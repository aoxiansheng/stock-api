import {
  buildCacheOrchestratorRequest,
  buildUnifiedCacheKey,
  createStableSymbolsHash,
  extractMarketFromSymbols,
  inferMarketFromSymbol,
} from '../../../../../../../src/core/public/smart-cache/utils/cache-request.utils';
import {
  CacheStrategy,
} from '../../../../../../../src/core/public/smart-cache/interfaces/cache-orchestrator.interface';
import { Market } from '../../../../../../../src/common/constants/market.constants';

describe('Cache Request Utils', () => {
  describe('createStableSymbolsHash', () => {
    it('should generate consistent hash for same symbols in same order', () => {
      const symbols = ['700.HK', 'AAPL', '000001.SZ'];
      const hash1 = createStableSymbolsHash(symbols);
      const hash2 = createStableSymbolsHash(symbols);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{16}$/); // 16-char hex string
    });

    it('should generate consistent hash for same symbols in different order', () => {
      const symbols1 = ['700.HK', 'AAPL', '000001.SZ'];
      const symbols2 = ['AAPL', '000001.SZ', '700.HK'];
      const hash1 = createStableSymbolsHash(symbols1);
      const hash2 = createStableSymbolsHash(symbols2);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different symbols', () => {
      const symbols1 = ['700.HK', 'AAPL'];
      const symbols2 = ['700.HK', 'TSLA'];
      const hash1 = createStableSymbolsHash(symbols1);
      const hash2 = createStableSymbolsHash(symbols2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty array', () => {
      expect(() => createStableSymbolsHash([])).toThrow('符号列表不能为空');
    });

    it('should handle single symbol', () => {
      const hash = createStableSymbolsHash(['700.HK']);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should handle symbols with special characters', () => {
      const symbols = ['BRK-A', 'BRK.B', '600000.SH'];
      const hash = createStableSymbolsHash(symbols);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('buildUnifiedCacheKey', () => {
    it('should build cache key for single symbol', () => {
      const symbols = ['700.HK'];
      const prefix = 'get-stock-quote:longport';

      const cacheKey = buildUnifiedCacheKey(prefix, symbols);
      expect(cacheKey).toBe('get-stock-quote:longport:700.HK');
    });

    it('should build cache key for multiple symbols (≤5)', () => {
      const symbols = ['700.HK', 'AAPL'];
      const prefix = 'get-stock-quote:longport';

      const cacheKey = buildUnifiedCacheKey(prefix, symbols);
      expect(cacheKey).toBe('get-stock-quote:longport:700.HK|AAPL');
    });

    it('should build cache key with additional parameters', () => {
      const symbols = ['700.HK'];
      const prefix = 'get-stock-quote:longport';
      const additionalParams = {
        queryId: 'test-123',
      };

      const cacheKey = buildUnifiedCacheKey(prefix, symbols, additionalParams);
      expect(cacheKey).toBe('get-stock-quote:longport:700.HK:queryId:test-123');
    });

    it('should build cache key for many symbols using hash', () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META']; // 6 symbols
      const prefix = 'get-stock-quote:longport';

      const cacheKey = buildUnifiedCacheKey(prefix, symbols);
      expect(cacheKey).toMatch(/^get-stock-quote:longport:hash:[a-f0-9]{16}$/);
    });

    it('should handle different providers', () => {
      const symbols = ['AAPL'];
      const prefix = 'get-stock-quote:itick';

      const cacheKey = buildUnifiedCacheKey(prefix, symbols);
      expect(cacheKey).toBe('get-stock-quote:itick:AAPL');
    });

    it('should handle special characters in additional params', () => {
      const symbols = ['BRK-A'];
      const prefix = 'get-stock:quote:long-port';
      const additionalParams = {
        queryId: 'test:query-789',
      };

      const cacheKey = buildUnifiedCacheKey(prefix, symbols, additionalParams);
      expect(cacheKey).toBe('get-stock:quote:long-port:BRK-A:queryId:test:query-789');
    });

    it('should throw error for empty prefix', () => {
      const symbols = ['700.HK'];
      const prefix = '';

      expect(() => buildUnifiedCacheKey(prefix, symbols)).toThrow('缓存键前缀不能为空');
    });

    it('should throw error for empty symbols', () => {
      const symbols: string[] = [];
      const prefix = 'get-stock-quote:longport';

      expect(() => buildUnifiedCacheKey(prefix, symbols)).toThrow('符号列表不能为空');
    });
  });

  describe('inferMarketFromSymbol', () => {
    it('should infer HK market correctly', () => {
      expect(inferMarketFromSymbol('700.HK')).toBe(Market.HK);
      expect(inferMarketFromSymbol('00700.HK')).toBe(Market.HK);
      expect(inferMarketFromSymbol('9988.HK')).toBe(Market.HK);
    });

    it('should infer US market correctly', () => {
      expect(inferMarketFromSymbol('AAPL')).toBe(Market.US);
      expect(inferMarketFromSymbol('TSLA')).toBe(Market.US);
      expect(inferMarketFromSymbol('MSFT')).toBe(Market.US);
      expect(inferMarketFromSymbol('GOOGL')).toBe(Market.US);
    });

    it('should infer SH market correctly', () => {
      expect(inferMarketFromSymbol('600000.SH')).toBe(Market.SH);
      expect(inferMarketFromSymbol('600519.SH')).toBe(Market.SH);
      expect(inferMarketFromSymbol('688001.SH')).toBe(Market.SH);
    });

    it('should infer SZ market correctly', () => {
      expect(inferMarketFromSymbol('000001.SZ')).toBe(Market.SZ);
      expect(inferMarketFromSymbol('000002.SZ')).toBe(Market.SZ);
      expect(inferMarketFromSymbol('300001.SZ')).toBe(Market.SZ);
    });

    it('should handle edge cases', () => {
      expect(inferMarketFromSymbol('')).toBe(Market.US); // Default fallback
      expect(inferMarketFromSymbol('UNKNOWN')).toBe(Market.US);
      expect(inferMarketFromSymbol('123')).toBe(Market.US);
    });

    it('should handle case sensitivity', () => {
      expect(inferMarketFromSymbol('700.hk')).toBe(Market.HK);
      expect(inferMarketFromSymbol('600000.sh')).toBe(Market.SH);
      expect(inferMarketFromSymbol('000001.sz')).toBe(Market.SZ);
      expect(inferMarketFromSymbol('aapl')).toBe(Market.US);
    });
  });

  describe('extractMarketFromSymbols', () => {
    it('should extract market from first symbol', () => {
      const symbols = ['700.HK', 'AAPL', '000001.SZ', '600000.SH', 'TSLA'];
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('HK'); // Returns string based on first symbol
    });

    it('should handle HK symbols', () => {
      const symbols = ['700.HK', '9988.HK', '0005.HK'];
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('HK');
    });

    it('should handle empty array', () => {
      const market = extractMarketFromSymbols([]);
      expect(market).toBe('UNKNOWN');
    });

    it('should handle US symbols', () => {
      const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL'];
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('US');
    });

    it('should handle SZ symbols', () => {
      const symbols = ['000001.SZ', '300001.SZ'];
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('SZ');
    });

    it('should handle SH symbols', () => {
      const symbols = ['600000.SH', '688001.SH'];
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('SH');
    });

    it('should infer market from numeric format', () => {
      const symbols = ['000001']; // No suffix, should infer SZ
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('SZ');
    });

    it('should handle unknown symbols', () => {
      const symbols = ['UNKNOWN_SYMBOL'];
      const market = extractMarketFromSymbols(symbols);
      
      expect(market).toBe('UNKNOWN');
    });
  });

  describe('buildCacheOrchestratorRequest', () => {
    const mockExecuteOriginalDataFlow = jest.fn().mockResolvedValue({ data: 'test' });
    const mockMarketStatus = {
      [Market.HK]: {
        market: Market.HK,
        status: 'TRADING',
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'Asia/Hong_Kong',
        realtimeCacheTTL: 5,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 0.9,
      },
    };

    beforeEach(() => {
      mockExecuteOriginalDataFlow.mockClear();
    });

    it('should build complete orchestrator request', () => {
      const options = {
        symbols: ['700.HK', 'AAPL'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'test-123',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request).toEqual({
        cacheKey: expect.stringMatching(/^receiver:get-stock-quote:700\.HK\|AAPL:provider:longport$/),
        strategy: CacheStrategy.STRONG_TIMELINESS,
        symbols: ['700.HK', 'AAPL'],
        fetchFn: mockExecuteOriginalDataFlow,
        metadata: {
          marketStatus: mockMarketStatus,
          provider: 'longport',
          receiverType: 'get-stock-quote',
          queryId: 'test-123',
        },
      });
    });

    it('should generate stable cache key for same inputs', () => {
      const options = {
        symbols: ['700.HK', 'AAPL'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'test-123',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request1 = buildCacheOrchestratorRequest(options);
      const request2 = buildCacheOrchestratorRequest(options);

      expect(request1.cacheKey).toBe(request2.cacheKey);
    });

    it('should handle different strategies', () => {
      const options = {
        symbols: ['600000.SH'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'test-456',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.MARKET_AWARE,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request.strategy).toBe(CacheStrategy.MARKET_AWARE);
      expect(request.cacheKey).toBe('receiver:get-stock-quote:600000.SH:provider:longport');
    });

    it('should handle request without queryId', () => {
      const options = {
        symbols: ['000001.SZ'],
        receiverType: 'get-stock-candle',
        provider: 'itick',
        queryId: '',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.WEAK_TIMELINESS,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request.cacheKey).toBe('receiver:get-stock-candle:000001.SZ:provider:itick');
      expect(request.cacheKey).not.toContain('::');
    });

    it('should preserve fetchFn reference', () => {
      const customFetchFn = jest.fn().mockResolvedValue({ custom: 'data' });
      const options = {
        symbols: ['TSLA'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'test-789',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.NO_CACHE,
        executeOriginalDataFlow: customFetchFn,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request.fetchFn).toBe(customFetchFn);
    });

    it('should include all metadata correctly', () => {
      const options = {
        symbols: ['MSFT'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'metadata-test',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.ADAPTIVE,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request.metadata).toEqual({
        marketStatus: mockMarketStatus,
        provider: 'longport',
        receiverType: 'get-stock-quote',
        queryId: 'metadata-test',
      });
    });

    it('should handle single symbol correctly', () => {
      const options = {
        symbols: ['GOOGL'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'single-symbol',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request.symbols).toEqual(['GOOGL']);
      expect(request.cacheKey).toBe('receiver:get-stock-quote:GOOGL:provider:longport');
    });

    it('should handle multiple symbols with different markets', () => {
      const options = {
        symbols: ['700.HK', 'AAPL', '000001.SZ', '600000.SH'],
        receiverType: 'get-stock-quote',
        provider: 'longport',
        queryId: 'multi-market',
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.MARKET_AWARE,
        executeOriginalDataFlow: mockExecuteOriginalDataFlow,
      };

      const request = buildCacheOrchestratorRequest(options);

      expect(request.symbols).toHaveLength(4);
      expect(request.cacheKey).toBe('receiver:get-stock-quote:000001.SZ|600000.SH|700.HK|AAPL:provider:longport');
    });
  });

  describe('Integration Tests', () => {
    it('should work together to build complete cache request', () => {
      const symbols = ['700.HK', 'AAPL', '000001.SZ'];
      const receiverType = 'get-stock-quote';
      const provider = 'longport';
      const queryId = 'integration-test';

      // Step 1: Extract market (returns string from first symbol)
      const market = extractMarketFromSymbols(symbols);
      expect(market).toBe('HK'); // First symbol is 700.HK

      // Step 2: Create stable hash (for many symbols)
      const manySymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'];
      const symbolsHash = createStableSymbolsHash(manySymbols);
      expect(symbolsHash).toMatch(/^[a-f0-9]{16}$/);

      // Step 3: Build unified cache key (for few symbols)
      const prefix = `receiver:${receiverType}`;
      const cacheKey = buildUnifiedCacheKey(prefix, symbols, { provider });
      expect(cacheKey).toBe(`receiver:${receiverType}:000001.SZ|700.HK|AAPL:provider:${provider}`);

      // Step 4: Build orchestrator request
      const mockExecuteFn = jest.fn();
      const mockMarketStatus = {};
      const request = buildCacheOrchestratorRequest({
        symbols,
        receiverType,
        provider,
        queryId,
        marketStatus: mockMarketStatus,
        strategy: CacheStrategy.STRONG_TIMELINESS,
        executeOriginalDataFlow: mockExecuteFn,
      });

      expect(request.cacheKey).toBe(cacheKey);
      expect(request.symbols).toBe(symbols);
      expect(request.fetchFn).toBe(mockExecuteFn);
    });

    it('should handle edge cases consistently', () => {
      const symbols: string[] = [];
      const prefix = '';

      const symbolsHash = createStableSymbolsHash(['TEST']);
      expect(symbolsHash).toMatch(/^[a-f0-9]{16}$/);
      
      // Empty prefix should throw error
      expect(() => buildUnifiedCacheKey(prefix, ['TEST'])).toThrow('缓存键前缀不能为空');
      
      // Empty symbols should throw error
      expect(() => buildUnifiedCacheKey('test:prefix', symbols)).toThrow('符号列表不能为空');
    });
  });
});