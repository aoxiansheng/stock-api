import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// --- Sub-documents Schemas ---

@Schema({ _id: false })
class VulnerabilitySummary {
  @Prop({ required: true })
  critical: number;
  @Prop({ required: true })
  high: number;
  @Prop({ required: true })
  medium: number;
  @Prop({ required: true })
  low: number;
  @Prop({ required: true })
  info: number;
}
const VulnerabilitySummarySchema =
  SchemaFactory.createForClass(VulnerabilitySummary);

@Schema({ _id: false })
class SecurityVulnerability {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  type: string;
  @Prop({ required: true })
  severity: string;
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  description: string;
  @Prop({ required: true })
  impact: string;
  @Prop({ required: true })
  recommendation: string;
  @Prop()
  cve?: string;
  @Prop({ required: true })
  detected: Date;
  @Prop({ required: true })
  status: string;
}
const SecurityVulnerabilitySchema =
  SchemaFactory.createForClass(SecurityVulnerability);

// --- Main Document Schema ---

export type SecurityScanResultDocument = SecurityScanResult & Document;

@Schema({ collection: 'security_scan_results', timestamps: true })
export class SecurityScanResult {
  @Prop({ required: true, index: true })
  scanId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  totalChecks: number;

  @Prop({ type: [SecurityVulnerabilitySchema], default: [] })
  vulnerabilities: SecurityVulnerability[];

  @Prop({ type: VulnerabilitySummarySchema, required: true })
  summary: VulnerabilitySummary;

  @Prop({ required: true })
  securityScore: number;

  @Prop({ type: [String], default: [] })
  recommendations: string[];
}

export const SecurityScanResultSchema =
  SchemaFactory.createForClass(SecurityScanResult); 