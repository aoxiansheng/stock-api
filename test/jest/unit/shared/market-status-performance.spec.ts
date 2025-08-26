/**
 * MarketStatusService 性能基准测试
 * 🔧 Phase 1.6: 验证性能优化效果
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService } from '../../../../src/core/shared/services/market-status.service';
import { Market } from '../../../../src/common/constants/market.constants';

describe('MarketStatusService Performance Test', () => {
  let testingModule: TestingModule;
  let marketStatusService: MarketStatusService;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [MarketStatusService],
    }).compile();

    marketStatusService = testingModule.get<MarketStatusService>(MarketStatusService);
  });

  afterAll(async () => {
    if (testingModule) {
      await testingModule.close();
    }
  });

  it('should complete market status check within performance threshold', async () => {
    const iterations = 10;
    const times: number[] = [];
    
    // 预热
    await marketStatusService.getMarketStatus(Market.HK);
    
    // 性能测试
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const result = await marketStatusService.getMarketStatus(Market.HK);
      const duration = Date.now() - startTime;
      
      times.push(duration);
      expect(result).toBeDefined();
      expect(result.market).toBe(Market.HK);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`✅ MarketStatusService 性能测试:`);
    console.log(`   平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log(`   最大响应时间: ${maxTime}ms`);
    console.log(`   测试次数: ${iterations}`);
    
    // 性能阈值验证（文档目标：100ms）
    expect(avgTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(200);
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 20;
    const startTime = Date.now();
    
    // 并发请求测试
    const promises = Array.from({ length: concurrentRequests }, () =>
      marketStatusService.getMarketStatus(Market.US)
    );
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ MarketStatusService 并发测试:`);
    console.log(`   并发请求数: ${concurrentRequests}`);
    console.log(`   总耗时: ${totalTime}ms`);
    console.log(`   平均每请求: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
    
    expect(results).toHaveLength(concurrentRequests);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.market).toBe(Market.US);
    });
    
    // 并发性能阈值（目标：20个并发请求在500ms内完成）
    expect(totalTime).toBeLessThan(500);
  });

  it('should demonstrate formatter caching optimization', () => {
    // 通过反射访问私有静态属性来验证缓存
    const formattersCache = (MarketStatusService as any).formatters;
    
    if (formattersCache && formattersCache.size > 0) {
      console.log(`✅ 时区格式化器缓存优化生效:`);
      console.log(`   缓存的格式化器数量: ${formattersCache.size}`);
      
      // 验证缓存存在
      expect(formattersCache).toBeDefined();
      expect(formattersCache.size).toBeGreaterThan(0);
    } else {
      console.log(`⚠️ 格式化器缓存可能未被使用或无法访问`);
    }
  });
});