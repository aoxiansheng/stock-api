import { AuthSubject, PermissionContext } from '@auth/interfaces/auth-subject.interface';
import { Permission, UserRole } from '@auth/enums/user-role.enum';
import { AuthSubjectType } from '@common/types/enums/auth.enum';

describe('Auth Subject Interfaces', () => {
  describe('AuthSubject', () => {
    it('应该正确定义权限主体接口', () => {
      // Arrange
      const mockSubject: AuthSubject = {
        type: AuthSubjectType.JWT_USER,
        id: 'user123',
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        role: UserRole.DEVELOPER,
        metadata: {
          username: 'testuser',
          email: 'test@example.com',
        },
        hasPermission: function(permission: Permission) {
          return this.permissions.includes(permission);
        },
        hasAllPermissions: function(permissions: Permission[]) {
          return permissions.every(p => this.permissions.includes(p));
        },
        hasAnyPermission: function(permissions: Permission[]) {
          return permissions.some(p => this.permissions.includes(p));
        },
        getDisplayName: function() {
          return `User: ${this.metadata?.username}`;
        },
      };

      // Assert
      expect(mockSubject).toBeDefined();
      expect(mockSubject.type).toBe(AuthSubjectType.JWT_USER);
      expect(mockSubject.id).toBe('user123');
      expect(Array.isArray(mockSubject.permissions)).toBe(true);
      expect(mockSubject.role).toBe(UserRole.DEVELOPER);
      expect(mockSubject.metadata).toBeDefined();
      expect(typeof mockSubject.hasPermission).toBe('function');
      expect(typeof mockSubject.hasAllPermissions).toBe('function');
      expect(typeof mockSubject.hasAnyPermission).toBe('function');
      expect(typeof mockSubject.getDisplayName).toBe('function');
    });
  });

  describe('PermissionContext', () => {
    it('应该正确定义权限验证上下文接口', () => {
      // Arrange
      const mockSubject: AuthSubject = {
        type: AuthSubjectType.JWT_USER,
        id: 'user123',
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        role: UserRole.DEVELOPER,
        metadata: {
          username: 'testuser',
        },
        hasPermission: function(permission: Permission) {
          return this.permissions.includes(permission);
        },
        hasAllPermissions: function(permissions: Permission[]) {
          return permissions.every(p => this.permissions.includes(p));
        },
        hasAnyPermission: function(permissions: Permission[]) {
          return permissions.some(p => this.permissions.includes(p));
        },
        getDisplayName: function() {
          return `User: ${this.metadata?.username}`;
        },
      };

      const context: PermissionContext = {
        subject: mockSubject,
        requiredPermissions: [Permission.DATA_READ],
        requiredRoles: [UserRole.DEVELOPER],
        grantedPermissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        hasAccess: true,
        details: {
          missingPermissions: [],
          timestamp: new Date(),
          duration: 10,
        },
      };

      // Assert
      expect(context).toBeDefined();
      expect(context.subject).toBeDefined();
      expect(Array.isArray(context.requiredPermissions)).toBe(true);
      expect(Array.isArray(context.requiredRoles)).toBe(true);
      expect(Array.isArray(context.grantedPermissions)).toBe(true);
      expect(typeof context.hasAccess).toBe('boolean');
      expect(context.details).toBeDefined();
      expect(Array.isArray(context.details.missingPermissions)).toBe(true);
      expect(context.details.timestamp instanceof Date).toBe(true);
      expect(typeof context.details.duration).toBe('number');
    });
  });
});