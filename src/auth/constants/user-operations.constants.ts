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

// 用户注册规则 - 固定业务标准（保留）
export const USER_REGISTRATION = {
  // ✅ 保留：固定的验证正则表达式 - 业务规则标准
  PASSWORD_PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,  // 密码：字母+数字，8位以上
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,                               // 用户名：字母数字下划线连字符
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,                        // 邮箱格式验证
  
  // ✅ 保留：保留用户名列表 - 禁止注册的用户名（固定业务规则）
  RESERVED_USERNAMES: ['admin', 'root', 'system', 'api', 'user', 'test', 'null', 'undefined'],
  
  // 🔄 长度限制 - 向后兼容性支持（实际值来自统一配置系统）
  USERNAME_MIN_LENGTH: 3,     // 固定业务规则
  USERNAME_MAX_LENGTH: 20,    // 固定业务规则  
  PASSWORD_MIN_LENGTH: 8,     // 固定业务规则
  PASSWORD_MAX_LENGTH: 100,   // 固定业务规则
  EMAIL_MAX_LENGTH: 254,      // RFC标准，固定值
} as const;

// ✅ 保留：账户安全默认值 - 新用户初始状态（固定业务标准）
export const ACCOUNT_DEFAULTS = {
  ROLE: 'developer' as const,  // 默认角色
  STATUS: 'active',           // 默认状态  
  EMAIL_VERIFIED: false,      // 邮箱验证状态
  ACCOUNT_LOCKED: false,      // 账户锁定状态
  TWO_FACTOR_ENABLED: false,  // 双因子认证状态
  PASSWORD_RESET_REQUIRED: false  // 密码重置要求状态
} as const;

