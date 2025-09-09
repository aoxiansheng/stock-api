import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { NotificationChannelType, NotificationLog as INotificationLog } from "../types/alert.types";
import type { NotificationMetadata } from "../types/context.types";
import { ALERT_CORE_TIMEOUTS } from "../constants";

export type NotificationLogDocument = NotificationLog & Document;

@Schema({
  timestamps: true,
  collection: "notification_logs",
})
export class NotificationLog implements INotificationLog {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  alertId: string;

  @Prop({ required: true })
  channelId: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(NotificationChannelType),
  })
  channelType: NotificationChannelType;

  @Prop({ required: true })
  success: boolean;

  @Prop()
  message?: string;

  @Prop()
  error?: string;

  @Prop({ required: true })
  sentAt: Date;

  @Prop({ required: true })
  duration: number; // 发送耗时（毫秒）

  @Prop({ default: 0 })
  retryCount: number;

  // 额外的元数据
  @Prop({ type: Object })
  metadata?: NotificationMetadata; // 🎯 运行时元数据：通知发送过程中的技术指标和状态信息

  // 语义化访问器 - 提供统一的时间字段访问方式
  get notificationCreatedAt(): Date {
    return this.sentAt;
  }

  get notificationProcessedAt(): Date {
    return this.sentAt;
  }
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);

// 创建索引
NotificationLogSchema.index({ alertId: 1, sentAt: -1 });
NotificationLogSchema.index({ channelType: 1, success: 1 });
NotificationLogSchema.index({ sentAt: -1 });
NotificationLogSchema.index({ success: 1, sentAt: -1 });
NotificationLogSchema.index({ channelId: 1, sentAt: -1 });

// TTL 索引 - 自动删除日志 (使用预计算常量值优化性能)
NotificationLogSchema.index(
  { sentAt: 1 },
  { expireAfterSeconds: ALERT_CORE_TIMEOUTS.DB_TTL_SECONDS.NOTIFICATION_LOG }, // 30天保留，预计算值
);
