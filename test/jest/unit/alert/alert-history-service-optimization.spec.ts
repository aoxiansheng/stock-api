import { Test, TestingModule } from "@nestjs/testing";
import { AlertHistoryService } from "../../../../src/alert/services/alert-history.service";
import { AlertHistoryRepository } from "../../../../src/alert/repositories/alert-history.repository";
import { CacheService } from "../../../../src/cache/cache.service";
import {
  AlertStatus,
  AlertSeverity,
} from "../../../../src/alert/types/alert.types";
import {
  ALERT_HISTORY_OPERATIONS,
  ALERT_HISTORY_MESSAGES,
  ALERT_HISTORY_CONFIG,
  ALERT_HISTORY_DEFAULT_STATS,
  AlertHistoryUtil,
} from "../../../../src/alert/constants/alert-history.constants";
import { IAlertQuery, IAlert } from "../../../../src/alert/interfaces";

describe("AlertHistoryService Optimization Features", () => {
  let service: AlertHistoryService;
  let alertHistoryRepository: jest.Mocked<AlertHistoryRepository>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _cacheService: CacheService;

  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockAlertHistoryRepository = {
      create: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn(),
    };

    const mockCacheService = {
      getClient: jest.fn().mockReturnValue({
        keys: jest.fn().mockResolvedValue([]),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue("OK"),
        ts: {
          add: jest.fn().mockResolvedValue(1),
          revrange: jest.fn().mockResolvedValue([]),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertHistoryService,
        {
          provide: AlertHistoryRepository,
          useValue: mockAlertHistoryRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AlertHistoryService>(AlertHistoryService);
    alertHistoryRepository = module.get(AlertHistoryRepository);
    _cacheService = module.get(CacheService);

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
      expect(ALERT_HISTORY_OPERATIONS.CREATE_ALERT).toBe("createAlert");
      expect(ALERT_HISTORY_OPERATIONS.UPDATE_ALERT_STATUS).toBe(
        "updateAlertStatus",
      );
      expect(ALERT_HISTORY_OPERATIONS.QUERY_ALERTS).toBe("queryAlerts");
      expect(ALERT_HISTORY_OPERATIONS.GET_ACTIVE_ALERTS).toBe(
        "getActiveAlerts",
      );
    });

    it("should use message constants for logging", () => {
      expect(ALERT_HISTORY_MESSAGES.ALERT_CREATED).toBe("创建告警记录成功");
      expect(ALERT_HISTORY_MESSAGES.ALERT_STATUS_UPDATED).toBe(
        "更新告警状态成功",
      );
      expect(ALERT_HISTORY_MESSAGES.CLEANUP_COMPLETED).toBe("清理过期告警成功");
      expect(ALERT_HISTORY_MESSAGES.BATCH_UPDATE_COMPLETED).toBe(
        "批量更新告警状态完成",
      );
    });

    it("should use config constants for default values", () => {
      expect(ALERT_HISTORY_CONFIG.ALERT_ID_PREFIX).toBe("alrt_");
      expect(ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS).toBe(90);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_PAGE_LIMIT).toBe(20);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_RECENT_ALERTS_LIMIT).toBe(10);
    });

    it("should use default stats constants", () => {
      expect(ALERT_HISTORY_DEFAULT_STATS.activeAlerts).toBe(0);
      expect(ALERT_HISTORY_DEFAULT_STATS.criticalAlerts).toBe(0);
      expect(ALERT_HISTORY_DEFAULT_STATS.averageResolutionTime).toBe(0);
    });
  });

  describe("Enhanced Alert Creation", () => {
    it("should use constants for alert creation start logging", async () => {
      const alertData = {
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: "CPU usage is high",
      };

      alertHistoryRepository.create.mockResolvedValue({
        id: "alrt_123",
        ...alertData,
        startTime: new Date(),
        status: AlertStatus.FIRING,
      } as any);

      await service.createAlert(alertData);

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.ALERT_CREATION_STARTED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.CREATE_ALERT,
          ruleId: "rule_123",
          severity: AlertSeverity.CRITICAL,
        }),
      );
    });

    it("should use utility for alert ID generation", async () => {
      const alertData = {
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: "CPU usage is high",
      };

      alertHistoryRepository.create.mockImplementation((data) => {
        expect(data.id).toMatch(/^alrt_[a-z0-9]+_[a-z0-9]{6}$/);
        return Promise.resolve({ ...data } as any);
      });

      await service.createAlert(alertData);
    });

    it("should use constants for successful creation logging", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();
      const alertData = {
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: "CPU usage is high",
      };

      alertHistoryRepository.create.mockResolvedValue({
        id: "alrt_123",
        ...alertData,
        startTime: new Date(),
        status: AlertStatus.FIRING,
      } as any);

      await service.createAlert(alertData);

      expect(logSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.ALERT_CREATED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.CREATE_ALERT,
          alertId: expect.stringMatching(/^alrt_[a-z0-9]+_[a-z0-9]{6}$/),
          ruleId: "rule_123",
          severity: AlertSeverity.CRITICAL,
        }),
      );
    });
  });

  describe("Enhanced Alert Status Update", () => {
    it("should use constants for status update start logging", async () => {
      alertHistoryRepository.update.mockResolvedValue({
        id: "alrt_123",
        status: AlertStatus.ACKNOWLEDGED,
      } as any);
      const updateDto = {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: "user_123",
      };
      await service.updateAlertStatus(
        "alrt_123",
        updateDto.status,
        updateDto.acknowledgedBy,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.ALERT_STATUS_UPDATE_STARTED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.UPDATE_ALERT_STATUS,
          alertId: "alrt_123",
          status: AlertStatus.ACKNOWLEDGED,
          updatedBy: "user_123",
        }),
      );
    });

    it("should use constants for successful update logging", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();

      alertHistoryRepository.update.mockResolvedValue({
        id: "alrt_123",
        status: AlertStatus.RESOLVED,
      } as any);

      const updateDto = {
        status: AlertStatus.RESOLVED,
        resolvedBy: "user_123",
      };
      await service.updateAlertStatus(
        "alrt_123",
        updateDto.status,
        updateDto.resolvedBy,
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.ALERT_STATUS_UPDATED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.UPDATE_ALERT_STATUS,
          alertId: "alrt_123",
          status: AlertStatus.RESOLVED,
          updatedBy: "user_123",
        }),
      );
    });
  });

  describe("Enhanced Alert Query", () => {
    it("should use constants and utility for query processing", async () => {
      const query: IAlertQuery = { page: 1, limit: 20 };
      const mockAlerts: IAlert[] = [
        {
          id: "alrt_1",
          severity: AlertSeverity.CRITICAL,
          ruleId: "r1",
          ruleName: "rule1",
          metric: "cpu",
          value: 90,
          threshold: 80,
          status: AlertStatus.FIRING,
          startTime: new Date(),
          message: "high cpu",
        },
        {
          id: "alrt_2",
          severity: AlertSeverity.WARNING,
          ruleId: "r2",
          ruleName: "rule2",
          metric: "mem",
          value: 85,
          threshold: 80,
          status: AlertStatus.FIRING,
          startTime: new Date(),
          message: "high mem",
        },
      ];

      alertHistoryRepository.find.mockResolvedValue({
        alerts: mockAlerts,
        total: 2,
      });

      const result = await service.queryAlerts(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.ALERTS_QUERY_STARTED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.QUERY_ALERTS,
          queryParams: query,
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.ALERTS_QUERIED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.QUERY_ALERTS,
          total: 2,
          page: 1,
          limit: 20,
          alertsCount: 2,
        }),
      );

      expect(result).toHaveProperty("alerts", mockAlerts);
      expect(result).toHaveProperty("total", 2);
      expect(result).toHaveProperty("hasNext", false);
      expect(result).toHaveProperty("hasPrev", false);
    });
  });

  describe("Enhanced Cleanup Operation", () => {
    it("should use constants and validation for cleanup", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();

      alertHistoryRepository.cleanup.mockResolvedValue(50);

      const result = await service.cleanupExpiredAlerts(30);

      expect(logSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.CLEANUP_STARTED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.CLEANUP_EXPIRED_ALERTS,
          daysToKeep: 30,
        }),
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.CLEANUP_COMPLETED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.CLEANUP_EXPIRED_ALERTS,
          daysToKeep: 30,
          deletedCount: 50,
        }),
      );

      expect(result.deletedCount).toBe(50);
      expect(result).toHaveProperty("executionTime");
      expect(result).toHaveProperty("startTime");
      expect(result).toHaveProperty("endTime");
    });

    it("should use default cleanup days from config", async () => {
      alertHistoryRepository.cleanup.mockResolvedValue(10);
      await service.cleanupExpiredAlerts();
      expect(alertHistoryRepository.cleanup).toHaveBeenCalledWith(
        ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS,
      );
    });
  });

  describe("Enhanced Batch Operations", () => {
    it("should use constants and validation for batch updates", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();
      const alertIds = ["alrt_1", "alrt_2", "alrt_3"];

      // Mock successful updates
      alertHistoryRepository.update.mockResolvedValue({ id: "alrt_1" } as any);

      const result = await service.batchUpdateAlertStatus(
        alertIds,
        AlertStatus.RESOLVED,
        "user_123",
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.BATCH_UPDATE_STARTED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.BATCH_UPDATE_ALERT_STATUS,
          alertIdsCount: 3,
          status: AlertStatus.RESOLVED,
          updatedBy: "user_123",
        }),
      );

      expect(logSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.BATCH_UPDATE_COMPLETED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.BATCH_UPDATE_ALERT_STATUS,
          successCount: 3,
          failedCount: 0,
        }),
      );

      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should validate batch size limits", async () => {
      const largeAlertIds = Array.from({ length: 1001 }, (_, i) => `alrt_${i}`);

      await expect(
        service.batchUpdateAlertStatus(largeAlertIds, AlertStatus.RESOLVED),
      ).rejects.toThrow("批量大小超出限制");
    });
  });

  describe("Enhanced Service Stats", () => {
    it("should use constants for service stats", () => {
      const stats = service.getServiceStats();

      expect(loggerSpy).toHaveBeenCalledWith(
        ALERT_HISTORY_MESSAGES.SERVICE_STATS_REQUESTED,
        expect.objectContaining({
          operation: ALERT_HISTORY_OPERATIONS.GET_SERVICE_STATS,
        }),
      );

      expect(stats.defaultCleanupDays).toBe(
        ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS,
      );
      expect(stats.idPrefixFormat).toBe(
        ALERT_HISTORY_CONFIG.ID_FORMAT_TEMPLATE,
      );
      expect(stats.maxBatchUpdateSize).toBe(
        ALERT_HISTORY_CONFIG.BATCH_UPDATE_LIMIT,
      );
    });
  });

  describe("Utility Functions", () => {
    it("should generate valid alert IDs", () => {
      const alertId = AlertHistoryUtil.generateAlertId();
      expect(alertId).toMatch(/^alrt_[a-z0-9]+_[a-z0-9]{6}$/);
      expect(AlertHistoryUtil.isValidAlertId(alertId)).toBe(true);
    });

    it("should validate pagination parameters correctly", () => {
      const validResult = AlertHistoryUtil.validatePaginationParams(1, 20);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual([]);

      const invalidResult = AlertHistoryUtil.validatePaginationParams(0, 200);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it("should validate cleanup days correctly", () => {
      expect(AlertHistoryUtil.isValidCleanupDays(30)).toBe(true);
      expect(AlertHistoryUtil.isValidCleanupDays(90)).toBe(true);
      expect(AlertHistoryUtil.isValidCleanupDays(0)).toBe(false);
      expect(AlertHistoryUtil.isValidCleanupDays(400)).toBe(false);
    });

    it("should calculate pagination correctly", () => {
      const pagination = AlertHistoryUtil.calculatePagination(100, 2, 20);

      expect(pagination.total).toBe(100);
      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(20);
      expect(pagination.totalPages).toBe(5);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(true);
      expect(pagination.offset).toBe(20);
    });

    it("should generate batch result summary correctly", () => {
      const summary = AlertHistoryUtil.generateBatchResultSummary(8, 2, [
        "error1",
        "error2",
      ]);

      expect(summary.totalProcessed).toBe(10);
      expect(summary.successRate).toBe(80);
      expect(summary.hasErrors).toBe(true);
      expect(summary.errorSummary).toBe("2 个错误");
    });

    it("should format statistics correctly", () => {
      const rawStats = {
        activeAlerts: 5,
        criticalAlerts: 2,
      };

      const formatted = AlertHistoryUtil.formatStatistics(rawStats);

      expect(formatted.activeAlerts).toBe(5);
      expect(formatted.criticalAlerts).toBe(2);
      expect(formatted.warningAlerts).toBe(0); // from defaults
      expect(formatted).toHaveProperty("statisticsTime");
    });
  });
});
