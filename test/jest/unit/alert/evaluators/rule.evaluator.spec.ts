import { Test, TestingModule } from '@nestjs/testing';
import { RuleEvaluator } from '@alert/evaluators/rule.evaluator';
import { IAlertRule } from '@alert/interfaces/alert.interface';
import { MetricData, RuleEvaluationResult } from '@alert/types/alert.types';
import { Operator } from '@alert/constants/index';

describe('RuleEvaluator', () => {
  let evaluator: RuleEvaluator;
  let mockRule: IAlertRule;
  let mockMetricData: MetricData[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleEvaluator],
    }).compile();

    evaluator = module.get<RuleEvaluator>(RuleEvaluator);

    // Setup mock data
    mockRule = {
      id: 'test-rule-1',
      name: 'Test Rule',
      metric: 'cpu_usage',
      operator: '>' as Operator,
      threshold: 80,
      enabled: true,
    } as IAlertRule;

    mockMetricData = [
      {
        metric: 'cpu_usage',
        value: 85,
        timestamp: new Date(),
        tags: { host: 'server1' },
      },
      {
        metric: 'cpu_usage',
        value: 75,
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        tags: { host: 'server1' },
      },
    ];
  });

  describe('evaluateRule', () => {
    it('should evaluate a rule and trigger alert when threshold is exceeded', () => {
      const result = evaluator.evaluateRule(mockRule, mockMetricData);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe('test-rule-1');
      expect(result.triggered).toBe(true);
      expect(result.value).toBe(85);
      expect(result.threshold).toBe(80);
      expect(result.message).toContain('告警触发');
      expect(result.evaluatedAt).toBeInstanceOf(Date);
      expect(result.context).toBeDefined();
      expect(result.context.metric).toBe('cpu_usage');
      expect(result.context.operator).toBe('>');
    });

    it('should not trigger alert when threshold is not exceeded', () => {
      mockRule.threshold = 90;
      const result = evaluator.evaluateRule(mockRule, mockMetricData);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe('test-rule-1');
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(85);
      expect(result.threshold).toBe(90);
      expect(result.message).toContain('正常');
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should handle case when no relevant metric data is found', () => {
      const noMatchMetrics = [
        {
          metric: 'memory_usage', // Different metric
          value: 50,
          timestamp: new Date(),
          tags: {},
        },
      ];

      const result = evaluator.evaluateRule(mockRule, noMatchMetrics);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe('test-rule-1');
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(0);
      expect(result.message).toContain('没有找到指标');
    });

    it('should handle empty metric data array', () => {
      const result = evaluator.evaluateRule(mockRule, []);

      expect(result).toBeDefined();
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(0);
      expect(result.message).toContain('没有找到指标');
    });

    it('should use latest timestamp when multiple metrics exist', () => {
      const metricsWithTimestamps = [
        {
          metric: 'cpu_usage',
          value: 60,
          timestamp: new Date(Date.now() - 120000), // 2 minutes ago
          tags: {},
        },
        {
          metric: 'cpu_usage',
          value: 90,
          timestamp: new Date(), // Latest
          tags: {},
        },
        {
          metric: 'cpu_usage',
          value: 70,
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
          tags: {},
        },
      ];

      const result = evaluator.evaluateRule(mockRule, metricsWithTimestamps);

      expect(result.value).toBe(90); // Should use the latest value
      expect(result.triggered).toBe(true);
    });

    describe('operator testing', () => {
      const testCases = [
        { operator: '>' as Operator, value: 85, threshold: 80, expected: true },
        { operator: '>' as Operator, value: 75, threshold: 80, expected: false },
        { operator: '>=' as Operator, value: 80, threshold: 80, expected: true },
        { operator: '>=' as Operator, value: 85, threshold: 80, expected: true },
        { operator: '>=' as Operator, value: 75, threshold: 80, expected: false },
        { operator: '<' as Operator, value: 75, threshold: 80, expected: true },
        { operator: '<' as Operator, value: 85, threshold: 80, expected: false },
        { operator: '<=' as Operator, value: 80, threshold: 80, expected: true },
        { operator: '<=' as Operator, value: 75, threshold: 80, expected: true },
        { operator: '<=' as Operator, value: 85, threshold: 80, expected: false },
        { operator: '==' as Operator, value: 80, threshold: 80, expected: true },
        { operator: '==' as Operator, value: 75, threshold: 80, expected: false },
        { operator: '!=' as Operator, value: 75, threshold: 80, expected: true },
        { operator: '!=' as Operator, value: 80, threshold: 80, expected: false },
      ];

      testCases.forEach(({ operator, value, threshold, expected }) => {
        it(`should correctly evaluate ${operator} operator with value ${value} and threshold ${threshold}`, () => {
          const rule: IAlertRule = {
            ...mockRule,
            operator,
            threshold,
          };

          const metrics = [
            {
              metric: 'cpu_usage',
              value,
              timestamp: new Date(),
              tags: {},
            },
          ];

          const result = evaluator.evaluateRule(rule, metrics);
          expect(result.triggered).toBe(expected);
        });
      });
    });

    it('should handle invalid metric data gracefully', () => {
      const invalidMetrics = [
        {
          metric: 'cpu_usage',
          value: null, // Invalid value
          timestamp: new Date(),
          tags: {},
        },
        {
          metric: 'cpu_usage',
          value: undefined, // Invalid value
          timestamp: new Date(),
          tags: {},
        },
      ];

      const result = evaluator.evaluateRule(mockRule, invalidMetrics);

      expect(result).toBeDefined();
      expect(result.triggered).toBe(false);
      expect(result.message).toContain('没有找到指标');
    });
  });

  describe('evaluateRules', () => {
    let mockRules: IAlertRule[];

    beforeEach(() => {
      mockRules = [
        {
          id: 'rule-1',
          name: 'CPU Rule',
          metric: 'cpu_usage',
          operator: '>',
          threshold: 80,
          enabled: true,
        },
        {
          id: 'rule-2',
          name: 'Memory Rule',
          metric: 'memory_usage',
          operator: '>',
          threshold: 90,
          enabled: true,
        },
        {
          id: 'rule-3',
          name: 'Disabled Rule',
          metric: 'disk_usage',
          operator: '>',
          threshold: 95,
          enabled: false, // Disabled rule
        },
      ] as IAlertRule[];
    });

    it('should evaluate multiple rules successfully', () => {
      const metrics = [
        {
          metric: 'cpu_usage',
          value: 85,
          timestamp: new Date(),
          tags: {},
        },
        {
          metric: 'memory_usage',
          value: 95,
          timestamp: new Date(),
          tags: {},
        },
      ];

      const results = evaluator.evaluateRules(mockRules, metrics);

      expect(results).toHaveLength(2); // Only enabled rules
      expect(results[0].ruleId).toBe('rule-1');
      expect(results[0].triggered).toBe(true);
      expect(results[1].ruleId).toBe('rule-2');
      expect(results[1].triggered).toBe(true);
    });

    it('should filter out disabled rules', () => {
      const metrics = [
        {
          metric: 'cpu_usage',
          value: 85,
          timestamp: new Date(),
          tags: {},
        },
        {
          metric: 'memory_usage',
          value: 95,
          timestamp: new Date(),
          tags: {},
        },
        {
          metric: 'disk_usage',
          value: 98,
          timestamp: new Date(),
          tags: {},
        },
      ];

      const results = evaluator.evaluateRules(mockRules, metrics);

      expect(results).toHaveLength(2); // Disabled rule should not be evaluated
      expect(results.find(r => r.ruleId === 'rule-3')).toBeUndefined();
    });

    it('should handle empty rules array', () => {
      const results = evaluator.evaluateRules([], mockMetricData);

      expect(results).toHaveLength(0);
    });

    it('should handle rules with no matching metrics', () => {
      const metricsWithoutMatch = [
        {
          metric: 'network_usage', // No rules match this metric
          value: 50,
          timestamp: new Date(),
          tags: {},
        },
      ];

      const results = evaluator.evaluateRules(mockRules, metricsWithoutMatch);

      expect(results).toHaveLength(2); // Only enabled rules processed
      results.forEach(result => {
        expect(result.triggered).toBe(false);
        expect(result.value).toBe(0);
      });
    });

    it('should handle rule evaluation errors gracefully', () => {
      // Create a rule with invalid operator to trigger an error
      const rulesWithInvalidOperator = [
        {
          ...mockRules[0],
          operator: 'invalid_operator' as Operator,
        },
        mockRules[1], // Valid rule
      ];

      const results = evaluator.evaluateRules(rulesWithInvalidOperator, mockMetricData);

      expect(results).toHaveLength(2);
      expect(results[0].triggered).toBe(false);
      expect(results[0].message).toContain('规则评估失败');
    });
  });

  describe('evaluateRulePerformance', () => {
    let mockHistoricalResults: RuleEvaluationResult[];

    beforeEach(() => {
      mockHistoricalResults = [
        {
          ruleId: 'test-rule-1',
          triggered: true,
          value: 85,
          threshold: 80,
          message: 'Alert triggered',
          evaluatedAt: new Date(Date.now() - 300000), // 5 minutes ago
        },
        {
          ruleId: 'test-rule-1',
          triggered: false,
          value: 75,
          threshold: 80,
          message: 'Normal',
          evaluatedAt: new Date(Date.now() - 240000), // 4 minutes ago
        },
        {
          ruleId: 'test-rule-1',
          triggered: true,
          value: 90,
          threshold: 80,
          message: 'Alert triggered',
          evaluatedAt: new Date(Date.now() - 180000), // 3 minutes ago
        },
      ] as RuleEvaluationResult[];
    });

    it('should calculate rule performance metrics', () => {
      const performance = evaluator.evaluateRulePerformance(mockRule, mockHistoricalResults);

      expect(performance).toBeDefined();
      expect(performance.accuracy).toBe(85); // Default baseline
      expect(performance.triggerRate).toBeCloseTo(66.67, 1); // 2 out of 3 triggered
      expect(performance.averageResponseTime).toBeGreaterThan(0);
      expect(performance.falsePositiveRate).toBe(10); // Default baseline
    });

    it('should handle empty historical results', () => {
      const performance = evaluator.evaluateRulePerformance(mockRule, []);

      expect(performance).toBeDefined();
      expect(performance.accuracy).toBe(0);
      expect(performance.triggerRate).toBe(0);
      expect(performance.averageResponseTime).toBe(0);
      expect(performance.falsePositiveRate).toBe(0);
    });

    it('should handle single result', () => {
      const singleResult = [mockHistoricalResults[0]];
      const performance = evaluator.evaluateRulePerformance(mockRule, singleResult);

      expect(performance).toBeDefined();
      expect(performance.accuracy).toBe(85);
      expect(performance.triggerRate).toBe(100); // 1 out of 1 triggered
      expect(performance.averageResponseTime).toBe(0); // No time difference with single result
    });
  });

  describe('simulateEvaluation', () => {
    let mockTestMetrics: MetricData[];

    beforeEach(() => {
      mockTestMetrics = [
        {
          metric: 'cpu_usage',
          value: 85,
          timestamp: new Date(),
          tags: {},
        },
        {
          metric: 'cpu_usage',
          value: 75,
          timestamp: new Date(),
          tags: {},
        },
        {
          metric: 'cpu_usage',
          value: 95,
          timestamp: new Date(),
          tags: {},
        },
      ];
    });

    it('should simulate rule evaluation with test metrics', () => {
      const simulation = evaluator.simulateEvaluation(mockRule, mockTestMetrics);

      expect(simulation).toBeDefined();
      expect(simulation.results).toHaveLength(3);
      expect(simulation.summary).toBeDefined();
      expect(simulation.summary.totalEvaluations).toBe(3);
      expect(simulation.summary.triggeredCount).toBe(2); // 85 and 95 > 80
      expect(simulation.summary.triggerRate).toBeCloseTo(66.67, 1);
      expect(simulation.summary.averageValue).toBeCloseTo(85, 1); // (85 + 75 + 95) / 3
    });

    it('should handle empty test metrics', () => {
      const simulation = evaluator.simulateEvaluation(mockRule, []);

      expect(simulation).toBeDefined();
      expect(simulation.results).toHaveLength(0);
      expect(simulation.summary.totalEvaluations).toBe(0);
      expect(simulation.summary.triggeredCount).toBe(0);
      expect(simulation.summary.triggerRate).toBe(0);
      expect(simulation.summary.averageValue).toBe(0);
    });

    it('should simulate with different operators', () => {
      const lessThanRule: IAlertRule = {
        ...mockRule,
        operator: '<',
        threshold: 80,
      };

      const simulation = evaluator.simulateEvaluation(lessThanRule, mockTestMetrics);

      expect(simulation.summary.triggeredCount).toBe(1); // Only 75 < 80
      expect(simulation.summary.triggerRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('getEvaluatorStats', () => {
    it('should return evaluator statistics', () => {
      // Perform some evaluations to generate stats
      evaluator.evaluateRule(mockRule, mockMetricData);
      evaluator.evaluateRule(mockRule, mockMetricData);

      const stats = evaluator.getEvaluatorStats();

      expect(stats).toBeDefined();
      expect(stats.supportedOperators).toEqual(['>', '>=', '<', '<=', '==', '!=']);
      expect(stats.operatorSymbols).toBeDefined();
      expect(stats.totalEvaluations).toBeGreaterThan(0);
      expect(stats.successfulEvaluations).toBeGreaterThan(0);
    });

    it('should return initial stats when no evaluations performed', () => {
      const stats = evaluator.getEvaluatorStats();

      expect(stats).toBeDefined();
      expect(stats.supportedOperators).toEqual(['>', '>=', '<', '<=', '==', '!=']);
      expect(stats.operatorSymbols).toBeDefined();
      expect(stats.totalEvaluations).toBe(0);
      expect(stats.successfulEvaluations).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle unknown operators gracefully', () => {
      const ruleWithUnknownOperator: IAlertRule = {
        ...mockRule,
        operator: 'unknown' as Operator,
      };

      const result = evaluator.evaluateRule(ruleWithUnknownOperator, mockMetricData);

      expect(result.triggered).toBe(false);
    });

    it('should handle malformed metric data', () => {
      const malformedMetrics = [
        {
          metric: 'cpu_usage',
          value: 'not_a_number', // Invalid value type
          timestamp: new Date(),
          tags: {},
        },
      ];

      // Should not throw an error
      expect(() => {
        evaluator.evaluateRule(mockRule, malformedMetrics as any);
      }).not.toThrow();
    });

    it('should handle missing rule properties', () => {
      const incompleteRule = {
        id: 'incomplete-rule',
        // Missing required properties
      };

      expect(() => {
        evaluator.evaluateRule(incompleteRule as any, mockMetricData);
      }).not.toThrow();
    });
  });
});