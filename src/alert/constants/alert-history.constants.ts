/**
 * 告警历史服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

// 📝 操作名称常量
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
  CALCULATE_STATISTICS: "calculateStatistics",
  VALIDATE_QUERY_PARAMS: "validateQueryParams",
  PROCESS_BATCH_RESULTS: "processBatchResults",
});

// 📢 消息常量
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

// 🔧 告警历史配置常量
export const ALERT_HISTORY_CONFIG = Object.freeze({
  ALERT_ID_PREFIX: "alrt_",
  DEFAULT_CLEANUP_DAYS: 90,
  DEFAULT_PAGE_LIMIT: 20,
  DEFAULT_RECENT_ALERTS_LIMIT: 10,
  MAX_PAGE_LIMIT: 100,
  MIN_PAGE_LIMIT: 1,
  MAX_CLEANUP_DAYS: 365,
  MIN_CLEANUP_DAYS: 1,
  ID_FORMAT_TEMPLATE: "alrt_{timestamp}_{random}",
  TIMESTAMP_BASE: 36,
  RANDOM_LENGTH: 6,
  RANDOM_START: 2,
  BATCH_SIZE_LIMIT: 1000,
  STATISTICS_CACHE_TTL_SECONDS: 300, // 5分钟
  CLEANUP_CHUNK_SIZE: 1000,
  BATCH_UPDATE_LIMIT: 1000,
});

// 📊 默认统计值常量
export const ALERT_HISTORY_DEFAULT_STATS = Object.freeze({
  activeAlerts: 0,
  criticalAlerts: 0,
  warningAlerts: 0,
  infoAlerts: 0,
  totalAlertsToday: 0,
  resolvedAlertsToday: 0,
  averageResolutionTime: 0,
});

// 🏷️ 告警状态映射常量
export const ALERT_STATUS_MAPPING = Object.freeze({
  FIRING: "firing",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
});

// 📈 告警历史指标常量
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

// 🔍 验证规则常量
export const ALERT_HISTORY_VALIDATION_RULES = Object.freeze({
  ALERT_ID_PATTERN: /^alrt_[a-z0-9]+_[a-z0-9]{6}$/,
  MIN_ALERT_ID_LENGTH: 15,
  MAX_ALERT_ID_LENGTH: 50,
  MIN_RULE_ID_LENGTH: 1,
  MAX_RULE_ID_LENGTH: 100,
  MIN_MESSAGE_LENGTH: 1,
  MAX_MESSAGE_LENGTH: 1000,
});

// ⏰ 时间配置常量
export const ALERT_HISTORY_TIME_CONFIG = Object.freeze({
  DEFAULT_QUERY_TIMEOUT_MS: 30000,
  BATCH_UPDATE_TIMEOUT_MS: 60000,
  CLEANUP_TIMEOUT_MS: 300000, // 5分钟
  STATISTICS_CALCULATION_TIMEOUT_MS: 60000,
  ALERT_CREATION_TIMEOUT_MS: 10000,
  ALERT_UPDATE_TIMEOUT_MS: 10000,
});

// 🚨 告警阈值常量
export const ALERT_HISTORY_THRESHOLDS = Object.freeze({
  MAX_ACTIVE_ALERTS: 10000,
  MAX_ALERTS_PER_RULE: 1000,
  MAX_BATCH_UPDATE_SIZE: 1000,
  CLEANUP_BATCH_SIZE: 1000,
  STATISTICS_REFRESH_INTERVAL_MS: 300000, // 5分钟
});

/**
 * 告警历史工具函数
 */
export class AlertHistoryUtil {
  /**
   * 生成告警ID
   * @returns 告警ID字符串
   */
  static generateAlertId(): string {
    const timestamp = Date.now().toString(ALERT_HISTORY_CONFIG.TIMESTAMP_BASE);
    const random = Math.random()
      .toString(ALERT_HISTORY_CONFIG.TIMESTAMP_BASE)
      .substring(
        ALERT_HISTORY_CONFIG.RANDOM_START,
        ALERT_HISTORY_CONFIG.RANDOM_START + ALERT_HISTORY_CONFIG.RANDOM_LENGTH,
      );
    return `${ALERT_HISTORY_CONFIG.ALERT_ID_PREFIX}${timestamp}_${random}`;
  }

  /**
   * 验证告警ID格式
   * @param alertId 告警ID
   * @returns 是否有效
   */
  static isValidAlertId(alertId: string): boolean {
    return (
      ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN.test(alertId) &&
      alertId.length >= ALERT_HISTORY_VALIDATION_RULES.MIN_ALERT_ID_LENGTH &&
      alertId.length <= ALERT_HISTORY_VALIDATION_RULES.MAX_ALERT_ID_LENGTH
    );
  }

  /**
   * 验证分页参数
   * @param page 页码
   * @param limit 每页数量
   * @returns 验证结果
   */
  static validatePaginationParams(
    page: number,
    limit: number,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (page < 1) {
      errors.push("页码必须大于0");
    }

    if (limit < ALERT_HISTORY_CONFIG.MIN_PAGE_LIMIT) {
      errors.push(`每页数量不能少于${ALERT_HISTORY_CONFIG.MIN_PAGE_LIMIT}`);
    }

    if (limit > ALERT_HISTORY_CONFIG.MAX_PAGE_LIMIT) {
      errors.push(`每页数量不能超过${ALERT_HISTORY_CONFIG.MAX_PAGE_LIMIT}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证清理天数
   * @param days 清理天数
   * @returns 是否有效
   */
  static isValidCleanupDays(days: number): boolean {
    return (
      days >= ALERT_HISTORY_CONFIG.MIN_CLEANUP_DAYS &&
      days <= ALERT_HISTORY_CONFIG.MAX_CLEANUP_DAYS
    );
  }

  /**
   * 计算分页信息
   * @param total 总数
   * @param page 当前页
   * @param limit 每页数量
   * @returns 分页信息
   */
  static calculatePagination(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      offset: (page - 1) * limit,
    };
  }

  /**
   * 格式化执行时间
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 执行时间（毫秒）
   */
  static calculateExecutionTime(startTime: Date, endTime: Date): number {
    return endTime.getTime() - startTime.getTime();
  }

  /**
   * 验证告警消息长度
   * @param message 告警消息
   * @returns 是否有效
   */
  static isValidAlertMessage(message: string): boolean {
    return (
      message.length >= ALERT_HISTORY_VALIDATION_RULES.MIN_MESSAGE_LENGTH &&
      message.length <= ALERT_HISTORY_VALIDATION_RULES.MAX_MESSAGE_LENGTH
    );
  }

  /**
   * 生成批量操作结果摘要
   * @param successCount 成功数量
   * @param failedCount 失败数量
   * @param errors 错误列表
   * @returns 结果摘要
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
    const successRate =
      totalProcessed > 0 ? (successCount / totalProcessed) * 100 : 0;

    return {
      totalProcessed,
      successRate: Math.round(successRate * 100) / 100,
      hasErrors: errors.length > 0,
      errorSummary: errors.length > 0 ? `${errors.length} 个错误` : "无错误",
    };
  }

  /**
   * 格式化统计数据
   * @param rawStats 原始统计数据
   * @returns 格式化后的统计数据
   */
  static formatStatistics(rawStats: any): any {
    return {
      ...ALERT_HISTORY_DEFAULT_STATS,
      ...rawStats,
      statisticsTime: new Date(),
    };
  }

  /**
   * 验证批量操作大小
   * @param batchSize 批量大小
   * @returns 是否有效
   */
  static isValidBatchSize(batchSize: number): boolean {
    return batchSize > 0 && batchSize <= ALERT_HISTORY_CONFIG.BATCH_SIZE_LIMIT;
  }

  /**
   * 生成查询缓存键
   * @param queryParams 查询参数
   * @returns 缓存键
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
}
