import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { IAlert } from "../interfaces";
import { AlertSeverity, AlertStatus } from "../types/alert.types";
import type { AlertContext } from "../types/context.types";
import { ALERT_QUICK_ACCESS } from "../constants";

export type AlertHistoryDocument = AlertHistory & Document;

@Schema({
  timestamps: true,
  collection: "alert_history",
})
export class AlertHistory implements IAlert {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  ruleId: string;

  @Prop({ required: true })
  ruleName: string;

  @Prop({ required: true })
  metric: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  threshold: number;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(AlertSeverity),
  })
  severity: AlertSeverity;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(AlertStatus),
    default: AlertStatus.FIRING,
  })
  status: AlertStatus;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  acknowledgedBy?: string;

  @Prop()
  acknowledgedAt?: Date;

  @Prop()
  resolvedBy?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Object, default: {} })
  tags?: Record<string, string>;

  @Prop({ type: Object, default: {} })
  context?: AlertContext; // 🎯 业务上下文：告警触发时的业务场景和环境信息

  // 语义化访问器 - 提供统一的时间字段访问方式
  get alertCreatedAt(): Date {
    return this.startTime;
  }

  get alertProcessedAt(): Date | undefined {
    return this.acknowledgedAt || this.resolvedAt;
  }

  get alertEndedAt(): Date | undefined {
    return this.endTime;
  }

  // 语义化访问器 - 提供统一的用户字段访问方式
  // 获取处理告警的人员（优先返回解决者）
  get alertHandler(): string | undefined {
    return this.resolvedBy || this.acknowledgedBy;
  }

  // 获取确认告警的人员
  get alertAcknowledger(): string | undefined {
    return this.acknowledgedBy;
  }

  // 获取解决告警的人员
  get alertResolver(): string | undefined {
    return this.resolvedBy;
  }
}

export const AlertHistorySchema = SchemaFactory.createForClass(AlertHistory);

// 创建索引
AlertHistorySchema.index({ ruleId: 1, startTime: -1 });
AlertHistorySchema.index({ severity: 1, status: 1 });
AlertHistorySchema.index({ startTime: -1 });
AlertHistorySchema.index({ status: 1, startTime: -1 });
AlertHistorySchema.index({ metric: 1, startTime: -1 });
AlertHistorySchema.index({ "tags.environment": 1 });
AlertHistorySchema.index({ "tags.service": 1 });

// TTL 索引 - 自动删除告警历史 (使用预计算常量值优化性能)
AlertHistorySchema.index(
  { startTime: 1 },
  { expireAfterSeconds: ALERT_QUICK_ACCESS.RETENTION.ALERT_HISTORY_DAYS * 86400 }, // 90天，预计算值
);