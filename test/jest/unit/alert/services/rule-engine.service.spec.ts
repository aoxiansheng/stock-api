import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RuleEngineService } from '../../../../../src/alert/services/rule-engine.service';
import { IAlertRule, IMetricData } from '../../../../../src/alert/interfaces';
import { AlertSeverity, NotificationType } from '../../../../../src/alert/types/alert.types';
import { CacheService } from '../../../../../src/cache/cache.service';

describe('RuleEngineService', () => {
  let service: RuleEngineService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'alert') {
        return {
          validation: {
            duration: { min: 1, max: 3600 },
            cooldown: { min: 0, max: 86400 },
          },
          cache: {
            cooldownPrefix: 'alert:cooldown:',
          },
        };
      }
      return null;
    }),
  };

  const mockRule: IAlertRule = {
    id: 'test-rule',
    name: 'Test Rule',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 60,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMetricData: IMetricData[] = [
    {
      metric: 'cpu_usage',
      value: 85,
      timestamp: new Date(),
      tags: { host: 'server1' },
    },
    {
      metric: 'memory_usage',
      value: 70,
      timestamp: new Date(),
      tags: { host: 'server1' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Rule Evaluation', () => {
    it('should evaluate a rule and trigger alert when threshold exceeded', () => {
      // Act
      const result = service.evaluateRule(mockRule, mockMetricData);

      // Assert
      expect(result.ruleId).toBe('test-rule');
      expect(result.triggered).toBe(true);
      expect(result.value).toBe(85);
      expect(result.threshold).toBe(80);
      expect(result.message).toContain('告警触发');
    });

    it('should not trigger alert when threshold not exceeded', () => {
      // Arrange
      const lowValueMetric: IMetricData[] = [
        {
          metric: 'cpu_usage',
          value: 75,
          timestamp: new Date(),
        },
      ];

      // Act
      const result = service.evaluateRule(mockRule, lowValueMetric);

      // Assert
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(75);
      expect(result.message).toContain('正常');
    });

    it('should handle missing metric data', () => {
      // Arrange
      const emptyMetrics: IMetricData[] = [];

      // Act
      const result = service.evaluateRule(mockRule, emptyMetrics);

      // Assert
      expect(result.triggered).toBe(false);
      expect(result.value).toBe(0);
      expect(result.message).toContain('没有找到指标');
    });

    it('should evaluate multiple rules', () => {
      // Arrange
      const rules = [
        mockRule,
        {
          ...mockRule,
          id: 'rule-2',
          metric: 'memory_usage',
          threshold: 75,
        },
      ];

      // Act
      const results = service.evaluateRules(rules, mockMetricData);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].triggered).toBe(true); // CPU rule triggered
      expect(results[1].triggered).toBe(false); // Memory rule not triggered
    });
  });

  describe('Operator Testing', () => {
    const testCases = [
      { operator: 'gt', value: 85, threshold: 80, expected: true },
      { operator: 'gt', value: 75, threshold: 80, expected: false },
      { operator: 'gte', value: 80, threshold: 80, expected: true },
      { operator: 'lt', value: 75, threshold: 80, expected: true },
      { operator: 'lt', value: 85, threshold: 80, expected: false },
      { operator: 'lte', value: 80, threshold: 80, expected: true },
      { operator: 'eq', value: 80, threshold: 80, expected: true },
      { operator: 'ne', value: 85, threshold: 80, expected: true },
    ];

    testCases.forEach(({ operator, value, threshold, expected }) => {
      it(`should correctly evaluate ${operator} operator`, () => {
        // Arrange
        const rule = { ...mockRule, operator: operator as any, threshold };
        const metrics = [{ ...mockMetricData[0], value }];

        // Act
        const result = service.evaluateRule(rule, metrics);

        // Assert
        expect(result.triggered).toBe(expected);
      });
    });
  });

  describe('Cooldown Management', () => {
    it('should set and check cooldown', async () => {
      // Arrange
      const ruleId = 'test-rule';
      mockCacheService.get.mockResolvedValue(true);

      // Act
      await service.setCooldown(ruleId, 60);
      const isInCooldown = await service.isInCooldown(ruleId);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'alert:cooldown:test-rule',
        true,
        { ttl: 60 }
      );
      expect(isInCooldown).toBe(true);
    });

    it('should return false for non-existent cooldown', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      // Act
      const isInCooldown = await service.isInCooldown('non-existent-rule');

      // Assert
      expect(isInCooldown).toBe(false);
    });

    it('should get cooldown status', async () => {
      // Arrange
      const ruleId = 'rule-1';
      mockCacheService.get.mockResolvedValue(true);

      // Act
      const status = await service.getCooldownStatus(ruleId);

      // Assert
      expect(status.inCooldown).toBe(true);
    });
  });

  describe('Rule Validation', () => {
    it('should validate a correct rule', () => {
      // Arrange
      const validRule = { ...mockRule, channels: [{ name: 'email-channel', type: NotificationType.EMAIL, config: {}, enabled: true }] };

      // Act
      const result = service.validateRule(validRule);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid rule name', () => {
      // Arrange
      const invalidRule = { ...mockRule, name: '' };

      // Act
      const result = service.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('规则验证失败: 规则名称格式无效或为空');
    });

    it('should detect invalid metric', () => {
      // Arrange
      const invalidRule = { ...mockRule, metric: '' };

      // Act
      const result = service.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('规则验证失败: 监控指标名称格式无效或为空');
    });

    it('should detect invalid operator', () => {
      // Arrange
      const invalidRule = { ...mockRule, operator: 'invalid' as any };

      // Act
      const result = service.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('规则验证失败: 无效的比较操作符: invalid');
    });

    it('should detect invalid threshold', () => {
      // Arrange
      const invalidRule = { ...mockRule, threshold: NaN };

      // Act
      const result = service.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('规则验证失败: 阈值必须是有效数字');
    });

    it('should detect invalid duration', () => {
      // Arrange
      const invalidRule = { ...mockRule, duration: 0 };

      // Act
      const result = service.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('持续时间必须在1-3600秒之间');
    });

    it('should detect missing channels', () => {
      // Arrange
      const invalidRule = { ...mockRule, channels: [] };

      // Act
      const result = service.validateRule(invalidRule);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('至少需要配置一个通知渠道');
    });
  });
});
