import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsIn,
} from "class-validator";

import { DataSourceType } from "../enums/data-source-type.enum";

/**
 * 查询统计记录DTO
 */
export class QueryStatsRecordDto {
  @ApiProperty({ description: "查询数量" })
  @IsNumber()
  count: number;

  @ApiProperty({ description: "总执行时间（毫秒）" })
  @IsNumber()
  totalTime: number;

  @ApiProperty({ description: "错误数量" })
  @IsNumber()
  errors: number;
}

/**
 * 数据源统计详情DTO
 */
export class DataSourceCounterDto {
  @ApiProperty({ description: "命中次数或请求次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "未命中次数或失败次数" })
  @IsNumber()
  misses: number;
}

/**
 * 数据源统计DTO
 */
export class DataSourceStatsDto {
  @ApiProperty({ description: "缓存统计", type: DataSourceCounterDto })
  @ValidateNested()
  @Type(() => DataSourceCounterDto)
  cache: DataSourceCounterDto;

  @ApiProperty({ description: "实时数据源统计", type: DataSourceCounterDto })
  @ValidateNested()
  @Type(() => DataSourceCounterDto)
  realtime: DataSourceCounterDto;
}

/**
 * 查询执行结果DTO
 */
export class QueryExecutionResultDto<T = any> {
  @ApiProperty({ description: "查询结果数据列表" })
  @IsArray()
  results: T[];

  @ApiProperty({ description: "是否使用了缓存" })
  @IsBoolean()
  cacheUsed: boolean;

  @ApiProperty({ description: "数据源统计信息", type: DataSourceStatsDto })
  @ValidateNested()
  @Type(() => DataSourceStatsDto)
  dataSources: DataSourceStatsDto;

  @ApiProperty({
    description: "执行过程中的错误信息",
    type: [Object],
    required: false,
  })
  @IsOptional()
  @IsArray()
  errors?: QueryErrorInfoDto[];

  @ApiProperty({
    description: "分页信息",
    required: false,
  })
  @IsOptional()
  @IsObject()
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 查询错误信息DTO
 */
export class QueryErrorInfoDto {
  @ApiProperty({ description: "股票代码" })
  @IsString()
  symbol: string;

  @ApiProperty({ description: "错误原因" })
  @IsString()
  reason: string;

  @ApiProperty({ description: "错误代码", required: false })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiProperty({ description: "错误详情", required: false })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

/**
 * 单个股票数据查询结果DTO
 */
export class SymbolDataResultDto<T = any> {
  @ApiProperty({ description: "股票数据" })
  data: T;

  @ApiProperty({ description: "数据来源", enum: DataSourceType })
  source: DataSourceType;

  @ApiProperty({ description: "数据时间戳", required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ description: "缓存TTL剩余时间（秒）", required: false })
  @IsOptional()
  @IsNumber()
  ttlRemaining?: number;
}

/**
 * 缓存元数据DTO
 */
class CacheResultMetadataDto {
  @ApiProperty({ description: "数据来源", enum: DataSourceType })
  source: DataSourceType;

  @ApiProperty({ description: "数据时间戳" })
  timestamp: Date;

  @ApiProperty({ description: "存储键" })
  storageKey: string;
}

/**
 * 缓存查询结果DTO
 */
export class CacheQueryResultDto<T = any> {
  @ApiProperty({ description: "缓存的数据" })
  data: T;

  @ApiProperty({ description: "缓存元数据", type: CacheResultMetadataDto })
  @ValidateNested()
  @Type(() => CacheResultMetadataDto)
  metadata: CacheResultMetadataDto;
}

/**
 * 实时数据元数据DTO
 */
class RealtimeQueryResultMetadataDto extends CacheResultMetadataDto {
  @ApiProperty({ description: "数据提供商" })
  provider: string;

  @ApiProperty({ description: "市场" })
  market: string;

  @ApiProperty({ description: "建议的缓存TTL（秒）", required: false })
  @IsOptional()
  cacheTTL?: number;

  @ApiProperty({ description: "数据类型", required: false })
  @IsOptional()
  queryTypeFilter?: string;
}

/**
 * 实时数据查询结果DTO
 */
export class RealtimeQueryResultDto<T = any> {
  @ApiProperty({ description: "实时数据" })
  data: T;

  @ApiProperty({
    description: "查询元数据",
    type: RealtimeQueryResultMetadataDto,
  })
  @ValidateNested()
  @Type(() => RealtimeQueryResultMetadataDto)
  metadata: RealtimeQueryResultMetadataDto;
}

/**
 * 字段选择操作DTO
 */
export class FieldSelectionDto {
  @ApiProperty({ description: "包含的字段列表", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];

  @ApiProperty({ description: "排除的字段列表", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeFields?: string[];
}

/**
 * 排序配置DTO
 */
export class SortConfigDto {
  @ApiProperty({ description: "排序字段" })
  @IsString()
  field: string;

  @ApiProperty({ description: "排序方向", enum: ["ASC", "DESC"] })
  @IsIn(['ASC', 'DESC'])
  @IsString()
  direction: "ASC" | "DESC";
}

/**
 * 查询后处理配置DTO
 */
export class PostProcessingConfigDto {
  @ApiProperty({ description: "字段选择配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldSelectionDto)
  fieldSelection?: FieldSelectionDto;

  @ApiProperty({ description: "排序配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortConfigDto)
  sort?: SortConfigDto;

  @ApiProperty({ description: "分页限制" })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: "分页偏移" })
  @IsNumber()
  offset: number;
}

/**
 * 查询性能指标DTO
 */
export class QueryPerformanceMetricsDto {
  @ApiProperty({ description: "缓存查询时间（毫秒）" })
  @IsNumber()
  cacheQueryTime: number;

  @ApiProperty({ description: "持久存储查询时间（毫秒）" })
  @IsNumber()
  persistentQueryTime: number;

  @ApiProperty({ description: "实时查询时间（毫秒）" })
  @IsNumber()
  realtimeQueryTime: number;

  @ApiProperty({ description: "数据处理时间（毫秒）" })
  @IsNumber()
  dataProcessingTime: number;

  @ApiProperty({ description: "总执行时间（毫秒）" })
  @IsNumber()
  totalExecutionTime: number;

  @ApiProperty({ description: "是否为慢查询" })
  @IsBoolean()
  isSlowQuery: boolean;
}

/**
 * 存储键构建参数DTO
 */
export class StorageKeyParamsDto {
  @ApiProperty({ description: "股票代码" })
  @IsString()
  symbol: string;

  @ApiProperty({ description: "数据提供商", required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ description: "数据类型过滤器", required: false })
  @IsOptional()
  @IsString()
  queryTypeFilter?: string;

  @ApiProperty({ description: "市场代码", required: false })
  @IsOptional()
  @IsString()
  market?: string;
}

/**
 * 批量查询执行配置DTO
 */
export class BulkQueryExecutionConfigDto {
  @ApiProperty({ description: "是否并行执行" })
  @IsBoolean()
  parallel: boolean;

  @ApiProperty({ description: "出错时是否继续执行" })
  @IsBoolean()
  continueOnError: boolean;

  @ApiProperty({ description: "最大并发数", required: false })
  @IsOptional()
  @IsNumber()
  maxConcurrency?: number;

  @ApiProperty({ description: "超时时间（毫秒）", required: false })
  @IsOptional()
  @IsNumber()
  timeout?: number;
}

/**
 * 查询日志上下文DTO
 */
export class QueryLogContextDto {
  @ApiProperty({ description: "查询ID" })
  @IsString()
  queryId: string;

  @ApiProperty({ description: "查询类型" })
  @IsString()
  queryType: string;

  @ApiProperty({ description: "操作名称" })
  @IsString()
  operation: string;

  @ApiProperty({ description: "执行时间（毫秒）", required: false })
  @IsOptional()
  @IsNumber()
  executionTime?: number;

  @ApiProperty({ description: "股票代码列表", required: false })
  @IsOptional()
  @IsArray()
  symbols?: string[];

  @ApiProperty({ description: "错误信息", required: false })
  @IsOptional()
  @IsString()
  error?: string;
}
