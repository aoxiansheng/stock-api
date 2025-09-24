import { 
  IMetricData, 
  IRuleEvaluationResult, 
  IRuleEngine 
} from "../../../../../src/alert/interfaces/rule-engine.interface";
import { IAlertRule } from "../../../../../src/alert/interfaces/alert.interface";

describe("RuleEngineInterface", () => {
  describe("IMetricData", () => {
    it("should define the correct structure for metric data interface", () => {
      const metricData: IMetricData = {
        metric: "cpu_usage",
        value: 85.5,
        timestamp: new Date(),
        tags: { host: "server-1", environment: "production" },
      };

      // 验证必需字段
      expect(metricData.metric).toBeDefined();
      expect(metricData.value).toBeDefined();
      expect(metricData.timestamp).toBeDefined();

      // 验证可选字段
      expect(metricData.tags).toBeDefined();
    });
  });

  describe("IRuleEvaluationResult", () => {
    it("should define the correct structure for rule evaluation result interface", () => {
      const evaluationResult: IRuleEvaluationResult = {
        ruleId: "rule-123",
        triggered: true,
        value: 85.5,
        threshold: 80,
        message: "CPU usage exceeded threshold",
        evaluatedAt: new Date(),
        context: { currentValue: 85.5, threshold: 80 },
      };

      // 验证必需字段
      expect(evaluationResult.ruleId).toBeDefined();
      expect(evaluationResult.triggered).toBeDefined();
      expect(evaluationResult.value).toBeDefined();
      expect(evaluationResult.threshold).toBeDefined();
      expect(evaluationResult.message).toBeDefined();
      expect(evaluationResult.evaluatedAt).toBeDefined();

      // 验证可选字段
      expect(evaluationResult.context).toBeDefined();
    });
  });

  describe("IRuleEngine", () => {
    it("should define the correct structure for rule engine interface", () => {
      // 创建一个模拟的规则引擎实现来验证接口结构
      const mockRuleEngine: IRuleEngine = {
        evaluateRule: jest.fn(),
        evaluateRules: jest.fn(),
        isInCooldown: jest.fn(),
        setCooldown: jest.fn(),
        validateRule: jest.fn(),
      };

      // 验证接口方法
      expect(typeof mockRuleEngine.evaluateRule).toBe("function");
      expect(typeof mockRuleEngine.evaluateRules).toBe("function");
      expect(typeof mockRuleEngine.isInCooldown).toBe("function");
      expect(typeof mockRuleEngine.setCooldown).toBe("function");
      expect(typeof mockRuleEngine.validateRule).toBe("function");
    });

    it("should define correct method signatures", () => {
      // 创建一个模拟的规则引擎实现
      const mockRuleEngine: IRuleEngine = {
        evaluateRule: (rule: IAlertRule, metricData: IMetricData[]) => {
          return {
            ruleId: rule.id,
            triggered: true,
            value: 85.5,
            threshold: rule.threshold,
            message: "Test evaluation",
            evaluatedAt: new Date(),
          };
        },
        evaluateRules: (rules: IAlertRule[], metricData: IMetricData[]) => {
          return rules.map(rule => ({
            ruleId: rule.id,
            triggered: true,
            value: 85.5,
            threshold: rule.threshold,
            message: "Test evaluation",
            evaluatedAt: new Date(),
          }));
        },
        isInCooldown: async (ruleId: string) => {
          return false;
        },
        setCooldown: async (ruleId: string, cooldownSeconds: number) => {
          // Mock implementation
        },
        validateRule: (rule: IAlertRule) => {
          return { valid: true, errors: [] };
        },
      };

      // 验证方法签名
      const mockRule: IAlertRule = {
        id: "rule-123",
        name: "Test Rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: "warning",
        enabled: true,
        channels: [],
        cooldown: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMetricData: IMetricData[] = [
        {
          metric: "cpu_usage",
          value: 85.5,
          timestamp: new Date(),
        },
      ];

      // 测试 evaluateRule 方法
      const evaluationResult = mockRuleEngine.evaluateRule(mockRule, mockMetricData);
      expect(evaluationResult.ruleId).toBe("rule-123");
      expect(evaluationResult.triggered).toBe(true);

      // 测试 evaluateRules 方法
      const evaluationResults = mockRuleEngine.evaluateRules([mockRule], mockMetricData);
      expect(evaluationResults).toHaveLength(1);
      expect(evaluationResults[0].ruleId).toBe("rule-123");

      // 测试 isInCooldown 方法
      mockRuleEngine.isInCooldown("rule-123").then(result => {
        expect(result).toBe(false);
      });

      // 测试 validateRule 方法
      const validationResult = mockRuleEngine.validateRule(mockRule);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });
});