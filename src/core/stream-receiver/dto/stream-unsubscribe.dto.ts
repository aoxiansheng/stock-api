import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * WebSocket 取消订阅请求 DTO
 */
export class StreamUnsubscribeDto {
  @ApiProperty({
    description: '要取消订阅的股票符号列表',
    example: ['700.HK', 'AAPL.US'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要取消订阅一个符号' })
  @IsString({ each: true })
  symbols: string[];

  @ApiProperty({
    description: 'WebSocket 能力类型',
    example: 'stream-stock-quote',
    default: 'stream-stock-quote',
  })
  @IsString()
  @IsOptional()
  capabilityType: string = 'stream-stock-quote';

  @ApiProperty({
    description: '首选数据提供商',
    example: 'longport',
  })
  @IsString()
  @IsOptional()
  preferredProvider?: string;
}