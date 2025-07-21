import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../../../../src/auth/services/permission.service';
import { CacheService } from '../../../../src/cache/cache.service';
import { AuthSubject, AuthSubjectType } from '../../../../src/auth/interfaces/auth-subject.interface';
import { Permission, UserRole } from '../../../../src/auth/enums/user-role.enum';
import {
  PERMISSION_OPERATIONS,
  PERMISSION_MESSAGES,
  PermissionTemplateUtil,
} from '../../../../src/auth/constants/permission.constants';

describe('PermissionService Optimization Features', () => {
  let service: PermissionService;
  let cacheService: jest.Mocked<CacheService>;
  let loggerSpy: jest.SpyInstance;

  // Helper function to create mock subject
  const createMockSubject = (permissions: Permission[] = [], role: UserRole = UserRole.DEVELOPER): AuthSubject => {
    const subject: AuthSubject = {
      type: AuthSubjectType.JWT_USER,
      id: 'user123',
      permissions: permissions,
      role,
      getDisplayName: () => 'TestUser',
      hasPermission: (permission: Permission) => permissions.includes(permission),
      hasAllPermissions: (perms: Permission[]) => perms.every(p => permissions.includes(p)),
      hasAnyPermission: (perms: Permission[]) => perms.some(p => permissions.includes(p)),
    };
    return subject;
  };

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delByPattern: jest.fn(),
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

    // Spy on logger
    loggerSpy = jest.spyOn((service as any).logger, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constants Usage', () => {
    it('should use operation constants for all methods', () => {
      expect(PERMISSION_OPERATIONS.CHECK_PERMISSIONS).toBe('checkPermissions');
      expect(PERMISSION_OPERATIONS.INVALIDATE_CACHE).toBe('invalidateCacheFor');
    });

    it('should use message constants for logging', () => {
      expect(PERMISSION_MESSAGES.CHECK_PASSED).toBe('权限检查通过');
      expect(PERMISSION_MESSAGES.CHECK_FAILED).toBe('权限检查失败');
      expect(PERMISSION_MESSAGES.CACHE_HIT).toBe('权限检查命中缓存');
      expect(PERMISSION_MESSAGES.CACHE_INVALIDATED).toBe('权限缓存已失效');
    });
  });

  describe('Enhanced Permission Checking', () => {
    it('should use constants for permission check start logging', async () => {
      const mockSubject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null); // Cache miss
      cacheService.set.mockResolvedValue(true);

      await service.checkPermissions(mockSubject, [Permission.DATA_READ]);

      expect(loggerSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.PERMISSION_CHECK_STARTED,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.CHECK_PERMISSIONS,
          subject: 'TestUser',
        })
      );
    });

    it('should use constants for cache hit logging', async () => {
      const mockSubject = createMockSubject([Permission.DATA_READ]);

      const cachedResult = {
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        details: 'Cached result',
        duration: 0,
      };

      cacheService.get.mockResolvedValue(cachedResult);

      await service.checkPermissions(mockSubject, [Permission.DATA_READ]);

      expect(loggerSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.CACHE_HIT,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.CHECK_PERMISSIONS,
          subject: 'TestUser',
          cache: 'hit',
        })
      );
    });

    it('should use constants for cache miss logging', async () => {
      const mockSubject = createMockSubject([Permission.DATA_READ]);

      cacheService.get.mockResolvedValue(null); // Cache miss
      cacheService.set.mockResolvedValue(true);

      await service.checkPermissions(mockSubject, [Permission.DATA_READ]);

      expect(loggerSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.CACHE_MISS,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.CHECK_PERMISSIONS,
          subject: 'TestUser',
          cache: 'miss',
        })
      );
    });

    it('should use constants for permission check failure', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
      const mockSubject = createMockSubject([]);

      cacheService.get.mockRejectedValue(new Error('Cache error'));

      try {
        await service.checkPermissions(mockSubject, [Permission.DATA_READ]);
      } catch (error) {
        // Expected to throw
      }

      expect(errorSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.CHECK_FAILED,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.CHECK_PERMISSIONS,
          subject: 'TestUser',
        })
      );
    });
  });

  describe('Enhanced Cache Invalidation', () => {
    it('should use constants for cache invalidation success', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();
      const mockSubject = createMockSubject([]);

      cacheService.delByPattern.mockResolvedValue(5); // 5 keys deleted

      await service.invalidateCacheFor(mockSubject);

      expect(logSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.CACHE_INVALIDATED,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.INVALIDATE_CACHE,
          subject: 'TestUser',
          deletedCount: 5,
        })
      );
    });

    it('should use constants for no cache to invalidate', async () => {
      const mockSubject = createMockSubject([]);

      cacheService.delByPattern.mockResolvedValue(0); // No keys deleted

      await service.invalidateCacheFor(mockSubject);

      expect(loggerSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.NO_CACHE_TO_INVALIDATE,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.INVALIDATE_CACHE,
          subject: 'TestUser',
        })
      );
    });

    it('should use constants for cache invalidation failure', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();
      const mockSubject = createMockSubject([]);

      cacheService.delByPattern.mockRejectedValue(new Error('Cache error'));

      await expect(service.invalidateCacheFor(mockSubject)).rejects.toThrow('Cache error');

      expect(errorSpy).toHaveBeenCalledWith(
        PERMISSION_MESSAGES.CACHE_INVALIDATION_FAILED,
        expect.objectContaining({
          operation: PERMISSION_OPERATIONS.INVALIDATE_CACHE,
          subject: 'TestUser',
        })
      );
    });
  });

  describe('Template Utility Functions', () => {
    it('should generate check passed details using template', () => {
      const result = PermissionTemplateUtil.generateDetails('CHECK_PASSED', {
        subjectName: 'TestUser',
      });

      expect(result).toBe('权限检查通过: TestUser');
    });

    it('should generate check failed details using template', () => {
      const result = PermissionTemplateUtil.generateDetails('CHECK_FAILED', {
        subjectName: 'TestUser',
      });

      expect(result).toBe('权限检查失败: TestUser');
    });

    it('should generate missing permissions details using template', () => {
      const result = PermissionTemplateUtil.generateDetails('MISSING_PERMISSIONS', {
        permissions: ['read_stock_data', 'write_stock_data'],
      });

      expect(result).toBe('缺失权限: [read_stock_data, write_stock_data]');
    });

    it('should generate required roles details using template', () => {
      const result = PermissionTemplateUtil.generateDetails('REQUIRED_ROLES', {
        requiredRoles: ['admin', 'manager'],
        currentRole: 'developer',
      });

      expect(result).toBe('要求角色之一: [admin, manager], 当前角色: developer');
    });

    it('should replace template placeholders correctly', () => {
      const template = '用户 {username} 拥有 {count} 个权限';
      const result = PermissionTemplateUtil.replaceTemplate(template, {
        username: 'testuser',
        count: 5,
      });

      expect(result).toBe('用户 testuser 拥有 5 个权限');
    });

    it('should handle array values in template replacement', () => {
      const template = '权限列表: {permissions}';
      const result = PermissionTemplateUtil.replaceTemplate(template, {
        permissions: ['read', 'write', 'delete'],
      });

      expect(result).toBe('权限列表: read, write, delete');
    });
  });

  describe('Enhanced Logging', () => {
    it('should use constants for permission check result logging', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const mockSubject = createMockSubject([]);

      const result = {
        allowed: false,
        missingPermissions: [Permission.DATA_READ],
        missingRoles: [],
        details: 'Permission denied',
        duration: 50,
      };

      (service as any).logPermissionCheck(
        mockSubject,
        [Permission.DATA_READ],
        [],
        result
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'TestUser',
          allowed: false,
          message: PERMISSION_MESSAGES.CHECK_FAILED,
        })
      );
    });
  });
});
