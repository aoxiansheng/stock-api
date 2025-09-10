import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { NotificationLog as INotificationLog, NotificationChannelType, NotificationStatus } from "../types/alert.types";
import { ALERT_QUICK_ACCESS } from "../constants";
             

export type NotificationLogDocument = NotificationLog & Document;

@Schema({
  timestamps: true,
  collection: "notification_logs",
})
export class NotificationLog implements INotificationLog {
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

  @Prop({ required: true, type: Boolean })
  success: boolean;

  @Prop()
  message?: string;

  @Prop()
  error?: string;

  @Prop({ required: true })
  sentAt: Date;

  @Prop({ required: true, type: Number })
  duration: number;

  @Prop({ required: true, type: Number, default: 0 })
  retryCount: number;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

// 创建索引
NotificationLogSchema.index({ alertId: 1, sentAt: -1 });
NotificationLogSchema.index({ success: 1 });
NotificationLogSchema.index({ channelType: 1 });
NotificationLogSchema.index({ sentAt: -1 });
NotificationLogSchema.index({ "metadata.ruleId": 1 });

// TTL 索引 - 自动删除通知日志 (使用预计算常量值优化性能)
NotificationLogSchema.index(
  { sentAt: 1 },
  { expireAfterSeconds: ALERT_QUICK_ACCESS.RETENTION.METRICS_DAYS * 86400 }, // 30天保留，预计算值
);