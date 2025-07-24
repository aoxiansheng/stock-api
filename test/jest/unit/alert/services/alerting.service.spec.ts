import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Model } from "mongoose";
import { NotFoundException } from "@nestjs/common";

import { AlertingService } from "../../../../../src/alert/services/alerting.service";
import { RuleEngineService } from "../../../../../src/alert/services/rule-engine.service";
import { NotificationService } from "../../../../../src/alert/services/notification.service";
import { AlertHistoryService } from "../../../../../src/alert/services/alert-history.service";
import { AlertRuleRepository } from "../../../../../src/alert/repositories/alert-rule.repository";
import {
  AlertRule,
  AlertRuleDocument,
} from "../../../../../src/alert/schemas/alert-rule.schema";
import { CacheService } from "../../../../../src/cache/cache.service";
import { IAlertRule, IAlert } from "../../../../../src/alert/interfaces";
import {
  AlertSeverity,
  AlertStatus,
} from "../../../../../src/alert/types/alert.types";
import { ConfigService } from "@nestjs/config";

describe("AlertingService", () => {
  let service: AlertingService;
  let ruleEngineService: jest.Mocked<RuleEngineService>;
  let notificationService: jest.Mocked<NotificationService>;
  let alertHistoryService: jest.Mocked<AlertHistoryService>;
  let alertRuleRepository: jest.Mocked<AlertRuleRepository>;
  let alertRuleModel: jest.Mocked<Model<AlertRuleDocument>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockRule: IAlertRule = {
    id: "test-rule",
    name: "Test Rule",
    metric: "test.metric",
    operator: "gt",
    threshold: 100,
    duration: 60,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [
      {
        id: "channel-1",
        name: "Test Channel",
        type: "log",
        config: { level: "warn" },
        enabled: true,
      },
    ],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAlert: IAlert = {
    id: "test-alert",
    ruleId: "test-rule",
    ruleName: "Test Rule",
    metric: "test.metric",
    value: 120,
    threshold: 100,
    severity: AlertSeverity.WARNING,
    status: AlertStatus.FIRING,
    message: "Test alert message",
    startTime: new Date(),
  };

  beforeEach(async () => {
    const mockAlertRuleModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      save: jest.fn(),
      exec: jest.fn(),
    };

    const mockRuleEngineService = {
      evaluateRule: jest.fn(),
      evaluateRules: jest.fn(),
      isInCooldown: jest.fn(),
      setCooldown: jest.fn(),
      validateRule: jest.fn(),
    };

    const mockNotificationService = {
      sendBatchNotifications: jest.fn(),
      sendNotification: jest.fn(),
      testChannel: jest.fn(),
    };

    const mockAlertHistoryService = {
      createAlert: jest.fn(),
      updateAlertStatus: jest.fn(),
      getActiveAlerts: jest.fn(),
      getAlertStats: jest.fn(),
      queryAlerts: jest.fn(),
      getAlertById: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockAlertRuleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllEnabled: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      toggle: jest.fn(),
      countAll: jest.fn(),
      countEnabled: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      getOrSet: jest.fn(),
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
          provide: getModelToken(AlertRule.name),
          useValue: mockAlertRuleModel,
        },
        { provide: AlertRuleRepository, useValue: mockAlertRuleRepository },
        { provide: RuleEngineService, useValue: mockRuleEngineService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AlertHistoryService, useValue: mockAlertHistoryService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
    alertRuleRepository = module.get(AlertRuleRepository);
    alertRuleModel = module.get(getModelToken(AlertRule.name));
    ruleEngineService = module.get(RuleEngineService);
    notificationService = module.get(NotificationService);
    alertHistoryService = module.get(AlertHistoryService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Rule Management", () => {
    it("should create a new alert rule", async () => {
      // Arrange
      const createRuleDto = {
        name: "Test Rule",
        metric: "test.metric",
        operator: "gt" as const,
        threshold: 100,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      };

      ruleEngineService.validateRule.mockReturnValue({
        valid: true,
        errors: [],
      });
      alertRuleRepository.create.mockResolvedValue(mockRule);

      // Act
      const result = await service.createRule(createRuleDto);

      // Assert
      expect(ruleEngineService.validateRule).toHaveBeenCalled();
      expect(alertRuleRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockRule);
    });

    it("should get all alert rules", async () => {
      // Arrange
      alertRuleRepository.findAll.mockResolvedValue([mockRule]);

      // Act
      const result = await service.getRules();

      // Assert
      expect(alertRuleRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockRule]);
    });

    it("should update an alert rule", async () => {
      // Arrange
      const updateDto = { name: "Updated Rule" };
      const updatedRule = { ...mockRule, name: "Updated Rule" };
      alertRuleRepository.update.mockResolvedValue(updatedRule);

      // Act
      const result = await service.updateRule("test-rule", updateDto);

      // Assert
      expect(alertRuleRepository.update).toHaveBeenCalledWith(
        "test-rule",
        updateDto,
      );
      expect(result).toEqual(updatedRule);
    });

    it("should delete an alert rule", async () => {
      // Arrange
      alertRuleRepository.delete.mockResolvedValue(true);

      // Act
      const result = await service.deleteRule("test-rule");

      // Assert
      expect(alertRuleRepository.delete).toHaveBeenCalledWith("test-rule");
      expect(result).toBe(true);
    });
  });

  describe("Alert Management", () => {
    it("should acknowledge an alert", async () => {
      // Arrange
      const acknowledgedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
      };
      alertHistoryService.updateAlertStatus.mockResolvedValue(
        acknowledgedAlert,
      );
      alertHistoryService.getAlertById.mockResolvedValue(acknowledgedAlert); // 修复：添加模拟

      // Act
      const result = await service.acknowledgeAlert("test-alert", "test-user");

      // Assert
      expect(alertHistoryService.updateAlertStatus).toHaveBeenCalledWith(
        "test-alert",
        AlertStatus.ACKNOWLEDGED,
        "test-user",
      );
      expect(result).toEqual(acknowledgedAlert); // 修复：更新断言
    });

    it("should resolve an alert", async () => {
      // Arrange
      const resolvedAlert = { ...mockAlert, status: AlertStatus.RESOLVED };
      alertHistoryService.updateAlertStatus.mockResolvedValue(resolvedAlert);

      // Act
      const result = await service.resolveAlert(
        "test-alert",
        "test-user",
        "test-rule-id",
      );

      // Assert
      expect(alertHistoryService.updateAlertStatus).toHaveBeenCalledWith(
        "test-alert",
        AlertStatus.RESOLVED,
        "test-user",
      );
      expect(result).toBe(true);
    });
  });

  describe("Statistics", () => {
    it("should get alert statistics", async () => {
      // Arrange
      const mockHistoryStats = {
        totalRules: 0,
        enabledRules: 0,
        activeAlerts: 1,
        criticalAlerts: 0,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 1,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
        statisticsTime: new Date(),
      };

      alertHistoryService.getAlertStats.mockResolvedValue(mockHistoryStats);
      alertRuleRepository.countAll.mockResolvedValue(5);
      alertRuleRepository.countEnabled.mockResolvedValue(3);

      // Act
      const result = await service.getStats();

      // Assert
      expect(alertHistoryService.getAlertStats).toHaveBeenCalled();
      expect(alertRuleRepository.countAll).toHaveBeenCalled();
      expect(alertRuleRepository.countEnabled).toHaveBeenCalled();
      expect(result.totalRules).toBe(5);
      expect(result.enabledRules).toBe(3);
    });
  });

  describe("Metric Processing", () => {
    it("should process metrics and evaluate rules", async () => {
      // Arrange
      const metricData = [
        {
          metric: "test.metric",
          value: 120,
          timestamp: new Date(),
        },
      ];

      const evaluationResult = {
        ruleId: "test-rule",
        triggered: true,
        value: 120,
        threshold: 100,
        message: "Alert triggered",
        evaluatedAt: new Date(),
      };

      alertRuleRepository.findAllEnabled.mockResolvedValue([mockRule]);
      ruleEngineService.evaluateRules.mockReturnValue([evaluationResult]);
      ruleEngineService.isInCooldown.mockResolvedValue(false);
      alertHistoryService.createAlert.mockResolvedValue(mockAlert);

      // Act
      await service.processMetrics(metricData);

      // Assert
      expect(alertRuleRepository.findAllEnabled).toHaveBeenCalled();
      expect(ruleEngineService.evaluateRules).toHaveBeenCalledWith(
        [mockRule],
        metricData,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle rule creation validation errors", async () => {
      const createRuleDto = {
        name: "Invalid Rule",
        metric: "test.metric",
        operator: "gt" as const,
        threshold: 100,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      };

      ruleEngineService.validateRule.mockReturnValue({
        valid: false,
        errors: ["Threshold must be positive"],
      });

      await expect(service.createRule(createRuleDto)).rejects.toThrow();
      expect(ruleEngineService.validateRule).toHaveBeenCalled();
      expect(alertRuleRepository.create).not.toHaveBeenCalled();
    });

    it("should handle database errors during rule creation", async () => {
      const createRuleDto = {
        name: "Test Rule",
        metric: "test.metric",
        operator: "gt" as const,
        threshold: 100,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      };

      ruleEngineService.validateRule.mockReturnValue({
        valid: true,
        errors: [],
      });
      alertRuleRepository.create.mockRejectedValue(new Error("Database error"));

      await expect(service.createRule(createRuleDto)).rejects.toThrow(
        "Database error",
      );
    });

    it("should handle errors during rule update", async () => {
      const updateDto = { name: "Updated Rule" };
      alertRuleRepository.update.mockRejectedValue(new Error("Update failed"));

      await expect(service.updateRule("test-rule", updateDto)).rejects.toThrow(
        "Update failed",
      );
    });

    it("should handle errors during rule deletion", async () => {
      alertRuleRepository.delete.mockRejectedValue(new Error("Delete failed"));

      await expect(service.deleteRule("test-rule")).rejects.toThrow(
        "Delete failed",
      );
    });

    it("should handle errors during stats retrieval", async () => {
      alertHistoryService.getAlertStats.mockRejectedValue(
        new Error("Stats error"),
      );

      await expect(service.getStats()).rejects.toThrow("Stats error");
    });

    it("should handle errors during rule retrieval", async () => {
      alertRuleRepository.findAll.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.getRules()).rejects.toThrow("Database error");
    });
  });

  describe("Module Initialization", () => {
    it("should initialize successfully and load active alerts", async () => {
      alertHistoryService.getActiveAlerts.mockResolvedValue([mockAlert]);

      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(alertHistoryService.getActiveAlerts).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      alertHistoryService.getActiveAlerts.mockRejectedValue(
        new Error("Init failed"),
      );

      await expect(service.onModuleInit()).rejects.toThrow("Init failed");
    });
  });

  describe("Alert Processing", () => {
    it("should skip alerts in cooldown period", async () => {
      const metricData = [
        {
          metric: "test.metric",
          value: 120,
          timestamp: new Date(),
        },
      ];

      const evaluationResult = {
        ruleId: "test-rule",
        triggered: true,
        value: 120,
        threshold: 100,
        message: "Alert triggered",
        evaluatedAt: new Date(),
      };

      alertRuleRepository.findAllEnabled.mockResolvedValue([mockRule]);
      ruleEngineService.evaluateRules.mockReturnValue([evaluationResult]);
      ruleEngineService.isInCooldown.mockResolvedValue(true); // In cooldown

      await service.processMetrics(metricData);

      expect(alertHistoryService.createAlert).not.toHaveBeenCalled();
    });

    it("should handle metric processing errors gracefully", async () => {
      const metricData = [
        {
          metric: "test.metric",
          value: 120,
          timestamp: new Date(),
        },
      ];

      alertRuleRepository.findAllEnabled.mockRejectedValue(
        new Error("Rule fetch failed"),
      );

      await expect(service.processMetrics(metricData)).rejects.toThrow(
        "Rule fetch failed",
      );
    });
  });

  describe("Alert Resolution", () => {
    it("should handle alert not found during acknowledgment", async () => {
      // 模拟底层服务在找不到告警时抛出异常
      alertHistoryService.updateAlertStatus.mockRejectedValue(
        new NotFoundException("Alert not found"),
      );

      await expect(
        service.acknowledgeAlert("non-existent-alert", "test-user"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should handle alert not found during resolution", async () => {
      // 模拟底层服务在找不到告警时抛出异常
      alertHistoryService.updateAlertStatus.mockRejectedValue(
        new NotFoundException("Alert not found"),
      );

      await expect(
        service.resolveAlert("non-existent-alert", "test-user", "test-rule"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should handle errors during alert acknowledgment", async () => {
      alertHistoryService.updateAlertStatus.mockRejectedValue(
        new Error("Update failed"),
      );

      await expect(
        service.acknowledgeAlert("test-alert", "test-user"),
      ).rejects.toThrow("Update failed");
    });

    it("should handle errors during alert resolution", async () => {
      alertHistoryService.updateAlertStatus.mockRejectedValue(
        new Error("Update failed"),
      );

      await expect(
        service.resolveAlert("test-alert", "test-user", "test-rule"),
      ).rejects.toThrow("Update failed");
    });
  });

  // Batch Operations removed - method doesn't exist in actual service

  // Cron Jobs removed - handlePeriodicEvaluation method doesn't exist

  describe("Rule Validation", () => {
    it("should validate rule before creation", async () => {
      const createRuleDto = {
        name: "Test Rule",
        metric: "test.metric",
        operator: "gt" as const,
        threshold: 100,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      };

      ruleEngineService.validateRule.mockReturnValue({
        valid: true,
        errors: [],
      });
      alertRuleRepository.create.mockResolvedValue(mockRule);

      await service.createRule(createRuleDto);

      expect(ruleEngineService.validateRule).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createRuleDto,
          id: expect.any(String),
        }),
      );
    });
  });

  describe("Toggle Operations", () => {
    it("should toggle rule enabled status", async () => {
      alertRuleRepository.toggle.mockResolvedValue(true);

      const result = await service.toggleRule("test-rule", false);

      expect(alertRuleRepository.toggle).toHaveBeenCalledWith(
        "test-rule",
        false,
      );
      expect(result).toBe(true);
    });

    it("should handle toggle errors", async () => {
      alertRuleRepository.toggle.mockRejectedValue(new Error("Toggle failed"));

      await expect(service.toggleRule("test-rule", true)).rejects.toThrow(
        "Toggle failed",
      );
    });
  });

  describe("Event Emission", () => {
    it("should emit events for alert creation", async () => {
      const metricData = [
        {
          metric: "test.metric",
          value: 120,
          timestamp: new Date(),
        },
      ];

      const evaluationResult = {
        ruleId: "test-rule",
        triggered: true,
        value: 120,
        threshold: 100,
        message: "Alert triggered",
        evaluatedAt: new Date(),
      };

      alertRuleRepository.findAllEnabled.mockResolvedValue([mockRule]);
      ruleEngineService.evaluateRules.mockReturnValue([evaluationResult]);
      ruleEngineService.isInCooldown.mockResolvedValue(false);
      alertHistoryService.createAlert.mockResolvedValue(mockAlert);

      await service.processMetrics(metricData);

      expect(notificationService.sendBatchNotifications).toHaveBeenCalled();
    });
  });
});
