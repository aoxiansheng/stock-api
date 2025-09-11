/**
 * 用户操作数值配置 - 直观可见，便于修改
 * 🎯 遵循四项原则：直观优先、业务语义、就近原则、零抽象
 */

// 用户登录限制 - 核心安全数值
export const USER_LOGIN = {
  MAX_ATTEMPTS: 5,           // 最大尝试次数
  LOCKOUT_MINUTES: 15,       // 锁定时长（分钟）
  SESSION_HOURS: 24,         // 会话有效期（小时）
  TOKEN_REFRESH_HOURS: 168   // 刷新令牌有效期（小时，7天）
} as const;

// 用户注册规则 - 直接可见的验证规则
export const USER_REGISTRATION = {
  PASSWORD_MIN_LENGTH: 8,              // 密码最小长度
  PASSWORD_MAX_LENGTH: 128,            // 密码最大长度
  USERNAME_MIN_LENGTH: 3,              // 用户名最短长度
  USERNAME_MAX_LENGTH: 20,             // 用户名最长长度
  EMAIL_MAX_LENGTH: 254,               // 邮箱最大长度
  
  // 验证正则 - 直接可见，无需追溯
  PASSWORD_PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,  // 密码：字母+数字，8位以上
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,                               // 用户名：字母数字下划线连字符
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,                        // 邮箱格式验证
  
  // 保留用户名列表 - 禁止注册的用户名
  RESERVED_USERNAMES: ['admin', 'root', 'system', 'api', 'user', 'test', 'null', 'undefined']
} as const;

// 账户安全默认值 - 新用户初始状态
export const ACCOUNT_DEFAULTS = {
  ROLE: 'developer' as const,  // 默认角色
  STATUS: 'active',           // 默认状态  
  EMAIL_VERIFIED: false,      // 邮箱验证状态
  ACCOUNT_LOCKED: false,      // 账户锁定状态
  TWO_FACTOR_ENABLED: false,  // 双因子认证状态
  PASSWORD_RESET_REQUIRED: false  // 密码重置要求状态
} as const;

// 密码安全要求 - 密码复杂度配置
export const PASSWORD_REQUIREMENTS = {
  REQUIRE_NUMBERS: true,       // 是否要求数字
  REQUIRE_UPPERCASE: true,     // 是否要求大写字母
  REQUIRE_LOWERCASE: true,     // 是否要求小写字母
  REQUIRE_SPECIAL_CHARS: false // 是否要求特殊字符
} as const;

// 会话管理配置 - 会话生命周期控制
export const SESSION_CONFIG = {
  ACCESS_TOKEN_HOURS: 24,      // 访问令牌有效期（小时）
  REFRESH_TOKEN_DAYS: 7,       // 刷新令牌有效期（天）
  SESSION_TIMEOUT_MINUTES: 60, // 会话超时时间（分钟）
  REMEMBER_ME_DAYS: 30         // 记住我功能天数
} as const;

// 用户状态枚举值
export const USER_STATUS_VALUES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive', 
  SUSPENDED: 'suspended',
  PENDING: 'pending'
} as const;

// 用户角色枚举值
export const USER_ROLE_VALUES = {
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  USER: 'user',
  GUEST: 'guest'
} as const;