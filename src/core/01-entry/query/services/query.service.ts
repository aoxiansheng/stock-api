import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@app/config/logger.config";
import { StringUtils } from "../../../shared/utils/string.util";

import { QueryConfigService } from '../config/query.config';
import { QueryExecutorFactory } from '../factories/query-executor.factory';
import { QueryExecutionEngine } from './query-execution-engine.service';

import {
  QUERY_ERROR_MESSAGES,
  QUERY_SUCCESS_MESSAGES,
  QUERY_OPERATIONS,
} from "../constants/query.constants";
import {
  QueryExecutionResultDto,
} from "../dto/query-internal.dto";
import { QueryRequestDto, BulkQueryRequestDto } from "../dto/query-request.dto";
import {
  QueryResponseDto,
  BulkQueryResponseDto,
} from "../dto/query-response.dto";
import { QueryResultProcessorService } from "./query-result-processor.service";
import { QueryStatisticsService } from "./query-statistics.service";
import { CollectorService } from '../../../../monitoring/collector/collector.service';

/**
 * Query服务 - 查询编排器
 * 
 * 重构后职责：
 * - 查询请求的编排和路由
 * - 使用工厂模式分发查询到合适的执行器
 * - 管理查询统计和监控
 * - 处理批量查询请求
 * 
 * 不再负责：
 * - 具体的查询执行逻辑（已移至QueryExecutionEngine）
 * - 批量处理管道实现（已移至QueryExecutionEngine）
 * - 缓存交互细节（已移至QueryExecutionEngine）
 */
@Injectable()
export class QueryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(QueryService.name);

  constructor(
    private readonly statisticsService: QueryStatisticsService,
    private readonly resultProcessorService: QueryResultProcessorService,
    private readonly collectorService: CollectorService,
    private readonly queryConfig: QueryConfigService,
    private readonly queryExecutorFactory: QueryExecutorFactory,
    private readonly executionEngine: QueryExecutionEngine, // 用于向后兼容
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED,
      sanitizeLogData({
        operation: QUERY_OPERATIONS.ON_MODULE_INIT,
        config: this.queryConfig.getConfigSummary(),
      }),
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('QueryService模块正在关闭');
  }

  /**
   * 执行单个查询请求
   * 
   * 职责：
   * 1. 记录查询开始监控
   * 2. 使用工厂创建合适的执行器
   * 3. 执行查询并处理结果
   * 4. 记录查询完成监控
   */
  async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(request);

    // 查询开始监控
    this.recordQueryStartMetrics(request, queryId);

    this.logger.log(
      QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED,
      sanitizeLogData({
        queryId,
        queryType: request.queryType,
        symbolsCount: request.symbols?.length || 0,
      }),
    );

    try {
      // 使用工厂模式执行查询
      const executionResult = await this.performQueryExecution(request);

      // 处理查询结果
      const processedResult = this.resultProcessorService.process(
        executionResult,
        request,
        queryId,
        Date.now() - startTime,
      );

      // 记录查询成功监控指标
      this.recordQueryCompleteMetrics(request, queryId, Date.now() - startTime, true, executionResult.cacheUsed);

      return new QueryResponseDto(processedResult.data, processedResult.metadata);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.statisticsService.recordQueryPerformance(
        request.queryType,
        executionTime,
        false,
        false,
      );

      // 记录查询失败监控指标
      this.recordQueryCompleteMetrics(request, queryId, executionTime, false, false);

      this.logger.error(
        QUERY_ERROR_MESSAGES.QUERY_EXECUTION_FAILED,
        sanitizeLogData({
          queryId,
          error: error.message,
          executionTime,
        }),
      );

      throw error;
    }
  }

  /**
   * 执行批量查询请求
   */
  async executeBulkQuery(
    request: BulkQueryRequestDto,
  ): Promise<BulkQueryResponseDto> {
    const startTime = Date.now();

    this.logger.log(
      QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_STARTED,
      sanitizeLogData({
        queriesCount: request.queries.length,
        parallel: request.parallel,
      }),
    );

    try {
      const results = request.parallel
        ? await this.executeBulkQueriesInParallel(request)
        : await this.executeBulkQueriesSequentially(request);

      const bulkResponse = new BulkQueryResponseDto(
        results,
        request.queries.length,
      );
      
      this.logger.log(
        QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_COMPLETED,
        sanitizeLogData({
          totalQueries: bulkResponse.summary.totalQueries,
          successful: results.length,
          failed: bulkResponse.summary.totalQueries - results.length,
          totalTime: Date.now() - startTime,
        }),
      );
      
      return bulkResponse;
    } catch (error) {
      this.logger.error(
        QUERY_ERROR_MESSAGES.BULK_QUERY_EXECUTION_FAILED,
        sanitizeLogData({
          error: error.message,
          totalTime: Date.now() - startTime,
        }),
      );
      throw error;
    }
  }

  /**
   * 使用工厂模式执行查询
   * 
   * 核心改进：
   * - 不再直接处理查询逻辑
   * - 使用工厂创建合适的执行器
   * - 执行器不再依赖QueryService，避免循环依赖
   */
  private async performQueryExecution(
    request: QueryRequestDto,
  ): Promise<QueryExecutionResultDto> {
    try {
      const executor = this.queryExecutorFactory.create(request.queryType);
      return await executor.execute(request);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `查询执行器创建失败: ${error.message}`,
      );
    }
  }

  /**
   * executeSymbolBasedQuery - 向后兼容方法
   * 
   * 保留此方法以确保向后兼容性
   * 实际执行已委托给QueryExecutionEngine
   */
  public async executeSymbolBasedQuery(
    request: QueryRequestDto,
  ): Promise<QueryExecutionResultDto> {
    // 直接委托给执行引擎
    return await this.executionEngine.executeSymbolBasedQuery(request);
  }

  /**
   * 并行执行批量查询
   */
  private async executeBulkQueriesInParallel(
    request: BulkQueryRequestDto,
  ): Promise<QueryResponseDto[]> {
    const promises = request.queries.map(async (query) => {
      try {
        return await this.executeQuery(query);
      } catch (error) {
        if (!request.continueOnError) {
          throw error;
        }
        const queryId = this.generateQueryId(query);
        const executionResult = {
          results: [],
          cacheUsed: false,
          dataSources: {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 },
          },
          errors: [
            {
              symbol: query.symbols?.join(",") || "unknown",
              reason: error.message,
            },
          ],
        };
        const errorResult = this.resultProcessorService.process(
          executionResult,
          query,
          queryId,
          0,
        );
        
        return new QueryResponseDto(errorResult.data, errorResult.metadata);
      }
    });

    const allResults = await Promise.all(promises);
    return allResults.filter(
      (result): result is QueryResponseDto => result !== null,
    );
  }

  /**
   * 顺序执行批量查询
   */
  private async executeBulkQueriesSequentially(
    request: BulkQueryRequestDto,
  ): Promise<QueryResponseDto[]> {
    const results: QueryResponseDto[] = [];

    for (const query of request.queries) {
      try {
        const result = await this.executeQuery(query);
        const hasErrors =
          result.metadata.errors && result.metadata.errors.length > 0;

        if (hasErrors) {
          if (!request.continueOnError) {
            const firstError = result.metadata.errors[0];
            throw new Error(
              `Query for symbol ${firstError.symbol} failed: ${firstError.reason}`,
            );
          }
          this.logger.warn(`Bulk query item failed, continuing`, {
            queryType: query.queryType,
            errors: result.metadata.errors,
          });
          results.push(result);
        } else {
          results.push(result);
        }
      } catch (error) {
        if (!request.continueOnError) {
          throw error;
        }
        // 为失败的查询构建错误响应
        const queryId = this.generateQueryId(query);
        const executionResult = {
          results: [],
          cacheUsed: false,
          dataSources: {
            cache: { hits: 0, misses: 1 },
            realtime: { hits: 0, misses: 1 },
          },
          errors: [
            {
              symbol: query.symbols?.join(",") || "unknown",
              reason: error.message,
            },
          ],
        };
        const errorResult = this.resultProcessorService.process(
          executionResult,
          query,
          queryId,
          0,
        );
        
        results.push(new QueryResponseDto(errorResult.data, errorResult.metadata));
      }
    }

    return results;
  }

  /**
   * 生成查询ID
   */
  private generateQueryId(request: QueryRequestDto): string {
    const requestString = JSON.stringify({
      ...request,
      symbols: request.symbols?.slice().sort(),
    });
    return StringUtils.generateSimpleHash(requestString);
  }

  /**
   * 获取查询统计信息
   */
  public getQueryStats() {
    return this.statisticsService.getQueryStats();
  }

  // =============== 监控辅助方法 ===============
  
  /**
   * 记录查询开始指标
   */
  private recordQueryStartMetrics(request: QueryRequestDto, queryId: string): void {
    try {
      this.collectorService.recordRequest(
        '/internal/query-start',
        'POST',
        200,
        0,
        {
          queryId,
          queryType: request.queryType,
          symbolsCount: request.symbols?.length || 0,
          market: request.market,
          operation: 'query_start',
          componentType: 'query'
        }
      );
    } catch (error) {
      this.logger.warn(`查询开始监控记录失败: ${error.message}`, { queryId });
    }
  }

  /**
   * 记录查询完成指标
   */
  private recordQueryCompleteMetrics(
    request: QueryRequestDto, 
    queryId: string, 
    duration: number, 
    success: boolean,
    cacheUsed: boolean
  ): void {
    try {
      this.collectorService.recordRequest(
        '/api/v1/query/data',
        'POST',
        success ? 200 : 500,
        duration,
        {
          queryId,
          queryType: request.queryType,
          symbolsCount: request.symbols?.length || 0,
          market: request.market,
          cacheUsed,
          success,
          avgTimePerSymbol: (request.symbols?.length || 0) > 0 ? duration / (request.symbols?.length || 1) : 0,
          operation: success ? 'query_complete' : 'query_failed',
          componentType: 'query'
        }
      );
    } catch (error) {
      this.logger.warn(`查询完成监控记录失败: ${error.message}`, { queryId });
    }
  }
}