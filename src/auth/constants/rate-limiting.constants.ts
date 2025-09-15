/**
 * 频率限制固定标准常量 - 业务规则和枚举标准
 * 🎯 重构说明：保留固定标准，数值配置已迁移到统一配置系统
 * 
 * ✅ 保留内容：枚举类型、验证模式、时间单位、消息常量等固定标准
 * 🔧 已迁移内容：频率限制数值、TTL配置、性能阈值等可配置参数
 * 
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 */

// ⚠️  已迁移：认证操作频率限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.AUTH_RATE_LIMITS 获取
// 📋 迁移到：authConfig.limits (登录限制、注册限制、密码重置限制)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.AUTH_RATE_LIMITS 替代
 * 认证频率限制已迁移到统一配置系统，支持环境变量动态调整
 * 原 LOGIN_PER_MINUTE, LOGIN_PER_HOUR, LOGIN_LOCKOUT_MINUTES, REGISTER_PER_MINUTE,
 * REGISTER_PER_HOUR, SAME_EMAIL_COOLDOWN_MINUTES, PASSWORD_RESET_PER_MINUTE,
 * PASSWORD_RESET_PER_HOUR, RESET_CODE_VALID_MINUTES 现在都支持环境变量配置
 */

// ⚠️  已迁移：会话管理限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.SESSION_LIMITS 获取
// 📋 迁移到：authConfig.limits (会话创建、刷新、注销限制、并发会话数)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.SESSION_LIMITS 替代
 * 会话限制已迁移到统一配置系统，支持环境变量动态调整
 */

// ⚠️  已迁移：权限检查限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.PERMISSION_RATE_LIMITS 获取
// 📋 迁移到：authConfig.limits (权限检查频率) 和 authConfig.cache (权限缓存TTL)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.PERMISSION_RATE_LIMITS 替代
 * 权限检查限制已迁移到统一配置系统，支持环境变量动态调整
 */

// ⚠️  已迁移：全局节流配置 - 现在使用统一配置系统  
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.GLOBAL_RATE_LIMITS 获取
// 📋 迁移到：authConfig.limits (全局频率限制、负载大小、查询参数、递归深度)
// 📋 迁移到：authConfig.cache (TTL配置)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.GLOBAL_RATE_LIMITS 替代
 * 全局限制已迁移到统一配置系统，支持环境变量动态调整
 */

// 频率限制策略枚举 - 算法类型
export enum RateLimitStrategy {
  FIXED_WINDOW = "fixed_window",
  SLIDING_WINDOW = "sliding_window", 
  TOKEN_BUCKET = "token_bucket",
  LEAKY_BUCKET = "leaky_bucket",
}

export enum RateLimitTier {
  FREE = "free",
  BASIC = "basic", 
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
  INTERNAL = "internal",
}

export enum RateLimitScope {
  GLOBAL = "global",
  PER_USER = "per_user",
  PER_IP = "per_ip", 
  PER_API_KEY = "per_api_key",
  PER_ENDPOINT = "per_endpoint",
}

// ⚠️  已迁移：频率限制层级倍数 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.RATE_LIMIT_TIERS 获取
// 📋 迁移到：authConfig.limits (用户层级限制倍数配置)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.RATE_LIMIT_TIERS 替代
 * 层级倍数已迁移到统一配置系统，支持环境变量动态调整
 */

// ✅ 保留：频率限制作用域 - 限制应用范围（固定枚举标准）
export const RATE_LIMIT_SCOPES = {
  GLOBAL: 'global',           // 全局限制
  PER_USER: 'per_user',       // 按用户限制
  PER_IP: 'per_ip',           // 按IP限制
  PER_API_KEY: 'per_api_key', // 按API Key限制
  PER_ENDPOINT: 'per_endpoint' // 按端点限制
} as const;

// ⚠️  已迁移：Redis存储配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.RATE_LIMIT_STORAGE 获取
// 📋 迁移到：authConfig.cache (Redis TTL) 和 authConfig.limits (超时、重试、缓冲配置)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.RATE_LIMIT_STORAGE 替代
 * Redis存储配置已迁移到统一配置系统，支持环境变量动态调整
 */

// 时间单位转换 - 时间计算常量
export const TIME_UNITS = {
  SECOND: 's',
  MINUTE: 'm', 
  HOUR: 'h',
  DAY: 'd',
  WEEK: 'w',
  MONTH: 'M'
} as const;

// 时间倍数转换 - 秒为基础单位的倍数
export const TIME_MULTIPLIERS = {
  [TIME_UNITS.SECOND]: 1,              // 1秒 = 1秒
  [TIME_UNITS.MINUTE]: 60,             // 1分钟 = 60秒
  [TIME_UNITS.HOUR]: 3600,             // 1小时 = 3600秒
  [TIME_UNITS.DAY]: 86400,             // 1天 = 86400秒
  [TIME_UNITS.WEEK]: 604800,           // 1周 = 604800秒
  [TIME_UNITS.MONTH]: 2592000          // 1月 = 2592000秒（30天近似）
} as const;

// 频率限制验证规则 - 固定标准与可配置参数混合  
export const RATE_LIMIT_VALIDATION = {
  // ✅ 保留：固定的验证正则表达式 - 业务规则标准
  WINDOW_PATTERN: /^(\d+)([smhdwM])$/,     // 时间窗口格式验证
  APP_KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,     // 应用键格式验证
  // 临时属性以避免编译错误 - 应该迁移到统一配置系统
  MIN_APP_KEY_LENGTH: 16,
  MAX_APP_KEY_LENGTH: 64,
} as const;

// ⚠️  已迁移：验证长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
// 📋 迁移到：authConfig.limits (应用键长度限制)
/**
 * @deprecated 长度限制已迁移到 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
 * 原 MIN_APP_KEY_LENGTH, MAX_APP_KEY_LENGTH 现在支持环境变量动态调整
 */

// ⚠️  已迁移：性能配置参数 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.PERFORMANCE_LIMITS 获取  
// 📋 迁移到：authConfig.limits (慢请求阈值、字符串长度、对象深度、字段数量等)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.PERFORMANCE_LIMITS 替代
 * 性能配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 TEST_MODE, MULTIPLIER, SLOW_REQUEST_THRESHOLD_MS, MAX_STRING_LENGTH,
 * MAX_OBJECT_DEPTH, MAX_OBJECT_FIELDS 现在都支持环境变量配置
 */

// SECURITY_LIMITS 和 RATE_LIMIT_CONFIG 已弃用
// 请使用新的 AuthConfigService 统一配置
// import { AuthConfigService } from '../services/infrastructure/auth-config.service';

// 频率限制操作枚举
export enum RateLimitOperation {
  CHECK_RATE_LIMIT = "checkRateLimit",
  CHECK_FIXED_WINDOW = "checkFixedWindow", 
  CHECK_SLIDING_WINDOW = "checkSlidingWindow",
  RESET_RATE_LIMIT = "resetRateLimit",
}

// 频率限制消息枚举
export enum RateLimitMessage {
  RATE_LIMIT_CHECK_STARTED = "开始频率限制检查",
  RATE_LIMIT_CHECK_FAILED = "频率限制检查失败", 
  FIXED_WINDOW_CHECK = "固定窗口检查",
  FIXED_WINDOW_EXCEEDED = "固定窗口超出限制",
  SLIDING_WINDOW_CHECK = "滑动窗口检查",
  SLIDING_WINDOW_EXCEEDED = "滑动窗口超出限制",
  UNSUPPORTED_STRATEGY_RESET = "不支持的策略重置",
  RATE_LIMIT_RESET = "频率限制已重置",
}