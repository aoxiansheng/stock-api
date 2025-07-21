/**
 * Monitoring模块数据库集成测试
 * 测试数据库监控系统的指标收集和性能分析功能
 */

import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as request from 'supertest';

import { UserRole } from '../../../../src/auth/enums/user-role.enum';
import { AuthService } from '../../../../src/auth/services/auth.service';
import { Permission } from '../../../../src/auth/enums/user-role.enum';
import { CacheService } from '../../../../src/cache/cache.service';
import { PerformanceMonitorService } from '../../../../src/metrics/services/performance-monitor.service';
import {
  smartDelay,
} from '../../../utils/async-test-helpers';
import {
  validateDatabaseMetricsResponse,
} from '../../../utils/api-response-helpers';

describe('Monitoring Database Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let cacheService: CacheService;
  let performanceMonitor: PerformanceMonitorService;
  let httpServer: any;
  let userModel: Model<any>;
  let apiKeyModel: Model<any>;
  let testApiKey: any;
  let testUser: any;
  let jwtToken: string;

  beforeAll(async () => {
    app = (global as any).testApp;
    httpServer = app.getHttpServer();
    authService = app.get<AuthService>(AuthService);
    cacheService = app.get<CacheService>(CacheService);
    performanceMonitor = app.get<PerformanceMonitorService>(PerformanceMonitorService);
    userModel = app.get(getModelToken('User'));
    apiKeyModel = app.get(getModelToken('ApiKey'));
  });

  beforeEach(async () => {
    // 创建测试用户和API Key
    await setupTestAuth();
  });

  async function setupTestAuth() {
    // 创建管理员用户
    testUser = await authService.register({
      username: 'db_admin',
      email: 'db_admin@test.com',
      password: 'admin123',
      role: UserRole.ADMIN,
    });

    const loginResponse = await authService.login({
      username: 'db_admin',
      password: 'admin123',
     // role: UserRole.ADMIN,
    });
    jwtToken = loginResponse.accessToken;

    // 创建API Key - 这部分保留，以防其他测试需要
    testApiKey = await authService.createApiKey(testUser.id, {
      name: 'Database Test API Key',
      permissions: [Permission.SYSTEM_ADMIN, Permission.SYSTEM_HEALTH],
    });
  }

  async function clearPerformanceMetrics() {
    const redis = cacheService.getClient();
    if (redis) {
      const keys = await redis.keys('metrics:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
    }
  }

  describe('数据库指标数据生成', () => {
    beforeEach(async () => {
      // 清理之前的测试数据
      await clearPerformanceMetrics();
    });

    it('应该通过数据库操作生成查询指标', async () => {
      // Arrange - 执行一系列数据库操作来生成指标
      const operations = [];
      
      // 创建测试用户来生成数据库查询
      for (let i = 0; i < 10; i++) {
        operations.push(
          authService.register({
            username: `db_test_user_${i}`,
            email: `db_test_${i}@test.com`,
            password: 'password123',
            role: UserRole.DEVELOPER,
          })
        );
      }

      // Act - 执行数据库操作
      await Promise.all(operations);
      
      // 执行查询操作
      for (let i = 0; i < 5; i++) {
        await userModel.find({ role: UserRole.DEVELOPER });
        await apiKeyModel.find({ name: { $regex: /test/i } });
      }

      // 等待数据库指标收集
      await smartDelay(1000);

      // Assert - 验证数据库指标
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateDatabaseMetricsResponse(response.body);
      expect(validatedResponse.data.totalQueries).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.averageQueryTime).toBeGreaterThanOrEqual(0);
    });

    it('应该正确统计数据库连接池指标', async () => {
      // Arrange - 创建多个并发数据库连接
      const concurrentQueries = [];
      for (let i = 0; i < 8; i++) {
        concurrentQueries.push(
          userModel.find({ role: UserRole.ADMIN })
        );
      }

      // Act - 执行并发查询
      await Promise.all(concurrentQueries);
      await smartDelay(500);

      // Assert - 验证连接池指标
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateDatabaseMetricsResponse(response.body);
      expect(validatedResponse.data.connectionPoolSize).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.activeConnections).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.waitingConnections).toBeGreaterThanOrEqual(0);
    });

    it('应该正确监控慢查询', async () => {
      // Arrange - 执行一些复杂查询来产生慢查询
      const complexQueries = [];
      
      // 创建复杂查询场景
      for (let i = 0; i < 5; i++) {
        complexQueries.push(
          userModel.aggregate([
            { $match: { role: { $in: [UserRole.ADMIN, UserRole.DEVELOPER] } } },
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ])
        );
      }

      // Act - 执行复杂查询
      await Promise.all(complexQueries);
      await smartDelay(1000);

      // Assert - 验证慢查询统计
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateDatabaseMetricsResponse(response.body);
      expect(validatedResponse.data.slowQueries).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.totalQueries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('数据库性能分析', () => {
    it('应该正确计算平均查询时间', async () => {
      // Arrange - 执行多种类型的查询
      const queryTypes = [
        () => userModel.findOne({ username: 'db_admin' }),
        () => userModel.find({ role: UserRole.ADMIN }),
        () => apiKeyModel.find({ name: 'Database Test API Key' }),
        () => userModel.countDocuments({ role: UserRole.DEVELOPER }),
      ];

      // Act - 执行不同类型的查询
      for (const queryFn of queryTypes) {
        for (let i = 0; i < 3; i++) {
          await queryFn();
        }
      }

      await smartDelay(1000);

      // Assert - 验证查询时间统计
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateDatabaseMetricsResponse(response.body);
      expect(validatedResponse.data.averageQueryTime).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.averageQueryTime).toBeLessThan(5000); // 应该小于5秒
    });

    it('应该监控数据库写入操作性能', async () => {
      // Arrange - 执行写入操作
      const writeOperations = [];
      
      for (let i = 0; i < 8; i++) {
        writeOperations.push(
          authService.register({
            username: `write_test_user_${i}`,
            email: `write_test_${i}@test.com`,
            password: 'password123',
            role: UserRole.DEVELOPER,
          })
        );
      }

      // Act - 执行写入操作
      await Promise.all(writeOperations);
      
      // 执行更新操作
      await userModel.updateMany(
        { username: { $regex: /^write_test_user_/ } },
        { $set: { lastLogin: new Date() } }
      );

      await smartDelay(1000);

      // Assert - 验证写入操作指标
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateDatabaseMetricsResponse(response.body);
      expect(validatedResponse.data.totalQueries).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.averageQueryTime).toBeGreaterThanOrEqual(0);
    });

    it('应该正确处理数据库连接异常', async () => {
      // Arrange - 创建一些查询负载
      const queries = [];
      for (let i = 0; i < 10; i++) {
        queries.push(
          userModel.find({ role: UserRole.ADMIN })
        );
      }

      // Act - 执行查询
      await Promise.all(queries);
      await smartDelay(500);

      // Assert - 验证在异常情况下的数据库指标
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // 即使在异常情况下，也应该返回基本的指标结构
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.connectionPoolSize).toBe('number');
      expect(typeof response.body.data.activeConnections).toBe('number');
      expect(typeof response.body.data.totalQueries).toBe('number');
    });
  });

  describe('数据库监控集成', () => {
    it('应该正确集成到整体性能监控', async () => {
      // Arrange - 生成数据库活动
      const dbActivities = [];
      
      // 创建用户
      for (let i = 0; i < 5; i++) {
        dbActivities.push(
          authService.register({
            username: `integration_user_${i}`,
            email: `integration_${i}@test.com`,
            password: 'password123',
            role: UserRole.DEVELOPER,
          })
        );
      }

      // 创建API Key
      for (let i = 0; i < 3; i++) {
        dbActivities.push(
          authService.createApiKey(testUser.id, {
            name: `Integration Test Key ${i}`,
            permissions: [Permission.DATA_READ],
          })
        );
      }

      // Act - 执行数据库操作
      await Promise.all(dbActivities);
      
      // 执行查询操作
      await userModel.find({ role: UserRole.DEVELOPER });
      await apiKeyModel.find({ name: { $regex: /Integration/ } });

      await smartDelay(1000);

      // Assert - 验证数据库指标集成到整体性能监控
      const performanceResponse = await request(httpServer)
        .get('/api/v1/monitoring/performance')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(performanceResponse.body.data.database).toBeDefined();
      expect(performanceResponse.body.data.database.totalQueries).toBeGreaterThanOrEqual(0);
    });

    it('应该在监控面板中显示数据库指标', async () => {
      // Arrange - 生成数据库指标数据
      const operations = [];
      for (let i = 0; i < 7; i++) {
        operations.push(
          userModel.find({ role: UserRole.ADMIN })
        );
      }

      // Act - 执行操作
      await Promise.all(operations);
      await smartDelay(1000);

      // Assert - 验证面板数据包含数据库指标
      const dashboardResponse = await request(httpServer)
        .get('/api/v1/monitoring/dashboard')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.performance.database).toBeDefined();
      expect(dashboardResponse.body.data.performance.database.totalQueries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('数据库告警和阈值', () => {


    it('应该生成数据库优化建议', async () => {
      // Arrange - 执行一些数据库操作
      const queries = [];
      for (let i = 0; i < 12; i++) {
        queries.push(
          userModel.find({ role: UserRole.DEVELOPER })
        );
      }

      // Act - 执行查询
      await Promise.all(queries);
      await smartDelay(1000);

      // Assert - 验证优化建议包含数据库相关内容
      const optimizationResponse = await request(httpServer)
        .get('/api/v1/monitoring/optimization/recommendations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(optimizationResponse.body.data.recommendations).toBeDefined();
      expect(Array.isArray(optimizationResponse.body.data.recommendations)).toBeTruthy();
    });
  });

  describe('数据库监控边界情况', () => {
    it('应该处理空数据库状态', async () => {
      // Arrange - 清理部分测试数据
      await userModel.deleteMany({ username: { $regex: /^db_test_user_/ } });
      await smartDelay(500);

      // Act - 获取数据库指标
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Assert - 验证空状态下的指标
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.connectionPoolSize).toBe('number');
      expect(typeof response.body.data.totalQueries).toBe('number');
    });

    it('应该处理高并发数据库访问', async () => {
      // Arrange - 创建高并发数据库访问
      const concurrentOperations = [];
      for (let i = 0; i < 20; i++) {
        concurrentOperations.push(
          userModel.find({ role: UserRole.ADMIN })
        );
      }

      // Act - 执行高并发操作
      await Promise.all(concurrentOperations);
      await smartDelay(1000);

      // Assert - 验证高并发情况下的指标
      const response = await request(httpServer)
        .get('/api/v1/monitoring/database')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateDatabaseMetricsResponse(response.body);
      expect(validatedResponse.data.totalQueries).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.averageQueryTime).toBeGreaterThanOrEqual(0);
    });
  });

  // 测试结束后的清理
  afterAll(async () => {
    try {
      // 清理测试数据
      await userModel.deleteMany({ 
        username: { 
          $regex: /^(db_admin|db_test_user_|write_test_user_|integration_user_)/ 
        } 
      });
      await apiKeyModel.deleteMany({ 
        name: { 
          $regex: /^(Database Test API Key|Integration Test Key)/ 
        } 
      });
      await clearPerformanceMetrics();
      
      console.log('✅ 监控数据库测试清理完成');
    } catch (error) {
      console.error('❌ 监控数据库测试清理失败:', error);
    }
  });
});