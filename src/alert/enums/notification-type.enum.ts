/**
 * 通知类型枚举
 */
export enum NotificationType {
  EMAIL = "email",
  WEBHOOK = "webhook",
  SLACK = "slack",
  LOG = "log",
  SMS = "sms",
  DINGTALK = "dingtalk",
}

/**
 * 通知类型描述
 */
export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> =
  {
    [NotificationType.EMAIL]: "邮件通知",
    [NotificationType.WEBHOOK]: "Webhook通知",
    [NotificationType.SLACK]: "Slack通知",
    [NotificationType.LOG]: "日志记录",
    [NotificationType.SMS]: "短信通知",
    [NotificationType.DINGTALK]: "钉钉通知",
  };

/**
 * 通知类型配置要求
 */
export const NOTIFICATION_CONFIG_REQUIREMENTS: Record<
  NotificationType,
  string[]
> = {
  [NotificationType.EMAIL]: ["to", "subject"],
  [NotificationType.WEBHOOK]: ["url"],
  [NotificationType.SLACK]: ["webhook_url", "channel"],
  [NotificationType.LOG]: ["level"],
  [NotificationType.SMS]: ["phone", "template"],
  [NotificationType.DINGTALK]: ["webhook_url", "secret"],
};
