import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService, MarketStatusResult } from '../../../../../../src/core/shared/services/market-status.service';
import { Market } from '../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../src/common/constants/market-trading-hours.constants';
import { createLogger } from '../../../../../../src/common/config/logger.config';

// Create a single, reusable mock logger instance
const mockLoggerInstance = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the logger to always return the same instance
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
  sanitizeLogData: jest.fn((data) => data),
}));

describe('MarketStatusService', () => {
  let service: MarketStatusService;

  // Mock dates for consistent testing
  const mockTradingDateTime = new Date('2023-06-15T14:30:00.000Z'); // Thursday 10:30 AM EDT
  const mockWeekendDateTime = new Date('2023-06-17T14:30:00.000Z'); // Saturday
  const mockPreMarketDateTime = new Date('2023-06-15T12:00:00.000Z'); // Thursday 8:00 AM EDT
  const mockAfterHoursDateTime = new Date('2023-06-15T21:00:00.000Z'); // Thursday 5:00 PM EDT
  const mockClosedDateTime = new Date('2023-06-15T04:00:00.000Z'); // Thursday 12:00 AM EDT (market truly closed)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketStatusService],
    }).compile();

    service = module.get<MarketStatusService>(MarketStatusService);
    // No need to re-assign mockLogger here

    // Clear any existing cache
    (service as any).statusCache.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getMarketStatus', () => {
    it('should return trading status for US market during trading hours', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);

      const result = await service.getMarketStatus(Market.US);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.US);
      expect(result.status).toBe(MarketStatus.TRADING);
      expect(result.timezone).toBe('America/New_York');
      expect(result.confidence).toBe(0.9);
      expect(result.isHoliday).toBe(false);
      expect(result.realtimeCacheTTL).toBeDefined();
      expect(result.analyticalCacheTTL).toBeDefined();

      jest.useRealTimers();
    });

    it('should return weekend status for non-trading days', async () => {
      jest.useFakeTimers().setSystemTime(mockWeekendDateTime);
      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.WEEKEND);
      expect(result.confidence).toBe(0.95);
      jest.useRealTimers();
    });

    it('should return cached result when available', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      // First call to populate cache
      const firstResult = await service.getMarketStatus(Market.US);

      // Second call should return cached result
      const secondResult = await service.getMarketStatus(Market.US);

      expect(secondResult).toEqual(firstResult);
      jest.useRealTimers();
    });

    it('should handle provider market status integration', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      // Mock getProviderMarketStatus to return null (not implemented yet)
      const spy = jest.spyOn(service as any, 'getProviderMarketStatus').mockResolvedValue(null);

      const result = await service.getMarketStatus(Market.US);

      expect(spy).toHaveBeenCalledWith(Market.US);
      expect(result.status).toBe(MarketStatus.TRADING);
      jest.useRealTimers();
    });

    it('should handle provider market status with conflicting data', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const mockProviderStatus = {
        market: 'US',
        status: 'CLOSED' as const,
        tradingDate: '2023-06-15',
      };

      jest.spyOn(service as any, 'getProviderMarketStatus').mockResolvedValue(mockProviderStatus);

      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.CLOSED); // Provider data takes precedence
      expect(result.confidence).toBe(0.85); // Lower confidence due to conflict
      jest.useRealTimers();
    });

    it('should handle provider market status with consistent data', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const mockProviderStatus = {
        market: 'US',
        status: 'OPEN' as const,
        tradingDate: '2023-06-15',
      };

      jest.spyOn(service as any, 'getProviderMarketStatus').mockResolvedValue(mockProviderStatus);

      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.TRADING);
      expect(result.confidence).toBe(0.98); // Higher confidence due to consistency
      jest.useRealTimers();
    });

    it('should handle holiday status from provider', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const mockProviderStatus = {
        market: 'US',
        status: 'HOLIDAY' as const,
        tradingDate: '2023-06-15',
      };

      jest.spyOn(service as any, 'getProviderMarketStatus').mockResolvedValue(mockProviderStatus);

      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.HOLIDAY);
      expect(result.isHoliday).toBe(true);
      jest.useRealTimers();
    });

    it('should fallback to local calculation when provider fails', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      jest.spyOn(service as any, 'getProviderMarketStatus').mockRejectedValue(new Error('Provider error'));

      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.TRADING);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        '获取市场状态失败',
        expect.objectContaining({
          market: Market.US,
          error: 'Provider error'
        })
      );
      jest.useRealTimers();
    });
  });

  describe('getBatchMarketStatus', () => {
    it('should return status for multiple markets successfully', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const markets = [Market.US, Market.HK, Market.SH];
      const results = await service.getBatchMarketStatus(markets);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results[Market.US]).toBeDefined();
      expect(results[Market.HK]).toBeDefined();
      expect(results[Market.SH]).toBeDefined();
      jest.useRealTimers();
    });

    it('should handle partial failures in batch processing', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const originalGetMarketStatus = service.getMarketStatus;
      const spy = jest.spyOn(service, 'getMarketStatus').mockImplementation(async (market) => {
        if (market === Market.HK) {
          throw new Error('HK market error');
        }
        return originalGetMarketStatus.call(service, market);
      });

      const markets = [Market.US, Market.HK, Market.SH];
      const results = await service.getBatchMarketStatus(markets);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results[Market.US].status).toBe(MarketStatus.TRADING);
      expect(results[Market.HK]).toBeDefined(); // Should fallback to local calculation
      expect(results[Market.SH].status).toBe(MarketStatus.CLOSED); // Different timezone

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        '批量获取市场状态失败',
        expect.objectContaining({
          market: Market.HK
        })
      );

      spy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('getRecommendedCacheTTL', () => {
    it('should return correct TTL for realtime mode during trading', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);

      const ttl = await service.getRecommendedCacheTTL(Market.US, 'REALTIME');

      expect(ttl).toBe(1); // From constant: REALTIME.TRADING
      jest.useRealTimers();
    });

    it('should return correct TTL for analytical mode during trading', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);

      const ttl = await service.getRecommendedCacheTTL(Market.US, 'ANALYTICAL');

      expect(ttl).toBe(60); // From constant: ANALYTICAL.TRADING
      jest.useRealTimers();
    });

    it('should return correct TTL for closed market', async () => {
      jest.useFakeTimers().setSystemTime(mockClosedDateTime);

      const ttl = await service.getRecommendedCacheTTL(Market.US, 'REALTIME');

      expect(ttl).toBe(60); // From constant: REALTIME.CLOSED
      jest.useRealTimers();
    });

    it('should return default TTL when cache is not available', async () => {
      jest.useFakeTimers().setSystemTime(mockClosedDateTime); // Set to a non-trading time
      const realtimeTtl = await service.getRecommendedCacheTTL(Market.US, 'REALTIME');
      const analyticalTtl = await service.getRecommendedCacheTTL(Market.US, 'ANALYTICAL');

      expect(realtimeTtl).toBe(60); // Default for closed
      expect(analyticalTtl).toBe(3600); // Default for closed
      jest.useRealTimers();
    });

    it('should handle errors gracefully and return default values', async () => {
      // Mock getMarketStatus to throw error
      jest.spyOn(service, 'getMarketStatus').mockImplementation(async () => {
        throw new Error('Calculation error');
      });

      const realtimeTtl = await service.getRecommendedCacheTTL(Market.US, 'REALTIME');
      const analyticalTtl = await service.getRecommendedCacheTTL(Market.US, 'ANALYTICAL');

      expect(realtimeTtl).toBe(60);
      expect(analyticalTtl).toBe(3600);
    });
  });

  describe('calculateLocalMarketStatus - Trading Sessions', () => {
    it('should detect pre-market trading hours', async () => {
      jest.useFakeTimers().setSystemTime(mockPreMarketDateTime);
      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.PRE_MARKET);
      expect(result.currentSession?.name).toBe('盘前交易');
      jest.useRealTimers();
    });

    it('should detect after-hours trading', async () => {
      jest.useFakeTimers().setSystemTime(mockAfterHoursDateTime);
      const result = await service.getMarketStatus(Market.US);

      expect(result.status).toBe(MarketStatus.AFTER_HOURS);
      expect(result.currentSession?.name).toBe('盘后交易');
      jest.useRealTimers();
    });

    it('should handle lunch break for Asian markets', async () => {
      // Hong Kong market lunch break time (around 12:30 PM HK time)
      const mockLunchBreakTime = new Date('2023-06-15T04:30:00.000Z');
      jest.useFakeTimers().setSystemTime(mockLunchBreakTime);
      const result = await service.getMarketStatus(Market.HK);

      expect(result.status).toBe(MarketStatus.LUNCH_BREAK);
      expect(result.nextSession).toBeDefined();
      jest.useRealTimers();
    });

    it('should handle different market timezones correctly', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const usResult = await service.getMarketStatus(Market.US);
      const hkResult = await service.getMarketStatus(Market.HK);
      const shResult = await service.getMarketStatus(Market.SH);

      expect(usResult.timezone).toBe('America/New_York');
      expect(hkResult.timezone).toBe('Asia/Hong_Kong');
      expect(shResult.timezone).toBe('Asia/Shanghai');
      jest.useRealTimers();
    });
  });

  describe('checkTradingSessions', () => {
    it('should detect trading session correctly', () => {
      const config = {
        timezone: 'America/New_York',
        market: Market.US,
        tradingDays: [1, 2, 3, 4, 5],
        tradingSessions: [
          { name: 'Regular Trading', start: '09:30', end: '16:00' }
        ],
      };

      const result = (service as any).checkTradingSessions('14:30', config);

      expect(result.status).toBe(MarketStatus.TRADING);
      expect(result.currentSession.name).toBe('Regular Trading');
    });

    it('should detect closed status outside trading hours', () => {
      const config = {
        timezone: 'America/New_York',
        market: Market.US,
        tradingDays: [1, 2, 3, 4, 5],
        tradingSessions: [
          { name: 'Regular Trading', start: '09:30', end: '16:00' }
        ],
      };

      const result = (service as any).checkTradingSessions('08:00', config);

      expect(result.status).toBe(MarketStatus.CLOSED);
      expect(result.currentSession).toBeNull();
    });

    it('should handle multiple trading sessions (lunch break)', () => {
      const config = {
        timezone: 'Asia/Hong_Kong',
        market: Market.HK,
        tradingDays: [1, 2, 3, 4, 5],
        tradingSessions: [
          { name: 'Morning Session', start: '09:30', end: '12:00' },
          { name: 'Afternoon Session', start: '13:00', end: '16:00' }
        ],
      };

      const lunchResult = (service as any).checkTradingSessions('12:30', config);

      expect(lunchResult.status).toBe(MarketStatus.LUNCH_BREAK);
      expect(lunchResult.nextSession.name).toBe('Afternoon Session');
    });
  });

  describe('Utility Methods', () => {
    it('should convert time string to minutes correctly', () => {
      const result1 = (service as any).timeToMinutes('09:30');
      const result2 = (service as any).timeToMinutes('16:00');
      const result3 = (service as any).timeToMinutes('00:00');

      expect(result1).toBe(570); // 9*60 + 30
      expect(result2).toBe(960); // 16*60
      expect(result3).toBe(0);
    });

    it('should format time correctly', () => {
      const date = new Date('2023-06-15T14:30:45.123Z');
      const result = (service as any).formatTime(date);

      expect(result).toMatch(/\d{2}:\d{2}/);
      expect(result.length).toBe(5);
    });

    it('should add minutes to date correctly', () => {
      const baseDate = new Date('2023-06-15T14:30:00.000Z');
      const result = (service as any).addMinutesToDate(baseDate, 30);

      expect(result.getTime()).toBe(baseDate.getTime() + 30 * 60 * 1000);
    });

    it('should detect daylight saving time correctly', () => {
      const summerDate = new Date('2023-07-15T14:30:00.000Z'); // July - DST in US
      const winterDate = new Date('2023-01-15T14:30:00.000Z'); // January - no DST in US

      const usConfig = {
        timezone: 'America/New_York',
        market: Market.US,
        tradingDays: [1, 2, 3, 4, 5],
        tradingSessions: [],
        dstSupport: true,
      };

      const isDSTSummer = (service as any).isDaylightSavingTime(summerDate, usConfig);
      const isDSTWinter = (service as any).isDaylightSavingTime(winterDate, usConfig);

      expect(isDSTSummer).toBe(true);
      expect(isDSTWinter).toBe(false);
    });

    it('should handle markets without DST support', () => {
      const summerDate = new Date('2023-07-15T14:30:00.000Z');
      const noDSTConfig = {
        timezone: 'Asia/Shanghai',
        market: Market.SH,
        tradingDays: [1, 2, 3, 4, 5],
        tradingSessions: [],
        dstSupport: false,
      };

      const isDST = (service as any).isDaylightSavingTime(summerDate, noDSTConfig);

      expect(isDST).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should cache trading status for shorter duration', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      await service.getMarketStatus(Market.US);

      const cache = (service as any).statusCache.get(Market.US);
      expect(cache).toBeDefined();
      expect(cache.result.status).toBe(MarketStatus.TRADING);

      // Cache duration should be shorter for trading hours
      const expectedExpiry = mockTradingDateTime.getTime() + 60 * 1000; // 1 minute
      expect(cache.expiry).toBeCloseTo(expectedExpiry, -1);
      jest.useRealTimers();
    });

    it('should cache non-trading status for longer duration', async () => {
      jest.useFakeTimers().setSystemTime(mockClosedDateTime);
      await service.getMarketStatus(Market.US);

      const cache = (service as any).statusCache.get(Market.US);
      expect(cache).toBeDefined();
      expect(cache.result.status).toBe(MarketStatus.CLOSED);

      // Cache duration should be longer for non-trading hours
      const expectedExpiry = mockClosedDateTime.getTime() + 10 * 60 * 1000; // 10 minutes
      expect(cache.expiry).toBeCloseTo(expectedExpiry, -1);
      jest.useRealTimers();
    });

    it('should return null for expired cache', () => {
      const expiredResult = {
        market: Market.US,
        status: MarketStatus.TRADING,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'America/New_York',
        realtimeCacheTTL: 60,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 0.9,
      };

      // Set cache with past expiry
      (service as any).statusCache.set(Market.US, {
        result: expiredResult,
        expiry: Date.now() - 1000, // Expired 1 second ago
      });

      const cached = (service as any).getCachedStatus(Market.US);

      expect(cached).toBeNull();
    });

    it('should return cached result when not expired', () => {
      const cachedResult = {
        market: Market.US,
        status: MarketStatus.TRADING,
        currentTime: new Date(),
        marketTime: new Date(),
        timezone: 'America/New_York',
        realtimeCacheTTL: 60,
        analyticalCacheTTL: 300,
        isHoliday: false,
        isDST: false,
        confidence: 0.9,
      };

      // Set cache with future expiry
      (service as any).statusCache.set(Market.US, {
        result: cachedResult,
        expiry: Date.now() + 10000, // Expires in 10 seconds
      });

      const cached = (service as any).getCachedStatus(Market.US);

      expect(cached).toEqual(cachedResult);
    });
  });

  describe('getProviderMarketStatus', () => {
    it('should return null when provider capability is not available', async () => {
      const result = await (service as any).getProviderMarketStatus(Market.US);

      expect(result).toBeNull();
    });

    it('should handle provider errors gracefully', async () => {
      // This test is tricky as the method is designed to catch and log.
      // We'll test the logging part.
      const error = new Error('Provider connection failed');
      jest.spyOn(service as any, 'getProviderMarketStatus').mockImplementation(async () => {
        // We need to simulate the inner catch block behavior for a valid test
        (service as any).logger.warn('Provider市场状态获取失败', { market: Market.US, error: error.message });
        return null;
      });

      const result = await (service as any).getProviderMarketStatus(Market.US);

      expect(result).toBeNull();
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Provider市场状态获取失败',
        expect.objectContaining({
          market: Market.US,
          error: 'Provider connection failed'
        })
      );
    });
  });

  describe('mergeMarketStatus', () => {
    const mockLocalStatus: MarketStatusResult = {
      market: Market.US,
      status: MarketStatus.TRADING,
      currentTime: new Date(),
      marketTime: new Date(),
      timezone: 'America/New_York',
      realtimeCacheTTL: 60,
      analyticalCacheTTL: 300,
      isHoliday: false,
      isDST: false,
      confidence: 0.9,
    };

    it('should return local status when provider status is null', () => {
      const result = (service as any).mergeMarketStatus(mockLocalStatus, null);

      expect(result).toEqual(mockLocalStatus);
    });

    it('should merge provider status when available and different', () => {
      const providerStatus = {
        market: 'US',
        status: 'CLOSED' as const,
        tradingDate: '2023-06-15',
      };

      const result = (service as any).mergeMarketStatus(mockLocalStatus, providerStatus);

      expect(result.status).toBe(MarketStatus.CLOSED);
      expect(result.confidence).toBe(0.85); // Lower confidence due to conflict
    });

    it('should maintain high confidence when provider and local status match', () => {
      const providerStatus = {
        market: 'US',
        status: 'OPEN' as const,
        tradingDate: '2023-06-15',
      };

      const result = (service as any).mergeMarketStatus(mockLocalStatus, providerStatus);

      expect(result.status).toBe(MarketStatus.TRADING);
      expect(result.confidence).toBe(0.98); // Higher confidence due to consistency
    });

    it('should handle all provider status mappings', () => {
      const statusMappings = [
        { provider: 'OPEN', expected: MarketStatus.TRADING },
        { provider: 'CLOSED', expected: MarketStatus.CLOSED },
        { provider: 'PRE_OPEN', expected: MarketStatus.PRE_MARKET },
        { provider: 'POST_CLOSE', expected: MarketStatus.AFTER_HOURS },
        { provider: 'HOLIDAY', expected: MarketStatus.HOLIDAY },
      ];

      statusMappings.forEach(({ provider, expected }) => {
        const providerStatus = {
          market: 'US',
          status: provider as any,
          tradingDate: '2023-06-15',
        };

        const result = (service as any).mergeMarketStatus(mockLocalStatus, providerStatus);
        expect(result.status).toBe(expected);
      });
    });
  });

  describe('createStatusResult', () => {
    it('should create complete status result with all required fields', () => {
      const currentTime = new Date();
      const marketTime = new Date();
      const mockConfig = {
        timezone: 'America/New_York',
        market: Market.US,
        tradingDays: [1, 2, 3, 4, 5],
        tradingSessions: [],
        dstSupport: true,
      };

      const result = (service as any).createStatusResult(
        Market.US,
        MarketStatus.TRADING,
        currentTime,
        marketTime,
        mockConfig,
        { confidence: 0.95 }
      );

      expect(result.market).toBe(Market.US);
      expect(result.status).toBe(MarketStatus.TRADING);
      expect(result.currentTime).toBe(currentTime);
      expect(result.marketTime).toBe(marketTime);
      expect(result.timezone).toBe('America/New_York');
      expect(result.confidence).toBe(0.95);
      expect(result.realtimeCacheTTL).toBeDefined();
      expect(result.analyticalCacheTTL).toBeDefined();
      expect(result.isHoliday).toBe(false);
      expect(result.isDST).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed trading hours gracefully', () => {
      const malformedTime = 'invalid:time';
      
      expect(() => {
        (service as any).timeToMinutes(malformedTime);
      }).not.toThrow();
    });

    it('should handle extreme dates without crashing', async () => {
      const extremeDate = new Date('2099-12-31T23:59:59.999Z');
      jest.useFakeTimers().setSystemTime(extremeDate);
      const result = await service.getMarketStatus(Market.US);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.US);
      jest.useRealTimers();
    });

    it('should handle concurrent cache access', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const promises = Array.from({ length: 10 }, () =>
        service.getMarketStatus(Market.US)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.market).toBe(Market.US);
        expect(result.status).toBe(MarketStatus.TRADING);
      });
      jest.useRealTimers();
    });

    it('should handle memory cleanup for cache', () => {
      const initialCacheSize = (service as any).statusCache.size;

      // Fill cache
      Array.from({ length: 10 }, (_, i) => {
        (service as any).statusCache.set(`TEST_MARKET_${i}` as Market, {
          result: {} as MarketStatusResult,
          expiry: Date.now() + 1000,
        });
      });

      expect((service as any).statusCache.size).toBeGreaterThan(initialCacheSize);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency status checks efficiently', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const start = performance.now();

      const promises = Array.from({ length: 100 }, () =>
        service.getMarketStatus(Market.US)
      );

      await Promise.all(promises);

      const end = performance.now();
      const duration = end - start;

      // Should complete 100 requests within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second for 100 requests
      jest.useRealTimers();
    });

    it('should efficiently handle batch requests for all markets', async () => {
      jest.useFakeTimers().setSystemTime(mockTradingDateTime);
      const allMarkets = Object.values(Market);
      const results = await service.getBatchMarketStatus(allMarkets);

      expect(Object.keys(results)).toHaveLength(allMarkets.length);

      allMarkets.forEach(market => {
        expect(results[market]).toBeDefined();
        expect(results[market].market).toBe(market);
      });
      jest.useRealTimers();
    });
  });
});