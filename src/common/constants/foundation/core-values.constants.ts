/**
 * 核心数值常量
 * 🏛️ Foundation层 - 纯数值定义，零依赖
 * 📋 所有重复数值的单一真实来源，解决1000、10000等重复定义问题
 */

/**
 * 基础数值常量 - 系统底层配置
 * 所有其他常量文件都应该基于这些基础值构建
 */
export const CORE_VALUES = Object.freeze({
  /**
   * 数量相关基础值
   */
  QUANTITIES: {
    ZERO: 0,
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FIVE: 5,
    TEN: 10,
    TWENTY: 20,           // 🆕 从Unified迁移
    FIFTY: 50,
    HUNDRED: 100,
    TWO_HUNDRED: 200,     // 🆕 从Unified迁移
    THREE_HUNDRED: 300,   // 🆕 从Unified迁移
    FIVE_HUNDRED: 500,    // 🆕 从Unified迁移
    THOUSAND: 1000,       // 🎯 解决1000重复定义
    TWO_THOUSAND: 2000,   // 🆕 从Unified迁移
    FIVE_THOUSAND: 5000,  // 🆕 从Unified迁移
    TEN_THOUSAND: 10000,  // 🎯 解决10000重复定义
    ONE_HUNDRED_THOUSAND: 100000,
  },

  /**
   * 时间相关基础值 (毫秒)
   */
  TIME_MS: {
    ONE_SECOND: 1000,
    FIVE_SECONDS: 5000,
    TEN_SECONDS: 10000,
    FIFTEEN_SECONDS: 15000,   // 🆕 为circuit-breaker添加
    THIRTY_SECONDS: 30000,
    ONE_MINUTE: 60000,        // 🎯 解决60*1000重复定义
    TWO_MINUTES: 120000,      // 🆕 为circuit-breaker添加
    THREE_MINUTES: 180000,    // 🆕 为circuit-breaker添加
    FIVE_MINUTES: 300000,
    TEN_MINUTES: 600000,
    ONE_HOUR: 3600000,
  },

  /**
   * 时间相关基础值 (秒)
   */
  TIME_SECONDS: {
    ONE_SECOND: 1,
    FIVE_SECONDS: 5,
    THIRTY_SECONDS: 30,
    ONE_MINUTE: 60,
    FIVE_MINUTES: 300,
    TEN_MINUTES: 600,
    THIRTY_MINUTES: 1800,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
    THIRTY_DAYS: 2628000,
    NINETY_DAYS: 7884000,
  },

  /**
   * 大小和限制基础值
   */
  SIZES: {
    TINY: 6,           // 用于短ID、随机数等
    SMALL: 50,         // 用于标签、名称等  
    MEDIUM: 100,       // 用于规则名等
    LARGE: 500,        // 用于描述等
    HUGE: 1000,        // 用于消息内容等 🎯 标准化批量大小
    MASSIVE: 10000,    // 用于大批量处理等 🎯 标准化大批量
    URL_MAX: 2048,     // URL最大长度
    EMAIL_MAX: 320,    // 邮箱最大长度  
    FILENAME_MAX: 255, // 文件名最大长度
  },

  /**
   * 百分比基础值
   */
  PERCENTAGES: {
    MIN: 0,
    MAX: 100,
    QUARTER: 25,
    HALF: 50,
    THREE_QUARTERS: 75,
  },

  /**
   * 数学常量
   */
  MATH: {
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  },

  /**
   * 基数值 - 用于进制转换
   */
  RADIX: {
    BASE_36: 36,
  },

  /**
   * 文件大小基础值 (字节)
   * 🆕 从Unified层迁移，解决文件大小重复定义
   */
  FILE_SIZE_BYTES: {
    FIVE_HUNDRED_MB: 524288000, // 500MB
  },

  /**
   * 网络相关基础值
   */
  NETWORK: {
    DEFAULT_RETRIES: 3,
  },

  /**
   * 性能阈值基础值 (毫秒)
   * 🆕 从performance.constants.ts迁移，解决性能阈值重复定义
   */
  PERFORMANCE_MS: {
    VERY_FAST: 50,      // 非常快的操作 - 缓存操作阈值
    FAST: 100,          // 快速操作 - 符号映射阈值
    NORMAL: 500,        // 正常操作 - 普通请求阈值
    SLOW: 1000,         // 🎯 统一慢操作阈值 - 查询/存储阈值
    VERY_SLOW: 5000,    // 非常慢的操作 - 数据转换/认证超时
    CRITICAL: 10000,    // 关键慢操作阈值 - 最大重试延迟
    SLOW_REQUEST: 1000, // 慢请求阈值
    SLOW_STORAGE: 1000, // 存储操作慢阈值
    SLOW_TRANSFORMATION: 5000, // 数据转换慢阈值
    DATA_FETCHER_SLOW: 2000,   // 数据获取慢阈值
  },

  /**
   * 超时配置基础值 (毫秒)
   * 🆕 从performance.constants.ts迁移，解决超时时间重复定义
   */
  TIMEOUT_MS: {
    QUICK: 5000,        // 快速操作超时：5秒
    DEFAULT: 30000,     // 默认超时时间：30秒
    LONG: 60000,        // 长时间操作超时：60秒
    CONNECTION: 5000,   // 连接超时：5秒
  },

  /**
   * 重试配置基础值
   * 🆕 从performance.constants.ts迁移，解决重试配置重复定义
   */
  RETRY: {
    MAX_ATTEMPTS: 3,    // 最大重试次数
    BACKOFF_BASE: 2,    // 指数退避基数
    MAX_DELAY_MS: 10000, // 最大重试延迟：10秒
    CRITICAL_MAX_ATTEMPTS: 5, // 关键操作最大重试次数
  },

  /**
   * 批量处理限制基础值
   * 🆕 从performance.constants.ts迁移，解决批量限制重复定义  
   */
  BATCH_LIMITS: {
    MAX_BATCH_SIZE: 1000,    // 最大批量处理大小
    DEFAULT_PAGE_SIZE: 10,   // 默认分页大小
    MAX_PAGE_SIZE: 100,      // 最大分页大小
    MAX_CONCURRENT: 10,      // 最大并发操作数
  },

  /**
   * 内存使用阈值基础值 (MB)
   * 🆕 从performance.constants.ts迁移，解决内存阈值重复定义
   */
  MEMORY_MB: {
    LOW_USAGE: 50,       // 低内存使用阈值
    NORMAL_USAGE: 100,   // 正常内存使用阈值
    HIGH_USAGE: 200,     // 高内存使用阈值
    CRITICAL_USAGE: 500, // 严重内存使用阈值
    MAX_OBJECT_SIZE: 10, // 最大对象大小
    MAX_REQUEST_SIZE: 50, // 最大请求大小
  },

  /**
   * 连接池配置基础值
   * 🆕 从performance.constants.ts迁移，解决连接池配置重复定义
   */
  CONNECTION_POOL: {
    MIN_SIZE: 5,         // 最小连接池大小
    MAX_SIZE: 20,        // 最大连接池大小
  },

  /**
   * 监控和采样配置基础值
   * 🆕 从performance.constants.ts迁移，解决监控配置重复定义
   */
  MONITORING: {
    HEALTH_CHECK_INTERVAL_MS: 30000, // 健康检查间隔：30秒
  },
});;

/**
 * 类型定义
 */
export type CoreValues = typeof CORE_VALUES;
export type TimeMS = typeof CORE_VALUES.TIME_MS;
export type TimeSeconds = typeof CORE_VALUES.TIME_SECONDS;
export type Sizes = typeof CORE_VALUES.SIZES;
export type Quantities = typeof CORE_VALUES.QUANTITIES;
export type PerformanceMS = typeof CORE_VALUES.PERFORMANCE_MS;
export type TimeoutMS = typeof CORE_VALUES.TIMEOUT_MS;
export type RetryConfig = typeof CORE_VALUES.RETRY;
export type BatchLimits = typeof CORE_VALUES.BATCH_LIMITS;
export type MemoryMB = typeof CORE_VALUES.MEMORY_MB;
export type ConnectionPool = typeof CORE_VALUES.CONNECTION_POOL;
export type MonitoringConfig = typeof CORE_VALUES.MONITORING;