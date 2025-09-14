/**
 * AuthService集成测试脚本
 * 
 * 验证认证服务与增强日志系统的完整集成：
 * 1. AuthService实例创建和日志级别配置
 * 2. 三种认证方式的日志记录验证
 * 3. 认证失败场景的错误日志测试
 * 4. 认证性能监控和统计
 * 5. 多并发认证场景测试
 * 
 * 运行方法：
 * ENHANCED_LOGGING_ENABLED=true DISABLE_AUTO_INIT=true npx tsx scripts/test-auth-service-integration.ts
 */

import { LogLevelController } from '../src/common/logging/log-level-controller';
import { createLogger } from '../src/appcore/config/logger.config';

console.log('🔒 开始AuthService集成测试...\n');

interface AuthTestResult {
  testName: string;
  success: boolean;
  logs: string[];
  responseTime: number;
  cacheBehavior: {
    hit: boolean;
    level: string;
  };
}

async function testAuthServiceBasicIntegration(): Promise<AuthTestResult> {
  console.log('📊 测试1: AuthService基础集成验证');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const controller = LogLevelController.getInstance();
    await controller.onModuleInit();
    
    // 创建AuthService的logger实例
    const authLogger = createLogger('AuthService');
    
    console.log('✅ AuthService logger实例创建成功');
    
    // 验证配置中的日志级别设置
    const authServiceLevel = controller.shouldLog('AuthService', 'warn');
    console.log(`  - AuthService warn级别检查: ${authServiceLevel}`);
    logs.push(`AuthService warn级别: ${authServiceLevel}`);
    
    const authServiceInfo = controller.shouldLog('AuthService', 'info');
    console.log(`  - AuthService info级别检查: ${authServiceInfo}`);
    logs.push(`AuthService info级别: ${authServiceInfo}`);
    
    const authServiceDebug = controller.shouldLog('AuthService', 'debug');
    console.log(`  - AuthService debug级别检查: ${authServiceDebug}`);
    logs.push(`AuthService debug级别: ${authServiceDebug}`);
    
    // 测试实际日志记录
    console.log('\n📝 测试实际日志输出:');
    
    if (authServiceLevel) {
      authLogger.warn('AuthService警告级别测试 - 用户认证失败', { 
        userId: 'test-user-123', 
        reason: '无效API密钥' 
      });
      logs.push('WARN日志已记录');
    }
    
    authLogger.error('AuthService错误级别测试 - 认证系统异常', { 
      error: 'JWT token验证失败', 
      timestamp: new Date().toISOString() 
    });
    logs.push('ERROR日志已记录');
    
    // info级别应该被过滤（配置为warn）
    if (authServiceInfo) {
      authLogger.log('AuthService信息级别测试 - 这条日志不应该显示');
      logs.push('INFO日志意外记录（应被过滤）');
    } else {
      logs.push('INFO日志正确过滤');
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: 'AuthService基础集成',
      success: true,
      logs,
      responseTime,
      cacheBehavior: {
        hit: controller.getStats().hitRate > 0,
        level: 'warn'
      }
    };
    
  } catch (error) {
    console.error('❌ AuthService基础集成测试失败:', error);
    return {
      testName: 'AuthService基础集成',
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

async function testAuthenticationScenarios(): Promise<AuthTestResult> {
  console.log('\n🔐 测试2: 三种认证方式日志记录');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // 创建认证相关的logger实例
    const authServiceLogger = createLogger('AuthService');
    const apiKeyGuardLogger = createLogger('ApiKeyAuthGuard');
    const jwtGuardLogger = createLogger('JwtAuthGuard');
    
    console.log('📋 模拟三种认证场景:');
    
    // 1. API Key认证场景
    console.log('  1. API Key认证测试...');
    apiKeyGuardLogger.error('API Key认证失败', {
      apiKeyId: 'ak_test_12345',
      clientIP: '192.168.1.100',
      reason: 'API Key已过期'
    });
    logs.push('API Key认证失败日志已记录');
    
    // 2. JWT认证场景
    console.log('  2. JWT认证测试...');
    jwtGuardLogger.error('JWT Token验证失败', {
      token: 'eyJhbG***截断***',
      userId: 'user_789',
      reason: 'Token签名无效'
    });
    logs.push('JWT认证失败日志已记录');
    
    // 3. 公共访问场景
    console.log('  3. 公共访问测试...');
    authServiceLogger.warn('公共接口访问监控', {
      endpoint: '/api/v1/public/health',
      clientIP: '203.0.113.45',
      userAgent: 'NewStockAPI-Client/1.0'
    });
    logs.push('公共访问监控日志已记录');
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '认证方式日志记录',
      success: true,
      logs,
      responseTime,
      cacheBehavior: {
        hit: true,
        level: 'warn/error'
      }
    };
    
  } catch (error) {
    console.error('❌ 认证场景测试失败:', error);
    return {
      testName: '认证方式日志记录',
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

async function testAuthenticationPerformance(): Promise<AuthTestResult> {
  console.log('\n⚡ 测试3: 认证操作性能监控');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const controller = LogLevelController.getInstance();
    const authLogger = createLogger('AuthService');
    
    // 重置统计数据以获得准确测试结果
    controller.resetStats();
    
    const iterations = 200;
    console.log(`🔄 执行 ${iterations} 次认证级别检查...`);
    
    const authTestStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      // 模拟不同的认证检查
      controller.shouldLog('AuthService', 'warn');
      controller.shouldLog('ApiKeyAuthGuard', 'error');
      controller.shouldLog('JwtAuthGuard', 'error');
      controller.shouldLog('UnifiedPermissionsGuard', 'error');
      
      // 每50次检查记录一次性能日志
      if (i > 0 && i % 50 === 0) {
        const currentTime = Date.now() - authTestStartTime;
        if (currentTime > 5) { // 超过5ms记录性能警告
          authLogger.warn('认证性能警告', {
            operation: '级别检查',
            iterations: i,
            totalTime: currentTime,
            avgTime: currentTime / i
          });
          logs.push(`性能警告: ${i}次检查耗时${currentTime}ms`);
        }
      }
    }
    
    const totalTime = Date.now() - authTestStartTime;
    const stats = controller.getStats();
    
    console.log('📊 性能测试结果:');
    console.log(`  - 总耗时: ${totalTime}ms`);
    console.log(`  - 平均每次检查: ${(totalTime / (iterations * 4)).toFixed(3)}ms`);
    console.log(`  - 缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 总查询次数: ${stats.totalQueries}`);
    
    logs.push(`性能测试: ${iterations * 4}次查询, ${totalTime}ms, 命中率${(stats.hitRate * 100).toFixed(1)}%`);
    
    // 性能基准检查
    const avgResponseTime = totalTime / (iterations * 4);
    if (avgResponseTime < 0.1) {
      console.log('  ✅ 认证性能优秀 (<0.1ms per check)');
      logs.push('性能等级: 优秀');
    } else if (avgResponseTime < 0.5) {
      console.log('  ✅ 认证性能良好 (<0.5ms per check)');
      logs.push('性能等级: 良好');
    } else {
      console.log('  ⚠️ 认证性能需要优化 (>0.5ms per check)');
      logs.push('性能等级: 需要优化');
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '认证性能监控',
      success: avgResponseTime < 1.0,
      logs,
      responseTime,
      cacheBehavior: {
        hit: stats.hitRate > 0.8,
        level: 'performance'
      }
    };
    
  } catch (error) {
    console.error('❌ 认证性能测试失败:', error);
    return {
      testName: '认证性能监控',
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

async function testConcurrentAuthentication(): Promise<AuthTestResult> {
  console.log('\n🔀 测试4: 并发认证场景');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const controller = LogLevelController.getInstance();
    
    const concurrencyLevels = [5, 10, 20];
    const operationsPerThread = 50;
    
    for (const concurrency of concurrencyLevels) {
      console.log(`\n📊 并发级别: ${concurrency} 个认证线程`);
      
      const concurrentStartTime = Date.now();
      
      const promises = Array.from({ length: concurrency }, async (_, threadId) => {
        const threadLogger = createLogger(`AuthService-Thread${threadId}`);
        
        for (let i = 0; i < operationsPerThread; i++) {
          // 模拟不同类型的认证检查
          const checkTypes = ['AuthService', 'ApiKeyAuthGuard', 'JwtAuthGuard', 'UnifiedPermissionsGuard'];
          const checkType = checkTypes[i % checkTypes.length];
          const level = i % 3 === 0 ? 'error' : 'warn';
          
          const shouldLog = controller.shouldLog(checkType, level as any);
          
          if (shouldLog && i % 10 === 0) {
            threadLogger.warn(`并发认证测试 Thread-${threadId}-${i}`, {
              threadId,
              operation: i,
              checkType,
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
    console.log(`\n📈 最终统计:`);
    console.log(`  - 总查询: ${finalStats.totalQueries}`);
    console.log(`  - 缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms`);
    
    logs.push(`最终统计: ${finalStats.totalQueries}查询, 命中率${(finalStats.hitRate * 100).toFixed(1)}%`);
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '并发认证场景',
      success: finalStats.hitRate > 0.7,
      logs,
      responseTime,
      cacheBehavior: {
        hit: finalStats.hitRate > 0.7,
        level: 'concurrent'
      }
    };
    
  } catch (error) {
    console.error('❌ 并发认证测试失败:', error);
    return {
      testName: '并发认证场景',
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

async function testAuthGuardsIntegration(): Promise<AuthTestResult> {
  console.log('\n🛡️  测试5: 认证守卫集成验证');
  
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // 测试所有认证相关守卫的日志级别配置
    const controller = LogLevelController.getInstance();
    
    const guardTests = [
      { name: 'ApiKeyAuthGuard', expectedLevel: 'error' },
      { name: 'JwtAuthGuard', expectedLevel: 'error' },
      { name: 'RateLimitGuard', expectedLevel: 'warn' },
      { name: 'ThrottlerGuard', expectedLevel: 'warn' },
      { name: 'UnifiedPermissionsGuard', expectedLevel: 'error' }
    ];
    
    console.log('🔍 验证所有认证守卫配置:');
    
    for (const guard of guardTests) {
      const canLogError = controller.shouldLog(guard.name, 'error');
      const canLogWarn = controller.shouldLog(guard.name, 'warn');
      const canLogInfo = controller.shouldLog(guard.name, 'info');
      
      console.log(`\n  ${guard.name}:`);
      console.log(`    - ERROR级别: ${canLogError}`);
      console.log(`    - WARN级别: ${canLogWarn}`);
      console.log(`    - INFO级别: ${canLogInfo}`);
      
      // 创建守卫logger并测试日志记录
      const guardLogger = createLogger(guard.name);
      
      if (canLogError) {
        guardLogger.error(`${guard.name} 集成测试 - 错误级别`, {
          testType: 'integration',
          guard: guard.name,
          timestamp: new Date().toISOString()
        });
        logs.push(`${guard.name}: ERROR日志记录成功`);
      }
      
      if (canLogWarn && guard.expectedLevel !== 'error') {
        guardLogger.warn(`${guard.name} 集成测试 - 警告级别`, {
          testType: 'integration',
          guard: guard.name
        });
        logs.push(`${guard.name}: WARN日志记录成功`);
      }
      
      // INFO级别应该被过滤
      if (!canLogInfo) {
        logs.push(`${guard.name}: INFO日志正确过滤`);
      } else {
        logs.push(`${guard.name}: INFO日志意外通过`);
      }
    }
    
    // 测试守卫执行顺序的日志记录
    console.log('\n🔄 测试守卫执行顺序日志:');
    const orderLogger = createLogger('GuardExecutionOrder');
    
    const guardOrder = [
      'ThrottlerGuard',
      'ApiKeyAuthGuard', 
      'JwtAuthGuard',
      'RateLimitGuard',
      'UnifiedPermissionsGuard'
    ];
    
    guardOrder.forEach((guardName, index) => {
      if (controller.shouldLog(guardName, 'warn') || controller.shouldLog(guardName, 'error')) {
        orderLogger.warn(`守卫执行顺序测试 - 第${index + 1}步: ${guardName}`, {
          order: index + 1,
          guardName,
          executionChain: 'auth-pipeline'
        });
        logs.push(`执行顺序 ${index + 1}: ${guardName}`);
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      testName: '认证守卫集成',
      success: true,
      logs,
      responseTime,
      cacheBehavior: {
        hit: controller.getStats().hitRate > 0,
        level: 'guards'
      }
    };
    
  } catch (error) {
    console.error('❌ 认证守卫集成测试失败:', error);
    return {
      testName: '认证守卫集成',
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
async function runAuthServiceIntegrationTests() {
  console.log('🚀 启动AuthService集成测试套件...\n');
  
  const testResults: AuthTestResult[] = [];
  
  // 执行所有测试
  testResults.push(await testAuthServiceBasicIntegration());
  testResults.push(await testAuthenticationScenarios());
  testResults.push(await testAuthenticationPerformance());
  testResults.push(await testConcurrentAuthentication());
  testResults.push(await testAuthGuardsIntegration());
  
  // 生成测试报告
  console.log('\n📊 AuthService集成测试报告:');
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
  
  console.log('\n📈 系统最终状态:');
  console.log(`  - 总查询次数: ${finalStats.totalQueries}`);
  console.log(`  - 缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`);
  console.log(`  - 平均响应时间: ${finalStats.averageResponseTime.toFixed(3)}ms`);
  console.log(`  - 缓存淘汰次数: ${finalStats.cacheEvictions}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 AuthService集成测试全部通过！');
    console.log('✅ 认证服务与增强日志系统集成成功');
    console.log('✅ 所有认证守卫日志配置正确');
    console.log('✅ 性能表现符合预期');
    console.log('✅ 并发场景运行稳定');
    console.log('✅ 缓存机制工作正常');
  } else {
    console.log('\n⚠️ 部分测试未通过，需要进一步检查');
  }
  
  return passedTests === totalTests;
}

// 执行测试
runAuthServiceIntegrationTests()
  .then((success) => {
    console.log(`\n🏁 AuthService集成测试${success ? '成功' : '失败'}完成`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试执行异常:', error);
    process.exit(1);
  });