import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

// 单个映射规则
@Schema({ _id: false })
export class SymbolMappingRule {
  @Prop({ type: String, required: true })
  standardSymbol: string; // 系统标准格式，如：00700.HK, AAPL.US

  @Prop({ type: String, required: true })
  sdkSymbol: string; // 厂商SDK格式，如：9618.HK(LongPort), AAPL(某些SDK)

  @Prop({ type: String })
  market?: string; // 市场标识，如：HK, US, CN

  @Prop({ type: String })
  symbolType?: string; // 股票类型，如：stock, etf, index, crypto

  @Prop({ type: Boolean, default: true })
  isActive?: boolean; // 是否启用

  @Prop({ type: String })
  description?: string; // 映射描述
}

export const SymbolMappingRuleSchema =
  SchemaFactory.createForClass(SymbolMappingRule);

// 数据源映射配置集合
@Schema({
  timestamps: true,
  collection: "symbol_mapping_rules",
})
export class SymbolMappingRuleDocument {
  @Prop({ type: String, required: true, unique: true })
  dataSourceName: string; // 数据源名称，如：longport, futu, itick

  @Prop({ type: [SymbolMappingRuleSchema], default: [] })
  SymbolMappingRule: SymbolMappingRule[]; // 该数据源的所有映射规则

  @Prop({ type: String })
  description?: string; // 数据源映射描述

  @Prop({ type: String })
  version?: string; // 版本号

  @Prop({ type: Boolean, default: true })
  isActive: boolean; // 是否启用

  @Prop({ type: String })
  createdBy?: string; // 创建者
}

export const SymbolMappingRuleDocumentSchema =
  SchemaFactory.createForClass(SymbolMappingRuleDocument);

export type SymbolMappingRuleDocumentType = SymbolMappingRuleDocument &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

// 自定义JSON序列化 - 统一输出格式
SymbolMappingRuleDocumentSchema.methods.toJSON = function () {
  const SymbolMappingRule = this.toObject();
  // 转换_id为id，统一API响应格式
  SymbolMappingRule.id = SymbolMappingRule._id.toString();
  delete SymbolMappingRule._id;
  delete SymbolMappingRule.__v;
  return SymbolMappingRule;
};

// 索引优化
// 注意：dataSourceName 已在 @Prop 中定义为 unique，这里无需重复定义
SymbolMappingRuleDocumentSchema.index({ isActive: 1 }); // 查询索引：是否启用
SymbolMappingRuleDocumentSchema.index({ "SymbolMappingRule.standardSymbol": 1 }); // 查询索引：标准格式代码
SymbolMappingRuleDocumentSchema.index({ "SymbolMappingRule.market": 1 }); // 查询索引：市场
SymbolMappingRuleDocumentSchema.index({ createdAt: -1 }); // 排序索引：创建时间
