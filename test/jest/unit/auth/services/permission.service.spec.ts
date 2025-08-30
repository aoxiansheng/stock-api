/* eslint-disable @typescript-eslint/no-unused-vars */
// 禁用自动mock映射，直接导入真实的PermissionService
jest.unmock("../../../../../src/auth/services/permission.service");

import { Test, TestingModule } from "@nestjs/testing";
import { PermissionService } from "../../../../../src/auth/services/permission.service";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import {
  AuthSubject,
  AuthSubjectType,
} from "../../../../../src/auth/interfaces/auth-subject.interface";
import {
  Permission,
  UserRole,
} from "../../../../../src/auth/enums/user-role.enum";

// Mock createLogger to provide controlled logger instance
jest.mock("@app/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock security config
jest.mock("../../../../../src/common/config/security.config", () => ({
  securityConfig: {
    permission: {
      cachePrefix: "permission",
      cacheTtlSeconds: 300,
    },
  },
}));

// Mock permission constants
jest.mock("../../../../../src/auth/constants/permission.constants", () => ({
  PERMISSIONOPERATIONS: {
    CHECKPERMISSIONS: "checkPermissions",
    INVALIDATECACHE: "invalidateCacheFor",
  },
  PERMISSIONMESSAGES: {
    PERMISSION_CHECKSTARTED: "Permission check started",
    CACHEHIT: "Cache hit",
    CACHEMISS: "Cache miss",
    CHECKPASSED: "Check passed",
    CHECKFAILED: "Check failed",
    CACHEINVALIDATED: "Cache invalidated",
    NO_CACHE_TOINVALIDATE: "No cache to invalidate",
    CACHE_INVALIDATION_FAILED: "Cache invalidation failed",
  },
}));

// Mock permission utils
jest.mock("../../../../../src/auth/utils/permission.utils", () => ({
  PermissionTemplateUtil: {
    generateDetails: jest.fn((template, params) => `Mocked details for ${template}`),
  },
}));

describe("PermissionService - Enhanced Coverage", () => {
  let service: PermissionService;
  let cacheService: jest.Mocked<CacheService>;
  let logSpies: {
    log: jest.SpyInstance;
    debug: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  const createMockSubject = (
    permissions: Permission[] = [],
    role?: UserRole,
    id: string = "user123",
    type: AuthSubjectType = AuthSubjectType.JWT_USER,
  ): AuthSubject => {
    return {
      type,
      id,
      permissions,
      role,
      getDisplayName: () => `TestUser-${id}`,
      hasPermission: (permission: Permission) =>
        permissions.includes(permission),
      hasAllPermissions: (perms: Permission[]) =>
        perms.every((p) => permissions.includes(p)),
      hasAnyPermission: (perms: Permission[]) =>
        perms.some((p) => permissions.includes(p)),
    };
  };

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      _set: jest.fn(),
      _delByPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    cacheService = module.get(CacheService);

    // Set up logger spies using the service's logger
    logSpies = {
      log: jest.spyOn((service as any).logger, "log").mockImplementation(),
      debug: jest.spyOn((service as any).logger, "debug").mockImplementation(),
      warn: jest.spyOn((service as any).logger, "warn").mockImplementation(),
      error: jest.spyOn((service as any).logger, "error").mockImplementation(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkPermissions - Cache Scenarios", () => {
    it("should return cached result when cache hit", async () => {
      const subject = createMockSubject([Permission.DATA_READ]);
      const cachedResult = {
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: 100,
        details: "Cache hit result",
      };

      cacheService.get.mockResolvedValue(cachedResult);
      
      const result = await service.checkPermissions(subject, [
        Permission.DATA_READ,
      ]);

      expect(result).toEqual(cachedResult);
      expect(cacheService.get).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it("should perform fresh check when cache miss", async () => {
      const subject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(subject, [
        Permission.DATA_READ,
      ]);

      expect(result.allowed).toBe(true);
      expect(result.missingPermissions).toEqual([]);
      expect(cacheService.get).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it("should handle cache service errors gracefully", async () => {
      const subject = createMockSubject([Permission.DATA_READ]);
      const cacheError = new Error("Cache service error");

      cacheService.get.mockRejectedValue(cacheError);

      await expect(
        service.checkPermissions(subject, [Permission.DATA_READ]),
      ).rejects.toThrow(cacheError);

      expect(logSpies.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operation: "checkPermissions" }),
      );
    });
  });

  describe("checkPermissions - Permission Logic Branches", () => {
    it("should identify missing permissions correctly", async () => {
      const subject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(subject, [
        Permission.DATA_READ,
        Permission.CONFIG_WRITE,
        Permission.QUERY_EXECUTE,
      ]);

      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toEqual([
        Permission.CONFIG_WRITE,
        Permission.QUERY_EXECUTE,
      ]);
    });

    it("should handle empty required permissions array", async () => {
      const subject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(subject, []);

      expect(result.allowed).toBe(true);
      expect(result.missingPermissions).toEqual([]);
    });

    it("should check role requirements when provided", async () => {
      const subject = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(
        subject,
        [Permission.DATA_READ],
        [UserRole.ADMIN],
      );

      expect(result.allowed).toBe(false);
      expect(result.missingRoles).toEqual([UserRole.ADMIN]);
    });

    it("should pass when subject has required role", async () => {
      const subject = createMockSubject([Permission.DATA_READ], UserRole.ADMIN);

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(
        subject,
        [Permission.DATA_READ],
        [UserRole.ADMIN],
      );

      expect(result.allowed).toBe(true);
      expect(result.missingRoles).toEqual([]);
    });

    it("should handle subject without role when roles required", async () => {
      const subject = createMockSubject([Permission.DATA_READ]); // No role provided

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(
        subject,
        [Permission.DATA_READ],
        [UserRole.ADMIN],
      );

      expect(result.allowed).toBe(false);
      expect(result.missingRoles).toEqual([UserRole.ADMIN]);
    });

    it("should skip role check when no roles required", async () => {
      const subject = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(
        subject,
        [Permission.DATA_READ],
        [],
      );

      expect(result.allowed).toBe(true);
      expect(result.missingRoles).toEqual([]);
    });
  });

  describe("combinePermissions", () => {
    it("should combine multiple permission arrays and remove duplicates", () => {
      const list1 = [Permission.DATA_READ, Permission.CONFIG_WRITE];
      const list2 = [Permission.DATA_READ, Permission.QUERY_EXECUTE];
      const list3 = [Permission.PROVIDERS_READ];

      const combined = service.combinePermissions(list1, list2, list3);

      expect(combined).toEqual(
        expect.arrayContaining([
          Permission.DATA_READ,
          Permission.CONFIG_WRITE,
          Permission.QUERY_EXECUTE,
          Permission.PROVIDERS_READ,
        ]),
      );
      expect(combined.length).toBe(4); // No duplicates
    });

    it("should handle empty arrays", () => {
      const combined = service.combinePermissions(
        [],
        [],
        [Permission.DATA_READ],
      );
      expect(combined).toEqual([Permission.DATA_READ]);
    });

    it("should handle no arguments", () => {
      const combined = service.combinePermissions();
      expect(combined).toEqual([]);
    });
  });

  describe("getEffectivePermissions", () => {
    it("should return copy of subject permissions", () => {
      const permissions = [Permission.DATA_READ, Permission.CONFIG_WRITE];
      const subject = createMockSubject(permissions);

      const effective = service.getEffectivePermissions(subject);

      expect(effective).toEqual(permissions);
      expect(effective).not.toBe(permissions); // Should be a copy
    });

    it("should handle empty permissions", () => {
      const subject = createMockSubject([]);
      const effective = service.getEffectivePermissions(subject);
      expect(effective).toEqual([]);
    });
  });

  describe("createPermissionContext", () => {
    it("should create comprehensive permission context", async () => {
      const subject = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const context = await service.createPermissionContext(
        subject,
        [Permission.DATA_READ],
        [UserRole.DEVELOPER],
      );

      expect(context.subject).toBe(subject);
      expect(context.requiredPermissions).toEqual([Permission.DATA_READ]);
      expect(context.requiredRoles).toEqual([UserRole.DEVELOPER]);
      expect(context.grantedPermissions).toEqual([Permission.DATA_READ]);
      expect(context.hasAccess).toBe(true);
      expect(context.details.missingPermissions).toEqual([]);
      expect(context.details.timestamp).toBeInstanceOf(Date);
    });

    it("should create context with access denied", async () => {
      const subject = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const context = await service.createPermissionContext(
        subject,
        [Permission.SYSTEM_ADMIN],
        [UserRole.ADMIN],
      );

      expect(context.hasAccess).toBe(false);
      expect(context.details.missingPermissions).toEqual([
        Permission.SYSTEM_ADMIN,
      ]);
    });
  });

  describe("invalidateCacheFor", () => {
    it("should invalidate cache and log success when entries deleted", async () => {
      const subject = createMockSubject([], UserRole.DEVELOPER, "user456");

      cacheService.delByPattern.mockResolvedValue(3);

      await service.invalidateCacheFor(subject);

      expect(cacheService.delByPattern).toHaveBeenCalledWith(
        expect.stringContaining("jwtuser:user456:"),
      );
      expect(logSpies.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operation: "invalidateCacheFor" }),
      );
    });

    it("should log debug message when no cache entries to delete", async () => {
      const subject = createMockSubject([], UserRole.DEVELOPER, "user789");

      cacheService.delByPattern.mockResolvedValue(0);

      await service.invalidateCacheFor(subject);

      expect(cacheService.delByPattern).toHaveBeenCalled();
      expect(logSpies.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operation: "invalidateCacheFor" }),
      );
    });

    it("should handle cache deletion errors", async () => {
      const subject = createMockSubject([], UserRole.DEVELOPER, "user999");
      const deletionError = new Error("Cache deletion failed");

      cacheService.delByPattern.mockRejectedValue(deletionError);

      await expect(service.invalidateCacheFor(subject)).rejects.toThrow(
        deletionError,
      );

      expect(logSpies.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ operation: "invalidateCacheFor" }),
      );
    });
  });

  describe("Private method behavior through public interfaces", () => {
    it("should generate different cache keys for different subjects", async () => {
      const subject1 = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
        "user1",
      );
      const subject2 = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
        "user2",
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      await service.checkPermissions(subject1, [Permission.DATA_READ]);
      await service.checkPermissions(subject2, [Permission.DATA_READ]);

      // Verify that different cache keys were generated
      expect(cacheService.get).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = cacheService.get.mock.calls;
      expect(firstCall[0]).not.toBe(secondCall[0]);
      expect(firstCall[0]).toContain("user1");
      expect(secondCall[0]).toContain("user2");
    });

    it("should generate consistent cache keys for same parameters", async () => {
      const subject = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
        "consistent",
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      await service.checkPermissions(subject, [
        Permission.DATA_READ,
        Permission.CONFIG_WRITE,
      ]);
      await service.checkPermissions(subject, [
        Permission.CONFIG_WRITE,
        Permission.DATA_READ,
      ]); // Different order

      // Should generate same cache key since permissions are sorted
      const [firstCall, secondCall] = cacheService.get.mock.calls;
      expect(firstCall[0]).toBe(secondCall[0]);
    });

    it("should log with appropriate level based on check result", async () => {
      const subject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      // Success case
      await service.checkPermissions(subject, [Permission.DATA_READ]);

      // Failure case
      await service.checkPermissions(subject, [Permission.SYSTEM_ADMIN]);

      // Check that different log levels were used
      expect(logSpies.debug).toHaveBeenCalled();
      expect(logSpies.warn).toHaveBeenCalled();
    });
  });

  describe("Edge cases and error scenarios", () => {
    it("should handle subject types other than JWT_USER", async () => {
      const subject = createMockSubject(
        [Permission.DATA_READ],
        UserRole.DEVELOPER,
        "api-key-123",
        AuthSubjectType.API_KEY,
      );

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(subject, [
        Permission.DATA_READ,
      ]);

      expect(result.allowed).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining("api_key:api-key-123:"),
      );
    });

    it("should handle concurrent permission checks", async () => {
      jest.useFakeTimers();
      const subject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const promises = Array.from({ length: 5 }, () => {
        const promise = service.checkPermissions(subject, [
          Permission.DATA_READ,
        ]);
        jest.advanceTimersByTime(10); // 模拟10ms的延迟
        return promise;
      });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.allowed).toBe(true);
        expect(result.duration).toBeGreaterThanOrEqual(10);
      });
      jest.useRealTimers();
    });

    it("should handle very long permission and role lists", async () => {
      const subject = createMockSubject(Object.values(Permission));

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.checkPermissions(
        subject,
        Object.values(Permission),
        [UserRole.ADMIN, UserRole.DEVELOPER],
      );

      expect(result.allowed).toBe(false); // Subject doesn't have ADMIN role
      expect(result.missingPermissions).toEqual([]);
      expect(result.missingRoles.length).toBeGreaterThan(0);
    });
  });
});
