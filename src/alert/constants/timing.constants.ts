/**
 * Alert模块统一时间配置常量
 * 🎯 单一真实来源原则 - 统一管理所有时间相关配置
 * 🔧 消除重复定义，提升维护性
 */

/**
 * 统一时间配置常量
 * 用于替代分散在各文件中的重复时间定义
 */
export const TIMING_CONSTANTS = Object.freeze({
  /**
   * 冷却时间配置 (秒)
   * 用于告警规则冷却期控制
   * 
   * 🔄 重复值说明: DEFAULT_SECONDS(300) 与 CACHE_TTL.STATS_SECONDS 数值相同但语义不同
   * - COOLDOWN.DEFAULT_SECONDS: 告警规则冷却时间，防止频繁触发同一告警
   * - CACHE_TTL.STATS_SECONDS: 统计数据缓存失效时间，控制数据新鲜度
   * 业务场景不同，保持分离是合理的设计选择
   */
  COOLDOWN: {
    DEFAULT_SECONDS: 300,    // 5分钟 - 告警规则默认冷却时间，防止告警风暴
    MIN_SECONDS: 60,         // 1分钟 - 最短冷却时间，保证最基本的去重效果  
    MAX_SECONDS: 86400,      // 24小时 - 最长冷却时间，避免告警长时间静默
  },

  /**
   * 持续时间配置 (秒)
   * 用于告警触发条件持续时间
   */
  DURATION: {
    DEFAULT_SECONDS: 60,     // 1分钟 - 统一默认值
    MIN_SECONDS: 1,          // 1秒 - 统一最小值
    MAX_SECONDS: 3600,       // 1小时 - 统一最大值
  },

  /**
   * 评估间隔配置 (毫秒)
   * 用于告警规则评估频率控制
   */
  EVALUATION: {
    DEFAULT_INTERVAL_MS: 60000,  // 1分钟评估间隔
    MIN_INTERVAL_MS: 1000,       // 最小间隔1秒
    MAX_INTERVAL_MS: 3600000,    // 最大间隔1小时
  },

  /**
   * 缓存TTL配置 (秒)
   * 用于各类告警相关数据缓存时间
   * 
   * 🔄 重复值说明: STATS_SECONDS(300) 与 COOLDOWN.DEFAULT_SECONDS 数值相同但语义不同
   * - CACHE_TTL.STATS_SECONDS: 统计数据缓存存活时间，平衡数据新鲜度和性能
   * - COOLDOWN.DEFAULT_SECONDS: 告警规则冷却时间，控制告警触发频率
   * 两者服务于不同的业务逻辑，分离管理符合单一职责原则
   */
  CACHE_TTL: {
    ALERT_SECONDS: 3600,         // 告警缓存1小时 - 告警状态相对稳定
    STATS_SECONDS: 300,          // 统计缓存5分钟 - 统计数据需要较高时效性
    HISTORY_SECONDS: 7200,       // 历史缓存2小时 - 历史数据变化较少
    RULE_SECONDS: 1800,          // 规则缓存30分钟 - 规则修改频率适中
  },

  /**
   * 数据库TTL索引配置 (秒)
   * 预计算值，避免运行时计算性能损失
   */
  DB_TTL: {
    ALERT_HISTORY_SECONDS: 7884000,    // 约90天 (365*24*60*60/4)
    NOTIFICATION_LOG_SECONDS: 2628000, // 约30天 (365*24*60*60/12)
  },

  /**
   * 超时配置 (秒)
   * 用于各类操作超时控制
   */
  TIMEOUT: {
    DEFAULT_SECONDS: 30,         // 默认超时30秒
    MIN_SECONDS: 1,              // 最短1秒
    MAX_SECONDS: 300,            // 最长5分钟
  }
});

/**
 * 时间常量类型定义
 * 提供类型安全保障
 */
export type TimingConstants = typeof TIMING_CONSTANTS;

/**
 * 时间单位转换工具
 */

export class TimingUtil {
  /**
   * 秒转毫秒
   * @param seconds 秒数
   * @returns 毫秒数
   */
  static secondsToMs(seconds: number): number {
    return seconds * 1000;
  }

  /**
   * 毫秒转秒
   * @param milliseconds 毫秒数
   * @returns 秒数
   */
  static msToSeconds(milliseconds: number): number {
    return Math.floor(milliseconds / 1000);
  }

  /**
   * 验证时间值是否在有效范围内
   * @param value 时间值
   * @param min 最小值
   * @param max 最大值
   * @returns 是否有效
   */
  static isValidTimeRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * 获取默认冷却时间 (秒)
   */
  static getDefaultCooldownSeconds(): number {
    return TIMING_CONSTANTS.COOLDOWN.DEFAULT_SECONDS;
  }

  /**
   * 获取默认持续时间 (秒)
   */
  static getDefaultDurationSeconds(): number {
    return TIMING_CONSTANTS.DURATION.DEFAULT_SECONDS;
  }

  /**
   * 获取默认评估间隔 (毫秒)
   */
  static getDefaultEvaluationIntervalMs(): number {
    return TIMING_CONSTANTS.EVALUATION.DEFAULT_INTERVAL_MS;
  }

  /**
   * 验证冷却时间是否有效
   * @param cooldownSeconds 冷却时间(秒)
   * @returns 是否有效
   */
  static isValidCooldown(cooldownSeconds: number): boolean {
    return this.isValidTimeRange(
      cooldownSeconds,
      TIMING_CONSTANTS.COOLDOWN.MIN_SECONDS,
      TIMING_CONSTANTS.COOLDOWN.MAX_SECONDS
    );
  }

  /**
   * 验证持续时间是否有效
   * @param durationSeconds 持续时间(秒)
   * @returns 是否有效
   */
  static isValidDuration(durationSeconds: number): boolean {
    return this.isValidTimeRange(
      durationSeconds,
      TIMING_CONSTANTS.DURATION.MIN_SECONDS,
      TIMING_CONSTANTS.DURATION.MAX_SECONDS
    );
  }

  /**
   * 验证超时时间是否有效
   * @param timeoutSeconds 超时时间(秒)
   * @returns 是否有效
   */
  static isValidTimeout(timeoutSeconds: number): boolean {
    return this.isValidTimeRange(
      timeoutSeconds,
      TIMING_CONSTANTS.TIMEOUT.MIN_SECONDS,
      TIMING_CONSTANTS.TIMEOUT.MAX_SECONDS
    );
  }
}