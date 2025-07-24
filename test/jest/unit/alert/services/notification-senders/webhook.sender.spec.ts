import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { BadRequestException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { AxiosResponse } from "axios";

import { WebhookSender } from "../../../../../../src/alert/services/notification-senders/webhook.sender";
import { URLSecurityValidator } from "../../../../../../src/common/utils/url-security-validator.util";
import {
  Alert,
  AlertRule,
  NotificationChannelType,
} from "../../../../../../src/alert/types/alert.types";

jest.mock("../../../../../../src/common/utils/url-security-validator.util");

describe("WebhookSender", () => {
  let sender: WebhookSender;
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
    severity: "critical",
    status: "firing",
    startTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const validConfig = {
    url: "https://example.com/webhook",
    headers: { "X-Test": "true" },
    timeout: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSender,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    sender = module.get<WebhookSender>(WebhookSender);
    httpService = module.get<HttpService>(HttpService);
    (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
      valid: true,
    });
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(sender).toBeDefined();
    expect(sender.type).toBe(NotificationChannelType.WEBHOOK);
  });

  describe("send", () => {
    it("should send a notification successfully", async () => {
      const mockResponse = { status: 200 } as AxiosResponse;
      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await sender.send(mockAlert, mockRule, validConfig);

      expect(httpService.post).toHaveBeenCalledWith(
        validConfig.url,
        expect.any(Object),
        {
          headers: validConfig.headers,
          timeout: validConfig.timeout,
        },
      );
      expect(result.success).toBe(true);
    });

    it("should return a failed result for invalid webhook URL", async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid URL",
      });
      const result = await sender.send(mockAlert, mockRule, validConfig);
      expect(result.success).toBe(false);
      expect(result.error).toContain("URL安全检查失败: Invalid URL");
    });

    it("should handle API errors from the webhook", async () => {
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
  });

  describe("test", () => {
    it("should return true for a successful test connection", async () => {
      const mockResponse = { status: 200 } as AxiosResponse;
      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      await expect(sender.test(validConfig)).resolves.toBe(true);
    });

    it("should return false for a failed test connection", async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error()),
      );
      await expect(sender.test(validConfig)).resolves.toBe(false);
    });

    it("should throw BadRequestException if Authorization header is present", async () => {
      const configWithAuth = {
        ...validConfig,
        headers: { Authorization: "Bearer token" },
      };
      await expect(sender.test(configWithAuth)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("validateConfig", () => {
    it("should validate a correct configuration", () => {
      const { valid, errors } = sender.validateConfig(validConfig);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("should be invalid if url is missing", () => {
      const { valid, errors } = sender.validateConfig({});
      expect(valid).toBe(false);
      expect(errors).toContain("URL is required for webhook notification");
    });

    it("should be invalid if url is not a valid URL", () => {
      const { valid, errors } = sender.validateConfig({ url: "not a url" });
      expect(valid).toBe(false);
      expect(errors).toContain("URL must be a valid URL");
    });

    it("should be invalid if Authorization header is present", () => {
      const { valid, errors } = sender.validateConfig({
        ...validConfig,
        headers: { Authorization: "Bearer token" },
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "出于安全原因，配置中不允许包含 Authorization 头部",
      );
    });
  });
});
