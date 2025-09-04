/**
 * 认证服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

import { UserRole } from "../../auth/enums/user-role.enum";
import { buildCacheKey } from "@common/constants/unified/unified-cache-config.constants";
import { RATE_LIMIT_CONFIG } from "@common/constants/rate-limit.constants";
import { PERFORMANCE_CONSTANTS } from "@common/constants/unified/performance.constants";
import { OperationStatus } from "@monitoring/contracts/enums/operation-status.enum";

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

// ⚙️ 默认值常量
export const AUTH_DEFAULTS = Object.freeze({
  DEFAULT_USER_ROLE: UserRole.DEVELOPER,
  DEFAULT_USER_ACTIVE_STATUS: true,
  DEFAULT_EMAIL_VERIFIED_STATUS: false,
  DEFAULT_ACCOUNT_LOCKED_STATUS: false,
  DEFAULT_PASSWORD_RESET_REQUIRED: false,
  DEFAULT_TWO_FACTOR_ENABLED: false,
});

// 🔧 认证配置常量
export const AUTH_CONFIG = Object.freeze({
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20, // 修正：与DTO验证保持一致，从50改为20
  PASSWORD_HASH_ROUNDS: 12,
  TOKEN_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_MINUTES: 30,
  PASSWORD_HISTORY_COUNT: 5,
  SESSION_TIMEOUT_MINUTES: 60,
});

// 🎯 用户状态常量
export const AUTH_USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  LOCKED: "locked",
  PENDING_VERIFICATION: "pending_verification",
  SUSPENDED: "suspended",
  DELETED: "deleted",
});

// 🔒 权限级别常量 - 已移至 src/auth/constants/permission.constants.ts
// 使用 PERMISSION_LEVELS 替代

// 📊 认证事件类型常量
export const AUTH_EVENT_TYPES = Object.freeze({
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILURE: "login_failure",
  LOGOUT: "logout",
  REGISTRATION: "registration",
  PASSWORD_CHANGE: "password_change",
  PASSWORD_RESET: "password_reset",
  EMAIL_VERIFICATION: "email_verification",
  ACCOUNT_LOCK: "account_lock",
  ACCOUNT_UNLOCK: "account_unlock",
  TOKEN_REFRESH: "token_refresh",
  API_KEY_CREATED: "api_key_created",
  API_KEY_REVOKED: "api_key_revoked",
  PROFILE_UPDATE: "profile_update",
  TWO_FACTOR_ENABLED: "two_factor_enabled",
  TWO_FACTOR_DISABLED: "two_factor_disabled",
});

// 🏷️ 认证标签常量
export const AUTH_TAGS = Object.freeze({
  SECURITY_CRITICAL: "security_critical",
  USER_MANAGEMENT: "user_management",
  TOKEN_MANAGEMENT: "token_management",
  API_KEY_MANAGEMENT: "api_key_management",
  PASSWORD_SECURITY: "password_security",
  EMAIL_VERIFICATION: "email_verification",
  TWO_FACTOR_AUTH: "two_factor_auth",
  AUDIT_LOG: "audit_log",
  PERFORMANCE_CRITICAL: "performance_critical",
  COMPLIANCE_REQUIRED: "compliance_required",
});

// 📈 认证指标常量
export const AUTH_METRICS = Object.freeze({
  REGISTRATION_COUNT: "auth_registration_count",
  LOGIN_SUCCESS_COUNT: "auth_login_success_count",
  LOGIN_FAILURE_COUNT: "auth_login_failure_count",
  TOKEN_REFRESH_COUNT: "auth_token_refresh_count",
  API_KEY_USAGE_COUNT: "auth_api_key_usage_count",
  PASSWORD_CHANGE_COUNT: "auth_password_change_count",
  ACCOUNT_LOCK_COUNT: "auth_account_lock_count",
  AVERAGE_LOGIN_TIME: "auth_average_login_time",
  ACTIVE_USER_COUNT: "auth_active_user_count",
  SESSION_DURATION: "auth_session_duration",
});

// 🔍 验证规则常量
export const AUTH_VALIDATION_RULES = Object.freeze({
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, // 修正：简化为要求至少一个字母和一个数字，8位以上
  PHONE_PATTERN: /^\+?[1-9]\d{1,14}$/,
  API_KEY_PATTERN: /^[a-zA-Z0-9]{32,64}$/,
  TOKEN_PATTERN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
});

// 🎛️ 缓存键常量 - 使用统一的buildCacheKey函数
export const AUTH_CACHE_KEYS = Object.freeze({
  // 使用统一的 buildCacheKey 函数生成缓存键
  USER_SESSION: (userId: string) => buildCacheKey('AUTH', userId, 'session'),
  LOGIN_ATTEMPTS: (ip: string) => buildCacheKey('AUTH', ip, 'attempts'),
  PASSWORD_RESET: (userId: string) => buildCacheKey('AUTH', userId, 'reset'),
  EMAIL_VERIFICATION: (userId: string) => buildCacheKey('AUTH', userId, 'verify'),
  API_KEY_CACHE: (keyId: string) => buildCacheKey('API_KEY', keyId),
  USER_PERMISSIONS: (userId: string) => buildCacheKey('PERMISSION', userId),
  REFRESH_TOKEN: (tokenId: string) => buildCacheKey('AUTH', tokenId, 'refresh'),
  TWO_FACTOR_CODE: (userId: string) => buildCacheKey('AUTH', userId, '2fa'),
  ACCOUNT_LOCK: (userId: string) => buildCacheKey('AUTH', userId, 'lock'),
  USER_PROFILE: (userId: string) => buildCacheKey('AUTH', userId, 'profile'),
});

// ⏱️ 时间间隔常量 - 使用统一的RATE_LIMIT_CONFIG.SYSTEM_INTERVALS
export const AUTH_INTERVALS = Object.freeze({
  TOKEN_CLEANUP_INTERVAL_MS: RATE_LIMIT_CONFIG.SYSTEM_INTERVALS.AUTH_TOKEN_CLEANUP,
  SESSION_CLEANUP_INTERVAL_MS: RATE_LIMIT_CONFIG.SYSTEM_INTERVALS.AUTH_SESSION_CLEANUP,
  LOGIN_ATTEMPT_RESET_INTERVAL_MS: RATE_LIMIT_CONFIG.SYSTEM_INTERVALS.AUTH_LOGIN_ATTEMPT_RESET,
  PASSWORD_EXPIRY_CHECK_INTERVAL_MS: RATE_LIMIT_CONFIG.SYSTEM_INTERVALS.AUTH_PASSWORD_EXPIRY_CHECK,
  ACCOUNT_LOCK_CHECK_INTERVAL_MS: RATE_LIMIT_CONFIG.SYSTEM_INTERVALS.AUTH_ACCOUNT_LOCK_CHECK,
});

// 🔄 重试配置常量
export const AUTH_RETRY_CONFIG = Object.freeze({
  MAX_RETRY_ATTEMPTS: PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS: PERFORMANCE_CONSTANTS.RETRY_SETTINGS.RETRY_DELAY_MS,
  EXPONENTIAL_BACKOFF_FACTOR: 2, // 保留auth特定的退避因子
  MAX_RETRY_DELAY_MS: PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_DELAY_MS,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT_MS: 60000,
});

// 🎯 响应状态常量
export const AUTH_RESPONSE_STATUS = Object.freeze({
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  PENDING: OperationStatus.PENDING,
  EXPIRED: "expired",
  INVALID: "invalid",
  LOCKED: "locked",
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
});

// 📋 错误代码常量
export const AUTH_ERROR_CODES = Object.freeze({
  INVALID_CREDENTIALS: "AUTH_001",
  USER_NOT_FOUND: "AUTH_002",
  USER_EXISTS: "AUTH_003",
  ACCOUNT_LOCKED: "AUTH_004",
  TOKEN_EXPIRED: "AUTH_005",
  TOKEN_INVALID: "AUTH_006",
  INSUFFICIENT_PERMISSIONS: "AUTH_007",
  EMAIL_NOT_VERIFIED: "AUTH_008",
  WEAK_PASSWORD: "AUTH_009",
  PASSWORD_REUSE: "AUTH_010",
  API_KEY_INVALID: "AUTH_011",
  RATE_LIMIT_EXCEEDED: "AUTH_012",
  TWO_FACTOR_REQUIRED: "AUTH_013",
  UNAUTHORIZED_ACCESS: "AUTH_014",
  SESSION_EXPIRED: "AUTH_015",
});
