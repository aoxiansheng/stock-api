import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import {
  TRANSFORMATION_TYPE_VALUES,
  API_TYPE_VALUES,
} from "../constants/data-mapper.constants";

// 🆕 转换规则子Schema
@Schema({ _id: false })
export class TransformRule {
  @Prop({
    required: true,
    enum: TRANSFORMATION_TYPE_VALUES,
  })
  type: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  value?: number | string;

  @Prop()
  format?: string;

  @Prop()
  description?: string;

  @Prop()
  customFunction?: string;
}

export const TransformRuleSchema = SchemaFactory.createForClass(TransformRule);

// 🆕 灵活字段映射子Schema
@Schema({ _id: false })
export class FlexibleFieldMapping {
  @Prop({ required: true })
  sourceFieldPath: string; // 动态路径，基于实际数据结构

  @Prop({ required: true })
  targetField: string; // 标准化目标字段

  @Prop({ type: TransformRuleSchema })
  transform?: TransformRule; // 转换规则

  @Prop({ type: [String], default: [] })
  fallbackPaths?: string[]; // 回退路径支持

  @Prop({ min: 0, max: 1, default: 0.5 })
  confidence: number; // 映射可靠性评分

  @Prop({ default: false })
  isRequired: boolean; // 是否为必填字段

  @Prop({ trim: true })
  description?: string; // 映射描述

  @Prop({ default: true })
  isActive: boolean; // 是否启用此字段映射
}

export const FlexibleFieldMappingSchema =
  SchemaFactory.createForClass(FlexibleFieldMapping);

// 🆕 灵活映射规则主Schema
@Schema({ timestamps: true, collection: "flexible_mapping_rules" })
export class FlexibleMappingRule extends Document {
  @Prop({ required: true, trim: true })
  name: string; // 规则名称

  @Prop({ required: true, trim: true, lowercase: true })
  provider: string; // 数据提供商

  @Prop({ required: true, enum: API_TYPE_VALUES })
  apiType: string; // API类型

  @Prop({ required: true, trim: true })
  transDataRuleListType: string; // 规则类型 (quote_fields, basic_info_fields)

  @Prop({ trim: true })
  description?: string; // 规则描述

  @Prop({ required: false }) // 临时设为可选，用于测试
  sourceTemplateId?: string; // 关联的数据源模板ID

  @Prop({ type: [FlexibleFieldMappingSchema], default: [] })
  fieldMappings: FlexibleFieldMapping[]; // 动态字段映射

  @Prop({ default: true })
  isActive: boolean; // 是否启用

  @Prop({ default: false })
  isDefault: boolean; // 是否为默认规则

  @Prop({ default: "1.0.0" })
  version: string; // 版本号

  @Prop({ min: 0, max: 1, default: 0.5 })
  overallConfidence: number; // 整体规则可靠性

  @Prop({ default: 0, min: 0 })
  usageCount: number; // 使用统计

  @Prop()
  lastUsedAt?: Date; // 最后使用时间

  @Prop()
  lastValidatedAt?: Date; // 最后验证时间

  // ⏱️ 自动时间戳字段 (由 Mongoose timestamps 选项生成)
  createdAt?: Date;
  updatedAt?: Date;

  // 🎯 性能统计字段
  @Prop({ default: 0, min: 0 })
  successfulTransformations: number; // 成功转换次数

  @Prop({ default: 0, min: 0 })
  failedTransformations: number; // 失败转换次数

  // 新增：将successRate改为持久化字段
  @Prop({ default: 0, min: 0, max: 1 })
  successRate: number; // 成功率持久化字段
}

export const FlexibleMappingRuleSchema =
  SchemaFactory.createForClass(FlexibleMappingRule);

// 🎯 创建索引
FlexibleMappingRuleSchema.index({
  provider: 1,
  apiType: 1,
  transDataRuleListType: 1,
}); // 复合查询索引
FlexibleMappingRuleSchema.index({
  name: 1,
  provider: 1,
  apiType: 1,
  transDataRuleListType: 1,
}); // 重复检查索引（用于initializePresetMappingRules）
FlexibleMappingRuleSchema.index({ sourceTemplateId: 1 }); // 模板关联索引
FlexibleMappingRuleSchema.index({ isActive: 1, isDefault: 1 }); // 状态查询索引
FlexibleMappingRuleSchema.index({ overallConfidence: -1 }); // 质量排序索引
FlexibleMappingRuleSchema.index({ usageCount: -1 }); // 使用统计索引
FlexibleMappingRuleSchema.index({ createdAt: -1 }); // 时间排序索引

export type FlexibleMappingRuleDocument = FlexibleMappingRule & Document;
