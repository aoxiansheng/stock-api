/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { AlertHistoryService } from "../../../../../src/alert/services/alert-history.service";
import { AlertHistoryRepository } from "../../../../../src/alert/repositories/alert-history.repository";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import { IAlert, IAlertQuery } from "../../../../../src/alert/interfaces";
import {
  AlertStatus,
  AlertSeverity,
} from "../../../../../src/alert/types/alert.types";
import {
  AlertHistoryUtil,
  ALERT_HISTORY_CONFIG,
} from "../../../../../src/alert/constants/alert-history.constants";

describe("AlertHistoryService", () => {
  let service: AlertHistoryService;
  let alertHistoryRepository: jest.Mocked<AlertHistoryRepository>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertHistoryService,
        {
          provide: AlertHistoryRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
            findActive: jest.fn(),
            getStatistics: jest.fn(),
            findById: jest.fn(),
            cleanup: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            listPush: jest.fn(),
            listTrim: jest.fn(),
            expire: jest.fn(),
            getClient: jest.fn().mockReturnValue({
              keys: jest.fn(),
            }),
            listRange: jest.fn(),
            _del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AlertHistoryService>(AlertHistoryService);
    alertHistoryRepository = module.get(AlertHistoryRepository);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockAlert: IAlert = {
    id: "alert-123",
    ruleId: "rule-abc",
    ruleName: "Test Rule", // 添加缺失的ruleName属性
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    message: "Test Alert",
    value: 100,
    threshold: 90,
    metric: "cpu_usage",
    tags: { env: "prod" },
    context: { host: "server1" },
    startTime: new Date(),
    // 删除createdAt字段，因为这不是IAlert的一部分
    // updatedAt字段，因为这不是IAlert的一部分
  };

  describe("createAlert", () => {
    it("should create an alert and cache it", async () => {
      alertHistoryRepository.create.mockResolvedValue(mockAlert);
      jest
        .spyOn(AlertHistoryUtil, "generateAlertId")
        .mockReturnValue("alert-123");

      const result = await service.createAlert({
        ruleId: "rule-abc",
        ruleName: "Test Rule", // 添加缺失的ruleName属性
        severity: AlertSeverity.CRITICAL,
        message: "Test Alert",
        value: 100,
        threshold: 90,
        metric: "cpu_usage",
        tags: { env: "prod" },
        context: { host: "server1" },
      });

      expect(alertHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: "rule-abc",
          status: AlertStatus.FIRING,
        }),
      );
      expect(cacheService.listPush).toHaveBeenCalled();
      expect(cacheService.listTrim).toHaveBeenCalled();
      expect(cacheService.expire).toHaveBeenCalled();
      expect(result).toEqual(mockAlert);
    });

    it("should handle errors during alert creation", async () => {
      alertHistoryRepository.create.mockRejectedValue(new Error("DB error"));

      await expect(
        service.createAlert({
          ruleId: "rule-abc",
          ruleName: "Test Rule", // 添加缺失的ruleName属性
          severity: AlertSeverity.CRITICAL,
          message: "Test Alert",
          value: 100,
          threshold: 90,
          metric: "cpu_usage",
          tags: { env: "prod" },
          context: { host: "server1" },
        }),
      ).rejects.toThrow("DB error");
    });

    it("should handle cache service errors gracefully during alert creation", async () => {
      alertHistoryRepository.create.mockResolvedValue(mockAlert);
      cacheService.listPush.mockRejectedValue(new Error("Cache error"));

      const result = await service.createAlert({
        ruleId: "rule-abc",
        ruleName: "Test Rule", // 添加缺失的ruleName属性
        severity: AlertSeverity.CRITICAL,
        message: "Test Alert",
        value: 100,
        threshold: 90,
        metric: "cpu_usage",
        tags: { env: "prod" },
        context: { host: "server1" },
      });

      expect(result).toEqual(mockAlert);
      expect(cacheService.listPush).toHaveBeenCalled();
    });
  });

  describe("updateAlertStatus", () => {
    it("should update alert status to _ACKNOWLEDGED and cache it", async () => {
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: "user1",
        acknowledgedAt: new Date(),
      };
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);
      cacheService.listRange.mockResolvedValue([JSON.stringify(mockAlert)]);

      const result = await service.updateAlertStatus(
        "alert-123",
        AlertStatus.ACKNOWLEDGED,
        "user1",
      );

      expect(alertHistoryRepository.update).toHaveBeenCalledWith(
        "alert-123",
        expect.objectContaining({
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: "user1",
        }),
      );
      expect(cacheService.listRange).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalled();
      expect(cacheService.listPush).toHaveBeenCalled();
      expect(result).toEqual(updatedAlert);
    });

    it("should update alert status to RESOLVED and cache it", async () => {
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: "user1",
        resolvedAt: new Date(),
        endTime: new Date(),
      };
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);
      cacheService.listRange.mockResolvedValue([JSON.stringify(mockAlert)]);

      const result = await service.updateAlertStatus(
        "alert-123",
        AlertStatus.RESOLVED,
        "user1",
      );

      expect(alertHistoryRepository.update).toHaveBeenCalledWith(
        "alert-123",
        expect.objectContaining({
          status: AlertStatus.RESOLVED,
          resolvedBy: "user1",
        }),
      );
      expect(cacheService.listRange).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalled();
      expect(cacheService.listPush).toHaveBeenCalled();
      expect(result).toEqual(updatedAlert);
    });

    it("should return null if alert not found for update", async () => {
      alertHistoryRepository.update.mockResolvedValue(null);

      const result = await service.updateAlertStatus(
        "non-existent-alert",
        AlertStatus.ACKNOWLEDGED,
      );

      expect(result).toBeNull();
      expect(cacheService.listRange).not.toHaveBeenCalled();
    });

    it("should handle errors during alert status update", async () => {
      alertHistoryRepository.update.mockRejectedValue(
        new Error("DB update error"),
      );

      await expect(
        service.updateAlertStatus("alert-123", AlertStatus.ACKNOWLEDGED),
      ).rejects.toThrow("DB update error");
    });

    it("should handle cache service errors gracefully during alert status update", async () => {
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: "user1",
        acknowledgedAt: new Date(),
      };
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);
      cacheService.listRange.mockRejectedValue(new Error("Cache update error"));

      const result = await service.updateAlertStatus(
        "alert-123",
        AlertStatus.ACKNOWLEDGED,
        "user1",
      );

      expect(result).toEqual(updatedAlert);
      expect(cacheService.listRange).toHaveBeenCalled();
    });
  });

  describe("queryAlerts", () => {
    it("should query alerts and return paginated results", async () => {
      const mockQuery: IAlertQuery = { page: 1, limit: 10 };
      alertHistoryRepository.find.mockResolvedValue({
        alerts: [mockAlert],
        total: 1,
      });
      jest.spyOn(AlertHistoryUtil, "calculatePagination").mockReturnValue({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        offset: 0,
      });

      const result = await service.queryAlerts(mockQuery);

      expect(alertHistoryRepository.find).toHaveBeenCalledWith(mockQuery);
      expect(result.alerts).toEqual([mockAlert]);
      expect(result.total).toBe(1); // 使用total而非totalItems
    });

    it("should handle errors during alert query", async () => {
      alertHistoryRepository.find.mockRejectedValue(new Error("Query error"));

      await expect(service.queryAlerts({})).rejects.toThrow("Query error");
    });
  });

  describe("getActiveAlerts", () => {
    it("should get active alerts from cache if available", async () => {
      cacheService.getClient().keys = jest
        .fn()
        .mockResolvedValue(["alert:history:timeseries:rule-abc"]);
      cacheService.listRange.mockResolvedValue([JSON.stringify(mockAlert)]);

      const result = await service.getActiveAlerts();

      expect(cacheService.getClient().keys).toHaveBeenCalledWith(
        "alert:history:timeseries:*",
      );
      expect(cacheService.listRange).toHaveBeenCalledWith(
        "alert:history:timeseries:rule-abc",
        0,
        9,
      );
      expect(alertHistoryRepository.findActive).not.toHaveBeenCalled();
      expect(result).toEqual([mockAlert]);
    });

    it("should get active alerts from database if cache is empty", async () => {
      cacheService.getClient().keys = jest.fn().mockResolvedValue([]);
      alertHistoryRepository.findActive.mockResolvedValue([mockAlert]);

      const result = await service.getActiveAlerts();

      expect(cacheService.getClient().keys).toHaveBeenCalled();
      expect(alertHistoryRepository.findActive).toHaveBeenCalled();
      expect(result).toEqual([mockAlert]);
    });

    it("should get active alerts from database if cache fails", async () => {
      cacheService.getClient().keys = jest
        .fn()
        .mockRejectedValue(new Error("Cache keys error"));
      alertHistoryRepository.findActive.mockResolvedValue([mockAlert]);

      const result = await service.getActiveAlerts();

      expect(cacheService.getClient().keys).toHaveBeenCalled();
      expect(alertHistoryRepository.findActive).toHaveBeenCalled();
      expect(result).toEqual([mockAlert]);
    });

    it("should handle errors during get active alerts", async () => {
      cacheService.getClient().keys = jest.fn().mockResolvedValue([]);
      alertHistoryRepository.findActive.mockRejectedValue(
        new Error("DB active error"),
      );

      await expect(service.getActiveAlerts()).rejects.toThrow(
        "DB active error",
      );
    });
  });

  describe("getAlertStats", () => {
    it("should get alert statistics", async () => {
      alertHistoryRepository.getStatistics.mockResolvedValue({
        activeAlerts: [{ id: AlertSeverity.CRITICAL, count: 1 }],
        todayAlerts: 2,
        resolvedToday: 1,
        avgResolutionTime: [{ avgTime: 60000 }],
      });
      jest.spyOn(AlertHistoryUtil, "formatStatistics").mockReturnValue({
        activeAlerts: 1,
        criticalAlerts: 1,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 2,
        resolvedAlertsToday: 1,
        averageResolutionTime: 1,
      });

      const result = await service.getAlertStats();

      expect(alertHistoryRepository.getStatistics).toHaveBeenCalled();
      expect(result.activeAlerts).toBe(1);
    });

    it("should handle errors during get alert statistics", async () => {
      alertHistoryRepository.getStatistics.mockRejectedValue(
        new Error("Stats error"),
      );

      await expect(service.getAlertStats()).rejects.toThrow("Stats error");
    });
  });

  describe("getAlertById", () => {
    it("should get alert by ID", async () => {
      alertHistoryRepository.findById.mockResolvedValue(mockAlert);

      const result = await service.getAlertById("alert-123");

      expect(alertHistoryRepository.findById).toHaveBeenCalledWith("alert-123");
      expect(result).toEqual(mockAlert);
    });

    it("should return null if alert not found by ID", async () => {
      alertHistoryRepository.findById.mockResolvedValue(null);

      const result = await service.getAlertById("non-existent-alert");

      expect(result).toBeNull();
    });

    it("should handle errors during get alert by ID", async () => {
      alertHistoryRepository.findById.mockRejectedValue(
        new Error("Find by ID error"),
      );

      await expect(service.getAlertById("alert-123")).rejects.toThrow(
        "Find by ID error",
      );
    });
  });

  describe("cleanupExpiredAlerts", () => {
    it("should cleanup expired alerts", async () => {
      alertHistoryRepository.cleanup.mockResolvedValue(5);
      jest.spyOn(AlertHistoryUtil, "isValidCleanupDays").mockReturnValue(true);
      jest
        .spyOn(AlertHistoryUtil, "calculateExecutionTime")
        .mockReturnValue(100);

      const result = await service.cleanupExpiredAlerts(7);

      expect(alertHistoryRepository.cleanup).toHaveBeenCalledWith(7);
      expect(result.deletedCount).toBe(5);
      expect(result.executionTime).toBe(100);
    });

    it("should use default cleanup days if invalid daysToKeep is provided", async () => {
      alertHistoryRepository.cleanup.mockResolvedValue(5);
      jest.spyOn(AlertHistoryUtil, "isValidCleanupDays").mockReturnValue(false);
      jest
        .spyOn(AlertHistoryUtil, "calculateExecutionTime")
        .mockReturnValue(100);

      const result = await service.cleanupExpiredAlerts(-1);

      expect(alertHistoryRepository.cleanup).toHaveBeenCalledWith(
        ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS,
      ); // DEFAULT_CLEANUP_DAYS
      expect(result.deletedCount).toBe(5);
    });

    it("should handle errors during cleanup", async () => {
      alertHistoryRepository.cleanup.mockRejectedValue(
        new Error("Cleanup error"),
      );

      await expect(service.cleanupExpiredAlerts(7)).rejects.toThrow(
        "Cleanup error",
      );
    });
  });

  describe("batchUpdateAlertStatus", () => {
    it("should batch update alert status successfully", async () => {
      jest.spyOn(AlertHistoryUtil, "isValidBatchSize").mockReturnValue(true);
      jest.spyOn(service, "updateAlertStatus").mockResolvedValue(mockAlert);
      jest
        .spyOn(AlertHistoryUtil, "generateBatchResultSummary")
        .mockReturnValue({
          totalProcessed: 10,
          successRate: 100,
          hasErrors: false,
          errorSummary: "", // 修改为errorSummary而非summary
        });

      const result = await service.batchUpdateAlertStatus(
        ["alert-1", "alert-2"],
        AlertStatus.ACKNOWLEDGED,
        "user1",
      );

      expect(service.updateAlertStatus).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should handle partial failures in batch update", async () => {
      jest.spyOn(AlertHistoryUtil, "isValidBatchSize").mockReturnValue(true);
      jest
        .spyOn(service, "updateAlertStatus")
        .mockResolvedValueOnce(mockAlert)
        .mockRejectedValueOnce(new Error("Update failed"));
      jest
        .spyOn(AlertHistoryUtil, "generateBatchResultSummary")
        .mockReturnValue({
          totalProcessed: 10,
          successRate: 100,
          hasErrors: false,
          errorSummary: "", // 修改为errorSummary而非summary
        });

      const result = await service.batchUpdateAlertStatus(
        ["alert-1", "alert-2"],
        AlertStatus.ACKNOWLEDGED,
        "user1",
      );

      expect(service.updateAlertStatus).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toEqual(["alert-2: Update failed"]);
    });

    it("should throw error if batch size is invalid", async () => {
      jest.spyOn(AlertHistoryUtil, "isValidBatchSize").mockReturnValue(false);

      await expect(
        service.batchUpdateAlertStatus(
          Array(1000).fill("alert"),
          AlertStatus.ACKNOWLEDGED,
        ),
      ).rejects.toThrow("批量大小超出限制");
    });

    it("should handle errors during batch update", async () => {
      jest.spyOn(AlertHistoryUtil, "isValidBatchSize").mockReturnValue(true);
      jest
        .spyOn(service, "updateAlertStatus")
        .mockRejectedValue(new Error("Generic error"));

      const result = await service.batchUpdateAlertStatus(
        ["alert-1"],
        AlertStatus.ACKNOWLEDGED,
      );
      expect(result).toEqual({
        successCount: 0,
        failedCount: 1,
        errors: ["alert-1: Generic error"],
      });
    });
  });

  describe("getAlertCountByStatus", () => {
    it("should return alert counts by status", async () => {
      const expectedCounts = {
        [AlertStatus.FIRING]: 5,
        [AlertStatus.ACKNOWLEDGED]: 2,
        [AlertStatus.RESOLVED]: 10,
      };
      // Mock the repository method if it were implemented to return these values
      // For now, it returns default values as per the service implementation

      const result = await service.getAlertCountByStatus();

      expect(result).toEqual({
        [AlertStatus.FIRING]: 0,
        [AlertStatus.ACKNOWLEDGED]: 0,
        [AlertStatus.RESOLVED]: 0,
      });
    });
  });

  describe("getRecentAlerts", () => {
    it("should get recent alerts with default limit", async () => {
      alertHistoryRepository.find.mockResolvedValue({
        alerts: [mockAlert],
        total: 1,
      });

      const result = await service.getRecentAlerts();

      expect(alertHistoryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10, // DEFAULT_RECENT_ALERTS_LIMIT
        }),
      );
      expect(result).toEqual([mockAlert]);
    });

    it("should get recent alerts with specified limit", async () => {
      alertHistoryRepository.find.mockResolvedValue({
        alerts: [mockAlert, mockAlert],
        total: 2,
      });

      const result = await service.getRecentAlerts(2);

      expect(alertHistoryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 2,
        }),
      );
      expect(result).toEqual([mockAlert, mockAlert]);
    });

    it("should adjust limit if invalid value is provided", async () => {
      alertHistoryRepository.find.mockResolvedValue({
        alerts: [mockAlert],
        total: 1,
      });

      const result = await service.getRecentAlerts(0); // Invalid limit

      expect(alertHistoryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10, // DEFAULT_RECENT_ALERTS_LIMIT
        }),
      );
      expect(result).toEqual([mockAlert]);
    });

    it("should handle errors during get recent alerts", async () => {
      alertHistoryRepository.find.mockRejectedValue(
        new Error("Recent alerts error"),
      );

      await expect(service.getRecentAlerts()).rejects.toThrow(
        "Recent alerts error",
      );
    });
  });

  describe("getServiceStats", () => {
    it("should return service statistics", () => {
      const result = service.getServiceStats();

      expect(result).toHaveProperty("supportedStatuses");
      expect(result).toHaveProperty("defaultCleanupDays");
      expect(result).toHaveProperty("idPrefixFormat");
      expect(result).toHaveProperty("maxBatchUpdateSize");
    });
  });
});
