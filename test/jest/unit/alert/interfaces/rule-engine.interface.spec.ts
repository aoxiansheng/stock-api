import { IMetricData, IRuleEvaluationResult, IRuleEngine } from '@alert/interfaces/rule-engine.interface';
import { IAlertRule } from '@alert/interfaces/alert.interface';
import { AlertSeverity } from '@alert/types/alert.types';

describe('Rule Engine Interfaces', () => {
  describe('IMetricData Interface', () => {
    it('should create valid IMetricData object with required properties', () => {
      const metricData: IMetricData = {
        metric: 'cpu_usage',
        value: 85.5,
        timestamp: new Date(),
      };

      expect(metricData).toBeDefined();
      expect(metricData.metric).toBe('cpu_usage');
      expect(metricData.value).toBe(85.5);
      expect(metricData.timestamp).toBeInstanceOf(Date);
      expect(metricData.tags).toBeUndefined();
    });

    it('should create valid IMetricData object with optional tags', () => {
      const metricData: IMetricData = {
        metric: 'memory_usage',
        value: 92.3,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        tags: {
          host: 'server-01',
          datacenter: 'us-east-1',
          environment: 'production',
          service: 'api-gateway'
        },
      };

      expect(metricData.tags).toBeDefined();
      expect(metricData.tags?.host).toBe('server-01');
      expect(metricData.tags?.datacenter).toBe('us-east-1');
      expect(metricData.tags?.environment).toBe('production');
      expect(metricData.tags?.service).toBe('api-gateway');
    });

    it('should handle different metric types and values', () => {
      const metrics = [
        { metric: 'response_time', value: 1250.75, timestamp: new Date() },
        { metric: 'error_rate', value: 0.05, timestamp: new Date() },
        { metric: 'request_count', value: 10000, timestamp: new Date() },
        { metric: 'disk_usage_percent', value: 95, timestamp: new Date() },
      ];

      metrics.forEach(metricData => {
        expect(metricData.metric).toBeDefined();
        expect(typeof metricData.value).toBe('number');
        expect(metricData.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should support complex tag structures', () => {
      const metricData: IMetricData = {
        metric: 'custom_metric',
        value: 42.0,
        timestamp: new Date(),
        tags: {
          'app.name': 'my-application',
          'app.version': '2.1.0',
          'infrastructure.region': 'us-west-2',
          'infrastructure.az': 'us-west-2a',
          'team': 'platform',
          'criticality': 'high',
          'monitoring.source': 'cloudwatch',
          'alert.enabled': 'true',
        },
      };

      expect(Object.keys(metricData.tags || {})).toHaveLength(8);
      expect(metricData.tags?.['app.name']).toBe('my-application');
      expect(metricData.tags?.['infrastructure.region']).toBe('us-west-2');
      expect(metricData.tags?.['alert.enabled']).toBe('true');
    });

    it('should handle edge case values', () => {
      const edgeCases = [
        { metric: 'zero_value', value: 0, timestamp: new Date() },
        { metric: 'negative_value', value: -10.5, timestamp: new Date() },
        { metric: 'large_value', value: 999999999.99, timestamp: new Date() },
        { metric: 'small_decimal', value: 0.0001, timestamp: new Date() },
      ];

      edgeCases.forEach(metricData => {
        expect(typeof metricData.value).toBe('number');
        expect(isNaN(metricData.value)).toBe(false);
        expect(metricData.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('IRuleEvaluationResult Interface', () => {
    it('should create valid IRuleEvaluationResult with required properties', () => {
      const result: IRuleEvaluationResult = {
        ruleId: 'rule-123',
        triggered: true,
        value: 85.5,
        threshold: 80.0,
        message: 'CPU usage exceeded threshold',
        evaluatedAt: new Date(),
      };

      expect(result).toBeDefined();
      expect(result.ruleId).toBe('rule-123');
      expect(result.triggered).toBe(true);
      expect(result.value).toBe(85.5);
      expect(result.threshold).toBe(80.0);
      expect(result.message).toBe('CPU usage exceeded threshold');
      expect(result.evaluatedAt).toBeInstanceOf(Date);
      expect(result.context).toBeUndefined();
    });

    it('should create valid IRuleEvaluationResult with context', () => {
      const evaluatedAt = new Date('2023-01-01T12:30:00Z');
      const result: IRuleEvaluationResult = {
        ruleId: 'rule-456',
        triggered: false,
        value: 75.2,
        threshold: 80.0,
        message: 'CPU usage within normal limits',
        evaluatedAt,
        context: {
          operator: '>',
          duration: 300,
          previousValue: 78.5,
          trend: 'decreasing',
          evaluationTime: 45,
          metricCount: 10,
          metadata: {
            source: 'cloudwatch',
            region: 'us-east-1',
            evaluator: 'rule-engine-v2'
          }
        },
      };

      expect(result.context).toBeDefined();
      expect(result.context?.operator).toBe('>');
      expect(result.context?.duration).toBe(300);
      expect(result.context?.previousValue).toBe(78.5);
      expect(result.context?.trend).toBe('decreasing');
      expect(result.context?.evaluationTime).toBe(45);
      expect(result.context?.metricCount).toBe(10);
      expect(result.context?.metadata).toHaveProperty('source', 'cloudwatch');
    });

    it('should handle different trigger states', () => {
      const triggeredResult: IRuleEvaluationResult = {
        ruleId: 'rule-triggered',
        triggered: true,
        value: 95.0,
        threshold: 90.0,
        message: 'Alert triggered: Value 95.0 exceeds threshold 90.0',
        evaluatedAt: new Date(),
      };

      const notTriggeredResult: IRuleEvaluationResult = {
        ruleId: 'rule-not-triggered',
        triggered: false,
        value: 45.0,
        threshold: 50.0,
        message: 'Alert not triggered: Value 45.0 is below threshold 50.0',
        evaluatedAt: new Date(),
      };

      expect(triggeredResult.triggered).toBe(true);
      expect(triggeredResult.value).toBeGreaterThan(triggeredResult.threshold);

      expect(notTriggeredResult.triggered).toBe(false);
      expect(notTriggeredResult.value).toBeLessThan(notTriggeredResult.threshold);
    });

    it('should support detailed evaluation messages', () => {
      const results = [
        {
          ruleId: 'rule-detailed-1',
          triggered: true,
          value: 105.7,
          threshold: 100.0,
          message: 'CRITICAL: API response time (105.7ms) exceeded threshold (100.0ms) for 5 minutes',
          evaluatedAt: new Date(),
        },
        {
          ruleId: 'rule-detailed-2',
          triggered: false,
          value: 3.2,
          threshold: 5.0,
          message: 'OK: Error rate (3.2%) is within acceptable limits (< 5.0%)',
          evaluatedAt: new Date(),
        },
        {
          ruleId: 'rule-detailed-3',
          triggered: true,
          value: 0,
          threshold: 1,
          message: 'WARNING: No heartbeat received - expected at least 1 heartbeat per minute',
          evaluatedAt: new Date(),
        },
      ];

      results.forEach(result => {
        expect(result.message).toBeDefined();
        expect(result.message.length).toBeGreaterThan(10);
        expect(typeof result.message).toBe('string');
      });
    });

    it('should handle edge cases in values', () => {
      const edgeCaseResults = [
        {
          ruleId: 'rule-zero',
          triggered: true,
          value: 0,
          threshold: -1,
          message: 'Zero value triggered',
          evaluatedAt: new Date(),
        },
        {
          ruleId: 'rule-negative',
          triggered: false,
          value: -5.5,
          threshold: -10.0,
          message: 'Negative value within bounds',
          evaluatedAt: new Date(),
        },
        {
          ruleId: 'rule-large',
          triggered: true,
          value: 999999999.99,
          threshold: 1000000000.00,
          message: 'Large value comparison',
          evaluatedAt: new Date(),
        },
      ];

      edgeCaseResults.forEach(result => {
        expect(typeof result.value).toBe('number');
        expect(typeof result.threshold).toBe('number');
        expect(isNaN(result.value)).toBe(false);
        expect(isNaN(result.threshold)).toBe(false);
      });
    });
  });

  describe('IRuleEngine Interface', () => {
    // Since IRuleEngine is an interface, we test by creating mock implementations
    let mockRuleEngine: IRuleEngine;
    let mockRule: IAlertRule;
    let mockMetricData: IMetricData[];

    beforeEach(() => {
      mockRule = {
        id: 'test-rule',
        name: 'Test Rule',
        metric: 'test_metric',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMetricData = [
        {
          metric: 'test_metric',
          value: 85,
          timestamp: new Date(),
          tags: { host: 'server-1' }
        }
      ];

      // Mock implementation of IRuleEngine
      mockRuleEngine = {
        evaluateRule: jest.fn().mockReturnValue({
          ruleId: 'test-rule',
          triggered: true,
          value: 85,
          threshold: 80,
          message: 'Test alert triggered',
          evaluatedAt: new Date(),
        }),
        evaluateRules: jest.fn().mockReturnValue([]),
        isInCooldown: jest.fn().mockResolvedValue(false),
        setCooldown: jest.fn().mockResolvedValue(undefined),
        validateRule: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      };
    });

    it('should have evaluateRule method with correct signature', () => {
      expect(mockRuleEngine.evaluateRule).toBeDefined();
      expect(typeof mockRuleEngine.evaluateRule).toBe('function');

      const result = mockRuleEngine.evaluateRule(mockRule, mockMetricData);

      expect(result).toBeDefined();
      expect(result.ruleId).toBeDefined();
      expect(typeof result.triggered).toBe('boolean');
      expect(typeof result.value).toBe('number');
      expect(typeof result.threshold).toBe('number');
      expect(typeof result.message).toBe('string');
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should have evaluateRules method with correct signature', () => {
      expect(mockRuleEngine.evaluateRules).toBeDefined();
      expect(typeof mockRuleEngine.evaluateRules).toBe('function');

      const rules = [mockRule];
      const results = mockRuleEngine.evaluateRules(rules, mockMetricData);

      expect(Array.isArray(results)).toBe(true);
      expect(mockRuleEngine.evaluateRules).toHaveBeenCalledWith(rules, mockMetricData);
    });

    it('should have async cooldown methods with correct signatures', async () => {
      expect(mockRuleEngine.isInCooldown).toBeDefined();
      expect(typeof mockRuleEngine.isInCooldown).toBe('function');
      expect(mockRuleEngine.setCooldown).toBeDefined();
      expect(typeof mockRuleEngine.setCooldown).toBe('function');

      const isInCooldown = await mockRuleEngine.isInCooldown('test-rule');
      expect(typeof isInCooldown).toBe('boolean');

      await expect(mockRuleEngine.setCooldown('test-rule', 300)).resolves.toBeUndefined();
      expect(mockRuleEngine.setCooldown).toHaveBeenCalledWith('test-rule', 300);
    });

    it('should have validateRule method with correct signature', () => {
      expect(mockRuleEngine.validateRule).toBeDefined();
      expect(typeof mockRuleEngine.validateRule).toBe('function');

      const validation = mockRuleEngine.validateRule(mockRule);

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
    });

    it('should handle multiple rules evaluation', () => {
      const multipleRules: IAlertRule[] = [
        mockRule,
        {
          ...mockRule,
          id: 'rule-2',
          name: 'Second Rule',
          threshold: 90,
        },
        {
          ...mockRule,
          id: 'rule-3',
          name: 'Third Rule',
          metric: 'memory_usage',
          threshold: 85,
        },
      ];

      const mockResults: IRuleEvaluationResult[] = multipleRules.map(rule => ({
        ruleId: rule.id,
        triggered: false,
        value: 70,
        threshold: rule.threshold,
        message: `Rule ${rule.id} evaluated`,
        evaluatedAt: new Date(),
      }));

      mockRuleEngine.evaluateRules = jest.fn().mockReturnValue(mockResults);

      const results = mockRuleEngine.evaluateRules(multipleRules, mockMetricData);

      expect(results).toHaveLength(3);
      expect(results.every(result => typeof result.ruleId === 'string')).toBe(true);
      expect(results.every(result => typeof result.triggered === 'boolean')).toBe(true);
    });

    it('should handle rule validation with errors', () => {
      const invalidRule: IAlertRule = {
        ...mockRule,
        threshold: -1, // Invalid threshold
        duration: -300, // Invalid duration
      };

      const mockValidation = {
        valid: false,
        errors: [
          'Threshold must be positive',
          'Duration must be positive',
        ],
      };

      mockRuleEngine.validateRule = jest.fn().mockReturnValue(mockValidation);

      const validation = mockRuleEngine.validateRule(invalidRule);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.errors).toContain('Threshold must be positive');
      expect(validation.errors).toContain('Duration must be positive');
    });

    it('should handle cooldown operations correctly', async () => {
      const ruleId = 'cooldown-test-rule';

      // Test setting cooldown
      mockRuleEngine.setCooldown = jest.fn().mockResolvedValue(undefined);
      await mockRuleEngine.setCooldown(ruleId, 600);
      expect(mockRuleEngine.setCooldown).toHaveBeenCalledWith(ruleId, 600);

      // Test checking cooldown status
      mockRuleEngine.isInCooldown = jest.fn().mockResolvedValue(true);
      const inCooldown = await mockRuleEngine.isInCooldown(ruleId);
      expect(inCooldown).toBe(true);
      expect(mockRuleEngine.isInCooldown).toHaveBeenCalledWith(ruleId);
    });
  });

  describe('Interface Type Safety and Compatibility', () => {
    it('should enforce correct types in IMetricData', () => {
      const createMetricData = (data: IMetricData): IMetricData => data;

      const validData: IMetricData = {
        metric: 'test_metric',
        value: 42.5,
        timestamp: new Date(),
      };

      expect(() => createMetricData(validData)).not.toThrow();
    });

    it('should enforce correct types in IRuleEvaluationResult', () => {
      const createResult = (result: IRuleEvaluationResult): IRuleEvaluationResult => result;

      const validResult: IRuleEvaluationResult = {
        ruleId: 'test-rule',
        triggered: true,
        value: 100,
        threshold: 80,
        message: 'Test message',
        evaluatedAt: new Date(),
      };

      expect(() => createResult(validResult)).not.toThrow();
    });

    it('should be compatible with JSON serialization', () => {
      const metricData: IMetricData = {
        metric: 'json_test_metric',
        value: 123.45,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        tags: { environment: 'test' },
      };

      const result: IRuleEvaluationResult = {
        ruleId: 'json-test-rule',
        triggered: true,
        value: 123.45,
        threshold: 100.0,
        message: 'JSON serialization test',
        evaluatedAt: new Date('2023-01-01T12:05:00Z'),
        context: { test: true },
      };

      const serializedMetric = JSON.stringify(metricData);
      const deserializedMetric = JSON.parse(serializedMetric);

      const serializedResult = JSON.stringify(result);
      const deserializedResult = JSON.parse(serializedResult);

      expect(deserializedMetric.metric).toBe(metricData.metric);
      expect(deserializedMetric.value).toBe(metricData.value);
      expect(deserializedMetric.tags).toEqual(metricData.tags);

      expect(deserializedResult.ruleId).toBe(result.ruleId);
      expect(deserializedResult.triggered).toBe(result.triggered);
      expect(deserializedResult.context).toEqual(result.context);
    });

    it('should handle optional properties correctly', () => {
      const minimalMetric: IMetricData = {
        metric: 'minimal_metric',
        value: 50,
        timestamp: new Date(),
        tags: undefined, // Explicitly undefined optional property
      };

      const minimalResult: IRuleEvaluationResult = {
        ruleId: 'minimal-rule',
        triggered: false,
        value: 50,
        threshold: 100,
        message: 'Minimal result',
        evaluatedAt: new Date(),
        context: undefined, // Explicitly undefined optional property
      };

      expect(minimalMetric.tags).toBeUndefined();
      expect(minimalResult.context).toBeUndefined();
    });
  });
});