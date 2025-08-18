import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 缓存结果DTO
 */
export class CacheResultDto<T = any> {
  @ApiProperty({ description: '业务数据' })
  data: T;

  @ApiProperty({ description: '剩余TTL（秒）' })
  ttlRemaining: number;

  @ApiPropertyOptional({ description: '是否缓存命中' })
  hit?: boolean;

  @ApiPropertyOptional({ description: '存储时间戳（毫秒）' })
  storedAt?: number;
}

/**
 * 批量缓存结果DTO
 */
export class BatchCacheResultDto<T = any> {
  @ApiProperty({ 
    description: '缓存结果数组',
    type: [CacheResultDto]
  })
  results: Array<CacheResultDto<T> | null>;

  @ApiProperty({ description: '命中数量' })
  hitCount: number;

  @ApiProperty({ description: '总数量' })
  totalCount: number;

  @ApiProperty({ description: '命中率' })
  hitRate: number;
}

/**
 * 缓存操作统计DTO
 */
export class CacheStatsDto {
  @ApiProperty({ description: '总操作次数' })
  totalOperations: number;

  @ApiProperty({ description: '成功次数' })
  successCount: number;

  @ApiProperty({ description: '失败次数' })
  errorCount: number;

  @ApiProperty({ description: '成功率' })
  successRate: number;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  averageResponseTime: number;
}