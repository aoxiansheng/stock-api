/**
 * 告警服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

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
  LOAD_ACTIVE_ALERTS: "loadActiveAlerts",
  HANDLE_RULE_EVALUATION: "handleRuleEvaluation",
  CONVERT_EVENT_TO_METRIC: "convertEventToMetric",
  GENERATE_RULE_ID: "generateRuleId",
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
  LOAD_ACTIVE_ALERTS_FAILED: "加载活跃告警失败",
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
  CACHE_OPERATION_FAILED: "缓存操作失败: {operation}，键: {key}",
});

// 🔧 告警配置常量
export const ALERTING_CONFIG = Object.freeze({
  RULE_ID_PREFIX: "rule_",
  RULE_ID_TIMESTAMP_BASE: 36,
  RULE_ID_RANDOM_LENGTH: 6,
  RULE_ID_RANDOM_START: 2,
  DEFAULT_COOLDOWN_SECONDS: 300, // 5分钟
  MAX_RULE_NAME_LENGTH: 100,
  MAX_RULE_DESCRIPTION_LENGTH: 500,
  MAX_TAGS_COUNT: 10,
  MAX_TAG_LENGTH: 50,
});

// 📊 默认统计值常量
export const ALERTING_DEFAULT_STATS = Object.freeze({
  activeAlerts: 0,
  criticalAlerts: 0,
  warningAlerts: 0,
  infoAlerts: 0,
  totalAlertsToday: 0,
  resolvedAlertsToday: 0,
  averageResolutionTime: 0,
});

// 🏷️ 告警严重程度常量
export const ALERTING_SEVERITY_LEVELS = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
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

// 🎛️ 缓存键模式常量
export const ALERTING_CACHE_PATTERNS = Object.freeze({
  ACTIVE_ALERT: "alert:active:{ruleId}",
  RULE_COOLDOWN: "alert:cooldown:{ruleId}",
  RULE_CACHE: "alert:rule:{ruleId}",
  STATS_CACHE: "alert:stats",
  EVALUATION_RESULT: "alert:evaluation:{ruleId}",
});

// 🔍 验证规则常量
export const ALERTING_VALIDATION_RULES = Object.freeze({
  RULE_NAME_PATTERN:
    /^[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303fa-zA-Z0-9\s\-_\.]+$/,
  RULE_ID_PATTERN: /^rule_[a-z0-9]+_[a-z0-9]{6}$/,
  METRIC_NAME_PATTERN: /^[a-zA-Z0-9_\.]+$/,
  TAG_PATTERN: /^[a-zA-Z0-9_-]+$/,
  THRESHOLD_MIN: 0,
  THRESHOLD_MAX: Number.MAX_SAFE_INTEGER,
});

// ⏰ 时间配置常量
export const ALERTING_TIME_CONFIG = Object.freeze({
  DEFAULT_EVALUATION_INTERVAL_MS: 60000, // 1分钟
  MIN_COOLDOWN_SECONDS: 60, // 1分钟
  MAX_COOLDOWN_SECONDS: 86400, // 24小时
  ALERT_TTL_SECONDS: 3600, // 1小时
  STATS_CACHE_TTL_SECONDS: 300, // 5分钟
  RULE_CACHE_TTL_SECONDS: 1800, // 30分钟
});

// 🚨 告警阈值常量
export const ALERTING_THRESHOLDS = Object.freeze({
  MAX_ACTIVE_ALERTS: 1000,
  MAX_RULES_PER_USER: 50,
  MAX_ALERTS_PER_RULE_PER_HOUR: 10,
  CRITICAL_ALERT_THRESHOLD: 100,
  WARNING_ALERT_THRESHOLD: 50,
});

// 🔄 重试配置常量
export const ALERTING_RETRY_CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 10000,
  TIMEOUT_MS: 30000,
});

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
    return (
      ALERTING_VALIDATION_RULES.RULE_NAME_PATTERN.test(name) &&
      name.length <= ALERTING_CONFIG.MAX_RULE_NAME_LENGTH
    );
  }

  /**
   * 验证规则ID格式
   * @param ruleId 规则ID
   * @returns 是否有效
   */
  static isValidRuleId(ruleId: string): boolean {
    return ALERTING_VALIDATION_RULES.RULE_ID_PATTERN.test(ruleId);
  }

  /**
   * 验证指标名称格式
   * @param metric 指标名称
   * @returns 是否有效
   */
  static isValidMetricName(metric: string): boolean {
    return ALERTING_VALIDATION_RULES.METRIC_NAME_PATTERN.test(metric);
  }

  /**
   * 验证阈值范围
   * @param threshold 阈值
   * @returns 是否有效
   */
  static isValidThreshold(threshold: number): boolean {
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

  /**
   * 计算告警优先级分数
   * @param severity 严重程度
   * @param value 当前值
   * @param threshold 阈值
   * @returns 优先级分数
   */
  static calculatePriorityScore(
    severity: string,
    value: number,
    threshold: number,
  ): number {
    const severityWeights = {
      [ALERTING_SEVERITY_LEVELS.CRITICAL]: 100,
      [ALERTING_SEVERITY_LEVELS.HIGH]: 80,
      [ALERTING_SEVERITY_LEVELS.MEDIUM]: 60,
      [ALERTING_SEVERITY_LEVELS.LOW]: 40,
      [ALERTING_SEVERITY_LEVELS.INFO]: 20,
    };

    const baseScore = severityWeights[severity] || 0;
    const thresholdRatio = threshold > 0 ? Math.min(value / threshold, 2) : 1;

    return Math.round(baseScore * thresholdRatio);
  }
}
