import { Test, TestingModule } from '@nestjs/testing';
import { AlertController } from '../../../../src/alert/controller/alert.controller';
import { AlertOrchestratorService } from '../../../../src/alert/services/alert-orchestrator.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { IAlertRule, IAlert, IAlertStats, IMetricData } from '../../../../src/alert/interfaces';
import { AlertStatus } from '../../../../src/alert/types/alert.types';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertQueryDto, AcknowledgeAlertDto, ResolveAlertDto, TriggerAlertDto } from '../../../../src/alert/dto';
import { AlertResponseDto } from '../../../../src/alert/dto/alert-response.dto';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

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

const mockAlert: IAlert = {
  id: 'alert_1234567890_abcdef',
  ruleId: 'rule_1234567890_abcdef',
  ruleName: 'Test Alert Rule',
  metric: 'cpu.usage',
  value: 85,
  threshold: 80,
  severity: 'warning',
  status: AlertStatus.FIRING,
  message: 'Alert triggered: cpu.usage > 80, current value: 85',
  startTime: new Date(),
  endTime: undefined,
  acknowledgedBy: undefined,
  acknowledgedAt: undefined,
  resolvedBy: undefined,
  resolvedAt: undefined,
  tags: { environment: 'test' },
  context: {
    metric: 'cpu.usage',
    operator: '>',
    tags: { host: 'server1' }
  }
};

const mockAlertStats: IAlertStats = {
  activeAlerts: 5,
  criticalAlerts: 2,
  warningAlerts: 3,
  infoAlerts: 0,
  totalAlertsToday: 10,
  resolvedAlertsToday: 3,
  averageResolutionTime: 30,
  totalRules: 20,
  enabledRules: 18,
};

const mockAlertResponseDto = new AlertResponseDto();
mockAlertResponseDto.id = mockAlert.id;
mockAlertResponseDto.ruleId = mockAlert.ruleId;
mockAlertResponseDto.ruleName = mockAlert.ruleName;
mockAlertResponseDto.metric = mockAlert.metric;
mockAlertResponseDto.value = mockAlert.value;
mockAlertResponseDto.threshold = mockAlert.threshold;
mockAlertResponseDto.severity = mockAlert.severity;
mockAlertResponseDto.status = mockAlert.status;
mockAlertResponseDto.message = mockAlert.message;
mockAlertResponseDto.startTime = mockAlert.startTime;
mockAlertResponseDto.endTime = mockAlert.endTime;
mockAlertResponseDto.acknowledgedBy = mockAlert.acknowledgedBy;
mockAlertResponseDto.acknowledgedAt = mockAlert.acknowledgedAt;
mockAlertResponseDto.resolvedBy = mockAlert.resolvedBy;
mockAlertResponseDto.resolvedAt = mockAlert.resolvedAt;
mockAlertResponseDto.tags = mockAlert.tags;

describe('AlertController', () => {
  let controller: AlertController;
  let alertOrchestrator: jest.Mocked<AlertOrchestratorService>;
  let paginationService: jest.Mocked<PaginationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertController],
      providers: [
        {
          provide: AlertOrchestratorService,
          useValue: {
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
          },
        },
        {
          provide: PaginationService,
          useValue: {
            normalizePaginationQuery: jest.fn().mockImplementation((query) => ({
              page: query.page || 1,
              limit: query.limit || 10,
            })),
            createPaginatedResponse: jest.fn().mockImplementation((data, page, limit, total) => ({
              data,
              meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
              },
            })),
          },
        },
      ],
    }).compile();

    controller = module.get(AlertController);
    alertOrchestrator = module.get(AlertOrchestratorService);
    paginationService = module.get(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== 告警规则管理 ====================

  describe('createRule', () => {
    it('should create a new alert rule', async () => {
      // Arrange
      const createRuleDto: CreateAlertRuleDto = {
        name: 'Test Alert Rule',
        description: 'Test alert rule description',
        metric: 'cpu.usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning' as any,
        enabled: true,
        channels: [
          {
            name: 'Email Channel',
            type: 'email' as any,
            config: { email: 'test@example.com' },
            enabled: true,
          }
        ],
        cooldown: 600,
        tags: { environment: 'test' },
      };
      
      alertOrchestrator.createRule.mockResolvedValue(mockAlertRule);

      // Act
      const result = await controller.createRule(createRuleDto);

      // Assert
      expect(alertOrchestrator.createRule).toHaveBeenCalledWith(createRuleDto);
      expect(result).toEqual(mockAlertRule);
    });
  });

  describe('getRules', () => {
    it('should return all alert rules', async () => {
      // Arrange
      alertOrchestrator.getRules.mockResolvedValue([mockAlertRule]);

      // Act
      const result = await controller.getRules();

      // Assert
      expect(alertOrchestrator.getRules).toHaveBeenCalled();
      expect(result).toEqual([mockAlertRule]);
    });
  });

  describe('getRuleById', () => {
    it('should return an alert rule by ID', async () => {
      // Arrange
      alertOrchestrator.getRuleById.mockResolvedValue(mockAlertRule);

      // Act
      const result = await controller.getRuleById('rule_1234567890_abcdef');

      // Assert
      expect(alertOrchestrator.getRuleById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(result).toEqual(mockAlertRule);
    });

    it('should return null when rule is not found', async () => {
      // Arrange
      alertOrchestrator.getRuleById.mockResolvedValue(null);

      // Act
      const result = await controller.getRuleById('nonexistent_rule');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateRule', () => {
    it('should update an alert rule', async () => {
      // Arrange
      const updateRuleDto: UpdateAlertRuleDto = {
        name: 'Updated Alert Rule',
        description: 'Updated alert rule description',
      };
      
      const updatedRule = { ...mockAlertRule, ...updateRuleDto };
      alertOrchestrator.updateRule.mockResolvedValue(updatedRule);

      // Act
      const result = await controller.updateRule('rule_1234567890_abcdef', updateRuleDto);

      // Assert
      expect(alertOrchestrator.updateRule).toHaveBeenCalledWith('rule_1234567890_abcdef', updateRuleDto);
      expect(result).toEqual(updatedRule);
    });
  });

  describe('deleteRule', () => {
    it('should delete an alert rule', async () => {
      // Arrange
      alertOrchestrator.deleteRule.mockResolvedValue();

      // Act
      await controller.deleteRule('rule_1234567890_abcdef');

      // Assert
      expect(alertOrchestrator.deleteRule).toHaveBeenCalledWith('rule_1234567890_abcdef');
    });
  });

  describe('toggleRule', () => {
    it('should toggle an alert rule status', async () => {
      // Arrange
      alertOrchestrator.toggleRule.mockResolvedValue();

      // Act
      await controller.toggleRule('rule_1234567890_abcdef', { enabled: false });

      // Assert
      expect(alertOrchestrator.toggleRule).toHaveBeenCalledWith('rule_1234567890_abcdef', false);
    });
  });

  // ==================== 告警管理 ====================

  describe('getActiveAlerts', () => {
    it('should return active alerts', async () => {
      // Arrange
      alertOrchestrator.getActiveAlerts.mockResolvedValue([mockAlert]);

      // Act
      const result = await controller.getActiveAlerts();

      // Assert
      expect(alertOrchestrator.getActiveAlerts).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AlertResponseDto);
    });
  });

  describe('getAlertHistory', () => {
    it('should return paginated alert history', async () => {
      // Arrange
      const query: AlertQueryDto = { page: 1, limit: 10 };
      const mockQueryResult = { alerts: [mockAlert], total: 1 };
      
      alertOrchestrator.queryAlerts.mockResolvedValue(mockQueryResult);
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [mockAlertResponseDto],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      // Act
      const result = await controller.getAlertHistory(query);

      // Assert
      expect(alertOrchestrator.queryAlerts).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', async () => {
      // Arrange
      alertOrchestrator.getStats.mockResolvedValue(mockAlertStats);

      // Act
      const result = await controller.getAlertStats();

      // Assert
      expect(alertOrchestrator.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockAlertStats);
    });
  });

  describe('getAlertById', () => {
    it('should return an alert by ID', async () => {
      // Arrange
      alertOrchestrator.getAlertById.mockResolvedValue(mockAlert);

      // Act
      const result = await controller.getAlertById('alert_1234567890_abcdef');

      // Assert
      expect(alertOrchestrator.getAlertById).toHaveBeenCalledWith('alert_1234567890_abcdef');
      expect(result).toBeInstanceOf(AlertResponseDto);
    });

    it('should return null when alert is not found', async () => {
      // Arrange
      alertOrchestrator.getAlertById.mockResolvedValue(null);

      // Act
      const result = await controller.getAlertById('nonexistent_alert');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      // Arrange
      const acknowledgeDto: AcknowledgeAlertDto = {
        acknowledgedBy: 'testUser',
        note: 'Test acknowledgment'
      };
      
      const acknowledgedAlert = { ...mockAlert, status: AlertStatus.ACKNOWLEDGED };
      alertOrchestrator.acknowledgeAlert.mockResolvedValue(acknowledgedAlert);

      // Act
      const result = await controller.acknowledgeAlert('alert_1234567890_abcdef', acknowledgeDto);

      // Assert
      expect(alertOrchestrator.acknowledgeAlert).toHaveBeenCalledWith(
        'alert_1234567890_abcdef',
        acknowledgeDto.acknowledgedBy,
        acknowledgeDto.note
      );
      expect(result).toBeInstanceOf(AlertResponseDto);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      // Arrange
      const resolveDto: ResolveAlertDto = {
        resolvedBy: 'testUser',
        solution: 'Test resolution'
      };
      
      alertOrchestrator.getAlertById.mockResolvedValue(mockAlert);
      alertOrchestrator.resolveAlert.mockResolvedValue();

      // Act
      await controller.resolveAlert('alert_1234567890_abcdef', resolveDto);

      // Assert
      expect(alertOrchestrator.getAlertById).toHaveBeenCalledWith('alert_1234567890_abcdef');
      expect(alertOrchestrator.resolveAlert).toHaveBeenCalledWith(
        'alert_1234567890_abcdef',
        resolveDto.resolvedBy,
        mockAlert.ruleId,
        resolveDto.solution
      );
    });
  });

  // ==================== 手动触发 ====================

  describe('triggerEvaluation', () => {
    it('should trigger alert evaluation for all rules', async () => {
      // Arrange
      alertOrchestrator.evaluateAllRules.mockResolvedValue();

      // Act
      const result = await controller.triggerEvaluation();

      // Assert
      expect(alertOrchestrator.evaluateAllRules).toHaveBeenCalledWith([]);
      expect(result).toEqual({ message: '告警评估已触发' });
    });

    it('should trigger alert evaluation for specific rule', async () => {
      // Arrange
      const triggerDto: TriggerAlertDto = { ruleId: 'rule_1234567890_abcdef' };
      alertOrchestrator.getRuleById.mockResolvedValue(mockAlertRule);
      alertOrchestrator.evaluateAllRules.mockResolvedValue();

      // Act
      const result = await controller.triggerEvaluation(triggerDto);

      // Assert
      expect(alertOrchestrator.getRuleById).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(alertOrchestrator.evaluateAllRules).toHaveBeenCalledWith([]);
      expect(result).toEqual({ message: '告警规则 rule_1234567890_abcdef 评估已触发' });
    });

    it('should trigger alert evaluation with metrics data', async () => {
      // Arrange
      const metricsData: IMetricData[] = [
        { metric: 'cpu.usage', value: 85, timestamp: new Date(), tags: { host: 'server1' } }
      ];
      
      const triggerDto: TriggerAlertDto = { metrics: metricsData };
      alertOrchestrator.evaluateAllRules.mockResolvedValue();

      // Act
      const result = await controller.triggerEvaluation(triggerDto);

      // Assert
      expect(alertOrchestrator.evaluateAllRules).toHaveBeenCalledWith(metricsData);
      expect(result).toEqual({ message: '告警评估已触发，处理了 1 个指标' });
    });
  });

  // ==================== 批量操作 ====================

  describe('batchAcknowledgeAlerts', () => {
    it('should batch acknowledge alerts successfully', async () => {
      // Arrange
      const body = { alertIds: ['alert_1', 'alert_2'], acknowledgedBy: 'testUser' };
      
      alertOrchestrator.acknowledgeAlert
        .mockResolvedValueOnce({ ...mockAlert, id: 'alert_1' } as any)
        .mockResolvedValueOnce({ ...mockAlert, id: 'alert_2' } as any);

      // Act
      const result = await controller.batchAcknowledgeAlerts(body);

      // Assert
      expect(alertOrchestrator.acknowledgeAlert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ succeeded: ['alert_1', 'alert_2'], failed: [] });
    });

    it('should handle partial failures in batch acknowledgment', async () => {
      // Arrange
      const body = { alertIds: ['alert_1', 'alert_2'], acknowledgedBy: 'testUser' };
      
      alertOrchestrator.acknowledgeAlert
        .mockResolvedValueOnce({ ...mockAlert, id: 'alert_1' } as any)
        .mockRejectedValueOnce(new Error('Acknowledgment failed'));

      // Act
      const result = await controller.batchAcknowledgeAlerts(body);

      // Assert
      expect(alertOrchestrator.acknowledgeAlert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ succeeded: ['alert_1'], failed: ['alert_2'] });
    });
  });

  describe('batchResolveAlerts', () => {
    it('should batch resolve alerts successfully', async () => {
      // Arrange
      const body = { alertIds: ['alert_1', 'alert_2'], resolvedBy: 'testUser' };
      const activeAlerts = [
        { ...mockAlert, id: 'alert_1' },
        { ...mockAlert, id: 'alert_2' }
      ];
      
      alertOrchestrator.getActiveAlerts.mockResolvedValue(activeAlerts as any);
      alertOrchestrator.resolveAlert.mockResolvedValue();

      // Act
      const result = await controller.batchResolveAlerts(body);

      // Assert
      expect(alertOrchestrator.getActiveAlerts).toHaveBeenCalled();
      expect(alertOrchestrator.resolveAlert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ succeeded: ['alert_1', 'alert_2'], failed: [] });
    });

    it('should handle alert not found in batch resolution', async () => {
      // Arrange
      const body = { alertIds: ['nonexistent_alert'], resolvedBy: 'testUser' };
      alertOrchestrator.getActiveAlerts.mockResolvedValue([]);

      // Act
      const result = await controller.batchResolveAlerts(body);

      // Assert
      expect(result).toEqual({ succeeded: [], failed: ['nonexistent_alert'] });
    });
  });
});