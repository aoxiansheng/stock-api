import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '@auth/services/infrastructure/permission.service';
import { CacheService } from '@cache/services/cache.service';
import { Permission, UserRole } from '@auth/enums/user-role.enum';
import { AuthSubject, AuthSubjectType } from '@auth/interfaces/auth-subject.interface';

// 创建一个模拟的统一配置对象
const mockAuthConfig = {
  cache: {
    permissionCacheTtl: 300,
  },
};

// 创建一个模拟的AuthSubject实现
class MockAuthSubject implements AuthSubject {
  type = AuthSubjectType.JWT_USER;
  id: string;
  role: UserRole;
  permissions: Permission[];
  metadata?: Record<string, any>;

  constructor(id: string, role: UserRole, permissions: Permission[]) {
    this.id = id;
    this.role = role;
    this.permissions = permissions;
    this.metadata = {};
  }
  
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }
  
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.permissions.includes(p));
  }
  
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => this.permissions.includes(p));
  }
  
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }
  
  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }
  
  getEffectivePermissions(): Permission[] {
    return [...this.permissions];
  }
  
  getDisplayName(): string {
    return `MockSubject:${this.id}`;
  }
  
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      role: this.role,
      permissions: this.permissions,
    };
  }
}

describe('PermissionService', () => {
  let service: PermissionService;
  let cacheService: jest.Mocked<CacheService>;

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
        {
          provide: 'authUnified',
          useValue: mockAuthConfig,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermissions', () => {
    it('应该成功检查权限并缓存结果', async () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
        Permission.DATA_WRITE,
      ]);
      const requiredPermissions = [Permission.DATA_READ];
      const requiredRoles = [UserRole.DEVELOPER];
      
      cacheService.get.mockResolvedValue(null); // 模拟缓存未命中

      // Act
      const result = await service.checkPermissions(
        subject,
        requiredPermissions,
        requiredRoles,
      );

      // Assert
      expect(result).toEqual({
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: expect.any(Number),
        details: expect.stringContaining('权限检查通过'),
      });
      expect(cacheService.get).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('应该在缓存中有结果时直接返回缓存结果', async () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
      ]);
      const cachedResult = {
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: 10,
        details: '权限检查通过',
      };
      
      cacheService.get.mockResolvedValue(cachedResult);

      // Act
      const result = await service.checkPermissions(subject, [Permission.DATA_READ]);

      // Assert
      expect(result).toEqual(cachedResult);
      expect(cacheService.get).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('应该在权限不足时返回拒绝结果', async () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
      ]);
      const requiredPermissions = [Permission.DATA_WRITE];
      const requiredRoles = [UserRole.DEVELOPER];
      
      cacheService.get.mockResolvedValue(null);

      // Act
      const result = await service.checkPermissions(
        subject,
        requiredPermissions,
        requiredRoles,
      );

      // Assert
      expect(result).toEqual({
        allowed: false,
        missingPermissions: [Permission.DATA_WRITE],
        missingRoles: [UserRole.DEVELOPER],
        duration: expect.any(Number),
        details: expect.stringContaining('权限检查失败'),
      });
    });

    it('应该在主体ID无效时返回拒绝结果', async () => {
      // Arrange
      const subject = new MockAuthSubject('invalid-id', UserRole.DEVELOPER, [
        Permission.DATA_READ,
      ]);

      // Mock DatabaseValidationUtils.isValidObjectId to return false
      jest.mock('@common/utils/database.utils', () => ({
        DatabaseValidationUtils: {
          isValidObjectId: jest.fn().mockReturnValue(false),
        },
      }));

      // Act
      const result = await service.checkPermissions(subject, [Permission.DATA_READ]);

      // Assert
      expect(result).toEqual({
        allowed: false,
        missingPermissions: [Permission.DATA_READ],
        missingRoles: [],
        duration: expect.any(Number),
        details: '权限主体ID格式无效，无法执行权限验证',
      });
    });
  });

  describe('getEffectivePermissions', () => {
    it('应该返回主体的有效权限', () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
        Permission.DATA_WRITE,
      ]);

      // Act
      const result = service.getEffectivePermissions(subject);

      // Assert
      expect(result).toEqual([Permission.DATA_READ, Permission.DATA_WRITE]);
    });
  });

  describe('combinePermissions', () => {
    it('应该正确组合多个权限列表', () => {
      // Arrange
      const permissions1 = [Permission.DATA_READ, Permission.DATA_WRITE];
      const permissions2 = [Permission.DATA_WRITE, Permission.APIKEY_MANAGE];
      const permissions3 = [Permission.APIKEY_MANAGE, Permission.DATA_WRITE];

      // Act
      const result = service.combinePermissions(permissions1, permissions2, permissions3);

      // Assert
      expect(result).toEqual([
        Permission.DATA_READ,
        Permission.DATA_WRITE,
        Permission.APIKEY_MANAGE,
      ]);
    });
  });

  describe('createPermissionContext', () => {
    it('应该成功创建权限上下文', async () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
        Permission.DATA_WRITE,
      ]);
      const requiredPermissions = [Permission.DATA_READ];
      const requiredRoles = [UserRole.DEVELOPER];
      
      // Mock checkPermissions to return a known result
      const checkPermissionsResult = {
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: 15,
        details: '权限检查通过',
      };
      jest.spyOn(service, 'checkPermissions').mockResolvedValue(checkPermissionsResult);

      // Act
      const result = await service.createPermissionContext(
        subject,
        requiredPermissions,
        requiredRoles,
      );

      // Assert
      expect(result).toEqual({
        subject,
        requiredPermissions,
        requiredRoles,
        grantedPermissions: [Permission.DATA_READ, Permission.DATA_WRITE],
        hasAccess: true,
        details: {
          missingPermissions: [],
          timestamp: expect.any(Date),
          duration: 15,
        },
      });
    });
  });

  describe('invalidateCacheFor', () => {
    it('应该成功使主体的权限缓存失效', async () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
      ]);
      cacheService.delByPattern.mockResolvedValue(5); // 模拟删除了5个键

      // Act
      await service.invalidateCacheFor(subject);

      // Assert
      expect(cacheService.delByPattern).toHaveBeenCalledWith(
        'perm:MOCK:user123:*',
      );
    });

    it('应该在主体ID无效时抛出错误', async () => {
      // Arrange
      const subject = new MockAuthSubject('invalid-id', UserRole.DEVELOPER, [
        Permission.DATA_READ,
      ]);

      // Mock DatabaseValidationUtils.isValidObjectId to return false
      jest.mock('@common/utils/database.utils', () => ({
        DatabaseValidationUtils: {
          isValidObjectId: jest.fn().mockReturnValue(false),
        },
      }));

      // Act & Assert
      await expect(service.invalidateCacheFor(subject)).rejects.toThrow(
        '权限主体ID格式无效: invalid-id',
      );
    });

    it('应该在缓存删除失败时抛出错误', async () => {
      // Arrange
      const subject = new MockAuthSubject('user123', UserRole.DEVELOPER, [
        Permission.DATA_READ,
      ]);
      cacheService.delByPattern.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(service.invalidateCacheFor(subject)).rejects.toThrow(
        'Cache error',
      );
    });
  });
});