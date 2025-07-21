import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TransformationMetadataDto {
  @ApiProperty({ description: "Applied mapping rule ID" })
  ruleId: string;

  @ApiProperty({ description: "Applied mapping rule name" })
  ruleName: string;

  @ApiProperty({ description: "Data provider used" })
  provider: string;

  @ApiProperty({ description: "Data type processed" })
  dataType: string;

  @ApiProperty({ description: "Number of records processed" })
  recordsProcessed: number;

  @ApiProperty({ description: "Number of fields transformed" })
  fieldsTransformed: number;

  @ApiProperty({
    description: "Transformation processing time in milliseconds",
  })
  processingTime: number;

  @ApiProperty({ description: "Transformation timestamp" })
  timestamp: string;

  @ApiPropertyOptional({ description: "Applied transformations details" })
  transformationsApplied?: Array<{
    sourceField: string;
    targetField: string;
    transformType?: string;
    transformValue?: any;
  }>;

  constructor(
    ruleId: string,
    ruleName: string,
    provider: string,
    dataType: string,
    recordsProcessed: number,
    fieldsTransformed: number,
    processingTime: number,
    transformationsApplied?: Array<{
      sourceField: string;
      targetField: string;
      transformType?: string;
      transformValue?: any;
    }>,
  ) {
    this.ruleId = ruleId;
    this.ruleName = ruleName;
    this.provider = provider;
    this.dataType = dataType;
    this.recordsProcessed = recordsProcessed;
    this.fieldsTransformed = fieldsTransformed;
    this.processingTime = processingTime;
    this.timestamp = new Date().toISOString();
    this.transformationsApplied = transformationsApplied;
  }
}

/**
 * 数据转换业务响应DTO
 * 注意：已移除success、errors、warnings等HTTP响应字段，这些由ResponseInterceptor统一处理
 * 错误和警告信息应该通过抛出异常或记录日志来处理
 */
export class TransformResponseDto<T = unknown> {
  @ApiProperty({ description: "转换后的业务数据" })
  transformedData: T;

  @ApiProperty({
    description: "数据转换元信息",
    type: TransformationMetadataDto,
  })
  metadata: TransformationMetadataDto;

  constructor(transformedData: T, metadata: TransformationMetadataDto) {
    this.transformedData = transformedData;
    this.metadata = metadata;
  }
}
