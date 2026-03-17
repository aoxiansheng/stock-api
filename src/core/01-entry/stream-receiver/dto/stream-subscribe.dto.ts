import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * WebSocket 订阅请求 DTO
 */
export class StreamSubscribeDto {
  @ApiProperty({
    description: "要订阅的股票符号列表",
    example: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US", "TSLA.US"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: "至少需要订阅一个符号" })
  @ArrayMaxSize(50, { message: "单次最多订阅50个符号" })
  @IsString({ each: true })
  symbols: string[];

  @ApiProperty({
    description: "WebSocket 能力类型",
    example: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
    default: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
  })
  @IsString()
  @IsOptional()
  wsCapabilityType: string = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE;

  @ApiProperty({
    description: "认证令牌（JWT Token 或 API Key）",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiProperty({
    description: "API Key（用于 API Key 认证）",
    example: "app_key_12345",
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({
    description: "Access Token（用于 API Key 认证）",
    example: "access_token_67890",
  })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiProperty({
    description: "首选数据提供商",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsString()
  @IsOptional()
  preferredProvider?: string;

  @ApiProperty({
    description:
      "遗留兼容字段。仅在显式 chart-intraday WS 绑定时传入；未传入时不会自动匹配或绑定分时图租约",
    example: "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a",
    required: false,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  sessionId?: string;
}
