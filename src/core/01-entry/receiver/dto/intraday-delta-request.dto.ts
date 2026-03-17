import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
} from "class-validator";

import { IsValidSymbolFormat } from "@common/validators/symbol-format.validator";
import {
  RECEIVER_ALLOWED_MARKETS,
  normalizeReceiverMarketInput,
} from "./data-request.dto";
import { YMD_DATE_PATTERN } from "@core/shared/utils/ymd-date.util";
import type { IntradayDeltaRequestDto as IntradayDeltaRequestDtoContract } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";

const INTRADAY_CURSOR_MAX_LENGTH = 4096;

export class IntradayDeltaRequestDto implements IntradayDeltaRequestDtoContract {
  @ApiProperty({
    description: "标的代码（单标的）",
    example: "AAPL.US",
  })
  @IsString()
  @IsNotEmpty()
  @IsValidSymbolFormat({
    message: "symbol 格式不正确。请使用统一的股票代码验证规则。",
  })
  symbol: string;

  @ApiPropertyOptional({
    description: "市场代码，缺省时由 symbol 推断；CRYPTO 支持裸交易对如 BTCUSDT",
    example: "US",
    enum: RECEIVER_ALLOWED_MARKETS,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? normalizeReceiverMarketInput(value) : value,
  )
  @IsString()
  @IsIn(RECEIVER_ALLOWED_MARKETS, {
    message: `market 仅支持以下值: ${RECEIVER_ALLOWED_MARKETS.join(", ")}`,
  })
  market?: string;

  @ApiPropertyOptional({
    description: "交易日（YYYYMMDD），缺省时按市场时区推断",
    example: "20260308",
  })
  @IsOptional()
  @IsString()
  @Matches(YMD_DATE_PATTERN, { message: "tradingDay 必须为 YYYYMMDD 格式" })
  tradingDay?: string;

  @ApiPropertyOptional({
    description: "指定数据提供商",
    example: "infoway",
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: `增量游标（必传，最长 ${INTRADAY_CURSOR_MAX_LENGTH} 字符）`,
    example:
      "eyJ2IjoxLCJzeW1ib2wiOiJBQVBMLlVTIiwibWFya2V0IjoiVVMiLCJ0cmFkaW5nRGF5IjoiMjAyNjAzMDgiLCJsYXN0UG9pbnRUaW1lc3RhbXAiOiIyMDI2LTAzLTA4VDE1OjQyOjAwLjAwMFoiLCJpc3N1ZWRBdCI6IjIwMjYtMDMtMDhUMTU6NDI6MDEuMTIwWiJ9",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(INTRADAY_CURSOR_MAX_LENGTH, {
    message: `cursor 长度不能超过 ${INTRADAY_CURSOR_MAX_LENGTH} 字符`,
  })
  cursor: string;

  @ApiPropertyOptional({
    description: "增量上限",
    example: 2000,
    minimum: 1,
    maximum: 5000,
    default: 2000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number = 2000;

  @ApiPropertyOptional({
    description:
      "是否开启 provider 一致性校验（true 时 cursor.provider 必须与请求 provider 一致）",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  strictProviderConsistency?: boolean = false;
}
