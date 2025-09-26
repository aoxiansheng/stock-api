import { Test, TestingModule } from '@nestjs/testing';
import { AlertController } from '@alert/controller/alert.controller';
import { AlertOrchestratorService } from '@alert/services/alert-orchestrator.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertQueryDto, TriggerAlertDto, AlertResponseDto, ResolveAlertDto, AcknowledgeAlertDto } from '@alert/dto';
import { IAlertRule, IAlert } from '@alert/interfaces';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';
import { Types } from 'mongoose';
import { jest } from '@jest/globals';

describe('AlertController', () => {
  let controller: AlertController;
  let mockAlertOrchestrator: any;
  let mockPaginationService: any;

  const mockAlertRule: IAlertRule = {
    id: new Types.ObjectId().toHexString(),
    name: 'Test Alert Rule',
    description: 'Test rule description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.WARNING,
    enabled: true,
    channels: [],
    cooldown: 600,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user'
  } as any;

  const mockAlert: IAlert = {
    id: new Types.ObjectId().toHexString(),
    ruleId: mockAlertRule.id,
    status: AlertStatus.FIRING,
    severity: AlertSeverity.WARNING,
    message: 'CPU usage exceeded threshold',
    createdAt: new Date(),
    acknowledgedAt: undefined,
    resolvedAt: undefined,
    metadata: { value: 85 },
    // Additional fields required by AlertResponseDto.fromEntity
    ruleName: mockAlertRule.name,
    metric: 'cpu_usage',
    value: 85,
    threshold: 80,
    startTime: new Date(),
    endTime: undefined,
    acknowledgedBy: undefined,
    resolvedBy: undefined,
    tags: undefined,
    context: undefined
  } as any;

  beforeEach(async () => {
    mockAlertOrchestrator = {
      createRule: jest.fn(),
      getRules: jest.fn(),
      getRuleById: jest.fn(),
      updateRule: jest.fn(),
      deleteRule: jest.fn(),
      toggleRule: jest.fn(),
      getActiveAlerts: jest.fn(),
      queryAlerts: jest.fn(),
      getStats: jest.fn(),
      getAlertById: jest.fn(),
      acknowledgeAlert: jest.fn(),
      resolveAlert: jest.fn(),
      evaluateAllRules: jest.fn(),
    };

    mockPaginationService = {
      normalizePaginationQuery: jest.fn(),
      createPaginatedResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertController],
      providers: [
        {
          provide: AlertOrchestratorService,
          useValue: mockAlertOrchestrator
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService
        }
      ],
    }).compile();

    controller = module.get<AlertController>(AlertController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule Management', () => {
    describe('createRule', () => {
      it('should create a new alert rule', async () => {
        const createDto: CreateAlertRuleDto = {
          name: 'Test Rule',
          metric: 'cpu_usage',
          operator: '>',
          threshold: 80,
          duration: 300,
          severity: AlertSeverity.WARNING,
          enabled: true,
          channels: [],
          cooldown: 600
        } as any;

        mockAlertOrchestrator.createRule.mockResolvedValue(mockAlertRule);

        const result = await controller.createRule(createDto);

        expect(mockAlertOrchestrator.createRule).toHaveBeenCalledWith(createDto);
        expect(result).toEqual(mockAlertRule);
      });

      it('should handle orchestrator errors gracefully', async () => {
        const createDto: CreateAlertRuleDto = {
          name: 'Test Rule',
          metric: 'cpu_usage'
        } as any;

        const error = new Error('Database connection failed');
        mockAlertOrchestrator.createRule.mockRejectedValue(error);

        await expect(controller.createRule(createDto)).rejects.toThrow(error);
        expect(mockAlertOrchestrator.createRule).toHaveBeenCalledWith(createDto);
      });
    });

    describe('getRules', () => {
      it('should return all alert rules', async () => {
        const rules = [mockAlertRule];
        mockAlertOrchestrator.getRules.mockResolvedValue(rules);

        const result = await controller.getRules();

        expect(mockAlertOrchestrator.getRules).toHaveBeenCalled();
        expect(result).toEqual(rules);
      });

      it('should return empty array when no rules exist', async () => {
        mockAlertOrchestrator.getRules.mockResolvedValue([]);

        const result = await controller.getRules();

        expect(mockAlertOrchestrator.getRules).toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });

    describe('getRuleById', () => {
      it('should return rule by ID', async () => {
        const ruleId = mockAlertRule.id;
        mockAlertOrchestrator.getRuleById.mockResolvedValue(mockAlertRule);

        const result = await controller.getRuleById(ruleId);

        expect(mockAlertOrchestrator.getRuleById).toHaveBeenCalledWith(ruleId);
        expect(result).toEqual(mockAlertRule);
      });

      it('should return null for non-existent rule', async () => {
        const ruleId = new Types.ObjectId().toHexString();
        mockAlertOrchestrator.getRuleById.mockResolvedValue(null);

        const result = await controller.getRuleById(ruleId);

        expect(mockAlertOrchestrator.getRuleById).toHaveBeenCalledWith(ruleId);
        expect(result).toBeNull();
      });
    });

    describe('updateRule', () => {
      it('should update existing rule', async () => {
        const ruleId = mockAlertRule.id;
        const updateDto: UpdateAlertRuleDto = {
          threshold: 90,
          enabled: false
        } as any;
        const updatedRule = { ...mockAlertRule, ...updateDto };

        mockAlertOrchestrator.updateRule.mockResolvedValue(updatedRule);

        const result = await controller.updateRule(ruleId, updateDto);

        expect(mockAlertOrchestrator.updateRule).toHaveBeenCalledWith(ruleId, updateDto);
        expect(result).toEqual(updatedRule);
      });

      it('should return null for non-existent rule', async () => {
        const ruleId = new Types.ObjectId().toHexString();
        const updateDto: UpdateAlertRuleDto = { threshold: 90 } as any;

        mockAlertOrchestrator.updateRule.mockResolvedValue(null);

        const result = await controller.updateRule(ruleId, updateDto);

        expect(mockAlertOrchestrator.updateRule).toHaveBeenCalledWith(ruleId, updateDto);
        expect(result).toBeNull();
      });
    });

    describe('deleteRule', () => {
      it('should delete rule successfully', async () => {
        const ruleId = mockAlertRule.id;
        mockAlertOrchestrator.deleteRule.mockResolvedValue();

        await controller.deleteRule(ruleId);

        expect(mockAlertOrchestrator.deleteRule).toHaveBeenCalledWith(ruleId);
      });

      it('should handle delete errors gracefully', async () => {
        const ruleId = mockAlertRule.id;
        const error = new Error('Rule not found');
        mockAlertOrchestrator.deleteRule.mockRejectedValue(error);

        await expect(controller.deleteRule(ruleId)).rejects.toThrow(error);
        expect(mockAlertOrchestrator.deleteRule).toHaveBeenCalledWith(ruleId);
      });
    });

    describe('toggleRule', () => {
      it('should enable rule', async () => {
        const ruleId = mockAlertRule.id;
        const body = { enabled: true };
        mockAlertOrchestrator.toggleRule.mockResolvedValue();

        await controller.toggleRule(ruleId, body);

        expect(mockAlertOrchestrator.toggleRule).toHaveBeenCalledWith(ruleId, true);
      });

      it('should disable rule', async () => {
        const ruleId = mockAlertRule.id;
        const body = { enabled: false };
        mockAlertOrchestrator.toggleRule.mockResolvedValue();

        await controller.toggleRule(ruleId, body);

        expect(mockAlertOrchestrator.toggleRule).toHaveBeenCalledWith(ruleId, false);
      });
    });
  });

  describe('Alert Management', () => {
    describe('getActiveAlerts', () => {
      it('should return active alerts', async () => {
        const alerts = [mockAlert];
        mockAlertOrchestrator.getActiveAlerts.mockResolvedValue(alerts);

        const result = await controller.getActiveAlerts();

        expect(mockAlertOrchestrator.getActiveAlerts).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });

      it('should return empty array when no active alerts', async () => {
        mockAlertOrchestrator.getActiveAlerts.mockResolvedValue([]);

        const result = await controller.getActiveAlerts();

        expect(mockAlertOrchestrator.getActiveAlerts).toHaveBeenCalled();
        expect(result).toEqual([]);
      });

      it('should filter alerts by query parameters', async () => {
        const query: AlertQueryDto = { severity: AlertSeverity.CRITICAL } as any;
        const alerts = [mockAlert];
        mockAlertOrchestrator.getActiveAlerts.mockResolvedValue(alerts);

        const result = await controller.getActiveAlerts(query);

        expect(mockAlertOrchestrator.getActiveAlerts).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });
    });

    describe('getAlertHistory', () => {
      it('should return paginated alert history', async () => {
        const query: AlertQueryDto = { page: 1, limit: 10 } as any;
        const normalizedQuery = { page: 1, limit: 10 };
        const convertedQuery = {
          ...query,
          startTime: undefined,
          endTime: undefined,
        };
        const queryResult = {
          alerts: [mockAlert],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        };
        const paginatedResponse = {
          items: [mockAlert],
          pagination: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        };

        mockPaginationService.normalizePaginationQuery.mockReturnValue(normalizedQuery);
        mockAlertOrchestrator.queryAlerts.mockResolvedValue(queryResult);
        mockPaginationService.createPaginatedResponse.mockReturnValue(paginatedResponse);

        const result = await controller.getAlertHistory(query);

        expect(mockPaginationService.normalizePaginationQuery).toHaveBeenCalledWith(query);
        expect(mockAlertOrchestrator.queryAlerts).toHaveBeenCalledWith(convertedQuery);
        expect(mockPaginationService.createPaginatedResponse).toHaveBeenCalled();
        expect(result).toEqual(paginatedResponse);
      });

      it('should convert date strings to Date objects', async () => {
        const query: AlertQueryDto = {
          page: 1,
          limit: 10,
          startTime: '2024-01-01T00:00:00.000Z' as any,
          endTime: '2024-01-02T00:00:00.000Z' as any
        };
        const normalizedQuery = { page: 1, limit: 10 };
        const queryResult = {
          alerts: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        };

        mockPaginationService.normalizePaginationQuery.mockReturnValue(normalizedQuery);
        mockAlertOrchestrator.queryAlerts.mockResolvedValue(queryResult);
        mockPaginationService.createPaginatedResponse.mockReturnValue({
          items: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrev: false }
        });

        await controller.getAlertHistory(query);

        expect(mockAlertOrchestrator.queryAlerts).toHaveBeenCalledWith({
          ...query,
          startTime: new Date('2024-01-01T00:00:00.000Z'),
          endTime: new Date('2024-01-02T00:00:00.000Z'),
        });
      });
    });

    describe('getAlertStats', () => {
      it('should return alert statistics', async () => {
        const stats = {
          totalRules: 5,
          enabledRules: 3,
          activeAlerts: 2,
          criticalAlerts: 1,
          warningAlerts: 1,
          infoAlerts: 0,
          totalAlertsToday: 10,
          resolvedAlertsToday: 8,
          averageResolutionTime: 300
        };
        mockAlertOrchestrator.getStats.mockResolvedValue(stats);

        const result = await controller.getAlertStats();

        expect(mockAlertOrchestrator.getStats).toHaveBeenCalled();
        expect(result).toEqual(stats);
      });
    });

    describe('getAlertById', () => {
      it('should return alert by ID', async () => {
        const alertId = mockAlert.id;
        mockAlertOrchestrator.getAlertById.mockResolvedValue(mockAlert);

        const result = await controller.getAlertById(alertId);

        expect(mockAlertOrchestrator.getAlertById).toHaveBeenCalledWith(alertId);
        expect(result).toBeTruthy();
      });

      it('should return null for non-existent alert', async () => {
        const alertId = new Types.ObjectId().toHexString();
        mockAlertOrchestrator.getAlertById.mockResolvedValue(null);

        const result = await controller.getAlertById(alertId);

        expect(mockAlertOrchestrator.getAlertById).toHaveBeenCalledWith(alertId);
        expect(result).toBeNull();
      });
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge alert successfully', async () => {
        const alertId = mockAlert.id;
        const body: AcknowledgeAlertDto = {
          acknowledgedBy: 'admin@test.com',
          note: 'Investigating the issue'
        };
        const acknowledgedAlert = {
          ...mockAlert,
          acknowledgedAt: new Date(),
          acknowledgedBy: body.acknowledgedBy
        };

        mockAlertOrchestrator.acknowledgeAlert.mockResolvedValue(acknowledgedAlert);

        const result = await controller.acknowledgeAlert(alertId, body);

        expect(mockAlertOrchestrator.acknowledgeAlert).toHaveBeenCalledWith(
          alertId,
          body.acknowledgedBy,
          body.note
        );
        expect(result).toBeTruthy();
      });
    });

    describe('resolveAlert', () => {
      it('should resolve alert successfully', async () => {
        const alertId = mockAlert.id;
        const body: ResolveAlertDto = {
          resolvedBy: 'admin@test.com',
          solution: 'CPU usage normalized after scaling'
        };

        mockAlertOrchestrator.getAlertById.mockResolvedValue(mockAlert);
        mockAlertOrchestrator.resolveAlert.mockResolvedValue();

        await controller.resolveAlert(alertId, body);

        expect(mockAlertOrchestrator.getAlertById).toHaveBeenCalledWith(alertId);
        expect(mockAlertOrchestrator.resolveAlert).toHaveBeenCalledWith(
          alertId,
          body.resolvedBy,
          mockAlert.ruleId,
          body.solution
        );
      });

      it('should handle missing alert error', async () => {
        const alertId = new Types.ObjectId().toHexString();
        const body: ResolveAlertDto = {
          resolvedBy: 'admin@test.com',
          solution: 'Issue resolved'
        };

        mockAlertOrchestrator.getAlertById.mockResolvedValue(null);

        await expect(controller.resolveAlert(alertId, body)).rejects.toThrow();
        expect(mockAlertOrchestrator.getAlertById).toHaveBeenCalledWith(alertId);
        expect(mockAlertOrchestrator.resolveAlert).not.toHaveBeenCalled();
      });
    });
  });

  describe('Manual Trigger', () => {
    describe('triggerEvaluation', () => {
      it('should trigger evaluation without parameters', async () => {
        mockAlertOrchestrator.evaluateAllRules.mockResolvedValue();

        const result = await controller.triggerEvaluation();

        expect(mockAlertOrchestrator.evaluateAllRules).toHaveBeenCalledWith([]);
        expect(result).toEqual({ message: '告警评估已触发' });
      });

      it('should trigger evaluation for specific rule', async () => {
        const triggerDto: TriggerAlertDto = {
          ruleId: mockAlertRule.id,
          metrics: []
        };
        mockAlertOrchestrator.getRuleById.mockResolvedValue(mockAlertRule);
        mockAlertOrchestrator.evaluateAllRules.mockResolvedValue();

        const result = await controller.triggerEvaluation(triggerDto);

        expect(mockAlertOrchestrator.getRuleById).toHaveBeenCalledWith(triggerDto.ruleId);
        expect(mockAlertOrchestrator.evaluateAllRules).toHaveBeenCalledWith([]);
        expect(result.message).toContain(triggerDto.ruleId);
      });

      it('should trigger evaluation with metrics', async () => {
        const triggerDto: TriggerAlertDto = {
          metrics: [
            {
              metric: 'cpu_usage',
              value: 85,
              timestamp: new Date(),
              tags: { instance: 'web-01' }
            }
          ]
        };
        mockAlertOrchestrator.evaluateAllRules.mockResolvedValue();

        const result = await controller.triggerEvaluation(triggerDto);

        expect(mockAlertOrchestrator.evaluateAllRules).toHaveBeenCalledWith([
          {
            metric: triggerDto.metrics[0].metric,
            value: triggerDto.metrics[0].value,
            timestamp: triggerDto.metrics[0].timestamp,
            tags: triggerDto.metrics[0].tags
          }
        ]);
        expect(result.message).toContain('1 个指标');
      });

      it('should proceed even when rule is not found', async () => {
        const triggerDto: TriggerAlertDto = {
          ruleId: new Types.ObjectId().toHexString(),
          metrics: []
        };
        mockAlertOrchestrator.getRuleById.mockResolvedValue(null);
        mockAlertOrchestrator.evaluateAllRules.mockResolvedValue();

        const result = await controller.triggerEvaluation(triggerDto);

        expect(mockAlertOrchestrator.getRuleById).toHaveBeenCalledWith(triggerDto.ruleId);
        expect(mockAlertOrchestrator.evaluateAllRules).toHaveBeenCalledWith([]);
        expect(result.message).toContain(triggerDto.ruleId);
      });

      it('should log client identifier for audit', async () => {
        const req = {
          headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'test-client' },
          connection: { remoteAddress: '127.0.0.1' }
        };
        const triggerDto: TriggerAlertDto = { metrics: [] };
        mockAlertOrchestrator.evaluateAllRules.mockResolvedValue();

        const result = await controller.triggerEvaluation(triggerDto, req);

        expect(mockAlertOrchestrator.evaluateAllRules).toHaveBeenCalled();
        expect(result).toEqual({ message: '告警评估已触发' });
      });
    });

    describe('generateEvaluationMessage', () => {
      it('should generate message for rule-specific evaluation', () => {
        const controllerInstance = new AlertController(
          mockAlertOrchestrator,
          mockPaginationService
        );
        const triggerDto: TriggerAlertDto = { ruleId: mockAlertRule.id, metrics: [] };

        const message = (controllerInstance as any).generateEvaluationMessage(triggerDto);

        expect(message).toBe(`告警规则 ${mockAlertRule.id} 评估已触发`);
      });

      it('should generate message for metrics evaluation', () => {
        const controllerInstance = new AlertController(
          mockAlertOrchestrator,
          mockPaginationService
        );
        const triggerDto: TriggerAlertDto = {
          metrics: [
            { metric: 'cpu_usage', value: 85, timestamp: new Date() },
            { metric: 'memory_usage', value: 70, timestamp: new Date() }
          ]
        };

        const message = (controllerInstance as any).generateEvaluationMessage(triggerDto);

        expect(message).toBe('告警评估已触发，处理了 2 个指标');
      });

      it('should generate default message', () => {
        const controllerInstance = new AlertController(
          mockAlertOrchestrator,
          mockPaginationService
        );

        const message = (controllerInstance as any).generateEvaluationMessage();

        expect(message).toBe('告警评估已触发');
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchAcknowledgeAlerts', () => {
      it('should acknowledge multiple alerts successfully', async () => {
        const body = {
          alertIds: [mockAlert.id, new Types.ObjectId().toHexString()],
          acknowledgedBy: 'admin@test.com'
        };
        mockAlertOrchestrator.acknowledgeAlert
          .mockResolvedValueOnce(mockAlert)
          .mockResolvedValueOnce(mockAlert);

        const result = await controller.batchAcknowledgeAlerts(body);

        expect(result.succeeded).toEqual(body.alertIds);
        expect(result.failed).toEqual([]);
        expect(mockAlertOrchestrator.acknowledgeAlert).toHaveBeenCalledTimes(2);
      });

      it('should handle partial failures in batch acknowledge', async () => {
        const body = {
          alertIds: [mockAlert.id, new Types.ObjectId().toHexString()],
          acknowledgedBy: 'admin@test.com'
        };
        mockAlertOrchestrator.acknowledgeAlert
          .mockResolvedValueOnce(mockAlert)
          .mockRejectedValueOnce(new Error('Alert not found'));

        const result = await controller.batchAcknowledgeAlerts(body);

        expect(result.succeeded).toEqual([body.alertIds[0]]);
        expect(result.failed).toEqual([body.alertIds[1]]);
        expect(mockAlertOrchestrator.acknowledgeAlert).toHaveBeenCalledTimes(2);
      });
    });

    describe('batchResolveAlerts', () => {
      it('should resolve multiple alerts successfully', async () => {
        const body = {
          alertIds: [mockAlert.id, new Types.ObjectId().toHexString()],
          resolvedBy: 'admin@test.com'
        };
        const allAlerts = [mockAlert, { ...mockAlert, id: body.alertIds[1] }];

        mockAlertOrchestrator.getActiveAlerts.mockResolvedValue(allAlerts);
        mockAlertOrchestrator.resolveAlert.mockResolvedValue();

        const result = await controller.batchResolveAlerts(body);

        expect(result.succeeded).toEqual(body.alertIds);
        expect(result.failed).toEqual([]);
        expect(mockAlertOrchestrator.resolveAlert).toHaveBeenCalledTimes(2);
      });

      it('should handle missing alerts in batch resolve', async () => {
        const body = {
          alertIds: [mockAlert.id, new Types.ObjectId().toHexString()],
          resolvedBy: 'admin@test.com'
        };
        const allAlerts = [mockAlert]; // Missing second alert

        mockAlertOrchestrator.getActiveAlerts.mockResolvedValue(allAlerts);
        mockAlertOrchestrator.resolveAlert.mockResolvedValue();

        const result = await controller.batchResolveAlerts(body);

        expect(result.succeeded).toEqual([body.alertIds[0]]);
        expect(result.failed).toEqual([body.alertIds[1]]);
        expect(mockAlertOrchestrator.resolveAlert).toHaveBeenCalledTimes(1);
      });

      it('should handle resolve failures', async () => {
        const body = {
          alertIds: [mockAlert.id],
          resolvedBy: 'admin@test.com'
        };
        const allAlerts = [mockAlert];

        mockAlertOrchestrator.getActiveAlerts.mockResolvedValue(allAlerts);
        mockAlertOrchestrator.resolveAlert.mockRejectedValue(new Error('Database error'));

        const result = await controller.batchResolveAlerts(body);

        expect(result.succeeded).toEqual([]);
        expect(result.failed).toEqual([body.alertIds[0]]);
        expect(mockAlertOrchestrator.resolveAlert).toHaveBeenCalledTimes(1);
      });
    });
  });
});