import {
  SYMBOL_PATTERNS,
  MARKET_TYPES,
  CONFIG,
  MONITORING_CONFIG,
  RETRY_CONFIG,
  ErrorType,
  MarketType,
} from '@core/02-processing/symbol-transformer/constants/symbol-transformer-enhanced.constants';
import { SYMBOL_TRANSFORMER_ERROR_CODES } from '@core/02-processing/symbol-transformer/constants/symbol-transformer-error-codes.constants';

describe('SymbolTransformerEnhancedConstants', () => {
  describe('SYMBOL_PATTERNS', () => {
    it('should have correct regex patterns', () => {
      expect(SYMBOL_PATTERNS.CN).toBeInstanceOf(RegExp);
      expect(SYMBOL_PATTERNS.US).toBeInstanceOf(RegExp);
      expect(SYMBOL_PATTERNS.HK).toBeInstanceOf(RegExp);
    });

    it('should validate CN symbols correctly', () => {
      // Valid CN symbols (6 digits)
      expect(SYMBOL_PATTERNS.CN.test('000001')).toBe(true);
      expect(SYMBOL_PATTERNS.CN.test('600000')).toBe(true);
      expect(SYMBOL_PATTERNS.CN.test('123456')).toBe(true);

      // Invalid CN symbols
      expect(SYMBOL_PATTERNS.CN.test('00001')).toBe(false); // 5 digits
      expect(SYMBOL_PATTERNS.CN.test('0000012')).toBe(false); // 7 digits
      expect(SYMBOL_PATTERNS.CN.test('AAPL')).toBe(false); // letters
      expect(SYMBOL_PATTERNS.CN.test('000001.SZ')).toBe(false); // with suffix
      expect(SYMBOL_PATTERNS.CN.test('00000A')).toBe(false); // contains letter
    });

    it('should validate US symbols correctly', () => {
      // Valid US symbols (pure letters)
      expect(SYMBOL_PATTERNS.US.test('AAPL')).toBe(true);
      expect(SYMBOL_PATTERNS.US.test('GOOGL')).toBe(true);
      expect(SYMBOL_PATTERNS.US.test('MSFT')).toBe(true);
      expect(SYMBOL_PATTERNS.US.test('A')).toBe(true); // single letter
      expect(SYMBOL_PATTERNS.US.test('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(true); // long symbol

      // Invalid US symbols
      expect(SYMBOL_PATTERNS.US.test('AAPL1')).toBe(false); // contains number
      expect(SYMBOL_PATTERNS.US.test('000001')).toBe(false); // pure numbers
      expect(SYMBOL_PATTERNS.US.test('AAPL.US')).toBe(false); // with suffix
      expect(SYMBOL_PATTERNS.US.test('AAPL-B')).toBe(false); // with hyphen
      expect(SYMBOL_PATTERNS.US.test('')).toBe(false); // empty string
    });

    it('should validate HK symbols correctly', () => {
      // Valid HK symbols (.HK suffix)
      expect(SYMBOL_PATTERNS.HK.test('700.HK')).toBe(true);
      expect(SYMBOL_PATTERNS.HK.test('0700.HK')).toBe(true);
      expect(SYMBOL_PATTERNS.HK.test('00700.HK')).toBe(true);
      expect(SYMBOL_PATTERNS.HK.test('AAPL.HK')).toBe(true); // letters before .HK
      expect(SYMBOL_PATTERNS.HK.test('123.hk')).toBe(true); // case insensitive
      expect(SYMBOL_PATTERNS.HK.test('ABC123.Hk')).toBe(true); // mixed case

      // Invalid HK symbols
      expect(SYMBOL_PATTERNS.HK.test('700')).toBe(false); // no .HK suffix
      expect(SYMBOL_PATTERNS.HK.test('700.CN')).toBe(false); // wrong suffix
      expect(SYMBOL_PATTERNS.HK.test('.HK')).toBe(false); // no symbol before .HK
      expect(SYMBOL_PATTERNS.HK.test('700.HK.US')).toBe(false); // multiple suffixes
    });

    it('should be immutable (frozen)', () => {
      expect(() => {
        (SYMBOL_PATTERNS as any).CN = /new-pattern/;
      }).toThrow();

      expect(() => {
        (SYMBOL_PATTERNS as any).NEW_MARKET = /test/;
      }).toThrow();
    });
  });

  describe('MARKET_TYPES', () => {
    it('should have all required market types', () => {
      expect(MARKET_TYPES.CN).toBe('CN');
      expect(MARKET_TYPES.US).toBe('US');
      expect(MARKET_TYPES.HK).toBe('HK');
      expect(MARKET_TYPES.MIXED).toBe('mixed');
      expect(MARKET_TYPES.UNKNOWN).toBe('unknown');
    });

    it('should be immutable (frozen)', () => {
      expect(() => {
        (MARKET_TYPES as any).CN = 'CHINA';
      }).toThrow();

      expect(() => {
        (MARKET_TYPES as any).NEW_MARKET = 'NEW';
      }).toThrow();
    });

    it('should have consistent string values', () => {
      const values = Object.values(MARKET_TYPES);
      expect(values).toContain('CN');
      expect(values).toContain('US');
      expect(values).toContain('HK');
      expect(values).toContain('mixed');
      expect(values).toContain('unknown');
      expect(values.length).toBe(5);
    });
  });

  describe('CONFIG', () => {
    it('should have all required configuration values', () => {
      expect(typeof CONFIG.MAX_SYMBOL_LENGTH).toBe('number');
      expect(typeof CONFIG.MAX_BATCH_SIZE).toBe('number');
      expect(typeof CONFIG.REQUEST_TIMEOUT).toBe('number');
      expect(typeof CONFIG.ENDPOINT).toBe('string');
    });

    it('should have reasonable configuration limits', () => {
      expect(CONFIG.MAX_SYMBOL_LENGTH).toBeGreaterThan(0);
      expect(CONFIG.MAX_SYMBOL_LENGTH).toBeLessThanOrEqual(1000); // reasonable upper bound

      expect(CONFIG.MAX_BATCH_SIZE).toBeGreaterThan(0);
      expect(CONFIG.MAX_BATCH_SIZE).toBeLessThanOrEqual(10000); // reasonable upper bound

      expect(CONFIG.REQUEST_TIMEOUT).toBeGreaterThan(0);
      expect(CONFIG.REQUEST_TIMEOUT).toBeLessThanOrEqual(60000); // max 60 seconds
    });

    it('should have correct default values', () => {
      expect(CONFIG.MAX_SYMBOL_LENGTH).toBe(50);
      expect(CONFIG.MAX_BATCH_SIZE).toBe(1000);
      expect(CONFIG.REQUEST_TIMEOUT).toBe(5000);
      expect(CONFIG.ENDPOINT).toBe('/internal/symbol-transformation');
    });

    it('should be immutable (frozen)', () => {
      expect(() => {
        (CONFIG as any).MAX_SYMBOL_LENGTH = 100;
      }).toThrow();

      expect(() => {
        (CONFIG as any).NEW_CONFIG = 'test';
      }).toThrow();
    });
  });

  describe('MONITORING_CONFIG', () => {
    it('should have performance and error thresholds', () => {
      expect(typeof MONITORING_CONFIG.PERFORMANCE_THRESHOLD_MS).toBe('number');
      expect(typeof MONITORING_CONFIG.ERROR_RATE_THRESHOLD).toBe('number');
    });

    it('should have reasonable threshold values', () => {
      expect(MONITORING_CONFIG.PERFORMANCE_THRESHOLD_MS).toBeGreaterThan(0);
      expect(MONITORING_CONFIG.PERFORMANCE_THRESHOLD_MS).toBeLessThanOrEqual(10000);

      expect(MONITORING_CONFIG.ERROR_RATE_THRESHOLD).toBeGreaterThan(0);
      expect(MONITORING_CONFIG.ERROR_RATE_THRESHOLD).toBeLessThanOrEqual(1);
    });

    it('should have correct default values', () => {
      expect(MONITORING_CONFIG.PERFORMANCE_THRESHOLD_MS).toBe(200);
      expect(MONITORING_CONFIG.ERROR_RATE_THRESHOLD).toBe(0.01); // 1%
    });

    it('should be immutable (frozen)', () => {
      expect(() => {
        (MONITORING_CONFIG as any).PERFORMANCE_THRESHOLD_MS = 500;
      }).toThrow();
    });
  });

  describe('RETRY_CONFIG', () => {
    it('should have all retry configuration properties', () => {
      expect(typeof RETRY_CONFIG.MAX_RETRY_ATTEMPTS).toBe('number');
      expect(typeof RETRY_CONFIG.RETRY_DELAY_MS).toBe('number');
      expect(typeof RETRY_CONFIG.BACKOFF_MULTIPLIER).toBe('number');
      expect(typeof RETRY_CONFIG.MAX_RETRY_DELAY_MS).toBe('number');
      expect(typeof RETRY_CONFIG.JITTER_FACTOR).toBe('number');
    });

    it('should have reasonable retry values', () => {
      expect(RETRY_CONFIG.MAX_RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(RETRY_CONFIG.MAX_RETRY_ATTEMPTS).toBeLessThanOrEqual(10);

      expect(RETRY_CONFIG.RETRY_DELAY_MS).toBeGreaterThan(0);
      expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBeGreaterThan(1);
      expect(RETRY_CONFIG.MAX_RETRY_DELAY_MS).toBeGreaterThan(RETRY_CONFIG.RETRY_DELAY_MS);
      expect(RETRY_CONFIG.JITTER_FACTOR).toBeGreaterThan(0);
      expect(RETRY_CONFIG.JITTER_FACTOR).toBeLessThan(1);
    });

    it('should have expected default values', () => {
      expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBe(2);
      expect(RETRY_CONFIG.JITTER_FACTOR).toBe(0.1);
    });

    it('should reference unified constants for basic values', () => {
      // These values should come from CONSTANTS.SEMANTIC.RETRY
      expect(typeof RETRY_CONFIG.MAX_RETRY_ATTEMPTS).toBe('number');
      expect(typeof RETRY_CONFIG.RETRY_DELAY_MS).toBe('number');
      expect(typeof RETRY_CONFIG.MAX_RETRY_DELAY_MS).toBe('number');
    });
  });

  describe('ErrorType enum', () => {
    it('should have all required error types', () => {
      expect(ErrorType.NETWORK).toBe('NETWORK');
      expect(ErrorType.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorType.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ErrorType.VALIDATION).toBe('VALIDATION');
      expect(ErrorType.SYSTEM).toBe('SYSTEM');
      expect(ErrorType.UNKNOWN).toBe('UNKNOWN');
    });

    it('should have consistent enum values', () => {
      const values = Object.values(ErrorType);
      expect(values).toContain('NETWORK');
      expect(values).toContain('TIMEOUT');
      expect(values).toContain('SERVICE_UNAVAILABLE');
      expect(values).toContain('VALIDATION');
      expect(values).toContain('SYSTEM');
      expect(values).toContain('UNKNOWN');
      expect(values.length).toBe(6);
    });
  });

  describe('MarketType type', () => {
    it('should match MARKET_TYPES values', () => {
      const marketType: MarketType = 'CN';
      expect(Object.values(MARKET_TYPES)).toContain(marketType);
    });
  });

  describe('Error codes integration', () => {
    it('should have access to error codes', () => {
      expect(SYMBOL_TRANSFORMER_ERROR_CODES).toBeDefined();
      expect(typeof SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT).toBe('string');
      expect(typeof SYMBOL_TRANSFORMER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY).toBe('string');
    });

    it('should have error codes following naming convention', () => {
      Object.values(SYMBOL_TRANSFORMER_ERROR_CODES).forEach(code => {
        expect(code).toMatch(/^SYMBOL_TRANSFORMER_[A-Z_]+_\d+$/);
      });
    });
  });

  describe('Constants immutability', () => {
    it('should prevent modification of all constant objects', () => {
      expect(() => {
        (SYMBOL_PATTERNS as any).TEST = /test/;
      }).toThrow();

      expect(() => {
        (MARKET_TYPES as any).TEST = 'test';
      }).toThrow();

      expect(() => {
        (CONFIG as any).TEST = 'test';
      }).toThrow();

      expect(() => {
        (MONITORING_CONFIG as any).TEST = 'test';
      }).toThrow();
    });

    it('should prevent modification of nested properties', () => {
      expect(() => {
        delete (SYMBOL_PATTERNS as any).CN;
      }).toThrow();

      expect(() => {
        delete (MARKET_TYPES as any).US;
      }).toThrow();

      expect(() => {
        delete (CONFIG as any).MAX_SYMBOL_LENGTH;
      }).toThrow();
    });
  });

  describe('Pattern matching comprehensive tests', () => {
    it('should handle edge cases for symbol patterns', () => {
      // Empty strings
      expect(SYMBOL_PATTERNS.CN.test('')).toBe(false);
      expect(SYMBOL_PATTERNS.US.test('')).toBe(false);
      expect(SYMBOL_PATTERNS.HK.test('')).toBe(false);

      // Whitespace
      expect(SYMBOL_PATTERNS.CN.test(' 000001 ')).toBe(false);
      expect(SYMBOL_PATTERNS.US.test(' AAPL ')).toBe(false);
      expect(SYMBOL_PATTERNS.HK.test(' 700.HK ')).toBe(false);

      // Special characters
      expect(SYMBOL_PATTERNS.CN.test('000001@')).toBe(false);
      expect(SYMBOL_PATTERNS.US.test('AAPL$')).toBe(false);
      expect(SYMBOL_PATTERNS.HK.test('700@.HK')).toBe(true); // @ is allowed before .HK
    });

    it('should validate mixed case correctly', () => {
      expect(SYMBOL_PATTERNS.US.test('aapl')).toBe(true); // lowercase
      expect(SYMBOL_PATTERNS.US.test('AAPL')).toBe(true); // uppercase
      expect(SYMBOL_PATTERNS.US.test('AaPl')).toBe(true); // mixed case

      expect(SYMBOL_PATTERNS.HK.test('700.hk')).toBe(true);
      expect(SYMBOL_PATTERNS.HK.test('700.HK')).toBe(true);
      expect(SYMBOL_PATTERNS.HK.test('700.Hk')).toBe(true);
    });

    it('should handle boundary conditions', () => {
      // Minimum CN symbol
      expect(SYMBOL_PATTERNS.CN.test('000000')).toBe(true);
      // Maximum CN symbol
      expect(SYMBOL_PATTERNS.CN.test('999999')).toBe(true);

      // Single character US symbol
      expect(SYMBOL_PATTERNS.US.test('A')).toBe(true);
      expect(SYMBOL_PATTERNS.US.test('Z')).toBe(true);
    });
  });
});