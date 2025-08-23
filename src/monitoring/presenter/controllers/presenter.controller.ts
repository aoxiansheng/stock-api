import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { NoPerformanceMonitoring } from "../../../monitoring/infrastructure/decorators/infrastructure-monitoring-config.decorator";
import {
  ApiStandardResponses,
  ApiSuccessResponse,
  JwtAuthResponses,
  ApiHealthResponse,
} from "@common/core/decorators/swagger-responses.decorator";

import { Auth, Public } from "../../../auth/decorators/auth.decorator";
import { UserRole } from "../../../auth/enums/user-role.enum";
import { GetDbPerformanceQueryDto } from "../dto/presenter-query.dto";
import { PresenterService } from "../services/presenter.service";

/**
 * 展示层控制器
 * 职责：纯HTTP路由层，只负责请求参数验证、权限控制和响应格式化
 * 所有业务逻辑委托给PresenterService处理
 * 
 * 设计原则：
 * - 最小职责：只处理HTTP相关逻辑
 * - 无业务逻辑：所有业务逻辑委托给PresenterService
 * - 薄控制器：Controller只做路由转发
 * - 响应格式化：依赖全局ResponseInterceptor
 */
@ApiTags("📈 系统状态监控")
@Controller("monitoring")
export class PresenterController {
  constructor(
    private readonly presenterService: PresenterService,
  ) {}

  /**
   * 获取性能分析数据
   */
  @Auth([UserRole.ADMIN])
  @Get("performance")
  @ApiOperation({
    summary: "获取性能分析数据",
    description: "获取系统整体性能分析，包括响应时间、错误率、吞吐量等指标",
  })
  @ApiSuccessResponse({
    description: "性能分析数据获取成功",
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        summary: { type: 'object', description: '性能摘要' },
        healthScore: { type: 'number', description: '健康分数' },
        trends: { type: 'object', description: '趋势分析' },
        endpointMetrics: { type: 'array', description: '端点指标' },
        databaseMetrics: { type: 'object', description: '数据库指标' },
        cacheMetrics: { type: 'object', description: '缓存指标' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getPerformanceAnalysis(
    @Query() query: GetDbPerformanceQueryDto,
  ) {
    return this.presenterService.getPerformanceAnalysis(query);
  }

  /**
   * 获取健康评分
   */
  @Auth([UserRole.ADMIN])
  @Get("health/score")
  @ApiOperation({
    summary: "获取系统健康评分",
    description: "获取系统健康评分数值",
  })
  @ApiSuccessResponse({
    description: "健康评分获取成功",
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getHealthScore() {
    return this.presenterService.getHealthScore();
  }

  /**
   * 获取详细健康报告
   */
  @Auth([UserRole.ADMIN])
  @Get("health/report")
  @ApiOperation({
    summary: "获取详细健康报告",
    description: "获取系统详细健康报告，包括各组件健康状况和建议",
  })
  @ApiSuccessResponse({
    description: "健康报告获取成功",
    schema: {
      type: 'object',
      properties: {
        overall: { type: 'object', description: '整体健康状况' },
        components: { type: 'object', description: '组件健康状况' },
        recommendations: { type: 'array', description: '优化建议' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getHealthReport() {
    return this.presenterService.getHealthReport();
  }

  /**
   * 获取趋势分析
   */
  @Auth([UserRole.ADMIN])
  @Get("trends")
  @ApiOperation({
    summary: "获取趋势分析",
    description: "获取系统性能趋势分析数据",
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: '分析周期 (例如: 1h, 24h, 7d)',
    example: '1h'
  })
  @ApiSuccessResponse({
    description: "趋势分析获取成功",
    schema: {
      type: 'object',
      properties: {
        responseTime: { type: 'object', description: '响应时间趋势' },
        errorRate: { type: 'object', description: '错误率趋势' },
        throughput: { type: 'object', description: '吞吐量趋势' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getTrends(
    @Query('period') period: string = '1h',
  ) {
    return this.presenterService.getTrends(period);
  }

  /**
   * 获取端点指标
   */
  @Auth([UserRole.ADMIN])
  @Get("endpoints")
  @ApiOperation({
    summary: "获取端点性能指标",
    description: "获取API端点的性能指标数据",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回结果数量限制',
    example: 50
  })
  @ApiSuccessResponse({
    description: "端点指标获取成功",
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          method: { type: 'string' },
          requestCount: { type: 'number' },
          averageResponseTime: { type: 'number' },
          errorRate: { type: 'number' },
          lastUsed: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getEndpointMetrics(
    @Query('limit') limit?: string,
  ) {
    return this.presenterService.getEndpointMetrics(limit);
  }

  /**
   * 获取数据库指标
   */
  @Auth([UserRole.ADMIN])
  @Get("database")
  @ApiOperation({
    summary: "获取数据库性能指标",
    description: "获取数据库操作的性能指标数据",
  })
  @ApiSuccessResponse({
    description: "数据库指标获取成功",
    schema: {
      type: 'object',
      properties: {
        totalOperations: { type: 'number' },
        averageQueryTime: { type: 'number' },
        slowQueries: { type: 'number' },
        failedOperations: { type: 'number' },
        failureRate: { type: 'number' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDatabaseMetrics() {
    return this.presenterService.getDatabaseMetrics();
  }

  /**
   * 获取缓存指标
   */
  @Auth([UserRole.ADMIN])
  @Get("cache")
  @ApiOperation({
    summary: "获取缓存性能指标",
    description: "获取缓存操作的性能指标数据",
  })
  @ApiSuccessResponse({
    description: "缓存指标获取成功",
    schema: {
      type: 'object',
      properties: {
        totalOperations: { type: 'number' },
        hits: { type: 'number' },
        misses: { type: 'number' },
        hitRate: { type: 'number' },
        averageResponseTime: { type: 'number' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getCacheMetrics() {
    return this.presenterService.getCacheMetrics();
  }

  /**
   * 获取优化建议
   */
  @Auth([UserRole.ADMIN])
  @Get("suggestions")
  @ApiOperation({
    summary: "获取系统优化建议",
    description: "获取基于当前系统状态的优化建议",
  })
  @ApiSuccessResponse({
    description: "优化建议获取成功",
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['performance', 'security', 'resource', 'optimization'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          title: { type: 'string' },
          description: { type: 'string' },
          action: { type: 'string' },
          impact: { type: 'string' }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getOptimizationSuggestions() {
    return this.presenterService.getOptimizationSuggestions();
  }

  /**
   * 获取缓存统计
   */
  @Auth([UserRole.ADMIN])
  @Get("cache/stats")
  @ApiOperation({
    summary: "获取缓存统计信息",
    description: "获取分析器缓存的统计信息",
  })
  @ApiSuccessResponse({
    description: "缓存统计获取成功",
    schema: {
      type: 'object',
      properties: {
        hitRate: { type: 'number' },
        totalRequests: { type: 'number' },
        totalHits: { type: 'number' },
        totalMisses: { type: 'number' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getCacheStats() {
    return this.presenterService.getCacheStats();
  }

  /**
   * 失效缓存
   */
  @Auth([UserRole.ADMIN])
  @HttpCode(HttpStatus.OK)
  @Get("cache/invalidate")
  @ApiOperation({
    summary: "失效分析器缓存",
    description: "手动失效分析器缓存，可指定失效模式",
  })
  @ApiQuery({
    name: 'pattern',
    required: false,
    description: '失效模式 (留空则失效所有缓存)',
    example: 'health_*'
  })
  @ApiSuccessResponse({
    description: "缓存失效成功",
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        pattern: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async invalidateCache(
    @Query('pattern') pattern?: string,
  ) {
    return this.presenterService.invalidateCache(pattern);
  }

  /**
   * 基础健康检查 (公开访问)
   */
  @NoPerformanceMonitoring()
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("health")
  @ApiOperation({
    summary: "获取系统基础健康状态 (公开访问)",
    description: "获取系统基本健康状态，用于服务可用性检查，限制每分钟60次请求",
  })
  @ApiHealthResponse()
  @ApiStandardResponses()
  async getBasicHealthStatus() {
    return this.presenterService.getBasicHealthStatus();
  }

  /**
   * 系统仪表板数据 (聚合多个指标)
   */
  @Auth([UserRole.ADMIN])
  @Get("dashboard")
  @ApiOperation({
    summary: "获取系统仪表板数据",
    description: "获取系统仪表板所需的聚合数据，包括关键指标摘要",
  })
  @ApiSuccessResponse({
    description: "仪表板数据获取成功",
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        healthScore: { type: 'number' },
        performanceSummary: { type: 'object' },
        trendsData: { type: 'object' },
        criticalIssues: { type: 'array' },
        suggestions: { type: 'array' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDashboardData() {
    return this.presenterService.getDashboardData();
  }
}