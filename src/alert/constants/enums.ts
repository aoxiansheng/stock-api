/**
 * Alert 枚举常量
 * 🎯 从 common/constants/domain/alert-domain.constants.ts 剥离的枚举定义
 * 专用于 Alert 模块的业务枚举类型
 */

/**
 * 告警类型枚举
 * 🎯 统一告警类型分类
 */
export enum AlertType {
  PRICE_ALERT = "price_alert", // 价格告警
  VOLUME_ALERT = "volume_alert", // 成交量告警
  TECHNICAL_ALERT = "technical_alert", // 技术指标告警
  NEWS_ALERT = "news_alert", // 新闻告警
  SYSTEM_ALERT = "system_alert", // 系统告警
  CUSTOM_ALERT = "custom_alert", // 自定义告警
}

/**
 * 通知渠道枚举
 * 🎯 统一通知渠道类型
 */
export enum NotificationChannel {
  EMAIL = "email", // 邮件
  SMS = "sms", // 短信
  WEBHOOK = "webhook", // Webhook
  PUSH = "push", // 推送通知
  IN_APP = "in_app", // 应用内通知
}
