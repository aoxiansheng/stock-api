/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { AlertingService } from "../../../../../src/alert/services/alerting.service";
import { AlertRuleRepository } from "../../../../../src/alert/repositories/alert-rule.repository";
import { RuleEngineService } from "../../../../../src/alert/services/rule-engine.service";
import { NotificationService } from "../../../../../src/alert/services/notification.service";
import { AlertHistoryService } from "../../../../../src/alert/services/alert-history.service";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from "../../../../../src/alert/dto";
import {
  IAlertRule,
  IMetricData,
  IRuleEvaluationResult,
} from "../../../../../src/alert/interfaces";
import {
  AlertStatus,
  AlertSeverity,
} from "../../../../../src/alert/types/alert.types";
import {
  ALERTING_MESSAGES,
  AlertingTemplateUtil,
} from "../../../../../src/alert/constants/alerting.constants";

describe("AlertingService", () => {
  let service: AlertingService;
  let alertRuleRepository: jest.Mocked<AlertRuleRepository>;
  let ruleEngine: jest.Mocked<RuleEngineService>;
  let notificationService: jest.Mocked<NotificationService>;
  let alertHistoryService: jest.Mocked<AlertHistoryService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const mockAlertRule: IAlertRule = {
    id: "rule-1",
    name: "Test Rule",
    metric: "cpu_usage",
    operator: "gt",
    threshold: 80,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: { env: "test" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAlert = {
    id: "alert-123",
    ruleId: "rule-abc",
    ruleName: "Test Rule", // 添加缺失的ruleName属性
    status: AlertStatus.FIRING,
    severity: AlertSeverity.CRITICAL,
    message: "Test Alert",
    value: 100,
    threshold: 90,
    metric: "cpu_usage",
    startTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertingService,
        {
          provide: AlertRuleRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            toggle: jest.fn(),
            _findAllEnabled: jest.fn(),
            countAll: jest.fn(),
            countEnabled: jest.fn(),
          },
        },
        {
          provide: RuleEngineService,
          useValue: {
            validateRule: jest.fn(),
            _evaluateRules: jest.fn(),
            isInCooldown: jest.fn(),
            _setCooldown: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendBatchNotifications: jest.fn(),
          },
        },
        {
          provide: AlertHistoryService,
          useValue: {
            createAlert: jest.fn(),
            _updateAlertStatus: jest.fn(),
            getAlertStats: jest.fn(),
            getActiveAlerts: jest.fn(),
            getAlertById: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              activeAlertPrefix: "active-alert",
              activeAlertTtlSeconds: 3600,
              cooldownPrefix: "cooldown:",
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
    alertRuleRepository = module.get(AlertRuleRepository);
    ruleEngine = module.get(RuleEngineService);
    notificationService = module.get(NotificationService);
    alertHistoryService = module.get(AlertHistoryService);
    cacheService = module.get(CacheService);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);

    // Mock logger to prevent console output during tests
    jest.spyOn((service as any).logger, "log").mockImplementation(() => {});
    jest.spyOn((service as any).logger, "debug").mockImplementation(() => {});
    jest.spyOn((service as any).logger, "warn").mockImplementation(() => {});
    jest.spyOn((service as any).logger, "error").mockImplementation(() => {});
  });

  describe("onModuleInit", () => {
    it("should load active alerts on module initialization", async () => {
      alertHistoryService.getActiveAlerts.mockResolvedValue([mockAlert]);
      cacheService.set.mockResolvedValue(true);
      await service.onModuleInit();
      expect(alertHistoryService.getActiveAlerts).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        `active-alert:${mockAlert.ruleId}`,
        mockAlert,
        { ttl: 3600 },
      );
    });

    it("should handle errors during loadActiveAlerts", async () => {
      alertHistoryService.getActiveAlerts.mockRejectedValue(
        new Error("DB error"),
      );
      await expect(service.onModuleInit()).rejects.toThrow("DB error");
    });
  });

  describe("createRule", () => {
    const createDto: CreateAlertRuleDto = {
      name: "New Rule",
      metric: "memory_usage",
      operator: "lt",
      threshold: 10,
      duration: 30,
      severity: AlertSeverity.INFO,
      enabled: true,
      channels: [],
      cooldown: 60,
      tags: { app: "backend" },
    };

    it("should create a rule successfully", async () => {
      ruleEngine.validateRule.mockReturnValue({ valid: true, errors: [] });
      alertRuleRepository.create.mockResolvedValue(mockAlertRule);
      jest
        .spyOn(AlertingTemplateUtil, "generateRuleId")
        .mockReturnValue("rule-1");

      const result = await service.createRule(createDto);
      expect(ruleEngine.validateRule).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Rule" }),
      );
      expect(alertRuleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Rule" }),
      );
      expect(result).toEqual(mockAlertRule);
    });

    it("should throw BadRequestException if rule validation fails", async () => {
      ruleEngine.validateRule.mockReturnValue({
        valid: false,
        errors: ["Invalid threshold"],
      });
      await expect(service.createRule(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw error if repository creation fails", async () => {
      ruleEngine.validateRule.mockReturnValue({ valid: true, errors: [] });
      alertRuleRepository.create.mockRejectedValue(new Error("DB error"));
      await expect(service.createRule(createDto)).rejects.toThrow("DB error");
    });
  });

  describe("updateRule", () => {
    const updateDto: UpdateAlertRuleDto = { enabled: false };

    it("should update a rule successfully", async () => {
      alertRuleRepository.update.mockResolvedValue({
        ...mockAlertRule,
        enabled: false,
      });
      const result = await service.updateRule("rule-1", updateDto);
      expect(alertRuleRepository.update).toHaveBeenCalledWith(
        "rule-1",
        updateDto,
      );
      expect(result.enabled).toBe(false);
    });

    it("should throw error if repository update fails", async () => {
      alertRuleRepository.update.mockRejectedValue(new Error("DB error"));
      await expect(service.updateRule("rule-1", updateDto)).rejects.toThrow(
        "DB error",
      );
    });
  });

  describe("deleteRule", () => {
    it("should delete a rule successfully", async () => {
      alertRuleRepository.delete.mockResolvedValue(true);
      const result = await service.deleteRule("rule-1");
      expect(alertRuleRepository.delete).toHaveBeenCalledWith("rule-1");
      expect(result).toBe(true);
    });

    it("should throw error if repository deletion fails", async () => {
      alertRuleRepository.delete.mockRejectedValue(new Error("DB error"));
      await expect(service.deleteRule("rule-1")).rejects.toThrow("DB error");
    });
  });

  describe("getRules", () => {
    it("should return all rules", async () => {
      alertRuleRepository.findAll.mockResolvedValue([mockAlertRule]);
      const result = await service.getRules();
      expect(alertRuleRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockAlertRule]);
    });

    it("should throw error if repository find fails", async () => {
      alertRuleRepository.findAll.mockRejectedValue(new Error("DB error"));
      await expect(service.getRules()).rejects.toThrow("DB error");
    });
  });

  describe("getRuleById", () => {
    it("should return a rule by ID", async () => {
      alertRuleRepository.findById.mockResolvedValue(mockAlertRule);
      const result = await service.getRuleById("rule-1");
      expect(alertRuleRepository.findById).toHaveBeenCalledWith("rule-1");
      expect(result).toEqual(mockAlertRule);
    });

    it("should throw NotFoundException if rule not found", async () => {
      alertRuleRepository.findById.mockResolvedValue(null);
      await expect(service.getRuleById("non-existent-rule")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw error if repository findById fails", async () => {
      alertRuleRepository.findById.mockRejectedValue(new Error("DB error"));
      await expect(service.getRuleById("rule-1")).rejects.toThrow("DB error");
    });
  });

  describe("toggleRule", () => {
    it("should toggle rule status successfully", async () => {
      alertRuleRepository.toggle.mockResolvedValue(true);
      const result = await service.toggleRule("rule-1", false);
      expect(alertRuleRepository.toggle).toHaveBeenCalledWith("rule-1", false);
      expect(result).toBe(true);
    });

    it("should throw error if repository toggle fails", async () => {
      alertRuleRepository.toggle.mockRejectedValue(new Error("DB error"));
      await expect(service.toggleRule("rule-1", true)).rejects.toThrow(
        "DB error",
      );
    });
  });

  describe("processMetrics", () => {
    const metricData: IMetricData[] = [
      { metric: "cpu_usage", value: 90, timestamp: new Date() },
    ];

    it("should do nothing if no metrics are provided", async () => {
      await service.processMetrics([]);
      expect(alertRuleRepository.findAllEnabled).not.toHaveBeenCalled();
    });

    it("should do nothing if no enabled rules are found", async () => {
      alertRuleRepository.findAllEnabled.mockResolvedValue([]);
      await service.processMetrics(metricData);
      expect(ruleEngine.evaluateRules).not.toHaveBeenCalled();
    });

    it("should process metrics and handle rule evaluation", async () => {
      alertRuleRepository.findAllEnabled.mockResolvedValue([mockAlertRule]);
      ruleEngine.evaluateRules.mockReturnValue([
        {
          ruleId: "rule-1",
          triggered: true,
          value: 90,
          threshold: 80,
          message: "Triggered",
          context: {},
          evaluatedAt: new Date(), // 添加evaluatedAt字段
        },
      ]);
      jest
        .spyOn(service as any, "handleRuleEvaluation")
        .mockResolvedValue(undefined);

      await service.processMetrics(metricData);
      expect(alertRuleRepository.findAllEnabled).toHaveBeenCalled();
      expect(ruleEngine.evaluateRules).toHaveBeenCalledWith(
        [mockAlertRule],
        metricData,
      );
      expect(service["handleRuleEvaluation"]).toHaveBeenCalled();
    });

    it("should throw error if rule evaluation fails", async () => {
      alertRuleRepository.findAllEnabled.mockResolvedValue([mockAlertRule]);
      ruleEngine.evaluateRules.mockImplementation(() => {
        throw new Error("Evaluation error");
      });
      await expect(service.processMetrics(metricData)).rejects.toThrow(
        "Evaluation error",
      );
    });
  });

  describe("acknowledgeAlert", () => {
    it("should acknowledge an alert successfully", async () => {
      alertHistoryService.updateAlertStatus.mockResolvedValue(mockAlert);
      alertHistoryService.getAlertById.mockResolvedValue(mockAlert);

      const result = await service.acknowledgeAlert("alert-1", "user1");
      expect(alertHistoryService.updateAlertStatus).toHaveBeenCalledWith(
        "alert-1",
        AlertStatus.ACKNOWLEDGED,
        "user1",
      );
      expect(result).toEqual(mockAlert);
    });

    it("should throw NotFoundException if alert not found after acknowledgment", async () => {
      alertHistoryService.updateAlertStatus.mockResolvedValue(mockAlert);
      alertHistoryService.getAlertById.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert("alert-1", "user1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw error if alert history update fails", async () => {
      alertHistoryService.updateAlertStatus.mockRejectedValue(
        new Error("DB error"),
      );
      await expect(
        service.acknowledgeAlert("alert-1", "user1"),
      ).rejects.toThrow("DB error");
    });
  });

  describe("resolveAlert", () => {
    it("should resolve an alert successfully", async () => {
      alertHistoryService.updateAlertStatus.mockResolvedValue(mockAlert);
      cacheService.del.mockResolvedValue(1);

      const result = await service.resolveAlert("alert-1", "user1", "rule-1");
      expect(alertHistoryService.updateAlertStatus).toHaveBeenCalledWith(
        "alert-1",
        AlertStatus.RESOLVED,
        "user1",
      );
      expect(cacheService.del).toHaveBeenCalledWith("active-alert:rule-1");
      expect(result).toBe(true);
    });

    it("should throw NotFoundException if alert not found for resolution", async () => {
      alertHistoryService.updateAlertStatus.mockResolvedValue(null);
      await expect(
        service.resolveAlert("non-existent-alert", "user1", "rule-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw error if alert history update fails", async () => {
      alertHistoryService.updateAlertStatus.mockRejectedValue(
        new Error("DB error"),
      );
      await expect(
        service.resolveAlert("alert-1", "user1", "rule-1"),
      ).rejects.toThrow("DB error");
    });
  });

  describe("getStats", () => {
    it("should return alert statistics", async () => {
      alertHistoryService.getAlertStats.mockResolvedValue({
        activeAlerts: 1,
        totalAlertsToday: 2,
        resolvedAlertsToday: 1,
        averageResolutionTime: 30,
        criticalAlerts: 1,
        warningAlerts: 0,
        infoAlerts: 0,
        statisticsTime: new Date(), // 添加statisticsTime字段
      });
      alertRuleRepository.countAll.mockResolvedValue(5);
      alertRuleRepository.countEnabled.mockResolvedValue(3);

      const result = await service.getStats();
      expect(result.activeAlerts).toBe(1);
      expect(result.totalRules).toBe(5);
      expect(result.enabledRules).toBe(3);
    });

    it("should handle errors during stats retrieval", async () => {
      alertHistoryService.getAlertStats.mockRejectedValue(
        new Error("Stats error"),
      );
      await expect(service.getStats()).rejects.toThrow("Stats error");
    });
  });

  describe("handleSystemEvent", () => {
    it("should process metrics if event converts to metric data", async () => {
      jest
        .spyOn(service as any, "convertEventToMetric")
        .mockReturnValue({ name: "test", value: 10, timestamp: new Date() });
      jest.spyOn(service, "processMetrics").mockResolvedValue(undefined);

      await service.handleSystemEvent({ type: "test.event" });
      expect(service["convertEventToMetric"]).toHaveBeenCalled();
      expect(service.processMetrics).toHaveBeenCalled();
    });

    it("should not process metrics if event does not convert to metric data", async () => {
      jest.spyOn(service as any, "convertEventToMetric").mockReturnValue(null);
      jest.spyOn(service, "processMetrics").mockResolvedValue(undefined);

      await service.handleSystemEvent({ type: "test.event" });
      expect(service["convertEventToMetric"]).toHaveBeenCalled();
      expect(service.processMetrics).not.toHaveBeenCalled();
    });

    it("should log error but not rethrow if processMetrics fails", async () => {
      jest
        .spyOn(service as any, "convertEventToMetric")
        .mockReturnValue({ name: "test", value: 10, timestamp: new Date() });
      jest
        .spyOn(service, "processMetrics")
        .mockRejectedValue(new Error("Process metrics error"));
      const errorSpy = jest.spyOn((service as any).logger, "error");

      await service.handleSystemEvent({ type: "test.event" });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("evaluateRulesScheduled", () => {
    it("should call processMetrics", async () => {
      jest.spyOn(service, "processMetrics").mockResolvedValue(undefined);
      await service.evaluateRulesScheduled();
      expect(service.processMetrics).toHaveBeenCalledWith([]);
    });

    it("should log error but not rethrow if processMetrics fails", async () => {
      jest
        .spyOn(service, "processMetrics")
        .mockRejectedValue(new Error("Scheduled evaluation error"));
      const errorSpy = jest.spyOn((service as any).logger, "error");

      await service.evaluateRulesScheduled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("handleRuleEvaluation (private)", () => {
    const rules = [mockAlertRule];

    it("should create new alert if rule triggered and not in cooldown", async () => {
      cacheService.get.mockResolvedValue(null); // No existing alert
      ruleEngine.isInCooldown.mockResolvedValue(false);
      jest.spyOn(service as any, "createNewAlert").mockResolvedValue(undefined);
      jest.spyOn(service as any, "resolveAlert").mockResolvedValue(undefined);

      const result: IRuleEvaluationResult = {
        ruleId: "rule-1",
        triggered: true,
        value: 90,
        threshold: 80,
        message: "Triggered",
        context: {},
        evaluatedAt: new Date(), // 添加evaluatedAt字段
      };
      await service["handleRuleEvaluation"](result, rules);

      expect(service["createNewAlert"]).toHaveBeenCalledWith(
        result,
        mockAlertRule,
      );
      expect(ruleEngine.setCooldown).toHaveBeenCalledWith("rule-1", 300);
      expect(service["resolveAlert"]).not.toHaveBeenCalled();
    });

    it("should resolve existing alert if rule not triggered but alert exists", async () => {
      cacheService.get.mockResolvedValue(mockAlert); // Existing alert
      jest.spyOn(service as any, "createNewAlert").mockResolvedValue(undefined);
      jest.spyOn(service as any, "resolveAlert").mockResolvedValue(true);

      const result: IRuleEvaluationResult = {
        ruleId: "rule-1",
        triggered: false,
        value: 70,
        threshold: 80,
        message: "Not Triggered",
        context: {},
        evaluatedAt: new Date(), // 添加evaluatedAt字段
      };
      await service["handleRuleEvaluation"](result, rules);

      expect(service["createNewAlert"]).not.toHaveBeenCalled();
      expect(service["resolveAlert"]).toHaveBeenCalledWith(
        mockAlert.id,
        "system",
        mockAlertRule.id,
      );
    });

    it("should do nothing if rule not triggered and no existing alert", async () => {
      cacheService.get.mockResolvedValue(null); // No existing alert
      jest.spyOn(service as any, "createNewAlert").mockResolvedValue(undefined);
      jest.spyOn(service as any, "resolveAlert").mockResolvedValue(undefined);

      const result: IRuleEvaluationResult = {
        ruleId: "rule-1",
        triggered: false,
        value: 70,
        threshold: 80,
        message: "Not Triggered",
        context: {},
        evaluatedAt: new Date(), // 添加evaluatedAt字段
      };
      await service["handleRuleEvaluation"](result, rules);

      expect(service["createNewAlert"]).not.toHaveBeenCalled();
      expect(service["resolveAlert"]).not.toHaveBeenCalled();
    });

    it("should do nothing if rule triggered but in cooldown", async () => {
      cacheService.get.mockResolvedValue(null); // No existing alert
      ruleEngine.isInCooldown.mockResolvedValue(true);
      jest.spyOn(service as any, "createNewAlert").mockResolvedValue(undefined);

      const result: IRuleEvaluationResult = {
        ruleId: "rule-1",
        triggered: true,
        value: 90,
        threshold: 80,
        message: "Triggered",
        context: {},
        evaluatedAt: new Date(), // 添加evaluatedAt字段
      };
      await service["handleRuleEvaluation"](result, rules);

      expect(service["createNewAlert"]).not.toHaveBeenCalled();
      expect(ruleEngine.setCooldown).not.toHaveBeenCalled();
    });
  });

  describe("createNewAlert (private)", () => {
    it("should create alert, cache it, and send notifications", async () => {
      alertHistoryService.createAlert.mockResolvedValue(mockAlert);
      cacheService.set.mockResolvedValue(true);
      notificationService.sendBatchNotifications.mockResolvedValue(undefined);

      await service["createNewAlert"](
        {
          ruleId: "rule-1",
          triggered: true,
          value: 90,
          threshold: 80,
          message: "Triggered",
          context: {},
          evaluatedAt: new Date(), // 添加evaluatedAt字段
        },
        mockAlertRule,
      );

      expect(alertHistoryService.createAlert).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        `active-alert:${mockAlert.ruleId}`,
        expect.objectContaining({ id: mockAlert.id }),
        { ttl: 3600 },
      );
      expect(notificationService.sendBatchNotifications).toHaveBeenCalled();
    });

    it("should throw error if alert creation fails", async () => {
      alertHistoryService.createAlert.mockRejectedValue(
        new Error("Alert creation failed"),
      );
      await expect(
        service["createNewAlert"](
          {
            ruleId: "rule-1",
            triggered: true,
            value: 90,
            threshold: 80,
            message: "Triggered",
            context: {},
            evaluatedAt: new Date(), // 添加evaluatedAt字段
          },
          mockAlertRule,
        ),
      ).rejects.toThrow("Alert creation failed");
    });

    it("should log error but not rethrow if cache set fails", async () => {
      alertHistoryService.createAlert.mockResolvedValue(mockAlert);
      cacheService.set.mockRejectedValue(new Error("Cache error"));
      notificationService.sendBatchNotifications.mockResolvedValue(undefined);
      const errorSpy = jest.spyOn((service as any).logger, "error");

      await service["createNewAlert"](
        {
          ruleId: "rule-1",
          triggered: true,
          value: 90,
          threshold: 80,
          message: "Triggered",
          context: {},
          evaluatedAt: new Date(), // 添加evaluatedAt字段
        },
        mockAlertRule,
      );
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should log error but not rethrow if notification fails", async () => {
      alertHistoryService.createAlert.mockResolvedValue(mockAlert);
      cacheService.set.mockResolvedValue(true);
      notificationService.sendBatchNotifications.mockRejectedValue(
        new Error("Notification error"),
      );
      const errorSpy = jest.spyOn((service as any).logger, "error");

      await service["createNewAlert"](
        {
          ruleId: "rule-1",
          triggered: true,
          value: 90,
          threshold: 80,
          message: "Triggered",
          context: {},
          evaluatedAt: new Date(), // 添加evaluatedAt字段
        },
        mockAlertRule,
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("loadActiveAlerts (private)", () => {
    it("should load active alerts into cache", async () => {
      alertHistoryService.getActiveAlerts.mockResolvedValue([mockAlert]);
      cacheService.set.mockResolvedValue(true);

      await service["loadActiveAlerts"]();
      expect(alertHistoryService.getActiveAlerts).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        `active-alert:${mockAlert.ruleId}`,
        mockAlert,
        { ttl: 3600 },
      );
    });

    it("should not set cache if no active alerts", async () => {
      alertHistoryService.getActiveAlerts.mockResolvedValue([]);
      await service["loadActiveAlerts"]();
      expect(alertHistoryService.getActiveAlerts).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it("should log error but not rethrow if cache set fails", async () => {
      alertHistoryService.getActiveAlerts.mockResolvedValue([mockAlert]);
      cacheService.set.mockRejectedValue(new Error("Cache error"));
      const errorSpy = jest.spyOn((service as any).logger, "log");

      await service["loadActiveAlerts"]();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("convertEventToMetric (private)", () => {
    it("should return null", () => {
      const result = service["convertEventToMetric"]();
      expect(result).toBeNull();
    });
  });
});
