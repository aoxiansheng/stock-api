/**
 * 通知渠道配置DTO统一导出
 * 按通知类型分类管理，便于维护和扩展
 */

// 邮件通知
export { EmailConfigDto } from "./email-notification.dto";

// Webhook通知
export { WebhookConfigDto } from "./webhook-notification.dto";

// Slack通知
export { SlackConfigDto } from "./slack-notification.dto";

// 钉钉通知
export { DingTalkConfigDto } from "./dingtalk-notification.dto";

// 短信通知
export { SmsConfigDto } from "./sms-notification.dto";

// 日志通知
export { LogConfigDto } from "./log-notification.dto";
