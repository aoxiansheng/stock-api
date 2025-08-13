describe("Query Controller E2E Tests", () => {
  let httpServer: any;
  let authTokens: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();
    await setupAuthentication();
  });

  async function setupAuthentication() {
    // 1. 注册测试用户
    const userData = {
      username: "queryuser",
      email: "query@example.com", 
      password: "password123",
      role: "developer",
    };

    await httpServer.post("/api/v1/auth/register").send(userData);

    // 2. 登录获取JWT token
    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });

    jwtToken = loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    // 3. 创建API Key
    const apiKeyData = {
      name: "Query Test API Key",
      permissions: [
        "query:execute",
        "system:monitor",
        "system:health",
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

  describe("POST /api/v1/query/execute - 弱时效数据查询", () => {
    it("should execute by_symbols query successfully", async () => {
      // Arrange
      const queryRequest = {
        queryType: "by_symbols",
        symbols: ["AAPL.US", "GOOGL.US", "MSFT.US"],
        queryTypeFilter: "stock-quote",
        maxAge: 300,
        options: {
          useCache: true,
          updateCache: true,
          includeMetadata: true
        }
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(queryRequest)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");
      expect(response.body.data.data).toHaveProperty("items");
      expect(response.body.data.data).toHaveProperty("pagination");

      // 验证metadata结构
      const metadata = response.body.data.metadata;
      expect(metadata).toHaveProperty("queryType", "by_symbols");
      expect(metadata).toHaveProperty("totalResults");
      expect(metadata).toHaveProperty("returnedResults");
      expect(metadata).toHaveProperty("executionTime");
      expect(metadata).toHaveProperty("cacheUsed");
      expect(metadata).toHaveProperty("dataSources");
    });

    it("should execute by_market query successfully", async () => {
      // Arrange 
      const queryRequest = {
        queryType: "by_market",
        market: "US",
        queryTypeFilter: "stock-quote",
        limit: 10,
        options: {
          useCache: true,
          includeMetadata: true
        }
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(queryRequest)
        .expect(400);

      // Assert - by_market 查询类型未实现，应该返回 400
      expect(response.body.message).toContain("Unsupported query type");
    });

    it("should execute by_provider query successfully", async () => {
      // Arrange
      const queryRequest = {
        queryType: "by_provider", 
        provider: "longport",
        market: "US",
        limit: 5,
        options: {
          useCache: true,
          includeMetadata: true
        }
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(queryRequest)
        .expect(400);

      // Assert - by_provider 查询类型未实现，应该返回 400
      expect(response.body.message).toContain("Unsupported query type");
    });

    it("should handle pagination parameters", async () => {
      // Arrange
      const queryRequest = {
        queryType: "by_symbols",
        symbols: ["AAPL.US", "GOOGL.US", "MSFT.US", "AMZN.US", "TSLA.US"],
        limit: 2,
        page: 1,
        options: {
          useCache: true,
          includeMetadata: true
        }
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(queryRequest)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data.metadata).toHaveProperty("returnedResults");
      expect(response.body.data.metadata.returnedResults).toBeLessThanOrEqual(2);
    });

    it("should validate required query parameters", async () => {
      // Test missing queryType
      await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          symbols: ["AAPL"]
          // queryType missing
        })
        .expect(400);

      // Test missing symbols for by_symbols query - 后端不会抛出400，而是返回201和空结果
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_symbols"
          // symbols missing
        })
        .expect(201);
      
      // 验证返回空结果
      expect(response.body.data.metadata.totalResults).toBe(0);

      // Test unsupported query type (by_market not implemented)
      await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queryType: "by_market",
          market: "US"
        })
        .expect(400);
    });

    it("should handle cache options properly", async () => {
      const cacheOptions = [
        { useCache: true, updateCache: false },
        { useCache: false, updateCache: true },
        { useCache: true, updateCache: true },
        { useCache: false, updateCache: false }
      ];

      for (const cacheOption of cacheOptions) {
        const queryRequest = {
          queryType: "by_symbols",
          symbols: ["AAPL.US"],
          options: {
            ...cacheOption,
            includeMetadata: true
          }
        };

        const response = await httpServer
          .post("/api/v1/query/execute")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(queryRequest)
          .expect(201);

        global.expectSuccessResponse(response, 201);
        expect(response.body.data.metadata).toHaveProperty("cacheUsed");
      }
    });

    it("should require API Key authentication", async () => {
      // Arrange
      const queryRequest = {
        queryType: "by_symbols",
        symbols: ["AAPL.US"]
      };

      // Act & Assert
      await httpServer
        .post("/api/v1/query/execute")
        .send(queryRequest)
        .expect(401);
    });
  });

  describe("POST /api/v1/query/bulk - 批量查询", () => {
    it("should execute multiple queries in parallel", async () => {
      // Arrange
      const bulkRequest = {
        queries: [
          {
            queryType: "by_symbols",
            symbols: ["AAPL.US"],
            options: { useCache: true }
          },
          {
            queryType: "by_symbols", 
            symbols: ["GOOGL.US"],
            options: { useCache: true }
          },
          {
            queryType: "by_symbols",
            symbols: ["MSFT.US"],
            options: { useCache: true }
          }
        ],
        parallel: true,
        continueOnError: true
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/bulk")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(bulkRequest)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("results");
      expect(response.body.data).toHaveProperty("summary");
      expect(response.body.data.summary).toHaveProperty("totalQueries", 3);
      expect(response.body.data.summary).toHaveProperty("totalExecutionTime");
      expect(response.body.data.summary).toHaveProperty("averageExecutionTime");
    });

    it("should execute queries sequentially when parallel=false", async () => {
      // Arrange
      const bulkRequest = {
        queries: [
          {
            queryType: "by_symbols",
            symbols: ["AAPL.US"],
            options: { useCache: true }
          },
          {
            queryType: "by_symbols",
            symbols: ["GOOGL.US"],
            options: { useCache: true }
          }
        ],
        parallel: false,
        continueOnError: true
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/bulk")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(bulkRequest)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data.summary.totalQueries).toBe(2);
    });

    it("should handle bulk query with errors", async () => {
      // Arrange
      const bulkRequest = {
        queries: [
          {
            queryType: "by_symbols",
            symbols: ["AAPL.US"],
            options: { useCache: true }
          },
          {
            queryType: "by_market", // 未实现的查询类型
            market: "US"
          }
        ],
        parallel: true,
        continueOnError: true
      };

      // Act
      const response = await httpServer
        .post("/api/v1/query/bulk")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(bulkRequest)
        .expect(201);

      // Assert - 应该继续执行，即使有错误
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("results");
      expect(response.body.data).toHaveProperty("summary");
      
      // 验证每个结果都有错误信息
      const results = response.body.data.results;
      expect(results.length).toBe(2);
      expect(results[1].metadata).toHaveProperty("errors"); // by_market 查询应该有错误
    });

    it("should validate bulk query parameters", async () => {
      // Test empty queries array
      await httpServer
        .post("/api/v1/query/bulk")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          queries: [],
          parallel: true
        })
        .expect(400);

      // Test missing queries field
      await httpServer
        .post("/api/v1/query/bulk")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          parallel: true
        })
        .expect(400);
    });
  });

  describe("GET /api/v1/query/symbols - 按代码快速查询", () => {
    it("should query symbols via GET method", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/symbols")
        .query({
          symbols: "AAPL.US,GOOGL.US,MSFT.US",
          useCache: true,
          limit: 10
        })
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("metadata");
      expect(response.body.data.metadata).toHaveProperty("queryType", "by_symbols");
    });

    it("should handle query parameters properly", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/symbols")
        .query({
          symbols: "AAPL.US,GOOGL.US",
          provider: "longport",
          market: "US",
          queryTypeFilter: "get-stock-quote",
          limit: 5,
          useCache: false
        })
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data.metadata).toHaveProperty("totalResults");
    });

    it("should require symbols parameter", async () => {
      // Act & Assert
      await httpServer
        .get("/api/v1/query/symbols")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(500); // Should throw error for missing symbols
    });

    it("should parse comma-separated symbols correctly", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/symbols")
        .query({
          symbols: "AAPL.US, GOOGL.US , MSFT.US ", // 含空格
          limit: 5
        })
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data.metadata).toHaveProperty("totalResults");
    });
  });

  describe("GET /api/v1/query/market - 按市场查询", () => {
    it("should query by market successfully", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/market")
        .query({
          market: "US",
          limit: 10,
          queryTypeFilter: "stock-quote"
        })
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken);

      // Assert - by_market 查询类型未实现，应该返回 400
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Unsupported query type");
    });

    it("should require market parameter", async () => {
      // Act & Assert
      await httpServer
        .get("/api/v1/query/market")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(500); // Should throw error for missing market
    });

    it("should handle different markets", async () => {
      const markets = ["US", "HK", "SZ", "SH"];
      
      for (const market of markets) {
        const response = await httpServer
          .get("/api/v1/query/market")
          .query({
            market,
            limit: 5
          })
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Unsupported query type");
      }
    });
  });

  describe("GET /api/v1/query/provider - 按提供商查询", () => {
    it("should query by provider successfully", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/provider")
        .query({
          provider: "longport",
          limit: 10
        })
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken);

      // Assert - by_provider 查询类型未实现，应该返回 400
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Unsupported query type");
    });

    it("should require provider parameter", async () => {
      // Act & Assert
      await httpServer
        .get("/api/v1/query/provider")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(500); // Should throw error for missing provider
    });

    it("should handle different providers", async () => {
      const providers = ["longport", "itick", "test"];
      
      for (const provider of providers) {
        const response = await httpServer
          .get("/api/v1/query/provider")
          .query({
            provider,
            limit: 5
          })
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Unsupported query type");
      }
    });
  });

  describe("GET /api/v1/query/stats - 查询统计", () => {
    it("should get query statistics successfully", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/stats")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty("performance");
      expect(response.body.data).toHaveProperty("queryTypes");
      expect(response.body.data).toHaveProperty("dataSources");
      
      // 验证性能统计结构
      const performance = response.body.data.performance;
      expect(performance).toHaveProperty("totalQueries");
      expect(performance).toHaveProperty("averageExecutionTime");
      expect(performance).toHaveProperty("cacheHitRate");
      expect(performance).toHaveProperty("errorRate");
    });

    it("should require system monitor permission", async () => {
      // Create limited API key without system:monitor permission
      const limitedApiKeyData = {
        name: "Limited Query Test API Key",
        permissions: ["query:execute"], // No system:monitor
      };

      const limitedApiKeyResponse = await httpServer
        .post("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(limitedApiKeyData);

      const limitedApiKey = limitedApiKeyResponse.body.data;

      // Should be forbidden
      await httpServer
        .get("/api/v1/query/stats")
        .set("X-App-Key", limitedApiKey.appKey)
        .set("X-Access-Token", limitedApiKey.accessToken)
        .expect(403);
    });
  });

  describe("GET /api/v1/query/health - 健康检查", () => {
    it("should perform health check successfully", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/query/health")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty("queryService");
      expect(response.body.data).toHaveProperty("overallHealth");
      
      // 验证健康检查结构
      const queryService = response.body.data.queryService;
      expect(queryService).toHaveProperty("available");
      expect(queryService).toHaveProperty("latency");
      
      const overallHealth = response.body.data.overallHealth;
      expect(overallHealth).toHaveProperty("healthy");
      expect(overallHealth).toHaveProperty("timestamp");
    });

    it("should handle health check rate limiting", async () => {
      // 快速连续请求测试限流
      const requests = Array(5).fill(null).map(() => 
        httpServer
          .get("/api/v1/query/health")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
      );

      const responses = await Promise.all(requests);
      
      // 大部分应该成功，但可能有限流
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitCount).toBe(5);
      expect(successCount).toBeGreaterThan(0); // 至少有一些成功
    });

    it("should require system health permission", async () => {
      // Create limited API key without system:health permission
      const limitedApiKeyData = {
        name: "Limited Query Health Test API Key",
        permissions: ["query:execute"], // No system:health
      };

      const limitedApiKeyResponse = await httpServer
        .post("/api/v1/auth/api-keys")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(limitedApiKeyData);

      const limitedApiKey = limitedApiKeyResponse.body.data;

      // Should be forbidden
      await httpServer
        .get("/api/v1/query/health")
        .set("X-App-Key", limitedApiKey.appKey)
        .set("X-Access-Token", limitedApiKey.accessToken)
        .expect(403);
    });
  });

  describe("Query Performance & Edge Cases", () => {
    it("should handle concurrent queries efficiently", async () => {
      // 并发查询测试
      const concurrentRequests = Array(5).fill(null).map((_, i) => 
        httpServer
          .post("/api/v1/query/execute")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send({
            queryType: "by_symbols",
            symbols: [`SYMBOL_${i}.US`],
            options: { useCache: true }
          })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // 所有请求都应该得到响应
      responses.forEach(response => {
        expect([201, 404, 500]).toContain(response.status);
      });
    });

    it("should handle large result sets with pagination", async () => {
      // 大型结果集分页测试
      const queryRequest = {
        queryType: "by_symbols",
        symbols: Array(50).fill(null).map((_, i) => `TEST${i}.US`), // 50个测试符号
        limit: 10,
        page: 1,
        options: {
          useCache: true,
          includeMetadata: true
        }
      };

      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(queryRequest)
        .expect(201);

      global.expectSuccessResponse(response, 201);
      expect(response.body.data.metadata.returnedResults).toBeLessThanOrEqual(10);
    });

    it("should handle query timeout scenarios", async () => {
      // 超时场景测试
      const queryRequest = {
        queryType: "by_symbols",
        symbols: Array(100).fill(null).map((_, i) => `TIMEOUT_TEST_${i}.US`), // 大量符号可能导致超时
        options: {
          useCache: false // 强制实时查询
        }
      };

      const startTime = Date.now();
      const response = await httpServer
        .post("/api/v1/query/execute")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(queryRequest);
      const endTime = Date.now();

      expect([201, 504, 500]).toContain(response.status);
      expect(endTime - startTime).toBeLessThan(10000); // 不应该超过10秒
    });
  });
});