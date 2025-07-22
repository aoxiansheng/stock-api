import { ForbiddenException } from '@nestjs/common';
import { Permission, UserRole } from '../../../../../src/auth/enums/user-role.enum';
import { AuthSubjectType } from '../../../../../src/auth/interfaces/auth-subject.interface';
import { ApiKeySubject } from '../../../../../src/auth/subjects/api-key.subject';
import { AuthSubjectFactory } from '../../../../../src/auth/subjects/auth-subject.factory';
import { JwtUserSubject } from '../../../../../src/auth/subjects/jwt-user.subject';

describe('AuthSubjectFactory', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.DEVELOPER,
    isActive: true,
  };

  const mockApiKey = {
    id: 'apikey-123',
    name: 'Test API Key',
    appKey: 'test-app-key',
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    isActive: true,
    rateLimit: { requests: 1000, window: '1h' },
  };

  describe('createFromRequest()', () => {
    it('should create JwtUserSubject when request has user with role', () => {
      const mockRequest = {
        user: mockUser,
      };

      const subject = AuthSubjectFactory.createFromRequest(mockRequest);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe(mockUser.id);
    });

    it('should create ApiKeySubject when request has user with permissions array', () => {
      const mockRequest = {
        user: mockApiKey,
      };

      const subject = AuthSubjectFactory.createFromRequest(mockRequest);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY);
      expect(subject.id).toBe(mockApiKey.id);
    });

    it('should throw ForbiddenException when request has no user', () => {
      const mockRequest = {};

      expect(() => AuthSubjectFactory.createFromRequest(mockRequest)).toThrow(
        ForbiddenException,
      );
      expect(() => AuthSubjectFactory.createFromRequest(mockRequest)).toThrow(
        '请求中缺少认证信息',
      );
    });

    it('should throw ForbiddenException when request user is null', () => {
      const mockRequest = {
        user: null,
      };

      expect(() => AuthSubjectFactory.createFromRequest(mockRequest)).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user type cannot be determined', () => {
      const mockRequest = {
        user: {
          id: 'unknown-user',
          // No role or permissions
        },
      };

      expect(() => AuthSubjectFactory.createFromRequest(mockRequest)).toThrow(
        ForbiddenException,
      );
      expect(() => AuthSubjectFactory.createFromRequest(mockRequest)).toThrow(
        '无法识别的认证主体类型',
      );
    });

    it('should prioritize role over permissions when both exist', () => {
      const mockRequest = {
        user: {
          ...mockUser,
          permissions: [Permission.DATA_READ], // Also has permissions
        },
      };

      const subject = AuthSubjectFactory.createFromRequest(mockRequest);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
    });

    it('should handle user with empty permissions array as API key', () => {
      const mockRequest = {
        user: {
          id: 'apikey-empty',
          permissions: [],
        },
      };

      const subject = AuthSubjectFactory.createFromRequest(mockRequest);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY);
    });

    it('should reject user with non-array permissions', () => {
      const mockRequest = {
        user: {
          id: 'invalid-user',
          permissions: 'invalid-permissions',
        },
      };

      expect(() => AuthSubjectFactory.createFromRequest(mockRequest)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createJwtUserSubject()', () => {
    it('should create JwtUserSubject successfully with valid user data', () => {
      const subject = AuthSubjectFactory.createJwtUserSubject(mockUser);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe(mockUser.id);
      expect(subject.role).toBe(mockUser.role);
    });

    it('should throw ForbiddenException when user data is invalid', () => {
      const invalidUser = {
        // Missing required fields
        username: 'invalid',
      };

      expect(() => AuthSubjectFactory.createJwtUserSubject(invalidUser)).toThrow(
        ForbiddenException,
      );
      expect(() => AuthSubjectFactory.createJwtUserSubject(invalidUser)).toThrow(
        /创建JWT用户权限主体失败:/,
      );
    });

    it('should handle MongoDB ObjectId format', () => {
      const mongoUser = {
        _id: { toString: () => 'mongo-id' },
        username: 'mongouser',
        role: UserRole.ADMIN,
      };

      const subject = AuthSubjectFactory.createJwtUserSubject(mongoUser);

      expect(subject.id).toBe('mongo-id');
      expect(subject.role).toBe(UserRole.ADMIN);
    });

    it('should preserve all user metadata', () => {
      const userWithMetadata = {
        ...mockUser,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      const subject = AuthSubjectFactory.createJwtUserSubject(userWithMetadata);

      expect(subject.metadata.username).toBe(userWithMetadata.username);
      expect(subject.metadata.email).toBe(userWithMetadata.email);
      expect(subject.metadata.isActive).toBe(userWithMetadata.isActive);
    });
  });

  describe('createApiKeySubject()', () => {
    it('should create ApiKeySubject successfully with valid API key data', () => {
      const subject = AuthSubjectFactory.createApiKeySubject(mockApiKey);

      expect(subject).toBeInstanceOf(ApiKeySubject);
      expect(subject.type).toBe(AuthSubjectType.API_KEY);
      expect(subject.id).toBe(mockApiKey.id);
      expect(subject.permissions).toEqual(mockApiKey.permissions);
    });

    it('should throw ForbiddenException when API key data is invalid', () => {
      const invalidApiKey = {
        // Missing required fields
        name: 'invalid-key',
      };

      expect(() => AuthSubjectFactory.createApiKeySubject(invalidApiKey)).toThrow(
        ForbiddenException,
      );
      expect(() => AuthSubjectFactory.createApiKeySubject(invalidApiKey)).toThrow(
        /创建API Key权限主体失败:/,
      );
    });

    it('should handle minimal API key data', () => {
      const minimalApiKey = {
        id: 'minimal-key',
        permissions: [Permission.DATA_READ],
      };

      const subject = AuthSubjectFactory.createApiKeySubject(minimalApiKey);

      expect(subject.id).toBe('minimal-key');
      expect(subject.permissions).toEqual([Permission.DATA_READ]);
    });

    it('should handle MongoDB ObjectId format', () => {
      const mongoApiKey = {
        _id: { toString: () => 'mongo-apikey-id' },
        name: 'Mongo API Key',
        permissions: [Permission.DATA_READ],
      };

      const subject = AuthSubjectFactory.createApiKeySubject(mongoApiKey);

      expect(subject.id).toBe('mongo-apikey-id');
    });

    it('should preserve all API key metadata', () => {
      const apiKeyWithMetadata = {
        ...mockApiKey,
        expiresAt: new Date(),
        usageCount: 42,
        lastUsedAt: new Date(),
      };

      const subject = AuthSubjectFactory.createApiKeySubject(apiKeyWithMetadata);

      expect(subject.metadata.name).toBe(apiKeyWithMetadata.name);
      expect(subject.metadata.rateLimit).toEqual(apiKeyWithMetadata.rateLimit);
      expect(subject.metadata.isActive).toBe(apiKeyWithMetadata.isActive);
    });
  });

  describe('isValidSubject()', () => {
    it('should return true for valid JWT user subject', () => {
      const subject = new JwtUserSubject(mockUser);

      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(true);
    });

    it('should return true for valid and active API key subject', () => {
      const subject = new ApiKeySubject(mockApiKey);

      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(true);
    });

    it('should return false for inactive API key subject', () => {
      const inactiveApiKey = {
        ...mockApiKey,
        isActive: false,
      };
      const subject = new ApiKeySubject(inactiveApiKey);

      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(false);
    });

    it('should return false for expired API key subject', () => {
      const expiredApiKey = {
        ...mockApiKey,
        expiresAt: new Date(Date.now() - 86400000), // 24 hours ago
      };
      const subject = new ApiKeySubject(expiredApiKey);

      const isValid = AuthSubjectFactory.isValidSubject(subject);

      expect(isValid).toBe(false);
    });

    it('should return false for null subject', () => {
      const isValid = AuthSubjectFactory.isValidSubject(null as any);

      expect(isValid).toBe(false);
    });

    it('should return false for undefined subject', () => {
      const isValid = AuthSubjectFactory.isValidSubject(undefined as any);

      expect(isValid).toBe(false);
    });

    it('should return false for subject without id', () => {
      const subjectWithoutId = {
        type: AuthSubjectType.JWT_USER,
        permissions: [],
        metadata: {},
        getDisplayName: () => 'test',
      } as any;

      const isValid = AuthSubjectFactory.isValidSubject(subjectWithoutId);

      expect(isValid).toBe(false);
    });

    it('should handle non-ApiKeySubject with API_KEY type gracefully', () => {
      const mockSubject = {
        type: AuthSubjectType.API_KEY,
        id: 'mock-id',
        permissions: [],
        metadata: {},
        getDisplayName: () => 'mock',
      } as any;

      const isValid = AuthSubjectFactory.isValidSubject(mockSubject);

      expect(isValid).toBe(true); // Falls back to basic validation
    });
  });

  describe('getDebugInfo()', () => {
    it('should return complete debug info for JWT user subject', () => {
      const subject = new JwtUserSubject(mockUser);

      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo).toEqual({
        type: AuthSubjectType.JWT_USER,
        id: mockUser.id,
        displayName: `JWT用户: ${mockUser.username} (${mockUser.role})`,
        permissionCount: subject.permissions.length,
        permissions: subject.permissions,
        metadata: subject.metadata,
        isValid: true,
      });
    });

    it('should return complete debug info for API key subject', () => {
      const subject = new ApiKeySubject(mockApiKey);

      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo).toEqual({
        type: AuthSubjectType.API_KEY,
        id: mockApiKey.id,
        displayName: `API Key: ${mockApiKey.name}`,
        permissionCount: mockApiKey.permissions.length,
        permissions: mockApiKey.permissions,
        metadata: subject.metadata,
        isValid: true,
      });
    });

    it('should include validity status in debug info', () => {
      const inactiveApiKey = {
        ...mockApiKey,
        isActive: false,
      };
      const subject = new ApiKeySubject(inactiveApiKey);

      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo.isValid).toBe(false);
    });

    it('should handle subject with empty permissions', () => {
      const emptyPermissionsApiKey = {
        id: 'empty-key',
        permissions: [],
      };
      const subject = new ApiKeySubject(emptyPermissionsApiKey);

      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo.permissionCount).toBe(0);
      expect(debugInfo.permissions).toEqual([]);
    });
  });

  describe('areEqual()', () => {
    it('should return true for same JWT user subjects', () => {
      const subject1 = new JwtUserSubject(mockUser);
      const subject2 = new JwtUserSubject(mockUser);

      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(true);
    });

    it('should return true for same API key subjects', () => {
      const subject1 = new ApiKeySubject(mockApiKey);
      const subject2 = new ApiKeySubject(mockApiKey);

      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(true);
    });

    it('should return false for different types with same id', () => {
      const userSubject = new JwtUserSubject({
        ...mockUser,
        id: 'same-id',
      });
      const apiKeySubject = new ApiKeySubject({
        ...mockApiKey,
        id: 'same-id',
      });

      const areEqual = AuthSubjectFactory.areEqual(userSubject, apiKeySubject);

      expect(areEqual).toBe(false);
    });

    it('should return false for same type with different ids', () => {
      const subject1 = new JwtUserSubject({
        ...mockUser,
        id: 'id-1',
      });
      const subject2 = new JwtUserSubject({
        ...mockUser,
        id: 'id-2',
      });

      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(false);
    });

    it('should return false for completely different subjects', () => {
      const userSubject = new JwtUserSubject(mockUser);
      const apiKeySubject = new ApiKeySubject(mockApiKey);

      const areEqual = AuthSubjectFactory.areEqual(userSubject, apiKeySubject);

      expect(areEqual).toBe(false);
    });

    it('should handle subjects with identical structure but different instances', () => {
      const user1 = { ...mockUser };
      const user2 = { ...mockUser };
      const subject1 = new JwtUserSubject(user1);
      const subject2 = new JwtUserSubject(user2);

      const areEqual = AuthSubjectFactory.areEqual(subject1, subject2);

      expect(areEqual).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request objects gracefully', () => {
      const malformedRequests = [
        { user: 'not-an-object' },
        { user: 123 },
        { user: [] },
        { user: true },
      ];

      malformedRequests.forEach((request) => {
        expect(() => AuthSubjectFactory.createFromRequest(request)).toThrow(
          ForbiddenException,
        );
      });
    });

    it('should handle subjects with circular references in metadata', () => {
      const circularUser: any = { ...mockUser, metadata: {} };
      circularUser.metadata.circularRef = circularUser; // Circular reference

      const subject = new JwtUserSubject(circularUser);

      expect(() => AuthSubjectFactory.getDebugInfo(subject)).not.toThrow();
    });

    it('should handle very large permission arrays', () => {
      const allPermissions = Object.values(Permission);
      const largePermissionsApiKey = {
        ...mockApiKey,
        permissions: [...allPermissions, ...allPermissions], // Duplicate permissions
      };

      const subject = AuthSubjectFactory.createApiKeySubject(largePermissionsApiKey);
      const debugInfo = AuthSubjectFactory.getDebugInfo(subject);

      expect(debugInfo.permissionCount).toBe(largePermissionsApiKey.permissions.length);
    });

    it('should handle concurrent factory operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const user = { ...mockUser, id: `user-${i}` };
        return Promise.resolve(AuthSubjectFactory.createJwtUserSubject(user));
      });

      const subjects = await Promise.all(promises);

      expect(subjects).toHaveLength(100);
      subjects.forEach((subject, i) => {
        expect(subject.id).toBe(`user-${i}`);
      });
    });

    it('should maintain immutability of input data', () => {
      const originalUser = { ...mockUser };
      const originalApiKey = { ...mockApiKey };

      AuthSubjectFactory.createJwtUserSubject(mockUser);
      AuthSubjectFactory.createApiKeySubject(mockApiKey);

      expect(mockUser).toEqual(originalUser);
      expect(mockApiKey).toEqual(originalApiKey);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with real request-like objects', () => {
      const mockExpressRequest = {
        user: mockUser,
        headers: {
          authorization: 'Bearer token',
        },
        method: 'GET',
        url: '/api/test',
      };

      const subject = AuthSubjectFactory.createFromRequest(mockExpressRequest);

      expect(subject).toBeInstanceOf(JwtUserSubject);
      expect(subject.id).toBe(mockUser.id);
    });

    it('should work with Passport.js-style user objects', () => {
      const passportUser = {
        ...mockUser,
        _json: { /* OAuth provider data */ },
        provider: 'oauth',
      };

      const subject = AuthSubjectFactory.createJwtUserSubject(passportUser);

      expect(subject.id).toBe(passportUser.id);
      expect(subject.role).toBe(passportUser.role);
    });

    it('should handle database-style API key objects', () => {
      const dbApiKey = {
        _id: 'db-key-id',
        app_key: 'app-key-value',
        permissions: ['data:read', 'query:execute'],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Map database fields to expected format
      const mappedApiKey = {
        id: dbApiKey._id,
        appKey: dbApiKey.app_key,
        permissions: dbApiKey.permissions,
        isActive: dbApiKey.is_active,
      };

      const subject = AuthSubjectFactory.createApiKeySubject(mappedApiKey);

      expect(subject.id).toBe(dbApiKey._id);
      expect(subject.permissions).toEqual(dbApiKey.permissions);
    });
  });

  describe('Performance Considerations', () => {
    it('should create subjects efficiently', () => {
      const start = performance.now();

      // Create many subjects
      for (let i = 0; i < 1000; i++) {
        const user = { ...mockUser, id: `user-${i}` };
        AuthSubjectFactory.createJwtUserSubject(user);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 1000 operations
    });

    it('should efficiently compare subjects', () => {
      const subject1 = new JwtUserSubject(mockUser);
      const subject2 = new JwtUserSubject(mockUser);

      const start = performance.now();

      // Perform many comparisons
      for (let i = 0; i < 10000; i++) {
        AuthSubjectFactory.areEqual(subject1, subject2);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(50); // 50ms for 10000 operations
    });
  });
});