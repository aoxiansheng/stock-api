/**
 * 认证服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

import { UserRole } from "../../auth/enums/user-role.enum";
import { CommonStatus } from "../enums/common-status.enum";
import { 
  PASSWORD_CONSTRAINTS, 
  USERNAME_CONSTRAINTS, 
  EMAIL_CONSTRAINTS, 
  LOGIN_CONSTRAINTS 
} from "./validation.constants";

// 📝 操作名称常量
export const AUTH_OPERATIONS = Object.freeze({
  REGISTER: "register",
  LOGIN: "login",
  REFRESH_TOKEN: "refreshToken",
  VALIDATE_USER: "validateUser",
  CREATE_API_KEY: "createApiKey",
  GET_USER_API_KEYS: "getUserApiKeys",
  REVOKE_API_KEY: "revokeApiKey",
  UPDATE_USER_PROFILE: "updateUserProfile",
  CHANGE_PASSWORD: "changePassword",
  DEACTIVATE_USER: "deactivateUser",
  ACTIVATE_USER: "activateUser",
  GET_USER_BY_ID: "getUserById",
  GET_USER_BY_USERNAME: "getUserByUsername",
  VERIFY_EMAIL: "verifyEmail",
  RESET_PASSWORD: "resetPassword",
  API_KEY_RATE_LIMIT_RESET: "resetApiKeyRateLimit",
});

// 📢 消息常量
export const AUTH_MESSAGES = Object.freeze({
  // 成功消息
  USER_REGISTERED: "新用户注册成功",
  USER_LOGIN_SUCCESS: "用户登录成功",
  TOKEN_REFRESHED: "令牌刷新成功",
  API_KEY_CREATED: "API Key创建成功",
  API_KEY_REVOKED: "API Key撤销成功",
  USER_PROFILE_UPDATED: "用户资料更新成功",
  PASSWORD_CHANGED: "密码修改成功",
  USER_ACTIVATED: "用户激活成功",
  USER_DEACTIVATED: "用户停用成功",
  EMAIL_VERIFIED: "邮箱验证成功",
  PASSWORD_RESET: "密码重置成功",

  // 错误消息 - 已移至 src/common/constants/error-messages.constants.ts
  // 保留模块特定的错误消息
  PASSWORD_VERIFICATION_FAILED: "密码验证失败",
  USER_NOT_FOUND_OR_INACTIVE: "尝试使用不存在或未激活的用户登录",
  USER_ALREADY_ACTIVE: "用户已经是激活状态",
  USER_ALREADY_INACTIVE: "用户已经是停用状态",
  REFRESH_TOKEN_INVALID: "刷新令牌无效",

  // 警告消息
  MULTIPLE_LOGIN_ATTEMPTS: "检测到多次登录尝试",
  SUSPICIOUS_LOGIN_ACTIVITY: "检测到可疑登录活动",
  PASSWORD_EXPIRING_SOON: "密码即将过期",
  ACCOUNT_LOCKED: "账户已被锁定",
  LOGIN_FROM_NEW_DEVICE: "检测到新设备登录",
  UNUSUAL_LOGIN_LOCATION: "检测到异常登录位置",

  // 信息消息
  REGISTRATION_STARTED: "开始用户注册流程",
  LOGIN_ATTEMPT: "用户尝试登录",
  TOKEN_VALIDATION_STARTED: "开始令牌验证",
  API_KEY_VALIDATION_STARTED: "开始API Key验证",
  USER_LOOKUP_STARTED: "开始用户查询",
  PASSWORD_VALIDATION_STARTED: "开始密码验证",
});

// ⚙️ 默认值常量 - 合并相关业务逻辑
export const AUTH_DEFAULTS = Object.freeze({
  /** 新用户默认设置 - 合并角色和状态 */
  NEW_USER: {
    role: UserRole.DEVELOPER,
    status: CommonStatus.ACTIVE,
  },
  /** 邮箱验证默认设置 */
  EMAIL_VERIFICATION: {
    verified: false,
  },
  /** 账户安全默认设置 */
  ACCOUNT_SECURITY: {
    locked: false,
    passwordResetRequired: false,
    twoFactorEnabled: false,
  },
});

// 🔧 认证配置常量 - 合并相关长度限制
export const AUTH_CONFIG = Object.freeze({
  /** 登录配置 */
  LOGIN: {
    maxAttempts: LOGIN_CONSTRAINTS.MAX_ATTEMPTS,
    lockDurationMinutes: LOGIN_CONSTRAINTS.LOCK_DURATION_MINUTES,
    sessionTimeoutMinutes: LOGIN_CONSTRAINTS.SESSION_TIMEOUT_MINUTES,
  },
  /** Token过期时间配置 - 合并相关时间设置 */
  TOKEN_EXPIRY: {
    accessTokenHours: LOGIN_CONSTRAINTS.SESSION_TIMEOUT_MINUTES / 60 * 24,
    refreshTokenDays: 7,
  },
});;

// 🎯 用户状态常量 - 已移除，请直接使用 CommonStatus 枚举

// 🔒 权限级别常量 - 已移至 src/auth/constants/permission.constants.ts
// 使用 PERMISSION_LEVELS 替代




// 🔍 验证规则常量 - 使用统一验证常量
export const AUTH_VALIDATION_RULES = Object.freeze({
  USERNAME_PATTERN: USERNAME_CONSTRAINTS.PATTERN,
  EMAIL_PATTERN: EMAIL_CONSTRAINTS.PATTERN,
  PASSWORD_PATTERN: PASSWORD_CONSTRAINTS.PATTERN,
  PHONE_PATTERN: /^\+?[1-9]\d{1,14}$/, // 保持现有模式
  API_KEY_PATTERN: /^[a-zA-Z0-9]{32,64}$/, // 保持现有模式
  TOKEN_PATTERN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, // 保持现有模式
});

