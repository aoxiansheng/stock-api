/**
 * 核心超时常量
 * 🎯 基础层 - 所有时间相关配置的统一定义
 * ⏱️ 避免重复定义相同的时间值，提供时间单位转换
 */

import { CORE_VALUES } from './values.constants';
import { CORE_LIMITS } from './limits.constants';

/**
 * 核心时间配置
 */
export const CORE_TIMEOUTS = Object.freeze({
  /**
   * 基础时间配置 (秒)
   */
  BASIC_SECONDS: {
    // 基础超时
    DEFAULT: CORE_LIMITS.TIME_SECONDS.TIMEOUT_DEFAULT,     // 30秒
    MIN: CORE_LIMITS.TIME_SECONDS.TIMEOUT_MIN,             // 1秒  
    MAX: CORE_LIMITS.TIME_SECONDS.TIMEOUT_MAX,             // 300秒

    // 持续时间配置
    DURATION_DEFAULT: CORE_LIMITS.TIME_SECONDS.DURATION_DEFAULT, // 60秒
    DURATION_MIN: CORE_LIMITS.TIME_SECONDS.DURATION_MIN,         // 1秒
    DURATION_MAX: CORE_LIMITS.TIME_SECONDS.DURATION_MAX,         // 3600秒

    // 冷却时间配置
    COOLDOWN_DEFAULT: CORE_LIMITS.TIME_SECONDS.COOLDOWN_DEFAULT, // 300秒
    COOLDOWN_MIN: CORE_LIMITS.TIME_SECONDS.COOLDOWN_MIN,         // 60秒
    COOLDOWN_MAX: CORE_LIMITS.TIME_SECONDS.COOLDOWN_MAX,         // 86400秒
  },

  /**
   * 评估和调度间隔 (毫秒)
   */
  EVALUATION_INTERVALS_MS: {
    DEFAULT: CORE_VALUES.TIME_MILLISECONDS.ONE_MINUTE,    // 60000ms - 1分钟
    MIN: CORE_VALUES.TIME_MILLISECONDS.ONE_SECOND,        // 1000ms - 1秒
    MAX: CORE_VALUES.TIME_MILLISECONDS.TEN_MINUTES,       // 600000ms - 10分钟
    
    // 特定评估间隔
    RULE_EVALUATION: CORE_VALUES.TIME_MILLISECONDS.ONE_MINUTE,      // 60000ms - 规则评估
    METRICS_COLLECTION: CORE_VALUES.TIME_MILLISECONDS.ONE_MINUTE,   // 60000ms - 指标收集
    CLEANUP_TASK: CORE_VALUES.TIME_MILLISECONDS.TEN_MINUTES,        // 600000ms - 清理任务
  },

  /**
   * 缓存TTL配置 (秒)
   */
  CACHE_TTL_SECONDS: {
    // 基础缓存TTL
    ALERT: CORE_LIMITS.CACHE_LIMITS.ALERT_TTL,            // 3600秒 - 告警缓存
    STATS: CORE_LIMITS.CACHE_LIMITS.STATS_TTL,            // 300秒 - 统计缓存  
    HISTORY: CORE_LIMITS.CACHE_LIMITS.HISTORY_TTL,        // 7200秒 - 历史缓存
    RULE: CORE_LIMITS.CACHE_LIMITS.RULE_TTL,              // 1800秒 - 规则缓存
  },

  /**
   * 数据库TTL配置 (秒) - 预计算值
   */
  DB_TTL_SECONDS: {
    // 告警历史保留期
    ALERT_HISTORY: CORE_VALUES.TIME_SECONDS.NINETY_DAYS,  // 7884000秒 - 90天
    // 通知日志保留期  
    NOTIFICATION_LOG: CORE_VALUES.TIME_SECONDS.THIRTY_DAYS, // 2628000秒 - 30天
  },

  /**
   * 重试时间配置
   */
  RETRY_TIMING: {
    // 基础重试延迟 (毫秒)
    INITIAL_DELAY_MS: CORE_VALUES.TIME_MILLISECONDS.ONE_SECOND,     // 1000ms
    MAX_DELAY_MS: CORE_VALUES.TIME_MILLISECONDS.TEN_SECONDS,        // 10000ms
    
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
    JWT_EXPIRES: CORE_VALUES.TIME_SECONDS.ONE_HOUR,      // 3600秒 - JWT过期时间
    REFRESH_TOKEN_EXPIRES: CORE_VALUES.TIME_SECONDS.ONE_DAY, // 86400秒 - 刷新令牌
    
    // 账户锁定
    ACCOUNT_LOCKOUT: CORE_VALUES.TIME_SECONDS.THIRTY_MINUTES, // 1800秒 - 账户锁定时间
    
    // 速率限制窗口
    RATE_LIMIT_WINDOW: CORE_VALUES.TIME_SECONDS.ONE_MINUTE,   // 60秒 - 限流窗口
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
    return seconds * CORE_VALUES.TIME_MILLISECONDS.ONE_SECOND;
  }

  /**
   * 毫秒转秒 (向下取整)
   */
  static msToSeconds(milliseconds: number): number {
    return Math.floor(milliseconds / CORE_VALUES.TIME_MILLISECONDS.ONE_SECOND);
  }

  /**
   * 分钟转秒
   */
  static minutesToSeconds(minutes: number): number {
    return minutes * CORE_VALUES.TIME_SECONDS.ONE_MINUTE;
  }

  /**
   * 小时转秒
   */
  static hoursToSeconds(hours: number): number {
    return hours * CORE_VALUES.TIME_SECONDS.ONE_HOUR;
  }

  /**
   * 天转秒
   */
  static daysToSeconds(days: number): number {
    return days * CORE_VALUES.TIME_SECONDS.ONE_DAY;
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
      CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MIN,
      CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MAX
    );
  }

  /**
   * 验证持续时间是否有效
   */
  static isValidDuration(durationSeconds: number): boolean {
    return this.isValidTimeRange(
      durationSeconds,
      CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MIN,
      CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MAX
    );
  }

  /**
   * 验证超时时间是否有效
   */
  static isValidTimeout(timeoutSeconds: number): boolean {
    return this.isValidTimeRange(
      timeoutSeconds,
      CORE_TIMEOUTS.BASIC_SECONDS.MIN,
      CORE_TIMEOUTS.BASIC_SECONDS.MAX
    );
  }

  /**
   * 验证评估间隔是否有效
   */
  static isValidEvaluationInterval(intervalMs: number): boolean {
    return this.isValidTimeRange(
      intervalMs,
      CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.MIN,
      CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.MAX
    );
  }
}

/**
 * 类型定义
 */
export type CoreTimeouts = typeof CORE_TIMEOUTS;