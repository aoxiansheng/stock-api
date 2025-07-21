import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { IAlertRule } from "../interfaces/alert.interface";
import { AlertSeverity, NotificationType } from "../types/alert.types";


// 临时定义避免循环依赖
interface NotificationChannel {
  id?: string;
  name: string;
  type: NotificationType;
  config: Record<string, any>;
  enabled: boolean;
  retryCount?: number;
  timeout?: number;
  priority?: number;
}

export type AlertRuleDocument = AlertRule & Document;

@Schema({
  timestamps: true,
  collection: "alert_rules",
})
export class AlertRule implements IAlertRule {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  metric: string;

  @Prop({ 
    required: true, 
    enum: ["gt", "lt", "eq", "gte", "lte", "ne"],
    default: "gt"
  })
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "ne";

  @Prop({ required: true })
  threshold: number;

  @Prop({ required: true, default: 60 })
  duration: number; // 持续时间（秒）

  @Prop({ 
    required: true, 
    type: String,
    enum: Object.values(AlertSeverity),
    default: AlertSeverity.WARNING
  })
  severity: AlertSeverity;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: [Object], default: [] })
  channels: NotificationChannel[];

  @Prop({ default: 300 })
  cooldown: number; // 冷却时间（秒）

  @Prop({ type: Object, default: {} })
  tags?: Record<string, string>;

  @Prop()
  createdBy?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AlertRuleSchema = SchemaFactory.createForClass(AlertRule);

// 创建索引
AlertRuleSchema.index({ metric: 1, enabled: 1 });
AlertRuleSchema.index({ severity: 1, enabled: 1 });
AlertRuleSchema.index({ createdAt: -1 });
AlertRuleSchema.index({ "tags.environment": 1 });
AlertRuleSchema.index({ "tags.service": 1 });
