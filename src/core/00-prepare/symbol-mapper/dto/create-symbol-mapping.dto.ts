import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { REFERENCE_DATA } from "@common/constants/domain";
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
} from "class-validator";

export class SymbolMappingRuleDto {
  @ApiProperty({
    description: "系统标准格式代码",
    example: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
    minLength: 1,
    maxLength: 20,
  })
  @IsNotEmpty({ message: "系统标准格式代码不能为空" })
  @IsString({ message: "系统标准格式代码必须为字符串" })
  @MinLength(1, { message: "系统标准格式代码长度不能小于1个字符" })
  @MaxLength(20, { message: "系统标准格式代码长度不能超过20个字符" })
  standardSymbol: string;

  @ApiProperty({
    description: "厂商SDK格式代码",
    example: "00700",
    minLength: 1,
    maxLength: 20,
  })
  @IsNotEmpty({ message: "厂商SDK格式代码不能为空" })
  @IsString({ message: "厂商SDK格式代码必须为字符串" })
  @MinLength(1, { message: "厂商SDK格式代码长度不能小于1个字符" })
  @MaxLength(20, { message: "厂商SDK格式代码长度不能超过20个字符" })
  sdkSymbol: string;

  @ApiProperty({
    description: "市场标识",
    example: "HK",
    required: false,
    maxLength: 10,
  })
  @IsOptional()
  @IsString({ message: "市场标识必须为字符串" })
  @MaxLength(10, { message: "市场标识长度不能超过10个字符" })
  market?: string;

  @ApiProperty({
    description: "股票类型",
    example: "stock",
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: "股票类型必须为字符串" })
  @MaxLength(20, { message: "股票类型长度不能超过20个字符" })
  symbolType?: string;

  @ApiProperty({
    description: "是否启用",
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: "启用状态必须为布尔类型" })
  isActive?: boolean = true;

  @ApiProperty({
    description: "映射描述",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "映射描述必须为字符串" })
  @MaxLength(500, { message: "映射描述长度不能超过500个字符" })
  description?: string;
}

export class CreateSymbolMappingDto {
  @ApiProperty({
    description: "数据源名称",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty({ message: "数据源名称不能为空" })
  @IsString({ message: "数据源名称必须为字符串" })
  @MinLength(1, { message: "数据源名称不能为空" })
  @MaxLength(50, { message: "数据源名称长度不能超过50个字符" })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "数据源名称只能包含字母、数字、下划线和连字符",
  })
  dataSourceName: string;

  @ApiProperty({
    description: "映射规则列表",
    type: [SymbolMappingRuleDto],
    minItems: 1,
    maxItems: 10000,
  })
  @IsArray({ message: "映射规则必须为数组" })
  @ArrayMinSize(1, { message: "映射规则不能为空" })
  @ArrayMaxSize(10000, { message: "映射规则数量不能超过10000个" })
  @ValidateNested({ each: true })
  @Type(() => SymbolMappingRuleDto)
  SymbolMappingRule: SymbolMappingRuleDto[];

  @ApiProperty({
    description: "数据源映射描述",
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: "数据源映射描述必须为字符串" })
  @MaxLength(1000, { message: "数据源映射描述长度不能超过1000个字符" })
  description?: string;

  @ApiProperty({
    description: "版本号",
    example: "1.0.0",
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: "版本号必须为字符串" })
  @MaxLength(20, { message: "版本号长度不能超过20个字符" })
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: "版本号格式必须为 x.y.z",
  })
  version?: string;

  @ApiProperty({
    description: "是否启用",
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: "启用状态必须为布尔类型" })
  isActive?: boolean = true;

  @ApiProperty({
    description: "创建者",
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: "创建者必须为字符串" })
  @MaxLength(100, { message: "创建者长度不能超过100个字符" })
  createdBy?: string;
}
