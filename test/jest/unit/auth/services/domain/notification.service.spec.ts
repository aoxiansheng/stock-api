import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthEventNotificationService } from '@auth/services/domain/notification.service';
import { User } from '@auth/schemas/user.schema';
import { ApiKey, RateLimit } from '@auth/schemas/apikey.schema';
import { UserRole, Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';

// Mock SYSTEM_STATUS_EVENTS
jest.mock('../../../monitoring/contracts/events/system-status.events', () => ({
  SYSTEM_STATUS_EVENTS: {
    METRIC_COLLECTED: 'system.status.metric.collected',
  },
}));

describe('AuthEventNotificationService', () => {
  let service: AuthEventNotificationService;
  let eventBus: jest.Mocked<EventEmitter2>;

  const mockUser: User = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.DEVELOPER,
    status: OperationStatus.ACTIVE,
  } as User;

  const mockApiKey: ApiKey = {
    appKey: 'app-key',
    accessToken: 'access-token',
    name: 'Test API Key',
    permissions: [Permission.DATA_READ],
    rateLimit: { requestLimit: 100, window: '1h' } as RateLimit,
    status: OperationStatus.ACTIVE,
    totalRequestCount: 0,
  } as ApiKey;

  beforeEach(async () => {
    const mockEventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthEventNotificationService,
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<AuthEventNotificationService>(AuthEventNotificationService);
    eventBus = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRegistrationSuccessEvent', () => {
    it('should emit business metric and user notification events', async () => {
      await service.sendRegistrationSuccessEvent(mockUser);
      expect(eventBus.emit).toHaveBeenCalledWith('system.status.metric.collected', expect.any(Object));
      expect(eventBus.emit).toHaveBeenCalledWith('USER_NOTIFICATION', expect.any(Object));
    });

    it('should call sendWelcomeEmail', async () => {
        const spy = jest.spyOn(service as any, 'sendWelcomeEmail').mockResolvedValue(undefined);
        await service.sendRegistrationSuccessEvent(mockUser);
        // Allow setImmediate to run
        await new Promise(resolve => setImmediate(resolve));
        expect(spy).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('sendRegistrationFailureEvent', () => {
    it('should emit business metric and security alert events', async () => {
        const dto: CreateUserDto = { username: 'u', email: 'e@e.com', password: 'p' };
        await service.sendRegistrationFailureEvent(dto, new Error('fail'));
        expect(eventBus.emit).toHaveBeenCalledWith('system.status.metric.collected', expect.any(Object));
        expect(eventBus.emit).toHaveBeenCalledWith('SECURITY_ALERT', expect.any(Object));
    });
  });

  describe('sendLoginSuccessEvent', () => {
    it('should emit business metric and user notification events', async () => {
        await service.sendLoginSuccessEvent(mockUser);
        expect(eventBus.emit).toHaveBeenCalledWith('system.status.metric.collected', expect.any(Object));
        expect(eventBus.emit).toHaveBeenCalledWith('USER_NOTIFICATION', expect.any(Object));
    });

    it('should call checkAndSendLoginReminder', async () => {
        const spy = jest.spyOn(service as any, 'checkAndSendLoginReminder').mockResolvedValue(undefined);
        await service.sendLoginSuccessEvent(mockUser);
        await new Promise(resolve => setImmediate(resolve));
        expect(spy).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('sendLoginFailureEvent', () => {
    it('should emit business metric and security alert events', async () => {
        const dto: LoginDto = { username: 'u', password: 'p' };
        await service.sendLoginFailureEvent(dto, new Error('fail'));
        expect(eventBus.emit).toHaveBeenCalledWith('system.status.metric.collected', expect.any(Object));
        expect(eventBus.emit).toHaveBeenCalledWith('SECURITY_ALERT', expect.any(Object));
    });
  });

  describe('sendApiKeyCreationEvent', () => {
    it('should call sendApiKeyCreatedEmail', async () => {
        const spy = jest.spyOn(service as any, 'sendApiKeyCreatedEmail').mockResolvedValue(undefined);
        await service.sendApiKeyCreationEvent('1', mockApiKey);
        await new Promise(resolve => setImmediate(resolve));
        expect(spy).toHaveBeenCalledWith('1', mockApiKey);
    });
  });

  describe('Error Handling in private methods', () => {
    it('should handle errors in emitBusinessMetric', async () => {
        eventBus.emit.mockImplementation(() => { throw new Error('emit failed'); });
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await (service as any).emitBusinessMetric('test', true);
        expect(loggerSpy).toHaveBeenCalledWith('发送业务监控指标失败', expect.any(Object));
    });

    it('should handle errors in emitTechnicalMetric', async () => {
        eventBus.emit.mockImplementation(() => { throw new Error('emit failed'); });
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await (service as any).emitTechnicalMetric('test', true);
        expect(loggerSpy).toHaveBeenCalledWith('发送技术监控指标失败', expect.any(Object));
    });

    it('should handle errors in emitUserNotification', async () => {
        eventBus.emit.mockImplementation(() => { throw new Error('emit failed'); });
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await (service as any).emitUserNotification('test', {});
        expect(loggerSpy).toHaveBeenCalledWith('发送用户通知事件失败', expect.any(Object));
    });

    it('should handle errors in emitAdminNotification', async () => {
        eventBus.emit.mockImplementation(() => { throw new Error('emit failed'); });
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await (service as any).emitAdminNotification('test', {});
        expect(loggerSpy).toHaveBeenCalledWith('发送管理员通知事件失败', expect.any(Object));
    });

    it('should handle errors in sendSecurityNotification', async () => {
        eventBus.emit.mockImplementation(() => { throw new Error('emit failed'); });
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await (service as any).sendSecurityNotification('test', {});
        expect(loggerSpy).toHaveBeenCalledWith('发送安全通知失败', expect.any(Object));
    });

    it('should handle errors in checkAndSendSecurityAlert', async () => {
        eventBus.emit.mockImplementation(() => { throw new Error('emit failed'); });
        const loggerSpy = jest.spyOn((service as any).logger, 'error');
        await (service as any).checkAndSendSecurityAlert('test', {});
        expect(loggerSpy).toHaveBeenCalledWith('发送安全警报失败', expect.any(Object));
    });
  });
});