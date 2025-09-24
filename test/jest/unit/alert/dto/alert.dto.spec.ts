import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { 
  AlertQueryDto, 
  AcknowledgeAlertDto, 
  ResolveAlertDto, 
  AlertStatsDto, 
  TriggerAlertDto, 
  AlertResponseDto 
} from "../../../../../src/alert/dto/alert.dto";
import { AlertSeverity, AlertStatus } from "../../../../../src/alert/types/alert.types";

describe("AlertDto", () => {
  describe("AlertQueryDto", () => {
    it("should validate a valid alert query DTO", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: "rule-123",
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        startTime: "2023-01-01T00:00:00Z",
        endTime: "2023-01-02T00:00:00Z",
        metric: "cpu_usage",
        sortBy: "startTime",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid ruleId format", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: "invalid rule id", // 包含空格
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("ruleId");
    });

    it("should reject invalid severity", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        severity: "invalid_severity",
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("severity");
    });

    it("should reject invalid status", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        status: "invalid_status",
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("status");
    });

    it("should reject invalid startTime format", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        startTime: "invalid_date",
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("startTime");
    });

    it("should reject invalid metric name", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        metric: "123invalid", // 以数字开头
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("metric");
    });

    it("should reject invalid sortBy field", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        sortBy: "invalid field", // 包含空格
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("sortBy");
    });

    it("should reject invalid sortOrder", async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        sortOrder: "invalid_order",
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("sortOrder");
    });
  });

  describe("AcknowledgeAlertDto", () => {
    it("should validate a valid acknowledge alert DTO", async () => {
      const ackDto = plainToClass(AcknowledgeAlertDto, {
        acknowledgedBy: "user1",
        note: "Acknowledged for investigation",
      });

      const errors = await validate(ackDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject missing acknowledgedBy", async () => {
      const ackDto = plainToClass(AcknowledgeAlertDto, {
        note: "Acknowledged for investigation",
      });

      const errors = await validate(ackDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("acknowledgedBy");
    });
  });

  describe("ResolveAlertDto", () => {
    it("should validate a valid resolve alert DTO", async () => {
      const resolveDto = plainToClass(ResolveAlertDto, {
        resolvedBy: "user1",
        solution: "Restarted the service",
        note: "Issue resolved",
      });

      const errors = await validate(resolveDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject missing resolvedBy", async () => {
      const resolveDto = plainToClass(ResolveAlertDto, {
        solution: "Restarted the service",
      });

      const errors = await validate(resolveDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("resolvedBy");
    });
  });

  describe("AlertStatsDto", () => {
    it("should validate a valid alert stats DTO", async () => {
      const statsDto = plainToClass(AlertStatsDto, {
        totalRules: 10,
        enabledRules: 8,
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 120,
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject negative values", async () => {
      const statsDto = plainToClass(AlertStatsDto, {
        totalRules: -1, // 负数
        enabledRules: 8,
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 120,
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("totalRules");
    });
  });

  describe("TriggerAlertDto", () => {
    it("should validate a valid trigger alert DTO", async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        ruleId: "rule-123",
        metrics: [
          {
            metric: "cpu_usage",
            value: 85.5,
            timestamp: "2023-01-01T00:00:00Z",
            tags: { host: "server-1" },
          },
        ],
      });

      const errors = await validate(triggerDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid ruleId format", async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        ruleId: "invalid rule id", // 包含空格
        metrics: [],
      });

      const errors = await validate(triggerDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("ruleId");
    });

    it("should reject invalid metrics data", async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        metrics: [
          {
            metric: "123invalid", // 以数字开头
            value: "invalid", // 非数字
            timestamp: "invalid_date", // 无效日期
          },
        ],
      });

      const errors = await validate(triggerDto);
      expect(errors).toHaveLength(3); // 三个字段都有错误
    });
  });

  describe("AlertResponseDto", () => {
    it("should create a valid alert response DTO from entity", () => {
      const alertEntity = {
        id: "alert-123",
        ruleId: "rule-123",
        ruleName: "CPU Usage Alert",
        metric: "cpu_usage",
        value: 85.5,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: "CPU usage is above threshold",
        startTime: new Date("2023-01-01T00:00:00Z"),
        endTime: new Date("2023-01-01T00:05:00Z"),
        tags: { host: "server-1" },
        context: { currentValue: 85.5 },
      };

      const responseDto = AlertResponseDto.fromEntity(alertEntity);

      expect(responseDto.id).toBe("alert-123");
      expect(responseDto.ruleId).toBe("rule-123");
      expect(responseDto.ruleName).toBe("CPU Usage Alert");
      expect(responseDto.metric).toBe("cpu_usage");
      expect(responseDto.value).toBe(85.5);
      expect(responseDto.threshold).toBe(80);
      expect(responseDto.severity).toBe(AlertSeverity.WARNING);
      expect(responseDto.status).toBe(AlertStatus.FIRING);
      expect(responseDto.message).toBe("CPU usage is above threshold");
      expect(responseDto.startTime).toEqual(new Date("2023-01-01T00:00:00Z"));
      expect(responseDto.endTime).toEqual(new Date("2023-01-01T00:05:00Z"));
      expect(responseDto.tags).toEqual({ host: "server-1" });
      expect(responseDto.context).toEqual({ currentValue: 85.5 });
      expect(responseDto.duration).toBe(300000); // 5分钟 = 300000毫秒
      expect(responseDto.isActive).toBe(false); // 已结束的告警不是活跃的
    });

    it("should correctly calculate duration for active alerts", () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const alertEntity = {
        id: "alert-123",
        ruleId: "rule-123",
        ruleName: "CPU Usage Alert",
        metric: "cpu_usage",
        value: 85.5,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: "CPU usage is above threshold",
        startTime: fiveMinutesAgo,
        tags: { host: "server-1" },
      };

      const responseDto = AlertResponseDto.fromEntity(alertEntity);

      // 持续时间应该接近5分钟（300000毫秒），允许一些时间差
      expect(responseDto.duration).toBeGreaterThanOrEqual(299000);
      expect(responseDto.duration).toBeLessThanOrEqual(301000);
      expect(responseDto.isActive).toBe(true); // 未结束的告警是活跃的
    });
  });
});