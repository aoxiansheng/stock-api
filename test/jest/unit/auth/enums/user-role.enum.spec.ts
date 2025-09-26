import { UserRole, Permission, RolePermissions } from '@auth/enums/user-role.enum';

describe('User Role Enum', () => {
  describe('UserRole', () => {
    it('应该正确定义用户角色枚举', () => {
      // Assert
      expect(UserRole).toBeDefined();
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.DEVELOPER).toBe('developer');
    });
  });

  describe('Permission', () => {
    it('应该正确定义权限枚举', () => {
      // Assert
      expect(Permission).toBeDefined();
      
      // 基础数据权限
      expect(Permission.DATA_READ).toBe('data:read');
      expect(Permission.QUERY_EXECUTE).toBe('query:execute');
      expect(Permission.PROVIDERS_READ).toBe('providers:read');
      
      // 开发者权限
      expect(Permission.TRANSFORMER_PREVIEW).toBe('transformer:preview');
      expect(Permission.SYSTEM_MONITOR).toBe('system:monitor');
      expect(Permission.SYSTEM_METRICS).toBe('system:metrics');
      expect(Permission.SYSTEM_HEALTH).toBe('system:health');
      expect(Permission.DEBUG_ACCESS).toBe('debug:access');
      expect(Permission.CONFIG_READ).toBe('config:read');
      
      // 管理员权限
      expect(Permission.USER_MANAGE).toBe('user:manage');
      expect(Permission.APIKEY_MANAGE).toBe('apikey:manage');
      expect(Permission.CONFIG_WRITE).toBe('config:write');
      expect(Permission.MAPPING_WRITE).toBe('mapping:write');
      expect(Permission.SYSTEM_ADMIN).toBe('system:admin');
      
      // 扩展功能权限
      expect(Permission.DATA_WRITE).toBe('data:write');
      expect(Permission.QUERY_STATS).toBe('query:stats');
      expect(Permission.QUERY_HEALTH).toBe('query:health');
      expect(Permission.PROVIDERS_MANAGE).toBe('providers:manage');
      
      // WebSocket流权限
      expect(Permission.STREAM_READ).toBe('stream:read');
      expect(Permission.STREAM_WRITE).toBe('stream:write');
      expect(Permission.STREAM_SUBSCRIBE).toBe('stream:subscribe');
    });
  });

  describe('RolePermissions', () => {
    it('应该正确定义角色权限映射', () => {
      // Assert
      expect(RolePermissions).toBeDefined();
      expect(Array.isArray(RolePermissions[UserRole.DEVELOPER])).toBe(true);
      expect(Array.isArray(RolePermissions[UserRole.ADMIN])).toBe(true);
    });

    it('应该为开发者角色分配正确的权限', () => {
      // Arrange
      const developerPermissions = RolePermissions[UserRole.DEVELOPER];

      // Assert
      expect(developerPermissions).toContain(Permission.DATA_READ);
      expect(developerPermissions).toContain(Permission.QUERY_EXECUTE);
      expect(developerPermissions).toContain(Permission.PROVIDERS_READ);
      expect(developerPermissions).toContain(Permission.TRANSFORMER_PREVIEW);
      expect(developerPermissions).toContain(Permission.SYSTEM_MONITOR);
      expect(developerPermissions).toContain(Permission.SYSTEM_METRICS);
      expect(developerPermissions).toContain(Permission.SYSTEM_HEALTH);
      expect(developerPermissions).toContain(Permission.DEBUG_ACCESS);
      expect(developerPermissions).toContain(Permission.CONFIG_READ);
      expect(developerPermissions).toContain(Permission.MAPPING_WRITE);
      expect(developerPermissions).toContain(Permission.STREAM_READ);
      expect(developerPermissions).toContain(Permission.STREAM_SUBSCRIBE);
      
      // 确保不包含管理员权限
      expect(developerPermissions).not.toContain(Permission.USER_MANAGE);
      expect(developerPermissions).not.toContain(Permission.APIKEY_MANAGE);
      expect(developerPermissions).not.toContain(Permission.SYSTEM_ADMIN);
    });

    it('应该为管理员角色分配正确的权限', () => {
      // Arrange
      const adminPermissions = RolePermissions[UserRole.ADMIN];

      // Assert
      // 管理员应该包含所有开发者权限
      expect(adminPermissions).toContain(Permission.DATA_READ);
      expect(adminPermissions).toContain(Permission.QUERY_EXECUTE);
      expect(adminPermissions).toContain(Permission.PROVIDERS_READ);
      expect(adminPermissions).toContain(Permission.TRANSFORMER_PREVIEW);
      expect(adminPermissions).toContain(Permission.SYSTEM_MONITOR);
      expect(adminPermissions).toContain(Permission.SYSTEM_METRICS);
      expect(adminPermissions).toContain(Permission.SYSTEM_HEALTH);
      expect(adminPermissions).toContain(Permission.DEBUG_ACCESS);
      expect(adminPermissions).toContain(Permission.CONFIG_READ);
      expect(adminPermissions).toContain(Permission.MAPPING_WRITE);
      expect(adminPermissions).toContain(Permission.STREAM_READ);
      expect(adminPermissions).toContain(Permission.STREAM_SUBSCRIBE);
      
      // 管理员专有权限
      expect(adminPermissions).toContain(Permission.USER_MANAGE);
      expect(adminPermissions).toContain(Permission.APIKEY_MANAGE);
      expect(adminPermissions).toContain(Permission.CONFIG_WRITE);
      expect(adminPermissions).toContain(Permission.SYSTEM_ADMIN);
      
      // 管理员扩展权限
      expect(adminPermissions).toContain(Permission.DATA_WRITE);
      expect(adminPermissions).toContain(Permission.PROVIDERS_MANAGE);
      expect(adminPermissions).toContain(Permission.STREAM_WRITE);
    });
  });
});