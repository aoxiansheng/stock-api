import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
} from "class-validator";

export class CacheResultDto {
  @ApiProperty({ description: "缓存数据" })
  data: any;

  @ApiProperty({ description: "剩余TTL（秒）" })
  @IsNumber()
  ttl: number;

  @ApiProperty({ description: "元数据信息", required: false })
  @IsOptional()
  @IsObject()
  metadata?: {
    compressed?: boolean;
    storedAt?: string;
  };
}

export class PersistentResultDto {
  @ApiProperty({ description: "持久化数据" })
  data: any;

  @ApiProperty({ description: "元数据信息" })
  @IsObject()
  metadata: {
    storageClassification?: string;
    provider?: string;
    market?: string;
    dataSize?: number;
    compressed?: boolean;
    tags?: Record<string, string>;
    storedAt?: Date;
  };
}

export class CompressionResultDto {
  @ApiProperty({ description: "序列化数据" })
  @IsString()
  serializedData: string;

  @ApiProperty({ description: "是否压缩" })
  @IsBoolean()
  compressed: boolean;

  @ApiProperty({ description: "数据大小（字节）" })
  @IsNumber()
  dataSize: number;
}

export class CacheInfoDto {
  @ApiProperty({ description: "缓存命中状态" })
  @IsBoolean()
  hit: boolean;

  @ApiProperty({ description: "数据来源" })
  @IsString()
  source: "cache" | "persistent" | "not_found";

  @ApiProperty({ description: "剩余TTL（秒）", required: false })
  @IsOptional()
  @IsNumber()
  ttlRemaining?: number;
}

export class StorageCacheStatsDto {
  @ApiProperty({ description: "缓存键总数" })
  @IsNumber()
  totalKeys: number;

  @ApiProperty({ description: "内存使用量（字节）" })
  @IsNumber()
  totalMemoryUsage: number;

  @ApiProperty({ description: "缓存命中率" })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: "平均TTL（秒）" })
  @IsNumber()
  avgTtl: number;
}

export class PersistentStatsDto {
  @ApiProperty({ description: "文档总数" })
  @IsNumber()
  totalDocuments: number;

  @ApiProperty({ description: "总大小（字节）" })
  @IsNumber()
  totalSizeBytes: number;

  @ApiProperty({ description: "分类统计" })
  @IsObject()
  categoriesCounts: Record<string, number>;

  @ApiProperty({ description: "提供商统计" })
  @IsObject()
  providerCounts: Record<string, number>;
}

export class PerformanceStatsDto {
  @ApiProperty({ description: "平均存储时间（毫秒）" })
  @IsNumber()
  avgStorageTime: number;

  @ApiProperty({ description: "平均检索时间（毫秒）" })
  @IsNumber()
  avgRetrievalTime: number;

  @ApiProperty({ description: "每秒操作数" })
  @IsNumber()
  operationsPerSecond: number;

  @ApiProperty({ description: "错误率" })
  @IsNumber()
  errorRate: number;
}
