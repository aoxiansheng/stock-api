/**
 * 权限控制固定标准常量 - 业务规则和枚举标准
 * 🎯 重构说明：保留固定标准，数值配置已迁移到统一配置系统
 * 
 * ✅ 保留内容：权限级别、主体类型、状态枚举、验证正则、业务分组等固定标准
 * 🔧 已迁移内容：TTL配置、超时设置、数量限制、时间间隔等可配置参数
 * 
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 */

// ⚠️  已迁移：权限检查配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.PERMISSION_CHECK 获取
// 📋 迁移到：authConfig.cache (缓存TTL) 和 authConfig.limits (超时、数量限制、阈值)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.PERMISSION_CHECK 替代
 * 权限检查配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 CACHE_TTL_SECONDS, CHECK_TIMEOUT_MS, MAX_PERMISSIONS_PER_CHECK,
 * MAX_ROLES_PER_CHECK, SLOW_CHECK_THRESHOLD_MS, MAX_CACHE_KEY_LENGTH
 * 现在都支持环境变量配置
 */

// ✅ 保留：权限级别定义 - 权限等级数值（固定业务标准）
export const PERMISSION_LEVELS = {
  NONE: 0,        // 无权限
  READ: 1,        // 读权限  
  WRITE: 2,       // 写权限
  DELETE: 3,      // 删除权限
  ADMIN: 4,       // 管理权限
  SUPER_ADMIN: 5  // 超级管理权限
} as const;

// ✅ 保留：权限主体类型 - 权限检查主体分类（固定枚举标准）
export const PERMISSION_SUBJECTS = {
  USER: 'user',           // 普通用户
  API_KEY: 'api_key',     // API密钥
  SERVICE: 'service',     // 系统服务
  SYSTEM: 'system',       // 系统级
  GUEST: 'guest',         // 访客用户
  ADMIN: 'admin'          // 管理员
} as const;

// ✅ 保留：权限检查状态 - 检查结果状态（固定枚举标准）
export const PERMISSION_CHECK_STATUS = {
  ALLOWED: 'allowed',     // 权限检查通过
  DENIED: 'denied',       // 权限检查被拒绝
  ERROR: 'error'          // 权限检查过程出错
} as const;

// 权限验证规则 - 固定标准与可配置参数混合
export const PERMISSION_VALIDATION = {
  // ✅ 保留：固定的验证正则表达式 - 业务规则标准
  SUBJECT_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,      // 主体ID格式
  PERMISSION_PATTERN: /^[a-zA-Z0-9_:.-]+$/,    // 权限名格式
  ROLE_PATTERN: /^[a-zA-Z0-9_-]+$/             // 角色名格式
} as const;

// ⚠️  已迁移：验证长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
// 📋 迁移到：authConfig.limits (主体ID长度、权限名长度、角色名长度限制)
/**
 * @deprecated 长度限制已迁移到 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
 * 原 MIN_SUBJECT_ID_LENGTH, MAX_SUBJECT_ID_LENGTH, MIN_PERMISSION_NAME_LENGTH,
 * MAX_PERMISSION_NAME_LENGTH, MIN_ROLE_NAME_LENGTH, MAX_ROLE_NAME_LENGTH
 * 现在都支持环境变量配置
 */

// ✅ 保留：权限组分类 - 权限业务分组（固定业务标准）
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

// ✅ 保留：权限检查选项 - 检查模式配置（固定枚举标准）
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

// ✅ 保留：权限继承规则 - 权限继承方式（固定枚举标准）
export const PERMISSION_INHERITANCE = {
  ROLE_BASED: 'role_based',           // 基于角色继承
  PERMISSION_BASED: 'permission_based', // 基于权限继承
  HYBRID: 'hybrid',                   // 混合继承
  NONE: 'none'                        // 无继承
} as const;

// ⚠️  已迁移：权限时间配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.PERMISSION_TIMING 获取
// 📋 迁移到：authConfig.limits (超时设置、时间间隔、批次大小)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.PERMISSION_TIMING 替代
 * 权限时间配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 CHECK_TIMEOUT_MS, CACHE_REFRESH_INTERVAL_MS, INVALIDATION_BATCH_SIZE,
 * CLEANUP_INTERVAL_MS, METRICS_COLLECTION_INTERVAL_MS 现在都支持环境变量配置
 */

// ✅ 保留：权限配置参数 - 系统配置常量（固定字符常量）
export const PERMISSION_CONFIG = {
  CACHE_KEY_SEPARATOR: ':',           // 缓存键分隔符
  PERMISSION_LIST_SEPARATOR: ',',     // 权限列表分隔符
  ROLE_LIST_SEPARATOR: ','            // 角色列表分隔符
} as const;