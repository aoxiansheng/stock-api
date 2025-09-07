/**
 * 监控系统限制常量
 * @description 定义系统性能阈值和限制值，替换散布在代码中的魔法数字
 * @version 1.0.0
 * @since 2025-09-05
 * @author Claude Code
 */

export const MONITORING_SYSTEM_LIMITS = {
  // ========================= HTTP状态码阈值 =========================
  /**
   * HTTP成功状态码阈值
   * @description 大于等于此值视为客户端错误
   */
  HTTP_SUCCESS_THRESHOLD: 400 as const,
  
  /**
   * HTTP服务器错误状态码阈值  
   * @description 大于等于此值视为服务器错误
   */
  HTTP_SERVER_ERROR_THRESHOLD: 500 as const,
  
  // ========================= 性能阈值（毫秒） =========================
  /**
   * 慢查询阈值
   * @description 数据库查询超过此值视为慢查询
   */
  SLOW_QUERY_THRESHOLD_MS: 1000 as const,
  
  /**
   * 慢请求阈值
   * @description HTTP请求超过此值视为慢请求
   */
  SLOW_REQUEST_THRESHOLD_MS: 1000 as const,
  
  /**
   * 缓存响应阈值
   * @description 缓存操作超过此值需要优化
   */
  CACHE_RESPONSE_THRESHOLD_MS: 100 as const,
  
  /**
   * API响应时间阈值
   * @description API响应时间基准阈值
   */
  API_RESPONSE_TIME_MS: 100 as const,
  
  /**
   * 数据库查询时间阈值
   * @description 数据库查询时间基准阈值
   */
  DB_QUERY_TIME_MS: 50 as const,
  
  /**
   * 性能监控慢请求阈值
   * @description 性能装饰器默认慢请求阈值
   */
  PERFORMANCE_SLOW_REQUEST_MS: 500 as const,
  
  // ========================= 系统限制 =========================
  /**
   * 最大缓冲区大小
   * @description 事件收集器最大缓冲区大小
   */
  MAX_BUFFER_SIZE: 1000 as const,
  
  /**
   * 最大批量大小
   * @description 批处理操作的最大数量
   */
  MAX_BATCH_SIZE: 100 as const,
  
  /**
   * 最大键长度
   * @description 缓存键名最大长度限制
   */
  MAX_KEY_LENGTH: 100 as const,
  
  /**
   * 最大队列大小
   * @description 事件队列最大大小
   */
  MAX_QUEUE_SIZE: 10000 as const,
  
  /**
   * 操作时间记录最大数量
   * @description 性能指标操作时间记录上限
   */
  MAX_OPERATION_TIMES: 1000 as const,
  
  /**
   * 查询限制上限
   * @description API查询数量限制上限
   */
  MAX_QUERY_LIMIT: 1000 as const,
  
  // ========================= 计算精度 =========================
  /**
   * 小数精度因子
   * @description 用于小数精度计算的乘数因子
   */
  DECIMAL_PRECISION_FACTOR: 10000 as const,
  
  /**
   * 百分比乘数
   * @description 将小数转换为百分比的乘数
   */
  PERCENTAGE_MULTIPLIER: 100 as const,
  
  // ========================= 时间窗口（秒） =========================
  /**
   * 小时秒数
   * @description 一小时的秒数
   */
  HOUR_IN_SECONDS: 3600 as const,
  
  /**
   * 天秒数
   * @description 一天的秒数
   */
  DAY_IN_SECONDS: 86400 as const,
  
  /**
   * 分钟毫秒数
   * @description 一分钟的毫秒数
   */
  MINUTE_IN_MS: 60000 as const,
  
  /**
   * 小时毫秒数
   * @description 一小时的毫秒数
   */
  HOUR_IN_MS: 3600000 as const,
  
  /**
   * 天毫秒数
   * @description 一天的毫秒数
   */
  DAY_IN_MS: 86400000 as const,
  
  // ========================= 评分和比率 =========================
  /**
   * 满分基数
   * @description 健康评分、性能评分的满分基数
   */
  FULL_SCORE: 100 as const,
  
  /**
   * 缓存命中率最小值
   * @description 缓存命中率合格最小值
   */
  CACHE_HIT_RATE_MIN: 0.8 as const,
  
  /**
   * 错误率最大值
   * @description 系统错误率警告阈值
   */
  ERROR_RATE_MAX: 0.01 as const,
  
  /**
   * 内存使用最大MB
   * @description 内存使用警告阈值
   */
  MEMORY_USAGE_MAX_MB: 512 as const,
  
  // ========================= 批处理配置 =========================
  /**
   * 默认刷新间隔
   * @description 事件批处理默认刷新间隔（毫秒）
   */
  DEFAULT_FLUSH_INTERVAL_MS: 100 as const,
  
  /**
   * 默认批处理大小
   * @description 事件批处理默认批次大小
   */
  DEFAULT_BATCH_SIZE: 100 as const,
  
  /**
   * 事件计数器阈值
   * @description 触发刷新的事件计数阈值
   */
  EVENT_COUNTER_THRESHOLD: 1000 as const,
  
  /**
   * 刷新时间间隔
   * @description 强制刷新时间间隔（毫秒）
   */
  FORCE_FLUSH_INTERVAL_MS: 5000 as const,
  
  // ========================= 监控指标配置 =========================
  /**
   * P99关键阈值
   * @description P99响应时间关键阈值（毫秒）
   */
  P99_CRITICAL_MS: 500 as const,
  
  /**
   * 数据库阈值
   * @description 数据库监控装饰器默认阈值（毫秒）
   */
  DATABASE_THRESHOLD_MS: 100 as const,
  
  /**
   * 系统正常运行时间阈值
   * @description 系统正常运行时间阈值（秒）
   */
  SYSTEM_UPTIME_THRESHOLD_S: 3600 as const,
  
  /**
   * 监控缓存过期时间
   * @description 监控缓存数据过期时间（毫秒）
   */
  MONITORING_CACHE_STALE_TIME_MS: 300000 as const, // 5分钟
  
} as const;

export type MonitoringSystemLimitKeys = keyof typeof MONITORING_SYSTEM_LIMITS;
export type MonitoringSystemLimits = typeof MONITORING_SYSTEM_LIMITS;

/**
 * 监控系统限制工具函数
 */
export const MonitoringSystemLimitUtils = {
  /**
   * 判断HTTP状态码是否为客户端错误
   */
  isClientError: (statusCode: number): boolean =>
    statusCode >= MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD,
  
  /**
   * 判断HTTP状态码是否为服务器错误
   */
  isServerError: (statusCode: number): boolean =>
    statusCode >= MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD,
  
  /**
   * 判断查询是否为慢查询
   */
  isSlowQuery: (duration: number): boolean =>
    duration > MONITORING_SYSTEM_LIMITS.SLOW_QUERY_THRESHOLD_MS,
  
  /**
   * 判断请求是否为慢请求
   */
  isSlowRequest: (duration: number): boolean =>
    duration > MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS,
  
  /**
   * 判断缓存操作是否需要优化
   */
  isCacheSlow: (duration: number): boolean =>
    duration > MONITORING_SYSTEM_LIMITS.CACHE_RESPONSE_THRESHOLD_MS,
  
  /**
   * 将秒数转换为毫秒
   */
  secondsToMs: (seconds: number): number => seconds * 1000,
  
  /**
   * 将毫秒转换为秒数
   */
  msToSeconds: (ms: number): number => ms / 1000,
  
  /**
   * 计算百分比（保留小数精度）
   */
  calculatePercentage: (value: number, total: number): number =>
    Math.round((value / total) * MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR) / 
    MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
    
} as const;