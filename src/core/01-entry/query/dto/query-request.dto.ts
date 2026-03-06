import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { CAPABILITY_NAMES } from "../../../../providersv2/providers/constants/capability-names.constants";
import { SUPPORTED_CAPABILITY_TYPES } from "../../receiver/constants/operations.constants";

import { REFERENCE_DATA } from "@common/constants/domain";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsIn,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
  IsObject,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";

import { QueryType } from "./query-types.dto";
import { QUERY_LIMITS } from "../constants/query.constants";
import { BaseQueryDto } from "@common/dto/base-query.dto";

export const QUERY_TYPE_FILTER_WHITELIST = Object.freeze(
  [...SUPPORTED_CAPABILITY_TYPES] as string[],
);

/**
 * 排序方向
 */
export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

/**
 * 排序选项
 */
class SortOptionsDto {
  @ApiProperty({ description: "排序字段" })
  @IsString()
  field: string;

  @ApiProperty({ description: "排序方向", enum: SortDirection })
  @IsEnum(SortDirection)
  direction: SortDirection;
}

/**
 * 查询选项
 */
export class QueryOptionsDto {
  @ApiPropertyOptional({
    description: "是否使用缓存",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean;

  @ApiPropertyOptional({
    description: "是否包含元数据",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: "要包含在响应中的字段" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];

  @ApiPropertyOptional({ description: "要从响应中排除的字段" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeFields?: string[];
}

/**
 * 单个查询请求的数据传输对象
 */
export class QueryRequestDto extends BaseQueryDto {
  @ApiProperty({
    description: "查询类型",
    enum: QueryType,
    example: QueryType.BY_SYMBOLS,
  })
  @IsEnum(QueryType)
  @IsNotEmpty()
  queryType: QueryType;

  @ApiPropertyOptional({
    description: "股票代码列表，当queryType为by_symbols时必需",
    example: ["AAPL", "GOOGL"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  symbols?: string[];

  @ApiPropertyOptional({
    description: "市场，当queryType为by_market时必需",
    example: "US",
  })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({
    description: "数据提供商",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  /**
   * 标签查询字段
   *
   * @description 用于基于标签的股票查询。当queryType为QueryType.BY_TAG时为必需字段。
   *              支持查询具有特定标签或分类的股票，如“AI”、“设备”、“电动汽车”等。
   * @example "AI" - 查询人工智能相关股票
   * @example "新能源" - 查询新能源行业股票
   * @example "ESG" - 查询ESG评级高的股票
   * @since v1.0.0
   * @todo 将来可能支持多标签查询（数组格式）
   * @see {@link QueryType.BY_TAG} 相关查询类型
   */
  @ApiPropertyOptional({
    description: "标签，当queryType为by_tag时必需",
    example: "AI",
  })
  @IsOptional()
  @IsString()
  tag?: string;

  /**
   * 交易日查询起始日期
   *
   * @description 仅在 queryTypeFilter=get-trading-days 时生效，支持 YYYYMMDD 或 YYYY-MM-DD。
   * @example "20260101" - 紧凑日期格式
   * @example "2026-01-01" - 连字符日期格式
   * @validation 必须早于或等于 endTime
   * @see {@link QueryRequestDto.endTime} 结束日期字段
   */
  @ApiPropertyOptional({
    description: `交易日查询起始日期（YYYYMMDD/YYYY-MM-DD，仅 queryTypeFilter=${CAPABILITY_NAMES.GET_TRADING_DAYS} 生效）`,
    example: "20260101",
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  /**
   * 交易日查询结束日期
   *
   * @description 仅在 queryTypeFilter=get-trading-days 时生效，支持 YYYYMMDD 或 YYYY-MM-DD。
   * @example "20260131" - 紧凑日期格式
   * @example "2026-01-31" - 连字符日期格式
   * @validation 必须晚于或等于 startTime
   * @see {@link QueryRequestDto.startTime} 起始日期字段
   */
  @ApiPropertyOptional({
    description: `交易日查询结束日期（YYYYMMDD/YYYY-MM-DD，仅 queryTypeFilter=${CAPABILITY_NAMES.GET_TRADING_DAYS} 生效）`,
    example: "20260131",
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  /**
   * 高级查询参数对象
   *
   * @description 用于复杂的高级查询功能。当queryType为QueryType.ADVANCED时为必需字段。
   *              支持灵活的查询条件组合，包括但不限于筛选条件、排序规则、聚合操作等。
   * @type {Record<string, any>} 键值对对象，支持任意类型的值
   * @example
   * {
   *   "filters": {
   *     "marketCap": { "min": 1000000000, "max": 10000000000 },
   *     "sector": ["Technology", "Healthcare"],
   *     "pe": { "max": 25 }
   *   },
   *   "aggregations": {
   *     "groupBy": "sector",
   *     "metrics": ["avgPrice", "totalVolume"]
   *   },
   *   "customSort": {
   *     "field": "marketCap",
   *     "direction": "desc"
   *   }
   * }
   * @validation 内容由具体的高级查询处理器验证
   * @since v1.0.0
   * @security 请注意输入验证和权限控制，防止SQL注入等安全风险
   * @performance 复杂查询可能影响性能，建议使用缓存和分页
   * @todo 将来可能支持GraphQL风格的查询语法
   * @see {@link QueryType.ADVANCED} 相关查询类型
   */
  @ApiPropertyOptional({
    description: "高级查询参数，当queryType为advanced时必需",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  advancedQuery?: Record<string, any>;

  @ApiPropertyOptional({
    description: "缓存最大年龄（秒）",
    example: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAge?: number;

  @ApiPropertyOptional({
    description: "数据类型过滤器（用于过滤特定类型的数据）",
    example: CAPABILITY_NAMES.GET_STOCK_QUOTE,
  })
  @IsOptional()
  @IsString()
  @IsIn(QUERY_TYPE_FILTER_WHITELIST)
  queryTypeFilter?: string;

  @ApiPropertyOptional({
    description: "查询选项",
    type: QueryOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QueryOptionsDto)
  options?: QueryOptionsDto;

  @ApiPropertyOptional({ description: "排序选项" })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortOptionsDto)
  querySort?: SortOptionsDto;
}

/**
 * GET /query/symbols 请求参数 DTO
 */
export class QuerySymbolsRequestDto {
  @ApiProperty({
    description: "股票代码列表，多个代码用逗号分隔",
    example: "AAPL,GOOGL,MSFT",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  symbols: string;

  @ApiPropertyOptional({
    description: "指定数据提供商（可选）",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: "指定市场（可选）",
    example: "US",
  })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({
    description: "数据类别（可选）",
    example: CAPABILITY_NAMES.GET_STOCK_QUOTE,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsIn(QUERY_TYPE_FILTER_WHITELIST)
  queryTypeFilter?: string;

  @ApiPropertyOptional({
    description: "返回结果数量限制",
    example: 10,
    minimum: 1,
    maximum: 1000,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({
    description: "页码，默认为1",
    example: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "是否使用缓存",
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "boolean" || value === undefined) {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    return value;
  })
  @IsBoolean()
  useCache?: boolean;
}

/**
 * 批量查询请求的数据传输对象
 */
export class BulkQueryRequestDto {
  @ApiProperty({
    description: "查询请求列表",
    type: [QueryRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(QUERY_LIMITS.BULK_QUERIES) // 使用常量限制批量查询数量
  @ValidateNested({ each: true })
  @Type(() => QueryRequestDto)
  queries: QueryRequestDto[];

  @ApiPropertyOptional({
    description: "是否并行执行",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean = true;

  @ApiPropertyOptional({
    description: "出错时是否继续执行",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;
}
