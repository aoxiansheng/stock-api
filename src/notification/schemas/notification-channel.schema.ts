/**
 * 通知渠道Schema
 * 🎯 定义通知渠道在MongoDB中的数据结构
 * 
 * @description 从Alert模块迁移的通知渠道Schema，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { 
  NotificationChannelType, 
  NotificationPriority 
} from "../types/notification.types";

export type NotificationChannelDocument = NotificationChannel & Document;

@Schema({
  collection: "notification_channels",
  timestamps: true,
  versionKey: false,
})
export class NotificationChannel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ 
    required: true, 
    enum: Object.values(NotificationChannelType),
    type: String,
  })
  type: NotificationChannelType;

  @Prop({ required: true, type: Object })
  config: Record<string, any>;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ min: 0, max: 10, default: 3 })
  retryCount: number;

  @Prop({ min: 1000, max: 300000, default: 30000 })
  timeout: number;

  @Prop({ 
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.NORMAL,
    type: String,
  })
  priority: NotificationPriority;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Object })
  tags?: Record<string, string>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationChannelSchema = SchemaFactory.createForClass(NotificationChannel);

// 添加索引
NotificationChannelSchema.index({ name: 1 }, { unique: true });
NotificationChannelSchema.index({ type: 1 });
NotificationChannelSchema.index({ enabled: 1 });
NotificationChannelSchema.index({ priority: 1 });
NotificationChannelSchema.index({ createdAt: -1 });
NotificationChannelSchema.index({ "tags.environment": 1 });
NotificationChannelSchema.index({ "tags.team": 1 });