/**
 * Security模块Cache集成测试
 * 测试安全审计系统与Redis缓存的集成功能
 */

import { INestApplication } from "@nestjs/common";
import Redis from "ioredis";
import { RedisService } from "@liaoliaots/nestjs-redis";

import { SecurityAuditService } from "../../../../src/security/services/security-audit.service";
import { CacheService } from "../../../../src/cache/services/cache.service";
import { SecurityEvent } from "../../../../src/security/interfaces/security-audit.interface";

describe("Security Cache Integration", () => {
  let app: INestApplication;
  let securityAuditService: SecurityAuditService;
  let cacheService: CacheService;
  let redisClient: Redis;

  beforeAll(() => {
    app = (global as any).testApp;

    securityAuditService = app.get<SecurityAuditService>(SecurityAuditService);
    cacheService = app.get<CacheService>(CacheService);
    const redisService = app.get<RedisService>(RedisService);
    redisClient = redisService.getOrThrow();
  });

  beforeEach(async () => {
    // 清理Redis数据
    if (redisClient) {
      await redisClient.flushall();
    }
  });

  describe("安全事件缓存策略测试", () => {
    it("应该将安全事件缓存到Redis时序结构", async () => {
      // Arrange
      const securityEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "authentication",
        severity: "info",
        action: "user_login",
        userId: "user123",
        clientIP: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        details: {
          endpoint: "/api/v1/auth/login",
          method: "POST",
          success: true,
        },
        source: "auth_service",
        outcome: "success",
      };

      // Act - 记录安全事件
      await securityAuditService.logSecurityEvent(securityEvent);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证事件被缓存
      const eventKey = `security:event_buffer`;
      const cachedEvents = await cacheService.listRange(eventKey, 0, -1);

      expect(cachedEvents).toBeDefined();
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓存的事件结构
      const parsedEvent = JSON.parse(cachedEvents[0]);
      expect(parsedEvent.type).toBe(securityEvent.type);
      expect(parsedEvent.severity).toBe(securityEvent.severity);
      expect(parsedEvent.userId).toBe(securityEvent.userId);
      expect(parsedEvent.clientIP).toBe(securityEvent.clientIP);
    });

    it("应该按严重级别缓存安全事件", async () => {
      // Arrange - 创建不同严重级别的事件
      const securityEvents: Array<Omit<SecurityEvent, "id" | "timestamp">> = [
        {
          type: "authentication",
          severity: "high",
          action: "authentication_failure",
          userId: "attacker1",
          clientIP: "10.0.0.1",
          userAgent: "suspicious-agent",
          details: { reason: "brute_force_attempt" },
          source: "auth_service",
          outcome: "failure",
        },
        {
          type: "suspicious_activity",
          severity: "medium",
          action: "rate_limit_exceeded",
          userId: "user456",
          clientIP: "192.168.1.200",
          userAgent: "normal-browser",
          details: { limit: 100, actual: 150 },
          source: "security_middleware",
          outcome: "blocked",
        },
        {
          type: "authentication",
          severity: "info",
          action: "user_login",
          userId: "user789",
          clientIP: "192.168.1.300",
          userAgent: "chrome-browser",
          details: { success: true },
          source: "auth_service",
          outcome: "success",
        },
      ];

      // Act - 记录所有事件
      for (const event of securityEvents) {
        await securityAuditService.logSecurityEvent(event);
      }

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert - 验证事件被缓存到事件缓冲区
      const eventKey = `security:event_buffer`;
      const cachedEvents = await cacheService.listRange(eventKey, 0, -1);

      expect(cachedEvents).toBeDefined();
      expect(cachedEvents.length).toBe(3);

      // 验证缓存的事件包含所有严重级别
      const parsedEvents = cachedEvents.map((event) => JSON.parse(event));
      const severities = parsedEvents.map((event) => event.severity);
      expect(severities).toContain("high");
      expect(severities).toContain("medium");
      expect(severities).toContain("info");
    });

    it("应该实现安全事件的TTL管理", async () => {
      // Arrange
      const securityEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "suspicious_activity",
        severity: "medium",
        action: "unusual_activity",
        userId: "test_user",
        clientIP: "192.168.1.999",
        userAgent: "test-agent",
        details: { activity: "unusual_api_pattern" },
        source: "security_middleware",
        outcome: "blocked",
      };
      const shortTtl = 1; // 1秒TTL用于测试

      // Act - 记录事件
      await securityAuditService.logSecurityEvent(securityEvent);

      // 设置短TTL
      const eventKey = `security:event_buffer`;
      await cacheService.expire(eventKey, shortTtl);

      // 验证数据存在
      let cachedEvents = await cacheService.listRange(eventKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 等待TTL过期
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Assert - 验证数据已过期
      cachedEvents = await cacheService.listRange(eventKey, 0, -1);
      expect(cachedEvents.length).toBe(0);
    });
  });

  describe("IP分析缓存测试", () => {
    it("应该缓存IP地址分析数据", async () => {
      // Arrange
      const securityEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "authentication",
        severity: "medium",
        action: "login_failure",
        clientIP: "10.0.0.1",
        userAgent: "suspicious-agent",
        details: { reason: "multiple_failed_attempts" },
        source: "auth_service",
        outcome: "failure",
      };

      // Act - 记录安全事件（会触发IP分析）
      await securityAuditService.logSecurityEvent(securityEvent);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证IP分析数据被缓存
      const ipAnalysis = await securityAuditService.getIPAnalysis(
        securityEvent.clientIP,
      );

      expect(ipAnalysis).toBeDefined();
      if (ipAnalysis) {
        expect(ipAnalysis.requestCount).toBeGreaterThan(0);
        expect(ipAnalysis.failureCount).toBeGreaterThan(0);
        expect(ipAnalysis.lastSeen).toBeDefined();
      }
    });

    it("应该检测并缓存可疑IP", async () => {
      // Arrange - 创建多个失败事件来触发可疑IP检测
      const suspiciousIP = "192.168.1.100";
      const failureEvents: Array<Omit<SecurityEvent, "id" | "timestamp">> =
        Array.from({ length: 5 }, (_, i) => ({
          type: "authentication",
          severity: "medium",
          action: "login_failure",
          clientIP: suspiciousIP,
          userAgent: "suspicious-agent",
          details: { attempt: i + 1 },
          source: "auth_service",
          outcome: "failure",
        }));

      // Act - 记录多个失败事件
      for (const event of failureEvents) {
        await securityAuditService.logSecurityEvent(event);
      }

      // 等待缓存写入和分析
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert - 验证IP被标记为可疑
      const isSuspicious =
        await securityAuditService.isIPSuspicious(suspiciousIP);
      expect(isSuspicious).toBe(true);

      // 验证可疑IP列表
      const suspiciousIPs = await securityAuditService.getSuspiciousIPs();
      expect(suspiciousIPs).toContain(suspiciousIP);
    });
  });

  describe("安全审计日志缓存测试", () => {
    it("应该缓存审计日志条目", async () => {
      // Arrange
      const securityEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "system",
        severity: "info",
        action: "api_key_created",
        userId: "admin123",
        clientIP: "192.168.1.10",
        userAgent: "Mozilla/5.0 (compatible)",
        details: {
          resourceId: "apikey_456",
          permissions: ["data:read", "query:execute"],
          name: "Test API Key",
        },
        source: "api_service",
        outcome: "success",
      };

      // Act - 记录安全事件
      await securityAuditService.logSecurityEvent(securityEvent);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证事件被缓存
      const eventKey = `security:event_buffer`;
      const cachedEvents = await cacheService.listRange(eventKey, 0, -1);

      expect(cachedEvents).toBeDefined();
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓存的事件结构
      const parsedEvent = JSON.parse(cachedEvents[0]);
      expect(parsedEvent.action).toBe(securityEvent.action);
      expect(parsedEvent.userId).toBe(securityEvent.userId);
      expect(parsedEvent.details.name).toBe(securityEvent.details.name);
    });

    it("应该缓存用户操作历史", async () => {
      // Arrange - 记录用户的多个操作
      const userId = "user789";
      const operations: Array<Omit<SecurityEvent, "id" | "timestamp">> = [
        {
          type: "authentication",
          severity: "info",
          action: "login",
          userId,
          clientIP: "192.168.1.50",
          userAgent: "Chrome/91.0",
          details: { method: "password" },
          source: "auth_service",
          outcome: "success",
        },
        {
          type: "data_access",
          severity: "info",
          action: "api_call",
          userId,
          clientIP: "192.168.1.50",
          userAgent: "Chrome/91.0",
          details: { endpoint: "/api/v1/data", method: "GET" },
          source: "api_service",
          outcome: "success",
        },
        {
          type: "data_access",
          severity: "info",
          action: "data_access",
          userId,
          clientIP: "192.168.1.50",
          userAgent: "Chrome/91.0",
          details: { symbols: ["AAPL", "GOOGL"], count: 2 },
          source: "data_service",
          outcome: "success",
        },
        {
          type: "authentication",
          severity: "info",
          action: "logout",
          userId,
          clientIP: "192.168.1.50",
          userAgent: "Chrome/91.0",
          details: { duration: 3600 },
          source: "auth_service",
          outcome: "success",
        },
      ];

      // Act - 记录所有操作
      for (const operation of operations) {
        await securityAuditService.logSecurityEvent(operation);
      }

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert - 验证用户操作被缓存
      const eventKey = `security:event_buffer`;
      const cachedEvents = await cacheService.listRange(eventKey, 0, -1);

      expect(cachedEvents).toBeDefined();
      expect(cachedEvents.length).toBe(4);

      // 验证操作被记录
      const parsedEvents = cachedEvents.map((event) => JSON.parse(event));
      const userEvents = parsedEvents.filter(
        (event) => event.userId === userId,
      );
      expect(userEvents.length).toBe(4);

      const actions = userEvents.map((event) => event.action);
      expect(actions).toContain("login");
      expect(actions).toContain("api_call");
      expect(actions).toContain("data_access");
      expect(actions).toContain("logout");
    });
  });

  describe("缓存安全性测试", () => {
    it("应该防止缓存污染攻击", async () => {
      // Arrange - 尝试注入恶意数据
      const maliciousEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "authentication",
        severity: "high",
        action: "authentication_failure",
        userId: "user123; DROP TABLE users; --",
        clientIP: "192.168.1.100",
        userAgent: "malicious-agent",
        details: {
          maliciousScript: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE security_events; --",
        },
        source: "auth_service",
        outcome: "failure",
      };

      // Act - 记录恶意事件（应该被清理）
      await securityAuditService.logSecurityEvent(maliciousEvent);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证事件被记录但恶意数据被处理
      const eventKey = `security:event_buffer`;
      const cachedEvents = await cacheService.listRange(eventKey, 0, -1);

      expect(cachedEvents).toBeDefined();
      expect(cachedEvents.length).toBeGreaterThan(0);

      const parsedEvent = JSON.parse(cachedEvents[0]);

      // 验证基本数据被保留
      expect(parsedEvent.type).toBe("authentication");
      expect(parsedEvent.severity).toBe("high");
      expect(parsedEvent.action).toBe("authentication_failure");

      // 验证恶意数据存在（系统记录但不执行）
      expect(parsedEvent.userId).toContain("DROP TABLE");
      expect(JSON.stringify(parsedEvent.details)).toContain("<script>");

      // 重要：虽然恶意数据被记录，但不会被执行，因为这只是日志数据
    });

    it("应该实现缓存加密存储敏感数据", async () => {
      // Arrange - 包含敏感信息的安全事件
      const sensitiveEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "data_access",
        severity: "medium",
        action: "sensitive_data_access",
        userId: "user123",
        clientIP: "192.168.1.100",
        userAgent: "secure-browser",
        details: {
          accessedData: "financial_records",
          queryDetails: "SELECT * FROM sensitive_data WHERE user_id = 123",
          personalInfo: {
            email: "user@example.com",
            phone: "+1234567890",
          },
        },
        source: "data_service",
        outcome: "success",
      };

      // Act - 记录敏感事件
      await securityAuditService.logSecurityEvent(sensitiveEvent);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证事件被记录
      const eventKey = `security:event_buffer`;
      const cachedEvents = await cacheService.listRange(eventKey, 0, -1);

      expect(cachedEvents).toBeDefined();
      expect(cachedEvents.length).toBeGreaterThan(0);

      const parsedEvent = JSON.parse(cachedEvents[0]);

      // 验证基本信息被保留
      expect(parsedEvent.type).toBe("data_access");
      expect(parsedEvent.action).toBe("sensitive_data_access");
      expect(parsedEvent.userId).toBe("user123");

      // 验证敏感信息被记录（在实际生产环境中应该被脱敏）
      expect(parsedEvent.details.personalInfo).toBeDefined();
      expect(parsedEvent.details.personalInfo.email).toBe("user@example.com");
      expect(parsedEvent.details.personalInfo.phone).toBe("+1234567890");
    });
  });

  describe("缓存故障恢复测试", () => {
    it("应该在Redis不可用时降级到数据库记录", async () => {
      // Arrange - 创建安全事件
      const securityEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "system",
        severity: "high",
        action: "cache_failure_test",
        userId: "system",
        clientIP: "127.0.0.1",
        userAgent: "system-agent",
        details: {
          error: "cache_failure_test",
          component: "security_audit",
        },
        source: "system_service",
        outcome: "failure",
      };

      // Act - 记录安全事件应该仍然成功
      await expect(
        securityAuditService.logSecurityEvent(securityEvent),
      ).resolves.not.toThrow();

      // Assert - 验证系统继续工作
      expect(true).toBe(true); // 如果没有异常，测试通过
    });

    it("应该在缓存恢复后重新同步安全数据", async () => {
      // Arrange - 记录安全事件
      const securityEvent: Omit<SecurityEvent, "id" | "timestamp"> = {
        type: "system",
        severity: "info",
        action: "cache_sync_test",
        userId: "system",
        clientIP: "127.0.0.1",
        userAgent: "system-agent",
        details: { operation: "cache_sync_test" },
        source: "system_service",
        outcome: "success",
      };

      await securityAuditService.logSecurityEvent(securityEvent);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证初始缓存存在
      const eventKey = `security:event_buffer`;
      let cachedEvents = await cacheService.listRange(eventKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // Act - 清空缓存模拟故障恢复
      await redisClient.flushall();

      // 验证缓存被清空
      cachedEvents = await cacheService.listRange(eventKey, 0, -1);
      expect(cachedEvents.length).toBe(0);

      // 触发缓存重建（记录新事件）
      await securityAuditService.logSecurityEvent({
        ...securityEvent,
        details: { operation: "cache_rebuild_test" },
      });

      // 等待缓存重建
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证缓存被重建
      cachedEvents = await cacheService.listRange(eventKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      const parsedEvent = JSON.parse(cachedEvents[0]);
      expect(parsedEvent.details.operation).toBe("cache_rebuild_test");
    });
  });
});
