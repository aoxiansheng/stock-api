import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsEnum,
} from "class-validator";

export class TransformFunctionDto {
  @ApiProperty({
    description: "转换类型",
    enum: ["multiply", "divide", "add", "subtract", "format", "custom"],
    example: "multiply",
  })
  @IsNotEmpty()
  @IsEnum(["multiply", "divide", "add", "subtract", "format", "custom"])
  type: "multiply" | "divide" | "add" | "subtract" | "format" | "custom";

  @ApiProperty({ description: "转换值", example: 100, required: false })
  @IsOptional()
  value?: number | string;

  @ApiProperty({ description: "自定义转换函数", required: false })
  @IsOptional()
  @IsString()
  customFunction?: string;
}

export class FieldMappingDto {
  @ApiProperty({
    description: "源字段路径",
    example: "secu_quote[0].last_done",
  })
  @IsNotEmpty()
  @IsString()
  sourceField: string;

  @ApiProperty({ description: "目标字段名", example: "lastPrice" })
  @IsNotEmpty()
  @IsString()
  targetField: string;

  @ApiProperty({
    description: "转换函数配置",
    type: TransformFunctionDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransformFunctionDto)
  transform?: TransformFunctionDto;
}

export class CreateDataMappingDto {
  @ApiProperty({
    description: "映射规则名称",
    example: "LongPort 股票报价映射",
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "数据提供商", example: "longport" })
  @IsNotEmpty()
  @IsString()
  provider: string;

  // 规则列表类型，用于标识数据映射的类型，如股票报价、基本信息、指数、市场状态等
  // quote_fields 股票报价字段
  // basic_info_fields 基本信息字段
  // index_fields 指数字段
  // market_status_fields 市场状态字段

  @ApiProperty({
    description: "规则列表类型",
    enum: [
      "quote_fields",
      "basic_info_fields",
      "index_fields",
      "market_status_fields",
    ],
    example: "quote_fields",
  })
  @IsNotEmpty()
  @IsEnum([
    "quote_fields",
    "basic_info_fields",
    "index_fields",
    "market_status_fields",
  ])
  transDataRuleListType: string;

  @ApiProperty({ description: "规则描述", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "字段映射列表", type: [FieldMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  sharedDataFieldMappings: FieldMappingDto[];

  @ApiProperty({ description: "示例数据", required: false })
  @IsOptional()
  sampleData?: Record<string, any>;

  @ApiProperty({ description: "是否激活", example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: "版本号", example: "1.0.0", required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: "创建者", required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
