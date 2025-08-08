import { ApiProperty } from "@nestjs/swagger";

import {
  IDataMappingRule,
  ITransformFunction,
} from "../interfaces/data-mapping.interface";
import { DataMappingRuleDocument } from "../schemas/data-mapper.schema";
// 🎯 引入接口以实现类型安全

// 🎯 使用接口定义，确保类型一致性
class TransformResponseDto implements ITransformFunction {
  @ApiProperty({
    description: "转换类型",
    enum: ["multiply", "divide", "add", "subtract", "format", "custom"],
  })
  type: "multiply" | "divide" | "add" | "subtract" | "format" | "custom";

  @ApiProperty({ description: "转换值" })
  value?: number | string;

  @ApiProperty({ description: "自定义转换函数名称" })
  customFunction?: string;
}

export class FieldMappingResponseDto {
  @ApiProperty({ description: "源字段路径" })
  sourceField: string;

  @ApiProperty({ description: "目标字段名" })
  targetField: string;

  @ApiProperty({ description: "转换函数配置", type: TransformResponseDto })
  transform?: TransformResponseDto;
}

// 🎯 实现接口，强制保持 DTO 和接口定义同步
export class DataMappingResponseDto implements IDataMappingRule {
  @ApiProperty({ description: "ID" })
  id: string;

  @ApiProperty({ description: "映射规则名称" })
  name: string;

  @ApiProperty({ description: "数据提供商" })
  provider: string;

  @ApiProperty({ description: "规则列表类型" })
  transDataRuleListType: string;

  @ApiProperty({ description: "API 类型", enum: ["rest", "stream"] })
  apiType: string;

  @ApiProperty({ description: "规则描述" })
  description?: string;

  @ApiProperty({ description: "字段映射列表", type: [FieldMappingResponseDto] })
  sharedDataFieldMappings: FieldMappingResponseDto[];

  @ApiProperty({ description: "示例数据" })
  sampleData?: Record<string, any>;

  @ApiProperty({ description: "是否激活" })
  isActive: boolean;

  @ApiProperty({ description: "版本号" })
  version: string;

  @ApiProperty({ description: "创建者" })
  createdBy?: string;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;

  static fromDocument(
    document: DataMappingRuleDocument,
  ): DataMappingResponseDto {
    return {
      id: document._id.toString(),
      name: document.name,
      provider: document.provider,
      transDataRuleListType: document.transDataRuleListType,
      apiType: (document as any).apiType || "rest",
      description: document.description,
      sharedDataFieldMappings: document.sharedDataFieldMappings || [],
      sampleData: document.sampleData,
      isActive: document.isActive,
      version: document.version,
      createdBy: document.createdBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  static fromLeanObject(obj: any): DataMappingResponseDto {
    return {
      id: obj._id.toString(),
      name: obj.name,
      provider: obj.provider,
      transDataRuleListType: obj.transDataRuleListType,
      apiType: obj.apiType || "rest",
      description: obj.description,
      sharedDataFieldMappings: obj.sharedDataFieldMappings || [],
      sampleData: obj.sampleData,
      isActive: obj.isActive,
      version: obj.version,
      createdBy: obj.createdBy,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}

export class ParsedFieldsResponseDto {
  @ApiProperty({ description: "解析出的字段列表" })
  fields: string[];

  @ApiProperty({ description: "数据结构" })
  structure: any;
}

export class FieldSuggestionResponseDto {
  @ApiProperty({ description: "字段映射建议" })
  suggestions: Array<{
    sourceField: string;
    suggestions: Array<{
      field: string;
      score: number;
    }>;
  }>;
}

