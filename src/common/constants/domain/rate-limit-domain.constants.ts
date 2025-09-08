/**
 * 频率限制领域常量
 * 🏢 Domain层 - 频率限制相关的业务领域专用常量
 * 🚦 基于Semantic层构建，专注于API频率控制业务逻辑
 */

import {
  HTTP_TIMEOUTS,
  CACHE_TTL_SEMANTICS,
  BATCH_SIZE_SEMANTICS,
  RETRY_CONFIG_TEMPLATES
} from '../semantic';

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
 * 频率限制策略描述
 * 🎯 算法策略的详细说明
 */
export const RATE_LIMIT_STRATEGY_DESCRIPTIONS = Object.freeze({
  [RateLimitStrategy.FIXED_WINDOW]: "固定窗口算法 - 简单高效，可能存在突发流量",
  [RateLimitStrategy.SLIDING_WINDOW]: "滑动窗口算法 - 流量控制更平滑，资源消耗较高",
  [RateLimitStrategy.TOKEN_BUCKET]: "令牌桶算法 - 允许突发流量，长期平均限制",
  [RateLimitStrategy.LEAKY_BUCKET]: "漏桶算法 - 严格速率控制，输出流量平稳",
} as const);

/**
 * 频率限制策略适用场景
 * 🎯 不同算法的最佳使用场景
 */
export const RATE_LIMIT_STRATEGY_USE_CASES = Object.freeze({
  [RateLimitStrategy.FIXED_WINDOW]: "适用于简单场景，性能要求高，允许短时突发",
  [RateLimitStrategy.SLIDING_WINDOW]: "适用于严格控制场景，需要平滑流量分布",
  [RateLimitStrategy.TOKEN_BUCKET]: "适用于需要处理突发流量的API服务",
  [RateLimitStrategy.LEAKY_BUCKET]: "适用于下游服务处理能力有限的场景",
} as const);

/**
 * 分层频率限制配置
 * 🎯 基于用户等级的差异化限制策略
 */
export const TIERED_RATE_LIMITS = Object.freeze({
  // 免费用户限制
  [RateLimitTier.FREE]: {
    REQUESTS_PER_MINUTE: 100,                                        // 每分钟100次
    REQUESTS_PER_HOUR: 1000,                                         // 每小时1000次
    REQUESTS_PER_DAY: 5000,                                          // 每天5000次
    CONCURRENT_REQUESTS: 5,                                          // 并发5个请求
    BURST_ALLOWANCE: 20,                                             // 突发允许20次
  },

  // 基础用户限制
  [RateLimitTier.BASIC]: {
    REQUESTS_PER_MINUTE: 200,                                        // 每分钟200次
    REQUESTS_PER_HOUR: 5000,                                         // 每小时5000次
    REQUESTS_PER_DAY: 50000,                                         // 每天50000次
    CONCURRENT_REQUESTS: 10,                                         // 并发10个请求
    BURST_ALLOWANCE: 50,                                             // 突发允许50次
  },

  // 高级用户限制
  [RateLimitTier.PREMIUM]: {
    REQUESTS_PER_MINUTE: 500,                                        // 每分钟500次
    REQUESTS_PER_HOUR: 20000,                                        // 每小时20000次
    REQUESTS_PER_DAY: 200000,                                        // 每天200000次
    CONCURRENT_REQUESTS: 25,                                         // 并发25个请求
    BURST_ALLOWANCE: 100,                                            // 突发允许100次
  },

  // 企业用户限制
  [RateLimitTier.ENTERPRISE]: {
    REQUESTS_PER_MINUTE: 2000,                                       // 每分钟2000次
    REQUESTS_PER_HOUR: 100000,                                       // 每小时100000次
    REQUESTS_PER_DAY: 1000000,                                       // 每天1000000次
    CONCURRENT_REQUESTS: 100,                                        // 并发100个请求
    BURST_ALLOWANCE: 500,                                            // 突发允许500次
  },

  // 内部系统（无限制或极高限制）
  [RateLimitTier.INTERNAL]: {
    REQUESTS_PER_MINUTE: 10000,                                      // 每分钟10000次
    REQUESTS_PER_HOUR: 500000,                                       // 每小时500000次
    REQUESTS_PER_DAY: 10000000,                                      // 每天10000000次
    CONCURRENT_REQUESTS: 500,                                        // 并发500个请求
    BURST_ALLOWANCE: 1000,                                           // 突发允许1000次
  },
});

/**
 * 端点特定频率限制配置
 * 🎯 基于API端点重要性和资源消耗的差异化限制
 */
export const ENDPOINT_RATE_LIMITS = Object.freeze({
  // 认证相关端点
  AUTHENTICATION: {
    LOGIN: {
    },
    REGISTER: {
    },
    PASSWORD_RESET: {
    },
  },

  // 数据查询端点
  DATA_QUERY: {
    STOCK_QUOTE: {
    },
    MARKET_DATA: {
    },
    HISTORICAL_DATA: {
    },
  },

  // 写操作端点
  WRITE_OPERATIONS: {
    CREATE_ALERT: {
    },
    UPDATE_PROFILE: {
    },
    FILE_UPLOAD: {
    },
  },
});

/**
 * 频率限制缓存配置
 * 🎯 基于Semantic层缓存策略，针对频率限制数据特化
 */
export const RATE_LIMIT_CACHE_CONFIG = Object.freeze({
  // 计数器缓存
  COUNTERS: {
    WINDOW_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC * 2,    // 2分钟 - 计数器窗口
  },

  // 锁定状态缓存
  LOCKOUTS: {
    USER_LOCKOUT_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC * 3,       // 30分钟 - 用户锁定
  },

  // 白名单缓存
  WHITELIST: {
    CONFIG_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.SLOW_UPDATE_SEC,            // 1小时 - 配置缓存
  },
});

/**
 * 频率限制超时配置
 * 🎯 基于Semantic层HTTP超时，针对频率限制检查特化
 */
export const RATE_LIMIT_TIMEOUTS = Object.freeze({
  // 检查操作超时
  CHECK_OPERATIONS: {
  },

  // 清理操作超时
  CLEANUP_OPERATIONS: {
  },

  // 管理操作超时
  ADMIN_OPERATIONS: {
  },
});

/**
 * 频率限制重试配置
 * 🎯 基于Semantic层重试配置，针对频率限制操作特化
 */
export const RATE_LIMIT_RETRY_CONFIG = Object.freeze({
  // 缓存操作重试
  CACHE_OPERATIONS: {
    ...RETRY_CONFIG_TEMPLATES.DATABASE_OPERATION,                    // 基于数据库操作模板
    maxAttempts: 2,                                                  // 快速失败，避免性能影响
  },

  // 计数器更新重试
  COUNTER_UPDATE: {
    ...RETRY_CONFIG_TEMPLATES.CRITICAL_OPERATION,                    // 基于关键操作模板
    maxAttempts: 1,                                                  // 计数器更新不重试，保证准确性
  },

  // 配置加载重试
  CONFIG_LOADING: {
    ...RETRY_CONFIG_TEMPLATES.NETWORK_OPERATION,                     // 基于网络操作模板
    maxAttempts: 3,                                                  // 配置加载允许重试
  },
});

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
 * 频率限制统计配置
 * 🎯 频率限制相关的监控和统计
 */
export const RATE_LIMIT_STATISTICS = Object.freeze({
  // 统计指标
  METRICS: {
  },

  // 统计时间窗口
  TIME_WINDOWS: {
  },

  // 报告频率
  REPORTING: {
  },
});

/**
 * 频率限制域工具函数
 */
export class RateLimitDomainUtil {
  /**
   * 获取用户层级的频率限制配置
   */
  static getTierLimits(tier: RateLimitTier): typeof TIERED_RATE_LIMITS.free {
    return TIERED_RATE_LIMITS[tier] || TIERED_RATE_LIMITS.free;
  }

  /**
   * 获取端点特定的频率限制
   */
  static getEndpointLimits(endpoint: string): any {
    // 简化的端点映射逻辑
    if (endpoint.includes('/auth/login')) {
      return ENDPOINT_RATE_LIMITS.AUTHENTICATION.LOGIN;
    }
    if (endpoint.includes('/auth/register')) {
      return ENDPOINT_RATE_LIMITS.AUTHENTICATION.REGISTER;
    }
    if (endpoint.includes('/data/quote')) {
      return ENDPOINT_RATE_LIMITS.DATA_QUERY.STOCK_QUOTE;
    }
    // 默认返回基础限制
    return TIERED_RATE_LIMITS[RateLimitTier.BASIC];
  }

  /**
   * 计算重置时间
   */
  static calculateResetTime(windowType: 'minute' | 'hour' | 'day'): number {
    const now = Date.now();
    const windowMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const windowSize = windowMs[windowType];
    return Math.ceil(now / windowSize) * windowSize;
  }

  /**
   * 格式化限制消息
   */
  static formatLimitMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 判断是否应该应用突发限制
   */
  static shouldApplyBurstLimit(currentRate: number, averageRate: number, burstMultiplier: number = 2): boolean {
    return currentRate > averageRate * burstMultiplier;
  }

  /**
   * 计算推荐的缓存TTL
   */
  static getRecommendedCacheTTL(operation: 'counter' | 'lockout' | 'config'): number {
    switch (operation) {
      case 'counter':
        return RATE_LIMIT_CACHE_CONFIG.COUNTERS.WINDOW_TTL_SEC;
      case 'lockout':
        return RATE_LIMIT_CACHE_CONFIG.LOCKOUTS.USER_LOCKOUT_TTL_SEC;
      case 'config':
        return RATE_LIMIT_CACHE_CONFIG.WHITELIST.CONFIG_TTL_SEC;
      default:
        return RATE_LIMIT_CACHE_CONFIG.COUNTERS.WINDOW_TTL_SEC;
    }
  }

  /**
   * 验证频率限制配置
   */
  static validateRateLimitConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.requestsPerMinute || config.requestsPerMinute < 1) {
      errors.push('每分钟请求数必须大于0');
    }

    if (!config.requestsPerHour || config.requestsPerHour < config.requestsPerMinute) {
      errors.push('每小时请求数不能小于每分钟请求数');
    }

    if (config.concurrentRequests && config.concurrentRequests < 1) {
      errors.push('并发请求数必须大于0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

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
 * Lua脚本名称常量
 * 🎯 频率限制相关的Redis Lua脚本标识
 */
export const RATE_LIMIT_LUA_SCRIPT_NAMES = Object.freeze({
} as const);

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
 * 统一限流配置常量
 * 🎯 项目所有限流设置的中心化管理
 */
export const RATE_LIMIT_CONFIG = Object.freeze({
  // === 全局 NestJS Throttle 配置 ===
  GLOBAL_THROTTLE: {
    TTL: parseInt(process.env.THROTTLER_TTL) || 60000, // 1分钟
    LIMIT: parseInt(process.env.THROTTLER_LIMIT) || 1000, // 每分钟1000次
  },

  // === API Key 级别限流配置 ===
  API_KEY: {
  },

  // === 窗口时间配置 ===
  WINDOW: {
    MIN_SECONDS: 1,
    MAX_SECONDS: 30 * 24 * 60 * 60, // 30天
    DEFAULT: process.env.API_RATE_LIMIT_DEFAULT_WINDOW || "1m",
  },

  // === Redis 相关配置 ===
  REDIS: {
    EXPIRE_BUFFER_SECONDS: 10,
    CONNECTION_TIMEOUT: 10000,
    COMMAND_TIMEOUT: 5000,
    MAX_RETRIES: 3,
  },

  // === 性能相关配置 ===
  PERFORMANCE: {
    TEST_MODE: process.env.PERFORMANCE_TEST_MODE === "true",
    MULTIPLIER: parseInt(process.env.RATE_LIMIT_MULTIPLIER) || 1,
  },

  // === IP 级别限流配置 ===
  IP_RATE_LIMIT: {
  },

  // === 系统级时间间隔配置 ===
  SYSTEM_INTERVALS: {
    // 认证模块清理间隔

    // 权限模块清理间隔

    // API Key模块清理间隔

    // 通用系统清理间隔
  },
});

/**
 * 动态计算 API Key 默认请求数
 * 支持环境变量和压力测试模式
 */
function getDefaultApiKeyRequests(): number {
  // 1. 优先使用环境变量配置
  const envRequests = parseInt(process.env.API_RATE_LIMIT_DEFAULT_REQUESTS);
  if (envRequests && envRequests > 0) {
    return envRequests;
  }

  // 2. 压力测试模式下的动态计算
  const baseRequests = 200; // 基础限制：每分钟200次请求
  const isPerformanceTest = process.env.PERFORMANCE_TEST_MODE === "true";
  const multiplier = parseInt(process.env.RATE_LIMIT_MULTIPLIER) || 1;

  if (isPerformanceTest) {
    return baseRequests * multiplier;
  }

  // 3. 默认值
  return baseRequests;
}

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
 * 类型定义
 */
export type TieredRateLimits = typeof TIERED_RATE_LIMITS;
export type EndpointRateLimits = typeof ENDPOINT_RATE_LIMITS;
export type RateLimitCacheConfig = typeof RATE_LIMIT_CACHE_CONFIG;