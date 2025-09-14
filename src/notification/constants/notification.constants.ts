/**
 * Notification模块常量定义
 * 🎯 通知相关的所有常量定义
 * 
 * @description 从Alert模块拆分出来的通知相关常量
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

/**
 * 通知操作常量
 * 🎯 通知服务操作标识
 */
export const NOTIFICATION_OPERATIONS = Object.freeze({
  SEND_NOTIFICATION: "send_notification",
  SEND_BATCH_NOTIFICATIONS: "send_batch_notifications",
  SEND_RESOLUTION_NOTIFICATION: "send_resolution_notification",
  SEND_ACKNOWLEDGMENT_NOTIFICATION: "send_acknowledgment_notification",
  SEND_SUPPRESSION_NOTIFICATION: "send_suppression_notification",
  SEND_ESCALATION_NOTIFICATION: "send_escalation_notification",
  TEST_CHANNEL: "test_channel",
  GENERATE_TEMPLATE: "generate_template",
  INITIALIZE_SENDERS: "initialize_senders",
  RETRY_FAILED_NOTIFICATION: "retry_failed_notification",
  VALIDATE_CHANNEL_CONFIG: "validate_channel_config",
  
  // 模板相关操作
  CREATE_TEMPLATE: "create_template",
  UPDATE_TEMPLATE: "update_template",
  DELETE_TEMPLATE: "delete_template",
  RENDER_TEMPLATE: "render_template",
  RENDER_TEMPLATES_BATCH: "render_templates_batch",
  QUERY_TEMPLATES: "query_templates",
  DUPLICATE_TEMPLATE: "duplicate_template",
  VALIDATE_TEMPLATE: "validate_template",
  INITIALIZE_DEFAULT_TEMPLATES: "initialize_default_templates",
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
  NOTIFICATION_RETRIED: "通知重试成功",
  CHANNEL_CONFIG_VALID: "通道配置验证通过",
  NO_CHANNELS_CONFIGURED: "未配置通知渠道",
  
  // Error messages
  NOTIFICATION_FAILED: "通知发送失败",
  BATCH_NOTIFICATIONS_FAILED: "批量通知发送失败",
  CHANNEL_TEST_FAILED: "通道测试失败",
  TEMPLATE_GENERATION_FAILED: "模板生成失败",
  SENDERS_INITIALIZATION_FAILED: "发送器初始化失败",
  INVALID_CHANNEL_CONFIG: "通道配置无效",
  TEMPLATE_NOT_FOUND: "模板未找到",
  BATCH_NOTIFICATION_FAILED: "批量通知中的单个通知失败",
  RETRY_LIMIT_EXCEEDED: "重试次数超出限制",
  NOTIFICATION_TIMEOUT: "通知发送超时",
  CHANNEL_UNAVAILABLE: "通知渠道不可用",
  
  // Status messages
  SENDING: "发送中...",
  TESTING: "测试中...",
  GENERATING: "生成中...",
  INITIALIZING: "初始化中...",
  NOTIFICATION_PROCESSING_STARTED: "通知处理已开始",
  BATCH_PROCESSING_STARTED: "批量处理已开始",
  CHANNEL_TEST_STARTED: "通道测试已开始",
  TEMPLATE_GENERATION_STARTED: "模板生成已开始",
  RETRYING: "重试中...",
  VALIDATING: "验证中...",
});

/**
 * 通知常量配置
 * 🎯 通知系统的各种配置常量
 */
export const NOTIFICATION_CONSTANTS = Object.freeze({
  /**
   * 模板相关常量
   */
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
      RESOLVED_BY: "resolvedBy",
      ACKNOWLEDGED_BY: "acknowledgedBy",
      SUPPRESSED_BY: "suppressedBy",
      ESCALATION_REASON: "escalationReason",
    },
  },
  
  /**
   * 验证相关常量
   */
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
    PHONE_PATTERN_SOURCE: "^\\+?[1-9]\\d{1,14}$",
    PHONE_PATTERN_FLAGS: "",
  },
  
  /**
   * 重试相关常量
   */
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
    MAX_DELAY_MS: 30000,
    JITTER_FACTOR: 0.1,
  },
  
  /**
   * 超时配置
   */
  TIMEOUTS: {
    EMAIL: 30000,      // 30秒
    SMS: 5000,         // 5秒
    WEBHOOK: 10000,    // 10秒
    SLACK: 15000,      // 15秒
    DINGTALK: 10000,   // 10秒
    DEFAULT: 15000,    // 默认15秒
  },
  
  /**
   * 批量处理配置
   */
  BATCH: {
    DEFAULT_SIZE: 10,
    MAX_SIZE: 100,
    CONCURRENCY: 5,
    TIMEOUT: 60000,    // 1分钟
  },
  
  /**
   * 优先级权重
   */
  PRIORITY_WEIGHTS: {
    CRITICAL: 100,
    URGENT: 80,
    HIGH: 60,
    NORMAL: 40,
    LOW: 20,
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
  CONFIG_INVALID: "配置无效: {config}",
  RECIPIENT_INVALID: "接收者格式无效: {recipient}",
  TEMPLATE_NOT_FOUND: "模板未找到: {templateId}",
  CHANNEL_NOT_FOUND: "通知渠道未找到: {channelId}",
});

/**
 * 统一默认文本模板（Handlebars风格）
 * 单一事实来源，供 app 配置与服务使用
 */
export const DEFAULT_TEXT_TEMPLATE = `
告警详情:
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 当前值: {{value}}
- 阈值: {{threshold}}
- 严重级别: {{severity}}
- 状态: {{status}}
- 开始时间: {{startTime}}
- 持续时间: {{duration}}秒
- 告警消息: {{message}}

{{#if tags}}
标签: {{{tags}}}
{{/if}}
`.trim();

/**
 * 统一默认邮件主题模板（Handlebars风格）
 */
export const DEFAULT_EMAIL_SUBJECT_TEMPLATE = `[{{severity}}] {{ruleName}} - {{status}}`;

/**
 * 默认通知模板
 * 🎯 各种通知类型的默认模板
 */
export const DEFAULT_NOTIFICATION_TEMPLATES = Object.freeze({
  ALERT_FIRED: {
    EMAIL: {
      TITLE: "[{severity}] {ruleName} 警告触发",
      CONTENT: `
警告规则: {ruleName}
严重程度: {severity}
触发时间: {startTime}
当前值: {value}
阈值: {threshold}
监控指标: {metric}
描述: {message}

请及时处理此警告。
      `.trim(),
    },
    SMS: {
      CONTENT: "{ruleName} 警告触发，当前值: {value}，阈值: {threshold}",
    },
    WEBHOOK: {
      PAYLOAD: {
        alert: {
          id: "{alertId}",
          ruleName: "{ruleName}",
          severity: "{severity}",
          status: "{status}",
          value: "{value}",
          threshold: "{threshold}",
          metric: "{metric}",
          startTime: "{startTime}",
          message: "{message}",
        },
      },
    },
  },
  
  ALERT_RESOLVED: {
    EMAIL: {
      TITLE: "[已解决] {ruleName} 警告已恢复",
      CONTENT: `
警告规则: {ruleName}
解决时间: {endTime}
持续时间: {duration}
解决人: {resolvedBy}

此警告已恢复正常。
      `.trim(),
    },
    SMS: {
      CONTENT: "{ruleName} 警告已恢复正常",
    },
  },
  
  ALERT_ACKNOWLEDGED: {
    EMAIL: {
      TITLE: "[已确认] {ruleName} 警告已确认",
      CONTENT: `
警告规则: {ruleName}
确认人: {acknowledgedBy}
确认时间: {acknowledgedAt}

此警告已被确认，正在处理中。
      `.trim(),
    },
  },
});

/**
 * 通知渠道默认配置
 * 🎯 各通知渠道的默认配置模板
 */
export const DEFAULT_CHANNEL_CONFIGS = Object.freeze({
  EMAIL: {
    smtp: {
      host: "",
      port: 587,
      secure: false,
      auth: {
        user: "",
        pass: "",
      },
    },
    from: "",
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.EMAIL,
  },
  
  SMS: {
    provider: "aliyun", // aliyun, tencent, etc.
    accessKeyId: "",
    accessKeySecret: "",
    signName: "",
    templateCode: "",
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.SMS,
  },
  
  WEBHOOK: {
    url: "",
    method: "POST",
    headers: {},
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.WEBHOOK,
    verifySSL: true,
  },
  
  SLACK: {
    token: "",
    channel: "",
    username: "AlertBot",
    iconEmoji: ":warning:",
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.SLACK,
  },
  
  DINGTALK: {
    webhook: "",
    secret: "",
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.DINGTALK,
  },
});