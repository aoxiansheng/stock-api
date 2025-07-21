import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

// Field mapping interface
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: {
    type: "multiply" | "divide" | "add" | "subtract" | "format" | "custom";
    value?: number | string;
    customFunction?: string;
  };
  description?: string;
}

@Schema({
  timestamps: true,
  collection: "data_mapping_rules",
})
export class DataMappingRule {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, trim: true })
  provider: string;

  @Prop({ required: true, trim: true })
  ruleListType: string;

  @Prop({
    type: [
      {
        sourceField: { type: String, required: true },
        targetField: { type: String, required: true },
        transform: {
          type: {
            type: String,
            enum: ["multiply", "divide", "add", "subtract", "format", "custom"],
          },
          value: { type: MongooseSchema.Types.Mixed },
          customFunction: { type: String },
        },
        description: { type: String },
      },
    ],
    required: true,
  })
  fieldMappings: FieldMapping[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: "1.0.0" })
  version: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Object })
  sampleData?: Record<string, any>;

  @Prop({ type: String })
  createdBy?: string;
}

export type DataMappingRuleDocument = DataMappingRule &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };
export const DataMappingRuleSchema =
  SchemaFactory.createForClass(DataMappingRule);

// 自定义JSON序列化 - 统一输出格式
DataMappingRuleSchema.methods.toJSON = function () {
  const dataMappingRule = this.toObject();
  // 转换_id为id，统一API响应格式
  dataMappingRule.id = dataMappingRule._id.toString();
  delete dataMappingRule._id;
  delete dataMappingRule.__v;
  return dataMappingRule;
};

// Add indexes for better performance
DataMappingRuleSchema.index({ provider: 1, ruleListType: 1 });
DataMappingRuleSchema.index({ isActive: 1 });
DataMappingRuleSchema.index({ createdAt: -1 });
