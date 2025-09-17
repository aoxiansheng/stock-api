import { applyDecorators } from "@nestjs/common";
import { ApiResponse, ApiResponseOptions } from "@nestjs/swagger";
import { 
  ApiSuccessResponse, 
  ApiStandardResponses,
  ApiHealthResponse 
} from "@common/core/decorators/swagger-responses.decorator";

// Cache 响应类型
import {
  CacheHealthResponse,
  CacheMetricsResponse,
  CacheOperationResponse,
  CacheStatsResponse,
  CacheAnalysisResponse,
  BatchCacheResponse,
  CacheConfigResponse,
} from "../dto/responses/cache-api-responses.dto";

/**
 * Cache健康检查响应装饰器
 * 🎯 Phase 3: 响应格式统一 - Cache模块专用Swagger装饰器
 */
export const ApiCacheHealthResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: "缓存健康检查成功",
      type: CacheHealthResponse,
      ...options,
    }),
    ApiResponse({
      status: 503,
      description: "缓存服务不可用",
      schema: {
        example: {
          statusCode: 503,
          message: "缓存服务连接失败",
          data: null,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    }),
    ApiStandardResponses(),
  );

/**
 * Cache指标响应装饰器
 */
export const ApiCacheMetricsResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: "缓存指标获取成功",
      type: CacheMetricsResponse,
      ...options,
    }),
    ApiStandardResponses(),
  );

/**
 * Cache操作结果响应装饰器
 */
export const ApiCacheOperationResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiSuccessResponse({
      description: "缓存操作成功",
      type: CacheOperationResponse,
      ...options,
    }),
    ApiResponse({
      status: 409,
      description: "缓存操作冲突",
      schema: {
        example: {
          statusCode: 409,
          message: "缓存键已存在或操作冲突",
          data: null,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    }),
    ApiStandardResponses(),
  );

/**
 * Cache统计信息响应装饰器
 */
export const ApiCacheStatsResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: "缓存统计信息获取成功",
      type: CacheStatsResponse,
      ...options,
    }),
    ApiStandardResponses(),
  );

/**
 * Cache分析结果响应装饰器
 */
export const ApiCacheAnalysisResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: "缓存分析完成",
      type: CacheAnalysisResponse,
      ...options,
    }),
    ApiStandardResponses(),
  );

/**
 * 批量Cache操作响应装饰器
 */
export const ApiBatchCacheResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: "批量缓存操作成功",
      type: BatchCacheResponse,
      ...options,
    }),
    ApiResponse({
      status: 207,
      description: "批量操作部分成功",
      schema: {
        example: {
          statusCode: 207,
          message: "批量操作部分成功",
          data: {
            success: false,
            processed: 8,
            failed: 2,
            results: {
              "key1": { success: true, data: "value1", source: "cache" },
              "key2": { success: false, error: "Key not found" },
            },
          },
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    }),
    ApiStandardResponses(),
  );

/**
 * Cache配置响应装饰器
 */
export const ApiCacheConfigResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: 200,
      description: "缓存配置获取成功",
      type: CacheConfigResponse,
      ...options,
    }),
    ApiStandardResponses(),
  );

/**
 * 通用Cache错误响应装饰器
 * 用于Cache模块特有的错误场景
 */
export const ApiCacheErrorResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 422,
      description: "缓存键格式无效",
      schema: {
        example: {
          statusCode: 422,
          message: "缓存键不能包含特殊字符",
          data: null,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    }),
    ApiResponse({
      status: 413,
      description: "缓存数据过大",
      schema: {
        example: {
          statusCode: 413,
          message: "缓存数据大小超过限制（最大10MB）",
          data: null,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    }),
    ApiResponse({
      status: 503,
      description: "Redis服务不可用",
      schema: {
        example: {
          statusCode: 503,
          message: "Redis连接失败，缓存服务暂时不可用",
          data: null,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    }),
  );

/**
 * 完整的Cache API响应装饰器组合
 * 包含所有Cache相关的标准响应
 */
export const ApiCompleteCacheResponses = () =>
  applyDecorators(
    ApiStandardResponses(),
    ApiCacheErrorResponses(),
  );