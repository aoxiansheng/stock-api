import { Permission, UserRole, RolePermissions } from "../enums/user-role.enum";
import {
  AuthSubject,
  AuthSubjectType,
} from "../interfaces/auth-subject.interface";
import { User } from "../schemas/user.schema";

/**
 * JWT用户权限主体
 *
 * 基于用户角色提供权限验证功能。
 * 权限来源于用户角色对应的权限映射表。
 *
 * @example
 * ```typescript
 * const user = { id: '123', role: UserRole.DEVELOPER, username: 'dev01' };
 * const subject = new JwtUserSubject(user);
 *
 * console.log(subject.hasPermission(Permission.DATA_READ)); // true
 * console.log(subject.getDisplayName()); // "JWT用户: dev01 (developer)"
 * ```
 */
export class JwtUserSubject implements AuthSubject {
  public readonly type = AuthSubjectType.JWT_USER;
  public readonly id: string;
  public readonly permissions: Permission[];
  public readonly role: UserRole;
  public readonly metadata: Record<string, any>;

  constructor(user: User | any) {
    this.id = user.id || user._id?.toString();
    this.role = user.role;
    this.permissions = RolePermissions[user.role] || [];
    this.metadata = {
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };

    // 验证必要字段
    if (!this.id) {
      throw new Error("JWT用户主体缺少必要的ID字段");
    }
    if (!this.role) {
      throw new Error("JWT用户主体缺少必要的角色字段");
    }
  }

  /**
   * 检查是否拥有指定权限
   */
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * 检查是否拥有所有指定权限
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  /**
   * 检查是否拥有任一指定权限
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    const username = this.metadata.username || "unknown";
    return `JWT用户: ${username} (${this.role})`;
  }

  /**
   * 检查是否拥有指定角色
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * 检查是否拥有任一指定角色
   */
  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  /**
   * 获取用户的有效权限（包括角色继承）
   */
  getEffectivePermissions(): Permission[] {
    return [...this.permissions];
  }

  /**
   * 转换为JSON格式（用于日志记录）
   */
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      role: this.role,
      permissions: this.permissions,
      metadata: {
        username: this.metadata.username,
        isActive: this.metadata.isActive,
      },
    };
  }
}
