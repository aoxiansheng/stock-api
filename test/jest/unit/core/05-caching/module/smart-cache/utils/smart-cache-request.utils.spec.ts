/**
 * SmartCacheRequestUtils 单元测试
 * 测试智能缓存请求工具的所有功能
 */

import crypto from 'crypto';
import {
  buildCacheOrchestratorRequest,
  buildUnifiedCacheKey,
  createStableSymbolsHash,
  extractMarketFromSymbols,
  inferMarketFromSymbol,
  validateCacheKey,
  setDefaultMarketInferenceService,
} from '@core/05-caching/module/smart-cache/utils/smart-cache-request.utils';
import {
  CacheStrategy,
} from '@core/05-caching/module/smart-cache/services/smart-cache-standardized.service';
import { Market } from '@core/shared/constants/market.constants';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { UniversalExceptionFactory } from '@common/core/exceptions';

// Mock dependencies
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn().mockImplementation(({ message }) => {
      const error = new Error(message);
      error.name = 'BusinessException';
      return error;
    }),
  },
  BusinessErrorCode: {
    DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
    ENVIRONMENT_ERROR: 'ENVIRONMENT_ERROR',
  },
  ComponentIdentifier: {
    SMART_CACHE: 'SMART_CACHE',
  },
}));

jest.mock('@core/shared/constants/market.constants', () => ({
  Market: {
    US: 'US',
    HK: 'HK',
    SZ: 'SZ',
    SH: 'SH',
    UNKNOWN: 'UNKNOWN',
  },
}));

jest.mock('@common/utils/symbol-validation.util', () => ({
  SymbolValidationUtils: {
    getMarketFromSymbol: jest.fn().mockReturnValue('US'),
  },
}));

describe('SmartCacheRequestUtils', () => {
  const mockMarketInferenceService = {
    inferMarket: jest.fn().mockReturnValue(Market.US),
  } as unknown as MarketInferenceService;

  afterEach(() => {
    jest.clearAllMocks();
    setDefaultMarketInferenceService(null);
  });

  describe('setDefaultMarketInferenceService', () => {
    it('should set market inference service', () => {
      setDefaultMarketInferenceService(mockMarketInferenceService);
      // 通过调用 inferMarketFromSymbol 来验证服务已设置
      const result = inferMarketFromSymbol('AAPL');
      expect(mockMarketInferenceService.inferMarket).toHaveBeenCalledWith('AAPL', undefined);
    });

    it('should clear market inference service when passed null', () => {
      setDefaultMarketInferenceService(mockMarketInferenceService);
      setDefaultMarketInferenceService(null);
      // 验证服务已清除，应该回退到默认行为
      const result = inferMarketFromSymbol('AAPL');
      expect(mockMarketInferenceService.inferMarket).not.toHaveBeenCalled();
    });
  });

  describe('buildCacheOrchestratorRequest', () => {
    const mockExecuteOriginalDataFlow = jest.fn().mockResolvedValue({ data: 'test' });

    const baseOptions = {
      symbols: ['AAPL', 'GOOGL'],
      receiverType: 'get-stock-quote',
      provider: 'longport',
      queryId: 'test-query-123',
      marketStatus: { isOpen: true },
      strategy: CacheStrategy.WEAK_TIMELINESS,
      executeOriginalDataFlow: mockExecuteOriginalDataFlow,
    };

    it('should build valid cache orchestrator request', () => {
      const request = buildCacheOrchestratorRequest(baseOptions);

      expect(request).toBeDefined();
      expect(request.cacheKey).toContain('receiver:get-stock-quote');
      expect(request.strategy).toBe(CacheStrategy.WEAK_TIMELINESS);
      expect(request.symbols).toEqual(['AAPL', 'GOOGL']);
      expect(request.fetchFn).toBe(mockExecuteOriginalDataFlow);
      expect(request.metadata).toEqual({
        marketStatus: { isOpen: true },
        provider: 'longport',
        receiverType: 'get-stock-quote',
        queryId: 'test-query-123',
      });
    });

    it('should handle single symbol', () => {
      const options = { ...baseOptions, symbols: ['AAPL'] };
      const request = buildCacheOrchestratorRequest(options);

      expect(request.symbols).toEqual(['AAPL']);
      expect(request.cacheKey).toContain('AAPL');
    });

    it('should handle different strategies', () => {
      const strategies = [
        CacheStrategy.STRONG_TIMELINESS,
        CacheStrategy.WEAK_TIMELINESS,
        CacheStrategy.MARKET_AWARE,
        CacheStrategy.NO_CACHE,
        CacheStrategy.ADAPTIVE,
      ];

      strategies.forEach(strategy => {
        const options = { ...baseOptions, strategy };
        const request = buildCacheOrchestratorRequest(options);
        expect(request.strategy).toBe(strategy);
      });
    });
  });

  describe('buildUnifiedCacheKey', () => {
    it('should build key with single symbol', () => {
      const key = buildUnifiedCacheKey('receiver:test', ['AAPL']);
      expect(key).toBe('receiver:test:AAPL');
    });

    it('should build key with multiple symbols (≤5)', () => {
      const key = buildUnifiedCacheKey('receiver:test', ['AAPL', 'GOOGL', 'MSFT']);
      expect(key).toBe('receiver:test:AAPL|GOOGL|MSFT');
    });

    it('should sort symbols in multiple symbol keys', () => {
      const key = buildUnifiedCacheKey('receiver:test', ['GOOGL', 'AAPL', 'MSFT']);
      expect(key).toBe('receiver:test:AAPL|GOOGL|MSFT');
    });

    it('should use hash for many symbols (>5)', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NFLX'];
      const key = buildUnifiedCacheKey('receiver:test', symbols);
      expect(key).toMatch(/^receiver:test:hash:[a-f0-9]{16}$/);
    });

    it('should include additional parameters', () => {
      const key = buildUnifiedCacheKey(
        'receiver:test',
        ['AAPL'],
        { provider: 'longport', market: 'US' }
      );
      expect(key).toBe('receiver:test:AAPL:market:US|provider:longport');
    });

    it('should sort additional parameters', () => {
      const key = buildUnifiedCacheKey(
        'receiver:test',
        ['AAPL'],
        { z_param: 'z', a_param: 'a', m_param: 'm' }
      );
      expect(key).toBe('receiver:test:AAPL:a_param:a|m_param:m|z_param:z');
    });

    it('should throw error for empty prefix', () => {
      expect(() => {
        buildUnifiedCacheKey('', ['AAPL']);
      }).toThrow('Cache key prefix cannot be empty');

      expect(() => {
        buildUnifiedCacheKey('   ', ['AAPL']);
      }).toThrow('Cache key prefix cannot be empty');
    });

    it('should throw error for empty symbols', () => {
      expect(() => {
        buildUnifiedCacheKey('receiver:test', []);
      }).toThrow('Symbols list cannot be empty');

      expect(() => {
        buildUnifiedCacheKey('receiver:test', undefined as any);
      }).toThrow('Symbols list cannot be empty');
    });
  });

  describe('createStableSymbolsHash', () => {
    it('should create consistent hash for same symbols', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const hash1 = createStableSymbolsHash(symbols);
      const hash2 = createStableSymbolsHash(symbols);
      expect(hash1).toBe(hash2);
    });

    it('should create same hash regardless of order', () => {
      const hash1 = createStableSymbolsHash(['AAPL', 'GOOGL', 'MSFT']);
      const hash2 = createStableSymbolsHash(['MSFT', 'AAPL', 'GOOGL']);
      expect(hash1).toBe(hash2);
    });

    it('should create same hash regardless of case', () => {
      const hash1 = createStableSymbolsHash(['aapl', 'googl']);
      const hash2 = createStableSymbolsHash(['AAPL', 'GOOGL']);
      expect(hash1).toBe(hash2);
    });

    it('should remove duplicates', () => {
      const hash1 = createStableSymbolsHash(['AAPL', 'AAPL', 'GOOGL']);
      const hash2 = createStableSymbolsHash(['AAPL', 'GOOGL']);
      expect(hash1).toBe(hash2);
    });

    it('should return 16-character hex string', () => {
      const hash = createStableSymbolsHash(['AAPL', 'GOOGL']);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
      expect(hash.length).toBe(16);
    });

    it('should throw error for empty symbols', () => {
      expect(() => {
        createStableSymbolsHash([]);
      }).toThrow('Symbols list cannot be empty');
    });

    it('should throw error for symbols with only whitespace', () => {
      expect(() => {
        createStableSymbolsHash(['  ', '\t', '\n']);
      }).toThrow('Valid symbols list cannot be empty after normalization');
    });

    it('should handle symbols with whitespace', () => {
      const hash1 = createStableSymbolsHash(['  AAPL  ', '\tGOOGL\n']);
      const hash2 = createStableSymbolsHash(['AAPL', 'GOOGL']);
      expect(hash1).toBe(hash2);
    });

    it('should throw error when crypto module is unavailable', () => {
      // Mock crypto module as unavailable
      const originalCrypto = require('crypto');
      jest.doMock('crypto', () => null);

      expect(() => {
        createStableSymbolsHash(['AAPL']);
      }).toThrow('Node.js crypto module is unavailable');

      // Restore original crypto
      jest.doMock('crypto', () => originalCrypto);
    });
  });

  describe('extractMarketFromSymbols', () => {
    it('should return UNKNOWN for empty symbols', () => {
      expect(extractMarketFromSymbols([])).toBe('UNKNOWN');
      expect(extractMarketFromSymbols(undefined as any)).toBe('UNKNOWN');
    });

    it('should detect HK market', () => {
      expect(extractMarketFromSymbols(['700.HK'])).toBe('HK');
      expect(extractMarketFromSymbols(['0700.HK', '0005.HK'])).toBe('HK');
    });

    it('should detect US market', () => {
      expect(extractMarketFromSymbols(['AAPL.US'])).toBe('US');
      expect(extractMarketFromSymbols(['AAPL'])).toBe('US'); // 纯字母
      expect(extractMarketFromSymbols(['GOOGL'])).toBe('US');
    });

    it('should detect SZ market', () => {
      expect(extractMarketFromSymbols(['000001.SZ'])).toBe('SZ');
      expect(extractMarketFromSymbols(['000001'])).toBe('SZ'); // 以00开头
      expect(extractMarketFromSymbols(['300001'])).toBe('SZ'); // 以30开头
    });

    it('should detect SH market', () => {
      expect(extractMarketFromSymbols(['600000.SH'])).toBe('SH');
      expect(extractMarketFromSymbols(['600000'])).toBe('SH'); // 6位数字，不以00或30开头
    });

    it('should use first symbol for detection', () => {
      expect(extractMarketFromSymbols(['700.HK', 'AAPL'])).toBe('HK');
      expect(extractMarketFromSymbols(['AAPL', '700.HK'])).toBe('US');
    });

    it('should return UNKNOWN for unrecognized patterns', () => {
      expect(extractMarketFromSymbols(['12345'])).toBe('UNKNOWN'); // 5位数字
      expect(extractMarketFromSymbols(['ABC123'])).toBe('UNKNOWN'); // 混合字符
    });
  });

  describe('inferMarketFromSymbol', () => {
    it('should use default market inference service when available', () => {
      setDefaultMarketInferenceService(mockMarketInferenceService);

      const result = inferMarketFromSymbol('AAPL');

      expect(mockMarketInferenceService.inferMarket).toHaveBeenCalledWith('AAPL', undefined);
      expect(result).toBe(Market.US);
    });

    it('should pass options to market inference service', () => {
      setDefaultMarketInferenceService(mockMarketInferenceService);
      const options = { collapseChina: true, fallback: Market.US };

      const result = inferMarketFromSymbol('AAPL', options);

      expect(mockMarketInferenceService.inferMarket).toHaveBeenCalledWith('AAPL', options);
    });

    it('should fallback to SymbolValidationUtils when no service set', () => {
      const { SymbolValidationUtils } = require('@common/utils/symbol-validation.util');

      const result = inferMarketFromSymbol('AAPL');

      expect(SymbolValidationUtils.getMarketFromSymbol).toHaveBeenCalledWith('AAPL', undefined);
      expect(result).toBe(Market.US);
    });

    it('should return US market as default when utils return null', () => {
      const { SymbolValidationUtils } = require('@common/utils/symbol-validation.util');
      SymbolValidationUtils.getMarketFromSymbol.mockReturnValueOnce(null);

      const result = inferMarketFromSymbol('UNKNOWN');

      expect(result).toBe(Market.US);
    });
  });

  describe('validateCacheKey', () => {
    it('should validate correct cache keys', () => {
      expect(validateCacheKey('receiver:test:AAPL')).toBe(true);
      expect(validateCacheKey('query:batch:AAPL|GOOGL')).toBe(true);
      expect(validateCacheKey('prefix:content:extra:params')).toBe(true);
    });

    it('should reject invalid cache keys', () => {
      expect(validateCacheKey('')).toBe(false);
      expect(validateCacheKey('nocolon')).toBe(false);
      expect(validateCacheKey('empty::part')).toBe(false);
      expect(validateCacheKey(':empty:start')).toBe(false);
      expect(validateCacheKey('empty:end:')).toBe(false);
      expect(validateCacheKey('   :   ')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validateCacheKey(null as any)).toBe(false);
      expect(validateCacheKey(undefined as any)).toBe(false);
      expect(validateCacheKey(123 as any)).toBe(false);
      expect(validateCacheKey({} as any)).toBe(false);
      expect(validateCacheKey([] as any)).toBe(false);
    });

    it('should handle whitespace correctly', () => {
      expect(validateCacheKey('  prefix  :  content  ')).toBe(true);
      expect(validateCacheKey('prefix:   :content')).toBe(false); // 空白部分
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle special characters in symbols', () => {
      const symbols = ['AAPL-USD', 'BRK.A', 'BTC/USD'];
      const hash = createStableSymbolsHash(symbols);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should handle very long symbol lists', () => {
      const symbols = Array.from({ length: 100 }, (_, i) => `SYM${i}`);
      const key = buildUnifiedCacheKey('test', symbols);
      expect(key).toMatch(/^test:hash:[a-f0-9]{16}$/);
    });

    it('should handle complex additional parameters', () => {
      const params = {
        provider: 'longport',
        market: 'US',
        type: 'quote',
        version: '1.0',
        options: JSON.stringify({ realtime: true }),
      };
      const key = buildUnifiedCacheKey('test', ['AAPL'], params);
      expect(key).toContain('market:US');
      expect(key).toContain('provider:longport');
      expect(key).toContain('type:quote');
    });

    it('should handle unicode symbols', () => {
      const symbols = ['中国平安', '腾讯控股'];
      const hash = createStableSymbolsHash(symbols);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });
});
