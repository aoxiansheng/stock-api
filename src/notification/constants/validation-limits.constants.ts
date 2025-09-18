/**
 * 通知模块验证限制常量
 * 🎯 独立的验证限制配置，移除对外部依赖的耦合
 *
 * @description 包含所有通知模块相关的验证限制常量
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
 * @author Claude Code Assistant
 * @date 2025-09-17
 * 
 * 🎯 过时代码清理注释:
 * ✅ 此文件已经是独立的模块化常量，不依赖@common/constants
 * ✅ 与新的notification-unified.config.ts完全对齐
 * ✅ 不需要迁移，符合配置分离原则
 */

/**
 * 通知验证限制常量
 * 🔒 这些限制值对应NotificationUnifiedConfig中的配置
 * 📋 替代过时的@common/constants/validation.constants中的NOTIFICATION_VALIDATION_LIMITS
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
  CONTENT_MAX_LENGTH_EXTENDED: 10000,

  // URL和联系方式长度限制
  WEBHOOK_URL_MAX_LENGTH: 2000,
  EMAIL_MAX_LENGTH: 320,
  PHONE_MAX_LENGTH: 20,

  // 数组大小限制
  MAX_RECIPIENTS: 100,
  MAX_TAGS: 20,
  MAX_BATCH_SIZE: 100,
} as const;

/**
 * 通知验证限制类型
 */
export type NotificationValidationLimitsType = typeof NOTIFICATION_VALIDATION_LIMITS;