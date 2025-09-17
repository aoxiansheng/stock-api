/**
 * 通知模块验证限制常量
 * 🎯 独立的验证限制配置，移除对外部依赖的耦合
 *
 * @description 包含所有通知模块相关的验证限制常量
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
 * @author Claude Code Assistant
 * @date 2025-09-17
 */

/**
 * 通知验证限制常量
 * 🔒 这些限制值对应NotificationEnhancedConfig中的配置
 */
export const NOTIFICATION_VALIDATION_LIMITS = {
  // 重试次数限制
  SEND_RETRIES_MIN: 1,
  SEND_RETRIES_MAX: 10,

  // 超时时间限制（毫秒）
  SEND_TIMEOUT_MIN: 1000,
  SEND_TIMEOUT_MAX: 120000,

  // 变量名长度限制
  VARIABLE_NAME_MIN_LENGTH: 1,
  VARIABLE_NAME_MAX_LENGTH: 100,

  // 模板长度限制
  MIN_TEMPLATE_LENGTH: 1,
  MAX_TEMPLATE_LENGTH: 20000,

  // 标题和内容长度限制
  TITLE_MAX_LENGTH: 500,
  CONTENT_MAX_LENGTH: 5000,
} as const;

/**
 * 通知验证限制类型
 */
export type NotificationValidationLimitsType = typeof NOTIFICATION_VALIDATION_LIMITS;