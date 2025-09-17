/**
 * Compatibility Monitoring Service
 * 🎯 为v3.0.0迁移提供实时监控和报告
 * 
 * @description 集成使用跟踪器，提供监控仪表板和自动化报告
 * @author Cache Module Team
 * @date 2025-09-17
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";

import { 
  CompatibilityUsageTracker, 
  CompatibilityUsageEvent, 
  CompatibilityUsageStats,
  MigrationRecommendation 
} from "../utils/compatibility-usage-tracker";

/**
 * 监控报告接口
 */
export interface CompatibilityMonitoringReport {
  reportId: string;
  generatedAt: Date;
  reportPeriod: string;
  usageStats: CompatibilityUsageStats;
  migrationRecommendations: MigrationRecommendation[];
  riskAssessment: {
    criticalComponents: string[];
    readyForMigration: string[];
    blockers: string[];
  };
  trendsAnalysis: {
    usageDecreasing: boolean;
    migrationProgress: number; // 0-100%
    estimatedCompletionDate?: Date;
  };
}

/**
 * 监控告警接口
 */
export interface CompatibilityAlert {
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  component: string;
  message: string;
  timestamp: Date;
  actionRequired?: string;
  migrationUrl?: string;
}

@Injectable()
export class CompatibilityMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(CompatibilityMonitoringService.name);
  private readonly alerts: CompatibilityAlert[] = [];
  private lastReport?: CompatibilityMonitoringReport;
  
  constructor(
    private readonly usageTracker: CompatibilityUsageTracker,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const isMonitoringEnabled = this.configService.get<boolean>('CACHE_COMPATIBILITY_MONITORING_ENABLED', true);
    
    if (isMonitoringEnabled) {
      this.logger.log('Compatibility monitoring service initialized for v3.0.0 migration');
      
      // 生成初始报告
      setTimeout(() => {
        this.generateDailyReport();
      }, 5000); // 延迟5秒等待系统完全启动
    }
  }

  /**
   * 每日自动生成监控报告
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async generateDailyReport(): Promise<CompatibilityMonitoringReport> {
    this.logger.log('Generating daily compatibility monitoring report');
    
    const report = await this.createMonitoringReport('daily');
    this.lastReport = report;
    
    // 发射报告事件
    this.eventEmitter.emit('cache.compatibility.report', report);
    
    // 检查是否需要发送告警
    this.checkForAlerts(report);
    
    this.logger.log(`Daily report generated: ${report.reportId}`);
    return report;
  }

  /**
   * 每周生成详细监控报告
   */
  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReport(): Promise<CompatibilityMonitoringReport> {
    this.logger.log('Generating weekly compatibility monitoring report');
    
    const report = await this.createMonitoringReport('weekly');
    
    // 发射详细报告事件
    this.eventEmitter.emit('cache.compatibility.weekly-report', report);
    
    // 生成迁移进度邮件
    this.generateMigrationProgressEmail(report);
    
    return report;
  }

  /**
   * 监听兼容性使用事件
   */
  @OnEvent('cache.compatibility.usage')
  handleCompatibilityUsage(event: CompatibilityUsageEvent): void {
    // 检查是否是高频使用的组件
    if (this.isHighFrequencyUsage(event.component)) {
      this.createAlert('WARNING', event.component, 
        `High frequency usage detected for deprecated pattern '${event.deprecatedPattern}'`,
        'Consider prioritizing migration for this component'
      );
    }

    // 检查是否是新的deprecated使用
    if (this.isNewDeprecatedUsage(event)) {
      this.createAlert('INFO', event.component,
        `New deprecated pattern usage detected: ${event.deprecatedPattern}`,
        'Review component for migration planning'
      );
    }
  }

  /**
   * 获取当前监控状态
   */
  getCurrentMonitoringStatus(): {
    totalComponents: number;
    readyForMigration: number;
    activeAlerts: number;
    lastReportDate?: Date;
    migrationProgress: number;
  } {
    const stats = this.usageTracker.generateUsageStats();
    const readyComponents = Object.keys(stats.componentBreakdown)
      .filter(component => this.usageTracker.isComponentReadyForMigration(component));

    return {
      totalComponents: Object.keys(stats.componentBreakdown).length,
      readyForMigration: readyComponents.length,
      activeAlerts: this.alerts.filter(alert => this.isRecentAlert(alert)).length,
      lastReportDate: this.lastReport?.generatedAt,
      migrationProgress: this.calculateMigrationProgress(),
    };
  }

  /**
   * 获取迁移建议
   */
  getMigrationRecommendations(): MigrationRecommendation[] {
    return this.usageTracker.generateMigrationRecommendations();
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): CompatibilityAlert[] {
    return this.alerts.filter(alert => this.isRecentAlert(alert));
  }

  /**
   * 手动触发迁移准备度检查
   */
  checkMigrationReadiness(): {
    readyComponents: string[];
    blockedComponents: string[];
    recommendations: MigrationRecommendation[];
  } {
    const stats = this.usageTracker.generateUsageStats();
    const recommendations = this.usageTracker.generateMigrationRecommendations();
    
    const readyComponents = Object.keys(stats.componentBreakdown)
      .filter(component => this.usageTracker.isComponentReadyForMigration(component));
    
    const blockedComponents = Object.keys(stats.componentBreakdown)
      .filter(component => !this.usageTracker.isComponentReadyForMigration(component));

    return {
      readyComponents,
      blockedComponents,
      recommendations,
    };
  }

  /**
   * 私有方法：创建监控报告
   */
  private async createMonitoringReport(period: string): Promise<CompatibilityMonitoringReport> {
    const reportId = `compat-report-${Date.now()}`;
    const usageStats = this.usageTracker.generateUsageStats();
    const migrationRecommendations = this.usageTracker.generateMigrationRecommendations();
    
    const riskAssessment = this.assessMigrationRisks(usageStats);
    const trendsAnalysis = this.analyzeTrends(usageStats);

    return {
      reportId,
      generatedAt: new Date(),
      reportPeriod: period,
      usageStats,
      migrationRecommendations,
      riskAssessment,
      trendsAnalysis,
    };
  }

  /**
   * 私有方法：评估迁移风险
   */
  private assessMigrationRisks(stats: CompatibilityUsageStats): {
    criticalComponents: string[];
    readyForMigration: string[];
    blockers: string[];
  } {
    const components = Object.keys(stats.componentBreakdown);
    
    const criticalComponents = components.filter(component => {
      const usageCount = stats.componentBreakdown[component];
      return usageCount > 20; // 高频使用组件
    });

    const readyForMigration = components.filter(component => 
      this.usageTracker.isComponentReadyForMigration(component)
    );

    const blockers = components.filter(component => {
      const usageCount = stats.componentBreakdown[component];
      return usageCount > 50 && !this.usageTracker.isComponentReadyForMigration(component);
    });

    return {
      criticalComponents,
      readyForMigration,
      blockers,
    };
  }

  /**
   * 私有方法：分析趋势
   */
  private analyzeTrends(stats: CompatibilityUsageStats): {
    usageDecreasing: boolean;
    migrationProgress: number;
    estimatedCompletionDate?: Date;
  } {
    const migrationProgress = this.calculateMigrationProgress();
    
    // 简化的趋势分析 - 实际实现可能需要历史数据
    const usageDecreasing = stats.totalUsages < 100; // 启发式判断
    
    let estimatedCompletionDate: Date | undefined;
    if (migrationProgress > 0 && migrationProgress < 100) {
      // 基于当前进度估算完成时间
      const remainingProgress = 100 - migrationProgress;
      const estimatedWeeks = remainingProgress / 10; // 假设每周10%进度
      
      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (estimatedWeeks * 7));
    }

    return {
      usageDecreasing,
      migrationProgress,
      estimatedCompletionDate,
    };
  }

  /**
   * 私有方法：检查告警
   */
  private checkForAlerts(report: CompatibilityMonitoringReport): void {
    // 检查关键组件告警
    if (report.riskAssessment.criticalComponents.length > 0) {
      this.createAlert('WARNING', 'System', 
        `${report.riskAssessment.criticalComponents.length} critical components still using deprecated patterns`,
        'Prioritize migration for critical components'
      );
    }

    // 检查阻塞告警
    if (report.riskAssessment.blockers.length > 0) {
      this.createAlert('ERROR', 'Migration', 
        `${report.riskAssessment.blockers.length} components are blocking v3.0.0 migration`,
        'Address blockers before v3.0.0 release'
      );
    }

    // 检查进度告警
    if (report.trendsAnalysis.migrationProgress < 50) {
      this.createAlert('INFO', 'Progress', 
        `Migration progress: ${report.trendsAnalysis.migrationProgress}%`,
        'Consider accelerating migration timeline'
      );
    }
  }

  /**
   * 私有方法：创建告警
   */
  private createAlert(
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    component: string,
    message: string,
    actionRequired?: string
  ): void {
    const alert: CompatibilityAlert = {
      level,
      component,
      message,
      timestamp: new Date(),
      actionRequired,
      migrationUrl: 'docs/cache/v3.0.0-migration-guide.md',
    };

    this.alerts.push(alert);
    
    // 限制告警历史
    if (this.alerts.length > 100) {
      this.alerts.splice(0, 10);
    }

    // 记录告警
    const logMethod = level === 'CRITICAL' || level === 'ERROR' ? 'error' : 
                     level === 'WARNING' ? 'warn' : 'log';
    
    this.logger[logMethod](`[${level}] ${component}: ${message}`, 'CompatibilityAlert');
  }

  /**
   * 私有方法：检查是否是高频使用
   */
  private isHighFrequencyUsage(component: string): boolean {
    const recentUsage = this.usageTracker.getComponentUsagePattern(component)
      .filter(event => {
        const hoursSinceUsage = (Date.now() - event.timestamp.getTime()) / (1000 * 60 * 60);
        return hoursSinceUsage <= 24; // 最近24小时
      });

    return recentUsage.length > 10; // 24小时内超过10次使用
  }

  /**
   * 私有方法：检查是否是新的deprecated使用
   */
  private isNewDeprecatedUsage(event: CompatibilityUsageEvent): boolean {
    const existingUsage = this.usageTracker.getComponentUsagePattern(event.component);
    
    // 如果是第一次记录该组件的使用，则认为是新使用
    return existingUsage.length <= 1;
  }

  /**
   * 私有方法：检查告警是否为最近的
   */
  private isRecentAlert(alert: CompatibilityAlert): boolean {
    const hoursSinceAlert = (Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursSinceAlert <= 72; // 最近72小时内的告警
  }

  /**
   * 私有方法：计算迁移进度
   */
  private calculateMigrationProgress(): number {
    const stats = this.usageTracker.generateUsageStats();
    const totalComponents = Object.keys(stats.componentBreakdown).length;
    
    if (totalComponents === 0) return 100;

    const readyComponents = Object.keys(stats.componentBreakdown)
      .filter(component => this.usageTracker.isComponentReadyForMigration(component))
      .length;

    return Math.round((readyComponents / totalComponents) * 100);
  }

  /**
   * 私有方法：生成迁移进度邮件
   */
  private generateMigrationProgressEmail(report: CompatibilityMonitoringReport): void {
    // 这里可以集成邮件服务发送进度报告
    this.logger.log(
      `Weekly migration progress: ${report.trendsAnalysis.migrationProgress}% ` +
      `(${report.riskAssessment.readyForMigration.length} components ready)`
    );
  }
}