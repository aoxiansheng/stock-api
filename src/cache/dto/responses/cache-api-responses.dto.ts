import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

// Cache 模块相关的响应类型
import { CacheHealthCheckResultDto } from "../health/health-check-result.dto";
import { CacheMetricsUpdateDto } from "../metrics/metrics-update.dto";
import { CacheOperationResultDto } from "../operations/cache-operation-result.dto";
import { RedisCacheRuntimeStatsDto } from "../redis-cache-runtime-stats.dto";
import { CacheKeyPatternAnalysisDto } from "../analytics/key-pattern-analysis.dto";

/**
 * Cache健康检查统一响应格式
 * 🎯 Phase 3: 响应格式统一 - 使用ResponseInterceptor标准格式
 */
export class CacheHealthResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "缓存健康检查完成" })
  message: string;

  @ApiProperty({ type: CacheHealthCheckResultDto })
  @Type(() => CacheHealthCheckResultDto)
  data: CacheHealthCheckResultDto;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}

/**
 * Cache指标统一响应格式
 */
export class CacheMetricsResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "缓存指标获取成功" })
  message: string;

  @ApiProperty({ type: [CacheMetricsUpdateDto] })
  @Type(() => CacheMetricsUpdateDto)
  data: CacheMetricsUpdateDto[];

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}

/**
 * Cache操作结果统一响应格式
 */
export class CacheOperationResponse<T = any> {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "缓存操作完成" })
  message: string;

  @ApiProperty({ type: CacheOperationResultDto })
  @Type(() => CacheOperationResultDto)
  data: CacheOperationResultDto<T>;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}

/**
 * Cache统计信息统一响应格式
 */
export class CacheStatsResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "缓存统计信息获取成功" })
  message: string;

  @ApiProperty({ type: RedisCacheRuntimeStatsDto })
  @Type(() => RedisCacheRuntimeStatsDto)
  data: RedisCacheRuntimeStatsDto;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}

/**
 * Cache分析结果统一响应格式
 */
export class CacheAnalysisResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "缓存分析完成" })
  message: string;

  @ApiProperty({ type: [CacheKeyPatternAnalysisDto] })
  @Type(() => CacheKeyPatternAnalysisDto)
  data: CacheKeyPatternAnalysisDto[];

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}

/**
 * 批量Cache操作统一响应格式
 */
export class BatchCacheResponse<T = any> {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "批量缓存操作完成" })
  message: string;

  @ApiProperty({ 
    description: "批量操作结果",
    example: {
      success: true,
      processed: 10,
      failed: 0,
      results: {}
    }
  })
  data: {
    success: boolean;
    processed: number;
    failed: number;
    results: Record<string, CacheOperationResultDto<T>>;
  };

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}

/**
 * Cache配置响应格式
 */
export class CacheConfigResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: "缓存配置获取成功" })
  message: string;

  @ApiProperty({ 
    description: "缓存配置信息",
    example: {
      defaultTtl: 3600,
      maxSize: 1048576,
      enabled: true,
      serializer: "json"
    }
  })
  data: {
    defaultTtl: number;
    maxSize: number;
    enabled: boolean;
    serializer: string;
    compressionThreshold?: number;
  };

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  timestamp: string;
}