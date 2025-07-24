import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from "../../../../../src/alert/dto/alert-rule.dto";
import {
  AlertSeverity,
  NotificationChannelType,
} from "../../../../../src/alert/types/alert.types";

describe("AlertRuleDTOs", () => {
  describe("CreateAlertRuleDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        name: "High CPU Usage",
        metric: "cpu.usage",
        operator: "gt",
        threshold: 90,
        duration: 60,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [
          {
            name: "slack-channel",
            type: NotificationChannelType.SLACK,
            config: { webhookUrl: "http://slack.com/webhook" },
            enabled: true,
          },
        ],
        cooldown: 300,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail validation with invalid data", async () => {
      const dto = plainToClass(CreateAlertRuleDto, { name: "" }); // Missing required fields
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateAlertRuleDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(UpdateAlertRuleDto, {
        name: "Updated CPU Rule",
        severity: AlertSeverity.WARNING,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass validation with empty data", async () => {
      const dto = plainToClass(UpdateAlertRuleDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
