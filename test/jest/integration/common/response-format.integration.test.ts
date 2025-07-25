/**
 * 响应格式标准化集成测试
 * 测试系统范围内的响应格式一致性
 */

import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

describe("Response Format Standardization Integration", () => {
  let app: INestApplication;
  let httpServer: any;
  let apiKey: string;
  let accessToken: string;

  // 将数据创建逻辑移至 beforeEach
  beforeEach(async () => {
    // 使用全局集成测试设置中的应用实例
    // 注意：app 和 httpServer 在全局 beforeAll 中已初始化，此处直接使用
    app = (global as any).testApp;
    httpServer = (global as any).httpServer;

    if (!app || !httpServer) {
      throw new Error("集成测试环境未正确初始化，请检查 integration.setup.ts");
    }

    // 在每个测试前都创建一个新的 API Key，以适应全局 beforeEach 的清理策略
    const adminData = {
      username: `test_admin_${Date.now()}`,
      email: `test_admin_${Date.now()}@example.com`,
      password: "password123",
      role: "admin",
    };

    // 1. 注册管理员用户
    const registerResponse = await request(httpServer)
      .post("/api/v1/auth/register")
      .send(adminData);
    expect(registerResponse.status).toBe(201);

    // 2. 登录获取 JWT
    const loginResponse = await request(httpServer)
      .post("/api/v1/auth/login")
      .send({ username: adminData.username, password: adminData.password });
    expect(loginResponse.status).toBe(200);

    const jwtToken = loginResponse.body.data.accessToken;

    // 3. 创建具有所有必要权限的 API Key
    const apiKeyResponse = await request(httpServer)
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send({
        name: "Single Test API Key",
        permissions: ["data:read", "query:execute"],
      });
    expect(apiKeyResponse.status).toBe(201);

    apiKey = apiKeyResponse.body.data.appKey;
    accessToken = apiKeyResponse.body.data.accessToken;

    // 4. 创建符号映射规则 - 解决接收器模块测试中的400错误
    const { getModelToken } = await import("@nestjs/mongoose");
    const symbolMappingModel = app.get(getModelToken("SymbolMappingRule"), {
      strict: false,
    });
    if (symbolMappingModel) {
      await symbolMappingModel.create({
        dataSourceName: "longport",
        description: "长桥证券数据源映射配置",
        mappingRules: [
          {
            inputSymbol: "700.HK",
            outputSymbol: "00700.HK",
            market: "HK",
            symbolType: "stock",
            isActive: true,
            description: "腾讯控股",
          },
          {
            inputSymbol: "00700.HK",
            outputSymbol: "00700",
            market: "HK",
            symbolType: "stock",
            isActive: true,
            description: "腾讯控股(标准格式)",
          },
          {
            inputSymbol: "AAPL.US",
            outputSymbol: "AAPL",
            market: "US",
            symbolType: "stock",
            isActive: true,
            description: "苹果公司",
          },
          {
            inputSymbol: "000001.SZ",
            outputSymbol: "000001",
            market: "SZ",
            symbolType: "stock",
            isActive: true,
            description: "平安银行",
          },
        ],
        isActive: true,
        createdBy: "test-setup",
        version: "1.0.0",
      });
    }
  });

  describe("核心模块响应格式", () => {
    describe("认证模块 (/api/v1/auth)", () => {
      // 认证模块的测试不依赖于顶层的 beforeEach，它们自己处理用户创建

      it("注册响应应该符合标准格式", async () => {
        const registerData = {
          username: `test_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: "password123",
          role: "developer",
        };

        const response = await request(httpServer)
          .post("/api/v1/auth/register")
          .send(registerData)
          .expect(201);

        // 验证标准响应格式 - 后端注册只返回用户信息，不返回token
        expect(response.body).toMatchObject({
          statusCode: 201,
          message: expect.any(String),
          data: expect.objectContaining({
            id: expect.any(String),
            username: registerData.username,
            email: registerData.email,
            role: registerData.role,
            isActive: expect.any(Boolean),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            lastLoginAt: expect.any(String),
          }),
          timestamp: expect.any(String),
        });

        // 验证中文消息
        expect(response.body.message).toMatch(/创建|注册|成功/);


      });

      it("登录响应应该符合标准格式", async () => {
        const loginData = {
          username: `test_${Date.now()}`,
          email: `test_login_${Date.now()}@example.com`,
          password: "password123",
          role: "developer",
        };

        // 先注册一个用户
        await request(httpServer).post("/api/v1/auth/register").send(loginData);

        // 然后登录
        const response = await request(httpServer)
          .post("/api/v1/auth/login")
          .send({
            username: loginData.username,
            password: loginData.password,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          statusCode: 200,
          message: expect.any(String),
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
              username: loginData.username,
              email: loginData.email,
              role: loginData.role,
              isActive: expect.any(Boolean),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              lastLoginAt: expect.any(String),
            }),
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
          timestamp: expect.any(String),
        });

        expect(response.body.message).toMatch(/登录|成功/);
      });

      it("认证失败响应应该符合标准格式", async () => {
        const response = await request(httpServer)
          .post("/api/v1/auth/login")
          .send({ username: "nonexistentuser", password: "wrongpassword" })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          message: expect.any(String),
          error: {
            code: "UNAUTHORIZED",
            details: {
              type: "AuthenticationError",
              path: "/api/v1/auth/login",
            },
          },
          timestamp: expect.any(String),
        });
      });
    });

    describe("接收器模块 (/api/v1/receiver)", () => {
      it("数据请求响应应该符合标准格式", async () => {
        const response = await request(httpServer)
          .post("/api/v1/receiver/data")
          .set("x-app-key", apiKey)
          .set("x-access-token", accessToken)
          .send({
            symbols: ["700.HK"], // 使用系统中配置的映射格式
            dataType: "stock-quote",
          })
          .expect(200);

        expect(response.body).toMatchObject({
          statusCode: 200,
          message: expect.any(String),
          data: expect.any(Object),
          timestamp: expect.any(String),
        });

        // 验证数据结构 - 修正为实际的 DataResponseDto 格式
        // 移除对success字段的检查，新架构中ResponseInterceptor统一处理
        expect(response.body.data.data).toBeDefined();
        expect(Array.isArray(response.body.data.data)).toBe(true);
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.metadata.provider).toBeDefined();
        expect(response.body.data.metadata.requestId).toBeDefined();
        expect(response.body.data.metadata.processingTime).toBeDefined();
      });

      it("无效 API Key 响应应该符合标准格式", async () => {
        const response = await request(httpServer)
          .post("/api/v1/receiver/data")
          .set("X-App-Key", "invalid-key")
          .send({
            symbols: ["700.HK"],
            dataType: "stock-quote",
          })
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          message: expect.any(String),
          error: {
            code: "INVALID_API_KEY",
            details: {
              type: "AuthenticationError",
              path: "/api/v1/receiver/data",
              providedKey: "invalid-key",
            },
          },
          timestamp: expect.any(String),
        });
      });
    });

    describe("查询模块 (/api/v1/query)", () => {
      it("查询执行响应应该符合标准格式", async () => {
        const response = await request(httpServer)
          .post("/api/v1/query/execute")
          .set("x-app-key", apiKey)
          .set("x-access-token", accessToken)
          .send({
            queryType: "by_symbols",
            symbols: ["700.HK", "AAPL.US"],
          })
          .expect(201);

        expect(response.body).toMatchObject({
          statusCode: 201,
          message: expect.any(String),
          data: expect.any(Object),
          timestamp: expect.any(String),
        });

        // 验证数据结构 - 查询响应的格式
        // 移除对success字段的检查，新架构中ResponseInterceptor统一处理
        expect(response.body.data.data).toBeDefined();
        expect(Array.isArray(response.body.data.data)).toBe(true);
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.metadata.queryType).toBe("by_symbols");
        expect(response.body.data.metadata.totalResults).toBeGreaterThanOrEqual(
          0,
        );
        expect(response.body.data.metadata.executionTime).toBeGreaterThan(0);
      });
    });
  });

  describe("监控和健康检查", () => {
    it("健康检查应该符合标准格式", async () => {
      // 创建具有DEVELOPER权限的用户（健康检查端点需要DEVELOPER权限）
      const devData = {
        username: `dev_health_${Date.now()}`,
        email: `dev_health_${Date.now()}@example.com`,
        password: "password123",
        role: "developer",
      };

      await request(httpServer).post("/api/v1/auth/register").send(devData);

      // 登录获取 JWT token
      const loginResponse = await request(httpServer)
        .post("/api/v1/auth/login")
        .send({
          username: devData.username,
          password: devData.password,
        });

      const jwtToken = loginResponse.body.data.accessToken;

      const response = await request(httpServer)
        .get("/api/v1/monitoring/health")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // 健康检查应该返回标准格式
      expect(response.body).toMatchObject({
        statusCode: 200,
        message: expect.any(String),
        data: expect.objectContaining({
          status: expect.any(String),
          score: expect.any(Number),
          timestamp: expect.any(String),
          issues: expect.any(Array),
          recommendations: expect.any(Array),
          uptime: expect.any(Number),
          version: expect.any(String),
        }),
        timestamp: expect.any(String),
      });
    });

    it("性能指标应该符合标准格式", async () => {
      // 创建管理员用户（性能指标端点需要ADMIN权限）
      const adminData = {
        username: `admin_performance_${Date.now()}`,
        email: `admin_performance_${Date.now()}@example.com`,
        password: "password123",
        role: "admin",
      };

      await request(httpServer).post("/api/v1/auth/register").send(adminData);

      // 登录获取 JWT token
      const loginResponse = await request(httpServer)
        .post("/api/v1/auth/login")
        .send({
          username: adminData.username,
          password: adminData.password,
        });

      const jwtToken = loginResponse.body.data.accessToken;

      const response = await request(httpServer)
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // 性能指标端点应该返回标准格式
      expect(response.body).toMatchObject({
        statusCode: 200,
        message: expect.any(String),
        data: expect.objectContaining({
          healthScore: expect.any(Number),
          summary: expect.any(Object),
          timestamp: expect.any(String),
          endpoints: expect.any(Array),
          database: expect.any(Object),
          redis: expect.any(Object),
          system: expect.any(Object),
        }),
        timestamp: expect.any(String),
      });
    });
  });

  describe("错误响应格式一致性", () => {
    it("验证错误应该符合标准格式", async () => {
      // 触发注册接口的验证错误
      const response = await request(httpServer)
        .post("/api/v1/auth/register")
        .send({ username: "", email: "not-an-email", password: "123" })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("验证失败"),
        error: {
          code: "VALIDATION_ERROR",
          details: {
            type: "ValidationError",
            path: "/api/v1/auth/register",
            fields: expect.any(Array),
          },
        },
        timestamp: expect.any(String),
      });

      // 检查 fields 数组是否包含至少一个错误
      expect(response.body.error.details.fields.length).toBeGreaterThan(0);
    });

    it("权限错误应该符合标准格式", async () => {
      // 在没有登录的情况下请求需要认证的端点
      const response = await request(httpServer)
        .get("/api/v1/auth/api-keys")
        .expect(401); // 没有 JWT token

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: expect.any(String),
        error: {
          code: "UNAUTHORIZED",
          details: {
            type: "AuthenticationError",
            path: "/api/v1/auth/api-keys",
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("404 错误应该符合标准格式", async () => {
      const response = await request(httpServer)
        .get("/api/v1/nonexistent-endpoint")
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.any(String),
        error: {
          code: "NOT_FOUND",
          details: {
            type: "Not Found",
            path: "/api/v1/nonexistent-endpoint",
          },
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("响应时间戳格式", () => {
    it("所有成功响应都应该包含有效的 ISO 时间戳", async () => {
      const registerData = {
        username: `timestamp_test_${Date.now()}`,
        email: `timestamp_test_${Date.now()}@example.com`,
        password: "password123",
        role: "developer",
      };

      const response = await request(httpServer)
        .post("/api/v1/auth/register")
        .send(registerData)
        .expect(201);

      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe("string");

      // 验证 ISO 8601 格式
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);

      // 验证时间戳是最近的（不超过10秒前）
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      expect(diff).toBeLessThan(10000);
    });

    it("所有错误响应都应该包含有效的 ISO 时间戳", async () => {
      const response = await request(httpServer)
        .get("/api/v1/nonexistent-endpoint")
        .expect(404);

      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe("string");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe("中文消息本地化", () => {
    it("成功响应应该使用中文消息", async () => {
      const registerData = {
        username: `chinese_test_${Date.now()}`,
        email: `chinese_test_${Date.now()}@example.com`,
        password: "password123",
        role: "developer",
      };

      const response = await request(httpServer)
        .post("/api/v1/auth/register")
        .send(registerData)
        .expect(201);

      expect(response.body.message).toMatch(/[\u4e00-\u9fff]/); // 包含中文字符
      expect(response.body.message).toMatch(/创建成功|注册成功|成功/);
    });

    it("错误响应应该使用中文消息", async () => {
      const response = await request(httpServer)
        .post("/api/v1/auth/login")
        .send({
          username: "nonexistent_user",
          password: "wrong_password",
        })
        .expect(401);

      expect(response.body.message).toMatch(/[\u4e00-\u9fff]/); // 包含中文字符
    });
  });

  describe("Content-Type 一致性", () => {
    it("所有 JSON 响应都应该设置正确的 Content-Type", async () => {
      const registerData = {
        username: `content_type_test_${Date.now()}`,
        email: `content_type_test_${Date.now()}@example.com`,
        password: "password123",
        role: "developer",
      };

      const response = await request(httpServer)
        .post("/api/v1/auth/register")
        .send(registerData)
        .expect(201);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("错误响应也应该设置正确的 Content-Type", async () => {
      const response = await request(httpServer)
        .get("/api/v1/nonexistent-endpoint")
        .expect(404);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("并发请求格式一致性", () => {
    it("并发请求应该保持响应格式一致性", async () => {
      const concurrentRequests = 10;
      const timestamp = Date.now(); // 记录创建时的时间戳

      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        const userData = {
          username: `concurrent_user_${timestamp}_${i}`,
          email: `concurrent_user_${timestamp}_${i}@example.com`,
          password: "password123",
          role: "developer",
        };

        return request(httpServer)
          .post("/api/v1/auth/register")
          .send(userData)
          .expect(201);
      });

      const responses = await Promise.all(promises);

      // 验证所有响应都符合标准格式
      responses.forEach((response) => {
        expect(response.body).toMatchObject({
          statusCode: 201,
          message: expect.any(String),
          data: expect.objectContaining({
            id: expect.any(String),
            username: expect.stringContaining(`concurrent_user_${timestamp}`),
            email: expect.any(String),
            role: expect.any(String),
            isActive: expect.any(Boolean),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            lastLoginAt: expect.any(String),
          }),
          timestamp: expect.any(String),
        });

        expect(response.body.message).toMatch(/[\u4e00-\u9fff]/);
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });
    });
  });
});
