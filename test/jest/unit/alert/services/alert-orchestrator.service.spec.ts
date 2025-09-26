import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertOrchestratorService } from '@alert/services/alert-orchestrator.service';
import { AlertRuleService } from '@alert/services/alert-rule.service';
import { AlertEvaluationService } from '@alert/services/alert-evaluation.service';
import { AlertLifecycleService } from '@alert/services/alert-lifecycle.service';
import { AlertQueryService } from '@alert/services/alert-query.service';
import { AlertCacheService } from '@alert/services/alert-cache.service';
import { AlertEventPublisher } from '@alert/services/alert-event-publisher.service';
import alertCacheConfig from '@alert/config/alert-cache.config';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '@alert/dto/alert-rule.dto';
import { IAlert, IAlertRule, IAlertQuery, IAlertStats } from '@alert/interfaces/alert.interface';
import { IMetricData } from '@alert/interfaces/rule-engine.interface';
import { AlertStatus, NotificationChannel } from '@alert/types/alert.types';
import { UniversalExceptionFactory } from '@common/core/exceptions';

describe('AlertOrchestratorService', () => {
  let service: AlertOrchestratorService;
  let mockServices: any;

  const mockAlertCacheLimits = {
    batchSize: 100,
    ttl: 300,
    maxMemory: 1000
  };

  beforeEach(async () => {
    mockServices = {
      ruleService: {
        createRule: jest.fn(),
        updateRule: jest.fn(),
        deleteRule: jest.fn().mockResolvedValue(true),
        getAllRules: jest.fn().mockResolvedValue([]),
        getRuleById: jest.fn(),
        toggleRule: jest.fn(),
        getRuleStats: jest.fn().mockResolvedValue({ totalRules: 0, enabledRules: 0, disabledRules: 0 })
      },
      evaluationService: {
        processMetrics: jest.fn(),
        forceEvaluateAllRules: jest.fn().mockResolvedValue({ evaluatedCount: 0, triggeredCount: 0, errors: [] }),
        evaluateRule: jest.fn(),
        getEvaluationStats: jest.fn().mockResolvedValue({
          totalEvaluations: 0,
          triggeredRules: 0,
          failedEvaluations: 0,
          averageEvaluationTime: 0,
          lastEvaluationTime: null,
          evaluationRate: 0,
          successRate: 1
        })
      },
      lifecycleService: {
        acknowledgeAlert: jest.fn(),
        resolveAlert: jest.fn(),
        suppressAlert: jest.fn(),
        escalateAlert: jest.fn(),
        batchUpdateAlertStatus: jest.fn(),
        getLifecycleStats: jest.fn().mockResolvedValue({})
      },
      queryService: {
        queryAlerts: jest.fn(),
        getActiveAlerts: jest.fn().mockResolvedValue([]),
        getRecentAlerts: jest.fn().mockResolvedValue([]),
        getAlertsByRuleId: jest.fn().mockResolvedValue([]),
        searchAlerts: jest.fn().mockResolvedValue([]),
        getAlerts: jest.fn().mockResolvedValue([]),
        getAlertStatistics: jest.fn().mockResolvedValue({
          activeAlerts: 0,
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0
        }),
        getAlertTrend: jest.fn().mockResolvedValue([]),
        getQueryStats: jest.fn().mockResolvedValue({
          totalQueries: 0,
          cachedQueries: 0,
          averageResponseTime: 0,
          cacheHitRate: 0
        })
      },
      cacheService: {
        clearActiveAlert: jest.fn(),
        clearCooldown: jest.fn(),
        getAllActiveAlerts: jest.fn().mockResolvedValue([]),
        updateTimeseriesAlertStatus: jest.fn(),
        cleanupTimeseriesData: jest.fn().mockResolvedValue({ cleanedKeys: 0, errors: [] })
      },
      eventPublisher: {
        getPublisherStats: jest.fn().mockResolvedValue({})
      },
      configService: {
        get: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertOrchestratorService,
        { provide: AlertRuleService, useValue: mockServices.ruleService },
        { provide: AlertEvaluationService, useValue: mockServices.evaluationService },
        { provide: AlertLifecycleService, useValue: mockServices.lifecycleService },
        { provide: AlertQueryService, useValue: mockServices.queryService },
        { provide: AlertCacheService, useValue: mockServices.cacheService },
        { provide: AlertEventPublisher, useValue: mockServices.eventPublisher },
        { provide: ConfigService, useValue: mockServices.configService },
        {
          provide: 'CONFIGURATION(alertCache)',
          useValue: mockAlertCacheLimits
        }
      ],
    }).compile();

    service = module.get<AlertOrchestratorService>(AlertOrchestratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize module successfully', async () => {
      const healthCheckSpy = jest.spyOn(service, 'performHealthCheck').mockResolvedValue({
        status: 'healthy',
        services: {},
        timestamp: new Date()
      });

      await service.onModuleInit();

      expect(healthCheckSpy).toHaveBeenCalled();
    });
  });

  describe('Rule Management', () => {
    it('should create rule', async () => {
      const createDto: CreateAlertRuleDto = {
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'critical',
        enabled: true,
        channels: [],
        cooldown: 600
      };
      const expectedRule: IAlertRule = {
        id: '1',
        name: createDto.name,
        metric: createDto.metric,
        operator: createDto.operator,
        threshold: createDto.threshold,
        duration: createDto.duration,
        severity: createDto.severity,
        enabled: createDto.enabled,
        channels: createDto.channels.map(c => ({
          name: c.name,
          type: c.type as any,
          config: c.config,
          enabled: c.enabled
        })) as NotificationChannel[],
        cooldown: createDto.cooldown,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockServices.ruleService.createRule.mockResolvedValue(expectedRule);

      const result = await service.createRule(createDto);

      expect(mockServices.ruleService.createRule).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedRule);
    });

    it('should update rule', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const updateDto: UpdateAlertRuleDto = { name: 'Updated Rule' };
      const expectedRule: IAlertRule = {
        id: ruleId,
        name: 'Updated Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'critical',
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockServices.ruleService.updateRule.mockResolvedValue(expectedRule);

      const result = await service.updateRule(ruleId, updateDto);

      expect(mockServices.ruleService.updateRule).toHaveBeenCalledWith(ruleId, updateDto);
      expect(result).toEqual(expectedRule);
    });

    it('should get all rules', async () => {
      const rules: IAlertRule[] = [{ 
        id: '1', 
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'critical',
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      mockServices.ruleService.getAllRules.mockResolvedValue(rules);

      const result = await service.getRules();

      expect(mockServices.ruleService.getAllRules).toHaveBeenCalled();
      expect(result).toEqual(rules);
    });

    it('should get rule by id', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const expectedRule: IAlertRule = {
        id: ruleId,
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'critical',
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockServices.ruleService.getRuleById.mockResolvedValue(expectedRule);

      const result = await service.getRuleById(ruleId);

      expect(mockServices.ruleService.getRuleById).toHaveBeenCalledWith(ruleId);
      expect(result).toEqual(expectedRule);
    });

    it('should toggle rule', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const enabled = false;

      mockServices.ruleService.toggleRule.mockResolvedValue(true);

      const result = await service.toggleRule(ruleId, enabled);

      expect(mockServices.ruleService.toggleRule).toHaveBeenCalledWith(ruleId, enabled);
      expect(result).toBe(true);
    });

    it('should delete rule and clear cache', async () => {
      const ruleId = '507f1f77bcf86cd799439011';

      await service.deleteRule(ruleId);

      expect(mockServices.cacheService.clearActiveAlert).toHaveBeenCalledWith(ruleId);
      expect(mockServices.cacheService.clearCooldown).toHaveBeenCalledWith(ruleId);
      expect(mockServices.ruleService.deleteRule).toHaveBeenCalledWith(ruleId);
    });

    it('should throw exception when delete rule fails', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      mockServices.ruleService.deleteRule.mockResolvedValue(false);

      await expect(service.deleteRule(ruleId)).rejects.toThrow();

      expect(mockServices.cacheService.clearActiveAlert).toHaveBeenCalledWith(ruleId);
      expect(mockServices.cacheService.clearCooldown).toHaveBeenCalledWith(ruleId);
      expect(mockServices.ruleService.deleteRule).toHaveBeenCalledWith(ruleId);
    });
  });

  describe('Evaluation Operations', () => {
    it('should process metrics', async () => {
      const metrics: IMetricData[] = [{ metric: 'cpu_usage', value: 85, timestamp: new Date() }];

      await service.processMetrics(metrics);

      expect(mockServices.evaluationService.processMetrics).toHaveBeenCalledWith(metrics);
    });

    it('should force evaluate all rules', async () => {
      const evaluationResult = { evaluatedCount: 5, triggeredCount: 2, errors: [] };
      mockServices.evaluationService.forceEvaluateAllRules.mockResolvedValue(evaluationResult);

      const result = await service.forceEvaluateAllRules();

      expect(mockServices.evaluationService.forceEvaluateAllRules).toHaveBeenCalled();
      expect(result).toEqual(evaluationResult);
    });

    it('should evaluate all rules with metric data', async () => {
      const metrics: IMetricData[] = [{ metric: 'cpu_usage', value: 85, timestamp: new Date() }];

      await service.evaluateAllRules(metrics);

      expect(mockServices.evaluationService.processMetrics).toHaveBeenCalledWith(metrics);
    });

    it('should evaluate all rules without metric data', async () => {
      await service.evaluateAllRules([]);

      expect(mockServices.evaluationService.forceEvaluateAllRules).toHaveBeenCalled();
    });

    it('should evaluate single rule', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const metrics: IMetricData[] = [{ metric: 'cpu_usage', value: 85, timestamp: new Date() }];

      await service.evaluateRule(ruleId, metrics);

      expect(mockServices.evaluationService.evaluateRule).toHaveBeenCalledWith(ruleId, metrics);
    });
  });

  describe('Alert Lifecycle Operations', () => {
    it('should acknowledge alert', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const acknowledgedBy = 'test-user';
      const comment = 'Test comment';
      const expectedAlert: IAlert = {
        id: alertId,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.ACKNOWLEDGED,
        message: 'CPU usage is high',
        startTime: new Date(),
        acknowledgedBy,
        acknowledgedAt: new Date()
      };

      mockServices.lifecycleService.acknowledgeAlert.mockResolvedValue(expectedAlert);

      const result = await service.acknowledgeAlert(alertId, acknowledgedBy, comment);

      expect(mockServices.lifecycleService.acknowledgeAlert).toHaveBeenCalledWith(alertId, acknowledgedBy, comment);
      expect(mockServices.cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(expectedAlert);
      expect(result).toEqual(expectedAlert);
    });

    it('should resolve alert', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const resolvedBy = 'test-user';
      const ruleId = '507f1f77bcf86cd799439011';
      const comment = 'Test comment';
      const expectedAlert: IAlert = {
        id: alertId,
        ruleId,
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.RESOLVED,
        message: 'CPU usage is high',
        startTime: new Date(),
        resolvedBy,
        resolvedAt: new Date()
      };

      mockServices.lifecycleService.resolveAlert.mockResolvedValue(expectedAlert);

      const result = await service.resolveAlert(alertId, resolvedBy, ruleId, comment);

      expect(mockServices.lifecycleService.resolveAlert).toHaveBeenCalledWith(alertId, resolvedBy, ruleId, comment);
      expect(result).toEqual(expectedAlert);
    });

    it('should suppress alert', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const suppressedBy = 'test-user';
      const suppressionDuration = 3600;
      const reason = 'Test reason';
      const expectedAlert: IAlert = {
        id: alertId,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.SUPPRESSED,
        message: 'CPU usage is high',
        startTime: new Date(),
        acknowledgedBy: suppressedBy,
        acknowledgedAt: new Date()
      };

      mockServices.lifecycleService.suppressAlert.mockResolvedValue(expectedAlert);

      const result = await service.suppressAlert(alertId, suppressedBy, suppressionDuration, reason);

      expect(mockServices.lifecycleService.suppressAlert).toHaveBeenCalledWith(alertId, suppressedBy, suppressionDuration, reason);
      expect(mockServices.cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(expectedAlert);
      expect(result).toEqual(expectedAlert);
    });

    it('should escalate alert', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const newSeverity = 'critical';
      const escalatedBy = 'test-user';
      const reason = 'Test reason';
      const expectedAlert: IAlert = {
        id: alertId,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      };

      mockServices.lifecycleService.escalateAlert.mockResolvedValue(expectedAlert);

      const result = await service.escalateAlert(alertId, newSeverity, escalatedBy, reason);

      expect(mockServices.lifecycleService.escalateAlert).toHaveBeenCalledWith(alertId, newSeverity, escalatedBy, reason);
      expect(mockServices.cacheService.updateTimeseriesAlertStatus).toHaveBeenCalledWith(expectedAlert);
      expect(result).toEqual(expectedAlert);
    });

    it('should batch update alert status', async () => {
      const alertIds = ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'test-user';
      const expectedResult = { successCount: 2, failedCount: 0, errors: [] };

      mockServices.lifecycleService.batchUpdateAlertStatus.mockResolvedValue(expectedResult);

      const result = await service.batchUpdateAlertStatus(alertIds, status, updatedBy);

      expect(mockServices.lifecycleService.batchUpdateAlertStatus).toHaveBeenCalledWith(alertIds, status, updatedBy);
      expect(result).toEqual(expectedResult);
    });

    it('should throw exception when batch size exceeds limit', async () => {
      const alertIds = Array(150).fill('507f1f77bcf86cd799439012');
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'test-user';

      await expect(service.batchUpdateAlertStatus(alertIds, status, updatedBy)).rejects.toThrow();
    });
  });

  describe('Query Operations', () => {
    it('should query alerts', async () => {
      const query: IAlertQuery = { severity: 'critical' };
      const alerts: IAlert[] = [{ 
        id: '1', 
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      }];
      mockServices.queryService.queryAlerts.mockResolvedValue(alerts);

      const result = await service.queryAlerts(query);

      expect(mockServices.queryService.queryAlerts).toHaveBeenCalledWith(query);
      expect(result).toEqual(alerts);
    });

    it('should get active alerts from cache', async () => {
      const alerts: IAlert[] = [{ 
        id: '1', 
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      }];
      mockServices.cacheService.getAllActiveAlerts.mockResolvedValue(alerts);

      const result = await service.getActiveAlerts();

      expect(mockServices.cacheService.getAllActiveAlerts).toHaveBeenCalled();
      expect(result).toEqual(alerts);
    });

    it('should get active alerts from query service when cache is empty', async () => {
      const alerts: IAlert[] = [{ 
        id: '1', 
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      }];
      mockServices.cacheService.getAllActiveAlerts.mockResolvedValue([]);
      mockServices.queryService.getActiveAlerts.mockResolvedValue(alerts);

      const result = await service.getActiveAlerts();

      expect(mockServices.cacheService.getAllActiveAlerts).toHaveBeenCalled();
      expect(mockServices.queryService.getActiveAlerts).toHaveBeenCalled();
      expect(result).toEqual(alerts);
    });

    it('should get recent alerts', async () => {
      const alerts: IAlert[] = [{ 
        id: '1', 
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      }];
      mockServices.queryService.getRecentAlerts.mockResolvedValue(alerts);

      const result = await service.getRecentAlerts(10);

      expect(mockServices.queryService.getRecentAlerts).toHaveBeenCalledWith(10);
      expect(result).toEqual(alerts);
    });

    it('should get alerts by rule id', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const alerts: IAlert[] = [{ 
        id: '1', 
        ruleId,
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      }];
      mockServices.queryService.getAlertsByRuleId.mockResolvedValue(alerts);

      const result = await service.getAlertsByRuleId(ruleId, 10);

      expect(mockServices.queryService.getAlertsByRuleId).toHaveBeenCalledWith(ruleId, 10);
      expect(result).toEqual(alerts);
    });

    it('should search alerts', async () => {
      const keyword = 'cpu';
      const filters: Partial<IAlertQuery> = { severity: 'critical' };
      const alerts: IAlert[] = [{ 
        id: '1', 
        ruleId: 'rule-1',
        ruleName: 'CPU Usage Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      }];
      mockServices.queryService.searchAlerts.mockResolvedValue(alerts);

      const result = await service.searchAlerts(keyword, filters, 10);

      expect(mockServices.queryService.searchAlerts).toHaveBeenCalledWith(keyword, filters, 10);
      expect(result).toEqual(alerts);
    });

    it('should get alert by id', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const expectedAlert: IAlert = {
        id: alertId,
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: 'critical',
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date()
      };

      mockServices.queryService.getAlerts.mockResolvedValue([expectedAlert]);

      const result = await service.getAlertById(alertId);

      expect(mockServices.queryService.getAlerts).toHaveBeenCalledWith({ alertId });
      expect(result).toEqual(expectedAlert);
    });

    it('should throw exception when alert not found by id', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      mockServices.queryService.getAlerts.mockResolvedValue([]);

      await expect(service.getAlertById(alertId)).rejects.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should get comprehensive stats', async () => {
      const ruleStats = { totalRules: 10, enabledRules: 8, disabledRules: 2 };
      const alertStats = {
        activeAlerts: 3,
        criticalAlerts: 1,
        warningAlerts: 2,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 2,
        averageResolutionTime: 300
      };

      mockServices.ruleService.getRuleStats.mockResolvedValue(ruleStats);
      mockServices.queryService.getAlertStatistics.mockResolvedValue(alertStats);

      const result: IAlertStats = await service.getStats();

      expect(mockServices.ruleService.getRuleStats).toHaveBeenCalled();
      expect(mockServices.queryService.getAlertStatistics).toHaveBeenCalled();
      expect(result.totalRules).toBe(10);
      expect(result.enabledRules).toBe(8);
      expect(result.activeAlerts).toBe(3);
      expect(result.criticalAlerts).toBe(1);
      expect(result.warningAlerts).toBe(2);
      expect(result.infoAlerts).toBe(0);
      expect(result.totalAlertsToday).toBe(5);
      expect(result.resolvedAlertsToday).toBe(2);
      expect(result.averageResolutionTime).toBe(300);
    });

    it('should get alert trend', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-07');
      const interval = 'day';
      const trendData = [
        { date: '2023-01-01', count: 5 },
        { date: '2023-01-02', count: 3 }
      ];

      mockServices.queryService.getAlertTrend.mockResolvedValue(trendData);

      const result = await service.getAlertTrend(startDate, endDate, interval);

      expect(mockServices.queryService.getAlertTrend).toHaveBeenCalledWith(startDate, endDate, interval);
      expect(result).toEqual(trendData);
    });

    it('should get service overview', async () => {
      const ruleStats = { totalRules: 10, enabledRules: 8, disabledRules: 2 };
      const alertStats = {
        activeAlerts: 3,
        criticalAlerts: 1,
        warningAlerts: 2,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 2,
        averageResolutionTime: 300
      };
      const evaluationStats = {
        totalEvaluations: 100,
        triggeredRules: 5,
        failedEvaluations: 2,
        averageEvaluationTime: 50,
        lastEvaluationTime: new Date(),
        evaluationRate: 10,
        successRate: 0.98
      };

      mockServices.ruleService.getRuleStats.mockResolvedValue(ruleStats);
      mockServices.queryService.getAlertStatistics.mockResolvedValue(alertStats);
      mockServices.evaluationService.getEvaluationStats.mockResolvedValue(evaluationStats);

      const result = await service.getServiceOverview();

      expect(mockServices.ruleService.getRuleStats).toHaveBeenCalled();
      expect(mockServices.queryService.getAlertStatistics).toHaveBeenCalled();
      expect(mockServices.evaluationService.getEvaluationStats).toHaveBeenCalled();
      expect(result.rules.total).toBe(10);
      expect(result.rules.enabled).toBe(8);
      expect(result.alerts.active).toBe(3);
      expect(result.performance.lastEvaluation).toEqual(evaluationStats.lastEvaluationTime);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const result = await service.performHealthCheck();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle service failures', async () => {
      mockServices.ruleService.getRuleStats.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.performHealthCheck();

      expect(result.status).toBe('degraded');
    });

    it('should return unhealthy status when most services fail', async () => {
      mockServices.ruleService.getRuleStats.mockRejectedValue(new Error('Service unavailable'));
      mockServices.queryService.getQueryStats.mockRejectedValue(new Error('Service unavailable'));
      mockServices.evaluationService.getEvaluationStats.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.performHealthCheck();

      expect(result.status).toBe('unhealthy');
    });
  });

  describe('Cache Management', () => {
    it('should cleanup expired data', async () => {
      const cleanupResult = { cleanedKeys: 10, errors: [] };
      mockServices.cacheService.cleanupTimeseriesData.mockResolvedValue(cleanupResult);

      const result = await service.cleanupExpiredData(7);

      expect(mockServices.cacheService.cleanupTimeseriesData).toHaveBeenCalledWith(7);
      expect(result.timeseriesCleanup).toEqual(cleanupResult);
    });
  });
});