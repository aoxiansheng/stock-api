import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AlertingService } from "../../../../src/alert/services/alerting.service";
import { AlertRuleRepository } from "../../../../src/alert/repositories/alert-rule.repository";
import { RuleEngineService } from "../../../../src/alert/services/rule-engine.service";
import { NotificationService } from "../../../../src/alert/services/notification.service";
import { AlertHistoryService } from "../../../../src/alert/services/alert-history.service";
import { CacheService } from "../../../../src/cache/cache.service";
import {
  ALERTING_OPERATIONS,
  ALERTING_MESSAGES,
  ALERTING_DEFAULT_STATS,
  AlertingTemplateUtil,
} from "../../../../src/alert/constants/alerting.constants";
import { CreateAlertRuleDto } from "../../../../src/alert/dto";
import { AlertSeverity } from "../../../../src/alert/types/alert.types";
import { AlertStatisticsDto } from "../../../../src/alert/dto/alert-history-internal.dto";
import { ConfigService } from "@nestjs/config";
import { AlertStatus } from "../../../../src/alert/types/alert.types";
import { IAlert } from "../../../../src/alert/interfaces";

describe("AlertingService Optimization Features", () => {
  let service: AlertingService;
  let alertRuleRepository: jest.Mocked<AlertRuleRepository>;
  let ruleEngine: jest.Mocked<RuleEngineService>;
  let notificationService: jest.Mocked<NotificationService>;
  let alertHistoryService: jest.Mocked<AlertHistoryService>;
  let cacheService: jest.Mocked<CacheService>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockAlertRuleRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      toggle: jest.fn(),
      findAllEnabled: jest.fn(),
      countAll: jest.fn(),
      countEnabled: jest.fn(),
    };

    const mockRuleEngine = {
      validateRule: jest.fn(),
      evaluateRules: jest.fn(),
    };

    const mockNotificationService = {
      sendAlert: jest.fn(),
    };

    const mockAlertHistoryService = {
      create: jest.fn(),
      update: jest.fn(),
      updateAlertStatus: jest.fn(),
      getAlertStats: jest.fn(),
      getAlertById: jest.fn(), // 修复：添加缺失的模拟函数
    };

    const mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      listPush: jest.fn(),
      listTrim: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "alert.cache") {
          return {
            activeAlertPrefix: "test_active_alert",
            activeAlertTtlSeconds: 3600,
            cooldownPrefix: "test_cooldown",
          };
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertingService,
        {
          provide: AlertRuleRepository,
          useValue: mockAlertRuleRepository,
        },
        {
          provide: RuleEngineService,
          useValue: mockRuleEngine,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: AlertHistoryService,
          useValue: mockAlertHistoryService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
    alertRuleRepository = module.get(AlertRuleRepository);
    ruleEngine = module.get(RuleEngineService);
    notificationService = module.get(NotificationService);
    alertHistoryService = module.get(AlertHistoryService);
    cacheService = module.get(CacheService);

    // Spy on logger
    loggerSpy = jest
      .spyOn((service as any).logger, "debug")
      .mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants Usage", () => {
    it("should use operation constants for all methods", () => {
      expect(ALERTING_OPERATIONS.CREATE_RULE).toBe("createRule");
      expect(ALERTING_OPERATIONS.UPDATE_RULE).toBe("updateRule");
      expect(ALERTING_OPERATIONS.DELETE_RULE).toBe("deleteRule");
      expect(ALERTING_OPERATIONS.PROCESS_METRICS).toBe("processMetrics");
    });

    it("should use message constants for logging", () => {
      expect(ALERTING_MESSAGES.SERVICE_INITIALIZED).toBe("告警服务初始化...");
      expect(ALERTING_MESSAGES.RULE_CREATED).toBe("告警规则创建成功");
      expect(ALERTING_MESSAGES.ALERT_ACKNOWLEDGED).toBe("告警已确认");
      expect(ALERTING_MESSAGES.ALERT_RESOLVED).toBe("告警已解决");
    });

    it("should use default stats constants", () => {
      expect(ALERTING_DEFAULT_STATS.activeAlerts).toBe(0);
      expect(ALERTING_DEFAULT_STATS.criticalAlerts).toBe(0);
      expect(ALERTING_DEFAULT_STATS.averageResolutionTime).toBe(0);
    });
  });

  describe("Enhanced Rule Creation", () => {
    it("should use constants for rule creation start logging", async () => {
      const createRuleDto: CreateAlertRuleDto = {
        name: "Test Rule",
        description: "Test Description",
        metric: "cpu_usage",
        threshold: 80,
        operator: "gt",
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 0,
        duration: 60,
      };

      ruleEngine.validateRule.mockReturnValue({ valid: true, errors: [] });
      alertRuleRepository.create.mockResolvedValue({
        id: "rule_123",
        ...createRuleDto,
      } as any);

      await service.createRule(createRuleDto);

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.RULE_CREATION_STARTED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.CREATE_RULE,
          ruleName: "Test Rule",
        }),
      );
    });

    it("should use template utility for validation error", async () => {
      const createRuleDto: CreateAlertRuleDto = {
        name: "Invalid Rule",
        description: "Test Description",
        metric: "cpu_usage",
        threshold: 80,
        operator: "gt",
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 0,
        duration: 60,
      };

      ruleEngine.validateRule.mockReturnValue({
        valid: false,
        errors: ["Invalid threshold", "Missing operator"],
      });

      await expect(service.createRule(createRuleDto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createRule(createRuleDto);
      } catch (error) {
        expect(error.message).toContain("规则验证失败");
        expect(error.message).toContain("Invalid threshold, Missing operator");
      }
    });

    it("should use constants for successful rule creation", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();
      const createRuleDto: CreateAlertRuleDto = {
        name: "Test Rule",
        description: "Test Description",
        metric: "cpu_usage",
        threshold: 80,
        operator: "gt",
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 0,
        duration: 60,
      };

      ruleEngine.validateRule.mockReturnValue({ valid: true, errors: [] });
      alertRuleRepository.create.mockResolvedValue({
        id: "rule_123",
        ...createRuleDto,
      } as any);

      await service.createRule(createRuleDto);

      expect(logSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.RULE_CREATED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.CREATE_RULE,
          ruleId: "rule_123",
          ruleName: "Test Rule",
        }),
      );
    });
  });

  describe("Enhanced Rule Management", () => {
    it("should use constants for rule update logging", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();
      const updateRuleDto = { name: "Updated Rule" };

      alertRuleRepository.update.mockResolvedValue({
        id: "rule_123",
        name: "Updated Rule",
      } as any);

      await service.updateRule("rule_123", updateRuleDto);

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.RULE_UPDATE_STARTED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.UPDATE_RULE,
          ruleId: "rule_123",
        }),
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.RULE_UPDATED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.UPDATE_RULE,
          ruleId: "rule_123",
          ruleName: "Updated Rule",
        }),
      );
    });

    it("should use constants for rule deletion logging", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();

      alertRuleRepository.delete.mockResolvedValue(true);

      await service.deleteRule("rule_123");

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.RULE_DELETION_STARTED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.DELETE_RULE,
          ruleId: "rule_123",
        }),
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.RULE_DELETED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.DELETE_RULE,
          ruleId: "rule_123",
        }),
      );
    });

    it("should use template utility for rule not found error", async () => {
      alertRuleRepository.findById.mockResolvedValue(null);

      await expect(service.getRuleById("nonexistent")).rejects.toThrow(
        NotFoundException,
      );

      try {
        await service.getRuleById("nonexistent");
      } catch (error) {
        expect(error.message).toContain("未找到ID为 nonexistent 的规则");
      }
    });
  });

  describe("Enhanced Alert Management", () => {
    it("should use constants for alert acknowledgment", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();
      const mockAlert: IAlert = {
        id: "alert_123",
        status: AlertStatus.ACKNOWLEDGED,
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu",
        value: 99,
        threshold: 90,
        severity: AlertSeverity.CRITICAL,
        startTime: new Date(),
        message: "CPU usage is critical",
      };

      alertHistoryService.updateAlertStatus.mockResolvedValue(mockAlert);
      alertHistoryService.getAlertById.mockResolvedValue(mockAlert);

      await service.acknowledgeAlert("alert_123", "user_123");

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.ALERT_ACKNOWLEDGMENT_STARTED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.ACKNOWLEDGE_ALERT,
          alertId: "alert_123",
          acknowledgedBy: "user_123",
        }),
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERTING_MESSAGES.ALERT_ACKNOWLEDGED,
        expect.objectContaining({
          operation: ALERTING_OPERATIONS.ACKNOWLEDGE_ALERT,
          alertId: "alert_123",
          acknowledgedBy: "user_123",
        }),
      );
    });

    it("should use template utility for alert not found error", async () => {
      alertHistoryService.updateAlertStatus.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert("nonexistent", "user_123"),
      ).rejects.toThrow(NotFoundException);

      try {
        await service.acknowledgeAlert("nonexistent", "user_123");
      } catch (error) {
        expect(error.message).toContain(
          "确认后未能找到ID为 nonexistent 的告警",
        ); // 修复：更新断言
      }
    });
  });

  describe("Statistics and Health Checks", () => {
    it("should use constants and call history service for stats", async () => {
      alertRuleRepository.countAll.mockResolvedValue(10);
      alertRuleRepository.countEnabled.mockResolvedValue(8);
      cacheService.get.mockResolvedValue(
        JSON.stringify({ critical: 2, warning: 3 }),
      );
      alertHistoryService.getAlertStats.mockResolvedValue({
        activeAlerts: 5,
        criticalAlerts: 2,
        warningAlerts: 3,
        infoAlerts: 0,
        totalAlertsToday: 20,
      } as AlertStatisticsDto);

      const stats = await service.getStats();

      expect(alertHistoryService.getAlertStats).toHaveBeenCalled();
      expect(stats.totalRules).toBe(10);
      expect(stats.enabledRules).toBe(8);
      expect(stats.criticalAlerts).toBe(2);
      expect(stats.warningAlerts).toBe(3);
      expect(stats.totalAlertsToday).toBe(20);
    });
  });

  describe("Utility Functions", () => {
    it("should generate valid rule IDs", () => {
      const ruleId = AlertingTemplateUtil.generateRuleId();
      expect(ruleId).toMatch(/^rule_[a-z0-9]+_[a-z0-9]{6}$/);
    });

    it("should generate error messages using templates", () => {
      const message = AlertingTemplateUtil.generateErrorMessage(
        "RULE_NOT_FOUND",
        {
          ruleId: "test_rule_123",
        },
      );

      expect(message).toBe("未找到ID为 test_rule_123 的规则");
    });

    it("should validate rule names correctly", () => {
      expect(AlertingTemplateUtil.isValidRuleName("Valid Rule Name")).toBe(
        true,
      );
      expect(AlertingTemplateUtil.isValidRuleName("Valid-Rule_Name.123")).toBe(
        true,
      );
      expect(AlertingTemplateUtil.isValidRuleName("Invalid@Rule#Name")).toBe(
        false,
      );
    });

    it("should validate metric names correctly", () => {
      expect(AlertingTemplateUtil.isValidMetricName("cpu_usage")).toBe(true);
      expect(AlertingTemplateUtil.isValidMetricName("memory.usage")).toBe(true);
      expect(AlertingTemplateUtil.isValidMetricName("disk-usage")).toBe(false);
    });

    it("should calculate priority scores correctly", () => {
      const score = AlertingTemplateUtil.calculatePriorityScore(
        "critical",
        100,
        80,
      );
      expect(score).toBeGreaterThan(100); // Should be > 100 due to threshold ratio

      const lowScore = AlertingTemplateUtil.calculatePriorityScore(
        "info",
        50,
        100,
      );
      expect(lowScore).toBeLessThan(50); // Should be < 50 for info level
    });
  });
});
