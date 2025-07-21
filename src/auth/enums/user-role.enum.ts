/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = "admin",
  DEVELOPER = "developer",
}

/**
 * 权限枚举
 */
export enum Permission {
  // 数据访问权限
  DATA_READ = "data:read",
  QUERY_EXECUTE = "query:execute",
  PROVIDERS_READ = "providers:read",

  // 开发者权限
  TRANSFORMER_PREVIEW = "transformer:preview",
  SYSTEM_MONITOR = "system:monitor",
  SYSTEM_METRICS = "system:metrics",
  SYSTEM_HEALTH = "system:health",
  DEBUG_ACCESS = "debug:access",
  CONFIG_READ = "config:read",

  // 管理员权限
  USER_MANAGE = "user:manage",
  APIKEY_MANAGE = "apikey:manage",
  CONFIG_WRITE = "config:write",
  MAPPING_WRITE = "mapping:write",
  SYSTEM_ADMIN = "system:admin",
}

/**
 * 开发者权限列表
 */
const DEVELOPER_PERMISSIONS = [
  Permission.DATA_READ,
  Permission.QUERY_EXECUTE,
  Permission.PROVIDERS_READ,
  Permission.TRANSFORMER_PREVIEW,
  Permission.SYSTEM_MONITOR,
  Permission.SYSTEM_METRICS,
  Permission.SYSTEM_HEALTH,
  Permission.DEBUG_ACCESS,
  Permission.CONFIG_READ,
];

/**
 * 角色权限映射
 */
export const RolePermissions = {
  [UserRole.DEVELOPER]: DEVELOPER_PERMISSIONS,
  [UserRole.ADMIN]: [
    // 继承开发者权限
    ...DEVELOPER_PERMISSIONS,
    // 管理员专有权限
    Permission.USER_MANAGE,
    Permission.APIKEY_MANAGE,
    Permission.CONFIG_WRITE,
    Permission.MAPPING_WRITE,
    Permission.SYSTEM_ADMIN,
  ],
};
