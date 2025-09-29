import * as SharedConstants from '@core/shared/constants';
import {
  CORE_LIMITS,
  Market,
  MarketStatus,
  MARKET_CACHE_CONFIG,
  MARKET_TRADING_HOURS,
  SHARED_ERROR_CODES,
  type MarketTradingHours,
  type TradingSession,
  type SharedErrorCode,
} from '@core/shared/constants';

describe('Core Shared Constants Index', () => {
  describe('Module Exports', () => {
    it('should export all required constants and types', () => {
      expect(SharedConstants).toBeDefined();
      expect(typeof SharedConstants).toBe('object');
    });

    it('should export CORE_LIMITS', () => {
      expect(CORE_LIMITS).toBeDefined();
      expect(typeof CORE_LIMITS).toBe('object');
    });

    it('should export Market enum', () => {
      expect(Market).toBeDefined();
      expect(typeof Market).toBe('object');
    });

    it('should export MarketStatus enum', () => {
      expect(MarketStatus).toBeDefined();
      expect(typeof MarketStatus).toBe('object');
    });

    it('should export MARKET_CACHE_CONFIG', () => {
      expect(MARKET_CACHE_CONFIG).toBeDefined();
      expect(typeof MARKET_CACHE_CONFIG).toBe('object');
    });

    it('should export MARKET_TRADING_HOURS', () => {
      expect(MARKET_TRADING_HOURS).toBeDefined();
      expect(typeof MARKET_TRADING_HOURS).toBe('object');
    });

    it('should export SHARED_ERROR_CODES', () => {
      expect(SHARED_ERROR_CODES).toBeDefined();
      expect(typeof SHARED_ERROR_CODES).toBe('object');
    });
  });

  describe('Type Exports', () => {
    it('should support MarketTradingHours type', () => {
      const testTradingHours: MarketTradingHours = {
        market: Market.US,
        timezone: 'America/New_York',
        tradingSessions: [
          {
            name: 'regular',
            start: '09:30',
            end: '16:00',
          }
        ],
        tradingDays: [1, 2, 3, 4, 5],
        dstSupport: true,
      };
      expect(testTradingHours).toBeDefined();
      expect(testTradingHours.market).toBe(Market.US);
      expect(testTradingHours.timezone).toBe('America/New_York');
      expect(testTradingHours.tradingSessions[0].start).toBe('09:30');
      expect(testTradingHours.tradingSessions[0].end).toBe('16:00');
    });

    it('should support TradingSession type', () => {
      const testSession: TradingSession = {
        name: 'regular',
        start: '09:30',
        end: '16:00',
      };
      expect(testSession).toBeDefined();
      expect(testSession.name).toBe('regular');
      expect(testSession.start).toBe('09:30');
      expect(testSession.end).toBe('16:00');
    });

    it('should support SharedErrorCode type', () => {
      const testErrorCode: SharedErrorCode = SHARED_ERROR_CODES.INVALID_PATH_FORMAT;
      expect(testErrorCode).toBe('SHARED_VALIDATION_001');
    });
  });

  describe('Re-export Verification', () => {
    it('should re-export limits constants', () => {
      expect(SharedConstants.CORE_LIMITS).toBe(CORE_LIMITS);
      expect(SharedConstants.CORE_LIMITS).toBeDefined();
    });

    it('should re-export market constants', () => {
      expect(SharedConstants.Market).toBe(Market);
      expect(SharedConstants.MarketStatus).toBe(MarketStatus);
      expect(SharedConstants.MARKET_CACHE_CONFIG).toBe(MARKET_CACHE_CONFIG);
      expect(SharedConstants.MARKET_TRADING_HOURS).toBe(MARKET_TRADING_HOURS);
    });

    it('should re-export error code constants', () => {
      expect(SharedConstants.SHARED_ERROR_CODES).toBe(SHARED_ERROR_CODES);
    });
  });

  describe('Import Accessibility', () => {
    it('should allow direct import of individual constants', () => {
      expect(CORE_LIMITS).toBeDefined();
      expect(Market).toBeDefined();
      expect(MarketStatus).toBeDefined();
      expect(MARKET_CACHE_CONFIG).toBeDefined();
      expect(MARKET_TRADING_HOURS).toBeDefined();
      expect(SHARED_ERROR_CODES).toBeDefined();
    });

    it('should allow namespace import of all constants', () => {
      expect(SharedConstants.CORE_LIMITS).toBeDefined();
      expect(SharedConstants.Market).toBeDefined();
      expect(SharedConstants.MarketStatus).toBeDefined();
      expect(SharedConstants.MARKET_CACHE_CONFIG).toBeDefined();
      expect(SharedConstants.MARKET_TRADING_HOURS).toBeDefined();
      expect(SharedConstants.SHARED_ERROR_CODES).toBeDefined();
    });
  });

  describe('Constant Integrity', () => {
    it('should maintain consistent data between direct and namespace imports', () => {
      expect(CORE_LIMITS).toEqual(SharedConstants.CORE_LIMITS);
      expect(Market).toEqual(SharedConstants.Market);
      expect(MarketStatus).toEqual(SharedConstants.MarketStatus);
      expect(MARKET_CACHE_CONFIG).toEqual(SharedConstants.MARKET_CACHE_CONFIG);
      expect(MARKET_TRADING_HOURS).toEqual(SharedConstants.MARKET_TRADING_HOURS);
      expect(SHARED_ERROR_CODES).toEqual(SharedConstants.SHARED_ERROR_CODES);
    });

    it('should have all constants properly defined', () => {
      expect(Object.keys(CORE_LIMITS).length).toBeGreaterThan(0);
      expect(Object.keys(Market).length).toBeGreaterThan(0);
      expect(Object.keys(MarketStatus).length).toBeGreaterThan(0);
      expect(Object.keys(MARKET_CACHE_CONFIG).length).toBeGreaterThan(0);
      expect(Object.keys(MARKET_TRADING_HOURS).length).toBeGreaterThan(0);
      expect(Object.keys(SHARED_ERROR_CODES).length).toBeGreaterThan(0);
    });
  });

  describe('Usage Scenarios', () => {
    it('should support batch import pattern', () => {
      const {
        CORE_LIMITS: batchLimits,
        Market: batchMarket,
        SHARED_ERROR_CODES: batchErrors,
      } = SharedConstants;

      expect(batchLimits).toBeDefined();
      expect(batchMarket).toBeDefined();
      expect(batchErrors).toBeDefined();
    });

    it('should support selective import pattern', () => {
      const testFunction = (
        limits: typeof CORE_LIMITS,
        market: typeof Market,
        errors: typeof SHARED_ERROR_CODES,
      ) => {
        return {
          hasLimits: Object.keys(limits).length > 0,
          hasMarkets: Object.keys(market).length > 0,
          hasErrors: Object.keys(errors).length > 0,
        };
      };

      const result = testFunction(CORE_LIMITS, Market, SHARED_ERROR_CODES);
      expect(result.hasLimits).toBe(true);
      expect(result.hasMarkets).toBe(true);
      expect(result.hasErrors).toBe(true);
    });

    it('should work with destructuring patterns', () => {
      const { CORE_LIMITS: destructuredLimits } = SharedConstants;
      const { US, HK } = Market;
      const { INVALID_PATH_FORMAT } = SHARED_ERROR_CODES;

      expect(destructuredLimits).toBeDefined();
      expect(US).toBeDefined();
      expect(HK).toBeDefined();
      expect(INVALID_PATH_FORMAT).toBeDefined();
    });
  });
});