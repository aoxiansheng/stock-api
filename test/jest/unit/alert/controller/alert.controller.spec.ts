import { Test, TestingModule } from '@nestjs/testing';
import { AlertController } from '../../../../../src/alert/controller/alert.controller';
import { AlertingService } from '../../../../../src/alert/services/alerting.service';
import { AlertHistoryService } from '../../../../../src/alert/services/alert-history.service';
import { NotificationService } from '../../../../../src/alert/services/notification.service';
import { PaginationService } from '../../../../../src/common/modules/pagination/services/pagination.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertQueryDto, AcknowledgeAlertDto, ResolveAlertDto, TestNotificationChannelDto, TriggerAlertDto } from '../../../../../src/alert/dto';
import { IAlertRule, IAlert, IAlertStats } from '../../../../../src/alert/interfaces';
import { NotificationChannelType, AlertSeverity, AlertStatus } from '../../../../../src/alert/types/alert.types';
import { PaginatedDataDto } from '../../../../../src/common/modules/pagination/dto/paginated-data';
import { AlertResponseDto } from '../../../../../src/alert/dto/alert.dto';
import { NotificationChannelDto } from '../../../../../src/alert/dto/notification-channel.dto';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../../../../../src/auth/services/permission.service';
import { UnifiedPermissionsGuard } from '../../../../../src/auth/guards/unified-permissions.guard';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../../../../../src/auth/guards/apikey-auth.guard';
import { RateLimitGuard } from '../../../../../src/auth/guards/rate-limit.guard';

const mockAlertingService = () => ({
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
});

const mockAlertHistoryService = () => ({
  getActiveAlerts: jest.fn(),
  queryAlerts: jest.fn(),
  getAlertById: jest.fn(),
});

const mockNotificationService = () => ({
  testChannel: jest.fn(),
});

const mockPaginationService = () => ({
  createPaginatedResponse: jest.fn(),
});

const mockPermissionService = () => ({
  checkPermissions: jest.fn().mockReturnValue({ allowed: true, missingPermissions: [], missingRoles: [], duration: 0, details: '' }),
});

// 模拟守卫
const mockUnifiedPermissionsGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockJwtAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockApiKeyAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockRateLimitGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe('AlertController', () => {
  let controller: AlertController;
  let alertingService: jest.Mocked<ReturnType<typeof mockAlertingService>>;
  let alertHistoryService: jest.Mocked<ReturnType<typeof mockAlertHistoryService>>;
  let notificationService: jest.Mocked<ReturnType<typeof mockNotificationService>>;
  let paginationService: jest.Mocked<ReturnType<typeof mockPaginationService>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertController],
      providers: [
        {
          provide: AlertingService,
          useFactory: mockAlertingService,
        },
        {
          provide: AlertHistoryService,
          useFactory: mockAlertHistoryService,
        },
        {
          provide: NotificationService,
          useFactory: mockNotificationService,
        },
        {
          provide: PaginationService,
          useFactory: mockPaginationService,
        },
        {
          provide: PermissionService,
          useFactory: mockPermissionService,
        },
        {
          provide: Reflector,
          useValue: new Reflector(),
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: mockUnifiedPermissionsGuard,
        },
        {
          provide: JwtAuthGuard,
          useValue: mockJwtAuthGuard,
        },
        {
          provide: ApiKeyAuthGuard,
          useValue: mockApiKeyAuthGuard,
        },
        {
          provide: RateLimitGuard,
          useValue: mockRateLimitGuard,
        },
      ],
    })
    .overrideGuard(UnifiedPermissionsGuard)
    .useValue(mockUnifiedPermissionsGuard)
    .overrideGuard(JwtAuthGuard)
    .useValue(mockJwtAuthGuard)
    .overrideGuard(ApiKeyAuthGuard)
    .useValue(mockApiKeyAuthGuard)
    .overrideGuard(RateLimitGuard)
    .useValue(mockRateLimitGuard)
    .compile();

    controller = module.get<AlertController>(AlertController);
    alertingService = module.get(AlertingService);
    alertHistoryService = module.get(AlertHistoryService);
    notificationService = module.get(NotificationService);
    paginationService = module.get(PaginationService);

    // Reset rate limit for each test
    (controller as any).triggerRateLimit.clear();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== 告警规则管理 ====================

  describe('createRule', () => {
    it('should create an alert rule', async () => {
      const createRuleDto: CreateAlertRuleDto = {
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: 'gt',
        threshold: 80,
        severity: AlertSeverity.WARNING,
        enabled: true,
        duration: 60,
        cooldown: 300,
        channels: [{ type: NotificationChannelType.EMAIL, config: {}, enabled: true, retryCount: 3, timeout: 30 } as NotificationChannelDto],
      };
      const mockRule: IAlertRule = { id: '1', ...createRuleDto, createdAt: new Date(), updatedAt: new Date() };
      alertingService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createRule(createRuleDto);
      expect(result).toEqual(mockRule);
      expect(alertingService.createRule).toHaveBeenCalledWith(createRuleDto);
    });
  });

  describe('getRules', () => {
    it('should return all alert rules', async () => {
      const mockRules: IAlertRule[] = [{ id: '1', name: 'Test Rule' } as IAlertRule];
      alertingService.getRules.mockResolvedValue(mockRules);

      const result = await controller.getRules();
      expect(result).toEqual(mockRules);
      expect(alertingService.getRules).toHaveBeenCalled();
    });
  });

  describe('getRuleById', () => {
    it('should return an alert rule by ID', async () => {
      const mockRule: IAlertRule = { id: '1', name: 'Test Rule' } as IAlertRule;
      alertingService.getRuleById.mockResolvedValue(mockRule);

      const result = await controller.getRuleById('1');
      expect(result).toEqual(mockRule);
      expect(alertingService.getRuleById).toHaveBeenCalledWith('1');
    });

    it('should return null if rule not found', async () => {
      alertingService.getRuleById.mockResolvedValue(null);
      const result = await controller.getRuleById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateRule', () => {
    it('should update an alert rule', async () => {
      const updateRuleDto: UpdateAlertRuleDto = { name: 'Updated Rule' };
      const mockRule: IAlertRule = { id: '1', name: 'Updated Rule' } as IAlertRule;
      alertingService.updateRule.mockResolvedValue(mockRule);

      const result = await controller.updateRule('1', updateRuleDto);
      expect(result).toEqual(mockRule);
      expect(alertingService.updateRule).toHaveBeenCalledWith('1', updateRuleDto);
    });

    it('should return null if rule not found', async () => {
      alertingService.updateRule.mockResolvedValue(null);
      const result = await controller.updateRule('nonexistent', {});
      expect(result).toBeNull();
    });
  });

  describe('deleteRule', () => {
    it('should delete an alert rule', async () => {
      alertingService.deleteRule.mockResolvedValue(undefined);
      await expect(controller.deleteRule('1')).resolves.toBeUndefined();
      expect(alertingService.deleteRule).toHaveBeenCalledWith('1');
    });
  });

  describe('toggleRule', () => {
    it('should toggle an alert rule to enabled', async () => {
      alertingService.toggleRule.mockResolvedValue(undefined);
      await expect(controller.toggleRule('1', { enabled: true })).resolves.toBeUndefined();
      expect(alertingService.toggleRule).toHaveBeenCalledWith('1', true);
    });

    it('should toggle an alert rule to disabled', async () => {
      alertingService.toggleRule.mockResolvedValue(undefined);
      await expect(controller.toggleRule('1', { enabled: false })).resolves.toBeUndefined();
      expect(alertingService.toggleRule).toHaveBeenCalledWith('1', false);
    });
  });

  // ==================== 告警管理 ====================

  describe('getActiveAlerts', () => {
    const mockAlerts: IAlert[] = [
      { 
        id: 'a1', 
        ruleId: 'r1', 
        ruleName: 'CPU告警规则',
        severity: AlertSeverity.CRITICAL, 
        metric: 'cpu_usage',
        value: 95,
        threshold: 90,
        status: AlertStatus.FIRING,
        message: 'CPU使用率过高',
        startTime: new Date('2023-01-01T10:00:00Z'),
        tags: {},
        context: {}
      },
      { 
        id: 'a2', 
        ruleId: 'r2', 
        ruleName: '内存告警规则',
        severity: AlertSeverity.WARNING, 
        metric: 'memory_usage',
        value: 85,
        threshold: 80,
        status: AlertStatus.FIRING,
        message: '内存使用率过高',
        startTime: new Date('2023-01-01T11:00:00Z'),
        tags: {},
        context: {}
      }
    ];

    beforeEach(() => {
      alertHistoryService.getActiveAlerts.mockResolvedValue(mockAlerts);
    });

    it('should return all active alerts if no query is provided', async () => {
      const result = await controller.getActiveAlerts();
      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({
        id: 'a1',
        ruleId: 'r1',
        severity: AlertSeverity.CRITICAL
      });
      expect(alertHistoryService.getActiveAlerts).toHaveBeenCalled();
    });

    it('should filter active alerts by ruleId', async () => {
      const query: AlertQueryDto = { ruleId: 'r1' };
      const result = await controller.getActiveAlerts(query);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a1');
    });

    it('should filter active alerts by severity', async () => {
      const query: AlertQueryDto = { severity: AlertSeverity.WARNING };
      const result = await controller.getActiveAlerts(query);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a2');
    });

    it('should filter active alerts by metric', async () => {
      const query: AlertQueryDto = { metric: 'cpu' };
      const result = await controller.getActiveAlerts(query);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a1');
    });

    it('should filter active alerts by multiple criteria', async () => {
      const query: AlertQueryDto = { ruleId: 'r1', severity: AlertSeverity.CRITICAL };
      const result = await controller.getActiveAlerts(query);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a1');
    });

    it('should return empty array if no alerts match filters', async () => {
      const query: AlertQueryDto = { ruleId: 'nonexistent' };
      const result = await controller.getActiveAlerts(query);
      expect(result.length).toBe(0);
    });
  });

  describe('getAlertHistory', () => {
    it('should return paginated alert history', async () => {
      const query: AlertQueryDto = { page: 1, limit: 10 };
      const mockAlerts: IAlert[] = [
        {
          id: '1',
          ruleId: 'r1',
          ruleName: 'CPU告警规则',
          severity: AlertSeverity.CRITICAL,
          metric: 'cpu_usage',
          value: 95,
          threshold: 90,
          status: AlertStatus.FIRING,
          message: 'CPU使用率过高',
          startTime: new Date('2023-01-01T10:00:00Z'),
          tags: {},
          context: {}
        }
      ];
      const mockPaginatedResult: PaginatedDataDto<AlertResponseDto> = {
        items: [AlertResponseDto.fromEntity(mockAlerts[0])],
        pagination: { total: 1, totalPages: 1, page: 1, limit: 10, hasNext: false, hasPrev: false },
      };

      alertHistoryService.queryAlerts.mockResolvedValue({ alerts: mockAlerts, total: 1 });
      paginationService.createPaginatedResponse.mockReturnValue(mockPaginatedResult);

      const result = await controller.getAlertHistory(query);
      expect(result).toEqual(mockPaginatedResult);
      expect(alertHistoryService.queryAlerts).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        limit: 10,
      }));
      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        expect.any(Array),
        1,
        10,
        1,
      );
    });

    it('should convert string dates in query to Date objects', async () => {
      const query: AlertQueryDto = { startTime: '2023-01-01T00:00:00Z', endTime: '2023-01-02T00:00:00Z' };
      alertHistoryService.queryAlerts.mockResolvedValue({ alerts: [], total: 0 });
      paginationService.createPaginatedResponse.mockReturnValue({ data: [], pagination: { totalItems: 0, totalPages: 0, currentPage: 1, itemsPerPage: 20 } });

      await controller.getAlertHistory(query);
      expect(alertHistoryService.queryAlerts).toHaveBeenCalledWith(expect.objectContaining({
        startTime: expect.any(Date),
        endTime: expect.any(Date),
      }));
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', async () => {
      const mockStats: IAlertStats = { totalRules: 10, enabledRules: 5, activeAlerts: 2, criticalAlerts: 1, warningAlerts: 1, infoAlerts: 0, totalAlertsToday: 3, resolvedAlertsToday: 1, averageResolutionTime: 60 };
      alertingService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getAlertStats();
      expect(result).toEqual(mockStats);
      expect(alertingService.getStats).toHaveBeenCalled();
    });
  });

  describe('getAlertById', () => {
    it('should return an alert by ID', async () => {
      const mockAlert: IAlert = {
        id: '1',
        ruleId: 'r1',
        ruleName: 'Test',
        metric: 'm',
        value: 1,
        threshold: 1,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'test',
        startTime: new Date(),
        endTime: new Date(),
        acknowledgedBy: 'user',
        acknowledgedAt: new Date(),
        resolvedBy: 'user',
        resolvedAt: new Date(),
        tags: {},
        context: {}
      };
      alertHistoryService.getAlertById.mockResolvedValue(mockAlert);

      const result = await controller.getAlertById('1');
      expect(result).toMatchObject({
        id: '1',
        ruleId: 'r1',
        ruleName: 'Test'
      });
      expect(result?.id).toBe('1');
      expect(alertHistoryService.getAlertById).toHaveBeenCalledWith('1');
    });

    it('should return null if alert not found', async () => {
      alertHistoryService.getAlertById.mockResolvedValue(null);
      const result = await controller.getAlertById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      const acknowledgeDto: AcknowledgeAlertDto = { acknowledgedBy: 'user1' };
      const mockAlert: IAlert = {
        id: '1',
        ruleId: 'r1',
        ruleName: 'Test',
        metric: 'test',
        value: 100,
        threshold: 90,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'Test alert',
        startTime: new Date(),
        tags: {},
        context: {},
        acknowledgedBy: 'user',
        acknowledgedAt: new Date(),
      };
      alertingService.acknowledgeAlert.mockResolvedValue(mockAlert);

      const result = await controller.acknowledgeAlert('1', acknowledgeDto);
      expect(result).toMatchObject({
        id: '1',
        ruleId: 'r1',
        acknowledgedBy: 'user'
      });
      expect(result.acknowledgedBy).toBe('user');
      expect(alertingService.acknowledgeAlert).toHaveBeenCalledWith('1', 'user1');
    });
  });

  describe('resolveAlert', () => {
    const mockAlert: IAlert = {
      id: '1', 
      ruleId: 'r1', 
      ruleName: '测试告警',
      metric: 'cpu_usage',
      value: 95,
      threshold: 90,
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.FIRING,
      message: '测试告警消息',
      startTime: new Date('2023-01-01T10:00:00Z'),
      tags: {},
      context: {}
    };

    beforeEach(() => {
      // 为 resolveAlert 方法提供必要的模拟
      alertHistoryService.queryAlerts.mockResolvedValue({ 
        alerts: [mockAlert], 
        total: 1 
      });
    });

    it('should resolve an alert', async () => {
      const resolveDto: ResolveAlertDto = { resolvedBy: 'user1' };
      alertingService.resolveAlert.mockResolvedValue(undefined);

      await expect(controller.resolveAlert('1', resolveDto)).resolves.toBeUndefined();
      expect(alertingService.resolveAlert).toHaveBeenCalledWith('1', 'user1', 'r1');
    });

    it('should throw NotFoundException if alert not found', async () => {
      alertHistoryService.queryAlerts.mockResolvedValue({ alerts: [], total: 0 });
      const resolveDto: ResolveAlertDto = { resolvedBy: 'user1' };

      await expect(controller.resolveAlert('nonexistent', resolveDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== 通知渠道测试 ====================

  describe('testNotificationChannel', () => {
    it('should test a notification channel successfully', async () => {
      const testDto: TestNotificationChannelDto & { type: NotificationChannelType; config: Record<string, any> } = {
        type: NotificationChannelType.EMAIL,
        config: { to: 'test@example.com' },
        message: 'Test message',
      };
      notificationService.testChannel.mockResolvedValue(true);

      const result = await controller.testNotificationChannel(testDto);
      expect(result).toEqual({ success: true });
      expect(notificationService.testChannel).toHaveBeenCalledWith(
        testDto.type,
        testDto.config,
      );
    });

    it('should return success: false if channel test fails', async () => {
      const testDto: TestNotificationChannelDto & { type: NotificationChannelType; config: Record<string, any> } = {
        type: NotificationChannelType.EMAIL,
        config: { to: 'test@example.com' },
        message: 'Test message',
      };
      notificationService.testChannel.mockResolvedValue(false);

      const result = await controller.testNotificationChannel(testDto);
      expect(result).toEqual({ success: false });
    });
  });

  // ==================== 手动触发 ====================

  describe('triggerEvaluation', () => {
    const mockReq = { user: { id: 'testuser' } };

    beforeEach(() => {
      jest.useFakeTimers();
      // 确保每个测试开始时重置限制计数器
      (controller as any).triggerRateLimit.clear();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should trigger evaluation successfully', async () => {
      alertingService.processMetrics.mockResolvedValue(undefined);
      const result = await controller.triggerEvaluation({metrics: []}, mockReq);
      expect(result.message).toEqual('告警评估已触发');
      expect(alertingService.processMetrics).toHaveBeenCalledWith([]);
    });

    it('should trigger evaluation for a specific rule', async () => {
      const triggerDto: TriggerAlertDto = { ruleId: 'r1', metrics: [] };
      alertingService.getRuleById.mockResolvedValue({ id: 'r1' } as IAlertRule);
      alertingService.processMetrics.mockResolvedValue(undefined);

      const result = await controller.triggerEvaluation(triggerDto, mockReq);
      expect(result.message).toEqual('告警规则 r1 评估已触发');
      expect(alertingService.getRuleById).toHaveBeenCalledWith('r1');
      expect(alertingService.processMetrics).toHaveBeenCalledWith([]);
    });

    it('should trigger evaluation with metrics data', async () => {
      const triggerDto: TriggerAlertDto = {
        metrics: [{ metric: 'test_metric', value: 100, timestamp: new Date(), tags: {} }],
      };
      alertingService.processMetrics.mockResolvedValue(undefined);

      const result = await controller.triggerEvaluation(triggerDto, mockReq);
      expect(result.message).toContain('处理了 1 个指标');
      expect(alertingService.processMetrics).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ metric: 'test_metric', value: 100, timestamp: expect.any(Date) })
      ]));
    });

    it('should throw BadRequestException if specified rule does not exist', async () => {
      const triggerDto: TriggerAlertDto = { ruleId: 'nonexistent', metrics: [] };
      alertingService.getRuleById.mockResolvedValue(null);

      await expect(controller.triggerEvaluation(triggerDto, mockReq)).rejects.toThrow(
        new BadRequestException('指定的告警规则不存在'),
      );
    });

    it('should apply rate limiting', async () => {
      alertingService.processMetrics.mockResolvedValue(undefined);

      // Trigger 5 times within the window
      for (let i = 0; i < 5; i++) {
        await controller.triggerEvaluation({metrics: []}, mockReq);
      }

      // The 6th trigger should fail
      await expect(controller.triggerEvaluation({metrics: []}, mockReq)).rejects.toThrow(
        new BadRequestException('手动触发频率过高，请稍后再试'),
      );

      // Advance time to reset the window
      jest.advanceTimersByTime(60 * 1000 + 1);

      // Should succeed after reset
      await expect(controller.triggerEvaluation({metrics: []}, mockReq)).resolves.toBeDefined();
    });
  });

  // ==================== 批量操作 ====================

  describe('batchAcknowledgeAlerts', () => {
    const mockAlert: IAlert = {
      id: '1', 
      ruleId: 'r1', 
      ruleName: '测试告警',
      metric: 'cpu_usage',
      value: 95,
      threshold: 90,
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.ACKNOWLEDGED,
      message: '测试告警消息',
      startTime: new Date('2023-01-01T10:00:00Z'),
      acknowledgedBy: 'user1',
      acknowledgedAt: new Date(),
      tags: {},
      context: {}
    };

    it('should batch acknowledge alerts successfully', async () => {
      alertingService.acknowledgeAlert.mockResolvedValue(mockAlert);

      const body = { alertIds: ['a1', 'a2'], acknowledgedBy: 'user1' };
      const result = await controller.batchAcknowledgeAlerts(body);

      expect(result.succeeded).toEqual(['a1', 'a2']);
      expect(result.failed).toEqual([]);
      expect(alertingService.acknowledgeAlert).toHaveBeenCalledTimes(2);
      expect(alertingService.acknowledgeAlert).toHaveBeenCalledWith('a1', 'user1');
      expect(alertingService.acknowledgeAlert).toHaveBeenCalledWith('a2', 'user1');
    });

    it('should handle failures in batch acknowledge', async () => {
      alertingService.acknowledgeAlert
        .mockResolvedValueOnce(mockAlert)
        .mockRejectedValueOnce(new Error('Failed to acknowledge'));

      const body = { alertIds: ['a1', 'a2'], acknowledgedBy: 'user1' };
      const result = await controller.batchAcknowledgeAlerts(body);

      expect(result.succeeded).toEqual(['a1']);
      expect(result.failed).toEqual(['a2']);
    });
  });

  describe('batchResolveAlerts', () => {
    // 创建更完整的模拟警报数据
    const mockAlerts: IAlert[] = [
      {
        id: 'a1', 
        ruleId: 'r1', 
        ruleName: '测试告警1',
        metric: 'cpu_usage',
        value: 95,
        threshold: 90,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: '测试告警消息',
        startTime: new Date('2023-01-01T10:00:00Z'),
        tags: {},
        context: {}
      },
      {
        id: 'a2', 
        ruleId: 'r2', 
        ruleName: '测试告警2',
        metric: 'memory_usage',
        value: 85,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: '测试告警消息',
        startTime: new Date('2023-01-01T11:00:00Z'),
        tags: {},
        context: {}
      }
    ];

    beforeEach(() => {
      // 为 batchResolveAlerts 提供必要的模拟
      alertHistoryService.queryAlerts.mockResolvedValue({ alerts: mockAlerts, total: mockAlerts.length });
    });

    it('should batch resolve alerts successfully', async () => {
      alertingService.resolveAlert.mockResolvedValue(undefined);

      const body = { alertIds: ['a1', 'a2'], resolvedBy: 'user1' };
      const result = await controller.batchResolveAlerts(body);

      expect(result.succeeded).toEqual(['a1', 'a2']);
      expect(result.failed).toEqual([]);
      expect(alertingService.resolveAlert).toHaveBeenCalledTimes(2);
      expect(alertingService.resolveAlert).toHaveBeenCalledWith('a1', 'user1', 'r1');
      expect(alertingService.resolveAlert).toHaveBeenCalledWith('a2', 'user1', 'r2');
    });

    it('should handle failures in batch resolve', async () => {
      alertingService.resolveAlert
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed to resolve'));

      const body = { alertIds: ['a1', 'a2'], resolvedBy: 'user1' };
      const result = await controller.batchResolveAlerts(body);

      expect(result.succeeded).toEqual(['a1']);
      expect(result.failed).toEqual(['a2']);
    });

    it('should handle non-existent alerts in batch resolve', async () => {
      alertingService.resolveAlert.mockResolvedValue(undefined);

      const body = { alertIds: ['a1', 'nonexistent'], resolvedBy: 'user1' };
      const result = await controller.batchResolveAlerts(body);

      expect(result.succeeded).toEqual(['a1']);
      expect(result.failed).toEqual(['nonexistent']);
      expect(alertingService.resolveAlert).toHaveBeenCalledTimes(1);
      expect(alertingService.resolveAlert).toHaveBeenCalledWith('a1', 'user1', 'r1');
    });
  });
});