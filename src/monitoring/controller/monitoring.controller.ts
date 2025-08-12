import {
  Controller,
  Get,
  Query,
  BadRequestException,
  InternalServerErrorException,
  Res,
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

import { AlertingService } from "../../alert/services/alerting.service";
import { Auth, Public } from "../../auth/decorators/auth.decorator";
import { UserRole } from "../../auth/enums/user-role.enum";
import { CacheService } from "../../cache/services/cache.service";
import { MetricsHealthService } from "../../metrics/services/metrics-health.service";
import { PerformanceMonitorService } from "../../metrics/services/performance-monitor.service";
import { MetricsRegistryService } from "../metrics/metrics-registry.service";
import { StreamPerformanceMetrics } from "../../core/shared/services/stream-performance-metrics.service";
import { DynamicLogLevelService } from "../../core/shared/services/dynamic-log-level.service";

import { GetDbPerformanceQueryDto } from "../dto/monitoring-query.dto";
import { PerformanceMetricsDto } from "../../metrics/dto/performance-metrics.dto";

@ApiTags("📈 性能监控")
@Controller("monitoring")
export class MonitoringController {
  private readonly logger = createLogger(MonitoringController.name);

  constructor(
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly cacheOptimization: CacheService,
    private readonly metricsHealthService: MetricsHealthService,
    private readonly alertingService: AlertingService,
    private readonly metricsRegistry: MetricsRegistryService,
    private readonly streamPerformanceMetrics: StreamPerformanceMetrics,
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
      const metrics = await this.performanceMonitor.getPerformanceSummary(
        query.startDate,
        query.endDate,
      );

      // 确保返回数据结构完整
      if (!metrics) {
        this.logger.warn("性能监控服务返回空数据，将抛出错误");
        throw new InternalServerErrorException("性能监控服务暂时不可用");
      }

      // 验证必要字段存在
      if (typeof metrics.healthScore === "undefined") {
        this.logger.warn("健康评分数据缺失，将使用默认值");
        metrics.healthScore = 0;
      }

      if (!metrics.endpoints) {
        this.logger.warn("端点指标数据缺失，将使用空数组");
        metrics.endpoints = [];
      }

      if (typeof metrics.processingTime === "undefined") {
        this.logger.warn("处理时间数据缺失，将使用默认值");
        metrics.processingTime = 0;
      }

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

  private getDefaultPerformanceMetrics(): PerformanceMetricsDto {
    return {
      timestamp: new Date().toISOString(),
      healthScore: 0,
      processingTime: 0,
      summary: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        systemLoad: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
      },
      endpoints: [],
      database: {
        connectionPoolSize: 10,
        activeConnections: 0,
        waitingConnections: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
      },
      redis: {
        memoryUsage: 0,
        connectedClients: 0,
        opsPerSecond: 0,
        hitRate: 0,
        evictedKeys: 0,
        expiredKeys: 0,
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        heapUsed: 0,
        heapTotal: 0,
        uptime: process.uptime(),
        eventLoopLag: 0,
      },
    };
  }

  // 敏感数据 - 需要管理员权限
  @Auth([UserRole.ADMIN])
  @Get("endpoints")
  @ApiOperation({
    summary: "获取端点性能指标",
    description: "获取各API端点的详细性能指标",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "返回结果数量限制",
    example: 20,
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    description: "排序字段",
    enum: ["totalRequests", "averageResponseTime", "errorRate"],
    example: "totalRequests",
  })
  @ApiSuccessResponse({ description: "端点指标获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
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

      let metrics = await this.performanceMonitor.getEndpointMetrics();

      // 确保metrics是数组
      if (!Array.isArray(metrics)) {
        this.logger.warn("端点指标数据不是数组格式，将抛出错误");
        throw new InternalServerErrorException("端点指标数据格式错误");
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
  @Auth([UserRole.ADMIN])
  @Get("database")
  @ApiOperation({
    summary: "获取数据库性能指标",
    description: "获取数据库连接池、查询性能等指标",
  })
  @ApiSuccessResponse({ description: "数据库指标获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDatabaseMetrics(@Query() query: GetDbPerformanceQueryDto) {
    try {
      const metrics = await this.performanceMonitor.getDatabaseMetrics(
        query.startDate,
        query.endDate,
      );

      // 确保返回数据结构完整
      if (!metrics) {
        this.logger.warn("数据库指标数据为空，将抛出错误");
        throw new InternalServerErrorException("数据库监控服务暂时不可用");
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

  private getDefaultDatabaseMetrics() {
    return {
      connectionPoolSize: 10,
      activeConnections: 0,
      waitingConnections: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      totalQueries: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // 敏感数据 - 需要管理员权限
  @Auth([UserRole.ADMIN])
  @Get("redis")
  @ApiOperation({
    summary: "获取Redis性能指标",
    description: "获取Redis内存使用、连接数、命中率等指标",
  })
  @ApiSuccessResponse({ description: "Redis指标获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getRedisMetrics() {
    try {
      const metrics = await this.performanceMonitor.getRedisMetrics();

      // 确保返回数据结构完整 - 服务应该总是返回有效的默认值
      if (!metrics) {
        this.logger.warn("Redis指标数据为空，将抛出错误");
        throw new InternalServerErrorException("Redis 监控服务暂时不可用");
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

  private getDefaultRedisMetrics() {
    return {
      memoryUsage: 0,
      connectedClients: 0,
      opsPerSecond: 0,
      hitRate: 0,
      evictedKeys: 0,
      expiredKeys: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // 敏感数据 - 需要管理员权限
  @Auth([UserRole.ADMIN])
  @Get("system")
  @ApiOperation({
    summary: "获取系统资源指标",
    description: "获取CPU、内存、事件循环等系统指标",
  })
  @ApiSuccessResponse({ description: "系统指标获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getSystemMetrics() {
    try {
      const metrics = this.performanceMonitor.getSystemMetrics();

      // 如果没有获取到指标，使用默认值
      if (!metrics) {
        this.logger.warn("系统指标获取失败，将抛出错误");
        throw new InternalServerErrorException("系统指标服务暂时不可用");
      }

      return {
        ...metrics,
        timestamp: new Date().toISOString(),
        memoryUsageGB: (metrics.memoryUsage || 0) / 1024 / 1024 / 1024,
        heapUsedGB: (metrics.heapUsed || 0) / 1024 / 1024 / 1024,
        heapTotalGB: (metrics.heapTotal || 0) / 1024 / 1024 / 1024,
        uptimeHours: (metrics.uptime || 0) / 3600,
      };
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
      const summary = await this.performanceMonitor.getPerformanceSummary();

      // 确保summary存在且有healthScore
      if (!summary) {
        this.logger.warn("性能摘要数据为空，将抛出错误");
        throw new InternalServerErrorException("性能摘要服务暂时不可用");
      }

      const healthScore = summary.healthScore || 0;
      const healthStatus = this.determineHealthStatus(healthScore);
      const issues = this.identifyIssues(summary);

      const result = {
        status: healthStatus,
        score: healthScore,
        timestamp: new Date().toISOString(),
        issues,
        recommendations: this.generateRecommendations(summary),
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

  private getDefaultHealthStatus() {
    return {
      status: "degraded",
      score: 0,
      timestamp: new Date().toISOString(),
      issues: ["性能监控服务不可用"],
      recommendations: ["检查监控服务配置"],
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
    };
  }

  private determineHealthStatus(score: number): string {
    if (score >= 90) return "healthy";
    if (score >= 70) return "warning";
    if (score >= 50) return "degraded";
    return "unhealthy";
  }

  private identifyIssues(summary: any): string[] {
    const issues: string[] = [];

    try {
      // 检查summary结构完整性
      if (!summary) {
        issues.push("系统监控数据不可用");
        return issues;
      }

      const summaryData = summary.summary || {};
      const systemData = summary.system || {};
      const databaseData = summary.database || {};

      if ((summaryData.errorRate || 0) > 0.05) {
        issues.push("错误率过高");
      }

      if ((summaryData.averageResponseTime || 0) > 1000) {
        issues.push("平均响应时间过长");
      }

      if ((systemData.cpuUsage || 0) > 0.8) {
        issues.push("CPU使用率过高");
      }

      const heapTotal = systemData.heapTotal || 1; // 避免除零
      if ((systemData.memoryUsage || 0) / heapTotal >= 0.9) {
        issues.push("内存使用率过高");
      }

      if ((summaryData.cacheHitRate || 0) < 0.7) {
        issues.push("缓存命中率过低");
      }

      if ((databaseData.averageQueryTime || 0) > 500) {
        issues.push("数据库查询过慢");
      }

      return issues;
    } catch (error) {
      this.logger.error("识别系统问题时出错:", error);
      return ["系统健康检查出现异常"];
    }
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    try {
      // 检查summary结构完整性
      if (!summary) {
        recommendations.push("请检查系统监控配置");
        return recommendations;
      }

      const summaryData = summary.summary || {};
      const systemData = summary.system || {};
      const databaseData = summary.database || {};

      if ((summaryData.errorRate || 0) > 0.05) {
        recommendations.push("检查错误日志，修复频繁出现的错误");
      }

      if ((summaryData.averageResponseTime || 0) > 1000) {
        recommendations.push("优化API响应时间，考虑增加缓存或优化数据库查询");
      }

      if ((systemData.cpuUsage || 0) > 0.8) {
        recommendations.push("考虑水平扩容或优化CPU密集型操作");
      }

      const heapTotal = systemData.heapTotal || 1; // 避免除零
      if ((systemData.memoryUsage || 0) / heapTotal >= 0.9) {
        recommendations.push("检查内存泄漏，考虑增加内存或优化内存使用");
      }

      if ((summaryData.cacheHitRate || 0) < 0.7) {
        recommendations.push("优化缓存策略，增加缓存命中率");
      }

      if ((databaseData.averageQueryTime || 0) > 500) {
        recommendations.push("优化数据库索引，检查慢查询");
      }

      // 如果没有具体建议，提供通用建议
      if (recommendations.length === 0) {
        recommendations.push("系统运行正常，继续保持当前配置");
      }

      return recommendations;
    } catch (error) {
      this.logger.error("生成系统建议时出错:", error);
      return ["请联系系统管理员检查监控配置"];
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
  @Auth([UserRole.ADMIN])
  @Get("optimization/recommendations")
  @ApiOperation({
    summary: "获取性能优化建议",
    description: "基于当前系统状态生成性能优化建议",
  })
  @ApiSuccessResponse({ description: "优化建议获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getOptimizationRecommendations() {
    try {
      const [performanceSummary, cacheStats] = await Promise.all([
        this.performanceMonitor.getPerformanceSummary().catch((error) => {
          this.logger.error("获取性能摘要失败:", error);
          throw new InternalServerErrorException("性能摘要服务暂时不可用");
        }),
        this.cacheOptimization.getStats().catch((error) => {
          this.logger.error("获取缓存统计失败:", error);
          throw new InternalServerErrorException("缓存统计服务暂时不可用");
        }),
      ]);

      const recommendations = this.generateOptimizationRecommendations(
        performanceSummary,
        cacheStats,
      );

      return {
        recommendations,
        priority: this.categorizePriority(recommendations),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("获取优化建议失败:", error);
      throw error;
    }
  }

  // 敏感数据 - 需要管理员权限
  @Auth([UserRole.ADMIN])
  @Get("dashboard")
  @ApiOperation({
    summary: "获取监控仪表板聚合数据",
    description: `
### 功能说明
获取用于前端监控仪表板的聚合数据，包括系统健康、性能、告警、缓存等关键信息。

### 权限要求
仅限管理员用户

### 响应内容
- **overview**: 系统健康总览
- **performance**: 关键性能指标(KPI)
- **alerts**: 告警统计
- **cache**: 缓存使用情况
- **trends**: 性能趋势分析
`,
  })
  @ApiSuccessResponse({ description: "仪表板数据获取成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDashboardData() {
    try {
      const performance = await this.performanceMonitor.getPerformanceSummary();
      const cache = await this.cacheOptimization.getStats();
      const trends = await this.calculateTrends();
      const alertStats = await this.alertingService.getStats();

      const dashboardData = {
        timestamp: new Date().toISOString(),
        overview: {
          healthScore: performance.healthScore,
          status: this.determineHealthStatus(performance.healthScore),
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
      throw new InternalServerErrorException("无法获取仪表板数据");
    }
  }

  // 私有辅助方法
  private generateOptimizationRecommendations(
    performance: any,
    cache: any,
  ): Array<{
    type: string;
    priority: string;
    description: string;
    action: string;
  }> {
    const recommendations = [];

    // 性能优化建议
    if (performance.summary.errorRate > 0.05) {
      recommendations.push({
        type: "error_handling",
        priority: "high",
        description: `错误率过高 (${(performance.summary.errorRate * 100).toFixed(2)}%)`,
        action: "检查错误日志，修复频繁出现的错误",
      });
    }

    if (performance.summary.averageResponseTime > 1000) {
      recommendations.push({
        type: "response_time",
        priority: "high",
        description: `平均响应时间过长 (${performance.summary.averageResponseTime.toFixed(0)}ms)`,
        action: "优化数据库查询，增加缓存，考虑使用CDN",
      });
    }

    if (performance.system.cpuUsage > 0.8) {
      recommendations.push({
        type: "cpu_optimization",
        priority: "medium",
        description: `CPU使用率过高 (${(performance.system.cpuUsage * 100).toFixed(1)}%)`,
        action: "优化CPU密集型操作，考虑水平扩容",
      });
    }

    // 缓存优化建议
    if (cache.hitRate < 0.7) {
      recommendations.push({
        type: "cache_optimization",
        priority: "medium",
        description: `缓存命中率偏低 (${(cache.hitRate * 100).toFixed(1)}%)`,
        action: "优化缓存策略，增加缓存时间，预热常用数据",
      });
    }

    if (cache.memoryUsage > 800 * 1024 * 1024) {
      // 800MB
      recommendations.push({
        type: "cache_memory",
        priority: "low",
        description: "缓存内存使用较高",
        action: "考虑增加缓存内存或优化数据结构",
      });
    }

    // 数据库优化建议
    if (performance.database?.averageQueryTime > 500) {
      recommendations.push({
        type: "database_optimization",
        priority: "high",
        description: `数据库查询偏慢 (${performance.database.averageQueryTime.toFixed(0)}ms)`,
        action: "添加数据库索引，优化查询语句，考虑读写分离",
      });
    }

    return recommendations;
  }

  private categorizePriority(recommendations: any[]): any {
    const high = recommendations.filter((r) => r.priority === "high");
    const medium = recommendations.filter((r) => r.priority === "medium");
    const low = recommendations.filter((r) => r.priority === "low");

    return {
      high: { count: high.length, items: high },
      medium: { count: medium.length, items: medium },
      low: { count: low.length, items: low },
      total: recommendations.length,
    };
  }

  private async calculateTrends(): Promise<any> {
    // 这里可以实现更复杂的趋势计算
    // 现在返回简单的示例数据
    return {
      responseTime: {
        trend: "improving", // improving, stable, degrading
        change: -5.2, // 变化百分比
      },
      errorRate: {
        trend: "stable",
        change: 0.1,
      },
      throughput: {
        trend: "improving",
        change: 12.3,
      },
      cacheHitRate: {
        trend: "stable",
        change: -0.5,
      },
    };
  }

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
      throw new InternalServerErrorException("指标系统健康检查失败");
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
      throw new InternalServerErrorException("手动健康检查执行失败");
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
      throw new InternalServerErrorException("指标数据获取失败");
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
      throw new InternalServerErrorException("流性能指标获取失败");
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
      throw new InternalServerErrorException("动态日志级别状态获取失败");
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
      throw new InternalServerErrorException("指标摘要获取失败");
    }
  }
}
