/**
 * Notification配置模块统一导出
 * 🎯 提供类型定义和配置访问工具
 */

import { ConfigService } from "@nestjs/config";

export { default as notificationUnifiedConfig } from "./notification-unified.config";
export type {
  NotificationUnifiedConfig,
  NotificationBatchConfig,
  NotificationTimeoutConfig,
  NotificationRetryConfig,
  NotificationValidationConfig,
  NotificationFeatureConfig,
  NotificationTemplateConfig,
} from "./notification-unified.config";

export type {
  NotificationChannelTemplatesConfig,
  AlertTemplateConfig,
} from "./notification-channel-templates.config";

export type {
  NotificationChannelDefaultsConfig,
  EmailChannelDefaultConfig,
  SmsChannelDefaultConfig,
  WebhookChannelDefaultConfig,
  SlackChannelDefaultConfig,
} from "./notification-channel-defaults.config";

// 导入类型供函数使用
import type { NotificationUnifiedConfig } from "./notification-unified.config";

// 配置访问辅助函数
export const getNotificationConfig = (
  configService: ConfigService,
): NotificationUnifiedConfig => {
  return configService.get<NotificationUnifiedConfig>("notification");
};
