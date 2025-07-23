/**
 * API Key 服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

import { deepFreeze } from "@common/utils/object-immutability.util";

// 📝 操作名称常量
export const APIKEY_OPERATIONS = deepFreeze({
  VALIDATE_API_KEY: "validateApiKey",
  UPDATE_API_KEY_USAGE: "updateApiKeyUsage",
  CREATE_API_KEY: "createApiKey",
  GET_USER_API_KEYS: "getUserApiKeys",
  REVOKE_API_KEY: "revokeApiKey",
  FIND_API_KEY_BY_ID: "findApiKeyById",
  UPDATE_API_KEY: "updateApiKey",
  DELETE_API_KEY: "deleteApiKey",
  REGENERATE_API_KEY: "regenerateApiKey",
  GET_API_KEY_STATISTICS: "getApiKeyStatistics",
  VALIDATE_API_KEY_PERMISSIONS: "validateApiKeyPermissions",
  CLEANUP_EXPIRED_API_KEYS: "cleanupExpiredApiKeys",
});

// 📢 消息常量
export const APIKEY_MESSAGES = deepFreeze({
  // 成功消息
  API_KEY_CREATED: "API Key创建成功",
  API_KEY_REVOKED: "API Key已撤销",
  API_KEY_UPDATED: "API Key更新成功",
  API_KEY_REGENERATED: "API Key重新生成成功",
  API_KEY_VALIDATED: "API Key验证成功",
  API_KEY_USAGE_UPDATED: "API Key使用统计更新成功",
  USER_API_KEYS_RETRIEVED: "用户API Keys获取成功",
  API_KEY_STATISTICS_RETRIEVED: "API Key统计信息获取成功",
  EXPIRED_API_KEYS_CLEANED: "过期API Keys清理完成",

  // 错误消息 - 已移至 src/common/constants/error-messages.constants.ts
  // 保留模块特定的错误消息

  // 警告消息
  API_KEY_NEAR_EXPIRY: "API Key即将过期",
  API_KEY_HIGH_USAGE: "API Key使用频率较高",
  API_KEY_UNUSUAL_ACTIVITY: "检测到API Key异常活动",
  API_KEY_RATE_LIMIT_APPROACHING: "API Key接近频率限制",
  MULTIPLE_FAILED_VALIDATIONS: "检测到多次API Key验证失败",

  // 信息消息
  API_KEY_VALIDATION_STARTED: "开始API Key验证",
  API_KEY_CREATION_STARTED: "开始创建API Key",
  API_KEY_USAGE_UPDATE_STARTED: "开始更新API Key使用统计",
  USER_API_KEYS_LOOKUP_STARTED: "开始查询用户API Keys",
  API_KEY_REVOCATION_STARTED: "开始撤销API Key",
  API_KEY_PERMISSIONS_CHECK_STARTED: "开始检查API Key权限",
});

// ⚙️ 默认值常量
export const APIKEY_DEFAULTS = deepFreeze({
  APP_KEY_PREFIX: "sk-",
  ACCESS_TOKEN_LENGTH: 32,
  DEFAULT_RATE_LIMIT: {
    requests: 200,
    window: "1m",
  },
  DEFAULT_ACTIVE_STATUS: true,
  DEFAULT_PERMISSIONS: [],
  DEFAULT_EXPIRY_DAYS: 365,
  DEFAULT_NAME_PREFIX: "API Key",
});

// 🔧 API Key 配置常量
export const APIKEY_CONFIG = deepFreeze({
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MIN_PERMISSIONS: 0,
  MAX_PERMISSIONS: 50,
  MIN_RATE_LIMIT_REQUESTS: 1,
  MAX_RATE_LIMIT_REQUESTS: 1000000,
  APP_KEY_UUID_LENGTH: 36,
  ACCESS_TOKEN_CHARSET:
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  USAGE_UPDATE_BATCH_SIZE: 100,
  CLEANUP_BATCH_SIZE: 50,
  STATISTICS_CACHE_TTL_SECONDS: 300,
});

// 📊 API Key 状态常量
export const APIKEY_STATUS = deepFreeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  EXPIRED: "expired",
  REVOKED: "revoked",
  SUSPENDED: "suspended",
  PENDING: "pending",
});

// 🏷️ API Key 类型常量
export const APIKEY_TYPES = deepFreeze({
  STANDARD: "standard",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
  TRIAL: "trial",
  DEVELOPMENT: "development",
  PRODUCTION: "production",
});

// 📈 API Key 指标常量
export const APIKEY_METRICS = deepFreeze({
  VALIDATION_COUNT: "apikey_validation_count",
  VALIDATION_SUCCESS_COUNT: "apikey_validation_success_count",
  VALIDATION_FAILURE_COUNT: "apikey_validation_failure_count",
  CREATION_COUNT: "apikey_creation_count",
  REVOCATION_COUNT: "apikey_revocation_count",
  USAGE_UPDATE_COUNT: "apikey_usage_update_count",
  AVERAGE_VALIDATION_TIME: "apikey_avg_validation_time",
  ACTIVE_API_KEYS_COUNT: "apikey_active_count",
  EXPIRED_API_KEYS_COUNT: "apikey_expired_count",
  TOTAL_USAGE_COUNT: "apikey_total_usage_count",
});

// 🔍 验证规则常量
export const APIKEY_VALIDATION_RULES = deepFreeze({
  APP_KEY_PATTERN:
    /^sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  ACCESS_TOKEN_PATTERN: /^[a-zA-Z0-9]{32}$/,
  NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,
  RATE_LIMIT_WINDOW_PATTERN: /^(\d+)([smhd])$/,
});

// ⏰ 时间相关常量
export const APIKEY_TIME_CONFIG = deepFreeze({
  EXPIRY_WARNING_DAYS: 7,
  CLEANUP_INTERVAL_HOURS: 24,
  USAGE_UPDATE_TIMEOUT_MS: 5000,
  VALIDATION_TIMEOUT_MS: 3000,
  STATISTICS_UPDATE_INTERVAL_MS: 300000, // 5分钟
  CACHE_REFRESH_INTERVAL_MS: 600000, // 10分钟
});

// 🚨 告警阈值常量
export const APIKEY_ALERT_THRESHOLDS = deepFreeze({
  HIGH_USAGE_PERCENTAGE: 80,
  CRITICAL_USAGE_PERCENTAGE: 95,
  VALIDATION_FAILURE_RATE: 0.1,
  UNUSUAL_ACTIVITY_THRESHOLD: 1000,
  RATE_LIMIT_WARNING_PERCENTAGE: 90,
});

// 🔄 重试配置常量
export const APIKEY_RETRY_CONFIG = deepFreeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 100,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 5000,
  TIMEOUT_MS: 10000,
});

// 📋 错误代码常量
export const APIKEY_ERROR_CODES = deepFreeze({
  INVALID_CREDENTIALS: "APIKEY_001",
  EXPIRED_CREDENTIALS: "APIKEY_002",
  INSUFFICIENT_PERMISSIONS: "APIKEY_003",
  NOT_FOUND: "APIKEY_004",
  CREATION_FAILED: "APIKEY_005",
  UPDATE_FAILED: "APIKEY_006",
  REVOCATION_FAILED: "APIKEY_007",
  VALIDATION_FAILED: "APIKEY_008",
  RATE_LIMIT_EXCEEDED: "APIKEY_009",
  GENERATION_FAILED: "APIKEY_010",
});

// 🎯 缓存键常量
export const APIKEY_CACHE_KEYS = deepFreeze({
  VALIDATION: "apikey:validation:",
  USAGE_STATS: "apikey:usage:",
  USER_KEYS: "apikey:user:",
  PERMISSIONS: "apikey:permissions:",
  RATE_LIMIT: "apikey:ratelimit:",
  STATISTICS: "apikey:stats:",
});

// 🎨 日志级别映射常量
export const APIKEY_LOG_LEVELS = deepFreeze({
  VALIDATION_SUCCESS: "debug",
  VALIDATION_FAILURE: "warn",
  CREATION: "info",
  REVOCATION: "info",
  ERROR: "error",
  USAGE_UPDATE: "debug",
  STATISTICS: "debug",
});
