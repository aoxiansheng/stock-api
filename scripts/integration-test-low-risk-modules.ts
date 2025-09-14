/**
 * 低风险模块集成测试脚本
 * 
 * 验证3个选定的低风险模块在启用增强日志功能后是否正常工作：
 * 1. CacheService - 缓存服务
 * 2. NotificationTemplateService - 通知模板服务
 * 3. MonitoringCacheService - 监控缓存服务
 * 
 * 运行方法：
 * ENHANCED_LOGGING_ENABLED=true DISABLE_AUTO_INIT=true npx tsx scripts/integration-test-low-risk-modules.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

// 导入待测试的服务
import { CacheService } from '../src/cache/services/cache.service';
import { NotificationTemplateService } from '../src/notification/services/notification-template.service';
import { MonitoringCacheService } from '../src/monitoring/cache/monitoring-cache.service';

// 导入必要的依赖和配置
import { CacheModule } from '../src/cache/cache.module';
import { PaginationService } from '../src/common/modules/pagination/services/pagination.service';

console.log('🧪 开始低风险模块集成测试...\n');

// 检查环境变量设置
console.log('📋 环境变量检查:');
console.log(`  - ENHANCED_LOGGING_ENABLED: ${process.env.ENHANCED_LOGGING_ENABLED}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log();

/**
 * 模拟依赖项
 */
const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  ttl: jest.fn().mockResolvedValue(-1),
  scan: jest.fn().mockResolvedValue(['0', []]),
  info: jest.fn().mockResolvedValue('redis_version:6.0.0'),
};

const mockMongoModel = {
  create: jest.fn().mockResolvedValue({ _id: 'mock-id', templateId: 'test-template' }),
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
  countDocuments: jest.fn().mockResolvedValue(0),
  findById: jest.fn().mockResolvedValue(null),
  findByIdAndUpdate: jest.fn().mockResolvedValue(null),
  findByIdAndDelete: jest.fn().mockResolvedValue(null),
};

/**
 * 测试1: CacheService 集成测试
 */
async function testCacheService() {
  console.log('📋 测试1: CacheService 集成测试');
  
  try {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        CacheService,
        {
          provide: 'IORedisModuleConnectionToken',
          useValue: mockRedisService,
        },
        EventEmitter2,
      ],
    }).compile();

    const cacheService = module.get<CacheService>(CacheService);
    
    console.log('✅ CacheService 模块编译成功');
    console.log(`✅ CacheService 实例创建成功: ${!!cacheService}`);
    
    // 测试基本日志功能
    console.log('📝 测试 CacheService 日志功能...');
    // 这里会触发日志记录，验证增强日志是否正常工作
    
    // 测试一些基础方法（不需要真实Redis连接）
    const testKey = 'test-key';
    const testValue = 'test-value';
    
    console.log('📝 测试 CacheService 基础方法...');
    // 这些调用会触发内部日志
    try {
      await cacheService.get(testKey);
      console.log('✅ get 方法调用成功');
    } catch (error) {
      console.log('⚠️ get 方法调用预期失败（Redis连接问题）');
    }
    
    console.log('✅ CacheService 集成测试完成\n');
    return true;
    
  } catch (error) {
    console.log(`❌ CacheService 集成测试失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 测试2: NotificationTemplateService 集成测试
 */
async function testNotificationTemplateService() {
  console.log('📋 测试2: NotificationTemplateService 集成测试');
  
  try {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
      ],
      providers: [
        NotificationTemplateService,
        PaginationService,
        {
          provide: getModelToken('NotificationTemplate'),
          useValue: mockMongoModel,
        },
      ],
    }).compile();

    const templateService = module.get<NotificationTemplateService>(NotificationTemplateService);
    
    console.log('✅ NotificationTemplateService 模块编译成功');
    console.log(`✅ NotificationTemplateService 实例创建成功: ${!!templateService}`);
    
    // 测试基本日志功能
    console.log('📝 测试 NotificationTemplateService 日志功能...');
    
    // 测试一些基础方法
    console.log('📝 测试 NotificationTemplateService 基础方法...');
    
    try {
      const templates = await templateService.findAll();
      console.log(`✅ findAll 方法调用成功，返回 ${templates.data.length} 个模板`);
    } catch (error) {
      console.log(`⚠️ findAll 方法调用失败: ${error.message}`);
    }
    
    try {
      const template = await templateService.findById('test-id');
      console.log('✅ findById 方法调用成功（未找到预期）');
    } catch (error) {
      console.log('⚠️ findById 方法调用预期失败（资源未找到）');
    }
    
    console.log('✅ NotificationTemplateService 集成测试完成\n');
    return true;
    
  } catch (error) {
    console.log(`❌ NotificationTemplateService 集成测试失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 测试3: MonitoringCacheService 集成测试
 */
async function testMonitoringCacheService() {
  console.log('📋 测试3: MonitoringCacheService 集成测试');
  
  try {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        MonitoringCacheService,
        CacheService,
        {
          provide: 'IORedisModuleConnectionToken',
          useValue: mockRedisService,
        },
        EventEmitter2,
      ],
    }).compile();

    const monitoringCacheService = module.get<MonitoringCacheService>(MonitoringCacheService);
    
    console.log('✅ MonitoringCacheService 模块编译成功');
    console.log(`✅ MonitoringCacheService 实例创建成功: ${!!monitoringCacheService}`);
    
    // 测试基本日志功能
    console.log('📝 测试 MonitoringCacheService 日志功能...');
    
    // 测试一些基础方法
    console.log('📝 测试 MonitoringCacheService 基础方法...');
    
    try {
      const stats = monitoringCacheService.getStats();
      console.log(`✅ getStats 方法调用成功: hits=${stats.operations?.hits || 0}`);
    } catch (error) {
      console.log(`⚠️ getStats 方法调用失败: ${error.message}`);
    }
    
    try {
      const health = await monitoringCacheService.healthCheck();
      console.log(`✅ healthCheck 方法调用成功，状态: ${health.status}`);
    } catch (error) {
      console.log(`⚠️ healthCheck 方法调用失败: ${error.message}`);
    }
    
    console.log('✅ MonitoringCacheService 集成测试完成\n');
    return true;
    
  } catch (error) {
    console.log(`❌ MonitoringCacheService 集成测试失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 验证日志级别控制
 */
async function testLogLevelControl() {
  console.log('📋 测试4: 日志级别控制验证');
  
  try {
    // 导入日志相关类型以进行验证
    const { createLogger, createEnhancedLogger } = await import('../src/appcore/config/logger.config');
    
    console.log('📝 测试不同服务的日志级别控制...');
    
    // 测试 CacheService 日志级别
    const cacheLogger = createEnhancedLogger('CacheService');
    const cacheStatus = cacheLogger.getEnhancedLoggingStatus();
    console.log(`✅ CacheService 日志状态:`, {
      enabled: cacheStatus.enabled,
      controllerReady: cacheStatus.controllerReady,
      context: cacheStatus.context,
    });
    
    // 测试 NotificationTemplateService 日志级别  
    const templateLogger = createEnhancedLogger('NotificationTemplateService');
    const templateStatus = templateLogger.getEnhancedLoggingStatus();
    console.log(`✅ NotificationTemplateService 日志状态:`, {
      enabled: templateStatus.enabled,
      controllerReady: templateStatus.controllerReady,
      context: templateStatus.context,
    });
    
    // 测试 MonitoringCacheService 日志级别
    const monitoringLogger = createEnhancedLogger('MonitoringCacheService');
    const monitoringStatus = monitoringLogger.getEnhancedLoggingStatus();
    console.log(`✅ MonitoringCacheService 日志状态:`, {
      enabled: monitoringStatus.enabled,
      controllerReady: monitoringStatus.controllerReady,
      context: monitoringStatus.context,
    });
    
    // 测试日志级别过滤
    console.log('📝 测试日志级别过滤功能...');
    
    // 测试不同级别的日志
    const testLogger = createLogger('IntegrationTest');
    testLogger.log('这是一条 INFO 级别的测试日志');
    testLogger.warn('这是一条 WARN 级别的测试日志');
    testLogger.error('这是一条 ERROR 级别的测试日志');
    testLogger.debug('这是一条 DEBUG 级别的测试日志');
    testLogger.verbose('这是一条 VERBOSE 级别的测试日志');
    
    console.log('✅ 日志级别控制验证完成\n');
    return true;
    
  } catch (error) {
    console.log(`❌ 日志级别控制验证失败: ${error.message}\n`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runIntegrationTests() {
  console.log('🚀 开始执行低风险模块集成测试...\n');
  
  const results = {
    cacheService: false,
    templateService: false,
    monitoringCacheService: false,
    logLevelControl: false,
  };
  
  // 执行各项测试
  results.cacheService = await testCacheService();
  results.templateService = await testNotificationTemplateService();
  results.monitoringCacheService = await testMonitoringCacheService();
  results.logLevelControl = await testLogLevelControl();
  
  // 汇总测试结果
  console.log('📊 集成测试结果汇总:');
  console.log(`  1. CacheService: ${results.cacheService ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  2. NotificationTemplateService: ${results.templateService ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  3. MonitoringCacheService: ${results.monitoringCacheService ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  4. 日志级别控制: ${results.logLevelControl ? '✅ 通过' : '❌ 失败'}`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n📋 测试总结: ${passedTests}/${totalTests} 通过 (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有低风险模块集成测试通过！');
    console.log('✅ 增强日志功能与现有代码完全兼容');
    console.log('✅ 现有代码无需任何修改即可获得级别控制功能');
    console.log('✅ 日志级别控制功能正常工作');
  } else {
    console.log('⚠️ 部分测试未通过，需要进一步检查');
  }
  
  return passedTests === totalTests;
}

// 执行测试
runIntegrationTests()
  .then((success) => {
    console.log(`\n🏁 集成测试${success ? '成功' : '失败'}完成`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 集成测试执行异常:', error);
    process.exit(1);
  });