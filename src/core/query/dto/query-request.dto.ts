import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsBoolean,
  IsNotEmpty,
  ArrayNotEmpty,
  ArrayMaxSize,
  Min,
  Max,
  NotContains,
  Validate,
} from "class-validator";

import { QUERY_PERFORMANCE_CONFIG, QUERY_VALIDATION_RULES } from "../constants/query.constants";
import { SymbolsRequiredForBySymbolsQueryConstraint } from "../validators/symbols-required-for-by-symbols.validator";

import { QueryType } from "./query-types.dto";

export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

class SortOptionsDto {
  @ApiProperty({ description: "Field to sort by" })
  @IsString()
  field: string;

  @ApiProperty({ description: "Sort direction", enum: SortDirection })
  @IsEnum(SortDirection)
  direction: SortDirection;
}

class FilterConditionDto {
  @ApiProperty({ description: "Field to filter" })
  @IsString()
  field: string;

  @ApiProperty({
    description: "Filter operator",
    enum: ["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "regex"],
  })
  @IsEnum(["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "regex"])
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "regex";

  @ApiProperty({ description: "Filter value" })
  value: any;
}

class QueryOptionsDto {
  @ApiPropertyOptional({ description: "Use cache if available", default: true })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean;

  @ApiPropertyOptional({
    description: "Update cache with results",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  updateCache?: boolean;

  @ApiPropertyOptional({
    description: "Include metadata in response",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: "Maximum age of cached data in seconds" })
  @IsOptional()
  @IsNumber()
  maxCacheAge?: number;

  @ApiPropertyOptional({ description: "Fields to include in response" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({ description: "Fields to exclude from response" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeFields?: string[];
}

export class QueryRequestDto {
  @ApiProperty({ description: "Query type", enum: QueryType })
  @IsEnum(QueryType)
  @IsNotEmpty()
  queryType: QueryType;

  @ApiPropertyOptional({ 
    description: `Stock symbols to query. Max ${QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY} per query. Required for BY_SYMBOLS query type.` 
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @NotContains(' ', { each: true, message: 'Symbol should not contain spaces' })
  @Validate(SymbolsRequiredForBySymbolsQueryConstraint)
  symbols?: string[];

  @ApiPropertyOptional({ description: "Market to query" })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({ description: "Data provider to query" })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: "Data type filter to query" })
  @IsOptional()
  @IsString()
  dataTypeFilter?: string;

  @ApiPropertyOptional({ description: "Start time for time range queries" })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: "End time for time range queries" })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: "Advanced filter conditions" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters?: FilterConditionDto[];

  @ApiPropertyOptional({ description: "Sort options" })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortOptionsDto)
  sort?: SortOptionsDto;

  @ApiPropertyOptional({
    description: `Number of results to return. Min 1, Max ${QUERY_VALIDATION_RULES.MAX_QUERY_LIMIT}.`,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(QUERY_VALIDATION_RULES.MAX_QUERY_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ description: "Number of results to skip", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: "Query options" })
  @IsOptional()
  @ValidateNested()
  @Type(() => QueryOptionsDto)
  options?: QueryOptionsDto;

  // Manually added properties from service that should be in DTO
  @ApiPropertyOptional({
    description: "Maximum age of data in seconds to be considered fresh.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAge?: number;

  @ApiPropertyOptional({
    description: "Time-to-live for cached data in seconds.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cacheTTL?: number;

  @ApiPropertyOptional({
    description: "Whether to use cache for the query.",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean;

  @ApiPropertyOptional({ description: "Fields to include in the response." })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    includeFields?: string[];

  @ApiPropertyOptional({ description: "Fields to exclude from the response." })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    excludeFields?: string[];
}

export class BulkQueryRequestDto {
  @ApiProperty({ 
    description: `Multiple query requests to execute. Max ${QUERY_PERFORMANCE_CONFIG.MAX_BULK_QUERIES} per request.`
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(QUERY_PERFORMANCE_CONFIG.MAX_BULK_QUERIES)
  @Type(() => QueryRequestDto)
  queries: QueryRequestDto[];

  @ApiPropertyOptional({
    description: "Execute queries in parallel",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean;

  @ApiPropertyOptional({
    description: "Continue on individual query errors",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}
