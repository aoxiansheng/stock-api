import { ApiKeySubject } from '@auth/subjects/api-key.subject';
import { Permission } from '@auth/enums/user-role.enum';
import { AuthSubjectType } from '@auth/interfaces/auth-subject.interface';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('ApiKeySubject', () => {
  const mockApiKey = {
    id: 'apikey123',
    name: 'Test API Key',
    appKey: 'app_testkey',
    userId: 'user123',
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    rateLimit: { requestLimit: 1000, window: '1h' },
    status: OperationStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    totalRequestCount: 50,
    lastAccessedAt: new Date(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  };

  describe('constructor', () => {
    it('should create an API key subject with valid API key data', () => {
      const subject = new ApiKeySubject(mockApiKey);

      expect(subject).toBeDefined();
      expect(subject.type).toBe(AuthSubjectType.API_KEY_SUBJECT);
      expect(subject.id).toBe('apikey123');
      expect(subject.permissions).toEqual([Permission.DATA_READ, Permission.QUERY_EXECUTE]);
      expect(subject.metadata).toEqual({
        name: 'Test API Key',
        appKey: 'app_testkey',
        userId: 'user123',
        rateLimit: { requestLimit: 1000, window: '1h' },
        status: OperationStatus.ACTIVE,
        expiresAt: mockApiKey.expiresAt,
        totalRequestCount: 50,
        lastAccessedAt: mockApiKey.lastAccessedAt,
        createdAt: mockApiKey.createdAt,
      });
    });

    it('should create an API key subject with _id field', () => {
      const apiKeyWithId = { ...mockApiKey, _id: 'apikey456', id: undefined };
      const subject = new ApiKeySubject(apiKeyWithId);

      expect(subject.id).toBe('apikey456');
    });

    it('should throw error when API key ID is missing', () => {
      const apiKeyWithoutId = { ...mockApiKey, id: undefined, _id: undefined };

      expect(() => new ApiKeySubject(apiKeyWithoutId)).toThrow('API Key主体缺少必要的ID字段');
    });

    it('should throw error when API key ID format is invalid', () => {
      const apiKeyWithInvalidId = { ...mockApiKey, id: 'invalid-id' };

      expect(() => new ApiKeySubject(apiKeyWithInvalidId)).toThrow('API Key主体ID格式无效');
    });

    it('should throw error when userId format is invalid', () => {
      const apiKeyWithInvalidUserId = { ...mockApiKey, userId: 'invalid-user-id' };

      expect(() => new ApiKeySubject(apiKeyWithInvalidUserId)).toThrow('API Key关联的用户ID格式无效');
    });

    it('should handle missing userId gracefully', () => {
      const apiKeyWithoutUserId = { ...mockApiKey, userId: undefined };
      const subject = new ApiKeySubject(apiKeyWithoutUserId);

      expect(subject.metadata.userId).toBeUndefined();
    });

    it('should throw error when permissions is not an array', () => {
      const apiKeyWithInvalidPermissions = { ...mockApiKey, permissions: 'invalid' };

      expect(() => new ApiKeySubject(apiKeyWithInvalidPermissions)).toThrow('API Key主体的权限字段必须是数组');
    });

    it('should handle empty permissions array', () => {
      const apiKeyWithEmptyPermissions = { ...mockApiKey, permissions: [] };
      const subject = new ApiKeySubject(apiKeyWithEmptyPermissions);

      expect(subject.permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKey);
    });

    it('should return true for permissions the API key has', () => {
      const hasPermission = subject.hasPermission(Permission.DATA_READ);
      
      expect(hasPermission).toBe(true);
    });

    it('should return false for permissions the API key does not have', () => {
      const hasPermission = subject.hasPermission(Permission.SYSTEM_ADMIN);
      
      expect(hasPermission).toBe(false);
    });

    it('should return false for invalid permissions', () => {
      const hasPermission = subject.hasPermission('INVALID_PERMISSION' as Permission);
      
      expect(hasPermission).toBe(false);
    });

    it('should return true for system permissions when API key has SYSTEM_ADMIN', () => {
      const apiKeyWithSystemAdmin = { ...mockApiKey, permissions: [Permission.SYSTEM_ADMIN] };
      const subjectWithSystemAdmin = new ApiKeySubject(apiKeyWithSystemAdmin);
      
      const hasPermission = subjectWithSystemAdmin.hasPermission(Permission.SYSTEM_MONITOR);
      
      expect(hasPermission).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKey);
    });

    it('should return true when API key has all specified permissions', () => {
      const permissions = [Permission.DATA_READ, Permission.QUERY_EXECUTE];
      const hasAll = subject.hasAllPermissions(permissions);
      
      expect(hasAll).toBe(true);
    });

    it('should return false when API key does not have all specified permissions', () => {
      const permissions = [Permission.DATA_READ, Permission.SYSTEM_ADMIN];
      const hasAll = subject.hasAllPermissions(permissions);
      
      expect(hasAll).toBe(false);
    });

    it('should return true for empty permissions array', () => {
      const hasAll = subject.hasAllPermissions([]);
      
      expect(hasAll).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKey);
    });

    it('should return true when API key has at least one of the specified permissions', () => {
      const permissions = [Permission.DATA_READ, Permission.SYSTEM_ADMIN];
      const hasAny = subject.hasAnyPermission(permissions);
      
      expect(hasAny).toBe(true);
    });

    it('should return false when API key does not have any of the specified permissions', () => {
      const permissions = [Permission.SYSTEM_ADMIN, Permission.USER_MANAGE];
      const hasAny = subject.hasAnyPermission(permissions);
      
      expect(hasAny).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      const hasAny = subject.hasAnyPermission([]);
      
      expect(hasAny).toBe(false);
    });
  });

  describe('getDisplayName', () => {
    it('should return correct display name with API key name', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const displayName = subject.getDisplayName();
      
      expect(displayName).toBe('API Key: Test API Key');
    });

    it('should return unnamed when API key name is missing', () => {
      const apiKeyWithoutName = { ...mockApiKey, name: undefined };
      const subject = new ApiKeySubject(apiKeyWithoutName);
      const displayName = subject.getDisplayName();
      
      expect(displayName).toBe('API Key: unnamed');
    });
  });

  describe('isValid', () => {
    it('should return true for active and non-expired API key', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const isValid = subject.isValid();
      
      expect(isValid).toBe(true);
    });

    it('should return false for inactive API key', () => {
      const inactiveApiKey = { ...mockApiKey, status: OperationStatus.INACTIVE };
      const subject = new ApiKeySubject(inactiveApiKey);
      const isValid = subject.isValid();
      
      expect(isValid).toBe(false);
    });

    it('should return false for expired API key', () => {
      const expiredApiKey = { ...mockApiKey, expiresAt: new Date(Date.now() - 1000) }; // 1 second ago
      const subject = new ApiKeySubject(expiredApiKey);
      const isValid = subject.isValid();
      
      expect(isValid).toBe(false);
    });

    it('should return true for API key without expiration date', () => {
      const apiKeyWithoutExpiration = { ...mockApiKey, expiresAt: undefined };
      const subject = new ApiKeySubject(apiKeyWithoutExpiration);
      const isValid = subject.isValid();
      
      expect(isValid).toBe(true);
    });
  });

  describe('getRateLimit', () => {
    it('should return rate limit configuration', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const rateLimit = subject.getRateLimit();
      
      expect(rateLimit).toEqual({ requestLimit: 1000, window: '1h' });
    });

    it('should return null when rate limit is not configured', () => {
      const apiKeyWithoutRateLimit = { ...mockApiKey, rateLimit: undefined };
      const subject = new ApiKeySubject(apiKeyWithoutRateLimit);
      const rateLimit = subject.getRateLimit();
      
      expect(rateLimit).toBeNull();
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const usageStats = subject.getUsageStats();
      
      expect(usageStats).toEqual({
        totalRequestCount: 50,
        lastAccessedAt: mockApiKey.lastAccessedAt,
        createdAt: mockApiKey.createdAt,
      });
    });

    it('should handle missing lastAccessedAt', () => {
      const apiKeyWithoutLastAccessed = { ...mockApiKey, lastAccessedAt: undefined };
      const subject = new ApiKeySubject(apiKeyWithoutLastAccessed);
      const usageStats = subject.getUsageStats();
      
      expect(usageStats.lastAccessedAt).toBeNull();
    });
  });

  describe('belongsToUser', () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKey);
    });

    it('should return true when API key belongs to the specified user', () => {
      const belongs = subject.belongsToUser('user123');
      
      expect(belongs).toBe(true);
    });

    it('should return false when API key does not belong to the specified user', () => {
      const belongs = subject.belongsToUser('user456');
      
      expect(belongs).toBe(false);
    });

    it('should return false for invalid user ID format', () => {
      const belongs = subject.belongsToUser('invalid-user-id');
      
      expect(belongs).toBe(false);
    });

    it('should return false when API key has no associated user', () => {
      const apiKeyWithoutUser = { ...mockApiKey, userId: undefined };
      const subjectWithoutUser = new ApiKeySubject(apiKeyWithoutUser);
      const belongs = subjectWithoutUser.belongsToUser('user123');
      
      expect(belongs).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return a JSON representation of the subject', () => {
      const subject = new ApiKeySubject(mockApiKey);
      const json = subject.toJSON();

      expect(json).toEqual({
        type: AuthSubjectType.API_KEY_SUBJECT,
        id: 'apikey123',
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        metadata: {
          name: 'Test API Key',
          appKey: 'app_testkey',
          userId: 'user123',
          status: OperationStatus.ACTIVE,
          expiresAt: mockApiKey.expiresAt,
          rateLimit: { requestLimit: 1000, window: '1h' },
        },
      });
    });

    it('should handle missing optional fields in JSON representation', () => {
      const minimalApiKey = {
        id: 'minimal123',
        permissions: [],
        name: 'Minimal Key'
      };
      const subject = new ApiKeySubject(minimalApiKey);
      const json = subject.toJSON();

      expect(json.metadata.userId).toBeUndefined();
      expect(json.metadata.rateLimit).toBeUndefined();
      expect(json.metadata.expiresAt).toBeUndefined();
    });
  });

  describe('additional edge cases', () => {
    it('should handle SYSTEM_ADMIN permission hierarchies correctly', () => {
      const adminApiKey = { ...mockApiKey, permissions: [Permission.SYSTEM_ADMIN] };
      const subject = new ApiKeySubject(adminApiKey);

      // Should have all system permissions
      expect(subject.hasPermission(Permission.SYSTEM_MONITOR)).toBe(true);
      expect(subject.hasPermission(Permission.SYSTEM_METRICS)).toBe(true);
      expect(subject.hasPermission(Permission.SYSTEM_HEALTH)).toBe(true);

      // Should not have non-system permissions
      expect(subject.hasPermission(Permission.DATA_READ)).toBe(false);
    });

    it('should handle permissions array with undefined values', () => {
      const apiKeyWithUndefinedPermissions = { ...mockApiKey, permissions: undefined };
      const subject = new ApiKeySubject(apiKeyWithUndefinedPermissions);

      expect(subject.permissions).toEqual([]);
      expect(subject.hasPermission(Permission.DATA_READ)).toBe(false);
    });

    it('should handle userId as ObjectId-like object', () => {
      const apiKeyWithObjectIdUserId = {
        ...mockApiKey,
        userId: { toString: () => '507f1f77bcf86cd799439011' }
      };
      const subject = new ApiKeySubject(apiKeyWithObjectIdUserId);

      expect(subject.metadata.userId).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle _id as ObjectId-like object', () => {
      const apiKeyWithObjectId = {
        ...mockApiKey,
        id: undefined,
        _id: { toString: () => '507f1f77bcf86cd799439011' }
      };
      const subject = new ApiKeySubject(apiKeyWithObjectId);

      expect(subject.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle missing totalRequestCount in usage stats', () => {
      const apiKeyWithoutRequestCount = { ...mockApiKey, totalRequestCount: undefined };
      const subject = new ApiKeySubject(apiKeyWithoutRequestCount);
      const stats = subject.getUsageStats();

      expect(stats.totalRequestCount).toBe(0);
    });

    it('should validate userId when provided as empty string', () => {
      const apiKeyWithEmptyUserId = { ...mockApiKey, userId: '' };

      expect(() => new ApiKeySubject(apiKeyWithEmptyUserId)).toThrow('API Key关联的用户ID格式无效');
    });

    it('should handle null userId in belongsToUser', () => {
      const apiKeyWithNullUserId = { ...mockApiKey, userId: null };
      const subject = new ApiKeySubject(apiKeyWithNullUserId);

      expect(subject.belongsToUser('507f1f77bcf86cd799439011')).toBe(false);
    });

    it('should handle edge case in hasPermission with SYSTEM_ADMIN checking non-system permissions', () => {
      const adminApiKey = { ...mockApiKey, permissions: [Permission.SYSTEM_ADMIN] };
      const subject = new ApiKeySubject(adminApiKey);

      // Test permissions that are not in the system permissions array
      expect(subject.hasPermission(Permission.USER_MANAGE)).toBe(false);
      expect(subject.hasPermission(Permission.DATA_WRITE)).toBe(false);
    });

    it('should handle isValid with exactly current time expiration', () => {
      const now = new Date();
      const apiKeyExpiringNow = { ...mockApiKey, expiresAt: now };
      const subject = new ApiKeySubject(apiKeyExpiringNow);

      // Since the comparison uses < (strictly less than), this should be false
      expect(subject.isValid()).toBe(false);
    });

    it('should handle different operation status values', () => {
      const statuses = [OperationStatus.PENDING, OperationStatus.FAILED, OperationStatus.CANCELLED];

      statuses.forEach(status => {
        const apiKeyWithStatus = { ...mockApiKey, status };
        const subject = new ApiKeySubject(apiKeyWithStatus);
        expect(subject.isValid()).toBe(false);
      });
    });
  });
});