import { Test, TestingModule } from '@nestjs/testing';
import { AlertController } from '../../../../src/alert/alert.controller';
import { AlertingService } from '../../../../src/alert/services/alerting.service';
import { AlertHistoryService } from '../../../../src/alert/services/alert-history.service';
import { NotificationService } from '../../../../src/alert/services/notification.service';
import { CreateAlertRuleDto } from '../../../../src/alert/dto/alert-rule.dto';
import { AlertSeverity } from '../../../../src/alert/types/alert.types';
import { AlertStatus } from '../../../../src/alert/types/alert.types';
import { NotificationChannelType } from '../../../../src/alert/types/alert.types';
import { PermissionService } from '../../../../src/auth/services/permission.service';
import { UnifiedPermissionsGuard } from '../../../../src/auth/guards/unified-permissions.guard';

describe('AlertController', () => {
  let controller: AlertController;
  let alertingService: AlertingService;
  let alertHistoryService: AlertHistoryService;
  let notificationService: NotificationService;

  const mockAlertRule = {
    id: 'rule-123',
    name: '测试告警规则',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 600,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAlert = {
    id: 'alert-123',
    ruleId: 'rule-123',
    ruleName: '测试告警规则',
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    message: '测试告警消息',
    startTime: new Date(),
    endTime: null,
    // 修正: 移除旧的 'details' 字段，使用根级字段
    metric: 'cpu_usage',
    value: 85,
    context: {}, 
  };

  const mockAlertingService = {
    createRule: jest.fn(),
    getRules: jest.fn(),
    getRuleById: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    toggleRule: jest.fn(),
    getStats: jest.fn(),
    acknowledgeAlert: jest.fn(),
    resolveAlert: jest.fn(),
    processMetrics: jest.fn(),
  };

  const mockAlertHistoryService = {
    getActiveAlerts: jest.fn(),
    getAlertHistory: jest.fn(),
    getAlertById: jest.fn(),
    queryAlerts: jest.fn(),
  };

  const mockNotificationService = {
    testChannel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertController],
      providers: [
        {
          provide: AlertingService,
          useValue: mockAlertingService,
        },
        {
          provide: AlertHistoryService,
          useValue: mockAlertHistoryService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn().mockResolvedValue({ allowed: true }),
          },
        },
      ],
    })
    .overrideGuard(UnifiedPermissionsGuard)
    .useValue({ canActivate: jest.fn().mockReturnValue(true) })
    .compile();

    controller = module.get<AlertController>(AlertController);
    alertingService = module.get<AlertingService>(AlertingService);
    alertHistoryService = module.get<AlertHistoryService>(AlertHistoryService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('告警规则管理', () => {
    describe('createRule', () => {
      it('应该成功创建告警规则', async () => {
        const createRuleDto: CreateAlertRuleDto = {
          name: '测试告警规则',
          metric: 'cpu_usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          severity: AlertSeverity.CRITICAL,
          enabled: true,
          channels: [],
          cooldown: 600,
        };

        mockAlertingService.createRule.mockResolvedValue(mockAlertRule);

        const result = await controller.createRule(createRuleDto);

        expect(alertingService.createRule).toHaveBeenCalledWith(createRuleDto);
        expect(result).toEqual(mockAlertRule);
      });

      it('应该在创建失败时抛出异常', async () => {
        const createRuleDto: CreateAlertRuleDto = {
          name: '无效规则',
          metric: 'invalid_metric',
          operator: 'gt',
          threshold: -1,
          duration: 300,
          severity: AlertSeverity.CRITICAL,
          enabled: true,
          channels: [],
          cooldown: 600,
        };

        mockAlertingService.createRule.mockRejectedValue(new Error('创建告警规则失败'));

        await expect(controller.createRule(createRuleDto)).rejects.toThrow('创建告警规则失败');
      });
    });

    describe('getRules', () => {
      it('应该成功获取所有告警规则', async () => {
        const mockRules = [mockAlertRule];
        mockAlertingService.getRules.mockResolvedValue(mockRules);

        const result = await controller.getRules();

        expect(alertingService.getRules).toHaveBeenCalled();
        expect(result).toEqual(mockRules);
      });

      it('应该在没有规则时返回空数组', async () => {
        mockAlertingService.getRules.mockResolvedValue([]);

        const result = await controller.getRules();

        expect(alertingService.getRules).toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });

    describe('getRuleById', () => {
      it('应该成功根据ID获取告警规则', async () => {
        const ruleId = 'rule-123';
        mockAlertingService.getRuleById.mockResolvedValue(mockAlertRule);

        const result = await controller.getRuleById(ruleId);

        expect(alertingService.getRuleById).toHaveBeenCalledWith(ruleId);
        expect(result).toEqual(mockAlertRule);
      });

      it('应该在规则不存在时返回null', async () => {
        const ruleId = 'nonexistent-rule';
        mockAlertingService.getRuleById.mockResolvedValue(null);

        const result = await controller.getRuleById(ruleId);

        expect(alertingService.getRuleById).toHaveBeenCalledWith(ruleId);
        expect(result).toBeNull();
      });
    });

    describe('updateRule', () => {
      it('应该成功更新告警规则', async () => {
        const ruleId = 'rule-123';
        const updateDto = {
          name: '更新后的告警规则',
          threshold: 90,
        };
        const updatedRule = { ...mockAlertRule, ...updateDto };

        mockAlertingService.updateRule.mockResolvedValue(updatedRule);

        const result = await controller.updateRule(ruleId, updateDto);

        expect(alertingService.updateRule).toHaveBeenCalledWith(ruleId, updateDto);
        expect(result).toEqual(updatedRule);
      });
    });

    describe('deleteRule', () => {
      it('应该成功删除告警规则', async () => {
        const ruleId = 'rule-123';
        mockAlertingService.deleteRule.mockResolvedValue(true);

        await controller.deleteRule(ruleId);

        expect(alertingService.deleteRule).toHaveBeenCalledWith(ruleId);
      });
    });

    describe('toggleRule', () => {
      it('应该成功切换告警规则状态', async () => {
        const ruleId = 'rule-123';
        const body = { enabled: false };
        mockAlertingService.toggleRule.mockResolvedValue(true);

        await controller.toggleRule(ruleId, body);

        expect(alertingService.toggleRule).toHaveBeenCalledWith(ruleId, false);
      });
    });
  });

  describe('告警管理', () => {
    describe('getActiveAlerts', () => {
      it('应该成功获取活跃告警', async () => {
        const mockActiveAlerts = [mockAlert];
        mockAlertHistoryService.getActiveAlerts.mockResolvedValue(mockActiveAlerts);

        const result = await controller.getActiveAlerts();

        expect(alertHistoryService.getActiveAlerts).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].isActive).toBe(true);
      });
    });

    describe('getAlertHistory', () => {
      it('应该成功查询告警历史', async () => {
        const query = {
          page: 1,
          limit: 10,
          severity: AlertSeverity.CRITICAL,
        };

        const mockQueryResult = {
          alerts: [mockAlert],
          total: 1,
          page: 1,
          limit: 10,
        };

        mockAlertHistoryService.queryAlerts.mockResolvedValue(mockQueryResult);

        const result = await controller.getAlertHistory(query);

        expect(alertHistoryService.queryAlerts).toHaveBeenCalledWith({
          ...query,
          startTime: undefined,
          endTime: undefined,
        });
        expect(result.pagination.total).toBe(1);
        expect(result.items.length).toBe(1);
      });

      it('应该正确转换日期参数', async () => {
        const query = {
          startTime: '2023-01-01T00:00:00.000Z',
          endTime: '2023-12-31T23:59:59.999Z',
        };

        const mockQueryResult = {
          alerts: [],
          total: 0,
          page: 1,
          limit: 20,
        };

        mockAlertHistoryService.queryAlerts.mockResolvedValue(mockQueryResult);

        await controller.getAlertHistory(query);

        expect(alertHistoryService.queryAlerts).toHaveBeenCalledWith({
          ...query,
          startTime: new Date('2023-01-01T00:00:00.000Z'),
          endTime: new Date('2023-12-31T23:59:59.999Z'),
        });
      });
    });

    describe('getAlertStats', () => {
      it('应该成功获取告警统计', async () => {
        const mockStats = {
          total: 100,
          firing: 10,
          acknowledged: 5,
          resolved: 80,
          suppressed: 5,
        };

        mockAlertingService.getStats.mockResolvedValue(mockStats);

        const result = await controller.getAlertStats();

        expect(alertingService.getStats).toHaveBeenCalled();
        expect(result).toEqual(mockStats);
      });
    });

    describe('getAlertById', () => {
      it('应该成功根据ID获取告警详情', async () => {
        const alertId = 'alert-123';
        mockAlertHistoryService.getAlertById.mockResolvedValue(mockAlert);

        const result = await controller.getAlertById(alertId);

        expect(alertHistoryService.getAlertById).toHaveBeenCalledWith(alertId);
        expect(result).toBeDefined();
        expect(result.id).toBe(alertId);
      });
    });

    describe('acknowledgeAlert', () => {
      it('应该成功确认告警', async () => {
        const alertId = 'alert-123';
        const body = { acknowledgedBy: 'user-123' };
        const acknowledgedAlert = {
          ...mockAlert,
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: 'user-123',
          acknowledgedAt: new Date(),
        };
        mockAlertingService.acknowledgeAlert.mockResolvedValue(acknowledgedAlert);

        const result = await controller.acknowledgeAlert(alertId, { acknowledgedBy: 'user-123' });

        expect(alertingService.acknowledgeAlert).toHaveBeenCalledWith(alertId, 'user-123');
        expect(result).toEqual({
          ...acknowledgedAlert,
          duration: expect.any(Number),
          isActive: true, // 修正: 确认后告警依然是活跃的，直到被解决
        });
      });
    });

    describe('resolveAlert', () => {
      it('应该成功解决告警', async () => {
        const alertId = 'alert-123';
        const body = { resolvedBy: 'user-123' };
        
        const mockQueryResult = {
          alerts: [{ ...mockAlert, id: alertId, ruleId: 'rule-123' }],
          total: 1,
          page: 1,
          limit: 100,
        };

        mockAlertHistoryService.queryAlerts.mockResolvedValue(mockQueryResult);
        mockAlertingService.resolveAlert.mockResolvedValue(true);

        const result = await controller.resolveAlert(alertId, body);

        expect(alertingService.resolveAlert).toHaveBeenCalledWith(alertId, 'user-123', 'rule-123');
      });

      it('应该在告警不存在时抛出异常', async () => {
        const alertId = 'nonexistent-alert';
        const body = { resolvedBy: 'user-123' };
        
        const mockQueryResult = {
          alerts: [],
          total: 0,
          page: 1,
          limit: 100,
        };

        mockAlertHistoryService.queryAlerts.mockResolvedValue(mockQueryResult);

        await expect(controller.resolveAlert(alertId, body)).rejects.toThrow(
          `未找到ID为 ${alertId} 的告警`
        );
      });
    });
  });

  describe('通知渠道测试', () => {
    describe('testNotificationChannel', () => {
      it('应该成功测试邮件通知渠道', async () => {
        const testDto = {
          type: NotificationChannelType.EMAIL,
          message: '测试通知消息',
          config: {
            to: ['test@example.com'],
            subject: '测试通知',
          },
        };

        mockNotificationService.testChannel.mockResolvedValue(true);

        const result = await controller.testNotificationChannel(testDto);

        expect(notificationService.testChannel).toHaveBeenCalledWith(
          testDto.type,
          testDto.config
        );
        expect(result.success).toBe(true);
      });

      it('应该在测试失败时返回失败结果', async () => {
        const testDto = {
          type: NotificationChannelType.EMAIL,
          message: '测试通知消息',
          config: {
            to: ['invalid@email'],
          },
        };

        mockNotificationService.testChannel.mockResolvedValue(false);

        const result = await controller.testNotificationChannel(testDto);

        expect(result.success).toBe(false);
      });

      it('应该在测试异常时抛出异常', async () => {
        const testDto = {
          type: NotificationChannelType.EMAIL,
          message: '测试通知消息',
          config: {},
        };

        mockNotificationService.testChannel.mockRejectedValue(new Error('配置错误'));

        await expect(controller.testNotificationChannel(testDto)).rejects.toThrow('配置错误');
      });
    });
  });

  describe('手动触发', () => {
    describe('triggerEvaluation', () => {
      it('应该成功触发告警评估', async () => {
        mockAlertingService.processMetrics.mockResolvedValue(undefined);

        const result = await controller.triggerEvaluation();

        expect(alertingService.processMetrics).toHaveBeenCalledWith([]);
        expect(result.message).toBe('告警评估已触发');
      });

      it('应该在触发失败时抛出异常', async () => {
        mockAlertingService.processMetrics.mockRejectedValue(new Error('评估失败'));

        await expect(controller.triggerEvaluation()).rejects.toThrow('评估失败');
      });
    });
  });

  describe('批量操作', () => {
    describe('batchAcknowledgeAlerts', () => {
      it('应该成功批量确认告警', async () => {
        const body = {
          alertIds: ['alert-1', 'alert-2', 'alert-3'],
          acknowledgedBy: 'user-123',
        };

        const acknowledgedAlert = {
          ...mockAlert,
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: 'user-123',
          acknowledgedAt: new Date(),
        };
        mockAlertingService.acknowledgeAlert.mockResolvedValue(acknowledgedAlert);

        const result = await controller.batchAcknowledgeAlerts(body);

        expect(alertingService.acknowledgeAlert).toHaveBeenCalledTimes(3);
        expect(result.succeeded.length).toBe(3);
        expect(result.failed.length).toBe(0);
      });

      it('应该处理批量确认中的部分失败', async () => {
        const body = {
          alertIds: ['alert-1', 'alert-2'],
          acknowledgedBy: 'user-123',
        };

        const acknowledgedAlert = {
          ...mockAlert,
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: 'user-123',
          acknowledgedAt: new Date(),
        };
        mockAlertingService.acknowledgeAlert
          .mockResolvedValueOnce(acknowledgedAlert)
          .mockRejectedValueOnce(new Error('确认失败'));

        const result = await controller.batchAcknowledgeAlerts(body);

        expect(result.succeeded.length).toBe(1);
        expect(result.failed.length).toBe(1);
      });
    });

    describe('batchResolveAlerts', () => {
      it('应该成功批量解决告警', async () => {
        const body = {
          alertIds: ['alert-1', 'alert-2'],
          resolvedBy: 'user-123',
        };

        const mockQueryResult = {
          alerts: [
            { id: 'alert-1', ruleId: 'rule-1' },
            { id: 'alert-2', ruleId: 'rule-2' },
          ],
          total: 2,
          page: 1,
          limit: 1000,
        };

        mockAlertHistoryService.queryAlerts.mockResolvedValue(mockQueryResult);
        mockAlertingService.resolveAlert.mockResolvedValue(true);

        const result = await controller.batchResolveAlerts(body);

        expect(alertingService.resolveAlert).toHaveBeenCalledTimes(2);
        expect(result.succeeded.length).toBe(2);
        expect(result.failed.length).toBe(0);
      });
    });
  });
});