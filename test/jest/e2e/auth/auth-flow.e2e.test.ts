/**
 * 认证流程端到端测试
 * 测试完整的用户认证和API Key管理流程
 */

describe("Authentication E2E Flow", () => {
  let request: any;
  let jwtToken: string;
  let apiKey: any;

  beforeAll(async () => {
    request = global.createTestRequest();
  });

  describe("User Registration and Authentication", () => {
    it("应该成功注册新用户", async () => {
      // Arrange
      const userData = {
        username: "e2euser",
        email: "e2e@example.com",
        password: "password123",
        role: "developer",
      };

      // Act
      const response = await request
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      const userResult = response.body.data || response.body;
      expect(userResult).toHaveProperty("username", "e2euser");
      expect(userResult).toHaveProperty("email", "e2e@example.com");
      expect(userResult).toHaveProperty("role", "developer");
      expect(userResult).toHaveProperty("isActive", true);
      expect(userResult).not.toHaveProperty("passwordHash");
    });

    it("应该在重复用户名时返回冲突错误", async () => {
      // Arrange
      const duplicateUserData = {
        username: "e2euser", // 重复用户名
        email: "another@example.com",
        password: "password123",
      };

      // Act
      const response = await request
        .post("/api/v1/auth/register")
        .send(duplicateUserData)
        .expect(409);

      // Assert
      global.expectErrorResponse(response, 409);
      expect(response.body.message).toContain("用户名或邮箱已存在");
    });

    it("应该成功登录注册的用户", async () => {
      // Arrange
      const loginData = {
        username: "e2euser",
        password: "password123",
      };

      // Act
      const response = await request
        .post("/api/v1/auth/login")
        .send(loginData)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const loginResult = response.body.data || response.body;
      expect(loginResult).toHaveProperty("user");
      expect(loginResult).toHaveProperty("accessToken");
      expect(loginResult).toHaveProperty("refreshToken");
      expect(loginResult.user.username).toBe(loginData.username);
      expect(loginResult.user).not.toHaveProperty("passwordHash");

      jwtToken = loginResult.accessToken;
    });

    it("应该在错误密码时返回未授权错误", async () => {
      // Arrange
      const wrongLoginData = {
        username: "e2euser",
        password: "wrongpassword",
      };

      // Act
      const response = await request
        .post("/api/v1/auth/login")
        .send(wrongLoginData)
        .expect(401);

      // Assert
      global.expectErrorResponse(response, 401);
      expect(response.body.message).toContain("用户名或密码错误");
    });

    it("应该成功获取用户资料", async () => {
      // Act
      const response = await request
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const userProfile = response.body.data || response.body;
      expect(userProfile.username).toBe("e2euser");
      expect(userProfile).not.toHaveProperty("passwordHash");
    });

    it("应该在无效JWT时返回未授权错误", async () => {
      // Act
      const response = await request
        .get("/api/v1/auth/profile")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      // Assert
      global.expectErrorResponse(response, 401);
    });
  });

  describe("API Key Management", () => {
    it("应该成功创建API Key", async () => {
      // Arrange
      const apiKeyData = {
        name: "E2E Test API Key",
        permissions: ["data:read", "query:execute", "providers:read"],
        rateLimit: {
          requests: 100,
          window: "1h",
        },
      };

      // Act
      const response = await request
        .post("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(apiKeyData)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      const apiKeyResult = response.body.data;
      expect(apiKeyResult).toHaveProperty("name", "E2E Test API Key");
      expect(apiKeyResult).toHaveProperty("appKey");
      expect(apiKeyResult).toHaveProperty("accessToken");
      expect(apiKeyResult).toHaveProperty("isActive", true);
      expect(apiKeyResult.appKey).toMatch(/^sk-[0-9a-f-]{36}$/);
      expect(apiKeyResult.accessToken).toMatch(/^[a-zA-Z0-9]{32}$/);

      apiKey = apiKeyResult;
    });

    it("应该成功获取用户的API Keys列表", async () => {
      // Act
      const response = await request
        .get("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const apiKeys = response.body.data || response.body;
      expect(Array.isArray(apiKeys)).toBe(true);
      expect(apiKeys.length).toBeGreaterThan(0);
      expect(apiKeys[0]).toHaveProperty("name", "E2E Test API Key");
      expect(apiKeys[0]).toHaveProperty("appKey", apiKey.appKey);
    });

    it("应该在未认证时无法创建API Key", async () => {
      // Arrange
      const apiKeyData = {
        name: "Unauthorized Key",
        permissions: ["data:read"],
      };

      // Act
      const response = await request
        .post("/api/v1/auth/api-keys")
        .send(apiKeyData)
        .expect(401);

      // Assert
      global.expectErrorResponse(response, 401);
    });
  });

  describe("API Key Authentication", () => {
    it("应该成功使用API Key访问受保护的端点", async () => {
      // Act
      const response = await request
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const capabilities = response.body.data || response.body;
      expect(capabilities).toBeDefined();
    });

    it("应该在缺少API Key时返回未授权错误", async () => {
      // Act
      const response = await request
        .get("/api/v1/providers/capabilities")
        .expect(401);

      // Assert
      global.expectErrorResponse(response, 401);
      expect(response.body.message).toContain("缺少API凭证");
    });

    it("应该在无效API Key时返回未授权错误", async () => {
      // Act
      const response = await request
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", "invalid-key")
        .set("X-Access-Token", "invalid-token")
        .expect(401);

      // Assert
      global.expectErrorResponse(response, 401);
      expect(response.body.message).toContain("API凭证无效");
    });

    it("应该在只提供部分API凭证时返回未授权错误", async () => {
      // Act - 只提供App Key
      const response1 = await request
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", apiKey.appKey)
        .expect(401);

      global.expectErrorResponse(response1, 401);

      // Act - 只提供Access Token
      const response2 = await request
        .get("/api/v1/providers/capabilities")
        .set("X-Access-Token", apiKey.accessToken)
        .expect(401);

      global.expectErrorResponse(response2, 401);
    });
  });

  describe("Data Request with Authentication", () => {
    it("应该成功使用API Key请求股票数据", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["700.HK", "AAPL.US"],
        dataType: "get-stock-quote",
        options: {
          realtime: false,
        },
      };

      // Act
      const response = await request
        .post("/api/v1/receiver/data")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .send(dataRequest)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty("metadata");
      expect(response.body.data.metadata).toHaveProperty("provider");
      expect(response.body.data.metadata).toHaveProperty(
        "capability",
        "get-stock-quote",
      );
      expect(response.body.data.metadata).toHaveProperty("requestId");
      expect(response.body.data.metadata).toHaveProperty("processingTime");
      expect(response.body.data).toHaveProperty("data");
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it("应该成功使用JWT令牌访问开发者端点", async () => {
      // Arrange - 使用用户profile端点测试JWT认证

      // Act
      const response = await request
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const userProfile = response.body.data || response.body;
      expect(userProfile).toHaveProperty("username", "e2euser");
      expect(userProfile).toHaveProperty("email", "e2e@example.com");
      expect(userProfile).not.toHaveProperty("passwordHash");
    });
  });

  describe("API Key Lifecycle", () => {
    it("应该成功撤销API Key", async () => {
      // Act
      const response = await request
        .delete(`/api/v1/auth/api-keys/${apiKey.appKey}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
    });

    it("应该在撤销后无法使用API Key", async () => {
      // Act
      const response = await request
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .expect(401);

      // Assert
      global.expectErrorResponse(response, 401);
      expect(response.body.message).toContain("API凭证无效");
    });

    it("撤销的API Key应该从列表中消失", async () => {
      // Act
      const response = await request
        .get("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const apiKeys = response.body.data || response.body;
      const activeKeys = Array.isArray(apiKeys)
        ? apiKeys.filter((key) => key.isActive)
        : [];
      const revokedKey = activeKeys.find((key) => key.id === apiKey.id);
      expect(revokedKey).toBeUndefined();
    });
  });

  describe("Input Validation", () => {
    it("应该在无效邮箱格式时返回验证错误", async () => {
      // Arrange
      const invalidUserData = {
        username: "validuser",
        email: "invalid-email-format",
        password: "password123",
      };

      // Act
      const response = await request
        .post("/api/v1/auth/register")
        .send(invalidUserData)
        .expect(400);

      // Assert
      global.expectErrorResponse(response, 400);
    });

    it("应该在密码过短时返回验证错误", async () => {
      // Arrange
      const invalidUserData = {
        username: "validuser2",
        email: "valid@example.com",
        password: "123", // 过短
      };

      // Act
      const response = await request
        .post("/api/v1/auth/register")
        .send(invalidUserData)
        .expect(400);

      // Assert
      global.expectErrorResponse(response, 400);
    });

    it("应该在用户名包含特殊字符时返回验证错误", async () => {
      // Arrange
      const invalidUserData = {
        username: "invalid@user!", // 包含特殊字符
        email: "valid@example.com",
        password: "password123",
      };

      // Act
      const response = await request
        .post("/api/v1/auth/register")
        .send(invalidUserData)
        .expect(400);

      // Assert
      global.expectErrorResponse(response, 400);
    });
  });

  describe("Rate Limiting", () => {
    let rateLimitApiKey: any;

    beforeAll(async () => {
      // 创建一个有严格限流的API Key用于测试
      const apiKeyData = {
        name: "Rate Limit Test Key",
        permissions: ["providers:read"],
        rateLimit: {
          requests: 3,
          window: "1m",
        },
      };

      const response = await request
        .post("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(apiKeyData)
        .expect(201);

      rateLimitApiKey = response.body.data || response.body;
    });

    it("应该正确实现Rate Limiting", async () => {
      // 前3次请求应该成功
      for (let i = 0; i < 3; i++) {
        const response = await request
          .get("/api/v1/providers/capabilities")
          .set("X-App-Key", rateLimitApiKey.appKey)
          .set("X-Access-Token", rateLimitApiKey.accessToken)
          .expect(200);

        expect(response.headers["x-api-ratelimit-limit"]).toBe("3");
        expect(response.headers["x-api-ratelimit-remaining"]).toBe(
          (2 - i).toString(),
        );
      }

      // 第4次请求应该返回429错误
      const response = await request
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", rateLimitApiKey.appKey)
        .set("X-Access-Token", rateLimitApiKey.accessToken)
        .expect(429);

      global.expectErrorResponse(response, 429);
      expect(response.headers["x-api-ratelimit-limit"]).toBe("3");
      expect(response.headers["x-api-ratelimit-remaining"]).toBe("0");
      expect(response.headers["x-api-ratelimit-reset"]).toBeDefined();
    });

    afterAll(async () => {
      // 清理测试API Key
      await request
        .delete(`/api/v1/auth/api-keys/${rateLimitApiKey.appKey}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);
    });
  });
});
