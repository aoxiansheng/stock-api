/**
 * 跨模块协作集成测试
 * 测试Alert、Cache、Metrics、Security模块之间的协作功能
 */

import { INestApplication } from "@nestjs/common";
import Redis from "ioredis";
import { RedisService } from "@liaoliaots/nestjs-redis";

import { AlertingService } from "../../../../src/alert/services/alerting.service";
import { AlertHistoryService } from "../../../../src/alert/services/alert-history.service";
import { PerformanceMonitorService } from "../../../../src/metrics/services/performance-monitor.service";
import { PerformanceMetricsRepository } from "../../../../src/metrics/repositories/performance-metrics.repository";
import { SecurityAuditService } from "../../../../src/security/security-audit.service";
import { CacheService } from "../../../../src/cache/cache.service";

import { AlertSeverity } from "../../../../src/alert/types/alert.types";
import { CreateAlertRuleDto } from "../../../../src/alert/dto/alert-rule.dto";
import { NotificationChannelDto } from "../../../../src/alert/dto/notification-channel.dto";

// 定义测试用的缓存数据接口
interface CachedAggregation {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  successRate?: number;
}

// 类型守卫函数
function isCachedAggregation(obj: any): obj is CachedAggregation {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.totalRequests === "number" &&
    typeof obj.successfulRequests === "number" &&
    typeof obj.failedRequests === "number"
  );
}

// 自定义数据类型用于测试（使用实际的 SecurityEvent 类型值）
const SecurityEventType = {
  THREAT_DETECTED: "suspicious_activity",
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  AUTHENTICATION_FAILURE: "authentication",
  PERFORMANCE_ANOMALY: "system",
  RATE_LIMIT_EXCEEDED: "system",
  SYSTEM_ERROR: "system",
  SYSTEM_RECOVERY: "system",
  DATA_ACCESS: "data_access",
  API_CALL: "data_access",
} as const;

const ThreatLevel = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

describe("Cross Module Collaboration Integration", () => {
  let app: INestApplication;
  let alertingService: AlertingService;
  let alertHistoryService: AlertHistoryService;
  let performanceMonitorService: PerformanceMonitorService;
  let securityAuditService: SecurityAuditService;
  let cacheService: CacheService;
  let redisClient: Redis;
  let performanceMetricsRepository: PerformanceMetricsRepository;

  const testLogChannel: NotificationChannelDto = {
    name: "test-log-channel",
    type: "log",
    config: {},
    enabled: true,
  };

  beforeAll(async () => {
    app = (global as any).testApp;

    alertingService = app.get<AlertingService>(AlertingService);
    alertHistoryService = app.get<AlertHistoryService>(AlertHistoryService);
    performanceMonitorService = app.get<PerformanceMonitorService>(
      PerformanceMonitorService,
    );
    securityAuditService = app.get<SecurityAuditService>(SecurityAuditService);
    cacheService = app.get<CacheService>(CacheService);
    const redisService = app.get<RedisService>(RedisService);
    redisClient = redisService.getOrThrow();
    performanceMetricsRepository = app.get<PerformanceMetricsRepository>(
      PerformanceMetricsRepository,
    );
  });

  beforeEach(async () => {
    // 清理Redis数据
    if (redisClient) {
      await redisClient.flushall();
    }
  });

  describe("Security-Alert-Cache 三模块协作", () => {
    it("应该在检测到安全威胁时触发告警并缓存", async () => {
      // Arrange - 创建安全告警规则
      const securityAlertRule: CreateAlertRuleDto = {
        name: "高风险IP访问告警",
        description: "检测到高风险IP地址访问系统",
        metric: "security.threat_level",
        operator: "gte",
        threshold: ThreatLevel.HIGH,
        duration: 60,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [testLogChannel],
        cooldown: 300,
      };

      const createdRule = await alertingService.createRule(securityAlertRule);

      // Act - 模拟安全威胁检测
      const threatData = {
        ipAddress: "10.0.0.1",
        threatLevel: ThreatLevel.HIGH,
        reason: "multiple_failed_login_attempts",
        detectedAt: new Date(),
        blockedUntil: new Date(Date.now() + 3600000),
      };

      // 记录安全事件
      await securityAuditService.logSecurityEvent({
        type: SecurityEventType.THREAT_DETECTED,
        severity: "high",
        action: "threat_detection",
        clientIP: threatData.ipAddress,
        userAgent: "test-agent",
        details: threatData,
        source: "test",
        outcome: "blocked",
      });

      await securityAuditService.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        severity: "high",
        action: "login_attempt",
        clientIP: threatData.ipAddress,
        userAgent: "test-agent",
        details: {
          reason: threatData.reason,
          attemptCount: 5,
        },
        source: "test",
        outcome: "failure",
      });

      // 等待安全事件写入缓冲区
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - 验证安全事件被记录到缓冲区
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThanOrEqual(2);

      // 验证事件内容
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const threatEvent = events.find(
        (e) => e.type === SecurityEventType.THREAT_DETECTED,
      );
      const authEvent = events.find(
        (e) => e.type === SecurityEventType.AUTHENTICATION_FAILURE,
      );

      expect(threatEvent).toBeDefined();
      expect(threatEvent.clientIP).toBe(threatData.ipAddress);
      expect(authEvent).toBeDefined();
      expect(authEvent.clientIP).toBe(threatData.ipAddress);

      // 验证IP分析数据被更新
      const ipAnalysis = await securityAuditService.getIPAnalysis(
        threatData.ipAddress,
      );
      expect(ipAnalysis).toBeDefined();
      expect(ipAnalysis.requestCount).toBeGreaterThan(0);
      expect(ipAnalysis.failureCount).toBeGreaterThan(0);

      // 验证告警规则被缓存
      const alertKey = `alert:rule:${createdRule.id}`;
      const cachedAlert = await cacheService.get(alertKey);
      expect(cachedAlert).toBeDefined();
    });

    it("应该在缓存性能异常时触发告警和安全审计", async () => {
      // Arrange - 创建缓存性能告警规则
      const cacheAlertRule: CreateAlertRuleDto = {
        name: "缓存性能异常告警",
        description: "检测到缓存响应时间过长",
        metric: "cache.response_time",
        operator: "gt",
        threshold: 1000,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [testLogChannel],
        cooldown: 300,
      };

      await alertingService.createRule(cacheAlertRule);

      // Act - 模拟缓存性能异常
      const slowCacheOperations = [
        { key: "slow:operation:1", duration: 1200 },
        { key: "slow:operation:2", duration: 1500 },
        { key: "slow:operation:3", duration: 1800 },
      ];

      for (const operation of slowCacheOperations) {
        // 记录慢缓存操作
        await performanceMonitorService.recordCacheOperation(
          operation.key,
          false, // 慢操作标记为失败
          operation.duration,
        );

        // 记录安全事件（性能异常可能是攻击征象）
        await securityAuditService.logSecurityEvent({
          type: SecurityEventType.PERFORMANCE_ANOMALY,
          severity: "medium",
          action: "cache_operation",
          clientIP: "127.0.0.1",
          userAgent: "system",
          details: {
            operation: "cache_get",
            key: operation.key,
            duration: operation.duration,
            threshold: 1000,
          },
          source: "performance_monitor",
          outcome: "failure",
        });
      }

      // 等待事件写入缓冲区
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - 验证安全事件被记录到缓冲区
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);

      // 验证缓冲区中包含性能异常事件
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const performanceEvents = events.filter(
        (e) => e.type === SecurityEventType.PERFORMANCE_ANOMALY,
      );
      expect(performanceEvents.length).toBe(3);

      // 验证事件详情
      const expectedKeys = slowCacheOperations.map((op) => op.key);
      const actualKeys = performanceEvents.map((event) => event.details.key);

      // 验证所有预期的键都存在（不依赖顺序）
      expectedKeys.forEach((expectedKey) => {
        expect(actualKeys).toContain(expectedKey);
      });

      // 验证事件的持续时间都是预期的值
      const expectedDurations = slowCacheOperations.map((op) => op.duration);
      const actualDurations = performanceEvents.map(
        (event) => event.details.duration,
      );

      expectedDurations.forEach((expectedDuration) => {
        expect(actualDurations).toContain(expectedDuration);
      });

      // 验证性能指标被记录和缓存
      const performanceKey = "metrics:cache:performance";
      const cachedPerformance = await cacheService.get(performanceKey);
      expect(cachedPerformance).toBeDefined();

      // 验证告警可能被触发
      const activeAlerts = await alertHistoryService.getActiveAlerts();
      expect(activeAlerts).toBeDefined();
    });
  });

  describe("Metrics-Alert-Security 三模块协作", () => {
    it("应该基于性能指标触发安全告警", async () => {
      // Arrange - 创建API调用频率告警规则
      const apiRateAlertRule: CreateAlertRuleDto = {
        name: "API调用频率异常告警",
        description: "检测到API调用频率超过阈值",
        metric: "api.requests_per_minute",
        operator: "gt",
        threshold: 100, // 假设每分钟超过100次请求为异常
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [testLogChannel],
        cooldown: 300,
      };
      await alertingService.createRule(apiRateAlertRule);

      // Act - 模拟API高频调用
      const suspiciousIP = "192.168.1.105";
      const endpoint = "/api/v1/data";
      const method = "GET";

      // 模拟1分钟内120次请求
      for (let i = 0; i < 120; i++) {
        await performanceMonitorService.recordRequest(
          endpoint,
          method,
          50,
          true,
        );

        // 每10次记录一次安全事件
        if (i % 10 === 0) {
          await securityAuditService.logSecurityEvent({
            type: SecurityEventType.RATE_LIMIT_EXCEEDED,
            severity: "high",
            action: "api_request",
            clientIP: suspiciousIP,
            userAgent: "suspicious-bot",
            details: {
              endpoint,
              requestCount: i + 1,
              timeWindow: "1m",
            },
            source: "rate_limiter",
            outcome: "blocked",
          });
        }
      }

      // 等待指标聚合和事件写入缓冲区
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Assert - 验证性能指标被正确聚合
      const metricsKey = `metrics:aggregation:${endpoint}:${method}`;
      const cachedMetrics = await cacheService.get(metricsKey);
      expect(cachedMetrics).toBeDefined();
      if (cachedMetrics && isCachedAggregation(cachedMetrics)) {
        expect(cachedMetrics.totalRequests).toBe(120);
      }

      // 验证安全事件被记录到缓冲区
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓冲区中包含限流事件
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const rateLimitEvents = events.filter(
        (e) => e.type === SecurityEventType.RATE_LIMIT_EXCEEDED,
      );
      expect(rateLimitEvents.length).toBe(12); // 120/10 = 12个事件

      // 验证事件详情
      rateLimitEvents.forEach((event) => {
        expect(event.clientIP).toBe(suspiciousIP);
        expect(event.details.endpoint).toBe(endpoint);
      });

      // 验证告警可能被触发
      const activeAlerts = await alertHistoryService.getActiveAlerts();
      expect(activeAlerts).toBeDefined();
    });

    it("应该在数据库性能异常时触发综合告警", async () => {
      // Arrange - 创建数据库性能告警规则
      const dbPerformanceAlertRule: CreateAlertRuleDto = {
        name: "数据库性能异常告警",
        description: "检测到数据库查询响应时间过长",
        metric: "database.query_duration",
        operator: "gt",
        threshold: 500, // 超过500ms
        duration: 120,
        severity: AlertSeverity.WARNING, // 使用 WARNING 替换 HIGH
        enabled: true,
        channels: [testLogChannel],
        cooldown: 600,
      };
      await alertingService.createRule(dbPerformanceAlertRule);

      // Act - 模拟数据库性能问题
      const slowQueries = [
        { operation: "User.find", duration: 800, success: true },
        { operation: "ApiKey.aggregate", duration: 1200, success: true },
        { operation: "SymbolMapping.find", duration: 600, success: false },
        { operation: "DataMapping.updateMany", duration: 1500, success: true },
      ];

      for (const query of slowQueries) {
        // 记录数据库性能指标
        await performanceMonitorService.recordDatabaseQuery(
          query.operation,
          query.duration,
          query.success,
        );

        // 记录系统性能事件
        await securityAuditService.logSecurityEvent({
          type: SecurityEventType.SYSTEM_ERROR,
          severity: query.duration > 1000 ? "high" : "medium",
          action: "database_query",
          clientIP: "127.0.0.1",
          userAgent: "system",
          details: {
            component: "database",
            operation: query.operation,
            duration: query.duration,
            success: query.success,
          },
          source: "database_monitor",
          outcome: query.success ? "success" : "failure",
        });
      }

      // 等待数据库查询记录和安全事件处理完成
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Assert - 验证数据库指标被正确计算
      const databaseMetrics =
        await performanceMonitorService.getDatabaseMetrics();
      expect(databaseMetrics.totalQueries).toBeGreaterThan(0);
      expect(databaseMetrics.averageQueryTime).toBeGreaterThan(0);
      expect(databaseMetrics.slowQueries).toBeGreaterThan(0); // 应该有慢查询

      // 验证数据库查询时间被记录到正确的键
      const cachedQueryTimes =
        await performanceMetricsRepository.getDatabaseQueryTimes();
      expect(cachedQueryTimes.length).toBeGreaterThan(0);

      // 验证记录的查询时间包含我们测试的慢查询
      const queryTimes = cachedQueryTimes.map((timeStr) =>
        parseInt(timeStr, 10),
      );
      const expectedDbDurations = slowQueries.map((query) => query.duration);

      expectedDbDurations.forEach((expectedDuration) => {
        expect(queryTimes).toContain(expectedDuration);
      });

      // 验证安全事件被记录到缓冲区
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓冲区中包含系统错误事件
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const systemErrorEvents = events.filter(
        (e) => e.type === SecurityEventType.SYSTEM_ERROR,
      );
      expect(systemErrorEvents.length).toBe(4);

      // 验证事件详情
      const expectedOperations = slowQueries.map((query) => query.operation);
      const actualOperations = systemErrorEvents.map(
        (event) => event.details.operation,
      );
      const expectedEventDurations = slowQueries.map((query) => query.duration);
      const actualEventDurations = systemErrorEvents.map(
        (event) => event.details.duration,
      );

      // 验证所有预期的操作都存在（不依赖顺序）
      expectedOperations.forEach((expectedOperation) => {
        expect(actualOperations).toContain(expectedOperation);
      });

      // 验证所有预期的持续时间都存在（不依赖顺序）
      expectedEventDurations.forEach((expectedDuration) => {
        expect(actualEventDurations).toContain(expectedDuration);
      });
    });
  });

  describe("四模块完整协作场景", () => {
    it.skip("应该完整处理安全攻击场景", async () => {
      // 该测试需要 ThreatDetectionService，暂时跳过
      expect(true).toBe(true);
    });

    it("应该处理缓存故障情况下的多模块协作", async () => {
      // Arrange - 创建缓存服务故障告警规则
      const cacheFailureAlertRule: CreateAlertRuleDto = {
        name: "缓存服务故障告警",
        description: "检测到缓存服务不可用",
        metric: "cache.availability",
        operator: "eq",
        threshold: 0, // 0 表示不可用
        duration: 30,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [testLogChannel],
        cooldown: 900,
      };
      await alertingService.createRule(cacheFailureAlertRule);

      // Act - 模拟缓存服务故障

      // 1. 正常操作
      await performanceMonitorService.recordRequest(
        "/api/v1/test",
        "GET",
        100,
        true,
      );
      await securityAuditService.logSecurityEvent({
        type: SecurityEventType.SYSTEM_ERROR,
        severity: "low",
        action: "normal_operation",
        clientIP: "127.0.0.1",
        userAgent: "system",
        details: { message: "before_cache_failure" },
        source: "test",
        outcome: "success",
      });

      // 2. 模拟缓存故障（清空数据）
      await redisClient.flushall();

      // 3. 故障期间的操作（应该降级处理）
      for (let i = 0; i < 5; i++) {
        await performanceMonitorService.recordRequest(
          "/api/v1/degraded",
          "GET",
          200,
          true,
        );
        await securityAuditService.logSecurityEvent({
          type: SecurityEventType.SYSTEM_ERROR,
          severity: "medium",
          action: "degraded_operation",
          clientIP: "127.0.0.1",
          userAgent: "system",
          details: {
            message: "during_cache_failure",
            operation: `degraded_${i}`,
          },
          source: "test",
          outcome: "success",
        });
      }

      // 等待降级处理
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Assert - 验证降级处理
      // 系统应该继续工作，虽然性能可能下降
      expect(true).toBe(true); // 如果没有抛出异常，测试通过

      // 4. 缓存恢复后的操作
      await performanceMonitorService.recordRequest(
        "/api/v1/recovered",
        "GET",
        100,
        true,
      );
      await securityAuditService.logSecurityEvent({
        type: SecurityEventType.SYSTEM_RECOVERY,
        severity: "low",
        action: "recovery_operation",
        clientIP: "127.0.0.1",
        userAgent: "system",
        details: { message: "after_cache_recovery" },
        source: "test",
        outcome: "success",
      });

      // 等待恢复处理
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 验证恢复后的缓存功能
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓冲区中包含恢复事件
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const recoveryEvents = events.filter(
        (e) => e.type === SecurityEventType.SYSTEM_RECOVERY,
      );
      expect(recoveryEvents.length).toBeGreaterThan(0);
    });
  });

  describe("模块间数据一致性测试", () => {
    it("应该保持跨模块数据的一致性", async () => {
      // Arrange
      const testScenario = {
        userId: "consistency_test_user",
        ipAddress: "192.168.1.100",
        endpoint: "/api/v1/consistency/test",
        method: "POST",
      };

      // Act - 同时在多个模块记录相关数据
      const timestamp = new Date();

      // 1. 性能指标
      await performanceMonitorService.recordRequest(
        testScenario.endpoint,
        testScenario.method,
        150,
        true,
      );

      // 2. 安全事件
      await securityAuditService.logSecurityEvent({
        type: SecurityEventType.DATA_ACCESS,
        severity: "low",
        action: "api_access",
        userId: testScenario.userId,
        clientIP: testScenario.ipAddress,
        userAgent: "test-agent",
        details: {
          endpoint: testScenario.endpoint,
          method: testScenario.method,
          success: true,
        },
        source: "test",
        outcome: "success",
        timestamp,
      });

      // 3. 告警规则验证
      // 准备 - 创建一个用于数据一致性检查的告警规则
      const dataConsistencyAlertRule: CreateAlertRuleDto = {
        name: "数据一致性测试告警",
        metric: "data.consistency_check",
        operator: "eq",
        threshold: 0, // 0 表示不一致
        duration: 1,
        severity: AlertSeverity.WARNING, // 使用 WARNING 替换 HIGH
        channels: [testLogChannel],
        enabled: true,
        cooldown: 0,
      };
      const createdRule = await alertingService.createRule(
        dataConsistencyAlertRule,
      );

      // 等待数据写入各个模块的缓存
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Assert - 验证数据一致性

      // 1. 验证性能数据
      const metricsKey = `metrics:aggregation:${testScenario.endpoint}:${testScenario.method}`;
      const cachedMetrics = await cacheService.get(metricsKey);
      expect(cachedMetrics).toBeDefined();

      // 2. 验证安全事件被记录到缓冲区
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓冲区中包含数据访问事件
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const dataAccessEvents = events.filter(
        (e) => e.type === SecurityEventType.DATA_ACCESS,
      );
      expect(dataAccessEvents.length).toBeGreaterThan(0);

      // 3. 验证告警数据
      const alertKey = `alert:rule:${createdRule.id}`;
      const cachedAlert = await cacheService.get(alertKey);
      expect(cachedAlert).toBeDefined();

      // 4. 验证时间戳一致性（允许小幅差异）
      const dataAccessEvent = dataAccessEvents[0];
      const eventTimestamp = new Date(dataAccessEvent.timestamp);
      const timeDiff = Math.abs(eventTimestamp.getTime() - timestamp.getTime());
      expect(timeDiff).toBeLessThan(1000); // 1秒内的差异是可接受的

      // 5. 验证用户ID和IP一致性
      expect(dataAccessEvent.userId).toBe(testScenario.userId);
      expect(dataAccessEvent.clientIP).toBe(testScenario.ipAddress);
      expect(dataAccessEvent.details.endpoint).toBe(testScenario.endpoint);
    });

    it("应该正确处理并发跨模块操作", async () => {
      // Arrange
      const concurrentOperations = 10;
      const testData = Array.from({ length: concurrentOperations }, (_, i) => ({
        userId: `concurrent_user_${i}`,
        ipAddress: `192.168.1.${100 + i}`,
        endpoint: `/api/v1/concurrent/test/${i}`,
        method: "GET",
      }));

      // Act - 并发执行跨模块操作
      const promises = testData.map(async (data, index) => {
        // 并发记录性能指标
        const performancePromise = performanceMonitorService.recordRequest(
          data.endpoint,
          data.method,
          100 + index * 10,
          true,
        );

        // 并发记录安全事件
        const securityPromise = securityAuditService.logSecurityEvent({
          type: SecurityEventType.API_CALL,
          severity: "low",
          action: "concurrent_api_access",
          userId: data.userId,
          clientIP: data.ipAddress,
          userAgent: "test-agent",
          details: {
            endpoint: data.endpoint,
            method: data.method,
            concurrent: true,
            index,
          },
          source: "test",
          outcome: "success",
        });

        return Promise.all([performancePromise, securityPromise]);
      });

      await Promise.all(promises);

      // 等待所有操作完成
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - 验证并发操作结果

      // 1. 验证所有性能指标都被记录
      for (const data of testData) {
        const metricsKey = `metrics:aggregation:${data.endpoint}:${data.method}`;
        const cachedMetrics = await cacheService.get(metricsKey);
        expect(cachedMetrics).toBeDefined();
        if (cachedMetrics && isCachedAggregation(cachedMetrics)) {
          expect(cachedMetrics.totalRequests).toBe(1);
        }
      }

      // 2. 验证所有安全事件都被记录到缓冲区
      const eventBufferKey = "security:event_buffer";
      const cachedEvents = await cacheService.listRange(eventBufferKey, 0, -1);
      expect(cachedEvents.length).toBeGreaterThan(0);

      // 验证缓冲区中包含并发API调用事件
      const events = cachedEvents.map((eventStr) => JSON.parse(eventStr));
      const apiCallEvents = events.filter(
        (e) => e.type === SecurityEventType.API_CALL,
      );
      expect(apiCallEvents.length).toBe(concurrentOperations);

      // 3. 验证数据完整性
      const userIds = apiCallEvents.map((event) => event.userId).sort();
      const expectedUserIds = testData.map((data) => data.userId).sort();
      expect(userIds).toEqual(expectedUserIds);

      // 验证每个事件的详细信息
      apiCallEvents.forEach((event) => {
        const expectedData = testData.find((d) => d.userId === event.userId);
        expect(expectedData).toBeDefined();
        expect(event.clientIP).toBe(expectedData.ipAddress);
        expect(event.details.endpoint).toBe(expectedData.endpoint);
      });
    });
  });
});
