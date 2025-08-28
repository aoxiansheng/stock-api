import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import { GetDbPerformanceQueryDto } from './dto/presenter-query.dto';
import { AnalyzerService } from '../analyzer/analyzer.service';
import { PresenterErrorHandlerService } from './presenter-error.service';
import { createLogger } from '../../common/config/logger.config';

/**
 * 展示层业务服务
 * 负责处理系统状态监控数据的业务逻辑
 */
@Injectable()
export class PresenterService {
  private readonly logger = createLogger(PresenterService.name);

  constructor(
    private readonly analyzer: AnalyzerService,
    private readonly errorHandler: PresenterErrorHandlerService,
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

  /**
   * 注册自定义监控指标 (Data Mapper 组件支持)
   */
  async registerCustomMetrics(componentName: string, config: any) {
    try {
      this.logger.log(`注册自定义监控指标: ${componentName}`, {
        metricsCount: Object.keys(config.dataMapperMetrics || {}).length,
        alertRulesCount: config.alertingRules?.criticalErrors?.length || 0
      });

      // 存储组件配置到内存 (实际应用可能需要持久化存储)
      if (!this.customMetricsConfig) {
        this.customMetricsConfig = new Map();
      }
      
      this.customMetricsConfig.set(componentName, {
        config,
        registeredAt: new Date(),
        enabled: true
      });

      this.logger.log(`✅ 自定义监控指标注册成功: ${componentName}`);
      
      return {
        componentName,
        status: 'registered',
        timestamp: new Date().toISOString(),
        metricsRegistered: true
      };
      
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'registerCustomMetrics',
        componentName,
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取指定组件的监控指标
   */
  async getMetrics(componentName: string) {
    try {
      if (!this.customMetricsConfig?.has(componentName)) {
        throw new BadRequestException(`组件 ${componentName} 的监控指标未找到`);
      }

      const componentConfig = this.customMetricsConfig.get(componentName);
      
      // 模拟获取实际指标数据 (实际应用需要从监控后端获取)
      const mockMetrics = this.generateMockMetricsData(componentName, componentConfig.config);

      this.logger.debug(`获取组件监控指标: ${componentName}`, {
        metricsCount: mockMetrics.length
      });

      return mockMetrics;
      
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getMetrics',
        componentName,
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 创建监控仪表盘
   */
  async createDashboard(dashboardId: string, dashboardConfig: any) {
    try {
      this.logger.log(`创建监控仪表盘: ${dashboardId}`, {
        panelsCount: dashboardConfig.panels?.length || 0,
        title: dashboardConfig.title
      });

      // 存储仪表盘配置
      if (!this.dashboardConfigs) {
        this.dashboardConfigs = new Map();
      }
      
      this.dashboardConfigs.set(dashboardId, {
        config: dashboardConfig,
        createdAt: new Date(),
        enabled: true,
        viewCount: 0
      });

      this.logger.log(`✅ 监控仪表盘创建成功: ${dashboardId}`);
      
      return {
        dashboardId,
        title: dashboardConfig.title,
        status: 'created',
        timestamp: new Date().toISOString(),
        url: `/monitoring/dashboard/${dashboardId}`
      };
      
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'createDashboard',
        dashboardId,
        userId: 'admin'
      });
      throw error;
    }
  }

  /**
   * 获取仪表盘数据
   */
  async getDashboard(dashboardId: string) {
    try {
      if (!this.dashboardConfigs?.has(dashboardId)) {
        throw new BadRequestException(`仪表盘 ${dashboardId} 未找到`);
      }

      const dashboard = this.dashboardConfigs.get(dashboardId);
      
      // 增加访问计数
      dashboard.viewCount += 1;
      
      // 生成仪表盘实时数据
      const dashboardData = await this.generateDashboardData(dashboardId, dashboard.config);

      this.logger.debug(`获取仪表盘数据: ${dashboardId}`, {
        panelsCount: dashboardData.panels?.length || 0,
        viewCount: dashboard.viewCount
      });

      return {
        ...dashboardData,
        metadata: {
          dashboardId,
          title: dashboard.config.title,
          createdAt: dashboard.createdAt,
          lastViewedAt: new Date(),
          viewCount: dashboard.viewCount
        }
      };
      
    } catch (error) {
      this.errorHandler.handleError(error, {
        layer: 'presenter',
        operation: 'getDashboard',
        dashboardId,
        userId: 'admin'
      });
      throw error;
    }
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

    if (componentName === 'data-mapper' && config.dataMapperMetrics) {
      // 数据库查询指标
      metrics.push({
        name: 'data_mapper_database_query_duration',
        value: Math.random() * 200 + 100, // 100-300ms
        unit: 'ms',
        timestamp: now,
        labels: { service: 'FlexibleMappingRuleService', operation: 'updateRuleStats' }
      });

      metrics.push({
        name: 'data_mapper_database_query_success_rate',
        value: Math.random() * 5 + 95, // 95-100%
        unit: '%',
        timestamp: now,
        labels: { service: 'FlexibleMappingRuleService' }
      });

      // 缓存操作指标
      metrics.push({
        name: 'data_mapper_cache_operation_duration',
        value: Math.random() * 500 + 200, // 200-700ms
        unit: 'ms',
        timestamp: now,
        labels: { service: 'DataMapperCacheService', operation: 'scanKeys' }
      });

      metrics.push({
        name: 'data_mapper_cache_hit_rate',
        value: Math.random() * 10 + 85, // 85-95%
        unit: '%',
        timestamp: now,
        labels: { service: 'DataMapperCacheService' }
      });

      // 业务逻辑指标
      metrics.push({
        name: 'data_mapper_mapping_success_rate',
        value: Math.random() * 3 + 97, // 97-100%
        unit: '%',
        timestamp: now,
        labels: { service: 'DataMapperService' }
      });

      // 任务限流器指标
      metrics.push({
        name: 'data_mapper_task_limiter_pending_count',
        value: Math.floor(Math.random() * 20), // 0-19
        unit: 'count',
        timestamp: now,
        labels: { service: 'AsyncTaskLimiter' }
      });
    }

    return metrics;
  }

  /**
   * 生成仪表盘数据 (私有方法)
   */
  private async generateDashboardData(dashboardId: string, config: any): Promise<any> {
    const panels = [];
    
    if (config.panels) {
      for (const panelConfig of config.panels) {
        const panelData = {
          title: panelConfig.title,
          type: panelConfig.type,
          data: this.generatePanelData(panelConfig),
          thresholds: panelConfig.thresholds,
          lastUpdated: new Date().toISOString()
        };
        panels.push(panelData);
      }
    }

    return {
      title: config.title,
      panels,
      refreshedAt: new Date().toISOString()
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
        if (metricName.includes('duration') || metricName.includes('time')) {
          value = Math.random() * 500 + 100; // 100-600ms
        } else if (metricName.includes('rate') || metricName.includes('success')) {
          value = Math.random() * 10 + 90; // 90-100%
        } else if (metricName.includes('count')) {
          value = Math.floor(Math.random() * 50); // 0-49
        } else {
          value = Math.random() * 100; // 0-100
        }
        
        mockData.push({
          metric: metricName,
          timestamp,
          value
        });
      });
    }
    
    return mockData;
  }
}