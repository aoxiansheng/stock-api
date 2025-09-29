import { AuthSubjectFactory } from '@auth/subjects/auth-subject.factory';
import { ApiKeySubject } from '@auth/subjects/api-key.subject';
import { JwtUserSubject } from '@auth/subjects/jwt-user.subject';
import { AuthSubjectType } from '@auth/interfaces/auth-subject.interface';
import { Permission, UserRole } from '@auth/enums/user-role.enum';
import { ForbiddenException } from '@nestjs/common';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('AuthSubjectFactory', () => {
  const mockJwtUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    role: UserRole.DEVELOPER,
  };

  const mockApiKey = {
    id: '507f1f77bcf86cd799439012',
    name: 'Test API Key',
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    status: OperationStatus.ACTIVE,
  };

  describe('createFromRequest', () => {
    it('should create JWT user subject from request with user role', () => {
      const request = { user: mockJwtUser };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should create API key subject from request with permissions array', () => {
      const request = { user: mockApiKey };
      const subject = AuthSubjectFactory.createFromRequest(request);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY_SUBJECT);
      expect(subject.id).toBe('507f1f77bcf86cd799439012');
    });

    it('should throw ForbiddenException when request has no user', () => {
      const request = { user: undefined };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('请求中缺少认证信息');
    });

    it('should throw ForbiddenException when user type cannot be identified', () => {
      const request = { user: { id: '507f1f77bcf86cd799439015' } };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('无法识别的认证主体类型');
    });
  });

  describe('createJwtUserSubject', () => {
    it('should create JWT user subject with valid user data', () => {
      const subject = AuthSubjectFactory.createJwtUserSubject(mockJwtUser);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe('507f1f77bcf86cd799439011');
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
      expect(subject.id).toBe('507f1f77bcf86cd799439012');
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
        id: '507f1f77bcf86cd799439011',
        displayName: 'JWT用户: testuser (developer)',
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
        id: '507f1f77bcf86cd799439012',
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
      const user1 = { ...mockJwtUser, id: '507f1f77bcf86cd799439017' };
      const user2 = { ...mockJwtUser, id: '507f1f77bcf86cd799439018' };
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
        id: '507f1f77bcf86cd799439013',
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
        id: '507f1f77bcf86cd799439016',
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
        status: OperationStatus.INACTIVE
      };
      const invalidSubject = new ApiKeySubject(expiredApiKey);
      const isValid = AuthSubjectFactory.isValidSubject(invalidSubject);

      expect(isValid).toBe(false);
    });

    it('should handle isValidSubject with non-ApiKeySubject having API_KEY_SUBJECT type', () => {
      // Create a mock subject that has API_KEY_SUBJECT type but is not an instance of ApiKeySubject
      const mockSubject = {
        type: AuthSubjectType.API_KEY_SUBJECT,
        id: '507f1f77bcf86cd799439020',
        permissions: [],
        metadata: {}
      } as any;

      const isValid = AuthSubjectFactory.isValidSubject(mockSubject);

      expect(isValid).toBe(true); // Should return true since instanceof check fails
    });

    it('should handle getDebugInfo with minimal subject data', () => {
      const minimalUser = { id: '507f1f77bcf86cd799439021', username: 'minimal', role: UserRole.DEVELOPER };
      const subject = new JwtUserSubject(minimalUser);
      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo).toHaveProperty('type');
      expect(debugInfo).toHaveProperty('id', '507f1f77bcf86cd799439021');
      expect(debugInfo).toHaveProperty('displayName');
      expect(debugInfo).toHaveProperty('permissionCount');
      expect(debugInfo).toHaveProperty('permissions');
      expect(debugInfo).toHaveProperty('metadata');
      expect(debugInfo).toHaveProperty('isValid');
    });

    it('should handle edge case where user has role undefined but permissions is array', () => {
      const ambiguousUser = {
        id: '507f1f77bcf86cd799439022',
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
        id: '507f1f77bcf86cd799439023',
        name: 'Null Role',
        role: null,
        permissions: [Permission.DATA_READ]
      };
      const request = { user: userWithNullRole };

      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(ForbiddenException);
      expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow('创建JWT用户权限主体失败');
    });
  });
});