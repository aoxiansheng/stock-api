/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ERROR_TEMPLATES,
  NOTIFICATION_TEMPLATE_VARIABLES,
  NOTIFICATION_TEMPLATE_PATTERNS,
  NOTIFICATION_CONFIG,
  NOTIFICATION_TYPE_PRIORITY,
  NOTIFICATION_METRICS,
  NOTIFICATION_VALIDATION_RULES,
  NOTIFICATION_TIME_CONFIG,
  NOTIFICATION_ALERT_THRESHOLDS,
  NOTIFICATION_RETRY_CONFIG,
} from "../../../../../src/alert/constants/notification.constants";

describe("Notification Constants", () => {
  describe("NOTIFICATION_OPERATIONS", () => {
    it("应包含所有必需的操作常量", () => {
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
      expect(NOTIFICATION_OPERATIONS.INITIALIZE_SENDERS).toBe(
        "initializeSenders",
      );
      expect(NOTIFICATION_OPERATIONS.FORMAT_STRING).toBe("formatString");
      expect(NOTIFICATION_OPERATIONS.VALIDATE_CHANNEL_CONFIG).toBe(
        "validateChannelConfig",
      );
      expect(NOTIFICATION_OPERATIONS.GET_SENDER_STATUS).toBe("getSenderStatus");
      expect(NOTIFICATION_OPERATIONS.PROCESS_NOTIFICATION_RESULT).toBe(
        "processNotificationResult",
      );
      expect(NOTIFICATION_OPERATIONS.HANDLE_NOTIFICATION_ERROR).toBe(
        "handleNotificationError",
      );
    });

    it("应是不可变对象", () => {
      expect(Object.isFrozen(NOTIFICATION_OPERATIONS)).toBe(true);
    });
  });

  describe("NOTIFICATION_MESSAGES", () => {
    it("应包含所有成功消息", () => {
      expect(NOTIFICATION_MESSAGES.NOTIFICATION_SENT).toBe("通知发送成功");
      expect(NOTIFICATION_MESSAGES.BATCH_NOTIFICATIONS_COMPLETED).toBe(
        "批量通知发送完成",
      );
      expect(NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED).toBe(
        "通知渠道测试通过",
      );
      expect(NOTIFICATION_MESSAGES.TEMPLATE_GENERATED).toBe("通知模板生成成功");
      expect(NOTIFICATION_MESSAGES.SENDERS_INITIALIZED).toBe(
        "通知发送器初始化完成",
      );
    });

    it("应包含所有错误消息", () => {
      expect(NOTIFICATION_MESSAGES.UNSUPPORTED_NOTIFICATION_TYPE).toBe(
        "不支持的通知类型",
      );
      expect(NOTIFICATION_MESSAGES.BATCH_NOTIFICATION_FAILED).toBe(
        "批量发送中单个通知执行失败",
      );
      expect(NOTIFICATION_MESSAGES.SEND_FAILED).toBe("发送失败");
      expect(NOTIFICATION_MESSAGES.CHANNEL_TEST_FAILED).toBe(
        "通知渠道测试失败",
      );
      expect(NOTIFICATION_MESSAGES.TEMPLATE_GENERATION_FAILED).toBe(
        "通知模板生成失败",
      );
    });

    it("应是不可变对象", () => {
      expect(Object.isFrozen(NOTIFICATION_MESSAGES)).toBe(true);
    });
  });

  describe("NOTIFICATION_TEMPLATE_PATTERNS", () => {
    it("应包含所有模板模式", () => {
      expect(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_SOURCE).toBe(
        "\\{\\{(\\w+)\\}\\}",
      );
      expect(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_FLAGS).toBe("g");
    });

    it("模式字符串应能创建有效的正则表达式", () => {
      const variablePattern = new RegExp(
        NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_SOURCE,
        NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_FLAGS,
      );
      expect(variablePattern.test("{{variable}}")).toBe(true);
      expect(variablePattern.test("{variable}")).toBe(false);

      // Test that the pattern is valid
      expect(
        () =>
          new RegExp(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN_SOURCE),
      ).not.toThrow();
    });

    it("应是不可变对象", () => {
      expect(Object.isFrozen(NOTIFICATION_TEMPLATE_PATTERNS)).toBe(true);
    });
  });

  describe("NOTIFICATION_CONFIG", () => {
    it("应包含正确的配置值", () => {
      expect(NOTIFICATION_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(NOTIFICATION_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(NOTIFICATION_CONFIG.RETRY_DELAY_MS).toBe(1000);
      expect(NOTIFICATION_CONFIG.BATCH_SIZE_LIMIT).toBe(100);
      expect(NOTIFICATION_CONFIG.TEMPLATE_CACHE_TTL_MS).toBe(300000);
      expect(NOTIFICATION_CONFIG.SENDER_HEALTH_CHECK_INTERVAL_MS).toBe(60000);
      expect(NOTIFICATION_CONFIG.MAX_TEMPLATE_SIZE_BYTES).toBe(10240);
      expect(NOTIFICATION_CONFIG.MAX_VARIABLE_COUNT).toBe(50);
    });

    it("应是不可变对象", () => {
      expect(Object.isFrozen(NOTIFICATION_CONFIG)).toBe(true);
    });
  });

  describe("NOTIFICATION_TYPE_PRIORITY", () => {
    it("应包含正确的优先级设置", () => {
      expect(NOTIFICATION_TYPE_PRIORITY.EMAIL).toBe(1);
      expect(NOTIFICATION_TYPE_PRIORITY.SLACK).toBe(2);
      expect(NOTIFICATION_TYPE_PRIORITY.WEBHOOK).toBe(3);
      expect(NOTIFICATION_TYPE_PRIORITY.DINGTALK).toBe(4);
      expect(NOTIFICATION_TYPE_PRIORITY.LOG).toBe(5);
    });

    it("应是不可变对象", () => {
      expect(Object.isFrozen(NOTIFICATION_TYPE_PRIORITY)).toBe(true);
    });
  });

  describe("NOTIFICATION_VALIDATION_RULES", () => {
    it("应包含正确的验证规则", () => {
      expect(NOTIFICATION_VALIDATION_RULES.MIN_TEMPLATE_LENGTH).toBe(1);
      expect(NOTIFICATION_VALIDATION_RULES.MAX_TEMPLATE_LENGTH).toBe(10000);
      expect(NOTIFICATION_VALIDATION_RULES.MIN_VARIABLE_NAME_LENGTH).toBe(1);
      expect(NOTIFICATION_VALIDATION_RULES.MAX_VARIABLE_NAME_LENGTH).toBe(50);
    });

    it("验证模式应能创建有效的正则表达式", () => {
      const variableNamePattern = new RegExp(
        NOTIFICATION_VALIDATION_RULES.VARIABLE_NAME_PATTERN_SOURCE,
        NOTIFICATION_VALIDATION_RULES.VARIABLE_NAME_PATTERN_FLAGS,
      );
      expect(variableNamePattern.test("alertId")).toBe(true);
      expect(variableNamePattern.test("rule_name")).toBe(true);
      expect(variableNamePattern.test("123invalid")).toBe(false);
      expect(variableNamePattern.test("_invalid")).toBe(false);
    });

    it("应是不可变对象", () => {
      expect(Object.isFrozen(NOTIFICATION_VALIDATION_RULES)).toBe(true);
    });
  });

  describe("All Constants Immutability", () => {
    it("所有导出的常量对象应该是不可变的", () => {
      const constants = [
        NOTIFICATION_OPERATIONS,
        NOTIFICATION_MESSAGES,
        NOTIFICATION_ERROR_TEMPLATES,
        NOTIFICATION_TEMPLATE_VARIABLES,
        NOTIFICATION_TEMPLATE_PATTERNS,
        NOTIFICATION_CONFIG,
        NOTIFICATION_TYPE_PRIORITY,
        NOTIFICATION_METRICS,
        NOTIFICATION_VALIDATION_RULES,
        NOTIFICATION_TIME_CONFIG,
        NOTIFICATION_ALERT_THRESHOLDS,
        NOTIFICATION_RETRY_CONFIG,
      ];

      constants.forEach((constant) => {
        expect(Object.isFrozen(constant)).toBe(true);
      });
    });
  });
});
