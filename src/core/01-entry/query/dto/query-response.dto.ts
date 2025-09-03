import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { QueryErrorInfoDto } from "./query-internal.dto";
import { QueryType } from "./query-types.dto";

export class QueryMetadataDto {
  @ApiProperty({ description: "Query type executed", enum: QueryType })
  queryType: QueryType;

  @ApiProperty({ description: "Total number of results found" })
  totalResults: number;

  @ApiProperty({ description: "Number of results returned" })
  returnedResults: number;

  @ApiProperty({ description: "Query execution time in milliseconds" })
  executionTime: number;

  @ApiProperty({ description: "Whether cache was used" })
  cacheUsed: boolean;

  @ApiProperty({ description: "Data sources used for results" })
  dataSources: {
    cache: { hits: number; misses: number };
    realtime: { hits: number; misses: number };
  };

  @ApiProperty({ description: "Query timestamp" })
  timestamp: string;

  @ApiPropertyOptional({ description: "Query parameters summary" })
  queryParams?: {
    symbols?: string[];
    market?: string;
    provider?: string;
    queryTypeFilter?: string;
    timeRange?: { start: string; end: string };
    queryFiltersCount?: number;
  };

  @ApiPropertyOptional({ description: "Performance breakdown" })
  performance?: {
    cacheQueryTime: number;
    persistentQueryTime: number;
    realtimeQueryTime: number;
    dataProcessingTime: number;
  };

  @ApiPropertyOptional({
    description: "Errors that occurred during the query for specific symbols",
    type: [QueryErrorInfoDto],
  })
  errors?: QueryErrorInfoDto[];

  @ApiPropertyOptional({ description: "Pagination metadata" })
  pagination?: any;

  constructor(
    queryType: QueryType,
    totalResults: number,
    returnedResults: number,
    executionTime: number,
    cacheUsed: boolean,
    dataSources: {
      cache: { hits: number; misses: number };
      realtime: { hits: number; misses: number };
    },
    errors?: QueryErrorInfoDto[],
  ) {
    this.queryType = queryType;
    this.totalResults = totalResults;
    this.returnedResults = returnedResults;
    this.executionTime = executionTime;
    this.cacheUsed = cacheUsed;
    this.dataSources = dataSources;
    this.timestamp = new Date().toISOString();
    this.errors = errors;
  }
}

/**
 * 查询业务响应DTO
 * 注意：已移除success、errors、warnings等HTTP响应字段，这些由ResponseInterceptor统一处理
 * 错误和警告信息应该通过抛出异常或记录日志来处理
 */
export class QueryResponseDto<T = unknown> {
  @ApiProperty({ description: "查询结果数据" })
  data: PaginatedDataDto<T>;

  @ApiProperty({ description: "查询元信息", type: () => QueryMetadataDto })
  metadata: QueryMetadataDto;

  constructor(data: PaginatedDataDto<T>, metadata: QueryMetadataDto) {
    this.data = data;
    this.metadata = metadata;
  }
}

/**
 * 批量查询业务响应DTO
 * 注意：已移除success、errors等HTTP响应字段，这些由ResponseInterceptor统一处理
 */
export class BulkQueryResponseDto {
  @ApiProperty({
    description: "单个查询结果",
    type: () => [QueryResponseDto],
  })
  results: QueryResponseDto[];

  @ApiProperty({ description: "批量操作统计信息" })
  summary: {
    totalQueries: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
  };

  @ApiProperty({ description: "批量操作时间戳" })
  timestamp: string;

  constructor(results: QueryResponseDto[], totalQueriesAttempted: number) {
    this.results = results;
    this.timestamp = new Date().toISOString();

    const totalTime = results.reduce(
      (sum, r) => sum + r.metadata.executionTime,
      0,
    );

    this.summary = {
      totalQueries: totalQueriesAttempted,
      totalExecutionTime: totalTime,
      averageExecutionTime: results.length > 0 ? totalTime / results.length : 0,
    };
  }
}

export class QueryStatsDto {
  @ApiProperty({ description: "Query performance statistics" })
  performance: {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    errorRate: number;
    queriesPerSecond: number;
  };

  @ApiProperty({ description: "Query type distribution" })
  queryTypes: Record<
    string,
    {
      count: number;
      averageTime: number;
      successRate: number;
    }
  >;

  @ApiProperty({ description: "Data source usage statistics" })
  dataSources: {
    cache: { queries: number; avgTime: number; successRate: number };
    persistent: { queries: number; avgTime: number; successRate: number };
    realtime: { queries: number; avgTime: number; successRate: number };
  };

  @ApiProperty({ description: "Popular query patterns" })
  popularQueries: Array<{
    pattern: string;
    count: number;
    averageTime: number;
    lastExecuted: string;
  }>;

  @ApiProperty({ description: "Statistics generation timestamp" })
  timestamp: string;

  constructor() {
    this.timestamp = new Date().toISOString();
  }
}
