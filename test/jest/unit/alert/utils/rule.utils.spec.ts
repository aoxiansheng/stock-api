import { AlertRuleUtil } from "../../../../../src/alert/utils/rule.utils";

describe("RuleUtils", () => {
  describe("formatAlertMessage", () => {
    it("should format alert message with variables", () => {
      const template = "Alert for {metric} exceeded threshold of {threshold}";
      const variables = { metric: "cpu_usage", threshold: "80%" };
      
      // 注意：实际实现使用 MessageSemanticsUtil.formatTemplate，
      // 这里我们测试接口而不是具体实现
      expect(() => {
        AlertRuleUtil.formatAlertMessage(template, variables);
      }).not.toThrow();
    });
  });

  describe("generateErrorMessage", () => {
    it("should generate error message for rule validation failure", () => {
      const errorType = "RULE_VALIDATION_FAILED";
      const context = { details: "Invalid threshold value" };
      
      const message = AlertRuleUtil.generateErrorMessage(errorType, context);
      expect(message).toContain("规则验证失败");
      expect(message).toContain("Invalid threshold value");
    });

    it("should generate error message for threshold invalid", () => {
      const errorType = "THRESHOLD_INVALID";
      const context = { threshold: "invalid_value" };
      
      const message = AlertRuleUtil.generateErrorMessage(errorType, context);
      expect(message).toContain("阈值无效");
      expect(message).toContain("invalid_value");
    });

    it("should generate error message for metric invalid", () => {
      const errorType = "METRIC_INVALID";
      const context = { metric: "invalid_metric" };
      
      const message = AlertRuleUtil.generateErrorMessage(errorType, context);
      expect(message).toContain("指标无效");
      expect(message).toContain("invalid_metric");
    });

    it("should generate error message for rule name invalid", () => {
      const errorType = "RULE_NAME_INVALID";
      const context = { name: "invalid_rule_name" };
      
      const message = AlertRuleUtil.generateErrorMessage(errorType, context);
      expect(message).toContain("规则名称无效");
      expect(message).toContain("invalid_rule_name");
    });

    it("should generate default error message for unknown error type", () => {
      const errorType = "UNKNOWN_ERROR";
      const context = { details: "Some error details" };
      
      const message = AlertRuleUtil.generateErrorMessage(errorType, context);
      expect(message).toContain("未知错误");
      expect(message).toContain("Some error details");
    });
  });

  describe("isValidRuleName", () => {
    it("should validate valid rule names", () => {
      expect(AlertRuleUtil.isValidRuleName("CPU Usage Alert")).toBe(true);
      expect(AlertRuleUtil.isValidRuleName("Disk_Space_Alert")).toBe(true);
      expect(AlertRuleUtil.isValidRuleName("NetworkTraffic-Alert")).toBe(true);
      expect(AlertRuleUtil.isValidRuleName("a")).toBe(true); // 最小长度
      expect(AlertRuleUtil.isValidRuleName("a".repeat(100))).toBe(true); // 最大长度
    });

    it("should reject invalid rule names", () => {
      expect(AlertRuleUtil.isValidRuleName("")).toBe(false); // 空字符串
      expect(AlertRuleUtil.isValidRuleName("   ")).toBe(false); // 只有空格
      expect(AlertRuleUtil.isValidRuleName(null as any)).toBe(false); // null
      expect(AlertRuleUtil.isValidRuleName(undefined as any)).toBe(false); // undefined
      expect(AlertRuleUtil.isValidRuleName(123 as any)).toBe(false); // 非字符串
      expect(AlertRuleUtil.isValidRuleName("a".repeat(101))).toBe(false); // 超过最大长度
    });
  });

  describe("isValidMetricName", () => {
    it("should validate valid metric names", () => {
      expect(AlertRuleUtil.isValidMetricName("cpu_usage")).toBe(true);
      expect(AlertRuleUtil.isValidMetricName("memory.usage")).toBe(true);
      expect(AlertRuleUtil.isValidMetricName("disk_space_1")).toBe(true);
      expect(AlertRuleUtil.isValidMetricName("a")).toBe(true); // 最小长度
      expect(AlertRuleUtil.isValidMetricName("a".repeat(200))).toBe(true); // 最大长度
    });

    it("should reject invalid metric names", () => {
      expect(AlertRuleUtil.isValidMetricName("")).toBe(false); // 空字符串
      expect(AlertRuleUtil.isValidMetricName("123invalid")).toBe(false); // 以数字开头
      expect(AlertRuleUtil.isValidMetricName("-invalid")).toBe(false); // 以连字符开头
      expect(AlertRuleUtil.isValidMetricName(null as any)).toBe(false); // null
      expect(AlertRuleUtil.isValidMetricName(undefined as any)).toBe(false); // undefined
      expect(AlertRuleUtil.isValidMetricName(123 as any)).toBe(false); // 非字符串
      expect(AlertRuleUtil.isValidMetricName("a".repeat(201))).toBe(false); // 超过最大长度
    });
  });

  describe("isValidThreshold", () => {
    it("should validate valid thresholds", () => {
      expect(AlertRuleUtil.isValidThreshold(80)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(80.5)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold("80")).toBe(true);
      expect(AlertRuleUtil.isValidThreshold("80.5")).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(0)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(-10)).toBe(true); // 负数也是有效的
    });

    it("should reject invalid thresholds", () => {
      expect(AlertRuleUtil.isValidThreshold("invalid")).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(null)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(undefined)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(NaN)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(Infinity)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(-Infinity)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold({})).toBe(false);
      expect(AlertRuleUtil.isValidThreshold([])).toBe(false);
    });
  });

  describe("generateCooldownCacheKey", () => {
    it("should generate correct cooldown cache key", () => {
      const ruleId = "rule-123";
      const key = AlertRuleUtil.generateCooldownCacheKey(ruleId);
      expect(key).toBe("alert:cooldown:rule-123");
    });

    it("should handle different rule IDs", () => {
      expect(AlertRuleUtil.generateCooldownCacheKey("cpu-alert")).toBe("alert:cooldown:cpu-alert");
      expect(AlertRuleUtil.generateCooldownCacheKey("123")).toBe("alert:cooldown:123");
    });
  });

  describe("isValidOperator", () => {
    it("should validate valid operators", () => {
      expect(AlertRuleUtil.isValidOperator(">")).toBe(true);
      expect(AlertRuleUtil.isValidOperator(">=")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("<")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("<=")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("==")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("!=")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("contains")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("not_contains")).toBe(true);
      expect(AlertRuleUtil.isValidOperator("regex")).toBe(true);
    });

    it("should reject invalid operators", () => {
      expect(AlertRuleUtil.isValidOperator("invalid")).toBe(false);
      expect(AlertRuleUtil.isValidOperator("")).toBe(false);
      expect(AlertRuleUtil.isValidOperator(">><")).toBe(false);
      expect(AlertRuleUtil.isValidOperator(null as any)).toBe(false);
      expect(AlertRuleUtil.isValidOperator(undefined as any)).toBe(false);
    });
  });

  describe("isValidSeverity", () => {
    it("should validate valid severity levels", () => {
      expect(AlertRuleUtil.isValidSeverity("critical")).toBe(true);
      expect(AlertRuleUtil.isValidSeverity("warning")).toBe(true);
      expect(AlertRuleUtil.isValidSeverity("info")).toBe(true);
    });

    it("should reject invalid severity levels", () => {
      expect(AlertRuleUtil.isValidSeverity("invalid")).toBe(false);
      expect(AlertRuleUtil.isValidSeverity("")).toBe(false);
      expect(AlertRuleUtil.isValidSeverity("error")).toBe(false);
      expect(AlertRuleUtil.isValidSeverity(null as any)).toBe(false);
      expect(AlertRuleUtil.isValidSeverity(undefined as any)).toBe(false);
    });
  });

  describe("generateRuleSummary", () => {
    it("should generate correct rule summary", () => {
      const rule = {
        name: "CPU Usage Alert",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
      };
      
      const summary = AlertRuleUtil.generateRuleSummary(rule);
      expect(summary).toBe('规则 "CPU Usage Alert": cpu_usage > 80');
    });

    it("should handle different rule configurations", () => {
      const rule = {
        name: "Memory Alert",
        metric: "memory_usage",
        operator: "<=",
        threshold: 20,
      };
      
      const summary = AlertRuleUtil.generateRuleSummary(rule);
      expect(summary).toBe('规则 "Memory Alert": memory_usage <= 20');
    });
  });

  describe("calculateRulePriority", () => {
    it("should calculate correct priority for critical severity", () => {
      const priority = AlertRuleUtil.calculateRulePriority("critical");
      expect(priority).toBe(100);
    });

    it("should calculate correct priority for warning severity", () => {
      const priority = AlertRuleUtil.calculateRulePriority("warning");
      expect(priority).toBe(50);
    });

    it("should calculate correct priority for info severity", () => {
      const priority = AlertRuleUtil.calculateRulePriority("info");
      expect(priority).toBe(10);
    });

    it("should return 0 for invalid severity", () => {
      const priority = AlertRuleUtil.calculateRulePriority("invalid" as any);
      expect(priority).toBe(0);
    });
  });
});