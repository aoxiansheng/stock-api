/**
 * Notification核心常量定义
 * 🎯 基于四层配置体系标准，严格保留符合标准的常量
 *
 * @description 仅保留固定不变、基于标准协议的语义常量
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
 */

/**
 * 通知操作常量
 * ✅ 保留理由：固定不变的业务操作标识，基于业务标准
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
} as const);

/**
 * 通知消息常量
 * ✅ 保留理由：标准化消息文本，语义明确，固定不变
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
} as const);

/**
 * 通知验证模式常量
 * ✅ 保留理由：基于国际标准协议（RFC 5322, RFC 3986, E.164），固定不变
 */
export const NOTIFICATION_VALIDATION_PATTERNS = Object.freeze({
  // 邮箱格式验证（基于RFC 5322标准）
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,

  // URL格式验证（基于RFC 3986标准）
  URL_PATTERN:
    /^https?:\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?$/i,

  // 电话号码格式验证（基于E.164标准）
  PHONE_PATTERN: /^\+?[1-9]\d{1,14}$/,

  // 变量名格式验证（基于编程语言标准）
  VARIABLE_NAME_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/i,

  // 模板变量模式（基于模板引擎标准）
  VARIABLE_PATTERN: /\{(\w+)\}/g,
} as const);

/**
 * 通知模板变量定义
 * ✅ 保留理由：告警领域固定字段，基于业务标准，语义明确
 */
export const NOTIFICATION_TEMPLATE_VARIABLES = Object.freeze({
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
} as const);

/**
 * 通知错误模板
 * ✅ 保留理由：标准化错误表达，固定不变，语义明确
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
} as const);

// 📝 配置相关常量已移至统一配置系统
// 模板配置 → NotificationTemplateConfig
// 渠道配置 → NotificationChannelConfig  
// 验证限制 → NotificationValidationConfig
