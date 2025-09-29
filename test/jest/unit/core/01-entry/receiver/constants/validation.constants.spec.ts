/**
 * validation.constants.spec.ts
 * 数据接收验证规则常量单元测试
 * 路径: unit/core/01-entry/receiver/constants/validation.constants.spec.ts
 */

import {
  RECEIVER_VALIDATION_RULES,
  RECEIVER_PERFORMANCE_THRESHOLDS,
  MARKET_RECOGNITION_RULES,
} from '@core/01-entry/receiver/constants/validation.constants';
import { NUMERIC_CONSTANTS } from '@common/constants/core';
import { HTTP_TIMEOUTS, BATCH_SIZE_SEMANTICS } from '@common/constants/semantic';

describe('Receiver Validation Constants', () => {
  describe('RECEIVER_VALIDATION_RULES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_VALIDATION_RULES)).toBe(true);
    });

    it('should contain symbol validation rules', () => {
      expect(RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBe(1);
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBe(20);
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBe(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE);
    });

    it('should contain data type validation rules', () => {
      expect(RECEIVER_VALIDATION_RULES.MIN_DATA_TYPE_LENGTH).toBe(1);
      expect(RECEIVER_VALIDATION_RULES.MAX_DATA_TYPE_LENGTH).toBe(50);
    });

    it('should contain valid regex patterns', () => {
      expect(RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN).toBeInstanceOf(RegExp);
      expect(RECEIVER_VALIDATION_RULES.DATA_TYPE_PATTERN).toBeInstanceOf(RegExp);
    });

    it('should validate symbol patterns correctly', () => {
      const symbolPattern = RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN;

      // Valid symbols
      expect(symbolPattern.test('AAPL')).toBe(true);
      expect(symbolPattern.test('700.HK')).toBe(true);
      expect(symbolPattern.test('000001.SZ')).toBe(true);
      expect(symbolPattern.test('600000.SH')).toBe(true);
      expect(symbolPattern.test('BTC-USD')).toBe(true);
      expect(symbolPattern.test('TEST_123')).toBe(true);

      // Invalid symbols
      expect(symbolPattern.test('AAPL@')).toBe(false);
      expect(symbolPattern.test('TEST#123')).toBe(false);
      expect(symbolPattern.test('SYM BOL')).toBe(false);
      expect(symbolPattern.test('TEST%')).toBe(false);
    });

    it('should validate data type patterns correctly', () => {
      const dataTypePattern = RECEIVER_VALIDATION_RULES.DATA_TYPE_PATTERN;

      // Valid data types
      expect(dataTypePattern.test('get-stock-quote')).toBe(true);
      expect(dataTypePattern.test('get-stock-basic-info')).toBe(true);
      expect(dataTypePattern.test('get-index-quote')).toBe(true);
      expect(dataTypePattern.test('get-market-status')).toBe(true);

      // Invalid data types
      expect(dataTypePattern.test('GetStockQuote')).toBe(false);
      expect(dataTypePattern.test('get_stock_quote')).toBe(false);
      expect(dataTypePattern.test('GET-STOCK-QUOTE')).toBe(false);
      expect(dataTypePattern.test('get stock quote')).toBe(false);
    });

    it('should have consistent length constraints', () => {
      expect(RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBeLessThanOrEqual(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH);
      expect(RECEIVER_VALIDATION_RULES.MIN_DATA_TYPE_LENGTH).toBeLessThanOrEqual(RECEIVER_VALIDATION_RULES.MAX_DATA_TYPE_LENGTH);
    });

    it('should use shared constants for symbol count limits', () => {
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBe(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE);
      expect(typeof RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBe('number');
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBeGreaterThan(0);
    });
  });

  describe('RECEIVER_PERFORMANCE_THRESHOLDS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_PERFORMANCE_THRESHOLDS)).toBe(true);
    });

    it('should contain timing thresholds', () => {
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS).toBe(NUMERIC_CONSTANTS.N_1000);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.PROVIDER_SELECTION_TIMEOUT_MS).toBe(HTTP_TIMEOUTS.REQUEST.FAST_MS);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.SYMBOL_TRANSFORMATION_TIMEOUT_MS).toBe(HTTP_TIMEOUTS.REQUEST.NORMAL_MS);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.DATA_FETCHING_TIMEOUT_MS).toBe(HTTP_TIMEOUTS.REQUEST.NORMAL_MS);
    });

    it('should contain count thresholds', () => {
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST).toBe(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBe(NUMERIC_CONSTANTS.N_10);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LARGE_SYMBOL_COUNT_WARNING).toBe(NUMERIC_CONSTANTS.N_50);
    });

    it('should have logical threshold relationships', () => {
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT)
        .toBeLessThanOrEqual(RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST);

      expect(RECEIVER_PERFORMANCE_THRESHOLDS.PROVIDER_SELECTION_TIMEOUT_MS)
        .toBeLessThanOrEqual(RECEIVER_PERFORMANCE_THRESHOLDS.SYMBOL_TRANSFORMATION_TIMEOUT_MS);
    });

    it('should use shared constants for consistency', () => {
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS).toBe(NUMERIC_CONSTANTS.N_1000);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBe(NUMERIC_CONSTANTS.N_10);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LARGE_SYMBOL_COUNT_WARNING).toBe(NUMERIC_CONSTANTS.N_50);
    });

    it('should have positive timeout values', () => {
      const timeoutFields = [
        'PROVIDER_SELECTION_TIMEOUT_MS',
        'SYMBOL_TRANSFORMATION_TIMEOUT_MS',
        'DATA_FETCHING_TIMEOUT_MS',
        'SLOW_REQUEST_MS'
      ];

      timeoutFields.forEach(field => {
        expect(RECEIVER_PERFORMANCE_THRESHOLDS[field]).toBeGreaterThan(0);
        expect(typeof RECEIVER_PERFORMANCE_THRESHOLDS[field]).toBe('number');
      });
    });
  });

  describe('MARKET_RECOGNITION_RULES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(MARKET_RECOGNITION_RULES)).toBe(true);
    });

    it('should contain all market configurations', () => {
      expect(MARKET_RECOGNITION_RULES.MARKETS).toHaveProperty('HK');
      expect(MARKET_RECOGNITION_RULES.MARKETS).toHaveProperty('US');
      expect(MARKET_RECOGNITION_RULES.MARKETS).toHaveProperty('SZ');
      expect(MARKET_RECOGNITION_RULES.MARKETS).toHaveProperty('SH');
    });

    it('should have frozen market objects', () => {
      const markets = MARKET_RECOGNITION_RULES.MARKETS;
      expect(Object.isFrozen(markets)).toBe(true);
      expect(Object.isFrozen(markets.HK)).toBe(true);
      expect(Object.isFrozen(markets.US)).toBe(true);
      expect(Object.isFrozen(markets.SZ)).toBe(true);
      expect(Object.isFrozen(markets.SH)).toBe(true);
    });

    describe('HK Market Rules', () => {
      const hkMarket = MARKET_RECOGNITION_RULES.MARKETS.HK;

      it('should have correct HK market configuration', () => {
        expect(hkMarket.SUFFIX).toBe('.HK');
        expect(hkMarket.MARKET_CODE).toBe('HK');
        expect(hkMarket.NUMERIC_PATTERN).toBeInstanceOf(RegExp);
      });

      it('should validate HK symbols correctly', () => {
        const pattern = hkMarket.NUMERIC_PATTERN;

        // Valid HK symbols
        expect(pattern.test('00700')).toBe(true);
        expect(pattern.test('00001')).toBe(true);
        expect(pattern.test('09988')).toBe(true);

        // Invalid HK symbols
        expect(pattern.test('700')).toBe(false);
        expect(pattern.test('00700A')).toBe(false);
        expect(pattern.test('007000')).toBe(false);
      });
    });

    describe('US Market Rules', () => {
      const usMarket = MARKET_RECOGNITION_RULES.MARKETS.US;

      it('should have correct US market configuration', () => {
        expect(usMarket.SUFFIX).toBe('.US');
        expect(usMarket.MARKET_CODE).toBe('US');
        expect(usMarket.ALPHA_PATTERN).toBeInstanceOf(RegExp);
      });

      it('should validate US symbols correctly', () => {
        const pattern = usMarket.ALPHA_PATTERN;

        // Valid US symbols
        expect(pattern.test('AAPL')).toBe(true);
        expect(pattern.test('GOOGL')).toBe(true);
        expect(pattern.test('MSFT')).toBe(true);
        expect(pattern.test('T')).toBe(true); // Single letter
        expect(pattern.test('TSLA')).toBe(true);

        // Invalid US symbols
        expect(pattern.test('aapl')).toBe(false); // lowercase
        expect(pattern.test('AAPLAA')).toBe(false); // too long
        expect(pattern.test('AAPL1')).toBe(false); // contains number
        expect(pattern.test('')).toBe(false); // empty
      });
    });

    describe('SZ Market Rules', () => {
      const szMarket = MARKET_RECOGNITION_RULES.MARKETS.SZ;

      it('should have correct SZ market configuration', () => {
        expect(szMarket.SUFFIX).toBe('.SZ');
        expect(szMarket.MARKET_CODE).toBe('SZ');
        expect(Array.isArray(szMarket.PREFIX_PATTERNS)).toBe(true);
        expect(Object.isFrozen(szMarket.PREFIX_PATTERNS)).toBe(true);
      });

      it('should contain correct SZ prefix patterns', () => {
        expect(szMarket.PREFIX_PATTERNS).toContain('00');
        expect(szMarket.PREFIX_PATTERNS).toContain('30');
        expect(szMarket.PREFIX_PATTERNS).toHaveLength(2);
      });

      it('should validate SZ prefixes correctly', () => {
        const prefixes = szMarket.PREFIX_PATTERNS;

        // Valid SZ prefixes
        expect(prefixes.includes('00')).toBe(true);
        expect(prefixes.includes('30')).toBe(true);

        // Invalid SZ prefixes
        expect(prefixes.includes('60')).toBe(false);
        expect(prefixes.includes('68')).toBe(false);
      });
    });

    describe('SH Market Rules', () => {
      const shMarket = MARKET_RECOGNITION_RULES.MARKETS.SH;

      it('should have correct SH market configuration', () => {
        expect(shMarket.SUFFIX).toBe('.SH');
        expect(shMarket.MARKET_CODE).toBe('SH');
        expect(Array.isArray(shMarket.PREFIX_PATTERNS)).toBe(true);
        expect(Object.isFrozen(shMarket.PREFIX_PATTERNS)).toBe(true);
      });

      it('should contain correct SH prefix patterns', () => {
        expect(shMarket.PREFIX_PATTERNS).toContain('60');
        expect(shMarket.PREFIX_PATTERNS).toContain('68');
        expect(shMarket.PREFIX_PATTERNS).toHaveLength(2);
      });

      it('should validate SH prefixes correctly', () => {
        const prefixes = shMarket.PREFIX_PATTERNS;

        // Valid SH prefixes
        expect(prefixes.includes('60')).toBe(true);
        expect(prefixes.includes('68')).toBe(true);

        // Invalid SH prefixes
        expect(prefixes.includes('00')).toBe(false);
        expect(prefixes.includes('30')).toBe(false);
      });
    });

    it('should have unique market codes', () => {
      const markets = MARKET_RECOGNITION_RULES.MARKETS;
      const marketCodes = Object.values(markets).map(market => market.MARKET_CODE);
      const uniqueCodes = [...new Set(marketCodes)];

      expect(uniqueCodes.length).toBe(marketCodes.length);
    });

    it('should have unique suffixes', () => {
      const markets = MARKET_RECOGNITION_RULES.MARKETS;
      const suffixes = Object.values(markets).map(market => market.SUFFIX);
      const uniqueSuffixes = [...new Set(suffixes)];

      expect(uniqueSuffixes.length).toBe(suffixes.length);
    });

    it('should have non-overlapping prefix patterns between SZ and SH', () => {
      const szPrefixes = MARKET_RECOGNITION_RULES.MARKETS.SZ.PREFIX_PATTERNS;
      const shPrefixes = MARKET_RECOGNITION_RULES.MARKETS.SH.PREFIX_PATTERNS;

      const overlap = szPrefixes.filter(prefix => shPrefixes.includes(prefix));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Constants Integration', () => {
    it('should maintain consistency between validation rules and performance thresholds', () => {
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT)
        .toBe(RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST);
    });

    it('should use shared constants consistently', () => {
      // Verify that all references to shared constants are consistent
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBe(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST).toBe(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS).toBe(NUMERIC_CONSTANTS.N_1000);
    });

    it('should have logical relationships between different constant groups', () => {
      // Symbol length should be reasonable compared to performance limits
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBeLessThan(100);
      expect(RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBeGreaterThan(0);

      // Performance thresholds should be reasonable
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT)
        .toBeLessThan(RECEIVER_PERFORMANCE_THRESHOLDS.LARGE_SYMBOL_COUNT_WARNING);
    });

    it('should maintain all constant types as expected', () => {
      // Validation rules types
      expect(typeof RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBe('number');
      expect(typeof RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBe('number');
      expect(typeof RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN).toBe('object');
      expect(RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN).toBeInstanceOf(RegExp);

      // Performance thresholds types
      expect(typeof RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS).toBe('number');
      expect(typeof RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST).toBe('number');

      // Market rules types
      expect(typeof MARKET_RECOGNITION_RULES.MARKETS).toBe('object');
      expect(typeof MARKET_RECOGNITION_RULES.MARKETS.HK.MARKET_CODE).toBe('string');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should document cleaned up constants', () => {
      // This test ensures we remember what was cleaned up
      // The constants file should document the removed constants:
      // - REQUEST_OPTIONS_PREFERRED_PROVIDER_MAX_LENGTH = 50
      // - REQUEST_OPTIONS_FIELDS_MAX_ITEMS = 50
      // - REQUEST_OPTIONS_MARKET_MAX_LENGTH = 10
      // - REQUEST_OPTIONS_MARKET_PATTERN = /^[A-Z]{2,5}$/

      // Verify these are not accidentally re-added
      expect(RECEIVER_VALIDATION_RULES).not.toHaveProperty('REQUEST_OPTIONS_PREFERRED_PROVIDER_MAX_LENGTH');
      expect(RECEIVER_VALIDATION_RULES).not.toHaveProperty('REQUEST_OPTIONS_FIELDS_MAX_ITEMS');
      expect(RECEIVER_VALIDATION_RULES).not.toHaveProperty('REQUEST_OPTIONS_MARKET_MAX_LENGTH');
      expect(RECEIVER_VALIDATION_RULES).not.toHaveProperty('REQUEST_OPTIONS_MARKET_PATTERN');
    });
  });
});
