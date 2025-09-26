
import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { ApiKeyManagementService } from '@auth/services/domain/apikey-management.service';
import { SessionManagementService } from '@auth/services/domain/session-management.service';
import { SecurityPolicyService } from '@auth/services/domain/security-policy.service';
import { AuditService } from '@auth/services/domain/audit.service';
import { AuthEventNotificationService } from '@auth/services/domain/notification.service';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';
import { CreateApiKeyDto, ApiKeyUsageDto } from '@auth/dto/apikey.dto';
import { User } from '@auth/schemas/user.schema';
import { UserRole, Permission } from '@auth/enums/user-role.enum';
import { DatabaseValidationUtils } from '@common/utils/database.utils';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('AuthFacadeService', () => {
  let service: AuthFacadeService;
  let userAuthService: jest.Mocked<UserAuthenticationService>;
  let apiKeyService: jest.Mocked<ApiKeyManagementService>;
  let sessionService: jest.Mocked<SessionManagementService>;
  let securityService: jest.Mocked<SecurityPolicyService>;
  let auditService: jest.Mocked<AuditService>;
  let notificationService: jest.Mocked<AuthEventNotificationService>;

  const mockUser = { id: 'user123', username: 'testuser', role: UserRole.DEVELOPER } as User;
  const mockRequest = { requestId: 'req-123', correlationId: 'corr-456', headers: { 'user-agent': 'test-agent' }, ip: '127.0.0.1', connection: { remoteAddress: '127.0.0.1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthFacadeService,
        { provide: REQUEST, useValue: mockRequest },
        { provide: UserAuthenticationService, useValue: { registerUser: jest.fn(), authenticateUser: jest.fn(), getAllUsers: jest.fn() } },
        { provide: ApiKeyManagementService, useValue: { createApiKey: jest.fn(), validateApiKey: jest.fn(), getUserApiKeys: jest.fn(), revokeApiKey: jest.fn(), getApiKeyUsage: jest.fn(), resetApiKeyRateLimit: jest.fn() } },
        { provide: SessionManagementService, useValue: { createUserSession: jest.fn(), refreshUserSession: jest.fn() } },
        { provide: SecurityPolicyService, useValue: { validateRegistrationPolicy: jest.fn(), validateLoginPolicy: jest.fn(), validateRefreshTokenPolicy: jest.fn(), validateApiKeyCreationPolicy: jest.fn(), validateApiKeyUsagePolicy: jest.fn(), validateAdminOperationPolicy: jest.fn(), validateRateLimitResetPolicy: jest.fn() } },
        { provide: AuditService, useValue: { logUserRegistration: jest.fn(), logUserRegistrationFailure: jest.fn(), logUserLogin: jest.fn(), logUserLoginFailure: jest.fn(), logTokenRefresh: jest.fn(), logTokenRefreshFailure: jest.fn(), logApiKeyCreation: jest.fn(), logApiKeyCreationFailure: jest.fn(), logApiKeyUsage: jest.fn(), logApiKeyValidationFailure: jest.fn(), logApiKeyRevocation: jest.fn(), logApiKeyRevocationFailure: jest.fn(), logApiKeyRateLimitReset: jest.fn(), logApiKeyRateLimitResetFailure: jest.fn(), logAdminUserListAccess: jest.fn(), logAdminUserListAccessFailure: jest.fn() } },
        { provide: AuthEventNotificationService, useValue: { sendRegistrationSuccessEvent: jest.fn(), sendRegistrationFailureEvent: jest.fn(), sendLoginSuccessEvent: jest.fn(), sendLoginFailureEvent: jest.fn(), sendTokenRefreshEvent: jest.fn(), sendApiKeyCreationEvent: jest.fn(), sendApiKeyRevocationEvent: jest.fn(), sendRateLimitResetEvent: jest.fn(), sendAdminOperationEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthFacadeService>(AuthFacadeService);
    userAuthService = module.get(UserAuthenticationService);
    apiKeyService = module.get(ApiKeyManagementService);
    sessionService = module.get(SessionManagementService);
    securityService = module.get(SecurityPolicyService);
    auditService = module.get(AuditService);
    notificationService = module.get(AuthEventNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };
    it('should orchestrate user registration successfully', async () => {
      userAuthService.registerUser.mockResolvedValue(mockUser);
      const result = await service.register(dto);
      expect(result).toEqual(mockUser);
      expect(securityService.validateRegistrationPolicy).toHaveBeenCalledWith(dto);
      expect(auditService.logUserRegistration).toHaveBeenCalledWith(mockUser);
      expect(notificationService.sendRegistrationSuccessEvent).toHaveBeenCalledWith(mockUser);
    });

    it('should handle registration failure', async () => {
      const error = new Error('fail');
      userAuthService.registerUser.mockRejectedValue(error);
      await expect(service.register(dto)).rejects.toThrow(error);
      expect(auditService.logUserRegistrationFailure).toHaveBeenCalledWith(dto, error);
      expect(notificationService.sendRegistrationFailureEvent).toHaveBeenCalledWith(dto, error);
    });
  });

  describe('login', () => {
    const dto: LoginDto = { username: 'test', password: 'p' };
    it('should orchestrate login successfully', async () => {
        userAuthService.authenticateUser.mockResolvedValue(mockUser);
        sessionService.createUserSession.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
        const result = await service.login(dto);
        expect(result.user).toEqual(mockUser);
        expect(auditService.logUserLogin).toHaveBeenCalledWith(mockUser);
        expect(notificationService.sendLoginSuccessEvent).toHaveBeenCalledWith(mockUser);
    });

    it('should handle login failure', async () => {
        const error = new Error('fail');
        userAuthService.authenticateUser.mockRejectedValue(error);
        await expect(service.login(dto)).rejects.toThrow(error);
        expect(auditService.logUserLoginFailure).toHaveBeenCalledWith(dto, error);
        expect(notificationService.sendLoginFailureEvent).toHaveBeenCalledWith(dto, error);
    });
  });

  describe('refreshToken', () => {
    it('should orchestrate token refresh successfully', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      sessionService.refreshUserSession.mockResolvedValue(tokens);

      const result = await service.refreshToken('old-token');

      expect(result).toEqual(tokens);
      expect(securityService.validateRefreshTokenPolicy).toHaveBeenCalledWith('old-token');
      expect(sessionService.refreshUserSession).toHaveBeenCalledWith('old-token');
      expect(auditService.logTokenRefresh).toHaveBeenCalledWith('old-token');
      expect(notificationService.sendTokenRefreshEvent).toHaveBeenCalledWith('old-token');
    });

    it('should handle refresh token failure', async () => {
        const error = new Error('fail');
        sessionService.refreshUserSession.mockRejectedValue(error);
        await expect(service.refreshToken('t')).rejects.toThrow(error);
        expect(auditService.logTokenRefreshFailure).toHaveBeenCalledWith('t', error);
    });
  });

  describe('createApiKey', () => {
    const dto: CreateApiKeyDto = { name: 'k', permissions: [] };
    const mockApiKey = {
      _id: 'api-key-123',
      name: 'k',
      appKey: 'app-key-123',
      accessToken: 'access-token-123',
      permissions: [Permission.DATA_READ],
      rateLimit: { requestLimit: 100, window: '1m' },
      status: OperationStatus.ACTIVE,
      totalRequestCount: 0
    };

    it('should orchestrate API key creation successfully', async () => {
      apiKeyService.createApiKey.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey('507f1f77bcf86cd799439011', dto);

      expect(result).toEqual(mockApiKey);
      expect(securityService.validateApiKeyCreationPolicy).toHaveBeenCalledWith('507f1f77bcf86cd799439011', dto);
      expect(apiKeyService.createApiKey).toHaveBeenCalledWith('507f1f77bcf86cd799439011', dto);
      expect(auditService.logApiKeyCreation).toHaveBeenCalledWith('507f1f77bcf86cd799439011', mockApiKey);
      expect(notificationService.sendApiKeyCreationEvent).toHaveBeenCalledWith('507f1f77bcf86cd799439011', mockApiKey);
    });

    it('should handle create api key failure', async () => {
        const error = new Error('fail');
        apiKeyService.createApiKey.mockRejectedValue(error);
        await expect(service.createApiKey('507f1f77bcf86cd799439011', dto)).rejects.toThrow(error);
        expect(auditService.logApiKeyCreationFailure).toHaveBeenCalledWith('507f1f77bcf86cd799439011', dto, error);
    });

    it('should validate userId format', async () => {
      await expect(service.createApiKey('invalid-id', dto)).rejects.toThrow();
    });
  });

  describe('validateApiKey', () => {
    const mockApiKeyDoc = { _id: 'api-key-123', appKey: 'app-key-123', isActive: true } as any;

    it('should orchestrate API key validation successfully', async () => {
      apiKeyService.validateApiKey.mockResolvedValue(mockApiKeyDoc);

      const result = await service.validateApiKey('app-key-123', 'access-token-123');

      expect(result).toEqual(mockApiKeyDoc);
      expect(securityService.validateApiKeyUsagePolicy).toHaveBeenCalledWith('app-key-123');
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith('app-key-123', 'access-token-123');
    });

    it('should handle validate api key failure', async () => {
        const error = new Error('fail');
        apiKeyService.validateApiKey.mockRejectedValue(error);
        await expect(service.validateApiKey('a', 't')).rejects.toThrow(error);
        expect(auditService.logApiKeyValidationFailure).toHaveBeenCalledWith('a', error);
    });
  });

  describe('revokeApiKey', () => {
    it('should orchestrate API key revocation successfully', async () => {
      apiKeyService.revokeApiKey.mockResolvedValue(undefined);

      await service.revokeApiKey('app-key-123', '507f1f77bcf86cd799439011');

      expect(apiKeyService.revokeApiKey).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
      expect(auditService.logApiKeyRevocation).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
      expect(notificationService.sendApiKeyRevocationEvent).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
    });

    it('should handle revoke api key failure', async () => {
        const error = new Error('fail');
        apiKeyService.revokeApiKey.mockRejectedValue(error);
        await expect(service.revokeApiKey('a', '507f1f77bcf86cd799439011')).rejects.toThrow(error);
        expect(auditService.logApiKeyRevocationFailure).toHaveBeenCalledWith('a', '507f1f77bcf86cd799439011', error);
    });

    it('should validate userId format for revocation', async () => {
      await expect(service.revokeApiKey('app-key', 'invalid-id')).rejects.toThrow();
    });
  });

  describe('resetApiKeyRateLimit', () => {
    it('should orchestrate rate limit reset successfully', async () => {
      const result = { success: true };
      apiKeyService.resetApiKeyRateLimit.mockResolvedValue(result);

      const response = await service.resetApiKeyRateLimit('app-key-123', '507f1f77bcf86cd799439011');

      expect(response).toEqual(result);
      expect(securityService.validateRateLimitResetPolicy).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
      expect(apiKeyService.resetApiKeyRateLimit).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
      expect(auditService.logApiKeyRateLimitReset).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
      expect(notificationService.sendRateLimitResetEvent).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
    });

    it('should handle reset api key rate limit failure', async () => {
        const error = new Error('fail');
        apiKeyService.resetApiKeyRateLimit.mockRejectedValue(error);
        await expect(service.resetApiKeyRateLimit('a', '507f1f77bcf86cd799439011')).rejects.toThrow(error);
        expect(auditService.logApiKeyRateLimitResetFailure).toHaveBeenCalledWith('a', '507f1f77bcf86cd799439011', error);
    });

    it('should validate userId format for rate limit reset', async () => {
      await expect(service.resetApiKeyRateLimit('app-key', 'invalid-id')).rejects.toThrow();
    });
  });

  describe('getAllUsers', () => {
    const mockUsersResult = {
      users: [mockUser, { id: 'user456', username: 'user2', role: UserRole.DEVELOPER }] as any[],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      stats: {
        totalUsers: 2,
        activeUsers: 2,
        roleDistribution: { [UserRole.DEVELOPER]: 2 }
      }
    };

    it('should orchestrate get all users successfully', async () => {
      userAuthService.getAllUsers.mockResolvedValue(mockUsersResult);

      const result = await service.getAllUsers(1, 10, false, true);

      expect(result).toEqual(mockUsersResult);
      expect(securityService.validateAdminOperationPolicy).toHaveBeenCalled();
      expect(userAuthService.getAllUsers).toHaveBeenCalledWith(1, 10, false, true);
      expect(auditService.logAdminUserListAccess).toHaveBeenCalledWith(1, 2);
      expect(notificationService.sendAdminOperationEvent).toHaveBeenCalledWith('get_users', {
        page: 1,
        recordCount: 2
      });
    });

    it('should use default parameters', async () => {
      userAuthService.getAllUsers.mockResolvedValue(mockUsersResult);

      await service.getAllUsers();

      expect(userAuthService.getAllUsers).toHaveBeenCalledWith(1, 10, false, true);
    });

    it('should handle get all users failure', async () => {
        const error = new Error('fail');
        userAuthService.getAllUsers.mockRejectedValue(error);
        await expect(service.getAllUsers(1, 10)).rejects.toThrow(error);
        expect(auditService.logAdminUserListAccessFailure).toHaveBeenCalledWith(1, error);
    });
  });

  describe('getUserApiKeys', () => {
    const mockApiKeys = [
      {
        _id: 'key1',
        name: 'Key 1',
        appKey: 'app-key-1',
        accessToken: 'access-token-1',
        permissions: [Permission.DATA_READ],
        rateLimit: { requestLimit: 100, window: '1m' },
        status: OperationStatus.ACTIVE,
        totalRequestCount: 0
      },
      {
        _id: 'key2',
        name: 'Key 2',
        appKey: 'app-key-2',
        accessToken: 'access-token-2',
        permissions: [Permission.DATA_READ],
        rateLimit: { requestLimit: 100, window: '1m' },
        status: OperationStatus.ACTIVE,
        totalRequestCount: 0
      }
    ];

    it('should get user API keys successfully', async () => {
      apiKeyService.getUserApiKeys.mockResolvedValue(mockApiKeys);

      const result = await service.getUserApiKeys('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockApiKeys);
      expect(apiKeyService.getUserApiKeys).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should validate userId format for getUserApiKeys', async () => {
      await expect(service.getUserApiKeys('invalid-id')).rejects.toThrow();
    });
  });

  describe('getApiKeyUsage', () => {
    const mockUsage: ApiKeyUsageDto = {
      apiKeyId: 'api-key-123',
      appKey: 'app-key-123',
      name: 'Test Key',
      totalRequestCount: 1000,
      todayRequests: 50,
      hourlyRequests: 5,
      successfulRequests: 950,
      failedRequests: 50,
      averageResponseTimeMs: 150,
      lastAccessedAt: new Date(),
      createdAt: new Date()
    };

    it('should get API key usage successfully', async () => {
      apiKeyService.getApiKeyUsage.mockResolvedValue(mockUsage);

      const result = await service.getApiKeyUsage('app-key-123', '507f1f77bcf86cd799439011');

      expect(result).toEqual(mockUsage);
      expect(apiKeyService.getApiKeyUsage).toHaveBeenCalledWith('app-key-123', '507f1f77bcf86cd799439011');
    });

    it('should validate userId format for getApiKeyUsage', async () => {
      await expect(service.getApiKeyUsage('app-key', 'invalid-id')).rejects.toThrow();
    });
  });

  describe('private methods', () => {
    it('should extract tracking info from request', async () => {
      // This tests the private getRequestTrackingInfo method indirectly
      const logSpy = jest.spyOn((service as any).logger, 'log');
      userAuthService.registerUser.mockResolvedValue(mockUser);

      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };
      await service.register(dto);

      // Verify that tracking info is logged
      expect(logSpy).toHaveBeenCalledWith('开始用户注册流程', expect.objectContaining({
        username: 'test',
        requestId: 'req-123',
        correlationId: 'corr-456'
      }));
    });

    it('should handle missing request properties gracefully', async () => {
      // Create a service instance with minimal request object
      const minimalRequest = {};
      const moduleWithMinimalRequest = await Test.createTestingModule({
        providers: [
          AuthFacadeService,
          { provide: REQUEST, useValue: minimalRequest },
          { provide: UserAuthenticationService, useValue: { registerUser: jest.fn().mockResolvedValue(mockUser) } },
          { provide: ApiKeyManagementService, useValue: { createApiKey: jest.fn() } },
          { provide: SessionManagementService, useValue: { createUserSession: jest.fn() } },
          { provide: SecurityPolicyService, useValue: { validateRegistrationPolicy: jest.fn() } },
          { provide: AuditService, useValue: { logUserRegistration: jest.fn() } },
          { provide: AuthEventNotificationService, useValue: { sendRegistrationSuccessEvent: jest.fn() } },
        ],
      }).compile();

      const serviceWithMinimalRequest = moduleWithMinimalRequest.get<AuthFacadeService>(AuthFacadeService);
      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };

      // Should not throw even with missing request properties
      await expect(serviceWithMinimalRequest.register(dto)).resolves.toBeDefined();
    });

    it('should handle request with connection but no remoteAddress', async () => {
      const requestWithConnection = {
        connection: {},
        headers: { 'user-agent': 'test-agent' },
        ip: undefined
      };
      const moduleWithConnectionRequest = await Test.createTestingModule({
        providers: [
          AuthFacadeService,
          { provide: REQUEST, useValue: requestWithConnection },
          { provide: UserAuthenticationService, useValue: { registerUser: jest.fn().mockResolvedValue(mockUser) } },
          { provide: ApiKeyManagementService, useValue: {} },
          { provide: SessionManagementService, useValue: {} },
          { provide: SecurityPolicyService, useValue: { validateRegistrationPolicy: jest.fn() } },
          { provide: AuditService, useValue: { logUserRegistration: jest.fn() } },
          { provide: AuthEventNotificationService, useValue: { sendRegistrationSuccessEvent: jest.fn() } },
        ],
      }).compile();

      const serviceWithConnectionRequest = moduleWithConnectionRequest.get<AuthFacadeService>(AuthFacadeService);
      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };

      await expect(serviceWithConnectionRequest.register(dto)).resolves.toBeDefined();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle async audit logging error in validateApiKey', async (done) => {
      const mockApiKeyDoc = { _id: 'api-key-123', appKey: 'app-key-123', isActive: true } as any;
      apiKeyService.validateApiKey.mockResolvedValue(mockApiKeyDoc);

      // Mock audit service to throw error
      const auditError = new Error('Audit logging failed');
      auditService.logApiKeyUsage.mockRejectedValue(auditError);

      // Mock logger error method to verify error is logged
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      const result = await service.validateApiKey('app-key-123', 'access-token-123');

      expect(result).toEqual(mockApiKeyDoc);

      // Use setTimeout to allow async audit logging to complete
      setTimeout(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith('记录API密钥使用审计日志失败', auditError.stack);
        done();
      }, 100);
    });

    it('should handle security policy validation errors gracefully', async () => {
      const securityError = new Error('Security policy violation');
      securityService.validateRegistrationPolicy.mockRejectedValue(securityError);

      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };

      await expect(service.register(dto)).rejects.toThrow(securityError);
      expect(auditService.logUserRegistrationFailure).toHaveBeenCalledWith(dto, securityError);
      expect(notificationService.sendRegistrationFailureEvent).toHaveBeenCalledWith(dto, securityError);
    });

    it('should propagate errors from underlying services without modification', async () => {
      const originalError = new Error('Original service error');
      userAuthService.authenticateUser.mockRejectedValue(originalError);

      const dto: LoginDto = { username: 'test', password: 'p' };

      await expect(service.login(dto)).rejects.toThrow(originalError);
      expect(auditService.logUserLoginFailure).toHaveBeenCalledWith(dto, originalError);
    });

    it('should handle notification service errors without affecting main flow', async () => {
      userAuthService.registerUser.mockResolvedValue(mockUser);
      notificationService.sendRegistrationSuccessEvent.mockRejectedValue(new Error('Notification failed'));

      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };

      // Should still succeed even if notification fails
      await expect(service.register(dto)).rejects.toThrow('Notification failed');
      expect(auditService.logUserRegistration).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('method parameter validation', () => {
    it('should validate ObjectId format in createApiKey', async () => {
      const dto: CreateApiKeyDto = { name: 'test', permissions: [] };

      await expect(service.createApiKey('invalid-object-id', dto)).rejects.toThrow();
      expect(securityService.validateApiKeyCreationPolicy).not.toHaveBeenCalled();
    });

    it('should validate ObjectId format in revokeApiKey', async () => {
      await expect(service.revokeApiKey('app-key', 'invalid-object-id')).rejects.toThrow();
      expect(apiKeyService.revokeApiKey).not.toHaveBeenCalled();
    });

    it('should validate ObjectId format in getUserApiKeys', async () => {
      await expect(service.getUserApiKeys('invalid-object-id')).rejects.toThrow();
      expect(apiKeyService.getUserApiKeys).not.toHaveBeenCalled();
    });

    it('should validate ObjectId format in getApiKeyUsage', async () => {
      await expect(service.getApiKeyUsage('app-key', 'invalid-object-id')).rejects.toThrow();
      expect(apiKeyService.getApiKeyUsage).not.toHaveBeenCalled();
    });

    it('should validate ObjectId format in resetApiKeyRateLimit', async () => {
      await expect(service.resetApiKeyRateLimit('app-key', 'invalid-object-id')).rejects.toThrow();
      expect(securityService.validateRateLimitResetPolicy).not.toHaveBeenCalled();
    });
  });

  describe('logging behavior', () => {
    it('should log success messages with appropriate details', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log');
      userAuthService.registerUser.mockResolvedValue(mockUser);

      const dto: CreateUserDto = { username: 'test', email: 'test@test.com', password: 'p' };
      await service.register(dto);

      expect(logSpy).toHaveBeenCalledWith('用户注册成功', expect.objectContaining({
        userId: mockUser.id,
        username: mockUser.username
      }));
    });

    it('should log debug messages for API key validation', async () => {
      const debugSpy = jest.spyOn((service as any).logger, 'debug');
      const mockApiKeyDoc = { _id: 'api-key-123', appKey: 'app-key-123', isActive: true } as any;
      apiKeyService.validateApiKey.mockResolvedValue(mockApiKeyDoc);

      await service.validateApiKey('app-key-123', 'access-token-123');

      expect(debugSpy).toHaveBeenCalledWith('开始验证API密钥流程', { appKey: 'app-key-123' });
    });

    it('should log admin operations with record counts', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log');
      const mockResult = {
        users: [mockUser] as any[],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        stats: {
          totalUsers: 1,
          activeUsers: 1,
          roleDistribution: { [UserRole.DEVELOPER]: 1 }
        }
      };
      userAuthService.getAllUsers.mockResolvedValue(mockResult);

      await service.getAllUsers(1, 10);

      expect(logSpy).toHaveBeenCalledWith('管理员用户列表获取成功', {
        page: 1,
        recordCount: 1
      });
    });
  });
});
