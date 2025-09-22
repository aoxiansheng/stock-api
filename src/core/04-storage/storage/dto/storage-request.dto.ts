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
import { MaxValueSize } from "@common/validators/value-size.validator";
import { StorageClassification } from "../../../shared/types/storage-classification.enum";
import { StorageType } from "../enums/storage-type.enum";
import { STORAGE_CONFIG } from "../constants/storage.constants";

export class StorageOptionsDto {

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

}

export class StoreDataDto {
  @ApiProperty({ description: "Unique storage key" })
  @IsString()
  key: string;

  @ApiProperty({ description: "Data to store" })
  @IsObject()
  @MaxValueSize(STORAGE_CONFIG.MAX_DATA_SIZE_MB * 1024 * 1024, {
    message: `数据大小不能超过 ${STORAGE_CONFIG.MAX_DATA_SIZE_MB}MB`,
  })
  data: any;

  @ApiProperty({
    description: "Storage type (only PERSISTENT supported)",
    enum: StorageType,
    example: StorageType.PERSISTENT,
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
    description:
      "Preferred storage type to check first (only PERSISTENT supported)",
    enum: StorageType,
    default: StorageType.PERSISTENT,
  })
  @IsOptional()
  @IsEnum(StorageType)
  preferredType?: StorageType;
}
