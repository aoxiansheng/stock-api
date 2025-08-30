import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { StreamCacheModule } from '../../../src/core/05-caching/stream-cache/module/stream-cache.module';
import { StreamCacheService } from '../../../src/core/05-caching/stream-cache/services/stream-cache.service';
import { StreamDataPoint } from '../../../src/core/05-caching/stream-cache/interfaces/stream-cache.interface';
import Redis from 'ioredis';

describe('StreamCache Performance Benchmark', () => {
  let module: TestingModule;
  let streamCacheService: StreamCacheService;
  let redisClient: Redis;

  // 性能基准目标
  const PERFORMANCE_TARGETS = {
    hotCacheLatency: 5,      // 5ms目标
    warmCacheLatency: 50,    // 50ms目标
    batchOperationThroughput: 1000, // 1000 ops/sec
    cacheHitRate: 0.90,      // 90%命中率
    compressionRatio: 0.70,  // 30%压缩效果
  };

  // 测试数据生成器
  const generateTestData = (count: number): any[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: `STOCK${i}.US`,
      price: 100 + Math.random() * 100,
      volume: Math.floor(Math.random() * 10000),
      timestamp: Date.now() + i,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 0.1,
    }));
  };

  beforeAll(async () => {
    // 性能测试专用配置
    const performanceConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_PERF_TEST_DB || '14'), // 性能测试专用DB
      },
      stream_cache: {
        hot_ttl_ms: 10000,        // 10秒 - 更长的TTL便于测试
        warm_ttl_seconds: 300,    // 5分钟
        max_hot_size: 5000,       // 大容量用于性能测试
        cleanup_interval_ms: 60000, // 1分钟清理
      },
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [() => performanceConfig],
        }),
        StreamCacheModule,
      ],
    }).compile();

    streamCacheService = module.get<StreamCacheService>(StreamCacheService);
    redisClient = module.get<Redis>('REDIS_CLIENT');

    // 等待Redis连接并清理测试数据
    await redisClient.ping();
    await redisClient.flushdb();
  });

  afterAll(async () => {
    await redisClient.flushdb();
    await redisClient.quit();
    await module.close();
  });

  describe('延迟性能基准测试', () => {
    const testData = generateTestData(10);

    beforeEach(async () => {
      await streamCacheService.clearAll();
    });

    it('Hot Cache 延迟基准测试 - 目标 < 5ms', async () => {
      const key = 'benchmark:hot-cache-latency';
      const iterations = 1000;

      // 预热数据
      await streamCacheService.setData(key, testData, 'hot');

      const latencies: number[] = [];

      // 执行基准测试
      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await streamCacheService.getData(key);
        const endTime = process.hrtime.bigint();
        
        const latencyNs = Number(endTime - startTime);
        const latencyMs = latencyNs / 1_000_000;
        latencies.push(latencyMs);
      }

      // 计算统计指标
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(iterations * 0.50)];
      const p95 = sortedLatencies[Math.floor(iterations * 0.95)];
      const p99 = sortedLatencies[Math.floor(iterations * 0.99)];

      // 输出性能报告
      console.log('\n=== Hot Cache 延迟性能报告 ===');
      console.log(`迭代次数: ${iterations}`);
      console.log(`平均延迟: ${avgLatency.toFixed(2)}ms`);
      console.log(`P50延迟: ${p50.toFixed(2)}ms`);
      console.log(`P95延迟: ${p95.toFixed(2)}ms`);
      console.log(`P99延迟: ${p99.toFixed(2)}ms`);
      console.log(`目标: < ${PERFORMANCE_TARGETS.hotCacheLatency}ms`);

      // 性能断言
      expect(avgLatency).toBeLessThan(PERFORMANCE_TARGETS.hotCacheLatency);
      expect(p95).toBeLessThan(PERFORMANCE_TARGETS.hotCacheLatency * 2);
      expect(p99).toBeLessThan(PERFORMANCE_TARGETS.hotCacheLatency * 3);

      // 验证缓存命中率
      const stats = streamCacheService.getCacheStats();
      expect(stats.hotCacheHits).toBe(iterations);
      expect(stats.hotCacheMisses).toBe(0);
    });

    it('Warm Cache 延迟基准测试 - 目标 < 50ms', async () => {
      const key = 'benchmark:warm-cache-latency';
      const iterations = 200; // Redis操作较慢，减少迭代次数

      // 仅设置到Warm Cache
      await streamCacheService.setData(key, testData, 'warm');

      const latencies: number[] = [];

      // 执行基准测试
      for (let i = 0; i < iterations; i++) {
        // 清理Hot Cache确保从Warm Cache获取
        await streamCacheService.clearAll();
        await streamCacheService.setData(key, testData, 'warm');

        const startTime = process.hrtime.bigint();
        await streamCacheService.getData(key);
        const endTime = process.hrtime.bigint();
        
        const latencyNs = Number(endTime - startTime);
        const latencyMs = latencyNs / 1_000_000;
        latencies.push(latencyMs);
      }

      // 计算统计指标
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(iterations * 0.50)];
      const p95 = sortedLatencies[Math.floor(iterations * 0.95)];
      const p99 = sortedLatencies[Math.floor(iterations * 0.99)];

      // 输出性能报告
      console.log('\n=== Warm Cache 延迟性能报告 ===');
      console.log(`迭代次数: ${iterations}`);
      console.log(`平均延迟: ${avgLatency.toFixed(2)}ms`);
      console.log(`P50延迟: ${p50.toFixed(2)}ms`);
      console.log(`P95延迟: ${p95.toFixed(2)}ms`);
      console.log(`P99延迟: ${p99.toFixed(2)}ms`);
      console.log(`目标: < ${PERFORMANCE_TARGETS.warmCacheLatency}ms`);

      // 性能断言
      expect(avgLatency).toBeLessThan(PERFORMANCE_TARGETS.warmCacheLatency);
      expect(p95).toBeLessThan(PERFORMANCE_TARGETS.warmCacheLatency * 2);
      expect(p99).toBeLessThan(PERFORMANCE_TARGETS.warmCacheLatency * 3);
    });
  });

  describe('吞吐量性能基准测试', () => {
    it('批量操作吞吐量基准测试 - 目标 > 1000 ops/sec', async () => {
      const batchSize = 100;
      const operations = 20; // 总共2000个操作
      const testDataBatch = generateTestData(batchSize);

      const startTime = Date.now();

      // 并发执行批量操作
      const writePromises = Array.from({ length: operations }, (_, i) => 
        streamCacheService.setData(`benchmark:batch:${i}`, testDataBatch, 'auto')
      );

      await Promise.all(writePromises);

      const readPromises = Array.from({ length: operations }, (_, i) => 
        streamCacheService.getData(`benchmark:batch:${i}`)
      );

      const results = await Promise.all(readPromises);
      const endTime = Date.now();

      // 计算吞吐量
      const totalOperations = operations * 2; // 写入 + 读取
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const throughput = totalOperations / totalTimeSeconds;

      // 输出性能报告
      console.log('\n=== 批量操作吞吐量性能报告 ===');
      console.log(`总操作数: ${totalOperations}`);
      console.log(`总耗时: ${totalTimeSeconds.toFixed(2)}秒`);
      console.log(`吞吐量: ${throughput.toFixed(0)} ops/sec`);
      console.log(`目标: > ${PERFORMANCE_TARGETS.batchOperationThroughput} ops/sec`);

      // 性能断言
      expect(throughput).toBeGreaterThan(PERFORMANCE_TARGETS.batchOperationThroughput);

      // 验证数据完整性
      const successfulReads = results.filter(result => result !== null).length;
      expect(successfulReads).toBe(operations);
    });

    it('高并发访问性能测试', async () => {
      const key = 'benchmark:concurrent-access';
      const testData = generateTestData(50);
      const concurrency = 50;
      const iterationsPerWorker = 20;

      // 预热数据
      await streamCacheService.setData(key, testData, 'hot');

      const startTime = Date.now();

      // 创建并发工作负载
      const workers = Array.from({ length: concurrency }, async () => {
        const workerLatencies: number[] = [];
        
        for (let i = 0; i < iterationsPerWorker; i++) {
          const workerStartTime = process.hrtime.bigint();
          await streamCacheService.getData(key);
          const workerEndTime = process.hrtime.bigint();
          
          const latencyMs = Number(workerEndTime - workerStartTime) / 1_000_000;
          workerLatencies.push(latencyMs);
        }
        
        return workerLatencies;
      });

      const allLatencies = (await Promise.all(workers)).flat();
      const endTime = Date.now();

      // 计算性能指标
      const totalOperations = concurrency * iterationsPerWorker;
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const throughput = totalOperations / totalTimeSeconds;
      const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;

      // 输出性能报告
      console.log('\n=== 高并发访问性能报告 ===');
      console.log(`并发数: ${concurrency}`);
      console.log(`每工作者迭代: ${iterationsPerWorker}`);
      console.log(`总操作数: ${totalOperations}`);
      console.log(`总耗时: ${totalTimeSeconds.toFixed(2)}秒`);
      console.log(`吞吐量: ${throughput.toFixed(0)} ops/sec`);
      console.log(`平均延迟: ${avgLatency.toFixed(2)}ms`);

      // 性能断言
      expect(throughput).toBeGreaterThan(PERFORMANCE_TARGETS.batchOperationThroughput * 0.8);
      expect(avgLatency).toBeLessThan(PERFORMANCE_TARGETS.hotCacheLatency * 2);
    });
  });

  describe('内存效率和压缩性能测试', () => {
    it('数据压缩效率基准测试', async () => {
      const sizes = [10, 50, 100, 500, 1000];
      const compressionResults: Array<{
        dataSize: number;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
      }> = [];

      for (const size of sizes) {
        const testData = generateTestData(size);
        const originalData = JSON.stringify(testData);
        const originalSize = Buffer.byteLength(originalData, 'utf8');

        const key = `benchmark:compression:${size}`;
        await streamCacheService.setData(key, testData, 'warm');

        // 从Redis直接读取压缩后的数据大小
        const redisKey = `stream_cache:${key}`;
        const compressedData = await redisClient.get(redisKey);
        const compressedSize = compressedData ? Buffer.byteLength(compressedData, 'utf8') : originalSize;

        const compressionRatio = compressedSize / originalSize;

        compressionResults.push({
          dataSize: size,
          originalSize,
          compressedSize,
          compressionRatio,
        });
      }

      // 输出压缩性能报告
      console.log('\n=== 数据压缩效率性能报告 ===');
      console.log('数据量\t原始大小\t压缩大小\t压缩比');
      compressionResults.forEach(result => {
        console.log(
          `${result.dataSize}\t` +
          `${result.originalSize}B\t` +
          `${result.compressedSize}B\t` +
          `${(result.compressionRatio * 100).toFixed(1)}%`
        );
      });

      // 验证压缩效果
      const avgCompressionRatio = compressionResults.reduce((sum, r) => sum + r.compressionRatio, 0) / compressionResults.length;
      console.log(`平均压缩比: ${(avgCompressionRatio * 100).toFixed(1)}%`);
      console.log(`目标压缩比: < ${(PERFORMANCE_TARGETS.compressionRatio * 100).toFixed(1)}%`);

      expect(avgCompressionRatio).toBeLessThan(PERFORMANCE_TARGETS.compressionRatio);
    });

    it('内存使用效率测试', async () => {
      const initialStats = streamCacheService.getCacheStats();
      const batchSize = 1000;
      const batches = 10;

      // 逐步增加内存负载
      for (let i = 0; i < batches; i++) {
        const testData = generateTestData(batchSize);
        const keys = Array.from({ length: 10 }, (_, j) => `memory:batch${i}:${j}`);

        // 批量写入数据
        await Promise.all(
          keys.map(key => streamCacheService.setData(key, testData, 'hot'))
        );

        const currentStats = streamCacheService.getCacheStats();
        
        console.log(`批次 ${i + 1}: Hot Cache大小 = ${currentStats.totalSize}`);
      }

      const finalStats = streamCacheService.getCacheStats();

      // 输出内存使用报告
      console.log('\n=== 内存使用效率报告 ===');
      console.log(`最终Hot Cache大小: ${finalStats.totalSize}`);
      console.log(`Hot Cache命中: ${finalStats.hotCacheHits}`);
      console.log(`Hot Cache未命中: ${finalStats.hotCacheMisses}`);
      console.log(`Warm Cache命中: ${finalStats.warmCacheHits}`);
      console.log(`Warm Cache未命中: ${finalStats.warmCacheMisses}`);

      // 验证LRU机制工作正常
      expect(finalStats.totalSize).toBeLessThanOrEqual(5000); // 不超过最大容量
    });
  });

  describe('缓存命中率性能测试', () => {
    it('混合访问模式的缓存命中率测试', async () => {
      const hotSymbols = ['AAPL.US', 'MSFT.US', 'GOOGL.US', 'AMZN.US'];
      const warmSymbols = Array.from({ length: 20 }, (_, i) => `WARM${i}.US`);
      const randomSymbols = Array.from({ length: 100 }, (_, i) => `RAND${i}.US`);

      const testData = generateTestData(10);

      // 设置热门数据
      for (const symbol of hotSymbols) {
        await streamCacheService.setData(`quote:${symbol}`, testData, 'hot');
      }

      // 设置温数据
      for (const symbol of warmSymbols) {
        await streamCacheService.setData(`quote:${symbol}`, testData, 'warm');
      }

      const accessPattern = [
        ...Array(500).fill(hotSymbols).flat(),     // 50% 热门访问
        ...Array(300).fill(warmSymbols).flat(),   // 30% 温数据访问
        ...Array(200).fill(randomSymbols).flat(), // 20% 随机访问 (缓存未命中)
      ];

      // 随机打乱访问顺序
      for (let i = accessPattern.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [accessPattern[i], accessPattern[j]] = [accessPattern[j], accessPattern[i]];
      }

      const startTime = Date.now();

      // 执行混合访问模式
      const results = await Promise.all(
        accessPattern.map(symbol => streamCacheService.getData(`quote:${symbol}`))
      );

      const endTime = Date.now();

      // 计算命中率
      const hits = results.filter(result => result !== null).length;
      const hitRate = hits / accessPattern.length;

      const finalStats = streamCacheService.getCacheStats();
      const totalAccesses = finalStats.hotCacheHits + finalStats.hotCacheMisses + 
                           finalStats.warmCacheHits + finalStats.warmCacheMisses;
      const overallHitRate = (finalStats.hotCacheHits + finalStats.warmCacheHits) / totalAccesses;

      // 输出性能报告
      console.log('\n=== 缓存命中率性能报告 ===');
      console.log(`总访问次数: ${accessPattern.length}`);
      console.log(`处理时间: ${endTime - startTime}ms`);
      console.log(`数据命中: ${hits}`);
      console.log(`数据命中率: ${(hitRate * 100).toFixed(1)}%`);
      console.log(`Hot Cache命中: ${finalStats.hotCacheHits}`);
      console.log(`Warm Cache命中: ${finalStats.warmCacheHits}`);
      console.log(`缓存整体命中率: ${(overallHitRate * 100).toFixed(1)}%`);
      console.log(`目标命中率: > ${(PERFORMANCE_TARGETS.cacheHitRate * 100).toFixed(1)}%`);

      // 性能断言
      expect(overallHitRate).toBeGreaterThan(PERFORMANCE_TARGETS.cacheHitRate * 0.8); // 允许一些容差
    });
  });

  describe('边界条件性能测试', () => {
    it('大数据量处理性能测试', async () => {
      const largeDataSizes = [1000, 5000, 10000];
      const performanceResults: Array<{
        size: number;
        writeTime: number;
        readTime: number;
        dataSize: string;
      }> = [];

      for (const size of largeDataSizes) {
        const largeTestData = generateTestData(size);
        const key = `benchmark:large-data:${size}`;

        // 测试写入性能
        const writeStart = Date.now();
        await streamCacheService.setData(key, largeTestData, 'auto');
        const writeTime = Date.now() - writeStart;

        // 测试读取性能
        const readStart = Date.now();
        const result = await streamCacheService.getData(key);
        const readTime = Date.now() - readStart;

        const dataSize = (JSON.stringify(largeTestData).length / 1024).toFixed(2);

        performanceResults.push({
          size,
          writeTime,
          readTime,
          dataSize: `${dataSize}KB`,
        });

        expect(result).toBeDefined();
        expect(result).toHaveLength(size);
      }

      // 输出性能报告
      console.log('\n=== 大数据量处理性能报告 ===');
      console.log('数据条数\t数据大小\t写入时间\t读取时间');
      performanceResults.forEach(result => {
        console.log(
          `${result.size}\t` +
          `${result.dataSize}\t` +
          `${result.writeTime}ms\t` +
          `${result.readTime}ms`
        );
      });

      // 验证性能不会随数据量线性恶化
      const avgWriteTime = performanceResults.reduce((sum, r) => sum + r.writeTime, 0) / performanceResults.length;
      const avgReadTime = performanceResults.reduce((sum, r) => sum + r.readTime, 0) / performanceResults.length;

      expect(avgWriteTime).toBeLessThan(1000); // 平均写入时间 < 1秒
      expect(avgReadTime).toBeLessThan(500);   // 平均读取时间 < 500ms
    });
  });
});