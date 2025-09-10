/**
 * 核心超时常量
 * 🎯 基础层 - 所有时间相关配置的统一定义
 * ⏱️ 避免重复定义相同的时间值，提供时间单位转换
 */


/**
 * 核心时间配置
 */
export const ALERT_CORE_TIMEOUTS = Object.freeze({
  /**
   * 基础时间配置 (秒)
   */
  BASIC_SECONDS: {
    // 基础超时
    DEFAULT: 30,     // 30秒
    MIN: 1,             // 1秒  
    MAX: 300,             // 300秒

    // 持续时间配置
    DURATION_DEFAULT: 60, // 60秒
    DURATION_MIN: 1,         // 1秒
    DURATION_MAX: 3600,         // 3600秒

    // 冷却时间配置
    COOLDOWN_DEFAULT: 300, // 300秒
    COOLDOWN_MIN: 60,         // 60秒
    COOLDOWN_MAX: 86400,         // 86400秒
  },

  /**
   * 评估和调度间隔 (毫秒)
   */
  EVALUATION_INTERVALS_MS: {
    DEFAULT: 60000,    // 60000ms - 1分钟
    MIN: 1000,        // 1000ms - 1秒
    MAX: 600000,       // 600000ms - 10分钟
    
    // 特定评估间隔
    RULE_EVALUATION: 60000,      // 60000ms - 规则评估
    METRICS_COLLECTION: 60000,   // 60000ms - 指标收集
    CLEANUP_TASK: 600000,        // 600000ms - 清理任务
  },

  /**
   * 缓存TTL配置 (秒)
   */
  CACHE_TTL_SECONDS: {
    // 基础缓存TTL
    ALERT: 3600,            // 3600秒 - 告警缓存
    STATS: 300,            // 300秒 - 统计缓存  
    HISTORY: 7200,        // 7200秒 - 历史缓存
    RULE: 1800,              // 1800秒 - 规则缓存
  },

  /**
   * 数据库TTL配置 (秒) - 预计算值
   */
  DB_TTL_SECONDS: {
    // 告警历史保留期
    ALERT_HISTORY: 7776000,  // 7776000秒 - 90天
    // 通知日志保留期  
    NOTIFICATION_LOG: 2592000, // 2592000秒 - 30天
  },

  /**
   * 重试时间配置
   */
  RETRY_TIMING: {
    // 基础重试延迟 (毫秒)
    INITIAL_DELAY_MS: 1000,     // 1000ms
    MAX_DELAY_MS: 10000,        // 10000ms
    
    // 退避乘数
    BACKOFF_MULTIPLIER: 2,
    
    // 抖动因子
    JITTER_FACTOR: 0.1,
  },

  /**
   * 操作超时配置 (毫秒)
   */
  OPERATION_TIMEOUTS_MS: {
    // 数据库操作超时
    DB_QUERY_TIMEOUT: 5000,                              // 5秒 - 数据库查询
    DB_UPDATE_TIMEOUT: 10000,                            // 10秒 - 数据库更新
    DB_BATCH_TIMEOUT: 60000,                             // 1分钟 - 批量操作
    
    // 通知操作超时
    NOTIFICATION_SEND: 30000,                            // 30秒 - 发送通知
    NOTIFICATION_BATCH: 60000,                           // 1分钟 - 批量通知
    
    // 系统操作超时
    CLEANUP_OPERATION: 300000,                           // 5分钟 - 清理操作
    STATISTICS_CALCULATION: 60000,                       // 1分钟 - 统计计算
    
    // HTTP操作超时
    HTTP_REQUEST: 30000,                                 // 30秒 - HTTP请求
    
    // 缓存操作超时
    CACHE_OPERATION: 5000,                               // 5秒 - 缓存操作
  },

  /**
   * 安全相关时间配置 (秒)
   */
  SECURITY_TIMEOUTS_SECONDS: {
    // JWT相关
    JWT_EXPIRES: 3600,      // 3600秒 - JWT过期时间
    REFRESH_TOKEN_EXPIRES: 86400, // 86400秒 - 刷新令牌
    
    // 账户锁定
    ACCOUNT_LOCKOUT: 1800, // 1800秒 - 账户锁定时间
    
    // 速率限制窗口
    RATE_LIMIT_WINDOW: 60,   // 60秒 - 限流窗口
  },
});

/**
 * 时间转换工具
 */
export class TimeConverter {
  /**
   * 秒转毫秒
   */
  static secondsToMs(seconds: number): number {
    return seconds * 1000;
  }

  /**
   * 毫秒转秒 (向下取整)
   */
  static msToSeconds(milliseconds: number): number {
    return Math.floor(milliseconds / 1000);
  }

  /**
   * 分钟转秒
   */
  static minutesToSeconds(minutes: number): number {
    return minutes * 60;
  }

  /**
   * 小时转秒
   */
  static hoursToSeconds(hours: number): number {
    return hours * 3600;
  }

  /**
   * 天转秒
   */
  static daysToSeconds(days: number): number {
    return days * 86400;
  }

  /**
   * 获取当前时间戳 (毫秒)
   */
  static getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * 获取当前时间戳 (秒)
   */
  static getCurrentTimestampSeconds(): number {
    return this.msToSeconds(Date.now());
  }
}

/**
 * 时间验证工具
 */
export class TimeValidator {
  /**
   * 验证时间值是否在有效范围内
   */
  static isValidTimeRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && 
           Number.isFinite(value) && 
           value >= min && 
           value <= max;
  }

  /**
   * 验证冷却时间是否有效
   */
  static isValidCooldown(cooldownSeconds: number): boolean {
    return this.isValidTimeRange(
      cooldownSeconds,
      ALERT_CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MIN,
      ALERT_CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MAX
    );
  }

  /**
   * 验证持续时间是否有效
   */
  static isValidDuration(durationSeconds: number): boolean {
    return this.isValidTimeRange(
      durationSeconds,
      ALERT_CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MIN,
      ALERT_CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MAX
    );
  }

  /**
   * 验证超时时间是否有效
   */
  static isValidTimeout(timeoutSeconds: number): boolean {
    return this.isValidTimeRange(
      timeoutSeconds,
      ALERT_CORE_TIMEOUTS.BASIC_SECONDS.MIN,
      ALERT_CORE_TIMEOUTS.BASIC_SECONDS.MAX
    );
  }

  /**
   * 验证评估间隔是否有效
   */
  static isValidEvaluationInterval(intervalMs: number): boolean {
    return this.isValidTimeRange(
      intervalMs,
      ALERT_CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.MIN,
      ALERT_CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.MAX
    );
  }
}

/**
 * 类型定义
 */
export type AlertCoreTimeouts = typeof ALERT_CORE_TIMEOUTS;
