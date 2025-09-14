/**
 * 日志系统性能基准测试脚本
 * 
 * 全面测试增强日志系统在不同场景下的性能表现：
 * 1. 启用/禁用功能对比测试
 * 2. 不同负载级别的性能评估
 * 3. 缓存效果验证
 * 4. 内存使用分析
 * 5. 并发性能测试
 * 
 * 运行方法：
 * DISABLE_AUTO_INIT=true npx tsx scripts/performance-benchmark.ts
 */

console.log('⚡ 开始日志系统性能基准测试...\n');

interface BenchmarkResult {
  scenario: string;
  totalQueries: number;
  totalTime: number;
  avgTimePerQuery: number;
  qps: number;
  memoryUsage?: {
    used: number;
    free: number;
    total: number;
  };
  cacheStats?: {
    hitRate: number;
    cacheSize: number;
    evictions: number;
  };
}

// 测试场景配置
const TEST_SCENARIOS = {
  light: { iterations: 1000, description: '轻量负载 (1K queries)' },
  medium: { iterations: 5000, description: '中等负载 (5K queries)' },
  heavy: { iterations: 10000, description: '重量负载 (10K queries)' },
  extreme: { iterations: 50000, description: '极限负载 (50K queries)' },
};

const TEST_CONTEXTS = [
  'CacheService',
  'AuthService', 
  'DataFetcherService',
  'TransformerService',
  'TemplateService',
  'MonitoringCacheService',
];

const TEST_LEVELS = ['info', 'warn', 'error', 'debug', 'verbose'] as const;

/**
 * 获取内存使用情况
 */
function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  return {
    used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024 * 100) / 100,
    total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
  };
}

/**
 * 强制垃圾回收
 */
function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

/**
 * 测试标准Logger性能 (不启用增强功能)
 */
async function benchmarkStandardLogger(iterations: number): Promise<BenchmarkResult> {
  console.log(`📊 测试标准Logger (${iterations} 次查询)...`);
  
  // 重新设置环境变量以禁用增强功能
  const originalValue = process.env.ENHANCED_LOGGING_ENABLED;
  process.env.ENHANCED_LOGGING_ENABLED = 'false';
  
  try {
    // 动态导入以确保使用新的环境变量设置
    const { createLogger } = await import('../src/appcore/config/logger.config');
    
    const logger = createLogger('BenchmarkStandard');
    
    forceGC();
    const memBefore = getMemoryUsage();
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      const context = TEST_CONTEXTS[i % TEST_CONTEXTS.length];
      const level = TEST_LEVELS[i % TEST_LEVELS.length];
      
      // 使用logger的不同方法
      switch (level) {
        case 'info': logger.log(`Standard benchmark test ${i} for ${context}`); break;
        case 'warn': logger.warn(`Standard benchmark test ${i} for ${context}`); break;
        case 'error': logger.error(`Standard benchmark test ${i} for ${context}`); break;
        case 'debug': logger.debug(`Standard benchmark test ${i} for ${context}`); break;
        case 'verbose': logger.verbose(`Standard benchmark test ${i} for ${context}`); break;
      }
    }
    
    const endTime = process.hrtime.bigint();
    const memAfter = getMemoryUsage();
    
    const totalTime = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
    const avgTimePerQuery = totalTime / iterations;
    const qps = iterations / (totalTime / 1000);
    
    return {
      scenario: 'Standard Logger',
      totalQueries: iterations,
      totalTime,
      avgTimePerQuery,
      qps,
      memoryUsage: {
        used: memAfter.used - memBefore.used,
        free: memAfter.free - memBefore.free,
        total: memAfter.total,
      },
    };
    
  } finally {
    // 恢复原始环境变量
    if (originalValue !== undefined) {
      process.env.ENHANCED_LOGGING_ENABLED = originalValue;
    } else {
      delete process.env.ENHANCED_LOGGING_ENABLED;
    }
  }
}

/**
 * 测试增强Logger性能 (启用增强功能)
 */
async function benchmarkEnhancedLogger(iterations: number): Promise<BenchmarkResult> {
  console.log(`📊 测试增强Logger (${iterations} 次查询)...`);
  
  // 设置环境变量以启用增强功能
  const originalValue = process.env.ENHANCED_LOGGING_ENABLED;
  process.env.ENHANCED_LOGGING_ENABLED = 'true';
  
  try {
    // 重新导入以确保使用新的环境变量设置
    delete require.cache[require.resolve('../src/appcore/config/logger.config')];
    delete require.cache[require.resolve('../src/common/logging/log-level-controller')];
    
    const { LogLevelController } = await import('../src/common/logging/log-level-controller');
    const { createLogger } = await import('../src/appcore/config/logger.config');
    
    // 重置控制器以确保清洁的测试环境
    const controller = LogLevelController.getInstance();
    controller.reset();
    await controller.onModuleInit();
    
    const logger = createLogger('BenchmarkEnhanced');
    
    forceGC();
    const memBefore = getMemoryUsage();
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      const context = TEST_CONTEXTS[i % TEST_CONTEXTS.length];
      const level = TEST_LEVELS[i % TEST_LEVELS.length];
      
      // 使用logger的不同方法
      switch (level) {
        case 'info': logger.log(`Enhanced benchmark test ${i} for ${context}`); break;
        case 'warn': logger.warn(`Enhanced benchmark test ${i} for ${context}`); break;
        case 'error': logger.error(`Enhanced benchmark test ${i} for ${context}`); break;
        case 'debug': logger.debug(`Enhanced benchmark test ${i} for ${context}`); break;
        case 'verbose': logger.verbose(`Enhanced benchmark test ${i} for ${context}`); break;
      }
    }
    
    const endTime = process.hrtime.bigint();
    const memAfter = getMemoryUsage();
    
    const totalTime = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
    const avgTimePerQuery = totalTime / iterations;
    const qps = iterations / (totalTime / 1000);
    
    // 获取缓存统计信息
    const stats = controller.getStats();
    const cacheStats = {
      hitRate: stats.hitRate,
      cacheSize: controller.getDetailedStats().cache.currentSize,
      evictions: stats.cacheEvictions,
    };
    
    return {
      scenario: 'Enhanced Logger',
      totalQueries: iterations,
      totalTime,
      avgTimePerQuery,
      qps,
      memoryUsage: {
        used: memAfter.used - memBefore.used,
        free: memAfter.free - memBefore.free,
        total: memAfter.total,
      },
      cacheStats,
    };
    
  } finally {
    // 恢复原始环境变量
    if (originalValue !== undefined) {
      process.env.ENHANCED_LOGGING_ENABLED = originalValue;
    } else {
      delete process.env.ENHANCED_LOGGING_ENABLED;
    }
  }
}

/**
 * 运行单个性能对比测试
 */
async function runPerformanceComparison(scenario: keyof typeof TEST_SCENARIOS): Promise<{
  standard: BenchmarkResult;
  enhanced: BenchmarkResult;
  comparison: {
    timeImprovement: number;
    qpsImprovement: number;
    memoryDifference: number;
  };
}> {
  const { iterations, description } = TEST_SCENARIOS[scenario];
  
  console.log(`\n🏁 ${description} 性能对比测试`);
  console.log('='.repeat(50));
  
  // 测试标准Logger
  const standard = await benchmarkStandardLogger(iterations);
  
  // 等待一段时间确保系统稳定
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试增强Logger
  const enhanced = await benchmarkEnhancedLogger(iterations);
  
  // 计算对比结果
  const comparison = {
    timeImprovement: ((standard.avgTimePerQuery - enhanced.avgTimePerQuery) / standard.avgTimePerQuery * 100),
    qpsImprovement: ((enhanced.qps - standard.qps) / standard.qps * 100),
    memoryDifference: enhanced.memoryUsage!.used - standard.memoryUsage!.used,
  };
  
  return { standard, enhanced, comparison };
}

/**
 * 打印详细的性能报告
 */
function printPerformanceReport(
  scenario: string,
  standard: BenchmarkResult,
  enhanced: BenchmarkResult,
  comparison: { timeImprovement: number; qpsImprovement: number; memoryDifference: number; }
) {
  console.log(`\n📈 ${scenario} 性能报告:`);
  console.log(`┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐`);
  console.log(`│ 指标                        │   标准Logger │   增强Logger │     性能差异 │`);
  console.log(`├─────────────────────────────┼──────────────┼──────────────┼──────────────┤`);
  console.log(`│ 总查询数                    │ ${standard.totalQueries.toString().padStart(12)} │ ${enhanced.totalQueries.toString().padStart(12)} │ ${(enhanced.totalQueries - standard.totalQueries).toString().padStart(12)} │`);
  console.log(`│ 总耗时 (ms)                 │ ${standard.totalTime.toFixed(2).padStart(12)} │ ${enhanced.totalTime.toFixed(2).padStart(12)} │ ${(enhanced.totalTime - standard.totalTime).toFixed(2).padStart(12)} │`);
  console.log(`│ 平均耗时 (ms/query)         │ ${standard.avgTimePerQuery.toFixed(6).padStart(12)} │ ${enhanced.avgTimePerQuery.toFixed(6).padStart(12)} │ ${comparison.timeImprovement.toFixed(2).padStart(10)}% │`);
  console.log(`│ QPS (queries/sec)           │ ${standard.qps.toFixed(0).padStart(12)} │ ${enhanced.qps.toFixed(0).padStart(12)} │ ${comparison.qpsImprovement.toFixed(2).padStart(10)}% │`);
  console.log(`│ 内存使用 (MB)               │ ${standard.memoryUsage!.used.toFixed(2).padStart(12)} │ ${enhanced.memoryUsage!.used.toFixed(2).padStart(12)} │ ${comparison.memoryDifference.toFixed(2).padStart(12)} │`);
  
  if (enhanced.cacheStats) {
    console.log(`│ 缓存命中率 (%)              │ ${'N/A'.padStart(12)} │ ${(enhanced.cacheStats.hitRate * 100).toFixed(2).padStart(12)} │ ${'N/A'.padStart(12)} │`);
    console.log(`│ 缓存大小                    │ ${'N/A'.padStart(12)} │ ${enhanced.cacheStats.cacheSize.toString().padStart(12)} │ ${'N/A'.padStart(12)} │`);
    console.log(`│ 缓存淘汰次数                │ ${'N/A'.padStart(12)} │ ${enhanced.cacheStats.evictions.toString().padStart(12)} │ ${'N/A'.padStart(12)} │`);
  }
  
  console.log(`└─────────────────────────────┴──────────────┴──────────────┴──────────────┘`);
}

/**
 * 并发性能测试
 */
async function runConcurrencyTest(): Promise<void> {
  console.log('\n🔀 并发性能测试');
  console.log('='.repeat(50));
  
  process.env.ENHANCED_LOGGING_ENABLED = 'true';
  
  const { LogLevelController } = await import('../src/common/logging/log-level-controller');
  const { createLogger } = await import('../src/appcore/config/logger.config');
  
  const controller = LogLevelController.getInstance();
  controller.reset();
  await controller.onModuleInit();
  
  const concurrencyLevels = [1, 5, 10, 20];
  const queriesPerThread = 1000;
  
  for (const concurrency of concurrencyLevels) {
    console.log(`\n📊 并发级别: ${concurrency} 线程`);
    
    const startTime = process.hrtime.bigint();
    
    const promises = Array.from({ length: concurrency }, async (_, threadId) => {
      const logger = createLogger(`ConcurrentTest${threadId}`);
      
      for (let i = 0; i < queriesPerThread; i++) {
        const context = TEST_CONTEXTS[i % TEST_CONTEXTS.length];
        logger.log(`Concurrent test ${i} from thread ${threadId} for ${context}`);
      }
    });
    
    await Promise.all(promises);
    
    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1_000_000; // ms
    const totalQueries = concurrency * queriesPerThread;
    const qps = totalQueries / (totalTime / 1000);
    
    const stats = controller.getStats();
    
    console.log(`  - 总查询数: ${totalQueries}`);
    console.log(`  - 总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`  - QPS: ${qps.toFixed(0)}`);
    console.log(`  - 缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 平均响应时间: ${(totalTime / totalQueries).toFixed(4)}ms`);
  }
}

/**
 * 主测试函数
 */
async function runPerformanceBenchmark(): Promise<void> {
  console.log('🚀 启动全面性能基准测试...\n');
  
  const results = [];
  
  // 运行所有场景的性能对比测试
  for (const [scenario, config] of Object.entries(TEST_SCENARIOS)) {
    const result = await runPerformanceComparison(scenario as keyof typeof TEST_SCENARIOS);
    results.push({
      scenario: config.description,
      ...result
    });
    
    printPerformanceReport(config.description, result.standard, result.enhanced, result.comparison);
  }
  
  // 运行并发测试
  await runConcurrencyTest();
  
  // 生成总结报告
  console.log('\n📋 性能测试总结');
  console.log('='.repeat(50));
  
  const avgTimeImprovement = results.reduce((sum, r) => sum + r.comparison.timeImprovement, 0) / results.length;
  const avgQpsImprovement = results.reduce((sum, r) => sum + r.comparison.qpsImprovement, 0) / results.length;
  const avgMemoryDifference = results.reduce((sum, r) => sum + r.comparison.memoryDifference, 0) / results.length;
  
  console.log(`✅ 平均响应时间改进: ${avgTimeImprovement.toFixed(2)}%`);
  console.log(`✅ 平均QPS提升: ${avgQpsImprovement.toFixed(2)}%`);
  console.log(`📊 平均内存使用差异: ${avgMemoryDifference.toFixed(2)}MB`);
  
  // 性能评级
  let performanceGrade = 'C';
  if (avgTimeImprovement > -5 && avgQpsImprovement > -5) {
    performanceGrade = avgTimeImprovement > 10 || avgQpsImprovement > 10 ? 'A' : 'B';
  }
  
  console.log(`\n🏆 性能评级: ${performanceGrade}`);
  
  if (performanceGrade === 'A') {
    console.log('🎉 增强日志系统性能表现优秀！');
  } else if (performanceGrade === 'B') {
    console.log('✅ 增强日志系统性能表现良好！');
  } else {
    console.log('⚠️ 增强日志系统可能需要进一步优化');
  }
}

// 执行性能基准测试
runPerformanceBenchmark()
  .then(() => {
    console.log('\n🏁 性能基准测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 性能测试执行失败:', error);
    process.exit(1);
  });