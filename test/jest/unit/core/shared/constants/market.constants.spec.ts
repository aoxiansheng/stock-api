import {
  Market,
  MarketStatus,
  MARKET_CACHE_CONFIG,
  MARKET_API_TIMEOUTS,
  MARKET_BATCH_CONFIG,
  MARKET_TRADING_HOURS,
  CACHE_TTL_BY_MARKET_STATUS,
  CHANGE_DETECTION_THRESHOLDS,
  TradingSession,
  MarketTradingHours
} from '@core/shared/constants/market.constants';

describe('Market Constants', () => {
  describe('Market Enum', () => {
    it('should have all required market types', () => {
      expect(Market.HK).toBe('HK');
      expect(Market.US).toBe('US');
      expect(Market.SZ).toBe('SZ');
      expect(Market.SH).toBe('SH');
      expect(Market.CN).toBe('CN');
      expect(Market.CRYPTO).toBe('CRYPTO');
    });

    it('should have exactly 6 market types', () => {
      const marketValues = Object.values(Market);
      expect(marketValues).toHaveLength(6);
    });

    it('should have consistent uppercase naming', () => {
      const marketValues = Object.values(Market);
      marketValues.forEach(market => {
        expect(market).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('MarketStatus Enum', () => {
    it('should have all market status values', () => {
      expect(MarketStatus.MARKET_CLOSED).toBe('MARKET_CLOSED');
      expect(MarketStatus.PRE_MARKET).toBe('PRE_MARKET');
      expect(MarketStatus.TRADING).toBe('TRADING');
      expect(MarketStatus.LUNCH_BREAK).toBe('LUNCH_BREAK');
      expect(MarketStatus.AFTER_HOURS).toBe('AFTER_HOURS');
      expect(MarketStatus.HOLIDAY).toBe('HOLIDAY');
      expect(MarketStatus.WEEKEND).toBe('WEEKEND');
    });

    it('should have exactly 7 market status values', () => {
      const statusValues = Object.values(MarketStatus);
      expect(statusValues).toHaveLength(7);
    });

    it('should have consistent UPPER_CASE naming', () => {
      const statusValues = Object.values(MarketStatus);
      statusValues.forEach(status => {
        expect(status).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('MARKET_CACHE_CONFIG', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(MARKET_CACHE_CONFIG)).toBe(true);
    });

    it('should have realtime data configuration', () => {
      expect(MARKET_CACHE_CONFIG.REALTIME_DATA.QUOTE_TTL_SEC).toBe(5);
    });

    it('should have basic info configuration', () => {
      expect(MARKET_CACHE_CONFIG.BASIC_INFO.COMPANY_INFO_TTL_SEC).toBe(86400);
    });

    it('should have historical data configuration', () => {
      expect(MARKET_CACHE_CONFIG.HISTORICAL.DAILY_KLINE_TTL_SEC).toBe(86400);
    });

    it('should have logical TTL hierarchy', () => {
      const { REALTIME_DATA, BASIC_INFO, HISTORICAL } = MARKET_CACHE_CONFIG;

      // Realtime should have shortest TTL
      expect(REALTIME_DATA.QUOTE_TTL_SEC).toBeLessThan(BASIC_INFO.COMPANY_INFO_TTL_SEC);
      expect(REALTIME_DATA.QUOTE_TTL_SEC).toBeLessThan(HISTORICAL.DAILY_KLINE_TTL_SEC);
    });
  });

  describe('MARKET_API_TIMEOUTS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(MARKET_API_TIMEOUTS)).toBe(true);
    });

    it('should have realtime timeouts', () => {
      const { REALTIME } = MARKET_API_TIMEOUTS;
      expect(REALTIME.QUOTE_TIMEOUT_MS).toBeDefined();
      expect(REALTIME.MARKET_STATUS_TIMEOUT_MS).toBeDefined();
      expect(REALTIME.STREAM_CONNECT_TIMEOUT_MS).toBeDefined();
      expect(REALTIME.STREAM_HEARTBEAT_TIMEOUT_MS).toBeDefined();
    });

    it('should have historical timeouts', () => {
      const { HISTORICAL } = MARKET_API_TIMEOUTS;
      expect(HISTORICAL.KLINE_TIMEOUT_MS).toBeDefined();
      expect(HISTORICAL.DAILY_DATA_TIMEOUT_MS).toBeDefined();
      expect(HISTORICAL.FINANCIAL_REPORT_TIMEOUT_MS).toBeDefined();
      expect(HISTORICAL.COMPANY_INFO_TIMEOUT_MS).toBeDefined();
    });

    it('should have batch timeouts', () => {
      const { BATCH } = MARKET_API_TIMEOUTS;
      expect(BATCH.BULK_QUOTE_TIMEOUT_MS).toBeDefined();
      expect(BATCH.SYMBOL_LOOKUP_TIMEOUT_MS).toBeDefined();
      expect(BATCH.MARKET_OVERVIEW_TIMEOUT_MS).toBeDefined();
      expect(BATCH.DATA_SYNC_TIMEOUT_MS).toBeDefined();
    });

    it('should have logical timeout hierarchy', () => {
      const { REALTIME, HISTORICAL, BATCH } = MARKET_API_TIMEOUTS;

      // Realtime should be fastest, batch should be slowest
      expect(REALTIME.QUOTE_TIMEOUT_MS).toBeLessThanOrEqual(HISTORICAL.KLINE_TIMEOUT_MS);
      expect(HISTORICAL.FINANCIAL_REPORT_TIMEOUT_MS).toBeLessThanOrEqual(BATCH.BULK_QUOTE_TIMEOUT_MS);
    });
  });

  describe('MARKET_BATCH_CONFIG', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(MARKET_BATCH_CONFIG)).toBe(true);
    });

    it('should have stock data batch configuration', () => {
      const { STOCK_DATA } = MARKET_BATCH_CONFIG;
      expect(STOCK_DATA.QUOTE_BATCH_SIZE).toBeGreaterThan(0);
      expect(STOCK_DATA.SYMBOL_BATCH_SIZE).toBeGreaterThan(0);
      expect(STOCK_DATA.KLINE_BATCH_SIZE).toBeGreaterThan(0);
    });

    it('should have market overview batch configuration', () => {
      const { MARKET_OVERVIEW } = MARKET_BATCH_CONFIG;
      expect(MARKET_OVERVIEW.SECTOR_ANALYSIS_BATCH_SIZE).toBeGreaterThan(0);
      expect(MARKET_OVERVIEW.TOP_MOVERS_BATCH_SIZE).toBeGreaterThan(0);
      expect(MARKET_OVERVIEW.MARKET_INDEX_BATCH_SIZE).toBeGreaterThan(0);
      expect(MARKET_OVERVIEW.VOLUME_LEADERS_BATCH_SIZE).toBeGreaterThan(0);
    });

    it('should have data sync batch configuration', () => {
      const { DATA_SYNC } = MARKET_BATCH_CONFIG;
      expect(DATA_SYNC.COMPANY_INFO_BATCH_SIZE).toBeGreaterThan(0);
      expect(DATA_SYNC.FINANCIAL_DATA_BATCH_SIZE).toBeGreaterThan(0);
      expect(DATA_SYNC.HISTORICAL_PRICE_BATCH_SIZE).toBeGreaterThan(0);
      expect(DATA_SYNC.SYMBOL_MAPPING_BATCH_SIZE).toBeGreaterThan(0);
    });

    it('should have reasonable batch sizes', () => {
      const { STOCK_DATA, MARKET_OVERVIEW, DATA_SYNC } = MARKET_BATCH_CONFIG;

      // All batch sizes should be reasonable (between 1 and 1000)
      const allBatchSizes = [
        STOCK_DATA.QUOTE_BATCH_SIZE,
        STOCK_DATA.SYMBOL_BATCH_SIZE,
        STOCK_DATA.KLINE_BATCH_SIZE,
        MARKET_OVERVIEW.SECTOR_ANALYSIS_BATCH_SIZE,
        MARKET_OVERVIEW.TOP_MOVERS_BATCH_SIZE,
        MARKET_OVERVIEW.MARKET_INDEX_BATCH_SIZE,
        MARKET_OVERVIEW.VOLUME_LEADERS_BATCH_SIZE,
        DATA_SYNC.COMPANY_INFO_BATCH_SIZE,
        DATA_SYNC.FINANCIAL_DATA_BATCH_SIZE,
        DATA_SYNC.HISTORICAL_PRICE_BATCH_SIZE,
        DATA_SYNC.SYMBOL_MAPPING_BATCH_SIZE,
      ];

      allBatchSizes.forEach(size => {
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('MARKET_TRADING_HOURS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(MARKET_TRADING_HOURS)).toBe(true);
    });

    it('should have trading hours for all markets', () => {
      expect(MARKET_TRADING_HOURS[Market.HK]).toBeDefined();
      expect(MARKET_TRADING_HOURS[Market.US]).toBeDefined();
      expect(MARKET_TRADING_HOURS[Market.SZ]).toBeDefined();
      expect(MARKET_TRADING_HOURS[Market.SH]).toBeDefined();
      expect(MARKET_TRADING_HOURS[Market.CN]).toBeDefined();
      expect(MARKET_TRADING_HOURS[Market.CRYPTO]).toBeDefined();
    });

    it('should have valid trading session structure for HK', () => {
      const hkHours = MARKET_TRADING_HOURS[Market.HK];
      expect(hkHours.market).toBe(Market.HK);
      expect(hkHours.timezone).toBeDefined();
      expect(hkHours.tradingSessions).toHaveLength(2); // Morning and afternoon
      expect(hkHours.preMarket).toBeDefined();
      expect(hkHours.tradingDays).toEqual([1, 2, 3, 4, 5]); // Monday to Friday
      expect(hkHours.dstSupport).toBe(false); // Hong Kong doesn't use DST
    });

    it('should have valid trading session structure for US', () => {
      const usHours = MARKET_TRADING_HOURS[Market.US];
      expect(usHours.market).toBe(Market.US);
      expect(usHours.timezone).toBeDefined();
      expect(usHours.tradingSessions).toHaveLength(1); // Single session
      expect(usHours.preMarket).toBeDefined();
      expect(usHours.afterHours).toBeDefined();
      expect(usHours.tradingDays).toEqual([1, 2, 3, 4, 5]); // Monday to Friday
      expect(usHours.dstSupport).toBe(true); // US uses DST
      expect(usHours.dstStart).toBeDefined();
      expect(usHours.dstEnd).toBeDefined();
      expect(usHours.dstOffset).toBe(1);
    });

    it('should have valid trading session structure for CRYPTO', () => {
      const cryptoHours = MARKET_TRADING_HOURS[Market.CRYPTO];
      expect(cryptoHours.market).toBe(Market.CRYPTO);
      expect(cryptoHours.timezone).toBeDefined();
      expect(cryptoHours.tradingSessions).toHaveLength(1); // 24/7 trading
      expect(cryptoHours.tradingSessions[0].start).toBe('00:00');
      expect(cryptoHours.tradingSessions[0].end).toBe('23:59');
      expect(cryptoHours.tradingDays).toEqual([0, 1, 2, 3, 4, 5, 6]); // All days
      expect(cryptoHours.dstSupport).toBe(false);
    });

    it('should have consistent Chinese markets configuration', () => {
      const szHours = MARKET_TRADING_HOURS[Market.SZ];
      const shHours = MARKET_TRADING_HOURS[Market.SH];
      const cnHours = MARKET_TRADING_HOURS[Market.CN];

      // All Chinese markets should have similar structure
      [szHours, shHours, cnHours].forEach(marketHours => {
        expect(marketHours.tradingSessions).toHaveLength(2); // Morning and afternoon
        expect(marketHours.preMarket).toBeDefined();
        expect(marketHours.tradingDays).toEqual([1, 2, 3, 4, 5]);
        expect(marketHours.dstSupport).toBe(false);
      });
    });

    it('should have valid time formats', () => {
      const timeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

      Object.values(MARKET_TRADING_HOURS).forEach(marketHours => {
        marketHours.tradingSessions.forEach(session => {
          expect(session.start).toMatch(timeFormat);
          expect(session.end).toMatch(timeFormat);
          expect(session.name).toBeTruthy();
        });

        if (marketHours.preMarket) {
          expect(marketHours.preMarket.start).toMatch(timeFormat);
          expect(marketHours.preMarket.end).toMatch(timeFormat);
        }

        if (marketHours.afterHours) {
          expect(marketHours.afterHours.start).toMatch(timeFormat);
          expect(marketHours.afterHours.end).toMatch(timeFormat);
        }
      });
    });
  });

  describe('CACHE_TTL_BY_MARKET_STATUS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(CACHE_TTL_BY_MARKET_STATUS)).toBe(true);
    });

    it('should have realtime TTL for all market statuses', () => {
      const { REALTIME } = CACHE_TTL_BY_MARKET_STATUS;

      Object.values(MarketStatus).forEach(status => {
        expect(REALTIME[status]).toBeGreaterThan(0);
      });
    });

    it('should have analytical TTL for all market statuses', () => {
      const { ANALYTICAL } = CACHE_TTL_BY_MARKET_STATUS;

      Object.values(MarketStatus).forEach(status => {
        expect(ANALYTICAL[status]).toBeGreaterThan(0);
      });
    });

    it('should have logical TTL hierarchy based on market activity', () => {
      const { REALTIME, ANALYTICAL } = CACHE_TTL_BY_MARKET_STATUS;

      // During trading, TTL should be shortest
      expect(REALTIME[MarketStatus.TRADING]).toBeLessThan(REALTIME[MarketStatus.PRE_MARKET]);
      expect(REALTIME[MarketStatus.TRADING]).toBeLessThan(REALTIME[MarketStatus.MARKET_CLOSED]);

      // Analytical should always be longer than realtime
      Object.values(MarketStatus).forEach(status => {
        expect(ANALYTICAL[status]).toBeGreaterThan(REALTIME[status]);
      });

      // Holidays and weekends should have longest TTL
      expect(REALTIME[MarketStatus.HOLIDAY]).toBeGreaterThan(REALTIME[MarketStatus.TRADING]);
      expect(REALTIME[MarketStatus.WEEKEND]).toBeGreaterThan(REALTIME[MarketStatus.TRADING]);
    });
  });

  describe('CHANGE_DETECTION_THRESHOLDS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(CHANGE_DETECTION_THRESHOLDS)).toBe(true);
    });

    it('should have price change thresholds for all market statuses', () => {
      const { PRICE_CHANGE } = CHANGE_DETECTION_THRESHOLDS;

      Object.values(MarketStatus).forEach(status => {
        expect(PRICE_CHANGE[status]).toBeGreaterThan(0);
        expect(PRICE_CHANGE[status]).toBeLessThan(1); // Should be a reasonable percentage
      });
    });

    it('should have volume change thresholds for all market statuses', () => {
      const { VOLUME_CHANGE } = CHANGE_DETECTION_THRESHOLDS;

      Object.values(MarketStatus).forEach(status => {
        expect(VOLUME_CHANGE[status]).toBeGreaterThan(0);
        expect(VOLUME_CHANGE[status]).toBeLessThan(1); // Should be a reasonable percentage
      });
    });

    it('should have most sensitive thresholds during trading', () => {
      const { PRICE_CHANGE, VOLUME_CHANGE } = CHANGE_DETECTION_THRESHOLDS;

      // Trading time should have the smallest (most sensitive) thresholds
      const tradingPriceThreshold = PRICE_CHANGE[MarketStatus.TRADING];
      const tradingVolumeThreshold = VOLUME_CHANGE[MarketStatus.TRADING];

      Object.values(MarketStatus).forEach(status => {
        if (status !== MarketStatus.TRADING) {
          expect(PRICE_CHANGE[status]).toBeGreaterThanOrEqual(tradingPriceThreshold);
          expect(VOLUME_CHANGE[status]).toBeGreaterThanOrEqual(tradingVolumeThreshold);
        }
      });
    });

    it('should have logical sensitivity hierarchy', () => {
      const { PRICE_CHANGE, VOLUME_CHANGE } = CHANGE_DETECTION_THRESHOLDS;

      // Weekend and holidays should be least sensitive
      expect(PRICE_CHANGE[MarketStatus.WEEKEND]).toBeGreaterThan(PRICE_CHANGE[MarketStatus.TRADING]);
      expect(PRICE_CHANGE[MarketStatus.HOLIDAY]).toBeGreaterThan(PRICE_CHANGE[MarketStatus.TRADING]);

      expect(VOLUME_CHANGE[MarketStatus.WEEKEND]).toBeGreaterThan(VOLUME_CHANGE[MarketStatus.TRADING]);
      expect(VOLUME_CHANGE[MarketStatus.HOLIDAY]).toBeGreaterThan(VOLUME_CHANGE[MarketStatus.TRADING]);
    });
  });

  describe('Type Interfaces', () => {
    it('should support TradingSession interface', () => {
      const mockSession: TradingSession = {
        start: '09:00',
        end: '16:00',
        name: 'Test Session'
      };

      expect(mockSession.start).toBe('09:00');
      expect(mockSession.end).toBe('16:00');
      expect(mockSession.name).toBe('Test Session');
    });

    it('should support MarketTradingHours interface', () => {
      const mockTradingHours: MarketTradingHours = {
        market: Market.HK,
        timezone: 'Asia/Hong_Kong',
        tradingSessions: [{
          start: '09:00',
          end: '16:00',
          name: 'Regular Trading'
        }],
        tradingDays: [1, 2, 3, 4, 5],
        dstSupport: false
      };

      expect(mockTradingHours.market).toBe(Market.HK);
      expect(mockTradingHours.timezone).toBe('Asia/Hong_Kong');
      expect(mockTradingHours.tradingSessions).toHaveLength(1);
      expect(mockTradingHours.tradingDays).toEqual([1, 2, 3, 4, 5]);
      expect(mockTradingHours.dstSupport).toBe(false);
    });
  });

  describe('Integration and Consistency', () => {
    it('should have consistent configuration across all constants', () => {
      // Verify that all constants reference the same market and status enums
      const marketKeys = Object.keys(MARKET_TRADING_HOURS);
      const expectedMarkets = Object.values(Market);

      expect(marketKeys).toEqual(expect.arrayContaining(expectedMarkets));
    });

    it('should maintain frozen state for immutability', () => {
      expect(Object.isFrozen(MARKET_CACHE_CONFIG)).toBe(true);
      expect(Object.isFrozen(MARKET_API_TIMEOUTS)).toBe(true);
      expect(Object.isFrozen(MARKET_BATCH_CONFIG)).toBe(true);
      expect(Object.isFrozen(MARKET_TRADING_HOURS)).toBe(true);
      expect(Object.isFrozen(CACHE_TTL_BY_MARKET_STATUS)).toBe(true);
      expect(Object.isFrozen(CHANGE_DETECTION_THRESHOLDS)).toBe(true);
    });

    it('should have all required market status keys in dynamic configs', () => {
      const statusKeys = Object.values(MarketStatus);

      // Verify CACHE_TTL_BY_MARKET_STATUS has all statuses
      const realtimeKeys = Object.keys(CACHE_TTL_BY_MARKET_STATUS.REALTIME);
      const analyticalKeys = Object.keys(CACHE_TTL_BY_MARKET_STATUS.ANALYTICAL);

      expect(realtimeKeys).toEqual(expect.arrayContaining(statusKeys));
      expect(analyticalKeys).toEqual(expect.arrayContaining(statusKeys));

      // Verify CHANGE_DETECTION_THRESHOLDS has all statuses
      const priceKeys = Object.keys(CHANGE_DETECTION_THRESHOLDS.PRICE_CHANGE);
      const volumeKeys = Object.keys(CHANGE_DETECTION_THRESHOLDS.VOLUME_CHANGE);

      expect(priceKeys).toEqual(expect.arrayContaining(statusKeys));
      expect(volumeKeys).toEqual(expect.arrayContaining(statusKeys));
    });
  });
});
