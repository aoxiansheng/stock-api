/**
 * 通知服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */
import { deepFreeze } from "@common/utils/object-immutability.util";
// Imports for notification constants
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

// 📋 模板变量常量（核心变量）
export const NOTIFICATION_TEMPLATE_VARIABLES = deepFreeze({
  // 告警基础信息
  ALERT_ID: "alertId",
  RULE_NAME: "ruleName",
  METRIC: "metric",
  VALUE: "value",
  THRESHOLD: "threshold",
  SEVERITY: "severity",
  STATUS: "status",
  MESSAGE: "message",
  
  // 时间相关
  START_TIME: "startTime",
  END_TIME: "endTime",
  DURATION: "duration",
  
  // 额外信息
  TAGS: "tags",
  RULE_ID: "ruleId",
  RULE_DESCRIPTION: "ruleDescription"
});

// 🎨 简化的模板格式化常量
/**
 * 通知模板变量替换（简化版）
 * 
 * 仅支持基础的变量替换功能:
 * 
 * ## 变量替换 (Variable Substitution)
 * 语法: {{variableName}}
 * 用途: 在模板中插入动态变量值
 * 
 * 示例:
 * ```
 * 模板: "告警: {{alertName}} 在 {{timestamp}} 触发"
 * 数据: { alertName: "CPU使用率过高", timestamp: "2025-09-06 10:30:00" }
 * 结果: "告警: CPU使用率过高 在 2025-09-06 10:30:00 触发"
 * ```
 */
export const NOTIFICATION_TEMPLATE_PATTERNS = deepFreeze({
  // 变量模式: {{variableName}} -> 替换为对应的变量值
  VARIABLE_PATTERN: /\{\{(\w+)\}\}/g,
});


// 🔍 验证规则常量
export const NOTIFICATION_VALIDATION_RULES = deepFreeze({
  VARIABLE_NAME_PATTERN_SOURCE: '^[a-zA-Z][a-zA-Z0-9_]*$',
  VARIABLE_NAME_PATTERN_FLAGS: 'g',
  MIN_VARIABLE_NAME_LENGTH: 1,
  MAX_VARIABLE_NAME_LENGTH: 50,
  MIN_TEMPLATE_LENGTH: 1,
  MAX_TEMPLATE_LENGTH: 2000,
  EMAIL_PATTERN_SOURCE: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  EMAIL_PATTERN_FLAGS: 'i',
  URL_PATTERN_SOURCE: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$',
  URL_PATTERN_FLAGS: 'i',
});

// 🔄 重试配置常量 - 使用共享基础配置
export { NOTIFICATION_RETRY_CONFIG } from "./retry.constants";
