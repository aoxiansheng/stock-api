/**
 * 基础数值层 - 所有数值的单一真实来源
 * 🎯 每个数字在整个Alert系统中只在这里定义一次
 * 📊 基于现有16个常量文件的深度分析，整理出所有重复数值
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 */

/**
 * 基础数值定义
 * 所有Alert系统中使用的数值都必须从这里获取
 */
export const BASE_VALUES = Object.freeze({
  
  /**
   * 时间相关基础值（秒）
   * 基于现有系统中高频出现的时间数值
   */
  SECONDS: {
    INSTANT: 1,           // 1秒 - 即时响应基准 (出现8+次)
    QUICK: 5,             // 5秒 - 快速响应基准 (出现6+次)  
    SHORT: 30,            // 30秒 - 短时间基准 (出现6+次)
    MINUTE: 60,           // 1分钟 - 分钟基准 (出现8+次)
    MEDIUM: 300,          // 5分钟 - 中等时间基准 (出现7+次)
    HALF_HOUR: 1800,      // 30分钟 - 半小时基准 (出现4+次)
    HOUR: 3600,           // 1小时 - 小时基准 (出现6+次)
    HALF_DAY: 43200,      // 12小时 - 半天基准
    DAY: 86400,           // 24小时 - 天基准 (出现4+次)
  },

  /**
   * 数量相关基础值
   * 基于现有系统中高频出现的数量数值
   */
  QUANTITIES: {
    MINIMAL: 1,           // 最小数量 (出现8+次)
    FEW: 5,               // 少量 (出现6+次)
    SMALL: 10,            // 小数量 (出现8+次)
    NORMAL: 20,           // 正常数量
    MEDIUM: 50,           // 中等数量 (出现4+次)
    LARGE: 100,           // 大数量 (出现8+次)
    HUGE: 1000,           // 巨大数量 (出现10+次)
    MAXIMUM: 10000,       // 最大数量
  },

  /**
   * 特殊业务值
   * 基于当前Alert系统已有的特定业务数值
   */
  SPECIAL: {
    // 数据保留期（天）
    RETENTION_DAYS_90: 90,        // 90天保留期（从7776000秒推算）
    RETENTION_DAYS_30: 30,        // 30天保留期（从2592000秒推算）
    RETENTION_DAYS_365: 365,      // 1年保留期
    
    // ID生成相关
    ID_RANDOM_LENGTH: 6,          // ID随机部分长度
    ID_TIMESTAMP_BASE: 36,        // ID时间戳进制
    ID_RANDOM_START: 2,           // ID随机部分起始位置
    
    // 字符串长度限制
    TAG_LENGTH_LIMIT: 50,         // 标签长度限制 (出现4+次)
    NAME_LENGTH_LIMIT: 100,       // 名称长度限制 (出现8+次)
    MESSAGE_LENGTH_LIMIT: 1000,   // 消息长度限制 (出现10+次)
    TEMPLATE_LENGTH_LIMIT: 10000, // 模板长度限制
    
    // 网络相关限制
    URL_LENGTH_LIMIT: 2048,       // URL长度限制
    EMAIL_LENGTH_LIMIT: 320,      // 邮箱长度限制
    FILENAME_LENGTH_LIMIT: 255,   // 文件名长度限制
    
    // 安全相关
    MIN_PASSWORD_LENGTH: 8,       // 最小密码长度
    MAX_PASSWORD_LENGTH: 128,     // 最大密码长度
    
    // 数值范围
    MAX_SAFE_INTEGER: 9007199254740991, // JavaScript最大安全整数
    PERCENTAGE_MAX: 100,          // 百分比最大值
    
    // 重试相关
    DEFAULT_RETRY_COUNT: 3,       // 默认重试次数
    MAX_RETRY_COUNT: 10,          // 最大重试次数
    
    // 并发相关
    DEFAULT_CONCURRENCY: 5,       // 默认并发数
    MAX_CONCURRENCY: 20,          // 最大并发数
    
    // 小数值
    JITTER_FACTOR: 0.1,           // 抖动因子
    BACKOFF_MULTIPLIER: 2,        // 退避乘数
    BACKOFF_MULTIPLIER_SLOW: 1.5, // 慢速退避乘数
  },

  /**
   * 毫秒时间值
   * 用于需要毫秒精度的场景
   */
  MILLISECONDS: {
    INSTANT: 1000,        // 1秒 = 1000毫秒
    QUICK: 5000,          // 5秒 = 5000毫秒
    SHORT: 30000,         // 30秒 = 30000毫秒
    MINUTE: 60000,        // 1分钟 = 60000毫秒
    MEDIUM: 300000,       // 5分钟 = 300000毫秒
    LONG: 600000,         // 10分钟 = 600000毫秒
  },
});

/**
 * 基础数值类型定义
 * 提供类型安全保障
 */
export type BaseValues = typeof BASE_VALUES;

/**
 * 基础数值验证工具
 * 确保数值的有效性和一致性
 */
export class BaseValueValidator {
  /**
   * 验证时间值是否在有效范围内
   */
  static isValidTimeValue(value: number): boolean {
    return typeof value === 'number' && 
           Number.isFinite(value) && 
           value >= BASE_VALUES.SECONDS.INSTANT && 
           value <= BASE_VALUES.SECONDS.DAY;
  }

  /**
   * 验证数量值是否在有效范围内
   */
  static isValidQuantityValue(value: number): boolean {
    return typeof value === 'number' && 
           Number.isInteger(value) && 
           value >= BASE_VALUES.QUANTITIES.MINIMAL && 
           value <= BASE_VALUES.QUANTITIES.MAXIMUM;
  }

  /**
   * 验证字符串长度是否在有效范围内
   */
  static isValidStringLength(value: number): boolean {
    return typeof value === 'number' && 
           Number.isInteger(value) && 
           value >= BASE_VALUES.QUANTITIES.MINIMAL && 
           value <= BASE_VALUES.SPECIAL.TEMPLATE_LENGTH_LIMIT;
  }

  /**
   * 获取所有基础数值的摘要
   */
  static getSummary(): string {
    return `Alert基础数值配置:
- 时间范围: ${BASE_VALUES.SECONDS.INSTANT}s - ${BASE_VALUES.SECONDS.DAY}s
- 数量范围: ${BASE_VALUES.QUANTITIES.MINIMAL} - ${BASE_VALUES.QUANTITIES.MAXIMUM}
- 特殊值总数: ${Object.keys(BASE_VALUES.SPECIAL).length}个
- 毫秒值范围: ${BASE_VALUES.MILLISECONDS.INSTANT}ms - ${BASE_VALUES.MILLISECONDS.LONG}ms`;
  }

  /**
   * 验证所有基础数值的一致性
   */
  static validateConsistency(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证时间递增关系
    const timeValues = Object.values(BASE_VALUES.SECONDS);
    for (let i = 1; i < timeValues.length; i++) {
      if (timeValues[i] <= timeValues[i - 1]) {
        errors.push(`时间值不是递增的: ${timeValues[i - 1]} >= ${timeValues[i]}`);
      }
    }

    // 验证数量递增关系
    const quantityValues = Object.values(BASE_VALUES.QUANTITIES);
    for (let i = 1; i < quantityValues.length; i++) {
      if (quantityValues[i] <= quantityValues[i - 1]) {
        errors.push(`数量值不是递增的: ${quantityValues[i - 1]} >= ${quantityValues[i]}`);
      }
    }

    // 验证毫秒与秒的一致性
    if (BASE_VALUES.MILLISECONDS.INSTANT !== BASE_VALUES.SECONDS.INSTANT * 1000) {
      errors.push('毫秒与秒的转换不一致');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 时间转换工具
 * 提供基础数值之间的转换功能
 */
export class BaseTimeConverter {
  /**
   * 秒转毫秒
   */
  static secondsToMs(seconds: number): number {
    return seconds * 1000;
  }

  /**
   * 毫秒转秒
   */
  static msToSeconds(milliseconds: number): number {
    return Math.floor(milliseconds / 1000);
  }

  /**
   * 天转秒
   */
  static daysToSeconds(days: number): number {
    return days * BASE_VALUES.SECONDS.DAY;
  }

  /**
   * 秒转天
   */
  static secondsToDays(seconds: number): number {
    return Math.floor(seconds / BASE_VALUES.SECONDS.DAY);
  }

  /**
   * 获取当前时间戳（秒）
   */
  static getCurrentTimestampSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  static getCurrentTimestampMs(): number {
    return Date.now();
  }
}

// 导出常量的快捷访问
export const {
  SECONDS,
  QUANTITIES, 
  SPECIAL,
  MILLISECONDS
} = BASE_VALUES;