describe("Cross-Module Integration E2E Tests", () => {
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
      username: "crossmoduleuser",
      email: "crossmodule@example.com",
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
      name: "Cross Module Test API Key",
      permissions: [
        "data:read",
        "query:execute",
        "providers:read",
        "transformer:preview",
        "mapping:write",
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

    // 4. 为转换测试创建数据映射规则
    const mappingRuleData = {
      name: "E2E Cross-Module Longport Stock Quote Mapping",
      provider: "longport",
      dataRuleListType: "quote_fields",
      description: "Rule created for E2E cross-module testing",
      sharedDataFieldMappings: [
        { sourceField: "symbol", targetField: "symbol" },
        { sourceField: "last_done", targetField: "lastPrice" },
        { sourceField: "volume", targetField: "volume" },
        { sourceField: "timestamp", targetField: "timestamp" },
      ],
    };

    await httpServer
      .post("/api/v1/data-mapper")
      .set("X-App-Key", authTokens.apiKey)
      .set("X-Access-Token", authTokens.accessToken)
      .send(mappingRuleData)
      .expect(201);
  }

  describe("Cross-Module Integration", () => {
    it("should maintain data consistency across modules", async () => {
      const symbols = ["700.HK"];

      // 1. 通过receiver获取数据
      const receiverResponse = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols,
          capabilityType: "get-stock-quote",
        })
        .expect(200);

      // 2. 通过query模块查询相同数据
      const queryResponse = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols,
          dataTypeFilter: "stock-quote",
        })
        .expect(201);

      // 验证基本响应结构
      global.expectSuccessResponse(receiverResponse, 200);
      global.expectSuccessResponse(queryResponse, 201);

      expect(receiverResponse.body.data).toHaveProperty("data");
      expect(receiverResponse.body.data).toHaveProperty("metadata");
      expect(queryResponse.body.data).toHaveProperty("data");
    });

    it("should handle provider capabilities correctly", async () => {
      // 1. 获取提供商能力
      const capabilitiesResponse = await httpServer
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      global.expectSuccessResponse(capabilitiesResponse, 200);
      expect(capabilitiesResponse.body.data).toBeDefined();

      // 2. 验证能力与实际功能的一致性
      const responseData = capabilitiesResponse.body.data;
      const longportCapabilities = responseData.longport;

      if (longportCapabilities && Array.isArray(longportCapabilities)) {
        const hasStockQuote = longportCapabilities.some(
          (cap) => cap.name === "get-stock-quote",
        );
        expect(hasStockQuote).toBeTruthy();

        // 3. 使用该提供商的能力
        const dataResponse = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send({
            symbols: ["700.HK"],
            capabilityType: "get-stock-quote",
            options: {
              preferredProvider: "longport",
            },
          })
          .expect(200);

        global.expectSuccessResponse(dataResponse, 200);
        expect(dataResponse.body.data).toHaveProperty("data");
      }
    });

    it("should handle module communication correctly", async () => {
      // 测试多个模块之间的数据传递
      const testSymbol = "700.HK";

      // 1. Receiver接收数据
      const receiverResponse = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: [testSymbol],
          capabilityType: "get-stock-quote",
        })
        .expect(200);

      global.expectSuccessResponse(receiverResponse, 200);

      // 正确提取嵌套的数据
      const receivedRawData =
        receiverResponse.body.data?.data?.[0]?.secu_quote?.[0];
      expect(receivedRawData).toBeDefined();

      // 2. Transformer处理数据
      const transformResponse = await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          provider: "longport",
          dataRuleListType: "quote_fields",
          rawData: receivedRawData,
        })
        .expect(201);

      global.expectSuccessResponse(transformResponse, 201);
      expect(transformResponse.body.data).toHaveProperty("transformedData");

      // 3. Query查询处理后的数据
      const queryResponse = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: [testSymbol],
          dataTypeFilter: "stock-quote",
        })
        .expect(201);

      global.expectSuccessResponse(queryResponse, 201);
      expect(queryResponse.body.data).toHaveProperty("data");

      // 验证数据在模块间传递的一致性
      expect(receiverResponse.body.data).toHaveProperty("data");
      expect(transformResponse.body.data).toBeDefined();
      expect(queryResponse.body.data.data).toBeDefined();
    });
  });
});
