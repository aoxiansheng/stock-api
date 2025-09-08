import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { API_TYPE_VALUES } from "../constants/data-mapper.constants";
import { REFERENCE_DATA } from '@common/constants/domain';

// 🆕 提取字段的子Schema
@Schema({ _id: false })
export class ExtractedField {
  @Prop({ required: true })
  fieldPath: string; // 字段路径: "last_done" | "secu_quote[0].last_done"

  @Prop({ required: true })
  fieldName: string; // 字段名称: "last_done"

  @Prop({ required: true })
  fieldType: string; // 数据类型: "number" | "string" | "boolean" | "object" | "array"

  @Prop({ type: Object })
  sampleValue: any; // 示例值

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number; // 字段稳定性评分 0-1

  @Prop({ default: false })
  isNested: boolean; // 是否为嵌套字段

  @Prop({ default: 0, min: 0 })
  nestingLevel: number; // 嵌套深度
}

export const ExtractedFieldSchema =
  SchemaFactory.createForClass(ExtractedField);

// 🆕 数据源模板主Schema
@Schema({ timestamps: true, collection: "data_source_templates" })
export class DataSourceTemplate extends Document {
  @Prop({ required: true, trim: true })
  name: string; // 模板名称: "LongPort WebSocket 报价流"

  @Prop({ required: true, trim: true, lowercase: true })
  provider: string; // 提供商: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "futu", "itick"

  @Prop({ required: true, enum: API_TYPE_VALUES })
  apiType: string; // API类型: "rest" | "stream"

  @Prop({ trim: true })
  description?: string; // 模板描述

  @Prop({ type: Object, required: true })
  sampleData: object; // 示例数据结构

  @Prop({ type: [ExtractedFieldSchema], default: [] })
  extractedFields: ExtractedField[]; // 自动提取的字段

  @Prop({ default: 0, min: 0 })
  totalFields: number; // 总字段数量

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number; // 模板可靠性评分

  @Prop({ default: true })
  isActive: boolean; // 是否启用

  @Prop({ default: false })
  isDefault: boolean; // 是否为默认模板

  @Prop({ default: false })
  isPreset: boolean; // 是否为预设模板

  @Prop({ default: 0, min: 0 })
  usageCount: number; // 使用次数统计

  @Prop()
  lastUsedAt?: Date; // 最后使用时间

  // ⏱️ 自动时间戳字段由 Mongoose 在 `timestamps: true` 选项下生成
  createdAt?: Date;
  updatedAt?: Date;
}

export const DataSourceTemplateSchema =
  SchemaFactory.createForClass(DataSourceTemplate);

// 🎯 创建索引
DataSourceTemplateSchema.index({ provider: 1, apiType: 1 }); // 复合查询索引
DataSourceTemplateSchema.index({ isActive: 1, isDefault: 1 }); // 状态查询索引
DataSourceTemplateSchema.index({ isPreset: 1 }); // 预设模板查询索引
DataSourceTemplateSchema.index({ confidence: -1 }); // 质量排序索引
DataSourceTemplateSchema.index({ usageCount: -1 }); // 使用统计索引
DataSourceTemplateSchema.index({ createdAt: -1 }); // 时间排序索引

export type DataSourceTemplateDocument = DataSourceTemplate & Document;
