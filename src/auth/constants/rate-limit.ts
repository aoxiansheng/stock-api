/**
 * Auth 模块频率限制常量
 * 🎯 从 common/constants/domain/rate-limit-domain.constants.ts 剥离的频率限制相关常量
 * 专用于 Auth 模块的频率限制配置
 */

/**
 * 频率限制策略枚举
 * 🎯 统一频率限制算法类型
 */



export enum RateLimitStrategy {
  FIXED_WINDOW = "fixed_window",         // 固定窗口
  SLIDING_WINDOW = "sliding_window",     // 滑动窗口
  TOKEN_BUCKET = "token_bucket",         // 令牌桶
  LEAKY_BUCKET = "leaky_bucket",         // 漏桶
}

/**
 * 限流级别枚举
 * 🎯 根据用户类型或API重要性分级
 */
export enum RateLimitTier {
  FREE = "free",             // 免费用户
  BASIC = "basic",           // 基础用户
  PREMIUM = "premium",       // 高级用户
  ENTERPRISE = "enterprise", // 企业用户
  INTERNAL = "internal",     // 内部系统
}

/**
 * 限流作用域枚举
 * 🎯 限流应用的范围
 */
export enum RateLimitScope {
  GLOBAL = "global",         // 全局限制
  PER_USER = "per_user",     // 按用户限制
  PER_IP = "per_ip",         // 按IP限制
  PER_API_KEY = "per_api_key", // 按API Key限制
  PER_ENDPOINT = "per_endpoint", // 按端点限制
}




/**
 * 全局频率限制配置
 * 🎯 应用级别的频率限制设置
 */
export const RATE_LIMIT_CONFIG = Object.freeze({
  // 全局节流配置
 GLOBAL_THROTTLE: {
   TTL: 60000,           // 时间窗口：60秒
   LIMIT: 100,           // 请求限制：100次/分钟
 },

 // Redis连接配置
 REDIS: {
   MAX_RETRIES: 3,                  // 最大重试次数
   CONNECTION_TIMEOUT: 10000,       // 连接超时：10秒
   COMMAND_TIMEOUT: 5000,           // 命令超时：5秒
   EXPIRE_BUFFER_SECONDS: 10,       // 过期缓冲时间：10秒
 },

 // 性能测试配置
 PERFORMANCE: {
   TEST_MODE: false,                // 是否启用测试模式
   MULTIPLIER: 1,                   // 速率乘数
 },
});


/**
 * 频率限制错误消息模板
 * 🎯 支持变量替换的错误消息模板
 */
export const RATE_LIMIT_ERROR_TEMPLATES = Object.freeze({
  UNSUPPORTED_STRATEGY: "不支持的频率限制策略: {strategy}",
  INVALID_WINDOW_FORMAT: "无效的时间窗口格式: {window}，期望格式如: 1s, 5m, 1h, 1d",
  UNSUPPORTED_TIME_UNIT: "不支持的时间单位: {unit}，支持的单位: s(秒), m(分), h(时), d(天)",
  RATE_LIMIT_EXCEEDED: "API Key {appKey} 超过频率限制: {current}/{limit} 请求",
  REDIS_KEY_CONFLICT: "Redis键冲突: {key}",
  INVALID_LIMIT_VALUE: "无效的限制值: {limit}，必须是正整数",
  WINDOW_TOO_LARGE: "时间窗口过大: {window}，最大支持 {maxWindow}",
  WINDOW_TOO_SMALL: "时间窗口过小: {window}，最小支持 {minWindow}",
});


/**
 * 安全中间件相关限制常量
 * 🎯 请求安全和负载保护
 */
export const SECURITY_LIMITS = Object.freeze({
  MAX_PAYLOAD_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_PAYLOAD_SIZE_STRING: "10MB",
  MAX_STRING_LENGTH_SANITIZE: 10000,
  MAX_OBJECT_DEPTH_COMPLEXITY: 50,
  MAX_OBJECT_FIELDS_COMPLEXITY: 10000,
  MAX_STRING_LENGTH_COMPLEXITY: 100000,
  MAX_QUERY_PARAMS: 100,
  MAX_RECURSION_DEPTH: 100,
  FIND_LONG_STRING_THRESHOLD: 1000,
});


/**
 * 频率限制操作常量
 * 🎯 统一操作名称标识符
 */
export const RATE_LIMIT_OPERATIONS = Object.freeze({
  CHECK_RATE_LIMIT: "checkRateLimit",
  CHECK_FIXED_WINDOW: "checkFixedWindow",
  CHECK_SLIDING_WINDOW: "checkSlidingWindow",
  RESET_RATE_LIMIT: "resetRateLimit",
});


/**
 * 时间单位常量
 * 🎯 统一时间单位标识符
 */
export const RATE_LIMIT_TIME_UNITS = Object.freeze({
  SECOND: "s",
  MINUTE: "m",
  HOUR: "h",
  DAY: "d",
  WEEK: "w",
  MONTH: "M",
});

/**
 * 时间倍数常量
 * 🎯 时间单位到秒的转换倍数
 */
export const RATE_LIMIT_TIME_MULTIPLIERS = Object.freeze({
  [RATE_LIMIT_TIME_UNITS.SECOND]: 1,
  [RATE_LIMIT_TIME_UNITS.MINUTE]: 60,
  [RATE_LIMIT_TIME_UNITS.HOUR]: 60 * 60,
  [RATE_LIMIT_TIME_UNITS.DAY]: 24 * 60 * 60,
  [RATE_LIMIT_TIME_UNITS.WEEK]: 7 * 24 * 60 * 60,
  [RATE_LIMIT_TIME_UNITS.MONTH]: 30 * 24 * 60 * 60, // 近似值
});

/**
 * 频率限制验证规则
 * 🎯 输入验证和格式检查
 */
export const RATE_LIMIT_VALIDATION_RULES = Object.freeze({
  WINDOW_PATTERN: /^(\d+)([smhdwM])$/,
  APP_KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MIN_APP_KEY_LENGTH: 3,
  MAX_APP_KEY_LENGTH: 64,
});

/**
 * 频率限制模板工具函数
 * 🎯 Domain层专用工具函数，整合了原有的RateLimitTemplateUtil功能
 */
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
   * 生成错误消息
   */
  static generateErrorMessage(
    templateKey: keyof typeof RATE_LIMIT_ERROR_TEMPLATES,
    params: Record<string, any>,
  ): string {
    const template = RATE_LIMIT_ERROR_TEMPLATES[templateKey];
    return this.replaceErrorTemplate(template, params);
  }

  /**
   * 验证时间窗口格式
   */
  static isValidWindowFormat(window: string): boolean {
    return RATE_LIMIT_VALIDATION_RULES.WINDOW_PATTERN.test(window);
  }

  /**
   * 验证应用键格式
   */
  static isValidAppKey(appKey: string): boolean {
    return (
      RATE_LIMIT_VALIDATION_RULES.APP_KEY_PATTERN.test(appKey) &&
      appKey.length >= RATE_LIMIT_VALIDATION_RULES.MIN_APP_KEY_LENGTH &&
      appKey.length <= RATE_LIMIT_VALIDATION_RULES.MAX_APP_KEY_LENGTH
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
   * 格式化使用统计
   */
  static formatStatistic(value: number, precision: number = 2): number {
    return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  }
}



/**
 * 频率限制消息模板
 * 🎯 统一频率限制相关的提示消息
 */
export const RATE_LIMIT_MESSAGES = Object.freeze({
  // 限制触发消息
  LIMIT_EXCEEDED: {
    PER_MINUTE: "每分钟请求次数超出限制，请等待 {remaining} 秒后再试",
    PER_HOUR: "每小时请求次数超出限制，请等待 {remaining} 分钟后再试",
    PER_DAY: "每日请求次数超出限制，请明天再试",
    CONCURRENT: "并发请求数超出限制，请等待当前请求完成",
  },

  // 锁定相关消息
  LOCKOUT: {
    IP_LOCKED: "您的IP地址已被锁定 {duration} 分钟，请稍后再试",
    USER_LOCKED: "您的账户已被锁定 {duration} 分钟，请稍后再试",
    API_KEY_LOCKED: "您的API Key已被锁定 {duration} 分钟，请稍后再试",
  },

  // 警告消息
  WARNINGS: {
    APPROACHING_LIMIT: "您即将达到频率限制，剩余 {remaining} 次请求",
    BURST_USED: "已使用突发配额，请控制请求频率",
    TIER_LIMIT_INFO: "当前 {tier} 用户每分钟限制 {limit} 次请求",
  },

  // 成功消息
  SUCCESS: {
    LIMIT_RESET: "频率限制已重置",
    WHITELIST_ADDED: "已添加到白名单",
    CONFIG_UPDATED: "频率限制配置已更新",
  },

  // 服务消息
  RATE_LIMIT_CHECK_STARTED: "开始频率限制检查",
  RATE_LIMIT_CHECK_FAILED: "频率限制检查失败",
  FIXED_WINDOW_CHECK: "固定窗口检查",
  FIXED_WINDOW_EXCEEDED: "固定窗口超出限制",
  SLIDING_WINDOW_CHECK: "滑动窗口检查",
  SLIDING_WINDOW_EXCEEDED: "滑动窗口超出限制",
  UNSUPPORTED_STRATEGY_RESET: "不支持的策略重置",
  RATE_LIMIT_RESET: "频率限制已重置",
});

/**
 * 频率限制配置常量
 * 🎯 Auth 模块专用的频率限制设置
 */
export const AUTH_RATE_LIMIT_CONFIG = Object.freeze({
  // 认证相关端点限制
  AUTHENTICATION: {
    LOGIN: {
      REQUESTS_PER_MINUTE: 5,              // 登录每分钟最多5次
      REQUESTS_PER_HOUR: 30,               // 登录每小时最多30次
      LOCKOUT_DURATION_MINUTES: 15,       // 锁定15分钟
    },
    REGISTER: {
      REQUESTS_PER_MINUTE: 2,              // 注册每分钟最多2次
      REQUESTS_PER_HOUR: 10,               // 注册每小时最多10次
    },
    PASSWORD_RESET: {
      REQUESTS_PER_MINUTE: 1,              // 密码重置每分钟最多1次
      REQUESTS_PER_HOUR: 5,                // 密码重置每小时最多5次
    },
  },

  // API Key 相关限制
  API_KEY: {
    CREATION: {
      REQUESTS_PER_MINUTE: 2,              // 创建API Key每分钟最多2次
      REQUESTS_PER_DAY: 10,                // 创建API Key每天最多10次
    },
    VALIDATION: {
      REQUESTS_PER_SECOND: 100,            // API Key验证每秒最多100次
      CACHE_TTL_SECONDS: 300,              // 验证结果缓存5分钟
    },
  },

  // 权限检查限制
  PERMISSION_CHECK: {
    REQUESTS_PER_SECOND: 1000,             // 权限检查每秒最多1000次
    CACHE_TTL_SECONDS: 60,                 // 权限检查结果缓存1分钟
  },

  // 会话管理限制
  SESSION: {
    CREATE_PER_MINUTE: 10,                 // 创建会话每分钟最多10次
    REFRESH_PER_MINUTE: 30,                // 刷新会话每分钟最多30次
    LOGOUT_PER_MINUTE: 20,                 // 注销会话每分钟最多20次
  },
});

/**
 * 频率限制消息模板
 * 🎯 Auth 模块专用的频率限制提示消息
 */
export const AUTH_RATE_LIMIT_MESSAGES = Object.freeze({
  // 登录限制消息
  LOGIN: {
    RATE_EXCEEDED: "登录尝试过于频繁，请 {remainingTime} 后再试",
    ACCOUNT_LOCKED: "账户已被锁定 {duration} 分钟，请稍后再试",
    IP_BLOCKED: "您的IP地址被暂时限制，请 {remainingTime} 后再试",
  },

  // 注册限制消息
  REGISTER: {
    RATE_EXCEEDED: "注册请求过于频繁，请 {remainingTime} 后再试",
    EMAIL_COOLDOWN: "同一邮箱注册需等待 {cooldownTime} 分钟",
  },

  // API Key 限制消息
  API_KEY: {
    CREATION_LIMIT: "API Key 创建过于频繁，请 {remainingTime} 后再试",
    VALIDATION_FAILED: "API Key 验证失败次数过多，请稍后再试",
    QUOTA_EXCEEDED: "API 调用配额已用完，请升级您的账户",
  },

  // 权限检查消息
  PERMISSION: {
    CHECK_LIMIT: "权限检查请求过于频繁",
    ACCESS_DENIED: "访问被拒绝，权限不足",
  },

  // 会话管理消息
  SESSION: {
    CREATE_LIMIT: "会话创建过于频繁，请稍后再试",
    REFRESH_LIMIT: "会话刷新过于频繁，请稍后再试",
    INVALID_SESSION: "会话已失效，请重新登录",
  },

  // 通用消息
  GENERAL: {
    RATE_LIMIT_HEADER: "您已达到请求限制",
    RETRY_AFTER: "请在 {seconds} 秒后重试",
    CONTACT_SUPPORT: "如需帮助，请联系客服",
  },
});

/**
 * Auth 频率限制工具类
 * 🎯 提供 Auth 相关的频率限制工具函数
 */
export class AuthRateLimitUtil {
  /**
   * 根据用户层级获取登录限制配置
   */
  static getLoginLimits(tier: RateLimitTier) {
    const baseConfig = AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.LOGIN;
    
    // 根据用户层级调整限制
    const tierMultiplier = {
      [RateLimitTier.FREE]: 1,
      [RateLimitTier.BASIC]: 1.5,
      [RateLimitTier.PREMIUM]: 2,
      [RateLimitTier.ENTERPRISE]: 3,
      [RateLimitTier.INTERNAL]: 10,
    };
    
    const multiplier = tierMultiplier[tier] || 1;
    
    return {
      requestsPerMinute: Math.floor(baseConfig.REQUESTS_PER_MINUTE * multiplier),
      requestsPerHour: Math.floor(baseConfig.REQUESTS_PER_HOUR * multiplier),
      lockoutDuration: Math.floor(baseConfig.LOCKOUT_DURATION_MINUTES / multiplier),
    };
  }

  /**
   * 根据端点类型获取频率限制配置
   */
  static getEndpointLimits(endpoint: 'login' | 'register' | 'password_reset' | 'api_key_create') {
    const configMap = {
      login: AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.LOGIN,
      register: AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.REGISTER,
      password_reset: AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.PASSWORD_RESET,
      api_key_create: AUTH_RATE_LIMIT_CONFIG.API_KEY.CREATION,
    };
    
    return configMap[endpoint] || AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.LOGIN;
  }

  /**
   * 格式化频率限制消息
   */
  static formatMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 计算剩余等待时间的人性化显示
   */
  static formatWaitTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} 秒`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} 分钟`;
    } else {
      const hours = Math.ceil(seconds / 3600);
      return `${hours} 小时`;
    }
  }

  /**
   * 检查是否应该触发账户锁定
   */
  static shouldLockAccount(failedAttempts: number, timeWindow: number): boolean {
    const maxAttempts = AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.LOGIN.REQUESTS_PER_MINUTE;
    return failedAttempts >= maxAttempts;
  }

  /**
   * 计算锁定时间
   */
  static calculateLockoutDuration(failedAttempts: number): number {
    const baseDuration = AUTH_RATE_LIMIT_CONFIG.AUTHENTICATION.LOGIN.LOCKOUT_DURATION_MINUTES;
    // 随着失败次数增加，锁定时间递增
    const multiplier = Math.min(failedAttempts / 5, 3); // 最多3倍
    return Math.floor(baseDuration * (1 + multiplier));
  }

  /**
   * 验证频率限制策略配置
   */
  static validateStrategyConfig(config: {
    strategy: RateLimitStrategy;
    windowSize: number;
    maxRequests: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Object.values(RateLimitStrategy).includes(config.strategy)) {
      errors.push(`无效的频率限制策略: ${config.strategy}`);
    }

    if (config.windowSize <= 0) {
      errors.push('时间窗口必须大于0');
    }

    if (config.maxRequests <= 0) {
      errors.push('最大请求数必须大于0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 类型定义
 */
export type AuthRateLimitConfig = typeof AUTH_RATE_LIMIT_CONFIG;
export type AuthRateLimitMessages = typeof AUTH_RATE_LIMIT_MESSAGES;