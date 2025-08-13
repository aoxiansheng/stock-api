/* eslint-disable @typescript-eslint/no-unused-vars */
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import {
  NotificationChannelDto,
  EmailConfigDto,
  WebhookConfigDto,
  SlackConfigDto,
  DingTalkConfigDto,
  SmsConfigDto,
  LogConfigDto,
  CreateNotificationChannelDto,
  UpdateNotificationChannelDto,
  TestNotificationChannelDto,
} from "../../../../../src/alert/dto/notification-channel.dto";
import { NotificationChannelType } from "../../../../../src/alert/types/alert.types";

describe("NotificationChannelDTOs", () => {
  describe("NotificationChannelDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(NotificationChannelDto, {
        name: "test-channel",
        type: NotificationChannelType._SLACK,
        config: { webhookurl: "http://slack.com/webhook", channel: "general" },
        enabled: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Config DTOs", () => {
    it("EmailConfigDto should pass validation", async () => {
      const dto = plainToClass(EmailConfigDto, {
        to: "test@example.com",
        subject: "Test",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("WebhookConfigDto should pass validation", async () => {
      const dto = plainToClass(WebhookConfigDto, {
        url: "http://example.com/webhook",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("SlackConfigDto should pass validation", async () => {
      const dto = plainToClass(SlackConfigDto, {
        webhook_url: "http://slack.com/webhook",
        channel: "general",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("DingTalkConfigDto should pass validation", async () => {
      const dto = plainToClass(DingTalkConfigDto, {
        webhook_url: "http://dingtalk.com/webhook",
        secret: "secret",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("SmsConfigDto should pass validation", async () => {
      const dto = plainToClass(SmsConfigDto, {
        phone: "1234567890",
        template: "template-id",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("LogConfigDto should pass validation", async () => {
      const dto = plainToClass(LogConfigDto, { level: "info" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Other DTOs", () => {
    it("CreateNotificationChannelDto should pass validation", async () => {
      const dto = plainToClass(CreateNotificationChannelDto, {
        name: "test-channel",
        type: NotificationChannelType._EMAIL,
        config: { to: "test@example.com", subject: "Test" },
        enabled: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("UpdateNotificationChannelDto should pass validation", async () => {
      const dto = plainToClass(UpdateNotificationChannelDto, {
        name: "updated-name",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("TestNotificationChannelDto should pass validation", async () => {
      const dto = plainToClass(TestNotificationChannelDto, {
        message: "Test message",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
