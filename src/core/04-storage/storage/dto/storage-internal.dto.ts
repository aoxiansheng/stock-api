import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
} from "class-validator";




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
