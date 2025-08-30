import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
} from 'class-validator';

import { QueryType } from './query-types.dto';

/**
 * 排序方向
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 排序选项
 */
class SortOptionsDto {
  @ApiProperty({ description: '排序字段' })
  @IsString()
  field: string;

  @ApiProperty({ description: '排序方向', enum: SortDirection })
  @IsEnum(SortDirection)
  direction: SortDirection;
}

/**
 * 查询选项
 */
export class QueryOptionsDto {
  @ApiPropertyOptional({
    description: '是否使用缓存',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean;


  @ApiPropertyOptional({
    description: '是否包含元数据',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: '要包含在响应中的字段' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];

  @ApiPropertyOptional({ description: '要从响应中排除的字段' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeFields?: string[];
}

/**
 * 单个查询请求的数据传输对象
 */
export class QueryRequestDto {
  @ApiProperty({
    description: '查询类型',
    enum: QueryType,
    example: QueryType.BY_SYMBOLS,
  })
  @IsEnum(QueryType)
  @IsNotEmpty()
  queryType: QueryType;

  @ApiPropertyOptional({
    description: '股票代码列表，当queryType为by_symbols时必需',
    example: ['AAPL', 'GOOGL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  symbols?: string[];

  @ApiPropertyOptional({
    description: '市场，当queryType为by_market时必需',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({
    description: '数据提供商',
    example: 'longport',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: '标签，当queryType为by_tag时必需',
    example: 'AI',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: '开始时间，当queryType为by_time_range时必需',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间，当queryType为by_time_range时必需',
    example: '2023-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: '高级查询参数，当queryType为advanced时必需',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  advancedQuery?: Record<string, any>;

  @ApiPropertyOptional({
    description: '缓存最大年龄（秒）',
    example: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAge?: number;

  @ApiPropertyOptional({
    description: '返回结果数量限制',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({
    description: '页码，用于分页',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '数据类型过滤器（用于过滤特定类型的数据）',
    example: 'get-stock-quote',
  })
  @IsOptional()
  @IsString()
  queryTypeFilter?: string;

  @ApiPropertyOptional({
    description: '查询选项',
    type: QueryOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QueryOptionsDto)
  options?: QueryOptionsDto;

  @ApiPropertyOptional({ description: '排序选项' })
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
    description: '查询请求列表',
    type: [QueryRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100) // 添加此行
  @ValidateNested({ each: true })
  @Type(() => QueryRequestDto)
  queries: QueryRequestDto[];

  @ApiPropertyOptional({
    description: '是否并行执行',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean = true;

  @ApiPropertyOptional({
    description: '出错时是否继续执行',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;
}
