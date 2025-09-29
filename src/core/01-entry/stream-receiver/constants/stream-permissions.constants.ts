import { Permission } from "../../../../auth/enums/user-role.enum";

/**
 * Stream 权限相关常量
 * 统一管理流接收器的权限配置，避免重复定义
 */
export const STREAM_PERMISSIONS = {
  // 基础流权限 (解决重复定义问题)
  REQUIRED_STREAM_PERMISSIONS: [
    Permission.STREAM_READ,
    Permission.STREAM_SUBSCRIBE,
  ],

  // 管理员流权限
  ADMIN_STREAM_PERMISSIONS: [
    Permission.STREAM_READ,
    Permission.STREAM_SUBSCRIBE,
    Permission.STREAM_WRITE,
    Permission.SYSTEM_ADMIN,
  ],

  // 只读流权限
  READONLY_STREAM_PERMISSIONS: [Permission.STREAM_READ],
} as const;

// 权限检查辅助函数
export const hasStreamPermissions = (
  userPermissions: Permission[],
  requiredPermissions: readonly Permission[] = STREAM_PERMISSIONS.REQUIRED_STREAM_PERMISSIONS,
): boolean => {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
};
