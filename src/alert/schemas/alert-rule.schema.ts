import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { IAlertRule } from "../interfaces/alert.interface";
import { AlertSeverity, NotificationChannelType } from "../types/alert.types";
import type { NotificationChannel } from "../types/alert.types";
import { ALERT_DEFAULTS, VALID_OPERATORS, type Operator } from "../constants";

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
    type: String,
    required: true,
    enum: VALID_OPERATORS,
    default: ALERT_DEFAULTS.operator,
  })
  operator: Operator;

  @Prop({ required: true })
  threshold: number;

  @Prop({ required: true, default: ALERT_DEFAULTS.duration })
  duration: number; // 持续时间（秒）

  @Prop({
    required: true,
    type: String,
    enum: Object.values(AlertSeverity),
    default: ALERT_DEFAULTS.severity,
  })
  severity: AlertSeverity;

  @Prop({ default: ALERT_DEFAULTS.enabled })
  enabled: boolean;

  @Prop({ type: [Object], default: [] })
  channels: NotificationChannel[];

  @Prop({
    default: () => {
      // TODO: 在实际应用中，应该从配置服务获取默认值
      // 当前硬编码保持数据库兼容性，实际TTL管理在alert.config.ts
      return 300;
    },
  })
  cooldown: number; // 冷却时间（秒）- 默认从alert.config.ts的defaultCooldown获取

  @Prop({ type: Object, default: {} })
  tags?: Record<string, string>;

  @Prop()
  createdBy?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // 语义化访问器 - 提供统一的时间字段访问方式
  get ruleCreatedAt(): Date {
    return this.createdAt;
  }

  get ruleUpdatedAt(): Date {
    return this.updatedAt;
  }

  // 语义化访问器 - 提供统一的用户字段访问方式
  get ruleCreator(): string | undefined {
    return this.createdBy;
  }

  get ruleOperator(): string | undefined {
    return this.operator; // 返回操作符而非创建者
  }
}

export const AlertRuleSchema = SchemaFactory.createForClass(AlertRule);

// 创建索引
AlertRuleSchema.index({ metric: 1, enabled: 1 });
AlertRuleSchema.index({ severity: 1, enabled: 1 });
AlertRuleSchema.index({ createdAt: -1 });
AlertRuleSchema.index({ "tags.environment": 1 });
AlertRuleSchema.index({ "tags.service": 1 });
