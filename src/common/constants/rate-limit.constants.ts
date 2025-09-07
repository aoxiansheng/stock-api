/**
 * 频率限制服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

import { LogLevel } from "../types/enums/shared-base.enum";

/**
 * 频率限制策略枚举
 */
export enum RateLimitStrategy {
  FIXED_WINDOW = "fixed_window", // 固定窗口
  SLIDING_WINDOW = "sliding_window", // 滑动窗口
}

/**
 * 频率限制策略描述
 */
export const RATE_LIMIT_STRATEGY_DESCRIPTIONS: Record<
  RateLimitStrategy,
  string
> = {
  [RateLimitStrategy.FIXED_WINDOW]: "固定窗口算法",
  [RateLimitStrategy.SLIDING_WINDOW]: "滑动窗口算法",
};

/**
 * 频率限制策略的适用场景
 */
export const RATE_LIMIT_STRATEGY_USE_CASES: Record<RateLimitStrategy, string> =
  {
    [RateLimitStrategy.FIXED_WINDOW]:
      "适用于简单场景，性能较好，但可能存在突发流量问题",
    [RateLimitStrategy.SLIDING_WINDOW]:
      "适用于严格控制场景，流量控制更平滑，但消耗更多资源",
  };

// 📝 操作名称常量
export const RATE_LIMIT_OPERATIONS = Object.freeze({
  CHECK_RATE_LIMIT: "checkRateLimit",
  CHECK_FIXED_WINDOW: "checkFixedWindow",
  CHECK_SLIDING_WINDOW: "checkSlidingWindow",
  RESET_RATE_LIMIT: "resetRateLimit",
  GET_CURRENT_USAGE: "getCurrentUsage",
  GET_USAGE_STATISTICS: "getUsageStatistics",
  GENERATE_REDIS_KEY: "generateRedisKey",
  PARSE_WINDOW_TO_SECONDS: "parseWindowToSeconds",
  VALIDATE_STRATEGY: "validateStrategy",
  VALIDATE_WINDOW_FORMAT: "validateWindowFormat",
  EXECUTE_LUA_SCRIPT: "executeLuaScript",
  CLEANUP_EXPIRED_KEYS: "cleanupExpiredKeys",
});

// 📢 消息常量
export const RATE_LIMIT_MESSAGES = Object.freeze({
  // 成功消息
  RATE_LIMIT_CHECK_STARTED: "检查频率限制",
  FIXED_WINDOW_CHECK: "固定窗口检查",
  SLIDING_WINDOW_CHECK: "滑动窗口检查",
  RATE_LIMIT_RESET: "重置API Key的频率限制计数器",
  USAGE_STATISTICS_RETRIEVED: "获取API Key使用统计",
  CURRENT_USAGE_RETRIEVED: "获取当前使用情况",
  REDIS_KEY_GENERATED: "Redis键生成成功",
  WINDOW_PARSED: "时间窗口解析成功",
  LUA_SCRIPT_EXECUTED: "Lua脚本执行成功",

  // 错误消息
  RATE_LIMIT_CHECK_FAILED: "频率限制检查失败",
  FIXED_WINDOW_EXCEEDED: "API Key 超过固定窗口频率限制",
  SLIDING_WINDOW_EXCEEDED: "API Key 超过滑动窗口频率限制",
  UNSUPPORTED_STRATEGY_RESET: "尝试重置不支持的频率限制策略的计数器",
  REDIS_OPERATION_FAILED: "Redis操作失败",
  LUA_SCRIPT_EXECUTION_FAILED: "Lua脚本执行失败",
  WINDOW_PARSING_FAILED: "时间窗口解析失败",
  USAGE_RETRIEVAL_FAILED: "使用统计获取失败",

  // 警告消息
  STRATEGY_NOT_SUPPORTED: "不支持的频率限制策略",
  INVALID_WINDOW_FORMAT: "无效的时间窗口格式",
  UNSUPPORTED_TIME_UNIT: "不支持的时间单位",
  HIGH_USAGE_DETECTED: "检测到高频使用",
  RATE_LIMIT_APPROACHING: "接近频率限制",
  UNUSUAL_USAGE_PATTERN: "检测到异常使用模式",

  // 信息消息
  RATE_LIMIT_WITHIN_BOUNDS: "频率限制在正常范围内",
  CACHE_KEY_EXPIRED: "缓存键已过期",
  WINDOW_RESET: "时间窗口已重置",
  STATISTICS_CALCULATED: "统计数据计算完成",
  REDIS_CONNECTION_ESTABLISHED: "Redis连接已建立",
  ALGORITHM_SELECTED: "频率限制算法已选择",
});

// 🎯 错误消息模板常量
export const RATE_LIMIT_ERROR_TEMPLATES = Object.freeze({
  UNSUPPORTED_STRATEGY: "不支持的频率限制策略: {strategy}",
  INVALID_WINDOW_FORMAT:
    "无效的时间窗口格式: {window}，期望格式如: 1s, 5m, 1h, 1d",
  UNSUPPORTED_TIME_UNIT:
    "不支持的时间单位: {unit}，支持的单位: s(秒), m(分), h(时), d(天)",
  RATE_LIMIT_EXCEEDED: "API Key {appKey} 超过频率限制: {current}/{limit} 请求",
  REDIS_KEY_CONFLICT: "Redis键冲突: {key}",
  INVALID_LIMIT_VALUE: "无效的限制值: {limit}，必须是正整数",
  WINDOW_TOO_LARGE: "时间窗口过大: {window}，最大支持 {maxWindow}",
  WINDOW_TOO_SMALL: "时间窗口过小: {window}，最小支持 {minWindow}",
});

// 🔧 Lua 脚本引用 - 简化常量文件，将复杂脚本移至专用服务
/**
 * Lua脚本现已移至专用服务类中管理
 * @see RateLimitLuaScriptsService - 位于 src/common/scripts/lua/rate-limit-lua-scripts.service.ts
 * 
 * 可用脚本：
 * - sliding_window: 滑动窗口限流脚本
 * - sliding_window_count_only: 滑动窗口计数脚本  
 * - batch_cleanup: 批量清理过期键脚本
 * - fixed_window: 固定窗口限流脚本
 */
export const RATE_LIMIT_LUA_SCRIPT_NAMES = Object.freeze({
  SLIDING_WINDOW: 'sliding_window',
  SLIDING_WINDOW_COUNT_ONLY: 'sliding_window_count_only', 
  BATCH_CLEANUP: 'batch_cleanup',
  FIXED_WINDOW: 'fixed_window',
} as const);

// ⏰ 时间单位常量
export const RATE_LIMIT_TIME_UNITS = Object.freeze({
  SECOND: "s",
  MINUTE: "m",
  HOUR: "h",
  DAY: "d",
  WEEK: "w",
  MONTH: "M",
});

// 🔢 时间倍数常量
export const RATE_LIMIT_TIME_MULTIPLIERS = Object.freeze({
  [RATE_LIMIT_TIME_UNITS.SECOND]: 1,
  [RATE_LIMIT_TIME_UNITS.MINUTE]: 60,
  [RATE_LIMIT_TIME_UNITS.HOUR]: 60 * 60,
  [RATE_LIMIT_TIME_UNITS.DAY]: 24 * 60 * 60,
  [RATE_LIMIT_TIME_UNITS.WEEK]: 7 * 24 * 60 * 60,
  [RATE_LIMIT_TIME_UNITS.MONTH]: 30 * 24 * 60 * 60, // 近似值
});

// 🔧 统一限流配置常量 - 项目所有限流设置的中心化管理
export const RATE_LIMIT_CONFIG = Object.freeze({
  // === 全局 NestJS Throttle 配置 ===
  GLOBAL_THROTTLE: {
    TTL: parseInt(process.env.THROTTLER_TTL) || 60000, // 1分钟
    LIMIT: parseInt(process.env.THROTTLER_LIMIT) || 1000, // 每分钟1000次
  },

  // === API Key 级别限流配置 ===
  API_KEY: {
    DEFAULT_STRATEGY:
      (process.env.API_RATE_LIMIT_STRATEGY as RateLimitStrategy) ||
      RateLimitStrategy.FIXED_WINDOW,
    DEFAULT_WINDOW: process.env.API_RATE_LIMIT_DEFAULT_WINDOW || "1m",
    DEFAULT_REQUESTS: getDefaultApiKeyRequests(), // 动态计算
    MIN_REQUESTS: 1,
    MAX_REQUESTS: 1000000,
    WARNING_PERCENTAGE: 90, // 告警阈值
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
    BATCH_CLEANUP_SIZE: 100,
    CONNECTION_TIMEOUT: 10000,
    COMMAND_TIMEOUT: 5000,
    MAX_RETRIES: 3,
  },

  // === 性能相关配置 ===
  PERFORMANCE: {
    STATISTICS_PRECISION: 2,
    TEST_MODE: process.env.PERFORMANCE_TEST_MODE === "true",
    MULTIPLIER: parseInt(process.env.RATE_LIMIT_MULTIPLIER) || 1,
  },

  // === 端点特定限流配置 ===
  ENDPOINTS: {
    SECURITY_MANUAL_EVENTS: { limit: 20, ttl: 60000 }, // 每分钟20次
    PROVIDER_CAPABILITIES: { limit: 10, ttl: 60000 }, // 每分钟10次
    AUTH_LOGIN: { limit: 5, ttl: 300000 }, // 每5分钟5次
    AUTH_REGISTER: { limit: 3, ttl: 3600000 }, // 每小时3次
  },

  // === IP 级别限流配置 ===
  IP_RATE_LIMIT: {
    ENABLED: process.env.IP_RATE_LIMIT_ENABLED !== "false",
    MAX_REQUESTS: parseInt(process.env.IP_RATE_LIMIT_MAX) || 1000,
    WINDOW_MS: parseInt(process.env.IP_RATE_LIMIT_WINDOW) || 60000, // 1分钟
  },

  // === 系统级时间间隔配置 ===
  SYSTEM_INTERVALS: {
    // 认证模块清理间隔
    AUTH_TOKEN_CLEANUP: 3600000,        // 1小时 - Token清理
    AUTH_SESSION_CLEANUP: 1800000,      // 30分钟 - Session清理
    AUTH_LOGIN_ATTEMPT_RESET: 900000,   // 15分钟 - 登录尝试重置
    AUTH_PASSWORD_EXPIRY_CHECK: 86400000, // 24小时 - 密码过期检查
    AUTH_ACCOUNT_LOCK_CHECK: 300000,    // 5分钟 - 账户锁定检查

    // 权限模块清理间隔
    PERMISSION_CACHE_CLEANUP: 1800000,  // 30分钟 - 权限缓存清理
    PERMISSION_REFRESH: 3600000,        // 1小时 - 权限刷新

    // API Key模块清理间隔
    APIKEY_CLEANUP: 300000,             // 5分钟 - API Key清理
    APIKEY_USAGE_RESET: 3600000,        // 1小时 - 使用统计重置

    // 通用系统清理间隔
    LOG_CLEANUP: 604800000,             // 7天 - 日志清理
    METRICS_COLLECTION: 60000,          // 1分钟 - 指标收集
    HEALTH_CHECK: 30000,                // 30秒 - 健康检查
  },
});

/**
 * 动态计算 API Key 默认请求数
 * 支持环境变量和压力测试模式
 * 优先级：环境变量 > 压力测试模式 > 默认值
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

// 🔐 安全中间件相关限制常量
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

// 📊 频率限制策略常量
export const RATE_LIMIT_STRATEGY_INFO = Object.freeze({
  FIXED_WINDOW: {
    name: "Fixed Window",
    description: "固定时间窗口算法",
    pros: ["简单高效", "内存使用少"],
    cons: ["可能出现突发流量"],
  },
  SLIDING_WINDOW: {
    name: "Sliding Window",
    description: "滑动时间窗口算法",
    pros: ["流量分布均匀", "更精确的限制"],
    cons: ["内存使用较多", "计算复杂度高"],
  },
});

// 🏷️ Redis 键模式常量
export const RATE_LIMIT_REDIS_PATTERNS = Object.freeze({
  FIXED_WINDOW: "{prefix}:{appKey}:{window}:fixed:{windowStart}",
  SLIDING_WINDOW: "{prefix}:{appKey}:{window}:sliding",
  USAGE_STATS: "{prefix}:{appKey}:stats",
  CLEANUP_PATTERN: "{prefix}:*",
});

// 📈 监控指标常量
export const RATE_LIMIT_METRICS = Object.freeze({
  REQUESTS_ALLOWED: "rate_limit_requests_allowed",
  REQUESTS_DENIED: "rate_limit_requests_denied",
  WINDOW_RESETS: "rate_limit_window_resets",
  LUA_SCRIPT_EXECUTIONS: "rate_limit_lua_executions",
  REDIS_OPERATIONS: "rate_limit_redis_operations",
  AVERAGE_RESPONSE_TIME: "rate_limit_avg_response_time",
  CACHE_HIT_RATE: "rate_limit_cache_hit_rate",
  ERROR_RATE: "rate_limit_error_rate",
});

// 🎯 验证规则常量
export const RATE_LIMIT_VALIDATION_RULES = Object.freeze({
  WINDOW_PATTERN: /^(\d+)([smhdwM])$/,
  APP_KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MIN_APP_KEY_LENGTH: 3,
  MAX_APP_KEY_LENGTH: 64,
  REDIS_KEY_MAX_LENGTH: 512,
});

// 🔄 重试配置常量
export const RATE_LIMIT_RETRY_CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 100,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 5000,
  JITTER_FACTOR: 0.1,
});

// 🚨 告警阈值常量
export const RATE_LIMIT_ALERT_THRESHOLDS = Object.freeze({
  HIGH_USAGE_PERCENTAGE: 80,
  CRITICAL_USAGE_PERCENTAGE: 95,
  ERROR_RATE_THRESHOLD: 0.05,
  RESPONSE_TIME_THRESHOLD_MS: 1000,
  REDIS_CONNECTION_TIMEOUT_MS: 5000,
});

// 🎨 日志级别映射常量 - 使用共享枚举消除重复
export const RATE_LIMIT_LOG_LEVELS = Object.freeze({
  ALLOWED: LogLevel.DEBUG,
  DENIED: LogLevel.WARN,
  ERROR: LogLevel.ERROR,
  RESET: LogLevel.INFO,
  STATISTICS: LogLevel.DEBUG,
  CONFIGURATION: LogLevel.INFO,
});

/**
 * 频率限制模板工具函数
 */
export class RateLimitTemplateUtil {
  /**
   * 替换错误消息模板中的占位符
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
   */
  static replaceErrorTemplate(
    template: string,
    params: Record<string, any>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 生成错误消息
   * @param templateKey 模板键名
   * @param params 参数对象
   * @returns 错误消息字符串
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
   * @param window 时间窗口字符串
   * @returns 是否有效
   */
  static isValidWindowFormat(window: string): boolean {
    return RATE_LIMIT_VALIDATION_RULES.WINDOW_PATTERN.test(window);
  }

  /**
   * 验证应用键格式
   * @param appKey 应用键
   * @returns 是否有效
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
   * @param attempt 重试次数
   * @returns 延迟毫秒数
   */
  static calculateRetryDelay(attempt: number): number {
    const {
      INITIAL_DELAY_MS,
      BACKOFF_MULTIPLIER,
      MAX_DELAY_MS,
      JITTER_FACTOR,
    } = RATE_LIMIT_RETRY_CONFIG;

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
   * @param value 数值
   * @param precision 精度
   * @returns 格式化后的数值
   */
  static formatStatistic(
    value: number,
    precision: number = RATE_LIMIT_CONFIG.PERFORMANCE.STATISTICS_PRECISION,
  ): number {
    return (
      Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision)
    );
  }
}
