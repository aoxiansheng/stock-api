/**
 * 权限模板工具函数
 * 提供权限相关的模板处理和格式化工具
 */
import {
  PERMISSION_DETAIL_TEMPLATES,
  PERMISSION_CONFIG,
  PERMISSION_UTILS,
} from "../constants/permission.constants";

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
