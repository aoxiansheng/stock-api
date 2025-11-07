import { Permission } from "./enums";

// 统一元数据键
export const ROLES_KEY = "roles";
export const PERMISSIONS_KEY = "permissions";
export const IS_PUBLIC_KEY = "is_public";

// 认证头部（建议）
export const HEADER_APP_KEY = "x-app-key";
export const HEADER_ACCESS_TOKEN = "x-access-token";

// 查询能力所需的最小权限集合
export const READ_PROFILE: readonly Permission[] = [
  Permission.DATA_READ,
  Permission.QUERY_EXECUTE,
  Permission.PROVIDERS_READ,
  Permission.STREAM_READ,
  Permission.STREAM_SUBSCRIBE,
] as const;

// 管控能力所需的权限集合（包含查询 + 管控）
export const ADMIN_PROFILE: readonly Permission[] = [
  ...READ_PROFILE,
  Permission.USER_MANAGE,
  Permission.APIKEY_MANAGE,
  Permission.CONFIG_WRITE,
  Permission.PROVIDERS_MANAGE,
  Permission.SYSTEM_ADMIN,
  Permission.STREAM_WRITE,
] as const;

