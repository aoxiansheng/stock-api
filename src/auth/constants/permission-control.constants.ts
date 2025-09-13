/**
 * 权限控制配置 - 权限检查和缓存设置
 * 🎯 遵循四项原则：直观优先、业务语义、就近原则、零抽象
 */

// 权限检查配置 - 核心权限控制参数
export const PERMISSION_CHECK = {
  CACHE_TTL_SECONDS: 300,        // 权限检查缓存5分钟
  CHECK_TIMEOUT_MS: 5000,        // 权限检查超时5秒
  MAX_PERMISSIONS_PER_CHECK: 50, // 单次检查最大权限数
  MAX_ROLES_PER_CHECK: 10,       // 单次检查最大角色数
  SLOW_CHECK_THRESHOLD_MS: 100,  // 慢查询阈值100毫秒
  MAX_CACHE_KEY_LENGTH: 250      // 缓存键最大长度
} as const;

// 权限级别定义 - 权限等级数值
export const PERMISSION_LEVELS = {
  NONE: 0,        // 无权限
  READ: 1,        // 读权限  
  WRITE: 2,       // 写权限
  DELETE: 3,      // 删除权限
  ADMIN: 4,       // 管理权限
  SUPER_ADMIN: 5  // 超级管理权限
} as const;

// 权限主体类型 - 权限检查主体分类
export const PERMISSION_SUBJECTS = {
  USER: 'user',           // 普通用户
  API_KEY: 'api_key',     // API密钥
  SERVICE: 'service',     // 系统服务
  SYSTEM: 'system',       // 系统级
  GUEST: 'guest',         // 访客用户
  ADMIN: 'admin'          // 管理员
} as const;

// 权限检查状态 - 检查结果状态
export const PERMISSION_CHECK_STATUS = {
  ALLOWED: 'allowed',     // 权限检查通过
  DENIED: 'denied',       // 权限检查被拒绝
  ERROR: 'error'          // 权限检查过程出错
} as const;

// 权限验证规则 - 输入验证参数
export const PERMISSION_VALIDATION = {
  MIN_SUBJECT_ID_LENGTH: 1,           // 主体ID最小长度  
  MAX_SUBJECT_ID_LENGTH: 100,         // 主体ID最大长度
  MIN_PERMISSION_NAME_LENGTH: 1,      // 权限名最小长度
  MAX_PERMISSION_NAME_LENGTH: 50,     // 权限名最大长度
  MIN_ROLE_NAME_LENGTH: 1,            // 角色名最小长度
  MAX_ROLE_NAME_LENGTH: 30,           // 角色名最大长度
  
  // 验证正则表达式
  SUBJECT_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,      // 主体ID格式
  PERMISSION_PATTERN: /^[a-zA-Z0-9_:.-]+$/,    // 权限名格式
  ROLE_PATTERN: /^[a-zA-Z0-9_-]+$/             // 角色名格式
} as const;

// 权限组分类 - 权限业务分组
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

// 权限检查选项 - 检查模式配置
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

// 权限继承规则 - 权限继承方式
export const PERMISSION_INHERITANCE = {
  ROLE_BASED: 'role_based',           // 基于角色继承
  PERMISSION_BASED: 'permission_based', // 基于权限继承
  HYBRID: 'hybrid',                   // 混合继承
  NONE: 'none'                        // 无继承
} as const;

// 权限时间配置 - 权限相关时间设置
export const PERMISSION_TIMING = {
  CHECK_TIMEOUT_MS: 5000,              // 检查超时5秒
  CACHE_REFRESH_INTERVAL_MS: 60000,    // 缓存刷新间隔1分钟
  INVALIDATION_BATCH_SIZE: 100,        // 失效批次大小
  CLEANUP_INTERVAL_MS: 3600000,        // 清理间隔1小时
  METRICS_COLLECTION_INTERVAL_MS: 300000  // 指标收集间隔5分钟
} as const;

// 权限配置参数 - 系统配置常量
export const PERMISSION_CONFIG = {
  CACHE_KEY_SEPARATOR: ':',           // 缓存键分隔符
  PERMISSION_LIST_SEPARATOR: ',',     // 权限列表分隔符
  ROLE_LIST_SEPARATOR: ','            // 角色列表分隔符
} as const;