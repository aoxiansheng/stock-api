/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { AxiosHeaders } from "axios";

import { SlackSender } from "../../../../../../src/alert/services/notification-senders/slack.sender";
import {
  NotificationChannelType,
  AlertSeverity,
  AlertStatus,
} from "../../../../../../src/alert/types/alert.types";
import { URLSecurityValidator } from "../../../../../../src/common/utils/url-security-validator.util";

// Mock URLSecurityValidator
jest.mock(
  "../../../../../../src/common/utils/url-security-validator.util",
  () => ({
    URLSecurityValidator: {
      validateURL: jest.fn(),
    },
  }),
);

describe("SlackSender", () => {
  let sender: SlackSender;
  let httpService: HttpService;

  const mockAlert = {
    id: "alert123",
    ruleId: "rule123",
    severity: AlertSeverity.CRITICAL,
    metric: "CPU Usage",
    value: 95,
    threshold: 90,
    status: AlertStatus.FIRING,
    startTime: new Date("2023-01-_01T10:_00:00Z"),
    endTime: new Date(),
    message: "CPU usage is too high",
    ruleName: "Test Rule",
    createdAt: new Date(),
    updatedAt: new Date(),
    acknowledgedBy: "user",
    acknowledgedAt: new Date(),
    resolvedBy: "user",
    resolvedAt: new Date(),
    tags: {},
    context: {},
  };

  const mockRule = {
    id: "rule123",
    name: "High CPU Alert",
    description: "Alert when CPU usage exceeds 90%",
    metric: "cpu_usage",
    operator: "gt" as "gt" | "lt" | "eq" | "gte" | "lte" | "ne",
    threshold: 90,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfig = {
    id: "slack-channel-1",
    webhook_url:
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    channel: "#alerts",
    username: "TestBot",
    iconemoji: ":robot_face:",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackSender,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    sender = module.get<SlackSender>(SlackSender);
    httpService = module.get<HttpService>(HttpService);

    // Reset mocks before each test
    (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
      valid: true,
    });
    jest.spyOn(httpService, "post").mockClear();
  });

  it("should be defined", () => {
    expect(sender).toBeDefined();
  });

  it("should have the correct type", () => {
    expect(sender.type).toEqual(NotificationChannelType.SLACK);
  });

  describe("send", () => {
    it("should send a Slack message successfully", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: "ok",
          status: 200,
          statusText: "OK",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
      );

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(true);
      expect(result.channelType).toEqual(NotificationChannelType.SLACK);
      expect(result.message).toEqual("Slack 消息发送成功");
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        mockConfig.webhook_url,
        expect.objectContaining({
          channel: mockConfig.channel,
          username: mockConfig.username,
          icon_emoji: mockConfig.iconemoji,
          text: `*${mockRule.name}* - ${mockAlert.severity.toUpperCase()}`,
          attachments: expect.any(Array),
        }),
      );
    });

    it("should use default username and icon_emoji if not provided", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: "ok",
          status: 200,
          statusText: "OK",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
      );

      const configWithoutDefaults = {
        ...mockConfig,
        username: undefined,
        icon_emoji: undefined,
      };
      await sender.send(mockAlert, mockRule, configWithoutDefaults);

      expect(httpService.post).toHaveBeenCalledWith(
        mockConfig.webhook_url,
        expect.objectContaining({
          username: "AlertBot",
          icon_emoji: ":warning:",
        }),
      );
    });

    it("should return success: false if Slack API returns non-200 status", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: "error",
          status: 500,
          statusText: "Internal Server Error",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
      );

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.message).toEqual("Slack API 返回状态码: 500");
      expect(result.error).toBeUndefined(); // 与其他Sender保持一致：非200状态时不包含error字段
    });

    it("should handle HTTP errors during sending", async () => {
      jest
        .spyOn(httpService, "post")
        .mockReturnValue(throwError(() => new Error("Network Error")));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toEqual("Network Error");
    });

    it("should throw BadRequestException if webhook_url fails security validation", async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid URL",
      });

      await expect(
        sender.send(mockAlert, mockRule, mockConfig),
      ).rejects.toThrow(
        new BadRequestException("Slack Webhook URL安全检查失败: Invalid URL"),
      );
    });
  });

  describe("test", () => {
    it("should return true for a successful test connection", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: "ok",
          status: 200,
          statusText: "OK",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
      );

      const result = await sender.test(mockConfig);
      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(mockConfig.webhook_url, {
        text: "Test message",
      });
    });

    it("should return false if Slack API returns non-200 status during test", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: "error",
          status: 500,
          statusText: "Internal Server Error",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
      );

      const result = await sender.test(mockConfig);
      expect(result).toBe(false);
    });

    it("should return false for HTTP errors during test connection", async () => {
      jest
        .spyOn(httpService, "post")
        .mockReturnValue(throwError(() => new Error("Network Error")));

      const result = await sender.test(mockConfig);
      expect(result).toBe(false);
    });

    it("should throw BadRequestException if webhook_url fails security validation during test", async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid URL",
      });

      await expect(sender.test(mockConfig)).rejects.toThrow(
        new BadRequestException("Slack Webhook URL安全检查失败: Invalid URL"),
      );
    });
  });

  describe("validateConfig", () => {
    it("should return valid: true for a valid configuration", () => {
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        channel: "#general",
        username: "MyBot",
        icon_emoji: ":smile:",
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return valid: false if webhook_url is missing", () => {
      const config = { channel: "#general" };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Webhook URL is required for Slack notification",
      );
    });

    it("should return valid: false if webhook_url is not a string", () => {
      const config = { webhook_url: 123, channel: "#general" };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Webhook URL must be a string");
    });

    it("should return valid: false if webhook_url is not a valid Slack URL", () => {
      const config = {
        webhook_url: "https://example.com",
        channel: "#general",
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Webhook URL must be a valid Slack webhook URL",
      );
    });

    it("should return valid: false if webhook_url fails security validation", () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid URL",
      });
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        channel: "#general",
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Webhook URL安全检查失败: Invalid URL");
    });

    it("should return valid: false if channel is missing", () => {
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Channel is required for Slack notification",
      );
    });

    it("should return valid: false if channel is not a string", () => {
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        channel: 123,
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Channel must be a string");
    });

    it("should return valid: false if channel does not start with # or @", () => {
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        channel: "general",
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Channel must start with # or @");
    });

    it("should return valid: false if username is not a string", () => {
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        channel: "#general",
        username: 123,
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Username must be a string");
    });

    it("should return valid: false if icon_emoji is not a string", () => {
      const config = {
        webhook_url:
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        channel: "#general",
        icon_emoji: 123,
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Icon emoji must be a string");
    });
  });

  describe("getSeverityColor", () => {
    it("should return danger for CRITICAL severity", () => {
      expect(sender["getSeverityColor"](AlertSeverity.CRITICAL)).toBe("danger");
    });

    it("should return warning for WARNING severity", () => {
      expect(sender["getSeverityColor"](AlertSeverity.WARNING)).toBe("warning");
    });

    it("should return good for INFO severity", () => {
      expect(sender["getSeverityColor"](AlertSeverity.INFO)).toBe("good");
    });

    it("should return warning for unknown severity", () => {
      expect(sender["getSeverityColor"]("UNKNOWN" as AlertSeverity)).toBe(
        "warning",
      );
    });
  });
});
