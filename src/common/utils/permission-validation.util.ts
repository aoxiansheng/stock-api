/**
 * 通用权限验证工具类
 * 提供可重用的权限验证、规范化和处理功能
 *
 * 设计原则：
 * - 提供通用的权限验证方法
 * - 独立于具体业务逻辑
 * - 支持配置化的验证规则
 * - 保持类型安全和性能优化
 */

import { StringValidationUtil } from "./string-validation.util";

/**
 * 权限验证配置接口
 */
export interface PermissionValidationConfig {
  /** 权限名称正则表达式 */
  permissionPattern?: RegExp;
  /** 角色名称正则表达式 */
  rolePattern?: RegExp;
  /** 主体ID正则表达式 */
  subjectIdPattern?: RegExp;
  /** 权限名称最小长度 */
  minPermissionLength?: number;
  /** 权限名称最大长度 */
  maxPermissionLength?: number;
  /** 角色名称最小长度 */
  minRoleLength?: number;
  /** 角色名称最大长度 */
  maxRoleLength?: number;
  /** 是否允许空值 */
  allowEmpty?: boolean;
}

/**
 * 权限级别类型
 */
export type PermissionLevel = number;

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  /** 是否有权限 */
  hasPermission: boolean;
  /** 检查详情 */
  details?: string;
  /** 错误信息 */
  errors?: string[];
}

/**
 * 模板替换参数接口
 */
export interface TemplateParams {
  [key: string]: any;
}

/**
 * 通用权限验证工具类
 */
export class PermissionValidationUtil {
  /**
   * 默认权限验证配置
   */
  static readonly DEFAULT_CONFIG: PermissionValidationConfig = {
    permissionPattern: /^[a-zA-Z0-9_:.-]+$/,
    rolePattern: /^[a-zA-Z0-9_-]+$/,
    subjectIdPattern: /^[a-zA-Z0-9_-]+$/,
    minPermissionLength: 1,
    maxPermissionLength: 100,
    minRoleLength: 1,
    maxRoleLength: 50,
    allowEmpty: false,
  };

  /**
   * 常用权限模式正则表达式
   */
  static readonly PATTERN_PRESETS = {
    PERMISSION_NAME: /^[a-zA-Z0-9_:.-]+$/,
    ROLE_NAME: /^[a-zA-Z0-9_-]+$/,
    SUBJECT_ID: /^[a-zA-Z0-9_-]+$/,
    CACHE_KEY: /^[a-zA-Z0-9_:-]+$/,
    TEMPLATE_PLACEHOLDER: /\{(\w+)\}/g,
    SANITIZE_PERMISSION: /[^a-zA-Z0-9_:.-]/g,
    SANITIZE_ROLE: /[^a-zA-Z0-9_-]/g,
    SANITIZE_CACHE_KEY: /[^a-zA-Z0-9_:-]/g,
  } as const;

  /**
   * 权限分隔符
   */
  static readonly SEPARATORS = {
    PERMISSION_LIST: ",",
    ROLE_LIST: ",",
    CACHE_KEY: ":",
    NAMESPACE: ".",
    HIERARCHY: ":",
  } as const;

  /**
   * 验证权限名称
   * @param permission 权限名称
   * @param config 验证配置
   * @returns 验证结果
   */
  static validatePermissionName(
    permission: string,
    config: PermissionValidationConfig = {},
  ): PermissionCheckResult {
    const validationConfig = { ...this.DEFAULT_CONFIG, ...config };

    const stringResult = StringValidationUtil.validateString(permission, {
      minLength: validationConfig.minPermissionLength,
      maxLength: validationConfig.maxPermissionLength,
      pattern: validationConfig.permissionPattern,
      allowEmpty: validationConfig.allowEmpty,
      allowNullish: false,
    });

    return {
      hasPermission: stringResult.isValid,
      errors: stringResult.errors,
      details: stringResult.isValid
        ? "Permission name is valid"
        : "Permission name validation failed",
    };
  }

  /**
   * 验证角色名称
   * @param role 角色名称
   * @param config 验证配置
   * @returns 验证结果
   */
  static validateRoleName(
    role: string,
    config: PermissionValidationConfig = {},
  ): PermissionCheckResult {
    const validationConfig = { ...this.DEFAULT_CONFIG, ...config };

    const stringResult = StringValidationUtil.validateString(role, {
      minLength: validationConfig.minRoleLength,
      maxLength: validationConfig.maxRoleLength,
      pattern: validationConfig.rolePattern,
      allowEmpty: validationConfig.allowEmpty,
      allowNullish: false,
    });

    return {
      hasPermission: stringResult.isValid,
      errors: stringResult.errors,
      details: stringResult.isValid
        ? "Role name is valid"
        : "Role name validation failed",
    };
  }

  /**
   * 验证主体ID
   * @param subjectId 主体ID
   * @param config 验证配置
   * @returns 验证结果
   */
  static validateSubjectId(
    subjectId: string,
    config: PermissionValidationConfig = {},
  ): PermissionCheckResult {
    const validationConfig = { ...this.DEFAULT_CONFIG, ...config };

    const stringResult = StringValidationUtil.validateString(subjectId, {
      minLength: 1,
      maxLength: 100,
      pattern: validationConfig.subjectIdPattern,
      allowEmpty: validationConfig.allowEmpty,
      allowNullish: false,
    });

    return {
      hasPermission: stringResult.isValid,
      errors: stringResult.errors,
      details: stringResult.isValid
        ? "Subject ID is valid"
        : "Subject ID validation failed",
    };
  }

  /**
   * 标准化权限名称
   * @param permission 权限名称
   * @param replacement 替换字符
   * @returns 标准化后的权限名称
   */
  static normalizePermissionName(
    permission: string,
    replacement: string = "_",
  ): string {
    if (StringValidationUtil.isNullish(permission)) {
      return "";
    }
    return permission.replace(
      this.PATTERN_PRESETS.SANITIZE_PERMISSION,
      replacement,
    );
  }

  /**
   * 标准化角色名称
   * @param role 角色名称
   * @param replacement 替换字符
   * @returns 标准化后的角色名称
   */
  static normalizeRoleName(role: string, replacement: string = "_"): string {
    if (StringValidationUtil.isNullish(role)) {
      return "";
    }
    return role.replace(this.PATTERN_PRESETS.SANITIZE_ROLE, replacement);
  }

  /**
   * 清理缓存键
   * @param key 原始键
   * @param replacement 替换字符
   * @returns 清理后的键
   */
  static sanitizeCacheKey(key: string, replacement: string = "_"): string {
    if (StringValidationUtil.isNullish(key)) {
      return "";
    }
    return key.replace(this.PATTERN_PRESETS.SANITIZE_CACHE_KEY, replacement);
  }

  /**
   * 比较权限级别
   * @param currentLevel 当前级别
   * @param requiredLevel 要求级别
   * @returns 是否满足权限级别要求
   */
  static hasPermissionLevel(
    currentLevel: PermissionLevel,
    requiredLevel: PermissionLevel,
  ): boolean {
    if (typeof currentLevel !== "number" || typeof requiredLevel !== "number") {
      return false;
    }
    return currentLevel >= requiredLevel;
  }

  /**
   * 检查权限数组中是否包含指定权限
   * @param userPermissions 用户权限数组
   * @param requiredPermission 要求的权限
   * @param caseSensitive 是否大小写敏感
   * @returns 是否拥有权限
   */
  static hasPermission(
    userPermissions: string[],
    requiredPermission: string,
    caseSensitive: boolean = true,
  ): boolean {
    if (
      !Array.isArray(userPermissions) ||
      StringValidationUtil.isNullish(requiredPermission)
    ) {
      return false;
    }

    const normalizedRequired = caseSensitive
      ? requiredPermission
      : requiredPermission.toLowerCase();

    return userPermissions.some((permission) => {
      const normalizedPermission = caseSensitive
        ? permission
        : permission.toLowerCase();
      return normalizedPermission === normalizedRequired;
    });
  }

  /**
   * 检查是否拥有任意一个权限
   * @param userPermissions 用户权限数组
   * @param requiredPermissions 要求的权限数组
   * @param caseSensitive 是否大小写敏感
   * @returns 是否拥有任意权限
   */
  static hasAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[],
    caseSensitive: boolean = true,
  ): boolean {
    if (
      !Array.isArray(userPermissions) ||
      !Array.isArray(requiredPermissions)
    ) {
      return false;
    }

    return requiredPermissions.some((required) =>
      this.hasPermission(userPermissions, required, caseSensitive),
    );
  }

  /**
   * 检查是否拥有所有权限
   * @param userPermissions 用户权限数组
   * @param requiredPermissions 要求的权限数组
   * @param caseSensitive 是否大小写敏感
   * @returns 是否拥有所有权限
   */
  static hasAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    caseSensitive: boolean = true,
  ): boolean {
    if (
      !Array.isArray(userPermissions) ||
      !Array.isArray(requiredPermissions)
    ) {
      return false;
    }

    return requiredPermissions.every((required) =>
      this.hasPermission(userPermissions, required, caseSensitive),
    );
  }

  /**
   * 解析权限字符串为数组
   * @param permissionString 权限字符串
   * @param separator 分隔符
   * @returns 权限数组
   */
  static parsePermissions(
    permissionString: string,
    separator: string = this.SEPARATORS.PERMISSION_LIST,
  ): string[] {
    if (StringValidationUtil.isNullish(permissionString)) {
      return [];
    }

    return permissionString
      .split(separator)
      .map((permission) => permission.trim())
      .filter((permission) => permission.length > 0);
  }

  /**
   * 将权限数组转为字符串
   * @param permissions 权限数组
   * @param separator 分隔符
   * @returns 权限字符串
   */
  static stringifyPermissions(
    permissions: string[],
    separator: string = this.SEPARATORS.PERMISSION_LIST,
  ): string {
    if (!Array.isArray(permissions)) {
      return "";
    }

    return permissions
      .filter(
        (permission) =>
          StringValidationUtil.validateString(permission, { allowEmpty: false })
            .isValid,
      )
      .join(separator);
  }

  /**
   * 模板字符串替换
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
   */
  static replaceTemplate(template: string, params: TemplateParams): string {
    if (StringValidationUtil.isNullish(template)) {
      return "";
    }

    return template.replace(
      this.PATTERN_PRESETS.TEMPLATE_PLACEHOLDER,
      (match, key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          return value.join(this.SEPARATORS.PERMISSION_LIST + " ");
        }
        return value !== undefined ? String(value) : match;
      },
    );
  }

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param components 组件数组
   * @returns 缓存键
   */
  static generateCacheKey(prefix: string, ...components: string[]): string {
    const cleanComponents = [prefix, ...components]
      .filter((component) => !StringValidationUtil.isEmpty(component))
      .map((component) => this.sanitizeCacheKey(component));

    return cleanComponents.join(this.SEPARATORS.CACHE_KEY);
  }

  /**
   * 验证权限列表
   * @param permissions 权限数组
   * @param config 验证配置
   * @returns 验证结果
   */
  static validatePermissionList(
    permissions: string[],
    config: PermissionValidationConfig = {},
  ): PermissionCheckResult {
    if (!Array.isArray(permissions)) {
      return {
        hasPermission: false,
        errors: ["Permissions must be an array"],
        details: "Invalid permissions format",
      };
    }

    const errors: string[] = [];
    let allValid = true;

    for (let i = 0; i < permissions.length; i++) {
      const result = this.validatePermissionName(permissions[i], config);
      if (!result.hasPermission) {
        allValid = false;
        errors.push(
          `Permission at index ${i}: ${result.errors?.join(", ") || "Invalid"}`,
        );
      }
    }

    return {
      hasPermission: allValid,
      errors: errors.length > 0 ? errors : undefined,
      details: allValid
        ? "All permissions are valid"
        : "Some permissions are invalid",
    };
  }

  /**
   * 检查权限继承关系
   * @param childPermission 子权限
   * @param parentPermission 父权限
   * @param hierarchySeparator 层级分隔符
   * @returns 是否存在继承关系
   */
  static isPermissionInherited(
    childPermission: string,
    parentPermission: string,
    hierarchySeparator: string = this.SEPARATORS.HIERARCHY,
  ): boolean {
    if (
      StringValidationUtil.isNullish(childPermission) ||
      StringValidationUtil.isNullish(parentPermission)
    ) {
      return false;
    }

    // 精确匹配
    if (childPermission === parentPermission) {
      return true;
    }

    // 通配符权限 (例如: admin:* 包含 admin:users:read)
    if (parentPermission.endsWith("*")) {
      const parentPrefix = parentPermission.slice(0, -1);
      return childPermission.startsWith(parentPrefix);
    }

    // 层级权限继承 (例如: admin 包含 admin:users)
    return childPermission.startsWith(parentPermission + hierarchySeparator);
  }
}
