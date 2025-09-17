/**
 * 统一的认证类型枚举
 * 用于整个系统中的认证类型标识
 */

import { AuthenticationType } from "./shared-base.enum";

// 使用共享基础枚举，消除重复值
export const AuthType = AuthenticationType;
export type AuthType = AuthenticationType;

/**
 * 认证主体类型枚举 (保持向后兼容的值)
 * 使用共享的 AuthenticationType 以消除 "api_key" 重复
 */
export enum AuthSubjectType {
  JWT_USER = "jwt_user",
  API_KEY_SUBJECT = AuthenticationType.API_KEY, // 使用共享枚举值
}
