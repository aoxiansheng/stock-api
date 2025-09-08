import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

/**
 * 数据获取元数据DTO
 *
 * 独立的元数据定义，用于响应DTO和其他组件使用
 * 解耦请求DTO与响应DTO的依赖关系
 */
export class DataFetchMetadataDto {
  @ApiProperty({
    description: "数据提供商名称",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  provider: string;

  @ApiProperty({
    description: "能力名称",
    example: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
  })
  capability: string;

  @ApiProperty({
    description: "处理时间（毫秒）",
    example: 1500,
  })
  processingTimeMs: number;

  @ApiProperty({
    description: "成功处理的股票代码数量",
    example: 2,
  })
  symbolsProcessed: number;

  @ApiPropertyOptional({
    description: "失败的股票代码列表",
    type: [String],
    example: ["INVALID.XX"],
  })
  failedSymbols?: string[];

  @ApiPropertyOptional({
    description: "错误信息列表",
    type: [String],
    example: ["Symbol not found: INVALID.XX"],
  })
  errors?: string[];

  constructor(
    provider: string,
    capability: string,
    processingTimeMs: number,
    symbolsProcessed: number,
    failedSymbols?: string[],
    errors?: string[],
  ) {
    this.provider = provider;
    this.capability = capability;
    this.processingTimeMs = processingTimeMs;
    this.symbolsProcessed = symbolsProcessed;
    this.failedSymbols = failedSymbols;
    this.errors = errors;
  }
}
