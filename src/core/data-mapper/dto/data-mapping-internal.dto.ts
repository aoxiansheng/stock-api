import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
} from "class-validator";

export class DataMappingTestResultDto {
  @ApiProperty({ description: "映射规则ID" })
  @IsString()
  ruleId: string;

  @ApiProperty({ description: "映射规则名称" })
  @IsString()
  ruleName: string;

  @ApiProperty({ description: "数据提供商" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "规则列表类型" })
  @IsString()
  transDataRuleListType: string;

  @ApiProperty({ description: "原始数据" })
  originalData: Record<string, any>;

  @ApiProperty({ description: "转换后数据" })
  transformedData: Record<string, any>[];

  @ApiProperty({ description: "测试是否成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "测试结果消息" })
  @IsString()
  message: string;
}

export class DataMappingStatisticsDto {
  @ApiProperty({ description: "映射规则总数" })
  @IsNumber()
  totalRules: number;

  @ApiProperty({ description: "活跃规则数" })
  @IsNumber()
  activeRules: number;

  @ApiProperty({ description: "非活跃规则数" })
  @IsNumber()
  inactiveRules: number;

  @ApiProperty({ description: "数据提供商数量" })
  @IsNumber()
  providers: number;

  @ApiProperty({ description: "规则列表类型数量" })
  @IsNumber()
  transDataRuleListTypesNum: number;

  @ApiProperty({ description: "数据提供商列表" })
  @IsArray()
  providerList: string[];

  @ApiProperty({ description: "规则列表类型列表" })
  @IsArray()
  transDataRuleListTypeList: string[];
}

export class FieldExtractionResultDto {
  @ApiProperty({ description: "提取的字段路径列表" })
  @IsArray()
  fields: string[];

  @ApiProperty({ description: "JSON 结构" })
  @IsObject()
  structure: Record<string, any>;
}

export class TransformationInputDto {
  @ApiProperty({ description: "转换值" })
  value: any;

  @ApiProperty({ description: "转换配置" })
  @IsObject()
  transform: {
    type: string;
    value?: any;
    customFunction?: string;
  };
}

export class MappingRuleApplicationDto {
  @ApiProperty({ description: "映射规则ID" })
  @IsString()
  ruleId: string;

  @ApiProperty({ description: "源数据" })
  @IsObject()
  sourceData: Record<string, any>;

  @ApiProperty({ description: "转换结果" })
  transformedResult: Record<string, any>[];

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "是否为慢速映射" })
  @IsBoolean()
  isSlowMapping: boolean;
}

export class FieldMatchDto {
  @ApiProperty({ description: "字段名称" })
  @IsString()
  field: string;

  @ApiProperty({ description: "相似度分数" })
  @IsNumber()
  score: number;
}

export class FieldSuggestionItemDto {
  @ApiProperty({ description: "源字段" })
  @IsString()
  sourceField: string;

  @ApiProperty({ description: "建议字段列表", type: [FieldMatchDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMatchDto)
  suggestions: FieldMatchDto[];
}

export class TransformationResultDto {
  @ApiProperty({ description: "转换后的值" })
  transformedValue: any;

  @ApiProperty({ description: "转换是否成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "错误消息", required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class PathResolutionResultDto {
  @ApiProperty({ description: "解析的值" })
  value: any;

  @ApiProperty({ description: "解析是否成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "解析路径" })
  @IsString()
  path: string;
}
