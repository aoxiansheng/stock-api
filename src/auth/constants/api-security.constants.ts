/**
 * API安全数值配置 - 相关数值就近放置，便于对比
 * 🎯 遵循四项原则：直观优先、业务语义、就近原则、零抽象
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

// API Key 操作限制 - 创建和管理限制
export const API_KEY_OPERATIONS = {
  CREATE_PER_MINUTE: 2,        // 创建频率：每分钟最多2次
  CREATE_PER_DAY: 10,          // 创建频率：每天最多10次  
  VALIDATE_PER_SECOND: 100,    // 验证频率：每秒最多100次
  CACHE_TTL_SECONDS: 300,      // 验证结果缓存时间（秒）
  MAX_KEYS_PER_USER: 50,       // 每用户最大密钥数量
  CLEANUP_BATCH_SIZE: 50,      // 清理批次大小
  STATISTICS_CACHE_TTL: 300    // 统计信息缓存时间（秒）
} as const;

// API Key 默认配置 - 新建密钥默认值
export const API_KEY_DEFAULTS = {
  NAME_PREFIX: 'API Key',      // 默认名称前缀
  ACTIVE_STATUS: true,         // 默认激活状态
  DEFAULT_PERMISSIONS: [],     // 默认权限列表
  DEFAULT_EXPIRY_DAYS: 365,    // 默认过期天数
  DEFAULT_RATE_LIMIT_REQUESTS: 200,  // 默认频率限制请求数
  DEFAULT_RATE_LIMIT_WINDOW: '1m'    // 默认频率限制时间窗口
} as const;

// API Key 验证规则 - 名称和格式验证
export const API_KEY_VALIDATION = {
  MIN_NAME_LENGTH: 1,               // 名称最小长度
  MAX_NAME_LENGTH: 100,             // 名称最大长度
  MIN_PERMISSIONS: 0,               // 最小权限数
  MAX_PERMISSIONS: 50,              // 最大权限数
  MIN_RATE_LIMIT_REQUESTS: 1,       // 最小频率限制请求数
  MAX_RATE_LIMIT_REQUESTS: 1000000, // 最大频率限制请求数
  
  // 验证正则表达式
  NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,           // 名称格式
  RATE_LIMIT_WINDOW_PATTERN: /^(\d+)([smhd])$/     // 频率限制窗口格式
} as const;

// 不同用户层级的API配额 - 便于对比和调整
export const API_QUOTAS_BY_TIER = {
  FREE: {
    REQUESTS_PER_MINUTE: 100,     // 免费用户：每分钟100次
    REQUESTS_PER_DAY: 1000,       // 免费用户：每天1000次
    MAX_API_KEYS: 3               // 免费用户：最多3个密钥
  },
  BASIC: {
    REQUESTS_PER_MINUTE: 300,     // 基础用户：每分钟300次  
    REQUESTS_PER_DAY: 5000,       // 基础用户：每天5000次
    MAX_API_KEYS: 10              // 基础用户：最多10个密钥
  },
  PREMIUM: {
    REQUESTS_PER_MINUTE: 1000,    // 高级用户：每分钟1000次
    REQUESTS_PER_DAY: 50000,      // 高级用户：每天50000次
    MAX_API_KEYS: 25              // 高级用户：最多25个密钥
  },
  ENTERPRISE: {
    REQUESTS_PER_MINUTE: 5000,    // 企业用户：每分钟5000次
    REQUESTS_PER_DAY: 200000,     // 企业用户：每天200000次
    MAX_API_KEYS: 100             // 企业用户：最多100个密钥
  },
  INTERNAL: {
    REQUESTS_PER_MINUTE: 10000,   // 内部系统：每分钟10000次
    REQUESTS_PER_DAY: 1000000,    // 内部系统：每天1000000次
    MAX_API_KEYS: -1              // 内部系统：无限制
  }
} as const;

// API Key 时间配置 - 过期和清理时间
export const API_KEY_TIMING = {
  EXPIRY_WARNING_DAYS: 7,           // 过期提醒天数
  CLEANUP_INTERVAL_HOURS: 24,       // 清理间隔小时数
  USAGE_UPDATE_TIMEOUT_MS: 5000,    // 使用情况更新超时（毫秒）
  VALIDATION_TIMEOUT_MS: 3000,      // 验证超时（毫秒）
  STATISTICS_UPDATE_INTERVAL_MS: 300000,  // 统计更新间隔（毫秒，5分钟）
  CACHE_REFRESH_INTERVAL_MS: 600000       // 缓存刷新间隔（毫秒，10分钟）
} as const;

// JWT Token 配置 - JWT令牌相关设置
export const JWT_TOKEN_CONFIG = {
  EXPIRY_HOURS: 24,                // Token过期时间（小时）
  REFRESH_EXPIRY_DAYS: 7,          // 刷新Token过期时间（天）
  PATTERN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/  // JWT格式验证
} as const;