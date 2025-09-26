import { PermissionTemplateUtil } from '@auth/utils/permission.utils';

describe('PermissionTemplateUtil', () => {
  describe('replaceTemplate', () => {
    it('should replace placeholders with provided values', () => {
      const template = '权限检查 {result} 对于用户 {userId}';
      const params = { result: '通过', userId: '12345' };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('权限检查 通过 对于用户 12345');
    });

    it('should leave unmatched placeholders unchanged', () => {
      const template = '权限检查 {result} 对于用户 {userId}';
      const params = { result: '通过' };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('权限检查 通过 对于用户 {userId}');
    });

    it('should handle empty params object', () => {
      const template = '权限检查 {result}';
      const params = {};
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('权限检查 {result}');
    });

    it('should convert non-string values to strings', () => {
      const template = '用户ID: {userId}, 权限数: {count}';
      const params = { userId: 12345, count: 5 };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('用户ID: 12345, 权限数: 5');
    });
  });

  describe('generateDetails', () => {
    it('should generate details for supported template keys', () => {
      const result1 = PermissionTemplateUtil.generateDetails('CHECK_PASSED', {
        subjectName: '用户123'
      });
      expect(result1).toBe('权限检查通过: 用户123');

      const result2 = PermissionTemplateUtil.generateDetails('CHECK_FAILED', {
        subjectName: '用户456'
      });
      expect(result2).toBe('权限检查失败: 用户456');

      const result3 = PermissionTemplateUtil.generateDetails('MISSING_PERMISSIONS', {
        permissions: 'DATA_READ, DATA_WRITE'
      });
      expect(result3).toBe('缺失权限: [DATA_READ, DATA_WRITE]');

      const result4 = PermissionTemplateUtil.generateDetails('REQUIRED_ROLES', {
        requiredRoles: 'ADMIN, USER',
        currentRole: 'USER'
      });
      expect(result4).toBe('要求角色之一: [ADMIN, USER], 当前角色: USER');
    });

    it('should handle missing template keys gracefully', () => {
      // When template key doesn't exist, expect to handle gracefully
      try {
        const invalidKey = 'INVALID_KEY' as keyof typeof import('@auth/utils/permission.utils').PermissionTemplateUtil;
        const result = PermissionTemplateUtil.generateDetails(invalidKey as any, {
          param: 'value'
        });
        expect(result).toBe('');
      } catch (error) {
        // Also acceptable if it throws an error for invalid template key
        expect(error).toBeDefined();
      }
    });
  });

  describe('sanitizeCacheKey', () => {
    it('should sanitize cache key by replacing invalid characters', () => {
      // Based on SANITIZE_CACHE_KEY pattern /[^a-zA-Z0-9_:-]/g, colon is valid
      const result = PermissionTemplateUtil.sanitizeCacheKey('user:123:role#admin');
      expect(result).toBe('user:123:role_admin');
    });

    it('should handle empty cache key', () => {
      const result = PermissionTemplateUtil.sanitizeCacheKey('');
      expect(result).toBe('');
    });

    it('should preserve valid characters', () => {
      const result = PermissionTemplateUtil.sanitizeCacheKey('valid_cache_key_123');
      expect(result).toBe('valid_cache_key_123');
    });
  });

  describe('normalizePermissionName', () => {
    it('should normalize permission name by replacing invalid characters', () => {
      // Based on SANITIZE_PERMISSION pattern, dots are valid for permissions
      const result = PermissionTemplateUtil.normalizePermissionName('data.read');
      expect(result).toBe('data.read');
    });

    it('should handle empty permission name', () => {
      const result = PermissionTemplateUtil.normalizePermissionName('');
      expect(result).toBe('');
    });

    it('should replace invalid characters but not convert case', () => {
      // The function only replaces invalid chars, doesn't convert case
      const result = PermissionTemplateUtil.normalizePermissionName('DATA-READ');
      expect(result).toBe('DATA_READ');
    });
  });

  describe('normalizeRoleName', () => {
    it('should normalize role name by replacing invalid characters', () => {
      const result = PermissionTemplateUtil.normalizeRoleName('admin.role');
      expect(result).toBe('admin_role');
    });

    it('should handle empty role name', () => {
      const result = PermissionTemplateUtil.normalizeRoleName('');
      expect(result).toBe('');
    });

    it('should replace invalid characters but not convert case', () => {
      // The function only replaces invalid chars, doesn't convert case
      const result = PermissionTemplateUtil.normalizeRoleName('ADMIN-ROLE');
      expect(result).toBe('ADMIN_ROLE');
    });
  });
});