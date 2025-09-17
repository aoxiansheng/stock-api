/**
 * Compatibility Layer Usage Tracker
 * 🎯 监控兼容性配置层的使用情况，支持v3.0.0迁移规划
 * 
 * @description 跟踪deprecated配置的使用模式，提供迁移指导
 * @author Cache Module Team
 * @date 2025-09-17
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

/**
 * 兼容性使用事件接口
 */
export interface CompatibilityUsageEvent {
  component: string;
  operation: string;
  deprecatedPattern: string;
  modernAlternative: string;
  timestamp: Date;
  stackTrace?: string;
  migrationPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * 使用统计接口
 */
export interface CompatibilityUsageStats {
  totalUsages: number;
  componentBreakdown: Record<string, number>;
  operationBreakdown: Record<string, number>;
  migrationReadiness: {
    ready: number;
    inProgress: number;
    notStarted: number;
  };
  lastReportGenerated: Date;
}

/**
 * 迁移建议接口
 */
export interface MigrationRecommendation {
  component: string;
  currentPattern: string;
  recommendedPattern: string;
  estimatedEffort: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  migrationGuide: string;
  breakingChanges: boolean;
}

@Injectable()
export class CompatibilityUsageTracker {
  private readonly logger = new Logger(CompatibilityUsageTracker.name);
  private readonly usageEvents: CompatibilityUsageEvent[] = [];
  private readonly isTrackingEnabled: boolean;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.isTrackingEnabled = this.configService.get<boolean>('CACHE_COMPATIBILITY_TRACKING_ENABLED', true);
    
    if (this.isTrackingEnabled) {
      this.logger.log('Compatibility usage tracking enabled for v3.0.0 migration planning');
    }
  }

  /**
   * 记录兼容性配置使用事件
   */
  trackUsage(event: Omit<CompatibilityUsageEvent, 'timestamp'>): void {
    if (!this.isTrackingEnabled) {
      return;
    }

    const fullEvent: CompatibilityUsageEvent = {
      ...event,
      timestamp: new Date(),
      stackTrace: this.captureStackTrace(),
    };

    this.usageEvents.push(fullEvent);
    this.logDeprecationWarning(fullEvent);
    this.emitUsageEvent(fullEvent);
    
    // 保持事件历史在合理范围内
    if (this.usageEvents.length > 1000) {
      this.usageEvents.splice(0, 100); // 移除最老的100个事件
    }
  }

  /**
   * 生成使用统计报告
   */
  generateUsageStats(): CompatibilityUsageStats {
    const componentBreakdown: Record<string, number> = {};
    const operationBreakdown: Record<string, number> = {};

    this.usageEvents.forEach(event => {
      componentBreakdown[event.component] = (componentBreakdown[event.component] || 0) + 1;
      operationBreakdown[event.operation] = (operationBreakdown[event.operation] || 0) + 1;
    });

    return {
      totalUsages: this.usageEvents.length,
      componentBreakdown,
      operationBreakdown,
      migrationReadiness: this.calculateMigrationReadiness(),
      lastReportGenerated: new Date(),
    };
  }

  /**
   * 生成迁移建议
   */
  generateMigrationRecommendations(): MigrationRecommendation[] {
    const recommendations: MigrationRecommendation[] = [];
    const componentStats = this.generateUsageStats().componentBreakdown;

    // 为使用频率高的组件生成迁移建议
    Object.entries(componentStats).forEach(([component, usageCount]) => {
      const recommendation = this.createMigrationRecommendation(component, usageCount);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 获取特定组件的使用模式
   */
  getComponentUsagePattern(component: string): CompatibilityUsageEvent[] {
    return this.usageEvents.filter(event => event.component === component);
  }

  /**
   * 检查组件是否已准备好迁移
   */
  isComponentReadyForMigration(component: string): boolean {
    const recentUsage = this.usageEvents
      .filter(event => event.component === component)
      .filter(event => {
        const daysSinceUsage = (Date.now() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUsage <= 7; // 最近7天内的使用
      });

    // 如果最近7天内没有使用，认为可以安全迁移
    return recentUsage.length === 0;
  }

  /**
   * 清理旧的使用记录
   */
  cleanupOldRecords(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialLength = this.usageEvents.length;
    
    // 保留最近N天的记录
    this.usageEvents.splice(0, this.usageEvents.findIndex(
      event => event.timestamp >= cutoffDate
    ));

    const removedCount = initialLength - this.usageEvents.length;
    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} old compatibility usage records`);
    }
  }

  /**
   * 私有方法：记录废弃警告
   */
  private logDeprecationWarning(event: CompatibilityUsageEvent): void {
    this.logger.warn(
      `⚠️  DEPRECATED: ${event.component} is using deprecated pattern '${event.deprecatedPattern}'. ` +
      `Migrate to '${event.modernAlternative}'. Priority: ${event.migrationPriority}`,
      'CompatibilityLayer'
    );
  }

  /**
   * 私有方法：发射使用事件
   */
  private emitUsageEvent(event: CompatibilityUsageEvent): void {
    this.eventEmitter.emit('cache.compatibility.usage', event);
  }

  /**
   * 私有方法：捕获调用栈
   */
  private captureStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return 'No stack trace available';
    
    // 过滤掉tracker自身的调用栈
    const lines = stack.split('\n').slice(3, 8); // 取前5层调用栈
    return lines.join('\n');
  }

  /**
   * 私有方法：计算迁移准备度
   */
  private calculateMigrationReadiness(): { ready: number; inProgress: number; notStarted: number } {
    const components = Array.from(new Set(this.usageEvents.map(e => e.component)));
    
    let ready = 0;
    let inProgress = 0;
    let notStarted = 0;

    components.forEach(component => {
      if (this.isComponentReadyForMigration(component)) {
        ready++;
      } else {
        const recentUsage = this.getComponentUsagePattern(component)
          .filter(e => {
            const daysSinceUsage = (Date.now() - e.timestamp.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUsage <= 14;
          });
        
        if (recentUsage.length > 0 && recentUsage.length < 10) {
          inProgress++;
        } else {
          notStarted++;
        }
      }
    });

    return { ready, inProgress, notStarted };
  }

  /**
   * 私有方法：创建迁移建议
   */
  private createMigrationRecommendation(component: string, usageCount: number): MigrationRecommendation | null {
    // 预定义的迁移建议映射
    const migrationMappings: Record<string, Partial<MigrationRecommendation>> = {
      'AlertCacheService': {
        currentPattern: '@Inject("unifiedTtl") private readonly ttlConfig: UnifiedTtlConfig',
        recommendedPattern: '@Inject("cacheUnified") private readonly config: CacheUnifiedConfig',
        estimatedEffort: '2-4 hours',
        migrationGuide: 'docs/cache/service-migration-guide.md#alert-cache-service',
        breakingChanges: false,
      },
      'MonitoringUnifiedTtlConfig': {
        currentPattern: 'class MonitoringUnifiedTtlConfig extends UnifiedTtlConfig',
        recommendedPattern: 'Use composition with CacheUnifiedConfig',
        estimatedEffort: '4-8 hours',
        migrationGuide: 'docs/cache/service-migration-guide.md#monitoring-config',
        breakingChanges: true,
      },
      'TtlCompatibilityWrapper': {
        currentPattern: 'TtlCompatibilityWrapper service usage',
        recommendedPattern: 'Direct CacheUnifiedConfig injection',
        estimatedEffort: '1-2 hours',
        migrationGuide: 'docs/cache/service-migration-guide.md#compatibility-wrapper',
        breakingChanges: false,
      },
    };

    const mapping = migrationMappings[component];
    if (!mapping) return null;

    // 根据使用频率确定优先级
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (usageCount > 50) priority = 'CRITICAL';
    else if (usageCount > 20) priority = 'HIGH';
    else if (usageCount > 5) priority = 'MEDIUM';

    return {
      component,
      priority,
      ...mapping,
    } as MigrationRecommendation;
  }
}

/**
 * 便捷函数：跟踪TTL配置使用
 */
export function trackTtlConfigUsage(
  tracker: CompatibilityUsageTracker,
  component: string,
  operation: string,
  migrationPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
): void {
  tracker.trackUsage({
    component,
    operation,
    deprecatedPattern: 'UnifiedTtlConfig injection',
    modernAlternative: '@Inject("cacheUnified") CacheUnifiedConfig',
    migrationPriority,
  });
}

/**
 * 便捷函数：跟踪兼容性包装器使用
 */
export function trackCompatibilityWrapperUsage(
  tracker: CompatibilityUsageTracker,
  component: string,
  operation: string,
  migrationPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
): void {
  tracker.trackUsage({
    component,
    operation,
    deprecatedPattern: 'TtlCompatibilityWrapper usage',
    modernAlternative: 'Direct CacheUnifiedConfig access',
    migrationPriority,
  });
}