import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

/**
 * 基础缓存请求DTO
 */
export class CacheRequestDto {
  @ApiProperty({ description: '缓存键' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'TTL（秒）', minimum: 1 })
  @IsNumber()
  @Min(1)
  ttl: number;

  @ApiPropertyOptional({ description: '是否压缩数据', default: false })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;
}

/**
 * 批量缓存请求DTO
 */
export class BatchCacheRequestDto {
  @ApiProperty({ 
    description: '缓存键数组',
    type: [String],
    maxItems: 100 
  })
  @IsString({ each: true })
  keys: string[];
}

/**
 * 缓存回源请求DTO
 */
export class CacheFallbackRequestDto extends CacheRequestDto {
  @ApiPropertyOptional({ description: '回源超时时间（毫秒）', default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  fetchTimeout?: number;
}