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