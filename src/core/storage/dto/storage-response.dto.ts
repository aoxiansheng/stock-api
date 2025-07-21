import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { StorageType, DataClassification } from "./storage-request.dto";

export class StorageMetadataDto {
  @ApiProperty({ description: "Storage key" })
  key: string;

  @ApiProperty({ description: "Storage type used", enum: StorageType })
  storageType: StorageType;

  @ApiProperty({ description: "Data classification", enum: DataClassification })
  dataClassification: DataClassification;

  @ApiProperty({ description: "Data provider" })
  provider: string;

  @ApiProperty({ description: "Market identifier" })
  market: string;

  @ApiProperty({ description: "Data size in bytes" })
  dataSize: number;

  @ApiProperty({ description: "Storage timestamp" })
  storedAt: string;

  @ApiPropertyOptional({ description: "Cache expiration time" })
  expiresAt?: string;

  @ApiPropertyOptional({ description: "Whether data was compressed" })
  compressed?: boolean;

  @ApiPropertyOptional({ description: "Storage tags" })
  tags?: Record<string, string>;

  @ApiProperty({ description: "Processing time in milliseconds" })
  processingTime: number;

  constructor(
    key: string,
    storageType: StorageType,
    dataClassification: DataClassification,
    provider: string,
    market: string,
    dataSize: number,
    processingTime: number,
    compressed?: boolean,
    tags?: Record<string, string>,
    expiresAt?: string,
  ) {
    this.key = key;
    this.storageType = storageType;
    this.dataClassification = dataClassification;
    this.provider = provider;
    this.market = market;
    this.dataSize = dataSize;
    this.storedAt = new Date().toISOString();
    this.processingTime = processingTime;
    this.compressed = compressed;
    this.tags = tags;
    this.expiresAt = expiresAt;
  }
}

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
