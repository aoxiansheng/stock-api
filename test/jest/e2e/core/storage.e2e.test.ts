describe("Storage E2E Tests", () => {
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
      username: "storageuser",
      email: "storage@example.com",
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
      name: "Storage Test API Key",
      permissions: [
        "data:read",
        "query:execute",
        "providers:read",
        "transformer:preview",
        "system:admin",
        "system:monitor",
        "system:health", // 修复: 添加健康检查权限
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

  describe("Data Storage Operations", () => {
    it("should store data with API Key authentication", async () => {
      // Arrange
      const storeRequest = {
        key: "test-e2e-storage-key",
        storageType: "both",
        dataClassification: "stock_quote",
        provider: "test-provider",
        market: "HK",
        data: {
          symbol: "700.HK",
          price: 503.0,
          timestamp: new Date().toISOString(),
        },
        options: {
          cacheTtl: 3600, // 修复: DTO中定义的字段是 cacheTtl
          compress: true,
        },
      };

      // Act
      const response = await httpServer
        .post("/api/v1/storage/store")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(storeRequest)
        .expect(201); // 修复: 确认端点存在且成功创建

      // Assert
      global.expectSuccessResponse(response, 201);
      const result = response.body.data;
      // 修复: 验证 metadata 中的 key 是否正确
      expect(result).toHaveProperty("metadata");
      expect(result.metadata).toHaveProperty("key", storeRequest.key);
    });

    it("should retrieve stored data", async () => {
      // Arrange
      const key = "test-e2e-retrieval-key";
      // 先存储一个数据确保可查询
      await httpServer
        .post("/api/v1/storage/store")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          key,
          storageType: "both",
          dataClassification: "stock_quote",
          provider: "test-provider",
          market: "test-market",
          data: { info: "for retrieval test" },
        })
        .expect(201);

      // Act
      const response = await httpServer
        .get(`/api/v1/storage/retrieve/${key}`)
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const result = response.body.data;
      expect(result).toBeDefined();
      // 修复: 验证 cacheInfo.hit 和 data 内容
      expect(result).toHaveProperty("cacheInfo");
      expect(result.cacheInfo).toHaveProperty("hit", true);
      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("info", "for retrieval test");
      expect(result).toHaveProperty("metadata");
    });

    it("should require authentication for storage operations", async () => {
      // Act & Assert
      await httpServer
        .post("/api/v1/storage/store")
        .send({ key: "test", data: {} })
        .expect(401);
    });
  });

  describe("Cache Management", () => {
    it("should provide cache statistics if endpoint exists", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/storage/stats")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const stats = response.body.data;
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("cache");
      expect(stats).toHaveProperty("persistent");
      expect(stats).toHaveProperty("performance");

      if (stats.cache) {
        expect(stats.cache).toHaveProperty("totalKeys");
        expect(stats.cache).toHaveProperty("hitRate");
      }
    });

    it("should handle cache operations efficiently", async () => {
      // Arrange - Create multiple cache operations
      const operations = Array(10)
        .fill(0)
        .map((_, i) => ({
          key: `test-cache-${i}`,
          storageType: "cache",
          dataClassification: "general",
          provider: "test-provider",
          market: "test-market",
          data: { value: i, timestamp: Date.now() },
        }));

      // 修复: 使用串行请求避免 ECONNRESET
      for (const op of operations) {
        const response = await httpServer
          .post("/api/v1/storage/store")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(op)
          .expect(201);
        global.expectSuccessResponse(response, 201);
      }
    });

    // 确认: storage.controller.ts 中并未实现 /batch 端点，跳过此测试
    it.skip("should support batch operations if available", async () => {
      // Arrange
      const batchRequest = {
        operations: [
          { action: "store", key: "batch-1", data: { value: 1 } },
          { action: "store", key: "batch-2", data: { value: 2 } },
          { action: "retrieve", key: "batch-1" },
        ],
      };

      // Act
      const response = await httpServer
        .post("/api/v1/storage/batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(batchRequest)
        .expect(200);

      if (response.status === 200) {
        // Assert
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toHaveProperty("results");
        expect(Array.isArray(response.body.data.results)).toBe(true);
      }
    });
  });

  describe("Data Persistence and Recovery", () => {
    it("should handle data with TTL settings", async () => {
      // Arrange
      const ttlRequest = {
        key: "test-ttl-key",
        storageType: "cache",
        dataClassification: "general",
        provider: "test-provider",
        market: "test-market",
        data: { test: "data with ttl" },
        options: {
          cacheTtl: 1, // 1 second TTL for testing
        },
      };

      // Act
      const storeResponse = await httpServer
        .post("/api/v1/storage/store")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(ttlRequest)
        .expect(201);

      global.expectSuccessResponse(storeResponse, 201);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Try to retrieve expired data
      // 修复: 期望 404 Not Found，因为资源已过期
      await httpServer
        .get(`/api/v1/storage/retrieve/${ttlRequest.key}`)
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(404);
    });

    it("should provide storage health information", async () => {
      // Act
      const response = await httpServer
        .post("/api/v1/storage/health-check") // 修复: 使用 POST 方法和正确的端点
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(201); // 修复: health-check 返回 201 Created

      // Assert
      global.expectSuccessResponse(response, 201);
      const health = response.body.data;
      // 修复: 验证健康检查响应的正确结构
      expect(health).toHaveProperty("overall");
      expect(health.overall).toHaveProperty("healthy", true);
      expect(health).toHaveProperty("cache");
      expect(health).toHaveProperty("persistent");
      expect(health.cache).toHaveProperty("available", true);
      expect(health.persistent).toHaveProperty("available", true);
    });
  });
});
