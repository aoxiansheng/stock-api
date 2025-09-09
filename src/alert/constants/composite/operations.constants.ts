/**
 * 操作配置常量
 * 🎯 应用层 - 统一管理所有业务操作的配置
 * 🔧 整合各领域层的操作常量，提供统一的操作定义
 */

import { ALERT_RULE_OPERATIONS, ALERT_RULE_MESSAGES, ALERT_RULE_METRICS } from '../domain/alert-rules.constants';
import { NOTIFICATION_OPERATIONS, NOTIFICATION_MESSAGES, NOTIFICATION_ERROR_TEMPLATES } from '../domain/notifications.constants';
import { ALERT_HISTORY_OPERATIONS, ALERT_HISTORY_MESSAGES, ALERT_HISTORY_METRICS } from '../domain/alert-history.constants';
import { deepFreeze } from "../../../common/utils/object-immutability.util";

/**
 * 统一操作常量
 * 整合所有领域的操作定义
 */
export const ALERT_OPERATIONS = deepFreeze({
  /**
   * 告警规则操作
   */
  RULES: {
    CREATE_RULE: "createRule",
    UPDATE_RULE: "updateRule",
    DELETE_RULE: "deleteRule",
    GET_RULES: "getRules",
    GET_RULE_BY_ID: "getRuleById",
    TOGGLE_RULE: "toggleRule",
    PROCESS_METRICS: "processMetrics",
    ACKNOWLEDGE_ALERT: "acknowledgeAlert",
    RESOLVE_ALERT: "resolveAlert",
    GET_STATS: "getStats",
    HANDLE_SYSTEM_EVENT: "handleSystemEvent",
    HANDLE_RULE_EVALUATION: "handleRuleEvaluation",
    EVALUATE_RULES_SCHEDULED: "evaluateRulesScheduled",
    RULE_CREATION_STARTED: "ruleCreationStarted",
    RULE_UPDATE_STARTED: "ruleUpdateStarted",
    RULE_DELETION_STARTED: "ruleDeletionStarted",
    RULE_EVALUATION_STARTED: "ruleEvaluationStarted",
  },

  /**
   * 通知系统操作
   */
  NOTIFICATIONS: NOTIFICATION_OPERATIONS,

  /**
   * 告警历史操作
   */
  HISTORY: ALERT_HISTORY_OPERATIONS,

  /**
   * 系统级操作
   */
  SYSTEM: {
    INITIALIZE_SERVICE: "initializeService",
    SHUTDOWN_SERVICE: "shutdownService",
    HEALTH_CHECK: "healthCheck",
    GET_SYSTEM_STATS: "getSystemStats",
    RESET_SYSTEM: "resetSystem",
    BACKUP_DATA: "backupData",
    RESTORE_DATA: "restoreData",
    CLEANUP_RESOURCES: "cleanupResources",
  },

  /**
   * 监控相关操作
   */
  MONITORING: {
    COLLECT_METRICS: "collectMetrics",
    GENERATE_REPORT: "generateReport",
    CHECK_SERVICE_HEALTH: "checkServiceHealth",
    MONITOR_PERFORMANCE: "monitorPerformance",
    ANALYZE_TRENDS: "analyzeTrends",
    ALERT_ON_ANOMALY: "alertOnAnomaly",
  },
});

/**
 * 统一消息常量
 * 整合所有领域的消息定义
 */
export const ALERT_MESSAGES = deepFreeze({
  /**
   * 告警规则消息
   */
  RULES: ALERT_RULE_MESSAGES,

  /**
   * 通知系统消息
   */
  NOTIFICATIONS: NOTIFICATION_MESSAGES,

  /**
   * 告警历史消息
   */
  HISTORY: ALERT_HISTORY_MESSAGES,

  /**
   * 系统级消息
   */
  SYSTEM: {
    // 成功消息
    SERVICE_INITIALIZED: "Alert服务初始化成功",
    SERVICE_SHUTDOWN: "Alert服务已关闭",
    HEALTH_CHECK_PASSED: "健康检查通过",
    SYSTEM_STATS_RETRIEVED: "系统统计获取成功",
    SYSTEM_RESET_COMPLETED: "系统重置完成",
    BACKUP_COMPLETED: "数据备份完成",
    RESTORE_COMPLETED: "数据恢复完成",
    CLEANUP_COMPLETED: "资源清理完成",

    // 错误消息
    INITIALIZATION_FAILED: "Alert服务初始化失败",
    SHUTDOWN_FAILED: "服务关闭失败",
    HEALTH_CHECK_FAILED: "健康检查失败",
    SYSTEM_STATS_FAILED: "系统统计获取失败",
    SYSTEM_RESET_FAILED: "系统重置失败",
    BACKUP_FAILED: "数据备份失败",
    RESTORE_FAILED: "数据恢复失败",
    CLEANUP_FAILED: "资源清理失败",

    // 信息消息
    SERVICE_STARTING: "Alert服务启动中...",
    SERVICE_STOPPING: "Alert服务停止中...",
    HEALTH_CHECK_STARTED: "开始健康检查",
    SYSTEM_STATS_CALCULATING: "正在计算系统统计",
    SYSTEM_RESET_STARTED: "开始系统重置",
    BACKUP_STARTED: "开始数据备份",
    RESTORE_STARTED: "开始数据恢复", 
    CLEANUP_STARTED: "开始资源清理",
  },

  /**
   * 监控相关消息
   */
  MONITORING: {
    // 成功消息
    METRICS_COLLECTED: "指标收集完成",
    REPORT_GENERATED: "报告生成完成",
    SERVICE_HEALTH_OK: "服务健康状态正常",
    PERFORMANCE_MONITORED: "性能监控完成",
    TRENDS_ANALYZED: "趋势分析完成",
    ANOMALY_DETECTED: "检测到异常",

    // 错误消息
    METRICS_COLLECTION_FAILED: "指标收集失败",
    REPORT_GENERATION_FAILED: "报告生成失败",
    SERVICE_HEALTH_FAILED: "服务健康检查失败",
    PERFORMANCE_MONITORING_FAILED: "性能监控失败",
    TRENDS_ANALYSIS_FAILED: "趋势分析失败",
    ANOMALY_DETECTION_FAILED: "异常检测失败",

    // 信息消息
    METRICS_COLLECTION_STARTED: "开始收集指标",
    REPORT_GENERATION_STARTED: "开始生成报告",
    SERVICE_HEALTH_CHECKING: "正在检查服务健康",
    PERFORMANCE_MONITORING_STARTED: "开始性能监控",
    TRENDS_ANALYSIS_STARTED: "开始趋势分析",
    ANOMALY_DETECTION_STARTED: "开始异常检测",
  },

  /**
   * 通用系统消息
   */
  COMMON: {
    OPERATION_STARTED: "操作已开始",
    OPERATION_COMPLETED: "操作已完成",
    OPERATION_FAILED: "操作失败",
    OPERATION_CANCELLED: "操作已取消",
    OPERATION_TIMEOUT: "操作超时",
    INVALID_PARAMETERS: "无效的参数",
    INSUFFICIENT_PERMISSIONS: "权限不足",
    RESOURCE_NOT_FOUND: "资源未找到",
    RESOURCE_ALREADY_EXISTS: "资源已存在",
    SERVICE_UNAVAILABLE: "服务不可用",
  },
});

/**
 * 统一指标常量
 * 整合所有领域的指标定义
 */
export const ALERT_METRICS = deepFreeze({
  /**
   * 告警规则指标
   */
  RULES: ALERT_RULE_METRICS,

  /**
   * 告警历史指标
   */
  HISTORY: ALERT_HISTORY_METRICS,

  /**
   * 系统级指标
   */
  SYSTEM: {
    // 服务指标
    SERVICE_UPTIME: "alert_service_uptime_seconds",
    SERVICE_RESTART_COUNT: "alert_service_restart_count",
    TOTAL_MEMORY_USAGE: "alert_service_memory_usage_bytes",
    CPU_USAGE_PERCENTAGE: "alert_service_cpu_usage_percent",

    // 性能指标
    AVERAGE_RESPONSE_TIME: "alert_avg_response_time_ms",
    REQUEST_RATE: "alert_request_rate_per_second",
    ERROR_RATE: "alert_error_rate_percent",
    THROUGHPUT: "alert_throughput_operations_per_second",

    // 资源指标
    DATABASE_CONNECTION_COUNT: "alert_db_connection_count",
    CACHE_HIT_RATE: "alert_cache_hit_rate_percent",
    QUEUE_SIZE: "alert_queue_size",
    DISK_USAGE: "alert_disk_usage_bytes",
  },

  /**
   * 业务指标
   */
  BUSINESS: {
    // 告警业务指标
    TOTAL_ALERT_COUNT: "alert_total_count",
    ACTIVE_ALERT_COUNT: "alert_active_count",
    RESOLVED_ALERT_COUNT: "alert_resolved_count",
    FALSE_POSITIVE_RATE: "alert_false_positive_rate_percent",

    // 规则业务指标
    TOTAL_RULE_COUNT: "alert_rule_total_count",
    ACTIVE_RULE_COUNT: "alert_rule_active_count",
    TRIGGERED_RULE_COUNT: "alert_rule_triggered_count",
    RULE_EFFICIENCY_RATE: "alert_rule_efficiency_rate_percent",

    // 通知业务指标
    NOTIFICATION_SUCCESS_RATE: "alert_notification_success_rate_percent",
    NOTIFICATION_DELIVERY_TIME: "alert_notification_delivery_time_ms",
    NOTIFICATION_RETRY_COUNT: "alert_notification_retry_count",
    CHANNEL_AVAILABILITY_RATE: "alert_channel_availability_rate_percent",
  },
});

/**
 * 错误消息模板常量
 * 整合所有领域的错误模板
 */
export const ALERT_ERROR_TEMPLATES = deepFreeze({
  /**
   * 通知错误模板
   */
  NOTIFICATIONS: NOTIFICATION_ERROR_TEMPLATES,

  /**
   * 系统错误模板
   */
  SYSTEM: {
    SERVICE_INITIALIZATION_ERROR: "服务初始化失败: {error}",
    OPERATION_FAILED: "操作 {operation} 失败: {error}",
    RESOURCE_OPERATION_FAILED: "资源 {resource} 操作 {operation} 失败: {error}",
    PARAMETER_VALIDATION_ERROR: "参数验证失败: {field} - {error}",
    TIMEOUT_ERROR: "操作 {operation} 超时: 耗时 {duration}ms，超过限制 {timeout}ms",
    PERMISSION_DENIED: "权限不足: 无法执行操作 {operation}",
    RESOURCE_NOT_FOUND: "资源未找到: {resourceType} ID {resourceId}",
    CONCURRENT_MODIFICATION: "并发修改错误: 资源 {resource} 已被其他操作修改",
  },

  /**
   * 业务错误模板
   */
  BUSINESS: {
    RULE_LIMIT_EXCEEDED: "规则数量超限: 用户 {userId} 已创建 {current}/{max} 个规则",
    ALERT_STORM_DETECTED: "告警风暴检测: 规则 {ruleId} 在 {timeWindow} 内触发了 {count} 次告警",
    QUOTA_EXCEEDED: "配额超限: {quotaType} 已使用 {used}/{total}",
    DEPENDENCY_ERROR: "依赖错误: {service} 服务不可用，影响操作 {operation}",
  },
});

/**
 * 操作配置常量
 */
export const OPERATION_CONFIG = deepFreeze({
  /**
   * 操作超时配置（毫秒）
   */
  TIMEOUTS: {
    // 快速操作
    QUICK_OPERATION: 5000,        // 5秒
    // 标准操作
    STANDARD_OPERATION: 30000,    // 30秒
    // 长时间操作
    LONG_OPERATION: 300000,       // 5分钟
    // 批量操作
    BATCH_OPERATION: 600000,      // 10分钟
  },

  /**
   * 重试配置
   */
  RETRY: {
    // 快速重试 - 用于网络请求等
    QUICK_RETRY: {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 5000,
    },
    // 标准重试 - 用于业务操作
    STANDARD_RETRY: {
      maxAttempts: 5,
      initialDelay: 2000,
      backoffMultiplier: 2,
      maxDelay: 10000,
    },
    // 持久重试 - 用于关键操作
    PERSISTENT_RETRY: {
      maxAttempts: 10,
      initialDelay: 5000,
      backoffMultiplier: 1.5,
      maxDelay: 30000,
    },
  },

  /**
   * 批量操作配置
   */
  BATCH: {
    // 小批量
    SMALL_BATCH_SIZE: 10,
    // 标准批量
    STANDARD_BATCH_SIZE: 50,
    // 大批量
    LARGE_BATCH_SIZE: 100,
    // 最大批量
    MAX_BATCH_SIZE: 1000,
  },

  /**
   * 并发控制配置
   */
  CONCURRENCY: {
    // 默认并发数
    DEFAULT_CONCURRENT_OPERATIONS: 5,
    // 最大并发数
    MAX_CONCURRENT_OPERATIONS: 20,
    // 队列大小
    OPERATION_QUEUE_SIZE: 100,
  },
});

/**
 * 操作工具类
 */
export class OperationUtil {
  /**
   * 获取操作的完整名称（包含模块前缀）
   */
  static getFullOperationName(module: string, operation: string): string {
    return `${module}.${operation}`;
  }

  /**
   * 根据操作类型获取超时时间
   */
  static getOperationTimeout(operationType: 'quick' | 'standard' | 'long' | 'batch'): number {
    const timeoutMap = {
      quick: OPERATION_CONFIG.TIMEOUTS.QUICK_OPERATION,
      standard: OPERATION_CONFIG.TIMEOUTS.STANDARD_OPERATION,
      long: OPERATION_CONFIG.TIMEOUTS.LONG_OPERATION,
      batch: OPERATION_CONFIG.TIMEOUTS.BATCH_OPERATION,
    };
    return timeoutMap[operationType];
  }

  /**
   * 根据重试策略获取重试配置
   */
  static getRetryConfig(strategy: 'quick' | 'standard' | 'persistent') {
    const configMap = {
      quick: OPERATION_CONFIG.RETRY.QUICK_RETRY,
      standard: OPERATION_CONFIG.RETRY.STANDARD_RETRY,
      persistent: OPERATION_CONFIG.RETRY.PERSISTENT_RETRY,
    };
    return { ...configMap[strategy] };
  }

  /**
   * 根据数据量获取合适的批量大小
   */
  static getBatchSize(dataCount: number): number {
    if (dataCount <= OPERATION_CONFIG.BATCH.SMALL_BATCH_SIZE) {
      return OPERATION_CONFIG.BATCH.SMALL_BATCH_SIZE;
    }
    if (dataCount <= OPERATION_CONFIG.BATCH.STANDARD_BATCH_SIZE) {
      return OPERATION_CONFIG.BATCH.STANDARD_BATCH_SIZE;
    }
    if (dataCount <= OPERATION_CONFIG.BATCH.LARGE_BATCH_SIZE) {
      return OPERATION_CONFIG.BATCH.LARGE_BATCH_SIZE;
    }
    return OPERATION_CONFIG.BATCH.MAX_BATCH_SIZE;
  }

  /**
   * 生成操作上下文信息
   */
  static createOperationContext(
    module: string,
    operation: string,
    startTime: number = Date.now()
  ): {
    id: string;
    fullName: string;
    module: string;
    operation: string;
    startTime: number;
    timeout: number;
  } {
    return {
      id: `${module}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fullName: this.getFullOperationName(module, operation),
      module,
      operation,
      startTime,
      timeout: this.getOperationTimeout('standard'),
    };
  }

  /**
   * 生成错误消息
   */
  static generateErrorMessage(
    templateCategory: keyof typeof ALERT_ERROR_TEMPLATES,
    templateKey: string,
    params: Record<string, any>
  ): string {
    const templates = ALERT_ERROR_TEMPLATES[templateCategory];
    if (!templates || !templates[templateKey]) {
      return `未知错误: ${templateCategory}.${templateKey}`;
    }

    const template = templates[templateKey];
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 检查操作是否超时
   */
  static isOperationTimeout(startTime: number, timeout: number): boolean {
    return Date.now() - startTime > timeout;
  }

  /**
   * 计算操作执行时间
   */
  static calculateExecutionTime(startTime: number, endTime: number = Date.now()): number {
    return endTime - startTime;
  }
}

/**
 * 类型定义
 */
export type AlertOperations = typeof ALERT_OPERATIONS;
export type AlertMessages = typeof ALERT_MESSAGES;
export type AlertMetrics = typeof ALERT_METRICS;
export type OperationConfig = typeof OPERATION_CONFIG;