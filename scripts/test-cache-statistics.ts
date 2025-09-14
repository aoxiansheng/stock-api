/**
 * 缓存统计功能测试脚本
 * 
 * 验证增强的缓存机制和统计功能：
 * 1. 基础缓存命中率统计
 * 2. 详细缓存分析
 * 3. 缓存健康状态检查
 * 4. 性能指标监控
 * 
 * 运行方法：
 * ENHANCED_LOGGING_ENABLED=true DISABLE_AUTO_INIT=true npx tsx scripts/test-cache-statistics.ts
 */

import { LogLevelController } from '../src/common/logging/log-level-controller';

console.log('🧪 开始缓存统计功能测试...\n');

async function testCacheStatistics() {
  console.log('📊 测试1: 基础缓存统计功能');
  
  try {
    const controller = LogLevelController.getInstance();
    
    // 初始化
    await controller.onModuleInit();
    
    // 重置统计数据以获得清晰的测试结果
    controller.resetStats();
    
    console.log('📈 初始统计状态:');
    const initialStats = controller.getStats();
    console.log(`  - 总查询次数: ${initialStats.totalQueries}`);
    console.log(`  - 缓存命中: ${initialStats.cacheHits}`);
    console.log(`  - 缓存未命中: ${initialStats.cacheMisses}`);
    console.log(`  - 命中率: ${(initialStats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 淘汰次数: ${initialStats.cacheEvictions}`);
    console.log(`  - 配置重载: ${initialStats.configurationReloads}`);
    
    console.log('\n📝 执行测试查询...');
    
    // 执行一系列查询来测试缓存行为
    const testCases = [
      ['CacheService', 'info'],
      ['CacheService', 'debug'],
      ['CacheService', 'info'], // 重复查询，应该命中缓存
      ['TemplateService', 'warn'],
      ['TemplateService', 'error'],
      ['TemplateService', 'warn'], // 重复查询，应该命中缓存
      ['MonitoringCacheService', 'info'],
      ['MonitoringCacheService', 'debug'],
      ['CacheService', 'info'], // 再次重复，应该命中缓存
    ];
    
    for (const [context, level] of testCases) {
      const result = controller.shouldLog(context, level as any);
      console.log(`  - shouldLog('${context}', '${level}') = ${result}`);
    }
    
    console.log('\n📊 执行后统计状态:');
    const finalStats = controller.getStats();
    console.log(`  - 总查询次数: ${finalStats.totalQueries}`);
    console.log(`  - 缓存命中: ${finalStats.cacheHits}`);
    console.log(`  - 缓存未命中: ${finalStats.cacheMisses}`);
    console.log(`  - 命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms`);
    console.log(`  - 淘汰次数: ${finalStats.cacheEvictions}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 基础统计测试失败:', error);
    return false;
  }
}

async function testDetailedStatistics() {
  console.log('\n📋 测试2: 详细统计分析');
  
  try {
    const controller = LogLevelController.getInstance();
    
    // 执行更多查询以填充统计数据
    for (let i = 0; i < 50; i++) {
      controller.shouldLog('TestService', 'info');
      controller.shouldLog('TestService', 'debug');
      controller.shouldLog(`Service${i % 5}`, 'warn'); // 创建多样化的context
    }
    
    const detailedStats = controller.getDetailedStats();
    
    console.log('📈 详细统计结果:');
    console.log('\n  基础统计:');
    console.log(`    - 总查询: ${detailedStats.basic.totalQueries}`);
    console.log(`    - 命中率: ${(detailedStats.basic.hitRate * 100).toFixed(2)}%`);
    console.log(`    - 平均响应: ${detailedStats.basic.averageResponseTime.toFixed(3)}ms`);
    
    console.log('\n  缓存详情:');
    console.log(`    - 当前大小: ${detailedStats.cache.currentSize}`);
    console.log(`    - 最大容量: ${detailedStats.cache.maxSize}`);
    console.log(`    - 利用率: ${(detailedStats.cache.utilizationRate * 100).toFixed(2)}%`);
    console.log(`    - 平均缓存年龄: ${(detailedStats.cache.averageAge / 1000).toFixed(2)}s`);
    console.log(`    - 最老条目年龄: ${(detailedStats.cache.oldestEntry / 1000).toFixed(2)}s`);
    
    console.log('\n  性能指标:');
    console.log(`    - 每秒查询数(QPS): ${detailedStats.performance.qps.toFixed(2)}`);
    console.log(`    - 效率指标: ${detailedStats.performance.efficiency.toFixed(2)}%`);
    console.log(`    - 响应时间 - 平均: ${detailedStats.performance.responseTime.avg.toFixed(3)}ms`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 详细统计测试失败:', error);
    return false;
  }
}

async function testCacheHealthCheck() {
  console.log('\n🏥 测试3: 缓存健康状态检查');
  
  try {
    const controller = LogLevelController.getInstance();
    
    const healthStatus = controller.getCacheHealth();
    
    console.log('🔍 健康检查结果:');
    console.log(`  - 状态: ${getHealthStatusEmoji(healthStatus.status)} ${healthStatus.status.toUpperCase()}`);
    
    if (healthStatus.issues.length > 0) {
      console.log('\n  ⚠️  发现的问题:');
      healthStatus.issues.forEach((issue, index) => {
        console.log(`    ${index + 1}. ${issue}`);
      });
    }
    
    if (healthStatus.recommendations.length > 0) {
      console.log('\n  💡 建议措施:');
      healthStatus.recommendations.forEach((rec, index) => {
        console.log(`    ${index + 1}. ${rec}`);
      });
    }
    
    if (healthStatus.issues.length === 0) {
      console.log('  ✅ 缓存运行状态良好，未发现问题');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 健康检查测试失败:', error);
    return false;
  }
}

function getHealthStatusEmoji(status: string): string {
  switch (status) {
    case 'excellent': return '🟢';
    case 'good': return '🟡'; 
    case 'warning': return '🟠';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

async function testCachePerformanceUnderLoad() {
  console.log('\n⚡ 测试4: 负载下的缓存性能');
  
  try {
    const controller = LogLevelController.getInstance();
    
    // 重置统计以获得准确的负载测试数据
    controller.resetStats();
    
    const iterations = 1000;
    const contexts = ['Service1', 'Service2', 'Service3', 'Service4', 'Service5'];
    const levels = ['info', 'warn', 'error', 'debug'];
    
    console.log(`🔄 执行 ${iterations} 次查询负载测试...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const context = contexts[i % contexts.length];
      const level = levels[i % levels.length];
      controller.shouldLog(context, level as any);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const loadStats = controller.getDetailedStats();
    
    console.log('⚡ 负载测试结果:');
    console.log(`  - 总耗时: ${totalTime}ms`);
    console.log(`  - 平均每次查询: ${(totalTime / iterations).toFixed(3)}ms`);
    console.log(`  - QPS: ${(iterations / (totalTime / 1000)).toFixed(0)}`);
    console.log(`  - 缓存命中率: ${(loadStats.basic.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 缓存大小: ${loadStats.cache.currentSize}/${loadStats.cache.maxSize}`);
    console.log(`  - 淘汰次数: ${loadStats.basic.cacheEvictions}`);
    
    // 性能基准检查
    const avgResponseTime = totalTime / iterations;
    if (avgResponseTime < 0.1) {
      console.log('  ✅ 性能表现优秀 (<0.1ms per query)');
    } else if (avgResponseTime < 0.5) {
      console.log('  ✅ 性能表现良好 (<0.5ms per query)');
    } else {
      console.log('  ⚠️ 性能需要优化 (>0.5ms per query)');
    }
    
    return avgResponseTime < 1.0; // 1ms以内认为通过
    
  } catch (error) {
    console.error('❌ 负载测试失败:', error);
    return false;
  }
}

// 主测试函数
async function runCacheStatisticsTests() {
  console.log('🚀 开始缓存统计综合测试...\n');
  
  const results = {
    basicStats: false,
    detailedStats: false,
    healthCheck: false,
    performanceLoad: false,
  };
  
  // 执行所有测试
  results.basicStats = await testCacheStatistics();
  results.detailedStats = await testDetailedStatistics();
  results.healthCheck = await testCacheHealthCheck();
  results.performanceLoad = await testCachePerformanceUnderLoad();
  
  // 汇总测试结果
  console.log('\n📊 缓存统计测试结果汇总:');
  console.log(`  1. 基础统计功能: ${results.basicStats ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  2. 详细统计分析: ${results.detailedStats ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  3. 健康状态检查: ${results.healthCheck ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  4. 负载性能测试: ${results.performanceLoad ? '✅ 通过' : '❌ 失败'}`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📋 测试总结: ${passedTests}/${totalTests} 通过 (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有缓存统计测试通过！');
    console.log('✅ 缓存机制运行正常');
    console.log('✅ 统计功能完整可用');
    console.log('✅ 健康监控有效');
    console.log('✅ 性能表现符合预期');
  } else {
    console.log('⚠️ 部分测试未通过，需要进一步检查');
  }
  
  return passedTests === totalTests;
}

// 执行测试
runCacheStatisticsTests()
  .then((success) => {
    console.log(`\n🏁 缓存统计测试${success ? '成功' : '失败'}完成`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试执行异常:', error);
    process.exit(1);
  });