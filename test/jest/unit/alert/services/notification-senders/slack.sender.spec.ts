import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { AxiosResponse } from "axios";

import { SlackSender } from "../../../../../../src/alert/services/notification-senders/slack.sender";
import { URLSecurityValidator } from "../../../../../../src/common/utils/url-security-validator.util";
import {
  Alert,
  AlertRule,
  AlertSeverity,
  NotificationChannelType,
} from "../../../../../../src/alert/types/alert.types";

jest.mock("../../../../../../src/common/utils/url-security-validator.util");

describe("SlackSender", () => {
  let sender: SlackSender;
  let httpService: HttpService;

  const mockRule: AlertRule = {
    id: "rule-1",
    name: "Test Rule",
    metric: "cpu",
    operator: "gt",
    threshold: 80,
    duration: 60,
    severity: "critical",
    enabled: true,
    channels: [],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockAlert: Alert = {
    id: "alert-1",
    ruleId: "rule-1",
    ruleName: "Test Rule",
    message: "Test alert message",
    metric: "cpu",
    value: 90,
    threshold: 80,
    severity: AlertSeverity.CRITICAL,
    status: "firing",
    startTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const validConfig = {
    webhook_url: "https://hooks.slack.com/services/test",
    channel: "#test",
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
    (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
      valid: true,
    });
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(sender).toBeDefined();
    expect(sender.type).toBe(NotificationChannelType.SLACK);
  });

  describe("send", () => {
    it("should send a notification successfully", async () => {
      const mockResponse = { status: 200 } as AxiosResponse;
      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await sender.send(mockAlert, mockRule, validConfig);

      expect(httpService.post).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should return a failed result for invalid webhook URL", async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid URL",
      });

      const result = await sender.send(mockAlert, mockRule, validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Slack Webhook URL安全检查失败: Invalid URL",
      );
    });

    it("should handle API errors from Slack", async () => {
      const mockResponse = { status: 500 } as AxiosResponse;
      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await sender.send(mockAlert, mockRule, validConfig);
      expect(result.success).toBe(false);
    });

    it("should handle network or other exceptions", async () => {
      const error = new Error("Network Error");
      (httpService.post as jest.Mock).mockReturnValue(throwError(() => error));

      const result = await sender.send(mockAlert, mockRule, validConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
    });

    it("should set the correct color for CRITICAL severity", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of({ status: 200 }));
      await sender.send(mockAlert, mockRule, validConfig);
      const payload = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(payload.attachments[0].color).toBe("danger");
    });

    it("should set the correct color for WARNING severity", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of({ status: 200 }));
      const warningAlert = { ...mockAlert, severity: AlertSeverity.WARNING };
      await sender.send(warningAlert, mockRule, validConfig);
      const payload = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(payload.attachments[0].color).toBe("warning");
    });
  });

  describe("test", () => {
    it("should return true for a successful test connection", async () => {
      const mockResponse = { status: 200 } as AxiosResponse;
      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

      await expect(sender.test(validConfig)).resolves.toBe(true);
    });

    it("should return false for a failed test connection", async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error()),
      );
      await expect(sender.test(validConfig)).resolves.toBe(false);
    });
  });

  describe("validateConfig", () => {
    it("should validate a correct configuration", () => {
      const { valid, errors } = sender.validateConfig(validConfig);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("should be invalid if webhook_url is missing", () => {
      const { valid, errors } = sender.validateConfig({ channel: "#test" });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "Webhook URL is required for Slack notification",
      );
    });

    it("should be invalid if channel is missing", () => {
      const { valid, errors } = sender.validateConfig({ webhook_url: "url" });
      expect(valid).toBe(false);
      expect(errors).toContain("Channel is required for Slack notification");
    });

    it("should be invalid if channel does not start with # or @", () => {
      const { valid, errors } = sender.validateConfig({
        ...validConfig,
        channel: "test",
      });
      expect(valid).toBe(false);
      expect(errors).toContain("Channel must start with # or @");
    });
  });
});
