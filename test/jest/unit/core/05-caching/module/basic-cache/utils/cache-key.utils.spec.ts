import { CacheKeyUtils } from '@core/05-caching/module/basic-cache/utils/cache-key.utils';
import { CACHE_KEY_PREFIXES } from '@core/05-caching/module/basic-cache/constants/cache.constants';
import { CACHE_CONFIG } from '@core/05-caching/module/basic-cache/constants/cache-config.constants';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('CacheKeyUtils', () => {
  describe('generateCacheKey', () => {
    it('should generate cache key with prefix and parts', () => {
      const prefix = 'test';
      const parts = ['part1', 'part2', 'part3'];

      const result = CacheKeyUtils.generateCacheKey(prefix, ...parts);
      expect(result).toBe('test:part1:part2:part3');
    });

    it('should generate cache key with single part', () => {
      const prefix = 'user';
      const part = 'session123';

      const result = CacheKeyUtils.generateCacheKey(prefix, part);
      expect(result).toBe('user:session123');
    });

    it('should generate cache key with only prefix', () => {
      const prefix = 'global';

      const result = CacheKeyUtils.generateCacheKey(prefix);
      expect(result).toBe('global:');
    });

    it('should filter out empty parts', () => {
      const prefix = 'test';
      const parts = ['part1', '', 'part2', null, 'part3', undefined];

      const result = CacheKeyUtils.generateCacheKey(prefix, ...parts);
      expect(result).toBe('test:part1:part2:part3');
    });

    it('should handle multiple empty parts', () => {
      const prefix = 'test';
      const parts = ['', '', '', ''];

      const result = CacheKeyUtils.generateCacheKey(prefix, ...parts);
      expect(result).toBe('test:');
    });

    it('should throw exception for keys exceeding maximum length', () => {
      const prefix = 'test';
      // Create a very long part that will exceed the max key length
      const longPart = 'x'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH);

      expect(() => {
        CacheKeyUtils.generateCacheKey(prefix, longPart);
      }).toThrow();
    });

    it('should handle special characters in parts', () => {
      const prefix = 'test';
      const parts = ['part-1', 'part_2', 'part.3'];

      const result = CacheKeyUtils.generateCacheKey(prefix, ...parts);
      expect(result).toBe('test:part-1:part_2:part.3');
    });

    it('should handle numeric parts', () => {
      const prefix = 'user';
      const parts = ['123', '456'];

      const result = CacheKeyUtils.generateCacheKey(prefix, ...parts);
      expect(result).toBe('user:123:456');
    });

    it('should validate key length correctly', () => {
      const prefix = 'test';
      const maxParts = Math.floor((CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH - prefix.length - 1) / 2); // Account for colons
      const parts = Array.from({ length: maxParts }, (_, i) => 'x');

      // This should not throw
      expect(() => {
        CacheKeyUtils.generateCacheKey(prefix, ...parts);
      }).not.toThrow();
    });

    it('should preserve part order', () => {
      const prefix = 'order';
      const parts = ['third', 'first', 'second'];

      const result = CacheKeyUtils.generateCacheKey(prefix, ...parts);
      expect(result).toBe('order:third:first:second');
    });
  });

  describe('generateStockQuoteKey', () => {
    it('should generate stock quote key with symbol and provider', () => {
      const symbol = 'AAPL';
      const provider = 'longport';

      const result = CacheKeyUtils.generateStockQuoteKey(symbol, provider);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:AAPL:longport`);
    });

    it('should generate stock quote key with market', () => {
      const symbol = '700.HK';
      const provider = 'longport';
      const market = 'HK';

      const result = CacheKeyUtils.generateStockQuoteKey(symbol, provider, market);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:700.HK:longport:HK`);
    });

    it('should generate stock quote key without market', () => {
      const symbol = 'TSLA';
      const provider = 'alpha_vantage';

      const result = CacheKeyUtils.generateStockQuoteKey(symbol, provider);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:TSLA:alpha_vantage`);
    });

    it('should handle complex stock symbols', () => {
      const symbol = 'BRK.A';
      const provider = 'yahoo';
      const market = 'US';

      const result = CacheKeyUtils.generateStockQuoteKey(symbol, provider, market);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:BRK.A:yahoo:US`);
    });

    it('should handle crypto symbols', () => {
      const symbol = 'BTC-USD';
      const provider = 'coinbase';
      const market = 'CRYPTO';

      const result = CacheKeyUtils.generateStockQuoteKey(symbol, provider, market);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:BTC-USD:coinbase:CRYPTO`);
    });

    it('should handle empty market parameter', () => {
      const symbol = 'AAPL';
      const provider = 'longport';
      const market = '';

      const result = CacheKeyUtils.generateStockQuoteKey(symbol, provider, market);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:AAPL:longport`);
    });
  });

  describe('generateMarketStatusKey', () => {
    it('should generate market status key with market only', () => {
      const market = 'NYSE';

      const result = CacheKeyUtils.generateMarketStatusKey(market);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:NYSE`);
    });

    it('should generate market status key with date', () => {
      const market = 'NASDAQ';
      const date = '2023-12-01';

      const result = CacheKeyUtils.generateMarketStatusKey(market, date);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:NASDAQ:2023-12-01`);
    });

    it('should handle Hong Kong market', () => {
      const market = 'HKEX';
      const date = '2023-12-01';

      const result = CacheKeyUtils.generateMarketStatusKey(market, date);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:HKEX:2023-12-01`);
    });

    it('should handle empty date parameter', () => {
      const market = 'LSE';
      const date = '';

      const result = CacheKeyUtils.generateMarketStatusKey(market, date);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:LSE`);
    });

    it('should handle different date formats', () => {
      const market = 'TSE';
      const date = '20231201';

      const result = CacheKeyUtils.generateMarketStatusKey(market, date);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:TSE:20231201`);
    });
  });

  describe('generateSymbolMappingKey', () => {
    it('should generate symbol mapping key', () => {
      const sourceSymbol = '700.HK';
      const targetFormat = 'longport';

      const result = CacheKeyUtils.generateSymbolMappingKey(sourceSymbol, targetFormat);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.SYMBOL_MAPPING}:700.HK:longport`);
    });

    it('should handle US symbols', () => {
      const sourceSymbol = 'AAPL';
      const targetFormat = 'yahoo';

      const result = CacheKeyUtils.generateSymbolMappingKey(sourceSymbol, targetFormat);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.SYMBOL_MAPPING}:AAPL:yahoo`);
    });

    it('should handle complex symbol formats', () => {
      const sourceSymbol = 'BRK.A';
      const targetFormat = 'bloomberg';

      const result = CacheKeyUtils.generateSymbolMappingKey(sourceSymbol, targetFormat);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.SYMBOL_MAPPING}:BRK.A:bloomberg`);
    });

    it('should handle crypto symbols', () => {
      const sourceSymbol = 'BTC-USD';
      const targetFormat = 'binance';

      const result = CacheKeyUtils.generateSymbolMappingKey(sourceSymbol, targetFormat);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.SYMBOL_MAPPING}:BTC-USD:binance`);
    });

    it('should handle forex symbols', () => {
      const sourceSymbol = 'EUR/USD';
      const targetFormat = 'oanda';

      const result = CacheKeyUtils.generateSymbolMappingKey(sourceSymbol, targetFormat);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.SYMBOL_MAPPING}:EUR/USD:oanda`);
    });
  });

  describe('generateProviderDataKey', () => {
    it('should generate provider data key', () => {
      const provider = 'longport';
      const dataType = 'quote';
      const identifier = 'AAPL';

      const result = CacheKeyUtils.generateProviderDataKey(provider, dataType, identifier);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.PROVIDER_DATA}:longport:quote:AAPL`);
    });

    it('should handle historical data', () => {
      const provider = 'alpha_vantage';
      const dataType = 'historical';
      const identifier = 'TSLA_2023';

      const result = CacheKeyUtils.generateProviderDataKey(provider, dataType, identifier);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.PROVIDER_DATA}:alpha_vantage:historical:TSLA_2023`);
    });

    it('should handle news data', () => {
      const provider = 'reuters';
      const dataType = 'news';
      const identifier = 'tech_sector';

      const result = CacheKeyUtils.generateProviderDataKey(provider, dataType, identifier);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.PROVIDER_DATA}:reuters:news:tech_sector`);
    });

    it('should handle earnings data', () => {
      const provider = 'earnings_api';
      const dataType = 'earnings';
      const identifier = 'Q4_2023';

      const result = CacheKeyUtils.generateProviderDataKey(provider, dataType, identifier);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.PROVIDER_DATA}:earnings_api:earnings:Q4_2023`);
    });

    it('should handle real-time streaming data', () => {
      const provider = 'websocket_feed';
      const dataType = 'stream';
      const identifier = 'market_depth_AAPL';

      const result = CacheKeyUtils.generateProviderDataKey(provider, dataType, identifier);
      expect(result).toBe(`${CACHE_KEY_PREFIXES.PROVIDER_DATA}:websocket_feed:stream:market_depth_AAPL`);
    });
  });

  describe('prepareBatchKeys', () => {
    it('should prepare valid batch keys', () => {
      const keys = ['key1', 'key2', 'key3'];

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toEqual(['key1', 'key2', 'key3']);
    });

    it('should handle empty array', () => {
      const keys: string[] = [];

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toEqual([]);
    });

    it('should handle single key', () => {
      const keys = ['single_key'];

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toEqual(['single_key']);
    });

    it('should throw exception for keys exceeding maximum length', () => {
      const longKey = 'x'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH + 1);
      const keys = ['valid_key', longKey, 'another_valid_key'];

      expect(() => {
        CacheKeyUtils.prepareBatchKeys(keys);
      }).toThrow();
    });

    it('should validate all keys in batch', () => {
      const keys = ['key1', 'key2', 'key3', 'key4'];

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toHaveLength(4);
      expect(result).toEqual(keys);
    });

    it('should handle keys with special characters', () => {
      const keys = ['key:1', 'key-2', 'key_3', 'key.4'];

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toEqual(keys);
    });

    it('should preserve key order', () => {
      const keys = ['z_key', 'a_key', 'm_key', 'b_key'];

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toEqual(['z_key', 'a_key', 'm_key', 'b_key']);
    });

    it('should handle large batch sizes', () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `key_${i}`);

      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toHaveLength(1000);
      expect(result[0]).toBe('key_0');
      expect(result[999]).toBe('key_999');
    });
  });

  describe('parseKey', () => {
    it('should parse key with prefix and parts', () => {
      const key = 'prefix:part1:part2:part3';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('prefix');
      expect(result.parts).toEqual(['part1', 'part2', 'part3']);
    });

    it('should parse key with prefix only', () => {
      const key = 'prefix:';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('prefix');
      expect(result.parts).toEqual(['']);
    });

    it('should parse key without colon', () => {
      const key = 'simple_key';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('simple_key');
      expect(result.parts).toEqual([]);
    });

    it('should parse key with single part', () => {
      const key = 'user:123';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('user');
      expect(result.parts).toEqual(['123']);
    });

    it('should parse key with empty parts', () => {
      const key = 'test::part2::part4';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('test');
      expect(result.parts).toEqual(['', 'part2', '', 'part4']);
    });

    it('should handle stock quote keys', () => {
      const key = 'stock_quote:AAPL:longport:US';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('stock_quote');
      expect(result.parts).toEqual(['AAPL', 'longport', 'US']);
    });

    it('should handle complex symbols in parts', () => {
      const key = 'symbol_mapping:BRK.A:yahoo';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('symbol_mapping');
      expect(result.parts).toEqual(['BRK.A', 'yahoo']);
    });

    it('should handle keys with many parts', () => {
      const key = 'complex:a:b:c:d:e:f:g:h:i:j';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('complex');
      expect(result.parts).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    });

    it('should handle empty key', () => {
      const key = '';

      const result = CacheKeyUtils.parseKey(key);
      expect(result.prefix).toBe('');
      expect(result.parts).toEqual([]);
    });
  });

  describe('isValidKey', () => {
    it('should return true for valid keys', () => {
      const validKeys = [
        'simple_key',
        'prefix:part',
        'user:123:session',
        'stock_quote:AAPL:longport'
      ];

      validKeys.forEach(key => {
        expect(CacheKeyUtils.isValidKey(key)).toBe(true);
      });
    });

    it('should return false for null or undefined keys', () => {
      expect(CacheKeyUtils.isValidKey(null as any)).toBe(false);
      expect(CacheKeyUtils.isValidKey(undefined as any)).toBe(false);
    });

    it('should return false for non-string keys', () => {
      expect(CacheKeyUtils.isValidKey(123 as any)).toBe(false);
      expect(CacheKeyUtils.isValidKey({} as any)).toBe(false);
      expect(CacheKeyUtils.isValidKey([] as any)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(CacheKeyUtils.isValidKey('')).toBe(false);
    });

    it('should return false for keys exceeding maximum length', () => {
      const longKey = 'x'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH + 1);
      expect(CacheKeyUtils.isValidKey(longKey)).toBe(false);
    });

    it('should return false for keys with illegal characters', () => {
      const illegalKeys = [
        'key with space',
        'key\nwith\nnewline',
        'key\rwith\rcarriage',
        'key\twith\ttab'
      ];

      illegalKeys.forEach(key => {
        expect(CacheKeyUtils.isValidKey(key)).toBe(false);
      });
    });

    it('should return true for keys with allowed special characters', () => {
      const validKeys = [
        'key:with:colons',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots'
      ];

      validKeys.forEach(key => {
        expect(CacheKeyUtils.isValidKey(key)).toBe(true);
      });
    });

    it('should handle maximum allowed length', () => {
      const maxLengthKey = 'x'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH);
      expect(CacheKeyUtils.isValidKey(maxLengthKey)).toBe(true);
    });

    it('should handle single character keys', () => {
      expect(CacheKeyUtils.isValidKey('x')).toBe(true);
      expect(CacheKeyUtils.isValidKey(':')).toBe(true);
      expect(CacheKeyUtils.isValidKey('-')).toBe(true);
    });
  });

  describe('generatePatternKey', () => {
    it('should generate pattern key with default wildcard', () => {
      const prefix = 'user';

      const result = CacheKeyUtils.generatePatternKey(prefix);
      expect(result).toBe('user:*');
    });

    it('should generate pattern key with custom pattern', () => {
      const prefix = 'stock';
      const pattern = 'AAPL*';

      const result = CacheKeyUtils.generatePatternKey(prefix, pattern);
      expect(result).toBe('stock:AAPL*');
    });

    it('should generate pattern key with complex pattern', () => {
      const prefix = 'cache';
      const pattern = 'user:*:session';

      const result = CacheKeyUtils.generatePatternKey(prefix, pattern);
      expect(result).toBe('cache:user:*:session');
    });

    it('should handle empty pattern', () => {
      const prefix = 'test';
      const pattern = '';

      const result = CacheKeyUtils.generatePatternKey(prefix, pattern);
      expect(result).toBe('test:');
    });

    it('should handle question mark wildcard', () => {
      const prefix = 'symbol';
      const pattern = 'A?PL';

      const result = CacheKeyUtils.generatePatternKey(prefix, pattern);
      expect(result).toBe('symbol:A?PL');
    });

    it('should handle multiple wildcards', () => {
      const prefix = 'provider';
      const pattern = '*:quote:*';

      const result = CacheKeyUtils.generatePatternKey(prefix, pattern);
      expect(result).toBe('provider:*:quote:*');
    });
  });

  describe('normalizeKey', () => {
    it('should normalize key to lowercase', () => {
      const key = 'USER:SESSION:123';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('user:session:123');
    });

    it('should replace spaces with underscores', () => {
      const key = 'user session data';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('user_session_data');
    });

    it('should remove invalid characters', () => {
      const key = 'user@session#data$';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('usersessiondata');
    });

    it('should preserve valid characters', () => {
      const key = 'User_Session-123.Data:Cache';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('user_session-123.data:cache');
    });

    it('should handle multiple spaces', () => {
      const key = 'user   session   data';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('user_session_data');
    });

    it('should handle empty string', () => {
      const key = '';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('');
    });

    it('should handle numbers correctly', () => {
      const key = 'User123Session456';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('user123session456');
    });

    it('should handle mixed case and special characters', () => {
      const key = 'Stock-Quote:AAPL@2023!';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('stock-quote:aapl2023');
    });

    it('should handle Unicode characters', () => {
      const key = 'Cache测试数据';

      const result = CacheKeyUtils.normalizeKey(key);
      expect(result).toBe('cache');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with real cache key patterns', () => {
      // Stock quote scenario
      const stockKey = CacheKeyUtils.generateStockQuoteKey('AAPL', 'longport', 'US');
      expect(CacheKeyUtils.isValidKey(stockKey)).toBe(true);

      const parsed = CacheKeyUtils.parseKey(stockKey);
      expect(parsed.prefix).toBe(CACHE_KEY_PREFIXES.STOCK_QUOTE);
      expect(parsed.parts).toEqual(['AAPL', 'longport', 'US']);
    });

    it('should handle batch operations correctly', () => {
      const keys = [
        CacheKeyUtils.generateStockQuoteKey('AAPL', 'longport'),
        CacheKeyUtils.generateStockQuoteKey('GOOGL', 'longport'),
        CacheKeyUtils.generateStockQuoteKey('TSLA', 'longport')
      ];

      const preparedKeys = CacheKeyUtils.prepareBatchKeys(keys);
      expect(preparedKeys).toHaveLength(3);

      preparedKeys.forEach(key => {
        expect(CacheKeyUtils.isValidKey(key)).toBe(true);
      });
    });

    it('should generate pattern keys for cache cleanup', () => {
      const userPattern = CacheKeyUtils.generatePatternKey('user', '123:*');
      expect(userPattern).toBe('user:123:*');

      const stockPattern = CacheKeyUtils.generatePatternKey(CACHE_KEY_PREFIXES.STOCK_QUOTE, 'AAPL:*');
      expect(stockPattern).toBe('stock_quote:AAPL:*');
    });

    it('should normalize user input keys', () => {
      const userInput = 'Stock Quote: AAPL @ LongPort!';
      const normalized = CacheKeyUtils.normalizeKey(userInput);
      expect(normalized).toBe('stock_quote:_aapl_longport');

      expect(CacheKeyUtils.isValidKey(normalized)).toBe(true);
    });

    it('should handle complex symbol mapping scenarios', () => {
      const symbols = ['700.HK', 'BRK.A', 'BTC-USD', 'EUR/USD'];
      const provider = 'unified_mapper';

      symbols.forEach(symbol => {
        const key = CacheKeyUtils.generateSymbolMappingKey(symbol, provider);
        expect(CacheKeyUtils.isValidKey(key)).toBe(true);

        const parsed = CacheKeyUtils.parseKey(key);
        expect(parsed.parts[0]).toBe(symbol);
        expect(parsed.parts[1]).toBe(provider);
      });
    });

    it('should validate market status keys for different markets', () => {
      const markets = ['NYSE', 'NASDAQ', 'HKEX', 'TSE', 'LSE'];
      const date = '2023-12-01';

      markets.forEach(market => {
        const key = CacheKeyUtils.generateMarketStatusKey(market, date);
        expect(CacheKeyUtils.isValidKey(key)).toBe(true);
        expect(key).toContain(market);
        expect(key).toContain(date);
      });
    });
  });
});
