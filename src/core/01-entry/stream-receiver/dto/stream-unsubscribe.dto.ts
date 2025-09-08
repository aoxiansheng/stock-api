import { IsArray, IsString, IsOptional, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

/**
 * WebSocket 取消订阅请求 DTO
 */
export class StreamUnsubscribeDto {
  @ApiProperty({
    description: "要取消订阅的股票符号列表",
    example: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: "至少需要取消订阅一个符号" })
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
    description: "首选数据提供商",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsString()
  @IsOptional()
  preferredProvider?: string;
}
