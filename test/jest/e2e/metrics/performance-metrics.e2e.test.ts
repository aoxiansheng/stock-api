
describe("Performance Metrics E2E Tests", () => {
  let httpServer: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();

    // 注册并登录以获取JWT
    const userData = {
      username: "metricsuser",
      email: "metrics@example.com",
      password: "password123",
      role: "admin",
    };

    await httpServer.post("/api/v1/auth/register").send(userData);
    const loginResponse = await httpServer
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password });

    jwtToken = loginResponse.body.data.accessToken;
  });

  describe("Performance Metrics Collection", () => {
    it("should retrieve comprehensive performance metrics", async () => {
      const response = await httpServer
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const perfData = response.body.data;

      expect(perfData).toHaveProperty("summary");
      expect(perfData).toHaveProperty("endpoints");
      expect(perfData).toHaveProperty("database");
      expect(perfData).toHaveProperty("redis");
      expect(perfData).toHaveProperty("system");

      expect(perfData).toHaveProperty("healthScore");
      expect(typeof perfData.healthScore).toBe("number");

      if (perfData.summary) {
        expect(perfData.summary).toHaveProperty("totalRequests");
      }
      // 修复： uptime 字段在 system 对象下
      if (perfData.system) {
        expect(perfData.system).toHaveProperty("uptime");
      }
    });

    it("should collect endpoint-specific performance metrics", async () => {
      const response = await httpServer
        .get("/api/v1/monitoring/endpoints")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const endpointsResponse = response.body.data;

      expect(typeof endpointsResponse).toBe("object");
      expect(endpointsResponse).toHaveProperty("metrics");
      expect(Array.isArray(endpointsResponse.metrics)).toBe(true);

      if (endpointsResponse.metrics.length > 0) {
        const firstEndpoint = endpointsResponse.metrics[0];
        // 修复: 字段名是 endpoint, 不是 path
        expect(firstEndpoint).toHaveProperty("endpoint");
        expect(firstEndpoint).toHaveProperty("totalRequests");
        expect(firstEndpoint).toHaveProperty("averageResponseTime");
        expect(firstEndpoint).toHaveProperty("errorRate");
      }
    });

    it("should support endpoint metrics filtering and sorting", async () => {
      const response = await httpServer
        .get("/api/v1/monitoring/endpoints?limit=5&sortBy=totalRequests")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const endpointsResponse = response.body.data;

      expect(typeof endpointsResponse).toBe("object");
      expect(endpointsResponse).toHaveProperty("metrics");
      expect(Array.isArray(endpointsResponse.metrics)).toBe(true);

      expect(endpointsResponse.metrics.length).toBeLessThanOrEqual(5);

      if (endpointsResponse.metrics.length > 1) {
        expect(
          endpointsResponse.metrics[0].totalRequests,
        ).toBeGreaterThanOrEqual(endpointsResponse.metrics[1].totalRequests);
      }
    });
  });

  describe("System Resource Metrics", () => {
    it("should collect system resource performance metrics", async () => {
      const response = await httpServer
        .get("/api/v1/monitoring/system")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const systemData = response.body.data;
      expect(systemData).toHaveProperty("cpuUsage");
      expect(systemData).toHaveProperty("memoryUsage");
    });
  });

  describe("Database Performance Metrics", () => {
    it("should collect database performance metrics", async () => {
      const response = await httpServer
        .get("/api/v1/monitoring/database")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const dbData = response.body.data;

      expect(dbData).toBeDefined();
      expect(dbData).not.toHaveProperty("status");
      expect(dbData).toHaveProperty("connectionPoolSize");
      expect(dbData).toHaveProperty("activeConnections");
      expect(dbData).toHaveProperty("totalQueries");
    });
  });

  describe("Metrics Authentication and Authorization", () => {
    it("should require authentication for performance metrics", async () => {
      await httpServer.get("/api/v1/monitoring/performance").expect(401);
    });

    it("should require admin role for metrics access", async () => {
      // Create a non-admin user
      const nonAdminUserData = {
        username: "nonadminuser",
        email: "nonadmin@example.com",
        password: "password123",
        role: "developer",
      };
      await httpServer.post("/api/v1/auth/register").send(nonAdminUserData);
      const loginResponse = await httpServer.post("/api/v1/auth/login").send({
        username: nonAdminUserData.username,
        password: nonAdminUserData.password,
      });
      const nonAdminJwt = loginResponse.body.data.accessToken;

      await httpServer
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${nonAdminJwt}`)
        .expect(403);
    });
  });

  describe("Metrics Data Validation", () => {
    it("should validate endpoint metrics query parameters", async () => {
      // Test invalid sortBy
      await httpServer
        .get("/api/v1/monitoring/endpoints?sortBy=invalidField")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(400);

      // Test invalid limit
      await httpServer
        .get("/api/v1/monitoring/endpoints?limit=999")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(400);
    });

    it("should generate metrics through API usage", async () => {
      // 1. Get initial metrics
      const initialResponse = await httpServer
        .get("/api/v1/monitoring/endpoints")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      let initialSystemCount = 0;
      if (initialResponse.status === 200 && initialResponse.body.data.metrics) {
        // 修复: 查找 system 端点的初始计数
        const systemEndpoint = initialResponse.body.data.metrics.find(
          (ep) => ep.endpoint === "/api/v1/monitoring/system",
        );
        initialSystemCount = systemEndpoint ? systemEndpoint.totalRequests : 0;
      }

      // 2. Call an existing endpoint to generate metrics
      await httpServer
        .get("/api/v1/monitoring/system") // 修复: 调用一个确认存在的端点
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // 3. 使用轮询代替固定延迟，等待指标更新
      const pollUntilUpdated = async (retries = 10, interval = 200) => {
        for (let i = 0; i < retries; i++) {
          const response = await httpServer
            .get("/api/v1/monitoring/endpoints")
            .set("Authorization", `Bearer ${jwtToken}`);

          if (response.status === 200 && response.body.data.metrics) {
            const systemEndpoint = response.body.data.metrics.find(
              (ep) => ep.endpoint === "/api/v1/monitoring/system",
            );
            const currentCount = systemEndpoint ? systemEndpoint.totalRequests : 0;
            if (currentCount > initialSystemCount) {
              return response; // 指标已更新，返回最终响应
            }
          }
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
        throw new Error("Metrics did not update within the polling period.");
      };

      const finalResponse = await pollUntilUpdated();

      // 4. Verify the metrics were updated
      if (finalResponse.status === 200 && finalResponse.body.data.metrics) {
        // 修复: 查找 system 端点的最终计数
        const systemEndpoint = finalResponse.body.data.metrics.find(
          (ep) => ep.endpoint === "/api/v1/monitoring/system",
        );
        const finalSystemCount = systemEndpoint
          ? systemEndpoint.totalRequests
          : 0;
        expect(finalSystemCount).toBeGreaterThan(initialSystemCount);
      }
    });
  });
});
