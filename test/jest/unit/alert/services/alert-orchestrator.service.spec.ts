/**
 * AlertOrchestratorService 单元测试
 * 🎯 测试服务编排器的协调功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AlertOrchestratorService } from '@alert/services/alert-orchestrator.service';
import { AlertRuleService } from '@alert/services/alert-rule.service';
import { AlertEvaluationService } from '@alert/services/alert-evaluation.service';
import { AlertLifecycleService } from '@alert/services/alert-lifecycle.service';
import { AlertQueryService } from '@alert/services/alert-query.service';
import { AlertCacheService } from '@alert/services/alert-cache.service';
import { AlertEventPublisher } from '@alert/services/alert-event-publisher.service';
import { IAlert, IAlertRule, IAlertStats, IMetricData } from '@alert/interfaces';
import { AlertStatus } from '@alert/types/alert.types';

describe('AlertOrchestratorService', () => {
  let orchestrator: AlertOrchestratorService;
  let ruleService: jest.Mocked<AlertRuleService>;
  let evaluationService: jest.Mocked<AlertEvaluationService>;
  let lifecycleService: jest.Mocked<AlertLifecycleService>;
  let queryService: jest.Mocked<AlertQueryService>;
  let cacheService: jest.Mocked<AlertCacheService>;
  let eventPublisher: jest.Mocked<AlertEventPublisher>;

  const mockRule: IAlertRule = {
    id: 'rule_123',
    name: 'Test Rule',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 300,
    cooldown: 600,
    severity: 'warning',
    enabled: true,
    channels: [],
    tags: {},
  };

  const mockAlert: IAlert = {
    id: 'alert_123',
    ruleId: 'rule_123',
    ruleName: 'Test Rule',
    metric: 'cpu_usage',
    value: 85,
    threshold: 80,
    severity: 'warning',
    status: AlertStatus.FIRING,
    message: 'CPU usage exceeded threshold',
    startTime: new Date(),
    tags: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertOrchestratorService,
        {
          provide: AlertRuleService,
          useValue: {
            createRule: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
            getAllRules: jest.fn(),
            getRuleById: jest.fn(),
            toggleRule: jest.fn(),
            getRuleStats: jest.fn(),
          },
        },
        {
          provide: AlertEvaluationService,
          useValue: {
            processMetrics: jest.fn(),
            forceEvaluateAllRules: jest.fn(),
            evaluateRule: jest.fn(),
            getEvaluationStats: jest.fn(),
          },
        },
        {
          provide: AlertLifecycleService,
          useValue: {
            acknowledgeAlert: jest.fn(),
            resolveAlert: jest.fn(),
            suppressAlert: jest.fn(),
            escalateAlert: jest.fn(),
            batchUpdateAlertStatus: jest.fn(),
            getAlertById: jest.fn(),
            getLifecycleStats: jest.fn(),
          },
        },
        {
          provide: AlertQueryService,
          useValue: {
            queryAlerts: jest.fn(),
            getActiveAlerts: jest.fn(),
            getRecentAlerts: jest.fn(),
            getAlertsByRuleId: jest.fn(),
            searchAlerts: jest.fn(),
            getAlertStatistics: jest.fn(),
            getAlertTrend: jest.fn(),
            getQueryStats: jest.fn(),
          },
        },
        {
          provide: AlertCacheService,
          useValue: {
            setActiveAlert: jest.fn(),
            getActiveAlert: jest.fn(),
            clearActiveAlert: jest.fn(),
            getAllActiveAlerts: jest.fn(),
            clearCooldown: jest.fn(),
            updateTimeseriesAlertStatus: jest.fn(),
            cleanupTimeseriesData: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
        {
          provide: AlertEventPublisher,
          useValue: {
            publishAlertFiredEvent: jest.fn(),
            publishAlertResolvedEvent: jest.fn(),
            publishAlertAcknowledgedEvent: jest.fn(),
            getPublisherStats: jest.fn(),
          },
        },
      ],
    }).compile();

    orchestrator = module.get<AlertOrchestratorService>(AlertOrchestratorService);
    ruleService = module.get(AlertRuleService);
    evaluationService = module.get(AlertEvaluationService);
    lifecycleService = module.get(AlertLifecycleService);
    queryService = module.get(AlertQueryService);
    cacheService = module.get(AlertCacheService);
    eventPublisher = module.get(AlertEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('规则管理功能', () => {
    it('应该正确创建规则', async () => {
      ruleService.createRule.mockResolvedValue(mockRule);

      const result = await orchestrator.createRule({
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        cooldown: 600,
        severity: 'warning',
        enabled: true,
        channels: [],
        tags: {},
      });

      expect(result).toEqual(mockRule);
      expect(ruleService.createRule).toHaveBeenCalled();
    });

    it('删除规则时应该清理缓存', async () => {
      ruleService.deleteRule.mockResolvedValue(true);

      await orchestrator.deleteRule('rule_123');

      expect(cacheService.clearActiveAlert).toHaveBeenCalledWith('rule_123');
      expect(cacheService.clearCooldown).toHaveBeenCalledWith('rule_123');
      expect(ruleService.deleteRule).toHaveBeenCalledWith('rule_123');
    });

    it('禁用规则时应该清理缓存', async () => {
      ruleService.toggleRule.mockResolvedValue(true);

      await orchestrator.toggleRule('rule_123', false);

      expect(cacheService.clearActiveAlert).toHaveBeenCalledWith('rule_123');
      expect(cacheService.clearCooldown).toHaveBeenCalledWith('rule_123');
    });
  });

  describe('评估和处理功能', () => {
    it('应该正确处理指标数据', async () => {
      const metricData: IMetricData[] = [
        {
          metric: 'cpu_usage',
          value: 85,
          timestamp: new Date(),
          tags: {},
        },
      ];

      await orchestrator.processMetrics(metricData);

      expect(evaluationService.processMetrics).toHaveBeenCalledWith(metricData);
    });

    it('应该强制评估所有规则', async () => {
      const evaluationResult = {
        evaluatedCount: 10,
        triggeredCount: 3,
        errors: [],
      };
      evaluationService.forceEvaluateAllRules.mockResolvedValue(evaluationResult);

      const result = await orchestrator.forceEvaluateAllRules();

      expect(result).toEqual(evaluationResult);
      expect(evaluationService.forceEvaluateAllRules).toHaveBeenCalled();
    });
  });

  describe('告警生命周期管理', () => {
    it('确认告警时应该更新缓存', async () => {
      lifecycleService.acknowledgeAlert.mockResolvedValue(mockAlert);

      const result = await orchestrator.acknowledgeAlert('alert_123', 'user1', 'test comment');

      expect(result).toEqual(mockAlert);
      expect(cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(mockAlert);
    });

    it('解决告警时应该调用生命周期服务', async () => {
      lifecycleService.resolveAlert.mockResolvedValue(mockAlert);

      const result = await orchestrator.resolveAlert('alert_123', 'user1', 'rule_123', 'resolved');

      expect(result).toEqual(mockAlert);
      expect(lifecycleService.resolveAlert).toHaveBeenCalledWith(
        'alert_123',
        'user1',
        'rule_123',
        'resolved'
      );
    });
  });

  describe('查询功能', () => {
    it('获取活跃告警时优先从缓存获取', async () => {
      const cachedAlerts = [mockAlert];
      cacheService.getAllActiveAlerts.mockResolvedValue(cachedAlerts);

      const result = await orchestrator.getActiveAlerts();

      expect(result).toEqual(cachedAlerts);
      expect(cacheService.getAllActiveAlerts).toHaveBeenCalled();
      expect(queryService.getActiveAlerts).not.toHaveBeenCalled();
    });

    it('缓存为空时从查询服务获取', async () => {
      const alerts = [mockAlert];
      cacheService.getAllActiveAlerts.mockResolvedValue([]);
      queryService.getActiveAlerts.mockResolvedValue(alerts);

      const result = await orchestrator.getActiveAlerts();

      expect(result).toEqual(alerts);
      expect(queryService.getActiveAlerts).toHaveBeenCalled();
    });
  });

  describe('统计功能', () => {
    it('应该合并规则和告警统计', async () => {
      ruleService.getRuleStats.mockResolvedValue({
        totalRules: 10,
        enabledRules: 7,
        disabledRules: 3,
      });

      queryService.getAlertStatistics.mockResolvedValue({
        activeAlerts: 5,
        criticalAlerts: 2,
        warningAlerts: 3,
        infoAlerts: 0,
        totalAlertsToday: 15,
        resolvedAlertsToday: 10,
        averageResolutionTime: 30,
        statisticsTime: new Date(),
      });

      const result = await orchestrator.getStats();

      expect(result).toMatchObject({
        totalRules: 10,
        enabledRules: 7,
        activeAlerts: 5,
        criticalAlerts: 2,
        warningAlerts: 3,
        infoAlerts: 0,
        totalAlertsToday: 15,
        resolvedAlertsToday: 10,
        averageResolutionTime: 30,
      });
    });
  });

  describe('健康检查', () => {
    it('应该执行服务健康检查', async () => {
      ruleService.getRuleStats.mockResolvedValue({
        totalRules: 10,
        enabledRules: 7,
        disabledRules: 3,
      });
      queryService.getQueryStats.mockResolvedValue({
        totalQueries: 100,
        cacheHitRate: 0.9,
        averageQueryTime: 50,
        popularFilters: [],
      });
      cacheService.getCacheStats.mockResolvedValue({
        activeAlerts: 5,
        cooldownRules: 2,
        timeseriesKeys: 10,
        cacheHitRate: 0.85,
      });
      evaluationService.getEvaluationStats.mockResolvedValue({
        lastEvaluationTime: new Date(),
        totalEvaluations: 1000,
        successfulEvaluations: 990,
        failedEvaluations: 10,
      });
      lifecycleService.getLifecycleStats.mockResolvedValue({
        totalAlertsCreated: 100,
        totalAlertsResolved: 80,
        totalAlertsAcknowledged: 50,
        averageResolutionTime: 30,
      });
      eventPublisher.getPublisherStats.mockResolvedValue({
        totalEventsPublished: 500,
        eventTypeBreakdown: {},
        failedPublications: 5,
        lastPublishedAt: new Date(),
      });

      const result = await orchestrator.performHealthCheck();

      expect(result.status).toBeDefined();
      expect(result.services).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});