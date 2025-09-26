import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarketStatusService, MarketStatusResult } from '@core/shared/services/market-status.service';
import { Market, MarketStatus } from '@core/shared/constants/market.constants';

describe('MarketStatusService', () => {
  let service: MarketStatusService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketStatusService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MarketStatusService>(MarketStatusService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMarketStatus', () => {
    it('should return market status for HK market', async () => {
      const result = await service.getMarketStatus(Market.HK);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.HK);
      expect(result.status).toBeDefined();
      expect(result.currentTime).toBeInstanceOf(Date);
      expect(result.marketTime).toBeInstanceOf(Date);
      expect(result.timezone).toBeTruthy();
      expect(typeof result.realtimeCacheTTL).toBe('number');
      expect(typeof result.analyticalCacheTTL).toBe('number');
      expect(typeof result.isHoliday).toBe('boolean');
      expect(typeof result.isDST).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should return market status for US market', async () => {
      const result = await service.getMarketStatus(Market.US);

      expect(result.market).toBe(Market.US);
      expect(result.isDST).toBeDefined(); // US supports DST
    });

    it('should return 24/7 trading for crypto market', async () => {
      const result = await service.getMarketStatus(Market.CRYPTO);

      expect(result.market).toBe(Market.CRYPTO);
      expect(result.status).toBe(MarketStatus.TRADING);
      expect(result.isDST).toBe(false); // Crypto doesn't use DST
    });

    it('should handle all supported markets', async () => {
      const markets = [Market.HK, Market.US, Market.SZ, Market.SH, Market.CN, Market.CRYPTO];

      for (const market of markets) {
        const result = await service.getMarketStatus(market);
        expect(result.market).toBe(market);
        expect(result.status).toBeDefined();
        expect(Object.values(MarketStatus)).toContain(result.status);
      }
    });
  });

  describe('Cache TTL recommendations', () => {
    it('should provide different TTL values based on market status', async () => {
      const result = await service.getMarketStatus(Market.HK);

      expect(result.realtimeCacheTTL).toBeGreaterThan(0);
      expect(result.analyticalCacheTTL).toBeGreaterThan(0);
      expect(result.analyticalCacheTTL).toBeGreaterThan(result.realtimeCacheTTL);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid market gracefully', async () => {
      await expect(service.getMarketStatus('INVALID' as Market)).rejects.toThrow();
    });
  });

  describe('Service lifecycle', () => {
    it('should cleanup resources on module destroy', async () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
