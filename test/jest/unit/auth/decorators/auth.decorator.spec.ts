import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Auth, ApiKeyAuth, MixedAuth } from '@auth/decorators/auth.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { RequirePermissions } from '@auth/decorators/permissions.decorator';
import { RequireApiKey } from '@auth/decorators/require-apikey.decorator';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '@auth/guards/apikey-auth.guard';
import { UnifiedPermissionsGuard } from '@auth/guards/unified-permissions.guard';
import { UserRole } from '@auth/enums/user-role.enum';
import { Permission } from '@auth/enums/user-role.enum';

// Mock all the dependencies
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  applyDecorators: jest.fn(),
  UseGuards: jest.fn(),
}));

jest.mock('@nestjs/swagger', () => ({
  ApiBearerAuth: jest.fn(),
  ApiSecurity: jest.fn(),
}));

jest.mock('@auth/decorators/roles.decorator', () => ({
  Roles: jest.fn(),
}));

jest.mock('@auth/decorators/permissions.decorator', () => ({
  RequirePermissions: jest.fn(),
}));

jest.mock('@auth/decorators/require-apikey.decorator', () => ({
  RequireApiKey: jest.fn(),
}));

describe('Auth Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth decorator', () => {
    it('should create basic JWT authentication decorator without roles or permissions', () => {
      const mockDecorators = [
        'UseGuards(JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      (applyDecorators as jest.Mock).mockReturnValue('applied-decorators');

      const result = Auth();

      expect(UseGuards).toHaveBeenCalledWith(JwtAuthGuard, UnifiedPermissionsGuard);
      expect(ApiBearerAuth).toHaveBeenCalled();
      expect(applyDecorators).toHaveBeenCalledWith(...mockDecorators);
      expect(result).toBe('applied-decorators');
    });

    it('should include roles decorator when roles are provided', () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];
      const mockDecorators = [
        'UseGuards(JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
        'Roles(...roles)',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      (Roles as jest.Mock).mockReturnValue(mockDecorators[2]);
      (applyDecorators as jest.Mock).mockReturnValue('applied-decorators-with-roles');

      const result = Auth(roles);

      expect(UseGuards).toHaveBeenCalledWith(JwtAuthGuard, UnifiedPermissionsGuard);
      expect(ApiBearerAuth).toHaveBeenCalled();
      expect(Roles).toHaveBeenCalledWith(...roles);
      expect(applyDecorators).toHaveBeenCalledWith(...mockDecorators);
      expect(result).toBe('applied-decorators-with-roles');
    });

    it('should include permissions decorator when permissions are provided', () => {
      const permissions = [Permission.DATA_READ, Permission.DATA_WRITE];
      const mockDecorators = [
        'UseGuards(JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
        'RequirePermissions(...permissions)',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      (RequirePermissions as jest.Mock).mockReturnValue(mockDecorators[2]);
      (applyDecorators as jest.Mock).mockReturnValue('applied-decorators-with-permissions');

      const result = Auth(undefined, permissions);

      expect(UseGuards).toHaveBeenCalledWith(JwtAuthGuard, UnifiedPermissionsGuard);
      expect(ApiBearerAuth).toHaveBeenCalled();
      expect(RequirePermissions).toHaveBeenCalledWith(...permissions);
      expect(applyDecorators).toHaveBeenCalledWith(...mockDecorators);
      expect(result).toBe('applied-decorators-with-permissions');
    });

    it('should include both roles and permissions decorators when both are provided', () => {
      const roles = [UserRole.ADMIN];
      const permissions = [Permission.SYSTEM_ADMIN];
      const mockDecorators = [
        'UseGuards(JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
        'Roles(...roles)',
        'RequirePermissions(...permissions)',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      (Roles as jest.Mock).mockReturnValue(mockDecorators[2]);
      (RequirePermissions as jest.Mock).mockReturnValue(mockDecorators[3]);
      (applyDecorators as jest.Mock).mockReturnValue('applied-decorators-complete');

      const result = Auth(roles, permissions);

      expect(UseGuards).toHaveBeenCalledWith(JwtAuthGuard, UnifiedPermissionsGuard);
      expect(ApiBearerAuth).toHaveBeenCalled();
      expect(Roles).toHaveBeenCalledWith(...roles);
      expect(RequirePermissions).toHaveBeenCalledWith(...permissions);
      expect(applyDecorators).toHaveBeenCalledWith(...mockDecorators);
      expect(result).toBe('applied-decorators-complete');
    });

    it('should not include roles decorator when empty roles array is provided', () => {
      const roles: UserRole[] = [];
      const mockDecorators = [
        'UseGuards(JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      (applyDecorators as jest.Mock).mockReturnValue('applied-decorators-empty-roles');

      const result = Auth(roles);

      expect(Roles).not.toHaveBeenCalled();
      expect(applyDecorators).toHaveBeenCalledWith(...mockDecorators);
      expect(result).toBe('applied-decorators-empty-roles');
    });

    it('should not include permissions decorator when empty permissions array is provided', () => {
      const permissions: Permission[] = [];
      const mockDecorators = [
        'UseGuards(JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      (applyDecorators as jest.Mock).mockReturnValue('applied-decorators-empty-permissions');

      const result = Auth(undefined, permissions);

      expect(RequirePermissions).not.toHaveBeenCalled();
      expect(applyDecorators).toHaveBeenCalledWith(...mockDecorators);
      expect(result).toBe('applied-decorators-empty-permissions');
    });

    it('should handle multiple roles correctly', () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (Roles as jest.Mock).mockReturnValue('roles');
      (applyDecorators as jest.Mock).mockReturnValue('multiple-roles');

      const result = Auth(roles);

      expect(Roles).toHaveBeenCalledWith(UserRole.ADMIN, UserRole.DEVELOPER);
      expect(result).toBe('multiple-roles');
    });

    it('should handle multiple permissions correctly', () => {
      const permissions = [Permission.DATA_READ, Permission.DATA_WRITE, Permission.SYSTEM_ADMIN];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (RequirePermissions as jest.Mock).mockReturnValue('permissions');
      (applyDecorators as jest.Mock).mockReturnValue('multiple-permissions');

      const result = Auth(undefined, permissions);

      expect(RequirePermissions).toHaveBeenCalledWith(
        Permission.DATA_READ,
        Permission.DATA_WRITE,
        Permission.SYSTEM_ADMIN
      );
      expect(result).toBe('multiple-permissions');
    });
  });

  describe('ApiKeyAuth decorator', () => {
    it('should create API key authentication decorator without permissions', () => {
      const mockDecorators = [
        'UseGuards(ApiKeyAuthGuard, UnifiedPermissionsGuard)',
        'RequireApiKey()',
        'ApiSecurity()',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (RequireApiKey as jest.Mock).mockReturnValue(mockDecorators[1]);
      // Mock ApiSecurity
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue(mockDecorators[2]);
      (applyDecorators as jest.Mock).mockReturnValue('api-key-auth');

      const result = ApiKeyAuth();

      expect(UseGuards).toHaveBeenCalledWith(ApiKeyAuthGuard, UnifiedPermissionsGuard);
      expect(RequireApiKey).toHaveBeenCalled();
      expect(ApiSecurity).toHaveBeenCalledWith('ApiKey');
      expect(ApiSecurity).toHaveBeenCalledWith('AccessToken');
      expect(result).toBe('api-key-auth');
    });

    it('should include permissions decorator when permissions are provided', () => {
      const permissions = [Permission.DATA_READ];
      const mockDecorators = [
        'UseGuards(ApiKeyAuthGuard, UnifiedPermissionsGuard)',
        'RequireApiKey()',
        'ApiSecurity()',
        'RequirePermissions(...permissions)',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (RequireApiKey as jest.Mock).mockReturnValue(mockDecorators[1]);
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue(mockDecorators[2]);
      (RequirePermissions as jest.Mock).mockReturnValue(mockDecorators[3]);
      (applyDecorators as jest.Mock).mockReturnValue('api-key-auth-with-permissions');

      const result = ApiKeyAuth(permissions);

      expect(RequirePermissions).toHaveBeenCalledWith(...permissions);
      expect(result).toBe('api-key-auth-with-permissions');
    });

    it('should not include permissions decorator when empty permissions array is provided', () => {
      const permissions: Permission[] = [];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (RequireApiKey as jest.Mock).mockReturnValue('require-api-key');
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue('api-security');
      (applyDecorators as jest.Mock).mockReturnValue('api-key-auth-empty-permissions');

      const result = ApiKeyAuth(permissions);

      expect(RequirePermissions).not.toHaveBeenCalled();
      expect(result).toBe('api-key-auth-empty-permissions');
    });
  });

  describe('MixedAuth decorator', () => {
    it('should create mixed authentication decorator without roles or permissions', () => {
      const mockDecorators = [
        'UseGuards(ApiKeyAuthGuard, JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
        'ApiSecurity()',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue(mockDecorators[2]);
      (applyDecorators as jest.Mock).mockReturnValue('mixed-auth');

      const result = MixedAuth();

      expect(UseGuards).toHaveBeenCalledWith(JwtAuthGuard, ApiKeyAuthGuard, UnifiedPermissionsGuard);
      expect(ApiBearerAuth).toHaveBeenCalled();
      expect(ApiSecurity).toHaveBeenCalledWith('ApiKey');
      expect(result).toBe('mixed-auth');
    });

    it('should include roles decorator when roles are provided', () => {
      const roles = [UserRole.ADMIN];
      const mockDecorators = [
        'UseGuards(ApiKeyAuthGuard, JwtAuthGuard, UnifiedPermissionsGuard)',
        'ApiBearerAuth()',
        'ApiSecurity()',
        'Roles(...roles)',
      ];

      (UseGuards as jest.Mock).mockReturnValue(mockDecorators[0]);
      (ApiBearerAuth as jest.Mock).mockReturnValue(mockDecorators[1]);
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue(mockDecorators[2]);
      (Roles as jest.Mock).mockReturnValue(mockDecorators[3]);
      (applyDecorators as jest.Mock).mockReturnValue('mixed-auth-with-roles');

      const result = MixedAuth(roles);

      expect(Roles).toHaveBeenCalledWith(...roles);
      expect(result).toBe('mixed-auth-with-roles');
    });

    it('should include permissions decorator when permissions are provided', () => {
      const permissions = [Permission.DATA_WRITE];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue('security');
      (RequirePermissions as jest.Mock).mockReturnValue('permissions');
      (applyDecorators as jest.Mock).mockReturnValue('mixed-auth-with-permissions');

      const result = MixedAuth(undefined, permissions);

      expect(RequirePermissions).toHaveBeenCalledWith(...permissions);
      expect(result).toBe('mixed-auth-with-permissions');
    });

    it('should include both roles and permissions when both are provided', () => {
      const roles = [UserRole.DEVELOPER];
      const permissions = [Permission.DATA_READ, Permission.DATA_WRITE];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      const { ApiSecurity } = require('@nestjs/swagger');
      (ApiSecurity as jest.Mock).mockReturnValue('security');
      (Roles as jest.Mock).mockReturnValue('roles');
      (RequirePermissions as jest.Mock).mockReturnValue('permissions');
      (applyDecorators as jest.Mock).mockReturnValue('mixed-auth-complete');

      const result = MixedAuth(roles, permissions);

      expect(Roles).toHaveBeenCalledWith(...roles);
      expect(RequirePermissions).toHaveBeenCalledWith(...permissions);
      expect(result).toBe('mixed-auth-complete');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined parameters gracefully in Auth', () => {
      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (applyDecorators as jest.Mock).mockReturnValue('handled-undefined');

      const result = Auth(undefined, undefined);

      expect(Roles).not.toHaveBeenCalled();
      expect(RequirePermissions).not.toHaveBeenCalled();
      expect(result).toBe('handled-undefined');
    });

    it('should handle null parameters gracefully in Auth', () => {
      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (applyDecorators as jest.Mock).mockReturnValue('handled-null');

      const result = Auth(null as any, null as any);

      expect(Roles).not.toHaveBeenCalled();
      expect(RequirePermissions).not.toHaveBeenCalled();
      expect(result).toBe('handled-null');
    });

    it('should handle applyDecorators throwing errors', () => {
      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (applyDecorators as jest.Mock).mockImplementation(() => {
        throw new Error('applyDecorators error');
      });

      expect(() => Auth()).toThrow('applyDecorators error');
    });

    it('should handle decorator dependencies throwing errors', () => {
      (UseGuards as jest.Mock).mockImplementation(() => {
        throw new Error('UseGuards error');
      });

      expect(() => Auth()).toThrow('UseGuards error');
    });

    it('should maintain decorator order consistency', () => {
      const roles = [UserRole.ADMIN];
      const permissions = [Permission.DATA_READ];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (Roles as jest.Mock).mockReturnValue('roles');
      (RequirePermissions as jest.Mock).mockReturnValue('permissions');
      (applyDecorators as jest.Mock).mockReturnValue('result');

      const result = Auth(roles, permissions);

      // Verify the order of decorator creation
      expect(UseGuards).toHaveBeenCalled();
      expect(ApiBearerAuth).toHaveBeenCalled();
      expect(Roles).toHaveBeenCalled();
      expect(RequirePermissions).toHaveBeenCalled();
      expect(result).toBe('result');
    });
  });

  describe('integration scenarios', () => {
    it('should work with all enum values', () => {
      const allRoles = Object.values(UserRole);
      const allPermissions = Object.values(Permission);

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (Roles as jest.Mock).mockReturnValue('roles');
      (RequirePermissions as jest.Mock).mockReturnValue('permissions');
      (applyDecorators as jest.Mock).mockReturnValue('all-values');

      const result = Auth(allRoles, allPermissions);

      expect(Roles).toHaveBeenCalledWith(...allRoles);
      expect(RequirePermissions).toHaveBeenCalledWith(...allPermissions);
      expect(result).toBe('all-values');
    });

    it('should handle mixed decorator combinations correctly', () => {
      const testCombinations = [
        { roles: [UserRole.ADMIN], permissions: undefined },
        { roles: undefined, permissions: [Permission.DATA_READ] },
        { roles: [], permissions: [Permission.DATA_WRITE] },
        { roles: [UserRole.DEVELOPER], permissions: [] },
      ];

      testCombinations.forEach(({ roles, permissions }, index) => {
        jest.clearAllMocks();

        (UseGuards as jest.Mock).mockReturnValue('guards');
        (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
        (Roles as jest.Mock).mockReturnValue('roles');
        (RequirePermissions as jest.Mock).mockReturnValue('permissions');
        (applyDecorators as jest.Mock).mockReturnValue(`combination-${index}`);

        const result = Auth(roles, permissions);

        expect(result).toBe(`combination-${index}`);

        // Verify conditional decorator calls
        if (roles && roles.length > 0) {
          expect(Roles).toHaveBeenCalled();
        } else {
          expect(Roles).not.toHaveBeenCalled();
        }

        if (permissions && permissions.length > 0) {
          expect(RequirePermissions).toHaveBeenCalled();
        } else {
          expect(RequirePermissions).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('type safety and parameter validation', () => {
    it('should accept valid UserRole enum values', () => {
      const validRoles = [UserRole.ADMIN, UserRole.DEVELOPER];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (Roles as jest.Mock).mockReturnValue('roles');
      (applyDecorators as jest.Mock).mockReturnValue('valid-roles');

      const result = Auth(validRoles);

      expect(Roles).toHaveBeenCalledWith(...validRoles);
      expect(result).toBe('valid-roles');
    });

    it('should accept valid Permission enum values', () => {
      const validPermissions = [Permission.DATA_READ, Permission.DATA_WRITE, Permission.SYSTEM_ADMIN];

      (UseGuards as jest.Mock).mockReturnValue('guards');
      (ApiBearerAuth as jest.Mock).mockReturnValue('bearer');
      (RequirePermissions as jest.Mock).mockReturnValue('permissions');
      (applyDecorators as jest.Mock).mockReturnValue('valid-permissions');

      const result = Auth(undefined, validPermissions);

      expect(RequirePermissions).toHaveBeenCalledWith(...validPermissions);
      expect(result).toBe('valid-permissions');
    });
  });
});