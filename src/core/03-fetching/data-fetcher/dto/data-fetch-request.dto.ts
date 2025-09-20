import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  IsEnum,
  ArrayNotEmpty,
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
   * API类型 - 系统核心字段
   *
   * 用于控制数据获取策略和路由选择：
   * - "rest": 使用REST API进行数据获取（默认策略）
   * - "stream": 使用WebSocket进行实时数据流获取
   *
   * 🔧 架构说明：
   * - 被24个核心组件使用，控制数据获取行为
   * - receiver.service.ts、stream-receiver.service.ts等依赖此字段
   * - 影响缓存策略、性能优化和用户体验
   *
   * ⚠️ 重要：此字段为系统核心功能，不可移除
   */
  @ApiPropertyOptional({
    description: "API类型：控制数据获取策略（rest=REST API，stream=WebSocket流）",
    example: "rest",
    enum: API_TYPE_VALUES,
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
