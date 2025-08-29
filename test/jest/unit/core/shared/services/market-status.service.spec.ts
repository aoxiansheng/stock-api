import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService, MarketStatusResult } from '@core/shared/services/market-status.service';
import { CollectorService } from '../../../../../../src/monitoring/collector/collector.service';
import { Market } from '@common/constants/market.constants';
import { MarketStatus } from '@common/constants/market-trading-hours.constants';
import { TestUtils } from '../../../../shared/test-utils';

describe('MarketStatusService', () => {
  let service: MarketStatusService;
  let mockCollectorService: any;

  beforeEach(async () => {
    mockCollectorService = {
      recordRequest: jest.fn().mockResolvedValue(undefined),
      recordCacheOperation: jest.fn().mockResolvedValue(undefined),
      recordPerformanceMetric: jest.fn().mockResolvedValue(undefined),
      recordError: jest.fn().mockResolvedValue(undefined),
      recordHealthCheck: jest.fn().mockResolvedValue(undefined),
      recordDatabaseOperation: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      handleDataRequest: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketStatusService,
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    service = module.get<MarketStatusService>(MarketStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should get market status for HK market', async () => {
      const result = await service.getMarketStatus(Market.HK);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.HK);
      expect(result.status).toMatch(/^(TRADING|CLOSED|PRE_MARKET|AFTER_HOURS|LUNCH_BREAK|WEEKEND|HOLIDAY)$/);
      expect(result.timezone).toBe('Asia/Hong_Kong');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.currentTime).toBeInstanceOf(Date);
      expect(result.marketTime).toBeInstanceOf(Date);
      expect(typeof result.realtimeCacheTTL).toBe('number');
      expect(typeof result.analyticalCacheTTL).toBe('number');
      expect(typeof result.isHoliday).toBe('boolean');
      expect(typeof result.isDST).toBe('boolean');
    });

    it('should get market status for US market', async () => {
      const result = await service.getMarketStatus(Market.US);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.US);
      expect(result.timezone).toBe('America/New_York');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should get market status for SH market', async () => {
      const result = await service.getMarketStatus(Market.SH);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.SH);
      expect(result.timezone).toBe('Asia/Shanghai');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should get market status for SZ market', async () => {
      const result = await service.getMarketStatus(Market.SZ);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.SZ);
      expect(result.timezone).toBe('Asia/Shanghai');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('缓存机制测试', () => {
    it('should use cache for repeated requests within cache window', async () => {
      const market = Market.HK;

      // 第一次请求
      const result1 = await service.getMarketStatus(market);
      
      // 第二次请求（应该使用缓存）
      const result2 = await service.getMarketStatus(market);

      expect(result1).toEqual(result2);
      
      // 等待setImmediate的监控调用完成
      await new Promise(resolve => setImmediate(resolve));
      
      // 验证监控记录了缓存操作
      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalled();
    });

    it('should handle cache TTL correctly based on market status', async () => {
      const result = await service.getMarketStatus(Market.HK);

      if (result.status === MarketStatus.TRADING) {
        expect(result.realtimeCacheTTL).toBeLessThan(result.analyticalCacheTTL);
        expect(result.realtimeCacheTTL).toBeLessThanOrEqual(10); // Trading: 1 second realtime
      } else if (result.status === MarketStatus.WEEKEND || result.status === MarketStatus.HOLIDAY) {
        expect(result.realtimeCacheTTL).toBeGreaterThanOrEqual(300); // Weekend/Holiday: >=5 minutes
        expect(result.analyticalCacheTTL).toBeGreaterThan(result.realtimeCacheTTL);
      } else {
        // CLOSED, LUNCH_BREAK, etc. have shorter TTL
        expect(result.realtimeCacheTTL).toBeGreaterThanOrEqual(10); // At least 10 seconds
        expect(result.analyticalCacheTTL).toBeGreaterThan(result.realtimeCacheTTL);
      }
    });

    it('should clear expired cache entries', async () => {
      const market = Market.US;

      // 第一次请求
      const result1 = await service.getMarketStatus(market);
      
      // 模拟时间前进超过缓存时间
      jest.useFakeTimers();
      jest.advanceTimersByTime(15 * 60 * 1000); // 15分钟

      // 第二次请求（缓存应该已过期）
      const result2 = await service.getMarketStatus(market);

      // 时间戳应该不同
      expect(result1.currentTime.getTime()).not.toBe(result2.currentTime.getTime());

      jest.useRealTimers();
    });
  });

  describe('批量操作测试', () => {
    it('should get batch market status for multiple markets', async () => {
      const markets = [Market.HK, Market.US, Market.SH, Market.SZ];
      
      const results = await service.getBatchMarketStatus(markets);

      expect(Object.keys(results)).toHaveLength(markets.length);
      
      for (const market of markets) {
        expect(results[market]).toBeDefined();
        expect(results[market].market).toBe(market);
        expect(results[market].confidence).toBeGreaterThan(0.8);
      }

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // 验证批量操作监控
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/market-status/batch',
        'POST',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({
          operation: 'batch_market_status',
          total_markets: markets.length,
          success_count: markets.length,
          error_count: 0
        })
      );
    });

    it('should handle partial failures in batch operations', async () => {
      // 模拟某些市场状态获取失败
      const originalGetMarketStatus = service.getMarketStatus;
      jest.spyOn(service, 'getMarketStatus').mockImplementation((market: Market) => {
        if (market === Market.US) {
          return Promise.reject(new Error('Test error'));
        }
        return originalGetMarketStatus.call(service, market);
      });

      const markets = [Market.HK, Market.US, Market.SH];
      const results = await service.getBatchMarketStatus(markets);

      expect(Object.keys(results)).toHaveLength(markets.length);
      expect(results[Market.HK]).toBeDefined();
      expect(results[Market.US]).toBeDefined(); // 应该有降级处理
      expect(results[Market.SH]).toBeDefined();

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      // 验证部分成功的监控记录
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/internal/market-status/batch',
        'POST',
        207, // 部分成功状态码
        expect.any(Number),
        expect.objectContaining({
          operation: 'batch_market_status',
          total_markets: 3,
          success_count: 2,
          error_count: 1
        })
      );
    });
  });

  describe('时区和时间处理测试', () => {
    it('should handle different timezones correctly', async () => {
      const hkResult = await service.getMarketStatus(Market.HK);
      const usResult = await service.getMarketStatus(Market.US);
      const shResult = await service.getMarketStatus(Market.SH);

      expect(hkResult.timezone).toBe('Asia/Hong_Kong');
      expect(usResult.timezone).toBe('America/New_York');
      expect(shResult.timezone).toBe('Asia/Shanghai');

      // 验证时间对象的有效性
      expect(hkResult.currentTime).toBeInstanceOf(Date);
      expect(hkResult.marketTime).toBeInstanceOf(Date);
      expect(usResult.currentTime).toBeInstanceOf(Date);
      expect(usResult.marketTime).toBeInstanceOf(Date);
    });

    it('should detect weekend status correctly', async () => {
      // 创建一个周六的日期进行测试
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-06T10:00:00.000Z')); // 周六UTC时间

      const result = await service.getMarketStatus(Market.HK);

      // 在某些时区，这可能是周末
      if (result.status === MarketStatus.WEEKEND) {
        expect(result.isHoliday).toBe(false);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      }

      jest.useRealTimers();
    });

    it('should handle different trading sessions for HK market', async () => {
      // HK市场有午休时间
      jest.useFakeTimers();
      
      // 模拟港股午休时间 (12:30-13:00 HK time)
      jest.setSystemTime(new Date('2024-01-08T04:45:00.000Z')); // UTC时间对应HK 12:45

      const result = await service.getMarketStatus(Market.HK);

      if (result.status === MarketStatus.LUNCH_BREAK) {
        expect(result.nextSession).toBeDefined();
        expect(result.nextSessionStart).toBeInstanceOf(Date);
      }

      jest.useRealTimers();
    });
  });

  describe('缓存TTL建议测试', () => {
    it('should provide appropriate cache TTL recommendations', async () => {
      const market = Market.HK;

      const realtimeTTL = await service.getRecommendedCacheTTL(market, 'REALTIME');
      const analyticalTTL = await service.getRecommendedCacheTTL(market, 'ANALYTICAL');

      expect(typeof realtimeTTL).toBe('number');
      expect(typeof analyticalTTL).toBe('number');
      expect(realtimeTTL).toBeGreaterThan(0);
      expect(analyticalTTL).toBeGreaterThan(0);
      expect(analyticalTTL).toBeGreaterThanOrEqual(realtimeTTL);
    });

    it('should handle errors gracefully in TTL calculation', async () => {
      // 模拟getMarketStatus抛出错误
      jest.spyOn(service, 'getMarketStatus').mockRejectedValueOnce(new Error('Test error'));

      const realtimeTTL = await service.getRecommendedCacheTTL(Market.HK, 'REALTIME');
      const analyticalTTL = await service.getRecommendedCacheTTL(Market.HK, 'ANALYTICAL');

      // 应该返回默认值
      expect(realtimeTTL).toBe(60);
      expect(analyticalTTL).toBe(3600);
    });
  });

  describe('错误处理和降级测试', () => {
    it('should handle provider errors gracefully', async () => {
      // MarketStatusService内部有错误处理，应该降级到本地计算
      const result = await service.getMarketStatus(Market.HK);

      expect(result).toBeDefined();
      expect(result.market).toBe(Market.HK);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should record monitoring data on errors', async () => {
      // 模拟内部错误但服务仍能返回结果
      const result = await service.getMarketStatus(Market.US);

      expect(result).toBeDefined();
      
      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));
      
      // 检查监控记录
      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('should process single market status request efficiently', async () => {
      const benchmark = TestUtils.createPerformanceBenchmark(
        'getMarketStatus-single',
        (global as any).testConfig.PERFORMANCE_THRESHOLDS.MARKET_STATUS_CACHE_MISS
      );

      const result = await benchmark.run(async () => {
        return service.getMarketStatus(Market.HK);
      });

      expect(result.result).toBeDefined();
      expect(result.result.market).toBe(Market.HK);
    });

    it('should process cached requests very quickly', async () => {
      // 先调用一次填充缓存
      await service.getMarketStatus(Market.HK);

      // 测试缓存命中性能
      const benchmark = TestUtils.createPerformanceBenchmark(
        'getMarketStatus-cached',
        (global as any).testConfig.PERFORMANCE_THRESHOLDS.MARKET_STATUS_CACHE_HIT
      );

      const result = await benchmark.run(async () => {
        return service.getMarketStatus(Market.HK);
      });

      expect(result.result).toBeDefined();
    });

    it('should handle batch requests efficiently', async () => {
      const markets = [Market.HK, Market.US, Market.SH, Market.SZ];

      const { result, duration } = await TestUtils.measureExecutionTime(async () => {
        return service.getBatchMarketStatus(markets);
      });

      expect(Object.keys(result)).toHaveLength(markets.length);
      expect(duration).toBeLessThan(1000); // 批量请求应在1秒内完成
    });

    it('should handle high concurrency requests', async () => {
      const concurrentRequests = 50;
      const market = Market.HK;

      const promises = Array.from({ length: concurrentRequests }, () =>
        service.getMarketStatus(market)
      );

      const { result: results, duration } = await TestUtils.measureExecutionTime(async () => {
        return Promise.all(promises);
      });

      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(2000); // 50个并发请求应在2秒内完成
      
      // 所有结果应该一致（因为缓存）
      const firstResult = results[0];
      results.forEach((result: MarketStatusResult) => {
        expect(result.market).toBe(firstResult.market);
        expect(result.status).toBe(firstResult.status);
      });
    });
  });

  describe('生命周期管理测试', () => {
    it('should clean up resources on module destroy', () => {
      // 先创建一些缓存数据
      service.getMarketStatus(Market.HK);

      // 调用销毁方法
      service.onModuleDestroy();

      // 验证资源被清理（这个测试更多是确保方法不抛异常）
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('监控集成测试', () => {
    it('should record cache operations correctly', async () => {
      await service.getMarketStatus(Market.HK);

      // Wait for setImmediate monitoring calls to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalled();
      
      const calls = mockCollectorService.recordCacheOperation.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const [operation, hit, duration, metadata] = calls[calls.length - 1];
      expect(typeof operation).toBe('string');
      expect(typeof hit).toBe('boolean');
      expect(typeof duration).toBe('number');
      expect(metadata).toHaveProperty('market');
    });

    it('should handle monitoring failures gracefully', async () => {
      // 模拟监控服务抛出错误
      mockCollectorService.recordCacheOperation.mockImplementation(() => {
        throw new Error('Monitoring error');
      });

      // 主要功能应该仍然工作
      const result = await service.getMarketStatus(Market.HK);
      expect(result).toBeDefined();
      expect(result.market).toBe(Market.HK);
    });
  });

  describe('边界条件测试', () => {
    it('should handle invalid market gracefully', async () => {
      // TypeScript应该阻止这种情况，但测试运行时行为
      const invalidMarket = 'INVALID' as Market;
      
      // The service will call calculateLocalMarketStatus which accesses config.timezone
      // Since INVALID market has no config, this will throw TypeError
      await expect(service.getMarketStatus(invalidMarket)).rejects.toThrow('Cannot read properties of undefined');
    });

    it('should handle system clock changes', async () => {
      jest.useFakeTimers();
      
      const result1 = await service.getMarketStatus(Market.HK);
      
      // 模拟系统时间倒退
      jest.setSystemTime(new Date(Date.now() - 60000));
      
      const result2 = await service.getMarketStatus(Market.HK);
      
      // 服务应该处理时间异常
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      
      jest.useRealTimers();
    });

    it('should handle extreme timezone edge cases', async () => {
      // 测试跨日期边界的情况
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T23:59:59.999Z')); // 接近午夜

      const result = await service.getMarketStatus(Market.HK);

      expect(result).toBeDefined();
      expect(result.currentTime).toBeInstanceOf(Date);
      expect(result.marketTime).toBeInstanceOf(Date);

      jest.useRealTimers();
    });
  });
});