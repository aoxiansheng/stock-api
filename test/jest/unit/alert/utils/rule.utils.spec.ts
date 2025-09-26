import { AlertRuleUtil } from '@alert/utils/rule.utils';

// Mock dependencies
jest.mock('@common/constants/semantic/message-semantics.constants', () => ({
  MessageSemanticsUtil: {
    formatTemplate: jest.fn((template, variables) => {
      // Simple mock implementation for template formatting
      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      });
      return result;
    })
  }
}));

describe('AlertRuleUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatAlertMessage', () => {
    it('should format alert message with variables', () => {
      const template = 'Alert for {metric} with value {value}';
      const variables = { metric: 'cpu_usage', value: 85 };

      const result = AlertRuleUtil.formatAlertMessage(template, variables);

      expect(result).toBe('Alert for cpu_usage with value 85');
    });

    it('should handle template with multiple same variables', () => {
      const template = '{metric} is {value}, expected {value} or less';
      const variables = { metric: 'memory', value: 90 };

      const result = AlertRuleUtil.formatAlertMessage(template, variables);

      expect(result).toBe('memory is 90, expected 90 or less');
    });

    it('should handle empty variables', () => {
      const template = 'Simple alert message';
      const variables = {};

      const result = AlertRuleUtil.formatAlertMessage(template, variables);

      expect(result).toBe('Simple alert message');
    });

    it('should handle undefined variables', () => {
      const template = 'Alert for {metric}';
      const variables = { other: 'value' };

      const result = AlertRuleUtil.formatAlertMessage(template, variables);

      expect(result).toBe('Alert for {metric}'); // Template remains unchanged if variable not found
    });
  });

  describe('generateErrorMessage', () => {
    it('should generate error message for RULE_VALIDATION_FAILED', () => {
      const context = { details: 'Invalid threshold value' };

      const result = AlertRuleUtil.generateErrorMessage('RULE_VALIDATION_FAILED', context);

      expect(result).toBe('规则验证失败: Invalid threshold value');
    });

    it('should generate error message for THRESHOLD_INVALID', () => {
      const context = { threshold: 'not_a_number' };

      const result = AlertRuleUtil.generateErrorMessage('THRESHOLD_INVALID', context);

      expect(result).toBe('阈值无效: not_a_number');
    });

    it('should generate error message for METRIC_INVALID', () => {
      const context = { metric: '123invalid_metric' };

      const result = AlertRuleUtil.generateErrorMessage('METRIC_INVALID', context);

      expect(result).toBe('指标无效: 123invalid_metric');
    });

    it('should generate error message for RULE_NAME_INVALID', () => {
      const context = { name: '' };

      const result = AlertRuleUtil.generateErrorMessage('RULE_NAME_INVALID', context);

      expect(result).toBe('规则名称无效: ');
    });

    it('should generate unknown error message for unrecognized type', () => {
      const context = { details: 'Something went wrong' };

      const result = AlertRuleUtil.generateErrorMessage('UNKNOWN_ERROR', context);

      expect(result).toBe('未知错误: Something went wrong');
    });

    it('should handle missing context properties', () => {
      const context = {};

      const result = AlertRuleUtil.generateErrorMessage('THRESHOLD_INVALID', context);

      expect(result).toBe('阈值无效: {threshold}');
    });
  });

  describe('isValidRuleName', () => {
    it('should return true for valid rule names', () => {
      expect(AlertRuleUtil.isValidRuleName('Valid Rule Name')).toBe(true);
      expect(AlertRuleUtil.isValidRuleName('CPU Alert')).toBe(true);
      expect(AlertRuleUtil.isValidRuleName('Memory-Usage-Alert')).toBe(true);
      expect(AlertRuleUtil.isValidRuleName('Rule_123')).toBe(true);
      expect(AlertRuleUtil.isValidRuleName('A')).toBe(true); // Single character
    });

    it('should return false for invalid rule names', () => {
      expect(AlertRuleUtil.isValidRuleName('')).toBe(false); // Empty string
      expect(AlertRuleUtil.isValidRuleName('   ')).toBe(false); // Only whitespace
      expect(AlertRuleUtil.isValidRuleName('a'.repeat(101))).toBe(false); // Too long
      expect(AlertRuleUtil.isValidRuleName(null as any)).toBe(false);
      expect(AlertRuleUtil.isValidRuleName(undefined as any)).toBe(false);
      expect(AlertRuleUtil.isValidRuleName(123 as any)).toBe(false);
    });

    it('should handle edge cases for rule name length', () => {
      expect(AlertRuleUtil.isValidRuleName('a'.repeat(100))).toBe(true); // Exactly 100 chars
      expect(AlertRuleUtil.isValidRuleName('a'.repeat(99))).toBe(true); // Under limit
    });

    it('should handle names with leading/trailing whitespace', () => {
      expect(AlertRuleUtil.isValidRuleName(' Valid Name ')).toBe(true);
      expect(AlertRuleUtil.isValidRuleName('\\t\\nValid Name\\t\\n')).toBe(true);
    });
  });

  describe('isValidMetricName', () => {
    it('should return true for valid metric names', () => {
      expect(AlertRuleUtil.isValidMetricName('cpu_usage')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('memory.used')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('_private_metric')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('metric123')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('a')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('CamelCaseMetric')).toBe(true);
    });

    it('should return false for invalid metric names', () => {
      expect(AlertRuleUtil.isValidMetricName('')).toBe(false); // Empty
      expect(AlertRuleUtil.isValidMetricName('123metric')).toBe(false); // Starts with number
      expect(AlertRuleUtil.isValidMetricName('-invalid')).toBe(false); // Starts with dash
      expect(AlertRuleUtil.isValidMetricName('metric-name')).toBe(false); // Contains dash
      expect(AlertRuleUtil.isValidMetricName('metric name')).toBe(false); // Contains space
      expect(AlertRuleUtil.isValidMetricName('metric@domain')).toBe(false); // Contains @
      expect(AlertRuleUtil.isValidMetricName('a'.repeat(201))).toBe(false); // Too long
      expect(AlertRuleUtil.isValidMetricName(null as any)).toBe(false);
      expect(AlertRuleUtil.isValidMetricName(undefined as any)).toBe(false);
    });

    it('should handle edge cases for metric name length', () => {
      expect(AlertRuleUtil.isValidMetricName('a'.repeat(200))).toBe(true); // Exactly 200 chars
      expect(AlertRuleUtil.isValidMetricName('a'.repeat(199))).toBe(true); // Under limit
    });

    it('should validate metric name format strictly', () => {
      expect(AlertRuleUtil.isValidMetricName('metric.with.dots')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('metric_with_underscores')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('metric123.test456')).toBe(true);
      expect(AlertRuleUtil.isValidMetricName('metric..double.dot')).toBe(true); // Allowed by regex
    });
  });

  describe('isValidThreshold', () => {
    it('should return true for valid number thresholds', () => {
      expect(AlertRuleUtil.isValidThreshold(0)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(123)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(-456)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(3.14)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(-2.5)).toBe(true);
    });

    it('should return true for valid string numbers', () => {
      expect(AlertRuleUtil.isValidThreshold('123')).toBe(true);
      expect(AlertRuleUtil.isValidThreshold('-456')).toBe(true);
      expect(AlertRuleUtil.isValidThreshold('3.14')).toBe(true);
      expect(AlertRuleUtil.isValidThreshold('0')).toBe(true);
    });

    it('should return false for invalid thresholds', () => {
      expect(AlertRuleUtil.isValidThreshold(NaN)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(Infinity)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(-Infinity)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold('not_a_number')).toBe(false);
      expect(AlertRuleUtil.isValidThreshold('')).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(null)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(undefined)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold({})).toBe(false);
      expect(AlertRuleUtil.isValidThreshold([])).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(true)).toBe(false);
    });

    it('should handle edge case with partial number strings', () => {
      // parseFloat('123abc') returns 123, which is valid according to the implementation
      expect(AlertRuleUtil.isValidThreshold('123abc')).toBe(true);
      expect(AlertRuleUtil.isValidThreshold('abc123')).toBe(false); // parseFloat returns NaN
    });

    it('should handle edge cases', () => {
      expect(AlertRuleUtil.isValidThreshold(Number.MAX_VALUE)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(Number.MIN_VALUE)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(-Number.MAX_VALUE)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold('1e10')).toBe(true); // Scientific notation
      expect(AlertRuleUtil.isValidThreshold('1.23e-4')).toBe(true);
    });
  });

  describe('generateCooldownCacheKey', () => {
    it('should generate proper cooldown cache key', () => {
      const ruleId = 'rule-123';
      const result = AlertRuleUtil.generateCooldownCacheKey(ruleId);

      expect(result).toBe('alert:cooldown:rule-123');
    });

    it('should handle special characters in rule ID', () => {
      const ruleId = 'rule-123_test.special';
      const result = AlertRuleUtil.generateCooldownCacheKey(ruleId);

      expect(result).toBe('alert:cooldown:rule-123_test.special');
    });

    it('should handle empty rule ID', () => {
      const result = AlertRuleUtil.generateCooldownCacheKey('');

      expect(result).toBe('alert:cooldown:');
    });
  });

  describe('isValidOperator', () => {
    it('should return true for valid operators', () => {
      const validOperators = ['>', '>=', '<', '<=', '==', '!=', 'contains', 'not_contains', 'regex'];

      validOperators.forEach(operator => {
        expect(AlertRuleUtil.isValidOperator(operator)).toBe(true);
      });
    });

    it('should return false for invalid operators', () => {
      expect(AlertRuleUtil.isValidOperator('=')).toBe(false);
      expect(AlertRuleUtil.isValidOperator('!')).toBe(false);
      expect(AlertRuleUtil.isValidOperator('eq')).toBe(false);
      expect(AlertRuleUtil.isValidOperator('ne')).toBe(false);
      expect(AlertRuleUtil.isValidOperator('CONTAINS')).toBe(false);
      expect(AlertRuleUtil.isValidOperator('')).toBe(false);
      expect(AlertRuleUtil.isValidOperator(null as any)).toBe(false);
      expect(AlertRuleUtil.isValidOperator(undefined as any)).toBe(false);
    });
  });

  describe('isValidSeverity', () => {
    it('should return true for valid severities', () => {
      expect(AlertRuleUtil.isValidSeverity('critical')).toBe(true);
      expect(AlertRuleUtil.isValidSeverity('warning')).toBe(true);
      expect(AlertRuleUtil.isValidSeverity('info')).toBe(true);
    });

    it('should return false for invalid severities', () => {
      expect(AlertRuleUtil.isValidSeverity('error')).toBe(false);
      expect(AlertRuleUtil.isValidSeverity('CRITICAL')).toBe(false);
      expect(AlertRuleUtil.isValidSeverity('Warning')).toBe(false);
      expect(AlertRuleUtil.isValidSeverity('high')).toBe(false);
      expect(AlertRuleUtil.isValidSeverity('')).toBe(false);
      expect(AlertRuleUtil.isValidSeverity(null as any)).toBe(false);
      expect(AlertRuleUtil.isValidSeverity(undefined as any)).toBe(false);
    });
  });

  describe('generateRuleSummary', () => {
    it('should generate proper rule summary', () => {
      const rule = {
        name: 'CPU Alert',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80
      };

      const result = AlertRuleUtil.generateRuleSummary(rule);

      expect(result).toBe('规则 \"CPU Alert\": cpu_usage > 80');
    });

    it('should handle rules with different data types', () => {
      const rule = {
        name: 'Memory Alert',
        metric: 'memory.used',
        operator: '>=',
        threshold: '90.5'
      };

      const result = AlertRuleUtil.generateRuleSummary(rule);

      expect(result).toBe('规则 \"Memory Alert\": memory.used >= 90.5');
    });

    it('should handle rules with missing properties', () => {
      const rule = {
        name: 'Incomplete Rule',
        metric: undefined,
        operator: '==',
        threshold: null
      };

      const result = AlertRuleUtil.generateRuleSummary(rule);

      expect(result).toBe('规则 \"Incomplete Rule\": undefined == null');
    });
  });

  describe('calculateRulePriority', () => {
    it('should return correct priority for critical severity', () => {
      expect(AlertRuleUtil.calculateRulePriority('critical')).toBe(100);
    });

    it('should return correct priority for warning severity', () => {
      expect(AlertRuleUtil.calculateRulePriority('warning')).toBe(50);
    });

    it('should return correct priority for info severity', () => {
      expect(AlertRuleUtil.calculateRulePriority('info')).toBe(10);
    });

    it('should return 0 for unknown severity', () => {
      expect(AlertRuleUtil.calculateRulePriority('unknown')).toBe(0);
      expect(AlertRuleUtil.calculateRulePriority('')).toBe(0);
      expect(AlertRuleUtil.calculateRulePriority(null as any)).toBe(0);
      expect(AlertRuleUtil.calculateRulePriority(undefined as any)).toBe(0);
    });

    it('should be case sensitive', () => {
      expect(AlertRuleUtil.calculateRulePriority('Critical')).toBe(0);
      expect(AlertRuleUtil.calculateRulePriority('WARNING')).toBe(0);
      expect(AlertRuleUtil.calculateRulePriority('Info')).toBe(0);
    });
  });

  describe('integration tests', () => {
    it('should work together for complete rule validation', () => {
      const rule = {
        name: 'Complete Rule Test',
        metric: 'test_metric',
        operator: '>',
        threshold: 75,
        severity: 'warning'
      };

      // Test all validation methods
      expect(AlertRuleUtil.isValidRuleName(rule.name)).toBe(true);
      expect(AlertRuleUtil.isValidMetricName(rule.metric)).toBe(true);
      expect(AlertRuleUtil.isValidOperator(rule.operator)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(rule.threshold)).toBe(true);
      expect(AlertRuleUtil.isValidSeverity(rule.severity)).toBe(true);

      // Test utility methods
      const summary = AlertRuleUtil.generateRuleSummary(rule);
      const priority = AlertRuleUtil.calculateRulePriority(rule.severity);
      const cacheKey = AlertRuleUtil.generateCooldownCacheKey('rule-123');

      expect(summary).toBe('规则 \"Complete Rule Test\": test_metric > 75');
      expect(priority).toBe(50);
      expect(cacheKey).toBe('alert:cooldown:rule-123');
    });

    it('should handle invalid rule data consistently', () => {
      const invalidRule = {
        name: '',
        metric: '123invalid',
        operator: 'invalid',
        threshold: 'not_number',
        severity: 'unknown'
      };

      // All validations should fail
      expect(AlertRuleUtil.isValidRuleName(invalidRule.name)).toBe(false);
      expect(AlertRuleUtil.isValidMetricName(invalidRule.metric)).toBe(false);
      expect(AlertRuleUtil.isValidOperator(invalidRule.operator)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(invalidRule.threshold)).toBe(false);
      expect(AlertRuleUtil.isValidSeverity(invalidRule.severity)).toBe(false);

      // Utility methods should still work
      const priority = AlertRuleUtil.calculateRulePriority(invalidRule.severity);
      expect(priority).toBe(0);
    });
  });
});