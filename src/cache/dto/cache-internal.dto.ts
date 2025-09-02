import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { RedisCacheRuntimeStatsDto } from './redis-cache-runtime-stats.dto';

/**
 * @deprecated 使用 RedisCacheRuntimeStatsDto 替代
 * 此类已重命名为 RedisCacheRuntimeStatsDto 以解决与 StorageCacheStatsDto 的命名冲突
 * 
 * 迁移指南：
 * 旧导入：import { CacheStatsDto } from './cache-internal.dto'
 * 新导入：import { RedisCacheRuntimeStatsDto } from './redis-cache-runtime-stats.dto'
 */
export type CacheStatsDto = RedisCacheRuntimeStatsDto;

// 重新导出新的DTO类，便于导入
export { RedisCacheRuntimeStatsDto } from './redis-cache-runtime-stats.dto';

/**
 * 通用缓存配置DTO
 * 
 * 用于统一缓存操作的配置参数
 * 包含序列化、压缩、TTL等核心配置
 */
export class CacheConfigDto {
  @ApiProperty({ 
    description: "缓存TTL（秒）", 
    required: false,
    example: 3600 
  })
  @IsOptional()
  @IsNumber()
  ttl?: number;

  @ApiProperty({ 
    description: "最大缓存大小（字节）", 
    required: false,
    example: 1048576 
  })
  @IsOptional()
  @IsNumber()
  maxSize?: number;

  @ApiProperty({ 
    description: "是否启用缓存", 
    required: false, 
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ 
    description: "序列化器类型", 
    enum: ["json", "msgpack"],
    required: false,
    default: "json",
    example: "json"
  })
  @IsOptional()
  @IsEnum(["json", "msgpack"])
  serializer?: "json" | "msgpack";

  @ApiProperty({ 
    description: "压缩阈值（字节，超过此大小将自动压缩）", 
    required: false,
    example: 1024,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  compressionThreshold?: number;
}

/**
 * 缓存健康检查结果DTO
 */
export class CacheHealthCheckResultDto {
  @ApiProperty({
    description: "健康状态",
    enum: ["healthy", "warning", "unhealthy"],
  })
  @IsString()
  status: "healthy" | "warning" | "unhealthy";

  @ApiProperty({ description: "延迟时间（毫秒）" })
  @IsNumber()
  latency: number;

  @ApiProperty({ description: "错误信息列表" })
  @IsArray()
  @IsString({ each: true })
  errors: string[];

  @ApiProperty({ description: "健康检查时间戳", required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ description: "内存使用详情", required: false })
  @IsOptional()
  @IsObject()
  memoryInfo?: {
    used: number;
    max: number;
    usageRatio: number;
  };
}

/**
 * 缓存操作结果DTO
 */
export class CacheOperationResultDto<T = any> {
  @ApiProperty({ description: "操作是否成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "缓存数据" })
  data: T;

  @ApiProperty({ description: "数据来源", enum: ["cache", "callback"] })
  @IsString()
  source: "cache" | "callback";

  @ApiProperty({ description: "操作执行时间（毫秒）" })
  @IsNumber()
  executionTimeMs: number;

  @ApiProperty({ description: "是否使用了压缩", required: false })
  @IsOptional()
  @IsBoolean()
  compressed?: boolean;
}

/**
 * 批量缓存操作DTO
 */
export class BatchCacheOperationDto<T = any> {
  @ApiProperty({ description: "缓存键值对" })
  @IsObject()
  entries: Map<string, T>;

  @ApiProperty({ description: "TTL设置" })
  @IsNumber()
  ttl: number;

  @ApiProperty({ description: "批量大小" })
  @IsNumber()
  batchSize: number;

  @ApiProperty({ description: "操作配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheConfigDto)
  config?: CacheConfigDto;
}

/**
 * 缓存指标更新DTO
 */
export class CacheMetricsUpdateDto {
  @ApiProperty({ description: "缓存键" })
  @IsString()
  key: string;

  @ApiProperty({ description: "操作类型", enum: ["hit", "miss", "set"] })
  @IsEnum(["hit", "miss", "set"])
  operation: "hit" | "miss" | "set";

  @ApiProperty({ description: "键模式" })
  @IsString()
  pattern: string;

  @ApiProperty({ description: "操作时间戳" })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: "执行时间（毫秒）", required: false })
  @IsOptional()
  @IsNumber()
  executionTime?: number;
}

/**
 * 缓存预热配置DTO
 */
export class CacheWarmupConfigDto<T = any> {
  @ApiProperty({ description: "预热数据" })
  @IsObject()
  warmupData: Map<string, T>;

  @ApiProperty({ description: "缓存配置" })
  @ValidateNested()
  @Type(() => CacheConfigDto)
  config: CacheConfigDto;

  @ApiProperty({
    description: "预热策略",
    enum: ["sequential", "parallel"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["sequential", "parallel"])
  strategy?: "sequential" | "parallel";

  @ApiProperty({ description: "最大并发数", required: false })
  @IsOptional()
  @IsNumber()
  maxConcurrency?: number;
}

/**
 * 缓存压缩信息DTO
 */
export class CacheCompressionInfoDto {
  @ApiProperty({ description: "是否需要压缩" })
  @IsBoolean()
  shouldCompress: boolean;

  @ApiProperty({ description: "原始大小（字节）" })
  @IsNumber()
  originalSize: number;

  @ApiProperty({ description: "压缩后大小（字节）", required: false })
  @IsOptional()
  @IsNumber()
  compressedSize?: number;

  @ApiProperty({ description: "压缩比率", required: false })
  @IsOptional()
  @IsNumber()
  compressionRatio?: number;

  @ApiProperty({ description: "压缩算法", required: false })
  @IsOptional()
  @IsString()
  algorithm?: string;
}

/**
 * 缓存序列化信息DTO
 */
export class CacheSerializationInfoDto {
  @ApiProperty({ description: "序列化类型", enum: ["json", "msgpack"] })
  @IsEnum(["json", "msgpack"])
  type: "json" | "msgpack";

  @ApiProperty({ description: "序列化后的数据大小（字节）" })
  @IsNumber()
  serializedSize: number;

  @ApiProperty({ description: "序列化时间（毫秒）" })
  @IsNumber()
  serializationTime: number;

  @ApiProperty({ description: "是否序列化成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "错误信息", required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

/**
 * 分布式锁信息DTO
 */
export class DistributedLockInfoDto {
  @ApiProperty({ description: "锁键" })
  @IsString()
  lockKey: string;

  @ApiProperty({ description: "锁值" })
  @IsString()
  lockValue: string;

  @ApiProperty({ description: "锁TTL（秒）" })
  @IsNumber()
  lockTtl: number;

  @ApiProperty({ description: "是否获取成功" })
  @IsBoolean()
  acquired: boolean;

  @ApiProperty({ description: "获取锁的时间戳" })
  @IsNumber()
  acquiredAt: number;

  @ApiProperty({ description: "重试次数", required: false })
  @IsOptional()
  @IsNumber()
  retryCount?: number;
}

/**
 * 缓存键模式分析DTO
 */
export class CacheKeyPatternAnalysisDto {
  @ApiProperty({ description: "键模式" })
  @IsString()
  pattern: string;

  @ApiProperty({ description: "命中次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "未命中次数" })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: "命中率" })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: "总请求数" })
  @IsNumber()
  totalRequests: number;

  @ApiProperty({ description: "最后访问时间" })
  @IsNumber()
  lastAccessTime: number;
}

/**
 * 缓存性能监控DTO
 */
export class CachePerformanceMonitoringDto {
  @ApiProperty({ description: "操作类型" })
  @IsString()
  operation: string;

  @ApiProperty({ description: "执行时间（毫秒）" })
  @IsNumber()
  executionTimeMs: number;

  @ApiProperty({ description: "操作时间戳" })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: "是否为慢操作" })
  @IsBoolean()
  isSlowOperation: boolean;

  @ApiProperty({ description: "慢操作阈值（毫秒）" })
  @IsNumber()
  slowOperationThreshold: number;

  @ApiProperty({ description: "额外的性能指标", required: false })
  @IsOptional()
  @IsObject()
  additionalMetrics?: Record<string, any>;
}
