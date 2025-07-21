import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { IAlert } from "../interfaces";
import { AlertSeverity, AlertStatus } from "../types/alert.types";


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
    enum: Object.values(AlertSeverity)
  })
  severity: AlertSeverity;

  @Prop({ 
    required: true, 
    type: String,
    enum: Object.values(AlertStatus),
    default: AlertStatus.FIRING
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
  context?: Record<string, any>;

  // 计算字段
  get duration(): number {
    if (!this.endTime) return 0;
    return this.endTime.getTime() - this.startTime.getTime();
  }

  get isActive(): boolean {
    return this.status === AlertStatus.FIRING || this.status === AlertStatus.ACKNOWLEDGED;
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

// TTL 索引 - 自动删除90天前的告警历史
AlertHistorySchema.index({ startTime: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
