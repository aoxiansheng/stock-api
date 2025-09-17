/**
 * 监控系统限制常量
 *
 * ✅ 去重完成！重复配置已移除
 * ==========================================
 * 已移除的重复配置：
 * ❌ MAX_BUFFER_SIZE → 使用 MONITORING_UNIFIED_LIMITS_CONSTANTS.SYSTEM_LIMITS.MAX_BUFFER_SIZE
 * ❌ MAX_QUEUE_SIZE → 使用 MONITORING_UNIFIED_LIMITS_CONSTANTS.SYSTEM_LIMITS.MAX_QUEUE_SIZE  
 * ❌ DEFAULT_BATCH_SIZE → 使用 MONITORING_UNIFIED_LIMITS_CONSTANTS.DATA_BATCH.STANDARD
 * ❌ DEFAULT_FLUSH_INTERVAL_MS → 使用 MONITORING_UNIFIED_LIMITS_CONSTANTS.BATCH_INTERVALS.FAST
 *
 * 保留的配置：
 * ✅ 性能阈值常量 (SLOW_REQUEST_THRESHOLD_MS, API_RESPONSE_TIME_MS等)
 * ✅ 时间常量 (DAY_IN_MS, HOUR_IN_MS等)
 * ✅ 计算精度常量 (PERCENTAGE_MULTIPLIER等)
 * ✅ HTTP状态码阈值
 * ✅ 非重复的业务配置
 *
 * @description 定义系统性能阈值和限制值，已清理重复配置
 * @version 2.0.0 - 去重重构版本
 * @since 2025-09-05
 * @author Claude Code
 */

import { MONITORING_UNIFIED_LIMITS_CONSTANTS } from "../../config/unified/monitoring-unified-limits.config";

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
   * 慢查询阈值 - 零抽象架构
   * @description 数据库查询超过此值视为慢查询
   */
  SLOW_QUERY_THRESHOLD_MS: 500, // 500ms - 数据库查询慢查询阈值

  /**
   * 慢请求阈值 - 零抽象架构
   * @description HTTP请求超过此值视为慢请求
   */
  SLOW_REQUEST_THRESHOLD_MS: 1000, // 1000ms - HTTP请求慢请求阈值

  /**
   * 缓存响应阈值 - 零抽象架构
   * @description 缓存操作超过此值需要优化
   */
  CACHE_RESPONSE_THRESHOLD_MS: 50, // 50ms - 缓存操作响应时间阈值

  /**
   * API响应时间阈值 - 零抽象架构
   * @description API响应时间基准阈值
   */
  API_RESPONSE_TIME_MS: 100, // 100ms - API优秀响应时间阈值

  // ========================= 系统限制（非重复配置） =========================
  /**
   * 最大批量大小 - 保留用于向后兼容
   * @description 批处理操作的最大数量
   */
  MAX_BATCH_SIZE: 100 as const,

  /**
   * 最大键长度
   * @description 缓存键名最大长度限制
   */
  MAX_KEY_LENGTH: 100 as const,

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

  // ========================= 时间常量（毫秒） =========================
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

  // ========================= 批处理配置（非重复配置） =========================
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
    (Math.round(
      (value / total) * MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR,
    ) /
      MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR) *
    MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
} as const;
