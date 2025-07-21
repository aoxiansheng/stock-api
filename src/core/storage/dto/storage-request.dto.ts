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

export enum StorageType {
  CACHE = "cache",
  PERSISTENT = "persistent",
  BOTH = "both",
}

/**
 * Enum for different classifications of data
 */
export enum DataClassification {
  STOCK_QUOTE = "stock_quote",
  STOCK_CANDLE = "stock_candle",
  STOCK_TICK = "stock_tick",
  FINANCIAL_STATEMENT = "financial_statement",
  COMPANY_PROFILE = "company_profile",
  MARKET_NEWS = "market_news",
  TRADING_ORDER = "trading_order",
  USER_PORTFOLIO = "user_portfolio",
  GENERAL = "general", // 默认/通用类别
}

export class StorageOptionsDto {
  @ApiPropertyOptional({ description: "Cache TTL in seconds", default: 3600 })
  @IsOptional()
  @IsNumber()
  cacheTtl?: number;

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
    example: StorageType.BOTH,
  })
  @IsEnum(StorageType)
  storageType: StorageType;

  @ApiProperty({
    description: "Data classification",
    enum: DataClassification,
    example: DataClassification.STOCK_QUOTE,
  })
  @IsEnum(DataClassification)
  dataClassification: DataClassification;

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
    default: StorageType.CACHE,
  })
  @IsOptional()
  @IsEnum(StorageType)
  preferredType?: StorageType;

  @ApiPropertyOptional({
    description: "Whether to update cache if found in persistent storage",
  })
  @IsOptional()
  updateCache?: boolean;
}
