import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { 
  CreateAlertRuleDto, 
  UpdateAlertRuleDto, 
  AlertNotificationChannelDto,
  AlertNotificationChannelType
} from "../../../../../src/alert/dto/alert-rule.dto";
import { AlertSeverity } from "../../../../../src/alert/types/alert.types";

describe("AlertRuleDto", () => {
  describe("AlertNotificationChannelDto", () => {
    it("should validate a valid notification channel", async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: "Test Channel",
        type: AlertNotificationChannelType.EMAIL,
        config: { to: "test@example.com" },
        enabled: true,
      });

      const errors = await validate(channelDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid notification channel type", async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: "Test Channel",
        type: "invalid_type",
        config: { to: "test@example.com" },
        enabled: true,
      });

      const errors = await validate(channelDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("type");
    });

    it("should validate retryCount bounds", async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: "Test Channel",
        type: AlertNotificationChannelType.EMAIL,
        config: { to: "test@example.com" },
        enabled: true,
        retryCount: 15, // 超出最大值
      });

      const errors = await validate(channelDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("retryCount");
    });

    it("should validate timeout bounds", async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: "Test Channel",
        type: AlertNotificationChannelType.EMAIL,
        config: { to: "test@example.com" },
        enabled: true,
        timeout: 500, // 小于最小值
      });

      const errors = await validate(channelDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("timeout");
    });
  });

  describe("CreateAlertRuleDto", () => {
    it("should validate a valid create alert rule DTO", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [{
          name: "Email Channel",
          type: AlertNotificationChannelType.EMAIL,
          config: { to: "admin@example.com" },
          enabled: true,
        }],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid rule name", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "", // 空名称
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("name");
    });

    it("should reject invalid metric name", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "123invalid", // 以数字开头
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("metric");
    });

    it("should reject invalid operator", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: "invalid_operator",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("operator");
    });

    it("should reject invalid threshold", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: ">",
        threshold: "invalid", // 非数字
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("threshold");
    });

    it("should validate duration bounds", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 15, // 小于最小值
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("duration");
    });

    it("should validate cooldown bounds", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 30, // 小于最小值
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("cooldown");
    });

    it("should reject invalid severity", async () => {
      const createDto = plainToClass(CreateAlertRuleDto, {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: "invalid_severity",
        enabled: true,
        channels: [],
        cooldown: 300,
      });

      const errors = await validate(createDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("severity");
    });
  });

  describe("UpdateAlertRuleDto", () => {
    it("should validate a valid update alert rule DTO", async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        name: "Updated CPU Usage Alert",
        threshold: 85,
      });

      const errors = await validate(updateDto);
      expect(errors).toHaveLength(0);
    });

    it("should allow partial updates", async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        threshold: 85,
      });

      const errors = await validate(updateDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid threshold in update", async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        threshold: "invalid", // 非数字
      });

      const errors = await validate(updateDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("threshold");
    });

    it("should validate duration bounds in update", async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        duration: 4000, // 超出最大值
      });

      const errors = await validate(updateDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("duration");
    });
  });
});