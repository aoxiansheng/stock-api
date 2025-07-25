describe("Symbol Mapper E2E Tests", () => {
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
      username: "symbolmapperuser",
      email: "symbolmapper@example.com",
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
      name: "Symbol Mapper Test API Key",
      permissions: [
        "data:read",
        "query:execute",
        "providers:read",
        "transformer:preview",
        "config:read",
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

  describe("Symbol Transformation", () => {
    it("should successfully transform symbols with API Key authentication", async () => {
      // Arrange
      const transformRequest = {
        symbols: ["700", "AAPL", "000001"],
        dataSourceName: "longport",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/symbol-mapper/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(transformRequest)
        .expect(201); // POST请求成功应返回201

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("transformedSymbols");
      expect(response.body.data).toHaveProperty("failedSymbols");
      expect(response.body.data).toHaveProperty("processingTimeMs");
      expect(response.body.data).toHaveProperty("dataSourceName");
      expect(response.body.data.dataSourceName).toBe("longport");
    });

    it("should handle invalid symbols gracefully", async () => {
      // Arrange
      const transformRequest = {
        symbols: ["INVALID_SYMBOL_123456"],
        dataSourceName: "longport",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/symbol-mapper/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(transformRequest)
        .expect(201); // POST请求成功应返回201

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("transformedSymbols");
      expect(response.body.data).toHaveProperty("failedSymbols");
      expect(response.body.data).toHaveProperty("processingTimeMs");
    });

    it("should require API Key authentication", async () => {
      // Arrange
      const transformRequest = {
        symbols: ["700"],
        dataSourceName: "longport",
      };

      // Act & Assert
      await httpServer
        .post("/api/v1/symbol-mapper/transform")
        .send(transformRequest)
        .expect(401);
    });
  });

  describe("Symbol Mapping Management", () => {
    it("should retrieve mapping rules if endpoint exists", async () => {
      // Act - Try to get mapping configurations (may or may not exist)
      const response = await httpServer
        .get("/api/v1/symbol-mapper")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect([200, 404]);

      if (response.status === 200) {
        // Assert - If endpoint exists, validate structure
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty("items");
        expect(response.body.data).toHaveProperty("pagination");
      }
    });

    it("should handle bulk symbol transformations", async () => {
      // Arrange - Large batch of symbols
      const transformRequest = {
        symbols: ["700", "AAPL", "GOOGL", "000001", "000002", "MSFT", "TSLA"],
        dataSourceName: "longport",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/symbol-mapper/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(transformRequest)
        .expect(201); // POST请求成功应返回201

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("transformedSymbols");
      expect(response.body.data).toHaveProperty("failedSymbols");
      expect(response.body.data).toHaveProperty("processingTimeMs");
      expect(response.body.data).toHaveProperty("dataSourceName");
      expect(response.body.data.dataSourceName).toBe("longport");

      // 验证转换结果包含所有输入的股票代码
      const transformedSymbols = response.body.data.transformedSymbols;
      expect(Object.keys(transformedSymbols)).toHaveLength(
        transformRequest.symbols.length,
      );
      transformRequest.symbols.forEach((symbol) => {
        expect(transformedSymbols).toHaveProperty(symbol);
      });
    });
  });
});
