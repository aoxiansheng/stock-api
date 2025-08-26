import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RawMetricsDto } from '../contracts/interfaces/collector.interface';
import { HealthReportDto } from '../contracts/interfaces/analyzer.interface';
import { SYSTEM_STATUS_EVENTS } from '../contracts/events/system-status.events';
import { AnalyzerHealthScoreCalculator } from './analyzer-score.service';
import { MonitoringCacheService } from '../cache/monitoring-cache.service';

/**
 * 健康分析服务
 * 职责：专门处理系统健康分析，包括健康分计算、状态评估、建议生成
 */
@Injectable()
export class HealthAnalyzerService {
  private readonly logger = createLogger(HealthAnalyzerService.name);

  constructor(
    private readonly healthScoreCalculator: AnalyzerHealthScoreCalculator,
    private readonly monitoringCache: MonitoringCacheService, // 替换为MonitoringCacheService
    private readonly eventBus: EventEmitter2,
  ) {
    this.logger.log('HealthAnalyzerService initialized - 健康分析服务已启动');
  }

  /**
   * 生成健康报告
   */
  async generateHealthReport(rawMetrics: RawMetricsDto): Promise<HealthReportDto> {
    try {
      this.logger.debug('开始生成健康报告');

      // 使用getOrSet热点路径优化（自动处理分布式锁和缓存回填）
      const cacheKey = this.buildCacheKey('health_report', rawMetrics);
      
      const healthReport = await this.monitoringCache.getOrSetHealthData<HealthReportDto>(
        cacheKey,
        async () => {
          // 缓存未命中，重新计算健康报告
          this.logger.debug('健康报告缓存未命中，重新生成');

          // 计算健康分
          const healthScore = this.healthScoreCalculator.calculateOverallHealthScore(rawMetrics);
          const healthGrade = this.healthScoreCalculator.getHealthGrade(healthScore);
          const healthStatus = this.healthScoreCalculator.getHealthStatus(healthScore);

          // 计算各组件健康分
          const componentScores = {
            api: this.healthScoreCalculator.calculateApiHealthScore(rawMetrics),
            database: this.healthScoreCalculator.calculateDatabaseHealthScore(rawMetrics),
            cache: this.healthScoreCalculator.calculateCacheHealthScore(rawMetrics),
            system: this.healthScoreCalculator.calculateSystemHealthScore(rawMetrics)
          };

          // 生成健康建议
          const recommendations = this.healthScoreCalculator.generateHealthRecommendations(rawMetrics);

          // 获取具体组件指标
          const requests = rawMetrics.requests || [];
          const dbOps = rawMetrics.database || [];
          const cacheOps = rawMetrics.cache || [];
          const system = rawMetrics.system;

          // 计算详细组件指标
          const avgResponseTime = requests.length > 0 
            ? requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length 
            : 0;
          const errorRate = requests.length > 0 
            ? requests.filter(r => r.statusCode >= 400).length / requests.length 
            : 0;
          
          const avgQueryTime = dbOps.length > 0 
            ? dbOps.reduce((sum, op) => sum + op.duration, 0) / dbOps.length 
            : 0;
          const dbFailureRate = dbOps.length > 0 
            ? dbOps.filter(op => !op.success).length / dbOps.length 
            : 0;

          const cacheHitRate = cacheOps.length > 0 
            ? cacheOps.filter(op => op.hit).length / cacheOps.length 
            : 0;
          const cacheAvgResponseTime = cacheOps.length > 0 
            ? cacheOps.reduce((sum, op) => sum + op.duration, 0) / cacheOps.length 
            : 0;

          // 构建健康报告
          const report: HealthReportDto = {
            overall: {
              score: healthScore,
              status: healthStatus,
              timestamp: new Date()
            },
            components: {
              api: {
                score: componentScores.api,
                responseTime: Math.round(avgResponseTime),
                errorRate: Math.round(errorRate * 10000) / 10000
              },
              database: {
                score: componentScores.database,
                averageQueryTime: Math.round(avgQueryTime),
                failureRate: Math.round(dbFailureRate * 10000) / 10000
              },
              cache: {
                score: componentScores.cache,
                hitRate: Math.round(cacheHitRate * 10000) / 10000,
                averageResponseTime: Math.round(cacheAvgResponseTime)
              },
              system: {
                score: componentScores.system,
                memoryUsage: system?.memory.percentage || 0,
                cpuUsage: system?.cpu.usage || 0
              }
            },
            recommendations
          };

          // 发射分析完成事件
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED, {
            timestamp: new Date(),
            source: 'health-analyzer',
            metadata: { 
              type: 'health_analysis',
              healthScore,
              healthStatus,
              recommendationsCount: report.recommendations?.length || 0
            }
          });

          // 如果健康分过低，发射警告事件
          if (healthScore < 50) {
            this.eventBus.emit(SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED, {
              timestamp: new Date(),
              source: 'health-analyzer',
              metadata: { 
                healthScore,
                previousScore: 50, // 简化实现，实际应该记录历史分数
                trend: 'critical',
                recommendations: report.recommendations
              }
            });
          }

          this.logger.debug(`健康报告生成完成: 健康分 ${healthScore}, 状态 ${healthStatus}`);
          return report;
        }
      );

      // 发射缓存命中或回填完成事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_HIT, {
        timestamp: new Date(),
        source: 'health-analyzer',
        metadata: { cacheKey, type: 'health_report' }
      });

      return healthReport;

    } catch (error) {
      this.logger.error('健康报告生成失败', error.stack);
      
      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR, {
        timestamp: new Date(),
        source: 'health-analyzer',
        metadata: { error: error.message, operation: 'generateHealthReport' }
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
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    criticalIssues: string[];
  }> {
    try {
      const healthScore = this.healthScoreCalculator.calculateOverallHealthScore(rawMetrics);
      const healthStatus = this.healthScoreCalculator.getHealthStatus(healthScore);
      const componentScores = {
        api: this.healthScoreCalculator.calculateApiHealthScore(rawMetrics),
        database: this.healthScoreCalculator.calculateDatabaseHealthScore(rawMetrics),
        cache: this.healthScoreCalculator.calculateCacheHealthScore(rawMetrics),
        system: this.healthScoreCalculator.calculateSystemHealthScore(rawMetrics)
      };

      const criticalIssues = this.identifyCriticalIssues(rawMetrics, componentScores);

      return {
        isHealthy: healthStatus === 'healthy',
        score: healthScore,
        status: healthStatus,
        criticalIssues
      };

    } catch (error) {
      this.logger.error('快速健康检查失败', error.stack);
      return {
        isHealthy: false,
        score: 0,
        status: 'critical',
        criticalIssues: ['健康检查系统异常']
      };
    }
  }

  /**
   * 获取健康趋势
   */
  async getHealthTrends(currentMetrics: RawMetricsDto, historicalMetrics?: RawMetricsDto[]): Promise<{
    currentScore: number;
    trend: 'improving' | 'stable' | 'declining';
    changePercentage: number;
    periodComparison: string;
  }> {
    try {
      const currentScore = this.healthScoreCalculator.calculateOverallHealthScore(currentMetrics);
      
      if (!historicalMetrics || historicalMetrics.length === 0) {
        return {
          currentScore,
          trend: 'stable',
          changePercentage: 0,
          periodComparison: '无历史数据'
        };
      }

      // 计算历史平均分
      const historicalScores = historicalMetrics.map(metrics => 
        this.healthScoreCalculator.calculateOverallHealthScore(metrics)
      );
      const averageHistoricalScore = historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length;

      // 计算变化百分比
      const changePercentage = ((currentScore - averageHistoricalScore) / averageHistoricalScore) * 100;

      // 确定趋势
      let trend: 'improving' | 'stable' | 'declining';
      if (Math.abs(changePercentage) < 5) {
        trend = 'stable';
      } else if (changePercentage > 0) {
        trend = 'improving';
      } else {
        trend = 'declining';
      }

      return {
        currentScore,
        trend,
        changePercentage: Math.round(changePercentage * 100) / 100,
        periodComparison: `相比过去${historicalMetrics.length}个周期`
      };

    } catch (error) {
      this.logger.error('健康趋势分析失败', error.stack);
      return {
        currentScore: 50,
        trend: 'stable',
        changePercentage: 0,
        periodComparison: '趋势分析异常'
      };
    }
  }

  /**
   * 失效健康相关缓存
   */
  async invalidateHealthCache(): Promise<void> {
    try {
      await this.monitoringCache.invalidateHealthCache();
      this.logger.debug('健康相关缓存已失效');

      // 发射缓存失效事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED, {
        timestamp: new Date(),
        source: 'health-analyzer',
        metadata: { pattern: 'health_*', reason: 'manual_invalidation' }
      });

    } catch (error) {
      this.logger.error('健康缓存失效失败', error.stack);
    }
  }

  /**
   * 识别关键问题
   */
  private identifyCriticalIssues(
    rawMetrics: RawMetricsDto, 
    componentScores: Record<string, number>
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
        const errorRate = requests.filter(r => r.statusCode >= 400).length / requests.length;
        if (errorRate > 0.1) {
          criticalIssues.push(`API错误率过高: ${Math.round(errorRate * 100)}%`);
        }

        const avgResponseTime = requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length;
        if (avgResponseTime > 2000) {
          criticalIssues.push(`API响应时间过慢: ${Math.round(avgResponseTime)}ms`);
        }
      }

      // 检查数据库指标
      const dbOps = rawMetrics.database || [];
      if (dbOps.length > 0) {
        const dbFailureRate = dbOps.filter(op => !op.success).length / dbOps.length;
        if (dbFailureRate > 0.05) {
          criticalIssues.push(`数据库失败率过高: ${Math.round(dbFailureRate * 100)}%`);
        }
      }

      // 检查系统指标
      if (rawMetrics.system) {
        if (rawMetrics.system.cpu.usage > 0.9) {
          criticalIssues.push(`CPU使用率过高: ${Math.round(rawMetrics.system.cpu.usage * 100)}%`);
        }
        if (rawMetrics.system.memory.percentage > 0.9) {
          criticalIssues.push(`内存使用率过高: ${Math.round(rawMetrics.system.memory.percentage * 100)}%`);
        }
      }

    } catch (error) {
      this.logger.error('识别关键问题失败', error.stack);
      criticalIssues.push('问题识别系统异常');
    }

    return criticalIssues;
  }

  /**
   * 分析健康趋势
   */
  private analyzeHealthTrends(
    healthScore: number, 
    componentScores: Record<string, number>
  ): string {
    try {
      const issues: string[] = [];
      
      if (healthScore < 50) {
        issues.push('整体健康状况需要关注');
      }

      const poorComponents = Object.entries(componentScores)
        .filter(([, score]) => score < 50)
        .map(([component]) => component);
      
      if (poorComponents.length > 0) {
        issues.push(`${poorComponents.join('、')}组件需要优化`);
      }

      return issues.length > 0 ? issues.join('；') : '系统运行良好';

    } catch (error) {
      this.logger.error('健康趋势分析失败', error.stack);
      return '趋势分析异常';
    }
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(type: string, rawMetrics: RawMetricsDto): string {
    const hash = this.generateMetricsHash(rawMetrics);
    return `health_${type}_${hash}`;
  }

  /**
   * 生成指标哈希
   */
  private generateMetricsHash(rawMetrics: RawMetricsDto): string {
    const content = JSON.stringify({
      requestsCount: rawMetrics.requests?.length || 0,
      databaseCount: rawMetrics.database?.length || 0,
      cacheCount: rawMetrics.cache?.length || 0,
      hasSystem: !!rawMetrics.system
    });
    
    // 简化哈希实现
    return Buffer.from(content).toString('base64').substring(0, 8);
  }

  /**
   * 获取默认健康报告
   */
  private getDefaultHealthReport(): HealthReportDto {
    return {
      overall: {
        score: 50,
        status: 'warning',
        timestamp: new Date()
      },
      components: {
        api: {
          score: 50,
          responseTime: 0,
          errorRate: 0
        },
        database: {
          score: 50,
          averageQueryTime: 0,
          failureRate: 0
        },
        cache: {
          score: 50,
          hitRate: 0,
          averageResponseTime: 0
        },
        system: {
          score: 50,
          memoryUsage: 0,
          cpuUsage: 0
        }
      },
      recommendations: ['系统健康检查异常，请检查监控系统状态']
    };
  }
}