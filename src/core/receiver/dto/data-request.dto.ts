import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsNotEmpty,
  MaxLength,
  IsIn,
  Matches,
} from "class-validator";

import {
  DATA_TYPE_TO_CAPABILITY_MAP,
  RECEIVER_VALIDATION_RULES,
} from "../constants/receiver.constants";

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
  @Matches(
    /^(\d{1,6}\.HK|[A-Z]{1,6}\.HK|\d{6}\.(SZ|SH)|[A-Z]{1,5}\.US|[A-Z]{2,6}\/[A-Z]{2,6})$/,
    {
      each: true,
      message:
        "股票代码格式不正确。有效格式示例: 700.HK, HSBC.HK, 600000.SH, AAPL.US, BTC/USDT",
    },
  )
  symbols: string[];

  @ApiProperty({
    description: "数据类型",
    example: "stock-quote",
    enum: [
      "stock-quote",
      "stock-basic-info",
      "index-quote",
      "market-status",
      "trading-days",
      "global-state",
      "crypto-quote",
      "crypto-basic-info",
      "stock-logo",
      "crypto-logo",
      "stock-news",
      "crypto-news",
    ],
  })
  @IsString({ message: "数据类型必须是字符串" })
  @IsNotEmpty({ message: "数据类型不能为空" })
  @IsIn(Object.keys(DATA_TYPE_TO_CAPABILITY_MAP), {
    message: (args) =>
      `不支持的数据类型: ${args.value}。支持的类型包括: ${Object.keys(DATA_TYPE_TO_CAPABILITY_MAP).join(", ")}`,
  })
  dataType: string;

  @ApiPropertyOptional({ description: "请求选项" })
  @IsOptional()
  @ValidateNested()
  @Type(() => RequestOptionsDto)
  options?: RequestOptionsDto;
}
