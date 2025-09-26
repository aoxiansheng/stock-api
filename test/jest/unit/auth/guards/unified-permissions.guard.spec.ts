import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnifiedPermissionsGuard } from '@auth/guards/unified-permissions.guard';
import { PermissionService } from '@auth/services/infrastructure/permission.service';
import { AuthSubjectFactory } from '@auth/subjects/auth-subject.factory';
import { Permission, UserRole } from '@auth/enums/user-role.enum';
import { AuthSubjectType } from '@auth/interfaces/auth-subject.interface';
import { PERMISSIONS_KEY } from '@auth/decorators/permissions.decorator';
import { ROLES_KEY } from '@auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';

describe('UnifiedPermissionsGuard', () => {
  let guard: UnifiedPermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionService: jest.Mocked<PermissionService>;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  const mockRequest = {
    url: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
    user: {
      sub: 'user123',
      username: 'testuser',
      role: UserRole.DEVELOPER,
      permissions: [Permission.DATA_READ, Permission.DATA_WRITE],
    },
    apiKey: {
      id: 'apikey123',
      name: 'test-api-key',
      permissions: [Permission.DATA_READ],
    },
  };

  const mockAuthSubject = {
    type: AuthSubjectType.JWT_USER,
    id: 'user123',
    role: UserRole.DEVELOPER,
    permissions: [Permission.DATA_READ, Permission.DATA_WRITE],
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
    hasAnyRole: jest.fn(),
    hasAnyPermission: jest.fn(),
    hasAllPermissions: jest.fn(),
    getDisplayName: jest.fn().mockReturnValue('TestUser(user123)'),
    getEffectivePermissions: jest.fn().mockReturnValue([Permission.DATA_READ, Permission.DATA_WRITE]),
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    };

    const mockPermissionService = {
      checkPermissions: jest.fn(),
      getEffectivePermissions: jest.fn(),
      combinePermissions: jest.fn(),
      createPermissionContext: jest.fn(),
      invalidateCacheFor: jest.fn(),
    };

    // Mock the static AuthSubjectFactory.createFromRequest method
    jest.spyOn(AuthSubjectFactory, 'createFromRequest').mockReturnValue(mockAuthSubject as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedPermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    guard = module.get<UnifiedPermissionsGuard>(UnifiedPermissionsGuard);
    reflector = module.get(Reflector);
    permissionService = module.get(PermissionService);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
  });

  describe('canActivate', () => {
    it('should allow access to public endpoints', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(true); // IS_PUBLIC_KEY

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
      expect(AuthSubjectFactory.createFromRequest).not.toHaveBeenCalled();
    });

    it('should allow access when no permissions or roles are required', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([]) // ROLES_KEY
        .mockReturnValueOnce([]); // PERMISSIONS_KEY

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(AuthSubjectFactory.createFromRequest).not.toHaveBeenCalled();
    });

    it('should allow access when permission check passes', async () => {
      // Arrange
      const requiredRoles = [UserRole.DEVELOPER];
      const requiredPermissions = [Permission.DATA_READ];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      const mockCheckResult = {
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: 10,
        details: '权限检查通过'
      };

      permissionService.checkPermissions.mockResolvedValue(mockCheckResult);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(AuthSubjectFactory.createFromRequest).toHaveBeenCalledWith(mockRequest);
      expect(permissionService.checkPermissions).toHaveBeenCalledWith(
        mockAuthSubject,
        requiredPermissions,
        requiredRoles
      );
    });

    it('should deny access when permission check fails', async () => {
      // Arrange
      const requiredRoles = [UserRole.ADMIN];
      const requiredPermissions = [Permission.DATA_WRITE];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      const mockCheckResult = {
        allowed: false,
        missingPermissions: [Permission.DATA_WRITE],
        missingRoles: [UserRole.ADMIN],
        duration: 15,
        details: '权限检查失败'
      };

      permissionService.checkPermissions.mockResolvedValue(mockCheckResult);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
      expect(permissionService.checkPermissions).toHaveBeenCalledWith(
        mockAuthSubject,
        requiredPermissions,
        requiredRoles
      );
    });

    it('should handle permission service unavailable', async () => {
      // Test when permissionService is null/undefined
      const guardWithoutPermissionService = new UnifiedPermissionsGuard(null, reflector);

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([UserRole.DEVELOPER]) // ROLES_KEY
        .mockReturnValueOnce([Permission.DATA_READ]); // PERMISSIONS_KEY

      // Act & Assert
      await expect(guardWithoutPermissionService.canActivate(mockExecutionContext)).rejects.toThrow();
    });

    it('should handle AuthSubjectFactory errors', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([UserRole.DEVELOPER]) // ROLES_KEY
        .mockReturnValueOnce([Permission.DATA_READ]); // PERMISSIONS_KEY

      (AuthSubjectFactory.createFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create auth subject');
      });

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
    });

    it('should handle permission service errors gracefully', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([UserRole.DEVELOPER]) // ROLES_KEY
        .mockReturnValueOnce([Permission.DATA_READ]); // PERMISSIONS_KEY

      permissionService.checkPermissions.mockRejectedValue(
        new Error('Permission service error')
      );

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined roles and permissions gracefully', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(undefined) // ROLES_KEY
        .mockReturnValueOnce(undefined); // PERMISSIONS_KEY

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle null auth subject', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([UserRole.DEVELOPER]) // ROLES_KEY
        .mockReturnValueOnce([Permission.DATA_READ]); // PERMISSIONS_KEY

      (AuthSubjectFactory.createFromRequest as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
    });

    it('should properly handle ForbiddenException passthrough', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([UserRole.DEVELOPER]) // ROLES_KEY
        .mockReturnValueOnce([Permission.DATA_READ]); // PERMISSIONS_KEY

      const forbiddenError = new ForbiddenException('Access denied');
      permissionService.checkPermissions.mockRejectedValue(forbiddenError);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
    });

    it('should generate proper permission denied messages', async () => {
      // Arrange
      const requiredPermissions = [Permission.DATA_WRITE, Permission.SYSTEM_ADMIN];
      const requiredRoles = [UserRole.ADMIN];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      const mockCheckResult = {
        allowed: false,
        missingPermissions: requiredPermissions,
        missingRoles: requiredRoles,
        duration: 20,
        details: '权限不足'
      };

      permissionService.checkPermissions.mockResolvedValue(mockCheckResult);

      // Act & Assert
      try {
        await guard.canActivate(mockExecutionContext);
        fail('Should have thrown an exception');
      } catch (error) {
        expect(error.message).toContain('TestUser(user123)');
        expect(error.message).toContain('权限不足');
      }
    });
  });

  describe('private methods testing via integration', () => {
    it('should call getRequiredRoles and getRequiredPermissions', async () => {
      // Arrange
      const requiredRoles = [UserRole.DEVELOPER, UserRole.ADMIN];
      const requiredPermissions = [Permission.DATA_READ, Permission.DATA_WRITE];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      const mockCheckResult = {
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: 5,
        details: '权限检查通过'
      };

      permissionService.checkPermissions.mockResolvedValue(mockCheckResult);

      // Act
      await guard.canActivate(mockExecutionContext);

      // Assert - verify that reflector was called with correct keys
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, expect.any(Array));

      // Verify the service was called with the extracted values
      expect(permissionService.checkPermissions).toHaveBeenCalledWith(
        mockAuthSubject,
        requiredPermissions,
        requiredRoles
      );
    });
  });
});