import { RuleEvaluator } from '../../../../src/alert/evaluators/rule.evaluator';
import { IAlertRule, IMetricData, IRuleEvaluationResult } from '../../../../src/alert/interfaces';
import { AlertRuleUtil } from '../../../../src/alert/constants';

describe('RuleEvaluator', () => {
  let evaluator: RuleEvaluator;

  beforeEach(() => {
    evaluator = new RuleEvaluator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(evaluator).toBeDefined();
  });

  describe('evaluateRule', () => {
    const mockRule: IAlertRule = {
      id: 'rule_123',
      name: 'Test Rule',
      metric: 'cpu.usage',
      operator: '>',
      threshold: 80,
      duration: 300,
      severity: 'warning',
      enabled: true,
      channels: [],
      cooldown: 600,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMetricData: IMetricData[] = [
      {
        metric: 'cpu.usage',
        value: 85,
        timestamp: new Date(),
        tags: { host: 'server1' }
      }
    ];

    it('should evaluate rule and return triggered result when condition is met', () => {
      // Act
      const result = evaluator.evaluateRule(mockRule, mockMetricData);

      // Assert
      expect(result.ruleId).toBe('rule_123');
      expect(result.triggered).toBe(true);
      expect(result.value).toBe(85);
      expect(result.threshold).toBe(80);
      expect(result.message).toContain('告警触发');
    });

    it('should evaluate rule and return non-triggered result when condition is not met', () => {
      // Arrange
      const metricData: IMetricData[] = [
        {
          metric: 'cpu.usage',
          value: 75,
          timestamp: new Date(),
          tags: { host: 'server1' }
        }
      ];

      // Act
      const result = evaluator.evaluateRule(mockRule, metricData);

      // Assert
      expect(result.ruleId).toBe('rule_123');
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(75);
      expect(result.message).toContain('正常');
    });

    it('should return non-triggered result when no relevant metric data is found', () => {
      // Arrange
      const metricData: IMetricData[] = [
        {
          metric: 'memory.usage',
          value: 85,
          timestamp: new Date(),
          tags: { host: 'server1' }
        }
      ];

      // Act
      const result = evaluator.evaluateRule(mockRule, metricData);

      // Assert
      expect(result.ruleId).toBe('rule_123');
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(0);
      expect(result.message).toContain('没有找到指标');
    });

    it('should handle different operators correctly', () => {
      // Arrange
      const rules: IAlertRule[] = [
        { ...mockRule, operator: '>', threshold: 80 },
        { ...mockRule, operator: '>=', threshold: 80 },
        { ...mockRule, operator: '<', threshold: 80 },
        { ...mockRule, operator: '<=', threshold: 80 },
        { ...mockRule, operator: '==', threshold: 80 },
        { ...mockRule, operator: '!=', threshold: 80 },
      ];

      const metricData: IMetricData[] = [
        {
          metric: 'cpu.usage',
          value: 80,
          timestamp: new Date(),
          tags: { host: 'server1' }
        }
      ];

      // Act & Assert
      const results = rules.map(rule => evaluator.evaluateRule(rule, metricData));
      
      expect(results[0].triggered).toBe(false); // 80 > 80 = false
      expect(results[1].triggered).toBe(true);  // 80 >= 80 = true
      expect(results[2].triggered).toBe(false); // 80 < 80 = false
      expect(results[3].triggered).toBe(true);  // 80 <= 80 = true
      expect(results[4].triggered).toBe(true);  // 80 == 80 = true
      expect(results[5].triggered).toBe(false); // 80 != 80 = false
    });

    it('should handle evaluation errors gracefully', () => {
      // Arrange
      const invalidRule = { ...mockRule, operator: 'invalid' as any };
      
      // Act
      const result = evaluator.evaluateRule(invalidRule, mockMetricData);

      // Assert
      expect(result.triggered).toBe(false);
    });
  });

  describe('evaluateRules', () => {
    const mockRules: IAlertRule[] = [
      {
        id: 'rule_1',
        name: 'CPU Usage Rule',
        metric: 'cpu.usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule_2',
        name: 'Memory Usage Rule',
        metric: 'memory.usage',
        operator: '>',
        threshold: 90,
        duration: 300,
        severity: 'critical',
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    const mockMetricData: IMetricData[] = [
      {
        metric: 'cpu.usage',
        value: 85,
        timestamp: new Date(),
        tags: { host: 'server1' }
      },
      {
        metric: 'memory.usage',
        value: 95,
        timestamp: new Date(),
        tags: { host: 'server1' }
      }
    ];

    it('should evaluate multiple rules and return results', () => {
      // Act
      const results = evaluator.evaluateRules(mockRules, mockMetricData);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].ruleId).toBe('rule_1');
      expect(results[0].triggered).toBe(true);
      expect(results[1].ruleId).toBe('rule_2');
      expect(results[1].triggered).toBe(true);
    });

    it('should only evaluate enabled rules', () => {
      // Arrange
      const rules = [
        { ...mockRules[0], enabled: false },
        { ...mockRules[1], enabled: true }
      ];

      // Act
      const results = evaluator.evaluateRules(rules, mockMetricData);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('rule_2');
    });

    it('should handle rule evaluation errors gracefully', () => {
      // Arrange
      const rules = [
        { ...mockRules[0], operator: 'invalid' as any },
        { ...mockRules[1] }
      ];

      // Act
      const results = evaluator.evaluateRules(rules, mockMetricData);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].triggered).toBe(false);
      expect(results[0].message).toContain('规则评估失败');
      expect(results[1].triggered).toBe(true);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate different conditions correctly', () => {
      // Act & Assert
      expect(evaluator['evaluateCondition'](85, '>', 80)).toBe(true);
      expect(evaluator['evaluateCondition'](85, '>=', 80)).toBe(true);
      expect(evaluator['evaluateCondition'](85, '<', 80)).toBe(false);
      expect(evaluator['evaluateCondition'](85, '<=', 80)).toBe(false);
      expect(evaluator['evaluateCondition'](85, '==', 80)).toBe(false);
      expect(evaluator['evaluateCondition'](85, '!=', 80)).toBe(true);
    });

    it('should return false for unknown operators', () => {
      // Act
      const result = evaluator['evaluateCondition'](85, 'unknown' as any, 80);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getOperatorSymbol', () => {
    it('should return correct operator symbols', () => {
      // Act & Assert
      expect(evaluator['getOperatorSymbol']('>')).toBe('大于');
      expect(evaluator['getOperatorSymbol']('>=')).toBe('大于等于');
      expect(evaluator['getOperatorSymbol']('<')).toBe('小于');
      expect(evaluator['getOperatorSymbol']('<=')).toBe('小于等于');
      expect(evaluator['getOperatorSymbol']('==')).toBe('等于');
      expect(evaluator['getOperatorSymbol']('!=')).toBe('不等于');
      expect(evaluator['getOperatorSymbol']('unknown')).toBe('unknown');
    });
  });

  describe('evaluateRulePerformance', () => {
    const mockRule: IAlertRule = {
      id: 'rule_123',
      name: 'Test Rule',
      metric: 'cpu.usage',
      operator: '>',
      threshold: 80,
      duration: 300,
      severity: 'warning',
      enabled: true,
      channels: [],
      cooldown: 600,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockResults: IRuleEvaluationResult[] = [
      {
        ruleId: 'rule_123',
        triggered: true,
        value: 85,
        threshold: 80,
        message: 'Alert triggered',
        evaluatedAt: new Date(Date.now() - 10000),
        context: {}
      },
      {
        ruleId: 'rule_123',
        triggered: false,
        value: 75,
        threshold: 80,
        message: 'Normal',
        evaluatedAt: new Date(Date.now() - 5000),
        context: {}
      }
    ];

    it('should evaluate rule performance and return statistics', () => {
      // Act
      const performance = evaluator.evaluateRulePerformance(mockRule, mockResults);

      // Assert
      expect(performance).toEqual({
        accuracy: 85,
        triggerRate: 50,
        averageResponseTime: expect.any(Number),
        falsePositiveRate: 10
      });
    });

    it('should return default values when no results provided', () => {
      // Act
      const performance = evaluator.evaluateRulePerformance(mockRule, []);

      // Assert
      expect(performance).toEqual({
        accuracy: 0,
        triggerRate: 0,
        averageResponseTime: 0,
        falsePositiveRate: 0
      });
    });
  });

  describe('simulateEvaluation', () => {
    const mockRule: IAlertRule = {
      id: 'rule_123',
      name: 'Test Rule',
      metric: 'cpu.usage',
      operator: '>',
      threshold: 80,
      duration: 300,
      severity: 'warning',
      enabled: true,
      channels: [],
      cooldown: 600,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockTestMetrics: IMetricData[] = [
      {
        metric: 'cpu.usage',
        value: 85,
        timestamp: new Date(),
        tags: { host: 'server1' }
      },
      {
        metric: 'cpu.usage',
        value: 75,
        timestamp: new Date(Date.now() - 1000),
        tags: { host: 'server1' }
      }
    ];

    it('should simulate rule evaluation and return results', () => {
      // Act
      const simulation = evaluator.simulateEvaluation(mockRule, mockTestMetrics);

      // Assert
      expect(simulation.results).toHaveLength(2);
      expect(simulation.summary).toEqual({
        totalEvaluations: 2,
        triggeredCount: 1,
        triggerRate: 50,
        averageValue: 80
      });
    });
  });

  describe('getEvaluatorStats', () => {
    it('should return evaluator statistics', () => {
      // Act
      const stats = evaluator.getEvaluatorStats();

      // Assert
      expect(stats).toEqual({
        supportedOperators: expect.arrayContaining(['>', '>=', '<', '<=', '==', '!=']),
        operatorSymbols: expect.any(Object),
        totalEvaluations: expect.any(Number),
        successfulEvaluations: expect.any(Number)
      });
    });
  });
});