/**
 * Auth模块公共语义常量 - 合并保留的固定标准
 * 🎯 重构说明：整合所有保留的枚举、正则、字符常量等固定业务标准
 * 
 * ✅ 整合内容：
 * - API Key格式规范和验证正则
 * - 频率限制策略枚举和作用域  
 * - 权限级别、主体类型、状态枚举
 * - 验证正则表达式模式
 * - 用户注册验证规则和保留用户名
 * - 账户默认状态配置
 * - 固定字符分隔符和配置常量
 * 
 * 📋 使用说明：这些是Auth模块的固定业务标准，不受环境变量影响
 * 数值配置请使用 AuthConfigCompatibilityWrapper 访问
 */

// ================================
// API Key 格式规范 - 固定标准
// ================================

export const API_KEY_FORMAT = {
  MIN_LENGTH: 32,                              // 最小长度
  MAX_LENGTH: 64,                              // 最大长度  
  DEFAULT_LENGTH: 32,                          // 默认生成长度
  PATTERN: /^[a-zA-Z0-9]{32,64}$/,            // 格式验证正则
  PREFIX: 'sk-',                              // 密钥前缀
  CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',  // 字符集
  
  // UUID格式API Key（带前缀）
  APP_KEY_PATTERN: /^sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  ACCESS_TOKEN_PATTERN: /^[a-zA-Z0-9]{32}$/,  // 访问令牌格式
  APP_KEY_UUID_LENGTH: 36                     // UUID长度（不含前缀）
} as const;

export const API_KEY_VALIDATION = {
  // 固定的验证正则表达式 - 业务规则标准
  NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,           // 名称格式
  RATE_LIMIT_WINDOW_PATTERN: /^(\d+)([smhd])$/,     // 频率限制窗口格式
  
  // 名称长度限制 - 固定业务规则
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
} as const;

export const JWT_TOKEN_CONFIG = {
  // 固定的JWT格式验证正则 - 标准格式不变
  PATTERN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/  // JWT格式验证
} as const;

// ================================
// 频率限制枚举标准
// ================================

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

export const RATE_LIMIT_SCOPES = {
  GLOBAL: 'global',           // 全局限制
  PER_USER: 'per_user',       // 按用户限制
  PER_IP: 'per_ip',           // 按IP限制
  PER_API_KEY: 'per_api_key', // 按API Key限制
  PER_ENDPOINT: 'per_endpoint' // 按端点限制
} as const;

// 时间单位转换 - 固定标准
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

export const RATE_LIMIT_VALIDATION = {
  // 固定的验证正则表达式 - 业务规则标准
  WINDOW_PATTERN: /^(\d+)([smhdwM])$/,     // 时间窗口格式验证
  APP_KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,     // 应用键格式验证
} as const;

// ================================
// 权限控制枚举标准
// ================================

export const PERMISSION_LEVELS = {
  NONE: 0,        // 无权限
  READ: 1,        // 读权限  
  WRITE: 2,       // 写权限
  DELETE: 3,      // 删除权限
  ADMIN: 4,       // 管理权限
  SUPER_ADMIN: 5  // 超级管理权限
} as const;

export const PERMISSION_SUBJECTS = {
  USER: 'user',           // 普通用户
  API_KEY: 'api_key',     // API密钥
  SERVICE: 'service',     // 系统服务
  SYSTEM: 'system',       // 系统级
  GUEST: 'guest',         // 访客用户
  ADMIN: 'admin'          // 管理员
} as const;

export const PERMISSION_CHECK_STATUS = {
  ALLOWED: 'allowed',     // 权限检查通过
  DENIED: 'denied',       // 权限检查被拒绝
  ERROR: 'error'          // 权限检查过程出错
} as const;

export const PERMISSION_VALIDATION = {
  // 固定的验证正则表达式 - 业务规则标准
  SUBJECT_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,      // 主体ID格式
  PERMISSION_PATTERN: /^[a-zA-Z0-9_:.-]+$/,    // 权限名格式
  ROLE_PATTERN: /^[a-zA-Z0-9_-]+$/             // 角色名格式
} as const;

export const PERMISSION_GROUPS = {
  STOCK_DATA: 'stock_data',           // 股票数据权限组
  USER_MANAGEMENT: 'user_management', // 用户管理权限组
  API_MANAGEMENT: 'api_management',   // API管理权限组
  SYSTEM_ADMIN: 'system_admin',       // 系统管理权限组
  MONITORING: 'monitoring',           // 监控权限组
  SECURITY: 'security',               // 安全权限组
  REPORTING: 'reporting',             // 报告权限组
  CONFIGURATION: 'configuration'      // 配置权限组
} as const;

export const PERMISSION_CHECK_OPTIONS = {
  STRICT_MODE: 'strict',              // 严格模式
  LENIENT_MODE: 'lenient',            // 宽松模式
  CACHE_ENABLED: 'cache_enabled',     // 缓存启用
  CACHE_DISABLED: 'cache_disabled',   // 缓存禁用
  LOG_ENABLED: 'log_enabled',         // 日志启用
  LOG_DISABLED: 'log_disabled',       // 日志禁用
  DETAILED_RESULT: 'detailed_result', // 详细结果
  SIMPLE_RESULT: 'simple_result'      // 简单结果
} as const;

export const PERMISSION_INHERITANCE = {
  ROLE_BASED: 'role_based',           // 基于角色继承
  PERMISSION_BASED: 'permission_based', // 基于权限继承
  HYBRID: 'hybrid',                   // 混合继承
  NONE: 'none'                        // 无继承
} as const;

export const PERMISSION_CONFIG = {
  CACHE_KEY_SEPARATOR: ':',           // 缓存键分隔符
  PERMISSION_LIST_SEPARATOR: ',',     // 权限列表分隔符
  ROLE_LIST_SEPARATOR: ','            // 角色列表分隔符
} as const;

// ================================
// 用户操作验证标准
// ================================

export const USER_REGISTRATION = {
  // 固定的验证正则表达式 - 业务规则标准
  PASSWORD_PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,  // 密码：字母+数字，8位以上
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,                               // 用户名：字母数字下划线连字符
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,                        // 邮箱格式验证
  
  // 保留用户名列表 - 禁止注册的用户名（固定业务规则）
  RESERVED_USERNAMES: ['admin', 'root', 'system', 'api', 'user', 'test', 'null', 'undefined']
} as const;

export const ACCOUNT_DEFAULTS = {
  ROLE: 'developer' as const,  // 默认角色
  STATUS: 'active',           // 默认状态  
  EMAIL_VERIFIED: false,      // 邮箱验证状态
  ACCOUNT_LOCKED: false,      // 账户锁定状态
  TWO_FACTOR_ENABLED: false,  // 双因子认证状态
  PASSWORD_RESET_REQUIRED: false  // 密码重置要求状态
} as const;

// ================================
// 频率限制操作和消息枚举
// ================================

export enum RateLimitOperation {
  CHECK_RATE_LIMIT = "checkRateLimit",
  CHECK_FIXED_WINDOW = "checkFixedWindow", 
  CHECK_SLIDING_WINDOW = "checkSlidingWindow",
  RESET_RATE_LIMIT = "resetRateLimit",
}

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

// ================================
// 统一导出 - 便于外部引用
// ================================

export const AUTH_SEMANTIC_CONSTANTS = {
  // API Key相关
  API_KEY_FORMAT,
  API_KEY_VALIDATION,
  JWT_TOKEN_CONFIG,
  
  // 频率限制相关
  RATE_LIMIT_SCOPES,
  TIME_UNITS,
  TIME_MULTIPLIERS,
  RATE_LIMIT_VALIDATION,
  
  // 权限控制相关
  PERMISSION_LEVELS,
  PERMISSION_SUBJECTS,
  PERMISSION_CHECK_STATUS,
  PERMISSION_VALIDATION,
  PERMISSION_GROUPS,
  PERMISSION_CHECK_OPTIONS,
  PERMISSION_INHERITANCE,
  PERMISSION_CONFIG,
  
  // 用户操作相关
  USER_REGISTRATION,
  ACCOUNT_DEFAULTS,
} as const;