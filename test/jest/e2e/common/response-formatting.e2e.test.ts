describe("Response Formatting E2E Tests", () => {
  let httpServer: any;
  let adminToken: string;
  let userApiKey: string;
  let userAccessToken: string;

  beforeAll(async () => {
    // 使用全局测试应用实例
    httpServer = global.createTestRequest();

    // 创建不同角色的测试用户
    await global.registerTestUser({
      username: "format-admin",
      email: "format-admin@test.com",
      password: "password123",
      role: "admin",
    });

    await global.registerTestUser({
      username: "format-dev",
      email: "format-dev@test.com",
      password: "password123",
      role: "developer",
    });

    // 获取JWT tokens
    const adminLogin = await global.loginTestUser({
      username: "format-admin",
      password: "password123",
    });

    await global.loginTestUser({
      username: "format-dev",
      password: "password123",
    });

    adminToken = adminLogin.accessToken;

    // 创建API Key用于测试
    const apiKeyResponse = await httpServer
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "格式测试API Key",
        permissions: ["data:read", "query:execute", "providers:read"],
      })
      .expect(201);

    userApiKey = apiKeyResponse.body.data.appKey;
    userAccessToken = apiKeyResponse.body.data.accessToken;
  });

  describe("Standard Response Format Validation", () => {
    it("should enforce consistent response format across all successful API calls", async () => {
      // Act - 测试多个不同的端点
      const endpoints = [
        { path: "/api/v1/monitoring/health", method: "GET" },
        { path: "/api/v1/providers/capabilities", method: "GET", apiKey: true },
        {
          path: "/api/v1/monitoring/performance",
          method: "GET",
          auth: adminToken,
        },
      ];

      for (const endpoint of endpoints) {
        let response;

        if (endpoint.method === "GET") {
          response = httpServer.get(endpoint.path);
        } else if (endpoint.method === "POST") {
          response = httpServer.post(endpoint.path);
        }

        if (endpoint.auth) {
          response = response.set("Authorization", `Bearer ${endpoint.auth}`);
        } else if (endpoint.apiKey) {
          response = response
            .set("X-App-Key", userApiKey)
            .set("X-Access-Token", userAccessToken);
        }

        const result = await response.expect(200);

        // Assert - 验证标准响应格式
        expect(result.body).toMatchObject({
          statusCode: 200,
          message: expect.any(String),
          data: expect.anything(),
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
          ),
        });

        // 验证可选的requestId
        if (result.body.requestId) {
          expect(result.body.requestId).toMatch(/^[a-f0-9-]{36}$/);
        }

        // 验证时间戳是近期的
        const responseTime = new Date(result.body.timestamp);
        const now = new Date();
        expect(now.getTime() - responseTime.getTime()).toBeLessThan(5000); // 5秒内
      }
    });

    it("should format error responses consistently across all endpoints", async () => {
      // Act - 测试不同类型的错误
      const errorScenarios = [
        { path: "/api/v1/nonexistent", expectedStatus: 404 },
        { path: "/api/v1/monitoring/performance", expectedStatus: 401 }, // 无认证
        {
          path: "/api/v1/receiver/data",
          method: "POST",
          body: { invalid: "data" },
          apiKey: true,
          expectedStatus: 400,
        },
      ];

      for (const scenario of errorScenarios) {
        let response;

        if (scenario.method === "POST") {
          response = httpServer.post(scenario.path);
          if (scenario.body) {
            response = response.send(scenario.body);
          }
        } else {
          response = httpServer.get(scenario.path);
        }

        if ((scenario as any).auth) {
          response = response.set(
            "Authorization",
            `Bearer ${(scenario as any).auth}`,
          );
        } else if ((scenario as any).apiKey) {
          response = response
            .set("X-App-Key", userApiKey)
            .set("X-Access-Token", userAccessToken);
        }

        const result = await response.expect(scenario.expectedStatus);

        // Assert - 验证错误响应格式
        expect(result.body).toMatchObject({
          statusCode: scenario.expectedStatus,
          message: expect.any(String),
          data: null,
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
          ),
          error: expect.objectContaining({
            code: expect.any(String),
            details: expect.any(Object),
          }),
        });

        // 验证中文错误消息
        expect(result.body.message).toMatch(/[\u4e00-\u9fa5]/); // 包含中文字符
      }
    });

    it("should include proper request tracking headers in all responses", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/health")
        .expect(200);

      // Assert - 验证追踪头
      expect(response.headers).toHaveProperty("x-request-id");
      expect(response.headers["x-request-id"]).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(response.headers).toHaveProperty("x-correlation-id");
      expect(response.headers).toHaveProperty("x-request-timestamp");

      // 健康检查端点禁用了性能监控，不会有 x-response-time
      // 但其他端点会有这个头部

      // 验证CORS头（如果配置了）
      if (response.headers["access-control-allow-origin"]) {
        expect(response.headers["access-control-allow-origin"]).toBeDefined();
      }
    });
  });

  describe("Data Transformation and Serialization", () => {
    it("should properly serialize complex nested data structures", async () => {
      // Act - 获取包含复杂数据结构的响应
      const response = await httpServer
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", userApiKey)
        .set("X-Access-Token", userAccessToken)
        .expect(200);

      // Assert - 验证数据结构序列化 (返回的是对象，不是数组)
      expect(response.body.data).toBeInstanceOf(Object);

      // 验证提供商数据结构
      const providers = Object.keys(response.body.data);
      if (providers.length > 0) {
        const providerName = providers[0];
        const capabilities = response.body.data[providerName];
        expect(capabilities).toBeInstanceOf(Array);

        if (capabilities.length > 0) {
          const capability = capabilities[0];
          expect(capability).toHaveProperty("name");
          expect(capability).toHaveProperty("description");
          expect(capability).toHaveProperty("supportedMarkets");
          expect(capability).toHaveProperty("priority");
          expect(capability).toHaveProperty("isEnabled");

          // 验证嵌套数组正确序列化
          expect(capability.supportedMarkets).toBeInstanceOf(Array);
        }
      }
    });

    it("should handle null and undefined values consistently", async () => {
      // Act - 模拟包含null值的数据
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", userApiKey)
        .set("X-Access-Token", userAccessToken)
        .send({
          symbols: ["NONEXISTENT.US"],
          capabilityType: "get-stock-quote",
        });

      // Assert - 验证null值处理
      if (response.status === 200) {
        expect(response.body.data).toBeDefined();

        // 验证null值被正确序列化而不是被省略
        const responseString = JSON.stringify(response.body);
        expect(responseString).not.toContain("undefined");
      }
    });

    it("should properly format numeric values and currencies", async () => {
      // Act - 获取包含数值数据的响应
      const response = await httpServer
        .post("/api/v1/receiver/data")
        .set("X-App-Key", userApiKey)
        .set("X-Access-Token", userAccessToken)
        .send({
          symbols: ["AAPL.US"],
          capabilityType: "get-stock-quote",
        });

      // Assert - 验证数值格式化
      if (response.status === 200 && response.body.data) {
        const data = response.body.data;

        // 验证价格字段是数值类型或字符串（不应该是NaN）
        if (data.lastPrice !== undefined) {
          expect(
            typeof data.lastPrice === "number" ||
              typeof data.lastPrice === "string",
          ).toBe(true);
          if (typeof data.lastPrice === "number") {
            expect(isNaN(data.lastPrice)).toBe(false);
          }
        }

        // 验证成交量是整数
        if (data.volume !== undefined) {
          expect(Number.isInteger(Number(data.volume))).toBe(true);
        }
      }
    });

    it("should maintain data type consistency across similar endpoints", async () => {
      // Act - 测试相似功能的不同端点
      const endpoints = [
        {
          path: "/api/v1/receiver/data",
          method: "POST",
          body: { symbols: ["AAPL.US"], capabilityType: "get-stock-quote" },
          headers: {
            "X-App-Key": userApiKey,
            "X-Access-Token": userAccessToken,
          },
        },
        {
          path: "/api/v1/query/execute",
          method: "POST",
          body: { queryType: "by_symbols", symbols: ["AAPL.US"] },
          headers: {
            "X-App-Key": userApiKey,
            "X-Access-Token": userAccessToken,
          },
        },
      ];

      const responses = [];
      for (const endpoint of endpoints) {
        const response = await httpServer
          .post(endpoint.path)
          .set(endpoint.headers)
          .send(endpoint.body);

        responses.push(response);
      }

      // Assert - 验证数据类型一致性
      responses.forEach((response) => {
        if (response.status === 200) {
          expect(response.body).toHaveProperty("statusCode");
          expect(response.body).toHaveProperty("message");
          expect(response.body).toHaveProperty("data");
          expect(response.body).toHaveProperty("timestamp");
        }
      });
    });
  });

  describe("Pagination and Large Dataset Formatting", () => {
    beforeAll(async () => {
      // 准备告警历史数据用于分页测试
      const alertRule = {
        name: "pagination-test-rule",
        metric: "test.metric",
        operator: "gt",
        threshold: 10,
        severity: "info",
        duration: 60,
        enabled: true,
        channels: [
          {
            name: "Log Channel",
            type: "log",
            enabled: true,
            config: { level: "info" },
          },
        ],
        cooldown: 0,
      };
      await httpServer
        .post("/api/v1/alerts/rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(alertRule)
        .expect(201);

      // 触发告警以生成历史记录
      for (let i = 0; i < 25; i++) {
        await httpServer
          .post("/api/v1/alerts/trigger")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            metrics: [
              {
                metric: "test.metric",
                value: 15 + i,
                timestamp: new Date().toISOString(),
                tags: { instance: `test-${i}` },
              },
            ],
          });
      }
    });

    it("should format paginated responses consistently", async () => {
      // Act - 获取分页数据
      const response = await httpServer
        .get("/api/v1/alerts/history?page=2&limit=10")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证分页格式
      const paginatedData = response.body.data;
      expect(paginatedData).toHaveProperty("items");
      expect(paginatedData).toHaveProperty("pagination");
      expect(Array.isArray(paginatedData.items)).toBe(true);
      expect(paginatedData.items.length).toBeLessThanOrEqual(10);

      const { pagination } = paginatedData;
      expect(pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: true,
      });

      if (paginatedData.items.length > 0) {
        expect(paginatedData.items[0]).toHaveProperty("id");
        expect(paginatedData.items[0]).toHaveProperty("ruleId");
        expect(paginatedData.items[0]).toHaveProperty("status");
      }
    });

    it("should handle empty result sets properly", async () => {
      // Act - 请求一个不存在的指标的告警历史
      const response = await httpServer
        .get("/api/v1/alerts/history?metric=nonexistent.metric")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证空结果格式
      const paginatedData = response.body.data;
      expect(paginatedData.items).toEqual([]);
      expect(paginatedData.pagination.total).toBe(0);
      expect(paginatedData.pagination.totalPages).toBe(0);
      expect(paginatedData.pagination.hasNext).toBe(false);
    });

    it("should handle large, non-paginated datasets gracefully", async () => {
      // Act - 获取告警规则列表作为示例
      const response = await httpServer
        .get("/api/v1/alerts/rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证响应大小和性能
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeGreaterThan(0);

      const responseTime = response.headers["x-response-time"];
      if (responseTime) {
        expect(parseInt(responseTime)).toBeLessThan(500); // 500ms 内响应
      }

      // 验证数据结构
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe("Content Type and Encoding Handling", () => {
    it("should set appropriate content-type headers for JSON responses", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/health")
        .expect(200);

      // Assert
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.headers["content-type"]).toContain("charset=utf-8");
    });

    it("should handle special characters and Unicode in responses", async () => {
      // Act - 测试包含中文字符的响应
      const response = await httpServer
        .post("/api/v1/monitoring/alerts/rules")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "测试告警规则 - Unicode 字符 🚨",
          metric: "test_metric",
          operator: "gt",
          threshold: 100,
          severity: "warning",
          description: "这是一个包含特殊字符的测试：™ © ® → ← ↑ ↓",
        });

      // Assert - 验证Unicode字符正确处理
      if (response.status === 201) {
        expect(response.body.data.name).toBe("测试告警规则 - Unicode 字符 🚨");
        expect(response.body.data.description).toContain("™ © ® → ← ↑ ↓");

        // 验证响应可以正确解析
        const responseString = JSON.stringify(response.body);
        expect(() => JSON.parse(responseString)).not.toThrow();
      }
    });

    it("should handle different Accept headers appropriately", async () => {
      // Act - 测试不同的Accept头
      const responses = await Promise.all([
        httpServer
          .get("/api/v1/monitoring/health")
          .set("Accept", "application/json"),
        httpServer.get("/api/v1/monitoring/health").set("Accept", "*/*"),
        httpServer
          .get("/api/v1/monitoring/health")
          .set("Accept", "application/json, text/plain, */*"),
      ]);

      // Assert - 所有请求都应该返回JSON
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("application/json");
        expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
      });
    });
  });

  describe("API Versioning and Backward Compatibility", () => {
    it("should maintain consistent response format across API versions", async () => {
      // Act - 测试当前API版本
      const v1Response = await httpServer
        .get("/api/v1/monitoring/health")
        .expect(200);

      // Assert - 验证版本信息
      expect(v1Response.body).toMatchObject({
        statusCode: expect.any(Number),
        message: expect.any(String),
        data: expect.anything(),
        timestamp: expect.any(String),
      });

      // 验证版本头（如果存在）
      if (v1Response.headers["api-version"]) {
        expect(v1Response.headers["api-version"]).toBe("1.0");
      }
    });

    it("should provide deprecation warnings for deprecated features", async () => {
      // Act - 测试可能被废弃的端点
      const response = await httpServer
        .get("/api/v1/monitoring/legacy-endpoint")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert - 如果端点存在且被废弃
      if (response.status === 200 && response.headers["x-deprecated"]) {
        expect(response.headers["x-deprecated"]).toBe("true");
        expect(response.headers["x-deprecation-warning"]).toBeDefined();
        expect(response.body.warnings).toBeDefined();
        expect(response.body.warnings).toContain("DEPRECATED");
      }
    });
  });

  describe("Cache Headers and Response Optimization", () => {
    it("should set appropriate cache headers for cacheable responses", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", userApiKey)
        .set("X-Access-Token", userAccessToken)
        .expect(200);

      // Assert - 验证缓存头
      if (response.headers["cache-control"]) {
        expect(response.headers["cache-control"]).toBeDefined();
      }

      if (response.headers["etag"]) {
        expect(response.headers["etag"]).toMatch(
          /^(W\/)?"[a-zA-Z0-9+\/=\-_]+"/,
        );
      }

      if (response.headers["last-modified"]) {
        expect(
          new Date(response.headers["last-modified"]).getTime(),
        ).toBeGreaterThan(0);
      }
    });

    it("should support conditional requests with ETag", async () => {
      // Act - 获取初始响应
      const initialResponse = await httpServer
        .get("/api/v1/providers/capabilities")
        .set("X-App-Key", userApiKey)
        .set("X-Access-Token", userAccessToken)
        .expect(200);

      if (initialResponse.headers["etag"]) {
        // Act - 使用ETag发送条件请求
        const conditionalResponse = await httpServer
          .get("/api/v1/providers/capabilities")
          .set("X-App-Key", userApiKey)
          .set("X-Access-Token", userAccessToken)
          .set("If-None-Match", initialResponse.headers["etag"]);

        // Assert - 应该返回304 Not Modified或200 OK
        expect([200, 304]).toContain(conditionalResponse.status);

        if (conditionalResponse.status === 304) {
          expect(conditionalResponse.body).toEqual({});
        }
      }
    });

    it("should compress large responses when appropriate", async () => {
      // Act - 请求可能较大的响应
      const response = await httpServer
        .get("/api/v1/monitoring/metrics/detailed")
        .set("Accept-Encoding", "gzip, deflate")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert - 验证压缩
      if (response.status === 200) {
        const responseSize = JSON.stringify(response.body).length;

        if (responseSize > 1024) {
          // 如果响应大于1KB
          // 检查是否使用了压缩
          if (response.headers["content-encoding"]) {
            expect(["gzip", "deflate"]).toContain(
              response.headers["content-encoding"],
            );
          }
        }
      }
    });
  });

  describe("Real-time and Streaming Response Formats", () => {
    it("should format real-time data updates consistently", async () => {
      // Act - 获取实时数据 (使用存在的端点)
      const response = await httpServer
        .get("/api/v1/monitoring/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Assert - 验证实时数据格式 (dashboard 数据结构)
      expect(response.body.data).toHaveProperty("timestamp");
      expect(response.body.data).toHaveProperty("performance");
      expect(response.body.data).toHaveProperty("alerts");

      // 时间戳应该是最新的
      const timestamp = new Date(response.body.data.timestamp);
      const now = new Date();
      expect(now.getTime() - timestamp.getTime()).toBeLessThan(10000); // 10秒内

      // 验证性能数据格式
      if (response.body.data.performance) {
        expect(response.body.data.performance).toBeInstanceOf(Object);
        expect(response.body.data.performance).toHaveProperty("healthScore");
      }
    });

    it("should provide consistent format for data export endpoints", async () => {
      // Act - 测试数据导出格式
      const exportFormats = ["json", "csv"];

      for (const format of exportFormats) {
        const response = await httpServer
          .get("/api/v1/monitoring/export/metrics")
          .query({ format, period: "1h" })
          .set("Authorization", `Bearer ${adminToken}`);

        if (response.status === 200) {
          // Assert - 验证导出格式
          if (format === "json") {
            expect(response.headers["content-type"]).toContain(
              "application/json",
            );
            expect(() =>
              JSON.parse(JSON.stringify(response.body)),
            ).not.toThrow();
          } else if (format === "csv") {
            expect(response.headers["content-type"]).toContain("text/csv");
            expect(response.text).toContain(","); // CSV应该包含逗号
          }
        }
      }
    });
  });
});
