/**
 * 告警历史领域常量
 * 🎯 领域层 - 告警历史相关的业务常量
 * 📚 基于核心层构建，专注于历史记录业务逻辑
 */

import { CORE_VALUES } from '../core/values.constants';
import { CORE_LIMITS } from '../core/limits.constants';
import { CORE_PATTERNS, STRING_FORMATS } from '../core/patterns.constants';
import { CORE_TIMEOUTS } from '../core/timeouts.constants';

/**
 * 告警历史常量
 */
export const ALERT_HISTORY_CONSTANTS = Object.freeze({
  /**
   * 历史记录标识符配置
   */
  IDENTIFIERS: {
    ID_PREFIX: "alrt_",
    ID_TEMPLATE: STRING_FORMATS.ID_TEMPLATES.ALERT_HISTORY,
    ID_PATTERN: CORE_PATTERNS.ID_FORMATS.ALERT_HISTORY,
    TIMESTAMP_BASE: CORE_VALUES.RADIX.BASE_36,
    RANDOM_LENGTH: CORE_LIMITS.ID_LENGTH.RANDOM_PART,                   // 6
    RANDOM_START: 2,
  },

  /**
   * 历史记录验证规则
   */
  VALIDATION: {
    // 告警ID验证
    ALERT_ID_PATTERN: CORE_PATTERNS.ID_FORMATS.ALERT_HISTORY,
    MIN_ALERT_ID_LENGTH: CORE_LIMITS.ID_LENGTH.TYPICAL_MIN,            // 15
    MAX_ALERT_ID_LENGTH: CORE_LIMITS.ID_LENGTH.TYPICAL_MAX,            // 50
    
    // 规则ID验证
    MIN_RULE_ID_LENGTH: CORE_LIMITS.ID_LENGTH.MIN,                     // 1
    MAX_RULE_ID_LENGTH: CORE_LIMITS.ID_LENGTH.MAX,                     // 100
    
    // 消息验证
    MIN_MESSAGE_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,          // 1
    MAX_MESSAGE_LENGTH: CORE_LIMITS.STRING_LENGTH.MESSAGE_MAX,         // 1000
  },

  /**
   * 历史记录业务限制
   */
  BUSINESS_LIMITS: {
    // 批量操作限制
    BATCH_SIZE_LIMIT: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE,     // 1000
    MAX_BATCH_UPDATE_SIZE: CORE_LIMITS.BATCH_LIMITS.MAX_BATCH_UPDATE,  // 1000
    CLEANUP_BATCH_SIZE: CORE_LIMITS.BATCH_LIMITS.CLEANUP_BATCH_SIZE,   // 1000
    
    // 查询限制
    MIN_PAGE_LIMIT: CORE_VALUES.QUANTITIES.ONE,                        // 1
    DEFAULT_RECENT_ALERTS_LIMIT: CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE, // 10
    
    // 活跃告警限制
    MAX_ACTIVE_ALERTS: CORE_LIMITS.OBJECT_LIMITS.MAX_ACTIVE_ALERTS,    // 10000
    MAX_ALERTS_PER_RULE: CORE_LIMITS.BATCH_LIMITS.MAX_ALERTS_PER_RULE, // 1000
  },

  /**
   * 历史记录时间配置
   */
  TIME_CONFIG: {
    // 数据保留配置
    DEFAULT_CLEANUP_DAYS: 90,
    MIN_CLEANUP_DAYS: CORE_VALUES.QUANTITIES.ONE,                      // 1
    MAX_CLEANUP_DAYS: 365,
    
    // 缓存配置
    STATISTICS_CACHE_TTL_SECONDS: CORE_TIMEOUTS.CACHE_TTL_SECONDS.STATS, // 300秒
    
    // 操作超时配置
    DB_QUERY_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.DB_QUERY_TIMEOUT,        // 5000ms
    BATCH_UPDATE_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.DB_BATCH_TIMEOUT,    // 60000ms
    CLEANUP_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.CLEANUP_OPERATION,        // 300000ms
    STATISTICS_CALCULATION_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.STATISTICS_CALCULATION, // 60000ms
    ALERT_CREATION_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.DB_UPDATE_TIMEOUT, // 10000ms
    ALERT_UPDATE_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.DB_UPDATE_TIMEOUT,   // 10000ms
    
    // 统计刷新间隔
    STATISTICS_REFRESH_INTERVAL_MS: CORE_VALUES.TIME_MILLISECONDS.FIVE_MINUTES, // 300000ms
  },

  /**
   * TTL配置
   */
  TTL_CONFIG: {
    // 数据库TTL
    ALERT_HISTORY_SECONDS: CORE_TIMEOUTS.DB_TTL_SECONDS.ALERT_HISTORY,  // 90天
    NOTIFICATION_LOG_SECONDS: CORE_TIMEOUTS.DB_TTL_SECONDS.NOTIFICATION_LOG, // 30天
  },
});

/**
 * 告警历史操作常量
 */
export const ALERT_HISTORY_OPERATIONS = Object.freeze({
  CREATE_ALERT: "createAlert",
  UPDATE_ALERT_STATUS: "updateAlertStatus",
  QUERY_ALERTS: "queryAlerts",
  GET_ACTIVE_ALERTS: "getActiveAlerts", 
  GET_ALERT_STATS: "getAlertStats",
  GET_ALERT_BY_ID: "getAlertById",
  CLEANUP_EXPIRED_ALERTS: "cleanupExpiredAlerts",
  BATCH_UPDATE_ALERT_STATUS: "batchUpdateAlertStatus",
  GET_ALERT_COUNT_BY_STATUS: "getAlertCountByStatus",
  GET_RECENT_ALERTS: "getRecentAlerts",
  GET_SERVICE_STATS: "getServiceStats",
  GENERATE_ALERT_ID: "generateAlertId",
  VALIDATE_QUERY_PARAMS: "validateQueryParams",
  PROCESS_BATCH_RESULTS: "processBatchResults",
});

/**
 * 告警历史消息常量
 */
export const ALERT_HISTORY_MESSAGES = Object.freeze({
  // 成功消息
  ALERT_CREATED: "创建告警记录成功",
  ALERT_STATUS_UPDATED: "更新告警状态成功",
  ALERTS_QUERIED: "查询告警记录成功",
  ACTIVE_ALERTS_RETRIEVED: "获取活跃告警成功",
  ALERT_STATS_RETRIEVED: "获取告警统计成功",
  ALERT_RETRIEVED: "获取告警记录成功",
  CLEANUP_COMPLETED: "清理过期告警成功",
  BATCH_UPDATE_COMPLETED: "批量更新告警状态完成",
  ALERT_COUNT_STATS_RETRIEVED: "告警数量统计获取完成",
  RECENT_ALERTS_RETRIEVED: "最近告警记录获取完成",
  SERVICE_STATS_RETRIEVED: "服务统计信息获取完成",

  // 错误消息
  CREATE_ALERT_FAILED: "创建告警记录失败",
  UPDATE_ALERT_STATUS_FAILED: "更新告警状态失败",
  QUERY_ALERTS_FAILED: "查询告警记录失败",
  GET_ACTIVE_ALERTS_FAILED: "获取活跃告警失败",
  GET_ALERT_STATS_FAILED: "获取告警统计失败",
  GET_ALERT_FAILED: "获取告警失败",
  CLEANUP_FAILED: "清理过期告警失败",
  BATCH_UPDATE_FAILED: "批量更新告警状态失败",
  GET_ALERT_COUNT_STATS_FAILED: "获取告警数量统计失败",
  GET_RECENT_ALERTS_FAILED: "获取最近告警记录失败",
  ALERT_ID_GENERATION_FAILED: "告警ID生成失败",
  STATISTICS_CALCULATION_FAILED: "统计计算失败",

  // 信息消息  
  CLEANUP_STARTED: "开始清理过期告警",
  BATCH_UPDATE_STARTED: "开始批量更新告警状态",
  ALERT_COUNT_STATS_CALCULATION_STARTED: "开始获取告警数量统计",
  RECENT_ALERTS_LOOKUP_STARTED: "开始获取最近的告警记录",
  SERVICE_STATS_REQUESTED: "获取服务统计信息",
  ALERT_CREATION_STARTED: "开始创建告警记录",
  ALERT_STATUS_UPDATE_STARTED: "开始更新告警状态",
  ALERTS_QUERY_STARTED: "开始查询告警记录",
  ACTIVE_ALERTS_LOOKUP_STARTED: "开始获取活跃告警",
  ALERT_STATS_CALCULATION_STARTED: "开始计算告警统计",
  ALERT_LOOKUP_STARTED: "开始获取告警记录",

  // 警告消息
  NO_ALERTS_FOUND: "未找到告警记录",
  PARTIAL_BATCH_UPDATE_SUCCESS: "批量更新部分成功", 
  CLEANUP_NO_EXPIRED_ALERTS: "没有过期告警需要清理",
  STATISTICS_INCOMPLETE: "统计数据不完整",
  QUERY_LIMIT_EXCEEDED: "查询限制超出范围",
});

/**
 * 告警历史指标常量
 */
export const ALERT_HISTORY_METRICS = Object.freeze({
  ALERT_CREATION_COUNT: "alert_history_creation_count",
  ALERT_UPDATE_COUNT: "alert_history_update_count",
  ALERT_QUERY_COUNT: "alert_history_query_count",
  CLEANUP_EXECUTION_COUNT: "alert_history_cleanup_count",
  BATCH_UPDATE_COUNT: "alert_history_batch_update_count",
  AVERAGE_QUERY_TIME: "alert_history_avg_query_time",
  AVERAGE_UPDATE_TIME: "alert_history_avg_update_time",
  AVERAGE_CLEANUP_TIME: "alert_history_avg_cleanup_time",
  ACTIVE_ALERTS_COUNT: "alert_history_active_alerts_count",
  TOTAL_ALERTS_COUNT: "alert_history_total_alerts_count",
});

/**
 * 告警历史工具类
 */
export class AlertHistoryUtil {
  /**
   * 生成告警历史ID
   */
  static generateAlertId(): string {
    const timestamp = Date.now().toString(ALERT_HISTORY_CONSTANTS.IDENTIFIERS.TIMESTAMP_BASE);
    const random = Math.random()
      .toString(ALERT_HISTORY_CONSTANTS.IDENTIFIERS.TIMESTAMP_BASE)
      .substring(
        ALERT_HISTORY_CONSTANTS.IDENTIFIERS.RANDOM_START,
        ALERT_HISTORY_CONSTANTS.IDENTIFIERS.RANDOM_START + ALERT_HISTORY_CONSTANTS.IDENTIFIERS.RANDOM_LENGTH,
      );
    return `${ALERT_HISTORY_CONSTANTS.IDENTIFIERS.ID_PREFIX}${timestamp}_${random}`;
  }

  /**
   * 验证告警ID格式
   */
  static isValidAlertId(alertId: string): boolean {
    return (
      ALERT_HISTORY_CONSTANTS.VALIDATION.ALERT_ID_PATTERN.test(alertId) &&
      alertId.length >= ALERT_HISTORY_CONSTANTS.VALIDATION.MIN_ALERT_ID_LENGTH &&
      alertId.length <= ALERT_HISTORY_CONSTANTS.VALIDATION.MAX_ALERT_ID_LENGTH
    );
  }

  /**
   * 验证告警消息长度
   */
  static isValidAlertMessage(message: string): boolean {
    return (
      message.length >= ALERT_HISTORY_CONSTANTS.VALIDATION.MIN_MESSAGE_LENGTH &&
      message.length <= ALERT_HISTORY_CONSTANTS.VALIDATION.MAX_MESSAGE_LENGTH
    );
  }

  /**
   * 验证清理天数
   */
  static isValidCleanupDays(days: number): boolean {
    return (
      days >= ALERT_HISTORY_CONSTANTS.TIME_CONFIG.MIN_CLEANUP_DAYS &&
      days <= ALERT_HISTORY_CONSTANTS.TIME_CONFIG.MAX_CLEANUP_DAYS
    );
  }

  /**
   * 验证批量操作大小
   */
  static isValidBatchSize(batchSize: number): boolean {
    return batchSize > 0 && batchSize <= ALERT_HISTORY_CONSTANTS.BUSINESS_LIMITS.BATCH_SIZE_LIMIT;
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(page: number, limit: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (page < 1) {
      errors.push("页码必须大于0");
    }

    if (limit < ALERT_HISTORY_CONSTANTS.BUSINESS_LIMITS.MIN_PAGE_LIMIT) {
      errors.push(`每页数量不能少于${ALERT_HISTORY_CONSTANTS.BUSINESS_LIMITS.MIN_PAGE_LIMIT}`);
    }

    // 这里可以引用后面定义的默认值配置
    const maxLimit = 100; // 临时值，实际应该从defaults中获取
    if (limit > maxLimit) {
      errors.push(`每页数量不能超过${maxLimit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 计算执行时间
   */
  static calculateExecutionTime(startTime: Date, endTime: Date): number {
    return endTime.getTime() - startTime.getTime();
  }

  /**
   * 生成批量操作结果摘要
   */
  static generateBatchResultSummary(
    successCount: number,
    failedCount: number,
    errors: string[],
  ): {
    totalProcessed: number;
    successRate: number;
    hasErrors: boolean;
    errorSummary: string;
  } {
    const totalProcessed = successCount + failedCount;
    const successRate = totalProcessed > 0 ? (successCount / totalProcessed) * 100 : 0;

    return {
      totalProcessed,
      successRate: Math.round(successRate * 100) / 100,
      hasErrors: errors.length > 0,
      errorSummary: errors.length > 0 ? `${errors.length} 个错误` : "无错误",
    };
  }

  /**
   * 生成查询缓存键
   */
  static generateQueryCacheKey(queryParams: any): string {
    const sortedParams = Object.keys(queryParams)
      .sort()
      .reduce((result, key) => {
        result[key] = queryParams[key];
        return result;
      }, {} as any);

    return `alert_query_${Buffer.from(JSON.stringify(sortedParams)).toString("base64")}`;
  }

  /**
   * 格式化统计数据
   */
  static formatStatistics(rawStats: any): any {
    // 这里可以应用默认值
    return {
      activeAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      infoAlerts: 0,
      totalAlertsToday: 0,
      resolvedAlertsToday: 0,
      averageResolutionTime: 0,
      ...rawStats,
      statisticsTime: new Date(),
    };
  }
}

/**
 * 类型定义
 */
export type AlertHistoryConstants = typeof ALERT_HISTORY_CONSTANTS;