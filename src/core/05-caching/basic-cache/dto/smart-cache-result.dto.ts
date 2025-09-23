import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 智能缓存结果DTO
 */
export class SmartCacheResultDto<T = any> {
  @ApiProperty({ description: "业务数据" })
  data: T;

  @ApiProperty({ description: "是否缓存命中" })
  hit: boolean;

  @ApiProperty({ description: "剩余TTL（秒）" })
  ttlRemaining: number;

  @ApiPropertyOptional({
    description: "数据来源",
    enum: ["cache", "fetch", "fallback"],
  })
  source?: "cache" | "fetch" | "fallback";

  @ApiPropertyOptional({ description: "存储时间戳（毫秒）" })
  storedAt?: number;

  @ApiPropertyOptional({ description: "是否触发后台刷新" })
  backgroundRefreshTriggered?: boolean;

  @ApiPropertyOptional({ description: "缓存策略" })
  strategy?: string;

  @ApiPropertyOptional({ description: "响应时间（毫秒）" })
  responseTime?: number;
}

/**
 * 批量智能缓存结果DTO
 */
export class BatchSmartCacheResultDto<T = any> {
  @ApiProperty({
    description: "智能缓存结果数组",
    type: [SmartCacheResultDto],
  })
  results: Array<SmartCacheResultDto<T>>;

  @ApiProperty({ description: "总数量" })
  totalCount: number;

  @ApiProperty({ description: "缓存命中数量" })
  cacheHitCount: number;

  @ApiProperty({ description: "回源数量" })
  fetchCount: number;

  @ApiProperty({ description: "降级数量" })
  fallbackCount: number;

  @ApiProperty({ description: "缓存命中率" })
  hitRate: number;

  @ApiProperty({ description: "后台刷新触发数量" })
  backgroundRefreshCount: number;

  @ApiProperty({ description: "总响应时间（毫秒）" })
  totalResponseTime: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  averageResponseTimeMs: number;
}
