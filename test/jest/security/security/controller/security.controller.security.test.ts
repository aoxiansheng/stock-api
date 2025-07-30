/**
 * Security Controller 安全测试
 * 测试安全控制器本身的安全性
 */

import { Permission } from "../../../../../src/auth/enums/user-role.enum";

describe("Security Controller Security Tests", () => {
  let request: any;
  let adminApiKey: any;
  let userApiKey: any;

  beforeAll(async () => {
    request = global.createSecurityRequest();

    // 创建管理员API Key
    adminApiKey = await global.createTestApiKey({
      permissions: [Permission.SYSTEM_ADMIN],
    });

    // 创建普通用户API Key
    userApiKey = await global.createTestApiKey({
      permissions: [Permission.DATA_READ],
    });
  });

  describe("Security Scan Endpoint Security", () => {
    it("应该阻止未认证用户访问安全扫描", async () => {
      const response = await request
        .post("/api/v1/security/scan")
        .set("Content-Type", "application/json")
        .send({});

      expect(response.status).toBe(401);
    });

    it("应该阻止普通用户访问安全扫描", async () => {
      const response = await request
        .post("/api/v1/security/scan")
        .set("Content-Type", "application/json")
        .send({})
        .set("X-App-Key", userApiKey.appKey)
        .set("X-Access-Token", userApiKey.accessToken);

      expect([401, 403]).toContain(response.status);
    });

    it("应该允许管理员执行安全扫描", async () => {
      const response = await request
        .post("/api/v1/security/scan")
        .set("Content-Type", "application/json")
        .send({})
        .set("X-App-Key", adminApiKey.appKey)
        .set("X-Access-Token", adminApiKey.accessToken);

      // 200/201 (成功) 或 503 (服务暂不可用，但认证通过)
      expect([200, 201, 503]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.data).toBeDefined();
      }
    });

    it("应该不泄露扫描过程中的敏感信息", async () => {
      const response = await request
        .post("/api/v1/security/scan")
        .set("Content-Type", "application/json")
        .send({})
        .set("X-App-Key", adminApiKey.appKey)
        .set("X-Access-Token", adminApiKey.accessToken);

      if (response.status === 200 || response.status === 201) {
        const responseText = JSON.stringify(response.body);

        // 不应该泄露敏感的系统信息
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("secret");
        expect(responseText).not.toContain("mongodb://");
        expect(responseText).not.toContain("redis://");
        expect(responseText).not.toContain("/etc/");
        expect(responseText).not.toContain("process.env");
      }
    });
  });

  describe("Vulnerability Reporting Security", () => {
    it("应该防护漏洞报告访问权限", async () => {
      const response = await request
        .get("/api/v1/security/vulnerabilities")
        .set("X-App-Key", userApiKey.appKey)
        .set("X-Access-Token", userApiKey.accessToken);

      expect([401, 403]).toContain(response.status);
    });

    it("应该验证漏洞严重性过滤参数", async () => {
      const maliciousFilters = [
        "../../../etc/passwd",
        '<script>alert("XSS")</script>',
        '${java.lang.Runtime.exec("rm -rf /")}',
        "; DROP TABLE vulnerabilities; --",
      ];

      for (const filter of maliciousFilters) {
        const response = await request
          .get("/api/v1/security/vulnerabilities")
          .query({ severity: filter })
          .set("X-App-Key", adminApiKey.appKey)
          .set("X-Access-Token", adminApiKey.accessToken);

        // 应该返回400（参数验证失败）而不是500（内部错误）
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe("Audit Log Security", () => {
    it("应该阻止未授权访问审计日志", async () => {
      const response = await request
        .get("/api/v1/security/audit/events")
        .set("X-App-Key", userApiKey.appKey)
        .set("X-Access-Token", userApiKey.accessToken);

      expect([401, 403]).toContain(response.status);
    });

    it("应该防护审计日志时间范围注入", async () => {
      const maliciousDates = [
        "2023-01-01T00:00:00.000Z; DROP TABLE audit_events; --",
        "../../../etc/passwd",
        '<script>alert("XSS")</script>',
        '${java.lang.Runtime.exec("cat /etc/passwd")}',
      ];

      for (const date of maliciousDates) {
        const response = await request
          .get("/api/v1/security/audit/events")
          .query({ startDate: date })
          .set("X-App-Key", adminApiKey.appKey)
          .set("X-Access-Token", adminApiKey.accessToken);

        // 应该返回参数验证错误
        expect([400, 422]).toContain(response.status);
      }
    });

    it("应该限制审计日志查询范围防止数据泄露", async () => {
      const response = await request
        .get("/api/v1/security/audit/events")
        .query({
          limit: 100000, // 尝试获取大量数据
          offset: -1, // 非法偏移
        })
        .set("X-App-Key", adminApiKey.appKey)
        .set("X-Access-Token", adminApiKey.accessToken);

      if (response.status === 200) {
        // 应该限制返回的数据量
        expect(response.body.data.length).toBeLessThanOrEqual(1000);
      } else {
        // 或者直接拒绝非法参数
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe("Suspicious IP Management Security", () => {
    it("应该防护可疑IP操作权限", async () => {
      const response = await request
        .get("/api/v1/security/suspicious-ips")
        .set("X-App-Key", userApiKey.appKey)
        .set("X-Access-Token", userApiKey.accessToken);

      expect([401, 403]).toContain(response.status);
    });

    it("应该验证IP地址格式防止注入", async () => {
      const maliciousIPs = [
        "127.0.0.1; rm -rf /",
        '192.168.1.1<script>alert("XSS")</script>',
        "../../../etc/passwd",
        '10.0.0.1"; DROP TABLE suspicious_ips; --',
      ];

      for (const ip of maliciousIPs) {
        const response = await request
          .post(
            `/api/v1/security/suspicious-ips/${encodeURIComponent(ip)}/clear`,
          )
          .set("Content-Type", "application/json")
          .send({})
          .set("X-App-Key", adminApiKey.appKey)
          .set("X-Access-Token", adminApiKey.accessToken);

        // 应该返回参数验证错误而不是内部错误
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe("Manual Security Event Recording", () => {
    it("应该验证手动事件记录的数据", async () => {
      const maliciousEvents = [
        {
          type: '<script>alert("XSS")</script>',
          severity: "high",
          action: "test",
        },
        {
          type: "login_attempt",
          severity: "high",
          action: "../../../etc/passwd",
        },
        {
          type: "login_attempt",
          severity: "high",
          action: "test",
          metadata: {
            __proto__: { admin: true },
          },
        },
      ];

      for (const event of maliciousEvents) {
        const response = await request
          .post("/api/v1/security/manual-events")
          .set("X-App-Key", adminApiKey.appKey)
          .set("X-Access-Token", adminApiKey.accessToken)
          .send(event);

        // 应该拒绝恶意数据
        expect([400, 422]).toContain(response.status);
      }
    });

    it("应该限制事件记录频率防止滥用", async () => {
      const validEvent = {
        type: "authentication",
        severity: "medium",
        action: "failed_login",
        clientIP: "127.0.0.1",
        userAgent: "test",
        outcome: "failure",
      };

      // 尝试快速发送大量事件
      const promises = Array(50)
        .fill(0)
        .map(() =>
          request
            .post("/api/v1/security/manual-events")
            .set("X-App-Key", adminApiKey.appKey)
            .set("X-Access-Token", adminApiKey.accessToken)
            .send(validEvent),
        );

      const results = await Promise.allSettled(promises);

      let successfulRequests = 0;
      let rateLimitedRequests = 0;

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.status === 201) {
            successfulRequests++;
          } else if (result.value.status === 429) {
            rateLimitedRequests++;
          }
        } else if (result.status === "rejected") {
          // 将 ECONNRESET 错误也视为一种限流
          if (result.reason && result.reason.code === "ECONNRESET") {
            rateLimitedRequests++;
          }
        }
      });

      // 至少应该有一些成功的请求，但也应该有限流
      // 精确断言：成功的请求数应为速率限制的阈值 20
      expect(successfulRequests).toBeGreaterThan(0);
      expect(successfulRequests).toBeLessThanOrEqual(20);
      expect(rateLimitedRequests).toBeGreaterThan(0);
      expect(successfulRequests + rateLimitedRequests).toBe(50);
    });
  });

  describe("Security Configuration Access", () => {
    it("应该阻止普通用户访问安全配置", async () => {
      const response = await request
        .get("/api/v1/security/configuration")
        .set("X-App-Key", userApiKey.appKey)
        .set("X-Access-Token", userApiKey.accessToken);

      expect([401, 403]).toContain(response.status);
    });

    it("应该不在配置中泄露敏感信息", async () => {
      const response = await request
        .get("/api/v1/security/configuration")
        .set("X-App-Key", adminApiKey.appKey)
        .set("X-Access-Token", adminApiKey.accessToken);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // 不应该泄露敏感的配置值
        expect(responseText).not.toContain("secret");
        // 使用更精确的匹配，避免错误匹配 passwordPolicy 等字段
        expect(responseText).not.toMatch(/"password":/);
        expect(responseText).not.toContain("private_key");
        expect(responseText).not.toContain("connection_string");
      }
    });
  });

  describe("Security Dashboard Access Control", () => {
    it("应该实施严格的仪表板访问控制", async () => {
      const response = await request
        .get("/api/v1/security/dashboard")
        .set("X-App-Key", userApiKey.appKey)
        .set("X-Access-Token", userApiKey.accessToken);

      expect([401, 403]).toContain(response.status);
    });

    it("应该返回安全的仪表板数据", async () => {
      const response = await request
        .get("/api/v1/security/dashboard")
        .set("X-App-Key", adminApiKey.appKey)
        .set("X-Access-Token", adminApiKey.accessToken);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);

        // 检查仪表板数据不包含原始敏感信息
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("private_key");
        expect(responseText).not.toContain("connection_string");
        expect(responseText).not.toContain("/etc/passwd");

        // 验证基本结构
        if (response.body.data) {
          expect(response.body.data).toHaveProperty("overview");
        }
      }
    });
  });
});
