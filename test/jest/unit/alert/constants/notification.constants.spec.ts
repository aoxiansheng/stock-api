/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ERROR_TEMPLATES,
  NOTIFICATION_TEMPLATE_VARIABLES,
  NOTIFICATION_TEMPLATE_PATTERNS,
  NOTIFICATION_CONFIG,
  NOTIFICATION_TYPE_PRIORITY,
  NOTIFICATION_VALIDATION_RULES,
  NOTIFICATION_RETRY_CONFIG,
} from "../../../../../src/alert/constants/notification.constants";

import { NotificationTemplateUtil } from "../../../../../src/alert/utils/notification.utils";

describe("Notification Constants", () => {
  describe("NOTIFICATION_OPERATIONS", () => {
    it("should have all required operation names", () => {
      expect(NOTIFICATION_OPERATIONS.SEND_NOTIFICATION).toBe(
        "sendNotification",
      );
      expect(NOTIFICATION_OPERATIONS.SEND_BATCH_NOTIFICATIONS).toBe(
        "sendBatchNotifications",
      );
      expect(NOTIFICATION_OPERATIONS.TEST_CHANNEL).toBe("testChannel");
      expect(NOTIFICATION_OPERATIONS.GENERATE_TEMPLATE).toBe(
        "generateTemplate",
      );
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore 这是有意为之，测试常量对象是否真正不可变
        NOTIFICATION_OPERATIONS.SEND_NOTIFICATION = "modified";
      }).toThrow();
    });
  });

  describe("NOTIFICATION_MESSAGES", () => {
    it("should have success messages", () => {
      expect(NOTIFICATION_MESSAGES.NOTIFICATION_SENT).toBe("通知发送成功");
      expect(NOTIFICATION_MESSAGES.BATCH_NOTIFICATIONS_COMPLETED).toBe(
        "批量通知发送完成",
      );
      expect(NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED).toBe(
        "通知渠道测试通过",
      );
    });

    it("should have error messages", () => {
      expect(NOTIFICATION_MESSAGES.UNSUPPORTED_NOTIFICATION_TYPE).toBe(
        "不支持的通知类型",
      );
      expect(NOTIFICATION_MESSAGES.BATCH_NOTIFICATION_FAILED).toBe(
        "批量发送中单个通知执行失败",
      );
      expect(NOTIFICATION_MESSAGES.SEND_FAILED).toBe("发送失败");
    });

    it("should have warning messages", () => {
      expect(NOTIFICATION_MESSAGES.NO_ENABLED_CHANNELS).toBe(
        "没有启用的通知渠道",
      );
      expect(NOTIFICATION_MESSAGES.PARTIAL_BATCH_SUCCESS).toBe(
        "批量通知部分成功",
      );
    });

    it("should have info messages", () => {
      expect(NOTIFICATION_MESSAGES.NOTIFICATION_QUEUED).toBe("通知已加入队列");
      expect(NOTIFICATION_MESSAGES.BATCH_PROCESSING_PROGRESS).toBe(
        "批量处理进度更新",
      );
    });
  });

  describe("NOTIFICATION_ERROR_TEMPLATES", () => {
    it("should have all error template keys", () => {
      expect(NOTIFICATION_ERROR_TEMPLATES.UNSUPPORTED_TYPE).toBe(
        "不支持的通知类型: {channelType}",
      );
      expect(NOTIFICATION_ERROR_TEMPLATES.SEND_FAILED_WITH_REASON).toBe(
        "发送失败: {error}",
      );
      expect(NOTIFICATION_ERROR_TEMPLATES.BATCH_PROCESSING_ERROR).toBe(
        "批量处理失败: 成功 {successful}/{total}，失败 {failed}",
      );
    });
  });

  describe("NOTIFICATION_TEMPLATE_VARIABLES", () => {
    it("should have all template variables", () => {
      expect(NOTIFICATION_TEMPLATE_VARIABLES.ALERT_ID).toBe("alertId");
      expect(NOTIFICATION_TEMPLATE_VARIABLES.RULE_NAME).toBe("ruleName");
      expect(NOTIFICATION_TEMPLATE_VARIABLES.METRIC).toBe("metric");
      expect(NOTIFICATION_TEMPLATE_VARIABLES.VALUE).toBe("value");
    });
  });

  describe("NOTIFICATION_TEMPLATE_PATTERNS", () => {
    it("should have all regex pattern sources and flags", () => {
      expect(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_SOURCE).toBe(
        "\\{\\{(\\w+)\\}\\}",
      );
      expect(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_FLAGS).toBe("g");
      expect(
        NOTIFICATION_TEMPLATE_PATTERNS.IF_BLOCK_PATTERN_SOURCE,
      ).toBeTruthy();
      expect(
        NOTIFICATION_TEMPLATE_PATTERNS.UNLESS_BLOCK_PATTERN_SOURCE,
      ).toBeTruthy();
      expect(
        NOTIFICATION_TEMPLATE_PATTERNS.EACH_BLOCK_PATTERN_SOURCE,
      ).toBeTruthy();
    });

    it("should match variable patterns correctly", () => {
      const pattern = new RegExp(
        NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_SOURCE,
        NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_FLAGS,
      );
      expect("{{alertId}}".match(pattern)).toBeTruthy();
      expect("{{ruleName}}".match(pattern)).toBeTruthy();
      expect("invalid".match(pattern)).toBeFalsy();
    });
  });

  describe("NOTIFICATION_CONFIG", () => {
    it("should have all configuration values", () => {
      expect(NOTIFICATION_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(NOTIFICATION_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(NOTIFICATION_CONFIG.BATCH_SIZE_LIMIT).toBe(100);
    });
  });

  describe("NOTIFICATION_TYPE_PRIORITY", () => {
    it("should have priority values for all notification types", () => {
      expect(NOTIFICATION_TYPE_PRIORITY.EMAIL).toBe(1);
      expect(NOTIFICATION_TYPE_PRIORITY.SLACK).toBe(2);
      expect(NOTIFICATION_TYPE_PRIORITY.WEBHOOK).toBe(3);
    });
  });

  describe("NOTIFICATION_VALIDATION_RULES", () => {
    it("should have validation pattern sources and flags", () => {
      expect(
        NOTIFICATION_VALIDATION_RULES.VARIABLE_NAME_PATTERN_SOURCE,
      ).toBeTruthy();
      expect(NOTIFICATION_VALIDATION_RULES.EMAIL_PATTERN_SOURCE).toBeTruthy();
      expect(NOTIFICATION_VALIDATION_RULES.URL_PATTERN_SOURCE).toBeTruthy();
    });

    it("should validate variable names correctly", () => {
      const pattern = new RegExp(
        NOTIFICATION_VALIDATION_RULES.VARIABLE_NAME_PATTERN_SOURCE,
        NOTIFICATION_VALIDATION_RULES.VARIABLE_NAME_PATTERN_FLAGS,
      );
      expect(pattern.test("validName")).toBe(true);
      expect(pattern.test("valid_name")).toBe(true);
      expect(pattern.test("123invalid")).toBe(false);
      expect(pattern.test("invalid-name")).toBe(false);
    });

    it("should validate emails correctly", () => {
      const pattern = new RegExp(
        NOTIFICATION_VALIDATION_RULES.EMAIL_PATTERN_SOURCE,
        NOTIFICATION_VALIDATION_RULES.EMAIL_PATTERN_FLAGS,
      );
      expect(pattern.test("user@example.com")).toBe(true);
      expect(pattern.test("invalid@email")).toBe(false);
      expect(pattern.test("invalid")).toBe(false);
    });

    it("should validate URLs correctly", () => {
      const pattern = new RegExp(
        NOTIFICATION_VALIDATION_RULES.URL_PATTERN_SOURCE,
        NOTIFICATION_VALIDATION_RULES.URL_PATTERN_FLAGS,
      );
      expect(pattern.test("https://example.com")).toBe(true);
      expect(pattern.test("http://example.com")).toBe(true);
      expect(pattern.test("ftp://example.com")).toBe(false);
      expect(pattern.test("invalid-url")).toBe(false);
    });
  });
});

describe("NotificationTemplateUtil", () => {
  describe("replaceErrorTemplate", () => {
    it("should replace placeholders in template", () => {
      const template = "Error: {error} in {operation}";
      const params = { error: "Connection failed", operation: "send" };
      const result = NotificationTemplateUtil.replaceErrorTemplate(
        template,
        params,
      );
      expect(result).toBe("Error: Connection failed in send");
    });

    it("should keep unreplaced placeholders when param not provided", () => {
      const template = "Error: {error} in {operation}";
      const params = { error: "Connection failed" };
      const result = NotificationTemplateUtil.replaceErrorTemplate(
        template,
        params,
      );
      expect(result).toBe("Error: Connection failed in {operation}");
    });

    it("should handle undefined and null values", () => {
      const template = "Value: {value}";
      const params = { value: undefined };
      const result = NotificationTemplateUtil.replaceErrorTemplate(
        template,
        params,
      );
      expect(result).toBe("Value: {value}");
    });

    it("should convert non-string values to string", () => {
      const template = "Count: {count}, Status: {status}";
      const params = { count: 42, status: true };
      const result = NotificationTemplateUtil.replaceErrorTemplate(
        template,
        params,
      );
      expect(result).toBe("Count: 42, Status: true");
    });
  });

  describe("generateErrorMessage", () => {
    it("should generate error message from template", () => {
      const result = NotificationTemplateUtil.generateErrorMessage(
        "UNSUPPORTED_TYPE",
        {
          channelType: "invalid",
        },
      );
      expect(result).toBe("不支持的通知类型: invalid");
    });

    it("should generate batch processing error message", () => {
      const result = NotificationTemplateUtil.generateErrorMessage(
        "BATCH_PROCESSING_ERROR",
        {
          successful: 8,
          total: 10,
          failed: 2,
        },
      );
      expect(result).toBe("批量处理失败: 成功 8/10，失败 2");
    });
  });

  describe("formatTemplate", () => {
    it("should replace simple variables", () => {
      const template = "Alert {{alertId}} has status {{status}}";
      const variables = { alertId: "ALERT-001", status: "TRIGGERED" };
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("Alert ALERT-001 has status TRIGGERED");
    });

    it("should handle if blocks when condition is true", () => {
      const template = "{{#if severity}}Severity: {{severity}}{{/if}}";
      const variables = { severity: "HIGH" };
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("Severity: HIGH");
    });

    it("should handle if blocks when condition is false", () => {
      const template = "{{#if severity}}Severity: {{severity}}{{/if}}";
      const variables = {};
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("");
    });

    it("should handle unless blocks when condition is false", () => {
      const template = "{{#unless resolved}}Status: Active{{/unless}}";
      const variables = {};
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("Status: Active");
    });

    it("should handle unless blocks when condition is true", () => {
      const template = "{{#unless resolved}}Status: Active{{/unless}}";
      const variables = { resolved: true };
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("");
    });

    it("should remove comments from template", () => {
      const template = "Alert {{!-- This is a comment --}} {{alertId}}";
      const variables = { alertId: "ALERT-001" };
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("Alert  ALERT-001");
    });

    it("should keep unreplaced variables when not provided", () => {
      const template = "Alert {{alertId}} has metric {{metric}}";
      const variables = { alertId: "ALERT-001" };
      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("Alert ALERT-001 has metric {{metric}}");
    });
  });

  describe("isValidVariableName", () => {
    it("should return true for valid variable names", () => {
      expect(NotificationTemplateUtil.isValidVariableName("alertId")).toBe(
        true,
      );
      expect(NotificationTemplateUtil.isValidVariableName("rule_name")).toBe(
        true,
      );
      expect(NotificationTemplateUtil.isValidVariableName("a")).toBe(true);
    });

    it("should return false for invalid variable names", () => {
      expect(NotificationTemplateUtil.isValidVariableName("123invalid")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidVariableName("invalid-name")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidVariableName("")).toBe(false);
    });

    it("should return false for names exceeding max length", () => {
      const longName = "a".repeat(51);
      expect(NotificationTemplateUtil.isValidVariableName(longName)).toBe(
        false,
      );
    });
  });

  describe("isValidTemplateLength", () => {
    it("should return true for valid template lengths", () => {
      expect(NotificationTemplateUtil.isValidTemplateLength("a")).toBe(true);
      expect(
        NotificationTemplateUtil.isValidTemplateLength("Hello {{name}}"),
      ).toBe(true);
    });

    it("should return false for empty templates", () => {
      expect(NotificationTemplateUtil.isValidTemplateLength("")).toBe(false);
    });

    it("should return false for templates exceeding max length", () => {
      const longTemplate = "a".repeat(10001);
      expect(NotificationTemplateUtil.isValidTemplateLength(longTemplate)).toBe(
        false,
      );
    });
  });

  describe("extractVariables", () => {
    it("should extract variables from template", () => {
      const template = "Alert {{alertId}} has {{metric}} = {{value}}";
      const variables = NotificationTemplateUtil.extractVariables(template);
      expect(variables).toEqual(["alertId", "metric", "value"]);
    });

    it("should extract unique variables only", () => {
      const template = "{{alertId}} - {{alertId}} has {{status}}";
      const variables = NotificationTemplateUtil.extractVariables(template);
      expect(variables).toEqual(["alertId", "status"]);
    });

    it("should return empty array for template without variables", () => {
      const template = "This is a plain text template";
      const variables = NotificationTemplateUtil.extractVariables(template);
      expect(variables).toEqual([]);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid emails", () => {
      expect(NotificationTemplateUtil.isValidEmail("user@example.com")).toBe(
        true,
      );
      expect(
        NotificationTemplateUtil.isValidEmail("test.user@domain.org"),
      ).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(NotificationTemplateUtil.isValidEmail("invalid@email")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidEmail("invalid")).toBe(false);
      expect(NotificationTemplateUtil.isValidEmail("@domain.com")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(NotificationTemplateUtil.isValidUrl("https://example.com")).toBe(
        true,
      );
      expect(
        NotificationTemplateUtil.isValidUrl("http://api.example.com/webhook"),
      ).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(NotificationTemplateUtil.isValidUrl("ftp://example.com")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidUrl("invalid-url")).toBe(false);
      expect(
        NotificationTemplateUtil.isValidUrl("mailto:test@example.com"),
      ).toBe(false);
    });
  });

  describe("calculateRetryDelay", () => {
    beforeEach(() => {
      // Mock Math.random to return consistent value for testing
      jest.spyOn(Math, "random").mockReturnValue(0.5);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should calculate delay for first retry (attempt 0)", () => {
      const delay = NotificationTemplateUtil.calculateRetryDelay(0);
      // Base delay: 1000 * 2^0 = 1000
      // Jitter: 1000 * 0.1 * 0.5 = 50
      // Total: 1000 + 50 = 1050
      expect(delay).toBe(1050);
    });

    it("should calculate delay for second retry (attempt 1)", () => {
      const delay = NotificationTemplateUtil.calculateRetryDelay(1);
      // Base delay: 1000 * 2^1 = 2000
      // Jitter: 2000 * 0.1 * 0.5 = 100
      // Total: 2000 + 100 = 2100
      expect(delay).toBe(2100);
    });

    it("should cap delay at maximum", () => {
      const delay = NotificationTemplateUtil.calculateRetryDelay(10);
      expect(delay).toBeLessThanOrEqual(NOTIFICATION_RETRY_CONFIG.MAX_DELAY_MS);
    });

    it("should include jitter variation", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.1);
      const delay1 = NotificationTemplateUtil.calculateRetryDelay(1);

      jest.spyOn(Math, "random").mockReturnValue(0.9);
      const delay2 = NotificationTemplateUtil.calculateRetryDelay(1);

      expect(delay1).not.toBe(delay2);
      expect(delay1).toBeLessThan(delay2);
    });
  });

  describe("generateTemplateVariables", () => {
    it("should generate template variables from alert and rule", () => {
      const alert = {
        id: "ALERT-001",
        metric: "cpu_usage",
        value: 85.5,
        threshold: 80,
        severity: "HIGH",
        status: "TRIGGERED",
        message: "CPU usage is high",
        startTime: new Date("2023-01-01T10:00:00Z"),
        endTime: new Date("2023-01-01T10:05:00Z"),
        tags: { host: "server1", env: "prod" },
      };

      const rule = {
        id: "RULE-001",
        name: "CPU High Usage",
        description: "Alert when CPU usage exceeds threshold",
      };

      const variables = NotificationTemplateUtil.generateTemplateVariables(
        alert,
        rule,
      );

      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.ALERT_ID]).toBe(
        "ALERT-001",
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.RULE_NAME]).toBe(
        "CPU High Usage",
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.METRIC]).toBe(
        "cpu_usage",
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.VALUE]).toBe(85.5);
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.DURATION]).toBe(300); // 5 minutes
    });

    it("should handle alert without endTime", () => {
      const mockNow = new Date("2023-01-01T10:05:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const alert = {
        id: "ALERT-001",
        startTime: new Date("2023-01-01T10:00:00Z"),
      };
      const rule = { id: "RULE-001", name: "Test Rule" };

      const variables = NotificationTemplateUtil.generateTemplateVariables(
        alert,
        rule,
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.DURATION]).toBe(300);

      jest.restoreAllMocks();
    });

    it("should handle alert without tags", () => {
      const alert = { id: "ALERT-001", startTime: new Date() };
      const rule = { id: "RULE-001", name: "Test Rule" };

      const variables = NotificationTemplateUtil.generateTemplateVariables(
        alert,
        rule,
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.TAGS]).toBeUndefined();
    });
  });
});
