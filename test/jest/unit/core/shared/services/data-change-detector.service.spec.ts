
import { Test, TestingModule } from '@nestjs/testing';
import { DataChangeDetectorService } from '../../../../../../src/core/shared/services/data-change-detector.service';
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

describe('DataChangeDetectorService', () => {
  let service: DataChangeDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataChangeDetectorService],
    }).compile();

    service = module.get<DataChangeDetectorService>(DataChangeDetectorService);
    // 清理缓存和模拟函数
    (service as any).snapshotCache.clear();
    jest.clearAllMocks();
  });

  it('服务应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('detectSignificantChange', () => {
    const symbol = 'AAPL';
    const market = Market.US;
    const initialData = { lastPrice: 150.0, volume: 100000 };

    it('首次接收数据时，应报告有变化', async () => {
      const result = await service.detectSignificantChange(symbol, initialData, market, MarketStatus.TRADING);
      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('首次数据');
    });

    it('当数据无变化时（校验和匹配），应报告无变化', async () => {
      // 先存入一个快照
      await service.detectSignificantChange(symbol, initialData, market, MarketStatus.TRADING);
      // 再次用相同数据检测
      const result = await service.detectSignificantChange(symbol, initialData, market, MarketStatus.TRADING);
      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe('数据未变化');
    });

    it('当价格发生显著变化时，应报告有变化', async () => {
      await service.detectSignificantChange(symbol, initialData, market, MarketStatus.TRADING);
      const newData = { ...initialData, lastPrice: 151.0 }; // 价格变化超过阈值
      const result = await service.detectSignificantChange(symbol, newData, market, MarketStatus.TRADING);
      expect(result.hasChanged).toBe(true);
      expect(result.significantChanges).toContain('lastPrice');
      expect(result.changeReason).toBe('价格显著变化');
    });

    it('在交易时间，即使变化不显著，也应报告有变化', async () => {
      await service.detectSignificantChange(symbol, initialData, market, MarketStatus.TRADING);
      const newData = { ...initialData, lastPrice: 150.0001 }; // 价格变化微小
      const result = await service.detectSignificantChange(symbol, newData, market, MarketStatus.TRADING);
      expect(result.hasChanged).toBe(true);
      expect(result.significantChanges.length).toBe(0);
      expect(result.changeReason).toBe('交易时间-有变化');
    });

    it('在非交易时间，微小变化不应报告为显著变化', async () => {
      await service.detectSignificantChange(symbol, initialData, market, MarketStatus.CLOSED);
      const newData = { ...initialData, lastPrice: 150.0001 }; // 价格变化微小
      const result = await service.detectSignificantChange(symbol, newData, market, MarketStatus.CLOSED);
      expect(result.hasChanged).toBe(false);
      expect(result.changeReason).toBe('变化不显著');
    });

    it('当检测过程出错时，应保守地报告有变化', async () => {
      // 破坏内部方法以模拟错误
      jest.spyOn(service as any, 'getLastSnapshot').mockRejectedValue(new Error('Cache error'));
      const result = await service.detectSignificantChange(symbol, initialData, market, MarketStatus.TRADING);
      expect(result.hasChanged).toBe(true);
      expect(result.changeReason).toBe('检测失败-保守处理');
    });
  });

  describe('private methods', () => {
    it('calculateQuickChecksum 应为不同数据生成不同校验和', () => {
      const data1 = { lastPrice: 100, volume: 1000 };
      const data2 = { lastPrice: 101, volume: 1000 };
      const checksum1 = (service as any).calculateQuickChecksum(data1);
      const checksum2 = (service as any).calculateQuickChecksum(data2);
      expect(checksum1).not.toBe(checksum2);
    });

    it('extractNumericValue 应能提取嵌套字段的值', () => {
      const data = { a: { b: [{ c: 123 }] } };
      const value = (service as any).extractNumericValue(data, 'a.b[0].c');
      expect(value).toBe(123);
    });

    it('cleanupOldSnapshots 应能正确清理旧快照', () => {
      const cache = (service as any).snapshotCache;
      const MAX_SIZE = (service as any).MAX_CACHE_SIZE;
      // 填充超过缓存大小的快照
      for (let i = 0; i < MAX_SIZE + 5; i++) {
        cache.set(`SYM${i}`, { symbol: `SYM${i}`, timestamp: Date.now() + i, checksum: '', criticalValues: {} });
      }
      expect(cache.size).toBe(MAX_SIZE + 5);
      // 执行清理
      (service as any).cleanupOldSnapshots();
      // 验证缓存大小
      expect(cache.size).toBe(MAX_SIZE);
    });
  });
});
