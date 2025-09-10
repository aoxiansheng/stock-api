/**
 * 通知实例Schema
 * 🎯 定义通知实例在MongoDB中的数据结构
 * 
 * @description 从Alert模块迁移的通知Schema，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

import { 
  NotificationChannelType, 
  NotificationPriority,
  NotificationStatus,
} from "../types/notification.types";

export type NotificationDocument = NotificationInstance & Document;

@Schema({
  collection: "notifications",
  timestamps: true,
  versionKey: false,
})
export class NotificationInstance {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Alert' })
  alertId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'NotificationChannel' })
  channelId: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: Object.values(NotificationChannelType),
    type: String,
  })
  channelType: NotificationChannelType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ 
    required: true,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
    type: String,
  })
  status: NotificationStatus;

  @Prop({ 
    required: true,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.NORMAL,
    type: String,
  })
  priority: NotificationPriority;

  @Prop({ required: true, trim: true })
  recipient: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ min: 0, default: 0 })
  retryCount: number;

  @Prop({ min: 0 })
  duration?: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationInstance);

// 添加索引
NotificationSchema.index({ alertId: 1 });
NotificationSchema.index({ channelId: 1 });
NotificationSchema.index({ channelType: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ sentAt: -1 });
NotificationSchema.index({ deliveredAt: -1 });
NotificationSchema.index({ failedAt: -1 });
NotificationSchema.index({ retryCount: 1 });
NotificationSchema.index({ 
  status: 1, 
  priority: 1, 
  createdAt: -1 
}, { 
  name: "status_priority_created" 
});
NotificationSchema.index({ 
  alertId: 1, 
  channelType: 1, 
  status: 1 
}, { 
  name: "alert_channel_status" 
});