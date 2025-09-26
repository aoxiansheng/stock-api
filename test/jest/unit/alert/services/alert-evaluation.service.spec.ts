import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlertEvaluationService } from '@alert/services/alert-evaluation.service';
import { AlertRuleService } from '@alert/services/alert-rule.service';
import { AlertCacheService } from '@alert/services/alert-cache.service';
import { AlertLifecycleService } from '@alert/services/alert-lifecycle.service';
import { RuleEvaluator } from '@alert/evaluators/rule.evaluator';
import { IAlertRule, IMetricData, IRuleEvaluationResult } from '@alert/interfaces';
import { AlertStatus, AlertSeverity } from '@alert/types/alert.types';
import { Operator } from '@alert/constants';

describe('AlertEvaluationService', () => {
  let service: AlertEvaluationService;
  let mockAlertRuleService: any;
  let mockAlertCacheService: any;
  let mockAlertLifecycleService: any;
  let mockRuleEvaluator: any;
  let mockEventEmitter: any;
  let mockConfigService: any;

  const mockRule: IAlertRule = {
    id: 'rule_123',
    name: 'Test Rule',
    description: 'Test rule description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    cooldown: 300,
    channels: [],
    tags: { team: 'infrastructure' },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMetricData: IMetricData[] = [
    {
      metric: 'cpu_usage',
      value: 85,
      timestamp: new Date(),
      tags: { host: 'server-1' }
    }
  ];

  const mockEvaluationResult: IRuleEvaluationResult = {
    ruleId: 'rule_123',
    triggered: true,
    value: 85,
    threshold: 80,
    message: 'CPU usage exceeded threshold',
    evaluatedAt: new Date()
  };

  beforeEach(async () => {
    mockAlertRuleService = {
      getEnabledRules: jest.fn(),
      getRuleById: jest.fn()
    };

    mockAlertCacheService = {
      getActiveAlert: jest.fn(),
      isInCooldown: jest.fn(),
      setCooldown: jest.fn()
    };

    mockAlertLifecycleService = {
      createAlert: jest.fn(),
      resolveAlert: jest.fn()
    };

    mockRuleEvaluator = {
      evaluateRules: jest.fn(),
      evaluateRule: jest.fn()
    };

    mockEventEmitter = {
      emit: jest.fn()
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue({
        evaluationInterval: 60,
        evaluationTimeout: 5000,
        maxRetries: 3
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEvaluationService,
        { provide: AlertRuleService, useValue: mockAlertRuleService },
        { provide: AlertCacheService, useValue: mockAlertCacheService },
        { provide: AlertLifecycleService, useValue: mockAlertLifecycleService },
        { provide: RuleEvaluator, useValue: mockRuleEvaluator },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService }
      ],
    }).compile();

    service = module.get<AlertEvaluationService>(AlertEvaluationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configuration', async () => {
      await service.onModuleInit();

      expect(mockConfigService.get).toHaveBeenCalledWith('alert', expect.any(Object));
    });

    it('should get evaluation statistics', () => {
      const stats = service.getEvaluationStats();

      expect(stats).toHaveProperty('totalEvaluations');
      expect(stats).toHaveProperty('successfulEvaluations');
      expect(stats).toHaveProperty('failedEvaluations');
      expect(stats).toHaveProperty('totalRulesEvaluated');
      expect(stats).toHaveProperty('triggeredRules');
      expect(stats).toHaveProperty('resolvedRules');
      expect(stats).toHaveProperty('evaluationErrors');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('evaluationInterval');
      expect(stats).toHaveProperty('evaluationTimeout');
      expect(stats).toHaveProperty('maxRetries');
      expect(stats.evaluationInterval).toBe(60);
    });

    it('should reset evaluation statistics', () => {
      service.resetEvaluationStats();
      const stats = service.getEvaluationStats();

      expect(stats.totalEvaluations).toBe(0);
      expect(stats.successfulEvaluations).toBe(0);
      expect(stats.failedEvaluations).toBe(0);
    });
  });

  describe('Process Metrics', () => {
    it('should process metrics and evaluate rules', async () => {
      mockAlertRuleService.getEnabledRules.mockResolvedValue([mockRule]);
      mockRuleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(null);
      mockAlertCacheService.isInCooldown.mockResolvedValue(false);
      mockAlertLifecycleService.createAlert.mockResolvedValue(undefined);
      mockAlertCacheService.setCooldown.mockResolvedValue(undefined);

      await service.processMetrics(mockMetricData);

      expect(mockAlertRuleService.getEnabledRules).toHaveBeenCalled();
      expect(mockRuleEvaluator.evaluateRules).toHaveBeenCalledWith([mockRule], mockMetricData);
      expect(mockAlertLifecycleService.createAlert).toHaveBeenCalledWith(mockEvaluationResult, mockRule);
      expect(mockAlertCacheService.setCooldown).toHaveBeenCalledWith('rule_123', 300);
    });

    it('should skip processing when no metrics provided', async () => {
      await service.processMetrics([]);

      expect(mockAlertRuleService.getEnabledRules).not.toHaveBeenCalled();
    });

    it('should skip processing when no enabled rules', async () => {
      mockAlertRuleService.getEnabledRules.mockResolvedValue([]);

      await service.processMetrics(mockMetricData);

      expect(mockRuleEvaluator.evaluateRules).not.toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      mockAlertRuleService.getEnabledRules.mockRejectedValue(new Error('Rule service error'));

      await expect(service.processMetrics(mockMetricData)).rejects.toThrow('Rule service error');
    });

    it('should not create alert when rule is in cooldown', async () => {
      mockAlertRuleService.getEnabledRules.mockResolvedValue([mockRule]);
      mockRuleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(null);
      mockAlertCacheService.isInCooldown.mockResolvedValue(true);

      await service.processMetrics(mockMetricData);

      expect(mockAlertLifecycleService.createAlert).not.toHaveBeenCalled();
    });

    it('should not create alert when active alert already exists', async () => {
      const mockActiveAlert = { id: 'alert_456', ruleId: 'rule_123' };
      mockAlertRuleService.getEnabledRules.mockResolvedValue([mockRule]);
      mockRuleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(mockActiveAlert);

      await service.processMetrics(mockMetricData);

      expect(mockAlertLifecycleService.createAlert).not.toHaveBeenCalled();
    });

    it('should resolve alert when rule recovers', async () => {
      const mockActiveAlert = { id: 'alert_456', ruleId: 'rule_123' };
      const recoveredResult = { ...mockEvaluationResult, triggered: false };

      mockAlertRuleService.getEnabledRules.mockResolvedValue([mockRule]);
      mockRuleEvaluator.evaluateRules.mockReturnValue([recoveredResult]);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(mockActiveAlert);
      mockAlertLifecycleService.resolveAlert.mockResolvedValue(undefined);

      await service.processMetrics(mockMetricData);

      expect(mockAlertLifecycleService.resolveAlert).toHaveBeenCalledWith('alert_456', 'system', 'rule_123');
    });

    it('should update evaluation statistics', async () => {
      mockAlertRuleService.getEnabledRules.mockResolvedValue([mockRule]);
      mockRuleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(null);
      mockAlertCacheService.isInCooldown.mockResolvedValue(false);

      await service.processMetrics(mockMetricData);

      const stats = service.getEvaluationStats();
      expect(stats.totalRulesEvaluated).toBe(1);
      expect(stats.triggeredRules).toBe(1);
    });
  });

  describe('Evaluate Single Rule', () => {
    it('should evaluate single rule successfully', async () => {
      mockAlertRuleService.getRuleById.mockResolvedValue(mockRule);
      mockRuleEvaluator.evaluateRule.mockReturnValue(mockEvaluationResult);

      const result = await service.evaluateRule('rule_123', mockMetricData);

      expect(mockAlertRuleService.getRuleById).toHaveBeenCalledWith('rule_123');
      expect(mockRuleEvaluator.evaluateRule).toHaveBeenCalledWith(mockRule, mockMetricData);
      expect(result).toEqual(mockEvaluationResult);
    });

    it('should skip disabled rule evaluation', async () => {
      const disabledRule = { ...mockRule, enabled: false };
      mockAlertRuleService.getRuleById.mockResolvedValue(disabledRule);

      const result = await service.evaluateRule('rule_123', mockMetricData);

      expect(result.triggered).toBe(false);
      expect(result.message).toBe('规则已禁用');
      expect(mockRuleEvaluator.evaluateRule).not.toHaveBeenCalled();
    });

    it('should handle single rule evaluation errors', async () => {
      mockAlertRuleService.getRuleById.mockRejectedValue(new Error('Rule not found'));

      await expect(service.evaluateRule('rule_123', mockMetricData)).rejects.toThrow('Rule not found');
    });
  });

  describe('Evaluate Batch Rules', () => {
    it('should evaluate multiple rules', async () => {
      const ruleIds = ['rule_123', 'rule_456'];
      const rules = [mockRule, { ...mockRule, id: 'rule_456' }];
      const results = [mockEvaluationResult, { ...mockEvaluationResult, ruleId: 'rule_456' }];

      mockAlertRuleService.getRuleById
        .mockResolvedValueOnce(rules[0])
        .mockResolvedValueOnce(rules[1]);
      mockRuleEvaluator.evaluateRules.mockReturnValue(results);

      const batchResults = await service.evaluateRules(ruleIds, mockMetricData);

      expect(batchResults).toHaveLength(2);
      expect(batchResults[0].ruleId).toBe('rule_123');
      expect(batchResults[1].ruleId).toBe('rule_456');
    });

    it('should handle disabled rules in batch', async () => {
      const ruleIds = ['rule_123', 'rule_456'];
      const enabledRule = mockRule;
      const disabledRule = { ...mockRule, id: 'rule_456', enabled: false };

      mockAlertRuleService.getRuleById
        .mockResolvedValueOnce(enabledRule)
        .mockResolvedValueOnce(disabledRule);
      mockRuleEvaluator.evaluateRules.mockReturnValue([mockEvaluationResult]);

      const results = await service.evaluateRules(ruleIds, mockMetricData);

      expect(results).toHaveLength(2);
      expect(results[0].ruleId).toBe('rule_123');
      expect(results[1].ruleId).toBe('rule_456');
      expect(results[1].triggered).toBe(false);
      expect(results[1].message).toBe('规则已禁用');
    });

    it('should return skipped results when no enabled rules', async () => {
      const ruleIds = ['rule_123'];
      const disabledRule = { ...mockRule, enabled: false };

      mockAlertRuleService.getRuleById.mockResolvedValue(disabledRule);

      const results = await service.evaluateRules(ruleIds, mockMetricData);

      expect(results).toHaveLength(1);
      expect(results[0].triggered).toBe(false);
      expect(results[0].message).toBe('规则已禁用');
    });

    it('should handle batch evaluation errors', async () => {
      const ruleIds = ['rule_123'];
      mockAlertRuleService.getRuleById.mockRejectedValue(new Error('Database error'));

      await expect(service.evaluateRules(ruleIds, mockMetricData)).rejects.toThrow('Database error');
    });
  });

  describe('System Event Handling', () => {
    it('should handle system events', async () => {
      const systemEvent = {
        type: 'performance.high_cpu',
        value: 90,
        timestamp: new Date()
      };

      // Mock private method behavior
      jest.spyOn(service as any, 'convertEventToMetric').mockReturnValue({
        metric: 'cpu_usage',
        value: 90,
        timestamp: systemEvent.timestamp,
        tags: { source: 'system_event' }
      });

      const processMetricsSpy = jest.spyOn(service, 'processMetrics').mockResolvedValue(undefined);

      await service.handleSystemEvent(systemEvent);

      expect(processMetricsSpy).toHaveBeenCalledWith([expect.objectContaining({
        metric: 'cpu_usage',
        value: 90
      })]);
    });

    it('should handle null metric conversion gracefully', async () => {
      const systemEvent = { type: 'unknown.event' };

      jest.spyOn(service as any, 'convertEventToMetric').mockReturnValue(null);
      const processMetricsSpy = jest.spyOn(service, 'processMetrics');

      await service.handleSystemEvent(systemEvent);

      expect(processMetricsSpy).not.toHaveBeenCalled();
    });

    it('should handle system event errors gracefully', async () => {
      const systemEvent = { type: 'performance.high_cpu' };

      jest.spyOn(service as any, 'convertEventToMetric').mockImplementation(() => {
        throw new Error('Conversion error');
      });

      // Should not throw
      await expect(service.handleSystemEvent(systemEvent)).resolves.not.toThrow();
    });
  });

  describe('Scheduled Rule Evaluation', () => {
    it('should execute scheduled evaluation when interval elapsed', async () => {
      // Mock time to simulate interval elapsed
      jest.useFakeTimers();
      const now = new Date('2025-09-24T10:05:00Z');
      jest.setSystemTime(now);

      // Set last evaluation time to more than 60 seconds ago
      (service as any).lastEvaluationTime = new Date('2025-09-24T10:03:00Z');

      jest.spyOn(service as any, 'fetchRecentMetrics').mockResolvedValue(mockMetricData);
      const processMetricsSpy = jest.spyOn(service, 'processMetrics').mockResolvedValue(undefined);

      await service.scheduleRuleEvaluation();

      expect(processMetricsSpy).toHaveBeenCalledWith(mockMetricData);
      expect((service as any).lastEvaluationTime).toEqual(now);

      jest.useRealTimers();
    });

    it('should skip scheduled evaluation when interval not elapsed', async () => {
      jest.useFakeTimers();
      const now = new Date('2025-09-24T10:00:30Z');
      jest.setSystemTime(now);

      // Set last evaluation time to less than 60 seconds ago
      (service as any).lastEvaluationTime = new Date('2025-09-24T10:00:00Z');

      const processMetricsSpy = jest.spyOn(service, 'processMetrics');

      await service.scheduleRuleEvaluation();

      expect(processMetricsSpy).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should execute first scheduled evaluation', async () => {
      // No previous evaluation time
      (service as any).lastEvaluationTime = null;

      jest.spyOn(service as any, 'fetchRecentMetrics').mockResolvedValue(mockMetricData);
      const processMetricsSpy = jest.spyOn(service, 'processMetrics').mockResolvedValue(undefined);

      await service.scheduleRuleEvaluation();

      expect(processMetricsSpy).toHaveBeenCalled();
    });

    it('should handle scheduled evaluation errors', async () => {
      (service as any).lastEvaluationTime = null;
      jest.spyOn(service as any, 'fetchRecentMetrics').mockRejectedValue(new Error('Fetch error'));

      // Should not throw
      await expect(service.scheduleRuleEvaluation()).resolves.not.toThrow();

      const stats = service.getEvaluationStats();
      expect(stats.failedEvaluations).toBe(1);
      expect(stats.evaluationErrors).toBe(1);
    });

    it('should update evaluation statistics on success', async () => {
      (service as any).lastEvaluationTime = null;
      jest.spyOn(service as any, 'fetchRecentMetrics').mockResolvedValue([]);
      jest.spyOn(service, 'processMetrics').mockResolvedValue(undefined);

      await service.scheduleRuleEvaluation();

      const stats = service.getEvaluationStats();
      expect(stats.totalEvaluations).toBe(1);
      expect(stats.successfulEvaluations).toBe(1);
    });
  });

  describe('Force Evaluate All Rules', () => {
    it('should force evaluate all enabled rules', async () => {
      const rules = [mockRule, { ...mockRule, id: 'rule_456' }];
      const results = [mockEvaluationResult, { ...mockEvaluationResult, ruleId: 'rule_456' }];

      mockAlertRuleService.getEnabledRules.mockResolvedValue(rules);
      jest.spyOn(service as any, 'fetchRecentMetrics').mockResolvedValue(mockMetricData);
      mockRuleEvaluator.evaluateRules.mockReturnValue(results);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(null);
      mockAlertCacheService.isInCooldown.mockResolvedValue(false);
      mockAlertLifecycleService.createAlert.mockResolvedValue(undefined);

      const summary = await service.forceEvaluateAllRules();

      expect(summary.evaluatedCount).toBe(2);
      expect(summary.triggeredCount).toBe(2);
      expect(summary.errors).toHaveLength(0);
    });

    it('should collect errors during force evaluation', async () => {
      const rules = [mockRule];
      const results = [mockEvaluationResult];

      mockAlertRuleService.getEnabledRules.mockResolvedValue(rules);
      jest.spyOn(service as any, 'fetchRecentMetrics').mockResolvedValue(mockMetricData);
      mockRuleEvaluator.evaluateRules.mockReturnValue(results);
      mockAlertCacheService.getActiveAlert.mockResolvedValue(null);
      mockAlertCacheService.isInCooldown.mockResolvedValue(false);
      mockAlertLifecycleService.createAlert.mockRejectedValue(new Error('Create alert error'));

      const summary = await service.forceEvaluateAllRules();

      expect(summary.evaluatedCount).toBe(1);
      expect(summary.triggeredCount).toBe(1);
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0]).toContain('规则 rule_123: Create alert error');
    });

    it('should handle force evaluation service errors', async () => {
      mockAlertRuleService.getEnabledRules.mockRejectedValue(new Error('Service error'));

      await expect(service.forceEvaluateAllRules()).rejects.toThrow('Service error');
    });
  });

  describe('Private Helper Methods', () => {
    it('should handle evaluation result errors gracefully', async () => {
      const rules = [mockRule];
      mockAlertCacheService.getActiveAlert.mockRejectedValue(new Error('Cache error'));

      // Call private method through public interface
      await (service as any).handleEvaluationResult(mockEvaluationResult, rules);

      // Should not throw and should handle error gracefully
      expect(mockAlertLifecycleService.createAlert).not.toHaveBeenCalled();
    });

    it('should skip handling when rule not found', async () => {
      const rules = [{ ...mockRule, id: 'different_rule' }];

      await (service as any).handleEvaluationResult(mockEvaluationResult, rules);

      expect(mockAlertCacheService.getActiveAlert).not.toHaveBeenCalled();
    });

    it('should create skipped result correctly', () => {
      const result = (service as any).createSkippedResult(mockRule, 'Test reason');

      expect(result.ruleId).toBe('rule_123');
      expect(result.triggered).toBe(false);
      expect(result.message).toBe('Test reason');
      expect(result.value).toBe(0);
      expect(result.threshold).toBe(0);
      expect(result.evaluatedAt).toBeInstanceOf(Date);
    });
  });
});