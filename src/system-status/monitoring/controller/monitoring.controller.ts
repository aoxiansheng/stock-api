import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Res,
  Inject,
} from "@nestjs/common";
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { createLogger } from "@common/config/logger.config";
import { NoPerformanceMonitoring } from "@common/core/decorators/performance-monitoring.decorator";
import {
  ApiStandardResponses,
  ApiSuccessResponse,
  JwtAuthResponses,
  ApiHealthResponse,
} from "@common/core/decorators/swagger-responses.decorator";

import { AlertingService } from "../../../alert/services/alerting.service";
import { Auth, Public } from "../../../auth/decorators/auth.decorator";
import { UserRole } from "../../../auth/enums/user-role.enum";
import { CacheService } from "../../../cache/services/cache.service";
import { MetricsHealthService } from "../../../system-status/collect-metrics/services/metrics-health.service";
import { MonitoringRegistryService } from "../services/monitoring-registry.service";
import { StreamPerformanceMetricsService } from "../../../core/shared/services/stream-performance-metrics.service";
import { DynamicLogLevelService } from "../../../core/shared/services/dynamic-log-level.service";

// Analytics imports
import type { IPerformanceAnalytics, IHealthAnalytics } from "../../analytics/interfaces";

import { GetDbPerformanceQueryDto, SystemMetricsUnitConversionDto } from "../dto/monitoring-query.dto";
import { PerformanceMetricsDto } from "../../../system-status/collect-metrics/dto/performance-metrics.dto";

@ApiTags("📈 性能监控")
@Controller("monitoring")
export class MonitoringController {
  private readonly logger = createLogger(MonitoringController.name);

  constructor(
    // ✅ 注入Analytics接口而非具体类
    @Inject('IPerformanceAnalytics')
    private readonly performanceAnalytics: IPerformanceAnalytics,
    @Inject('IHealthAnalytics')
    private readonly healthAnalytics: IHealthAnalytics,
    
    // 保留其他必要的依赖（移除performanceMonitor直接依赖）
    private readonly cacheOptimization: CacheService,
    private readonly metricsHealthService: MetricsHealthService,
    private readonly alertingService: AlertingService,
    private readonly metricsRegistry: MonitoringRegistryService,
    private readonly streamPerformanceMetrics: StreamPerformanceMetricsService,
    private readonly dynamicLogLevelService: DynamicLogLevelService,
  ) {}

  // 敏感数据 - 需要管理员权限
  @Auth([UserRole.ADMIN])
  @Get("performance")
  @ApiOperation({
    summary: "获取性能指标",
    description:
      "获取系统整体性能指标，包括API响应时间、数据库性能、缓存命中率等",
  })
  @ApiSuccessResponse({
    description: "性能指标获取成功",
    type: PerformanceMetricsDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getPerformanceMetrics(
    @Query() query: GetDbPerformanceQueryDto,
  ): Promise<PerformanceMetricsDto> {
    try {
      // 🔸 职责1: 参数验证（通过DTO自动完成）
      // 🔸 职责2: 调用分析服务
      // 🔸 职责3: 返回数据（由全局Interceptor包装）
      const metrics = await this.performanceAnalytics.getPerformanceSummary(
        query.startDate,
        query.endDate,
      );

      this.logger.debug("性能指标获取成功", {
        healthScore: metrics.healthScore,
        endpointsCount: metrics.endpoints?.length || 0,
      });

      return metrics;
    } catch (error) {
      this.logger.error("获取性能指标失败:", error);
      throw error;
    }
  }


  // 敏感数据 - 需要管理员权限
  async getEndpointMetrics(
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      if (limitNum < 1 || limitNum > 100) {
        throw new BadRequestException("limit必须在1-100之间");
      }

      // 新增：提前验证 sortBy 参数
      if (
        sortBy &&
        !["totalRequests", "averageResponseTime", "errorRate"].includes(sortBy)
      ) {
        throw new BadRequestException("无效的排序字段");
      }

      // ✅ 通过Analytics层访问数据，而不是直接调用Metrics
      let metrics = await this.performanceAnalytics.getEndpointMetrics();

      // 确保metrics是数组
      if (!Array.isArray(metrics)) {
        this.logger.warn("端点指标数据不是数组格式，将抛出错误");
      }

      // 排序
      if (sortBy && metrics.length > 0) {
        switch (sortBy) {
          case "totalRequests":
            metrics = metrics.sort(
              (a, b) => (b.totalRequests || 0) - (a.totalRequests || 0),
            );
            break;
          case "averageResponseTime":
            metrics = metrics.sort(
              (a, b) =>
                (b.averageResponseTime || 0) - (a.averageResponseTime || 0),
            );
            break;
          case "errorRate":
            metrics = metrics.sort(
              (a, b) => (b.errorRate || 0) - (a.errorRate || 0),
            );
            break;
        }
      }

      const result = {
        metrics: metrics.slice(0, limitNum),
        total: metrics.length,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("端点指标获取成功", {
        total: result.total,
        returned: result.metrics.length,
      });

      return result;
    } catch (error) {
      this.logger.error("获取端点指标失败:", error);
      throw error;
    }
  }

  // 敏感数据 - 需要管理员权限
  async getDatabaseMetrics(@Query() query: GetDbPerformanceQueryDto) {
    try {
      // ✅ 通过Analytics层访问数据，而不是直接调用Metrics
      const metrics = await this.performanceAnalytics.getDatabaseMetrics(
        query.startDate,
        query.endDate,
      );

      // 确保返回数据结构完整
      if (!metrics) {
        this.logger.warn("数据库指标数据为空，将抛出错误");
      }

      // 验证必要字段并提供默认值
      const safeMetrics = {
        connectionPoolSize: metrics.connectionPoolSize || 0,
        activeConnections: metrics.activeConnections || 0,
        waitingConnections: metrics.waitingConnections || 0,
        averageQueryTime: metrics.averageQueryTime || 0,
        slowQueries: metrics.slowQueries || 0,
        totalQueries: metrics.totalQueries || 0,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("数据库指标获取成功", {
        totalQueries: safeMetrics.totalQueries,
        averageQueryTime: safeMetrics.averageQueryTime,
      });

      return safeMetrics;
    } catch (error) {
      this.logger.error("获取数据库指标失败:", error);
      throw error;
    }
  }


  // 敏感数据 - 需要管理员权限
  async getRedisMetrics() {
    try {
      // ✅ 通过Analytics层访问数据，而不是直接调用Metrics
      const metrics = await this.performanceAnalytics.getRedisMetrics();

      // 确保返回数据结构完整 - 服务应该总是返回有效的默认值
      if (!metrics) {
        this.logger.warn("Redis指标数据为空，将抛出错误");
      }

      // 验证必要字段并提供默认值
      const safeMetrics = {
        memoryUsage: metrics.memoryUsage || 0,
        connectedClients: metrics.connectedClients || 0,
        opsPerSecond: metrics.opsPerSecond || 0,
        hitRate: metrics.hitRate || 0,
        evictedKeys: metrics.evictedKeys || 0,
        expiredKeys: metrics.expiredKeys || 0,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("Redis指标获取成功", {
        memoryUsage: safeMetrics.memoryUsage,
        hitRate: safeMetrics.hitRate,
      });

      return safeMetrics;
    } catch (error) {
      this.logger.error("获取Redis指标失败:", error);
      // 返回默认值而不是抛出错误
      throw error;
    }
  }


  // 敏感数据 - 需要管理员权限
  // 敏感数据 - 需要管理员权限
  async getSystemMetrics(): Promise<SystemMetricsUnitConversionDto> {
    try {
      // ✅ 通过Analytics层访问数据，而不是直接调用Metrics
      const metrics = this.performanceAnalytics.getSystemMetrics();

      // 如果没有获取到指标，使用默认值
      if (!metrics) {
        this.logger.warn("系统指标获取失败，将抛出错误");
      }

      // 🚀 使用DTO进行单位转换，而不是在Controller中直接处理
      const convertedMetrics = SystemMetricsUnitConversionDto.fromRawMetrics(metrics);

      this.logger.debug("系统指标获取成功", {
        memoryUsageGB: convertedMetrics.memoryUsageGB,
        uptimeHours: convertedMetrics.uptimeHours,
      });

      return convertedMetrics;
    } catch (error) {
      this.logger.error("获取系统指标发生异常:", error);
      // 返回默认值而不是抛出错误
      throw error;
    }
  }

  @NoPerformanceMonitoring()
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("health")
  @ApiOperation({
    summary: "获取系统健康状态 (公开访问)",
    description: "获取系统基本健康状态，用于服务可用性检查，限制每分钟60次请求",
  })
  @ApiHealthResponse()
  @ApiStandardResponses()
  async getHealthStatus() {
    try {
      // 简化的健康检查，只显示基本状态
      const result = {
        status: "operational",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        message: "系统运行正常",
      };

      this.logger.debug("基本健康状态获取成功", {
        status: result.status,
        uptime: result.uptime,
      });

      return result;
    } catch (error) {
      this.logger.error("获取基本健康状态失败:", error);
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        message: "系统健康检查失败",
      };
    }
  }

  @NoPerformanceMonitoring()
  @Auth([UserRole.ADMIN])
  @Get("health/detailed")
  @ApiOperation({
    summary: "获取详细系统健康状态",
    description: "获取系统详细健康评分和状态 (需要管理员权限)",
  })
  @ApiHealthResponse()
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDetailedHealthStatus() {
    try {
      // 直接委托给健康分析服务
      const healthReport = await this.healthAnalytics.getDetailedHealthReport();

      // 添加额外的系统信息
      const result = {
        ...healthReport,
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
      };

      this.logger.debug("详细健康状态获取成功", {
        status: result.status,
        score: result.score,
        issuesCount: result.issues.length,
      });

      return result;
    } catch (error) {
      this.logger.error("获取详细健康状态失败:", error);
      throw error;
    }
  }





  // 敏感数据 - 需要管理员权限
  @Auth([UserRole.ADMIN])
  @Get("cache")
  @ApiOperation({
    summary: "获取缓存性能指标",
    description: "获取Redis缓存的性能统计信息",
  })
  @ApiSuccessResponse({ description: "缓存指标获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getCacheMetrics() {
    const stats = await this.cacheOptimization.getStats();
    const health = await this.cacheOptimization.healthCheck();

    return {
      ...stats,
      health,
      timestamp: new Date().toISOString(),
    };
  }

  // 敏感数据 - 需要管理员权限
  async getOptimizationRecommendations() {
    try {
      const [performanceSummary, cacheStats] = await Promise.all([
        // ✅ 通过Analytics层访问数据，而不是直接调用Metrics
        this.performanceAnalytics.getPerformanceSummary().catch((error) => {
          this.logger.error("获取性能摘要失败:", error);
        }),
        this.cacheOptimization.getStats().catch((error) => {
          this.logger.error("获取缓存统计失败:", error);
        }),
      ]);

      // 简化优化建议，主要功能已移至Analytics服务
      const recommendations = [
        {
          type: "performance_monitoring",
          priority: "info",
          description: "性能监控正常运行",
          action: "继续监控系统性能指标",
        },
      ];

      return {
        recommendations,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("获取优化建议失败:", error);
      throw error;
    }
  }

  // 敏感数据 - 需要管理员权限
  // 敏感数据 - 需要管理员权限
  async getDashboardData() {
    try {
      // ✅ 通过Analytics层访问所有数据，而不是直接调用Metrics
      const performance = await this.performanceAnalytics.getPerformanceSummary();
      const cache = await this.cacheOptimization.getStats();
      const trends = await this.performanceAnalytics.calculateTrends(performance);
      const alertStats = await this.alertingService.getStats();

      // 🚀 使用HealthAnalyticsService获取健康状态，而不是本地方法
      const healthStatus = await this.healthAnalytics.getHealthStatus(performance.healthScore);

      const dashboardData = {
        timestamp: new Date().toISOString(),
        overview: {
          healthScore: performance.healthScore,
          status: healthStatus, // 委托给Analytics服务
          uptime: performance.system.uptime,
          totalRequests: performance.summary.totalRequests,
          avgResponseTime: performance.summary.averageResponseTime,
          errorRate: performance.summary.errorRate,
          cacheHitRate: cache.hitRate,
          activeAlerts: alertStats.activeAlerts,
          criticalAlerts: alertStats.criticalAlerts,
          warningAlerts: alertStats.warningAlerts,
        },
        performance,
        cache,
        trends,
        alerts: alertStats,
      };

      return dashboardData;
    } catch (error) {
      this.logger.error("获取仪表板数据失败", error);
    }
  }

  // 私有辅助方法



  // 指标系统健康检查 - 管理员权限
  @Auth([UserRole.ADMIN])
  @Get("metrics-health")
  @ApiOperation({
    summary: "获取指标系统健康状态",
    description: "获取性能监控系统自身的健康状态，包括Redis连接状态等",
  })
  @ApiSuccessResponse({ description: "指标系统健康状态获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  @NoPerformanceMonitoring()
  async getMetricsHealth() {
    try {
      return this.metricsHealthService.getDetailedHealthReport();
    } catch (error) {
      this.logger.error("获取指标系统健康状态失败:", error);
    }
  }

  // 手动触发指标系统健康检查 - 管理员权限
  @Auth([UserRole.ADMIN])
  @Get("metrics-health/check")
  @ApiOperation({
    summary: "手动触发指标系统健康检查",
    description: "立即检查指标系统健康状态并返回结果",
  })
  @ApiSuccessResponse({ description: "健康检查执行成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  @NoPerformanceMonitoring()
  async triggerMetricsHealthCheck() {
    try {
      await this.metricsHealthService.manualHealthCheck();
      return this.metricsHealthService.getHealthStatus();
    } catch (error) {
      this.logger.error("手动健康检查失败:", error);
    }
  }

  // 标准 Prometheus 指标端点 - 管理员权限
  @Auth([UserRole.ADMIN])
  @Get("metrics")
  @ApiOperation({
    summary: "获取 Prometheus 指标",
    description: "获取标准格式的 Prometheus 指标数据，用于监控系统集成",
  })
  @ApiSuccessResponse({ 
    description: "Prometheus 指标获取成功",
    schema: {
      type: 'string',
      example: '# HELP newstock_stream_symbols_processed_total Total number of symbols processed in stream\n# TYPE newstock_stream_symbols_processed_total counter\nnewstock_stream_symbols_processed_total{provider="longport",market="HK"} 42\n'
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  @NoPerformanceMonitoring()
  async getPrometheusMetrics(@Res() res: Response) {
    try {
      const metricsData = await this.metricsRegistry.getMetrics();
      
      // 设置正确的 Content-Type 响应头
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metricsData);
      
      this.logger.debug('Prometheus 指标数据已返回', {
        metricsLength: metricsData.length
      });
    } catch (error) {
      this.logger.error("获取 Prometheus 指标失败:", error);
    }
  }

  // 流性能指标端点 - 管理员权限
  @Auth([UserRole.ADMIN])
  @Get("stream-performance")
  @ApiOperation({
    summary: "获取流处理性能指标",
    description: "获取 WebSocket 流处理系统的详细性能指标，包括批量处理统计",
  })
  @ApiSuccessResponse({ 
    description: "流性能指标获取成功",
    schema: {
      type: 'object',
      properties: {
        stats: { type: 'object', description: '流处理统计数据' },
        percentiles: { type: 'object', description: '响应时间百分位数' },
        prometheusMetrics: { type: 'string', description: 'Prometheus 格式指标' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  @NoPerformanceMonitoring()
  async getStreamPerformanceMetrics() {
    try {
      const detailedReport = await this.streamPerformanceMetrics.getDetailedPerformanceReport();
      
      this.logger.debug('流性能指标获取成功', {
        statsSymbolsProcessed: detailedReport.stats.totalSymbolsProcessed,
        statsTotalBatches: detailedReport.stats.batchProcessingStats.totalBatches
      });
      
      return detailedReport;
    } catch (error) {
      this.logger.error("获取流性能指标失败:", error);
    }
  }

  // 动态日志级别状态端点 - 管理员权限
  @Auth([UserRole.ADMIN])
  @Get("dynamic-log-level")
  @ApiOperation({
    summary: "获取动态日志级别状态",
    description: "获取动态日志级别服务的当前状态和性能指标",
  })
  @ApiSuccessResponse({ 
    description: "动态日志级别状态获取成功",
    schema: {
      type: 'object',
      properties: {
        currentStatus: { 
          type: 'object', 
          description: '当前系统状态' 
        },
        performanceMetrics: { 
          type: 'object', 
          description: '性能指标摘要' 
        },
        prometheusMetrics: { 
          type: 'string', 
          description: 'Prometheus 格式指标' 
        },
        timestamp: { 
          type: 'string', 
          format: 'date-time' 
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  @NoPerformanceMonitoring()
  async getDynamicLogLevelStatus() {
    try {
      const currentStatus = this.dynamicLogLevelService.getCurrentStatus();
      const performanceMetrics = await this.dynamicLogLevelService.getPerformanceMetrics();
      const prometheusMetrics = await this.dynamicLogLevelService.getMetrics();
      
      const result = {
        currentStatus,
        performanceMetrics,
        prometheusMetrics,
        timestamp: new Date().toISOString()
      };
      
      this.logger.debug('动态日志级别状态获取成功', {
        currentLogLevel: currentStatus.currentLogLevel,
        cpuUsage: currentStatus.cpuUsage,
        totalSwitches: performanceMetrics.totalLogLevelSwitches
      });
      
      return result;
    } catch (error) {
      this.logger.error("获取动态日志级别状态失败:", error);
    }
  }

  // 综合 Prometheus 指标摘要端点 - 管理员权限
  @Auth([UserRole.ADMIN])
  @Get("metrics/summary")
  @ApiOperation({
    summary: "获取指标系统摘要信息",
    description: "获取 Prometheus 指标注册中心的摘要信息和健康状态",
  })
  @ApiSuccessResponse({ 
    description: "指标摘要获取成功",
    schema: {
      type: 'object',
      properties: {
        metricsSummary: { 
          type: 'object', 
          description: '指标摘要信息' 
        },
        healthStatus: { 
          type: 'object', 
          description: '健康状态检查' 
        },
        timestamp: { 
          type: 'string', 
          format: 'date-time' 
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  @NoPerformanceMonitoring()
  async getMetricsSummary() {
    try {
      const metricsSummary = this.metricsRegistry.getMetricsSummary();
      const healthStatus = this.metricsRegistry.getHealthStatus();
      
      const result = {
        metricsSummary,
        healthStatus,
        timestamp: new Date().toISOString()
      };
      
      this.logger.debug('指标摘要获取成功', {
        totalMetrics: metricsSummary.totalMetrics,
        customMetrics: metricsSummary.customMetrics,
        healthStatus: healthStatus.status
      });
      
      return result;
    } catch (error) {
      this.logger.error("获取指标摘要失败:", error);
    }
  }
}
