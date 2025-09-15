/**
 * 用户操作固定标准常量 - 业务规则和验证模式标准  
 * 🎯 重构说明：保留固定标准，数值配置已迁移到统一配置系统
 * 
 * ✅ 保留内容：验证正则、保留用户名、默认角色/状态等固定标准
 * 🔧 已迁移内容：数值限制、时长配置、会话参数等可配置参数
 * 
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 */

// ⚠️  已迁移：用户登录限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.USER_LOGIN 获取
// 📋 迁移到：authConfig.limits (登录尝试次数、锁定时长、会话时长等)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.USER_LOGIN 替代
 * 用户登录限制已迁移到统一配置系统，支持环境变量动态调整
 * 原 MAX_ATTEMPTS, LOCKOUT_MINUTES, SESSION_HOURS, TOKEN_REFRESH_HOURS
 * 现在都支持环境变量配置
 */

// 用户注册规则 - 固定标准与可配置参数混合
export const USER_REGISTRATION = {
  // ✅ 保留：固定的验证正则表达式 - 业务规则标准
  PASSWORD_PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,  // 密码：字母+数字，8位以上
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,                               // 用户名：字母数字下划线连字符
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,                        // 邮箱格式验证
  
  // ✅ 保留：保留用户名列表 - 禁止注册的用户名（固定业务规则）
  RESERVED_USERNAMES: ['admin', 'root', 'system', 'api', 'user', 'test', 'null', 'undefined'],
  
  // ⚠️ 临时保留以避免导入错误 - 建议使用 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
  USERNAME_MIN_LENGTH: 3,                                            // 用户名最小长度
  USERNAME_MAX_LENGTH: 50,                                           // 用户名最大长度
  PASSWORD_MIN_LENGTH: 8,                                            // 密码最小长度
  PASSWORD_MAX_LENGTH: 100,                                          // 密码最大长度
  EMAIL_MAX_LENGTH: 254,                                             // 邮箱最大长度
} as const;

// ⚠️  已迁移：用户注册长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
// 📋 迁移到：authConfig.limits (密码长度、用户名长度、邮箱长度限制)
/**
 * @deprecated 长度限制已迁移到 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
 * 原 PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, USERNAME_MIN_LENGTH,
 * USERNAME_MAX_LENGTH, EMAIL_MAX_LENGTH 现在支持环境变量配置
 */

// ✅ 保留：账户安全默认值 - 新用户初始状态（固定业务标准）
export const ACCOUNT_DEFAULTS = {
  ROLE: 'developer' as const,  // 默认角色
  STATUS: 'active',           // 默认状态  
  EMAIL_VERIFIED: false,      // 邮箱验证状态
  ACCOUNT_LOCKED: false,      // 账户锁定状态
  TWO_FACTOR_ENABLED: false,  // 双因子认证状态
  PASSWORD_RESET_REQUIRED: false  // 密码重置要求状态
} as const;

// ⚠️  已迁移：会话管理配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.SESSION_CONFIG 获取
// 📋 迁移到：authConfig.limits (令牌有效期、会话超时、记住我时长等)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.SESSION_CONFIG 替代
 * 会话管理配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 ACCESS_TOKEN_HOURS, REFRESH_TOKEN_DAYS, SESSION_TIMEOUT_MINUTES,
 * REMEMBER_ME_DAYS 现在都支持环境变量配置
 */