/**
 * 通知服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */
import { deepFreeze } from "@common/utils/object-immutability.util";
import { PERFORMANCE_CONSTANTS, RETRY_CONSTANTS, BATCH_CONSTANTS } from "@common/constants/unified";
// 📝 操作名称常量
export const NOTIFICATION_OPERATIONS = deepFreeze({
  SEND_NOTIFICATION: "sendNotification",
  SEND_BATCH_NOTIFICATIONS: "sendBatchNotifications",
  TEST_CHANNEL: "testChannel",
  GENERATE_TEMPLATE: "generateTemplate",
  INITIALIZE_SENDERS: "initializeSenders",
  FORMAT_STRING: "formatString",
  VALIDATE_CHANNEL_CONFIG: "validateChannelConfig",
  GET_SENDER_STATUS: "getSenderStatus",
  PROCESS_NOTIFICATION_RESULT: "processNotificationResult",
  HANDLE_NOTIFICATION_ERROR: "handleNotificationError",
});

// 📢 消息常量
export const NOTIFICATION_MESSAGES = deepFreeze({
  // 成功消息
  NOTIFICATION_SENT: "通知发送成功",
  BATCH_NOTIFICATIONS_COMPLETED: "批量通知发送完成",
  CHANNEL_TEST_PASSED: "通知渠道测试通过",
  TEMPLATE_GENERATED: "通知模板生成成功",
  SENDERS_INITIALIZED: "通知发送器初始化完成",
  NOTIFICATION_PROCESSING_STARTED: "开始处理通知",
  BATCH_PROCESSING_STARTED: "开始批量处理通知",
  TEMPLATE_GENERATION_STARTED: "开始生成通知模板",
  CHANNEL_TEST_STARTED: "开始测试通知渠道",

  // 错误消息
  UNSUPPORTED_NOTIFICATION_TYPE: "不支持的通知类型",
  BATCH_NOTIFICATION_FAILED: "批量发送中单个通知执行失败",
  SEND_FAILED: "发送失败",
  CHANNEL_TEST_FAILED: "通知渠道测试失败",
  TEMPLATE_GENERATION_FAILED: "通知模板生成失败",
  SENDER_INITIALIZATION_FAILED: "通知发送器初始化失败",
  NOTIFICATION_PROCESSING_FAILED: "通知处理失败",
  INVALID_CHANNEL_CONFIG: "无效的通知渠道配置",
  SENDER_NOT_AVAILABLE: "通知发送器不可用",

  // 警告消息
  NO_ENABLED_CHANNELS: "没有启用的通知渠道",
  PARTIAL_BATCH_SUCCESS: "批量通知部分成功",
  TEMPLATE_VARIABLE_MISSING: "模板变量缺失",
  CHANNEL_CONFIG_INCOMPLETE: "通知渠道配置不完整",
  SENDER_PERFORMANCE_DEGRADED: "通知发送器性能下降",

  // 信息消息
  NOTIFICATION_QUEUED: "通知已加入队列",
  BATCH_PROCESSING_PROGRESS: "批量处理进度更新",
  TEMPLATE_VARIABLES_EXTRACTED: "模板变量提取完成",
  CHANNEL_STATUS_CHECKED: "通知渠道状态检查完成",
  SENDER_HEALTH_CHECK: "发送器健康检查完成",
});

// 🎯 错误消息模板常量
export const NOTIFICATION_ERROR_TEMPLATES = deepFreeze({
  UNSUPPORTED_TYPE: "不支持的通知类型: {channelType}",
  SEND_FAILED_WITH_REASON: "发送失败: {error}",
  CHANNEL_TEST_FAILED_WITH_REASON: "通知渠道测试失败: {reason}",
  TEMPLATE_GENERATION_ERROR: "模板生成失败: {error}",
  BATCH_PROCESSING_ERROR:
    "批量处理失败: 成功 {successful}/{total}，失败 {failed}",
  SENDER_INITIALIZATION_ERROR: "发送器 {senderType} 初始化失败: {error}",
  INVALID_CONFIG: "无效配置: {field} 字段 {issue}",
  TIMEOUT_ERROR: "操作超时: {operation} 耗时超过 {timeout}ms",
});

// 📋 模板变量常量
export const NOTIFICATION_TEMPLATE_VARIABLES = deepFreeze({
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
  ALERT_URL: "alertUrl",
  DASHBOARD_URL: "dashboardUrl",
});

// 🎨 模板格式化常量 - 修改为字符串模式
export const NOTIFICATION_TEMPLATE_PATTERNS = deepFreeze({
  // 存储正则模式字符串和标志，而非正则对象
  VARIABLE_PATTERN_SOURCE: "\\{\\{(\\w+)\\}\\}",
  VARIABLE_PATTERN_FLAGS: "g",

  IF_BLOCK_PATTERN_SOURCE:
    "\\{\\{#if (\\w+)\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}",
  IF_BLOCK_PATTERN_FLAGS: "g",

  UNLESS_BLOCK_PATTERN_SOURCE:
    "\\{\\{#unless (\\w+)\\}\\}([\\s\\S]*?)\\{\\{\\/unless\\}\\}",
  UNLESS_BLOCK_PATTERN_FLAGS: "g",

  EACH_BLOCK_PATTERN_SOURCE:
    "\\{\\{#each (\\w+)\\}\\}([\\s\\S]*?)\\{\\{\\/each\\}\\}",
  EACH_BLOCK_PATTERN_FLAGS: "g",

  COMMENT_PATTERN_SOURCE: "\\{\\{!--[\\s\\S]*?--\\}\\}",
  COMMENT_PATTERN_FLAGS: "g",
});

// 🔧 通知配置常量
export const NOTIFICATION_CONFIG = deepFreeze({
  DEFAULT_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.NOTIFICATION.SEND_TIMEOUT_MS, // 使用统一配置
  MAX_RETRY_ATTEMPTS: RETRY_CONSTANTS.BUSINESS_SCENARIOS.NOTIFICATION.MAX_RETRY_ATTEMPTS, // 使用统一配置
  RETRY_DELAY_MS: RETRY_CONSTANTS.BUSINESS_SCENARIOS.NOTIFICATION.RETRY_DELAY_MS, // 使用统一配置
  BATCH_SIZE_LIMIT: BATCH_CONSTANTS.BUSINESS_SCENARIOS.NOTIFICATION.DEFAULT_BATCH_SIZE, // 使用统一配置
  TEMPLATE_CACHE_TTL_MS: 300000, // 5分钟
  SENDER_HEALTH_CHECK_INTERVAL_MS: 60000, // 1分钟
  MAX_TEMPLATE_SIZE_BYTES: 10240, // 10KB
  MAX_VARIABLE_COUNT: 50,
});

// 📊 通知类型优先级常量
export const NOTIFICATION_TYPE_PRIORITY = deepFreeze({
  EMAIL: 1,
  SLACK: 2,
  WEBHOOK: 3,
  DINGTALK: 4,
  LOG: 5,
});

// 📈 通知指标常量
export const NOTIFICATION_METRICS = deepFreeze({
  NOTIFICATION_SENT_COUNT: "notification_sent_count",
  NOTIFICATION_FAILED_COUNT: "notification_failed_count",
  BATCH_PROCESSING_COUNT: "notification_batch_processing_count",
  TEMPLATE_GENERATION_COUNT: "notification_template_generation_count",
  CHANNEL_TEST_COUNT: "notification_channel_test_count",
  AVERAGE_SEND_DURATION: "notification_avg_send_duration",
  AVERAGE_BATCH_DURATION: "notification_avg_batch_duration",
  SENDER_AVAILABILITY: "notification_sender_availability",
  TEMPLATE_CACHE_HIT_RATE: "notification_template_cache_hit_rate",
});

// 🔍 验证规则常量
export const NOTIFICATION_VALIDATION_RULES = deepFreeze({
  MIN_TEMPLATE_LENGTH: 1,
  MAX_TEMPLATE_LENGTH: 10000,
  MIN_VARIABLE_NAME_LENGTH: 1,
  MAX_VARIABLE_NAME_LENGTH: 50,
  VARIABLE_NAME_PATTERN_SOURCE: "^[a-zA-Z][a-zA-Z0-9_]*$",
  VARIABLE_NAME_PATTERN_FLAGS: "",
  EMAIL_PATTERN_SOURCE: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
  EMAIL_PATTERN_FLAGS: "",
  URL_PATTERN_SOURCE: "^https?:\\/\\/.+",
  URL_PATTERN_FLAGS: "",
});

// ⏰ 时间配置常量
export const NOTIFICATION_TIME_CONFIG = deepFreeze({
  DEFAULT_SEND_TIMEOUT_MS: 10000,
  BATCH_PROCESSING_TIMEOUT_MS: 60000,
  TEMPLATE_GENERATION_TIMEOUT_MS: 5000,
  CHANNEL_TEST_TIMEOUT_MS: 15000,
  SENDER_INITIALIZATION_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.NOTIFICATION.SEND_TIMEOUT_MS, // 使用统一配置
  HEALTH_CHECK_TIMEOUT_MS: 5000,
});

// 🚨 告警阈值常量
export const NOTIFICATION_ALERT_THRESHOLDS = deepFreeze({
  MAX_FAILED_PERCENTAGE: 10,
  MAX_RESPONSE_TIME_MS: 5000,
  MIN_SUCCESS_RATE: 0.95,
  MAX_QUEUE_SIZE: 1000,
  MAX_PROCESSING_TIME_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.NOTIFICATION.SEND_TIMEOUT_MS, // 使用统一配置
});

// 🔄 重试配置常量 - 使用共享基础配置
export { NOTIFICATION_RETRY_CONFIG } from "./retry.constants";
