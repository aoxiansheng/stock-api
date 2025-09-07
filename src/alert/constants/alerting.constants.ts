/**
 * 告警服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

import { TIMING_CONSTANTS } from './timing.constants';
import { DEFAULT_ALERT_STATS, type BaseAlertStats } from '../interfaces/alert-stats.interface';
import { SHARED_VALIDATION_RULES } from './shared.constants';

// 📝 操作名称常量
export const ALERTING_OPERATIONS = Object.freeze({
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
  EVALUATE_RULES_SCHEDULED: "evaluateRulesScheduled",
  CREATE_NEW_ALERT: "createNewAlert",
  HANDLE_RULE_EVALUATION: "handleRuleEvaluation",
});

// 📢 消息常量
export const ALERTING_MESSAGES = Object.freeze({
  // 成功消息
  SERVICE_INITIALIZED: "告警服务初始化...",
  RULE_CREATED: "告警规则创建成功",
  RULE_UPDATED: "告警规则更新成功",
  RULE_DELETED: "告警规则删除成功",
  RULE_STATUS_TOGGLED: "切换告警规则状态成功",
  ALERT_ACKNOWLEDGED: "告警已确认",
  ALERT_RESOLVED: "告警已解决",
  NEW_ALERT_TRIGGERED: "新告警触发",
  ACTIVE_ALERTS_LOADED: "活跃告警加载到缓存",
  METRICS_PROCESSED: "指标数据处理完成",
  STATS_RETRIEVED: "告警统计获取成功",
  SYSTEM_EVENT_PROCESSED: "系统事件处理完成",

  // 错误消息
  INITIALIZATION_FAILED: "初始化加载活跃告警失败",
  CREATE_RULE_DB_FAILED: "创建告警规则数据库操作失败",
  UPDATE_RULE_FAILED: "更新告警规则失败",
  DELETE_RULE_FAILED: "删除告警规则失败",
  GET_RULES_FAILED: "获取所有告警规则失败",
  GET_RULE_FAILED: "获取单个告警规则失败",
  TOGGLE_RULE_FAILED: "切换告警规则状态失败",
  PROCESS_METRICS_FAILED: "处理指标数据失败",
  ACKNOWLEDGE_ALERT_FAILED: "确认告警失败",
  RESOLVE_ALERT_FAILED: "解决告警失败",
  GET_STATS_FAILED: "获取告警统计失败",
  HANDLE_EVENT_FAILED: "处理系统事件失败",
  CREATE_ALERT_FAILED: "创建新告警失败",
  RULE_EVALUATION_FAILED: "规则评估失败",

  // 警告消息
  RULE_STATUS_UNCHANGED: "尝试切换不存在的规则状态或状态未改变",
  NO_METRICS_TO_PROCESS: "没有指标数据需要处理",
  NO_ENABLED_RULES: "没有启用的告警规则",
  RULE_VALIDATION_FAILED: "规则验证失败",
  ALERT_ALREADY_EXISTS: "告警已存在",
  RULE_IN_COOLDOWN: "规则处于冷却期",

  // 信息消息
  RULE_CREATION_STARTED: "开始创建告警规则",
  RULE_UPDATE_STARTED: "开始更新告警规则",
  RULE_DELETION_STARTED: "开始删除告警规则",
  METRICS_PROCESSING_STARTED: "开始处理指标数据",
  ALERT_ACKNOWLEDGMENT_STARTED: "开始确认告警",
  ALERT_RESOLUTION_STARTED: "开始解决告警",
  STATS_CALCULATION_STARTED: "开始计算告警统计",
  SYSTEM_EVENT_RECEIVED: "接收到系统事件",
  RULE_EVALUATION_STARTED: "开始规则评估",
  ALERT_CREATION_STARTED: "开始创建新告警",
});

// 🎯 错误消息模板常量
export const ALERTING_ERROR_TEMPLATES = Object.freeze({
  RULE_VALIDATION_FAILED: "规则验证失败: {errors}",
  RULE_NOT_FOUND: "未找到ID为 {ruleId} 的规则",
  ALERT_NOT_FOUND_FOR_ACK: "未找到ID为 {alertId} 的告警进行确认",
  ALERT_NOT_FOUND_FOR_RESOLVE: "未找到ID为 {alertId} 的告警进行解决",
  RULE_OPERATION_FAILED: "规则操作失败: {operation}，规则ID: {ruleId}",
  ALERT_OPERATION_FAILED: "告警操作失败: {operation}，告警ID: {alertId}",
  METRIC_PROCESSING_ERROR: "处理指标 {metric} 时发生错误: {error}",
});

// 🔧 告警配置常量
export const ALERTING_CONFIG = Object.freeze({
  RULE_ID_PREFIX: "rule_",
  RULE_ID_TIMESTAMP_BASE: 36,
  RULE_ID_RANDOM_LENGTH: 6,
  RULE_ID_RANDOM_START: 2,
  DEFAULT_COOLDOWN_SECONDS: TIMING_CONSTANTS.COOLDOWN.DEFAULT_SECONDS, // 引用统一配置
  MAX_RULE_NAME_LENGTH: 100,
  MAX_RULE_DESCRIPTION_LENGTH: 500,
  MAX_TAGS_COUNT: 10,
  MAX_TAG_LENGTH: 50,
});

// 📊 默认统计值常量 - 使用共享统计接口
export const ALERTING_DEFAULT_STATS: BaseAlertStats = DEFAULT_ALERT_STATS;

// ⏰ 告警时间配置常量
export const ALERTING_TIME_CONFIG = Object.freeze({
  ALERT_TTL_SECONDS: 86400, // 24 小时
  COOLDOWN_SECONDS: 300,    // 5 分钟
  EVALUATION_INTERVAL: 60,   // 1 分钟
});

// 🎯 缓存模式常量
export const ALERTING_CACHE_PATTERNS = Object.freeze({
  RULE_COOLDOWN: "alert:cooldown:{ruleId}",
  ACTIVE_ALERTS: "alert:active:{ruleId}",
  RULE_STATS: "alert:stats:{ruleId}",
});


// 📈 告警指标常量
export const ALERTING_METRICS = Object.freeze({
  RULE_CREATION_COUNT: "alerting_rule_creation_count",
  RULE_UPDATE_COUNT: "alerting_rule_update_count",
  RULE_DELETION_COUNT: "alerting_rule_deletion_count",
  ALERT_TRIGGER_COUNT: "alerting_alert_trigger_count",
  ALERT_ACKNOWLEDGMENT_COUNT: "alerting_alert_acknowledgment_count",
  ALERT_RESOLUTION_COUNT: "alerting_alert_resolution_count",
  METRIC_PROCESSING_COUNT: "alerting_metric_processing_count",
  RULE_EVALUATION_COUNT: "alerting_rule_evaluation_count",
  SYSTEM_EVENT_COUNT: "alerting_system_event_count",
  AVERAGE_RULE_EVALUATION_TIME: "alerting_avg_rule_evaluation_time",
  AVERAGE_ALERT_RESOLUTION_TIME: "alerting_avg_alert_resolution_time",
  ACTIVE_RULES_COUNT: "alerting_active_rules_count",
});

// 🔍 验证规则常量
// 基于 SHARED_VALIDATION_RULES 构建，保持向后兼容性
export const ALERTING_VALIDATION_RULES = Object.freeze({
  // 使用共享的通用名称模式（支持中文、英文、数字、符号）
  RULE_NAME_PATTERN: SHARED_VALIDATION_RULES.TEXT_PATTERNS.GENERAL_NAME,
  // 告警规则特有的ID模式
  RULE_ID_PATTERN: /^rule_[a-z0-9]+_[a-z0-9]{6}$/,
  // 使用共享的标识符模式
  METRIC_NAME_PATTERN: SHARED_VALIDATION_RULES.TEXT_PATTERNS.IDENTIFIER,
  // 使用共享的标签模式
  TAG_PATTERN: SHARED_VALIDATION_RULES.TEXT_PATTERNS.TAG,
  // 使用共享的阈值范围
  THRESHOLD_MIN: SHARED_VALIDATION_RULES.NUMERIC_RANGE.THRESHOLD_MIN,
  THRESHOLD_MAX: SHARED_VALIDATION_RULES.NUMERIC_RANGE.THRESHOLD_MAX,
});

// 🔄 重试配置常量 - 使用共享基础配置
export { ALERTING_RETRY_CONFIG } from "./retry.constants";

/**
 * 告警模板工具函数
 */

export class AlertingTemplateUtil {
  /**
   * 替换错误消息模板中的占位符
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
   */
  static replaceErrorTemplate(
    template: string,
    params: Record<string, any>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 生成错误消息
   * @param templateKey 模板键名
   * @param params 参数对象
   * @returns 错误消息字符串
   */
  static generateErrorMessage(
    templateKey: keyof typeof ALERTING_ERROR_TEMPLATES,
    params: Record<string, any>,
  ): string {
    const template = ALERTING_ERROR_TEMPLATES[templateKey];
    return this.replaceErrorTemplate(template, params);
  }

  /**
   * 生成规则ID
   * @returns 规则ID字符串
   */
  static generateRuleId(): string {
    const timestamp = Date.now().toString(
      ALERTING_CONFIG.RULE_ID_TIMESTAMP_BASE,
    );
    const random = Math.random()
      .toString(ALERTING_CONFIG.RULE_ID_TIMESTAMP_BASE)
      .substring(
        ALERTING_CONFIG.RULE_ID_RANDOM_START,
        ALERTING_CONFIG.RULE_ID_RANDOM_START +
          ALERTING_CONFIG.RULE_ID_RANDOM_LENGTH,
      );
    return `${ALERTING_CONFIG.RULE_ID_PREFIX}${timestamp}_${random}`;
  }

  /**
   * 验证规则名称格式
   * @param name 规则名称
   * @returns 是否有效
   */
  static isValidRuleName(name: string): boolean {
    if (typeof name !== "string" || name.trim() === "") return false;
    return (
      ALERTING_VALIDATION_RULES.RULE_NAME_PATTERN.test(name) &&
      name.length <= ALERTING_CONFIG.MAX_RULE_NAME_LENGTH
    );
  }


  /**
   * 验证指标名称格式
   * @param metric 指标名称
   * @returns 是否有效
   */
  static isValidMetricName(metric: string): boolean {
    if (typeof metric !== "string" || metric.trim() === "") return false;
    return ALERTING_VALIDATION_RULES.METRIC_NAME_PATTERN.test(metric);
  }

  /**
   * 验证阈值范围
   * @param threshold 阈值
   * @returns 是否有效
   */
  static isValidThreshold(threshold: number): boolean {
    if (
      threshold === null ||
      threshold === undefined ||
      !Number.isFinite(threshold)
    )
      return false;
    return (
      threshold >= ALERTING_VALIDATION_RULES.THRESHOLD_MIN &&
      threshold <= ALERTING_VALIDATION_RULES.THRESHOLD_MAX
    );
  }

  /**
   * 格式化告警消息
   * @param template 消息模板
   * @param context 上下文数据
   * @returns 格式化后的消息
   */
  static formatAlertMessage(
    template: string,
    context: Record<string, any>,
  ): string {
    return this.replaceErrorTemplate(template, context);
  }

}
