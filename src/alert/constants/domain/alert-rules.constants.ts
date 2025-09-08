/**
 * 告警规则领域常量
 * 🎯 领域层 - 告警规则相关的业务常量
 * 🔧 基于核心层构建，专注于告警规则业务逻辑
 */

import { CORE_VALUES } from '../core/values.constants';
import { CORE_LIMITS } from '../core/limits.constants';
import { CORE_PATTERNS, STRING_FORMATS } from '../core/patterns.constants';
import { CORE_TIMEOUTS } from '../core/timeouts.constants';

/**
 * 告警规则常量
 */
export const ALERT_RULE_CONSTANTS = Object.freeze({
  /**
   * 规则标识符配置
   */
  IDENTIFIERS: {
    ID_PREFIX: "rule_",
    ID_TEMPLATE: STRING_FORMATS.ID_TEMPLATES.ALERT_RULE,
    ID_PATTERN: CORE_PATTERNS.ID_FORMATS.ALERT_RULE,
    ID_TIMESTAMP_BASE: CORE_VALUES.RADIX.BASE_36,
    ID_RANDOM_LENGTH: CORE_LIMITS.ID_LENGTH.RANDOM_PART,    // 6
    ID_RANDOM_START: 2,
  },

  /**
   * 规则验证规则
   */
  VALIDATION: {
    // 名称验证
    NAME_PATTERN: CORE_PATTERNS.TEXT.GENERAL_NAME,
    NAME_MIN_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,  // 1
    NAME_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.NAME_MAX,    // 100
    
    // 描述验证
    DESCRIPTION_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.DESCRIPTION_MAX, // 500
    
    // 指标名称验证
    METRIC_NAME_PATTERN: CORE_PATTERNS.TEXT.IDENTIFIER,
    
    // 标签验证
    TAG_PATTERN: CORE_PATTERNS.TEXT.TAG,
    MAX_TAGS_COUNT: CORE_LIMITS.OBJECT_LIMITS.MAX_TAGS_COUNT,          // 10
    TAG_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.TAG_MAX,                 // 50
    
    // 阈值验证
    THRESHOLD_MIN: CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MIN,            // 0
    THRESHOLD_MAX: CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MAX,            // MAX_SAFE_INTEGER
  },

  /**
   * 规则业务限制
   */
  BUSINESS_LIMITS: {
    MAX_RULES_PER_USER: CORE_LIMITS.OBJECT_LIMITS.MAX_RULES_PER_USER,        // 100
    MAX_CONDITIONS_PER_RULE: CORE_LIMITS.OBJECT_LIMITS.MAX_CONDITIONS_PER_RULE, // 10
    MAX_ACTIONS_PER_RULE: CORE_LIMITS.OBJECT_LIMITS.MAX_ACTIONS_PER_RULE,    // 5
  },

  /**
   * 规则时间配置
   */
  TIME_CONFIG: {
    // 持续时间配置
    DURATION_DEFAULT: CORE_TIMEOUTS.BASIC_SECONDS.DURATION_DEFAULT,    // 60秒
    DURATION_MIN: CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MIN,            // 1秒
    DURATION_MAX: CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MAX,            // 3600秒
    
    // 冷却时间配置
    COOLDOWN_DEFAULT: CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_DEFAULT,    // 300秒
    COOLDOWN_MIN: CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MIN,            // 60秒
    COOLDOWN_MAX: CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MAX,            // 86400秒
    
    // 评估间隔配置
    EVALUATION_DEFAULT_MS: CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.DEFAULT,     // 60000ms
    EVALUATION_MIN_MS: CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.MIN,             // 1000ms
    EVALUATION_MAX_MS: CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.MAX,             // 600000ms
  },

  /**
   * 规则缓存配置
   */
  CACHE_CONFIG: {
    COOLDOWN_KEY_PATTERN: STRING_FORMATS.CACHE_KEY_PATTERNS.RULE_COOLDOWN,   // "alert:cooldown:{ruleId}"
    ACTIVE_ALERTS_KEY_PATTERN: STRING_FORMATS.CACHE_KEY_PATTERNS.ACTIVE_ALERTS, // "alert:active:{ruleId}"
    STATS_KEY_PATTERN: STRING_FORMATS.CACHE_KEY_PATTERNS.RULE_STATS,         // "alert:stats:{ruleId}"
    RULE_TTL_SECONDS: CORE_TIMEOUTS.CACHE_TTL_SECONDS.RULE,                  // 1800秒
  },

  /**
   * 规则操作配置
   */
  OPERATIONS: {
    // 支持的操作符
    VALID_OPERATORS: ["gt", "lt", "eq", "gte", "lte", "ne"] as const,
    
    // 操作符符号映射
    OPERATOR_SYMBOLS: {
      gt: ">",
      gte: ">=", 
      lt: "<",
      lte: "<=",
      eq: "=",
      ne: "!=",
    } as const,
    
    // 默认操作符
    DEFAULT_OPERATOR: "gt" as const,
  },
});

/**
 * 告警规则操作常量
 */
export const ALERT_RULE_OPERATIONS = Object.freeze({
  CREATE_RULE: "createRule",
  UPDATE_RULE: "updateRule", 
  DELETE_RULE: "deleteRule",
  GET_RULES: "getRules",
  GET_RULE_BY_ID: "getRuleById",
  TOGGLE_RULE: "toggleRule",
  EVALUATE_RULES_SCHEDULED: "evaluateRulesScheduled",
  HANDLE_RULE_EVALUATION: "handleRuleEvaluation",
  PROCESS_METRICS: "processMetrics",
  ACKNOWLEDGE_ALERT: "acknowledgeAlert",
  RESOLVE_ALERT: "resolveAlert",
  GET_STATS: "getStats",
  HANDLE_SYSTEM_EVENT: "handleSystemEvent",
});

/**
 * 告警规则消息常量
 */
export const ALERT_RULE_MESSAGES = Object.freeze({
  // 成功消息
  RULE_CREATED: "告警规则创建成功",
  RULE_UPDATED: "告警规则更新成功", 
  RULE_DELETED: "告警规则删除成功",
  RULE_STATUS_TOGGLED: "切换告警规则状态成功",
  
  // 错误消息
  CREATE_RULE_DB_FAILED: "创建告警规则数据库操作失败",
  UPDATE_RULE_FAILED: "更新告警规则失败",
  DELETE_RULE_FAILED: "删除告警规则失败",
  GET_RULES_FAILED: "获取所有告警规则失败",
  GET_RULE_FAILED: "获取单个告警规则失败",
  TOGGLE_RULE_FAILED: "切换告警规则状态失败",
  RULE_EVALUATION_FAILED: "规则评估失败",
  
  // 信息消息
  RULE_CREATION_STARTED: "开始创建告警规则",
  RULE_UPDATE_STARTED: "开始更新告警规则",
  RULE_DELETION_STARTED: "开始删除告警规则",
  RULE_EVALUATION_STARTED: "开始规则评估",
  
  // 警告消息
  RULE_STATUS_UNCHANGED: "尝试切换不存在的规则状态或状态未改变",
  NO_ENABLED_RULES: "没有启用的告警规则",
  RULE_VALIDATION_FAILED: "规则验证失败",
  RULE_IN_COOLDOWN: "规则处于冷却期",
  METRICS_PROCESSED: "指标数据处理完成",
  
  // 新增的消息
  STATS_RETRIEVED: "统计信息获取成功",
  NO_METRICS_TO_PROCESS: "没有指标数据需要处理",
  METRICS_PROCESSING_STARTED: "开始处理指标数据",
  PROCESS_METRICS_FAILED: "处理指标数据失败",
  ALERT_ACKNOWLEDGMENT_STARTED: "开始确认告警",
  ALERT_ACKNOWLEDGED: "告警确认成功",
  ACKNOWLEDGE_ALERT_FAILED: "告警确认失败",
  ALERT_RESOLUTION_STARTED: "开始解决告警",
  ALERT_RESOLVED: "告警解决成功",
  RESOLVE_ALERT_FAILED: "告警解决失败",
  STATS_CALCULATION_STARTED: "开始计算统计信息",
  GET_STATS_FAILED: "获取统计信息失败",
  SYSTEM_EVENT_RECEIVED: "收到系统事件",
  SYSTEM_EVENT_PROCESSED: "系统事件处理完成",
  HANDLE_EVENT_FAILED: "处理系统事件失败",
});

/**
 * 告警规则指标常量
 */
export const ALERT_RULE_METRICS = Object.freeze({
  RULE_CREATION_COUNT: "alerting_rule_creation_count",
  RULE_UPDATE_COUNT: "alerting_rule_update_count", 
  RULE_DELETION_COUNT: "alerting_rule_deletion_count",
  RULE_EVALUATION_COUNT: "alerting_rule_evaluation_count",
  AVERAGE_RULE_EVALUATION_TIME: "alerting_avg_rule_evaluation_time",
  ACTIVE_RULES_COUNT: "alerting_active_rules_count",
});

/**
 * 告警规则工具类
 */
export class AlertRuleUtil {
  /**
   * 生成告警规则ID
   */
  static generateRuleId(): string {
    const timestamp = Date.now().toString(ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_TIMESTAMP_BASE);
    const random = Math.random()
      .toString(ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_TIMESTAMP_BASE)
      .substring(
        ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_RANDOM_START,
        ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_RANDOM_START + 
        ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_RANDOM_LENGTH,
      );
    return `${ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_PREFIX}${timestamp}_${random}`;
  }

  /**
   * 验证规则ID格式
   */
  static isValidRuleId(ruleId: string): boolean {
    return ALERT_RULE_CONSTANTS.IDENTIFIERS.ID_PATTERN.test(ruleId);
  }

  /**
   * 验证规则名称
   */
  static isValidRuleName(name: string): boolean {
    if (typeof name !== "string" || name.trim() === "") return false;
    return (
      ALERT_RULE_CONSTANTS.VALIDATION.NAME_PATTERN.test(name) &&
      name.length >= ALERT_RULE_CONSTANTS.VALIDATION.NAME_MIN_LENGTH &&
      name.length <= ALERT_RULE_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
    );
  }

  /**
   * 验证指标名称
   */
  static isValidMetricName(metric: string): boolean {
    if (typeof metric !== "string" || metric.trim() === "") return false;
    return ALERT_RULE_CONSTANTS.VALIDATION.METRIC_NAME_PATTERN.test(metric);
  }

  /**
   * 验证阈值
   */
  static isValidThreshold(threshold: number): boolean {
    if (threshold === null || threshold === undefined || !Number.isFinite(threshold))
      return false;
    return (
      threshold >= ALERT_RULE_CONSTANTS.VALIDATION.THRESHOLD_MIN &&
      threshold <= ALERT_RULE_CONSTANTS.VALIDATION.THRESHOLD_MAX
    );
  }

  /**
   * 验证操作符
   */
  static isValidOperator(operator: string): boolean {
    return ALERT_RULE_CONSTANTS.OPERATIONS.VALID_OPERATORS.includes(operator as any);
  }

  /**
   * 获取操作符符号
   */
  static getOperatorSymbol(operator: string): string {
    return ALERT_RULE_CONSTANTS.OPERATIONS.OPERATOR_SYMBOLS[operator as keyof typeof ALERT_RULE_CONSTANTS.OPERATIONS.OPERATOR_SYMBOLS] || operator;
  }

  /**
   * 生成规则缓存键
   */
  static generateCooldownCacheKey(ruleId: string): string {
    return ALERT_RULE_CONSTANTS.CACHE_CONFIG.COOLDOWN_KEY_PATTERN.replace("{ruleId}", ruleId);
  }

  /**
   * 生成活跃告警缓存键
   */
  static generateActiveAlertsCacheKey(ruleId: string): string {
    return ALERT_RULE_CONSTANTS.CACHE_CONFIG.ACTIVE_ALERTS_KEY_PATTERN.replace("{ruleId}", ruleId);
  }

  /**
   * 生成规则统计缓存键
   */
  static generateStatsCacheKey(ruleId: string): string {
    return ALERT_RULE_CONSTANTS.CACHE_CONFIG.STATS_KEY_PATTERN.replace("{ruleId}", ruleId);
  }

  /**
   * 格式化告警消息
   */
  static formatAlertMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 生成错误消息
   */
  static generateErrorMessage(messageKey: string, params?: Record<string, any>): string {
    const template = ALERT_RULE_MESSAGES[messageKey as keyof typeof ALERT_RULE_MESSAGES] || messageKey;
    return params ? this.formatAlertMessage(template, params) : template;
  }
}

/**
 * 类型定义
 */
export type OperatorType = (typeof ALERT_RULE_CONSTANTS.OPERATIONS.VALID_OPERATORS)[number];
export type Operator = OperatorType;
export type AlertRuleConstants = typeof ALERT_RULE_CONSTANTS;

/**
 * 向后兼容性导出 - 单独导出常用的运算符常量
 */
export const VALID_OPERATORS = ALERT_RULE_CONSTANTS.OPERATIONS.VALID_OPERATORS;
export const OPERATOR_SYMBOLS = ALERT_RULE_CONSTANTS.OPERATIONS.OPERATOR_SYMBOLS;