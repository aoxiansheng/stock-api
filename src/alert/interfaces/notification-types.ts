// 🎯 已迁移到 ./types/alert.types.ts
// 保持向后兼容的重新导出
import {
  NotificationChannel,
  NotificationResult,
  BatchNotificationResult,
  NotificationSender,
  NotificationTemplate,
  NotificationLog,
} from "../types/alert.types";

export type INotificationChannel = NotificationChannel;
export type INotificationResult = NotificationResult;
export type IBatchNotificationResult = BatchNotificationResult;
export type INotificationSender = NotificationSender;
export type INotificationTemplate = NotificationTemplate;
export type INotificationLog = NotificationLog;
