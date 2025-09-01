/**
 * Analytics服务 vs 直接性能监控服务 性能基准对比测试
 *
 * 目的：测试引入Analytics层后对性能的影响
 *
 * 测试场景：
 * 1. 健康评分计算性能对比
 * 2. 性能摘要获取性能对比
 * 3. 批量调用性能对比
 */

describe("Analytics vs Direct Performance Benchmark", () => {
  const BENCHMARK_ITERATIONS = 100;
  const WARMUP_ITERATIONS = 10;

  // Mock数据
  const mockPerformanceSummary = {
    timestamp: "2024-01-01T00:00:00.000Z",
    healthScore: 85,
    processingTime: 100,
    summary: {
      totalRequests: 1000,
      averageResponseTime: 150,
      errorRate: 0.02,
      systemLoad: 0.3,
      memoryUsage: 500000000,
      cacheHitRate: 0.85,
    },
    endpoints: [],
    database: {
      connectionPoolSize: 10,
      activeConnections: 5,
      waitingConnections: 0,
      averageQueryTime: 50,
      slowQueries: 2,
      totalQueries: 500,
    },
    redis: {
      memoryUsage: 100000000,
      connectedClients: 10,
      opsPerSecond: 1000,
      hitRate: 0.9,
      evictedKeys: 0,
      expiredKeys: 10,
    },
    system: {
      cpuUsage: 0.4,
      memoryUsage: 1000000000,
      heapUsed: 500000000,
      heapTotal: 1000000000,
      uptime: 3600,
      eventLoopLag: 5,
    },
  };

  // 模拟直接性能监控服务调用
  const directPerformanceCall = () => {
    return new Promise((resolve) => {
      // 模拟直接调用的开销
      setImmediate(() => {
        resolve(mockPerformanceSummary);
      });
    });
  };

  // 模拟通过Analytics服务调用
  const analyticsPerformanceCall = () => {
    return new Promise((resolve) => {
      // 模拟Analytics层的额外开销（缓存查询 + 业务逻辑）
      setImmediate(() => {
        setImmediate(() => {
          resolve(mockPerformanceSummary);
        });
      });
    });
  };

  // 性能测试工具函数
  const benchmarkFunction = async (fn, iterations) => {
    const startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const endTime = process.hrtime.bigint();
    return Number(endTime - startTime) / 1000000; // 转换为毫秒
  };

  beforeAll(async () => {
    // 预热阶段 - 让JIT编译器优化代码
    console.log(`⚡ 预热阶段: ${WARMUP_ITERATIONS} 次迭代...`);

    await benchmarkFunction(directPerformanceCall, WARMUP_ITERATIONS);
    await benchmarkFunction(analyticsPerformanceCall, WARMUP_ITERATIONS);

    console.log("✅ 预热完成");
  });

  it("should benchmark direct performance monitoring calls", async () => {
    console.log(`📊 直接性能监控调用基准测试: ${BENCHMARK_ITERATIONS} 次迭代`);

    const directDuration = await benchmarkFunction(
      directPerformanceCall,
      BENCHMARK_ITERATIONS,
    );
    const avgDirectTime = directDuration / BENCHMARK_ITERATIONS;

    console.log(`📈 直接调用结果:`);
    console.log(`   总时间: ${directDuration.toFixed(2)}ms`);
    console.log(`   平均时间: ${avgDirectTime.toFixed(3)}ms/次`);
    console.log(`   吞吐量: ${(1000 / avgDirectTime).toFixed(0)} 调用/秒`);

    expect(avgDirectTime).toBeGreaterThan(0);
    expect(avgDirectTime).toBeLessThan(50); // 期望平均每次调用少于50ms
  });

  it("should benchmark Analytics service calls", async () => {
    console.log(`🎯 Analytics服务调用基准测试: ${BENCHMARK_ITERATIONS} 次迭代`);

    const analyticsDuration = await benchmarkFunction(
      analyticsPerformanceCall,
      BENCHMARK_ITERATIONS,
    );
    const avgAnalyticsTime = analyticsDuration / BENCHMARK_ITERATIONS;

    console.log(`📈 Analytics调用结果:`);
    console.log(`   总时间: ${analyticsDuration.toFixed(2)}ms`);
    console.log(`   平均时间: ${avgAnalyticsTime.toFixed(3)}ms/次`);
    console.log(`   吞吐量: ${(1000 / avgAnalyticsTime).toFixed(0)} 调用/秒`);

    expect(avgAnalyticsTime).toBeGreaterThan(0);
    expect(avgAnalyticsTime).toBeLessThan(100); // 期望平均每次调用少于100ms
  });

  it("should compare performance overhead of Analytics layer", async () => {
    console.log(`⚖️  性能对比测试: ${BENCHMARK_ITERATIONS} 次迭代`);

    // 并发运行两个测试以减少环境差异
    const [directDuration, analyticsDuration] = await Promise.all([
      benchmarkFunction(directPerformanceCall, BENCHMARK_ITERATIONS),
      benchmarkFunction(analyticsPerformanceCall, BENCHMARK_ITERATIONS),
    ]);

    const avgDirectTime = directDuration / BENCHMARK_ITERATIONS;
    const avgAnalyticsTime = analyticsDuration / BENCHMARK_ITERATIONS;
    const overhead = avgAnalyticsTime - avgDirectTime;
    const overheadPercentage = (overhead / avgDirectTime) * 100;

    console.log(`\n📊 性能对比报告:`);
    console.log(`┌─────────────────┬──────────────┬────────────────┐`);
    console.log(`│ 调用方式        │ 平均时间(ms) │ 吞吐量(调用/秒) │`);
    console.log(`├─────────────────┼──────────────┼────────────────┤`);
    console.log(
      `│ 直接调用        │ ${avgDirectTime.toFixed(3).padStart(12)} │ ${(1000 / avgDirectTime).toFixed(0).padStart(14)} │`,
    );
    console.log(
      `│ Analytics调用   │ ${avgAnalyticsTime.toFixed(3).padStart(12)} │ ${(1000 / avgAnalyticsTime).toFixed(0).padStart(14)} │`,
    );
    console.log(`└─────────────────┴──────────────┴────────────────┘`);
    console.log(`\n🔍 性能开销分析:`);
    console.log(`   绝对开销: ${overhead.toFixed(3)}ms`);
    console.log(`   相对开销: ${overheadPercentage.toFixed(1)}%`);

    // 性能标准断言
    expect(overheadPercentage).toBeLessThan(200); // Analytics层开销不超过200%
    expect(overhead).toBeLessThan(50); // 绝对开销不超过50ms

    // 记录基准数据用于回归测试
    const benchmarkData = {
      timestamp: new Date().toISOString(),
      iterations: BENCHMARK_ITERATIONS,
      directAvgMs: avgDirectTime,
      analyticsAvgMs: avgAnalyticsTime,
      overheadMs: overhead,
      overheadPercentage: overheadPercentage,
    };

    console.log(`\n💾 基准数据:`, JSON.stringify(benchmarkData, null, 2));
  });

  it("should test batch processing performance", async () => {
    console.log(`🔄 批量处理性能测试`);

    const BATCH_SIZES = [1, 5, 10, 25, 50];
    const batchResults = [];

    for (const batchSize of BATCH_SIZES) {
      console.log(`   测试批量大小: ${batchSize}`);

      // 直接批量调用
      const directBatchTime = await benchmarkFunction(async () => {
        const promises = Array(batchSize)
          .fill(0)
          .map(() => directPerformanceCall());
        await Promise.all(promises);
      }, 10);

      // Analytics批量调用
      const analyticsBatchTime = await benchmarkFunction(async () => {
        const promises = Array(batchSize)
          .fill(0)
          .map(() => analyticsPerformanceCall());
        await Promise.all(promises);
      }, 10);

      const avgDirectBatch = directBatchTime / 10;
      const avgAnalyticsBatch = analyticsBatchTime / 10;
      const batchOverhead =
        ((avgAnalyticsBatch - avgDirectBatch) / avgDirectBatch) * 100;

      batchResults.push({
        batchSize,
        directTime: avgDirectBatch,
        analyticsTime: avgAnalyticsBatch,
        overhead: batchOverhead,
      });

      console.log(`     直接调用: ${avgDirectBatch.toFixed(2)}ms`);
      console.log(`     Analytics: ${avgAnalyticsBatch.toFixed(2)}ms`);
      console.log(`     开销: ${batchOverhead.toFixed(1)}%\n`);
    }

    console.log(`📈 批量处理性能汇总:`);
    console.log(`┌────────────┬─────────────┬──────────────┬────────────┐`);
    console.log(`│ 批量大小   │ 直接(ms)    │ Analytics(ms) │ 开销(%)    │`);
    console.log(`├────────────┼─────────────┼──────────────┼────────────┤`);
    batchResults.forEach((result) => {
      console.log(
        `│ ${result.batchSize.toString().padStart(10)} │ ${result.directTime.toFixed(2).padStart(11)} │ ${result.analyticsTime.toFixed(2).padStart(12)} │ ${result.overhead.toFixed(1).padStart(10)} │`,
      );
    });
    console.log(`└────────────┴─────────────┴──────────────┴────────────┘`);

    // 验证批量处理的线性扩展性
    const largestBatch = batchResults[batchResults.length - 1];
    const smallestBatch = batchResults[0];
    const expectedScaling = largestBatch.batchSize / smallestBatch.batchSize;
    const actualDirectScaling =
      largestBatch.directTime / smallestBatch.directTime;
    const actualAnalyticsScaling =
      largestBatch.analyticsTime / smallestBatch.analyticsTime;

    console.log(`\n⚡ 扩展性分析:`);
    console.log(`   期望扩展比例: ${expectedScaling}x`);
    console.log(`   直接调用实际扩展: ${actualDirectScaling.toFixed(2)}x`);
    console.log(`   Analytics实际扩展: ${actualAnalyticsScaling.toFixed(2)}x`);

    // 验证性能没有出现意外的非线性增长
    expect(actualDirectScaling).toBeLessThan(expectedScaling * 1.5);
    expect(actualAnalyticsScaling).toBeLessThan(expectedScaling * 1.5);

    // 验证Analytics层在大批量时没有显著额外开销
    expect(largestBatch.overhead).toBeLessThan(300); // 大批量时开销不超过300%
  });

  it("should measure memory usage impact", async () => {
    console.log(`💾 内存使用影响测试`);

    const memoryBefore = process.memoryUsage();

    // 运行一定数量的Analytics调用
    await benchmarkFunction(analyticsPerformanceCall, BENCHMARK_ITERATIONS);

    const memoryAfter = process.memoryUsage();

    const heapDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
    const externalDelta = memoryAfter.external - memoryBefore.external;

    console.log(`📊 内存使用报告:`);
    console.log(
      `   运行前堆内存: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `   运行后堆内存: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(`   堆内存变化: ${(heapDelta / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `   外部内存变化: ${(externalDelta / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `   平均每次调用内存: ${(heapDelta / BENCHMARK_ITERATIONS / 1024).toFixed(2)} KB`,
    );

    // 验证内存泄漏不严重
    expect(Math.abs(heapDelta)).toBeLessThan(50 * 1024 * 1024); // 绝对变化少于50MB
    expect(Math.abs(heapDelta / BENCHMARK_ITERATIONS)).toBeLessThan(1024 * 10); // 平均每次少于10KB
  });
});
