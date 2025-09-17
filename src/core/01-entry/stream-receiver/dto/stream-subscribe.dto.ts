import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
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
    description: "订阅选项",
    example: { includeAfterHours: true },
  })
  @IsOptional()
  options?: Record<string, any>;
}
