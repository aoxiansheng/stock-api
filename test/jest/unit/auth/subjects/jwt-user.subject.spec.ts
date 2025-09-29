import { JwtUserSubject } from '@auth/subjects/jwt-user.subject';
import { Permission, UserRole } from '@auth/enums/user-role.enum';
import { RolePermissions } from '@auth/enums/user-role.enum';
import { AuthSubjectType } from '@auth/interfaces/auth-subject.interface';

describe('JwtUserSubject', () => {
  const mockUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.DEVELOPER,
    status: 'active',
    lastAccessedAt: new Date(),
  };

  describe('constructor', () => {
    it('should create a JWT user subject with valid user data', () => {
      const subject = new JwtUserSubject(mockUser);

      expect(subject).toBeDefined();
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.id).toBe('507f1f77bcf86cd799439011');
      expect(subject.role).toBe(UserRole.DEVELOPER);
      expect(subject.permissions).toEqual(RolePermissions[UserRole.DEVELOPER]);
      expect(subject.metadata).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        status: 'active',
        lastAccessedAt: mockUser.lastAccessedAt,
      });
    });

    it('should create a JWT user subject with _id field', () => {
      const userWithId = { ...mockUser, _id: '507f1f77bcf86cd799439012', id: undefined };
      const subject = new JwtUserSubject(userWithId);

      expect(subject.id).toBe('507f1f77bcf86cd799439012');
    });

    it('should throw error when user ID is missing', () => {
      const userWithoutId = { ...mockUser, id: undefined, _id: undefined };

      expect(() => new JwtUserSubject(userWithoutId)).toThrow('JWT用户主体缺少必要的ID字段');
    });

    it('should throw error when user ID format is invalid', () => {
      const userWithInvalidId = { ...mockUser, id: 'invalid-id' };

      expect(() => new JwtUserSubject(userWithInvalidId)).toThrow('JWT用户主体ID格式无效');
    });

    it('should throw error when user role is missing', () => {
      const userWithoutRole = { ...mockUser, role: undefined };

      expect(() => new JwtUserSubject(userWithoutRole)).toThrow('JWT用户主体缺少必要的角色字段');
    });
  });

  describe('hasPermission', () => {
    let subject: JwtUserSubject;

    beforeEach(() => {
      subject = new JwtUserSubject(mockUser);
    });

    it('should return true for permissions the user has', () => {
      const hasPermission = subject.hasPermission(Permission.DATA_READ);
      
      expect(hasPermission).toBe(true);
    });

    it('should return false for permissions the user does not have', () => {
      const hasPermission = subject.hasPermission(Permission.SYSTEM_ADMIN);
      
      expect(hasPermission).toBe(false);
    });

    it('should return false for invalid permissions', () => {
      const hasPermission = subject.hasPermission('INVALID_PERMISSION' as Permission);
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    let subject: JwtUserSubject;

    beforeEach(() => {
      subject = new JwtUserSubject(mockUser);
    });

    it('should return true when user has all specified permissions', () => {
      const permissions = [Permission.DATA_READ, Permission.QUERY_EXECUTE];
      const hasAll = subject.hasAllPermissions(permissions);

      expect(hasAll).toBe(true);
    });

    it('should return false when user does not have all specified permissions', () => {
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
    let subject: JwtUserSubject;

    beforeEach(() => {
      subject = new JwtUserSubject(mockUser);
    });

    it('should return true when user has at least one of the specified permissions', () => {
      const permissions = [Permission.DATA_READ, Permission.SYSTEM_ADMIN];
      const hasAny = subject.hasAnyPermission(permissions);
      
      expect(hasAny).toBe(true);
    });

    it('should return false when user does not have any of the specified permissions', () => {
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
    it('should return correct display name with username and role', () => {
      const subject = new JwtUserSubject(mockUser);
      const displayName = subject.getDisplayName();
      
      expect(displayName).toBe('JWT用户: testuser (developer)');
    });

    it('should return unknown when username is missing', () => {
      const userWithoutUsername = { ...mockUser, username: undefined };
      const subject = new JwtUserSubject(userWithoutUsername);
      const displayName = subject.getDisplayName();
      
      expect(displayName).toBe('JWT用户: unknown (developer)');
    });
  });

  describe('hasRole', () => {
    let subject: JwtUserSubject;

    beforeEach(() => {
      subject = new JwtUserSubject(mockUser);
    });

    it('should return true when user has the specified role', () => {
      const hasRole = subject.hasRole(UserRole.DEVELOPER);
      
      expect(hasRole).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      const hasRole = subject.hasRole(UserRole.ADMIN);
      
      expect(hasRole).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    let subject: JwtUserSubject;

    beforeEach(() => {
      subject = new JwtUserSubject(mockUser);
    });

    it('should return true when user has one of the specified roles', () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];
      const hasAny = subject.hasAnyRole(roles);
      
      expect(hasAny).toBe(true);
    });

    it('should return false when user does not have any of the specified roles', () => {
      const roles = [UserRole.ADMIN];
      const hasAny = subject.hasAnyRole(roles);

      expect(hasAny).toBe(false);
    });

    it('should return false for empty roles array', () => {
      const hasAny = subject.hasAnyRole([]);
      
      expect(hasAny).toBe(false);
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return a copy of the user permissions', () => {
      const subject = new JwtUserSubject(mockUser);
      const effectivePermissions = subject.getEffectivePermissions();
      
      expect(effectivePermissions).toEqual(RolePermissions[UserRole.DEVELOPER]);
      // Verify it's a copy, not the same reference
      expect(effectivePermissions).not.toBe(subject.permissions);
    });
  });

  describe('toJSON', () => {
    it('should return a JSON representation of the subject', () => {
      const subject = new JwtUserSubject(mockUser);
      const json = subject.toJSON();
      
      expect(json).toEqual({
        type: AuthSubjectType.JWT_USER,
        id: '507f1f77bcf86cd799439011',
        role: UserRole.DEVELOPER,
        permissions: RolePermissions[UserRole.DEVELOPER],
        metadata: {
          username: 'testuser',
          status: 'active',
        },
      });
    });
  });

  describe('different user roles', () => {
    it('should correctly handle ADMIN role permissions', () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const subject = new JwtUserSubject(adminUser);

      expect(subject.permissions).toEqual(RolePermissions[UserRole.ADMIN]);
      expect(subject.hasPermission(Permission.SYSTEM_ADMIN)).toBe(true);
    });

    it('should correctly handle different permission sets for different roles', () => {
      const devSubject = new JwtUserSubject(mockUser);
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const adminSubject = new JwtUserSubject(adminUser);

      // Developer should have basic permissions but not admin permissions
      expect(devSubject.hasPermission(Permission.DATA_READ)).toBe(true);
      expect(devSubject.hasPermission(Permission.SYSTEM_ADMIN)).toBe(false);

      // Admin should have both basic and admin permissions
      expect(adminSubject.hasPermission(Permission.DATA_READ)).toBe(true);
      expect(adminSubject.hasPermission(Permission.SYSTEM_ADMIN)).toBe(true);
    });

    it('should handle unknown role permissions', () => {
      const unknownRoleUser = { ...mockUser, role: 'PUBLIC' as UserRole };
      const subject = new JwtUserSubject(unknownRoleUser);

      expect(subject.permissions).toEqual([]);
      expect(subject.hasRole('PUBLIC' as UserRole)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle user with _id instead of id', () => {
      const userWithMongoId = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        username: 'testuser',
        role: UserRole.DEVELOPER,
        status: 'active'
      };

      const subject = new JwtUserSubject(userWithMongoId);
      expect(subject.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should handle user with both id and _id (prefer id)', () => {
      const userWithBothIds = {
        id: '507f1f77bcf86cd799439013',
        _id: { toString: () => '507f1f77bcf86cd799439014' },
        username: 'testuser',
        role: UserRole.DEVELOPER,
        status: 'active'
      };

      const subject = new JwtUserSubject(userWithBothIds);
      expect(subject.id).toBe('507f1f77bcf86cd799439013');
    });

    it('should throw error for invalid ObjectId format', () => {
      const userWithInvalidId = {
        id: 'invalid-id',
        username: 'testuser',
        role: UserRole.DEVELOPER,
        status: 'active'
      };

      expect(() => new JwtUserSubject(userWithInvalidId)).toThrow('JWT用户主体ID格式无效');
    });

    it('should handle null role', () => {
      const userWithNullRole = {
        ...mockUser,
        role: null
      };

      expect(() => new JwtUserSubject(userWithNullRole)).toThrow('JWT用户主体缺少必要的角色字段');
    });

    it('should handle undefined role', () => {
      const userWithoutRole = { ...mockUser };
      delete userWithoutRole.role;

      expect(() => new JwtUserSubject(userWithoutRole)).toThrow('JWT用户主体缺少必要的角色字段');
    });

    it('should handle user with unknown role', () => {
      const userWithUnknownRole = {
        ...mockUser,
        role: 'UNKNOWN_ROLE' as UserRole
      };

      const subject = new JwtUserSubject(userWithUnknownRole);
      expect(subject.permissions).toEqual([]);
    });

    it('should handle user with missing metadata fields', () => {
      const minimalUser = {
        id: '507f1f77bcf86cd799439015',
        role: UserRole.DEVELOPER
      };

      const subject = new JwtUserSubject(minimalUser);
      expect(subject.metadata.username).toBeUndefined();
      expect(subject.metadata.email).toBeUndefined();
      expect(subject.metadata.status).toBeUndefined();
      expect(subject.metadata.lastAccessedAt).toBeUndefined();
    });

    it('should handle getDisplayName with null username', () => {
      const userWithNullUsername = {
        ...mockUser,
        username: null
      };

      const subject = new JwtUserSubject(userWithNullUsername);
      expect(subject.getDisplayName()).toBe('JWT用户: unknown (developer)');
    });

    it('should handle getDisplayName with empty string username', () => {
      const userWithEmptyUsername = {
        ...mockUser,
        username: ''
      };

      const subject = new JwtUserSubject(userWithEmptyUsername);
      expect(subject.getDisplayName()).toBe('JWT用户: unknown (developer)');
    });

    it('should handle hasAnyRole with single role array', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasRole = subject.hasAnyRole([UserRole.DEVELOPER]);

      expect(hasRole).toBe(true);
    });

    it('should handle hasAnyRole with multiple roles including user role', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasRole = subject.hasAnyRole([UserRole.ADMIN, UserRole.DEVELOPER]);

      expect(hasRole).toBe(true);
    });

    it('should handle hasAnyRole with multiple roles not including user role', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasRole = subject.hasAnyRole([UserRole.ADMIN]);

      expect(hasRole).toBe(false);
    });

    it('should handle permissions array modifications', () => {
      const subject = new JwtUserSubject(mockUser);
      const effectivePermissions = subject.getEffectivePermissions();

      // Modifying the returned array should not affect the original
      effectivePermissions.push(Permission.SYSTEM_ADMIN);
      expect(subject.permissions).not.toContain(Permission.SYSTEM_ADMIN);
    });

    it('should validate toJSON excludes sensitive metadata', () => {
      const userWithSensitiveData = {
        ...mockUser,
        password: 'secret',
        email: 'test@example.com',
        lastAccessedAt: new Date()
      };

      const subject = new JwtUserSubject(userWithSensitiveData);
      const json = subject.toJSON();

      expect(json.metadata).not.toHaveProperty('password');
      expect(json.metadata).not.toHaveProperty('email');
      expect(json.metadata).not.toHaveProperty('lastAccessedAt');
      expect(json.metadata).toHaveProperty('username');
      expect(json.metadata).toHaveProperty('status');
    });

    it('should handle complex user object with extra properties', () => {
      const complexUser = {
        ...mockUser,
        extraProperty: 'extra',
        nestedObject: { prop: 'value' },
        arrayProperty: [1, 2, 3]
      };

      const subject = new JwtUserSubject(complexUser);
      expect(subject.id).toBe(mockUser.id);
      expect(subject.role).toBe(mockUser.role);
      // Extra properties should not interfere with construction
    });

    it('should handle permissions with undefined rolePermissions mapping', () => {
      const userWithUndefinedRole = {
        ...mockUser,
        role: 'NON_EXISTENT_ROLE' as UserRole
      };

      const subject = new JwtUserSubject(userWithUndefinedRole);
      expect(subject.permissions).toEqual([]);
      expect(subject.hasPermission(Permission.DATA_READ)).toBe(false);
    });

    it('should handle edge case ObjectId validation error messages', () => {
      const userWithVeryInvalidId = {
        id: 'abc',
        username: 'testuser',
        role: UserRole.DEVELOPER
      };

      expect(() => new JwtUserSubject(userWithVeryInvalidId)).toThrow(/JWT用户主体ID格式无效/);
    });

    it('should handle missing both id and _id', () => {
      const userWithoutIds = {
        username: 'testuser',
        role: UserRole.DEVELOPER,
        status: 'active'
      };

      expect(() => new JwtUserSubject(userWithoutIds)).toThrow('JWT用户主体缺少必要的ID字段');
    });

    it('should handle _id with null toString', () => {
      const userWithNullToString = {
        _id: { toString: () => null },
        username: 'testuser',
        role: UserRole.DEVELOPER,
        status: 'active'
      };

      expect(() => new JwtUserSubject(userWithNullToString)).toThrow('JWT用户主体缺少必要的ID字段');
    });

    it('should handle hasPermission with null permission', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasPermission = subject.hasPermission(null as any);

      expect(hasPermission).toBe(false);
    });

    it('should handle hasPermission with undefined permission', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasPermission = subject.hasPermission(undefined as any);

      expect(hasPermission).toBe(false);
    });

    it('should handle hasAllPermissions with mixed valid and invalid permissions', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasAll = subject.hasAllPermissions([Permission.DATA_READ, 'INVALID' as any]);

      expect(hasAll).toBe(false);
    });

    it('should handle hasAnyPermission with all invalid permissions', () => {
      const subject = new JwtUserSubject(mockUser);
      const hasAny = subject.hasAnyPermission(['INVALID1' as any, 'INVALID2' as any]);

      expect(hasAny).toBe(false);
    });
  });
});