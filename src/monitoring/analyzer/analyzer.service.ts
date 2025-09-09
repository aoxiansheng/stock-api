import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "../../app/config/logger.config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { MONITORING_BUSINESS } from '../constants/business';
import {
  IAnalyzer,
  AnalysisOptions,
  PerformanceAnalysisDto,
  HealthReportDto,
  TrendsDto,
  EndpointMetricsDto,
  DatabaseMetricsDto,
  CacheMetricsDto,
  SuggestionDto,
} from "../contracts/interfaces/analyzer.interface";
import { SYSTEM_STATUS_EVENTS } from "../contracts/events/system-status.events";
import type {
  DataRequestEvent,
  DataResponseEvent,
} from "../contracts/events/system-status.events";
import { AnalyzerMetricsCalculator } from "./analyzer-metrics.service";
import { AnalyzerHealthScoreCalculator } from "./analyzer-score.service";
import { HealthAnalyzerService } from "./analyzer-health.service";
import { TrendAnalyzerService } from "./analyzer-trend.service";
import { MonitoringCacheService } from "../cache/monitoring-cache.service";
import { MONITORING_SYSTEM_LIMITS, MonitoringSystemLimitUtils } from "../constants/config/monitoring-system.constants";
import { v4 as uuidv4 } from "uuid";

/**
 * 主分析器服务
 * 职责：作为分析层的统一入口，集成所有分析功能，实现IAnalyzer接口
 * 协调各个专业分析服务，统一缓存管理和事件发布
 */
@Injectable()
export class AnalyzerService
  implements IAnalyzer, OnModuleInit, OnModuleDestroy
{
  private readonly logger = createLogger(AnalyzerService.name);
  private eventHandlers = new Map<string, Function>();

  // 事件驱动数据请求管理
  private dataRequestPromises = new Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private readonly requestTimeoutMs = 5000; // 5秒超时

  constructor(
    private readonly metricsCalculator: AnalyzerMetricsCalculator,
    private readonly healthScoreCalculator: AnalyzerHealthScoreCalculator,
    private readonly healthAnalyzer: HealthAnalyzerService,
    private readonly trendAnalyzer: TrendAnalyzerService,
    private readonly monitoringCache: MonitoringCacheService,
    private readonly eventBus: EventEmitter2,
  ) {
    this.logger.log("AnalyzerService initialized - 事件驱动分析器服务已启动");
  }

  /**
   * 模块初始化时设置事件监听器
   */
  onModuleInit(): void {
    this.setupEventListeners();
    this.logger.log("事件监听器已注册");
  }

  /**
   * 模块销毁时清理事件监听器，防止内存泄漏
   */
  onModuleDestroy(): void {
    this.eventHandlers.forEach((handler, event) => {
      this.eventBus.off(event, handler as any);
    });
    this.eventHandlers.clear();

    // 清理待处理的数据请求
    this.dataRequestPromises.forEach(({ reject, timeout }, requestId) => {
      clearTimeout(timeout);
      reject(new Error("AnalyzerService shutting down"));
    });
    this.dataRequestPromises.clear();

    this.logger.log("事件监听器已清理");
  }

  /**
   * 处理数据响应事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.DATA_RESPONSE)
  handleDataResponse(responseEvent: DataResponseEvent): void {
    const { requestId, data } = responseEvent;
    const pendingRequest = this.dataRequestPromises.get(requestId);

    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.dataRequestPromises.delete(requestId);
      pendingRequest.resolve(data);

      this.logger.debug("数据响应处理完成", {
        requestId,
        dataSize: responseEvent.dataSize,
      });
    } else {
      this.logger.warn("收到未知请求ID的数据响应", { requestId });
    }
  }

  /**
   * 处理数据不可用事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.DATA_NOT_AVAILABLE)
  handleDataNotAvailable(errorEvent: any): void {
    const { requestId, metadata } = errorEvent;
    const pendingRequest = this.dataRequestPromises.get(requestId);

    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.dataRequestPromises.delete(requestId);
      pendingRequest.reject(new Error(metadata?.error || "数据不可用"));

      this.logger.debug("数据不可用事件处理完成", { requestId });
    }
  }

  /**
   * 事件驱动的数据请求方法
   * 替代原来的直接调用collectorService.getRawMetrics()
   */
  private async requestRawMetrics(
    startTime?: Date,
    endTime?: Date,
  ): Promise<any> {
    const requestId = `analyzer_${Date.now()}_${uuidv4().substring(0, 8)}`;

    return new Promise((resolve, reject) => {
      // 设置请求超时
      const timeout = setTimeout(() => {
        this.dataRequestPromises.delete(requestId);
        reject(new Error("数据请求超时"));
      }, this.requestTimeoutMs);

      // 存储请求Promise
      this.dataRequestPromises.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      // 发射数据请求事件
      const requestEvent: DataRequestEvent = {
        timestamp: new Date(),
        source: "analyzer",
        requestId,
        requestType: "raw_metrics",
        startTime,
        endTime,
        metadata: {
          requester: "AnalyzerService",
        },
      };

      this.eventBus.emit(SYSTEM_STATUS_EVENTS.DATA_REQUEST, requestEvent);

      this.logger.debug("已发送数据请求", {
        requestId,
        requestType: "raw_metrics",
      });
    });
  }

  /**
   * 获取性能分析数据
   */
  async getPerformanceAnalysis(
    options?: AnalysisOptions,
  ): Promise<PerformanceAnalysisDto> {
    try {
      this.logger.debug("开始性能分析", { options });

      // 获取原始指标数据
      const rawMetrics = await this.requestRawMetrics(
        options?.startTime,
        options?.endTime,
      );

      // 计算性能摘要
      const summary =
        this.metricsCalculator.calculatePerformanceSummary(rawMetrics);
      const responseTimeMs =
        this.metricsCalculator.calculateAverageResponseTime(rawMetrics);
      const errorRate = this.metricsCalculator.calculateErrorRate(rawMetrics);
      const throughput = this.metricsCalculator.calculateThroughput(rawMetrics);

      // 计算健康分
      const healthScore =
        this.healthScoreCalculator.calculateOverallHealthScore(rawMetrics);

      // 根据选项决定是否包含详细信息
      let trends: TrendsDto | undefined;
      let endpointMetrics: EndpointMetricsDto[] | undefined;
      let databaseMetrics: DatabaseMetricsDto | undefined;
      let cacheMetrics: CacheMetricsDto | undefined;

      if (options?.includeDetails !== false) {
        trends = await this.calculateTrends("1h");
        endpointMetrics =
          this.metricsCalculator.calculateEndpointMetrics(rawMetrics);
        databaseMetrics =
          this.metricsCalculator.calculateDatabaseMetrics(rawMetrics);
        cacheMetrics = this.metricsCalculator.calculateCacheMetrics(rawMetrics);
      }

      const analysis: PerformanceAnalysisDto = {
        timestamp: new Date(),
        summary,
        responseTimeMs: responseTimeMs,
        errorRate,
        throughput,
        healthScore,
        trends,
        endpointMetrics,
        databaseMetrics,
        cacheMetrics,
      };

      // 发射分析完成事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED, {
        timestamp: new Date(),
        source: "analyzer",
        metadata: {
          type: "performance_analysis",
          healthScore,
          dataPoints: rawMetrics.requests?.length || 0,
          includeDetails: options?.includeDetails !== false,
        },
      });

      this.logger.debug("性能分析完成", {
        healthScore,
        totalOperations: summary.totalOperations,
        responseTimeMs,
        errorRate,
      });

      return analysis;
    } catch (error) {
      this.logger.error("性能分析失败", error.stack);

      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR, {
        timestamp: new Date(),
        source: "analyzer",
        metadata: { error: error.message, operation: "getPerformanceAnalysis" },
      });

      throw error;
    }
  }

  /**
   * 获取健康评分
   */
  async getHealthScore(): Promise<number> {
    try {
      // 使用getOrSet热点路径，自动获得分布式锁与缓存回填
      return await this.monitoringCache.getOrSetHealthData<number>(
        "score",
        async () => {
          const rawMetrics = await this.requestRawMetrics();
          const healthScore =
            this.healthScoreCalculator.calculateOverallHealthScore(rawMetrics);

          // 发射健康分更新事件
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED, {
            timestamp: new Date(),
            source: "analyzer",
            metadata: {
              healthScore,
              previousScore: 50, // 简化实现
              trend:
                healthScore >= 70
                  ? "healthy"
                  : healthScore >= 40
                    ? "warning"
                    : "critical",
            },
          });

          return healthScore;
        },
      );
    } catch (error) {
      this.logger.error("健康分获取失败", error.stack);
      return 50; // 默认中等健康分
    }
  }

  /**
   * 获取健康报告
   */
  async getHealthReport(): Promise<HealthReportDto> {
    try {
      const rawMetrics = await this.requestRawMetrics();
      return await this.healthAnalyzer.generateHealthReport(rawMetrics);
    } catch (error) {
      this.logger.error("健康报告获取失败", error.stack);
      throw error;
    }
  }

  /**
   * 计算趋势分析
   */
  async calculateTrends(period: string): Promise<TrendsDto> {
    try {
      const cacheKey = `trends_${period}`;

      // 使用getOrSet热点路径优化
      return await this.monitoringCache.getOrSetTrendData<TrendsDto>(
        cacheKey,
        async () => {
          const currentMetrics = await this.requestRawMetrics();

          // 获取历史数据作为对比基线（简化实现）
          const previousTime = new Date(
            Date.now() - this.parsePeriodToMs(period),
          );
          const previousMetrics = await this.requestRawMetrics(
            previousTime,
            new Date(previousTime.getTime() + 60000),
          );

          return await this.trendAnalyzer.calculatePerformanceTrends(
            currentMetrics,
            previousMetrics.requests?.length ? previousMetrics : undefined,
            period,
          );
        },
      );
    } catch (error) {
      this.logger.error("趋势分析失败", error.stack);
      return this.getDefaultTrends();
    }
  }

  /**
   * 获取端点指标
   */
  async getEndpointMetrics(limit?: number): Promise<EndpointMetricsDto[]> {
    try {
      const rawMetrics = await this.requestRawMetrics();
      const endpointMetrics =
        this.metricsCalculator.calculateEndpointMetrics(rawMetrics);

      return limit ? endpointMetrics.slice(0, limit) : endpointMetrics;
    } catch (error) {
      this.logger.error("端点指标获取失败", error.stack);
      return [];
    }
  }

  /**
   * 获取数据库指标
   */
  async getDatabaseMetrics(): Promise<DatabaseMetricsDto> {
    try {
      const rawMetrics = await this.requestRawMetrics();
      return this.metricsCalculator.calculateDatabaseMetrics(rawMetrics);
    } catch (error) {
      this.logger.error("数据库指标获取失败", error.stack);
      return {
        totalOperations: 0,
        responseTimeMs: 0,
        slowQueries: 0,
        failedOperations: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * 获取缓存指标
   */
  async getCacheMetrics(): Promise<CacheMetricsDto> {
    try {
      const rawMetrics = await this.requestRawMetrics();
      return this.metricsCalculator.calculateCacheMetrics(rawMetrics);
    } catch (error) {
      this.logger.error("缓存指标获取失败", error.stack);
      return {
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        responseTimeMs: 0,
      };
    }
  }

  /**
   * 获取优化建议
   */
  async getOptimizationSuggestions(): Promise<SuggestionDto[]> {
    try {
      this.logger.debug("生成优化建议");

      // 检查缓存
      const cacheKey = "optimization_suggestions";
      const cachedSuggestions =
        await this.monitoringCache.getPerformanceData<SuggestionDto[]>(
          cacheKey,
        );

      if (cachedSuggestions) {
        return cachedSuggestions;
      }

      const rawMetrics = await this.requestRawMetrics();
      const healthReport =
        await this.healthAnalyzer.generateHealthReport(rawMetrics);

      const suggestions: SuggestionDto[] = [];

      // 基于健康报告生成建议
      if (healthReport.recommendations) {
        healthReport.recommendations.forEach((recommendation, index) => {
          suggestions.push({
            category: this.categorizeRecommendation(recommendation),
            priority: this.prioritizeRecommendation(
              recommendation,
              healthReport.overall.healthScore,
            ),
            title: `建议 ${index + 1}`,
            description: recommendation,
            action: this.generateAction(recommendation),
            impact: this.estimateImpact(
              recommendation,
              healthReport.overall.healthScore,
            ),
          });
        });
      }

      // 基于性能指标生成额外建议
      const performanceSuggestions =
        await this.generatePerformanceSuggestions(rawMetrics);
      suggestions.push(...performanceSuggestions);

      // 缓存结果
      await this.monitoringCache.setPerformanceData(cacheKey, suggestions);

      this.logger.debug(`优化建议生成完成: ${suggestions.length} 条建议`);
      return suggestions;
    } catch (error) {
      this.logger.error("优化建议生成失败", error.stack);
      return [];
    }
  }

  /**
   * 缓存失效
   */
  async invalidateCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // 根据模式选择性失效缓存
        if (pattern.includes("health")) {
          await this.monitoringCache.invalidateHealthCache();
        } else if (pattern.includes("trend")) {
          await this.monitoringCache.invalidateTrendCache();
        } else if (pattern.includes("performance")) {
          await this.monitoringCache.invalidatePerformanceCache();
        } else {
          // 其他模式失效所有缓存
          await this.monitoringCache.invalidateAllMonitoringCache();
        }
      } else {
        // 失效所有监控缓存
        await this.monitoringCache.invalidateAllMonitoringCache();
      }

      // 同时失效专业分析服务的缓存
      await this.healthAnalyzer.invalidateHealthCache();
      await this.trendAnalyzer.invalidateTrendsCache();

      // 发射缓存失效事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED, {
        timestamp: new Date(),
        source: "analyzer",
        metadata: { pattern: pattern || "all", reason: "manual_invalidation" },
      });

      this.logger.debug(`缓存失效完成: ${pattern || "all"}`);
    } catch (error) {
      this.logger.error("缓存失效失败", error.stack);
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{
    hitRate: number;
    totalOperations: number;
    totalHits: number;
    totalMisses: number;
  }> {
    try {
      const healthCheck = await this.monitoringCache.healthCheck();
      const stats = this.monitoringCache.getMetrics();

      // 从实际统计中获取命中率
      const totalRequests = stats.operations.total;
      const totalHits = stats.operations.hits;
      const totalMisses = stats.operations.misses;
      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

      return {
        hitRate: Math.round(hitRate * MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR) / MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR,
        totalOperations: totalRequests,
        totalHits,
        totalMisses,
      };
    } catch (error) {
      this.logger.error("缓存统计获取失败", error.stack);
      return {
        hitRate: 0,
        totalOperations: 0,
        totalHits: 0,
        totalMisses: 0,
      };
    }
  }

  /**
   * 设置事件监听器，将处理器存储到 Map 中以便后续清理
   */
  private setupEventListeners(): void {
    // 监听数据收集完成事件
    const collectionCompletedHandler = async (data) => {
      this.logger.debug("数据收集完成，触发分析流程", data);

      // 可以在这里触发自动分析
      try {
        await this.getHealthScore();
      } catch (error) {
        this.logger.error("自动健康分析失败", error.stack);
      }
    };

    this.eventBus.on(
      SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED,
      collectionCompletedHandler,
    );
    this.eventHandlers.set(
      SYSTEM_STATUS_EVENTS.COLLECTION_COMPLETED,
      collectionCompletedHandler,
    );

    // 监听数据收集错误事件
    const collectionErrorHandler = async (data) => {
      this.logger.warn("数据收集错误，可能影响分析准确性", data);
    };

    this.eventBus.on(
      SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
      collectionErrorHandler,
    );
    this.eventHandlers.set(
      SYSTEM_STATUS_EVENTS.COLLECTION_ERROR,
      collectionErrorHandler,
    );

    this.logger.log(
      `分析器事件监听器已设置，共 ${this.eventHandlers.size} 个监听器`,
    );
  }

  /**
   * 解析周期字符串为毫秒
   */
  private parsePeriodToMs(period: string): number {
    const match = period.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // 默认1小时

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return MonitoringSystemLimitUtils.secondsToMs(value);
      case "m":
        return value * MONITORING_SYSTEM_LIMITS.MINUTE_IN_MS;
      case "h":
        return value * MONITORING_SYSTEM_LIMITS.HOUR_IN_MS;
      case "d":
        return value * MONITORING_SYSTEM_LIMITS.DAY_IN_MS;
      default:
        return 3600000;
    }
  }

  /**
   * 获取默认趋势
   */
  private getDefaultTrends(): TrendsDto {
    return {
      responseTimeMs: {
        current: 0,
        previous: 0,
        trend: "stable",
        changePercentage: 0,
      },
      errorRate: {
        current: 0,
        previous: 0,
        trend: "stable",
        changePercentage: 0,
      },
      throughput: {
        current: 0,
        previous: 0,
        trend: "stable",
        changePercentage: 0,
      },
    };
  }

  /**
   * 分类建议
   */
  private categorizeRecommendation(
    recommendation: string,
  ): "performance" | "security" | "resource" | "optimization" {
    if (
      recommendation.includes("响应时间") ||
      recommendation.includes("性能")
    ) {
      return "performance";
    } else if (
      recommendation.includes("内存") ||
      recommendation.includes("CPU") ||
      recommendation.includes("资源")
    ) {
      return "resource";
    } else if (
      recommendation.includes("安全") ||
      recommendation.includes("权限")
    ) {
      return "security";
    } else {
      return "optimization";
    }
  }

  /**
   * 优先级建议
   */
  private prioritizeRecommendation(
    recommendation: string,
    healthScore: number,
  ): "high" | "medium" | "low" {
    if (
      healthScore < 40 ||
      recommendation.includes("严重") ||
      recommendation.includes("关键")
    ) {
      return "high";
    } else if (
      healthScore < 70 ||
      recommendation.includes("重要") ||
      recommendation.includes("建议")
    ) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * 生成行动建议
   */
  private generateAction(recommendation: string): string {
    if (recommendation.includes("响应时间")) {
      return "优化查询逻辑，添加索引，或增加缓存";
    } else if (recommendation.includes("错误率")) {
      return "检查错误日志，修复代码问题，改进错误处理";
    } else if (recommendation.includes("CPU")) {
      return "优化计算密集型操作，考虑增加服务器资源";
    } else if (recommendation.includes("内存")) {
      return "检查内存泄漏，优化内存使用，增加内存容量";
    } else if (recommendation.includes("缓存")) {
      return "优化缓存策略，调整TTL设置，增加缓存容量";
    } else {
      return "详细分析问题原因，制定针对性解决方案";
    }
  }

  /**
   * 估算影响
   */
  private estimateImpact(recommendation: string, healthScore: number): string {
    const severityMultiplier =
      healthScore < 40 ? "高" : healthScore < 70 ? "中" : "低";

    if (recommendation.includes("响应时间")) {
      return `${severityMultiplier}影响 - 改善用户体验，提升系统性能`;
    } else if (recommendation.includes("错误率")) {
      return `${severityMultiplier}影响 - 提高系统稳定性，减少故障`;
    } else if (recommendation.includes("资源")) {
      return `${severityMultiplier}影响 - 提升系统容量，避免资源瓶颈`;
    } else {
      return `${severityMultiplier}影响 - 整体系统优化`;
    }
  }

  /**
   * 生成性能建议
   */
  private async generatePerformanceSuggestions(
    rawMetrics: any,
  ): Promise<SuggestionDto[]> {
    const suggestions: SuggestionDto[] = [];

    try {
      const avgResponseTime =
        this.metricsCalculator.calculateAverageResponseTime(rawMetrics);
      const errorRate = this.metricsCalculator.calculateErrorRate(rawMetrics);
      const throughput = this.metricsCalculator.calculateThroughput(rawMetrics);

      // 响应时间建议
      if (MonitoringSystemLimitUtils.isSlowRequest(avgResponseTime)) {
        suggestions.push({
          category: "performance",
          priority: avgResponseTime > 2000 ? "high" : "medium",
          title: "响应时间优化",
          description: `平均响应时间${avgResponseTime}ms，建议优化`,
          action: "检查慢查询，优化数据库索引，增加缓存",
          impact: "显著提升用户体验和系统性能",
        });
      }

      // 错误率建议
      if (errorRate > MONITORING_BUSINESS.ERROR_THRESHOLDS.ACCEPTABLE_RATE) {
        suggestions.push({
          category: "performance",
          priority: "high",
          title: "错误率过高",
          description: `系统错误率${(errorRate * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER).toFixed(2)}%，需要关注`,
          action: "分析错误日志，修复代码缺陷，改进异常处理",
          impact: "提高系统稳定性和可靠性",
        });
      }

      // 吞吐量建议
      if (throughput < 10) {
        suggestions.push({
          category: "optimization",
          priority: "medium",
          title: "吞吐量优化",
          description: `系统吞吐量${throughput}/min较低，可能存在性能瓶颈`,
          action: "分析性能瓶颈，优化业务逻辑，考虑水平扩展",
          impact: "提升系统处理能力和并发性能",
        });
      }
    } catch (error) {
      this.logger.error("性能建议生成失败", error.stack);
    }

    return suggestions;
  }
}
