/**
 * AuthFacadeService专用Mock工厂
 * 为AuthFacadeService测试提供完整的域服务Mock
 */

import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { ApiKeyManagementService } from '@auth/services/domain/apikey-management.service';
import { SessionManagementService } from '@auth/services/domain/session-management.service';
import { SecurityPolicyService } from '@auth/services/domain/security-policy.service';
import { AuditService } from '@auth/services/domain/audit.service';
import { AuthEventNotificationService } from '@auth/services/domain/notification.service';

/**
 * 创建UserAuthenticationService Mock
 */
export function createUserAuthenticationServiceMock(): jest.Mocked<UserAuthenticationService> {
  return {
    registerUser: jest.fn(),
    authenticateUser: jest.fn(),
    getAllUsers: jest.fn(),
    // 添加其他可能需要的方法
  } as any;
}

/**
 * 创建ApiKeyManagementService Mock
 */
export function createApiKeyManagementServiceMock(): jest.Mocked<ApiKeyManagementService> {
  return {
    createApiKey: jest.fn(),
    validateApiKey: jest.fn(),
    getUserApiKeys: jest.fn(),
    revokeApiKey: jest.fn(),
    getApiKeyUsage: jest.fn(),
    resetApiKeyRateLimit: jest.fn(),
    // 添加其他可能需要的方法
  } as any;
}

/**
 * 创建SessionManagementService Mock
 */
export function createSessionManagementServiceMock(): jest.Mocked<SessionManagementService> {
  return {
    createUserSession: jest.fn(),
    refreshUserSession: jest.fn(),
    // 添加其他可能需要的方法
  } as any;
}

/**
 * 创建SecurityPolicyService Mock
 */
export function createSecurityPolicyServiceMock(): jest.Mocked<SecurityPolicyService> {
  return {
    validateRegistrationPolicy: jest.fn(),
    validateLoginPolicy: jest.fn(),
    validateRefreshTokenPolicy: jest.fn(),
    validateApiKeyCreationPolicy: jest.fn(),
    validateApiKeyUsagePolicy: jest.fn(),
    validateAdminOperationPolicy: jest.fn(),
    validateRateLimitResetPolicy: jest.fn(),
    // 添加其他可能需要的方法
  } as any;
}

/**
 * 创建AuditService Mock
 */
export function createAuditServiceMock(): jest.Mocked<AuditService> {
  return {
    logUserRegistration: jest.fn(),
    logUserRegistrationFailure: jest.fn(),
    logUserLogin: jest.fn(),
    logUserLoginFailure: jest.fn(),
    logTokenRefresh: jest.fn(),
    logTokenRefreshFailure: jest.fn(),
    logApiKeyCreation: jest.fn(),
    logApiKeyCreationFailure: jest.fn(),
    logApiKeyUsage: jest.fn(),
    logApiKeyValidationFailure: jest.fn(),
    logApiKeyRevocation: jest.fn(),
    logApiKeyRevocationFailure: jest.fn(),
    logApiKeyRateLimitReset: jest.fn(),
    logApiKeyRateLimitResetFailure: jest.fn(),
    logAdminUserListAccess: jest.fn(),
    logAdminUserListAccessFailure: jest.fn(),
    // 添加其他可能需要的方法
  } as any;
}

/**
 * 创建AuthEventNotificationService Mock
 */
export function createAuthEventNotificationServiceMock(): jest.Mocked<AuthEventNotificationService> {
  return {
    sendRegistrationSuccessEvent: jest.fn(),
    sendRegistrationFailureEvent: jest.fn(),
    sendLoginSuccessEvent: jest.fn(),
    sendLoginFailureEvent: jest.fn(),
    sendTokenRefreshEvent: jest.fn(),
    sendApiKeyCreationEvent: jest.fn(),
    sendApiKeyRevocationEvent: jest.fn(),
    sendRateLimitResetEvent: jest.fn(),
    sendAdminOperationEvent: jest.fn(),
    // 添加其他可能需要的方法
  } as any;
}

/**
 * 创建完整的AuthFacade测试提供者列表
 */
export function createAuthFacadeMockProviders() {
  return [
    {
      provide: UserAuthenticationService,
      useFactory: createUserAuthenticationServiceMock,
    },
    {
      provide: ApiKeyManagementService,
      useFactory: createApiKeyManagementServiceMock,
    },
    {
      provide: SessionManagementService,
      useFactory: createSessionManagementServiceMock,
    },
    {
      provide: SecurityPolicyService,
      useFactory: createSecurityPolicyServiceMock,
    },
    {
      provide: AuditService,
      useFactory: createAuditServiceMock,
    },
    {
      provide: AuthEventNotificationService,
      useFactory: createAuthEventNotificationServiceMock,
    },
  ];
}

/**
 * 创建默认的REQUEST对象Mock
 */
export function createRequestMock() {
  return {
    requestId: 'req-123',
    correlationId: 'corr-456',
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  };
}