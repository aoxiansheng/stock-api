import { IsNumber, IsOptional, IsBoolean, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DataMapper 缓存配置 DTO
 */
export class DataMapperCacheConfigDto {
  @ApiProperty({
    description: "缓存过期时间 (秒)",
    example: 1800,
    minimum: 60,
    maximum: 86400,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  ttl?: number;

  @ApiProperty({
    description: "是否启用缓存指标统计",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enableMetrics?: boolean;
}


/**
 * 缓存预热配置 DTO
 */
export class CacheWarmupConfigDto {
  @ApiProperty({
    description: "是否缓存默认规则",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  cacheDefaultRules?: boolean;

  @ApiProperty({
    description: "是否缓存提供商规则列表",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  cacheProviderRules?: boolean;

  @ApiProperty({
    description: "预热超时时间 (毫秒)",
    example: 30000,
    minimum: 5000,
    maximum: 300000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(300000)
  warmupTimeoutMs?: number;
}

/**
 * 缓存健康检查结果 DTO
 */
export class DataMapperCacheHealthDto {
  @ApiProperty({
    description: "缓存状态",
    example: "healthy",
    enum: ["healthy", "warning", "unhealthy"],
  })
  status: "healthy" | "warning" | "unhealthy";

  @ApiProperty({
    description: "检查延迟 (毫秒)",
    example: 12,
  })
  @IsNumber()
  latency: number;

  @ApiProperty({
    description: "错误列表",
    example: [],
    type: [String],
  })
  errors: string[];

  @ApiProperty({
    description: "检查时间",
    example: "2024-03-21T10:30:00Z",
  })
  timestamp: Date;
}
