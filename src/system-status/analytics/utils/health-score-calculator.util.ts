/**
 * 健康分计算器工具类
 * 统一的健康分计算逻辑，供Analytics层多个服务复用
 */

import { ANALYTICS_PERFORMANCE_THRESHOLDS, HEALTH_THRESHOLDS } from '../constants';
import type { PerformanceSummaryDto } from '../../collect-metrics/dto/performance-summary.dto';
import type { HealthStatus, HealthPriority } from '../interfaces';

export interface HealthScoreBreakdown {
  metric: string;
  value: number;
  threshold: number;
  deduction: number;
  reason: string;
}

export interface HealthScoreResult {
  score: number;
  breakdown?: HealthScoreBreakdown[];
}

export class HealthScoreCalculator {
  /**
   * 计算简化版健康分（用于快速评估）
   */
  static calculateSimpleHealthScore(errorRate: number, avgResponseTime: number): number {
    let score = 100;
    
    // 错误率扣分
    if (errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
      score -= Math.min(errorRate * 300, 30);
    }
    
    // 响应时间扣分
    if (avgResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      score -= Math.min((avgResponseTime - ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) / 100, 25);
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * 计算详细版健康分（带扣分明细）
   */
  static calculateDetailedHealthScore(summary: PerformanceSummaryDto): HealthScoreResult {
    let score = 100;
    const breakdown: HealthScoreBreakdown[] = [];

    try {
      // 1. 错误率评估
      const errorRate = summary.summary?.errorRate || 0;
      if (errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
        const deduction = Math.min(errorRate * 300, 30);
        score -= deduction;
        breakdown.push({
          metric: 'errorRate',
          value: errorRate,
          threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE,
          deduction,
          reason: `错误率超过${(ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE * 100)}%阈值`
        });
      }

      // 2. 响应时间评估
      const avgResponseTime = summary.summary?.averageResponseTime || 0;
      if (avgResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
        const deduction = Math.min((avgResponseTime - ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) / 100, 25);
        score -= deduction;
        breakdown.push({
          metric: 'avgResponseTime',
          value: avgResponseTime,
          threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS,
          deduction,
          reason: `平均响应时间超过${ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS}ms阈值`
        });
      }

      // 3. CPU使用率评估
      const systemMetrics = summary.system;
      if (systemMetrics?.cpuUsage > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) {
        const deduction = (systemMetrics.cpuUsage - ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) * 100;
        score -= deduction;
        breakdown.push({
          metric: 'cpuUsage',
          value: systemMetrics.cpuUsage,
          threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE,
          deduction,
          reason: `CPU使用率超过${ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE * 100}%`
        });
      }

      // 4. 内存使用率评估
      if (systemMetrics?.memoryUsage && systemMetrics?.heapTotal) {
        const memoryUsageRate = systemMetrics.memoryUsage / systemMetrics.heapTotal;
        if (memoryUsageRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
          const deduction = (memoryUsageRate - ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) * 100;
          score -= deduction;
          breakdown.push({
            metric: 'memoryUsage',
            value: memoryUsageRate,
            threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE,
            deduction,
            reason: `内存使用率超过${ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE * 100}%`
          });
        }
      }

      return {
        score: Math.max(0, Math.round(score)),
        breakdown
      };

    } catch (error) {
      // 计算失败时返回默认值
      return {
        score: 50, // 中等健康分
        breakdown: [{
          metric: 'calculation_error',
          value: 0,
          threshold: 0,
          deduction: 50,
          reason: '健康分计算过程中发生异常'
        }]
      };
    }
  }

  /**
   * 根据健康分确定健康状态
   */
  static determineHealthStatus(score: number): HealthStatus {
    return HEALTH_THRESHOLDS.getStatus(score);
  }
  
  /**
   * 识别系统问题
   * @param summary 性能摘要数据
   * @returns 问题列表
   */
  static identifyIssues(summary: PerformanceSummaryDto): string[] {
    const issues: string[] = [];
    
    try {
      // 检查summary结构完整性
      if (!summary) {
        issues.push("系统监控数据不可用");
        return issues;
      }
      
      const score = this.calculateDetailedHealthScore(summary).score;
      
      // 基于健康评分识别问题
      if (score < HEALTH_THRESHOLDS.WARNING.score) {
        issues.push('系统健康度低于警告阈值');
      }

      // 使用类型断言确保类型安全
      const summaryData = (summary.summary || {}) as Record<string, any>;
      const systemData = (summary.system || {}) as Record<string, any>;
      const databaseData = (summary.database || {}) as Record<string, any>;

      // 错误率问题
      const errorRate = summaryData.errorRate !== undefined ? summaryData.errorRate : 0;
      if (errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
        issues.push(`错误率过高: ${(errorRate * 100).toFixed(2)}%`);
      }

      // 响应时间问题
      const avgResponseTime = summaryData.averageResponseTime !== undefined ? summaryData.averageResponseTime : 0;
      if (avgResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
        issues.push(`平均响应时间过慢: ${avgResponseTime}ms`);
      }

      // CPU使用率问题
      const cpuUsage = systemData.cpuUsage !== undefined ? systemData.cpuUsage : 0;
      if (cpuUsage > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_CPU_USAGE) {
        issues.push(`CPU使用率过高: ${(cpuUsage * 100).toFixed(1)}%`);
      }

      // 内存使用率问题
      const memoryUsage = systemData.memoryUsage !== undefined ? systemData.memoryUsage : 0;
      const heapTotal = systemData.heapTotal !== undefined ? systemData.heapTotal : 1;
      const memoryUsageRate = memoryUsage / heapTotal;
      if (memoryUsageRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
        issues.push(`内存使用率过高: ${(memoryUsageRate * 100).toFixed(1)}%`);
      }

      // 缓存命中率问题
      const cacheHitRate = summaryData.cacheHitRate !== undefined ? summaryData.cacheHitRate : 0;
      if (cacheHitRate < ANALYTICS_PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE) {
        issues.push(`缓存命中率过低: ${(cacheHitRate * 100).toFixed(1)}%`);
      }

      // 数据库性能问题
      const avgQueryTime = databaseData.averageQueryTime !== undefined ? databaseData.averageQueryTime : 0;
      if (avgQueryTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
        issues.push(`数据库查询过慢: 平均${avgQueryTime}ms`);
      }

      // 端点性能问题
      if (summary.endpoints?.length > 0) {
        const slowEndpoints = summary.endpoints.filter(
          (ep: any) => ep.averageResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS
        );
        if (slowEndpoints.length > 0) {
          issues.push(`存在${slowEndpoints.length}个慢响应端点`);
        }
      }
      
      return issues;
      
    } catch (error) {
      issues.push('问题识别过程中发生错误');
      return issues;
    }
  }
  
  /**
   * 生成优化建议
   * @param issues 问题列表
   * @returns 建议列表
   */
  static generateRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];

    try {
      issues.forEach(issue => {
        if (issue.includes('错误率')) {
          recommendations.push('检查应用日志，修复导致错误的代码逻辑');
          recommendations.push('加强输入验证和异常处理');
        }
        
        if (issue.includes('响应时间')) {
          recommendations.push('优化数据库查询，添加必要的索引');
          recommendations.push('考虑实现缓存策略以减少重复计算');
          recommendations.push('检查并优化慢速的业务逻辑');
        }
        
        if (issue.includes('CPU使用率')) {
          recommendations.push('检查是否存在CPU密集型操作');
          recommendations.push('考虑使用异步处理减少阻塞');
          recommendations.push('评估是否需要水平扩容');
        }
        
        if (issue.includes('内存使用率')) {
          recommendations.push('检查是否存在内存泄漏');
          recommendations.push('优化对象创建和垃圾回收');
          recommendations.push('考虑增加服务器内存配置');
        }
        
        if (issue.includes('缓存命中率')) {
          recommendations.push('检查缓存策略配置');
          recommendations.push('优化缓存键的设计');
          recommendations.push('考虑调整缓存TTL设置');
        }
        
        if (issue.includes('数据库')) {
          recommendations.push('优化数据库查询语句');
          recommendations.push('检查数据库索引配置');
          recommendations.push('考虑数据库连接池优化');
        }
        
        if (issue.includes('端点')) {
          recommendations.push('分析慢响应端点的具体原因');
          recommendations.push('考虑对慢端点实现专门的优化');
        }
      });

      // 去重并添加通用建议
      const uniqueRecommendations = [...new Set(recommendations)];
      
      if (issues.length > 0) {
        uniqueRecommendations.push('定期监控系统性能指标');
        uniqueRecommendations.push('建立性能基线以便对比分析');
      }

      return uniqueRecommendations;
      
    } catch (error) {
      return ['建议咨询系统管理员进行详细分析'];
    }
  }
  
  /**
   * 分类问题优先级
   * @param score 健康评分
   * @returns 优先级标签
   */
  static categorizePriority(score: number): HealthPriority {
    return HEALTH_THRESHOLDS.getPriority(score);
  }
}