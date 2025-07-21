import { Permission, UserRole } from "../enums/user-role.enum";
import { AuthSubjectType } from "../../common/enums/auth.enum";

// 重新导出以保持向后兼容
export { AuthSubjectType };

/**
 * 统一的权限主体接口
 *
 * 这个接口抽象了JWT用户和API Key两种认证方式的权限信息，
 * 为统一权限验证提供标准化的数据结构。
 *
 * @example
 * ```typescript
 * // JWT用户权限主体
 * const jwtSubject = new JwtUserSubject(user);
 * console.log(jwtSubject.permissions); // 基于角色的权限列表
 *
 * // API Key权限主体
 * const apiKeySubject = new ApiKeySubject(apiKey);
 * console.log(apiKeySubject.permissions); // API Key配置的权限列表
 * ```
 */
export interface AuthSubject {
  /** 认证主体类型 */
  readonly type: AuthSubjectType;

  /** 主体唯一标识符 */
  readonly id: string;

  /** 主体拥有的权限列表 */
  readonly permissions: Permission[];

  /** 用户角色（仅JWT用户有效） */
  readonly role?: UserRole;

  /** 扩展元数据 */
  readonly metadata?: Record<string, any>;

  /**
   * 检查是否拥有指定权限
   * @param permission 要检查的权限
   * @returns 是否拥有该权限
   */
  hasPermission(permission: Permission): boolean;

  /**
   * 检查是否拥有所有指定权限
   * @param permissions 要检查的权限列表
   * @returns 是否拥有所有权限
   */
  hasAllPermissions(permissions: Permission[]): boolean;

  /**
   * 检查是否拥有任一指定权限
   * @param permissions 要检查的权限列表
   * @returns 是否拥有任一权限
   */
  hasAnyPermission(permissions: Permission[]): boolean;

  /**
   * 获取主体的显示名称
   * @returns 用于日志和调试的显示名称
   */
  getDisplayName(): string;
}

/**
 * 权限验证上下文
 *
 * 包含权限验证过程中的所有相关信息，
 * 用于权限检查、日志记录和调试。
 */
export interface PermissionContext {
  /** 认证主体 */
  subject: AuthSubject;

  /** 所需权限列表 */
  requiredPermissions: Permission[];

  /** 所需角色列表（仅JWT认证） */
  requiredRoles?: UserRole[];

  /** 主体拥有的有效权限 */
  grantedPermissions: Permission[];

  /** 是否有访问权限 */
  hasAccess: boolean;

  /** 权限检查结果详情 */
  details: {
    /** 缺失的权限 */
    missingPermissions: Permission[];

    /** 权限检查时间戳 */
    timestamp: Date;

    /** 检查耗时（毫秒） */
    duration: number;
  };
}
