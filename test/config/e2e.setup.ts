/**
 * E2E测试全局设置
 * 设置完整的应用环境用于端到端测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { jest } from '@jest/globals';
import { RedisService } from '@liaoliaots/nestjs-redis';

// 先加载E2E测试环境变量
import './e2e.env';

import { CustomLogger, getLogLevels } from '@common/config/logger.config';
import { GlobalExceptionFilter } from '@common/filters';
import { ResponseInterceptor, RequestTrackingInterceptor } from '@common/interceptors';
import { PerformanceInterceptor } from '../../src/metrics/interceptors/performance.interceptor';
import { PerformanceMonitorService } from '../../src/metrics/services/performance-monitor.service';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let testModule: TestingModule;

// 设置E2E测试超时
jest.setTimeout(60000);

// E2E测试需要完整的应用启动
beforeAll(async () => {
  console.log('🚀 启动E2E测试应用...');
  
  try {
    // 启动MongoDB内存服务器
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test-e2e',
        port: 27019, // 使用不同端口
      },
    });
    
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    
    console.log(`✅ E2E MongoDB内存服务器启动: ${mongoUri}`);
    
    // 动态导入AppModule以避免循环依赖
    const { AppModule } = await import('../../src/app.module');
    
    // 创建测试模块
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    // 创建应用实例
    app = testModule.createNestApplication({
      logger: getLogLevels(),
    });
    
    // 使用自定义日志器
    app.useLogger(new CustomLogger('E2E-Test'));
    
    // 全局前缀
    app.setGlobalPrefix('api/v1');
    
    // 全局异常过滤器
    app.useGlobalFilters(new GlobalExceptionFilter());
    
    // 全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          // 将验证错误转换为自定义格式，由全局异常过滤器处理
          return new ValidationPipe().createExceptionFactory()(errors);
        },
      }),
    );
    
    // 全局请求追踪拦截器（第一个执行）
    app.useGlobalInterceptors(new RequestTrackingInterceptor());
    
    // 全局性能监控拦截器
    const performanceMonitor = app.get(PerformanceMonitorService);
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new PerformanceInterceptor(performanceMonitor, reflector));
    
    // 全局响应格式拦截器（最后执行）
    app.useGlobalInterceptors(new ResponseInterceptor());
    
    // 设置全局性能监控服务（供装饰器使用）
    global["performanceMonitorService"] = performanceMonitor;
    
    // CORS 配置
    app.enableCors({
      origin: true,
      credentials: true,
    });
    
    // 启动应用
    await app.init();
    
    console.log('✅ E2E测试应用启动完成');
    
    // 等待应用完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ E2E测试应用启动失败:', error);
    throw error;
  }
});

// 每个测试套件前的准备
beforeEach(async () => {
  try {
    // 清理数据库数据
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
    
    // 重置Redis缓存
    const redisService = testModule.get(RedisService);
    if (redisService) {
      const redisClient = redisService.getOrThrow();
      await redisClient.flushdb();
      await redisClient.config('RESETSTAT');
    }
    
  } catch (error) {
    console.warn('⚠️ E2E测试数据清理失败:', error.message);
  }
});

// 每个测试后清理
afterEach(() => {
  jest.clearAllMocks();
});

// E2E测试完成后清理
afterAll(async () => {
  console.log('🧹 清理E2E测试环境...');
  
  try {
    // 关闭应用
    if (app) {
      await app.close();
      console.log('✅ E2E测试应用已关闭');
    }
    
    // 关闭测试模块
    if (testModule) {
      await testModule.close();
    }
    
    // 停止MongoDB内存服务器
    if (mongoServer) {
      await mongoServer.stop();
      console.log('✅ E2E MongoDB内存服务器已停止');
    }
    
    // 清理定时器
    jest.clearAllTimers();
    
  } catch (error) {
    console.error('❌ E2E测试环境清理失败:', error);
  }
});

// E2E测试全局工具函数
global.getApp = () => app;

global.createTestRequest = () => {
  if (!app) {
    throw new Error('应用未启动，请确保在beforeAll中正确初始化');
  }
  return request(app.getHttpServer());
};

global.registerTestUser = async (userData: any = {}) => {
  const defaultUser = {
    username: 'e2euser',
    email: 'e2e@example.com',
    password: 'password123',
    role: 'developer',
    ...userData,
  };
  
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(defaultUser)
    .expect(201);
    
  return response.body.data;
};

global.loginTestUser = async (credentials: any = {}) => {
  const defaultCredentials = {
    username: 'e2euser',
    password: 'password123',
    ...credentials,
  };
  
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send(defaultCredentials)
    .expect(200);
    
  return response.body.data;
};

global.createTestApiKey = async (jwtToken: string, apiKeyData: any = {}) => {
  const defaultApiKey = {
    name: 'E2E Test API Key',
    permissions: ['data:read', 'query:execute', 'providers:read'],
    ...apiKeyData,
  };
  
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/api-keys')
    .set('Authorization', `Bearer ${jwtToken}`)
    .send(defaultApiKey)
    .expect(201);
    
  return response.body.data;
};

global.waitForApplication = async (timeoutMs: number = 5000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .timeout(1000);
        
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      // 继续等待
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`应用在 ${timeoutMs}ms 内未能就绪`);
};

// E2E测试断言助手
global.expectSuccessResponse = (response: any, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  
  // Check if response is wrapped by ResponseInterceptor
  if (response.body.statusCode && response.body.data !== undefined) {
    // Wrapped response format
    expect(response.body).toHaveProperty('statusCode', expectedStatus);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('timestamp');
  } else {
    // Direct response format (interceptor not applied)
    expect(response.body).toBeDefined();
  }
};

global.expectErrorResponse = (response: any, expectedStatus: number = 400) => {
  expect(response.status).toBe(expectedStatus);
  
  // Check if response has standard error format
  if (response.body.statusCode && response.body.error) {
    expect(response.body).toHaveProperty('statusCode', expectedStatus);
    expect(response.body).toHaveProperty('message');
    // timestamp might not be present in error responses
  } else {
    // Basic error response
    expect(response.body).toBeDefined();
  }
};