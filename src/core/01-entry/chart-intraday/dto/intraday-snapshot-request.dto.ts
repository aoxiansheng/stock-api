import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";

import { IsValidSymbolFormat } from "@common/validators/symbol-format.validator";
import {
  RECEIVER_ALLOWED_MARKETS,
  normalizeReceiverMarketInput,
} from "../../receiver/dto/data-request.dto";
import { YMD_DATE_PATTERN } from "@core/shared/utils/ymd-date.util";

export class IntradaySnapshotRequestDto {
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
    description: "市场代码，缺省时由 symbol 推断",
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

  @ApiPropertyOptional({
    description: "快照点数上限",
    example: 30000,
    minimum: 1,
    maximum: 30000,
    default: 30000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30000)
  pointLimit?: number = 30000;
}
