/**
 * 告警严重级别枚举
 */
export enum AlertSeverity {
  CRITICAL = "critical",
  WARNING = "warning",
  INFO = "info",
}

/**
 * 告警严重级别优先级映射
 */
export const ALERT_SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  [AlertSeverity.CRITICAL]: 3,
  [AlertSeverity.WARNING]: 2,
  [AlertSeverity.INFO]: 1,
};

/**
 * 告警严重级别描述
 */
export const ALERT_SEVERITY_DESCRIPTIONS: Record<AlertSeverity, string> = {
  [AlertSeverity.CRITICAL]: "严重告警 - 需要立即处理",
  [AlertSeverity.WARNING]: "警告告警 - 需要关注",
  [AlertSeverity.INFO]: "信息告警 - 仅供参考",
};
