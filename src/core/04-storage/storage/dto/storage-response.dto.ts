import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { StorageMetadataDto } from "./storage-metadata.dto";

/**
 * 存储业务响应DTO
 * 注意：已移除success、errors等HTTP响应字段，这些由ResponseInterceptor统一处理
 * 错误信息应该通过抛出异常来处理
 */
export class StorageResponseDto<T = any> {
  @ApiProperty({ description: "检索或存储的业务数据" })
  data: T;

  @ApiProperty({ description: "存储元信息", type: StorageMetadataDto })
  metadata: StorageMetadataDto;

  @ApiPropertyOptional({ description: "缓存命中信息" })
  cacheInfo?: {
    hit: boolean;
    source: "cache" | "persistent" | "not_found";
    ttlRemaining?: number;
  };

  constructor(
    data: T,
    metadata: StorageMetadataDto,
    cacheInfo?: {
      hit: boolean;
      source: "cache" | "persistent" | "not_found";
      ttlRemaining?: number;
    },
  ) {
    this.data = data;
    this.metadata = metadata;
    this.cacheInfo = cacheInfo;
  }
}

export class StorageStatsDto {
  @ApiProperty({ description: "Cache statistics" })
  cache: {
    totalKeys: number;
    totalMemoryUsage: number;
    hitRate: number;
    avgTtl: number;
  };

  @ApiProperty({ description: "Persistent storage statistics" })
  persistent: {
    totalDocuments: number;
    totalSizeBytes: number;
    categoriesCounts: Record<string, number>;
    providerCounts: Record<string, number>;
  };

  @ApiProperty({ description: "Overall performance metrics" })
  performance: {
    avgStorageTime: number;
    avgRetrievalTime: number;
    operationsPerSecond: number;
    errorRate: number;
  };

  @ApiProperty({ description: "Statistics generation timestamp" })
  timestamp: string;

  constructor() {
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 存储项目分页列表DTO
 * 
 * 这是每个存储项目的简化表示，用于分页列表显示
 */
export class PaginatedStorageItemDto {
  id: string;
  key: string;
  provider: string;
  market: string;
  storageClassification: string;
  compressed: boolean;
  dataSize: number;
  tags?: string[];
  storedAt?: string;
  expiresAt?: string;
}
