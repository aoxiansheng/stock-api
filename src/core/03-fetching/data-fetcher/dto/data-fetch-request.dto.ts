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

  /**
   * @deprecated 后端已拆分REST与流式能力，请使用专用的stream-data-fetcher服务处理流式数据
   */
  @ApiPropertyOptional({
    description: 'API类型',
    example: 'rest',
    enum: ['rest', 'stream'],
    deprecated: true
  })
  @IsOptional()
  @IsEnum(['rest', 'stream'])
  apiType?: 'rest' | 'stream';

  @ApiProperty({
    description: '请求ID，用于日志追踪',
    example: 'req_123456789',
  })
  @IsString()
  requestId: string;

  

  @ApiPropertyOptional({
    description: '其他选项',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

