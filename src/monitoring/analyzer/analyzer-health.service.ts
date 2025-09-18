import { Injectable, Inject } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RawMetricsDto } from "../contracts/interfaces/collector.interface";
import { HealthReportDto } from "../contracts/interfaces/analyzer.interface";
import { SYSTEM_STATUS_EVENTS } from "../contracts/events/system-status.events";
import { AnalyzerHealthScoreCalculator } from "./analyzer-score.service";
import { CacheService } from "@cache/services/cache.service";
import { MonitoringCacheKeys } from "../utils/monitoring-cache-keys";
import { MonitoringUnifiedTtl } from "../config/unified/monitoring-unified-ttl.config";
import { MONITORING_HEALTH_STATUS } from "../constants";
import type { ExtendedHealthStatus } from "../constants/status/monitoring-status.constants";
import { MONITORING_SYSTEM_LIMITS } from "../constants/config/monitoring-system.constants";
import type { ConfigType } from "@nestjs/config";

/**
 * 健康分析服务
 * 职责：专门处理系统健康分析，包括健康分计算、状态评估、建议生成
 */
@Injectable()
export class HealthAnalyzerService {
  private readonly logger = createLogger(HealthAnalyzerService.name);

  constructor(
    private readonly healthScoreCalculator: AnalyzerHealthScoreCalculator,
    private readonly cacheService: CacheService, // 替换为通用缓存服务
    private readonly eventBus: EventEmitter2,
    @Inject(MonitoringUnifiedTtl.KEY)
    private readonly ttlConfig: ConfigType<typeof MonitoringUnifiedTtl>,
  ) {
    this.logger.log("HealthAnalyzerService initialized - 健康分析服务已启动");
  }

  /**
   * 生成健康报告
   */
  async generateHealthReport(
    rawMetrics: RawMetricsDto,
  ): Promise<HealthReportDto> {
    try {
      this.logger.debug("HealthAnalyzer: 开始生成健康报告", {
        component: "HealthAnalyzerService",
        operation: "generateHealthReport",
        success: true,
      });

      // 使用getOrSet热点路径优化（自动处理分布式锁和缓存回填）
      const cacheKey = MonitoringCacheKeys.health(
        this.buildCacheKey("report", rawMetrics),
      );

      const healthReport =
        await this.cacheService.safeGetOrSet<HealthReportDto>(
          cacheKey,
          async () => {
            // 缓存未命中，重新计算健康报告
            this.logger.debug("HealthAnalyzer: 健康报告缓存未命中，重新生成", {
              component: "HealthAnalyzerService",
              operation: "generateHealthReport",
              cacheKey,
              success: true,
            });

            // 计算健康分
            const healthScore =
              this.healthScoreCalculator.calculateOverallHealthScore(
                rawMetrics,
              );
            const healthGrade =
              this.healthScoreCalculator.getHealthGrade(healthScore);
            const healthStatus =
              this.healthScoreCalculator.getHealthStatus(healthScore);

            // 计算各组件健康分
            const componentScores = {
              api: this.healthScoreCalculator.calculateApiHealthScore(
                rawMetrics,
              ),
              database:
                this.healthScoreCalculator.calculateDatabaseHealthScore(
                  rawMetrics,
                ),
              cache:
                this.healthScoreCalculator.calculateCacheHealthScore(
                  rawMetrics,
                ),
              system:
                this.healthScoreCalculator.calculateSystemHealthScore(
                  rawMetrics,
                ),
            };

            // 生成健康建议
            const recommendations =
              this.healthScoreCalculator.generateHealthRecommendations(
                rawMetrics,
              );

            // 获取具体组件指标
            const requests = rawMetrics.requests || [];
            const dbOps = rawMetrics.database || [];
            const cacheOps = rawMetrics.cache || [];
            const system = rawMetrics.system;

            // 计算详细组件指标
            const avgResponseTime =
              requests.length > 0
                ? requests.reduce(
                    (sum, r) => sum + (r.responseTimeMs || 0),
                    0,
                  ) / requests.length
                : 0;
            const errorRate =
              requests.length > 0
                ? requests.filter(
                    (r) =>
                      r.statusCode >=
                      MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD,
                  ).length / requests.length
                : 0;

            const avgQueryTime =
              dbOps.length > 0
                ? dbOps.reduce((sum, op) => sum + op.responseTimeMs, 0) /
                  dbOps.length
                : 0;
            const dbFailureRate =
              dbOps.length > 0
                ? dbOps.filter((op) => !op.success).length / dbOps.length
                : 0;

            const cacheHitRate =
              cacheOps.length > 0
                ? cacheOps.filter((op) => op.hit).length / cacheOps.length
                : 0;
            const cacheAvgResponseTime =
              cacheOps.length > 0
                ? cacheOps.reduce((sum, op) => sum + op.responseTimeMs, 0) /
                  cacheOps.length
                : 0;

            // 构建健康报告
            const report: HealthReportDto = {
              overall: {
                healthScore: healthScore,
                status: healthStatus,
                timestamp: new Date(),
              },
              components: {
                api: {
                  healthScore: componentScores.api,
                  responseTimeMs: Math.round(avgResponseTime),
                  errorRate: Math.round(errorRate * 10000) / 10000,
                },
                database: {
                  healthScore: componentScores.database,
                  responseTimeMs: Math.round(avgQueryTime),
                  errorRate: Math.round(dbFailureRate * 10000) / 10000,
                },
                cache: {
                  healthScore: componentScores.cache,
                  hitRate: Math.round(cacheHitRate * 10000) / 10000,
                  responseTimeMs: Math.round(cacheAvgResponseTime),
                },
                system: {
                  healthScore: componentScores.system,
                  memoryUsage: system?.memory.percentage || 0,
                  cpuUsage: system?.cpu.usage || 0,
                },
              },
              recommendations,
            };

            // 发射分析完成事件
            this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED, {
              timestamp: new Date(),
              source: "health-analyzer",
              metadata: {
                type: "health_analysis",
                healthScore,
                healthStatus,
                recommendationsCount: report.recommendations?.length || 0,
              },
            });

            // 如果健康分过低，发射警告事件
            if (healthScore < 50) {
              this.eventBus.emit(SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED, {
                timestamp: new Date(),
                source: "health-analyzer",
                metadata: {
                  healthScore,
                  previousScore: 50, // 简化实现，实际应该记录历史分数
                  trend: MONITORING_HEALTH_STATUS.UNHEALTHY,
                  recommendations: report.recommendations,
                },
              });
            }

            this.logger.debug("HealthAnalyzer: 健康报告生成完成", {
              component: "HealthAnalyzerService",
              operation: "generateHealthReport",
              healthScore,
              healthStatus,
              recommendationsCount: report.recommendations?.length || 0,
              success: true,
            });
            return report;
          },
          { ttl: this.ttlConfig.health },
        );

      // 发射缓存命中或回填完成事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_HIT, {
        timestamp: new Date(),
        source: "health-analyzer",
        metadata: { cacheKey, type: "health_report" },
      });

      return healthReport;
    } catch (error) {
      this.logger.error("健康报告生成失败", error.stack);

      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR, {
        timestamp: new Date(),
        source: "health-analyzer",
        metadata: { error: error.message, operation: "generateHealthReport" },
      });

      // 返回默认健康报告
      return this.getDefaultHealthReport();
    }
  }

  /**
   * 快速健康检查
   */
  async quickHealthCheck(rawMetrics: RawMetricsDto): Promise<{
    isHealthy: boolean;
    healthScore: number;
    status: ExtendedHealthStatus;
    criticalIssues: string[];
  }> {
    try {
      const healthScore =
        this.healthScoreCalculator.calculateOverallHealthScore(rawMetrics);
      const healthStatus =
        this.healthScoreCalculator.getHealthStatus(healthScore);
      const componentScores = {
        api: this.healthScoreCalculator.calculateApiHealthScore(rawMetrics),
        database:
          this.healthScoreCalculator.calculateDatabaseHealthScore(rawMetrics),
        cache: this.healthScoreCalculator.calculateCacheHealthScore(rawMetrics),
        system:
          this.healthScoreCalculator.calculateSystemHealthScore(rawMetrics),
      };

      const criticalIssues = this.identifyCriticalIssues(
        rawMetrics,
        componentScores,
      );

      return {
        isHealthy: healthStatus === MONITORING_HEALTH_STATUS.HEALTHY,
        healthScore: healthScore,
        status: healthStatus,
        criticalIssues,
      };
    } catch (error) {
      this.logger.error("快速健康检查失败", error.stack);
      return {
        isHealthy: false,
        healthScore: 0,
        status: MONITORING_HEALTH_STATUS.UNHEALTHY, // Use unhealthy for critical errors
        criticalIssues: ["健康检查系统异常"],
      };
    }
  }

  /**
   * 获取健康趋势
   */
  async getHealthTrends(
    currentMetrics: RawMetricsDto,
    historicalMetrics?: RawMetricsDto[],
  ): Promise<{
    currentScore: number;
    trend: "improving" | "stable" | "declining";
    changePercentage: number;
    periodComparison: string;
  }> {
    try {
      const currentScore =
        this.healthScoreCalculator.calculateOverallHealthScore(currentMetrics);

      if (!historicalMetrics || historicalMetrics.length === 0) {
        return {
          currentScore,
          trend: "stable",
          changePercentage: 0,
          periodComparison: "无历史数据",
        };
      }

      // 计算历史平均分
      const historicalScores = historicalMetrics.map((metrics) =>
        this.healthScoreCalculator.calculateOverallHealthScore(metrics),
      );
      const averageHistoricalScore =
        historicalScores.reduce((sum, score) => sum + score, 0) /
        historicalScores.length;

      // 计算变化百分比
      const changePercentage =
        ((currentScore - averageHistoricalScore) / averageHistoricalScore) *
        MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER;

      // 确定趋势
      let trend: "improving" | "stable" | "declining";
      if (Math.abs(changePercentage) < 5) {
        trend = "stable";
      } else if (changePercentage > 0) {
        trend = "improving";
      } else {
        trend = "declining";
      }

      return {
        currentScore,
        trend,
        changePercentage:
          Math.round(
            changePercentage * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
          ) / MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
        periodComparison: `相比过去${historicalMetrics.length}个周期`,
      };
    } catch (error) {
      this.logger.error("健康趋势分析失败", error.stack);
      return {
        currentScore: 50,
        trend: "stable",
        changePercentage: 0,
        periodComparison: "趋势分析异常",
      };
    }
  }

  /**
   * 失效健康相关缓存
   */
  async invalidateHealthCache(): Promise<void> {
    try {
      await this.cacheService.delByPattern(MonitoringCacheKeys.health("*"));
      this.logger.debug("HealthAnalyzer: 健康相关缓存已失效", {
        component: "HealthAnalyzerService",
        operation: "invalidateHealthCache",
        success: true,
      });

      // 发射缓存失效事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED, {
        timestamp: new Date(),
        source: "health-analyzer",
        metadata: { pattern: "health_*", reason: "manual_invalidation" },
      });
    } catch (error) {
      this.logger.error("健康缓存失效失败", error.stack);
    }
  }

  /**
   * 识别关键问题
   */
  private identifyCriticalIssues(
    rawMetrics: RawMetricsDto,
    componentScores: Record<string, number>,
  ): string[] {
    const criticalIssues: string[] = [];

    try {
      // 检查组件健康分
      Object.entries(componentScores).forEach(([component, score]) => {
        if (score < 30) {
          criticalIssues.push(`${component}组件健康分过低: ${score}`);
        }
      });

      // 检查具体指标
      const requests = rawMetrics.requests || [];
      if (requests.length > 0) {
        const errorRate =
          requests.filter(
            (r) =>
              r.statusCode >= MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD,
          ).length / requests.length;
        if (errorRate > 0.1) {
          criticalIssues.push(
            `API错误率过高: ${Math.round(errorRate * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER)}%`,
          );
        }

        const avgResponseTime =
          requests.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) /
          requests.length;
        if (avgResponseTime > 2000) {
          criticalIssues.push(
            `API响应时间过慢: ${Math.round(avgResponseTime)}ms`,
          );
        }
      }

      // 检查数据库指标
      const dbOps = rawMetrics.database || [];
      if (dbOps.length > 0) {
        const dbFailureRate =
          dbOps.filter((op) => !op.success).length / dbOps.length;
        if (dbFailureRate > 0.05) {
          criticalIssues.push(
            `数据库失败率过高: ${Math.round(dbFailureRate * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER)}%`,
          );
        }
      }

      // 检查系统指标
      if (rawMetrics.system) {
        if (rawMetrics.system.cpu.usage > 0.9) {
          criticalIssues.push(
            `CPU使用率过高: ${Math.round(rawMetrics.system.cpu.usage * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER)}%`,
          );
        }
        if (rawMetrics.system.memory.percentage > 0.9) {
          criticalIssues.push(
            `内存使用率过高: ${Math.round(rawMetrics.system.memory.percentage * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER)}%`,
          );
        }
      }
    } catch (error) {
      this.logger.error("识别关键问题失败", error.stack);
      criticalIssues.push("问题识别系统异常");
    }

    return criticalIssues;
  }

  /**
   * 分析健康趋势
   */
  private analyzeHealthTrends(
    healthScore: number,
    componentScores: Record<string, number>,
  ): string {
    try {
      const issues: string[] = [];

      if (healthScore < 50) {
        issues.push("整体健康状况需要关注");
      }

      const poorComponents = Object.entries(componentScores)
        .filter(([, score]) => score < 50)
        .map(([component]) => component);

      if (poorComponents.length > 0) {
        issues.push(`${poorComponents.join("、")}组件需要优化`);
      }

      return issues.length > 0 ? issues.join("；") : "系统运行良好";
    } catch (error) {
      this.logger.error("健康趋势分析失败", error.stack);
      return "趋势分析异常";
    }
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(type: string, rawMetrics: RawMetricsDto): string {
    const hash = this.generateMetricsHash(rawMetrics);
    return `${type}_${hash}`;
  }

  /**
   * 生成指标哈希
   */
  private generateMetricsHash(rawMetrics: RawMetricsDto): string {
    const content = JSON.stringify({
      requestsCount: rawMetrics.requests?.length || 0,
      databaseCount: rawMetrics.database?.length || 0,
      cacheCount: rawMetrics.cache?.length || 0,
      hasSystem: !!rawMetrics.system,
    });

    // 简化哈希实现
    return Buffer.from(content).toString("base64").substring(0, 8);
  }

  /**
   * 获取默认健康报告
   */
  private getDefaultHealthReport(): HealthReportDto {
    return {
      overall: {
        healthScore: 50,
        status: MONITORING_HEALTH_STATUS.WARNING,
        timestamp: new Date(),
      },
      components: {
        api: {
          healthScore: 50,
          responseTimeMs: 0,
          errorRate: 0,
        },
        database: {
          healthScore: 50,
          responseTimeMs: 0,
          errorRate: 0,
        },
        cache: {
          healthScore: 50,
          hitRate: 0,
          responseTimeMs: 0,
        },
        system: {
          healthScore: 50,
          memoryUsage: 0,
          cpuUsage: 0,
        },
      },
      recommendations: ["系统健康检查异常，请检查监控系统状态"],
    };
  }
}
