import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { StorageClassification } from "../../../shared/types/storage-classification.enum";
import { StorageType } from "../enums/storage-type.enum";

export class StorageMetadataDto {
  @ApiProperty({ description: "Storage key" })
  key: string;

  @ApiProperty({
    description: "Storage type used",
    enum: StorageType,
    enumName: "StorageType",
  })
  storageType: StorageType;

  @ApiProperty({
    description: "Data classification",
    enum: StorageClassification,
    enumName: "StorageClassification",
  })
  storageClassification: StorageClassification;

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
  processingTimeMs: number;

  constructor(
    key: string,
    storageType: StorageType,
    storageClassification: StorageClassification,
    provider: string,
    market: string,
    dataSize: number,
    processingTimeMs: number,
    compressed?: boolean,
    tags?: Record<string, string>,
    expiresAt?: string,
  ) {
    this.key = key;
    this.storageType = storageType;
    this.storageClassification = storageClassification;
    this.provider = provider;
    this.market = market;
    this.dataSize = dataSize;
    this.storedAt = new Date().toISOString();
    this.processingTimeMs = processingTimeMs;
    this.compressed = compressed;
    this.tags = tags;
    this.expiresAt = expiresAt;
  }
}
