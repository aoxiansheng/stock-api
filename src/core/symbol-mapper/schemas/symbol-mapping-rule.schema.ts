import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

// 单个映射规则
@Schema({ _id: false })
export class MappingRule {
  @Prop({ type: String, required: true })
  inputSymbol: string; // 输入的标准代码，如：700.HK, AAPL.US

  @Prop({ type: String, required: true })
  outputSymbol: string; // 该数据源需要的格式，如：00700, AAPL

  @Prop({ type: String })
  market?: string; // 市场标识，如：HK, US, CN

  @Prop({ type: String })
  symbolType?: string; // 股票类型，如：stock, etf, index, crypto

  @Prop({ type: Boolean, default: true })
  isActive?: boolean; // 是否启用

  @Prop({ type: String })
  description?: string; // 映射描述
}

export const MappingRuleSchema = SchemaFactory.createForClass(MappingRule);

// 数据源映射配置集合
@Schema({
  timestamps: true,
  collection: "symbol_mapping_rules",
})
export class SymbolMappingRule {
  @Prop({ type: String, required: true, unique: true })
  dataSourceName: string; // 数据源名称，如：longport, futu, itick

  @Prop({ type: [MappingRuleSchema], default: [] })
  mappingRules: MappingRule[]; // 该数据源的所有映射规则

  @Prop({ type: String })
  description?: string; // 数据源映射描述

  @Prop({ type: String })
  version?: string; // 版本号

  @Prop({ type: Boolean, default: true })
  isActive: boolean; // 是否启用

  @Prop({ type: String })
  createdBy?: string; // 创建者
}

export const SymbolMappingRuleSchema =
  SchemaFactory.createForClass(SymbolMappingRule);

export type SymbolMappingRuleDocument = SymbolMappingRule &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

// 自定义JSON序列化 - 统一输出格式
SymbolMappingRuleSchema.methods.toJSON = function () {
  const symbolMappingRule = this.toObject();
  // 转换_id为id，统一API响应格式
  symbolMappingRule.id = symbolMappingRule._id.toString();
  delete symbolMappingRule._id;
  delete symbolMappingRule.__v;
  return symbolMappingRule;
};

// 索引优化
// 注意：dataSourceName 已在 @Prop 中定义为 unique，这里无需重复定义
SymbolMappingRuleSchema.index({ isActive: 1 }); // 查询索引：是否启用
SymbolMappingRuleSchema.index({ "mappingRules.inputSymbol": 1 }); // 查询索引：输入代码
SymbolMappingRuleSchema.index({ "mappingRules.market": 1 }); // 查询索引：市场
SymbolMappingRuleSchema.index({ createdAt: -1 }); // 排序索引：创建时间
