import { AlertCacheKeys, AlertCacheKeyType, AlertCacheKeyConfig } from '@alert/utils/alert-cache-keys.util';

describe('AlertCacheKeys', () => {
  let alertCacheKeys: AlertCacheKeys;

  beforeEach(() => {
    alertCacheKeys = new AlertCacheKeys();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const keys = new AlertCacheKeys();
      const config = keys.getConfig();

      expect(config.activeAlertPrefix).toBe('alert:active');
      expect(config.cooldownPrefix).toBe('alert:cooldown');
      expect(config.timeseriesPrefix).toBe('alert:timeseries');
      expect(config.statsPrefix).toBe('alert:stats');
      expect(config.batchPrefix).toBe('alert:batch');
    });

    it('should create instance with custom configuration', () => {
      const customConfig: Partial<AlertCacheKeyConfig> = {
        activeAlertPrefix: 'custom:active',
        cooldownPrefix: 'custom:cooldown'
      };

      const keys = new AlertCacheKeys(customConfig);
      const config = keys.getConfig();

      expect(config.activeAlertPrefix).toBe('custom:active');
      expect(config.cooldownPrefix).toBe('custom:cooldown');
      expect(config.timeseriesPrefix).toBe('alert:timeseries'); // Should use default
    });
  });

  describe('basic key generation methods', () => {
    const testRuleId = 'test-rule-123';

    it('should generate active alert cache key', () => {
      const key = alertCacheKeys.activeAlert(testRuleId);
      expect(key).toBe(`alert:active:${testRuleId}`);
    });

    it('should generate cooldown cache key', () => {
      const key = alertCacheKeys.cooldown(testRuleId);
      expect(key).toBe(`alert:cooldown:${testRuleId}`);
    });

    it('should generate timeseries cache key', () => {
      const key = alertCacheKeys.timeseries(testRuleId);
      expect(key).toBe(`alert:timeseries:${testRuleId}`);
    });

    it('should generate stats cache key with default type', () => {
      const key = alertCacheKeys.stats();
      expect(key).toBe('alert:stats:general');
    });

    it('should generate stats cache key with custom type', () => {
      const key = alertCacheKeys.stats('performance');
      expect(key).toBe('alert:stats:performance');
    });

    it('should generate batch operation cache key', () => {
      const operationId = 'batch-op-456';
      const key = alertCacheKeys.batchOperation(operationId);
      expect(key).toBe(`alert:batch:${operationId}`);
    });
  });

  describe('pattern matching methods', () => {
    it('should return active alert pattern', () => {
      const pattern = alertCacheKeys.activeAlertPattern();
      expect(pattern).toBe('alert:active:*');
    });

    it('should return cooldown pattern', () => {
      const pattern = alertCacheKeys.cooldownPattern();
      expect(pattern).toBe('alert:cooldown:*');
    });

    it('should return timeseries pattern', () => {
      const pattern = alertCacheKeys.timeseriesPattern();
      expect(pattern).toBe('alert:timeseries:*');
    });

    it('should return all alert keys pattern', () => {
      const pattern = alertCacheKeys.allAlertKeysPattern();
      expect(pattern).toBe('alert:*');
    });

    it('should return pattern by key type', () => {
      expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.ACTIVE_ALERT))
        .toBe('alert:active:*');
      expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.COOLDOWN))
        .toBe('alert:cooldown:*');
      expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.TIMESERIES))
        .toBe('alert:timeseries:*');
      expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.STATS))
        .toBe('alert:stats:*');
      expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.BATCH_OPERATION))
        .toBe('alert:batch:*');
    });
  });

  describe('key parsing methods', () => {
    it('should extract rule ID from active alert key', () => {
      const ruleId = 'rule-123';
      const key = alertCacheKeys.activeAlert(ruleId);
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBe(ruleId);
    });

    it('should extract rule ID from cooldown key', () => {
      const ruleId = 'rule-456';
      const key = alertCacheKeys.cooldown(ruleId);
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBe(ruleId);
    });

    it('should extract rule ID from timeseries key', () => {
      const ruleId = 'rule-789';
      const key = alertCacheKeys.timeseries(ruleId);
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBe(ruleId);
    });

    it('should return null for non-rule keys', () => {
      const key = alertCacheKeys.stats('general');
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBeNull();
    });

    it('should return null for invalid keys', () => {
      const extractedId = alertCacheKeys.extractRuleId('invalid:key:format');
      expect(extractedId).toBeNull();
    });
  });

  describe('key type validation', () => {
    it('should correctly identify active alert key type', () => {
      const key = alertCacheKeys.activeAlert('test-rule');
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.ACTIVE_ALERT)).toBe(true);
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.COOLDOWN)).toBe(false);
    });

    it('should correctly identify cooldown key type', () => {
      const key = alertCacheKeys.cooldown('test-rule');
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.COOLDOWN)).toBe(true);
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.ACTIVE_ALERT)).toBe(false);
    });

    it('should correctly identify timeseries key type', () => {
      const key = alertCacheKeys.timeseries('test-rule');
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.TIMESERIES)).toBe(true);
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.STATS)).toBe(false);
    });

    it('should correctly identify stats key type', () => {
      const key = alertCacheKeys.stats('performance');
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.STATS)).toBe(true);
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.BATCH_OPERATION)).toBe(false);
    });

    it('should correctly identify batch operation key type', () => {
      const key = alertCacheKeys.batchOperation('op-123');
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.BATCH_OPERATION)).toBe(true);
      expect(alertCacheKeys.isKeyOfType(key, AlertCacheKeyType.ACTIVE_ALERT)).toBe(false);
    });

    it('should get correct key type', () => {
      expect(alertCacheKeys.getKeyType(alertCacheKeys.activeAlert('test')))
        .toBe(AlertCacheKeyType.ACTIVE_ALERT);
      expect(alertCacheKeys.getKeyType(alertCacheKeys.cooldown('test')))
        .toBe(AlertCacheKeyType.COOLDOWN);
      expect(alertCacheKeys.getKeyType(alertCacheKeys.stats()))
        .toBe(AlertCacheKeyType.STATS);
      expect(alertCacheKeys.getKeyType('invalid:key')).toBeNull();
    });
  });

  describe('batch key generation', () => {
    const ruleIds = ['rule-1', 'rule-2', 'rule-3'];

    it('should generate batch active alert keys', () => {
      const keys = alertCacheKeys.batchActiveAlerts(ruleIds);
      expect(keys).toHaveLength(3);
      expect(keys[0]).toBe('alert:active:rule-1');
      expect(keys[1]).toBe('alert:active:rule-2');
      expect(keys[2]).toBe('alert:active:rule-3');
    });

    it('should generate batch cooldown keys', () => {
      const keys = alertCacheKeys.batchCooldowns(ruleIds);
      expect(keys).toHaveLength(3);
      expect(keys[0]).toBe('alert:cooldown:rule-1');
      expect(keys[1]).toBe('alert:cooldown:rule-2');
      expect(keys[2]).toBe('alert:cooldown:rule-3');
    });

    it('should generate batch timeseries keys', () => {
      const keys = alertCacheKeys.batchTimeseries(ruleIds);
      expect(keys).toHaveLength(3);
      expect(keys[0]).toBe('alert:timeseries:rule-1');
      expect(keys[1]).toBe('alert:timeseries:rule-2');
      expect(keys[2]).toBe('alert:timeseries:rule-3');
    });

    it('should handle empty rule ID array', () => {
      expect(alertCacheKeys.batchActiveAlerts([])).toEqual([]);
      expect(alertCacheKeys.batchCooldowns([])).toEqual([]);
      expect(alertCacheKeys.batchTimeseries([])).toEqual([]);
    });
  });

  describe('key validation', () => {
    it('should validate active alert key successfully', () => {
      const key = alertCacheKeys.activeAlert('test-rule');
      const validation = alertCacheKeys.validateKey(key);

      expect(validation.valid).toBe(true);
      expect(validation.type).toBe(AlertCacheKeyType.ACTIVE_ALERT);
      expect(validation.ruleId).toBe('test-rule');
      expect(validation.error).toBeUndefined();
    });

    it('should validate stats key successfully', () => {
      const key = alertCacheKeys.stats('performance');
      const validation = alertCacheKeys.validateKey(key);

      expect(validation.valid).toBe(true);
      expect(validation.type).toBe(AlertCacheKeyType.STATS);
      expect(validation.ruleId).toBeUndefined();
      expect(validation.error).toBeUndefined();
    });

    it('should reject empty key', () => {
      const validation = alertCacheKeys.validateKey('');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('缓存键必须是非空字符串');
    });

    it('should reject null key', () => {
      const validation = alertCacheKeys.validateKey(null as any);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('缓存键必须是非空字符串');
    });

    it('should reject unrecognized key format', () => {
      const validation = alertCacheKeys.validateKey('invalid:key:format');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('无法识别的缓存键类型');
    });

    it('should reject rule key without rule ID', () => {
      // Manually create an invalid key that matches pattern but has no rule ID
      const validation = alertCacheKeys.validateKey('alert:active:');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('无法从缓存键中提取规则ID');
    });
  });

  describe('debug information', () => {
    it('should provide comprehensive debug info', () => {
      const debugInfo = alertCacheKeys.getDebugInfo();

      expect(debugInfo.config).toBeDefined();
      expect(debugInfo.patterns).toBeDefined();
      expect(debugInfo.sampleKeys).toBeDefined();

      // Verify config
      expect(debugInfo.config.activeAlertPrefix).toBe('alert:active');
      expect(debugInfo.config.cooldownPrefix).toBe('alert:cooldown');

      // Verify patterns
      expect(debugInfo.patterns.activeAlert).toBe('alert:active:*');
      expect(debugInfo.patterns.cooldown).toBe('alert:cooldown:*');
      expect(debugInfo.patterns.allAlert).toBe('alert:*');

      // Verify sample keys
      expect(debugInfo.sampleKeys.activeAlert).toBe('alert:active:rule_123');
      expect(debugInfo.sampleKeys.cooldown).toBe('alert:cooldown:rule_123');
      expect(debugInfo.sampleKeys.stats).toBe('alert:stats:general');
      expect(debugInfo.sampleKeys.batchOperation).toBe('alert:batch:op_456');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in rule ID', () => {
      const ruleId = 'rule-123_test.special-chars';
      const key = alertCacheKeys.activeAlert(ruleId);
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBe(ruleId);
    });

    it('should handle unicode characters in rule ID', () => {
      const ruleId = 'rule-测试-123';
      const key = alertCacheKeys.activeAlert(ruleId);
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBe(ruleId);
    });

    it('should handle very long rule IDs', () => {
      const ruleId = 'a'.repeat(100);
      const key = alertCacheKeys.activeAlert(ruleId);
      const extractedId = alertCacheKeys.extractRuleId(key);
      expect(extractedId).toBe(ruleId);
    });
  });
});