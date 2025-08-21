import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
} from "class-validator";

export class TransformMappingRuleInfoDto {
  @ApiProperty({ description: "映射规则ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "映射规则名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "数据提供商" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "规则列表类型" })
  @IsString()
  transDataRuleListType: string;

  @ApiProperty({ description: "字段映射数量" })
  @IsNumber()
  dataFieldMappingsCount: number;
}

export class TransformFieldMappingPreviewDto {
  @ApiProperty({ description: "源字段路径" })
  @IsString()
  sourceField: string;

  @ApiProperty({ description: "目标字段路径" })
  @IsString()
  targetField: string;

  @ApiProperty({ description: "源字段示例值" })
  @IsOptional()
  sampleSourceValue: any;

  @ApiProperty({ description: "预期目标值" })
  @IsOptional()
  expectedTargetValue: any;

  @ApiProperty({ description: "转换类型", required: false })
  @IsOptional()
  @IsString()
  transformType?: string;
}

export class TransformPreviewDto {
  @ApiProperty({ description: "映射规则信息", type: TransformMappingRuleInfoDto })
  @ValidateNested()
  @Type(() => TransformMappingRuleInfoDto)
  @IsObject()
  transformMappingRule: TransformMappingRuleInfoDto;

  @ApiProperty({ description: "输入数据示例" })
  @IsObject()
  sampleInput: Record<string, any>;

  @ApiProperty({ description: "预期输出数据" })
  @IsObject()
  expectedOutput: Record<string, any>;

  @ApiProperty({
    description: "字段映射预览列表",
    type: [TransformFieldMappingPreviewDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransformFieldMappingPreviewDto)
  sharedDataFieldMappings: TransformFieldMappingPreviewDto[];
}

export class DataBatchTransformOptionsDto {
  @ApiProperty({
    description: "出错时是否继续处理",
    required: false,
    default: false,
  })
  @IsOptional()
  continueOnError?: boolean;
}
