import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAnalyzer } from '../../contracts/interfaces/analyzer.interface';
import { ISystemStatusErrorHandler } from '../../contracts/interfaces/error-handler.interface';
import { GetDbPerformanceQueryDto } from '../dto/monitoring-query.dto';
import { createLogger } from '@common/config/logger.config';

/**
 * 展示层业务服务
 * 负责处理系统状态监控数据的业务逻辑
 */
@Injectable()
export class PresenterService {
  private readonly logger = createLogger(PresenterService.name);

  constructor(
    @Inject('IAnalyzer')
    private readonly analyzer: IAnalyzer,
    @Inject('ISystemStatusErrorHandler')
    private readonly errorHandler: ISystemStatusErrorHandler,
  ) {
    this.logger.log('PresenterService initialized - 展示层业务服务已启动');
  }

  /**
   * 获取性能分析数据
   */
  async getPerformanceAnalysis(query: GetDbPerformanceQueryDto) {
    try {
      const options = {
        startTime: query.startDate ? new Date(query.startDate) : undefined,
        endTime: query.endDate ? new Date(query.endDate) : undefined,
        includeDetails: true
      };

      const analysis = await this.analyzer.getPerformanceAnalysis(options);

      this.logger.debug("性能分析数据获取成功", {
        healthScore: analysis.healthScore,
        totalRequests: analysis.summary.totalRequests,
      });

      return analysis;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getPerformanceAnalysis',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取健康评分
   */
  async getHealthScore() {
    try {
      const score = await this.analyzer.getHealthScore();
      
      return {
        score,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getHealthScore',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取详细健康报告
   */
  async getHealthReport() {
    try {
      const report = await this.analyzer.getHealthReport();
      
      this.logger.debug("健康报告获取成功", {
        overallScore: report.overall.score,
        status: report.overall.status,
        recommendationsCount: report.recommendations?.length || 0
      });

      return report;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getHealthReport',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取趋势分析
   */
  async getTrends(period: string = '1h') {
    try {
      // 简单参数验证
      if (period && !/^(\d+)([smhd])$/.test(period)) {
        throw new BadRequestException('无效的时间周期格式，支持格式：1s, 5m, 1h, 1d');
      }

      const trends = await this.analyzer.calculateTrends(period);
      
      this.logger.debug("趋势分析获取成功", { period });

      return trends;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getTrends',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取端点指标
   */
  async getEndpointMetrics(limit?: string) {
    try {
      let limitNum: number | undefined;
      
      if (limit) {
        limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
          throw new BadRequestException('limit必须在1-1000之间');
        }
      }

      const metrics = await this.analyzer.getEndpointMetrics(limitNum);
      
      this.logger.debug("端点指标获取成功", { 
        count: metrics.length,
        limit: limitNum 
      });

      return metrics;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getEndpointMetrics',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取数据库指标
   */
  async getDatabaseMetrics() {
    try {
      const metrics = await this.analyzer.getDatabaseMetrics();
      
      this.logger.debug("数据库指标获取成功", {
        totalOperations: metrics.totalOperations,
        averageQueryTime: metrics.averageQueryTime
      });

      return metrics;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getDatabaseMetrics',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取缓存指标
   */
  async getCacheMetrics() {
    try {
      const metrics = await this.analyzer.getCacheMetrics();
      
      this.logger.debug("缓存指标获取成功", {
        hitRate: metrics.hitRate,
        totalOperations: metrics.totalOperations
      });

      return metrics;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getCacheMetrics',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取优化建议
   */
  async getOptimizationSuggestions() {
    try {
      const suggestions = await this.analyzer.getOptimizationSuggestions();
      
      this.logger.debug("优化建议获取成功", { 
        count: suggestions.length,
        highPriority: suggestions.filter(s => s.priority === 'high').length
      });

      return suggestions;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getOptimizationSuggestions',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats() {
    try {
      const stats = await this.analyzer.getCacheStats();
      
      this.logger.debug("缓存统计获取成功", { 
        hitRate: stats.hitRate,
        totalRequests: stats.totalRequests
      });

      return stats;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getCacheStats',
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 失效缓存
   */
  async invalidateCache(pattern?: string) {
    try {
      await this.analyzer.invalidateCache(pattern);
      
      const result = {
        message: '缓存失效成功',
        pattern: pattern || 'all',
        timestamp: new Date().toISOString()
      };

      this.logger.debug("缓存失效操作完成", { pattern: pattern || 'all' });

      return result;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'invalidateCache',
        userId: 'admin'
      });
      throw error;
    }
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
    try {
      // 并行获取仪表板所需的各种数据
      const [healthScore, performanceAnalysis, trends, suggestions] = await Promise.all([
        this.analyzer.getHealthScore(),
        this.analyzer.getPerformanceAnalysis({ includeDetails: false }),
        this.analyzer.calculateTrends('1h'),
        this.analyzer.getOptimizationSuggestions()
      ]);

      const result = {
        timestamp: new Date().toISOString(),
        healthScore,
        performanceSummary: {
          totalRequests: performanceAnalysis.summary.totalRequests,
          averageResponseTime: performanceAnalysis.averageResponseTime,
          errorRate: performanceAnalysis.errorRate,
          throughput: performanceAnalysis.throughput
        },
        trendsData: trends,
        criticalIssues: suggestions.filter(s => s.priority === 'high'),
        suggestions: suggestions.slice(0, 5) // 只返回前5个建议
      };

      this.logger.debug("仪表板数据获取成功", {
        healthScore,
        totalRequests: result.performanceSummary.totalRequests,
        criticalIssues: result.criticalIssues.length
      });

      return result;
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getDashboardData',
        userId: 'admin'
      });
      throw error;
    }
  }
}