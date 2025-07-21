import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
} from "class-validator";

export class FieldTransformDto {
  @ApiProperty({ description: "源字段路径" })
  @IsString()
  sourceField: string;

  @ApiProperty({ description: "目标字段路径" })
  @IsString()
  targetField: string;

  @ApiProperty({ description: "转换配置", required: false })
  @IsOptional()
  @IsObject()
  transform?: {
    type?: string;
    value?: any;
  };
}

export class DataTransformRuleDto {
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
  ruleListType: string;

  @ApiProperty({ description: "字段映射列表", type: [FieldTransformDto] })
  @IsArray()
  fieldMappings: FieldTransformDto[];
}

export class TransformValidationDto {
  @ApiProperty({ description: "错误列表" })
  @IsArray()
  errors: string[];

  @ApiProperty({ description: "警告列表" })
  @IsArray()
  warnings: string[];
}

export class TransformationStatsDto {
  @ApiProperty({ description: "处理的记录数" })
  @IsNumber()
  recordsProcessed: number;

  @ApiProperty({ description: "转换的字段数" })
  @IsNumber()
  fieldsTransformed: number;

  @ApiProperty({ description: "应用的转换列表" })
  @IsArray()
  transformationsApplied: Array<{
    sourceField: string;
    targetField: string;
    transformType?: string;
    transformValue?: any;
  }>;
}
