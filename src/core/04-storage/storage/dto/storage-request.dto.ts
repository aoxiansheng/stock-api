import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsObject,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { StorageClassification } from "../../../shared/types/storage-classification.enum";
import { StorageType } from "../enums/storage-type.enum";

export class StorageOptionsDto {
  @ApiPropertyOptional({ description: "Cache TTL in seconds", default: 3600 })
  @IsOptional()
  @IsNumber()
  cacheTtl?: number;

  @ApiPropertyOptional({
    description:
      "Persistent storage TTL in seconds (undefined means never expire)",
  })
  @IsOptional()
  @IsNumber()
  persistentTtlSeconds?: number;

  @ApiPropertyOptional({
    description: "Whether to compress data",
    default: false,
  })
  @IsOptional()
  compress?: boolean;

  @ApiPropertyOptional({ description: "Custom storage tags for organization" })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;

  @ApiPropertyOptional({
    description: "Priority level for storage operations",
    default: "normal",
  })
  @IsOptional()
  @IsEnum(["high", "normal", "low"])
  priority?: "high" | "normal" | "low";
}

export class StoreDataDto {
  @ApiProperty({ description: "Unique storage key" })
  @IsString()
  key: string;

  @ApiProperty({ description: "Data to store" })
  @IsObject()
  data: any;

  @ApiProperty({
    description: "Storage type",
    enum: StorageType,
    example: StorageType.STORAGETYPECACHE,
  })
  @IsEnum(StorageType)
  storageType: StorageType;

  @ApiProperty({
    description: "Data classification",
    enum: StorageClassification,
    example: StorageClassification.STOCK_QUOTE,
  })
  @IsEnum(StorageClassification)
  storageClassification: StorageClassification;

  @ApiProperty({ description: "Data provider source" })
  @IsString()
  provider: string;

  @ApiProperty({ description: "Market identifier" })
  @IsString()
  market: string;

  @ApiPropertyOptional({ description: "Storage options" })
  @IsOptional()
  @ValidateNested()
  @Type(() => StorageOptionsDto)
  options?: StorageOptionsDto;
}

export class RetrieveDataDto {
  @ApiProperty({ description: "Storage key to retrieve" })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: "Preferred storage type to check first",
    enum: StorageType,
    default: StorageType.STORAGETYPECACHE,
  })
  @IsOptional()
  @IsEnum(StorageType)
  preferredType?: StorageType;
}
