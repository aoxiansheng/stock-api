import { Injectable } from "@nestjs/common";
import { createLogger } from "../../app/config/logger.config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RawMetricsDto } from "../contracts/interfaces/collector.interface";
import { TrendsDto } from "../contracts/interfaces/analyzer.interface";
import { SYSTEM_STATUS_EVENTS } from "../contracts/events/system-status.events";
import { AnalyzerMetricsCalculator } from "./analyzer-metrics.service";
import { MonitoringCacheService } from "../cache/monitoring-cache.service";

/**
 * 趋势分析服务
 * 职责：专门处理趋势分析，包括时间序列分析、趋势预测、性能对比
 */
@Injectable()
export class TrendAnalyzerService {
  private readonly logger = createLogger(TrendAnalyzerService.name);

  constructor(
    private readonly metricsCalculator: AnalyzerMetricsCalculator,
    private readonly monitoringCache: MonitoringCacheService,
    private readonly eventBus: EventEmitter2,
  ) {
    this.logger.log("TrendAnalyzerService initialized - 趋势分析服务已启动");
  }

  /**
   * 计算性能趋势
   */
  async calculatePerformanceTrends(
    currentMetrics: RawMetricsDto,
    previousMetrics?: RawMetricsDto,
    period: string = "1h",
  ): Promise<TrendsDto> {
    try {
      this.logger.debug(`开始计算性能趋势: 周期 ${period}`);

      // 使用getOrSet热点路径优化（自动处理分布式锁和缓存回填）
      const cacheKey = this.buildTrendsCacheKey(
        "performance",
        period,
        currentMetrics,
      );

      const trends = await this.monitoringCache.getOrSetTrendData<TrendsDto>(
        cacheKey,
        async () => {
          // 缓存未命中，重新计算趋势
          this.logger.debug("趋势分析缓存未命中，重新生成");

          // 使用计算器生成趋势分析
          const basicTrends = this.metricsCalculator.calculateTrends(
            currentMetrics,
            previousMetrics,
          );

          // 增强趋势分析
          const enhancedTrends = await this.enhanceTrendsAnalysis(
            basicTrends,
            currentMetrics,
            previousMetrics,
            period,
          );

          // 发射分析完成事件
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED, {
            timestamp: new Date(),
            source: "trend-analyzer",
            metadata: {
              type: "trends_analysis",
              period,
              hasComparison: !!previousMetrics,
              trendsCount: Object.keys(enhancedTrends).length,
            },
          });

          this.logger.debug(
            `趋势分析完成: 周期 ${period}, 对比数据 ${previousMetrics ? "有" : "无"}`,
          );
          return enhancedTrends;
        },
      );

      // 发射缓存命中或回填完成事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_HIT, {
        timestamp: new Date(),
        source: "trend-analyzer",
        metadata: { cacheKey, type: "performance_trends", period },
      });

      return trends;
    } catch (error) {
      this.logger.error("性能趋势计算失败", error.stack);

      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR, {
        timestamp: new Date(),
        source: "trend-analyzer",
        metadata: {
          error: error.message,
          operation: "calculatePerformanceTrends",
          period,
        },
      });

      return this.getDefaultTrends();
    }
  }

  /**
   * 获取历史趋势数据
   */
  async getHistoricalTrends(
    metricsHistory: RawMetricsDto[],
    period: string = "24h",
  ): Promise<{
    trends: TrendsDto[];
    summary: {
      averageResponseTime: number;
      averageErrorRate: number;
      averageThroughput: number;
      volatility: {
        responseTime: number;
        errorRate: number;
        throughput: number;
      };
    };
  }> {
    try {
      this.logger.debug(
        `分析历史趋势: ${metricsHistory.length} 个数据点, 周期 ${period}`,
      );

      if (metricsHistory.length < 2) {
        return this.getDefaultHistoricalTrends();
      }

      const trends: TrendsDto[] = [];

      // 计算连续趋势
      for (let i = 1; i < metricsHistory.length; i++) {
        const currentMetrics = metricsHistory[i];
        const previousMetrics = metricsHistory[i - 1];

        const trend = this.metricsCalculator.calculateTrends(
          currentMetrics,
          previousMetrics,
        );
        trends.push(trend);
      }

      // 计算汇总统计
      const summary = this.calculateTrendsSummary(trends);

      this.logger.debug(`历史趋势分析完成: ${trends.length} 个趋势点`);
      return { trends, summary };
    } catch (error) {
      this.logger.error("历史趋势分析失败", error.stack);
      return this.getDefaultHistoricalTrends();
    }
  }

  /**
   * 检测异常趋势
   */
  async detectAnomalies(
    currentMetrics: RawMetricsDto,
    historicalMetrics: RawMetricsDto[],
    thresholds?: {
      responseTimeThreshold?: number;
      errorRateThreshold?: number;
      throughputThreshold?: number;
    },
  ): Promise<{
    hasAnomalies: boolean;
    anomalies: Array<{
      type: "response_time" | "error_rate" | "throughput";
      severity: "low" | "medium" | "high";
      currentValue: number;
      expectedRange: { min: number; max: number };
      deviation: number;
      description: string;
    }>;
  }> {
    try {
      this.logger.debug("开始异常趋势检测");

      const anomalies: any[] = [];

      if (historicalMetrics.length === 0) {
        return { hasAnomalies: false, anomalies: [] };
      }

      // 计算历史基线
      const baseline = this.calculateBaseline(historicalMetrics);

      // 计算当前指标
      const currentResponseTime =
        this.metricsCalculator.calculateAverageResponseTime(currentMetrics);
      const currentErrorRate =
        this.metricsCalculator.calculateErrorRate(currentMetrics);
      const currentThroughput =
        this.metricsCalculator.calculateThroughput(currentMetrics);

      // 使用默认阈值
      const defaultThresholds = {
        responseTimeThreshold: thresholds?.responseTimeThreshold || 0.5, // 50%变化
        errorRateThreshold: thresholds?.errorRateThreshold || 0.3, // 30%变化
        throughputThreshold: thresholds?.throughputThreshold || 0.4, // 40%变化
      };

      // 响应时间异常检测
      const responseTimeDeviation =
        Math.abs(currentResponseTime - baseline.averageResponseTime) /
        baseline.averageResponseTime;
      if (responseTimeDeviation > defaultThresholds.responseTimeThreshold) {
        anomalies.push({
          type: "response_time",
          severity: this.getSeverity(responseTimeDeviation),
          currentValue: currentResponseTime,
          expectedRange: {
            min:
              baseline.averageResponseTime *
              (1 - defaultThresholds.responseTimeThreshold),
            max:
              baseline.averageResponseTime *
              (1 + defaultThresholds.responseTimeThreshold),
          },
          deviation: responseTimeDeviation,
          description: `响应时间异常: 当前${currentResponseTime}ms, 预期范围${Math.round(baseline.averageResponseTime * (1 - defaultThresholds.responseTimeThreshold))}-${Math.round(baseline.averageResponseTime * (1 + defaultThresholds.responseTimeThreshold))}ms`,
        });
      }

      // 错误率异常检测
      const errorRateDeviation =
        Math.abs(currentErrorRate - baseline.averageErrorRate) /
        (baseline.averageErrorRate || 0.01);
      if (errorRateDeviation > defaultThresholds.errorRateThreshold) {
        anomalies.push({
          type: "error_rate",
          severity: this.getSeverity(errorRateDeviation),
          currentValue: currentErrorRate,
          expectedRange: {
            min: Math.max(
              0,
              baseline.averageErrorRate *
                (1 - defaultThresholds.errorRateThreshold),
            ),
            max:
              baseline.averageErrorRate *
              (1 + defaultThresholds.errorRateThreshold),
          },
          deviation: errorRateDeviation,
          description: `错误率异常: 当前${(currentErrorRate * 100).toFixed(2)}%, 预期范围${(Math.max(0, baseline.averageErrorRate * (1 - defaultThresholds.errorRateThreshold)) * 100).toFixed(2)}-${(baseline.averageErrorRate * (1 + defaultThresholds.errorRateThreshold) * 100).toFixed(2)}%`,
        });
      }

      // 吞吐量异常检测
      const throughputDeviation =
        Math.abs(currentThroughput - baseline.averageThroughput) /
        baseline.averageThroughput;
      if (throughputDeviation > defaultThresholds.throughputThreshold) {
        anomalies.push({
          type: "throughput",
          severity: this.getSeverity(throughputDeviation),
          currentValue: currentThroughput,
          expectedRange: {
            min:
              baseline.averageThroughput *
              (1 - defaultThresholds.throughputThreshold),
            max:
              baseline.averageThroughput *
              (1 + defaultThresholds.throughputThreshold),
          },
          deviation: throughputDeviation,
          description: `吞吐量异常: 当前${currentThroughput}/min, 预期范围${Math.round(baseline.averageThroughput * (1 - defaultThresholds.throughputThreshold))}-${Math.round(baseline.averageThroughput * (1 + defaultThresholds.throughputThreshold))}/min`,
        });
      }

      // 发射异常检测事件
      if (anomalies.length > 0) {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANOMALY_DETECTED, {
          timestamp: new Date(),
          source: "trend-analyzer",
          metadata: {
            anomaliesCount: anomalies.length,
            highSeverityCount: anomalies.filter((a) => a.severity === "high")
              .length,
            anomalies: anomalies.map((a) => ({
              type: a.type,
              severity: a.severity,
            })),
          },
        });
      }

      this.logger.debug(`异常检测完成: 发现 ${anomalies.length} 个异常`);
      return {
        hasAnomalies: anomalies.length > 0,
        anomalies,
      };
    } catch (error) {
      this.logger.error("异常趋势检测失败", error.stack);
      return { hasAnomalies: false, anomalies: [] };
    }
  }

  /**
   * 预测未来趋势
   */
  async predictTrends(
    historicalMetrics: RawMetricsDto[],
    predictionHours: number = 1,
  ): Promise<{
    predictions: {
      responseTime: { value: number; confidence: number };
      errorRate: { value: number; confidence: number };
      throughput: { value: number; confidence: number };
    };
    confidence: "high" | "medium" | "low";
    factors: string[];
  }> {
    try {
      this.logger.debug(
        `开始趋势预测: ${predictionHours}小时, 基于${historicalMetrics.length}个历史数据点`,
      );

      if (historicalMetrics.length < 3) {
        return this.getDefaultPrediction();
      }

      // 简化的线性趋势预测
      const predictions = this.calculateLinearTrendPrediction(
        historicalMetrics,
        predictionHours,
      );

      // 评估预测置信度
      const confidence = this.assessPredictionConfidence(historicalMetrics);

      // 识别影响因素
      const factors = this.identifyTrendFactors(historicalMetrics);

      this.logger.debug(`趋势预测完成: 置信度 ${confidence}`);
      return { predictions, confidence, factors };
    } catch (error) {
      this.logger.error("趋势预测失败", error.stack);
      return this.getDefaultPrediction();
    }
  }

  /**
   * 失效趋势相关缓存
   */
  async invalidateTrendsCache(): Promise<void> {
    try {
      await this.monitoringCache.invalidateTrendCache();
      this.logger.debug("趋势相关缓存已失效");

      // 发射缓存失效事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED, {
        timestamp: new Date(),
        source: "trend-analyzer",
        metadata: { pattern: "trends_*", reason: "manual_invalidation" },
      });
    } catch (error) {
      this.logger.error("趋势缓存失效失败", error.stack);
    }
  }

  /**
   * 增强趋势分析
   */
  private async enhanceTrendsAnalysis(
    basicTrends: TrendsDto,
    _currentMetrics: RawMetricsDto,
    _previousMetrics?: RawMetricsDto,
    _period: string = "1h",
  ): Promise<TrendsDto> {
    // 这里可以添加额外的趋势分析逻辑
    // 例如：季节性调整、异常值处理、平滑算法等
    return basicTrends;
  }

  /**
   * 计算基线指标
   */
  private calculateBaseline(historicalMetrics: RawMetricsDto[]): {
    averageResponseTime: number;
    averageErrorRate: number;
    averageThroughput: number;
  } {
    const responseTimes = historicalMetrics.map((m) =>
      this.metricsCalculator.calculateAverageResponseTime(m),
    );
    const errorRates = historicalMetrics.map((m) =>
      this.metricsCalculator.calculateErrorRate(m),
    );
    const throughputs = historicalMetrics.map((m) =>
      this.metricsCalculator.calculateThroughput(m),
    );

    return {
      averageResponseTime:
        responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length,
      averageErrorRate:
        errorRates.reduce((sum, val) => sum + val, 0) / errorRates.length,
      averageThroughput:
        throughputs.reduce((sum, val) => sum + val, 0) / throughputs.length,
    };
  }

  /**
   * 计算趋势汇总
   */
  private calculateTrendsSummary(trends: TrendsDto[]): {
    averageResponseTime: number;
    averageErrorRate: number;
    averageThroughput: number;
    volatility: {
      responseTime: number;
      errorRate: number;
      throughput: number;
    };
  } {
    const responseTimes = trends.map((t) =>
      t.responseTime ? t.responseTime.current : 0,
    );
    const errorRates = trends.map((t) => t.errorRate.current);
    const throughputs = trends.map((t) => t.throughput.current);

    return {
      averageResponseTime:
        responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length,
      averageErrorRate:
        errorRates.reduce((sum, val) => sum + val, 0) / errorRates.length,
      averageThroughput:
        throughputs.reduce((sum, val) => sum + val, 0) / throughputs.length,
      volatility: {
        responseTime: this.calculateVolatility(responseTimes),
        errorRate: this.calculateVolatility(errorRates),
        throughput: this.calculateVolatility(throughputs),
      },
    };
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  /**
   * 获取严重程度
   */
  private getSeverity(deviation: number): "low" | "medium" | "high" {
    if (deviation > 1.0) return "high";
    if (deviation > 0.5) return "medium";
    return "low";
  }

  /**
   * 简化的线性趋势预测
   */
  private calculateLinearTrendPrediction(
    historicalMetrics: RawMetricsDto[],
    predictionHours: number,
  ): {
    responseTime: { value: number; confidence: number };
    errorRate: { value: number; confidence: number };
    throughput: { value: number; confidence: number };
  } {
    // 简化实现：基于最近的趋势进行线性外推
    const recentMetrics = historicalMetrics.slice(-5); // 使用最近5个数据点

    if (recentMetrics.length < 2) {
      const latest = historicalMetrics[historicalMetrics.length - 1];
      return {
        responseTime: {
          value: this.metricsCalculator.calculateAverageResponseTime(latest),
          confidence: 0.3,
        },
        errorRate: {
          value: this.metricsCalculator.calculateErrorRate(latest),
          confidence: 0.3,
        },
        throughput: {
          value: this.metricsCalculator.calculateThroughput(latest),
          confidence: 0.3,
        },
      };
    }

    const firstMetrics = recentMetrics[0];
    const lastMetrics = recentMetrics[recentMetrics.length - 1];

    const firstResponseTime =
      this.metricsCalculator.calculateAverageResponseTime(firstMetrics);
    const lastResponseTime =
      this.metricsCalculator.calculateAverageResponseTime(lastMetrics);
    const responseTimeTrend =
      (lastResponseTime - firstResponseTime) / recentMetrics.length;

    const firstErrorRate =
      this.metricsCalculator.calculateErrorRate(firstMetrics);
    const lastErrorRate =
      this.metricsCalculator.calculateErrorRate(lastMetrics);
    const errorRateTrend =
      (lastErrorRate - firstErrorRate) / recentMetrics.length;

    const firstThroughput =
      this.metricsCalculator.calculateThroughput(firstMetrics);
    const lastThroughput =
      this.metricsCalculator.calculateThroughput(lastMetrics);
    const throughputTrend =
      (lastThroughput - firstThroughput) / recentMetrics.length;

    return {
      responseTime: {
        value: Math.max(
          0,
          lastResponseTime + responseTimeTrend * predictionHours,
        ),
        confidence: 0.7,
      },
      errorRate: {
        value: Math.max(
          0,
          Math.min(1, lastErrorRate + errorRateTrend * predictionHours),
        ),
        confidence: 0.6,
      },
      throughput: {
        value: Math.max(0, lastThroughput + throughputTrend * predictionHours),
        confidence: 0.7,
      },
    };
  }

  /**
   * 评估预测置信度
   */
  private assessPredictionConfidence(
    historicalMetrics: RawMetricsDto[],
  ): "high" | "medium" | "low" {
    if (historicalMetrics.length < 5) return "low";
    if (historicalMetrics.length < 10) return "medium";
    return "high";
  }

  /**
   * 识别趋势影响因素
   */
  private identifyTrendFactors(historicalMetrics: RawMetricsDto[]): string[] {
    const factors: string[] = [];

    // 简化的因素识别
    if (historicalMetrics.length > 0) {
      factors.push("历史数据趋势");
    }

    const hasHighLoad = historicalMetrics.some(
      (m) => this.metricsCalculator.calculateThroughput(m) > 100,
    );
    if (hasHighLoad) {
      factors.push("高负载影响");
    }

    const hasErrors = historicalMetrics.some(
      (m) => this.metricsCalculator.calculateErrorRate(m) > 0.05,
    );
    if (hasErrors) {
      factors.push("错误率波动");
    }

    return factors.length > 0 ? factors : ["数据量不足"];
  }

  /**
   * 构建趋势缓存键
   */
  private buildTrendsCacheKey(
    type: string,
    period: string,
    metrics: RawMetricsDto,
  ): string {
    const hash = this.generateMetricsHash(metrics);
    return `trends_${type}_${period}_${hash}`;
  }

  /**
   * 生成指标哈希
   */
  private generateMetricsHash(metrics: RawMetricsDto): string {
    const content = JSON.stringify({
      requestsCount: metrics.requests?.length || 0,
      databaseCount: metrics.database?.length || 0,
      cacheCount: metrics.cache?.length || 0,
      hasSystem: !!metrics.system,
    });

    return Buffer.from(content).toString("base64").substring(0, 8);
  }

  /**
   * 获取默认趋势
   */
  private getDefaultTrends(): TrendsDto {
    return {
      responseTime: {
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
   * 获取默认历史趋势
   */
  private getDefaultHistoricalTrends(): {
    trends: TrendsDto[];
    summary: {
      averageResponseTime: number;
      averageErrorRate: number;
      averageThroughput: number;
      volatility: {
        responseTime: number;
        errorRate: number;
        throughput: number;
      };
    };
  } {
    return {
      trends: [],
      summary: {
        averageResponseTime: 0,
        averageErrorRate: 0,
        averageThroughput: 0,
        volatility: {
          responseTime: 0,
          errorRate: 0,
          throughput: 0,
        },
      },
    };
  }

  /**
   * 获取默认预测
   */
  private getDefaultPrediction(): {
    predictions: {
      responseTime: { value: number; confidence: number };
      errorRate: { value: number; confidence: number };
      throughput: { value: number; confidence: number };
    };
    confidence: "high" | "medium" | "low";
    factors: string[];
  } {
    return {
      predictions: {
        responseTime: { value: 0, confidence: 0 },
        errorRate: { value: 0, confidence: 0 },
        throughput: { value: 0, confidence: 0 },
      },
      confidence: "low",
      factors: ["数据不足"],
    };
  }
}
