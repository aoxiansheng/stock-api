import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FailureDetailDto {
  @ApiProperty({ description: "失败的符号" })
  symbol: string;

  @ApiPropertyOptional({ description: "失败原因" })
  reason?: string;
}

export class ResponseMetadataDto {
  @ApiProperty({ description: "数据提供商名称" })
  provider: string;

  @ApiProperty({ description: "使用的能力名称" })
  capability: string;

  @ApiProperty({ description: "响应时间戳" })
  timestamp: string;

  @ApiProperty({ description: "请求ID" })
  requestId: string;

  @ApiProperty({ description: "处理时间(毫秒)" })
  processingTime: number;

  @ApiProperty({ description: "是否存在部分失败", required: false })
  hasPartialFailures?: boolean;

  @ApiProperty({ description: "总请求数量", required: false })
  totalRequested?: number;

  @ApiProperty({ description: "成功处理数量", required: false })
  successfullyProcessed?: number;

  constructor(
    provider: string,
    capability: string,
    requestId: string,
    processingTime: number,
    hasPartialFailures?: boolean,
    totalRequested?: number,
    successfullyProcessed?: number,
  ) {
    this.provider = provider;
    this.capability = capability;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.processingTime = processingTime;
    this.hasPartialFailures = hasPartialFailures;
    this.totalRequested = totalRequested;
    this.successfullyProcessed = successfullyProcessed;
  }
}

/**
 * 数据接收器业务响应DTO
 * 注意：已移除success、errors等HTTP响应字段，这些由ResponseInterceptor统一处理
 */
export class DataResponseDto<T = unknown> {
  @ApiProperty({ description: "返回的业务数据" })
  data: T;

  @ApiProperty({ description: "数据处理元信息", type: ResponseMetadataDto })
  metadata: ResponseMetadataDto;

  @ApiPropertyOptional({
    description: "失败的符号明细",
    type: [FailureDetailDto],
  })
  failures?: FailureDetailDto[];

  constructor(data: T, metadata: ResponseMetadataDto) {
    this.data = data;
    this.metadata = metadata;
  }
}
