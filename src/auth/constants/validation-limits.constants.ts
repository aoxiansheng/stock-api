/**
 * 统一验证限制常量 - 集中管理所有长度和格式验证规则
 * 🎯 遵循四项原则：直观优先、业务语义、就近原则、零抽象
 */

// 通用长度限制 - 基础数值定义
export const COMMON_LENGTH_LIMITS = {
  // 标识符长度限制
  MIN_ID_LENGTH: 1,              // 最小ID长度
  MAX_ID_LENGTH: 100,            // 最大ID长度
  
  // 名称长度限制  
  MIN_NAME_LENGTH: 1,            // 最小名称长度
  MAX_NAME_LENGTH: 100,          // 最大名称长度
  
  // 字符串长度限制
  MAX_STRING_LENGTH: 10000,      // 通用字符串最大长度
  MAX_DESCRIPTION_LENGTH: 500,   // 描述最大长度
} as const;

// 用户相关长度限制 - 用户信息验证
export const USER_LENGTH_LIMITS = {
  // 用户名长度
  USERNAME_MIN_LENGTH: 3,        // 用户名最小长度
  USERNAME_MAX_LENGTH: 20,       // 用户名最大长度
  
  // 密码长度  
  PASSWORD_MIN_LENGTH: 8,        // 密码最小长度
  PASSWORD_MAX_LENGTH: 128,      // 密码最大长度
  
  // 邮箱长度
  EMAIL_MAX_LENGTH: 254,         // 邮箱最大长度（RFC标准）
} as const;

// API Key 长度限制 - API密钥格式限制
export const API_KEY_LENGTH_LIMITS = {
  // API Key 格式
  API_KEY_MIN_LENGTH: 32,        // API Key最小长度
  API_KEY_MAX_LENGTH: 64,        // API Key最大长度
  API_KEY_DEFAULT_LENGTH: 32,    // API Key默认长度
  
  // API Key 名称
  API_KEY_NAME_MIN_LENGTH: 1,    // API Key名称最小长度
  API_KEY_NAME_MAX_LENGTH: 100,  // API Key名称最大长度
  
  // 应用键长度
  APP_KEY_MIN_LENGTH: 3,         // 应用键最小长度
  APP_KEY_MAX_LENGTH: 64,        // 应用键最大长度
} as const;

// 权限控制长度限制 - 权限和角色长度
export const PERMISSION_LENGTH_LIMITS = {
  // 主体ID长度
  SUBJECT_ID_MIN_LENGTH: 1,      // 主体ID最小长度
  SUBJECT_ID_MAX_LENGTH: 100,    // 主体ID最大长度
  
  // 权限名长度
  PERMISSION_NAME_MIN_LENGTH: 1, // 权限名最小长度
  PERMISSION_NAME_MAX_LENGTH: 50,// 权限名最大长度
  
  // 角色名长度
  ROLE_NAME_MIN_LENGTH: 1,       // 角色名最小长度
  ROLE_NAME_MAX_LENGTH: 30,      // 角色名最大长度
  
  // 缓存键长度
  CACHE_KEY_MAX_LENGTH: 250,     // 缓存键最大长度
} as const;

// 系统性能限制 - 性能和安全限制
export const SYSTEM_PERFORMANCE_LIMITS = {
  // 负载大小限制
  MAX_PAYLOAD_SIZE_BYTES: 10485760,  // 最大负载大小：10MB
  MAX_PAYLOAD_SIZE_STRING: "10MB",   // 最大负载大小字符串
  
  // 复杂度限制
  MAX_OBJECT_DEPTH: 50,              // 最大对象深度
  MAX_OBJECT_FIELDS: 10000,          // 最大对象字段数
  MAX_STRING_LENGTH_COMPLEXITY: 100000, // 复杂度检查字符串最大长度
  
  // 查询限制
  MAX_QUERY_PARAMS: 100,             // 最大查询参数数量
  MAX_RECURSION_DEPTH: 100,          // 最大递归深度
  
  // 其他限制
  MAX_STRING_LENGTH_SANITIZE: 10000, // 清理字符串最大长度
  FIND_LONG_STRING_THRESHOLD: 1000,  // 长字符串阈值
} as const;

// 兼容性导出 - 向后兼容现有代码
export const VALIDATION_LIMITS = {
  // 从用户限制导出
  ...USER_LENGTH_LIMITS,
  
  // 从通用限制导出
  ...COMMON_LENGTH_LIMITS,
  
  // 从API Key限制导出
  ...API_KEY_LENGTH_LIMITS,
  
  // 从权限限制导出  
  ...PERMISSION_LENGTH_LIMITS,
  
  // 从系统限制导出
  ...SYSTEM_PERFORMANCE_LIMITS,
} as const;