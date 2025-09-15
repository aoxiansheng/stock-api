/**
 * API安全固定标准常量 - 真正不变的业务规则和格式标准
 * 🎯 重构说明：保留固定标准，数值配置已迁移到统一配置系统
 * 
 * ✅ 保留内容：格式规范、验证正则、字符集等固定标准
 * 🔧 已迁移内容：数值限制、默认值、TTL等可配置参数
 * 
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 */

// API Key 格式规则 - 生成和验证规则
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

// ⚠️ 临时保留以避免导入错误 - 建议使用 AuthConfigCompatibilityWrapper.API_KEY_OPERATIONS
export const API_KEY_OPERATIONS = {
  CACHE_TTL_SECONDS: 300,                         // 缓存TTL秒数
  VALIDATE_PER_SECOND: 100,                       // 每秒验证次数
  MAX_KEYS_PER_USER: 50,                          // 每用户最大密钥数
  CREATE_PER_DAY: 10,                             // 每天创建限制
  STATISTICS_CACHE_TTL: 300,                      // 统计缓存TTL
  USAGE_UPDATE_TIMEOUT_MS: 5000,                  // 使用量更新超时
  VALIDATION_TIMEOUT_MS: 3000,                    // 验证超时
} as const;

// ⚠️  已迁移：API Key操作限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.API_KEY_OPERATIONS 获取
// 📋 迁移到：authConfig.limits (创建限制、验证频率、最大密钥数等)
// 📋 迁移到：authConfig.cache (缓存TTL、统计缓存等)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.API_KEY_OPERATIONS 替代
 * 这些数值配置已迁移到统一配置系统，支持环境变量动态调整
 */

// ⚠️ 临时保留以避免导入错误 - 建议使用 AuthConfigCompatibilityWrapper.API_KEY_DEFAULTS
export const API_KEY_DEFAULTS = {
  NAME_PREFIX: 'API Key',                         // 名称前缀
  DEFAULT_RATE_LIMIT_REQUESTS: 200,              // 默认频率限制请求数
  DEFAULT_RATE_LIMIT_WINDOW: '1m',               // 默认频率限制窗口
  DEFAULT_EXPIRY_DAYS: 365,                      // 默认过期天数
  DEFAULT_PERMISSIONS: [],                       // 默认权限列表
} as const;

// ⚠️  已迁移：API Key默认配置 - 现在使用统一配置系统  
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.API_KEY_DEFAULTS 获取
// 📋 迁移到：authConfig.limits (默认过期天数、频率限制等数值配置)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.API_KEY_DEFAULTS 替代
 * 数值配置已迁移到统一配置系统，字符串常量将保留
 */

// API Key 验证规则 - 固定标准与可配置参数混合
export const API_KEY_VALIDATION = {
  // ✅ 保留：固定的验证正则表达式 - 业务规则标准
  NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,           // 名称格式
  RATE_LIMIT_WINDOW_PATTERN: /^(\d+)([smhd])$/,     // 频率限制窗口格式
  
  // ⚠️ 临时保留以避免导入错误 - 建议使用 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
  MIN_NAME_LENGTH: 1,                               // 最小名称长度
  MAX_NAME_LENGTH: 100,                             // 最大名称长度
  MIN_PERMISSIONS: 0,                               // 最小权限数
  MAX_PERMISSIONS: 50,                              // 最大权限数
  MIN_RATE_LIMIT_REQUESTS: 10,                      // 最小频率限制
  MAX_RATE_LIMIT_REQUESTS: 10000,                   // 最大频率限制
} as const;

// ⚠️  已迁移：数值限制配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取  
// 📋 迁移到：authConfig.limits (名称长度、权限数量、频率限制范围等)
/**
 * @deprecated 数值限制已迁移到 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
 * 原 MIN_NAME_LENGTH, MAX_NAME_LENGTH, MIN_PERMISSIONS, MAX_PERMISSIONS,
 * MIN_RATE_LIMIT_REQUESTS, MAX_RATE_LIMIT_REQUESTS 现在支持环境变量调整
 */

// ⚠️  已迁移：用户层级API配额 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.TIER_QUOTAS 获取
// 📋 迁移到：authConfig.limits (层级化的频率限制、API密钥数量配置)  
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.TIER_QUOTAS 替代
 * 用户层级配额已迁移到统一配置系统，支持按用户类型的差异化配置
 * 原 FREE, BASIC, PREMIUM, ENTERPRISE, INTERNAL 层级配置现在支持环境变量调整
 */

// ⚠️ 临时保留以避免导入错误 - 建议使用 AuthConfigCompatibilityWrapper.TIMING_CONFIG
export const API_KEY_TIMING = {
  EXPIRY_WARNING_DAYS: 7,                         // 过期警告天数
  CLEANUP_INTERVAL_HOURS: 24,                     // 清理间隔小时
  USAGE_UPDATE_TIMEOUT_MS: 5000,                  // 使用量更新超时
  VALIDATION_TIMEOUT_MS: 3000,                    // 验证超时
  STATISTICS_UPDATE_INTERVAL_MS: 60000,           // 统计更新间隔
  CACHE_REFRESH_INTERVAL_MS: 300000,              // 缓存刷新间隔
} as const;

// ⚠️  已迁移：API Key时间配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.TIMING_CONFIG 获取
// 📋 迁移到：authConfig.limits (过期提醒天数、清理间隔等)
// 📋 迁移到：authConfig.limits (超时配置、更新间隔、缓存刷新间隔等)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.TIMING_CONFIG 替代  
 * 时间配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 EXPIRY_WARNING_DAYS, CLEANUP_INTERVAL_HOURS, USAGE_UPDATE_TIMEOUT_MS,
 * VALIDATION_TIMEOUT_MS, STATISTICS_UPDATE_INTERVAL_MS, CACHE_REFRESH_INTERVAL_MS
 * 现在都支持环境变量配置
 */

// JWT Token 配置 - 固定标准与可配置参数混合
export const JWT_TOKEN_CONFIG = {
  // ✅ 保留：固定的JWT格式验证正则 - 标准格式不变
  PATTERN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/  // JWT格式验证
} as const;

// ⚠️  已迁移：JWT时间配置 - 现在使用统一配置系统  
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.JWT_CONFIG 获取
// 📋 迁移到：authConfig.limits (Token过期时间、刷新Token过期时间)
/**
 * @deprecated JWT时间配置已迁移到 AuthConfigCompatibilityWrapper.JWT_CONFIG
 * 原 EXPIRY_HOURS, REFRESH_EXPIRY_DAYS 现在支持环境变量动态调整
 */