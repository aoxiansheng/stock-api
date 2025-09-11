/**
 * 权限模板工具函数
 * 提供权限相关的模板处理和格式化工具
 */
import { PERMISSION_CONFIG } from "../constants/permission-control.constants";

// 简化的权限模板常量
const PERMISSION_DETAIL_TEMPLATES = {
  CHECK_PASSED: "权限检查通过: {subjectName}",
  CHECK_FAILED: "权限检查失败: {subjectName}",
  MISSING_PERMISSIONS: "缺失权限: [{permissions}]",
  REQUIRED_ROLES: "要求角色之一: [{requiredRoles}], 当前角色: {currentRole}",
  SUBJECT_INFO: "主体信息: {subjectType}#{subjectId}",
  PERMISSION_SUMMARY: "权限摘要: 需要{requiredCount}个权限，拥有{grantedCount}个权限",
  ROLE_SUMMARY: "角色摘要: 需要角色[{requiredRoles}]，当前角色{currentRole}",
  DURATION_INFO: "检查耗时: {duration}ms",
  CACHE_INFO: "缓存状态: {cacheStatus}"
};

const PERMISSION_UTILS = {
  TEMPLATE_PLACEHOLDER_PATTERN_SOURCE: "\\{(\\w+)\\}",
  TEMPLATE_PLACEHOLDER_PATTERN_FLAGS: "g",
  CACHE_KEY_SANITIZE_PATTERN_SOURCE: "[^a-zA-Z0-9_:-]",
  CACHE_KEY_SANITIZE_PATTERN_FLAGS: "g",
  PERMISSION_NAME_NORMALIZE_PATTERN_SOURCE: "[^a-zA-Z0-9_:.-]",
  PERMISSION_NAME_NORMALIZE_PATTERN_FLAGS: "g",
  ROLE_NAME_NORMALIZE_PATTERN_SOURCE: "[^a-zA-Z0-9_-]",
  ROLE_NAME_NORMALIZE_PATTERN_FLAGS: "g"
};

/**
 * 权限模板工具函数类
 * 提供处理权限模板的实用方法
 */
export class PermissionTemplateUtil {
  /**
   * 替换模板中的占位符
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
   */
  static replaceTemplate(
    template: string,
    params: Record<string, any>,
  ): string {
    const placeholderPattern = new RegExp(
      PERMISSION_UTILS.TEMPLATE_PLACEHOLDER_PATTERN_SOURCE,
      PERMISSION_UTILS.TEMPLATE_PLACEHOLDER_PATTERN_FLAGS,
    );

    return template.replace(placeholderPattern, (match, key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.join(PERMISSION_CONFIG.PERMISSION_LIST_SEPARATOR + " ");
      }
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 生成权限检查详情
   * @param template 模板键名
   * @param params 参数对象
   * @returns 详情字符串
   */
  static generateDetails(
    template: keyof typeof PERMISSION_DETAIL_TEMPLATES,
    params: Record<string, any>,
  ): string {
    const templateString = PERMISSION_DETAIL_TEMPLATES[template];
    return this.replaceTemplate(templateString, params);
  }

  /**
   * 清理缓存键
   * @param key 原始键
   * @returns 清理后的键
   */
  static sanitizeCacheKey(key: string): string {
    const sanitizePattern = new RegExp(
      PERMISSION_UTILS.CACHE_KEY_SANITIZE_PATTERN_SOURCE,
      PERMISSION_UTILS.CACHE_KEY_SANITIZE_PATTERN_FLAGS,
    );

    return key.replace(sanitizePattern, "_");
  }

  /**
   * 标准化权限名称
   * @param permission 权限名称
   * @returns 标准化后的权限名称
   */
  static normalizePermissionName(permission: string): string {
    const normalizePattern = new RegExp(
      PERMISSION_UTILS.PERMISSION_NAME_NORMALIZE_PATTERN_SOURCE,
      PERMISSION_UTILS.PERMISSION_NAME_NORMALIZE_PATTERN_FLAGS,
    );

    return permission.replace(normalizePattern, "_");
  }

  /**
   * 标准化角色名称
   * @param role 角色名称
   * @returns 标准化后的角色名称
   */
  static normalizeRoleName(role: string): string {
    const normalizePattern = new RegExp(
      PERMISSION_UTILS.ROLE_NAME_NORMALIZE_PATTERN_SOURCE,
      PERMISSION_UTILS.ROLE_NAME_NORMALIZE_PATTERN_FLAGS,
    );

    return role.replace(normalizePattern, "_");
  }
}
