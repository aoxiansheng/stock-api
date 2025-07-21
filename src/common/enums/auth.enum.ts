/**
 * 统一的认证类型枚举
 * 用于整个系统中的认证类型标识
 */
export enum AuthType {
  JWT = "jwt",
  API_KEY = "api_key",
}

/**
 * 认证主体类型枚举 (保持向后兼容的值)
 */
export enum AuthSubjectType {
  JWT_USER = "jwt_user",
  API_KEY = "api_key",
}
