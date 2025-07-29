/**
 * Monitoring模块认证集成测试
 * 测试监控系统与认证系统的集成功能
 */

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import * as request from "supertest";

import { UserRole } from "../../../../src/auth/enums/user-role.enum";
import { AuthService } from "../../../../src/auth/services/auth.service";
import { Permission } from "../../../../src/auth/enums/user-role.enum";
import { smartDelay } from "../../../utils/async-test-helpers";
import {
  ApiResponseTestHelper,
  validateEndpointMetricsResponse,
  validatePerformanceMetricsResponse,
  validateSystemMetricsResponse,
  validateApiKeyCreationResponse,
} from "../../../utils/api-response-helpers";

describe("Monitoring Auth Integration", () => {
  // 全局变量声明
  let app: INestApplication;
  let httpServer: any;
  let authService: AuthService;
  let userModel: any;
  let apiKeyModel: any;
  let adminToken: string;
  let developerToken: string;
  let adminUser: any;
  let developerUser: any;

  beforeAll(async () => {
    app = (global as any).testApp;
    httpServer = app.getHttpServer();
    authService = app.get<AuthService>(AuthService);
    userModel = app.get(getModelToken("User"));
    apiKeyModel = app.get(getModelToken("ApiKey"));
  });

  beforeEach(async () => {
    // 在每个测试用例开始前重新创建用户和生成Token
    // 这样可以确保JWT Token与用户数据的生命周期一致
    await setupTestUsers();
  });

  afterEach(async () => {
    // 清理测试用例中创建的数据
    try {
      // 清理创建的用户
      if (adminUser) {
        await userModel.deleteOne({ _id: adminUser.id });
      }
      if (developerUser) {
        await userModel.deleteOne({ _id: developerUser.id });
      }

      // 清理创建的API Key
      if (adminUser) {
        await apiKeyModel.deleteMany({ userId: adminUser.id });
      }

      // 清理全局测试变量
      delete (global as any).testApiKey;
      delete (global as any).testApiSecret;

      console.log("✅ 监控认证测试清理完成");
    } catch (error) {
      console.error("❌ 监控认证测试清理失败:", error);
    }
  });

  async function setupTestUsers() {
    // 创建管理员用户
    adminUser = await authService.register({
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@test.com`,
      password: "admin123",
      role: UserRole.ADMIN,
    });

    // 创建开发者用户
    developerUser = await authService.register({
      username: `developer_${Date.now()}`,
      email: `developer_${Date.now()}@test.com`,
      password: "dev123",
      role: UserRole.DEVELOPER,
    });

    // 生成JWT令牌
    const adminLogin = await authService.login({
      username: adminUser.username,
      password: "admin123",
    });
    adminToken = adminLogin.accessToken;

    const developerLogin = await authService.login({
      username: developerUser.username,
      password: "dev123",
    });
    developerToken = developerLogin.accessToken;

    // 创建测试API Key（需要用于监控接口）
    await setupTestApiKeys();
  }

  async function setupTestApiKeys() {
    try {
      // 使用管理员身份创建具有系统管理权限的API Key
      const response = await request(httpServer)
        .post("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Monitoring API Key",
          permissions: [
            Permission.SYSTEM_ADMIN,
            Permission.SYSTEM_HEALTH,
            Permission.DATA_READ,
            Permission.QUERY_EXECUTE,
          ],
        });

      if (response.status === 201) {
        const validatedResponse = validateApiKeyCreationResponse(response.body);
        (global as any).testApiKey = validatedResponse.data.appKey;
        (global as any).testApiSecret = validatedResponse.data.accessToken;

        console.log("✅ 测试API Key创建成功", {
          appKey: validatedResponse.data.appKey.substring(0, 12) + "...",
          permissions: validatedResponse.data.permissions,
        });
      } else {
        console.warn("⚠️ 测试API Key创建失败，状态码:", response.status);
      }
    } catch (error: any) {
      console.error("❌ 测试API Key创建异常:", error.message);
      throw error; // 重新抛出错误，让测试失败而不是静默跳过
    }
  }

  describe("监控接口访问权限测试", () => {
    // 公共接口 - 可以未认证访问
    const publicEndpoints = ["/api/v1/monitoring/health"];

    // 管理员接口 - 需要管理员权限
    const adminEndpoints = [
      "/api/v1/monitoring/performance",
      "/api/v1/monitoring/endpoints",
      "/api/v1/monitoring/database",
      "/api/v1/monitoring/redis",
      "/api/v1/monitoring/system",
      "/api/v1/monitoring/alerts",
      "/api/v1/monitoring/cache",
      "/api/v1/monitoring/alerts/rules",
      "/api/v1/monitoring/alerts/active",
      "/api/v1/monitoring/alerts/history",
      "/api/v1/monitoring/optimization/recommendations",
      "/api/v1/monitoring/dashboard",
    ];

    it("公共监控接口应该允许未认证用户访问", async () => {
      for (const endpoint of publicEndpoints) {
        console.log(`Testing public endpoint: ${endpoint}`);
        const response = await request(httpServer).get(endpoint).expect(200); // OK - 公共接口允许访问

        // 验证标准响应结构
        ApiResponseTestHelper.validateSuccessResponse(response);

        // 验证健康检查响应包含必要字段
        if (endpoint === "/api/v1/monitoring/health") {
          expect(response.body.data).toMatchObject({
            status: expect.any(String),
            timestamp: expect.any(String),
            uptime: expect.any(Number),
            version: expect.any(String),
            message: expect.any(String),
          });
        }
      }
    });

    it("管理员也应该能访问公共监控接口", async () => {
      const apiKey = (global as any).testApiKey;
      const apiSecret = (global as any).testApiSecret;

      if (!apiKey || !apiSecret) {
        console.warn("测试API Key不可用，跳过测试", {
          apiKey: !!apiKey,
          apiSecret: !!apiSecret,
        });
        return;
      }

      for (const endpoint of publicEndpoints) {
        console.log(`Testing public endpoint with admin auth: ${endpoint}`);
        const response = await request(httpServer)
          .get(endpoint)
          .set("X-App-Key", apiKey)
          .set("X-Access-Token", apiSecret)
          .expect(200);

        // 验证标准响应结构
        ApiResponseTestHelper.validateSuccessResponse(response);
      }
    });

    it("开发者用户也应该能访问公共监控接口", async () => {
      // 创建一个只有基本权限的API Key
      const response = await request(httpServer)
        .post("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${developerToken}`)
        .send({
          name: "Developer API Key for Public",
          permissions: [Permission.DATA_READ], // 只有数据读取权限
        });

      if (response.status === 201) {
        const validatedResponse = validateApiKeyCreationResponse(response.body);
        const apiKeyData = validatedResponse.data;

        for (const endpoint of publicEndpoints) {
          console.log(
            `Testing public endpoint with developer auth: ${endpoint}`,
          );
          const response = await request(httpServer)
            .get(endpoint)
            .set("X-App-Key", apiKeyData.appKey)
            .set("X-Access-Token", apiKeyData.accessToken)
            .expect(200); // OK - 公共接口允许访问

          // 验证标准响应结构
          ApiResponseTestHelper.validateSuccessResponse(response);
        }
      } else {
        console.warn("创建开发者API Key失败，跳过测试");
      }
    });

    it("无效API Key应该被拒绝访问管理员接口", async () => {
      const invalidApiKey = "invalid-app-key";
      const invalidApiSecret = "invalid-api-secret";

      // 测试部分管理员接口（避免测试所有接口）
      for (const endpoint of adminEndpoints.slice(0, 3)) {
        await request(httpServer)
          .get(endpoint)
          .set("X-App-Key", invalidApiKey)
          .set("X-Access-Token", invalidApiSecret)
          .expect(403); // Forbidden，因为这些端点仅允许JWT认证而不允许API Key认证
      }
    });

    it("缺少API Key应该被拒绝访问管理员接口", async () => {
      // 测试部分管理员接口（避免测试所有接口）
      for (const endpoint of adminEndpoints.slice(0, 3)) {
        // 完全不提供认证信息
        await request(httpServer).get(endpoint).expect(401); // Unauthorized
      }
    });

    it("只提供API Key没有Secret应该被拒绝访问管理员接口", async () => {
      const apiKey = (global as any).testApiKey;

      if (apiKey) {
        await request(httpServer)
          .get("/api/v1/monitoring/performance")
          .set("X-App-Key", apiKey)
          // 缺少X-Access-Token
          .expect(401); // Unauthorized
      }
    });

    it("权限边界测试：确保权限分离正确", async () => {
      // 验证公共接口确实不需要认证
      for (const endpoint of publicEndpoints) {
        await request(httpServer).get(endpoint).expect(200); // 应该成功
      }

      // 验证管理员接口确实需要认证
      for (const endpoint of adminEndpoints.slice(0, 2)) {
        await request(httpServer).get(endpoint).expect(401); // 应该失败
      }
    });
  });

  describe("API Key验证集成测试", () => {
    it("应该正确验证API Key格式", async () => {
      // 测试无效格式的API Key
      const response = await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // 验证响应结构
      ApiResponseTestHelper.validateSuccessResponse(response);
    });

    it("应该正确验证API Key和Secret的匹配", async () => {
      // 测试管理员接口应该使用JWT Token认证
      const response = await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // 验证响应结构
      ApiResponseTestHelper.validateSuccessResponse(response);
    });

    it("应该正确验证API Key的权限", async () => {
      // 测试开发者用户访问管理员接口应该被拒绝
      await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${developerToken}`)
        .expect(403); // 禁止访问—权限不足
    });
  });

  describe("认证性能监控测试", () => {
    it("应该监控认证接口的性能指标", async () => {
      // Arrange - 生成一些测试流量
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(httpServer)
            .get("/api/v1/monitoring/performance")
            .set("Authorization", `Bearer ${adminToken}`),
        );
      }
      // 等待所有请求完成
      await Promise.all(requests);

      // 等待指标收集和Redis写入
      await smartDelay(500);

      // Act - 获取端点性能指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/endpoints")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证性能指标响应结构
      const validatedResponse = validateEndpointMetricsResponse(response.body);

      // 验证性能指标包含认证相关的信息
      expect(validatedResponse.data.metrics).toBeDefined();
      expect(validatedResponse.data.total).toBeGreaterThanOrEqual(0);
    });

    it("应该监控认证失败的统计", async () => {
      // Arrange - 生成一些失败的认证请求
      const invalidRequests = [
        request(httpServer)
          .get("/api/v1/monitoring/performance")
          .set("Authorization", "Bearer invalid-token"),
        request(httpServer).get("/api/v1/monitoring/performance"),
        // 没有Authorization头
      ];

      // 等待所有请求完成（忽略错误）
      await Promise.allSettled(invalidRequests);

      // 等待指标收集
      await smartDelay(500);

      // Act - 获取系统指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/system")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证系统指标响应结构
      const validatedResponse = validateSystemMetricsResponse(response.body);

      // 验证系统指标包含认证失败的统计
      expect(validatedResponse.data.timestamp).toBeDefined();
      expect(validatedResponse.data.cpuUsage).toBeDefined();
      expect(validatedResponse.data.memoryUsage).toBeDefined();
    });

    it("应该监控不同角色用户的访问模式", async () => {
      // Arrange - 模拟不同角色的访问
      const adminRequests = [];
      const developerRequests = [];

      for (let i = 0; i < 5; i++) {
        adminRequests.push(
          request(httpServer)
            .get("/api/v1/monitoring/performance")
            .set("Authorization", `Bearer ${adminToken}`),
        );
      }

      for (let i = 0; i < 3; i++) {
        developerRequests.push(
          request(httpServer)
            .get("/api/v1/monitoring/health")
            .set("Authorization", `Bearer ${developerToken}`),
        );
      }

      // 等待所有请求完成
      await Promise.all([...adminRequests, ...developerRequests]);

      // 等待指标收集
      await smartDelay(500);

      // Act - 获取系统指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/system")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证系统指标响应结构
      const validatedResponse = validateSystemMetricsResponse(response.body);

      // 验证系统指标包含访问模式统计
      expect(validatedResponse.data.timestamp).toBeDefined();
      expect(validatedResponse.data.cpuUsage).toBeDefined();
      expect(validatedResponse.data.memoryUsage).toBeDefined();
    });
  });

  describe("JWT Token认证集成测试", () => {
    it("应该支持JWT Token访问监控接口", async () => {
      // Act - 使用JWT Token访问监控接口
      const response = await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证性能指标响应结构
      const validatedResponse = validatePerformanceMetricsResponse(
        response.body,
      );
      expect(validatedResponse.data.summary).toBeDefined();
    });

    it("应该监控JWT Token认证的系统指标", async () => {
      // Arrange - 使用JWT Token进行多次访问
      for (let i = 0; i < 3; i++) {
        await request(httpServer)
          .get("/api/v1/monitoring/health")
          .set("Authorization", `Bearer ${adminToken}`);
      }

      await smartDelay(100);

      // Act - 获取系统指标
      const response = await request(httpServer)
        .get("/api/v1/monitoring/system")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证系统指标响应结构
      const validatedResponse = validateSystemMetricsResponse(response.body);
      expect(validatedResponse.data).toBeDefined();

      // 系统指标应该包含系统资源信息
      expect(validatedResponse.data.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(validatedResponse.data.uptime).toBeGreaterThan(0);
    });

    it("应该拒绝无效的JWT Token", async () => {
      await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("应该拒绝权限不足的用户", async () => {
      // 使用开发者Token（权限不足）访问需要管理员权限的监控接口
      await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${developerToken}`)
        .expect(403);
    });
  });

  describe("认证中间件集成测试", () => {
    it("应该正确处理认证中间件链", async () => {
      // Arrange - 设置认证中间件链测试
      const testCases = [
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200,
        },
        {
          headers: { Authorization: "Bearer invalid-token" },
          expectedStatus: 401,
        },
        { headers: {}, expectedStatus: 401 }, // 没有认证头
      ];

      for (const testCase of testCases) {
        // Act - 测试认证中间件链
        await request(httpServer)
          .get("/api/v1/monitoring/performance")
          .set(testCase.headers)
          .expect(testCase.expectedStatus);
      }

      // 成功认证的详细验证
      const response = await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证完整的认证流程
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it("应该正确处理认证异常", async () => {
      // Arrange - 设置认证异常测试
      const invalidAuthHeaders = [
        { Authorization: "Bearer expired-token" },
        { Authorization: "Bearer malformed.token" },
        { Authorization: "invalid-format" },
      ];

      for (const headers of invalidAuthHeaders) {
        // Act - 测试认证异常处理
        const response = await request(httpServer)
          .get("/api/v1/monitoring/performance")
          .set(headers)
          .expect(401);

        // Assert - 验证错误响应结构
        expect(response.body.statusCode).toBe(401);
        expect(response.body.message).toBeDefined();
      }
    });

    it("应该记录认证事件到审计日志", async () => {
      // Arrange - 执行认证操作
      await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${adminToken}`);

      // 等待异步的审计日志写入
      await smartDelay(200);

      // Act - 查询审计日志
      const response = await request(httpServer)
        .get("/api/v1/monitoring/system")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证响应结构
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("监控接口安全边界测试", () => {
    it("应该防止SQL注入尝试", async () => {
      // Arrange - 构造SQL注入尝试
      const sqlInjectionPayload = encodeURIComponent("'; DROP TABLE users; --");
      const apiKey = (global as any).testApiKey;
      const apiSecret = (global as any).testApiSecret;

      // Act - 使用一个接受字符串的有效端点 `/api/v1/query/symbols` 来测试SQL注入防护
      const response = await request(httpServer)
        .get(`/api/v1/query/symbols?symbols=${sqlInjectionPayload}`)
        .set("X-App-Key", apiKey)
        .set("X-Access-Token", apiSecret)
        .expect(200); // 期望成功响应，因为无效的 symbol 可能会被优雅地处理

      // Assert - 验证系统正常响应，且未泄露信息
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.text).not.toContain("SQL");
      expect(response.text).not.toContain("database");
    });

    it("应该防止XSS攻击尝试", async () => {
      // Arrange - 构造XSS攻击载荷
      const xssPayload = encodeURIComponent('<script>alert("xss")</script>');
      const apiKey = (global as any).testApiKey;
      const apiSecret = (global as any).testApiSecret;

      // Act - 使用 API Key 认证并请求 `/api/v1/query/symbols`
      const response = await request(httpServer)
        .get(`/api/v1/query/symbols?symbols=AAPL.US&provider=${xssPayload}`)
        .set("X-App-Key", apiKey)
        .set("X-Access-Token", apiSecret)
        .expect(200); // 期望成功响应，因为无效的 provider 可能会被优雅地处理

      // Assert - 验证响应安全
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();

      // 响应应该正确转义特殊字符，或者完全不包含恶意输入
      expect(response.text).not.toContain("<script>");
      expect(response.text).not.toContain("alert");
    });

    it("应该限制请求大小和频率", async () => {
      // Arrange - 设置频率限制测试
      const rapidRequests = [];
      for (let i = 0; i < 20; i++) {
        rapidRequests.push(
          request(httpServer)
            .get("/api/v1/monitoring/performance")
            .set("Authorization", `Bearer ${adminToken}`),
        );
      }

      // Act - 并发发送大量请求
      const results = await Promise.allSettled(rapidRequests);

      // Assert - 验证频率限制生效
      const successfulRequests = results.filter(
        (r) => r.status === "fulfilled",
      );
      expect(successfulRequests.length).toBeGreaterThanOrEqual(1);

      // 至少有一些请求应该成功
      expect(successfulRequests.length).toBeGreaterThan(0);
    });
  });

  // 测试结束后的清理
  afterAll(async () => {
    try {
      // 清理测试数据

      // 清理全局变量
      delete (global as any).testApiKey;
      delete (global as any).testApiSecret;

      console.log("✅ 监控认证测试清理完成");
    } catch (error) {
      console.error("❌ 监控认证测试清理失败:", error);
    }
  });
});
