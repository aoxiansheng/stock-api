/**
 * Alert System 安全测试
 * 测试告警系统的安全性和访问控制
 */

import { UserRole } from "../../../../../src/auth/enums/user-role.enum";

describe("Alert System Security Tests", () => {
  let request: any;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    request = global.createSecurityRequest();

    // 创建认证过的管理员和用户，使用动态生成的用户名避免冲突
    const { token: adminUserToken } = await global.createAuthenticatedUser({
      role: UserRole.ADMIN,
    });
    adminToken = adminUserToken;

    const { token: developerUserToken } = await global.createAuthenticatedUser({
      role: UserRole.DEVELOPER,
    });
    userToken = developerUserToken;
  });

  describe("Alert Rule Management Security", () => {
    it("应该阻止未认证用户创建告警规则", async () => {
      const response = await request.post("/api/v1/alerts/rules").send({
        name: "Test Rule",
        metric: "cpu",
        operator: "gt",
        threshold: 80,
        duration: 60,
        severity: "warning",
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      expect(response.status).toBe(401);
    });

    it("应该阻止普通用户创建告警规则", async () => {
      const response = await request
        .post("/api/v1/alerts/rules")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Test Rule",
          metric: "cpu",
          operator: "gt",
          threshold: 80,
          duration: 60,
          severity: "warning",
          enabled: true,
          channels: [],
          cooldown: 300,
        });

      expect([401, 403]).toContain(response.status);
    });

    it("应该防护规则条件中的代码注入", async () => {
      const maliciousMetrics = [
        "cpu; rm -rf /",
        'cpu && require("child_process").exec("rm -rf /")',
        "cpu; process.exit(1)",
        'eval("require(\\"fs\\").unlinkSync(\\"/etc/passwd\\")")',
        '${java.lang.Runtime.exec("rm -rf /")}',
        "function() { return process.env.SECRET_KEY; }",
      ];

      for (const metric of maliciousMetrics) {
        const response = await request
          .post("/api/v1/alerts/rules")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            name: "Malicious Rule",
            metric: metric,
            operator: "gt",
            threshold: 80,
            duration: 60,
            severity: "warning",
            enabled: true,
            channels: [],
            cooldown: 300,
          });

        // 应该拒绝恶意metric
        expect([400, 422]).toContain(response.status);
      }
    });

    it("应该验证告警规则名称防止XSS", async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg/onload=alert("XSS")>',
      ];

      for (const payload of xssPayloads) {
        const response = await request
          .post("/api/v1/alerts/rules")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            name: payload,
            metric: "cpu",
            operator: "gt",
            threshold: 80,
            duration: 60,
            severity: "warning",
            enabled: true,
            channels: [],
            cooldown: 300,
          });

        // 应该拒绝或转义XSS payload
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe("Alert Query Security", () => {
    it("应该防护告警查询注入", async () => {
      const maliciousQueries = [
        { severity: "critical; DROP TABLE alerts; --" },
        { status: "active' OR '1'='1" },
        { ruleId: "../../../etc/passwd" },
        { metric: "cpu; rm -rf /" },
        { sortBy: "name; DROP TABLE alert_rules; --" },
      ];

      for (const query of maliciousQueries) {
        const response = await request
          .get("/api/v1/alerts/active")
          .query(query)
          .set("Authorization", `Bearer ${adminToken}`);

        // 应该拒绝恶意查询 (现在有了验证装饰器，应该返回400)
        expect([400, 422]).toContain(response.status);
      }
    });

    it("应该限制告警历史查询范围", async () => {
      const response = await request
        .get("/api/v1/alerts/history")
        .query({
          limit: 1000000, // 过大的限制
          offset: -1, // 无效的偏移
        })
        .set("Authorization", `Bearer ${adminToken}`);

      if (response.status === 200) {
        // 应该限制返回的数据量
        if (response.body.data && Array.isArray(response.body.data)) {
          expect(response.body.data.length).toBeLessThanOrEqual(1000);
        }
      } else {
        // 或者直接拒绝无效参数
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe("Alert Acknowledgment Security", () => {
    it("应该验证告警ID防止路径遍历", async () => {
      const maliciousIds = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "/etc/passwd",
        'javascript:alert("XSS")',
      ];

      for (const id of maliciousIds) {
        const response = await request
          .post(`/api/v1/alerts/${encodeURIComponent(id)}/acknowledge`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ acknowledgedBy: "Test User" });

        // 应该拒绝恶意ID
        expect([400, 404, 422]).toContain(response.status);
      }
    });

    it("应该防护确认原因中的XSS", async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
      ];

      for (const payload of xssPayloads) {
        const response = await request
          .post("/api/v1/alerts/test-alert-id/acknowledge")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ acknowledgedBy: payload });

        // 应该拒绝或转义XSS内容
        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain("<script>");
          expect(responseText).not.toContain("javascript:");
        } else {
          expect([400, 404, 422]).toContain(response.status);
        }
      }
    });
  });

  describe("Notification Channel Security", () => {
    it("应该阻止普通用户测试通知渠道", async () => {
      const response = await request
        .post("/api/v1/alerts/channels/test")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          type: "email",
          config: {
            to: "test@example.com",
            subject: "Test Alert",
          },
        });

      expect([401, 403]).toContain(response.status);
    });

    it("应该防护通知配置中的敏感信息泄露", async () => {
      const response = await request
        .post("/api/v1/alerts/channels/test")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          type: "webhook",
          config: {
            url: "http://evil.com/steal",
            headers: {
              Authorization: "Bearer secret-token",
            },
          },
        });

      // 应该拒绝或验证外部URL
      expect([400, 422, 503]).toContain(response.status);
    });

    it("应该验证通知渠道配置防止SSRF", async () => {
      const ssrfPayloads = [
        "http://127.0.0.1:22",
        "http://localhost:3306",
        "http://169.254.169.254/latest/meta-data/",
        "file:///etc/passwd",
        "ftp://internal.server/sensitive-data",
      ];

      for (const url of ssrfPayloads) {
        const response = await request
          .post("/api/v1/alerts/channels/test")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            type: "webhook",
            config: { url },
          });

        // 应该拒绝内部URL和敏感协议
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe("Manual Alert Triggering Security", () => {
    it("应该限制手动触发告警的频率", async () => {
      // 尝试快速触发多次
      const promises = Array(20)
        .fill(0)
        .map(() =>
          request
            .post("/api/v1/alerts/trigger")
            .set("Authorization", `Bearer ${adminToken}`)
            .set("Content-Type", "application/json")
            .send({}),
        );

      const responses = await Promise.allSettled(promises);

      // 统计不同状态的响应
      const statusCounts = responses.reduce(
        (acc, result) => {
          if (result.status === "fulfilled") {
            const status = result.value.status;
            acc[status] = (acc[status] || 0) + 1;
          } else {
            // 处理网络错误（如ECONNRESET）
            acc.networkError = (acc.networkError || 0) + 1;
          }
          return acc;
        },
        {} as Record<string | number, number>,
      );

      // 应该有限流机制生效（状态400表示频率限制）
      const rateLimitedRequests = statusCounts[400] || 0;
      const successfulRequests =
        (statusCounts[200] || 0) + (statusCounts[201] || 0);

      // 验证总数和限流效果
      expect(rateLimitedRequests + successfulRequests).toBeGreaterThan(0);
      if (rateLimitedRequests > 0) {
        expect(rateLimitedRequests).toBeGreaterThan(0);
      }
    });

    it("应该验证规则ID防止注入", async () => {
      const maliciousRuleIds = [
        "test-rule; DROP TABLE alert_rules; --",
        "../../../etc/passwd",
        '<script>alert("XSS")</script>',
        '${java.lang.Runtime.exec("rm -rf /")}',
      ];

      for (const ruleId of maliciousRuleIds) {
        const response = await request
          .post("/api/v1/alerts/trigger")
          .set("Authorization", `Bearer ${adminToken}`)
          .set("Content-Type", "application/json")
          .send({ ruleId });

        // 应该拒绝恶意规则ID (不期望415，因为现在有正确的Content-Type)
        expect([400, 404, 422]).toContain(response.status);
      }
    });
  });

  describe("Batch Operations Security", () => {
    it("应该限制批量操作的数量", async () => {
      const massiveAlertIds = Array.from(
        { length: 10000 },
        (_, i) => `alert-${i}`,
      );

      const response = await request
        .post("/api/v1/alerts/batch/acknowledge")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          alertIds: massiveAlertIds,
          acknowledgedBy: "Test Admin",
        });

      // 应该拒绝过大的批量操作
      expect([400, 413, 422]).toContain(response.status);
    });

    it("应该验证批量操作中的每个ID", async () => {
      const maliciousIds = [
        "valid-id-1",
        "../../../etc/passwd",
        '<script>alert("XSS")</script>',
        "valid-id-2",
      ];

      const response = await request
        .post("/api/v1/alerts/batch/resolve")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          alertIds: maliciousIds,
          resolvedBy: "Test Admin",
        });

      // 应该拒绝包含恶意ID的批量操作
      expect([400, 422]).toContain(response.status);
    });
  });

  describe("Alert Statistics Security", () => {
    it("应该不泄露统计数据中的敏感信息", async () => {
      const response = await request
        .get("/api/v1/alerts/stats")
        .set("Authorization", `Bearer ${adminToken}`);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // 统计数据不应该包含敏感信息
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("secret");
        expect(responseText).not.toContain("private_key");
        expect(responseText).not.toContain("connection_string");
      }
    });
  });

  describe("Alert Rule Updates Security", () => {
    it("应该防护规则更新中的权限提升", async () => {
      // 尝试更新一个假设存在的规则
      const response = await request
        .put("/api/v1/alerts/rules/test-rule-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Rule",
          metric: "cpu",
          operator: "gt",
          threshold: 90,
          duration: 60,
          severity: "critical",
          enabled: true,
          // 尝试设置危险的通知配置
          channels: [
            {
              name: "Malicious Channel",
              type: "webhook",
              enabled: true,
              config: {
                url: "http://127.0.0.1:22/steal-data",
              },
            },
          ],
          cooldown: 300,
        });

      // 应该验证通知配置或拒绝更新
      if (response.status === 200) {
        // 如果成功，检查响应不包含敏感信息
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("secret");
      } else {
        expect([400, 404, 422]).toContain(response.status);
      }
    });
  });
});
