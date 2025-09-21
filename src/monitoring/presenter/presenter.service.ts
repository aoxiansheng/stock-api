import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { MONITORING_ERROR_CODES } from "../constants/monitoring-error-codes.constants";

import { GetDbPerformanceQueryDto } from "./dto/presenter-query.dto";
import { GetEndpointMetricsDto } from "../contracts/dto/queries/get-endpoint-metrics.dto";
import { AnalyzerService } from "../analyzer/analyzer.service";
import { MONITORING_SYSTEM_LIMITS } from "../constants/config/monitoring-system.constants";
import { MonitoringUnifiedLimitsConfig } from "../config/unified/monitoring-unified-limits.config";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@common/logging/index";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";

/**
 * 展示层业务服务
 * 负责处理系统状态监控数据的业务逻辑
 * 🆕 集成分页服务，支持标准分页功能
 */
@Injectable()
export class PresenterService {
  private readonly logger = createLogger(PresenterService.name);

  constructor(
    private readonly analyzer: AnalyzerService,
    private readonly paginationService: PaginationService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log("PresenterService initialized - 展示层业务服务已启动");
  }

  /**
   * 获取性能分析数据
   */
  async getPerformanceAnalysis(query: GetDbPerformanceQueryDto) {
    const options = {
      startTime: query.startDate ? new Date(query.startDate) : undefined,
      endTime: query.endDate ? new Date(query.endDate) : undefined,
      includeDetails: true,
    };

    const analysis = await this.analyzer.getPerformanceAnalysis(options);

    this.logger.debug("性能分析数据获取成功", {
      healthScore: analysis.healthScore,
      totalOperations: analysis.summary.totalOperations,
    });

    return analysis;
  }

  /**
   * 获取健康评分
   */
  async getHealthScore() {
    const score = await this.analyzer.getHealthScore();

    return {
      score,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取详细健康报告
   */
  async getHealthReport() {
    const report = await this.analyzer.getHealthReport();

    this.logger.debug("健康报告获取成功", {
      overallScore: report.overall.healthScore,
      status: report.overall.status,
      recommendationsCount: report.recommendations?.length || 0,
    });

    return report;
  }

  /**
   * 获取趋势分析
   */
  async getTrends(period: string = "1h") {
    // 简单参数验证
    if (period && !/^(\d+)([smhd])$/.test(period)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Invalid time period format, supported formats: 1s, 5m, 1h, 1d",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getPerformanceAnalysis',
        component: ComponentIdentifier.MONITORING,
        context: {
          period,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    const trends = await this.analyzer.calculateTrends(period);

    this.logger.debug("趋势分析获取成功", { period });

    return trends;
  }

  /**
   * 获取端点指标 (支持分页)
   * @param query 查询参数，包含page和limit
   * @returns 分页格式的端点指标数据
   */
  async getEndpointMetrics(query: GetEndpointMetricsDto) {
    // 使用PaginationService标准化分页参数
    const { page, limit } =
      this.paginationService.normalizePaginationQuery(query);

    // 调用带分页支持的底层服务
    const { items, total } =
      await this.analyzer.getEndpointMetricsWithPagination(page, limit);

    // 创建标准分页响应
    const paginatedResponse = this.paginationService.createPaginatedResponse(
      items,
      page,
      limit,
      total,
    );

    this.logger.debug("端点指标获取成功(分页)", {
      page,
      limit,
      count: items.length,
      total,
      totalPages: paginatedResponse.pagination.totalPages,
    });

    return paginatedResponse;
  }

  /**
   * 获取数据库指标
   */
  async getDatabaseMetrics() {
    const metrics = await this.analyzer.getDatabaseMetrics();

    this.logger.debug("数据库指标获取成功", {
      totalOperations: metrics.totalOperations,
      responseTimeMs: metrics.responseTimeMs,
    });

    return metrics;
  }

  /**
   * 获取缓存指标
   */
  async getCacheMetrics() {
    const metrics = await this.analyzer.getCacheMetrics();

    this.logger.debug("缓存指标获取成功", {
      hitRate: metrics.hitRate,
      totalOperations: metrics.totalOperations,
    });

    return metrics;
  }

  /**
   * 获取优化建议
   */
  async getOptimizationSuggestions() {
    const suggestions = await this.analyzer.getOptimizationSuggestions();

    this.logger.debug("优化建议获取成功", {
      count: suggestions.length,
      highPriority: suggestions.filter((s) => s.priority === "high").length,
    });

    return suggestions;
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats() {
    const stats = await this.analyzer.getCacheStats();

    this.logger.debug("缓存统计获取成功", {
      hitRate: stats.hitRate,
      totalOperations: stats.totalOperations,
    });

    return stats;
  }

  /**
   * 获取SmartCache性能统计
   */
  async getSmartCacheStats() {
    // 获取SmartCache性能优化器的统计信息
    const smartCacheStats = await this.getSmartCachePerformanceStats();
    const cacheMetrics = await this.analyzer.getCacheStats();

    const result = {
      ...cacheMetrics,
      smartCache: smartCacheStats,
      timestamp: new Date().toISOString(),
    };

    this.logger.debug("SmartCache统计获取成功", {
      hitRate: result.hitRate,
      concurrencyAdjustments: result.smartCache.concurrencyAdjustments,
      memoryPressureEvents: result.smartCache.memoryPressureEvents,
    });

    return result;
  }

  /**
   * 获取SmartCache优化建议
   */
  async getSmartCacheOptimizationSuggestions() {
    const performanceStats = await this.getSmartCachePerformanceStats();
    const suggestions = [];

    // 根据统计数据生成优化建议
    if (performanceStats.memoryPressureEvents > 50) {
      suggestions.push({
        priority: "high",
        category: "memory",
        title: "SmartCache内存压力过高",
        description: `检测到${performanceStats.memoryPressureEvents}次内存压力事件，建议优化内存使用`,
        recommendation: "考虑增加系统内存或减少缓存TTL时间",
      });
    }

    if (
      performanceStats.concurrencyAdjustments >
      MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE
    ) {
      suggestions.push({
        priority: "medium",
        category: "concurrency",
        title: "SmartCache并发调整频繁",
        description: `检测到${performanceStats.concurrencyAdjustments}次并发调整，系统负载波动较大`,
        recommendation: "检查负载模式，考虑调整基础并发配置",
      });
    }

    if (
      performanceStats.avgExecutionTime >
      MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS
    ) {
      suggestions.push({
        priority: "high",
        category: "performance",
        title: "SmartCache执行时间过长",
        description: `平均执行时间为${performanceStats.avgExecutionTime.toFixed(2)}ms，超出预期范围`,
        recommendation: "检查缓存键设计和数据库查询性能",
      });
    }

    if (performanceStats.dynamicMaxConcurrency < 5) {
      suggestions.push({
        priority: "low",
        category: "capacity",
        title: "SmartCache并发度偏低",
        description: `当前动态并发度为${performanceStats.dynamicMaxConcurrency}，可能限制了性能`,
        recommendation: "检查系统资源利用率，考虑提高并发配置",
      });
    }

    this.logger.debug("SmartCache优化建议生成成功", {
      suggestionsCount: suggestions.length,
      highPriority: suggestions.filter((s) => s.priority === "high").length,
    });

    return suggestions;
  }

  /**
   * 创建SmartCache专用仪表板
   */
  async createSmartCacheDashboard() {
    const dashboardConfig = {
      title: "SmartCache性能监控",
      description: "SmartCache性能优化器实时监控面板",
      category: "performance",
      panels: [
        {
          title: "并发控制指标",
          type: "graph",
          metrics: [
            "smart_cache_dynamic_concurrency",
            "smart_cache_concurrency_adjustments",
            "smart_cache_original_concurrency",
          ],
          thresholds: {
            warning: { concurrency_adjustments: 50 },
            critical: {
              concurrency_adjustments: MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE,
            },
          },
        },
        {
          title: "内存压力监控",
          type: "graph",
          metrics: [
            "smart_cache_memory_pressure_events",
            "smart_cache_memory_usage_percent",
            "smart_cache_tasks_cleared",
          ],
          thresholds: {
            warning: { memory_pressure_events: 20 },
            critical: { memory_pressure_events: 50 },
          },
        },
        {
          title: "性能统计",
          type: "stat",
          metrics: [
            "smart_cache_avg_execution_time",
            "smart_cache_total_tasks",
            "smart_cache_current_batch_size",
          ],
          thresholds: {
            warning: { avg_execution_time: 500 },
            critical: {
              avg_execution_time:
                MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS,
            },
          },
        },
        {
          title: "系统资源",
          type: "gauge",
          metrics: [
            "smart_cache_cpu_usage",
            "smart_cache_memory_total_mb",
            "smart_cache_system_load",
          ],
          thresholds: {
            warning: { cpu_usage: 70 },
            critical: { cpu_usage: 90 },
          },
        },
      ],
      refreshInterval: "30s",
      autoRefresh: true,
    };

    const result = await this.createDashboard(
      "smart-cache-monitoring",
      dashboardConfig,
    );

    this.logger.log("SmartCache专用仪表板创建成功", {
      dashboardId: result.dashboardId,
      panelsCount: dashboardConfig.panels.length,
    });

    return result;
  }

  /**
   * 获取SmartCache详细分析报告
   */
  async getSmartCacheAnalysisReport() {
    const [performanceStats, suggestions, systemMetrics] = await Promise.all([
      this.getSmartCachePerformanceStats(),
      this.getSmartCacheOptimizationSuggestions(),
      this.getSmartCacheSystemMetrics(),
    ]);

    // 计算健康评分
    const healthScore = this.calculateSmartCacheHealthScore(
      performanceStats,
      systemMetrics,
    );

    const report = {
      timestamp: new Date().toISOString(),
      healthScore,
      summary: {
        status: this.getSmartCacheStatus(healthScore),
        totalTasks: performanceStats.totalTasks,
        avgExecutionTime: performanceStats.avgExecutionTime,
        concurrencyOptimization: {
          current: performanceStats.dynamicMaxConcurrency,
          original: performanceStats.originalMaxConcurrency,
          adjustments: performanceStats.concurrencyAdjustments,
        },
        memoryManagement: {
          pressureEvents: performanceStats.memoryPressureEvents,
          tasksCleared: performanceStats.tasksCleared,
          currentBatchSize: performanceStats.currentBatchSize,
        },
      },
      performance: {
        concurrencyMetrics: {
          dynamicMaxConcurrency: performanceStats.dynamicMaxConcurrency,
          originalMaxConcurrency: performanceStats.originalMaxConcurrency,
          concurrencyAdjustments: performanceStats.concurrencyAdjustments,
          efficiency: this.calculateConcurrencyEfficiency(performanceStats),
        },
        memoryMetrics: {
          memoryPressureEvents: performanceStats.memoryPressureEvents,
          tasksCleared: performanceStats.tasksCleared,
          currentBatchSize: performanceStats.currentBatchSize,
          memoryUtilization: systemMetrics?.memory?.percentage || 0,
        },
        systemMetrics: systemMetrics || {},
      },
      optimizations: suggestions,
      recommendations: this.generateSmartCacheRecommendations(
        performanceStats,
        systemMetrics,
      ),
      trends: await this.calculateSmartCacheTrends(),
    };

    this.logger.debug("SmartCache分析报告生成成功", {
      healthScore: report.healthScore,
      optimizationsCount: report.optimizations.length,
      recommendationsCount: report.recommendations.length,
    });

    return report;
  }

  /**
   * 获取SmartCache性能统计 (私有方法)
   */
  private async getSmartCachePerformanceStats(): Promise<any> {
    try {
      // 这里应该从SmartCachePerformanceOptimizer获取实际统计数据
      // 由于我们没有直接依赖，这里返回模拟数据
      // 在实际实现中，应该注入SmartCachePerformanceOptimizer或通过事件系统获取数据

      return {
        concurrencyAdjustments: Math.floor(Math.random() * 50),
        memoryPressureEvents: Math.floor(Math.random() * 20),
        tasksCleared: Math.floor(Math.random() * 10),
        avgExecutionTime: Math.random() * 500 + 200,
        totalTasks:
          Math.floor(
            Math.random() *
              (this.configService.get<MonitoringUnifiedLimitsConfig>(
                "monitoringUnifiedLimits",
              )?.systemLimits?.maxBufferSize || 1000),
          ) + 500,
        dynamicMaxConcurrency: Math.floor(Math.random() * 8) + 4,
        originalMaxConcurrency: 10,
        currentBatchSize: Math.floor(Math.random() * 20) + 10,
      };
    } catch (error) {
      this.logger.warn("获取SmartCache性能统计失败，返回默认值", error);
      return {
        concurrencyAdjustments: 0,
        memoryPressureEvents: 0,
        tasksCleared: 0,
        avgExecutionTime: 0,
        totalTasks: 0,
        dynamicMaxConcurrency: 10,
        originalMaxConcurrency: 10,
        currentBatchSize: 10,
      };
    }
  }

  /**
   * 获取SmartCache系统指标 (私有方法)
   */
  private async getSmartCacheSystemMetrics(): Promise<any> {
    try {
      const os = require("os");

      return {
        cpu: {
          usage: os.loadavg()[0] / os.cpus().length,
          cores: os.cpus().length,
          loadAvg: os.loadavg(),
        },
        memory: {
          totalMB: Math.round(os.totalmem() / 1024 / 1024),
          freeMB: Math.round(os.freemem() / 1024 / 1024),
          percentage: (os.totalmem() - os.freemem()) / os.totalmem(),
        },
        system: {
          uptime: os.uptime(),
          platform: os.platform(),
          arch: os.arch(),
        },
      };
    } catch (error) {
      this.logger.warn("获取系统指标失败", error);
      return null;
    }
  }

  /**
   * 计算SmartCache健康评分 (私有方法)
   */
  private calculateSmartCacheHealthScore(
    performanceStats: any,
    systemMetrics: any,
  ): number {
    let score = MONITORING_SYSTEM_LIMITS.FULL_SCORE;

    // 内存压力影响 (最多扣30分)
    if (performanceStats.memoryPressureEvents > 0) {
      score -= Math.min(performanceStats.memoryPressureEvents * 0.6, 30);
    }

    // 执行时间影响 (最多扣25分)
    if (performanceStats.avgExecutionTime > 500) {
      score -= Math.min((performanceStats.avgExecutionTime - 500) / 20, 25);
    }

    // 并发调整频率影响 (最多扣20分)
    if (performanceStats.concurrencyAdjustments > 50) {
      score -= Math.min(
        (performanceStats.concurrencyAdjustments - 50) * 0.2,
        20,
      );
    }

    // 系统资源使用影响 (最多扣15分)
    if (systemMetrics?.memory?.percentage > 0.8) {
      score -= Math.min((systemMetrics.memory.percentage - 0.8) * 75, 15);
    }

    // 任务清理影响 (最多扣10分)
    if (performanceStats.tasksCleared > 5) {
      score -= Math.min(performanceStats.tasksCleared, 10);
    }

    return Math.max(Math.round(score), 0);
  }

  /**
   * 获取SmartCache状态 (私有方法)
   */
  private getSmartCacheStatus(healthScore: number): string {
    if (healthScore >= 90) return "excellent";
    if (healthScore >= 75) return "good";
    if (healthScore >= 60) return "fair";
    if (healthScore >= 40) return "poor";
    return "critical";
  }

  /**
   * 计算并发效率 (私有方法)
   */
  private calculateConcurrencyEfficiency(performanceStats: any): number {
    if (performanceStats.originalMaxConcurrency === 0)
      return MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER;

    const utilizationRate =
      performanceStats.dynamicMaxConcurrency /
      performanceStats.originalMaxConcurrency;
    const adjustmentPenalty = Math.min(
      performanceStats.concurrencyAdjustments /
        MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
      0.2,
    );

    return Math.max(
      utilizationRate * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER -
        adjustmentPenalty * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
      0,
    );
  }

  /**
   * 生成SmartCache优化建议 (私有方法)
   */
  private generateSmartCacheRecommendations(
    performanceStats: any,
    systemMetrics: any,
  ): any[] {
    const recommendations = [];

    // 性能优化建议
    if (
      performanceStats.avgExecutionTime >
      MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS
    ) {
      recommendations.push({
        type: "performance",
        priority: "high",
        title: "优化缓存执行性能",
        description: "平均执行时间超过1秒，建议检查缓存键设计和数据库查询",
        action: "review_cache_design",
      });
    }

    // 内存管理建议
    if (performanceStats.memoryPressureEvents > 20) {
      recommendations.push({
        type: "memory",
        priority: "medium",
        title: "优化内存使用策略",
        description: "内存压力事件频繁，建议调整缓存TTL或增加系统内存",
        action: "optimize_memory_usage",
      });
    }

    // 并发控制建议
    if (
      performanceStats.concurrencyAdjustments >
      MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE
    ) {
      recommendations.push({
        type: "concurrency",
        priority: "medium",
        title: "稳定并发配置",
        description: "并发调整过于频繁，建议分析负载模式并调整基础配置",
        action: "stabilize_concurrency",
      });
    }

    // 系统资源建议
    if (systemMetrics?.cpu?.usage > 0.8) {
      recommendations.push({
        type: "system",
        priority: "high",
        title: "降低CPU使用率",
        description: "CPU使用率过高，建议优化算法或增加CPU资源",
        action: "optimize_cpu_usage",
      });
    }

    return recommendations;
  }

  /**
   * 计算SmartCache趋势 (私有方法)
   */
  private async calculateSmartCacheTrends(): Promise<any> {
    // 这里应该基于历史数据计算趋势
    // 由于是演示，返回模拟趋势数据
    return {
      concurrency: {
        trend: "stable",
        change: Math.random() * 10 - 5, // -5% to +5%
        period: "1h",
      },
      memory: {
        trend: "improving",
        change: Math.random() * -5, // -5% to 0% (improving)
        period: "1h",
      },
      performance: {
        trend: "stable",
        change: Math.random() * 6 - 3, // -3% to +3%
        period: "1h",
      },
    };
  }

  /**
   * 失效缓存
   */
  async invalidateCache(pattern?: string) {
    await this.analyzer.invalidateCache(pattern);

    const result = {
      message: "缓存失效成功",
      pattern: pattern || "all",
      timestamp: new Date().toISOString(),
    };

    this.logger.debug("缓存失效操作完成", { pattern: pattern || "all" });

    return result;
  }

  /**
   * 获取基础健康状态
   */
  async getBasicHealthStatus() {
    try {
      // 基础健康检查，不依赖复杂的分析逻辑
      const result = {
        status: "operational",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        message: "系统运行正常",
      };

      this.logger.debug("基础健康状态获取成功", {
        status: result.status,
        uptime: result.uptime,
      });

      return result;
    } catch (error) {
      this.logger.error("获取基础健康状态失败:", error);
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        message: "系统健康检查异常",
      };
    }
  }

  /**
   * 获取系统仪表板数据
   */
  async getDashboardData() {
    // 并行获取仪表板所需的各种数据
    const [healthScore, performanceAnalysis, trends, suggestions] =
      await Promise.all([
        this.analyzer.getHealthScore(),
        this.analyzer.getPerformanceAnalysis({ includeDetails: false }),
        this.analyzer.calculateTrends("1h"),
        this.analyzer.getOptimizationSuggestions(),
      ]);

    const result = {
      timestamp: new Date().toISOString(),
      healthScore,
      performanceSummary: {
        totalOperations: performanceAnalysis.summary.totalOperations,
        responseTimeMs: performanceAnalysis.summary.responseTimeMs,
        errorRate: performanceAnalysis.summary.errorRate,
        throughput: performanceAnalysis.throughput,
      },
      trendsData: trends,
      criticalIssues: suggestions.filter((s) => s.priority === "high"),
      suggestions: suggestions.slice(0, 5), // 只返回前5个建议
    };

    this.logger.debug("仪表板数据获取成功", {
      healthScore,
      totalOperations: result.performanceSummary.totalOperations,
      criticalIssues: result.criticalIssues.length,
    });

    return result;
  }

  /**
   * 注册自定义监控指标 (Data Mapper 组件支持)
   */
  async registerCustomMetrics(componentName: string, config: any) {
    this.logger.log(`注册自定义监控指标: ${componentName}`, {
      metricsCount: Object.keys(config.dataMapperMetrics || {}).length,
      alertRulesCount: config.alertingRules?.criticalErrors?.length || 0,
    });

    // 存储组件配置到内存 (实际应用可能需要持久化存储)
    if (!this.customMetricsConfig) {
      this.customMetricsConfig = new Map();
    }

    this.customMetricsConfig.set(componentName, {
      config,
      registeredAt: new Date(),
      enabled: true,
    });

    this.logger.log(`✅ 自定义监控指标注册成功: ${componentName}`);

    return {
      componentName,
      status: "registered",
      timestamp: new Date().toISOString(),
      metricsRegistered: true,
    };
  }

  /**
   * 获取指定组件的监控指标
   */
  async getMetrics(componentName: string) {
    // 参数验证
    if (
      !componentName ||
      typeof componentName !== "string" ||
      componentName.trim().length === 0
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Component name cannot be empty and must be a valid string",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'getCustomComponentMetrics',
        component: ComponentIdentifier.MONITORING,
        context: {
          componentName,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    // 标准化组件名称
    const normalizedComponentName = componentName.trim();

    if (!this.customMetricsConfig?.has(normalizedComponentName)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Monitoring metrics not found for component: ${normalizedComponentName}`,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'getCustomComponentMetrics',
        component: ComponentIdentifier.MONITORING,
        context: {
          componentName: normalizedComponentName,
          monitoringErrorCode: MONITORING_ERROR_CODES.DATA_UNAVAILABLE
        }
      });
    }

    const componentConfig = this.customMetricsConfig.get(
      normalizedComponentName,
    );

    // 模拟获取实际指标数据 (实际应用需要从监控后端获取)
    const mockMetrics = this.generateMockMetricsData(
      normalizedComponentName,
      componentConfig.config,
    );

    this.logger.debug(`获取组件监控指标: ${normalizedComponentName}`, {
      metricsCount: mockMetrics.length,
    });

    return mockMetrics;
  }

  /**
   * 创建监控仪表盘
   */
  async createDashboard(dashboardId: string, dashboardConfig: any) {
    // 参数验证
    if (
      !dashboardId ||
      typeof dashboardId !== "string" ||
      dashboardId.trim().length === 0
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Dashboard ID cannot be empty and must be a valid string",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'addDashboard',
        component: ComponentIdentifier.MONITORING,
        context: {
          dashboardId,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    if (!dashboardConfig || typeof dashboardConfig !== "object") {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Dashboard configuration cannot be empty and must be a valid object",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'addDashboard',
        component: ComponentIdentifier.MONITORING,
        context: {
          dashboardConfig,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    if (
      !dashboardConfig.title ||
      typeof dashboardConfig.title !== "string" ||
      dashboardConfig.title.trim().length === 0
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Dashboard title cannot be empty and must be a valid string",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'addDashboard',
        component: ComponentIdentifier.MONITORING,
        context: {
          dashboardTitle: dashboardConfig.title,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    // 标准化参数
    const normalizedDashboardId = dashboardId.trim();

    // 检查是否已存在
    if (this.dashboardConfigs?.has(normalizedDashboardId)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Dashboard ${normalizedDashboardId} already exists`,
        errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
        operation: 'addDashboard',
        component: ComponentIdentifier.MONITORING,
        context: {
          dashboardId: normalizedDashboardId,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    this.logger.log(`创建监控仪表盘: ${normalizedDashboardId}`, {
      panelsCount: dashboardConfig.panels?.length || 0,
      title: dashboardConfig.title,
    });

    // 存储仪表盘配置
    if (!this.dashboardConfigs) {
      this.dashboardConfigs = new Map();
    }

    this.dashboardConfigs.set(normalizedDashboardId, {
      config: dashboardConfig,
      createdAt: new Date(),
      enabled: true,
      viewCount: 0,
    });

    this.logger.log(`✅ 监控仪表盘创建成功: ${normalizedDashboardId}`);

    return {
      dashboardId: normalizedDashboardId,
      title: dashboardConfig.title,
      status: "created",
      timestamp: new Date().toISOString(),
      url: `/monitoring/dashboard/${normalizedDashboardId}`,
    };
  }

  /**
   * 获取仪表盘数据
   */
  async getDashboard(dashboardId: string) {
    if (!this.dashboardConfigs?.has(dashboardId)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Dashboard ${dashboardId} not found`,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'getDashboard',
        component: ComponentIdentifier.MONITORING,
        context: {
          dashboardId,
          monitoringErrorCode: MONITORING_ERROR_CODES.DATA_UNAVAILABLE
        }
      });
    }

    const dashboard = this.dashboardConfigs.get(dashboardId);

    // 增加访问计数
    dashboard.viewCount += 1;

    // 生成仪表盘实时数据
    const dashboardData = await this.generateDashboardData(
      dashboardId,
      dashboard.config,
    );

    this.logger.debug("Presenter: 获取仪表盘数据成功", {
      component: "PresenterService",
      operation: "getDashboard",
      dashboardId,
      panelsCount: dashboardData.panels?.length || 0,
      viewCount: dashboard.viewCount,
      success: true,
    });

    return {
      ...dashboardData,
      metadata: {
        dashboardId,
        title: dashboard.config.title,
        createdAt: dashboard.createdAt,
        lastViewedAt: new Date(),
        viewCount: dashboard.viewCount,
      },
    };
  }

  // 私有成员变量声明
  private customMetricsConfig?: Map<string, any>;
  private dashboardConfigs?: Map<string, any>;

  /**
   * 生成模拟指标数据 (私有方法)
   */
  private generateMockMetricsData(componentName: string, config: any): any[] {
    const now = Date.now();
    const metrics = [];

    if (componentName === "data-mapper" && config.dataMapperMetrics) {
      // 数据库查询指标
      metrics.push({
        name: "data_mapper_database_query_duration",
        value: Math.random() * 200 + 100, // 100-300ms
        unit: "ms",
        timestamp: now,
        labels: {
          service: "FlexibleMappingRuleService",
          operation: "updateRuleStats",
        },
      });

      metrics.push({
        name: "data_mapper_database_query_success_rate",
        value: Math.random() * 5 + 95, // 95-100%
        unit: "%",
        timestamp: now,
        labels: { service: "FlexibleMappingRuleService" },
      });

      // 缓存操作指标
      metrics.push({
        name: "data_mapper_cache_operation_duration",
        value: Math.random() * 500 + 200, // 200-700ms
        unit: "ms",
        timestamp: now,
        labels: { service: "DataMapperCacheService", operation: "scanKeys" },
      });

      metrics.push({
        name: "data_mapper_cache_hit_rate",
        value: Math.random() * 10 + 85, // 85-95%
        unit: "%",
        timestamp: now,
        labels: { service: "DataMapperCacheService" },
      });

      // 业务逻辑指标
      metrics.push({
        name: "data_mapper_mapping_success_rate",
        value: Math.random() * 3 + 97, // 97-100%
        unit: "%",
        timestamp: now,
        labels: { service: "DataMapperService" },
      });

      // 任务限流器指标
      metrics.push({
        name: "data_mapper_task_limiter_pending_count",
        value: Math.floor(Math.random() * 20), // 0-19
        unit: "count",
        timestamp: now,
        labels: { service: "AsyncTaskLimiter" },
      });
    }

    return metrics;
  }

  /**
   * 生成仪表盘数据 (私有方法)
   */
  private async generateDashboardData(
    dashboardId: string,
    config: any,
  ): Promise<any> {
    const panels = [];

    if (config.panels) {
      for (const panelConfig of config.panels) {
        const panelData = {
          title: panelConfig.title,
          type: panelConfig.type,
          data: this.generatePanelData(panelConfig),
          thresholds: panelConfig.thresholds,
          lastUpdated: new Date().toISOString(),
        };
        panels.push(panelData);
      }
    }

    return {
      title: config.title,
      panels,
      refreshedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成面板数据 (私有方法)
   */
  private generatePanelData(panelConfig: any): any {
    const mockData = [];
    const now = Date.now();

    // 生成最近1小时的模拟数据点
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - i * 60000; // 每分钟一个数据点

      panelConfig.metrics.forEach((metricName: string) => {
        let value;

        // 根据指标类型生成不同范围的模拟数据
        if (metricName.includes("duration") || metricName.includes("time")) {
          value = Math.random() * 500 + 100; // 100-600ms
        } else if (
          metricName.includes("rate") ||
          metricName.includes("success")
        ) {
          value = Math.random() * 10 + 90; // 90-100%
        } else if (metricName.includes("count")) {
          value = Math.floor(Math.random() * 50); // 0-49
        } else {
          value = Math.random() * 100; // 0-100
        }

        mockData.push({
          metric: metricName,
          timestamp,
          value,
        });
      });
    }

    return mockData;
  }
}
