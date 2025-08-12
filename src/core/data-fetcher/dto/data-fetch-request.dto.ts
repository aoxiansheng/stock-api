import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  IsEnum,
  ArrayNotEmpty,
} from 'class-validator';

/**
 * API类型枚举
 */
export enum ApiType {
  REST = 'rest',
  WEBSOCKET = 'websocket',
}

/**
 * 数据获取请求DTO
 */
export class DataFetchRequestDto {
  @ApiProperty({
    description: '数据提供商名称',
    example: 'longport',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: '能力名称',
    example: 'get-stock-quote',
  })
  @IsString()
  capability: string;

  @ApiProperty({
    description: '股票代码列表',
    example: ['700.HK', 'AAPL.US'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  symbols: string[];

  @ApiProperty({
    description: '请求ID，用于日志追踪',
    example: 'req_123456789',
  })
  @IsString()
  requestId: string;

  @ApiPropertyOptional({
    description: 'API类型',
    enum: ApiType,
    default: ApiType.REST,
  })
  @IsOptional()
  @IsEnum(ApiType)
  apiType?: ApiType = ApiType.REST;

  @ApiPropertyOptional({
    description: '其他选项',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

/**
 * 数据获取元数据DTO
 */
export class DataFetchMetadataDto {
  @ApiProperty({
    description: '数据提供商名称',
    example: 'longport',
  })
  provider: string;

  @ApiProperty({
    description: '能力名称',
    example: 'get-stock-quote',
  })
  capability: string;

  @ApiProperty({
    description: '处理时间戳',
    example: 1704110400000,
  })
  processingTime: number;

  @ApiProperty({
    description: '成功处理的股票代码数量',
    example: 2,
  })
  symbolsProcessed: number;

  @ApiPropertyOptional({
    description: '失败的股票代码列表',
    type: [String],
    example: ['INVALID.XX'],
  })
  failedSymbols?: string[];

  @ApiPropertyOptional({
    description: '错误信息列表',
    type: [String],
    example: ['Symbol not found: INVALID.XX'],
  })
  errors?: string[];

  constructor(
    provider: string,
    capability: string,
    processingTime: number,
    symbolsProcessed: number,
    failedSymbols?: string[],
    errors?: string[],
  ) {
    this.provider = provider;
    this.capability = capability;
    this.processingTime = processingTime;
    this.symbolsProcessed = symbolsProcessed;
    this.failedSymbols = failedSymbols;
    this.errors = errors;
  }
}