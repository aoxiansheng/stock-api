/**
 * 通知渠道配置DTO统一导出
 * 🎯 提供所有通知渠道配置DTOs的统一导出入口
 * 
 * @description 从Alert模块迁移的通知渠道配置DTOs导出文件
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
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