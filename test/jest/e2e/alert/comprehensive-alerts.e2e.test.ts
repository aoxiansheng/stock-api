

describe("Comprehensive Alerting E2E Tests", () => {
  let httpServer: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();

    // 创建测试用户并获取认证tokens
    await setupAuthentication();
  });

  async function setupAuthentication() {
    // 1. 注册测试用户
    const userData = {
      username: "alert-test-user",
      email: "alert-test@example.com",
      password: "password123",
      role: "admin", // 需要admin权限访问监控端点
    };

    await httpServer
      .post("/api/v1/auth/register")
      .send(userData);


    // 2. 登录获取JWT token
    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });

    jwtToken =
      loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    // 3. 创建API Key (用于其他操作)
    const apiKeyData = {
      name: "Alerting Test API Key",
      permissions: ["data:read", "query:execute", "providers:read"],
      rateLimit: {
        requests: 100,
        window: "1h",
      },
    };

    await httpServer
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(apiKeyData);

  }

  describe("Alert System Monitoring", () => {
    it("should retrieve current system alerts", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/alerts/history")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const alertsResponse = response.body.data;
      expect(alertsResponse).toHaveProperty("items");
      expect(alertsResponse).toHaveProperty("pagination");
      expect(Array.isArray(alertsResponse.items)).toBe(true);

      // 验证告警结构
      alertsResponse.items.forEach((alert) => {
        expect(alert).toHaveProperty("id");
        expect(alert).toHaveProperty("severity");
        expect(["critical", "warning", "info"]).toContain(alert.severity);
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("startTime");
        expect(new Date(alert.startTime)).toBeInstanceOf(Date);
      });
    });

    it("should filter alerts by severity", async () => {
      // Test critical alerts
      const criticalResponse = await httpServer
        .get("/api/v1/alerts/history?severity=critical")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(criticalResponse, 200);
      const criticalAlerts = criticalResponse.body.data.items;
      expect(Array.isArray(criticalAlerts)).toBe(true);
      criticalAlerts.forEach((alert) =>
        expect(alert.severity).toBe("critical"),
      );

      // Test warning alerts
      const warningResponse = await httpServer
        .get("/api/v1/alerts/history?severity=warning")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(warningResponse, 200);
      const warningAlerts = warningResponse.body.data.items;
      expect(Array.isArray(warningAlerts)).toBe(true);
      warningAlerts.forEach((alert) => expect(alert.severity).toBe("warning"));
    });

    it("should retrieve active alerts", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/alerts/active")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const activeAlerts = response.body.data;
      expect(Array.isArray(activeAlerts)).toBe(true);

      // 验证活跃告警结构
      activeAlerts.forEach((alert) => {
        expect(alert).toHaveProperty("id");
        expect(alert).toHaveProperty("severity");
        expect(alert).toHaveProperty("status");
        expect(["firing", "acknowledged"]).toContain(alert.status);
        expect(alert).toHaveProperty("startTime");
      });
    });

    it("should retrieve alert rules configuration", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/alerts/rules")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      expect(response.body.data).toBeDefined();

      const rulesData = response.body.data;
      expect(Array.isArray(rulesData)).toBe(true);

      rulesData.forEach((rule) => {
        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("name");
        expect(rule).toHaveProperty("metric");
        expect(rule).toHaveProperty("severity");
        expect(rule).toHaveProperty("enabled");
        expect(typeof rule.enabled).toBe("boolean");
      });
    });

    it("should retrieve alert history", async () => {
      // Act
      const response = await httpServer
        .get("/api/v1/alerts/history?limit=10")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert
      global.expectSuccessResponse(response, 200);
      const historyResponse = response.body.data;
      expect(historyResponse).toHaveProperty("items");
      expect(historyResponse).toHaveProperty("pagination");
      expect(historyResponse.pagination.total).toBeGreaterThanOrEqual(0);

      const historyData = historyResponse.items;
      expect(Array.isArray(historyData)).toBe(true);
      expect(historyData.length).toBeLessThanOrEqual(10);

      // 验证历史记录中的告警结构
      historyData.forEach((record) => {
        expect(record).toHaveProperty("id");
        expect(record).toHaveProperty("ruleName");
        expect(record).toHaveProperty("severity");
        expect(record).toHaveProperty("status");
        expect(record).toHaveProperty("startTime");
      });
    });
  });

  describe("Alert Dashboard Interface", () => {
    it("should provide complete alert management interface data", async () => {
      // Act
      const activeAlertsResponse = await httpServer
        .get("/api/v1/alerts/active")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert - 验证告警列表格式
      global.expectSuccessResponse(activeAlertsResponse, 200);
      expect(Array.isArray(activeAlertsResponse.body.data)).toBe(true);

      const statsResponse = await httpServer
        .get("/api/v1/alerts/stats")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(statsResponse, 200);
      expect(statsResponse.body.data).toHaveProperty("activeAlerts");
      expect(statsResponse.body.data).toHaveProperty("totalRules");
    });

    it("should provide paginated results for alert history", async () => {
      // Act
      const paginatedResponse = await httpServer
        .get("/api/v1/alerts/history?limit=5&page=1")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Assert - 验证分页格式
      global.expectSuccessResponse(paginatedResponse, 200);
      const paginatedData = paginatedResponse.body.data;
      expect(paginatedData).toHaveProperty("items");
      expect(paginatedData).toHaveProperty("pagination");
      expect(paginatedData.pagination.limit).toBe(5);
      expect(paginatedData.pagination.page).toBe(1);
    });
  });

  describe("Alert Rule Management (CRUD)", () => {
    let ruleId: string;

    it("should create a new alert rule successfully", async () => {
      const ruleData = {
        name: "Test High CPU Usage",
        description: "This is a test rule for CPU usage.",
        metric: "cpu.usage",
        operator: "gt",
        threshold: 95,
        duration: 300,
        severity: "critical",
        enabled: true,
        channels: [
          {
            name: "Log Channel",
            type: "log",
            enabled: true,
            config: { level: "error" },
          },
        ],
        cooldown: 600,
      };

      const response = await httpServer
        .post("/api/v1/alerts/rules")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(ruleData)
        .expect(201);

      global.expectSuccessResponse(response, 201);
      const createdRule = response.body.data;
      expect(createdRule).toHaveProperty("id");
      expect(createdRule.name).toBe(ruleData.name);
      ruleId = createdRule.id;
    });

    it("should retrieve the created alert rule", async () => {
      expect(ruleId).toBeDefined();
      const response = await httpServer
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const rule = response.body.data;
      expect(rule.id).toBe(ruleId);
      expect(rule.name).toBe("Test High CPU Usage");
    });

    it("should update the alert rule", async () => {
      expect(ruleId).toBeDefined();
      const updateData = {
        description: "Updated description for the test rule.",
        threshold: 98,
      };

      const response = await httpServer
        .put(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const updatedRule = response.body.data;
      expect(updatedRule.description).toBe(updateData.description);
      expect(updatedRule.threshold).toBe(updateData.threshold);
    });

    it("should toggle the alert rule status", async () => {
      expect(ruleId).toBeDefined();

      // Disable the rule
      await httpServer
        .post(`/api/v1/alerts/rules/${ruleId}/toggle`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({ enabled: false })
        .expect(201);

      let response = await httpServer
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`);
      expect(response.body.data.enabled).toBe(false);

      // Re-enable the rule
      await httpServer
        .post(`/api/v1/alerts/rules/${ruleId}/toggle`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send({ enabled: true })
        .expect(201);

      response = await httpServer
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`);
      expect(response.body.data.enabled).toBe(true);
    });

    it("should delete the alert rule", async () => {
      expect(ruleId).toBeDefined();
      await httpServer
        .delete(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Verify it's deleted
      await httpServer
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(404);
    });
  });

  describe("Alert Statistics", () => {
    it("should retrieve alert statistics", async () => {
      const response = await httpServer
        .get("/api/v1/alerts/stats")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
      const stats = response.body.data;
      expect(stats).toHaveProperty("totalRules");
      expect(stats).toHaveProperty("enabledRules");
      expect(stats).toHaveProperty("activeAlerts");
      expect(stats).toHaveProperty("criticalAlerts");
      expect(stats).toHaveProperty("warningAlerts");
      expect(stats).toHaveProperty("infoAlerts");
      expect(stats).toHaveProperty("totalAlertsToday");
    });
  });

  describe("Alert Lifecycle and Permissions", () => {
    let ruleId: string;
    let alertId: string;

    beforeAll(async () => {
      // Create a rule to be used in this test suite
      const ruleData = {
        name: "Lifecycle Test Rule",
        metric: "test.metric.value",
        operator: "gt",
        threshold: 100,
        duration: 60,
        severity: "warning",
        enabled: true,
        channels: [
          {
            name: "Lifecycle Log Channel",
            type: "log",
            enabled: true,
            config: { level: "warn" },
          },
        ],
        cooldown: 0,
      };
      const response = await httpServer
        .post("/api/v1/alerts/rules")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(ruleData);
      ruleId = response.body.data.id;
    });

    afterAll(async () => {
      // Clean up the created rule
      if (ruleId) {
        await httpServer
          .delete(`/api/v1/alerts/rules/${ruleId}`)
          .set("Authorization", `Bearer ${jwtToken}`);
      }
    });

    it("should trigger a new alert", async () => {
      // 确保规则存在，如果不存在则创建
      if (!ruleId) {
        console.log("=== CREATING RULE FOR TEST ===");
        const ruleData = {
          name: "Lifecycle Test Rule",
          metric: "test.metric.value",
          operator: "gt",
          threshold: 100,
          duration: 60,
          severity: "warning",
          enabled: true,
          channels: [
            {
              name: "Lifecycle Log Channel",
              type: "log",
              enabled: true,
              config: { level: "warn" },
            },
          ],
          cooldown: 0,
        };
        const response = await httpServer
          .post("/api/v1/alerts/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(ruleData)
          .expect(201);
        ruleId = response.body.data.id;
        console.log("Created rule with ID:", ruleId);
      }

      expect(ruleId).toBeDefined();

      // 验证规则是否存在
      const ruleResponse = await httpServer
        .get(`/api/v1/alerts/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      console.log("=== RULE DEBUG ===");
      console.log(
        "Rule found:",
        JSON.stringify(ruleResponse.body.data, null, 2),
      );
      console.log("==================");

      const triggerData = {
        metrics: [
          {
            metric: "test.metric.value",
            value: 150,
            timestamp: new Date().toISOString(),
            tags: { host: "test-server" },
          },
        ],
      };

      console.log("=== TRIGGER DEBUG ===");
      console.log(
        "Sending trigger data:",
        JSON.stringify(triggerData, null, 2),
      );
      console.log("=====================");

      const triggerResponse = await httpServer
        .post("/api/v1/alerts/trigger")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(triggerData)
        .expect(201);

      console.log("=== TRIGGER RESPONSE ===");
      console.log(
        "Trigger response:",
        JSON.stringify(triggerResponse.body, null, 2),
      );
      console.log("========================");

      // Allow some time for alert processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const activeAlertsResponse = await httpServer
        .get("/api/v1/alerts/active")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // Debug: 打印响应数据以诊断问题
      console.log("=== DEBUG INFO ===");
      console.log("Expected ruleId:", ruleId);
      console.log(
        "Active alerts response:",
        JSON.stringify(activeAlertsResponse.body, null, 2),
      );
      console.log(
        "Number of alerts found:",
        activeAlertsResponse.body.data
          ? activeAlertsResponse.body.data.length
          : "data is undefined",
      );
      if (
        activeAlertsResponse.body.data &&
        activeAlertsResponse.body.data.length > 0
      ) {
        console.log(
          "First alert ruleId:",
          activeAlertsResponse.body.data[0].ruleId,
        );
        console.log(
          "All alert ruleIds:",
          activeAlertsResponse.body.data.map((a: any) => a.ruleId),
        );
      }
      console.log("===================");

      const newAlert = activeAlertsResponse.body.data.find(
        (a: any) => a.ruleId === ruleId,
      );
      expect(newAlert).toBeDefined();
      alertId = newAlert.id;
    });

    it("should acknowledge the triggered alert", async () => {
      expect(alertId).toBeDefined();
      const ackData = { acknowledgedBy: "test-admin" };

      const response = await httpServer
        .post(`/api/v1/alerts/${alertId}/acknowledge`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(ackData)
        .expect(201);

      global.expectSuccessResponse(response, 201);
      const ackAlert = response.body.data;
      expect(ackAlert.status).toBe("acknowledged");
      expect(ackAlert.acknowledgedBy).toBe("test-admin");
    });

    it("should resolve the acknowledged alert", async () => {
      expect(alertId).toBeDefined();
      const resolveData = { resolvedBy: "test-admin" };

      await httpServer
        .post(`/api/v1/alerts/${alertId}/resolve`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(resolveData)
        .expect(201);

      // Verify the alert is no longer active
      const activeAlertsResponse = await httpServer
        .get("/api/v1/alerts/active")
        .set("Authorization", `Bearer ${jwtToken}`);
      const resolvedAlert = activeAlertsResponse.body.data.find(
        (a) => a.id === alertId,
      );
      expect(resolvedAlert).toBeUndefined();
    });

    it("should fail to access protected routes without admin role", async () => {
      // Create a non-admin user
      const nonAdminData = {
        username: "non-admin-user",
        email: "non-admin@example.com",
        password: "password123",
        role: "developer", // Use 'developer' as a valid non-admin role
      };
      await httpServer.post("/api/v1/auth/register").send(nonAdminData);
      const loginResponse = await httpServer.post("/api/v1/auth/login").send({
        username: nonAdminData.username,
        password: nonAdminData.password,
      });
      const nonAdminToken = loginResponse.body.data.accessToken;

      // Try to access protected routes
      const protectedEndpoints = [
        "/api/v1/alerts/rules",
        "/api/v1/alerts/stats",
        "/api/v1/alerts/active",
      ];

      for (const endpoint of protectedEndpoints) {
        await httpServer
          .get(endpoint)
          .set("Authorization", `Bearer ${nonAdminToken}`)
          .expect(403); // Forbidden
      }
    });
  });
});
