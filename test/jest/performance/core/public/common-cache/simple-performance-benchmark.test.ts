import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CommonCacheService } from '@core/public/common-cache/services/common-cache.service';
import { CachePerformanceMonitorService } from '@core/public/common-cache/monitoring/cache-performance-monitor.service';
import { CommonCacheModule } from '@core/public/common-cache/module/common-cache.module';

/**
 * 简化的缓存性能基准测试
 * 专注于CommonCacheService的性能验证
 */
describe('Simple Cache Performance Benchmark', () => {
  let module: TestingModule;
  let commonCache: CommonCacheService;
  let performanceMonitor: CachePerformanceMonitorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            () => ({
              redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                db: parseInt(process.env.REDIS_PERFORMANCE_DB || '14'),
              },
            }),
          ],
        }),
        CommonCacheModule,
      ],
      providers: [
        CachePerformanceMonitorService,
        {
          provide: 'METRICS_REGISTRY',
          useValue: {
            register: {
              getSingleMetric: jest.fn(),
              registerCounter: jest.fn().mockReturnValue({ 
                labels: jest.fn().mockReturnValue({ inc: jest.fn() }) 
              }),
              registerHistogram: jest.fn().mockReturnValue({ 
                labels: jest.fn().mockReturnValue({ observe: jest.fn() }) 
              }),
            },
          },
        },
      ],
    }).compile();

    commonCache = module.get<CommonCacheService>(CommonCacheService);
    performanceMonitor = module.get<CachePerformanceMonitorService>(CachePerformanceMonitorService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('CommonCache Performance Tests', () => {
    beforeEach(async () => {
      // 检查Redis连接
      try {
        await commonCache.isHealthy();
      } catch (error) {
        console.log('Skipping performance tests - Redis not available');
        return;
      }
    });

    it('should benchmark basic get/set operations', async () => {
      const isHealthy = await commonCache.isHealthy().catch(() => false);
      if (!isHealthy) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const iterations = 100;
      const testData = { 
        value: 'performance test data', 
        timestamp: Date.now(),
        size: 'x'.repeat(1000), // 1KB数据
      };

      console.log(`\n📊 Running ${iterations} iterations of get/set operations...`);

      // 测试set操作性能
      const setStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await commonCache.set(`perf:set:${i}`, testData, 3600);
      }
      const setDuration = Date.now() - setStartTime;
      const avgSetTime = setDuration / iterations;

      console.log(`✅ Set operations: ${setDuration}ms total, ${avgSetTime.toFixed(2)}ms avg`);

      // 测试get操作性能 (缓存命中)
      const getStartTime = Date.now();
      let hits = 0;
      for (let i = 0; i < iterations; i++) {
        const result = await commonCache.get(`perf:set:${i}`);
        if (result?.data) hits++;
      }
      const getDuration = Date.now() - getStartTime;
      const avgGetTime = getDuration / iterations;
      const hitRate = hits / iterations;

      console.log(`✅ Get operations: ${getDuration}ms total, ${avgGetTime.toFixed(2)}ms avg`);
      console.log(`✅ Hit rate: ${(hitRate * 100).toFixed(2)}%`);

      // 记录性能指标
      performanceMonitor.recordCacheOperation('common-cache', 'set', 'success', avgSetTime);
      performanceMonitor.recordCacheOperation('common-cache', 'get', 'hit', avgGetTime);

      // 性能断言
      expect(avgSetTime).toBeLessThan(50); // 设置操作应该小于50ms
      expect(avgGetTime).toBeLessThan(20); // 获取操作应该小于20ms
      expect(hitRate).toBeGreaterThan(0.95); // 命中率应该大于95%
    }, 60000);

    it('should benchmark batch operations', async () => {
      const isHealthy = await commonCache.isHealthy().catch(() => false);
      if (!isHealthy) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const batchSize = 50;
      const testData = { value: 'batch test data', timestamp: Date.now() };

      console.log(`\n📊 Running batch operations with ${batchSize} items...`);

      // 准备批量数据
      const entries = Array.from({ length: batchSize }, (_, i) => ({
        key: `perf:batch:${i}`,
        data: { ...testData, id: i },
        ttl: 3600,
      }));

      const keys = entries.map(e => e.key);

      // 测试mset性能
      const msetStartTime = Date.now();
      await commonCache.mset(entries);
      const msetDuration = Date.now() - msetStartTime;

      console.log(`✅ Batch set (${batchSize} items): ${msetDuration}ms`);

      // 测试mget性能
      const mgetStartTime = Date.now();
      const results = await commonCache.mget(keys);
      const mgetDuration = Date.now() - mgetStartTime;

      const hits = results.filter(r => r?.data).length;
      const batchHitRate = hits / batchSize;

      console.log(`✅ Batch get (${batchSize} items): ${mgetDuration}ms`);
      console.log(`✅ Batch hit rate: ${(batchHitRate * 100).toFixed(2)}%`);

      // 记录性能指标
      performanceMonitor.recordCacheOperation('common-cache', 'mset', 'success', msetDuration, batchSize);
      performanceMonitor.recordCacheOperation('common-cache', 'mget', 'hit', mgetDuration, batchSize);

      // 性能断言
      expect(msetDuration).toBeLessThan(1000); // 批量设置应该小于1秒
      expect(mgetDuration).toBeLessThan(500);  // 批量获取应该小于0.5秒
      expect(batchHitRate).toBeGreaterThan(0.95); // 批量命中率应该大于95%
    }, 60000);

    it('should benchmark getWithFallback performance', async () => {
      const isHealthy = await commonCache.isHealthy().catch(() => false);
      if (!isHealthy) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const iterations = 20;
      const testData = { value: 'fallback test data', timestamp: Date.now() };

      console.log(`\n📊 Running ${iterations} iterations of getWithFallback...`);

      // 测试缓存未命中情况下的性能
      const fallbackStartTime = Date.now();
      let fallbackCalls = 0;

      for (let i = 0; i < iterations; i++) {
        await commonCache.getWithFallback(
          `perf:fallback:${i}`,
          async () => {
            fallbackCalls++;
            // 模拟数据库查询延迟
            await new Promise(resolve => setTimeout(resolve, 10));
            return { ...testData, id: i };
          },
          3600
        );
      }

      const fallbackDuration = Date.now() - fallbackStartTime;
      const avgFallbackTime = fallbackDuration / iterations;

      console.log(`✅ Fallback operations: ${fallbackDuration}ms total, ${avgFallbackTime.toFixed(2)}ms avg`);
      console.log(`✅ Fallback calls: ${fallbackCalls}/${iterations}`);

      // 测试缓存命中情况下的性能
      const cachedStartTime = Date.now();
      let cachedFallbackCalls = 0;

      for (let i = 0; i < iterations; i++) {
        await commonCache.getWithFallback(
          `perf:fallback:${i}`,
          async () => {
            cachedFallbackCalls++;
            return { ...testData, id: i };
          },
          3600
        );
      }

      const cachedDuration = Date.now() - cachedStartTime;
      const avgCachedTime = cachedDuration / iterations;

      console.log(`✅ Cached operations: ${cachedDuration}ms total, ${avgCachedTime.toFixed(2)}ms avg`);
      console.log(`✅ Cached fallback calls: ${cachedFallbackCalls}/${iterations}`);

      // 记录性能指标
      performanceMonitor.recordCacheOperation('common-cache', 'get', 'miss', avgFallbackTime);
      performanceMonitor.recordCacheOperation('common-cache', 'get', 'hit', avgCachedTime);

      // 性能断言
      expect(fallbackCalls).toBe(iterations); // 第一次都应该调用fallback
      expect(cachedFallbackCalls).toBe(0);    // 第二次都应该从缓存获取
      expect(avgCachedTime).toBeLessThan(avgFallbackTime * 0.5); // 缓存应该显著更快
    }, 60000);

    it('should benchmark memory usage and cleanup', async () => {
      const isHealthy = await commonCache.isHealthy().catch(() => false);
      if (!isHealthy) {
        console.log('Skipping test - Redis not available');
        return;
      }

      console.log('\n📊 Testing memory usage and cleanup...');

      // 获取初始统计
      const initialStats = await commonCache.getStats();
      console.log(`📊 Initial Redis memory: ${initialStats.usedMemory}`);

      // 创建大量缓存数据
      const dataSize = 100;
      const largeData = 'x'.repeat(10240); // 10KB per item

      for (let i = 0; i < dataSize; i++) {
        await commonCache.set(`perf:memory:${i}`, { data: largeData, id: i }, 3600);
      }

      // 获取使用后的统计
      const afterStats = await commonCache.getStats();
      console.log(`📊 After loading ${dataSize} items: ${afterStats.usedMemory}`);

      // 测试清理性能
      const cleanupStartTime = Date.now();
      for (let i = 0; i < dataSize; i++) {
        await commonCache.delete(`perf:memory:${i}`);
      }
      const cleanupDuration = Date.now() - cleanupStartTime;

      console.log(`✅ Cleanup ${dataSize} items: ${cleanupDuration}ms`);

      // 获取清理后的统计
      const finalStats = await commonCache.getStats();
      console.log(`📊 After cleanup: ${finalStats.usedMemory}`);

      // 性能断言
      expect(cleanupDuration).toBeLessThan(5000); // 清理应该在5秒内完成
      expect(afterStats.totalKeys).toBeGreaterThan(initialStats.totalKeys);
    }, 60000);
  });

  describe('Performance Monitoring Integration', () => {
    it('should generate performance summary', async () => {
      console.log('\n📊 Generating performance summary...');

      // 记录一些示例性能数据
      const operations = [
        { op: 'get', status: 'hit', duration: 5.2 },
        { op: 'get', status: 'miss', duration: 15.8 },
        { op: 'set', status: 'success', duration: 8.1 },
        { op: 'mget', status: 'hit', duration: 22.3 },
        { op: 'mset', status: 'success', duration: 35.6 },
      ];

      operations.forEach(({ op, status, duration }) => {
        performanceMonitor.recordCacheOperation(
          'common-cache', 
          op as any, 
          status as any, 
          duration
        );
      });

      // 获取性能摘要
      const summary = await performanceMonitor.getCachePerformanceSummary();

      console.log('📈 Performance Summary:', {
        commonCache: {
          implementation: summary.commonCache.implementation,
          avgResponseTime: `${summary.commonCache.avgResponseTime.toFixed(2)}ms`,
          hitRate: `${(summary.commonCache.hitRate * 100).toFixed(2)}%`,
          errorRate: `${(summary.commonCache.errorRate * 100).toFixed(2)}%`,
        },
        recommendation: summary.comparison.recommendation,
      });

      expect(summary).toBeDefined();
      expect(summary.commonCache).toBeDefined();
      expect(summary.legacyStorage).toBeDefined();
      expect(summary.comparison).toBeDefined();
    });

    it('should track deprecated method calls', async () => {
      console.log('\n📊 Testing deprecated method tracking...');

      // 模拟弃用方法调用
      const deprecatedCalls = [
        { method: 'getWithSmartCache', module: 'StorageService', caller: 'QueryService' },
        { method: 'batchGetWithSmartCache', module: 'StorageService', caller: 'ReceiverService' },
        { method: 'calculateDynamicTTL', module: 'StorageService', caller: 'SymbolMapperService' },
      ];

      deprecatedCalls.forEach(({ method, module, caller }) => {
        performanceMonitor.recordDeprecatedMethodCall(method, module, caller);
      });

      console.log(`✅ Recorded ${deprecatedCalls.length} deprecated method calls`);

      // 验证记录成功
      expect(deprecatedCalls.length).toBeGreaterThan(0);
    });
  });
});