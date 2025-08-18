import { CacheKeyUtils } from '@core/public/common-cache/utils/cache-key.utils';
import { CACHE_KEY_PREFIXES } from '@core/public/common-cache/constants/cache.constants';
import { CACHE_CONFIG } from '@core/public/common-cache/constants/cache-config.constants';

describe('CacheKeyUtils', () => {
  describe('generateCacheKey', () => {
    it('should generate cache key with prefix and parts', () => {
      const result = CacheKeyUtils.generateCacheKey('test', 'part1', 'part2');
      expect(result).toBe('test:part1:part2');
    });

    it('should filter out falsy parts', () => {
      const result = CacheKeyUtils.generateCacheKey('test', 'part1', '', 'part2', null as any, undefined as any);
      expect(result).toBe('test:part1:part2');
    });

    it('should handle empty parts array', () => {
      const result = CacheKeyUtils.generateCacheKey('test');
      expect(result).toBe('test:');
    });

    it('should throw error for keys that are too long', () => {
      const longPart = 'a'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH);
      
      expect(() => {
        CacheKeyUtils.generateCacheKey('test', longPart);
      }).toThrow(`Cache key too long: ${5 + longPart.length} > ${CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH}`);
    });
  });

  describe('generateStockQuoteKey', () => {
    it('should generate stock quote key with symbol and provider', () => {
      const result = CacheKeyUtils.generateStockQuoteKey('AAPL', 'longport');
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:AAPL:longport`);
    });

    it('should generate stock quote key with market', () => {
      const result = CacheKeyUtils.generateStockQuoteKey('700.HK', 'longport', 'HK');
      expect(result).toBe(`${CACHE_KEY_PREFIXES.STOCK_QUOTE}:700.HK:longport:HK`);
    });
  });

  describe('generateMarketStatusKey', () => {
    it('should generate market status key without date', () => {
      const result = CacheKeyUtils.generateMarketStatusKey('HK');
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:HK`);
    });

    it('should generate market status key with date', () => {
      const result = CacheKeyUtils.generateMarketStatusKey('HK', '2023-08-18');
      expect(result).toBe(`${CACHE_KEY_PREFIXES.MARKET_STATUS}:HK:2023-08-18`);
    });
  });

  describe('generateSymbolMappingKey', () => {
    it('should generate symbol mapping key', () => {
      const result = CacheKeyUtils.generateSymbolMappingKey('AAPL', 'longport');
      expect(result).toBe(`${CACHE_KEY_PREFIXES.SYMBOL_MAPPING}:AAPL:longport`);
    });
  });

  describe('generateProviderDataKey', () => {
    it('should generate provider data key', () => {
      const result = CacheKeyUtils.generateProviderDataKey('longport', 'quote', 'AAPL');
      expect(result).toBe(`${CACHE_KEY_PREFIXES.PROVIDER_DATA}:longport:quote:AAPL`);
    });
  });

  describe('prepareBatchKeys', () => {
    it('should return processed keys when all are valid', () => {
      const keys = ['key1', 'key2', 'key3'];
      const result = CacheKeyUtils.prepareBatchKeys(keys);
      expect(result).toEqual(keys);
    });

    it('should throw error when any key is too long', () => {
      const longKey = 'a'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH + 1);
      const keys = ['key1', longKey, 'key3'];
      
      expect(() => {
        CacheKeyUtils.prepareBatchKeys(keys);
      }).toThrow(`Cache key too long: ${longKey.length} > ${CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH}`);
    });
  });

  describe('parseKey', () => {
    it('should parse key with prefix and parts', () => {
      const result = CacheKeyUtils.parseKey('test:part1:part2');
      expect(result).toEqual({
        prefix: 'test',
        parts: ['part1', 'part2'],
      });
    });

    it('should parse key with only prefix', () => {
      const result = CacheKeyUtils.parseKey('test');
      expect(result).toEqual({
        prefix: 'test',
        parts: [],
      });
    });

    it('should parse key with empty parts', () => {
      const result = CacheKeyUtils.parseKey('test:');
      expect(result).toEqual({
        prefix: 'test',
        parts: [''],
      });
    });
  });

  describe('isValidKey', () => {
    it('should return true for valid keys', () => {
      expect(CacheKeyUtils.isValidKey('test:key')).toBe(true);
      expect(CacheKeyUtils.isValidKey('stock_quote:AAPL:longport')).toBe(true);
      expect(CacheKeyUtils.isValidKey('a')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(CacheKeyUtils.isValidKey('')).toBe(false);
      expect(CacheKeyUtils.isValidKey(null as any)).toBe(false);
      expect(CacheKeyUtils.isValidKey(undefined as any)).toBe(false);
      expect(CacheKeyUtils.isValidKey(123 as any)).toBe(false);
    });

    it('should return false for keys that are too long', () => {
      const longKey = 'a'.repeat(CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH + 1);
      expect(CacheKeyUtils.isValidKey(longKey)).toBe(false);
    });

    it('should return false for keys with illegal characters', () => {
      expect(CacheKeyUtils.isValidKey('test key')).toBe(false);
      expect(CacheKeyUtils.isValidKey('test\nkey')).toBe(false);
      expect(CacheKeyUtils.isValidKey('test\rkey')).toBe(false);
      expect(CacheKeyUtils.isValidKey('test\tkey')).toBe(false);
    });
  });

  describe('generatePatternKey', () => {
    it('should generate pattern key with default wildcard', () => {
      const result = CacheKeyUtils.generatePatternKey('test');
      expect(result).toBe('test:*');
    });

    it('should generate pattern key with custom pattern', () => {
      const result = CacheKeyUtils.generatePatternKey('test', 'AAPL*');
      expect(result).toBe('test:AAPL*');
    });
  });

  describe('normalizeKey', () => {
    it('should normalize key by converting to lowercase and replacing spaces', () => {
      const result = CacheKeyUtils.normalizeKey('Test Key With Spaces');
      expect(result).toBe('test_key_with_spaces');
    });

    it('should remove special characters', () => {
      const result = CacheKeyUtils.normalizeKey('test@key#with$special%chars');
      expect(result).toBe('testkeywithspecialchars');
    });

    it('should preserve allowed characters', () => {
      const result = CacheKeyUtils.normalizeKey('test_key:with-allowed.chars123');
      expect(result).toBe('test_key:with-allowed.chars123');
    });
  });
});