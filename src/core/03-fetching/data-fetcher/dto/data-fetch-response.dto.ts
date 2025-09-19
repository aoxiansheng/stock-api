import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DataFetchMetadataDto } from "./data-fetch-metadata.dto";
import { REFERENCE_DATA } from "@common/constants/domain";

/**
 * 数据获取响应DTO
 */
export class DataFetchResponseDto {
  @ApiProperty({
    description: "获取到的原始数据",
    type: "array",
    items: {
      type: "object",
      additionalProperties: true,
    },
    example: [
      {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        last_done: 385.6,
        prev_close: 389.8,
        open: 387.2,
        high: 390.1,
        low: 384.5,
        volume: 12345600,
        turnover: 4765432100,
        timestamp: 1704110400000,
        trade_status: 1,
      },
    ],
  })
  data: any[];

  @ApiProperty({
    description: "数据获取元数据",
    type: DataFetchMetadataDto,
  })
  metadata: DataFetchMetadataDto;

  @ApiPropertyOptional({
    description: "是否存在部分失败",
    example: false,
  })
  hasPartialFailures?: boolean;

  constructor(
    data: any[],
    metadata: DataFetchMetadataDto,
    hasPartialFailures = false,
  ) {
    this.data = data;
    this.metadata = metadata;
    this.hasPartialFailures = hasPartialFailures;
  }

  /**
   * 创建成功响应
   */
  static success(
    data: any[],
    provider: string,
    capability: string,
    processingTimeMs: number,
    symbolsProcessed: number,
  ): DataFetchResponseDto {
    const metadata = new DataFetchMetadataDto(
      provider,
      capability,
      processingTimeMs,
      symbolsProcessed,
    );

    return new DataFetchResponseDto(data, metadata, false);
  }

  /**
   * 创建部分成功响应
   */
  static partialSuccess(
    data: any[],
    provider: string,
    capability: string,
    processingTimeMs: number,
    symbolsProcessed: number,
    failedSymbols: string[],
    errors: string[],
  ): DataFetchResponseDto {
    const metadata = new DataFetchMetadataDto(
      provider,
      capability,
      processingTimeMs,
      symbolsProcessed,
      failedSymbols,
      errors,
    );

    return new DataFetchResponseDto(data, metadata, true);
  }
}
