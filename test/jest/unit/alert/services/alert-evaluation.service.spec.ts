import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { AlertEvaluationService } from '../../../../src/alert/services/alert-evaluation.service';
import { AlertRuleService } from '../../../../src/alert/services/alert-rule.service';
import { AlertCacheService } from '../../../../src/alert/services/alert-cache.service';
import { AlertLifecycleService } from '../../../../src/alert/services/alert-lifecycle.service';
import { RuleEvaluator } from '../../../../src/alert/evaluators/rule.evaluator';
import { IAlertRule, IMetricData, IRuleEvaluationResult } from '../../../../src/alert/interfaces';

// Mock 数据
const mockAlertRule: IAlertRule = {
  id: 'rule_1234567890_abcdef',
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

const mockMetricData: IMetricData = {
  metric: 'cpu.usage',
  value: 85,
  timestamp: new Date(),
  tags: { host: 'server1' }
};

const mockEvaluationResult: IRuleEvaluationResult = {
  ruleId: 'rule_1234567890_abcdef',
  triggered: true,
  value: 85,
  threshold: 80,
  message: 'Alert triggered: cpu.usage > 80, current value: 85',
  evaluatedAt: new Date(),
  context: {
    metric: 'cpu.usage',
    operator: '>',
    tags: { host: 'server1' }
  }
};

describe('AlertEvaluationService', () => {
  let service: AlertEvaluationService;
  let alertRuleService: jest.Mocked<AlertRuleService>;
  let alertCacheService: jest.Mocked<AlertCacheService>;
  let alertLifecycleService: jest.Mocked<AlertLifecycleService>;
  let ruleEvaluator: jest.Mocked<RuleEvaluator>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEvaluationService,
        {
          provide: AlertRuleService,
          useValue: {
            getEnabledRules: jest.fn(),
            getRuleById: jest.fn(),
          },
        },
        {
          provide: AlertCacheService,
          useValue: {
            getActiveAlert: jest.fn(),
            isInCooldown: jest.fn(),
            setCooldown: jest.fn(),
          },
        },
        {
          provide: AlertLifecycleService,
          useValue: {
            createAlert: jest.fn(),
            resolveAlert: jest.fn(),
          },
        },
        {
          provide: RuleEvaluator,
          useValue: {
            evaluateRule: jest.fn(),
            evaluateRules: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              evaluationInterval: 60,
              evaluationTimeout: 5000,
              maxRetries: 3,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AlertEvaluationService);
    alertRuleService = module.get(AlertRuleService);
    alertCacheService = module.get(AlertCacheService);
    alertLifecycleService = module.get(AlertLifecycleService);
    ruleEvaluator = module.get(RuleEvaluator);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize the service correctly', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('alert', {
        evaluationInterval: 60,
        evaluationTimeout: 5000,
        maxRetries: 3,
      });
    });
  });

  describe('processMetrics', () => {
    it('should process metrics and evaluate rules successfully', async () => {
      // Arrange
      alertRuleService.getEnabledRules.mockResolvedValue([mockAlertRule]);
      ruleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);
      alertCacheService.getActiveAlert.mockResolvedValue(null);
      alertCacheService.isInCooldown.mockResolvedValue(false);

      // Act
      await service.processMetrics([mockMetricData]);

      // Assert
      expect(alertRuleService.getEnabledRules).toHaveBeenCalled();
      expect(ruleEvaluator.evaluateRules).toHaveBeenCalledWith([mockAlertRule], [mockMetricData]);
      expect(alertLifecycleService.createAlert).toHaveBeenCalledWith(mockEvaluationResult, mockAlertRule);
    });

    it('should handle empty metrics data', async () => {
      // Act
      await service.processMetrics([]);

      // Assert
      expect(alertRuleService.getEnabledRules).not.toHaveBeenCalled();
    });

    it('should handle no enabled rules', async () => {
      // Arrange
      alertRuleService.getEnabledRules.mockResolvedValue([]);

      // Act
      await service.processMetrics([mockMetricData]);

      // Assert
      expect(alertRuleService.getEnabledRules).toHaveBeenCalled();
      expect(ruleEvaluator.evaluateRules).not.toHaveBeenCalled();
    });
  });

  describe('evaluateRule', () => {
    it('should evaluate a single rule successfully', async () => {
      // Arrange
      alertRuleService.getRuleById.mockResolvedValue(mockAlertRule);
      ruleEvaluator.evaluateRule.mockReturnValue(mockEvaluationResult);

      // Act
      const result = await service.evaluateRule('rule_1234567890_abcdef', [mockMetricData]);

      // Assert
      expect(alertRuleService.getRuleById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(ruleEvaluator.evaluateRule).toHaveBeenCalledWith(mockAlertRule, [mockMetricData]);
      expect(result).toEqual(mockEvaluationResult);
    });

    it('should skip evaluation for disabled rules', async () => {
      // Arrange
      const disabledRule = { ...mockAlertRule, enabled: false };
      alertRuleService.getRuleById.mockResolvedValue(disabledRule);

      // Act
      const result = await service.evaluateRule('rule_1234567890_abcdef', [mockMetricData]);

      // Assert
      expect(alertRuleService.getRuleById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(ruleEvaluator.evaluateRule).not.toHaveBeenCalled();
      expect(result.triggered).toBe(false);
      expect(result.message).toBe('规则已禁用');
    });
  });

  describe('evaluateRules', () => {
    it('should evaluate multiple rules successfully', async () => {
      // Arrange
      const ruleIds = ['rule_1', 'rule_2'];
      const rules = [
        { ...mockAlertRule, id: 'rule_1' },
        { ...mockAlertRule, id: 'rule_2' }
      ];
      
      alertRuleService.getRuleById
        .mockResolvedValueOnce(rules[0])
        .mockResolvedValueOnce(rules[1]);
      
      ruleEvaluator.evaluateRules.mockReturnValue([
        { ...mockEvaluationResult, ruleId: 'rule_1' },
        { ...mockEvaluationResult, ruleId: 'rule_2' }
      ]);

      // Act
      const results = await service.evaluateRules(ruleIds, [mockMetricData]);

      // Assert
      expect(alertRuleService.getRuleById).toHaveBeenCalledTimes(2);
      expect(ruleEvaluator.evaluateRules).toHaveBeenCalledWith(rules, [mockMetricData]);
      expect(results).toHaveLength(2);
    });

    it('should handle disabled rules in batch evaluation', async () => {
      // Arrange
      const ruleIds = ['rule_1'];
      const disabledRule = { ...mockAlertRule, id: 'rule_1', enabled: false };
      alertRuleService.getRuleById.mockResolvedValue(disabledRule);

      // Act
      const results = await service.evaluateRules(ruleIds, [mockMetricData]);

      // Assert
      expect(results[0].triggered).toBe(false);
      expect(results[0].message).toBe('规则已禁用');
    });
  });

  describe('handleSystemEvent', () => {
    it('should handle system events correctly', async () => {
      // Arrange
      const event = { type: 'performance.cpu.high', data: { value: 85 } };
      service['convertEventToMetric'] = jest.fn().mockReturnValue(mockMetricData);
      service.processMetrics = jest.fn();

      // Act
      await service.handleSystemEvent(event);

      // Assert
      expect(service['convertEventToMetric']).toHaveBeenCalledWith(event);
      expect(service.processMetrics).toHaveBeenCalledWith([mockMetricData]);
    });

    it('should handle events that cannot be converted to metrics', async () => {
      // Arrange
      const event = { type: 'performance.cpu.high', data: { value: 85 } };
      service['convertEventToMetric'] = jest.fn().mockReturnValue(null);

      // Act
      await service.handleSystemEvent(event);

      // Assert
      expect(service['convertEventToMetric']).toHaveBeenCalledWith(event);
      expect(service.processMetrics).not.toHaveBeenCalled();
    });
  });

  describe('scheduleRuleEvaluation', () => {
    it('should execute scheduled rule evaluation', async () => {
      // Arrange
      service['fetchRecentMetrics'] = jest.fn().mockResolvedValue([mockMetricData]);
      service.processMetrics = jest.fn();
      service['lastEvaluationTime'] = new Date(Date.now() - 70000); // 70 seconds ago

      // Act
      await service.scheduleRuleEvaluation();

      // Assert
      expect(service['fetchRecentMetrics']).toHaveBeenCalled();
      expect(service.processMetrics).toHaveBeenCalledWith([mockMetricData]);
    });

    it('should skip evaluation if not enough time has passed', async () => {
      // Arrange
      service['lastEvaluationTime'] = new Date(); // Just now

      // Act
      await service.scheduleRuleEvaluation();

      // Assert
      expect(service['fetchRecentMetrics']).not.toHaveBeenCalled();
    });
  });

  describe('forceEvaluateAllRules', () => {
    it('should force evaluate all enabled rules', async () => {
      // Arrange
      alertRuleService.getEnabledRules.mockResolvedValue([mockAlertRule]);
      service['fetchRecentMetrics'] = jest.fn().mockResolvedValue([mockMetricData]);
      ruleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);
      alertCacheService.getActiveAlert.mockResolvedValue(null);
      alertCacheService.isInCooldown.mockResolvedValue(false);

      // Act
      const result = await service.forceEvaluateAllRules();

      // Assert
      expect(alertRuleService.getEnabledRules).toHaveBeenCalled();
      expect(service['fetchRecentMetrics']).toHaveBeenCalled();
      expect(ruleEvaluator.evaluateRules).toHaveBeenCalledWith([mockAlertRule], [mockMetricData]);
      expect(result.evaluatedCount).toBe(1);
      expect(result.triggeredCount).toBe(1);
    });
  });

  describe('getEvaluationStats', () => {
    it('should return evaluation statistics', () => {
      // Act
      const stats = service.getEvaluationStats();

      // Assert
      expect(stats).toEqual({
        lastEvaluationTime: null,
        totalEvaluations: 0,
        successfulEvaluations: 0,
        failedEvaluations: 0,
        totalRulesEvaluated: 0,
        triggeredRules: 0,
        resolvedRules: 0,
        evaluationErrors: 0,
        successRate: 0,
        evaluationInterval: 60,
        evaluationTimeout: 5000,
        maxRetries: 3,
      });
    });
  });

  describe('resetEvaluationStats', () => {
    it('should reset evaluation statistics', () => {
      // Arrange
      service['evaluationStats'].totalEvaluations = 5;
      service['evaluationStats'].successfulEvaluations = 3;

      // Act
      service.resetEvaluationStats();

      // Assert
      const stats = service.getEvaluationStats();
      expect(stats.totalEvaluations).toBe(0);
      expect(stats.successfulEvaluations).toBe(0);
    });
  });
});