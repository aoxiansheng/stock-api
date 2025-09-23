import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { CAPABILITY_NAMES } from "../../../../providers/constants/capability-names.constants";

import { REFERENCE_DATA } from "@common/constants/domain";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
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
   * 时间范围查询起始时间
   *
   * @description 用于时间范围查询的起始时间点。当queryType为QueryType.BY_TIME_RANGE时为必需字段。
   *              支持ISO 8601格式的时间字符串，用于查询指定时间段内的历史数据。
   * @format ISO 8601 时间格式 (YYYY-MM-DDTHH:mm:ssZ)
   * @example "2023-01-01T00:00:00Z" - 2023年1月1日零点开始
   * @example "2023-06-15T09:30:00Z" - 2023年6月15日9:30开始
   * @validation 必须早于endTime，且不能是未来时间
   * @since v1.0.0
   * @todo 考虑支持相对时间格式（如"1d", "1w", "1m"）
   * @see {@link QueryType.BY_TIME_RANGE} 相关查询类型
   * @see {@link QueryRequestDto.endTime} 结束时间字段
   */
  @ApiPropertyOptional({
    description: "开始时间，当queryType为by_time_range时必需",
    example: "2023-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  /**
   * 时间范围查询结束时间
   *
   * @description 用于时间范围查询的结束时间点。当queryType为QueryType.BY_TIME_RANGE时为必需字段。
   *              支持ISO 8601格式的时间字符串，与startTime组成完整的时间范围。
   * @format ISO 8601 时间格式 (YYYY-MM-DDTHH:mm:ssZ)
   * @example "2023-01-31T23:59:59Z" - 2023年1月31日23:59:59结束
   * @example "2023-12-31T23:59:59Z" - 2023年12月31日年末结束
   * @validation 必须晚于startTime，时间范围不能超过系统限制（如最多1年）
   * @since v1.0.0
   * @performance 较大旴间范围查询可能影响性能，建议分批处理
   * @see {@link QueryType.BY_TIME_RANGE} 相关查询类型
   * @see {@link QueryRequestDto.startTime} 开始时间字段
   */
  @ApiPropertyOptional({
    description: "结束时间，当queryType为by_time_range时必需",
    example: "2023-01-31T23:59:59Z",
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
