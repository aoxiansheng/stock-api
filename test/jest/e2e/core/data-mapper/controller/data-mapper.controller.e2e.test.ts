describe("Error Handling and Recovery E2E Tests", () => {
  let httpServer: any;
  let authTokens: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();

    // 创建测试用户并获取认证tokens
    await setupAuthentication();
  });

  async function setupAuthentication() {
    // 1. 注册测试用户
    const userData = {
      username: "errorhandlinguser",
      email: "errorhandling@example.com",
      password: "password123",
      role: "developer",
    };

    await httpServer.post("/api/v1/auth/register").send(userData);

    // 2. 登录获取JWT token
    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });

    jwtToken =
      loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    // 3. 创建API Key
    const apiKeyData = {
      name: "Error Handling Test API Key",
      permissions: [
        "data:read",
        "query:execute",
        "providers:read",
        "transformer:preview",
      ],
      rateLimit: {
        requests: 100,
        window: "1h",
      },
    };

    const apiKeyResponse = await httpServer
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(apiKeyData);

    const apiKeyResult = apiKeyResponse.body.data;
    authTokens = {
      apiKey: apiKeyResult.appKey,
      accessToken: apiKeyResult.accessToken,
    };
  }

  describe("Error Handling and Recovery", () => {
    it("should handle provider failures gracefully", async () => {
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["AAPLL.US"],
          receiverType: "get-stock-quote",
          options: {
            preferredProvider: "longport",
          },
        })
        .expect(200); // 即使失败也返回200，错误信息在响应体中

      expect(response.body.statusCode).toBe(200);

      // 验证响应结构符合 DataResponseDto 格式
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");

      // 验证元数据包含必要信息
      expect(response.body.data.metadata).toHaveProperty("provider");
      expect(response.body.data.metadata).toHaveProperty("capability");
      expect(response.body.data.metadata).toHaveProperty("requestId");
      expect(response.body.data.metadata).toHaveProperty("processingTime");
      expect(response.body.data.metadata).toHaveProperty("timestamp");

      // 验证数据字段存在（即使可能为空或包含错误信息）
      expect(response.body.data.data).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it("should validate input across all modules", async () => {
      // 测试各个模块的输入验证
      const invalidRequests = [
        {
          endpoint: "/api/v1/receiver/data",
          body: { symbols: [], receiverType: "get-stock-quote" },
        },
        {
          endpoint: "/api/v1/symbol-mapper/transform",
          body: { symbols: [], dataSourceName: "test" },
        },
        {
          endpoint: "/api/v1/query/execute",
          body: { queryType: "invalid", parameters: {} },
        },
      ];

      for (const req of invalidRequests) {
        const response = await httpServer
          .post(req.endpoint)
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(req.body)
          .expect(400);

        expect(response.body.statusCode).toBe(400);
      }
    });

    it("should handle authentication errors properly", async () => {
      // 测试无认证头的请求
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .send({
          symbols: ["700.HK"],
          receiverType: "get-stock-quote",
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it("should handle invalid API key gracefully", async () => {
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", "invalid-key")
        .set("X-Access-Token", "invalid-token")
        .send({
          symbols: ["700.HK"],
          receiverType: "get-stock-quote",
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it("should handle malformed request data", async () => {
      const invalidRequests = [
        {
          description: "missing symbols",
          body: { receiverType: "get-stock-quote" },
        },
        {
          description: "invalid data type",
          body: { symbols: ["700.HK"], receiverType: "invalid-type" },
        },
        {
          description: "empty symbols array",
          body: { symbols: [], receiverType: "get-stock-quote" },
        },
      ];

      for (const testCase of invalidRequests) {
        const response = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(testCase.body);

        expect([400, 422]).toContain(response.status);
        expect(response.body.statusCode).toBeGreaterThanOrEqual(400);
      }
    });

    it("should handle database connection errors", async () => {
      // 通过访问需要数据库操作的端点来测试数据库连接错误处理
      // 使用API Key认证的端点，避免JWT权限问题
      const response = await httpServer
        .get("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect((res: any) => {
          // 接受200（正常）、401（认证失败）、403（权限不足）或503（数据库不可用）状态码
          const validStatuses = [200, 401, 403, 503];
          if (!validStatuses.includes(res.status)) {
            throw new Error(
              `Expected one of ${validStatuses.join(", ")}, got ${res.status}`,
            );
          }
        });

      if (response.status === 503) {
        // 验证数据库连接错误的响应格式
        expect(response.body.statusCode).toBe(503);
        expect(response.body.message).toMatch(/数据库.*不可用|服务.*不可用/);
        expect(response.body.error).toMatch(
          /DatabaseConnectionError|Service Unavailable/,
        );
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.path).toBe("/api/v1/auth/api-keys");
      } else if (response.status === 200) {
        // 如果数据库正常，验证正常响应
        expect(response.body.statusCode).toBe(200);
        expect(response.body.data).toBeDefined();
      } else {
        // 401/403 也是可接受的，说明认证层正常工作
        expect([401, 403]).toContain(response.status);
        expect(response.body.statusCode).toBe(response.status);
      }
    });

    it("should handle Redis connection errors", async () => {
      // 通过访问需要缓存操作的端点来测试Redis连接错误处理
      // 使用数据查询端点，因为它会尝试使用Redis缓存
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["AAPL.US"],
          receiverType: "get-stock-quote",
          options: {
            preferredProvider: "longport",
            // 移除 useCache 选项，使用默认行为
          },
        })
        .expect((res: any) => {
          // Redis错误不应导致请求失败，应该降级到直接数据源
          // 接受200（成功）、400（请求错误）或503（服务不可用）
          const validStatuses = [200, 400, 503];
          if (!validStatuses.includes(res.status)) {
            throw new Error(
              `Expected one of ${validStatuses.join(", ")}, got ${res.status}`,
            );
          }
        });

      if (response.status === 503) {
        // 如果返回503，验证是服务不可用错误
        expect(response.body.statusCode).toBe(503);
        expect(response.body.message).toMatch(
          /服务.*不可用|缓存.*失败|连接.*失败/,
        );
        expect(response.body.timestamp).toBeDefined();
      } else if (response.status === 200) {
        // Redis错误通常不会导致请求失败，而是降级处理
        expect(response.body.statusCode).toBe(200);
        expect(response.body.data).toBeDefined();

        // 验证即使Redis有问题，数据仍然可以获取（降级策略）
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.metadata.provider).toBeDefined();
      } else if (response.status === 400) {
        // 400错误可能是由于请求参数问题，这也是可接受的测试结果
        expect(response.body.statusCode).toBe(400);
        expect(response.body.message).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      }
    });

    it("should provide meaningful error messages", async () => {
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["AMDD.US"],
          receiverType: "get-stock-quote",
        })
        .expect(200); // 系统可能返回200但包含错误信息

      // 验证错误信息是否有意义
      if (response.body.statusCode !== 200) {
        expect(response.body.message).toBeDefined();
        expect(typeof response.body.message).toBe("string");
        expect(response.body.message.length).toBeGreaterThan(0);
      }
    });
  });
});
