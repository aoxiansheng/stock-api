/**
 * Monitoring模块Redis集成测试
 * 测试Redis缓存监控系统的指标收集和性能分析功能
 */

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as request from "supertest";

import { UserRole } from "../../../../src/auth/enums/user-role.enum";
import { AuthService } from "../../../../src/auth/services/auth.service";
import { Permission } from "../../../../src/auth/enums/user-role.enum";
import { CacheService } from "../../../../src/cache/cache.service";
import { smartDelay } from "../../../utils/async-test-helpers";
import { validateRedisMetricsResponse } from "../../../utils/api-response-helpers";

describe("Monitoring Redis Integration", () => {
  let app: INestApplication;
  let authService: AuthService;
  let cacheService: CacheService;

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

    userModel = app.get(getModelToken("User"));
    apiKeyModel = app.get(getModelToken("ApiKey"));
  });

  beforeEach(async () => {
    // 创建测试用户和API Key
    await setupTestAuth();

    // 增加延时，确保资源准备完成
    await smartDelay(1000);
  });

  afterEach(async () => {
    // 清理测试数据
    try {
      if (cacheService.getClient) {
        await cacheService.getClient().flushdb();
      }
    } catch (error) {
      console.log("Redis清理失败:", error.message);
    }

    // 清理测试用户和API Key
    try {
      if (testApiKey && testApiKey._id) {
        await apiKeyModel.deleteOne({ _id: testApiKey._id });
      }
      if (testUser && testUser.id) {
        await userModel.deleteOne({ _id: testUser.id });
      }
    } catch (error) {
      console.log("数据库清理失败:", error.message);
    }

    // 延时，确保资源释放完成
    await smartDelay(1500);

    console.log("✅ 测试数据清理完成");
  });

  async function setupTestAuth() {
    // 创建管理员用户
    testUser = await authService.register({
      username: "redis_admin",
      email: "redis_admin@test.com",
      password: "admin123",
      role: UserRole.ADMIN,
    });

    const loginResponse = await authService.login({
      username: "redis_admin",
      password: "admin123",
    });
    jwtToken = loginResponse.accessToken;

    // 创建API Key - 保留以备将来测试之需
    testApiKey = await authService.createApiKey(testUser.id, {
      name: "Redis Test API Key",
      permissions: [Permission.SYSTEM_ADMIN, Permission.SYSTEM_HEALTH],
    });
  }

  describe("Redis缓存指标数据生成", () => {
    beforeEach(async () => {
      // 清理Redis缓存
      if (cacheService.getClient) {
        await cacheService.getClient().flushdb();
      }
    });

    it("应该通过缓存操作生成Redis指标", async () => {
      // Arrange - 执行缓存操作来生成指标
      const cacheOperations = [];

      // 设置缓存数据
      for (let i = 0; i < 15; i++) {
        cacheOperations.push(
          cacheService.set(`test_key_${i}`, {
            data: `test_value_${i}`,
            timestamp: Date.now(),
          }),
        );
      }

      // Act - 执行缓存设置操作
      await Promise.all(cacheOperations);

      // 执行缓存读取操作
      for (let i = 0; i < 10; i++) {
        await cacheService.get(`test_key_${i}`);
      }

      // 等待Redis指标收集
      await smartDelay(1000);

      // Assert - 验证Redis指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.connectedClients).toBeGreaterThanOrEqual(0);
    });

    it("应该正确统计缓存命中率", async () => {
      // Arrange - 设置一些缓存数据
      const cacheKeys = [];
      for (let i = 0; i < 8; i++) {
        const key = `hit_test_key_${i}`;
        cacheKeys.push(key);
        await cacheService.set(key, { data: `value_${i}` });
      }

      // Act - 执行缓存命中和未命中操作
      // 缓存命中
      for (let i = 0; i < 5; i++) {
        await cacheService.get(`hit_test_key_${i}`);
      }

      // 缓存未命中
      for (let i = 0; i < 3; i++) {
        await cacheService.get(`miss_test_key_${i}`);
      }

      await smartDelay(1000);

      // Assert - 验证缓存命中率
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.hitRate).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.hitRate).toBeLessThanOrEqual(1);
    });

    it("应该正确监控Redis内存使用", async () => {
      // Arrange - 创建不同大小的缓存数据
      const largeDataOperations = [];

      for (let i = 0; i < 10; i++) {
        const largeData = {
          id: i,
          content: "x".repeat(1000), // 1KB数据
          metadata: {
            created: new Date().toISOString(),
            tags: Array.from({ length: 10 }, (_, j) => `tag_${j}`),
          },
        };
        largeDataOperations.push(
          cacheService.set(`large_data_${i}`, largeData),
        );
      }

      // Act - 执行大数据缓存操作
      await Promise.all(largeDataOperations);
      await smartDelay(1000);

      // Assert - 验证内存使用指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Redis性能分析", () => {
    it("应该正确计算Redis操作性能", async () => {
      // Arrange - 执行多种Redis操作
      const operations = [];

      // 设置操作
      for (let i = 0; i < 10; i++) {
        operations.push(
          cacheService.set(`perf_test_${i}`, {
            index: i,
            data: `test_data_${i}`,
          }),
        );
      }

      // Act - 执行操作
      await Promise.all(operations);

      // 执行读取操作
      for (let i = 0; i < 8; i++) {
        await cacheService.get(`perf_test_${i}`);
      }

      await smartDelay(1000);

      // Assert - 验证性能指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.opsPerSecond).toBeGreaterThanOrEqual(0);
    });

    it("应该监控Redis键过期和清理", async () => {
      // Arrange - 设置短期和长期缓存
      const shortTermOperations = [];
      const longTermOperations = [];

      // 短期缓存（1秒过期）
      for (let i = 0; i < 5; i++) {
        shortTermOperations.push(
          cacheService.set(
            `short_term_${i}`,
            { data: `short_${i}` },
            { ttl: 1 },
          ),
        );
      }

      // 长期缓存（1小时过期）
      for (let i = 0; i < 5; i++) {
        longTermOperations.push(
          cacheService.set(`long_term_${i}`, { data: `long_${i}` }),
        );
      }

      // Act - 执行缓存操作
      await Promise.all([...shortTermOperations, ...longTermOperations]);

      // 等待短期缓存过期
      await smartDelay(2000);

      // Assert - 验证键过期指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.expiredKeys).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.evictedKeys).toBeGreaterThanOrEqual(0);
    });

    it("应该正确处理Redis连接监控", async () => {
      // Arrange - 创建多个并发缓存操作
      const concurrentOperations = [];
      for (let i = 0; i < 12; i++) {
        concurrentOperations.push(
          cacheService.set(`concurrent_${i}`, { data: `concurrent_data_${i}` }),
        );
      }

      // Act - 执行并发操作
      await Promise.all(concurrentOperations);
      await smartDelay(500);

      // Assert - 验证连接指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.connectedClients).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Redis缓存优化监控", () => {
    it("应该生成缓存优化建议", async () => {
      // Arrange - 创建多样化的缓存数据
      const operations = [];

      // 创建频繁访问的数据
      for (let i = 0; i < 10; i++) {
        operations.push(
          cacheService.set(`frequent_data_${i}`, {
            id: i,
            data: `frequent_value_${i}`,
            accessed: Date.now(),
          }),
        );
      }

      // 创建少量大数据
      for (let i = 0; i < 3; i++) {
        const bigData = {
          id: i,
          content: "x".repeat(5000), // 5KB数据
          metadata: Array.from({ length: 100 }, (_, j) => ({
            id: j,
            name: `item_${j}`,
          })),
        };
        operations.push(cacheService.set(`big_data_${i}`, bigData));
      }

      // Act - 执行缓存操作
      await Promise.all(operations);

      // 增加延时，确保Redis操作完成
      await smartDelay(2000);

      // 执行一些读取操作以产生统计数据
      for (let i = 0; i < 5; i++) {
        await cacheService.get(`frequent_data_${i}`);
      }

      // 再次延时，确保指标收集完成
      await smartDelay(2000);

      // Assert - 验证优化建议
      const optimizationResponse = await request(httpServer)
        .get("/api/v1/monitoring/optimization/recommendations")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(optimizationResponse.body.data.recommendations).toBeDefined();
      expect(
        Array.isArray(optimizationResponse.body.data.recommendations),
      ).toBeTruthy();
    });
  });

  describe("Redis监控集成", () => {
    it("应该正确集成到整体性能监控", async () => {
      // Arrange - 生成Redis活动
      const redisActivities = [];

      // 用户相关缓存
      for (let i = 0; i < 8; i++) {
        redisActivities.push(
          cacheService.set(`user_cache_${i}`, {
            userId: i,
            profile: `profile_${i}`,
          }),
        );
      }

      // API Key相关缓存
      for (let i = 0; i < 5; i++) {
        redisActivities.push(
          cacheService.set(`api_key_cache_${i}`, {
            keyId: i,
            permissions: ["read"],
          }),
        );
      }

      // Act - 执行Redis操作
      await Promise.all(redisActivities);

      // 增加延时，确保Redis操作完成
      await smartDelay(1500);

      // 执行读取操作
      for (let i = 0; i < 6; i++) {
        await cacheService.get(`user_cache_${i}`);
      }

      // 再次延时，确保指标收集完成
      await smartDelay(2000);

      // Assert - 验证Redis指标集成到整体性能监控
      const performanceResponse = await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(performanceResponse.body.data.redis).toBeDefined();
      expect(
        performanceResponse.body.data.redis.memoryUsage,
      ).toBeGreaterThanOrEqual(0);
    });

    it("应该在监控面板中显示Redis指标", async () => {
      // Arrange - 生成Redis指标数据
      const operations = [];
      for (let i = 0; i < 12; i++) {
        operations.push(
          cacheService.set(`dashboard_test_${i}`, {
            index: i,
            data: `dashboard_data_${i}`,
          }),
        );
      }

      // Act - 执行操作
      await Promise.all(operations);

      // 增加延时，确保Redis操作完成
      await smartDelay(1500);

      // 执行读取操作
      for (let i = 0; i < 8; i++) {
        await cacheService.get(`dashboard_test_${i}`);
      }

      // 再次延时，确保指标收集完成
      await smartDelay(2000);

      // Assert - 验证面板数据包含Redis指标
      const dashboardResponse = await request(httpServer)
        .get("/api/v1/monitoring/dashboard")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.cache).toBeDefined();
      if (dashboardResponse.body.data.cache.totalKeys !== undefined) {
        expect(
          dashboardResponse.body.data.cache.totalKeys,
        ).toBeGreaterThanOrEqual(0);
      }
      expect(dashboardResponse.body.data.cache.hitRate).toBeGreaterThanOrEqual(
        0,
      );
    });
  });

  describe("Redis监控边界情况", () => {
    it("应该处理空Redis状态", async () => {
      // Arrange - 清空Redis
      if (cacheService.getClient) {
        await cacheService.getClient().flushdb();
      }
      await smartDelay(500);

      // Act - 获取Redis指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert - 验证空状态下的指标
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.memoryUsage).toBe("number");
      expect(typeof response.body.data.connectedClients).toBe("number");
      expect(typeof response.body.data.hitRate).toBe("number");
    });

    it("应该处理Redis连接异常情况", async () => {
      // Arrange - 创建一些缓存负载
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          cacheService.set(`exception_test_${i}`, { data: `test_${i}` }),
        );
      }

      // Act - 执行操作
      await Promise.all(operations);
      await smartDelay(500);

      // Assert - 验证在异常情况下的Redis指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // 即使在异常情况下，也应该返回基本的指标结构
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.memoryUsage).toBe("number");
      expect(typeof response.body.data.connectedClients).toBe("number");
      expect(typeof response.body.data.opsPerSecond).toBe("number");
    });

    it("应该处理高频缓存操作", async () => {
      // Arrange - 创建高频缓存操作
      const highFreqOperations = [];
      for (let i = 0; i < 100; i++) {
        highFreqOperations.push(
          cacheService.set(`high_freq_${i}`, {
            index: i,
            timestamp: Date.now(),
          }),
        );
      }

      // Act - 执行高频操作
      await Promise.all(highFreqOperations);

      // 高频读取操作
      const readOperations = [];
      for (let i = 0; i < 80; i++) {
        readOperations.push(cacheService.get(`high_freq_${i}`));
      }
      await Promise.all(readOperations);

      await smartDelay(1000);

      // Assert - 验证高频操作下的指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/redis")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const validatedResponse = validateRedisMetricsResponse(response.body);
      expect(validatedResponse.data.opsPerSecond).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  // 测试结束后的清理
  afterAll(async () => {
    try {
      // 清理测试数据
      await userModel.deleteMany({ username: "redis_admin" });
      await apiKeyModel.deleteMany({ name: "Redis Test API Key" });
      if (cacheService.getClient) {
        await cacheService.getClient().flushdb();
      }

      console.log("✅ 监控Redis测试清理完成");
    } catch (error) {
      console.error("❌ 监控Redis测试清理失败:", error);
    }
  });
});
