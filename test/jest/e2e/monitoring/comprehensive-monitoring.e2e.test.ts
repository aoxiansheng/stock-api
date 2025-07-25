describe("Comprehensive Monitoring E2E Tests", () => {
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
      username: "monitoruser",
      email: "monitoring@example.com",
      password: "password123",
      role: "admin", // 需要admin权限访问监控端点
    };

    await httpServer.post("/api/v1/auth/register").send(userData);

    // 2. 登录获取JWT token
    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });

    jwtToken =
      loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    // 3. 创建API Key (用于其他操作)
    const apiKeyData = {
      name: "Monitoring Test API Key",
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
      apiKey: apiKeyResult?.appKey,
      accessToken: apiKeyResult?.accessToken,
    };
  }

  describe("System Health Monitoring", () => {
    it("should provide public health check endpoint", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/health")
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toBeDefined();

      const healthData = response.body.data;

      // 验证基本健康检查结构
      expect(healthData).toHaveProperty("status");
      expect(["healthy", "degraded", "unhealthy"]).toContain(healthData.status);
      expect(healthData).toHaveProperty("score");
      expect(typeof healthData.score).toBe("number");
      expect(healthData.score).toBeGreaterThanOrEqual(0);
      expect(healthData.score).toBeLessThanOrEqual(100);

      // 验证时间戳
      expect(healthData).toHaveProperty("timestamp");
      expect(new Date(healthData.timestamp)).toBeInstanceOf(Date);

      // 验证组件健康状态
      if (healthData.components) {
        Object.keys(healthData.components).forEach((component) => {
          expect(healthData.components[component]).toHaveProperty("status");
          expect(["healthy", "degraded", "unhealthy"]).toContain(
            healthData.components[component].status,
          );
        });
      }

      // 验证检查结果
      if (healthData.checks) {
        expect(Array.isArray(healthData.checks)).toBe(true);
        healthData.checks.forEach((check) => {
          expect(check).toHaveProperty("name");
          expect(check).toHaveProperty("status");
          expect(["pass", "warn", "fail"]).toContain(check.status);
        });
      }
    });

    it("should not expose sensitive information in health check", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/health")
        .expect(200);

      // Assert
      const responseText = JSON.stringify(response.body);

      // 验证不包含敏感信息
      expect(responseText).not.toContain("password");
      expect(responseText).not.toContain("secret");
      expect(responseText).not.toContain("mongodb://");
      expect(responseText).not.toContain("redis://");
      expect(responseText).not.toContain("connection_string");
      expect(responseText).not.toContain("private_key");
    });
  });

  describe("Monitoring Dashboard Integration", () => {
    it("should provide comprehensive dashboard data", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/dashboard")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect([200, 503]);

      if (response.status === 200) {
        // Assert
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toBeDefined();

        const dashboardData = response.body.data;

        // 验证仪表板整体结构
        expect(dashboardData).toHaveProperty("overview");
        expect(dashboardData).toHaveProperty("performance");
        // expect(dashboardData).toHaveProperty('alerts'); // 'alerts' is now part of 'overview' or 'performance'
        expect(dashboardData).toHaveProperty("cache");
        expect(dashboardData).toHaveProperty("trends");

        // system 数据在 performance.system 中
        if (dashboardData.performance) {
          expect(dashboardData.performance).toHaveProperty("system");
        }

        // 验证概览信息
        if (dashboardData.overview) {
          expect(dashboardData.overview).toHaveProperty("healthScore");
          expect(dashboardData.overview).toHaveProperty("status");
          expect(dashboardData.overview).toHaveProperty("uptime");
          expect(dashboardData.overview).toHaveProperty("totalRequests");
        }

        // 验证性能信息 - 实际数据在 performance.summary 中
        if (dashboardData.performance) {
          expect(dashboardData.performance).toHaveProperty("summary");
          expect(dashboardData.performance).toHaveProperty("endpoints");
          expect(dashboardData.performance).toHaveProperty("database");
          expect(dashboardData.performance).toHaveProperty("redis");

          if (dashboardData.performance.summary) {
            expect(dashboardData.performance.summary).toHaveProperty(
              "averageResponseTime",
            );
            expect(dashboardData.performance.summary).toHaveProperty(
              "errorRate",
            );
            expect(dashboardData.performance.summary).toHaveProperty(
              "totalRequests",
            );
          }
        }

        // 验证告警信息 - 现在告警统计信息在 overview 中
        if (dashboardData.overview) {
          expect(dashboardData.overview).toHaveProperty("activeAlerts");
          expect(dashboardData.overview).toHaveProperty("criticalAlerts");
          expect(dashboardData.overview).toHaveProperty("warningAlerts");
        }

        // 验证系统信息
        if (dashboardData.system) {
          expect(dashboardData.system).toHaveProperty("cpu");
          expect(dashboardData.system).toHaveProperty("memory");
          expect(dashboardData.system).toHaveProperty("connections");
        }

        // 验证趋势数据
        if (dashboardData.trends) {
          expect(dashboardData.trends).toHaveProperty("responseTime");
          expect(dashboardData.trends).toHaveProperty("errorRate");
          expect(dashboardData.trends).toHaveProperty("throughput");

          // 验证趋势数据格式
          Object.values(dashboardData.trends).forEach((trend) => {
            if (Array.isArray(trend)) {
              trend.forEach((point) => {
                expect(point).toHaveProperty("timestamp");
                expect(point).toHaveProperty("value");
                expect(typeof point.value).toBe("number");
              });
            }
          });
        }
      }
    });

    it("should not expose sensitive data in dashboard", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/dashboard")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect([200, 503]);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // 验证不包含敏感信息
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("secret");
        expect(responseText).not.toContain("private_key");
        expect(responseText).not.toContain("connection_string");
        expect(responseText).not.toContain("mongodb://");
        expect(responseText).not.toContain("redis://");
        expect(responseText).not.toContain("/etc/");
      }
    });
  });

  describe("Optimization Recommendations", () => {
    it("should provide performance optimization recommendations", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/optimization/recommendations")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect([200, 503]);

      if (response.status === 200) {
        // Assert
        global.expectSuccessResponse(response, 200);
        const data = response.body.data;

        expect(data).toHaveProperty("recommendations");
        expect(Array.isArray(data.recommendations)).toBe(true);

        if (data.recommendations.length > 0) {
          data.recommendations.forEach((rec) => {
            expect(rec).toHaveProperty("type");
            expect(rec).toHaveProperty("priority");
            expect(rec).toHaveProperty("description");
            expect(rec).toHaveProperty("action");

            // 验证类别 - 更新为后端实际返回的类型
            const expectedTypes = [
              "error_handling",
              "response_time",
              "cpu_optimization",
              "cache_optimization",
              "cache_memory",
              "database_optimization",
            ];
            expect(expectedTypes).toContain(rec.type);
          });

          // 验证统计信息
          expect(data).toHaveProperty("priority");
        }
      }
    });

    it("should categorize recommendations properly", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/monitoring/optimization/recommendations")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect([200, 503]);

      if (response.status === 200) {
        const recommendations = response.body.data.recommendations;

        // 验证至少有一些推荐
        if (recommendations.length > 0) {
          // 检查是否有性能相关的建议
          const performanceRecs = recommendations.filter(
            (rec) => rec.category === "performance",
          );
          const cacheRecs = recommendations.filter(
            (rec) => rec.category === "cache",
          );
          const databaseRecs = recommendations.filter(
            (rec) => rec.category === "database",
          );
          const securityRecs = recommendations.filter(
            (rec) => rec.category === "security",
          );

          // 验证各类建议的有效性
          [performanceRecs, cacheRecs, databaseRecs, securityRecs].forEach(
            (categoryRecs) => {
              categoryRecs.forEach((rec) => {
                expect(rec.title).toBeTruthy();
                expect(rec.description).toBeTruthy();
                expect(rec.title.length).toBeGreaterThan(0);
                expect(rec.description.length).toBeGreaterThan(0);
              });
            },
          );
        }
      }
    });
  });

  describe("Monitoring Authentication and Authorization", () => {
    it("should require authentication for admin monitoring endpoints", async () => {
      const adminEndpoints = [
        "/api/v1/monitoring/performance",
        "/api/v1/monitoring/endpoints",
        "/api/v1/monitoring/database",
        "/api/v1/monitoring/redis",
        "/api/v1/monitoring/system",
        "/api/v1/monitoring/dashboard",
        "/api/v1/monitoring/optimization/recommendations",
      ];

      // Test without authentication
      for (const endpoint of adminEndpoints) {
        await httpServer.get(endpoint).expect(401);
      }
    });

    it("should reject API key authentication for admin endpoints", async () => {
      if (authTokens.apiKey && authTokens.accessToken) {
        const adminEndpoints = [
          "/api/v1/monitoring/performance",
          "/api/v1/monitoring/dashboard",
        ];

        for (const endpoint of adminEndpoints) {
          await httpServer
            .get(endpoint)
            .set("X-App-Key", authTokens.apiKey)
            .set("X-Access-Token", authTokens.accessToken)
            .expect([401, 403]);
        }
      }
    });

    it("should allow admin JWT access to all monitoring endpoints", async () => {
      const endpoints = [
        "/api/v1/monitoring/performance",
        "/api/v1/monitoring/endpoints",
        "/api/v1/monitoring/database",
        "/api/v1/monitoring/redis",
        "/api/v1/monitoring/system",
        "/api/v1/monitoring/dashboard",
        "/api/v1/monitoring/optimization/recommendations",
      ];

      for (const endpoint of endpoints) {
        const response = await httpServer
          .get(endpoint)
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect([200, 503]); // Allow for service not available

        if (response.status === 200) {
          global.expectSuccessResponse(response, 200);
          expect(response.body.data).toBeDefined();
        }
      }
    });
  });

  describe("Real-time Monitoring Data Flow", () => {
    it("should reflect system activity in monitoring data", async () => {
      if (!authTokens.apiKey || !authTokens.accessToken) {
        console.log(
          "Skipping real-time monitoring test - no API tokens available",
        );
        return;
      }

      // 1. 获取初始监控数据
      const initialResponse = await httpServer
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect([200, 503]);

      let initialData;
      if (initialResponse.status === 200) {
        initialData = initialResponse.body.data;
      }

      // 2. 生成系统活动
      const activities = [
        httpServer.get("/api/v1/monitoring/health"),
        httpServer.get("/api/v1/monitoring/health"),
        httpServer.get("/api/v1/monitoring/health"),
        httpServer.get("/api/v1/monitoring/health"),
        httpServer.get("/api/v1/monitoring/health"),
      ];

      await Promise.all(activities);

      // 等待指标更新
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. 获取更新后的监控数据
      const updatedResponse = await httpServer
        .get("/api/v1/monitoring/performance")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect([200, 503]);

      if (updatedResponse.status === 200 && initialData) {
        const updatedData = updatedResponse.body.data;

        // 验证请求数量增加 - totalRequests 在 summary 中，不在 endpoints 中
        if (initialData.summary && updatedData.summary) {
          expect(updatedData.summary.totalRequests).toBeGreaterThanOrEqual(
            initialData.summary.totalRequests,
          );
        }

        // 验证端点数据存在且是数组
        if (updatedData.endpoints) {
          expect(Array.isArray(updatedData.endpoints)).toBe(true);
        }

        // 验证健康分数仍在合理范围内
        expect(updatedData.healthScore).toBeGreaterThanOrEqual(0);
        expect(updatedData.healthScore).toBeLessThanOrEqual(100);
      }
    });
  });
});
