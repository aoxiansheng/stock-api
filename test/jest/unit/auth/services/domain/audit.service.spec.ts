import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '@auth/services/domain/audit.service';
import { createLogger } from '@common/modules/logging';
import { User } from '@auth/schemas/user.schema';
import { ApiKey } from '@auth/schemas/apikey.schema';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';
import { CreateApiKeyDto } from '@auth/dto/apikey.dto';
import { UserRole, Permission } from '@auth/enums/user-role.enum';

// Mock the logger
jest.mock('@common/modules/logging', () => ({
  createLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('AuditService', () => {
  let service: AuditService;
  let logger: jest.Mocked<ReturnType<typeof createLogger>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService],
    }).compile();

    service = module.get<AuditService>(AuditService);
    logger = createLogger('') as jest.Mocked<ReturnType<typeof createLogger>>;
    jest.spyOn(service as any, 'storeAuditEvent').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'alertSecurityTeam').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logUserRegistration', () => {
    it('should log a successful user registration', async () => {
      const user: Partial<User> = { id: '1', username: 'test', email: 'test@test.com', role: UserRole.DEVELOPER };
      await service.logUserRegistration(user as User);
      expect(logger.log).toHaveBeenCalledWith('用户注册审计事件', expect.objectContaining({ eventType: 'USER_REGISTRATION_SUCCESS' }));
    });
  });

  describe('logUserRegistrationFailure', () => {
    it('should log a failed user registration', async () => {
      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };
      await service.logUserRegistrationFailure(dto, new Error('Failed'));
      expect(logger.warn).toHaveBeenCalledWith('用户注册失败审计事件', expect.objectContaining({ eventType: 'USER_REGISTRATION_FAILURE' }));
    });
  });

  describe('logUserLogin', () => {
    it('should log a successful user login', async () => {
        const user: Partial<User> = { id: '1', username: 'test', role: UserRole.DEVELOPER };
        await service.logUserLogin(user as User);
        expect(logger.log).toHaveBeenCalledWith('用户登录成功审计事件', expect.objectContaining({ eventType: 'USER_LOGIN_SUCCESS' }));
    });
  });

  describe('logUserLoginFailure', () => {
    it('should log a failed user login', async () => {
        const dto: LoginDto = { username: 'test', password: 'p' };
        await service.logUserLoginFailure(dto, new Error('Failed'));
        expect(logger.warn).toHaveBeenCalledWith('用户登录失败审计事件', expect.objectContaining({ eventType: 'USER_LOGIN_FAILURE' }));
    });
  });

  describe('logApiKeyCreation', () => {
    it('should log a successful API key creation', async () => {
        const apiKey: Partial<ApiKey> = { name: 'key', appKey: 'key', permissions: [Permission.DATA_READ] };
        await service.logApiKeyCreation('1', apiKey as ApiKey);
        expect(logger.log).toHaveBeenCalledWith('API密钥创建审计事件', expect.objectContaining({ eventType: 'API_KEY_CREATION_SUCCESS' }));
    });
  });

  describe('logApiKeyCreationFailure', () => {
    it('should log a failed API key creation', async () => {
        const dto: CreateApiKeyDto = { name: 'key', permissions: [Permission.DATA_READ] };
        await service.logApiKeyCreationFailure('1', dto, new Error('Failed'));
        expect(logger.warn).toHaveBeenCalledWith('API密钥创建失败审计事件', expect.objectContaining({ eventType: 'API_KEY_CREATION_FAILURE' }));
    });
  });

  describe('logSecurityViolation', () => {
    it('should log a security violation and alert the security team', async () => {
        await service.logSecurityViolation('test_violation', { detail: 'some detail' });
        expect(logger.error).toHaveBeenCalledWith('安全违规审计事件', expect.objectContaining({ eventType: 'SECURITY_VIOLATION' }));
        expect((service as any).alertSecurityTeam).toHaveBeenCalled();
    });
  });

  // Add more tests for other log methods to ensure full coverage
  const eventMap = {
    logTokenRefresh: 'TOKEN_REFRESH_SUCCESS',
    logTokenRefreshFailure: 'TOKEN_REFRESH_FAILURE',
    logApiKeyUsage: 'API_KEY_USAGE',
    logApiKeyValidationFailure: 'API_KEY_VALIDATION_FAILURE',
    logApiKeyRevocation: 'API_KEY_REVOCATION_SUCCESS',
    logApiKeyRevocationFailure: 'API_KEY_REVOCATION_FAILURE',
    logApiKeyRateLimitReset: 'API_KEY_RATE_LIMIT_RESET',
    logApiKeyRateLimitResetFailure: 'API_KEY_RATE_LIMIT_RESET_FAILURE',
    logAdminUserListAccess: 'ADMIN_USER_LIST_ACCESS',
    logAdminUserListAccessFailure: 'ADMIN_USER_LIST_ACCESS_FAILURE',
  };

  for (const [methodName, eventType] of Object.entries(eventMap)) {
    describe(methodName, () => {
        it(`should log a ${eventType} event`, async () => {
            const logMethod = (service as any)[methodName];
            const isFailure = methodName.includes('Failure');
            const logSpy = isFailure ? logger.warn : logger.log;
            if (methodName === 'logApiKeyUsage') {
                await logMethod({ appKey: 'key' });
                expect(logger.debug).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ eventType }));
            } else {
                await logMethod('param1', isFailure ? new Error('fail') : 'param2', isFailure ? new Error('fail') : undefined);
                expect(logSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ eventType }));
            }
        });
    });
  }
});