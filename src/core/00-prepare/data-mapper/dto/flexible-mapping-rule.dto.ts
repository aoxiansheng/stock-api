import { REFERENCE_DATA } from "@common/constants/domain";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsObject,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import {
  TRANSFORMATION_TYPE_VALUES,
  API_TYPE_VALUES,
  RULE_LIST_TYPE_VALUES,
  DATA_MAPPER_CONFIG,
} from "../constants/data-mapper.constants";
import type {
  TransformationType,
  ApiType,
  RuleListType,
} from "../constants/data-mapper.constants";

// 🆕 转换规则DTO
export class TransformRuleDto {
  @ApiProperty({
    description: "转换类型",
    enum: TRANSFORMATION_TYPE_VALUES,
    example: "multiply",
  })
  @IsEnum(TRANSFORMATION_TYPE_VALUES)
  type: TransformationType;

  @ApiProperty({
    description: "转换值",
    example: 0.13,
    required: false,
  })
  @IsOptional()
  value?: number | string;

  @ApiProperty({
    description: "自定义转换函数",
    required: false,
  })
  @IsString()
  @IsOptional()
  customFunction?: string;
}

// 🆕 灵活字段映射DTO
export class FlexibleFieldMappingDto {
  @ApiProperty({
    description: "源字段路径",
    example: "last_done",
  })
  @IsString()
  sourceFieldPath: string;

  @ApiProperty({
    description: "目标字段名称",
    example: "lastPrice",
  })
  @IsString()
  targetField: string;

  @ApiProperty({
    description: "转换规则（可选）",
    type: TransformRuleDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => TransformRuleDto)
  @IsOptional()
  transform?: TransformRuleDto;

  @ApiProperty({
    description: "回退路径列表",
    example: ["fallback.price", "last_trade.price"],
    required: false,
  })
  @IsArray()
  @IsOptional()
  fallbackPaths?: string[];

  @ApiProperty({
    description: "是否启用此字段映射",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

// Note: AnalyzeDataSourceDto moved to data-source-analysis.dto.ts to eliminate duplication

// 🆕 创建灵活映射规则DTO（简化）
export class CreateFlexibleMappingRuleDto {
  @ApiProperty({
    description: "规则名称",
    example: "basic_info_to_quote_mapping",
  })
  @IsString()
  @MaxLength(DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH)
  name: string;

  @ApiProperty({
    description: "规则描述",
    example: "将基础信息字段映射到行情字段",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "提供商",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: "API 类型",
    enum: API_TYPE_VALUES,
    example: "rest",
  })
  @IsEnum(API_TYPE_VALUES)
  apiType: ApiType;

  @ApiProperty({
    description: "转换字段集合类型",
    enum: RULE_LIST_TYPE_VALUES,
    example: "quote_fields",
  })
  @IsEnum(RULE_LIST_TYPE_VALUES)
  transDataRuleListType: RuleListType;

  @ApiProperty({
    description: "字段映射列表",
    type: [FlexibleFieldMappingDto],
  })
  @ValidateNested({ each: true })
  @Type(() => FlexibleFieldMappingDto)
  fieldMappings: FlexibleFieldMappingDto[];

  @ApiProperty({
    description: "是否启用规则",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    description: "数据源模板ID",
    example: "507f1f77bcf86cd799439011",
    required: false,
  })
  @IsString()
  @IsOptional()
  sourceTemplateId?: string;

  @ApiProperty({
    description: "是否为默认规则",
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({
    description: "规则版本",
    example: "1.0.0",
    required: false,
  })
  @IsString()
  @IsOptional()
  version?: string;
}

// 🆕 灵活映射规则响应DTO
export class FlexibleMappingRuleResponseDto {
  @ApiProperty({ description: "规则ID" })
  id: string;

  @ApiProperty({ description: "规则名称" })
  name: string;

  @ApiProperty({ description: "数据提供商" })
  provider: string;

  @ApiProperty({ description: "API类型" })
  apiType: string;

  @ApiProperty({ description: "规则类型" })
  transDataRuleListType: string;

  @ApiProperty({ description: "规则描述" })
  description?: string;

  @ApiProperty({ description: "数据源模板ID" })
  sourceTemplateId: string;

  @ApiProperty({ description: "字段映射列表", type: [FlexibleFieldMappingDto] })
  fieldMappings: FlexibleFieldMappingDto[];

  @ApiProperty({ description: "是否启用" })
  isActive: boolean;

  @ApiProperty({ description: "是否为默认规则" })
  isDefault: boolean;

  @ApiProperty({ description: "版本号" })
  version: string;

  @ApiProperty({ description: "整体规则可靠性" })
  overallConfidence: number;

  @ApiProperty({ description: "使用次数" })
  usageCount: number;

  @ApiProperty({ description: "最后使用时间" })
  lastUsedAt?: Date;

  @ApiProperty({ description: "最后验证时间" })
  lastValidatedAt?: Date;

  @ApiProperty({ description: "成功转换次数" })
  successfulTransformations: number;

  @ApiProperty({ description: "失败转换次数" })
  failedTransformations: number;

  @ApiProperty({ description: "成功率" })
  successRate?: number;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;

  static fromDocument(doc: any): FlexibleMappingRuleResponseDto {
    return {
      id: doc._id?.toString() || doc.id,
      name: doc.name,
      provider: doc.provider,
      apiType: doc.apiType,
      transDataRuleListType: doc.transDataRuleListType,
      description: doc.description,
      sourceTemplateId: doc.sourceTemplateId,
      fieldMappings: doc.fieldMappings || [],
      isActive: doc.isActive ?? true,
      isDefault: doc.isDefault ?? false,
      version: doc.version || "1.0.0",
      overallConfidence: doc.overallConfidence || 0,
      usageCount: doc.usageCount || 0,
      lastUsedAt: doc.lastUsedAt,
      lastValidatedAt: doc.lastValidatedAt,
      successfulTransformations: doc.successfulTransformations || 0,
      failedTransformations: doc.failedTransformations || 0,
      successRate: doc.successRate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

// 🆕 测试灵活映射规则请求DTO
export class TestFlexibleMappingRuleDto {
  @ApiProperty({ description: "规则ID" })
  @IsString()
  dataMapperRuleId: string;

  @ApiProperty({
    description: "测试数据",
    example: {
      symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
      last_done: 561,
      volume: 11292534,
    },
  })
  @IsObject()
  testData: object;

  @ApiProperty({
    description: "是否返回详细调试信息",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeDebugInfo?: boolean = false;
}

// 🆕 测试结果响应DTO
export class FlexibleMappingTestResultDto {
  @ApiProperty({ description: "规则ID" })
  dataMapperRuleId: string;

  @ApiProperty({ description: "规则名称" })
  ruleName: string;

  @ApiProperty({ description: "原始测试数据" })
  originalData: object;

  @ApiProperty({ description: "转换后的数据" })
  transformedData: object;

  @ApiProperty({ description: "测试是否成功" })
  success: boolean;

  @ApiProperty({ description: "错误消息（如果失败）" })
  errorMessage?: string;

  @ApiProperty({ description: "映射统计信息" })
  mappingStats: {
    totalMappings: number;
    successfulMappings: number;
    failedMappings: number;
    successRate: number;
  };

  @ApiProperty({ description: "字段映射详情（如果包含调试信息）" })
  debugInfo?: Array<{
    sourceFieldPath: string;
    targetField: string;
    sourceValue: any;
    transformedValue: any;
    success: boolean;
    fallbackUsed?: string;
    error?: string;
  }>;

  @ApiProperty({ description: "测试执行时间（毫秒）" })
  executionTime: number;
}

// 🆕 批量创建映射规则请求DTO（基于模板建议）
export class CreateMappingRuleFromSuggestionsDto {
  @ApiProperty({ description: "规则名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "数据源模板ID" })
  @IsString()
  templateId: string;

  @ApiProperty({ description: "选中的映射建议索引列表", type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  selectedSuggestionIndexes: number[];

  @ApiProperty({ description: "规则描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "是否设为默认规则", default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
