import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsPerformanceService } from '../../collect-metrics/services/metrics-performance.service';
import { EndpointMetricsDto, DatabaseMetricsDto, SystemMetricsDto, PerformanceSummaryDto } from '../../collect-metrics/dto';
import type { 
  IHealthAnalytics, 
  HealthStatus, 
  HealthPriority, 
  DetailedHealthReportDto 
} from '../interfaces';
import { AnalyticsCacheService } from './analytics-cache.service';
import { HealthScoreCalculator } from '../utils/health-score-calculator.util';
import { 
  HEALTH_THRESHOLDS, 
  ANALYTICS_CACHE_CONFIG, 
  ANALYTICS_EVENTS,
  ANALYTICS_PERFORMANCE_THRESHOLDS,
  ANALYTICS_DEFAULTS,
  ANALYTICS_CACHE_KEYS
} from '../constants';

/**
 * 健康分析服务
 * 负责系统健康状态评估、问题识别和建议生成
 */
@Injectable()
export class HealthAnalyticsService implements IHealthAnalytics {
  private readonly logger = new Logger(HealthAnalyticsService.name);
  private healthScoreCache: { value: number; timestamp: number } | null = null;
  private calculationHistory: any[] = [];

  constructor(
    private readonly performanceMonitor: MetricsPerformanceService,
    private readonly cacheService: AnalyticsCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // 注册缓存失效事件监听器
    this.setupCacheInvalidationListeners();
  }

  /**
   * 设置缓存失效事件监听器
   * 监听性能变化和系统事件，自动失效健康分析缓存
   */
  private setupCacheInvalidationListeners(): void {
    // 监听性能摘要生成事件 - 新的性能数据可能影响健康评分
    this.eventEmitter.on(ANALYTICS_EVENTS.PERFORMANCE_SUMMARY_GENERATED, async (data) => {
      this.logger.debug('性能摘要更新，失效健康缓存', { 
        healthScore: data.healthScore,
        dataPoints: data.dataPoints 
      });
      
      // 清除内存缓存
      this.healthScoreCache = null;
      
      // 失效Redis缓存
      await this.invalidateHealthCache('health_auto');
    });

    // 监听阈值超过事件 - 系统警告时失效健康缓存
    this.eventEmitter.on(ANALYTICS_EVENTS.THRESHOLD_EXCEEDED, async (data) => {
      this.logger.debug('检测到阈值超过事件，失效健康缓存', data);
      this.healthScoreCache = null;
      await this.invalidateHealthCache('health');
    });

    // 监听缓存失效事件 - 性能缓存失效时同步失效健康缓存
    this.eventEmitter.on(ANALYTICS_EVENTS.CACHE_INVALIDATED, async (data) => {
      if (data.pattern?.includes('performance')) {
        this.logger.debug('性能缓存失效，同步失效健康缓存', data);
        this.healthScoreCache = null;
        await this.invalidateHealthCache('health_sync');
      }
    });
    
    // 监听健康分数请求事件 - 响应来自其他服务的健康分数请求
    this.eventEmitter.on(ANALYTICS_EVENTS.HEALTH_SCORE_REQUESTED, async (data: { performanceSummary: PerformanceSummaryDto }) => {
      this.logger.debug('收到健康分数请求', { timestamp: new Date().toISOString() });
      
      try {
        // 计算健康分数
        const scoreResult = this.calculateHealthScoreWithBreakdown(data.performanceSummary);
        
        // 更新内存缓存
        this.healthScoreCache = { 
          value: scoreResult.finalScore, 
          timestamp: Date.now() 
        };
        
        // 缓存健康分数
        await this.cacheService.set(
          ANALYTICS_CACHE_KEYS.HEALTH_SCORE,
          scoreResult.finalScore,
          ANALYTICS_CACHE_CONFIG.TTL.HEALTH_SCORE
        );
        
        // 发布健康分数已更新事件
        this.eventEmitter.emit(ANALYTICS_EVENTS.HEALTH_SCORE_UPDATED, {
          score: scoreResult.finalScore,
          breakdown: scoreResult.breakdown,
          timestamp: new Date().toISOString()
        });
        
        this.logger.debug('健康分数已计算并发布', { 
          score: scoreResult.finalScore,
          breakdownItems: scoreResult.breakdown.length
        });
      } catch (error) {
        this.logger.error('响应健康分数请求失败', { error: error.message });
        
        // 发布健康分数计算失败事件
        this.eventEmitter.emit(ANALYTICS_EVENTS.HEALTH_SCORE_FAILED, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 设置定时缓存失效 - 每10分钟自动刷新健康缓存
    setInterval(async () => {
      this.logger.debug('定时健康缓存失效触发');
      this.healthScoreCache = null;
      await this.invalidateHealthCache('health_scheduled');
    }, ANALYTICS_CACHE_CONFIG.AUTO_INVALIDATION_INTERVAL * 2); // 健康缓存失效间隔是性能缓存的2倍

    this.logger.log('健康分析缓存失效事件监听器已设置');
  }

  /**
   * 失效健康分析相关缓存
   */
  private async invalidateHealthCache(pattern: string): Promise<void> {
    try {
      const keyPattern = `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.HEALTH}:${pattern}`;
      await this.cacheService.invalidatePattern(keyPattern);
      
      // 发射缓存失效事件
      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: keyPattern,
        timestamp: new Date().toISOString(),
        service: 'HealthAnalyticsService'
      });

      this.logger.debug('健康分析缓存失效完成', { pattern: keyPattern });
    } catch (error) {
      this.logger.error('健康分析缓存失效失败', { 
        pattern: `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.HEALTH}:${pattern}`,
        error: error.message 
      });
    }
  }

  /**
   * 获取健康评分（带缓存）
   */
  async getHealthScore(): Promise<number> {
    const now = Date.now();
    const cacheKey = ANALYTICS_CACHE_KEYS.HEALTH_SCORE;

    try {
      // 简单内存缓存检查
      if (this.healthScoreCache && 
          (now - this.healthScoreCache.timestamp) < ANALYTICS_CACHE_CONFIG.TTL.HEALTH_SCORE * 1000) {
        this.logger.debug('健康评分内存缓存命中');
        return this.healthScoreCache.value;
      }

      // 检查Redis缓存
      const cachedScore = await this.cacheService.get<number>(cacheKey);
      if (cachedScore !== null) {
        // 更新内存缓存
        this.healthScoreCache = { value: cachedScore, timestamp: now };
        this.logger.debug('健康评分Redis缓存命中', { score: cachedScore });
        return cachedScore;
      }

      // 获取现有数据，避免重复查询
      const summary = await this.performanceMonitor.getPerformanceSummary();
      const score = this.calculateHealthScoreWithBreakdown(
        summary
      );
      
      // 更新内存缓存
      this.healthScoreCache = { value: score.finalScore, timestamp: now };
      
      // 更新Redis缓存
      await this.cacheService.set(
        cacheKey, 
        score.finalScore, 
        ANALYTICS_CACHE_CONFIG.TTL.HEALTH_SCORE
      );
      
      this.logger.debug('健康评分计算完成', { 
        score: score.finalScore,
        deductions: score.breakdown.length 
      });

      // 发布健康分数已更新事件
      this.eventEmitter.emit(ANALYTICS_EVENTS.HEALTH_SCORE_UPDATED, {
        score: score.finalScore,
        breakdown: score.breakdown,
        timestamp: new Date().toISOString()
      });

      return score.finalScore;

    } catch (error) {
      this.logger.error('健康评分计算失败', { error: error.message });
      return ANALYTICS_DEFAULTS.HEALTH_SCORE;
    }
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(score?: number): Promise<HealthStatus> {
    try {
      const healthScore = score ?? await this.getHealthScore();
      return HEALTH_THRESHOLDS.getStatus(healthScore);
    } catch (error) {
      this.logger.error('健康状态获取失败', { error: error.message });
      return 'unhealthy';
    }
  }

  /**
   * 获取详细健康报告
   */
  async getDetailedHealthReport(): Promise<DetailedHealthReportDto> {
    const startTime = performance.now();
    const cacheKey = ANALYTICS_CACHE_KEYS.HEALTH_REPORT;

    try {
      // 检查缓存
      const cached = await this.cacheService.get<DetailedHealthReportDto>(cacheKey);
      if (cached) {
        this.logger.debug('详细健康报告缓存命中');
        return cached;
      }

      // 计算健康报告
      const summary = await this.performanceMonitor.getPerformanceSummary();
      const scoreResult = this.calculateHealthScoreWithBreakdown(
        summary
      );

      const score = scoreResult.finalScore;
      const status = await this.getHealthStatus(score);
      const priority = this.categorizePriority(score);
      const issues = this.identifyIssues(score, summary);
      const recommendations = this.generateRecommendations(issues);

      const report: DetailedHealthReportDto = {
        score,
        status,
        issues,
        recommendations,
        timestamp: new Date().toISOString(),
        priority,
        breakdown: scoreResult.breakdown
      };

      // 缓存结果
      await this.cacheService.set(
        cacheKey, 
        report, 
        ANALYTICS_CACHE_CONFIG.TTL.HEALTH_REPORT
      );

      // 发射健康报告生成事件
      this.eventEmitter.emit(ANALYTICS_EVENTS.HEALTH_SCORE_CALCULATED, {
        score,
        status,
        duration: performance.now() - startTime,
        issueCount: issues.length
      });

      this.logger.log('详细健康报告生成完成', { 
        score, 
        status, 
        issueCount: issues.length,
        duration: performance.now() - startTime
      });

      return report;

    } catch (error) {
      const errorDetails = {
        error: error.message,
        duration: performance.now() - startTime
      };

      this.eventEmitter.emit(ANALYTICS_EVENTS.HEALTH_SCORE_FAILED, errorDetails);
      this.logger.error('详细健康报告生成失败', errorDetails);

      // 返回默认报告以保证系统稳定性
      return this.getDefaultHealthReport();
    }
  }

  /**
   * 识别系统问题
   */
  identifyIssues(score: number, summary?: any): string[] {
    // 使用工具类实现
    let issues: string[] = [];
    
    if (summary) {
      issues = HealthScoreCalculator.identifyIssues(summary);
    } else {
      // 如果没有提供性能摘要，只能基于分数进行简单判断
      if (score < HEALTH_THRESHOLDS.WARNING.score) {
        issues.push('系统健康度低于警告阈值');
      }
      
      if (score < HEALTH_THRESHOLDS.DEGRADED.score) {
        issues.push('系统性能严重下降');
      }
      
      if (score < HEALTH_THRESHOLDS.UNHEALTHY.score) {
        issues.push('系统状态异常');
      }
    }
    
    // 记录日志
    this.logger.debug('问题识别完成', { issueCount: issues.length });
    
    // 如果发现严重问题，发送阈值超过事件
    if (issues.length > 0 && score < HEALTH_THRESHOLDS.WARNING.score) {
      this.eventEmitter.emit(ANALYTICS_EVENTS.THRESHOLD_EXCEEDED, {
        score,
        issues,
        timestamp: new Date().toISOString()
      });
    }
    
    return issues;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(issues: string[]): string[] {
    // 使用工具类实现
    const recommendations = HealthScoreCalculator.generateRecommendations(issues);
    
    // 记录日志
    this.logger.debug('优化建议生成完成', { recommendationCount: recommendations.length });
    
    // 发送优化建议事件
    if (recommendations.length > 0) {
      this.eventEmitter.emit(ANALYTICS_EVENTS.OPTIMIZATION_SUGGESTED, {
        recommendationCount: recommendations.length,
        issueCount: issues.length,
        timestamp: new Date().toISOString()
      });
    }
    
    return recommendations;
  }

  /**
   * 分类问题优先级
   */
  categorizePriority(score: number): HealthPriority {
    // 使用工具类实现
    return HealthScoreCalculator.categorizePriority(score);
  }

  /**
   * 带详细分析的健康评分计算
   */
  private calculateHealthScoreWithBreakdown(
    summary: PerformanceSummaryDto
  ): { finalScore: number; breakdown: any[] } {
    // 使用工具类实现
    const result = HealthScoreCalculator.calculateDetailedHealthScore(summary);
    
    // 转换返回类型以匹配期望的接口
    return {
      finalScore: result.score,
      breakdown: result.breakdown || []
    };
  }

  /**
   * 生成评分扣分明细
   */
  private generateScoreBreakdown(
    endpointMetrics: EndpointMetricsDto[],
    dbMetrics: DatabaseMetricsDto,
    systemMetrics: SystemMetricsDto,
  ): any[] {
    const breakdown: any[] = [];

    // 计算整体错误率
    const totalRequests = endpointMetrics.reduce((sum, ep) => sum + ep.totalRequests, 0);
    const totalErrors = endpointMetrics.reduce((sum, ep) => sum + ep.failedRequests, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // 错误率扣分
    if (errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
      const deduction = Math.min(errorRate * 300, 30);
      breakdown.push({
        metric: 'errorRate',
        value: errorRate,
        threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE,
        deduction,
        reason: `错误率超过${(ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE * 100)}%阈值`
      });
    }

    // 响应时间扣分
    const avgResponseTime = endpointMetrics.length > 0 
      ? endpointMetrics.reduce((sum, ep) => sum + ep.averageResponseTime, 0) / endpointMetrics.length 
      : 0;

    if (avgResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      const deduction = Math.min((avgResponseTime - ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) / 100, 25);
      breakdown.push({
        metric: 'responseTime',
        value: avgResponseTime,
        threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS,
        deduction,
        reason: '平均响应时间超过慢请求阈值'
      });
    }

    // CPU使用率扣分
    if (systemMetrics.cpuUsage > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) {
      const deduction = (systemMetrics.cpuUsage - ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) * 100;
      breakdown.push({
        metric: 'cpuUsage',
        value: systemMetrics.cpuUsage,
        threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE,
        deduction,
        reason: `CPU使用率超过${ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE * 100}%`
      });
    }

    // 内存使用率扣分
    const memoryUsageRate = systemMetrics.memoryUsage / systemMetrics.heapTotal;
    if (memoryUsageRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
      const deduction = (memoryUsageRate - ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) * 100;
      breakdown.push({
        metric: 'memoryUsage',
        value: memoryUsageRate,
        threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE,
        deduction,
        reason: `内存使用率超过${ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE * 100}%`
      });
    }

    return breakdown;
  }

  /**
   * 获取默认健康报告（降级方案）
   */
  private getDefaultHealthReport(): DetailedHealthReportDto {
    return {
      score: ANALYTICS_DEFAULTS.HEALTH_SCORE,
      status: 'healthy',
      issues: [],
      recommendations: [],
      timestamp: new Date().toISOString(),
      priority: 'low'
    };
  }

  /**
   * 简化的健康评分计算（避免依赖私有方法）
   */
  private calculateSimpleHealthScore(
    endpointMetrics: EndpointMetricsDto[],
    dbMetrics: DatabaseMetricsDto,
    systemMetrics: SystemMetricsDto,
  ): number {
    let score = 100; // 起始分数

    // 错误率扣分
    const totalRequests = endpointMetrics.reduce((sum, endpoint) => sum + endpoint.totalRequests, 0);
    const totalErrors = endpointMetrics.reduce((sum, endpoint) => sum + endpoint.failedRequests, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    if (errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
      score -= Math.min(errorRate * 50, 30); // 最多扣30分
    }

    // 响应时间扣分
    const avgResponseTime = endpointMetrics.length > 0
      ? endpointMetrics.reduce((sum, endpoint) => sum + endpoint.averageResponseTime, 0) / endpointMetrics.length
      : 0;
    
    if (avgResponseTime > 1000) {
      score -= Math.min((avgResponseTime - 1000) / 100, 25); // 最多扣25分
    }

    // CPU使用率扣分
    if (systemMetrics.cpuUsage > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) {
      score -= Math.min((systemMetrics.cpuUsage - ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) * 100, 20); // 最多扣20分
    }

    // 内存使用率扣分
    const memoryUsageRate = systemMetrics.heapTotal > 0 ? systemMetrics.heapUsed / systemMetrics.heapTotal : 0;
    if (memoryUsageRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
      score -= Math.min((memoryUsageRate - ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) * 100, 15); // 最多扣15分
    }

    // 数据库性能扣分
    if (dbMetrics.averageQueryTime > 500) {
      score -= Math.min((dbMetrics.averageQueryTime - 500) / 50, 10); // 最多扣10分
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 获取默认数据库指标
   */
  private getDefaultDbMetrics(): DatabaseMetricsDto {
    return {
      connectionPoolSize: 0,
      activeConnections: 0,
      waitingConnections: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      totalQueries: 0
    };
  }

  /**
   * 获取默认系统指标
   */
  private getDefaultSystemMetrics(): SystemMetricsDto {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      heapUsed: 0,
      heapTotal: 1024 * 1024 * 1024, // 1GB default
      uptime: 0,
      eventLoopLag: 0
    };
  }

  /**
   * 获取计算历史（用于调试）
   */
  getCalculationHistory(limit: number = 10): any[] {
    return this.calculationHistory.slice(-limit);
  }
}