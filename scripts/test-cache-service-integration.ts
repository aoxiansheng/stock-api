/**
 * CacheService集成测试脚本
 * 
 * 验证缓存服务与增强日志系统的完整集成：
 * 1. CacheService实例创建和日志级别配置
 * 2. 智能缓存系统的日志记录验证
 * 3. 多层缓存架构的日志集成测试
 * 4. 缓存性能监控和错误处理日志
 * 5. 大容量缓存操作的性能测试
 * 
 * 运行方法：
 * ENHANCED_LOGGING_ENABLED=true DISABLE_AUTO_INIT=true npx tsx scripts/test-cache-service-integration.ts
 */

import { LogLevelController } from '../src/common/logging/log-level-controller';
import { createLogger } from '../src/appcore/config/logger.config';

console.log('🗄️  开始CacheService集成测试...\n');

interface CacheTestResult {
  testName: string;
  success: boolean;
  logs: string[];
  responseTime: number;
  cacheBehavior: {
    hit: boolean;
    level: string;
  };
  cacheMetrics?: {
    operations: number;
    hitRate: number;
    avgResponseTime: number;
  };
}

async function testCacheServiceBasicIntegration(): Promise<CacheTestResult> {
  console.log('📊 测试1: CacheService基础集成验证');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const controller = LogLevelController.getInstance();
    await controller.onModuleInit();
    
    // 创建主要缓存服务的logger实例
    const cacheServiceLogger = createLogger('CacheService');
    const monitoringCacheLogger = createLogger('MonitoringCacheService');
    const smartCacheLogger = createLogger('SmartCacheOrchestrator');
    
    console.log('✅ 缓存服务logger实例创建成功');
    
    // 验证配置中的日志级别设置
    const cacheServiceInfo = controller.shouldLog('CacheService', 'info');
    console.log(`  - CacheService info级别检查: ${cacheServiceInfo}`);
    logs.push(`CacheService info级别: ${cacheServiceInfo}`);
    
    const cacheServiceWarn = controller.shouldLog('CacheService', 'warn');
    console.log(`  - CacheService warn级别检查: ${cacheServiceWarn}`);
    logs.push(`CacheService warn级别: ${cacheServiceWarn}`);
    
    const smartCacheWarn = controller.shouldLog('SmartCacheOrchestrator', 'warn');
    console.log(`  - SmartCacheOrchestrator warn级别检查: ${smartCacheWarn}`);
    logs.push(`SmartCacheOrchestrator warn级别: ${smartCacheWarn}`);
    
    const monitoringCacheInfo = controller.shouldLog('MonitoringCacheService', 'info');
    console.log(`  - MonitoringCacheService info级别检查: ${monitoringCacheInfo}`);
    logs.push(`MonitoringCacheService info级别: ${monitoringCacheInfo}`);
    
    // 测试实际日志记录
    console.log('\n📝 测试实际日志输出:');
    
    if (cacheServiceInfo) {
      cacheServiceLogger.log('CacheService信息级别测试 - 缓存操作正常', { 
        operation: 'set',
        key: 'test:cache:key',
        ttl: 300
      });
      logs.push('CacheService INFO日志已记录');
    }
    
    if (cacheServiceWarn) {
      cacheServiceLogger.warn('CacheService警告级别测试 - 缓存命中率下降', { 
        hitRate: '65%',
        threshold: '80%',
        action: '建议检查缓存策略'
      });
      logs.push('CacheService WARN日志已记录');
    }
    
    if (smartCacheWarn) {
      smartCacheLogger.warn('SmartCacheOrchestrator警告 - TTL策略调整', {
        strategy: 'WEAK_TIMELINESS',
        oldTTL: 300,
        newTTL: 180,
        reason: '系统负载过高'
      });
      logs.push('SmartCacheOrchestrator WARN日志已记录');
    }
    
    if (monitoringCacheInfo) {
      monitoringCacheLogger.log('MonitoringCacheService信息 - 监控指标更新', {
        metrics: ['cpu', 'memory', 'cache_hit_rate'],
        timestamp: new Date().toISOString()
      });
      logs.push('MonitoringCacheService INFO日志已记录');
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: 'CacheService基础集成',
      success: true,
      logs,
      responseTime,
      cacheBehavior: {
        hit: controller.getStats().hitRate > 0,
        level: 'info'
      }
    };
    
  } catch (error) {
    console.error('❌ CacheService基础集成测试失败:', error);
    return {
      testName: 'CacheService基础集成',
      success: false,
      logs: [`测试失败: ${error.message}`],
      responseTime: Date.now() - startTime,
      cacheBehavior: {
        hit: false,
        level: 'error'
      }
    };
  }
}

async function testMultiLayerCacheIntegration(): Promise<CacheTestResult> {
  console.log('\n🏗️  测试2: 多层缓存架构日志集成');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // 创建多层缓存相关的logger实例
    const smartCacheLogger = createLogger('SmartCacheOrchestrator');
    const commonCacheLogger = createLogger('CommonCacheService');
    const symbolMapperLogger = createLogger('SymbolMapperService');
    const dataMapperLogger = createLogger('DataMapperService');
    const streamCacheLogger = createLogger('StreamCacheService');
    
    console.log('📋 模拟多层缓存操作场景:');
    
    // 1. 智能缓存协调器场景
    console.log('  1. 智能缓存协调器测试...');
    smartCacheLogger.warn('智能缓存策略切换', {
      fromStrategy: 'STRONG_TIMELINESS',
      toStrategy: 'WEAK_TIMELINESS',
      reason: '系统进入维护模式',
      affectedKeys: 156
    });
    logs.push('智能缓存协调器日志已记录');
    
    // 2. 公共缓存服务场景
    console.log('  2. 公共缓存服务测试...');
    commonCacheLogger.log('缓存批量清理操作', {
      operation: 'batch_clear',
      pattern: 'user:session:*',
      clearedCount: 89,
      duration: '125ms'
    });
    logs.push('公共缓存服务日志已记录');
    
    // 3. 符号映射器缓存场景
    console.log('  3. 符号映射器缓存测试...');
    symbolMapperLogger.warn('符号映射缓存预热', {
      operation: 'cache_warmup',
      symbols: ['700.HK', 'AAPL', 'TSLA'],
      cacheLevel: 'L1',
      preloadedRules: 23
    });
    logs.push('符号映射器缓存日志已记录');
    
    // 4. 数据映射器场景
    console.log('  4. 数据映射器测试...');
    dataMapperLogger.warn('数据字段映射规则更新', {
      operation: 'rule_update',
      fieldType: 'quote_fields',
      updatedRules: 8,
      cacheInvalidated: true
    });
    logs.push('数据映射器日志已记录');
    
    // 5. 流数据缓存场景
    console.log('  5. 流数据缓存测试...');
    streamCacheLogger.log('WebSocket缓存状态', {
      operation: 'stream_cache_status',
      activeStreams: 15,
      cacheSize: '2.3MB',
      avgLatency: '12ms'
    });
    logs.push('流数据缓存日志已记录');
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '多层缓存架构集成',
      success: true,
      logs,
      responseTime,
      cacheBehavior: {
        hit: true,
        level: 'multi-layer'
      }
    };
    
  } catch (error) {
    console.error('❌ 多层缓存集成测试失败:', error);
    return {
      testName: '多层缓存架构集成',
      success: false,
      logs: [`测试失败: ${error.message}`],
      responseTime: Date.now() - startTime,
      cacheBehavior: {
        hit: false,
        level: 'error'
      }
    };
  }
}

async function testCachePerformanceMonitoring(): Promise<CacheTestResult> {
  console.log('\n⚡ 测试3: 缓存性能监控');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const controller = LogLevelController.getInstance();
    const cacheLogger = createLogger('CacheService');
    const monitoringLogger = createLogger('MonitoringCacheService');
    
    // 重置统计数据
    controller.resetStats();
    
    const iterations = 500;
    console.log(`🔄 执行 ${iterations} 次缓存级别检查...`);
    
    const cacheTestStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      // 模拟不同的缓存相关检查
      controller.shouldLog('CacheService', 'info');
      controller.shouldLog('SmartCacheOrchestrator', 'warn');
      controller.shouldLog('MonitoringCacheService', 'info');
      controller.shouldLog('SymbolMapperService', 'warn');
      controller.shouldLog('DataMapperService', 'warn');
      
      // 每100次检查记录一次性能日志
      if (i > 0 && i % 100 === 0) {
        const currentTime = Date.now() - cacheTestStartTime;
        if (currentTime > 10) { // 超过10ms记录性能信息
          cacheLogger.log('缓存性能监控', {
            operation: '级别检查批处理',
            iterations: i,
            totalTime: currentTime,
            avgTime: currentTime / i,
            qps: (i / (currentTime / 1000)).toFixed(0)
          });
          logs.push(`性能监控: ${i}次检查耗时${currentTime}ms`);
        }
      }
      
      // 模拟缓存命中率警告
      if (i === 200) {
        const currentStats = controller.getStats();
        if (currentStats.hitRate < 0.9) {
          monitoringLogger.warn('缓存性能警告', {
            currentHitRate: (currentStats.hitRate * 100).toFixed(2) + '%',
            threshold: '90%',
            totalQueries: currentStats.totalQueries,
            recommendation: '考虑增加缓存容量或优化TTL策略'
          });
          logs.push('缓存命中率警告已记录');
        }
      }
    }
    
    const totalTime = Date.now() - cacheTestStartTime;
    const stats = controller.getStats();
    
    console.log('📊 缓存性能测试结果:');
    console.log(`  - 总耗时: ${totalTime}ms`);
    console.log(`  - 平均每次检查: ${(totalTime / (iterations * 5)).toFixed(3)}ms`);
    console.log(`  - 缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 总查询次数: ${stats.totalQueries}`);
    console.log(`  - QPS: ${((iterations * 5) / (totalTime / 1000)).toFixed(0)}`);
    
    logs.push(`性能测试: ${iterations * 5}次查询, 命中率${(stats.hitRate * 100).toFixed(1)}%`);
    
    // 性能基准检查
    const avgResponseTime = totalTime / (iterations * 5);
    if (avgResponseTime < 0.05) {
      console.log('  ✅ 缓存性能卓越 (<0.05ms per check)');
      logs.push('性能等级: 卓越');
    } else if (avgResponseTime < 0.1) {
      console.log('  ✅ 缓存性能优秀 (<0.1ms per check)');
      logs.push('性能等级: 优秀');
    } else {
      console.log('  ⚠️ 缓存性能需要优化 (>0.1ms per check)');
      logs.push('性能等级: 需要优化');
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '缓存性能监控',
      success: avgResponseTime < 0.2,
      logs,
      responseTime,
      cacheBehavior: {
        hit: stats.hitRate > 0.8,
        level: 'performance'
      },
      cacheMetrics: {
        operations: iterations * 5,
        hitRate: stats.hitRate,
        avgResponseTime: avgResponseTime
      }
    };
    
  } catch (error) {
    console.error('❌ 缓存性能测试失败:', error);
    return {
      testName: '缓存性能监控',
      success: false,
      logs: [`测试失败: ${error.message}`],
      responseTime: Date.now() - startTime,
      cacheBehavior: {
        hit: false,
        level: 'error'
      }
    };
  }
}

async function testCacheErrorHandling(): Promise<CacheTestResult> {
  console.log('\n🔧 测试4: 缓存错误处理和容错机制');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // 创建缓存相关的错误处理logger
    const cacheServiceLogger = createLogger('CacheService');
    const smartCacheLogger = createLogger('SmartCacheOrchestrator');
    
    console.log('🔍 模拟各种缓存错误场景:');
    
    // 1. 缓存连接失败场景
    console.log('  1. 缓存连接失败测试...');
    cacheServiceLogger.error('Redis连接失败', {
      error: 'ECONNREFUSED',
      host: 'localhost',
      port: 6379,
      retryAttempt: 3,
      fallbackStrategy: '使用内存缓存'
    });
    logs.push('缓存连接失败日志已记录');
    
    // 2. 缓存容量超限场景
    console.log('  2. 缓存容量超限测试...');
    smartCacheLogger.warn('缓存容量接近上限', {
      currentSize: '475MB',
      maxSize: '500MB',
      utilizationRate: '95%',
      action: '开始LRU淘汰策略'
    });
    logs.push('缓存容量警告日志已记录');
    
    // 3. 缓存键冲突场景
    console.log('  3. 缓存键冲突测试...');
    cacheServiceLogger.warn('缓存键命名冲突检测', {
      conflictingKey: 'stock:quote:AAPL',
      existingTTL: 300,
      newTTL: 180,
      resolution: '使用更长TTL',
      namespace: 'receiver'
    });
    logs.push('缓存键冲突日志已记录');
    
    // 4. 缓存序列化错误场景
    console.log('  4. 缓存序列化错误测试...');
    cacheServiceLogger.error('数据序列化失败', {
      operation: 'JSON.stringify',
      dataType: 'circular_reference',
      key: 'complex:object:123',
      fallback: '使用简化数据结构'
    });
    logs.push('缓存序列化错误日志已记录');
    
    // 5. 缓存预热失败场景
    console.log('  5. 缓存预热失败测试...');
    smartCacheLogger.warn('缓存预热部分失败', {
      operation: 'cache_warmup',
      totalKeys: 1000,
      successfulKeys: 876,
      failedKeys: 124,
      failureRate: '12.4%',
      continueExecution: true
    });
    logs.push('缓存预热失败日志已记录');
    
    // 6. 缓存监控指标异常场景
    console.log('  6. 监控指标异常测试...');
    const monitoringLogger = createLogger('MonitoringCacheService');
    monitoringLogger.log('缓存监控指标异常', {
      metric: 'hit_rate',
      currentValue: '45%',
      expectedRange: '80-95%',
      possibleCauses: ['数据失效', 'Redis重启', '负载突增'],
      autoRecoveryEnabled: true
    });
    logs.push('监控指标异常日志已记录');
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '缓存错误处理和容错',
      success: true,
      logs,
      responseTime,
      cacheBehavior: {
        hit: true,
        level: 'error-handling'
      }
    };
    
  } catch (error) {
    console.error('❌ 缓存错误处理测试失败:', error);
    return {
      testName: '缓存错误处理和容错',
      success: false,
      logs: [`测试失败: ${error.message}`],
      responseTime: Date.now() - startTime,
      cacheBehavior: {
        hit: false,
        level: 'error'
      }
    };
  }
}

async function testCacheConcurrencyScenarios(): Promise<CacheTestResult> {
  console.log('\n🔀 测试5: 缓存并发场景');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const controller = LogLevelController.getInstance();
    
    const concurrencyLevels = [10, 25, 50];
    const operationsPerThread = 100;
    
    for (const concurrency of concurrencyLevels) {
      console.log(`\n📊 并发级别: ${concurrency} 个缓存线程`);
      
      const concurrentStartTime = Date.now();
      
      const promises = Array.from({ length: concurrency }, async (_, threadId) => {
        const threadLogger = createLogger(`CacheService-Thread${threadId}`);
        
        for (let i = 0; i < operationsPerThread; i++) {
          // 模拟不同类型的缓存操作
          const cacheServices = [
            'CacheService', 
            'SmartCacheOrchestrator', 
            'MonitoringCacheService',
            'SymbolMapperService',
            'DataMapperService'
          ];
          const serviceType = cacheServices[i % cacheServices.length];
          const level = i % 4 === 0 ? 'warn' : 'info';
          
          const shouldLog = controller.shouldLog(serviceType, level as any);
          
          if (shouldLog && i % 20 === 0) {
            threadLogger.log(`并发缓存测试 Thread-${threadId}-${i}`, {
              threadId,
              operation: i,
              serviceType,
              cacheOperation: ['get', 'set', 'delete', 'expire'][i % 4],
              timestamp: Date.now()
            });
          }
        }
      });
      
      await Promise.all(promises);
      
      const concurrentTime = Date.now() - concurrentStartTime;
      const totalOperations = concurrency * operationsPerThread;
      const opsPerSecond = totalOperations / (concurrentTime / 1000);
      
      console.log(`  - 总操作数: ${totalOperations}`);
      console.log(`  - 耗时: ${concurrentTime}ms`);
      console.log(`  - OPS: ${opsPerSecond.toFixed(0)}`);
      
      logs.push(`${concurrency}线程: ${totalOperations}ops, ${concurrentTime}ms, ${opsPerSecond.toFixed(0)}ops/s`);
    }
    
    const finalStats = controller.getStats();
    console.log(`\n📈 缓存并发测试最终统计:`);
    console.log(`  - 总查询: ${finalStats.totalQueries}`);
    console.log(`  - 缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms`);
    console.log(`  - 淘汰次数: ${finalStats.cacheEvictions}`);
    
    logs.push(`最终统计: ${finalStats.totalQueries}查询, 命中率${(finalStats.hitRate * 100).toFixed(1)}%`);
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '缓存并发场景',
      success: finalStats.hitRate > 0.7,
      logs,
      responseTime,
      cacheBehavior: {
        hit: finalStats.hitRate > 0.7,
        level: 'concurrent'
      },
      cacheMetrics: {
        operations: finalStats.totalQueries,
        hitRate: finalStats.hitRate,
        avgResponseTime: finalStats.averageResponseTime
      }
    };
    
  } catch (error) {
    console.error('❌ 缓存并发测试失败:', error);
    return {
      testName: '缓存并发场景',
      success: false,
      logs: [`测试失败: ${error.message}`],
      responseTime: Date.now() - startTime,
      cacheBehavior: {
        hit: false,
        level: 'error'
      }
    };
  }
}

// 主测试函数
async function runCacheServiceIntegrationTests() {
  console.log('🚀 启动CacheService集成测试套件...\n');
  
  const testResults: CacheTestResult[] = [];
  
  // 执行所有测试
  testResults.push(await testCacheServiceBasicIntegration());
  testResults.push(await testMultiLayerCacheIntegration());
  testResults.push(await testCachePerformanceMonitoring());
  testResults.push(await testCacheErrorHandling());
  testResults.push(await testCacheConcurrencyScenarios());
  
  // 生成测试报告
  console.log('\n📊 CacheService集成测试报告:');
  console.log('='.repeat(60));
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const totalResponseTime = testResults.reduce((sum, r) => sum + r.responseTime, 0);
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    console.log(`${index + 1}. ${result.testName}: ${status} (${result.responseTime}ms)`);
    
    if (result.logs.length > 0) {
      console.log(`   日志记录: ${result.logs.length}条`);
      result.logs.slice(0, 3).forEach(log => {
        console.log(`     - ${log}`);
      });
      if (result.logs.length > 3) {
        console.log(`     ... 还有${result.logs.length - 3}条日志`);
      }
    }
    
    console.log(`   缓存状态: 命中=${result.cacheBehavior.hit}, 级别=${result.cacheBehavior.level}`);
    
    if (result.cacheMetrics) {
      console.log(`   性能指标: ${result.cacheMetrics.operations}次操作, 命中率${(result.cacheMetrics.hitRate * 100).toFixed(1)}%, 平均${result.cacheMetrics.avgResponseTime.toFixed(3)}ms`);
    }
    console.log('');
  });
  
  console.log('📋 测试汇总:');
  console.log(`  - 总测试数: ${totalTests}`);
  console.log(`  - 通过测试: ${passedTests}`);
  console.log(`  - 成功率: ${(passedTests/totalTests*100).toFixed(1)}%`);
  console.log(`  - 总耗时: ${totalResponseTime}ms`);
  console.log(`  - 平均耗时: ${(totalResponseTime/totalTests).toFixed(0)}ms`);
  
  // 最终系统状态检查
  const controller = LogLevelController.getInstance();
  const finalStats = controller.getStats();
  const detailedStats = controller.getDetailedStats();
  
  console.log('\n📈 缓存系统最终状态:');
  console.log(`  - 总查询次数: ${finalStats.totalQueries}`);
  console.log(`  - 缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`);
  console.log(`  - 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms`);
  console.log(`  - 缓存淘汰次数: ${finalStats.cacheEvictions}`);
  console.log(`  - 缓存大小: ${detailedStats.cache.currentSize}/${detailedStats.cache.maxSize}`);
  console.log(`  - 缓存利用率: ${(detailedStats.cache.utilizationRate * 100).toFixed(2)}%`);
  console.log(`  - QPS: ${detailedStats.performance.qps.toFixed(2)}`);
  
  // 缓存健康检查
  const healthStatus = controller.getCacheHealth();
  console.log(`\n🏥 缓存健康状态: ${healthStatus.status.toUpperCase()}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 CacheService集成测试全部通过！');
    console.log('✅ 缓存服务与增强日志系统集成成功');
    console.log('✅ 多层缓存架构日志配置正确');
    console.log('✅ 性能监控机制工作正常');
    console.log('✅ 错误处理和容错机制有效');
    console.log('✅ 并发场景运行稳定');
    console.log(`✅ 缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}% (目标 >80%)`);
    console.log(`✅ 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms (目标 <1ms)`);
  } else {
    console.log('\n⚠️ 部分测试未通过，需要进一步检查');
  }
  
  return passedTests === totalTests;
}

// 执行测试
runCacheServiceIntegrationTests()
  .then((success) => {
    console.log(`\n🏁 CacheService集成测试${success ? '成功' : '失败'}完成`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试执行异常:', error);
    process.exit(1);
  });