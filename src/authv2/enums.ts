export enum UserRole {
  ADMIN = "admin",
  DEVELOPER = "developer",
}

// 精简后的最小权限集合，仅用于两档权限画像
export enum Permission {
  // 查询相关
  DATA_READ = "data:read",
  QUERY_EXECUTE = "query:execute",
  PROVIDERS_READ = "providers:read",
  STREAM_READ = "stream:read",
  STREAM_SUBSCRIBE = "stream:subscribe",

  // 管控相关
  USER_MANAGE = "user:manage",
  APIKEY_MANAGE = "apikey:manage",
  CONFIG_WRITE = "config:write",
  PROVIDERS_MANAGE = "providers:manage",
  SYSTEM_ADMIN = "system:admin",
  STREAM_WRITE = "stream:write",
}

