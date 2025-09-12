import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationChannelType } from '../types/notification.types';

/**
 * 通知日志文档类型
 */
export type NotificationLogDocument = NotificationLog & Document;

/**
 * 通知日志Schema - 基于NotificationLog接口
 * 用于记录通知发送的详细日志信息
 */
@Schema({
  collection: 'notification_logs',
  timestamps: true,
  versionKey: false,
})
export class NotificationLog {
  /**
   * MongoDB自动生成的ID
   */
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  /**
   * 字符串形式的ID (兼容接口定义)
   */
  id: string;

  /**
   * 通知ID
   */
  @Prop({ required: true, index: true })
  notificationId: string;

  /**
   * 警告ID
   */
  @Prop({ required: true, index: true })
  alertId: string;

  /**
   * 渠道ID
   */
  @Prop({ required: true, index: true })
  channelId: string;

  /**
   * 渠道类型
   */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(NotificationChannelType),
    index: true,
  })
  channelType: NotificationChannelType;

  /**
   * 是否成功
   */
  @Prop({ required: true, index: true })
  success: boolean;

  /**
   * 消息内容 (可选)
   */
  @Prop({ required: false })
  message?: string;

  /**
   * 错误信息 (可选)
   */
  @Prop({ required: false })
  error?: string;

  /**
   * 发送时间
   */
  @Prop({ required: true, index: true })
  sentAt: Date;

  /**
   * 持续时间 (毫秒)
   */
  @Prop({ required: true, min: 0 })
  duration: number;

  /**
   * 重试次数
   */
  @Prop({ required: true, min: 0, default: 0 })
  retryCount: number;

  /**
   * 元数据 (可选的JSON对象)
   */
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  /**
   * 创建时间 (由timestamps自动生成)
   */
  createdAt: Date;

  /**
   * 更新时间 (由timestamps自动生成)
   */
  updatedAt: Date;
}

/**
 * NotificationLog Schema工厂
 */
export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

// 创建复合索引以优化查询性能
NotificationLogSchema.index({ alertId: 1, sentAt: -1 }); // 按警告ID和时间查询
NotificationLogSchema.index({ notificationId: 1, channelType: 1 }); // 按通知ID和渠道类型查询
NotificationLogSchema.index({ success: 1, sentAt: -1 }); // 按成功状态和时间查询

// 虚拟字段 - 将_id转换为字符串id
NotificationLogSchema.virtual('id').get(function (this: NotificationLogDocument) {
  return this._id?.toHexString();
});

// 确保虚拟字段在JSON序列化时包含
NotificationLogSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    return ret;
  },
});