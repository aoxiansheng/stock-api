import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { INotificationLog } from "../interfaces";
import { NotificationType } from "../types/alert.types";

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
    enum: Object.values(NotificationType),
  })
  channelType: NotificationType;

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
  metadata?: Record<string, any>;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);

// 创建索引
NotificationLogSchema.index({ alertId: 1, sentAt: -1 });
NotificationLogSchema.index({ channelType: 1, success: 1 });
NotificationLogSchema.index({ sentAt: -1 });
NotificationLogSchema.index({ success: 1, sentAt: -1 });
NotificationLogSchema.index({ channelId: 1, sentAt: -1 });

// TTL 索引 - 自动删除30天前的通知日志
NotificationLogSchema.index(
  { sentAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
