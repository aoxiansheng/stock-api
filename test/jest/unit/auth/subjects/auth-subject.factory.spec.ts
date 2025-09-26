import { AuthSubjectFactory } from '@auth/subjects/auth-subject.factory';
import { ApiKeySubject } from '@auth/subjects/api-key.subject';
import { JwtUserSubject } from '@auth/subjects/jwt-user.subject';
import { AuthSubjectType } from '@auth/interfaces/auth-subject.interface';
import { Permission, UserRole } from '@auth/enums/user-role.enum';
import { ForbiddenException } from '@nestjs/common';

describe('AuthSubjectFactory', () => {
  const mockJwtUser = {
    id: 'user123',
    username: 'testuser',
    role: UserRole.DEVELOPER,
  };

  const mockApiKey = {
    id: 'apikey123',
    name: 'Test API Key',
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
  };

  describe('createFromRequest', () => {
    it('should create JWT user subject from request with user role', () => {
      const request = { user: mockJwtUser };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe('user123');
    });

    it('should create API key subject from request with permissions array', () => {
      const request = { user: mockApiKey };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY_SUBJECT);
      expect(subject.id).toBe('apikey123');
    });

    it('should throw ForbiddenException when request has no user', () => {
      const request = { user: undefined };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('请求中缺少认证信息');
    });

    it('should throw ForbiddenException when user type cannot be identified', () => {
      const request = { user: { id: 'unknown123' } };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('无法识别的认证主体类型');
    });
  });

  describe('createJwtUserSubject', () => {
    it('should create JWT user subject with valid user data', () => {
      const subject = AuthSubjectFactory.createJwtUserSubject(mockJwtUser);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe('user123');
      expect(subject.role).toBe(UserRole.DEVELOPER);
    });

    it('should throw ForbiddenException when JWT user creation fails', () => {
      const invalidUser = { ...mockJwtUser, id: undefined };

      expect(() => AuthSubjectFactory.createJwtUserSubject(invalidUser)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createJwtUserSubject(invalidUser)).toThrow('创建JWT用户权限主体失败');
    });
  });

  describe('createApiKeySubject', () => {
    it('should create API key subject with valid API key data', () => {
      const subject = AuthSubjectFactory.createApiKeySubject(mockApiKey);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY_SUBJECT);
      expect(subject.id).toBe('apikey123');
      expect(subject.permissions).toEqual([Permission.DATA_READ, Permission.QUERY_EXECUTE]);
    });

    it('should throw ForbiddenException when API key creation fails', () => {
      const invalidApiKey = { ...mockApiKey, id: undefined };

      expect(() => AuthSubjectFactory.createApiKeySubject(invalidApiKey)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createApiKeySubject(invalidApiKey)).toThrow('创建API Key权限主体失败');
    });
  });

  describe('isValidSubject', () => {
    it('should return true for valid JWT user subject', () => {
      const subject = new JwtUserSubject(mockJwtUser);
      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(true);
    });

    it('should return true for valid API key subject', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(true);
    });

    it('should return false for subject without ID', () => {
      const subject = { id: undefined } as any;
      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(false);
    });

    it('should return false for null subject', () => {
      const isValid = AuthSubjectFactory.isValidSubject(null);

      expect(isValid).toBe(false);
    });

    it('should return false for undefined subject', () => {
      const isValid = AuthSubjectFactory.isValidSubject(undefined);

      expect(isValid).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information for JWT user subject', () => {
      const subject = new JwtUserSubject(mockJwtUser);
      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo).toEqual({
        type: AuthSubjectType.JWT_USER,
        id: 'user123',
        displayName: 'JWT用户: testuser (DEVELOPER)',
        permissionCount: subject.permissions.length,
        permissions: subject.permissions,
        metadata: subject.metadata,
        isValid: true,
      });
    });

    it('should return debug information for API key subject', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo).toEqual({
        type: AuthSubjectType.API_KEY_SUBJECT,
        id: 'apikey123',
        displayName: 'API Key: Test API Key',
        permissionCount: subject.permissions.length,
        permissions: subject.permissions,
        metadata: subject.metadata,
        isValid: true,
      });
    });
  });

  describe('areEqual', () => {
    it('should return true for identical JWT user subjects', () => {
      const subject1 = new JwtUserSubject(mockJwtUser);
      const subject2 = new JwtUserSubject(mockJwtUser);
      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(true);
    });

    it('should return true for identical API key subjects', () => {
      const subject1 = new ApiKeySubject(mockApiKey);
      const subject2 = new ApiKeySubject(mockApiKey);
      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(true);
    });

    it('should return false for different subject types', () => {
      const jwtSubject = new JwtUserSubject(mockJwtUser);
      const apiKeySubject = new ApiKeySubject(mockApiKey);
      const areEqual = AuthSubjectFactory.areEqual(jwtSubject, apiKeySubject);

      expect(areEqual).toBe(false);
    });

    it('should return false for subjects with different IDs', () => {
      const user1 = { ...mockJwtUser, id: 'user123' };
      const user2 = { ...mockJwtUser, id: 'user456' };
      const subject1 = new JwtUserSubject(user1);
      const subject2 = new JwtUserSubject(user2);
      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(false);
    });
  });

  describe('additional edge cases and error scenarios', () => {
    it('should handle request with empty user object', () => {
      const request = { user: {} };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('无法识别的认证主体类型');
    });

    it('should handle request with null user', () => {
      const request = { user: null };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('请求中缺少认证信息');
    });

    it('should handle user with both role and permissions (should prioritize role)', () => {
      const userWithBoth = {
        id: 'user123',
        username: 'testuser',
        role: UserRole.DEVELOPER,
        permissions: [Permission.DATA_READ] // This should be ignored
      };
      const request = { user: userWithBoth };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
    });

    it('should handle permissions as non-array value', () => {
      const userWithStringPermissions = {
        id: 'apikey123',
        name: 'Test API Key',
        permissions: 'not-an-array'
      };
      const request = { user: userWithStringPermissions };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('无法识别的认证主体类型');
    });

    it('should handle createJwtUserSubject with constructor error', () => {
      const invalidUser = { id: undefined, username: 'test', role: UserRole.DEVELOPER };

      expect(() => AuthSubjectFactory.createJwtUserSubject(invalidUser)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createJwtUserSubject(invalidUser)).toThrow('创建JWT用户权限主体失败');
    });

    it('should handle createApiKeySubject with constructor error', () => {
      const invalidApiKey = { id: undefined, name: 'test', permissions: [] };

      expect(() => AuthSubjectFactory.createApiKeySubject(invalidApiKey)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createApiKeySubject(invalidApiKey)).toThrow('创建API Key权限主体失败');
    });

    it('should handle isValidSubject with invalid API key subject', () => {
      const expiredApiKey = {
        ...mockApiKey,
        status: 'INACTIVE'
      };
      const invalidSubject = new ApiKeySubject(expiredApiKey);
      const isValid = AuthSubjectFactory.isValidSubject(invalidSubject);

      expect(isValid).toBe(false);
    });

    it('should handle isValidSubject with non-ApiKeySubject having API_KEY_SUBJECT type', () => {
      // Create a mock subject that has API_KEY_SUBJECT type but is not an instance of ApiKeySubject
      const mockSubject = {
        type: AuthSubjectType.API_KEY_SUBJECT,
        id: 'test123',
        permissions: [],
        metadata: {}
      } as any;

      const isValid = AuthSubjectFactory.isValidSubject(mockSubject);

      expect(isValid).toBe(true); // Should return true since instanceof check fails
    });

    it('should handle getDebugInfo with minimal subject data', () => {
      const minimalUser = { id: 'minimal123', username: 'minimal', role: UserRole.DEVELOPER };
      const subject = new JwtUserSubject(minimalUser);
      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo).toHaveProperty('type');
      expect(debugInfo).toHaveProperty('id', 'minimal123');
      expect(debugInfo).toHaveProperty('displayName');
      expect(debugInfo).toHaveProperty('permissionCount');
      expect(debugInfo).toHaveProperty('permissions');
      expect(debugInfo).toHaveProperty('metadata');
      expect(debugInfo).toHaveProperty('isValid');
    });

    it('should handle edge case where user has role undefined but permissions is array', () => {
      const ambiguousUser = {
        id: 'ambiguous123',
        name: 'Ambiguous',
        role: undefined,
        permissions: [Permission.DATA_READ]
      };
      const request = { user: ambiguousUser };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY_SUBJECT);
    });

    it('should handle user with role null but permissions is array', () => {
      const userWithNullRole = {
        id: 'nullrole123',
        name: 'Null Role',
        role: null,
        permissions: [Permission.DATA_READ]
      };
      const request = { user: userWithNullRole };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY_SUBJECT);
    });
  });
});