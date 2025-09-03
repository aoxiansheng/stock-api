/**
 * 告警模块频率限制常量
 * 统一管理告警相关的限制配置
 */

export const ALERT_RATE_LIMIT = {
  // 手动触发告警评估限制
  TRIGGER_EVALUATION: {
    MAX_REQUESTS_PER_MINUTE: 5, // 每分钟最多5次
    WINDOW_MS: 60 * 1000, // 1分钟窗口
  },

  // 告警通知频率限制
  NOTIFICATION: {
    MAX_REQUESTS_PER_MINUTE: 10, // 每分钟最多10次通知
    WINDOW_MS: 60 * 1000, // 1分钟窗口
    COOLDOWN_MS: 5 * 60 * 1000, // 5分钟冷却期
  },

  // 批量操作限制
  BATCH_OPERATIONS: {
    MAX_ITEMS_PER_REQUEST: 100, // 单次批量操作最多100项
    MAX_REQUESTS_PER_MINUTE: 3, // 每分钟最多3次批量操作
    WINDOW_MS: 60 * 1000,
  },
} as const;

export const ALERT_RATE_LIMIT_MESSAGES = {
  TRIGGER_RATE_EXCEEDED: "手动触发频率过高，请稍后再试",
  NOTIFICATION_RATE_EXCEEDED: "通知发送频率过高，请稍后再试",
  BATCH_RATE_EXCEEDED: "批量操作频率过高，请稍后再试",
  BATCH_SIZE_EXCEEDED: "批量操作项目数量超过限制",
} as const;
