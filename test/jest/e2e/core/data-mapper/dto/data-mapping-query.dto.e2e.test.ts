//import * as request from "supertest";

describe("Query E2E Tests", () => {
  let httpServer: any;
  let authTokens: any;

  beforeAll(async () => {
    httpServer = global.createTestRequest();
    await setupAuthentication();
  });

  async function setupAuthentication() {
    const userData = {
      username: "queryuser",
      email: "query@example.com",
      password: "password123",
      role: "developer",
    };
    await httpServer.post("/api/v1/auth/register").send(userData);
    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });
    const jwtToken =
      loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    const apiKeyData = {
      name: "Query Test API Key",
      permissions: [
        "data:read",
        "query:execute",
        "providers:read",
        "transformer:preview",
        "system:monitor",
      ],
      rateLimit: { requests: 100, window: "1h" },
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

  describe("Query Execution", () => {
    it("should execute queries by symbols with API Key authentication", async () => {
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: ["700.HK", "AAPL.US"],
          queryTypeFilter: "stock-quote",
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });

    it("should require authentication for query operations", async () => {
      await httpServer
        .post("/api/v1/query/execute")
        .send({ queryType: "by_symbols", symbols: ["700.HK"] })
        .expect(401);
    });
  });

  describe("Query Execution by Different Criteria", () => {
    it.skip("should execute queries by market", async () => {
      // 🚧 功能未实现，暂时跳过
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_market",
          market: "HK",
          queryTypeFilter: "stock-quote",
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });

    it.skip("should execute queries by provider", async () => {
      // 🚧 功能未实现，暂时跳过
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_provider",
          provider: "longport",
          queryTypeFilter: "stock-quote",
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });

    it.skip("should execute queries by data type", async () => {
      // 🚧 功能未实现，暂时跳过
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_data_type",
          queryTypeFilter: "stock-quote",
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });
  });

  describe("Advanced Query Features", () => {
    it.skip("should handle advanced filtering", async () => {
      // 🚧 功能未实现，暂时跳过
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: ["700.HK", "AAPL.US"],
          queryTypeFilter: "stock-quote",
          filters: [{ field: "lastPrice", operator: "gt", value: 100 }],
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });

    it("should handle sorting", async () => {
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: ["700.HK", "AAPL.US", "BABA.US"],
          queryTypeFilter: "stock-quote",
          querySort: { field: "lastPrice", direction: "desc" },
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });

    it("should handle pagination", async () => {
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: ["700.HK", "AAPL.US", "BABA.US"],
          queryTypeFilter: "stock-quote",
          limit: 1,
          page: 2,
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data.data).toHaveProperty("items");
      expect(response.body.data.data).toHaveProperty("pagination");
      expect(response.body.data.data.pagination).toHaveProperty("page", 2);
      expect(response.body.data.data.pagination).toHaveProperty("limit", 1);
    });
  });

  describe("Query Performance and Validation", () => {
    it("should provide query statistics if endpoint exists", async () => {
      const response = await httpServer
        .get("/api/v1/query/stats") // 修正：使用 GET 方法
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send()
        .expect(200);
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toBeDefined();
      // 修正：统计数据现在嵌套在 performance 对象下
      expect(response.body.data).toHaveProperty("performance");
      expect(response.body.data.performance).toHaveProperty("totalQueries");
      expect(response.body.data.performance).toHaveProperty(
        "averageExecutionTime",
      );
    });

    it("should return error for invalid query type", async () => {
      await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({ queryType: "invalid_type" })
        .expect(400);
    });

    it("should handle time-based queries correctly", async () => {
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols",
          symbols: ["700.HK"],
          startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        })
        .expect(201);
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
    });

    it("should handle concurrent queries efficiently", async () => {
      const queries = Array(5)
        .fill(0)
        .map((_, i) => ({
          queryType: "by_symbols",
          symbols: [`test-${i}.HK`],
          queryTypeFilter: "stock-quote",
        }));

      const startTime = Date.now();
      const promises = queries.map((query) =>
        httpServer
          .post("/api/v1/query/execute")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(query)
          .expect(201),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      responses.forEach((response) => {
        global.expectSuccessResponse(response, 201);
      });

      const avgResponseTime = (endTime - startTime) / queries.length;
      expect(avgResponseTime).toBeLessThan(2000);
    });
  });
});
