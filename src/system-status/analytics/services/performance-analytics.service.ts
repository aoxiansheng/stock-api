import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsPerformanceService } from '../../collect-metrics/services/metrics-performance.service';
import { PerformanceSummaryDto } from '../../collect-metrics/dto';
import type { IPerformanceAnalytics } from "../../analytics/interfaces";
import { AnalyticsCacheService } from './analytics-cache.service';
import { 
  ANALYTICS_CACHE_CONFIG, 
  ANALYTICS_EVENTS,
  ANALYTICS_PERFORMANCE_THRESHOLDS,
  ANALYTICS_DEFAULTS,
  ANALYTICS_CACHE_KEYS
} from '../constants';

/**
 * 性能分析服务
 * 负责性能数据的汇总、分析、缓存和趋势计算
 */
@Injectable()
export class PerformanceAnalyticsService implements IPerformanceAnalytics {
  private readonly logger = new Logger(PerformanceAnalyticsService.name);

  constructor(
    private readonly performanceMonitor: MetricsPerformanceService,
    private readonly cacheService: AnalyticsCacheService,
    private readonly eventEmitter: EventEmitter2,
    // 移除对 IHealthAnalytics 的依赖
  ) {
    // 注册缓存失效事件监听器
    this.setupCacheInvalidationListeners();
    // 注册健康分数更新事件监听器
    this.setupHealthScoreListeners();
  }

  /**
   * 设置缓存失效事件监听器
   * 当系统性能发生重大变化时自动失效缓存
   */
  private setupCacheInvalidationListeners(): void {
    // 监听阈值超过事件 - 系统性能警告时失效缓存
    this.eventEmitter.on(ANALYTICS_EVENTS.THRESHOLD_EXCEEDED, async (data) => {
      this.logger.debug('检测到阈值超过事件，失效性能缓存', data);
      await this.invalidateCache('performance');
    });

    // 监听健康分数计算失败事件 - 可能表示系统问题
    this.eventEmitter.on(ANALYTICS_EVENTS.HEALTH_SCORE_FAILED, async (data) => {
      this.logger.debug('健康分数计算失败，失效性能缓存', data);
      await this.invalidateCache('performance');
    });

    // 监听优化建议事件 - 系统需要优化时失效缓存以获取最新数据
    this.eventEmitter.on(ANALYTICS_EVENTS.OPTIMIZATION_SUGGESTED, async (data) => {
      this.logger.debug('系统优化建议触发，失效性能缓存', data);
      await this.invalidateCache('performance');
    });

    // 设置定时缓存失效 - 每5分钟自动刷新性能缓存
    setInterval(async () => {
      this.logger.debug('定时缓存失效触发');
      await this.invalidateCache('performance_auto');
    }, ANALYTICS_CACHE_CONFIG.AUTO_INVALIDATION_INTERVAL);

    this.logger.log('缓存失效事件监听器已设置');
  }
  
  /**
   * 设置健康分数更新事件监听器
   * 监听健康分数更新事件，更新缓存
   */
  private setupHealthScoreListeners(): void {
    // 监听健康分数更新事件
    this.eventEmitter.on(ANALYTICS_EVENTS.HEALTH_SCORE_UPDATED, async (data: { score: number }) => {
      this.logger.debug('健康分数已更新，更新缓存', { score: data.score });
      
      // 尝试更新性能摘要缓存中的健康分数
      try {
        const cacheKey = ANALYTICS_CACHE_KEYS.PERFORMANCE_SUMMARY();
        const cachedSummary = await this.cacheService.get<PerformanceSummaryDto>(cacheKey);
        
        if (cachedSummary) {
          // 更新缓存中的健康分数
          const updatedSummary = {
            ...cachedSummary,
            healthScore: data.score
          };
          
          await this.cacheService.set(
            cacheKey,
            updatedSummary,
            ANALYTICS_CACHE_CONFIG.TTL.PERFORMANCE_SUMMARY
          );
          
          this.logger.debug('性能摘要缓存中的健康分数已更新', { 
            key: cacheKey,
            oldScore: cachedSummary.healthScore,
            newScore: data.score
          });
        }
      } catch (error) {
        this.logger.error('更新性能摘要缓存中的健康分数失败', { error: error.message });
      }
    });
  }

  /**
   * 获取性能摘要数据（带缓存）
   */
  async getPerformanceSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceSummaryDto> {
    const startTime = performance.now();
    const cacheKey = ANALYTICS_CACHE_KEYS.PERFORMANCE_SUMMARY(startDate, endDate);
    
    try {
      // 🚀 缓存优先策略
      const cached = await this.cacheService.get<PerformanceSummaryDto>(cacheKey);
      if (cached) {
        this.logger.debug('性能摘要缓存命中', { 
          key: cacheKey,
          duration: performance.now() - startTime 
        });
        return cached;
      }

      // 缓存未命中，委托给现有服务获取原始数据
      this.logger.debug('性能摘要缓存未命中，委托计算', { key: cacheKey });
      const rawSummary = await this.performanceMonitor.getPerformanceSummary(startDate, endDate);
      
      // 从缓存获取健康分数
      const healthScoreKey = ANALYTICS_CACHE_KEYS.HEALTH_SCORE;
      let healthScore = await this.cacheService.get<number>(healthScoreKey);
      
      if (healthScore === null) {
        // 如果缓存中没有健康分数，发布事件请求计算健康分数
        this.eventEmitter.emit(ANALYTICS_EVENTS.HEALTH_SCORE_REQUESTED, {
          performanceSummary: rawSummary,
          timestamp: new Date().toISOString()
        });
        
        // 使用原始健康分数作为默认值
        healthScore = rawSummary.healthScore || ANALYTICS_DEFAULTS.HEALTH_SCORE;
      }
      
      const summary = {
        ...rawSummary,
        healthScore
      };
      
      // 🗃️ 缓存结果
      await this.cacheService.set(
        cacheKey, 
        summary, 
        ANALYTICS_CACHE_CONFIG.TTL.PERFORMANCE_SUMMARY
      );

      // 📊 发射性能指标事件
      this.eventEmitter.emit(ANALYTICS_EVENTS.PERFORMANCE_SUMMARY_GENERATED, {
        cacheKey,
        duration: performance.now() - startTime,
        dataPoints: summary.endpoints.length,
        healthScore: summary.healthScore
      });

      this.logger.debug('性能摘要计算完成', { 
        key: cacheKey,
        healthScore: summary.healthScore,
        duration: performance.now() - startTime
      });

      return summary;

    } catch (error) {
      this.logger.error('性能摘要计算失败', { 
        key: cacheKey,
        error: error.message,
        duration: performance.now() - startTime
      });
      
      // 返回默认值以保证系统稳定性
      return this.createDefaultPerformanceSummary();
    }
  }

  /**
   * 使缓存失效
   */
  async invalidateCache(pattern?: string): Promise<void> {
    try {
      const invalidationPattern = pattern || 'performance';
      
      await this.cacheService.invalidatePattern(invalidationPattern);
      
      // 发射缓存失效事件
      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: invalidationPattern,
        timestamp: new Date().toISOString()
      });

      this.logger.log('性能分析缓存失效', { pattern: invalidationPattern });
    } catch (error) {
      this.logger.error('缓存失效失败', { 
        pattern, 
        error: error.message 
      });
    }
  }

  /**
   * 获取端点性能指标（委托给Metrics层）
   */
  async getEndpointMetrics(): Promise<any[]> {
    const startTime = performance.now();
    const cacheKey = 'endpoint_metrics';
    
    try {
      // 缓存优先策略
      const cached = await this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        this.logger.debug('端点指标缓存命中', { 
          key: cacheKey,
          duration: performance.now() - startTime 
        });
        return cached;
      }

      // 委托给Metrics层
      const metrics = await this.performanceMonitor.getEndpointMetrics();
      
      // 缓存结果
      await this.cacheService.set(
        cacheKey, 
        metrics, 
        ANALYTICS_CACHE_CONFIG.TTL.ENDPOINT_METRICS
      );

      this.logger.debug('端点指标计算完成', { 
        key: cacheKey,
        count: metrics?.length || 0,
        duration: performance.now() - startTime
      });

      return metrics;
    } catch (error) {
      this.logger.error('端点指标获取失败', { 
        key: cacheKey,
        error: error.message,
        duration: performance.now() - startTime
      });
      return [];
    }
  }

  /**
   * 获取数据库性能指标（委托给Metrics层）
   */
  async getDatabaseMetrics(startDate?: string, endDate?: string): Promise<any> {
    const startTime = performance.now();
    const cacheKey = `database_metrics:${startDate || 'latest'}:${endDate || 'latest'}`;
    
    try {
      // 缓存优先策略
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug('数据库指标缓存命中', { 
          key: cacheKey,
          duration: performance.now() - startTime 
        });
        return cached;
      }

      // 委托给Metrics层
      const metrics = await this.performanceMonitor.getDatabaseMetrics(startDate, endDate);
      
      // 缓存结果
      await this.cacheService.set(
        cacheKey, 
        metrics, 
        ANALYTICS_CACHE_CONFIG.TTL.ENDPOINT_METRICS
      );

      this.logger.debug('数据库指标计算完成', { 
        key: cacheKey,
        duration: performance.now() - startTime
      });

      return metrics;
    } catch (error) {
      this.logger.error('数据库指标获取失败', { 
        key: cacheKey,
        error: error.message,
        duration: performance.now() - startTime
      });
      return null;
    }
  }

  /**
   * 获取Redis性能指标（委托给Metrics层）
   */
  async getRedisMetrics(): Promise<any> {
    const startTime = performance.now();
    const cacheKey = 'redis_metrics';
    
    try {
      // 缓存优先策略
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug('Redis指标缓存命中', { 
          key: cacheKey,
          duration: performance.now() - startTime 
        });
        return cached;
      }

      // 委托给Metrics层
      const metrics = await this.performanceMonitor.getRedisMetrics();
      
      // 缓存结果
      await this.cacheService.set(
        cacheKey, 
        metrics, 
        ANALYTICS_CACHE_CONFIG.TTL.ENDPOINT_METRICS
      );

      this.logger.debug('Redis指标计算完成', { 
        key: cacheKey,
        duration: performance.now() - startTime
      });

      return metrics;
    } catch (error) {
      this.logger.error('Redis指标获取失败', { 
        key: cacheKey,
        error: error.message,
        duration: performance.now() - startTime
      });
      return null;
    }
  }

  /**
   * 获取系统性能指标（委托给Metrics层）
   */
  getSystemMetrics(): any {
    try {
      // 系统指标实时性要求较高，不使用缓存
      const metrics = this.performanceMonitor.getSystemMetrics();
      
      this.logger.debug('系统指标获取完成', { 
        cpuUsage: metrics?.cpuUsage,
        memoryUsage: metrics?.memoryUsage
      });

      return metrics;
    } catch (error) {
      this.logger.error('系统指标获取失败', { 
        error: error.message
      });
      return null;
    }
  }

  /**
   * 计算性能趋势（可选实现）
   */
  calculateTrends(metrics: PerformanceSummaryDto): {
    cpuTrend: 'up' | 'down' | 'stable';
    memoryTrend: 'up' | 'down' | 'stable';
    responseTrend: 'up' | 'down' | 'stable';
    errorTrend: 'up' | 'down' | 'stable';
  } {
    try {
      // 简化的趋势计算逻辑
      const { system, summary, endpoints } = metrics;
      
      // CPU趋势：基于当前CPU使用率
      const cpuTrend: 'up' | 'down' | 'stable' = system.cpuUsage > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE 
        ? 'up' 
        : system.cpuUsage < 0.5 ? 'down' : 'stable';

      // 内存趋势：基于内存使用率
      const memoryUsageRate = system.memoryUsage / system.heapTotal;
      const memoryTrend: 'up' | 'down' | 'stable' = memoryUsageRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE
        ? 'up'
        : memoryUsageRate < 0.5 ? 'down' : 'stable';

      // 响应时间趋势：基于平均响应时间
      const responseTrend: 'up' | 'down' | 'stable' = summary.averageResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS
        ? 'up'
        : summary.averageResponseTime < ANALYTICS_PERFORMANCE_THRESHOLDS.NORMAL_REQUEST_MS ? 'down' : 'stable';

      // 错误率趋势：基于错误率
      const errorTrend: 'up' | 'down' | 'stable' = summary.errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE
        ? 'up'
        : summary.errorRate < 0.01 ? 'down' : 'stable';

      const result = { cpuTrend, memoryTrend, responseTrend, errorTrend };
      
      this.logger.debug('性能趋势计算完成', result);
      return result;
      
    } catch (error) {
      this.logger.error('性能趋势计算失败', { error: error.message });
      
      // 返回安全的默认值
      return {
        cpuTrend: 'stable',
        memoryTrend: 'stable', 
        responseTrend: 'stable',
        errorTrend: 'stable'
      };
    }
  }

  /**
   * 批量获取多个时间段的性能数据
   */
  async getBatchPerformanceSummary(
    timeRanges: Array<{ startDate?: string; endDate?: string }>
  ): Promise<PerformanceSummaryDto[]> {
    try {
      const promises = timeRanges.map(({ startDate, endDate }) => 
        this.getPerformanceSummary(startDate, endDate)
      );
      
      return await Promise.all(promises);
    } catch (error) {
      this.logger.error('批量性能摘要获取失败', { error: error.message });
      return [];
    }
  }

  /**
   * 获取性能统计概览
   */
  async getPerformanceOverview(): Promise<{
    healthScore: number;
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
    systemLoad: number;
    timestamp: string;
  }> {
    try {
      const summary = await this.getPerformanceSummary();
      
      return {
        healthScore: summary.healthScore,
        totalRequests: summary.summary.totalRequests,
        errorRate: summary.summary.errorRate,
        avgResponseTime: summary.summary.averageResponseTime,
        systemLoad: summary.summary.systemLoad,
        timestamp: summary.timestamp
      };
    } catch (error) {
      this.logger.error('性能概览获取失败', { error: error.message });
      
      return {
        healthScore: 0,
        totalRequests: 0,
        errorRate: 0,
        avgResponseTime: 0,
        systemLoad: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查是否存在性能警告
   */
  async checkPerformanceWarnings(): Promise<{
    hasWarnings: boolean;
    warnings: string[];
  }> {
    try {
      const summary = await this.getPerformanceSummary();
      const warnings: string[] = [];

      // 检查各项性能指标
      if (summary.summary.errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
        warnings.push(`错误率过高: ${(summary.summary.errorRate * 100).toFixed(2)}%`);
      }

      if (summary.summary.averageResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
        warnings.push(`平均响应时间过慢: ${summary.summary.averageResponseTime}ms`);
      }

      if (summary.system.cpuUsage > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) {
        warnings.push(`CPU使用率过高: ${(summary.system.cpuUsage * 100).toFixed(1)}%`);
      }

      const memoryUsageRate = summary.system.memoryUsage / summary.system.heapTotal;
      if (memoryUsageRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
        warnings.push(`内存使用率过高: ${(memoryUsageRate * 100).toFixed(1)}%`);
      }

      if (summary.summary.cacheHitRate < ANALYTICS_PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE) {
        warnings.push(`缓存命中率过低: ${(summary.summary.cacheHitRate * 100).toFixed(1)}%`);
      }

      // 如果有警告，发射事件
      if (warnings.length > 0) {
        this.eventEmitter.emit(ANALYTICS_EVENTS.THRESHOLD_EXCEEDED, {
          warnings,
          healthScore: summary.healthScore,
          timestamp: new Date().toISOString()
        });
      }

      return {
        hasWarnings: warnings.length > 0,
        warnings
      };
    } catch (error) {
      this.logger.error('性能警告检查失败', { error: error.message });
      return { hasWarnings: false, warnings: [] };
    }
  }

  /**
   * 创建默认性能摘要（作为降级方案）
   */
  private createDefaultPerformanceSummary(): PerformanceSummaryDto {
    return {
      timestamp: new Date().toISOString(),
      healthScore: 100, // 默认健康分数
      processingTime: 0,
      summary: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        systemLoad: 0,
        memoryUsage: 0,
        cacheHitRate: 0
      },
      endpoints: [],
      database: {
        connectionPoolSize: 0,
        activeConnections: 0,
        waitingConnections: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0
      },
      redis: {
        memoryUsage: 0,
        connectedClients: 0,
        opsPerSecond: 0,
        hitRate: 0,
        evictedKeys: 0,
        expiredKeys: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        heapUsed: 0,
        heapTotal: 0,
        uptime: 0,
        eventLoopLag: 0
      }
    };
  }
}