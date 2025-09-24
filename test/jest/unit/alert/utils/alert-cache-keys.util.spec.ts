import { AlertCacheKeys, alertCacheKeys, createAlertCacheKeys, AlertCacheKeyType } from '../../../../src/alert/utils/alert-cache-keys.util';

describe('AlertCacheKeys', () => {
  describe('Default Instance', () => {
    it('should be defined', () => {
      expect(alertCacheKeys).toBeDefined();
      expect(alertCacheKeys).toBeInstanceOf(AlertCacheKeys);
    });

    describe('activeAlert', () => {
      it('should generate active alert cache key', () => {
        const key = alertCacheKeys.activeAlert('rule_123');
        expect(key).toBe('alert:active:rule_123');
      });
    });

    describe('cooldown', () => {
      it('should generate cooldown cache key', () => {
        const key = alertCacheKeys.cooldown('rule_123');
        expect(key).toBe('alert:cooldown:rule_123');
      });
    });

    describe('timeseries', () => {
      it('should generate timeseries cache key', () => {
        const key = alertCacheKeys.timeseries('rule_123');
        expect(key).toBe('alert:timeseries:rule_123');
      });
    });

    describe('stats', () => {
      it('should generate stats cache key with default type', () => {
        const key = alertCacheKeys.stats();
        expect(key).toBe('alert:stats:general');
      });

      it('should generate stats cache key with custom type', () => {
        const key = alertCacheKeys.stats('performance');
        expect(key).toBe('alert:stats:performance');
      });
    });

    describe('batchOperation', () => {
      it('should generate batch operation cache key', () => {
        const key = alertCacheKeys.batchOperation('op_123');
        expect(key).toBe('alert:batch:op_123');
      });
    });

    describe('activeAlertPattern', () => {
      it('should return active alert pattern', () => {
        const pattern = alertCacheKeys.activeAlertPattern();
        expect(pattern).toBe('alert:active:*');
      });
    });

    describe('cooldownPattern', () => {
      it('should return cooldown pattern', () => {
        const pattern = alertCacheKeys.cooldownPattern();
        expect(pattern).toBe('alert:cooldown:*');
      });
    });

    describe('timeseriesPattern', () => {
      it('should return timeseries pattern', () => {
        const pattern = alertCacheKeys.timeseriesPattern();
        expect(pattern).toBe('alert:timeseries:*');
      });
    });

    describe('allAlertKeysPattern', () => {
      it('should return all alert keys pattern', () => {
        const pattern = alertCacheKeys.allAlertKeysPattern();
        expect(pattern).toBe('alert:*');
      });
    });

    describe('getPatternByType', () => {
      it('should return correct pattern for each key type', () => {
        expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.ACTIVE_ALERT)).toBe('alert:active:*');
        expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.COOLDOWN)).toBe('alert:cooldown:*');
        expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.TIMESERIES)).toBe('alert:timeseries:*');
        expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.STATS)).toBe('alert:stats:*');
        expect(alertCacheKeys.getPatternByType(AlertCacheKeyType.BATCH_OPERATION)).toBe('alert:batch:*');
      });

      it('should return all alert keys pattern for unknown type', () => {
        const pattern = alertCacheKeys.getPatternByType('unknown' as any);
        expect(pattern).toBe('alert:*');
      });
    });

    describe('extractRuleId', () => {
      it('should extract rule ID from active alert key', () => {
        const ruleId = alertCacheKeys.extractRuleId('alert:active:rule_123');
        expect(ruleId).toBe('rule_123');
      });

      it('should extract rule ID from cooldown key', () => {
        const ruleId = alertCacheKeys.extractRuleId('alert:cooldown:rule_123');
        expect(ruleId).toBe('rule_123');
      });

      it('should extract rule ID from timeseries key', () => {
        const ruleId = alertCacheKeys.extractRuleId('alert:timeseries:rule_123');
        expect(ruleId).toBe('rule_123');
      });

      it('should return null for invalid key format', () => {
        const ruleId = alertCacheKeys.extractRuleId('invalid:key:format');
        expect(ruleId).toBeNull();
      });

      it('should return null for empty key', () => {
        const ruleId = alertCacheKeys.extractRuleId('');
        expect(ruleId).toBeNull();
      });
    });

    describe('isKeyOfType', () => {
      it('should correctly identify active alert key type', () => {
        const result = alertCacheKeys.isKeyOfType('alert:active:rule_123', AlertCacheKeyType.ACTIVE_ALERT);
        expect(result).toBe(true);
      });

      it('should correctly identify cooldown key type', () => {
        const result = alertCacheKeys.isKeyOfType('alert:cooldown:rule_123', AlertCacheKeyType.COOLDOWN);
        expect(result).toBe(true);
      });

      it('should correctly identify timeseries key type', () => {
        const result = alertCacheKeys.isKeyOfType('alert:timeseries:rule_123', AlertCacheKeyType.TIMESERIES);
        expect(result).toBe(true);
      });

      it('should return false for mismatched key type', () => {
        const result = alertCacheKeys.isKeyOfType('alert:active:rule_123', AlertCacheKeyType.COOLDOWN);
        expect(result).toBe(false);
      });
    });

    describe('getKeyType', () => {
      it('should return correct key type for active alert key', () => {
        const keyType = alertCacheKeys.getKeyType('alert:active:rule_123');
        expect(keyType).toBe(AlertCacheKeyType.ACTIVE_ALERT);
      });

      it('should return correct key type for cooldown key', () => {
        const keyType = alertCacheKeys.getKeyType('alert:cooldown:rule_123');
        expect(keyType).toBe(AlertCacheKeyType.COOLDOWN);
      });

      it('should return correct key type for timeseries key', () => {
        const keyType = alertCacheKeys.getKeyType('alert:timeseries:rule_123');
        expect(keyType).toBe(AlertCacheKeyType.TIMESERIES);
      });

      it('should return null for unknown key type', () => {
        const keyType = alertCacheKeys.getKeyType('unknown:key:format');
        expect(keyType).toBeNull();
      });
    });

    describe('batchActiveAlerts', () => {
      it('should generate batch active alert keys', () => {
        const keys = alertCacheKeys.batchActiveAlerts(['rule_1', 'rule_2']);
        expect(keys).toEqual(['alert:active:rule_1', 'alert:active:rule_2']);
      });
    });

    describe('batchCooldowns', () => {
      it('should generate batch cooldown keys', () => {
        const keys = alertCacheKeys.batchCooldowns(['rule_1', 'rule_2']);
        expect(keys).toEqual(['alert:cooldown:rule_1', 'alert:cooldown:rule_2']);
      });
    });

    describe('batchTimeseries', () => {
      it('should generate batch timeseries keys', () => {
        const keys = alertCacheKeys.batchTimeseries(['rule_1', 'rule_2']);
        expect(keys).toEqual(['alert:timeseries:rule_1', 'alert:timeseries:rule_2']);
      });
    });

    describe('getConfig', () => {
      it('should return current key configuration', () => {
        const config = alertCacheKeys.getConfig();
        expect(config).toEqual({
          activeAlertPrefix: 'alert:active',
          cooldownPrefix: 'alert:cooldown',
          timeseriesPrefix: 'alert:timeseries',
          statsPrefix: 'alert:stats',
          batchPrefix: 'alert:batch',
        });
      });
    });

    describe('validateKey', () => {
      it('should validate correct active alert key', () => {
        const result = alertCacheKeys.validateKey('alert:active:rule_123');
        expect(result).toEqual({
          valid: true,
          type: AlertCacheKeyType.ACTIVE_ALERT,
          ruleId: 'rule_123'
        });
      });

      it('should validate correct cooldown key', () => {
        const result = alertCacheKeys.validateKey('alert:cooldown:rule_123');
        expect(result).toEqual({
          valid: true,
          type: AlertCacheKeyType.COOLDOWN,
          ruleId: 'rule_123'
        });
      });

      it('should validate correct timeseries key', () => {
        const result = alertCacheKeys.validateKey('alert:timeseries:rule_123');
        expect(result).toEqual({
          valid: true,
          type: AlertCacheKeyType.TIMESERIES,
          ruleId: 'rule_123'
        });
      });

      it('should validate correct stats key', () => {
        const result = alertCacheKeys.validateKey('alert:stats:general');
        expect(result).toEqual({
          valid: true,
          type: AlertCacheKeyType.STATS
        });
      });

      it('should return error for empty key', () => {
        const result = alertCacheKeys.validateKey('');
        expect(result).toEqual({
          valid: false,
          error: '缓存键必须是非空字符串'
        });
      });

      it('should return error for invalid key format', () => {
        const result = alertCacheKeys.validateKey('invalid:key:format');
        expect(result).toEqual({
          valid: false,
          error: '无法识别的缓存键类型'
        });
      });

      it('should return error when rule ID cannot be extracted', () => {
        const result = alertCacheKeys.validateKey('alert:active:');
        expect(result).toEqual({
          valid: false,
          error: '无法从缓存键中提取规则ID'
        });
      });
    });

    describe('getDebugInfo', () => {
      it('should return debug information', () => {
        const debugInfo = alertCacheKeys.getDebugInfo();
        expect(debugInfo).toEqual({
          config: expect.any(Object),
          patterns: expect.any(Object),
          sampleKeys: expect.any(Object)
        });
        expect(debugInfo.sampleKeys.activeAlert).toBe('alert:active:rule_123');
        expect(debugInfo.sampleKeys.cooldown).toBe('alert:cooldown:rule_123');
        expect(debugInfo.sampleKeys.timeseries).toBe('alert:timeseries:rule_123');
      });
    });
  });

  describe('Custom Instance', () => {
    it('should create custom instance with provided configuration', () => {
      const customConfig = {
        activeAlertPrefix: 'custom:alert:active',
        cooldownPrefix: 'custom:alert:cooldown',
        timeseriesPrefix: 'custom:alert:timeseries',
        statsPrefix: 'custom:alert:stats',
        batchPrefix: 'custom:alert:batch',
      };

      const customKeys = createAlertCacheKeys(customConfig);
      expect(customKeys.getConfig()).toEqual(customConfig);
    });

    it('should use default configuration for missing properties', () => {
      const customConfig = {
        activeAlertPrefix: 'custom:alert:active'
      };

      const customKeys = createAlertCacheKeys(customConfig);
      const config = customKeys.getConfig();
      expect(config.activeAlertPrefix).toBe('custom:alert:active');
      expect(config.cooldownPrefix).toBe('alert:cooldown'); // default value
      expect(config.timeseriesPrefix).toBe('alert:timeseries'); // default value
    });
  });

  describe('AlertCacheKeys Class', () => {
    let customKeys: AlertCacheKeys;

    beforeEach(() => {
      customKeys = new AlertCacheKeys({
        activeAlertPrefix: 'test:active',
        cooldownPrefix: 'test:cooldown',
        timeseriesPrefix: 'test:timeseries',
        statsPrefix: 'test:stats',
        batchPrefix: 'test:batch',
      });
    });

    it('should create instance with custom configuration', () => {
      expect(customKeys).toBeDefined();
      const config = customKeys.getConfig();
      expect(config.activeAlertPrefix).toBe('test:active');
    });

    it('should generate keys with custom prefixes', () => {
      expect(customKeys.activeAlert('rule_123')).toBe('test:active:rule_123');
      expect(customKeys.cooldown('rule_123')).toBe('test:cooldown:rule_123');
      expect(customKeys.timeseries('rule_123')).toBe('test:timeseries:rule_123');
    });
  });
});