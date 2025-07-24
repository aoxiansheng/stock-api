import { HttpService } from "@nestjs/axios";
import { BadRequestException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { AxiosResponse } from "axios";
import * as crypto from "crypto";

import { DingTalkSender } from "../../../../../../src/alert/services/notification-senders/dingtalk.sender";
import { URLSecurityValidator } from "../../../../../../src/common/utils/url-security-validator.util";
import {
  Alert,
  AlertRule,
  NotificationChannelType,
} from "../../../../../../src/alert/types/alert.types";

// Mocks
jest.mock("crypto", () => ({
  createHmac: jest.fn(),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mocked-hash"),
  }),
}));
jest.mock("../../../../../../src/common/utils/url-security-validator.util");

describe("DingTalkSender", () => {
  let sender: DingTalkSender;
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
    webhook_url: "https://oapi.dingtalk.com/robot/send?access_token=test",
    secret: "test-secret",
  };

  beforeEach(() => {
    // Setup crypto mock with proper interface
    const mockHmac = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("mocked-signature"),
    };
    (crypto.createHmac as jest.Mock).mockReturnValue(mockHmac);

    // Mock HttpService
    httpService = {
      post: jest.fn(),
    } as any;

    // Direct instantiation instead of TestingModule
    sender = new DingTalkSender(httpService);

    // Mock URLSecurityValidator
    (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
      valid: true,
    });

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(sender).toBeDefined();
    expect(sender.type).toBe(NotificationChannelType.DINGTALK);
  });

  describe("send", () => {
    it("should send a notification successfully", async () => {
      const mockResponse = {
        data: { errcode: 0 },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      } as AxiosResponse;
      jest.spyOn(httpService, "post").mockReturnValue(of(mockResponse));

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
        "DingTalk Webhook URL安全检查失败: Invalid URL",
      );
    });

    it("should handle API errors from DingTalk", async () => {
      const mockResponse = {
        data: { errcode: 1, errmsg: "error" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      } as AxiosResponse;
      jest.spyOn(httpService, "post").mockReturnValue(of(mockResponse));

      const result = await sender.send(mockAlert, mockRule, validConfig);
      expect(result.success).toBe(false);
    });

    it("should handle network or other exceptions", async () => {
      const error = new Error("Network Error");
      jest.spyOn(httpService, "post").mockReturnValue(throwError(() => error));

      const result = await sender.send(mockAlert, mockRule, validConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);
    });
  });

  describe("test", () => {
    it("should return true for a successful test connection", async () => {
      const mockResponse = {
        data: { errcode: 0 },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      } as AxiosResponse;
      jest.spyOn(httpService, "post").mockReturnValue(of(mockResponse));

      await expect(sender.test(validConfig)).resolves.toBe(true);
    });

    it("should return false for a failed test connection", async () => {
      jest
        .spyOn(httpService, "post")
        .mockReturnValue(throwError(() => new Error()));
      await expect(sender.test(validConfig)).resolves.toBe(false);
    });

    it("should throw BadRequestException for invalid URL in test", async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid URL",
      });
      await expect(sender.test(validConfig)).rejects.toThrow(
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

    it("should be invalid if webhook_url is missing", () => {
      const { valid, errors } = sender.validateConfig({ secret: "secret" });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "Webhook URL is required for DingTalk notification",
      );
    });

    it("should be invalid if secret is missing", () => {
      const { valid, errors } = sender.validateConfig({ webhook_url: "url" });
      expect(valid).toBe(false);
      expect(errors).toContain("Secret is required for DingTalk notification");
    });

    it("should be invalid for a non-dingtalk URL", () => {
      const { valid, errors } = sender.validateConfig({
        webhook_url: "https://example.com",
        secret: "secret",
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "Webhook URL must be a valid DingTalk webhook URL",
      );
    });

    it("should be invalid if security validation fails", () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({
        valid: false,
        error: "Security fail",
      });
      const { valid, errors } = sender.validateConfig(validConfig);
      expect(valid).toBe(false);
      expect(errors).toContain("Webhook URL安全检查失败: Security fail");
    });
  });

  describe("getSignedUrl", () => {
    it("should return the original URL if no secret is provided", () => {
      const url = "https://oapi.dingtalk.com/robot/send?access_token=test";
      // Accessing private method for testing purposes
      const signedUrl = (sender as any).getSignedUrl(url, null);
      expect(signedUrl).toBe(url);
    });

    it("should return a signed URL if secret is provided", () => {
      const createHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue("signed-signature"),
      };
      (crypto.createHmac as jest.Mock).mockReturnValue(createHmac);

      const url = "https://oapi.dingtalk.com/robot/send?access_token=test";
      const signedUrl = (sender as any).getSignedUrl(url, "secret");

      expect(crypto.createHmac).toHaveBeenCalledWith("sha256", "secret");
      expect(signedUrl).toContain("timestamp=");
      expect(signedUrl).toContain("sign=signed-signature");
    });
  });
});
