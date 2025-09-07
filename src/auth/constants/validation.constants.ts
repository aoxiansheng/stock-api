/**
 * 认证验证规则常量定义
 * 🎯 统一所有验证规则，消除重复和不一致问题
 * @version 1.0.0
 * @since 2025-09-05
 */

import { deepFreeze } from "../../common/utils/object-immutability.util";

/**
 * 密码约束配置
 * @description 定义密码长度、复杂度等验证规则
 */
export const PASSWORD_CONSTRAINTS = deepFreeze({
  /** 最小密码长度，必须至少 8 个字符 */
  MIN_LENGTH: 8,
  /** 最大密码长度，不超过 128 个字符 */
  MAX_LENGTH: 128,
  /** 是否要求数字 */
  REQUIRE_NUMBERS: true,
  /** 是否要求大写字母 */
  REQUIRE_UPPERCASE: true,
  /** 是否要求小写字母 */
  REQUIRE_LOWERCASE: true,
  /** 密码正则表达式 - 至少一个字母和一个数字，8位以上 */
  PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const);

/**
 * 用户名约束配置
 * @description 定义用户名长度、格式等验证规则
 */
export const USERNAME_CONSTRAINTS = deepFreeze({
  /** 最小用户名长度 */
  MIN_LENGTH: 3,
  /** 最大用户名长度 */
  MAX_LENGTH: 20,
  /** 用户名格式规则 - 只允许字母、数字、下划线、连字符 */
  PATTERN: /^[a-zA-Z0-9_-]+$/,
  /** 保留用户名列表 */
  RESERVED_NAMES: ['admin', 'root', 'system', 'api', 'user', 'test', 'null', 'undefined'],
} as const);

/**
 * 邮箱约束配置
 * @description 定义邮箱验证规则
 */
export const EMAIL_CONSTRAINTS = deepFreeze({
  /** 邮箱格式规则 */
  PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** 最大邮箱长度 */
  MAX_LENGTH: 254,
  /** 是否要求邮箱验证 */
  REQUIRE_VERIFICATION: true,
} as const);


/**
 * API Key 约束配置
 * @description 定义API Key验证规则
 */
export const API_KEY_CONSTRAINTS = deepFreeze({
  /** API Key 格式规则 */
  PATTERN: /^[a-zA-Z0-9]{32,64}$/,
  /** 最小长度 */
  MIN_LENGTH: 32,
  /** 最大长度 */
  MAX_LENGTH: 64,
  /** 字符集 */
  CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  /** 默认长度 */
  DEFAULT_LENGTH: 32,
} as const);

/**
 * JWT Token 约束配置
 * @description 定义JWT Token验证规则
 */
export const TOKEN_CONSTRAINTS = deepFreeze({
  /** Token 格式规则 */
  PATTERN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
  /** Token 过期时间（小时） */
  EXPIRY_HOURS: 24,
  /** 刷新Token 过期时间（天） */
  REFRESH_EXPIRY_DAYS: 7,
} as const);

/**
 * 登录约束配置
 * @description 定义登录相关的验证规则
 */
export const LOGIN_CONSTRAINTS = deepFreeze({
  /** 最大登录尝试次数 */
  MAX_ATTEMPTS: 5,
  /** 账户锁定持续时间（分钟） */
  LOCK_DURATION_MINUTES: 30,
  /** 会话超时时间（分钟） */
  SESSION_TIMEOUT_MINUTES: 60,
} as const);

/**
 * 统一验证规则导出
 * @description 方便其他模块导入所有验证规则
 */
export const VALIDATION_RULES = deepFreeze({
  PASSWORD: PASSWORD_CONSTRAINTS,
  USERNAME: USERNAME_CONSTRAINTS,
  EMAIL: EMAIL_CONSTRAINTS,
  API_KEY: API_KEY_CONSTRAINTS,
  TOKEN: TOKEN_CONSTRAINTS,
  LOGIN: LOGIN_CONSTRAINTS,
} as const);

