import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// 🆕 转换规则DTO
export class TransformRuleDto {
  @ApiProperty({ 
    description: '转换类型',
    enum: ['multiply', 'divide', 'add', 'subtract', 'format', 'custom'],
    example: 'multiply' 
  })
  @IsEnum(['multiply', 'divide', 'add', 'subtract', 'format', 'custom'])
  type: string;

  @ApiProperty({ 
    description: '转换值', 
    example: 0.13,
    required: false 
  })
  @IsOptional()
  value?: number | string;

  @ApiProperty({ 
    description: '自定义转换函数', 
    required: false 
  })
  @IsString()
  @IsOptional()
  customFunction?: string;
}

// 🆕 灵活字段映射DTO
export class FlexibleFieldMappingDto {
  @ApiProperty({ 
    description: '源字段路径', 
    example: 'last_done' 
  })
  @IsString()
  sourceFieldPath: string;

  @ApiProperty({ 
    description: '目标字段名称', 
    example: 'lastPrice' 
  })
  @IsString()
  targetField: string;

  @ApiProperty({ 
    description: '转换规则（可选）',
    type: TransformRuleDto,
    required: false 
  })
  @ValidateNested()
  @Type(() => TransformRuleDto)
  @IsOptional()
  transform?: TransformRuleDto;

  @ApiProperty({ 
    description: '回退路径列表', 
    type: [String],
    example: ['last_price', 'current_price'],
    required: false 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackPaths?: string[];

  @ApiProperty({ 
    description: '映射可靠性评分', 
    example: 0.85,
    minimum: 0,
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ 
    description: '映射描述', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: '是否启用此字段映射', 
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

// 🆕 创建灵活映射规则请求DTO
export class CreateFlexibleMappingRuleDto {
  @ApiProperty({ 
    description: '规则名称', 
    example: 'LongPort WebSocket 报价映射规则' 
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: '数据提供商', 
    example: 'longport' 
  })
  @IsString()
  provider: string;

  @ApiProperty({ 
    description: 'API类型', 
    enum: ['rest', 'stream'],
    example: 'stream' 
  })
  @IsEnum(['rest', 'stream'])
  apiType: 'rest' | 'stream';

  @ApiProperty({ 
    description: '规则类型', 
    enum: ['quote_fields', 'basic_info_fields', 'index_fields'],
    example: 'quote_fields' 
  })
  @IsEnum(['quote_fields', 'basic_info_fields', 'index_fields'])
  transDataRuleListType: 'quote_fields' | 'basic_info_fields' | 'index_fields';

  @ApiProperty({ 
    description: '规则描述', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: '数据源模板ID',
    required: false // 临时设为可选，用于测试
  })
  @IsString()
  @IsOptional()
  sourceTemplateId?: string;

  @ApiProperty({ 
    description: '字段映射列表', 
    type: [FlexibleFieldMappingDto] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlexibleFieldMappingDto)
  fieldMappings: FlexibleFieldMappingDto[];

  @ApiProperty({ 
    description: '是否设为默认规则', 
    default: false 
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @ApiProperty({ 
    description: '版本号', 
    default: '1.0.0' 
  })
  @IsString()
  @IsOptional()
  version?: string = '1.0.0';
}

// 🆕 灵活映射规则响应DTO
export class FlexibleMappingRuleResponseDto {
  @ApiProperty({ description: '规则ID' })
  id: string;

  @ApiProperty({ description: '规则名称' })
  name: string;

  @ApiProperty({ description: '数据提供商' })
  provider: string;

  @ApiProperty({ description: 'API类型' })
  apiType: string;

  @ApiProperty({ description: '规则类型' })
  transDataRuleListType: string;

  @ApiProperty({ description: '规则描述' })
  description?: string;

  @ApiProperty({ description: '数据源模板ID' })
  sourceTemplateId: string;

  @ApiProperty({ description: '字段映射列表', type: [FlexibleFieldMappingDto] })
  fieldMappings: FlexibleFieldMappingDto[];

  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @ApiProperty({ description: '是否为默认规则' })
  isDefault: boolean;

  @ApiProperty({ description: '版本号' })
  version: string;

  @ApiProperty({ description: '整体规则可靠性' })
  overallConfidence: number;

  @ApiProperty({ description: '使用次数' })
  usageCount: number;

  @ApiProperty({ description: '最后使用时间' })
  lastUsedAt?: Date;

  @ApiProperty({ description: '最后验证时间' })
  lastValidatedAt?: Date;

  @ApiProperty({ description: '成功转换次数' })
  successfulTransformations: number;

  @ApiProperty({ description: '失败转换次数' })
  failedTransformations: number;

  @ApiProperty({ description: '成功率' })
  successRate?: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
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
      version: doc.version || '1.0.0',
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
  @ApiProperty({ description: '规则ID' })
  @IsString()
  dataMapperRuleId: string;

  @ApiProperty({ 
    description: '测试数据', 
    example: {
      "symbol": "700.HK",
      "last_done": 561,
      "volume": 11292534
    }
  })
  @IsObject()
  testData: object;

  @ApiProperty({ 
    description: '是否返回详细调试信息', 
    default: false 
  })
  @IsBoolean()
  @IsOptional()
  includeDebugInfo?: boolean = false;
}

// 🆕 测试结果响应DTO
export class FlexibleMappingTestResultDto {
  @ApiProperty({ description: '规则ID' })
  dataMapperRuleId: string;

  @ApiProperty({ description: '规则名称' })
  ruleName: string;

  @ApiProperty({ description: '原始测试数据' })
  originalData: object;

  @ApiProperty({ description: '转换后的数据' })
  transformedData: object;

  @ApiProperty({ description: '测试是否成功' })
  success: boolean;

  @ApiProperty({ description: '错误消息（如果失败）' })
  errorMessage?: string;

  @ApiProperty({ description: '映射统计信息' })
  mappingStats: {
    totalMappings: number;
    successfulMappings: number;
    failedMappings: number;
    successRate: number;
  };

  @ApiProperty({ description: '字段映射详情（如果包含调试信息）' })
  debugInfo?: Array<{
    sourceFieldPath: string;
    targetField: string;
    sourceValue: any;
    transformedValue: any;
    success: boolean;
    fallbackUsed?: string;
    error?: string;
  }>;

  @ApiProperty({ description: '测试执行时间（毫秒）' })
  executionTime: number;
}

// 🆕 批量创建映射规则请求DTO（基于模板建议）
export class CreateMappingRuleFromSuggestionsDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '数据源模板ID' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: '选中的映射建议索引列表', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  selectedSuggestionIndexes: number[];

  @ApiProperty({ description: '规则描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '是否设为默认规则', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}