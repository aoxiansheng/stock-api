import { 
  ALERT_MESSAGES, 
  ALERT_OPERATIONS, 
  ALERT_METRICS, 
  OPERATOR_SYMBOLS 
} from "../../../../../src/alert/constants/messages";

describe("AlertMessages", () => {
  describe("ALERT_MESSAGES", () => {
    it("should have correct success messages", () => {
      expect(ALERT_MESSAGES.SUCCESS.RULE_CREATED).toBe("告警规则创建成功");
      expect(ALERT_MESSAGES.SUCCESS.RULE_UPDATED).toBe("告警规则更新成功");
      expect(ALERT_MESSAGES.SUCCESS.RULE_DELETED).toBe("告警规则删除成功");
      expect(ALERT_MESSAGES.SUCCESS.ALERT_RESOLVED).toBe("告警已解决");
      expect(ALERT_MESSAGES.SUCCESS.ALERT_DISMISSED).toBe("告警已忽略");
    });

    it("should have correct error messages", () => {
      expect(ALERT_MESSAGES.ERRORS.RULE_NOT_FOUND).toBe("告警规则不存在");
      expect(ALERT_MESSAGES.ERRORS.INVALID_THRESHOLD).toBe("阈值设置无效");
      expect(ALERT_MESSAGES.ERRORS.INVALID_CONDITION).toBe("告警条件无效");
      expect(ALERT_MESSAGES.ERRORS.NOTIFICATION_FAILED).toBe("通知发送失败");
      expect(ALERT_MESSAGES.ERRORS.EVALUATION_FAILED).toBe("告警评估失败");
    });

    it("should have correct status messages", () => {
      expect(ALERT_MESSAGES.STATUS.PROCESSING).toBe("处理中...");
      expect(ALERT_MESSAGES.STATUS.EVALUATING).toBe("评估中...");
      expect(ALERT_MESSAGES.STATUS.TRIGGERING).toBe("触发中...");
      expect(ALERT_MESSAGES.STATUS.NOTIFYING).toBe("发送通知中...");
    });

    it("should have correct rate limit messages", () => {
      expect(ALERT_MESSAGES.RATE_LIMIT.TRIGGER_RATE_EXCEEDED).toBe("手动触发告警评估频率超出限制，请稍后再试");
      expect(ALERT_MESSAGES.RATE_LIMIT.NOTIFICATION_RATE_EXCEEDED).toBe("通知发送频率超出限制，请稍后再试");
    });

    it("should have correct validation messages", () => {
      expect(ALERT_MESSAGES.VALIDATION.RULE_NAME_REQUIRED).toBe("告警规则名称不能为空");
      expect(ALERT_MESSAGES.VALIDATION.RULE_NAME_TOO_LONG).toBe("告警规则名称长度不能超过100字符");
      expect(ALERT_MESSAGES.VALIDATION.THRESHOLD_REQUIRED).toBe("阈值不能为空");
      expect(ALERT_MESSAGES.VALIDATION.THRESHOLD_INVALID).toBe("阈值必须是有效数字");
      expect(ALERT_MESSAGES.VALIDATION.INTERVAL_TOO_SHORT).toBe("时间间隔不能小于30秒");
      expect(ALERT_MESSAGES.VALIDATION.INTERVAL_TOO_LONG).toBe("时间间隔不能超过24小时");
    });

    it("should have correct rule messages", () => {
      expect(ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED).toBe("规则评估失败");
      expect(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED).toBe("规则评估开始");
      expect(ALERT_MESSAGES.RULES.METRICS_PROCESSED).toBe("指标处理完成");
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_MESSAGES.SUCCESS.RULE_CREATED = "规则创建完成";
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_MESSAGES.ERRORS.RULE_NOT_FOUND = "规则不存在";
      }).toThrow();
    });
  });

  describe("ALERT_OPERATIONS", () => {
    it("should have correct operation values", () => {
      expect(ALERT_OPERATIONS.RULES.EVALUATE_RULES_SCHEDULED).toBe("evaluate_rules_scheduled");
      expect(ALERT_OPERATIONS.RULES.HANDLE_RULE_EVALUATION).toBe("handle_rule_evaluation");
      expect(ALERT_OPERATIONS.RULES.CREATE_RULE).toBe("create_rule");
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_OPERATIONS.RULES.EVALUATE_RULES_SCHEDULED = "schedule_rule_evaluation";
      }).toThrow();
    });
  });

  describe("ALERT_METRICS", () => {
    it("should have correct metric values", () => {
      expect(ALERT_METRICS.RULES.RULE_EVALUATION_COUNT).toBe("rule_evaluation_count");
      expect(ALERT_METRICS.RULES.AVERAGE_RULE_EVALUATION_TIME).toBe("average_rule_evaluation_time");
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_METRICS.RULES.RULE_EVALUATION_COUNT = "rule_evaluations";
      }).toThrow();
    });
  });

  describe("OPERATOR_SYMBOLS", () => {
    it("should have correct operator symbol mappings", () => {
      expect(OPERATOR_SYMBOLS[">"]).toBe("大于");
      expect(OPERATOR_SYMBOLS[">="]).toBe("大于等于");
      expect(OPERATOR_SYMBOLS["<"]).toBe("小于");
      expect(OPERATOR_SYMBOLS["<="]).toBe("小于等于");
      expect(OPERATOR_SYMBOLS["=="]).toBe("等于");
      expect(OPERATOR_SYMBOLS["!="]).toBe("不等于");
      expect(OPERATOR_SYMBOLS["contains"]).toBe("包含");
      expect(OPERATOR_SYMBOLS["not_contains"]).toBe("不包含");
      expect(OPERATOR_SYMBOLS["regex"]).toBe("正则匹配");
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        OPERATOR_SYMBOLS[">"] = "高于";
      }).toThrow();
    });
  });
});