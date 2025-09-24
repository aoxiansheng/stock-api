/**
 * AlertOrchestratorService 测试套件
 * 🎯 测试主编排服务的所有功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AlertOrchestratorService } from '../../../../../src/alert/services/alert-orchestrator.service';
import { AlertRuleService } from '../../../../../src/alert/services/alert-rule.service';
import { AlertEvaluationService } from '../../../../../src/alert/services/alert-evaluation.service';
import { AlertLifecycleService } from '../../../../../src/alert/services/alert-lifecycle.service';
import { AlertQueryService } from '../../../../../src/alert/services/alert-query.service';
import { AlertCacheService } from '../../../../../src/alert/services/alert-cache.service';
import { AlertEventPublisher } from '../../../../../src/alert/services/alert-event-publisher.service';
import { ConfigService } from '@nestjs/config';

describe('AlertOrchestratorService', () => {
  let service: AlertOrchestratorService;
  let ruleService: AlertRuleService;
  let evaluationService: AlertEvaluationService;
  let lifecycleService: AlertLifecycleService;
  let queryService: AlertQueryService;
  let cacheService: AlertCacheService;
  let eventPublisher: AlertEventPublisher;

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
            createAlert: jest.fn(),
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
            getAlerts: jest.fn(),
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
            setCooldown: jest.fn(),
            isInCooldown: jest.fn(),
            clearCooldown: jest.fn(),
            batchCheckCooldown: jest.fn(),
            addToTimeseries: jest.fn(),
            getTimeseries: jest.fn(),
            updateTimeseriesAlertStatus: jest.fn(),
            cleanupTimeseriesData: jest.fn(),
          },
        },
        {
          provide: AlertEventPublisher,
          useValue: {
            publishAlertFiredEvent: jest.fn(),
            publishAlertResolvedEvent: jest.fn(),
            publishAlertAcknowledgedEvent: jest.fn(),
            publishAlertSuppressedEvent: jest.fn(),
            publishAlertEscalatedEvent: jest.fn(),
            getPublisherStats: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              evaluationInterval: 60,
              defaultCooldown: 300,
              batchSize: 100,
              evaluationTimeout: 5000,
              maxRetries: 3,
              validation: {
                duration: { min: 30, max: 600 },
                cooldown: { max: 3000 },
              },
              cache: {
                cooldownPrefix: 'alert:cooldown:',
                activeAlertPrefix: 'alert:active',
              },
            }),
          },
        },
        {
          provide: 'alertCacheConfig',
          useValue: {
            batchSize: 100,
            maxBatchProcessing: 1000,
            largeBatchSize: 1000,
            maxActiveAlerts: 10000,
          },
        },
      ],
    }).compile();

    service = module.get<AlertOrchestratorService>(AlertOrchestratorService);
    ruleService = module.get<AlertRuleService>(AlertRuleService);
    evaluationService = module.get<AlertEvaluationService>(AlertEvaluationService);
    lifecycleService = module.get<AlertLifecycleService>(AlertLifecycleService);
    queryService = module.get<AlertQueryService>(AlertQueryService);
    cacheService = module.get<AlertCacheService>(AlertCacheService);
    eventPublisher = module.get<AlertEventPublisher>(AlertEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('规则管理接口', () => {
    it('should create a rule', async () => {
      const createRuleDto: any = { name: 'test-rule' };
      const expectedResult = { id: '1', ...createRuleDto };
      (ruleService.createRule as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.createRule(createRuleDto);

      expect(ruleService.createRule).toHaveBeenCalledWith(createRuleDto);
      expect(result).toEqual(expectedResult);
    });

    it('should update a rule', async () => {
      const ruleId = '1';
      const updateRuleDto: any = { name: 'updated-rule' };
      const expectedResult = { id: ruleId, ...updateRuleDto };
      (ruleService.updateRule as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.updateRule(ruleId, updateRuleDto);

      expect(ruleService.updateRule).toHaveBeenCalledWith(ruleId, updateRuleDto);
      expect(result).toEqual(expectedResult);
    });

    it('should delete a rule and clear cache', async () => {
      const ruleId = '1';
      (ruleService.deleteRule as jest.Mock).mockResolvedValue(true);

      await service.deleteRule(ruleId);

      expect(ruleService.deleteRule).toHaveBeenCalledWith(ruleId);
      expect(cacheService.clearActiveAlert).toHaveBeenCalledWith(ruleId);
      expect(cacheService.clearCooldown).toHaveBeenCalledWith(ruleId);
    });

    it('should get all rules', async () => {
      const expectedResult = [{ id: '1', name: 'rule-1' }];
      (ruleService.getAllRules as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getRules();

      expect(ruleService.getAllRules).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should get rule by id', async () => {
      const ruleId = '1';
      const expectedResult = { id: ruleId, name: 'test-rule' };
      (ruleService.getRuleById as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getRuleById(ruleId);

      expect(ruleService.getRuleById).toHaveBeenCalledWith(ruleId);
      expect(result).toEqual(expectedResult);
    });

    it('should toggle rule and clear cache when disabling', async () => {
      const ruleId = '1';
      const enabled = false;
      (ruleService.toggleRule as jest.Mock).mockResolvedValue(true);

      const result = await service.toggleRule(ruleId, enabled);

      expect(ruleService.toggleRule).toHaveBeenCalledWith(ruleId, enabled);
      expect(cacheService.clearActiveAlert).toHaveBeenCalledWith(ruleId);
      expect(cacheService.clearCooldown).toHaveBeenCalledWith(ruleId);
      expect(result).toBe(true);
    });
  });

  describe('评估和处理接口', () => {
    it('should process metrics', async () => {
      const metricData: any = [{ metric: 'cpu_usage', value: 80 }];
      (evaluationService.processMetrics as jest.Mock).mockResolvedValue(undefined);

      await service.processMetrics(metricData);

      expect(evaluationService.processMetrics).toHaveBeenCalledWith(metricData);
    });

    it('should force evaluate all rules', async () => {
      const expectedResult = { evaluatedCount: 5, triggeredCount: 2, errors: [] };
      (evaluationService.forceEvaluateAllRules as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.forceEvaluateAllRules();

      expect(evaluationService.forceEvaluateAllRules).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should evaluate all rules with metrics', async () => {
      const metricData: any = [{ metric: 'cpu_usage', value: 80 }];
      (service.processMetrics as jest.Mock).mockResolvedValue(undefined);

      await service.evaluateAllRules(metricData);

      expect(service.processMetrics).toHaveBeenCalledWith(metricData);
    });

    it('should force evaluate all rules when no metrics provided', async () => {
      (service.forceEvaluateAllRules as jest.Mock).mockResolvedValue(undefined);

      await service.evaluateAllRules();

      expect(service.forceEvaluateAllRules).toHaveBeenCalled();
    });

    it('should evaluate a specific rule', async () => {
      const ruleId = '1';
      const metricData: any = [{ metric: 'cpu_usage', value: 80 }];
      const expectedResult: any = { ruleId, triggered: true };
      (evaluationService.evaluateRule as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.evaluateRule(ruleId, metricData);

      expect(evaluationService.evaluateRule).toHaveBeenCalledWith(ruleId, metricData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('告警生命周期接口', () => {
    it('should acknowledge an alert and update cache', async () => {
      const alertId = '1';
      const acknowledgedBy = 'user1';
      const comment = 'Test comment';
      const expectedResult: any = { id: alertId, status: 'acknowledged' };
      (lifecycleService.acknowledgeAlert as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.acknowledgeAlert(alertId, acknowledgedBy, comment);

      expect(lifecycleService.acknowledgeAlert).toHaveBeenCalledWith(alertId, acknowledgedBy, comment);
      expect(cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(expectedResult);
      expect(result).toEqual(expectedResult);
    });

    it('should resolve an alert', async () => {
      const alertId = '1';
      const resolvedBy = 'user1';
      const ruleId = 'rule-1';
      const comment = 'Test comment';
      const expectedResult: any = { id: alertId, status: 'resolved' };
      (lifecycleService.resolveAlert as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.resolveAlert(alertId, resolvedBy, ruleId, comment);

      expect(lifecycleService.resolveAlert).toHaveBeenCalledWith(alertId, resolvedBy, ruleId, comment);
      expect(result).toEqual(expectedResult);
    });

    it('should suppress an alert and update cache', async () => {
      const alertId = '1';
      const suppressedBy = 'user1';
      const suppressionDuration = 300;
      const reason = 'Test reason';
      const expectedResult: any = { id: alertId, status: 'suppressed' };
      (lifecycleService.suppressAlert as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.suppressAlert(alertId, suppressedBy, suppressionDuration, reason);

      expect(lifecycleService.suppressAlert).toHaveBeenCalledWith(alertId, suppressedBy, suppressionDuration, reason);
      expect(cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(expectedResult);
      expect(result).toEqual(expectedResult);
    });

    it('should escalate an alert and update cache', async () => {
      const alertId = '1';
      const newSeverity = 'critical';
      const escalatedBy = 'user1';
      const reason = 'Test reason';
      const expectedResult: any = { id: alertId, severity: 'critical' };
      (lifecycleService.escalateAlert as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.escalateAlert(alertId, newSeverity, escalatedBy, reason);

      expect(lifecycleService.escalateAlert).toHaveBeenCalledWith(alertId, newSeverity, escalatedBy, reason);
      expect(cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(expectedResult);
      expect(result).toEqual(expectedResult);
    });

    it('should batch update alert status', async () => {
      const alertIds = ['1', '2', '3'];
      const status: any = 'acknowledged';
      const updatedBy = 'user1';
      const expectedResult = { successCount: 3, failedCount: 0, errors: [] };
      (lifecycleService.batchUpdateAlertStatus as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.batchUpdateAlertStatus(alertIds, status, updatedBy);

      expect(lifecycleService.batchUpdateAlertStatus).toHaveBeenCalledWith(alertIds, status, updatedBy);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('查询接口', () => {
    it('should query alerts', async () => {
      const query: any = { ruleId: '1' };
      const expectedResult = { alerts: [], total: 0 };
      (queryService.queryAlerts as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.queryAlerts(query);

      expect(queryService.queryAlerts).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should get active alerts from cache when available', async () => {
      const cachedAlerts: any = [{ id: '1', status: 'firing' }];
      (cacheService.getAllActiveAlerts as jest.Mock).mockResolvedValue(cachedAlerts);

      const result = await service.getActiveAlerts();

      expect(cacheService.getAllActiveAlerts).toHaveBeenCalled();
      expect(result).toEqual(cachedAlerts);
    });

    it('should get active alerts from query service when cache is empty', async () => {
      const cachedAlerts: any = [];
      const queryAlerts: any = [{ id: '1', status: 'firing' }];
      (cacheService.getAllActiveAlerts as jest.Mock).mockResolvedValue(cachedAlerts);
      (queryService.getActiveAlerts as jest.Mock).mockResolvedValue(queryAlerts);

      const result = await service.getActiveAlerts();

      expect(cacheService.getAllActiveAlerts).toHaveBeenCalled();
      expect(queryService.getActiveAlerts).toHaveBeenCalled();
      expect(result).toEqual(queryAlerts);
    });

    it('should get recent alerts', async () => {
      const limit = 10;
      const expectedResult: any = [{ id: '1' }];
      (queryService.getRecentAlerts as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getRecentAlerts(limit);

      expect(queryService.getRecentAlerts).toHaveBeenCalledWith(limit);
      expect(result).toEqual(expectedResult);
    });

    it('should get alerts by rule id', async () => {
      const ruleId = '1';
      const limit = 10;
      const expectedResult: any = [{ id: '1', ruleId }];
      (queryService.getAlertsByRuleId as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getAlertsByRuleId(ruleId, limit);

      expect(queryService.getAlertsByRuleId).toHaveBeenCalledWith(ruleId, limit);
      expect(result).toEqual(expectedResult);
    });

    it('should search alerts', async () => {
      const keyword = 'test';
      const filters: any = { severity: 'warning' };
      const limit = 10;
      const expectedResult: any = [{ id: '1', message: 'test alert' }];
      (queryService.searchAlerts as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.searchAlerts(keyword, filters, limit);

      expect(queryService.searchAlerts).toHaveBeenCalledWith(keyword, filters, limit);
      expect(result).toEqual(expectedResult);
    });

    it('should get alert by id', async () => {
      const alertId = '1';
      const expectedResult: any = [{ id: alertId }];
      (queryService.getAlerts as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getAlertById(alertId);

      expect(queryService.getAlerts).toHaveBeenCalledWith({ alertId });
      expect(result).toEqual(expectedResult[0]);
    });
  });

  describe('统计接口', () => {
    it('should get stats', async () => {
      const ruleStats = { totalRules: 5, enabledRules: 3 };
      const alertStats = { 
        activeAlerts: 2, 
        criticalAlerts: 1, 
        warningAlerts: 1, 
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 120
      };
      (ruleService.getRuleStats as jest.Mock).mockResolvedValue(ruleStats);
      (queryService.getAlertStatistics as jest.Mock).mockResolvedValue(alertStats);

      const result = await service.getStats();

      expect(ruleService.getRuleStats).toHaveBeenCalled();
      expect(queryService.getAlertStatistics).toHaveBeenCalled();
      expect(result).toEqual({
        totalRules: ruleStats.totalRules,
        enabledRules: ruleStats.enabledRules,
        activeAlerts: alertStats.activeAlerts,
        criticalAlerts: alertStats.criticalAlerts,
        warningAlerts: alertStats.warningAlerts,
        infoAlerts: alertStats.infoAlerts,
        totalAlertsToday: alertStats.totalAlertsToday,
        resolvedAlertsToday: alertStats.resolvedAlertsToday,
        averageResolutionTime: alertStats.averageResolutionTime,
      });
    });

    it('should get alert trend', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-07');
      const interval = 'day';
      const expectedResult: any = [{ time: '2023-01-01', count: 5, resolved: 3 }];
      (queryService.getAlertTrend as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getAlertTrend(startDate, endDate, interval);

      expect(queryService.getAlertTrend).toHaveBeenCalledWith(startDate, endDate, interval);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('缓存管理接口', () => {
    it('should cleanup expired data', async () => {
      const daysToKeep = 7;
      const timeseriesResult = { cleanedKeys: 5, errors: [] };
      (cacheService.cleanupTimeseriesData as jest.Mock).mockResolvedValue(timeseriesResult);

      const result = await service.cleanupExpiredData(daysToKeep);

      expect(cacheService.cleanupTimeseriesData).toHaveBeenCalledWith(daysToKeep);
      expect(result).toEqual({ timeseriesCleanup: timeseriesResult });
    });
  });

  describe('健康检查和监控', () => {
    it('should perform health check', async () => {
      const ruleStats = { totalRules: 5, enabledRules: 3 };
      const queryStats = { totalQueries: 100 };
      const evaluationStats = { totalEvaluations: 50 };
      const lifecycleStats = { totalAlertsCreated: 10 };
      const publisherStats = { totalEventsPublished: 20 };
      
      (ruleService.getRuleStats as jest.Mock).mockResolvedValue(ruleStats);
      (queryService.getQueryStats as jest.Mock).mockResolvedValue(queryStats);
      (evaluationService.getEvaluationStats as jest.Mock).mockResolvedValue(evaluationStats);
      (lifecycleService.getLifecycleStats as jest.Mock).mockResolvedValue(lifecycleStats);
      (eventPublisher.getPublisherStats as jest.Mock).mockResolvedValue(publisherStats);

      const result = await service.performHealthCheck();

      expect(ruleService.getRuleStats).toHaveBeenCalled();
      expect(queryService.getQueryStats).toHaveBeenCalled();
      expect(evaluationService.getEvaluationStats).toHaveBeenCalled();
      expect(lifecycleService.getLifecycleStats).toHaveBeenCalled();
      expect(eventPublisher.getPublisherStats).toHaveBeenCalled();
      expect(result.status).toBe('healthy');
      expect(result.services).toBeDefined();
    });

    it('should get service overview', async () => {
      const ruleStats = { totalRules: 5, enabledRules: 3, disabledRules: 2 };
      const alertStats = { 
        activeAlerts: 2, 
        resolvedAlertsToday: 3, 
        acknowledged: 0,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        averageResolutionTime: 120
      };
      const evaluationStats = { lastEvaluationTime: new Date(), averageResponseTime: 50 };

      (ruleService.getRuleStats as jest.Mock).mockResolvedValue(ruleStats);
      (queryService.getAlertStatistics as jest.Mock).mockResolvedValue(alertStats);
      (evaluationService.getEvaluationStats as jest.Mock).mockResolvedValue(evaluationStats);

      const result = await service.getServiceOverview();

      expect(ruleService.getRuleStats).toHaveBeenCalled();
      expect(queryService.getAlertStatistics).toHaveBeenCalled();
      expect(evaluationService.getEvaluationStats).toHaveBeenCalled();
      expect(result).toEqual({
        rules: {
          total: ruleStats.totalRules,
          enabled: ruleStats.enabledRules,
          disabled: ruleStats.disabledRules,
        },
        alerts: {
          active: alertStats.activeAlerts,
          resolved: alertStats.resolvedAlertsToday,
          acknowledged: 0,
        },
        performance: {
          lastEvaluation: evaluationStats.lastEvaluationTime,
          averageResponseTime: 0,
        },
      });
    });
  });
});