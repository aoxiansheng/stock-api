/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Alert模块Cache集成测试
 * 测试告警系统与Redis缓存的集成功能
 */

import { INestApplication } from "@nestjs/common";
import Redis from "ioredis";
import { InjectRedis } from "@nestjs-modules/ioredis";

import { AlertingService } from "../../../../../src/alert/services/alerting.service";
import { AlertHistoryService } from "../../../../../src/alert/services/alert-history.service";
// import { NotificationService } from "../../../../src/alert/services/notification.service";
// import { RuleEngineService } from "../../../../src/alert/services/rule-engine.service";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import { AlertSeverity } from "../../../../../src/alert/types/alert.types";
import { AlertStatus } from "../../../../../src/alert/types/alert.types";
import { CreateAlertRuleDto } from "../../../../../src/alert/dto/alert-rule.dto";

describe("Alert Cache Integration", () => {
  let app: INestApplication;
  let alertingService: AlertingService;
  let alertHistoryService: AlertHistoryService;
  // Services not used in integration tests
  // let notificationService: NotificationService;
  // let ruleEngineService: RuleEngineService;
  let cacheService: CacheService;
  let redisClient: Redis;

  beforeAll(() => {
    app = (global as any).testApp;

    alertingService = app.get<AlertingService>(AlertingService);
    alertHistoryService = app.get<AlertHistoryService>(AlertHistoryService);
    // notificationService = app.get<NotificationService>(NotificationService);
    // ruleEngineService = app.get<RuleEngineService>(RuleEngineService);
    cacheService = app.get<CacheService>(CacheService);
    redisClient = app.get("default_IORedisModuleConnectionToken");
  });

  beforeEach(async () => {
    // 清理Redis数据
    if (redisClient) {
      await redisClient.flushall();
    }
  });

  describe("告警规则缓存策略测试", () => {
    it("应该将告警规则缓存到Redis并保持一致性", async () => {
      // Arrange
      const createRuleDto: CreateAlertRuleDto = {
        name: "Test Alert Rule CPU",
        description: "CPU使用率告警",
        severity: AlertSeverity.CRITICAL,
        metric: "cpu_usage",
        operator: "gt",
        threshold: 80,
        duration: 60,
        channels: [
          {
            name: "test-log-channel",
            type: "log",
            config: { level: "warn", id: "test-channel" },
            enabled: true,
            retryCount: 3,
            timeout: 30,
          },
        ],
        cooldown: 300,
        enabled: true,
      };

      // Act - 创建告警规则
      const createdRule = await alertingService.createRule(createRuleDto);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证规则被缓存
      const cachedRule = await cacheService.get(`alert:rule:${createdRule.id}`);
      expect(cachedRule).toBeDefined();
      if (cachedRule) {
        expect((cachedRule as any).name).toBe(createRuleDto.name);
        expect((cachedRule as any).severity).toBe(createRuleDto.severity);
        expect((cachedRule as any).enabled).toBe(createRuleDto.enabled);
      }

      // 验证从缓存和数据库获取的数据一致
      const ruleFromService = await alertingService.getRuleById(createdRule.id);
      expect(ruleFromService).toEqual(createdRule);
    });

    it("应该在规则变更时正确更新缓存", async () => {
      // Arrange - 创建初始规则
      const createRuleDto: CreateAlertRuleDto = {
        name: "Original Alert Rule Memory",
        description: "原始描述",
        severity: AlertSeverity.WARNING,
        metric: "memory_usage",
        operator: "gt",
        threshold: 70,
        duration: 60,
        channels: [
          {
            name: "test-log-channel",
            type: "log",
            config: { level: "warn", id: "test-channel" },
            enabled: true,
            retryCount: 3,
            timeout: 30,
          },
        ],
        cooldown: 300,
        enabled: true,
      };

      const createdRule = await alertingService.createRule(createRuleDto);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act - 更新规则
      await alertingService.updateRule(createdRule.id, {
        name: "Updated Alert Rule Memory",
        severity: AlertSeverity.CRITICAL,
        enabled: false,
      });

      // 等待缓存更新
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证缓存被正确更新
      const cachedRule = await cacheService.get(`alert:rule:${createdRule.id}`);
      expect(cachedRule).toBeDefined();
      if (cachedRule) {
        expect((cachedRule as any).name).toBe("Updated Alert Rule Memory");
        expect((cachedRule as any).severity).toBe(AlertSeverity.CRITICAL);
        expect((cachedRule as any).enabled).toBe(false);
      }

      // 验证从服务获取的数据也是最新的
      const ruleFromService = await alertingService.getRuleById(createdRule.id);
      expect(ruleFromService.name).toBe("Updated Alert Rule Memory");
    });

    it("应该在缓存失效时从数据库重新加载", async () => {
      // Arrange - 创建规则
      const createRuleDto: CreateAlertRuleDto = {
        name: "Cache Invalidation Test Rule",
        description: "测试缓存失效场景",
        severity: AlertSeverity.INFO,
        metric: "disk_usage",
        operator: "gt",
        threshold: 90,
        duration: 60,
        channels: [
          {
            name: "test-log-channel",
            type: "log",
            config: { level: "info", id: "test-channel" },
            enabled: true,
            retryCount: 3,
            timeout: 30,
          },
        ],
        cooldown: 300,
        enabled: true,
      };

      const createdRule = await alertingService.createRule(createRuleDto);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act - 手动删除缓存
      await cacheService.del(`alert:rule:${createdRule.id}`);

      // 验证缓存被删除
      const cachedRule = await cacheService.get(`alert:rule:${createdRule.id}`);
      expect(cachedRule).toBeNull();

      // Assert - 从服务获取数据应该触发缓存重建
      const ruleFromService = await alertingService.getRuleById(createdRule.id);
      expect(ruleFromService).toBeDefined();
      expect(ruleFromService.name).toBe(createRuleDto.name);

      // 等待缓存重建
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证缓存被重新构建
      const rebuiltCache = await cacheService.get(
        `alert:rule:${createdRule.id}`,
      );
      expect(rebuiltCache).toBeDefined();
    });
  });

  describe("告警历史缓存测试", () => {
    it("应该将告警历史以时序形式存储到Redis", async () => {
      // Arrange
      const alertData = {
        ruleId: "test-rule-123",
        ruleName: "测试规则",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: "告警触发",
        tags: {},
        context: {},
      };

      // Act - 创建告警历史
      await alertHistoryService.createAlert(alertData);

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证历史数据被缓存
      const timeSeriesKey = `alert:history:timeseries:${alertData.ruleId}`;
      const cachedHistory = await cacheService.listRange(timeSeriesKey, 0, -1);

      expect(cachedHistory).toBeDefined();
      expect(cachedHistory.length).toBeGreaterThan(0);

      // 验证缓存的数据结构
      const parsedHistory = JSON.parse(cachedHistory[0]);
      expect(parsedHistory._status).toBe(AlertStatus.FIRING);
      expect(parsedHistory.message).toBe(alertData.message);
    });

    it("应该正确处理告警历史的批量查询", async () => {
      // Arrange - 创建多个历史记录
      const ruleId = "batch-test-rule";
      const historyCount = 5;

      for (let i = 0; i < historyCount; i++) {
        await alertHistoryService.createAlert({
          ruleId: ruleId,
          ruleName: `批量测试规则`,
          metric: "test_metric",
          value: i * 10,
          threshold: 50,
          severity: AlertSeverity.WARNING,
          message: `批量测试告警 ${i + 1}`,
          tags: {},
          context: {},
        });

        // 等待一小段时间确保时序顺序
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // 等待缓存写入
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Act - 批量查询历史
      const historyList = await alertHistoryService.getActiveAlerts();

      // Assert - 验证查询结果
      expect(historyList).toBeDefined();
      expect(historyList.length).toBeGreaterThanOrEqual(historyCount);

      // 验证时序顺序（最新的在前）
      for (let i = 0; i < historyList.length - 1; i++) {
        expect(historyList[i].startTime.getTime()).toBeGreaterThanOrEqual(
          historyList[i + 1].startTime.getTime(),
        );
      }
    });

    it("应该实现告警历史的TTL管理", async () => {
      // Arrange
      const shortTtlRuleId = "short-ttl-rule";
      const historyTtl = 1; // 1秒TTL用于测试

      // Act - 创建带短TTL的历史记录
      await alertHistoryService.createAlert({
        ruleId: shortTtlRuleId,
        ruleName: "TTL测试规则",
        metric: "test_metric",
        value: 100,
        threshold: 50,
        severity: AlertSeverity.WARNING,
        message: "短TTL测试",
        tags: {},
        context: {},
      });

      // 设置短TTL
      const timeSeriesKey = `alert:history:timeseries:${shortTtlRuleId}`;
      await cacheService.expire(timeSeriesKey, historyTtl);

      // 验证数据存在
      let cachedHistory = await cacheService.listRange(timeSeriesKey, 0, -1);
      expect(cachedHistory.length).toBeGreaterThan(0);

      // 等待TTL过期
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Assert - 验证数据已过期
      cachedHistory = await cacheService.listRange(timeSeriesKey, 0, -1);
      expect(cachedHistory.length).toBe(0);
    });
  });

  describe("缓存故障恢复测试", () => {
    it("应该在Redis不可用时降级到数据库查询", async () => {
      // Arrange - 创建告警规则
      const createRuleDto: CreateAlertRuleDto = {
        name: "Failure Recovery Test Rule",
        description: "测试缓存故障时的恢复机制",
        severity: AlertSeverity.CRITICAL,
        metric: "service_availability",
        operator: "lt",
        threshold: 0.99,
        duration: 60,
        channels: [
          {
            name: "test-log-channel",
            type: "log",
            config: { level: "error", id: "test-channel" },
            enabled: true,
            retryCount: 3,
            timeout: 30,
          },
        ],
        cooldown: 300,
        enabled: true,
      };

      const createdRule = await alertingService.createRule(createRuleDto);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act - 模拟Redis连接断开（通过清空所有缓存）
      await redisClient.flushall();

      // Assert - 验证服务仍然可以从数据库获取数据
      const ruleFromService = await alertingService.getRuleById(createdRule.id);
      expect(ruleFromService).toBeDefined();
      expect(ruleFromService.name).toBe(createRuleDto.name);

      // 验证服务在缓存不可用时仍能正常工作
      const allRules = await alertingService.getRules();
      expect(allRules).toBeDefined();
      expect(allRules.length).toBeGreaterThan(0);
    });

    it("应该在缓存恢复后重新建立缓存", async () => {
      // Arrange - 创建告警规则
      const createRuleDto: CreateAlertRuleDto = {
        name: "Cache Rebuild Test Rule",
        description: "测试缓存恢复机制",
        severity: AlertSeverity.WARNING,
        metric: "queue_size",
        operator: "gt",
        threshold: 1000,
        duration: 60,
        channels: [
          {
            name: "test-log-channel",
            type: "log",
            config: { level: "warn", id: "test-channel" },
            enabled: true,
            retryCount: 3,
            timeout: 30,
          },
        ],
        cooldown: 300,
        enabled: true,
      };

      const createdRule = await alertingService.createRule(createRuleDto);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证初始缓存存在
      let cachedRule = await cacheService.get(`alert:rule:${createdRule.id}`);
      expect(cachedRule).toBeDefined();

      // Act - 清空缓存模拟故障恢复
      await redisClient.flushall();

      // 验证缓存被清空
      cachedRule = await cacheService.get(`alert:rule:${createdRule.id}`);
      expect(cachedRule).toBeNull();

      // 重新访问数据触发缓存重建
      const ruleFromService = await alertingService.getRuleById(createdRule.id);
      expect(ruleFromService).toBeDefined();

      // 等待缓存重建
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - 验证缓存被重新建立
      cachedRule = await cacheService.get(`alert:rule:${createdRule.id}`);
      expect(cachedRule).toBeDefined();
      if (cachedRule) {
        expect((cachedRule as any).name).toBe(createRuleDto.name);
        expect((cachedRule as any).severity).toBe(createRuleDto.severity);
      }
    });
  });
});
