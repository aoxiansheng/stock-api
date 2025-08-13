import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsNotEmpty,
  MaxLength,
  IsIn,
} from "class-validator";

import {
  SUPPORTED_CAPABILITY_TYPES,
  RECEIVER_VALIDATION_RULES,
} from "../constants/receiver.constants";
import { IsValidSymbolFormat } from "@common/validators/symbol-format.validator";

class RequestOptionsDto {
  @ApiPropertyOptional({ description: "首选数据提供商" })
  @IsOptional()
  @IsString()
  preferredProvider?: string;

  @ApiPropertyOptional({ description: "是否要求实时数据", default: false })
  @IsOptional()
  @IsBoolean()
  realtime?: boolean;

  @ApiPropertyOptional({ description: "指定返回字段", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({ description: "市场代码", example: "HK" })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({ description: "请求超时时间(毫秒)", example: 5000 })
  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class DataRequestDto {
  @ApiProperty({
    description: "股票代码列表",
    example: ["700.HK", "AAPL.US", "000001.SZ"],
    type: [String],
  })
  @IsArray({ message: "股票代码必须是一个数组" })
  @ArrayNotEmpty({ message: "股票代码列表不能为空" })
  @ArrayMaxSize(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT, {
    message: `请求的股票代码数量不能超过 ${RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT} 个`,
  })
  @IsString({ each: true, message: "每个股票代码都必须是字符串" })
  @IsNotEmpty({ each: true, message: "股票代码不能为空字符串" })
  @MaxLength(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH, {
    each: true,
    message: `每个股票代码的长度不能超过 ${RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH} 个字符`,
  })
  @IsValidSymbolFormat({
    message: "股票代码格式不正确。请使用统一的股票代码验证规则。",
  })
  symbols: string[];

  @ApiProperty({
    description: "能力类型（用于提供商路由和能力匹配）",
    example: "get-stock-quote",
    enum: SUPPORTED_CAPABILITY_TYPES,
  })
  @IsString({ message: "能力类型必须是字符串" })
  @IsNotEmpty({ message: "能力类型不能为空" })
  @IsIn([...SUPPORTED_CAPABILITY_TYPES], {
    message: (args) =>
      `不支持的能力类型: ${args.value}。支持的类型包括: ${SUPPORTED_CAPABILITY_TYPES.join(", ")}`,
  })
  receiverType: string;

  @ApiPropertyOptional({ description: "请求选项" })
  @IsOptional()
  @ValidateNested()
  @Type(() => RequestOptionsDto)
  options?: RequestOptionsDto;
}
