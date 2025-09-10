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
 * 告警通知消息模板
 * 🎯 统一通知内容格式
 */
export const ALERT_NOTIFICATION_TEMPLATES = Object.freeze({
  // 邮件模板
  EMAIL: {
    SUBJECT_TEMPLATE: "[{severity}] {ruleName} 告警触发",
    BODY_TEMPLATE: `
告警规则: {ruleName}
严重程度: {severity}
触发时间: {timestamp}
当前值: {currentValue}
阈值: {threshold}
描述: {description}
    `.trim(),
  },

  // 短信模板
  SMS: {
    TEMPLATE: "{ruleName} 告警触发，当前值: {currentValue}，阈值: {threshold}",
  },

  // Webhook 模板
  WEBHOOK: {
    PAYLOAD_TEMPLATE: {
      alert: {
        ruleName: "{ruleName}",
        severity: "{severity}",
        status: "{status}",
        currentValue: "{currentValue}",
        threshold: "{threshold}",
        timestamp: "{timestamp}",
        description: "{description}",
      },
    },
  },

  // 推送通知模板
  PUSH: {
    TITLE_TEMPLATE: "{severity} 告警",
    BODY_TEMPLATE: "{ruleName}: {currentValue} (阈值: {threshold})",
  },

  // 应用内通知模板
  IN_APP: {
    TITLE_TEMPLATE: "{ruleName} 告警触发",
    CONTENT_TEMPLATE: "当前值 {currentValue} 超过阈值 {threshold}",
  },
});

/**
 * 告警历史消息
 * 🎯 告警历史记录相关消息
 */
export const ALERT_HISTORY_MESSAGES = Object.freeze({
  ACTIONS: {
    CREATED: "告警创建",
    TRIGGERED: "告警触发",
    RESOLVED: "告警解决",
    DISMISSED: "告警忽略",
    ESCALATED: "告警升级",
    NOTIFICATION_SENT: "通知已发送",
  },

  COMMENTS: {
    AUTO_RESOLVED: "系统自动解决",
    MANUAL_RESOLVED: "用户手动解决",
    AUTO_TRIGGERED: "系统自动触发",
    THRESHOLD_EXCEEDED: "超过阈值触发",
  },
});

/**
 * 通知操作常量
 * 🎯 通知服务操作标识
 */
export const NOTIFICATION_OPERATIONS = Object.freeze({
  SEND_NOTIFICATION: "send_notification",
  SEND_BATCH_NOTIFICATIONS: "send_batch_notifications",
  TEST_CHANNEL: "test_channel",
  GENERATE_TEMPLATE: "generate_template",
  INITIALIZE_SENDERS: "initialize_senders",
});

/**
 * 告警操作常量
 * 🎯 告警相关操作标识
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
  "contains": "包含",
  "not_contains": "不包含",
  "regex": "正则匹配",
});

/**
 * 通知常量
 * 🎯 通知系统的各种配置常量
 */
export const NOTIFICATION_CONSTANTS = Object.freeze({
  TEMPLATE: {
    VARIABLE_PATTERN: /\{(\w+)\}/g,
    VARIABLES: {
      ALERT_ID: "alertId",
      RULE_NAME: "ruleName",
      METRIC: "metric",
      VALUE: "value",
      THRESHOLD: "threshold",
      SEVERITY: "severity",
      STATUS: "status",
      MESSAGE: "message",
      START_TIME: "startTime",
      END_TIME: "endTime",
      DURATION: "duration",
      TAGS: "tags",
      RULE_ID: "ruleId",
      RULE_DESCRIPTION: "ruleDescription",
    },
  },
  VALIDATION: {
    VARIABLE_NAME_PATTERN_SOURCE: "^[a-zA-Z_][a-zA-Z0-9_]*$",
    VARIABLE_NAME_PATTERN_FLAGS: "i",
    VARIABLE_NAME_MIN_LENGTH: 1,
    VARIABLE_NAME_MAX_LENGTH: 50,
    MIN_TEMPLATE_LENGTH: 1,
    MAX_TEMPLATE_LENGTH: 10000,
    EMAIL_PATTERN_SOURCE: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    EMAIL_PATTERN_FLAGS: "i",
    URL_PATTERN_SOURCE: "^https?:\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+([\\w\\-\\.,@?^=%&:\\/~\\+#]*[\\w\\-\\@?^=%&\\/~\\+#])?$",
    URL_PATTERN_FLAGS: "i",
  },
  RETRY: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    INITIAL_DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
    MAX_DELAY_MS: 30000,
    JITTER_FACTOR: 0.1,
  },
});

/**
 * 通知错误模板
 * 🎯 通知错误的标准化模板
 */
export const NOTIFICATION_ERROR_TEMPLATES = Object.freeze({
  SEND_FAILED: "通知发送失败: {error}",
  CHANNEL_UNAVAILABLE: "通知渠道不可用: {channel}",
  TEMPLATE_ERROR: "模板错误: {details}",
  VALIDATION_ERROR: "验证错误: {field} - {message}",
  TIMEOUT_ERROR: "发送超时: {timeout}ms",
  RETRY_EXHAUSTED: "重试次数已用尽: {attempts}次",
  UNSUPPORTED_TYPE: "不支持的通知类型: {type}",
  SEND_FAILED_WITH_REASON: "通知发送失败: {reason}",
});

/**
 * 通知消息常量
 * 🎯 通知相关的消息模板
 */
export const NOTIFICATION_MESSAGES = Object.freeze({
  // Success messages
  NOTIFICATION_SENT: "通知发送成功",
  BATCH_NOTIFICATIONS_SENT: "批量通知发送成功",
  CHANNEL_TESTED: "通道测试成功",
  TEMPLATE_GENERATED: "模板生成成功",
  SENDERS_INITIALIZED: "发送器初始化成功",
  CHANNEL_TEST_PASSED: "通道测试通过",
  BATCH_NOTIFICATIONS_COMPLETED: "批量通知完成",
  
  // Error messages
  NOTIFICATION_FAILED: "通知发送失败",
  BATCH_NOTIFICATIONS_FAILED: "批量通知发送失败",
  CHANNEL_TEST_FAILED: "通道测试失败",
  TEMPLATE_GENERATION_FAILED: "模板生成失败",
  SENDERS_INITIALIZATION_FAILED: "发送器初始化失败",
  INVALID_CHANNEL_CONFIG: "通道配置无效",
  TEMPLATE_NOT_FOUND: "模板未找到",
  BATCH_NOTIFICATION_FAILED: "批量通知中的单个通知失败",
  
  // Status messages
  SENDING: "发送中...",
  TESTING: "测试中...",
  GENERATING: "生成中...",
  INITIALIZING: "初始化中...",
  NOTIFICATION_PROCESSING_STARTED: "通知处理已开始",
  BATCH_PROCESSING_STARTED: "批量处理已开始",
  CHANNEL_TEST_STARTED: "通道测试已开始",
  TEMPLATE_GENERATION_STARTED: "模板生成已开始",
});

/**
 * 消息工具类
 * 🎯 提供消息格式化功能
 */
export class AlertMessageUtil {
  /**
   * 格式化消息模板
   */
  static formatMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 格式化通知消息
   */
  static formatNotification(
    channel: 'email' | 'sms' | 'webhook' | 'push' | 'in_app',
    type: string,
    variables: Record<string, any>
  ): string {
    const templates = ALERT_NOTIFICATION_TEMPLATES[channel.toUpperCase() as keyof typeof ALERT_NOTIFICATION_TEMPLATES];
    const template = (templates as any)[type.toUpperCase()];
    
    if (typeof template === 'string') {
      return this.formatMessage(template, variables);
    }
    
    if (typeof template === 'object') {
      return JSON.stringify(template).replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] !== undefined ? String(variables[key]) : match;
      });
    }
    
    return '';
  }

  /**
   * 获取严重程度对应的颜色
   */
  static getSeverityColor(severity: string): string {
    const colorMap = {
      low: '#28a745',      // 绿色
      medium: '#ffc107',   // 黄色
      high: '#fd7e14',     // 橙色
      critical: '#dc3545', // 红色
      emergency: '#6f42c1', // 紫色
    };
    
    return colorMap[severity.toLowerCase() as keyof typeof colorMap] || '#6c757d';
  }

  /**
   * 获取严重程度对应的图标
   */
  static getSeverityIcon(severity: string): string {
    const iconMap = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔶',
      critical: '❌',
      emergency: '🚨',
    };
    
    return iconMap[severity.toLowerCase() as keyof typeof iconMap] || '📢';
  }
}