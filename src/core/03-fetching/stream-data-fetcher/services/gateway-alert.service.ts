import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';

/**
 * Gateway告警服务
 * 监控Gateway使用率和错误率，自动触发告警
 */
@Injectable()
export class GatewayAlertService {
  private readonly logger = createLogger('GatewayAlertService');
  
  // 告警阈值配置
  private readonly thresholds = {
    gatewayUsageRate: {
      warning: 95,  // Gateway使用率低于95%告警
      critical: 80, // Gateway使用率低于80%严重告警
    },
    errorRate: {
      warning: 1,   // 错误率超过1%告警
      critical: 5,  // 错误率超过5%严重告警
    },
    legacyUsageRate: {
      warning: 5,   // Legacy使用率超过5%告警
      critical: 20, // Legacy使用率超过20%严重告警
    }
  };

  // 告警状态追踪（防止重复告警）
  private alertStates = {
    gatewayUsage: { level: 'none', lastAlert: null as Date | null },
    errorRate: { level: 'none', lastAlert: null as Date | null },
    legacyUsage: { level: 'none', lastAlert: null as Date | null },
  };

  // 告警冷却时间（分钟）
  private readonly cooldownMinutes = 5;

  /**
   * 检查广播统计并触发必要的告警
   * @param stats 来自StreamClientStateManager.getBroadcastStats()的统计数据
   */
  checkAndAlert(stats: {
    gatewayUsageRate: number;
    errorRate: number;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    stats: any;
  }): void {
    const now = new Date();
    
    // 检查Gateway使用率
    this.checkGatewayUsageRate(stats.gatewayUsageRate, now);
    
    // 检查错误率
    this.checkErrorRate(stats.errorRate, now);
    
    // 检查Legacy使用率
    const legacyUsageRate = stats.stats.legacy.usageRate || 0;
    this.checkLegacyUsageRate(legacyUsageRate, now);
    
    // 检查整体健康状态
    this.checkOverallHealth(stats.healthStatus, stats, now);
  }

  /**
   * 检查Gateway使用率告警
   */
  private checkGatewayUsageRate(usageRate: number, now: Date): void {
    let alertLevel: 'none' | 'warning' | 'critical' = 'none';
    
    if (usageRate < this.thresholds.gatewayUsageRate.critical) {
      alertLevel = 'critical';
    } else if (usageRate < this.thresholds.gatewayUsageRate.warning) {
      alertLevel = 'warning';
    }
    
    if (alertLevel !== 'none' && this.shouldAlert('gatewayUsage', alertLevel, now)) {
      this.triggerAlert('Gateway使用率告警', {
        level: alertLevel,
        metric: 'gatewayUsageRate',
        currentValue: usageRate,
        threshold: alertLevel === 'critical' 
          ? this.thresholds.gatewayUsageRate.critical 
          : this.thresholds.gatewayUsageRate.warning,
        message: `Gateway使用率(${usageRate.toFixed(2)}%)低于${alertLevel === 'critical' ? '严重' : '警告'}阈值`,
        recommendation: '检查Gateway服务器状态，确保WebSocket连接正常'
      });
      
      this.alertStates.gatewayUsage = { level: alertLevel, lastAlert: now };
    }
  }

  /**
   * 检查错误率告警
   */
  private checkErrorRate(errorRate: number, now: Date): void {
    let alertLevel: 'none' | 'warning' | 'critical' = 'none';
    
    if (errorRate > this.thresholds.errorRate.critical) {
      alertLevel = 'critical';
    } else if (errorRate > this.thresholds.errorRate.warning) {
      alertLevel = 'warning';
    }
    
    if (alertLevel !== 'none' && this.shouldAlert('errorRate', alertLevel, now)) {
      this.triggerAlert('Gateway错误率告警', {
        level: alertLevel,
        metric: 'errorRate',
        currentValue: errorRate,
        threshold: alertLevel === 'critical' 
          ? this.thresholds.errorRate.critical 
          : this.thresholds.errorRate.warning,
        message: `Gateway错误率(${errorRate.toFixed(2)}%)超过${alertLevel === 'critical' ? '严重' : '警告'}阈值`,
        recommendation: '检查Gateway广播功能，查看错误日志分析失败原因'
      });
      
      this.alertStates.errorRate = { level: alertLevel, lastAlert: now };
    }
  }

  /**
   * 检查Legacy使用率告警
   */
  private checkLegacyUsageRate(legacyUsageRate: number, now: Date): void {
    let alertLevel: 'none' | 'warning' | 'critical' = 'none';
    
    if (legacyUsageRate > this.thresholds.legacyUsageRate.critical) {
      alertLevel = 'critical';
    } else if (legacyUsageRate > this.thresholds.legacyUsageRate.warning) {
      alertLevel = 'warning';
    }
    
    if (alertLevel !== 'none' && this.shouldAlert('legacyUsage', alertLevel, now)) {
      this.triggerAlert('Legacy使用率告警', {
        level: alertLevel,
        metric: 'legacyUsageRate',
        currentValue: legacyUsageRate,
        threshold: alertLevel === 'critical' 
          ? this.thresholds.legacyUsageRate.critical 
          : this.thresholds.legacyUsageRate.warning,
        message: `Legacy使用率(${legacyUsageRate.toFixed(2)}%)超过${alertLevel === 'critical' ? '严重' : '警告'}阈值`,
        recommendation: 'Legacy代码移除进度可能受阻，检查Gateway迁移状态'
      });
      
      this.alertStates.legacyUsage = { level: alertLevel, lastAlert: now };
    }
  }

  /**
   * 检查整体健康状态
   */
  private checkOverallHealth(
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical',
    stats: any,
    now: Date
  ): void {
    if (healthStatus === 'critical') {
      this.logger.error('Gateway系统健康状态严重', {
        healthStatus,
        stats: stats.stats,
        timestamp: now.toISOString(),
        alertType: 'health_critical',
        action: 'immediate_attention_required'
      });
    } else if (healthStatus === 'warning') {
      this.logger.warn('Gateway系统健康状态警告', {
        healthStatus,
        stats: stats.stats,
        timestamp: now.toISOString(),
        alertType: 'health_warning',
        action: 'monitor_closely'
      });
    }
  }

  /**
   * 判断是否应该发送告警（考虑冷却时间）
   */
  private shouldAlert(
    alertType: keyof typeof this.alertStates,
    level: 'warning' | 'critical',
    now: Date
  ): boolean {
    const state = this.alertStates[alertType];
    
    // 如果是新的告警级别，立即发送
    if (state.level !== level) {
      return true;
    }
    
    // 如果在冷却期内，不发送重复告警
    if (state.lastAlert) {
      const minutesSinceLastAlert = (now.getTime() - state.lastAlert.getTime()) / (1000 * 60);
      if (minutesSinceLastAlert < this.cooldownMinutes) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 触发告警
   */
  private triggerAlert(title: string, details: {
    level: 'warning' | 'critical';
    metric: string;
    currentValue: number;
    threshold: number;
    message: string;
    recommendation: string;
  }): void {
    const logMethod = details.level === 'critical' ? 'error' : 'warn';
    
    this.logger[logMethod](title, {
      alertLevel: details.level,
      metric: details.metric,
      currentValue: details.currentValue,
      threshold: details.threshold,
      message: details.message,
      recommendation: details.recommendation,
      timestamp: new Date().toISOString(),
      alertType: 'gateway_monitoring',
      // 可以添加更多上下文信息用于告警系统集成
      tags: ['gateway', 'monitoring', 'legacy-removal', details.level],
    });

    // 在这里可以集成其他告警渠道
    // 例如：发送邮件、Slack通知、短信等
    // this.sendToAlertChannel(title, details);
  }

  /**
   * 获取当前告警状态
   */
  getAlertStatus(): {
    activeAlerts: number;
    alertStates: typeof this.alertStates;
    thresholds: typeof this.thresholds;
  } {
    const activeAlerts = Object.values(this.alertStates)
      .filter(state => state.level !== 'none').length;
    
    return {
      activeAlerts,
      alertStates: this.alertStates,
      thresholds: this.thresholds,
    };
  }

  /**
   * 重置所有告警状态（用于测试或手动清除）
   */
  resetAlertStates(): void {
    this.alertStates = {
      gatewayUsage: { level: 'none', lastAlert: null },
      errorRate: { level: 'none', lastAlert: null },
      legacyUsage: { level: 'none', lastAlert: null },
    };
    
    this.logger.log('所有告警状态已重置');
  }

  /**
   * 更新告警阈值（用于运行时调整）
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    Object.assign(this.thresholds, newThresholds);
    
    this.logger.log('告警阈值已更新', {
      newThresholds: this.thresholds,
      timestamp: new Date().toISOString()
    });
  }
}