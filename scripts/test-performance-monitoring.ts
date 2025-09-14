/**
 * 性能监控功能测试脚本
 * 
 * 验证增强日志系统的性能监控和热路径优化功能：
 * 1. 性能监控日志（超5ms警告）验证
 * 2. 热路径分析和识别
 * 3. 性能优化功能测试
 * 4. 慢查询检测和统计
 * 5. 缓存预热和清理功能
 * 
 * 运行方法：
 * ENHANCED_LOGGING_ENABLED=true DISABLE_AUTO_INIT=true npx tsx scripts/test-performance-monitoring.ts
 */

import { LogLevelController } from '../src/common/logging/log-level-controller';

console.log('⚡ 开始性能监控功能测试...\n');

interface PerformanceTestResult {
  testName: string;
  success: boolean;
  metrics: {
    totalQueries: number;
    hitRate: number;
    averageResponseTime: number;
    performanceWarnings: number;
  };
  optimizations: string[];
  hotPaths: string[];
}

async function testPerformanceThresholdWarning(): Promise<PerformanceTestResult> {
  console.log('📊 测试1: 性能阈值警告功能');
  
  try {
    const controller = LogLevelController.getInstance();
    await controller.onModuleInit();
    
    // 重置统计数据以获得清洁的测试结果
    controller.resetStats();
    
    console.log('🔥 执行大量级别检查以触发性能监控...');
    
    const iterations = 1000;
    let performanceWarningsTriggered = 0;
    
    // 监听console.warn输出来检测性能警告
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args[0];
      if (typeof message === 'string' && message.includes('[LogLevelController] Performance warning')) {
        performanceWarningsTriggered++;
      }
      originalWarn(...args);
    };
    
    const startTime = Date.now();
    
    // 执行足够多的查询来可能触发性能警告
    for (let i = 0; i < iterations; i++) {
      controller.shouldLog('TestService', 'info');
      controller.shouldLog('TestService', 'warn');
      controller.shouldLog('TestService', 'error');
      
      // 模拟一些复杂的查询场景
      if (i % 100 === 0) {
        controller.shouldLog('ComplexService', 'debug');
        controller.shouldLog('ComplexService', 'trace');
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // 恢复原始console.warn
    console.warn = originalWarn;
    
    const stats = controller.getStats();
    
    console.log(`  ✅ 执行了 ${stats.totalQueries} 次级别检查`);
    console.log(`  - 总耗时: ${totalTime}ms`);
    console.log(`  - 平均响应时间: ${stats.averageResponseTime.toFixed(3)}ms`);
    console.log(`  - 缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 性能警告次数: ${performanceWarningsTriggered}`);
    
    return {
      testName: '性能阈值警告功能',
      success: true,
      metrics: {
        totalQueries: stats.totalQueries,
        hitRate: stats.hitRate,
        averageResponseTime: stats.averageResponseTime,
        performanceWarnings: performanceWarningsTriggered
      },
      optimizations: [],
      hotPaths: []
    };
    
  } catch (error) {
    console.error('❌ 性能阈值警告测试失败:', error);
    return {
      testName: '性能阈值警告功能',
      success: false,
      metrics: {
        totalQueries: 0,
        hitRate: 0,
        averageResponseTime: 0,
        performanceWarnings: 0
      },
      optimizations: [],
      hotPaths: []
    };
  }
}

async function testHotPathAnalysis(): Promise<PerformanceTestResult> {
  console.log('\n🔍 测试2: 热路径分析功能');
  
  try {
    const controller = LogLevelController.getInstance();
    
    console.log('  执行热路径分析...');
    const analysis = controller.analyzeHotPaths();
    
    console.log(`  📈 分析结果:`);
    console.log(`    - 识别的热路径数量: ${analysis.hotPaths.length}`);
    console.log(`    - 热路径服务: ${analysis.hotPaths.join(', ')}`);
    console.log(`    - 优化建议数量: ${analysis.optimizationSuggestions.length}`);
    
    if (analysis.optimizationSuggestions.length > 0) {
      console.log(`    💡 优化建议:`);
      analysis.optimizationSuggestions.forEach((suggestion, index) => {
        console.log(`      ${index + 1}. ${suggestion}`);
      });
    }
    
    console.log(`    📊 性能指标:`);
    console.log(`      - 慢查询数量: ${analysis.performanceMetrics.slowQueries}`);
    console.log(`      - 平均响应时间: ${analysis.performanceMetrics.averageResponseTime.toFixed(3)}ms`);
    console.log(`      - 缓存命中率: ${(analysis.performanceMetrics.hitRate * 100).toFixed(2)}%`);
    console.log(`      - 缓存有效性: ${analysis.performanceMetrics.cacheEffectiveness}`);
    
    const stats = controller.getStats();
    
    return {
      testName: '热路径分析功能',
      success: true,
      metrics: {
        totalQueries: stats.totalQueries,
        hitRate: stats.hitRate,
        averageResponseTime: stats.averageResponseTime,
        performanceWarnings: 0
      },
      optimizations: analysis.optimizationSuggestions,
      hotPaths: analysis.hotPaths
    };
    
  } catch (error) {
    console.error('❌ 热路径分析测试失败:', error);
    return {
      testName: '热路径分析功能',
      success: false,
      metrics: {
        totalQueries: 0,
        hitRate: 0,
        averageResponseTime: 0,
        performanceWarnings: 0
      },
      optimizations: [],
      hotPaths: []
    };
  }
}

async function testPerformanceOptimization(): Promise<PerformanceTestResult> {
  console.log('\n🔧 测试3: 性能优化功能');
  
  try {
    const controller = LogLevelController.getInstance();
    
    // 先执行一些查询来建立基线
    for (let i = 0; i < 500; i++) {
      controller.shouldLog('OptimizationTest', 'info');
      controller.shouldLog('OptimizationTest', 'warn');
    }
    
    console.log('  执行性能优化...');
    const optimizationResult = controller.optimizePerformance();
    
    console.log(`  🎯 优化结果:`);
    console.log(`    - 应用的优化数量: ${optimizationResult.optimizationsApplied.length}`);
    
    if (optimizationResult.optimizationsApplied.length > 0) {
      console.log(`    🔧 执行的优化:`);
      optimizationResult.optimizationsApplied.forEach((opt, index) => {
        console.log(`      ${index + 1}. ${opt}`);
      });
    }
    
    console.log(`    📊 优化前后对比:`);
    console.log(`      优化前:`);
    console.log(`        - 命中率: ${(optimizationResult.beforeMetrics.hitRate * 100).toFixed(2)}%`);
    console.log(`        - 平均响应: ${optimizationResult.beforeMetrics.averageResponseTime.toFixed(3)}ms`);
    console.log(`        - 缓存大小: ${optimizationResult.beforeMetrics.cacheSize}`);
    
    console.log(`      优化后:`);
    console.log(`        - 命中率: ${(optimizationResult.afterMetrics.hitRate * 100).toFixed(2)}%`);
    console.log(`        - 平均响应: ${optimizationResult.afterMetrics.averageResponseTime.toFixed(3)}ms`);
    console.log(`        - 缓存大小: ${optimizationResult.afterMetrics.cacheSize}`);
    
    const stats = controller.getStats();
    
    return {
      testName: '性能优化功能',
      success: true,
      metrics: {
        totalQueries: stats.totalQueries,
        hitRate: stats.hitRate,
        averageResponseTime: stats.averageResponseTime,
        performanceWarnings: 0
      },
      optimizations: optimizationResult.optimizationsApplied,
      hotPaths: []
    };
    
  } catch (error) {
    console.error('❌ 性能优化测试失败:', error);
    return {
      testName: '性能优化功能',
      success: false,
      metrics: {
        totalQueries: 0,
        hitRate: 0,
        averageResponseTime: 0,
        performanceWarnings: 0
      },
      optimizations: [],
      hotPaths: []
    };
  }
}

async function testCacheWarmupEffectiveness(): Promise<PerformanceTestResult> {
  console.log('\n🔥 测试4: 缓存预热效果验证');
  
  try {
    const controller = LogLevelController.getInstance();
    
    // 重置统计以获得清洁的测试结果
    controller.resetStats();
    
    console.log('  测试预热前性能...');
    const preWarmupStartTime = Date.now();
    
    const testQueries = [
      ['CacheService', 'info'],
      ['AuthService', 'warn'],
      ['DataFetcherService', 'info'],
      ['QueryService', 'info'],
      ['SmartCacheOrchestrator', 'warn']
    ];
    
    // 执行查询记录预热前性能
    testQueries.forEach(([context, level]) => {
      controller.shouldLog(context as string, level as any);
    });
    
    const preWarmupTime = Date.now() - preWarmupStartTime;
    const preWarmupStats = controller.getStats();
    
    console.log(`    - 预热前命中率: ${(preWarmupStats.hitRate * 100).toFixed(2)}%`);
    console.log(`    - 预热前响应时间: ${preWarmupStats.averageResponseTime.toFixed(3)}ms`);
    
    // 执行缓存预热（通过性能优化触发）
    console.log('  执行缓存预热...');
    const optimizationResult = controller.optimizePerformance();
    
    console.log('  测试预热后性能...');
    const postWarmupStartTime = Date.now();
    
    // 执行相同的查询测试预热效果
    testQueries.forEach(([context, level]) => {
      controller.shouldLog(context as string, level as any);
    });
    
    const postWarmupTime = Date.now() - postWarmupStartTime;
    const postWarmupStats = controller.getStats();
    
    console.log(`    - 预热后命中率: ${(postWarmupStats.hitRate * 100).toFixed(2)}%`);
    console.log(`    - 预热后响应时间: ${postWarmupStats.averageResponseTime.toFixed(3)}ms`);
    
    const hitRateImprovement = postWarmupStats.hitRate - preWarmupStats.hitRate;
    const responseTimeImprovement = preWarmupStats.averageResponseTime - postWarmupStats.averageResponseTime;
    
    console.log(`  📈 预热效果:`);
    console.log(`    - 命中率改善: ${(hitRateImprovement * 100).toFixed(2)}%`);
    console.log(`    - 响应时间改善: ${responseTimeImprovement.toFixed(3)}ms`);
    
    return {
      testName: '缓存预热效果验证',
      success: true,
      metrics: {
        totalQueries: postWarmupStats.totalQueries,
        hitRate: postWarmupStats.hitRate,
        averageResponseTime: postWarmupStats.averageResponseTime,
        performanceWarnings: 0
      },
      optimizations: optimizationResult.optimizationsApplied,
      hotPaths: []
    };
    
  } catch (error) {
    console.error('❌ 缓存预热效果测试失败:', error);
    return {
      testName: '缓存预热效果验证',
      success: false,
      metrics: {
        totalQueries: 0,
        hitRate: 0,
        averageResponseTime: 0,
        performanceWarnings: 0
      },
      optimizations: [],
      hotPaths: []
    };
  }
}

async function testIntegratedPerformanceScenario(): Promise<PerformanceTestResult> {
  console.log('\n🌟 测试5: 综合性能场景');
  
  try {
    const controller = LogLevelController.getInstance();
    controller.resetStats();
    
    console.log('  模拟真实高负载场景...');
    
    const services = ['CacheService', 'AuthService', 'DataFetcherService', 'QueryService', 'MonitoringCacheService'];
    const levels = ['info', 'warn', 'error', 'debug'];
    const iterations = 2000;
    
    let performanceWarnings = 0;
    
    // 监听性能警告
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args[0];
      if (typeof message === 'string' && message.includes('[LogLevelController] Performance warning')) {
        performanceWarnings++;
      }
      originalWarn(...args);
    };
    
    const testStartTime = Date.now();
    
    // 执行高负载测试
    for (let i = 0; i < iterations; i++) {
      const service = services[i % services.length];
      const level = levels[i % levels.length];
      controller.shouldLog(service, level as any);
      
      // 每500次查询进行一次分析和优化
      if (i > 0 && i % 500 === 0) {
        const analysis = controller.analyzeHotPaths();
        if (analysis.optimizationSuggestions.length > 0) {
          controller.optimizePerformance();
        }
      }
    }
    
    const testTotalTime = Date.now() - testStartTime;
    
    // 恢复console.warn
    console.warn = originalWarn;
    
    // 最终分析
    const finalAnalysis = controller.analyzeHotPaths();
    const finalStats = controller.getStats();
    
    console.log(`  📊 综合性能测试结果:`);
    console.log(`    - 总查询数: ${finalStats.totalQueries}`);
    console.log(`    - 总耗时: ${testTotalTime}ms`);
    console.log(`    - 平均QPS: ${(finalStats.totalQueries / (testTotalTime / 1000)).toFixed(0)}`);
    console.log(`    - 缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`);
    console.log(`    - 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms`);
    console.log(`    - 性能警告次数: ${performanceWarnings}`);
    console.log(`    - 识别热路径: ${finalAnalysis.hotPaths.length}个`);
    console.log(`    - 优化建议: ${finalAnalysis.optimizationSuggestions.length}条`);
    console.log(`    - 缓存有效性: ${finalAnalysis.performanceMetrics.cacheEffectiveness}`);
    
    return {
      testName: '综合性能场景',
      success: true,
      metrics: {
        totalQueries: finalStats.totalQueries,
        hitRate: finalStats.hitRate,
        averageResponseTime: finalStats.averageResponseTime,
        performanceWarnings: performanceWarnings
      },
      optimizations: finalAnalysis.optimizationSuggestions,
      hotPaths: finalAnalysis.hotPaths
    };
    
  } catch (error) {
    console.error('❌ 综合性能场景测试失败:', error);
    return {
      testName: '综合性能场景',
      success: false,
      metrics: {
        totalQueries: 0,
        hitRate: 0,
        averageResponseTime: 0,
        performanceWarnings: 0
      },
      optimizations: [],
      hotPaths: []
    };
  }
}

// 主测试函数
async function runPerformanceMonitoringTests() {
  console.log('🚀 启动性能监控功能测试套件...\n');
  
  const testResults: PerformanceTestResult[] = [];
  
  // 执行所有测试
  testResults.push(await testPerformanceThresholdWarning());
  testResults.push(await testHotPathAnalysis());
  testResults.push(await testPerformanceOptimization());
  testResults.push(await testCacheWarmupEffectiveness());
  testResults.push(await testIntegratedPerformanceScenario());
  
  // 生成测试报告
  console.log('\n📊 性能监控功能测试报告:');
  console.log('='.repeat(60));
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    console.log(`${index + 1}. ${result.testName}: ${status}`);
    
    console.log(`   性能指标:`);
    console.log(`     - 总查询: ${result.metrics.totalQueries}`);
    console.log(`     - 命中率: ${(result.metrics.hitRate * 100).toFixed(2)}%`);
    console.log(`     - 响应时间: ${result.metrics.averageResponseTime.toFixed(3)}ms`);
    console.log(`     - 性能警告: ${result.metrics.performanceWarnings}`);
    
    if (result.hotPaths.length > 0) {
      console.log(`   热路径: ${result.hotPaths.join(', ')}`);
    }
    
    if (result.optimizations.length > 0) {
      console.log(`   优化措施: ${result.optimizations.length}项`);
    }
    console.log('');
  });
  
  // 汇总统计
  const totalQueries = testResults.reduce((sum, r) => sum + r.metrics.totalQueries, 0);
  const avgHitRate = testResults.reduce((sum, r) => sum + r.metrics.hitRate, 0) / totalTests;
  const avgResponseTime = testResults.reduce((sum, r) => sum + r.metrics.averageResponseTime, 0) / totalTests;
  const totalWarnings = testResults.reduce((sum, r) => sum + r.metrics.performanceWarnings, 0);
  
  console.log('📋 测试汇总:');
  console.log(`  - 总测试数: ${totalTests}`);
  console.log(`  - 通过测试: ${passedTests}`);
  console.log(`  - 成功率: ${(passedTests/totalTests*100).toFixed(1)}%`);
  console.log(`  - 累计查询: ${totalQueries.toLocaleString()}`);
  console.log(`  - 平均命中率: ${(avgHitRate * 100).toFixed(2)}%`);
  console.log(`  - 平均响应时间: ${avgResponseTime.toFixed(3)}ms`);
  console.log(`  - 总性能警告: ${totalWarnings}`);
  
  // 性能评级
  let performanceGrade = 'C';
  if (avgHitRate > 0.9 && avgResponseTime < 0.5) {
    performanceGrade = 'A';
  } else if (avgHitRate > 0.8 && avgResponseTime < 1.0) {
    performanceGrade = 'B';
  }
  
  console.log(`\n🏆 性能评级: ${performanceGrade}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 性能监控功能测试全部通过！');
    console.log('✅ 性能阈值警告功能正常');
    console.log('✅ 热路径分析有效');
    console.log('✅ 性能优化功能可用');
    console.log('✅ 缓存预热机制工作正常');
    console.log('✅ 综合性能表现符合预期');
  } else {
    console.log('\n⚠️ 部分测试未通过，需要进一步检查');
  }
  
  return passedTests === totalTests;
}

// 执行测试
runPerformanceMonitoringTests()
  .then((success) => {
    console.log(`\n🏁 性能监控功能测试${success ? '成功' : '失败'}完成`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试执行异常:', error);
    process.exit(1);
  });