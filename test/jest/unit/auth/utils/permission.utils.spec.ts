import { PermissionTemplateUtil } from '../../../../../src/auth/utils/permission.utils';
import { 
  PERMISSION_DETAIL_TEMPLATES, 
  PERMISSION_CONFIG, 
  PERMISSION_UTILS 
} from '../../../../../src/auth/constants/permission.constants';

describe('PermissionTemplateUtil', () => {
  describe('replaceTemplate', () => {
    it('应该替换模板中的占位符', () => {
      const template = 'Hello, {name}!';
      const params = { name: 'World' };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('Hello, World!');
    });
    
    it('应该替换多个占位符', () => {
      const template = '{greeting}, {name}! Today is {day}.';
      const params = { greeting: 'Hello', name: 'World', day: 'Monday' };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('Hello, World! Today is Monday.');
    });
    
    it('应该处理数组值', () => {
      const template = 'Required permissions: {permissions}';
      const params = { permissions: ['read', 'write', 'delete'] };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe(`Required permissions: read${PERMISSION_CONFIG.PERMISSION_LIST_SEPARATOR} write${PERMISSION_CONFIG.PERMISSION_LIST_SEPARATOR} delete`);
    });
    
    it('应该保留未定义参数的占位符', () => {
      const template = 'Hello, {name}! Today is {day}.';
      const params = { name: 'World' };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('Hello, World! Today is {day}.');
    });
    
    it('应该将非字符串值转换为字符串', () => {
      const template = 'Count: {count}, Active: {active}';
      const params = { count: 42, active: true };
      
      const result = PermissionTemplateUtil.replaceTemplate(template, params);
      
      expect(result).toBe('Count: 42, Active: true');
    });

    it('应该使用常量中的正则表达式模式', () => {
      // 创建与常量中相同模式的正则表达式
      const placeholderPattern = new RegExp(
        PERMISSION_UTILS.TEMPLATE_PLACEHOLDER_PATTERN_SOURCE,
        PERMISSION_UTILS.TEMPLATE_PLACEHOLDER_PATTERN_FLAGS
      );
      
      const template = '{greeting}, {name}!';
      const matches = template.match(placeholderPattern);
      
      // 应该匹配两个占位符
      expect(matches).toHaveLength(2);
      expect(matches).toContain('{greeting}');
      expect(matches).toContain('{name}');
    });
  });

  describe('generateDetails', () => {
    it('应该使用模板生成详情', () => {
      const templateKey = 'CHECK_PASSED' as keyof typeof PERMISSION_DETAIL_TEMPLATES;
      const params = { subjectName: 'TestUser' };
      
      const result = PermissionTemplateUtil.generateDetails(templateKey, params);
      
      expect(result).toBe('权限检查通过: TestUser');
    });
    
    it('应该处理带有多个参数的复杂模板', () => {
      const templateKey = 'PERMISSION_SUMMARY' as keyof typeof PERMISSION_DETAIL_TEMPLATES;
      const params = { requiredCount: 5, grantedCount: 3 };
      
      const result = PermissionTemplateUtil.generateDetails(templateKey, params);
      
      expect(result).toBe('权限摘要: 需要5个权限，拥有3个权限');
    });
    
    it('应该处理数组值', () => {
      const templateKey = 'MISSING_PERMISSIONS' as keyof typeof PERMISSION_DETAIL_TEMPLATES;
      const params = { permissions: ['read', 'write'] };
      
      const result = PermissionTemplateUtil.generateDetails(templateKey, params);
      
      expect(result).toBe(`缺失权限: [read${PERMISSION_CONFIG.PERMISSION_LIST_SEPARATOR} write]`);
    });
    
    it('应该处理未定义的参数', () => {
      const templateKey = 'SUBJECT_INFO' as keyof typeof PERMISSION_DETAIL_TEMPLATES;
      const params = { subjectType: 'user' };
      
      const result = PermissionTemplateUtil.generateDetails(templateKey, params);
      
      // 保留未定义参数的占位符
      expect(result).toBe('主体信息: user#{subjectId}');
    });
  });

  describe('sanitizeCacheKey', () => {
    it('应该清理缓存键中的特殊字符', () => {
      const key = 'user@example.com/profile';
      
      const result = PermissionTemplateUtil.sanitizeCacheKey(key);
      
      expect(result).toBe('user_example_com_profile');
    });
    
    it('应该保留有效字符', () => {
      const key = 'user_123:profile-page';
      
      const result = PermissionTemplateUtil.sanitizeCacheKey(key);
      
      expect(result).toBe('user_123:profile-page');
    });
    
    it('应该处理含有空格和标点符号的键', () => {
      const key = 'user profile/page (main)!';
      
      const result = PermissionTemplateUtil.sanitizeCacheKey(key);
      
      expect(result).toBe('user_profile_page__main__');
    });
    
    it('应该使用常量中的正则表达式模式', () => {
      // 创建与常量中相同模式的正则表达式
      const sanitizePattern = new RegExp(
        PERMISSION_UTILS.CACHE_KEY_SANITIZE_PATTERN_SOURCE,
        PERMISSION_UTILS.CACHE_KEY_SANITIZE_PATTERN_FLAGS
      );
      
      const key = 'user@example.com';
      const sanitized = key.replace(sanitizePattern, '_');
      
      expect(sanitized).toBe('user_example_com');
    });
  });

  describe('normalizePermissionName', () => {
    it('应该标准化权限名称', () => {
      const permission = 'user@access/profile';
      
      const result = PermissionTemplateUtil.normalizePermissionName(permission);
      
      expect(result).toBe('user_access_profile');
    });
    
    it('应该保留有效字符', () => {
      const permission = 'data.read:user-profile';
      
      const result = PermissionTemplateUtil.normalizePermissionName(permission);
      
      expect(result).toBe('data.read:user-profile');
    });
    
    it('应该处理含有空格和标点符号的名称', () => {
      const permission = 'user profile/access (admin)!';
      
      const result = PermissionTemplateUtil.normalizePermissionName(permission);
      
      expect(result).toBe('user_profile_access__admin__');
    });
    
    it('应该使用常量中的正则表达式模式', () => {
      // 创建与常量中相同模式的正则表达式
      const normalizePattern = new RegExp(
        PERMISSION_UTILS.PERMISSION_NAME_NORMALIZE_PATTERN_SOURCE,
        PERMISSION_UTILS.PERMISSION_NAME_NORMALIZE_PATTERN_FLAGS
      );
      
      const permission = 'user@access';
      const normalized = permission.replace(normalizePattern, '_');
      
      expect(normalized).toBe('user_access');
    });
  });

  describe('normalizeRoleName', () => {
    it('应该标准化角色名称', () => {
      const role = 'admin@system';
      
      const result = PermissionTemplateUtil.normalizeRoleName(role);
      
      expect(result).toBe('admin_system');
    });
    
    it('应该保留有效字符', () => {
      const role = 'system_admin-user';
      
      const result = PermissionTemplateUtil.normalizeRoleName(role);
      
      expect(result).toBe('system_admin-user');
    });
    
    it('应该处理含有空格和标点符号的角色', () => {
      const role = 'system admin/user (main)!';
      
      const result = PermissionTemplateUtil.normalizeRoleName(role);
      
      expect(result).toBe('system_admin_user__main__');
    });
    
    it('应该使用常量中的正则表达式模式', () => {
      // 创建与常量中相同模式的正则表达式
      const normalizePattern = new RegExp(
        PERMISSION_UTILS.ROLE_NAME_NORMALIZE_PATTERN_SOURCE,
        PERMISSION_UTILS.ROLE_NAME_NORMALIZE_PATTERN_FLAGS
      );
      
      const role = 'admin@system';
      const normalized = role.replace(normalizePattern, '_');
      
      expect(normalized).toBe('admin_system');
    });
  });
}); 