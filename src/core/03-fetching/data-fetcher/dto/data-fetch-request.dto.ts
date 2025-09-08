import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';
import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  IsEnum,
  ArrayNotEmpty
} from "class-validator";
import { API_TYPE_VALUES } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";
import type { ApiType } from "../../../00-prepare/data-mapper/constants/data-mapper.constants";

/**
 * 数据获取请求DTO
 */
export class DataFetchRequestDto {
  @ApiProperty({
    description: "数据提供商名称",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: "能力名称",
    example: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
  })
  @IsString()
  capability: string;

  @ApiProperty({
    description: "股票代码列表",
    example: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  symbols: string[];

  /**
   * @deprecated 后端已拆分REST与流式能力，请使用专用的stream-data-fetcher服务处理流式数据
   */
  @ApiPropertyOptional({
    description: "API类型",
    example: "rest",
    enum: API_TYPE_VALUES,
    deprecated: true,
  })
  @IsOptional()
  @IsEnum(API_TYPE_VALUES)
  apiType?: "rest" | "stream";

  @ApiProperty({
    description: "请求ID，用于日志追踪",
    example: "req_123456789",
  })
  @IsString()
  requestId: string;

  @ApiPropertyOptional({
    description: "其他选项",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
