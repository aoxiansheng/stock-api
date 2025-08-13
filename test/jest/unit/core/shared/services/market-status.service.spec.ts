/* eslint-disable @typescript-eslint/no-unused-vars */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService } from '../../../../../../src/core/public/shared/services/market-status.service';
import { Market } from '../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../src/common/constants/market-trading-hours.constants';


// Mock Logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('MarketStatusService', () => {
  let service: MarketStatusService;
  let dateSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketStatusService],
    }).compile();

    service = module.get<MarketStatusService>(MarketStatusService);
    (service as any).statusCache.clear(); // 清理缓存
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (dateSpy) {
      dateSpy.mockRestore(); // 恢复 Date.now
    }
  });

  it('服务应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('getMarketStatus', () => {
    it('当有有效缓存时，应返回缓存结果', async () => {
      const market = Market.US;
      const cachedResult = { status: MarketStatus.TRADING } as any;
      // 植入缓存
      (service as any).statusCache.set(market, { result: cachedResult, expiry: Date.now() + 10000 });

      const result = await service.getMarketStatus(market);
      expect(result).toBe(cachedResult);
    });

    it('应能通过本地计算确定市场状态（交易中）', async () => {
      const market = Market.US;
      // 模拟一个在美股交易时段的时间 (e.g., Monday 10:30 AM New York time)
      // UTC: Monday, 14:30
      const mockDate = new Date('2024-07-29T14:30:00.000Z');
      dateSpy = jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
      jest.spyOn(global, 'Date').mockImplementation(function(this: Date, date?: any) {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await service.getMarketStatus(market);
      expect(result.status).toBe(MarketStatus.TRADING);
    });

    it('应能通过本地计算确定市场状态（已收盘）', async () => {
      const market = Market.US;
      // 模拟一个在美股收盘后的时间 (e.g., Monday 18:00 PM New York time)
      // UTC: Monday, 22:00
      const mockDate = new Date('2024-07-29T22:00:00.000Z');
      dateSpy = jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
      jest.spyOn(global, 'Date').mockImplementation(function(this: Date, date?: any) {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await service.getMarketStatus(market);
      expect(result.status).toBe(MarketStatus.AFTER_HOURS);
    });

    it('当 Provider 获取失败时，应降级到本地计算', async () => {
      const market = Market.US;
      const localCalculationSpy = jest.spyOn(service as any, 'calculateLocalMarketStatus');
      // 模拟 Provider 失败
      jest.spyOn(service as any, 'getProviderMarketStatus').mockRejectedValue(new Error('Provider down'));

      await service.getMarketStatus(market);
      expect(localCalculationSpy).toHaveBeenCalled();
    });
  });

  describe('getRecommendedCacheTTL', () => {
    it('应为交易中的市场返回较短的实时TTL', async () => {
      const market = Market.US;
      // 模拟交易中
      const mockDate = new Date('2024-07-29T14:30:00.000Z');
      dateSpy = jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
      jest.spyOn(global, 'Date').mockImplementation(function(this: Date, date?: any) {
        if (date) return new Date(date);
        return mockDate;
      });

      const ttl = await service.getRecommendedCacheTTL(market, 'REALTIME');
      expect(ttl).toBeLessThanOrEqual(60); // 交易中TTL通常较短
    });

    it('应为已收盘的市场返回较长的分析TTL', async () => {
      const market = Market.US;
      // 模拟已收盘
      const mockDate = new Date('2024-07-29T22:00:00.000Z');
      dateSpy = jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
      jest.spyOn(global, 'Date').mockImplementation(function(this: Date, date?: any) {
        if (date) return new Date(date);
        return mockDate;
      });

      const ttl = await service.getRecommendedCacheTTL(market, 'ANALYTICAL');
      expect(ttl).toBeGreaterThan(60); // 收盘后TTL通常较长
    });
  });

  describe('private time helpers', () => {
    it('timeToMinutes 应能正确转换时间字符串', () => {
      expect((service as any).timeToMinutes('_09:30')).toBe(570);
      expect((service as any).timeToMinutes('_16:00')).toBe(960);
      expect((service as any).timeToMinutes('invalid-time')).toBe(0);
    });

    it('formatTime 应能正确格式化日期', () => {
      const date = new Date('2024-07-29T14:30:00.000Z');
      const timezone = 'America/New_York';
      // 14:30 UTC is 10:30 in New York
      expect((service as any).formatTime(date, timezone)).toBe('10:30');
    });
  });
});
