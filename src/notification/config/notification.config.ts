/**
 * Notification配置向后兼容别名
 * 🎯 为过时代码提供平滑迁移路径
 * 
 * @description
 * 这是一个向后兼容的配置文件，重新导出统一配置
 * 专门为处理过时代码中的 @deprecated 引用而创建
 * 
 * @deprecated 建议直接使用 @notification/config/notification-unified.config.ts
 * @see src/notification/config/notification-unified.config.ts
 */

import {
  NotificationUnifiedConfigValidation,
  NotificationUnifiedConfig,
  NotificationBatchConfig,
  NotificationTimeoutConfig,
  NotificationRetryConfig,
  NotificationValidationConfig,
  NotificationFeatureConfig,
  NotificationTemplateConfig,
} from './notification-unified.config';

// 重新导出所有配置类型
export {
  NotificationUnifiedConfigValidation,
  NotificationUnifiedConfig,
  NotificationBatchConfig,
  NotificationTimeoutConfig,
  NotificationRetryConfig,
  NotificationValidationConfig,
  NotificationFeatureConfig,
  NotificationTemplateConfig,
};

// 重新导出默认配置
export { default as notificationConfig } from './notification-unified.config';
export { default } from './notification-unified.config';

/**
 * 向后兼容的常量映射
 * 🎯 映射过时常量文件中引用的配置值
 * 
 * 这些常量对应 src/common/constants/validation.constants.ts 中
 * NOTIFICATION_VALIDATION_LIMITS 的deprecated部分
 */

// 创建配置实例用于常量提取
const defaultConfig = new NotificationUnifiedConfigValidation();

/**
 * 批量配置常量 (向后兼容)
 * @deprecated 使用 NotificationBatchConfig 替代
 */
export const NOTIFICATION_BATCH_CONSTANTS = {
  BATCH_SIZE_MIN: 1,
  BATCH_SIZE_MAX: defaultConfig.batch.maxBatchSize,
  BATCH_SIZE_DEFAULT: defaultConfig.batch.defaultBatchSize,
  MAX_CONCURRENCY: defaultConfig.batch.maxConcurrency,
  BATCH_TIMEOUT: defaultConfig.batch.batchTimeout,
} as const;

/**
 * 超时配置常量 (向后兼容)
 * @deprecated 使用 NotificationTimeoutConfig 替代
 */
export const NOTIFICATION_TIMEOUT_CONSTANTS = {
  SEND_TIMEOUT_MIN: 1000,
  SEND_TIMEOUT_MAX: 180000,
  SEND_TIMEOUT_DEFAULT: defaultConfig.timeouts.defaultTimeout,
  EMAIL_TIMEOUT: defaultConfig.timeouts.emailTimeout,
  SMS_TIMEOUT: defaultConfig.timeouts.smsTimeout,
  WEBHOOK_TIMEOUT: defaultConfig.timeouts.webhookTimeout,
} as const;

/**
 * 重试配置常量 (向后兼容)
 * @deprecated 使用 NotificationRetryConfig 替代
 */
export const NOTIFICATION_RETRY_CONSTANTS = {
  SEND_RETRIES_MIN: 1,
  SEND_RETRIES_MAX: 10,
  SEND_RETRIES_DEFAULT: defaultConfig.retry.maxRetryAttempts,
  INITIAL_RETRY_DELAY: defaultConfig.retry.initialRetryDelay,
  RETRY_BACKOFF_MULTIPLIER: defaultConfig.retry.retryBackoffMultiplier,
  MAX_RETRY_DELAY: defaultConfig.retry.maxRetryDelay,
} as const;

/**
 * 向后兼容的类型定义
 * @deprecated 使用统一配置类型替代
 */
export type NotificationBatchConstants = typeof NOTIFICATION_BATCH_CONSTANTS;
export type NotificationTimeoutConstants = typeof NOTIFICATION_TIMEOUT_CONSTANTS;
export type NotificationRetryConstants = typeof NOTIFICATION_RETRY_CONSTANTS;

/**
 * 迁移指南
 * 
 * 旧的使用方式:
 * ```typescript
 * import { NOTIFICATION_VALIDATION_LIMITS } from '@common/constants/validation.constants';
 * const batchSize = NOTIFICATION_VALIDATION_LIMITS.BATCH_SIZE_MAX;
 * ```
 * 
 * 新的使用方式:
 * ```typescript
 * import { ConfigType } from '@nestjs/config';
 * import notificationConfig from '@notification/config/notification.config';
 * 
 * @Injectable()
 * export class NotificationService {
 *   constructor(
 *     @Inject(notificationConfig.KEY)
 *     private readonly config: ConfigType<typeof notificationConfig>,
 *   ) {}
 * 
 *   getBatchSize() {
 *     return this.config.batch.maxBatchSize;
 *   }
 * }
 * ```
 */