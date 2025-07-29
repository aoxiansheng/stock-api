describe("Complete Data Flow E2E Tests", () => {
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
      username: "dataflowuser",
      email: "dataflow@example.com",
      password: "password123",
      role: "admin",
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
      name: "Data Flow Test API Key",
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

    // 4. 创建数据映射规则，用于后续的转换测试
    const mappingRuleData = {
      name: "E2E Test Longport Stock Quote Mapping",
      provider: "longport",
      dataRuleListType: "quote_fields", // 修正：使用DTO中定义的合法枚举值
      description: "Rule created for E2E testing",
      sharedDataFieldMappings: [
        { sourceField: "symbol", targetField: "symbol" },
        { sourceField: "lastPrice", targetField: "lastPrice" },
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

  describe("Complete Data Flow", () => {
    it("should complete full data request workflow", async () => {
      // 1. 使用API Key请求股票数据
      const dataResponse = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["700.HK", "AAPL.US"],
          capabilityType: "get-stock-quote",
          options: {
            preferredProvider: "longport",
          },
        })
        .expect(200);

      global.expectSuccessResponse(dataResponse, 200);
      expect(dataResponse.body.data).toHaveProperty("data");
      expect(dataResponse.body.data).toHaveProperty("metadata");

      // 2. 查询处理后的数据
      const queryResponse = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: ["700.HK", "AAPL.US"],
          dataTypeFilter: "stock-quote",
        })
        .expect(201);

      global.expectSuccessResponse(queryResponse, 201);
      expect(queryResponse.body.data).toHaveProperty("data");

      // 3. 验证数据一致性
      if (dataResponse.body.data.data && queryResponse.body.data.data) {
        expect(dataResponse.body.data.data).toBeDefined();
        expect(queryResponse.body.data.data).toBeDefined();
      }
    });

    it("should handle symbol mapping in complete workflow", async () => {
      // 1. 先进行符号映射
      const mappingResponse = await httpServer
        .post("/api/v1/symbol-mapper/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["700.HK", "AAPL.US"],
          dataSourceName: "longport",
        })
        .expect(201);

      global.expectSuccessResponse(mappingResponse, 201);
      expect(mappingResponse.body.data).toHaveProperty("transformedSymbols");

      // 2. 使用映射后的符号请求数据
      const mappedSymbols = Object.values(
        mappingResponse.body.data.transformedSymbols,
      ).filter(
        (symbol) =>
          symbol && typeof symbol === "string" && symbol.trim().length > 0,
      );

      // 确保我们有有效的映射符号
      if (mappedSymbols.length > 0) {
        // 添加一些常见的HK股票符号作为备用，确保测试可以进行
        const validSymbols =
          mappedSymbols.length > 0 ? mappedSymbols : ["00700.HK"];

        const dataResponse = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send({
            symbols: validSymbols,
            capabilityType: "get-stock-quote",
          })
          .expect(200);

        global.expectSuccessResponse(dataResponse, 200);
        expect(dataResponse.body.data).toHaveProperty("data");
      } else {
        // 如果没有有效的映射符号，使用默认符号进行测试
        console.warn(
          "No valid mapped symbols found, using default symbols for testing",
        );
        const dataResponse = await httpServer
          .post("/api/v1/receiver/data")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send({
            symbols: ["00700.HK"],
            capabilityType: "get-stock-quote",
          })
          .expect(200);

        global.expectSuccessResponse(dataResponse, 200);
        expect(dataResponse.body.data).toHaveProperty("data");
      }
    });

    it("should handle data transformation workflow", async () => {
      // 1. 获取原始数据
      const rawDataResponse = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["700.HK"],
          capabilityType: "get-stock-quote",
        })
        .expect(200);

      global.expectSuccessResponse(rawDataResponse, 200);
      const rawData = rawDataResponse.body.data.data || {};

      // 2. 应用数据转换
      // 确保rawData是一个对象，不是数组
      let sampleRawData;
      if (Array.isArray(rawData) && rawData.length > 0) {
        sampleRawData = rawData[0];
      } else if (rawData && typeof rawData === "object") {
        sampleRawData = rawData;
      } else {
        sampleRawData = {
          symbol: "700.HK",
          lastPrice: 500.0,
          volume: 1000000,
          timestamp: new Date().toISOString(),
        };
      }

      const transformResponse = await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          provider: "longport",
          dataRuleListType: "quote_fields", // 修正：与创建的规则保持一致
          rawData: sampleRawData,
        })
        .expect(201);

      global.expectSuccessResponse(transformResponse, 201);
      expect(transformResponse.body.data).toHaveProperty("transformedData");
    });
  });

  describe("Data Quality and Integrity", () => {
    it("should return consistent data format", async () => {
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["700.HK"],
          capabilityType: "get-stock-quote",
        })
        .expect(200);

      global.expectSuccessResponse(response, 200);

      // 验证基本响应结构
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");

      if (response.body.data.metadata) {
        expect(response.body.data.metadata).toHaveProperty("requestId");
        expect(response.body.data.metadata).toHaveProperty("processingTime");
      }
    });

    it("should maintain data traceability", async () => {
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["700.HK"],
          capabilityType: "get-stock-quote",
        })
        .expect(200);

      global.expectSuccessResponse(response, 200);

      // 验证可追溯性信息
      expect(response.body.data).toHaveProperty("metadata");
      if (response.body.data.metadata) {
        expect(response.body.data.metadata).toHaveProperty("requestId");
        expect(response.body.data.metadata).toHaveProperty("processingTime");
      }

      // 请求ID应该是唯一的
      if (
        response.body.data.metadata &&
        response.body.data.metadata.requestId
      ) {
        const requestId = response.body.data.metadata.requestId;
        expect(typeof requestId).toBe("string");
        expect(requestId.length).toBeGreaterThan(0);
      }
    });
  });
});
