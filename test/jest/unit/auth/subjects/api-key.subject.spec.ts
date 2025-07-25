import { Permission } from "../../../../../src/auth/enums/user-role.enum";
import { AuthSubjectType } from "../../../../../src/auth/interfaces/auth-subject.interface";
import { ApiKeySubject } from "../../../../../src/auth/subjects/api-key.subject";

describe("ApiKeySubject", () => {
  const mockApiKeyData = {
    id: "test-api-key-id",
    name: "Test API Key",
    appKey: "test-app-key",
    userId: "user-123",
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    rateLimit: { requests: 1000, window: "1h" },
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    usageCount: 42,
    lastUsedAt: new Date(),
    createdAt: new Date(),
  };

  describe("Constructor", () => {
    it("should create ApiKeySubject with valid API key data", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      expect(subject.id).toBe(mockApiKeyData.id);
      expect(subject.type).toBe(AuthSubjectType.API_KEY);
      expect(subject.permissions).toEqual(mockApiKeyData.permissions);
      expect(subject.metadata.name).toBe(mockApiKeyData.name);
      expect(subject.metadata.appKey).toBe(mockApiKeyData.appKey);
      expect(subject.metadata.userId).toBe(mockApiKeyData.userId);
      expect(subject.metadata.rateLimit).toEqual(mockApiKeyData.rateLimit);
      expect(subject.metadata.isActive).toBe(mockApiKeyData.isActive);
    });

    it("should handle API key data with MongoDB ObjectId format", () => {
      const mongoApiKey = {
        _id: { toString: () => "mongo-object-id" },
        name: "Mongo API Key",
        permissions: [Permission.DATA_READ],
        isActive: true,
      };

      const subject = new ApiKeySubject(mongoApiKey);

      expect(subject.id).toBe("mongo-object-id");
      expect(subject.metadata.name).toBe("Mongo API Key");
    });

    it("should handle empty permissions array", () => {
      const apiKeyWithEmptyPermissions = {
        ...mockApiKeyData,
        permissions: [],
      };

      const subject = new ApiKeySubject(apiKeyWithEmptyPermissions);

      expect(subject.permissions).toEqual([]);
    });

    it("should handle missing optional fields", () => {
      const minimalApiKey = {
        id: "minimal-key",
        permissions: [Permission.DATA_READ],
      };

      const subject = new ApiKeySubject(minimalApiKey);

      expect(subject.id).toBe("minimal-key");
      expect(subject.permissions).toEqual([Permission.DATA_READ]);
      expect(subject.metadata.name).toBeUndefined();
      expect(subject.metadata.appKey).toBeUndefined();
      expect(subject.metadata.rateLimit).toBeUndefined();
    });

    it("should throw error when ID is missing", () => {
      const apiKeyWithoutId = {
        name: "Key without ID",
        permissions: [Permission.DATA_READ],
      };

      expect(() => new ApiKeySubject(apiKeyWithoutId)).toThrow(
        "API Key主体缺少必要的ID字段",
      );
    });

    it("should handle non-array permissions by converting to empty array", () => {
      const apiKeyWithInvalidPermissions = {
        id: "test-id",
        permissions: "invalid-permissions",
      };

      const subject = new ApiKeySubject(apiKeyWithInvalidPermissions);
      expect(subject.permissions).toEqual([]);
    });

    it("should handle null permissions gracefully", () => {
      const apiKeyWithNullPermissions = {
        id: "test-id",
        permissions: null,
      };

      const subject = new ApiKeySubject(apiKeyWithNullPermissions);

      expect(subject.permissions).toEqual([]);
    });

    it("should handle undefined permissions gracefully", () => {
      const apiKeyWithUndefinedPermissions = {
        id: "test-id",
      };

      const subject = new ApiKeySubject(apiKeyWithUndefinedPermissions);

      expect(subject.permissions).toEqual([]);
    });
  });

  describe("hasPermission()", () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKeyData);
    });

    it("should return true for permissions the API key has", () => {
      expect(subject.hasPermission(Permission.DATA_READ)).toBe(true);
      expect(subject.hasPermission(Permission.QUERY_EXECUTE)).toBe(true);
    });

    it("should return false for permissions the API key does not have", () => {
      expect(subject.hasPermission(Permission.USER_MANAGE)).toBe(false);
      expect(subject.hasPermission(Permission.SYSTEM_ADMIN)).toBe(false);
    });

    it("should handle system admin hierarchical permissions", () => {
      const adminApiKey = {
        ...mockApiKeyData,
        permissions: [Permission.SYSTEM_ADMIN],
      };
      const adminSubject = new ApiKeySubject(adminApiKey);

      expect(adminSubject.hasPermission(Permission.SYSTEM_ADMIN)).toBe(true);
      expect(adminSubject.hasPermission(Permission.SYSTEM_MONITOR)).toBe(true);
      expect(adminSubject.hasPermission(Permission.SYSTEM_METRICS)).toBe(true);
      expect(adminSubject.hasPermission(Permission.SYSTEM_HEALTH)).toBe(true);
      expect(adminSubject.hasPermission(Permission.DATA_READ)).toBe(false);
    });

    it("should not grant non-system permissions to system admin", () => {
      const adminApiKey = {
        ...mockApiKeyData,
        permissions: [Permission.SYSTEM_ADMIN],
      };
      const adminSubject = new ApiKeySubject(adminApiKey);

      expect(adminSubject.hasPermission(Permission.DATA_READ)).toBe(false);
      expect(adminSubject.hasPermission(Permission.QUERY_EXECUTE)).toBe(false);
    });
  });

  describe("hasAllPermissions()", () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKeyData);
    });

    it("should return true when API key has all specified permissions", () => {
      const result = subject.hasAllPermissions([
        Permission.DATA_READ,
        Permission.QUERY_EXECUTE,
      ]);

      expect(result).toBe(true);
    });

    it("should return false when API key is missing any permission", () => {
      const result = subject.hasAllPermissions([
        Permission.DATA_READ,
        Permission.USER_MANAGE,
      ]);

      expect(result).toBe(false);
    });

    it("should return true for empty permissions array", () => {
      const result = subject.hasAllPermissions([]);

      expect(result).toBe(true);
    });

    it("should work with hierarchical permissions", () => {
      const adminApiKey = {
        ...mockApiKeyData,
        permissions: [Permission.SYSTEM_ADMIN],
      };
      const adminSubject = new ApiKeySubject(adminApiKey);

      const result = adminSubject.hasAllPermissions([
        Permission.SYSTEM_MONITOR,
        Permission.SYSTEM_METRICS,
      ]);

      expect(result).toBe(true);
    });
  });

  describe("hasAnyPermission()", () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKeyData);
    });

    it("should return true when API key has at least one specified permission", () => {
      const result = subject.hasAnyPermission([
        Permission.DATA_READ,
        Permission.USER_MANAGE,
      ]);

      expect(result).toBe(true);
    });

    it("should return false when API key has none of the specified permissions", () => {
      const result = subject.hasAnyPermission([
        Permission.USER_MANAGE,
        Permission.SYSTEM_ADMIN,
      ]);

      expect(result).toBe(false);
    });

    it("should return false for empty permissions array", () => {
      const result = subject.hasAnyPermission([]);

      expect(result).toBe(false);
    });

    it("should work with hierarchical permissions", () => {
      const adminApiKey = {
        ...mockApiKeyData,
        permissions: [Permission.SYSTEM_ADMIN],
      };
      const adminSubject = new ApiKeySubject(adminApiKey);

      const result = adminSubject.hasAnyPermission([
        Permission.SYSTEM_MONITOR,
        Permission.DATA_READ,
      ]);

      expect(result).toBe(true);
    });
  });

  describe("getDisplayName()", () => {
    it("should return formatted display name with API key name", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      expect(subject.getDisplayName()).toBe("API Key: Test API Key");
    });

    it("should handle unnamed API keys", () => {
      const unnamedApiKey = {
        ...mockApiKeyData,
        name: undefined,
      };
      const subject = new ApiKeySubject(unnamedApiKey);

      expect(subject.getDisplayName()).toBe("API Key: unnamed");
    });

    it("should handle empty string names", () => {
      const emptyNameApiKey = {
        ...mockApiKeyData,
        name: "",
      };
      const subject = new ApiKeySubject(emptyNameApiKey);

      expect(subject.getDisplayName()).toBe("API Key: unnamed");
    });
  });

  describe("isValid()", () => {
    it("should return true for active and non-expired API key", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      expect(subject.isValid()).toBe(true);
    });

    it("should return false for inactive API key", () => {
      const inactiveApiKey = {
        ...mockApiKeyData,
        isActive: false,
      };
      const subject = new ApiKeySubject(inactiveApiKey);

      expect(subject.isValid()).toBe(false);
    });

    it("should return false for expired API key", () => {
      const expiredApiKey = {
        ...mockApiKeyData,
        expiresAt: new Date(Date.now() - 86400000), // 24 hours ago
      };
      const subject = new ApiKeySubject(expiredApiKey);

      expect(subject.isValid()).toBe(false);
    });

    it("should return true when expiresAt is null or undefined", () => {
      const neverExpiresApiKey = {
        ...mockApiKeyData,
        expiresAt: null,
      };
      const subject = new ApiKeySubject(neverExpiresApiKey);

      expect(subject.isValid()).toBe(true);
    });

    it("should handle edge case where expiresAt equals current time", () => {
      // Set a time slightly in the past to ensure it fails validation
      const pastTime = new Date(Date.now() - 1);
      const edgeCaseApiKey = {
        ...mockApiKeyData,
        expiresAt: pastTime,
      };
      const subject = new ApiKeySubject(edgeCaseApiKey);

      expect(subject.isValid()).toBe(false);
    });
  });

  describe("getRateLimit()", () => {
    it("should return rate limit configuration when present", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      const rateLimit = subject.getRateLimit();

      expect(rateLimit).toEqual({ requests: 1000, window: "1h" });
    });

    it("should return null when rate limit is not configured", () => {
      const noRateLimitApiKey = {
        ...mockApiKeyData,
        rateLimit: null,
      };
      const subject = new ApiKeySubject(noRateLimitApiKey);

      const rateLimit = subject.getRateLimit();

      expect(rateLimit).toBeNull();
    });

    it("should return null when rate limit is undefined", () => {
      const { rateLimit, ...apiKeyWithoutRateLimit } = mockApiKeyData;
      void rateLimit;
      const subject = new ApiKeySubject(apiKeyWithoutRateLimit);

      const rateLimitResult = subject.getRateLimit();

      expect(rateLimitResult).toBeNull();
    });
  });

  describe("getUsageStats()", () => {
    it("should return usage statistics with all fields", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      const stats = subject.getUsageStats();

      expect(stats.usageCount).toBe(42);
      expect(stats.lastUsedAt).toEqual(mockApiKeyData.lastUsedAt);
      expect(stats.createdAt).toEqual(mockApiKeyData.createdAt);
    });

    it("should handle missing usage count", () => {
      const { usageCount, ...apiKeyWithoutUsageCount } = mockApiKeyData;
      void usageCount;
      const subject = new ApiKeySubject(apiKeyWithoutUsageCount);

      const stats = subject.getUsageStats();

      expect(stats.usageCount).toBe(0);
    });

    it("should handle missing lastUsedAt", () => {
      const { lastUsedAt, ...apiKeyWithoutLastUsed } = mockApiKeyData;
      void lastUsedAt;
      const subject = new ApiKeySubject(apiKeyWithoutLastUsed);

      const stats = subject.getUsageStats();

      expect(stats.lastUsedAt).toBeNull();
    });

    it("should convert date strings to Date objects", () => {
      const apiKeyWithStringDates = {
        ...mockApiKeyData,
        lastUsedAt: "2023-01-01T00:00:00.000Z",
        createdAt: "2023-01-01T00:00:00.000Z",
      };
      const subject = new ApiKeySubject(apiKeyWithStringDates);

      const stats = subject.getUsageStats();

      expect(stats.lastUsedAt).toBeInstanceOf(Date);
      expect(stats.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("belongsToUser()", () => {
    let subject: ApiKeySubject;

    beforeEach(() => {
      subject = new ApiKeySubject(mockApiKeyData);
    });

    it("should return true when API key belongs to specified user", () => {
      const result = subject.belongsToUser("user-123");

      expect(result).toBe(true);
    });

    it("should return false when API key belongs to different user", () => {
      const result = subject.belongsToUser("user-456");

      expect(result).toBe(false);
    });

    it("should return false when userId is undefined", () => {
      const noUserApiKey = {
        ...mockApiKeyData,
        userId: undefined,
      };
      const noUserSubject = new ApiKeySubject(noUserApiKey);

      const result = noUserSubject.belongsToUser("user-123");

      expect(result).toBe(false);
    });

    it("should handle userId as ObjectId toString conversion", () => {
      const objectIdApiKey = {
        ...mockApiKeyData,
        userId: { toString: () => "object-id-user" },
      };
      const objectIdSubject = new ApiKeySubject(objectIdApiKey);

      const result = objectIdSubject.belongsToUser("object-id-user");

      expect(result).toBe(true);
    });
  });

  describe("toJSON()", () => {
    it("should return JSON representation with all required fields", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      const json = subject.toJSON();

      expect(json).toEqual({
        type: AuthSubjectType.API_KEY,
        id: mockApiKeyData.id,
        permissions: mockApiKeyData.permissions,
        metadata: {
          name: mockApiKeyData.name,
          appKey: mockApiKeyData.appKey,
          userId: mockApiKeyData.userId,
          isActive: mockApiKeyData.isActive,
          expiresAt: mockApiKeyData.expiresAt,
          rateLimit: mockApiKeyData.rateLimit,
        },
      });
    });

    it("should exclude sensitive or internal fields from JSON", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      const json = subject.toJSON();

      expect(json.metadata).not.toHaveProperty("usageCount");
      expect(json.metadata).not.toHaveProperty("lastUsedAt");
      expect(json.metadata).not.toHaveProperty("createdAt");
    });

    it("should handle missing optional metadata fields", () => {
      const minimalApiKey = {
        id: "minimal-key",
        permissions: [Permission.DATA_READ],
      };
      const subject = new ApiKeySubject(minimalApiKey);

      const json = subject.toJSON();

      expect(json.metadata.name).toBeUndefined();
      expect(json.metadata.appKey).toBeUndefined();
      expect(json.metadata.userId).toBeUndefined();
      expect(json.metadata.rateLimit).toBeUndefined();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed API key data gracefully", () => {
      const malformedApiKey = {
        id: "test-id",
        permissions: [Permission.DATA_READ],
        expiresAt: "invalid-date",
        rateLimit: "invalid-rate-limit",
      };

      expect(() => new ApiKeySubject(malformedApiKey)).not.toThrow();

      const subject = new ApiKeySubject(malformedApiKey);
      expect(subject.id).toBe("test-id");
      expect(subject.permissions).toEqual([Permission.DATA_READ]);
    });

    it("should handle extremely large permission arrays", () => {
      const allPermissions = Object.values(Permission);
      const largePermissionsApiKey = {
        id: "large-permissions-key",
        permissions: allPermissions,
      };

      const subject = new ApiKeySubject(largePermissionsApiKey);

      expect(subject.permissions).toEqual(allPermissions);
      expect(subject.hasAllPermissions(allPermissions)).toBe(true);
    });

    it("should handle concurrent access patterns", () => {
      const subject = new ApiKeySubject(mockApiKeyData);

      // Simulate concurrent permission checks
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(subject.hasPermission(Permission.DATA_READ)),
      );

      return Promise.all(promises).then((results) => {
        expect(results.every((result) => result === true)).toBe(true);
      });
    });
  });

  describe("Performance Considerations", () => {
    it("should efficiently handle permission lookups", () => {
      const start = performance.now();
      const subject = new ApiKeySubject(mockApiKeyData);

      // Perform multiple permission checks
      for (let i = 0; i < 1000; i++) {
        subject.hasPermission(Permission.DATA_READ);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100); // 100ms for 1000 operations
    });

    it("should not modify original API key data", () => {
      const originalData = { ...mockApiKeyData };
      const subject = new ApiKeySubject(mockApiKeyData);

      // Modify subject
      subject.permissions.push(Permission.USER_MANAGE as any);

      // Original data should remain unchanged
      expect(mockApiKeyData).toEqual(originalData);
    });
  });
});
