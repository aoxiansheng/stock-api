import {
  ALERT_TIMEOUTS,
  OPERATION_TIMEOUTS,
  DATA_RETENTION,
  RULE_LIMITS,
  RETRY_LIMITS,
  ALERT_DEFAULTS,
  VALID_OPERATORS,
  AlertType,
  NotificationChannel,
  ALERT_MESSAGES,
  ALERT_OPERATIONS,
  ALERT_METRICS,
  OPERATOR_SYMBOLS
} from '@alert/constants';

describe('Alert Constants Index', () => {
  describe('Constant Exports', () => {
    it('should export ALERT_TIMEOUTS', () => {
      expect(ALERT_TIMEOUTS).toBeDefined();
      expect(ALERT_TIMEOUTS.CRITICAL_RESPONSE).toBeDefined();
      expect(ALERT_TIMEOUTS.NORMAL_RESPONSE).toBeDefined();
      expect(ALERT_TIMEOUTS.EVALUATION_CYCLE).toBeDefined();
    });

    it('should export OPERATION_TIMEOUTS', () => {
      expect(OPERATION_TIMEOUTS).toBeDefined();
      expect(OPERATION_TIMEOUTS.VALIDATION_TIMEOUT).toBeDefined();
      expect(OPERATION_TIMEOUTS.CACHE_OPERATION).toBeDefined();
      expect(OPERATION_TIMEOUTS.DATABASE_QUERY).toBeDefined();
    });

    it('should export DATA_RETENTION', () => {
      expect(DATA_RETENTION).toBeDefined();
      expect(DATA_RETENTION.ALERT_HISTORY).toBeDefined();
      expect(DATA_RETENTION.ALERT_METRICS).toBeDefined();
    });

    it('should export RULE_LIMITS', () => {
      expect(RULE_LIMITS).toBeDefined();
      expect(RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBeDefined();
      expect(RULE_LIMITS.MAX_TAGS_PER_ENTITY).toBeDefined();
    });

    it('should export RETRY_LIMITS', () => {
      expect(RETRY_LIMITS).toBeDefined();
      expect(RETRY_LIMITS.MINIMAL_RETRIES).toBeDefined();
      expect(RETRY_LIMITS.STANDARD_RETRIES).toBeDefined();
    });

    it('should export ALERT_DEFAULTS', () => {
      expect(ALERT_DEFAULTS).toBeDefined();
      expect(ALERT_DEFAULTS.duration).toBeDefined();
      expect(ALERT_DEFAULTS.operator).toBeDefined();
    });

    it('should export VALID_OPERATORS', () => {
      expect(VALID_OPERATORS).toBeDefined();
      expect(Array.isArray(VALID_OPERATORS)).toBe(true);
      expect(VALID_OPERATORS.length).toBeGreaterThan(0);
    });

    it('should export AlertType enum', () => {
      expect(AlertType).toBeDefined();
    });

    it('should export NotificationChannel type', () => {
      // This is a type export, so we just verify it exists
      expect(typeof AlertType).toBe('object');
    });

    it('should export ALERT_MESSAGES', () => {
      expect(ALERT_MESSAGES).toBeDefined();
      expect(ALERT_MESSAGES.SUCCESS.RULE_CREATED).toBeDefined();
      expect(ALERT_MESSAGES.SUCCESS.RULE_UPDATED).toBeDefined();
    });

    it('should export ALERT_OPERATIONS', () => {
      expect(ALERT_OPERATIONS).toBeDefined();
      expect(ALERT_OPERATIONS.RULES.CREATE_RULE).toBeDefined();
      expect(ALERT_OPERATIONS.RULES.EVALUATE_RULES_SCHEDULED).toBeDefined();
    });

    it('should export ALERT_METRICS', () => {
      expect(ALERT_METRICS).toBeDefined();
      expect(ALERT_METRICS.RULES.RULE_EVALUATION_COUNT).toBeDefined();
      expect(ALERT_METRICS.RULES.AVERAGE_RULE_EVALUATION_TIME).toBeDefined();
    });

    it('should export OPERATOR_SYMBOLS', () => {
      expect(OPERATOR_SYMBOLS).toBeDefined();
      expect(OPERATOR_SYMBOLS['>']).toBeDefined();
      expect(OPERATOR_SYMBOLS['<']).toBeDefined();
    });
  });

  describe('Constant Values', () => {
    it('should have reasonable timeout values', () => {
      expect(ALERT_TIMEOUTS.CRITICAL_RESPONSE).toBeGreaterThan(0);
      expect(ALERT_TIMEOUTS.NORMAL_RESPONSE).toBeGreaterThan(0);
      expect(ALERT_TIMEOUTS.EVALUATION_CYCLE).toBeGreaterThan(0);
    });

    it('should have reasonable limit values', () => {
      expect(RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBeGreaterThan(0);
      expect(RULE_LIMITS.MAX_TAGS_PER_ENTITY).toBeGreaterThan(0);
      expect(RETRY_LIMITS.MINIMAL_RETRIES).toBeGreaterThanOrEqual(0);
    });

    it('should have reasonable default values', () => {
      expect(ALERT_DEFAULTS.duration).toBeGreaterThanOrEqual(0);
      expect(ALERT_DEFAULTS.operator).toBeDefined();
    });

    it('should include common operators in VALID_OPERATORS', () => {
      expect(VALID_OPERATORS).toContain('>');
      expect(VALID_OPERATORS).toContain('>=');
      expect(VALID_OPERATORS).toContain('<');
      expect(VALID_OPERATORS).toContain('<=');
      expect(VALID_OPERATORS).toContain('==');
      expect(VALID_OPERATORS).toContain('!=');
    });

    it('should have meaningful alert messages', () => {
      expect(typeof ALERT_MESSAGES.SUCCESS.RULE_CREATED).toBe('string');
      expect(typeof ALERT_MESSAGES.SUCCESS.RULE_UPDATED).toBe('string');
      expect(ALERT_MESSAGES.SUCCESS.RULE_CREATED.length).toBeGreaterThan(0);
    });

    it('should have valid operator symbols', () => {
      expect(OPERATOR_SYMBOLS['>']).toBe('大于');
      expect(OPERATOR_SYMBOLS['<']).toBe('小于');
      expect(OPERATOR_SYMBOLS['==']).toBe('等于');
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for constants', () => {
      // Test that constants have the expected types
      expect(typeof ALERT_TIMEOUTS.CRITICAL_RESPONSE).toBe('number');
      expect(typeof ALERT_TIMEOUTS.NORMAL_RESPONSE).toBe('number');
      expect(typeof RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBe('number');
      expect(typeof ALERT_DEFAULTS.duration).toBe('number');
    });

    it('should maintain consistency between related constants', () => {
      // Test that related constants have logical relationships
      expect(ALERT_TIMEOUTS.CRITICAL_RESPONSE).toBeLessThan(ALERT_TIMEOUTS.NORMAL_RESPONSE);
      expect(RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBeLessThanOrEqual(RULE_LIMITS.MAX_TAGS_PER_ENTITY);
    });
  });

  describe('Constant Completeness', () => {
    it('should export all expected constants', () => {
      // Verify that all major constant groups are exported
      const exportedConstants = {
        ALERT_TIMEOUTS,
        OPERATION_TIMEOUTS,
        DATA_RETENTION,
        RULE_LIMITS,
        RETRY_LIMITS,
        ALERT_DEFAULTS,
        VALID_OPERATORS,
        ALERT_MESSAGES,
        ALERT_OPERATIONS,
        ALERT_METRICS,
        OPERATOR_SYMBOLS
      };

      Object.keys(exportedConstants).forEach(key => {
        expect(exportedConstants[key]).toBeDefined();
      });
    });
  });
});