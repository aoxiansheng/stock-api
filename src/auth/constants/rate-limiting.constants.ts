/**
 * 频率限制配置 - 零抽象层，数值直接可见
 * 🎯 遵循四项原则：直观优先、业务语义、就近原则、零抽象
 */

// 认证操作频率限制 - 核心安全控制
export const AUTH_RATE_LIMITS = {
  // 登录限制
  LOGIN_PER_MINUTE: 5,           // 登录每分钟最多5次
  LOGIN_PER_HOUR: 30,            // 登录每小时最多30次  
  LOGIN_LOCKOUT_MINUTES: 15,     // 登录失败锁定15分钟
  
  // 注册限制
  REGISTER_PER_MINUTE: 2,        // 注册每分钟最多2次
  REGISTER_PER_HOUR: 10,         // 注册每小时最多10次
  SAME_EMAIL_COOLDOWN_MINUTES: 30, // 同邮箱注册间隔30分钟
  
  // 密码重置限制  
  PASSWORD_RESET_PER_MINUTE: 1,  // 密码重置每分钟最多1次
  PASSWORD_RESET_PER_HOUR: 5,    // 密码重置每小时最多5次
  RESET_CODE_VALID_MINUTES: 10   // 重置验证码有效期10分钟
} as const;

// 会话管理限制 - 会话生命周期控制
export const SESSION_LIMITS = {
  CREATE_PER_MINUTE: 10,         // 创建会话每分钟最多10次
  REFRESH_PER_MINUTE: 30,        // 刷新会话每分钟最多30次
  LOGOUT_PER_MINUTE: 20,         // 注销会话每分钟最多20次
  CONCURRENT_SESSIONS: 5         // 同用户最大并发会话数
} as const;

// 权限检查限制 - 性能保护设置
export const PERMISSION_RATE_LIMITS = {
  REQUESTS_PER_SECOND: 1000,     // 权限检查每秒最多1000次
  CACHE_TTL_SECONDS: 60          // 权限检查结果缓存1分钟
} as const;

// 全局节流配置 - 应用级别限制
export const GLOBAL_RATE_LIMITS = {
  TTL_SECONDS: 60,               // 时间窗口：60秒
  LIMIT_PER_MINUTE: 100,         // 请求限制：100次/分钟
  MAX_PAYLOAD_SIZE_BYTES: 10485760,  // 最大负载大小：10MB (10 * 1024 * 1024)
  MAX_QUERY_PARAMS: 100,         // 最大查询参数数量
  MAX_RECURSION_DEPTH: 100       // 最大递归深度
} as const;

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

// 频率限制层级 - 用户层级限制倍数
export const RATE_LIMIT_TIERS = {
  FREE: 1,           // 免费用户：基础倍数
  BASIC: 1.5,        // 基础用户：1.5倍
  PREMIUM: 2,        // 高级用户：2倍
  ENTERPRISE: 3,     // 企业用户：3倍
  INTERNAL: 10       // 内部系统：10倍
} as const;

// 频率限制作用域 - 限制应用范围
export const RATE_LIMIT_SCOPES = {
  GLOBAL: 'global',           // 全局限制
  PER_USER: 'per_user',       // 按用户限制
  PER_IP: 'per_ip',           // 按IP限制
  PER_API_KEY: 'per_api_key', // 按API Key限制
  PER_ENDPOINT: 'per_endpoint' // 按端点限制
} as const;

// Redis存储配置 - 频率限制存储设置  
export const RATE_LIMIT_STORAGE = {
  REDIS_TTL_SECONDS: 60,         // Redis键过期时间60秒
  REDIS_MAX_RETRIES: 3,          // Redis最大重试次数
  CONNECTION_TIMEOUT_MS: 10000,  // 连接超时10秒
  COMMAND_TIMEOUT_MS: 5000,      // 命令超时5秒
  EXPIRE_BUFFER_SECONDS: 10      // 过期缓冲时间10秒
} as const;

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

// 频率限制验证规则 - 输入验证模式
export const RATE_LIMIT_VALIDATION = {
  WINDOW_PATTERN: /^(\d+)([smhdwM])$/,     // 时间窗口格式验证
  APP_KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,     // 应用键格式验证
  MIN_APP_KEY_LENGTH: 3,                   // 应用键最小长度
  MAX_APP_KEY_LENGTH: 64                   // 应用键最大长度  
} as const;

// 性能配置 - 系统性能参数
export const RATE_LIMIT_PERFORMANCE = {
  TEST_MODE: false,              // 是否启用测试模式
  MULTIPLIER: 1,                 // 速率乘数
  SLOW_REQUEST_THRESHOLD_MS: 100, // 慢请求阈值（毫秒）
  MAX_STRING_LENGTH: 10000,      // 最大字符串长度
  MAX_OBJECT_DEPTH: 50,          // 最大对象深度
  MAX_OBJECT_FIELDS: 10000       // 最大对象字段数
} as const;

// 兼容性常量导出 - 安全中间件限制
export const SECURITY_LIMITS = {
  MAX_PAYLOAD_SIZE_BYTES: 10485760,  // 10MB (10 * 1024 * 1024)
  MAX_PAYLOAD_SIZE_STRING: "10MB",
  MAX_STRING_LENGTH_SANITIZE: 10000,
  MAX_OBJECT_DEPTH_COMPLEXITY: 50,
  MAX_OBJECT_FIELDS_COMPLEXITY: 10000,
  MAX_STRING_LENGTH_COMPLEXITY: 100000,
  MAX_QUERY_PARAMS: 100,
  MAX_RECURSION_DEPTH: 100,
  FIND_LONG_STRING_THRESHOLD: 1000,
} as const;

// 兼容性常量导出 - 全局频率限制配置
export const RATE_LIMIT_CONFIG = {
  GLOBAL_THROTTLE: {
    TTL: 60000,    // 时间窗口：60秒
    LIMIT: 100,    // 请求限制：100次/分钟
  },
  REDIS: {
    MAX_RETRIES: 3,                  // 最大重试次数
    CONNECTION_TIMEOUT: 10000,       // 连接超时：10秒
    COMMAND_TIMEOUT: 5000,           // 命令超时：5秒
    EXPIRE_BUFFER_SECONDS: 10,       // 过期缓冲时间：10秒
  },
  PERFORMANCE: {
    TEST_MODE: false,                // 是否启用测试模式
    MULTIPLIER: 1,                   // 速率乘数
  },
} as const;

// 兼容性常量导出 - 频率限制操作常量
export const RATE_LIMIT_OPERATIONS = {
  CHECK_RATE_LIMIT: "checkRateLimit",
  CHECK_FIXED_WINDOW: "checkFixedWindow", 
  CHECK_SLIDING_WINDOW: "checkSlidingWindow",
  RESET_RATE_LIMIT: "resetRateLimit",
} as const;

// 兼容性常量导出 - 频率限制消息模板
export const RATE_LIMIT_MESSAGES = {
  RATE_LIMIT_CHECK_STARTED: "开始频率限制检查",
  RATE_LIMIT_CHECK_FAILED: "频率限制检查失败", 
  FIXED_WINDOW_CHECK: "固定窗口检查",
  FIXED_WINDOW_EXCEEDED: "固定窗口超出限制",
  SLIDING_WINDOW_CHECK: "滑动窗口检查",
  SLIDING_WINDOW_EXCEEDED: "滑动窗口超出限制",
  UNSUPPORTED_STRATEGY_RESET: "不支持的策略重置",
  RATE_LIMIT_RESET: "频率限制已重置",
} as const;


// 兼容性工具类 - 频率限制模板工具
export class RateLimitTemplateUtil {
  /**
   * 替换错误消息模板中的占位符
   */
  static replaceErrorTemplate(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 验证时间窗口格式
   */
  static isValidWindowFormat(window: string): boolean {
    return RATE_LIMIT_VALIDATION.WINDOW_PATTERN.test(window);
  }

  /**
   * 验证应用键格式
   */
  static isValidAppKey(appKey: string): boolean {
    return (
      RATE_LIMIT_VALIDATION.APP_KEY_PATTERN.test(appKey) &&
      appKey.length >= RATE_LIMIT_VALIDATION.MIN_APP_KEY_LENGTH &&
      appKey.length <= RATE_LIMIT_VALIDATION.MAX_APP_KEY_LENGTH
    );
  }

  /**
   * 计算重试延迟
   */
  static calculateRetryDelay(attempt: number): number {
    const INITIAL_DELAY_MS = 100;
    const BACKOFF_MULTIPLIER = 2;
    const MAX_DELAY_MS = 5000;
    const JITTER_FACTOR = 0.1;

    const baseDelay = Math.min(
      INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt),
      MAX_DELAY_MS,
    );

    // 添加抖动
    const jitter = baseDelay * JITTER_FACTOR * Math.random();
    return Math.floor(baseDelay + jitter);
  }

  /**
   * 生成错误消息（简化版本，支持基本占位符替换）
   */
  static generateErrorMessage(templateKey: string, params: Record<string, any>): string {
    // 简化的错误消息模板
    const templates: Record<string, string> = {
      'UNSUPPORTED_STRATEGY': "不支持的频率限制策略: {strategy}",
      'INVALID_WINDOW_FORMAT': "无效的时间窗口格式: {window}，期望格式如: 1s, 5m, 1h, 1d",
      'RATE_LIMIT_EXCEEDED': "API Key {appKey} 超过频率限制: {current}/{limit} 请求",
      'INVALID_LIMIT_VALUE': "无效的限制值: {limit}，必须是正整数"
    };
    
    const template = templates[templateKey] || templateKey;
    return this.replaceErrorTemplate(template, params);
  }
}