import { Injectable } from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

import {
  QUERY_PERFORMANCE_CONFIG,
  QUERY_OPERATIONS,
} from "../constants/query.constants";
import { QueryExecutionResultDto } from "../dto/query-internal.dto";
import { QueryRequestDto, SortDirection } from "../dto/query-request.dto";
import { QueryResponseDto, QueryMetadataDto } from "../dto/query-response.dto";

/**
 * 查询结果后处理器服务
 *
 * 负责对从数据源获取的原始查询结果进行最终处理，包括：
 * - 字段选择 (include/exclude)
 * - 排序
 * - 分页
 * - 构建最终的响应 DTO
 */
@Injectable()
export class QueryResultProcessorService {
  private readonly logger = createLogger(QueryResultProcessorService.name);

  /**
   * 处理查询结果，应用后处理并格式化为最终响应
   * @param executionResult 查询执行的原始结果
   * @param request 原始查询请求
   * @param queryId 查询ID
   * @param executionTime 查询执行总耗时
   * @returns 格式化后的查询响应 DTO
   */
  public process(
    executionResult: QueryExecutionResultDto,
    request: QueryRequestDto,
    queryId: string,
    executionTime: number,
  ): QueryResponseDto {
    // 应用后处理（排序、字段选择）
    const processedResults = this.applyPostProcessing(
      executionResult.results,
      request,
    );

    // 应用分页
    const totalResults = processedResults.length;
    const limit = request.limit || QUERY_PERFORMANCE_CONFIG.DEFAULT_QUERY_LIMIT;
    const offset = request.offset || 0;

    const paginatedResults = processedResults.slice(offset, offset + limit);
    const hasMore = offset + limit < totalResults;

    // 构建元数据
    const metadata = new QueryMetadataDto(
      request.queryType,
      totalResults,
      paginatedResults.length,
      executionTime,
      executionResult.cacheUsed,
      executionResult.dataSources,
    );

    // 构建分页信息
    const pagination = {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined,
    };

    // 处理错误和警告信息通过日志记录
    if (executionResult.errors && executionResult.errors.length > 0) {
      const errorDetails = executionResult.errors
        .map((e) => `${e.symbol}: ${e.reason}`)
        .join("; ");
      this.logger.warn(
        `部分股票数据获取失败`,
        sanitizeLogData({
          queryId,
          errors: errorDetails,
          operation: QUERY_OPERATIONS.PROCESS_QUERY_RESULTS,
        }),
      );
    }

    this.logger.debug(
      `查询结果处理完成`,
      sanitizeLogData({
        queryId,
        totalResults,
        paginatedCount: paginatedResults.length,
        hasErrors: executionResult.errors && executionResult.errors.length > 0,
        operation: QUERY_OPERATIONS.PROCESS_QUERY_RESULTS,
      }),
    );

    return new QueryResponseDto(paginatedResults, metadata, pagination);
  }

  /**
   * 对查询结果应用后处理（字段选择和排序）
   */
  public applyPostProcessing<T = any>(
    results: T[],
    request: QueryRequestDto,
  ): T[] {
    let processedResults = [...results];

    if (request.includeFields || request.excludeFields) {
      processedResults = processedResults.map(
        (item) =>
          this.applyFieldSelection(
            item,
            request.includeFields,
            request.excludeFields,
          ) as T,
      );
    }

    if (request.sort) {
      processedResults = this.applySorting(processedResults, request.sort);
    }

    return processedResults;
  }

  /**
   * 对单个数据项应用字段选择
   */
  public applyFieldSelection<T = any>(
    item: T,
    includeFields?: string[],
    excludeFields?: string[],
  ): Partial<T> {
    if (!includeFields && !excludeFields) return item;

    const result: Partial<T> = {};

    if (includeFields) {
      for (const field of includeFields) {
        if (Object.prototype.hasOwnProperty.call(item, field)) {
          (result as any)[field] = (item as any)[field];
        }
      }
    } else {
      for (const [key, value] of Object.entries(item)) {
        if (!excludeFields || !excludeFields.includes(key)) {
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * 对结果应用排序
   */
  public applySorting<T = any>(
    results: T[],
    sort: { field: string; direction: SortDirection },
  ): T[] {
    const sortedResults = [...results]; // 创建一个副本以避免修改原始数组
    return sortedResults.sort((a, b) => {
      const aValue = (a as any)[sort.field];
      const bValue = (b as any)[sort.field];

      const aIsNil = aValue === undefined || aValue === null;
      const bIsNil = bValue === undefined || bValue === null;

      if (aIsNil && bIsNil) return 0;
      if (aIsNil) return 1;
      if (bIsNil) return -1;

      if (aValue < bValue) return sort.direction === SortDirection.ASC ? -1 : 1;
      if (aValue > bValue) return sort.direction === SortDirection.ASC ? 1 : -1;

      return 0;
    });
  }
}
