import { Permission } from "../enums/user-role.enum";
import { CommonStatus } from "../enums/common-status.enum";
import {
  AuthSubject,
  AuthSubjectType,
} from "../interfaces/auth-subject.interface";
import { ApiKey } from "../schemas/apikey.schema";

/**
 * API Key权限主体
 *
 * 基于API Key配置的权限列表提供权限验证功能。
 * 权限来源于API Key的permissions字段。
 *
 * @example
 * ```typescript
 * const apiKey = {
 *   id: '123',
 *   name: 'Trading Bot',
 *   permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
 *   rateLimit: { requestLimit: 1000, window: '1h' }
 * };
 * const subject = new ApiKeySubject(apiKey);
 *
 * console.log(subject.hasPermission(Permission.DATA_READ)); // true
 * console.log(subject.getDisplayName()); // "API Key: Trading Bot"
 * ```
 */
export class ApiKeySubject implements AuthSubject {
  public readonly type = AuthSubjectType.API_KEY_SUBJECT;
  public readonly id: string;
  public readonly permissions: Permission[];
  public readonly metadata: Record<string, any>;

  constructor(apiKey: ApiKey | any) {
    this.id = apiKey.id || apiKey._id?.toString();
    this.permissions = Array.isArray(apiKey.permissions)
      ? apiKey.permissions
      : [];
    this.metadata = {
      name: apiKey.name,
      appKey: apiKey.appKey,
      userId: apiKey.userId?.toString(),
      rateLimit: apiKey.rateLimit,
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
      totalRequestCount: apiKey.totalRequestCount,
      lastAccessedAt: apiKey.lastAccessedAt,
      createdAt: apiKey.createdAt,
    };

    // 验证必要字段
    if (!this.id) {
      throw new Error("API Key主体缺少必要的ID字段");
    }
    if (!Array.isArray(this.permissions)) {
      throw new Error("API Key主体的权限字段必须是数组");
    }
  }

  /**
   * 检查是否拥有指定权限
   * 支持权限层级：system:admin 包含所有 system:* 权限
   */
  hasPermission(permission: Permission): boolean {
    // 检查权限的有效性（确保它是 Permission 枚举中的有效值）
    const validPermissions = Object.values(Permission);
    if (!validPermissions.includes(permission)) {
      return false;
    }

    // 直接匹配
    if (this.permissions.includes(permission)) {
      return true;
    }

    // 权限层级检查：system:admin 包含所有 system:* 权限
    if (this.permissions.includes(Permission.SYSTEM_ADMIN)) {
      const systemPermissions = [
        Permission.SYSTEM_MONITOR,
        Permission.SYSTEM_METRICS,
        Permission.SYSTEM_HEALTH,
      ];
      if (systemPermissions.includes(permission)) {
        return true;
      }
    }

    return false;
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
    const name = this.metadata.name || "unnamed";
    return `API Key: ${name}`;
  }

  /**
   * 检查API Key是否有效
   */
  isValid(): boolean {
    // 检查是否激活
    if (this.metadata.status !== CommonStatus.ACTIVE) {
      return false;
    }

    // 检查是否过期
    if (
      this.metadata.expiresAt &&
      new Date(this.metadata.expiresAt) < new Date()
    ) {
      return false;
    }

    return true;
  }

  /**
   * 获取频率限制配置
   */
  getRateLimit(): { requestLimit: number; window: string } | null {
    return this.metadata.rateLimit || null;
  }

  /**
   * 获取API Key的统计信息
   */
  getUsageStats(): {
    totalRequestCount: number;
    lastAccessedAt: Date | null;
    createdAt: Date;
  } {
    return {
      totalRequestCount: this.metadata.totalRequestCount || 0,
      lastAccessedAt: this.metadata.lastAccessedAt
        ? new Date(this.metadata.lastAccessedAt)
        : null,
      createdAt: new Date(this.metadata.createdAt),
    };
  }

  /**
   * 检查是否属于指定用户
   */
  belongsToUser(userId: string): boolean {
    return this.metadata.userId === userId;
  }

  /**
   * 转换为JSON格式（用于日志记录）
   */
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      permissions: this.permissions,
      metadata: {
        name: this.metadata.name,
        appKey: this.metadata.appKey,
        userId: this.metadata.userId,
        status: this.metadata.status,
        expiresAt: this.metadata.expiresAt,
        rateLimit: this.metadata.rateLimit,
      },
    };
  }
}
