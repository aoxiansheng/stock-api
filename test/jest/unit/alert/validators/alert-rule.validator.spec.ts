import { Test, TestingModule } from '@nestjs/testing';
import { AlertRuleValidator } from '../../../../src/alert/validators/alert-rule.validator';
import { ConfigService } from '@nestjs/config';
import { IAlertRule } from '../../../../src/alert/interfaces';
import { AlertRuleUtil } from '../../../../src/alert/constants';

describe('AlertRuleValidator', () => {
  let validator: AlertRuleValidator;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleValidator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: 'cacheUnified',
          useValue: {
            defaultTtl: 300,
          },
        },
      ],
    }).compile();

    validator = module.get(AlertRuleValidator);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(validator).toBeDefined();
  });

  describe('validateRule', () => {
    const mockRule: IAlertRule = {
      id: 'rule_123',
      name: 'Test Alert Rule',
      description: 'Test alert rule description',
      metric: 'cpu.usage',
      operator: '>',
      threshold: 80,
      duration: 300,
      severity: 'warning',
      enabled: true,
      channels: [
        {
          id: 'channel_1',
          name: 'Email Channel',
          type: 'email' as any,
          config: { email: 'test@example.com' },
          enabled: true,
        }
      ],
      cooldown: 600,
      tags: { environment: 'test' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a correct rule successfully', () => {
      // Arrange
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(mockRule);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return validation errors for invalid rule name', () => {
      // Arrange
      const invalidRule = { ...mockRule, name: '' };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的规则名称格式: ');
    });

    it('should return validation errors for invalid metric name', () => {
      // Arrange
      const invalidRule = { ...mockRule, metric: '' };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的监控指标名称格式: ');
    });

    it('should return validation errors for invalid operator', () => {
      // Arrange
      const invalidRule = { ...mockRule, operator: 'invalid' as any };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的比较操作符: invalid');
    });

    it('should return validation errors for invalid threshold', () => {
      // Arrange
      const invalidRule = { ...mockRule, threshold: NaN };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的阈值: NaN，必须是有效数字');
    });

    it('should return validation errors for invalid duration', () => {
      // Arrange
      const invalidRule = { ...mockRule, duration: 10 };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的持续时间: 10，必须在30-3600秒之间');
    });

    it('should return validation errors for invalid cooldown', () => {
      // Arrange
      const invalidRule = { ...mockRule, cooldown: 30 };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的冷却时间: 30，必须在60-86400秒之间');
    });

    it('should return validation errors for missing channels', () => {
      // Arrange
      const invalidRule = { ...mockRule, channels: [] };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('必需字段缺失: 通知渠道');
    });

    it('should return validation errors for invalid channel type', () => {
      // Arrange
      const invalidRule = {
        ...mockRule,
        channels: [
          {
            id: 'channel_1',
            name: 'Invalid Channel',
            type: undefined as any,
            config: {},
            enabled: true,
          }
        ]
      };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的通知渠道配置 1: 必须指定渠道类型');
    });

    it('should return validation errors for invalid severity', () => {
      // Arrange
      const invalidRule = { ...mockRule, severity: 'invalid' as any };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无效的严重程度: invalid，必须是: info, warning, critical');
    });

    it('should return warnings for long cooldown periods', () => {
      // Arrange
      const ruleWithLongCooldown = { ...mockRule, cooldown: 91 * 86400 };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(ruleWithLongCooldown);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('冷却时间超过2160小时，可能会延迟重要告警');
    });

    it('should return warnings for zero threshold with equality operators', () => {
      // Arrange
      const ruleWithZeroThreshold = { ...mockRule, threshold: 0, operator: '==' };
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const result = validator.validateRule(ruleWithZeroThreshold);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('使用0作为阈值时请确认业务逻辑正确');
    });
  });

  describe('validateRules', () => {
    const mockRules: IAlertRule[] = [
      {
        id: 'rule_1',
        name: 'Test Rule 1',
        metric: 'cpu.usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        enabled: true,
        channels: [
          {
            id: 'channel_1',
            name: 'Email Channel',
            type: 'email' as any,
            config: { email: 'test@example.com' },
            enabled: true,
          }
        ],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule_2',
        name: 'Test Rule 2',
        metric: 'memory.usage',
        operator: '>',
        threshold: 90,
        duration: 300,
        severity: 'critical',
        enabled: true,
        channels: [
          {
            id: 'channel_2',
            name: 'SMS Channel',
            type: 'sms' as any,
            config: { phone: '+1234567890' },
            enabled: true,
          }
        ],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    it('should validate multiple rules and return results', () => {
      // Arrange
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const results = validator.validateRules(mockRules);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('should handle validation failures in batch validation', () => {
      // Arrange
      const invalidRules = [
        { ...mockRules[0], name: '' },
        { ...mockRules[1], operator: 'invalid' as any }
      ];
      
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30, max: 3600 },
          cooldown: { min: 60, max: 86400 }
        }
      });

      // Act
      const results = validator.validateRules(invalidRules);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(false);
      expect(results[1].valid).toBe(false);
    });
  });

  describe('getSupportedOperators', () => {
    it('should return list of supported operators', () => {
      // Act
      const operators = validator.getSupportedOperators();

      // Assert
      expect(operators).toEqual(['>', '>=', '<', '<=', '==', '!=']);
    });
  });

  describe('getDefaultRuleConfig', () => {
    it('should return default rule configuration', () => {
      // Arrange
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30 },
          cooldown: { min: 60 }
        }
      });

      // Act
      const config = validator.getDefaultRuleConfig();

      // Assert
      expect(config).toEqual({
        operator: '>',
        duration: 30,
        cooldown: 60,
        severity: 'warning',
        enabled: true,
        tags: {}
      });
    });

    it('should use cache config defaults when alert config is not available', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act
      const config = validator.getDefaultRuleConfig();

      // Assert
      expect(config).toEqual({
        operator: '>',
        duration: 300,
        cooldown: 300,
        severity: 'warning',
        enabled: true,
        tags: {}
      });
    });
  });

  describe('getValidatorStats', () => {
    it('should return validator statistics', () => {
      // Arrange
      configService.get.mockReturnValue({
        validation: {
          duration: { min: 30 },
          cooldown: { min: 60 }
        }
      });

      // Act
      const stats = validator.getValidatorStats();

      // Assert
      expect(stats).toEqual({
        supportedOperators: ['>', '>=', '<', '<=', '==', '!='],
        validSeverities: ['info', 'warning', 'critical'],
        defaultDuration: 30,
        defaultCooldown: 60
      });
    });
  });
});