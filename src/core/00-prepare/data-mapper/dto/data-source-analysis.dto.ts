import { REFERENCE_DATA } from "@common/constants/domain";
import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  MaxLength,
  IsDefined,
  IsNotEmpty,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import {
  API_TYPE_VALUES,
  RULE_LIST_TYPE_VALUES,
  DATA_MAPPER_CONFIG,
} from "../constants/data-mapper.constants";
import type { ApiType, RuleListType } from "../constants/data-mapper.constants";

// 🆕 数据源分析请求DTO
export class AnalyzeDataSourceDto {
  @ApiProperty({
    description: "数据提供商名称",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    enum: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "futu", "itick", "custom"],
  })
  @IsString()
  @IsOptional()
  provider: string = "custom";

  @ApiProperty({
    description: "API类型",
    example: "stream",
    enum: API_TYPE_VALUES,
  })
  @IsEnum(API_TYPE_VALUES)
  apiType: ApiType;

  @ApiProperty({
    description: "示例数据对象，用于分析字段结构",
    example: {
      symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
      last_done: 561,
      volume: 11292534,
      timestamp: "2025-08-08T07:39:55Z",
    },
  })
  @IsObject()
  sampleData: object;

  @ApiProperty({
    description: "数据源名称（可选）",
    example: "LongPort WebSocket 报价流",
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: "数据源描述（可选）",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "数据类型",
    example: "quote_fields",
    enum: RULE_LIST_TYPE_VALUES,
    required: false,
  })
  @IsEnum(RULE_LIST_TYPE_VALUES)
  @IsOptional()
  dataType?: RuleListType = "quote_fields";

  @ApiProperty({
    description: "是否保存为模板",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  saveAsTemplate?: boolean = false;
}

// 🆕 提取字段响应DTO
export class ExtractedFieldDto {
  @ApiProperty({ description: "字段路径", example: "last_done" })
  @IsString()
  fieldPath: string;

  @ApiProperty({ description: "字段名称", example: "last_done" })
  @IsString()
  fieldName: string;

  @ApiProperty({ description: "字段类型", example: "number" })
  @IsString()
  fieldType: string;

  @ApiProperty({ description: "示例值", example: 561 })
  @IsOptional() // sampleValue可能为null或undefined
  sampleValue: any;

  @ApiProperty({
    description: "字段可靠性评分",
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: "是否为嵌套字段", example: false })
  @IsBoolean()
  isNested: boolean;

  @ApiProperty({ description: "嵌套深度", example: 0 })
  @IsNumber()
  @Min(0)
  nestingLevel: number;
}

// 🆕 数据源分析结果响应DTO
export class DataSourceAnalysisResponseDto {
  @ApiProperty({
    description: "数据提供商",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsString()
  provider: string;

  @ApiProperty({ description: "API类型", example: "stream" })
  @IsEnum(API_TYPE_VALUES)
  apiType: string;

  @ApiProperty({ description: "示例数据" })
  @IsObject()
  sampleData: object;

  @ApiProperty({ description: "提取的字段列表", type: [ExtractedFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedFieldDto)
  extractedFields: ExtractedFieldDto[];

  @ApiProperty({ description: "总字段数量", example: 15 })
  @IsNumber()
  @Min(0)
  totalFields: number;

  @ApiProperty({ description: "分析时间戳" })
  @IsOptional() // 可能在某些情况下为可选
  analysisTimestamp: Date;

  @ApiProperty({
    description: "整体分析可靠性",
    example: 0.82,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: "保存的模板信息（如果saveAsTemplate=true）",
    required: false,
    example: {
      id: "12345",
      name: "longport_quote_fields_template",
      message: "模板已成功保存到数据库",
    },
  })
  @IsOptional()
  savedTemplate?: {
    id: string;
    name: string;
    message: string;
  };
}

// 🆕 创建数据源模板请求DTO
export class CreateDataSourceTemplateDto {
  @ApiProperty({
    description: "模板名称",
    example: "LongPort WebSocket 报价流",
    maxLength: DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH,
  })
  @IsString()
  @MaxLength(DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH)
  name: string;

  @ApiProperty({
    description: "数据提供商",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsString()
  provider: string;

  @ApiProperty({ description: "API类型", enum: API_TYPE_VALUES })
  @IsEnum(API_TYPE_VALUES)
  apiType: ApiType;

  @ApiProperty({
    description: "模板描述",
    required: false,
    maxLength: DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH,
  })
  @IsString()
  @MaxLength(DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH)
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "示例数据" })
  @IsObject()
  sampleData: object;

  @ApiProperty({ description: "提取的字段列表", type: [ExtractedFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedFieldDto)
  extractedFields: ExtractedFieldDto[];

  @ApiProperty({ description: "是否设为默认模板", default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === undefined ? false : value)
  isDefault?: boolean;

  @ApiProperty({ description: "模板可靠性评分", minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

// 🆕 字段映射建议请求DTO
export class SuggestFieldMappingsDto {
  @ApiProperty({ description: "数据源模板ID" })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: "目标字段列表",
    example: ["symbol", "lastPrice", "volume", "timestamp"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  targetFields: string[];

  @ApiProperty({
    description: "最小置信度阈值",
    example: 0.3,
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  minConfidence?: number = 0.3;
}

// 🆕 字段映射建议响应DTO
export class FieldMappingSuggestionDto {
  @ApiProperty({ description: "源字段信息", type: ExtractedFieldDto })
  @ValidateNested()
  @Type(() => ExtractedFieldDto)
  @IsDefined()
  sourceField: ExtractedFieldDto;

  @ApiProperty({ description: "目标字段名称", example: "lastPrice" })
  @IsString()
  @IsNotEmpty()
  targetField: string;

  @ApiProperty({
    description: "映射置信度",
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsDefined()
  confidence: number;

  @ApiProperty({
    description: "映射原因说明",
    example: "语义匹配: last_done -> lastPrice",
  })
  @IsString()
  reasoning: string;
}

// 🆕 字段映射建议响应DTO
export class SuggestFieldMappingsResponseDto {
  @ApiProperty({ description: "数据源模板ID" })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: "映射建议列表",
    type: [FieldMappingSuggestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingSuggestionDto)
  suggestions: FieldMappingSuggestionDto[];

  @ApiProperty({ description: "建议生成时间戳" })
  @IsOptional() // 可能在某些情况下为可选
  generatedAt: Date;

  @ApiProperty({
    description: "映射覆盖率",
    example: 0.75,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  coverage: number; // 成功映射的目标字段占比
}

// 🆕 数据源模板响应DTO
export class DataSourceTemplateResponseDto {
  @ApiProperty({ description: "模板ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "模板名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "数据提供商" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "API类型" })
  @IsEnum(API_TYPE_VALUES)
  apiType: string;

  @ApiProperty({ description: "模板描述" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "示例数据" })
  @IsObject()
  sampleData: object;

  @ApiProperty({ description: "提取的字段列表", type: [ExtractedFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedFieldDto)
  extractedFields: ExtractedFieldDto[];

  @ApiProperty({ description: "总字段数量" })
  @IsNumber()
  @Min(0)
  totalFields: number;

  @ApiProperty({ description: "模板可靠性评分" })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: "是否启用" })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: "是否为默认模板" })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({ description: "使用次数" })
  @IsNumber()
  @Min(0)
  usageCount: number;

  @ApiProperty({ description: "最后使用时间" })
  @IsOptional()
  lastUsedAt?: Date;

  @ApiProperty({ description: "创建时间" })
  @IsOptional()
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  @IsOptional()
  updatedAt: Date;

  static fromDocument(doc: any): DataSourceTemplateResponseDto {
    return {
      id: doc._id?.toString() || doc.id,
      name: doc.name,
      provider: doc.provider,
      apiType: doc.apiType,
      description: doc.description,
      sampleData: doc.sampleData,
      extractedFields: doc.extractedFields || [],
      totalFields: doc.totalFields || 0,
      confidence: doc.confidence || 0,
      isActive: doc.isActive ?? true,
      isDefault: doc.isDefault ?? false,
      usageCount: doc.usageCount || 0,
      lastUsedAt: doc.lastUsedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
