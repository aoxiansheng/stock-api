/**
 * Alert 消息常量
 * 🎯 从 common/constants/domain/alert-domain.constants.ts 剥离的消息模板
 * 专用于 Alert 模块的消息定义
 */

/**
 * 告警消息模板
 * 🎯 统一告警消息格式
 */
export const ALERT_MESSAGES = Object.freeze({
  // 成功消息
  SUCCESS: {
    RULE_CREATED: "告警规则创建成功",
    RULE_UPDATED: "告警规则更新成功",
    RULE_DELETED: "告警规则删除成功",
    ALERT_RESOLVED: "告警已解决",
    ALERT_DISMISSED: "告警已忽略",
  },

  // 错误消息
  ERRORS: {
    RULE_NOT_FOUND: "告警规则不存在",
    INVALID_THRESHOLD: "阈值设置无效",
    INVALID_CONDITION: "告警条件无效",
    NOTIFICATION_FAILED: "通知发送失败",
    EVALUATION_FAILED: "告警评估失败",
  },

  // 状态消息
  STATUS: {
    PROCESSING: "处理中...",
    EVALUATING: "评估中...",
    TRIGGERING: "触发中...",
    NOTIFYING: "发送通知中...",
  },

  // 频率限制消息
  RATE_LIMIT: {
    TRIGGER_RATE_EXCEEDED: "手动触发告警评估频率超出限制，请稍后再试",
    NOTIFICATION_RATE_EXCEEDED: "通知发送频率超出限制，请稍后再试",
  },

  // 验证消息
  VALIDATION: {
    RULE_NAME_REQUIRED: "告警规则名称不能为空",
    RULE_NAME_TOO_LONG: "告警规则名称长度不能超过100字符",
    THRESHOLD_REQUIRED: "阈值不能为空",
    THRESHOLD_INVALID: "阈值必须是有效数字",
    INTERVAL_TOO_SHORT: "时间间隔不能小于30秒",
    INTERVAL_TOO_LONG: "时间间隔不能超过24小时",
  },

  // 规则消息
  RULES: {
    RULE_EVALUATION_FAILED: "规则评估失败",
    RULE_EVALUATION_STARTED: "规则评估开始",
    METRICS_PROCESSED: "指标处理完成",
  },
});

/**
 * 通知操作常量
 * 🎯 通知服务操作标识
 */
/**
 * 告警操作常量
 * 🎯 告警相关操作标识
 *
 * @note 通知相关操作已迁移到 notification/constants/notification.constants.ts
 */
export const ALERT_OPERATIONS = Object.freeze({
  RULES: {
    EVALUATE_RULES_SCHEDULED: "evaluate_rules_scheduled",
    HANDLE_RULE_EVALUATION: "handle_rule_evaluation",
    CREATE_RULE: "create_rule",
  },
});

/**
 * 告警指标常量
 * 🎯 告警相关的性能指标
 */
export const ALERT_METRICS = Object.freeze({
  RULES: {
    RULE_EVALUATION_COUNT: "rule_evaluation_count",
    AVERAGE_RULE_EVALUATION_TIME: "average_rule_evaluation_time",
  },
});

/**
 * 操作符符号映射
 * 🎯 操作符的可读性符号
 */
export const OPERATOR_SYMBOLS = Object.freeze({
  ">": "大于",
  ">=": "大于等于",
  "<": "小于",
  "<=": "小于等于",
  "==": "等于",
  "!=": "不等于",
  contains: "包含",
  not_contains: "不包含",
  regex: "正则匹配",
});

// NOTE: 通知相关常量已迁移到 notification/constants/notification.constants.ts
// 包括: NOTIFICATION_CONSTANTS, NOTIFICATION_ERROR_TEMPLATES, NOTIFICATION_MESSAGES
