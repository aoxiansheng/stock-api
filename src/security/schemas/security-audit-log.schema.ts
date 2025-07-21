import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SecurityAuditLogDocument = SecurityAuditLog & Document;

@Schema({ collection: "security_audit_logs", timestamps: true })
export class SecurityAuditLog {
  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ required: true, index: true })
  severity: string;

  @Prop({ required: true })
  action: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  apiKeyId?: string;

  @Prop({ required: true, index: true })
  clientIP: string;

  @Prop()
  userAgent: string;

  @Prop()
  requestUrl?: string;

  @Prop()
  requestMethod?: string;

  @Prop()
  responseStatus?: number;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true, index: true })
  outcome: string;

  @Prop({ min: 0, max: 100 })
  riskScore: number;

  @Prop({ type: [String] })
  tags: string[];
}

export const SecurityAuditLogSchema =
  SchemaFactory.createForClass(SecurityAuditLog);
