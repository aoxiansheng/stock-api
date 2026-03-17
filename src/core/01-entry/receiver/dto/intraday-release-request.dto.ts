import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

import { IsValidSymbolFormat } from "@common/validators/symbol-format.validator";
import {
  RECEIVER_ALLOWED_MARKETS,
  normalizeReceiverMarketInput,
} from "./data-request.dto";
import type { IntradayReleaseRequestDto as IntradayReleaseRequestDtoContract } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";

export class IntradayReleaseRequestDto
  implements IntradayReleaseRequestDtoContract
{
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
    description: "指定数据提供商",
    example: "infoway",
  })
  @IsOptional()
  @IsString()
  provider?: string;
}
