import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RuleEngineService } from '../../../../../src/alert/services/rule-engine.service';
import { CacheService } from '../../../../../src/cache/cache.service';
import { IAlertRule, IMetricData } from '../../../../../src/alert/interfaces';
import { AlertSeverity, NotificationChannelType } from '../../../../../src/alert/types/alert.types';
import { VALID_OPERATORS } from '../../../../../src/alert/constants/alert.constants';

describe('RuleEngineService - Enhanced Error Handling', () => {
  let service: RuleEngineService;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;
  let loggerSpy: jest.SpyInstance;

  const mockAlert = {
    validation: {
      duration: { min: 1, max: 3600 },
      cooldown: { min: 0, max: 86400 },
    },
    cache: {
      cooldownPrefix: 'alert:cooldown:',
    },
  };

  const createMockRule = (overrides: Partial<IAlertRule> = {}): IAlertRule => ({
    id: 'test-rule',
    name: 'Test Rule',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 60,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [{
      name: 'Test Email Channel',
      type: NotificationChannelType.EMAIL,
      config: {},
      enabled: true
    }],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockMetricData = (overrides: Partial<IMetricData> = {}): IMetricData => ({
    metric: 'cpu_usage',
    value: 85,
    timestamp: new Date(),
    tags: { host: 'server1' },
    ...overrides,
  });

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'alert') return mockAlert;
        return null;
      }),
    };

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
    cacheService = module.get(CacheService);
    configService = module.get(ConfigService);

    // Spy on logger methods
    loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
    jest.spyOn((service as any).logger, 'debug').mockImplementation();
    jest.spyOn((service as any).logger, 'log').mockImplementation();
    jest.spyOn((service as any).logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateRule - Error Handling', () => {
    it('should handle rule with no matching metric data', () => {
      const rule = createMockRule({ metric: 'non_existent_metric' });
      const metricData = [createMockMetricData({ metric: 'different_metric' })];

      const result = service.evaluateRule(rule, metricData);

      expect(result).toEqual({
        ruleId: 'test-rule',
        triggered: false,
        value: 0,
        threshold: 80,
        message: expect.stringContaining('没有找到指标'),
        evaluatedAt: expect.any(Date),
      });
    });

    it('should handle empty metric data array', () => {
      const rule = createMockRule();
      const metricData: IMetricData[] = [];

      const result = service.evaluateRule(rule, metricData);

      expect(result.triggered).toBe(false);
      expect(result.value).toBe(0);
      expect(result.message).toContain('没有找到指标');
    });

    it('should handle metric data with null values', () => {
      const rule = createMockRule();
      const metricData = [createMockMetricData({ value: null as any })];

      // Should not throw error, handle gracefully
      expect(() => service.evaluateRule(rule, metricData)).not.toThrow();
    });

    it('should handle metric data with invalid timestamp', () => {
      const rule = createMockRule();
      const metricData = [
        createMockMetricData({ timestamp: null as any }),
        createMockMetricData({ timestamp: new Date(), value: 90 }),
      ];

      // Should handle the error and either skip invalid data or handle gracefully
      expect(() => service.evaluateRule(rule, metricData)).not.toThrow();
    });

    it('should re-throw errors that occur during evaluation', () => {
      const rule = createMockRule();
      const corruptedMetricData = {
        get metric() {
          throw new Error('Corrupted metric data');
        },
      } as any;

      expect(() => service.evaluateRule(rule, [corruptedMetricData])).toThrow('Corrupted metric data');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('规则评估失败'),
        expect.objectContaining({
          operation: expect.any(String),
          ruleId: 'test-rule',
          error: 'Corrupted metric data',
        })
      );
    });

    it('should not throw for undefined or null rule properties', () => {
      const invalidRule = createMockRule({
        metric: undefined as any,
        operator: null as any,
      });
      const metricData = [createMockMetricData()];

      expect(() => service.evaluateRule(invalidRule, metricData)).not.toThrow();
    });
  });

  describe('evaluateRules - Batch Error Handling', () => {
    it('should handle individual rule failures in batch without stopping', () => {
      const validRule = createMockRule({ id: 'valid-rule' });
      const invalidRule = createMockRule({
        id: 'invalid-rule',
        metric: undefined as any, 
      });
      const rules = [validRule, invalidRule];
      const metricData = [createMockMetricData()];

      // Mock evaluateRule to throw for the invalid rule to test the catch block in evaluateRules
      jest.spyOn(service, 'evaluateRule').mockImplementation((rule, data) => {
        if (rule.id === 'invalid-rule') {
          throw new Error('Forced evaluation error');
        }
        // Manually call the original implementation for valid rules
        return (service as any).constructor.prototype.evaluateRule.call(service, rule, data);
      });

      const results = service.evaluateRules(rules, metricData);

      expect(results).toHaveLength(2);
      expect(results[0].ruleId).toBe('valid-rule');
      expect(results[1].ruleId).toBe('invalid-rule');
      expect(results[1].triggered).toBe(false);
      expect(results[1].message).toContain('规则评估失败: Forced evaluation error');
      expect(loggerSpy).toHaveBeenCalledWith(
        '规则评估失败',
        expect.objectContaining({
          ruleId: 'invalid-rule',
          error: 'Forced evaluation error',
        }),
      );
    });

    it('should filter disabled rules from evaluation', () => {
      const enabledRule = createMockRule({ id: 'enabled', enabled: true });
      const disabledRule = createMockRule({ id: 'disabled', enabled: false });
      const rules = [enabledRule, disabledRule];
      const metricData = [createMockMetricData()];

      const results = service.evaluateRules(rules, metricData);

      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('enabled');
    });

    it('should handle empty rules array', () => {
      const rules: IAlertRule[] = [];
      const metricData = [createMockMetricData()];

      const results = service.evaluateRules(rules, metricData);

      expect(results).toEqual([]);
    });

    it('should handle all rules being disabled', () => {
      const rules = [
        createMockRule({ id: 'disabled1', enabled: false }),
        createMockRule({ id: 'disabled2', enabled: false }),
      ];
      const metricData = [createMockMetricData()];

      const results = service.evaluateRules(rules, metricData);

      expect(results).toEqual([]);
    });

    it('should re-throw errors that occur during batch processing setup', () => {
      const corruptedRules = {
        get length() {
          throw new Error('Corrupted rules array');
        },
        filter: () => {
          throw new Error('Corrupted rules array');
        },
      } as any;
      const metricData = [createMockMetricData()];

      expect(() => service.evaluateRules(corruptedRules, metricData)).toThrow();
    });
  });

  describe('isInCooldown - Error Handling', () => {
    it('should re-throw cache errors after logging', async () => {
      const ruleId = 'test-rule';
      cacheService.get.mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.isInCooldown(ruleId)).rejects.toThrow('Cache connection failed');

      expect(loggerSpy).toHaveBeenCalledWith(
        '检查冷却状态失败',
        expect.objectContaining({
          ruleId,
          error: 'Cache connection failed',
        })
      );
    });

    it('should handle null/undefined cache values gracefully', async () => {
      const ruleId = 'test-rule';
      cacheService.get.mockResolvedValue(null);

      const result = await service.isInCooldown(ruleId);

      expect(result).toBe(false);
    });

    it('should handle corrupted cache data', async () => {
      const ruleId = 'test-rule';
      cacheService.get.mockResolvedValue('corrupted-data' as any);

      const result = await service.isInCooldown(ruleId);

      // Should handle gracefully and return boolean result
      expect(typeof result).toBe('boolean');
    });
  });

  describe('setCooldown - Error Handling', () => {
    it('should skip setting cooldown for invalid duration', async () => {
      const ruleId = 'test-rule';
      const invalidCooldowns = [0, -1, -100];

      for (const cooldown of invalidCooldowns) {
        await service.setCooldown(ruleId, cooldown);
        expect(cacheService.set).not.toHaveBeenCalled();
      }
    });

    it('should re-throw cache service errors', async () => {
      const ruleId = 'test-rule';
      const cooldownSeconds = 300;
      cacheService.set.mockRejectedValue(new Error('Cache write failed'));

      await expect(service.setCooldown(ruleId, cooldownSeconds)).rejects.toThrow('Cache write failed');
      expect(loggerSpy).toHaveBeenCalledWith(
        '设置冷却失败',
        expect.objectContaining({
          ruleId,
          cooldownSeconds,
          error: 'Cache write failed',
        })
      );
    });

    it('should handle edge case cooldown values', async () => {
      const ruleId = 'test-rule';
      const edgeCases = [0.5, 1, 86400]; // Fractional, minimum, maximum

      for (const cooldown of edgeCases) {
        if (cooldown > 0) {
          await service.setCooldown(ruleId, cooldown);
          expect(cacheService.set).toHaveBeenCalledWith(
            expect.any(String),
            true,
            { ttl: cooldown }
          );
        }
        cacheService.set.mockClear();
      }
    });
  });

  describe('validateRule - Comprehensive Error Cases', () => {
    it('should validate rule name requirements', () => {
      const invalidNames = ['', null, undefined, ' ', 'a'.repeat(101)];

      invalidNames.forEach(name => {
        const rule = createMockRule({ name: name as any });
        const result = service.validateRule(rule);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('规则名称'))).toBe(true);
      });
    });

    it('should validate metric name requirements', () => {
      const invalidMetrics = ['', null, undefined, ' '];

      invalidMetrics.forEach(metric => {
        const rule = createMockRule({ metric: metric as any });
        const result = service.validateRule(rule);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('监控指标'))).toBe(true);
      });
    });

    it('should validate operator requirements', () => {
      const invalidOperators = ['invalid', '', null, undefined, 'equals', '>' as any];

      invalidOperators.forEach(operator => {
        const rule = createMockRule({ operator: operator as any });
        const result = service.validateRule(rule);

        if (!VALID_OPERATORS.includes(operator as any)) {
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('无效的比较操作符'))).toBe(true);
        }
      });
    });

    it('should validate threshold requirements', () => {
      const invalidThresholds = [null, undefined, NaN, Infinity, -Infinity, 'not-a-number' as any];

      invalidThresholds.forEach(threshold => {
        const rule = createMockRule({ threshold: threshold as any });
        const result = service.validateRule(rule);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('阈值必须是有效数字'))).toBe(true);
      });
    });

    it('should validate duration constraints', () => {
      const invalidDurations = [-1, 0, 3601, undefined]; // Below min, above max, undefined

      invalidDurations.forEach(duration => {
        const rule = createMockRule({ duration: duration as any });
        const result = service.validateRule(rule);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('持续时间必须在'))).toBe(true);
      });
    });

    it('should validate cooldown constraints', () => {
      const invalidCooldowns = [-1, 86401, undefined]; // Below min, above max, undefined

      invalidCooldowns.forEach(cooldown => {
        const rule = createMockRule({ cooldown: cooldown as any });
        const result = service.validateRule(rule);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('冷却时间必须在'))).toBe(true);
      });
    });

    it('should require at least one notification channel', () => {
      const rule = createMockRule({ channels: [] });
      const result = service.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('至少需要配置一个通知渠道');
    });

    it('should handle null/undefined channels', () => {
      const rule = createMockRule({ channels: null as any });
      const result = service.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('至少需要配置一个通知渠道');
    });

    it('should handle config service errors gracefully', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Config service failed');
      });

      const rule = createMockRule();

      expect(() => service.validateRule(rule)).toThrow('Config service failed');
    });
  });

  describe('getCooldownStatus - Error Handling', () => {
    it('should handle cache service errors', async () => {
      const ruleId = 'test-rule';
      cacheService.get.mockRejectedValue(new Error('Cache service error'));

      const result = await service.getCooldownStatus(ruleId);

      expect(result).toEqual({ inCooldown: false });
      expect(loggerSpy).toHaveBeenCalledWith(
        '获取冷却状态失败',
        expect.objectContaining({
          ruleId,
          error: 'Cache service error',
        })
      );
    });

    it('should handle cache returning undefined/null', async () => {
      const ruleId = 'test-rule';
      cacheService.get.mockResolvedValue(undefined);

      const result = await service.getCooldownStatus(ruleId);

      expect(result).toEqual({ inCooldown: false });
    });
  });

  describe('batchCheckCooldown - Error Handling', () => {
    it('should handle errors during batch processing', async () => {
      const ruleIds = ['rule1', 'rule2', 'rule3'];
      cacheService.get
        .mockResolvedValueOnce(true)  // rule1 in cooldown
        .mockRejectedValueOnce(new Error('Cache error')) // rule2 fails
        .mockResolvedValueOnce(false); // rule3 not in cooldown

      const result = await service.batchCheckCooldown(ruleIds);
      
      // Should not throw, but handle gracefully
      expect(result['rule2']).toBe(false); // Fails gracefully to false
      expect(loggerSpy).toHaveBeenCalledWith(
        '批量冷却检查失败',
        expect.objectContaining({
          ruleIdsCount: 3,
          error: expect.any(String),
        })
      );
    });

    it('should handle empty rule IDs array', async () => {
      const result = await service.batchCheckCooldown([]);

      expect(result).toEqual({});
    });
  });

  describe('clearCooldown - Error Handling', () => {
    it('should handle cache deletion errors', async () => {
      const ruleId = 'test-rule';
      cacheService.del.mockRejectedValue(new Error('Cache deletion failed'));

      await expect(service.clearCooldown(ruleId)).rejects.toThrow('Cache deletion failed');
      expect(loggerSpy).toHaveBeenCalledWith(
        '清除冷却状态失败',
        expect.objectContaining({
          ruleId,
          error: 'Cache deletion failed',
        })
      );
    });
  });

  describe('evaluateCondition - Edge Cases', () => {
    it('should handle unknown operator gracefully', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const result = (service as any).evaluateCondition.call(service, 50, 'unknown-operator' as any, 40);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('遇到未知的操作符'),
        expect.objectContaining({
          operation: 'evaluateCondition',
          value: 50,
          operator: 'unknown-operator',
          threshold: 40,
        })
      );
    });

    it('should handle edge case numeric values', () => {
      const testCases = [
        { value: Infinity, operator: 'gt', threshold: 100, expected: true },
        { value: -Infinity, operator: 'lt', threshold: 0, expected: true },
        { value: NaN, operator: 'eq', threshold: NaN, expected: false }, // NaN !== NaN
        { value: 0, operator: 'eq', threshold: -0, expected: true }, // 0 === -0
      ];

      testCases.forEach(({ value, operator, threshold, expected }) => {
        const result = (service as any).evaluateCondition(value, operator, threshold);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getServiceStats - Error Handling', () => {
    it('should handle config service errors', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Config service unavailable');
      });

      expect(() => service.getServiceStats()).toThrow('Config service unavailable');
    });

    it('should return correct stats under normal conditions', () => {
      const stats = service.getServiceStats();

      expect(stats).toEqual({
        operatorCount: VALID_OPERATORS.length,
        supportedOperators: VALID_OPERATORS,
        configuredCooldownPrefix: 'alert:cooldown:',
      });
    });
  });

  describe('Private method error handling via public interfaces', () => {
    it('should handle invalid cache key generation', () => {
      const ruleId = 'test-rule';
      // Test the cache key generation indirectly through isInCooldown
      cacheService.get.mockResolvedValue(false);

      expect(async () => await service.isInCooldown(ruleId)).not.toThrow();
      expect(cacheService.get).toHaveBeenCalledWith(expect.stringContaining(ruleId));
    });

    it('should handle operator symbol lookup for unknown operators', () => {
      const result = (service as any).getOperatorSymbol('unknown-operator' as any);
      expect(result).toBe('unknown-operator'); // Should fallback to original operator
    });
  });
});