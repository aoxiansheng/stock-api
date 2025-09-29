import { AuditService } from '@auth/services/domain/audit.service';
import { User } from '@auth/schemas/user.schema';
import { ApiKey } from '@auth/schemas/apikey.schema';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';
import { CreateApiKeyDto } from '@auth/dto/apikey.dto';
import { UserRole, Permission } from '@auth/enums/user-role.enum';

// Mock the logger module
jest.mock('@common/modules/logging', () => ({
  createLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock crypto module since it's required
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked_hash_value'),
  }),
}));

describe('AuditService', () => {
  let service: AuditService;
  let mockLogger: jest.Mocked<any>;

  beforeEach(() => {
    // Direct instantiation for simple service
    service = new AuditService();
    mockLogger = (service as any).logger;

    // Mock the methods that don't exist in the actual runtime
    // We'll only test the logging behavior, not the internal implementation
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logUserRegistration', () => {
    it('should log a successful user registration', async () => {
      const user: Partial<User> = { id: '1', username: 'test', email: 'test@test.com', role: UserRole.DEVELOPER };
      await service.logUserRegistration(user as User);
      expect(mockLogger.log).toHaveBeenCalledWith('用户注册审计事件', expect.objectContaining({ eventType: 'USER_REGISTRATION_SUCCESS' }));
    });
  });

  describe('logUserRegistrationFailure', () => {
    it('should log a failed user registration', async () => {
      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };
      await service.logUserRegistrationFailure(dto, new Error('Failed'));
      expect(mockLogger.warn).toHaveBeenCalledWith('用户注册失败审计事件', expect.objectContaining({ eventType: 'USER_REGISTRATION_FAILURE' }));
    });
  });

  describe('logUserLogin', () => {
    it('should log a successful user login', async () => {
        const user: Partial<User> = { id: '1', username: 'test', role: UserRole.DEVELOPER };
        await service.logUserLogin(user as User);
        expect(mockLogger.log).toHaveBeenCalledWith('用户登录成功审计事件', expect.objectContaining({ eventType: 'USER_LOGIN_SUCCESS' }));
    });
  });

  describe('logUserLoginFailure', () => {
    it('should log a failed user login', async () => {
        const dto: LoginDto = { username: 'test', password: 'p' };
        await service.logUserLoginFailure(dto, new Error('Failed'));
        expect(mockLogger.warn).toHaveBeenCalledWith('用户登录失败审计事件', expect.objectContaining({ eventType: 'USER_LOGIN_FAILURE' }));
    });
  });

  describe('logApiKeyCreation', () => {
    it('should log a successful API key creation', async () => {
        const apiKey: Partial<ApiKey> = { name: 'key', appKey: 'key', permissions: [Permission.DATA_READ] };
        await service.logApiKeyCreation('1', apiKey as ApiKey);
        expect(mockLogger.log).toHaveBeenCalledWith('API密钥创建审计事件', expect.objectContaining({ eventType: 'API_KEY_CREATION_SUCCESS' }));
    });
  });

  describe('logApiKeyCreationFailure', () => {
    it('should log a failed API key creation', async () => {
        const dto: CreateApiKeyDto = { name: 'key', permissions: [Permission.DATA_READ] };
        await service.logApiKeyCreationFailure('1', dto, new Error('Failed'));
        expect(mockLogger.warn).toHaveBeenCalledWith('API密钥创建失败审计事件', expect.objectContaining({ eventType: 'API_KEY_CREATION_FAILURE' }));
    });
  });

  describe('logSecurityViolation', () => {
    it('should log a security violation', async () => {
        // We'll only test the logging part since private methods are harder to mock
        await service.logSecurityViolation('test_violation', { detail: 'some detail' });
        expect(mockLogger.error).toHaveBeenCalledWith('安全违规审计事件', expect.objectContaining({ eventType: 'SECURITY_VIOLATION' }));
    });
  });

  describe('service instantiation', () => {
    it('should be properly instantiated', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuditService);
    });

    it('should have a logger instance', () => {
      expect(mockLogger).toBeDefined();
      expect(mockLogger.log).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.debug).toBeDefined();
    });
  });
});