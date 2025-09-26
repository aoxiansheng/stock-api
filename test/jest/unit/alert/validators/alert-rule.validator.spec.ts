import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

import { AlertRuleValidator } from '@alert/validators/alert-rule.validator';
import { IAlertRule } from '@alert/interfaces';
import { AlertSeverity } from '@alert/types/alert.types';
import { VALID_OPERATORS } from '@alert/constants';
import cacheUnifiedConfig from '@cache/config/cache-unified.config';

describe('AlertRuleValidator', () => {
  let validator: AlertRuleValidator;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockCacheConfig = {
    defaultTtl: 300,
    maxBatchSize: 100
  };

  const mockAlertConfig = {
    validation: {
      duration: {
        min: 60,
        max: 3600
      },
      cooldown: {
        min: 300,
        max: 86400
      }
    }
  };

  const validAlertRule: IAlertRule = {
    id: '507f1f77bcf86cd799439011',
    name: 'Valid CPU Alert',
    description: 'Test CPU alert rule',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [
      {
        name: 'Admin Email',
        type: 'email',
        enabled: true,
        config: { recipients: ['admin@example.com'] }
      }
    ],
    cooldown: 600,
    tags: { environment: 'prod' },
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn()
    } as any;

    // Setup config service mocks
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'alert':
          return mockAlertConfig;
        case 'cacheUnified':
          return mockCacheConfig;
        default:
          return undefined;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleValidator,
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: 'cacheUnified',
          useValue: mockCacheConfig
        }
      ]
    }).compile();

    validator = module.get<AlertRuleValidator>(AlertRuleValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRule', () => {
    it('should validate a valid alert rule successfully', () => {
      const result = validator.validateRule(validAlertRule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule with invalid ObjectId', () => {
      const invalidRule = { ...validAlertRule, id: 'invalid-id' };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('告警规则ID'))).toBe(true);
    });

    it('should reject rule with invalid name', () => {
      const invalidRule = { ...validAlertRule, name: '' };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的规则名称格式'))).toBe(true);
    });

    it('should reject rule with invalid metric name', () => {
      const invalidRule = { ...validAlertRule, metric: '123invalid' };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的监控指标名称格式'))).toBe(true);
    });

    it('should reject rule with invalid operator', () => {
      const invalidRule = { ...validAlertRule, operator: 'invalid' as any };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的比较操作符'))).toBe(true);
    });

    it('should reject rule with invalid threshold', () => {
      const invalidRule = { ...validAlertRule, threshold: NaN };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的阈值'))).toBe(true);
    });

    it('should reject rule with invalid duration (too low)', () => {
      const invalidRule = { ...validAlertRule, duration: 30 };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的持续时间'))).toBe(true);
    });

    it('should reject rule with invalid duration (too high)', () => {
      const invalidRule = { ...validAlertRule, duration: 5000 };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的持续时间'))).toBe(true);
    });

    it('should reject rule with invalid cooldown (too low)', () => {
      const invalidRule = { ...validAlertRule, cooldown: 100 };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的冷却时间'))).toBe(true);
    });

    it('should reject rule with invalid cooldown (too high)', () => {
      const invalidRule = { ...validAlertRule, cooldown: 100000 };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的冷却时间'))).toBe(true);
    });

    it('should reject rule with no notification channels', () => {
      const invalidRule = { ...validAlertRule, channels: [] };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('通知渠道'))).toBe(true);
    });

    it('should reject rule with notification channel missing type', () => {
      const invalidRule = {
        ...validAlertRule,
        channels: [{ enabled: true, config: {} } as any]
      };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('必须指定渠道类型'))).toBe(true);
    });

    it('should reject rule with invalid severity', () => {
      const invalidRule = { ...validAlertRule, severity: 'invalid' as any };

      const result = validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('无效的严重程度'))).toBe(true);
    });

    it('should provide warnings for business logic concerns', () => {
      const ruleWithWarnings = {
        ...validAlertRule,
        cooldown: 90 * 86400 + 100, // Very long cooldown
        threshold: 0,
        operator: 'eq' as any
      };

      const result = validator.validateRule(ruleWithWarnings);

      expect((result as any).warnings.some((warning: string) => warning.includes('冷却时间超过'))).toBe(true);
      expect((result as any).warnings.some((warning: string) => warning.includes('使用0作为阈值'))).toBe(true);
    });

    it('should warn for enabled channel without config', () => {
      const ruleWithIncompleteChannel = {
        ...validAlertRule,
        channels: [{ name: 'Incomplete Email', type: 'email', enabled: true }] as any
      };

      const result = validator.validateRule(ruleWithIncompleteChannel);

      expect((result as any).warnings.some((warning: string) => warning.includes('建议配置详细信息'))).toBe(true);
    });

    it('should handle missing alert config gracefully', () => {
      mockConfigService.get.mockReturnValue(null);

      const result = validator.validateRule(validAlertRule);

      // Should still validate basic fields but skip duration/cooldown validation
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRules', () => {
    it('should validate multiple rules', () => {
      const validRule2 = { ...validAlertRule, id: '507f1f77bcf86cd799439012', name: 'Valid Rule 2' };
      const invalidRule = { ...validAlertRule, id: '507f1f77bcf86cd799439013', name: '', metric: '' };

      const results = validator.validateRules([validAlertRule, validRule2, invalidRule]);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[0].ruleId).toBe(validAlertRule.id);
      expect(results[1].valid).toBe(true);
      expect(results[1].ruleId).toBe(validRule2.id);
      expect(results[2].valid).toBe(false);
      expect(results[2].ruleId).toBe(invalidRule.id);
      expect(results[2].errors.length).toBeGreaterThan(0);
    });

    it('should handle empty rules array', () => {
      const results = validator.validateRules([]);

      expect(results).toHaveLength(0);
    });

    it('should provide individual validation results for each rule', () => {
      const rule1 = { ...validAlertRule, name: '' }; // Invalid
      const rule2 = { ...validAlertRule, id: '507f1f77bcf86cd799439012' }; // Valid

      const results = validator.validateRules([rule1, rule2]);

      expect(results[0].valid).toBe(false);
      expect(results[0].errors.some(error => error.includes('规则名称'))).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[1].errors).toHaveLength(0);
    });
  });

  describe('getSupportedOperators', () => {
    it('should return all supported operators', () => {
      const operators = validator.getSupportedOperators();

      expect(operators).toEqual(VALID_OPERATORS);
      expect(operators).toContain('>');
      expect(operators).toContain('<');
      expect(operators).toContain('>=');
      expect(operators).toContain('<=');
      expect(operators).toContain('==');
      expect(operators).toContain('!=');
      expect(operators).toContain('contains');
      expect(operators).toContain('not_contains');
      expect(operators).toContain('regex');
    });
  });

  describe('getDefaultRuleConfig', () => {
    it('should return default rule configuration', () => {
      const defaultConfig = validator.getDefaultRuleConfig();

      expect(defaultConfig).toMatchObject({
        operator: '>',
        severity: 'warning',
        enabled: true,
        tags: {}
      });
      expect(defaultConfig.duration).toBeDefined();
      expect(defaultConfig.cooldown).toBeDefined();
    });

    it('should use cache config as fallback when alert config missing', () => {
      mockConfigService.get.mockReturnValue(null);

      const defaultConfig = validator.getDefaultRuleConfig();

      expect(defaultConfig.duration).toBe(mockCacheConfig.defaultTtl);
      expect(defaultConfig.cooldown).toBe(mockCacheConfig.defaultTtl);
    });

    it('should use alert config values when available', () => {
      const defaultConfig = validator.getDefaultRuleConfig();

      expect(defaultConfig.duration).toBe(mockAlertConfig.validation.duration.min);
      expect(defaultConfig.cooldown).toBe(mockAlertConfig.validation.cooldown.min);
    });
  });

  describe('getValidatorStats', () => {
    it('should return comprehensive validator statistics', () => {
      const stats = validator.getValidatorStats();

      expect(stats).toHaveProperty('supportedOperators');
      expect(stats).toHaveProperty('validSeverities');
      expect(stats).toHaveProperty('defaultDuration');
      expect(stats).toHaveProperty('defaultCooldown');

      expect(stats.supportedOperators).toEqual(VALID_OPERATORS);
      expect(stats.validSeverities).toEqual(['info', 'warning', 'critical']);
      expect(typeof stats.defaultDuration).toBe('number');
      expect(typeof stats.defaultCooldown).toBe('number');
    });

    it('should use cache config fallback for stats', () => {
      mockConfigService.get.mockReturnValue(null);

      const stats = validator.getValidatorStats();

      expect(stats.defaultDuration).toBe(mockCacheConfig.defaultTtl);
      expect(stats.defaultCooldown).toBe(mockCacheConfig.defaultTtl);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle rule with undefined values gracefully', () => {
      const ruleWithUndefined = {
        ...validAlertRule,
        duration: undefined,
        cooldown: undefined,
        channels: undefined
      } as any;

      const result = validator.validateRule(ruleWithUndefined);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle rule with null ID', () => {
      const ruleWithNullId = { ...validAlertRule, id: null as any };

      const result = validator.validateRule(ruleWithNullId);

      expect(result.valid).toBe(true); // ID is optional in validation
    });

    it('should validate all operator types', () => {
      VALID_OPERATORS.forEach(operator => {
        const ruleWithOperator = { ...validAlertRule, operator };

        const result = validator.validateRule(ruleWithOperator);

        expect(result.valid).toBe(true);
      });
    });

    it('should validate all severity levels', () => {
      const validSeverities = ['info', 'warning', 'critical'];

      validSeverities.forEach(severity => {
        const ruleWithSeverity = { ...validAlertRule, severity: severity as any };

        const result = validator.validateRule(ruleWithSeverity);

        expect(result.valid).toBe(true);
      });
    });
  });
});