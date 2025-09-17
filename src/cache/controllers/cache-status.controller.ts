import { Controller, Get, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "@auth/decorators/public.decorator";

import { CacheService } from "../services/cache.service";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { 
  ApiSuccessResponse,
  ApiStandardResponses,
  ApiHealthResponse 
} from "@common/core/decorators/swagger-responses.decorator";
import { 
  CacheHealthResponse,
  CacheStatsResponse,
  CacheConfigResponse 
} from "../dto/responses/cache-api-responses.dto";
import { CACHE_STATUS } from "../constants/status/cache-status.constants";
import { 
  CacheKeyPatternAnalysisQueryDto,
  CacheKeyPatternAnalysisDto,
  CachePerformanceMonitoringQueryDto,
  CachePerformanceMonitoringDto 
} from "../dto/cache-internal.dto";

/**
 * Cache状态控制器
 * 🎯 Phase 1.5: Swagger装饰器重构完成 - 移除重复的@ApiStandardResponses
 * ✅ Cache特有装饰器内部已包含@ApiStandardResponses，不需重复使用
 * ✅ 用于验证ResponseInterceptor和Swagger装饰器的统一性
 * 🔄 遵循项目标准的响应格式规范
 * 🆕 新增分页查询端点验证PaginatedDataDto标准化
 */
@ApiTags("缓存状态")
@Controller("cache/status")
export class CacheStatusController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取缓存健康状态
   * 🎯 用于验证ResponseInterceptor统一响应格式
   */
  @Get("health")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "获取缓存健康状态",
    description: "检查Redis连接状态和基本健康指标"
  })
  @ApiHealthResponse()
  @ApiStandardResponses()
  async getHealth() {
    const startTime = Date.now();
    
    try {
      // 简单的健康检查 - ping Redis
      await this.cacheService.set("health-check", "ok", { ttl: 10 });
      const result = await this.cacheService.get("health-check");
      const latency = Date.now() - startTime;
      
      return {
        status: result === "ok" ? CACHE_STATUS.HEALTHY : CACHE_STATUS.DEGRADED,
        latency,
        errors: [],
        timestamp: Date.now(),
        memoryInfo: {
          used: 0, // 简化实现
          max: 1024 * 1024 * 1024, // 1GB
          usageRatio: 0.1,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: CACHE_STATUS.UNHEALTHY,
        latency,
        errors: [error.message],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取缓存统计信息
   * 🎯 用于验证Cache专用Swagger装饰器
   */
  @Get("stats")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "获取缓存统计信息",
    description: "获取缓存性能指标和使用统计"
  })
  @ApiSuccessResponse({
    description: "缓存统计信息获取成功",
    type: CacheStatsResponse,
  })
  @ApiStandardResponses()
  async getStats() {
    // 简化的统计信息实现
    return {
      hitRate: 0.85,
      totalRequests: 1000,
      totalHits: 850,
      totalMisses: 150,
      totalKeys: 500,
      memoryUsage: 1024 * 1024 * 50, // 50MB
      ttlDistribution: {
        "0-300": 100,
        "300-3600": 300,
        "3600+": 100,
      },
      topKeys: [
        { key: "user:123", accessCount: 50 },
        { key: "config:app", accessCount: 30 },
      ],
      performanceMetrics: {
        avgResponseTime: 2.5,
        p95ResponseTime: 5.0,
        p99ResponseTime: 10.0,
      },
    };
  }

  /**
   * 获取缓存配置信息
   * 🎯 验证配置响应装饰器
   */
  @Get("config")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "获取缓存配置信息",
    description: "获取当前缓存配置参数"
  })
  @ApiSuccessResponse({
    description: "缓存配置获取成功",
    type: CacheConfigResponse,
  })
  @ApiStandardResponses()
  async getConfig() {
    // 返回简化的配置信息
    return {
      defaultTtl: 3600,
      maxSize: 1024 * 1024 * 10, // 10MB
      enabled: true,
      serializer: "json",
      compressionThreshold: 1024,
    };
  }

  /**
   * 分页查询缓存键模式分析数据
   * 🎯 Phase 5: DTO标准化 - 验证分页查询和PaginatedDataDto响应
   */
  @Get("key-patterns")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "分页查询缓存键模式分析数据",
    description: "获取缓存键使用模式的统计分析信息，支持分页和筛选",
  })
  @ApiSuccessResponse({
    description: "分页查询缓存键模式分析数据成功",
    type: PaginatedDataDto<CacheKeyPatternAnalysisDto>,
  })
  async getKeyPatterns(
    @Query() query: CacheKeyPatternAnalysisQueryDto,
  ): Promise<PaginatedDataDto<CacheKeyPatternAnalysisDto>> {
    // 模拟查询参数处理
    const { page, limit } = this.paginationService.normalizePaginationQuery(query);
    
    // 模拟生成键模式分析数据
    const mockData: CacheKeyPatternAnalysisDto[] = [
      {
        pattern: "user:*",
        hits: 1250,
        misses: 150,
        hitRate: 0.89,
        totalRequests: 1400,
        lastAccessTime: Date.now() - 3600000,
      },
      {
        pattern: "config:*",
        hits: 850,
        misses: 50,
        hitRate: 0.94,
        totalRequests: 900,
        lastAccessTime: Date.now() - 1800000,
      },
      {
        pattern: "session:*",
        hits: 3200,
        misses: 800,
        hitRate: 0.80,
        totalRequests: 4000,
        lastAccessTime: Date.now() - 300000,
      },
    ];

    // 应用过滤条件
    let filteredData = mockData;
    if (query.pattern) {
      filteredData = mockData.filter(item => 
        item.pattern.includes(query.pattern)
      );
    }
    if (query.minHits) {
      filteredData = filteredData.filter(item => 
        item.hits >= query.minHits
      );
    }

    // 分页处理
    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filteredData.slice(startIndex, endIndex);

    // 返回标准分页响应
    return this.paginationService.createPaginatedResponse(
      paginatedItems,
      page,
      limit,
      total,
    );
  }

  /**
   * 分页查询缓存性能监控数据
   * 🎯 Phase 5: DTO标准化 - 验证复杂查询条件的分页响应
   */
  @Get("performance")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "分页查询缓存性能监控数据",
    description: "获取缓存操作的性能监控信息，支持时间范围筛选和分页",
  })
  @ApiSuccessResponse({
    description: "分页查询缓存性能监控数据成功",
    type: PaginatedDataDto<CachePerformanceMonitoringDto>,
  })
  async getPerformanceData(
    @Query() query: CachePerformanceMonitoringQueryDto,
  ): Promise<PaginatedDataDto<CachePerformanceMonitoringDto>> {
    // 模拟查询参数处理
    const { page, limit } = this.paginationService.normalizePaginationQuery(query);
    
    // 模拟生成性能监控数据
    const mockData: CachePerformanceMonitoringDto[] = [
      {
        operation: "get",
        processingTimeMs: 2.5,
        timestamp: Date.now() - 7200000,
        isSlowOperation: false,
        slowOperationThreshold: 100,
        additionalMetrics: { keySize: 15, valueSize: 2048 },
      },
      {
        operation: "set",
        processingTimeMs: 5.8,
        timestamp: Date.now() - 3600000,
        isSlowOperation: false,
        slowOperationThreshold: 100,
        additionalMetrics: { keySize: 20, valueSize: 4096 },
      },
      {
        operation: "del",
        processingTimeMs: 125.0,
        timestamp: Date.now() - 1800000,
        isSlowOperation: true,
        slowOperationThreshold: 100,
        additionalMetrics: { keySize: 18, deletedKeys: 50 },
      },
    ];

    // 应用过滤条件
    let filteredData = mockData;
    if (query.operation) {
      filteredData = mockData.filter(item => 
        item.operation === query.operation
      );
    }
    if (query.slowOperationsOnly) {
      filteredData = filteredData.filter(item => 
        item.isSlowOperation
      );
    }
    if (query.startTime) {
      const startTimestamp = new Date(query.startTime).getTime();
      filteredData = filteredData.filter(item => 
        item.timestamp >= startTimestamp
      );
    }
    if (query.endTime) {
      const endTimestamp = new Date(query.endTime).getTime();
      filteredData = filteredData.filter(item => 
        item.timestamp <= endTimestamp
      );
    }

    // 分页处理
    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filteredData.slice(startIndex, endIndex);

    // 返回标准分页响应
    return this.paginationService.createPaginatedResponse(
      paginatedItems,
      page,
      limit,
      total,
    );
  }
}