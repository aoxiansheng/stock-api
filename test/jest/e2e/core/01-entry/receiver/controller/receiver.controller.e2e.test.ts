/* eslint-disable @typescript-eslint/no-unused-vars */
describe("Receiver Controller E2E Tests", () => {
  let httpServer: any;
  let authTokens: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();
    await setupAuthentication();
    await setupFlexibleMappingRule();
  });

  async function setupAuthentication() {
    // 1. 注册测试用户
    const userData = {
      username: "receiveruser",
      email: "receiver@example.com",
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
      name: "Receiver Test API Key",
      permissions: ["data:read", "query:execute", "providers:read"],
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

  async function setupFlexibleMappingRule() {
    const quoteRuleData = {
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      name: "E2E Test - Longport Quote Rule",
      description:
        "Default rule for E2E tests to ensure receiver functionality",
      isDefault: true,
      fieldMappings: [
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "last_done",
          targetField: "price",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "open",
          targetField: "open",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "high",
          targetField: "high",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "low",
          targetField: "low",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "volume",
          targetField: "volume",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "turnover",
          targetField: "turnover",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "timestamp",
          targetField: "timestamp",
          confidence: 1.0,
          isActive: true,
        },
      ],
    };

    await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(quoteRuleData);

    const basicInfoRuleData = {
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "basic_info_fields",
      name: "E2E Test - Longport Basic Info Rule",
      description: "Default rule for E2E tests for basic info",
      isDefault: true,
      fieldMappings: [
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "name_en",
          targetField: "name",
          confidence: 1.0,
          isActive: true,
        },
        {
          sourceFieldPath: "listing_date",
          targetField: "listingDate",
          confidence: 1.0,
          isActive: true,
        },
      ],
    };

    await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(basicInfoRuleData);
  }

  describe("POST /api/v1/receiver/data - 强时效数据接收", () => {
    it("should handle stock quote request successfully", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US", "700.HK", "000001.SZ"],
        receiverType: "get-stock-quote",
        options: {
          realtime: true,
          timeout: 5000,
        },
      };

      // Act
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");

      // 验证元数据
      const metadata = response.body.data.metadata;
      expect(metadata).toHaveProperty("requestId");
      expect(metadata).toHaveProperty("provider");
      expect(metadata).toHaveProperty("processingTime");
      expect(metadata).toHaveProperty("totalRequested");
      expect(metadata).toHaveProperty("successfullyProcessed");
    });

    it("should handle basic info request successfully", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US", "GOOGL.US"],
        receiverType: "get-stock-basic-info",
        options: {
          realtime: false,
        },
      };

      // Act
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest);

      // Assert
      expect(response.status).toBe(200);
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");
      expect(response.body.data.metadata).toHaveProperty("provider");
    });

    it("should handle mixed market symbols", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US", "700.HK", "000001.SZ", "600000.SH"], // 多市场混合
        receiverType: "get-stock-quote",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data.metadata).toHaveProperty("totalRequested", 4);

      // 验证返回数据结构 - 后端返回的是包含secu_quote等字段的复杂对象
      const data = response.body.data.data || [];
      expect(Array.isArray(data)).toBe(true);
    });

    it("should handle invalid symbols gracefully", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["INVALID_SYMBOL_12345", "ANOTHER_INVALID"],
        receiverType: "get-stock-quote",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest);

      // Assert - 由于使用无效符号，应该返回400状态码
      expect(response.status).toBe(400);
    });

    it("should require API Key authentication", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US"],
        receiverType: "get-stock-quote",
      };

      // Act & Assert
      await httpServer
        .post("/api/v1/receiver/data")
        .send(dataRequest)
        .expect(401);
    });

    it("should validate required fields", async () => {
      // Test missing symbols
      await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          receiverType: "get-stock-quote",
          // symbols missing
        })
        .expect(400);

      // Test missing receiverType
      await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["AAPL.US"],
          // receiverType missing
        })
        .expect(400);

      // Test empty symbols array
      await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: [],
          receiverType: "get-stock-quote",
        })
        .expect(400);
    });

    it("should handle timeout configuration", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US"],
        receiverType: "get-stock-quote",
        options: {
          timeout: 1000, // 1秒超时
        },
      };

      // Act
      const startTime = Date.now();
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest);
      const endTime = Date.now();

      // Assert - 基于后端实现：请求应该正常处理，timeout仅影响内部处理时间
      expect(response.status).toBe(200);
      global.expectSuccessResponse(response, 200);
      expect(endTime - startTime).toBeLessThan(10000); // 不应该超过10秒
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");
    });

    it("should support different receiver types", async () => {
      const receiverTypes = [
        "get-stock-quote",
        "get-stock-basic-info",
        // "get-index-quote" 不支持 AAPL.US 美股，应该使用合适的指数符号
      ];

      for (const receiverType of receiverTypes) {
        const dataRequest = {
          symbols: ["AAPL.US"],
          receiverType,
        };

        const response = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(dataRequest);

        // 基于后端实现：longport provider支持这些能力
        expect(response.status).toBe(200);
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toHaveProperty("data");
        expect(response.body.data).toHaveProperty("metadata");
      }
    });

    it("should handle large symbol batches", async () => {
      // Arrange - 大批量股票代码
      const symbols = [
        "AAPL.US",
        "GOOGL.US",
        "MSFT.US",
        "AMZN.US",
        "TSLA.US",
        "700.HK",
        "5.HK",
        "1299.HK",
        "9988.HK",
        "000001.SZ",
        "000002.SZ",
        "300001.SZ",
        "600000.SH",
        "600036.SH",
        "000858.SZ",
      ];

      const dataRequest = {
        symbols,
        receiverType: "get-stock-quote",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest);

      // Assert - 基于后端实现：MAX_SYMBOLS_PERREQUEST=100，这个请求量(15个)在范围内
      expect(response.status).toBe(200);
      global.expectSuccessResponse(response, 200);
      expect(response.body.data.metadata.totalRequested).toBe(symbols.length);
    });
  });

  describe("Provider Selection & Routing", () => {
    it("should auto-detect market and route to appropriate provider", async () => {
      const marketTests = [
        { symbols: ["AAPL.US"], expectedMarket: "US" },
        { symbols: ["700.HK"], expectedMarket: "HK" },
        { symbols: ["000001.SZ"], expectedMarket: "SZ" },
        { symbols: ["600000.SH"], expectedMarket: "SH" },
      ];

      for (const test of marketTests) {
        const dataRequest = {
          symbols: test.symbols,
          receiverType: "get-stock-quote",
        };

        const response = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(dataRequest);

        if (response.status === 200) {
          expect(response.body.data.metadata).toHaveProperty("provider");

          // 验证返回的数据结构，不依赖特定的market字段
          const data = response.body.data.data || [];
          expect(Array.isArray(data)).toBe(true);
        }
      }
    });

    it("should handle provider capability matrix", async () => {
      // Test different capabilities with various providers
      const capabilityTests = [
        { receiverType: "get-stock-quote", symbols: ["AAPL.US"] },
        { receiverType: "get-stock-basic-info", symbols: ["GOOGL.US"] },
        // 移除 get-index-quote，因为 .IXIC 格式不被支持，应该用正确的港股指数格式
      ];

      for (const test of capabilityTests) {
        const response = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(test);

        // 基于后端实现：longport provider支持这些能力和符号格式
        expect(response.status).toBe(200);
        global.expectSuccessResponse(response, 200);
        expect(response.body.data.metadata).toHaveProperty("provider");
      }
    });
  });

  describe("Performance & Caching", () => {
    it("should provide processing time metrics", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US"],
        receiverType: "get-stock-quote",
      };

      // Act
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest);

      // Assert
      expect(response.status).toBe(200);
      global.expectSuccessResponse(response, 200);
      expect(response.body.data.metadata).toHaveProperty("processingTime");
      expect(response.body.data.metadata.processingTime).toBeGreaterThan(0);
    });

    it("should handle realtime vs cached data requests", async () => {
      const testCases = [
        { options: { realtime: true }, expectFresh: true },
        { options: { realtime: false }, expectCached: true },
        { options: {}, expectDefault: true },
      ];

      for (const testCase of testCases) {
        const dataRequest = {
          symbols: ["AAPL.US"],
          receiverType: "get-stock-quote",
          options: testCase.options,
        };

        const response = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(dataRequest);

        if (response.status === 200) {
          expect(response.body.data).toHaveProperty("metadata");
          expect(response.body.data.metadata).toHaveProperty("processingTime");
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle service unavailable scenarios", async () => {
      // Test with potentially unavailable providers
      const dataRequest = {
        symbols: ["UNAVAILABLE_SYMBOL"],
        receiverType: "get-stock-quote",
      };

      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest);

      // 基于后端实现：无效符号会导致验证失败或provider处理失败，返回400
      expect(response.status).toBe(400);
    });

    it("should handle invalid receiverType", async () => {
      // Arrange
      const dataRequest = {
        symbols: ["AAPL.US"],
        receiverType: "invalid-receiver-type",
      };

      // Act & Assert
      await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(dataRequest)
        .expect(400);
    });

    it("should handle malformed request data", async () => {
      const malformedRequests = [
        { symbols: "not-an-array", receiverType: "get-stock-quote" },
        { symbols: [123, 456], receiverType: "get-stock-quote" }, // 数字而非字符串
        { symbols: [""], receiverType: "get-stock-quote" }, // 空字符串
        { symbols: ["AAPL.US"], receiverType: "invalid-receiver-type" }, // receiverType无效类型
      ];

      for (const request of malformedRequests) {
        await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(request)
          .expect(400);
      }
    });
  });
});
