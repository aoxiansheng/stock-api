/**
 * 核心限制常量
 * 🎯 基础层 - 系统边界值和限制的统一定义
 * 📏 所有数值范围限制的单一真实来源
 */



/**
 * 核心限制配置
 */
export const CORE_LIMITS = Object.freeze({
  /**
   * 字符串长度限制
   */
  STRING_LENGTH: {
    // 基础长度限制
    MIN_LENGTH: 1,
    
    // 不同用途的长度限制
    TAG_MAX: 50,           // 50 - 标签最大长度
    NAME_MAX: 100,         // 100 - 名称最大长度  
    DESCRIPTION_MAX: 500,   // 500 - 描述最大长度
    MESSAGE_MAX: 1000,        // 1000 - 消息最大长度
    TEMPLATE_MAX: 10000,    // 10000 - 模板最大长度
    
    // 特殊用途长度限制
    URL_MAX: 2048,         // 2048 - URL最大长度
    EMAIL_MAX: 320,     // 320 - 邮箱最大长度
    FILENAME_MAX: 255, // 255 - 文件名最大长度
  },

  /**
   * ID长度限制
   */
  ID_LENGTH: {
    MIN: 1,            // 1 - 最小ID长度
    MAX: 100,              // 100 - 最大ID长度
    TYPICAL_MIN: 15,                            // 15 - 典型最小ID长度
    TYPICAL_MAX: 50,       // 50 - 典型最大ID长度
    RANDOM_PART: 6,        // 6 - ID随机部分长度
  },

  /**
   * 数值范围限制
   */
  NUMERIC_RANGE: {
    // 基础数值范围
    MIN_VALUE: 0,
    MAX_VALUE: 9007199254740991,
    
    // 百分比范围
    PERCENTAGE_MIN: 0, // 0
    PERCENTAGE_MAX: 100, // 100
    
    // 计数器范围
    COUNT_MIN: 0,
    COUNT_MAX: 9007199254740991,
    
    // 阈值范围
    THRESHOLD_MIN: 0,
    THRESHOLD_MAX: 9007199254740991,
  },

  /**
   * 时间限制 (秒)
   */
  TIME_SECONDS: {
    // 基础时间限制
    MIN_SECONDS: 1,     // 1
    MAX_SECONDS: 86400,        // 86400
    
    // 持续时间限制
    DURATION_MIN: 1,    // 1
    DURATION_MAX: 3600,      // 3600
    DURATION_DEFAULT: 60, // 60
    
    // 冷却时间限制
    COOLDOWN_MIN: 60,    // 60
    COOLDOWN_MAX: 86400,       // 86400
    COOLDOWN_DEFAULT: 300, // 300
    
    // 超时限制
    TIMEOUT_MIN: 1,     // 1
    TIMEOUT_MAX: 300,   // 300
    TIMEOUT_DEFAULT: 30, // 30
  },

  /**
   * 批量操作限制
   */
  BATCH_LIMITS: {
    // 通用批量大小
    DEFAULT_BATCH_SIZE: 1000,  // 1000
    
    // 特定场景批量限制
    MAX_SEARCH_RESULTS: 1000,  // 1000 - 搜索结果限制
    MAX_ALERTS_PER_RULE: 1000, // 1000 - 单规则告警数限制
    MAX_BATCH_UPDATE: 1000,    // 1000 - 批量更新限制
    CLEANUP_BATCH_SIZE: 1000,  // 1000 - 清理批次大小
    
    // 小批量操作限制
    SMALL_BATCH_SIZE: 50,       // 50 - 小批量操作
    TINY_BATCH_SIZE: 10,          // 10 - 微批量操作
  },

  /**
   * 业务对象数量限制
   */
  OBJECT_LIMITS: {
    // 用户相关限制
    MAX_RULES_PER_USER: 100,         // 100 - 单用户最大规则数
    MAX_CONDITIONS_PER_RULE: 10,  // 10 - 单规则最大条件数
    MAX_ACTIONS_PER_RULE: 5,                              // 5 - 单规则最大动作数
    
    // 标签和分类限制
    MAX_TAGS_COUNT: 10,           // 10 - 最大标签数量
    
    // 查询限制
    MAX_QUERY_LIMIT: 100,            // 100 - 单次查询最大结果数
    
    // 活跃对象限制
    MAX_ACTIVE_ALERTS: 10000, // 10000 - 最大活跃告警数
  },

  /**
   * 重试限制
   */
  RETRY_LIMITS: {
    MIN_RETRIES: 0,             // 0 - 最小重试次数
    MAX_RETRIES: 10,              // 10 - 最大重试次数
    DEFAULT_RETRIES: 3,                                   // 3 - 默认重试次数
    
    // 特殊场景重试限制
    NOTIFICATION_MAX_RETRIES: 5,                          // 5 - 通知重试次数
    DB_MAX_RETRIES: 2,                                    // 2 - 数据库重试次数
  },

  /**
   * 安全相关限制
   */
  SECURITY_LIMITS: {
    // 密码限制
    MIN_PASSWORD_LENGTH: 8,                               // 8 - 最小密码长度
    MAX_PASSWORD_LENGTH: 128,                             // 128 - 最大密码长度
    
    // 登录失败限制
    MAX_LOGIN_ATTEMPTS: 5,                                // 5 - 最大登录失败次数
    
    // 速率限制
    RATE_LIMIT_MAX_REQUESTS: 100,    // 100 - API限流最大请求数
  },

  /**
   * 缓存相关限制
   */
  CACHE_LIMITS: {
    // 缓存TTL (秒)
    ALERT_TTL: 3600,         // 3600 - 告警缓存TTL
    STATS_TTL: 300,     // 300 - 统计缓存TTL
    HISTORY_TTL: 7200,                                    // 7200 - 历史缓存TTL (2小时)
    RULE_TTL: 1800,    // 1800 - 规则缓存TTL
  },
});

/**
 * 限制验证工具
 */
export class LimitValidator {
  /**
   * 验证字符串长度是否在限制范围内
   */
  static isValidStringLength(value: string, minLength: number, maxLength: number): boolean {
    return typeof value === 'string' && 
           value.length >= minLength && 
           value.length <= maxLength;
  }

  /**
   * 验证数值是否在范围内
   */
  static isValidNumberRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && 
           Number.isFinite(value) && 
           value >= min && 
           value <= max;
  }

  /**
   * 验证消息长度
   */
  static isValidMessageLength(message: string): boolean {
    return this.isValidStringLength(
      message,
      CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,
      CORE_LIMITS.STRING_LENGTH.MESSAGE_MAX
    );
  }

  /**
   * 验证名称长度
   */
  static isValidNameLength(name: string): boolean {
    return this.isValidStringLength(
      name,
      CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,
      CORE_LIMITS.STRING_LENGTH.NAME_MAX
    );
  }

  /**
   * 验证标签长度
   */
  static isValidTagLength(tag: string): boolean {
    return this.isValidStringLength(
      tag,
      CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,
      CORE_LIMITS.STRING_LENGTH.TAG_MAX
    );
  }

  /**
   * 验证阈值范围
   */
  static isValidThreshold(threshold: number): boolean {
    return this.isValidNumberRange(
      threshold,
      CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MIN,
      CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MAX
    );
  }

  /**
   * 验证百分比范围
   */
  static isValidPercentage(percentage: number): boolean {
    return this.isValidNumberRange(
      percentage,
      CORE_LIMITS.NUMERIC_RANGE.PERCENTAGE_MIN,
      CORE_LIMITS.NUMERIC_RANGE.PERCENTAGE_MAX
    );
  }

  /**
   * 验证批量大小
   */
  static isValidBatchSize(size: number): boolean {
    return this.isValidNumberRange(
      size,
      CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE,
      CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE
    );
  }
}

/**
 * 类型定义
 */
export type CoreLimits = typeof CORE_LIMITS;