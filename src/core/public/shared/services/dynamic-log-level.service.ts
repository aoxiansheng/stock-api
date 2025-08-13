/**
 * 🎯 动态日志级别服务
 * 
 * 根据系统 CPU 使用率自动调整日志级别，在高负载时降级日志输出以提升性能
 * 使用 prom-client 库提供标准化的 Prometheus 指标监控
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { MetricsRegistryService } from '../../../../monitoring/metrics/services/metrics-registry.service';
import { Metrics } from '../../../../monitoring/metrics/metrics-helper';
import * as os from 'os';

interface CPUUsageStats {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
}

@Injectable()
export class DynamicLogLevelService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(DynamicLogLevelService.name);
  
  // CPU 监测相关
  private currentCPUUsage = 0;
  private previousCPUStats: CPUUsageStats | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // 日志级别管理
  private currentLogLevel: string;
  private originalLogLevel: string;
  
  // 阈值配置
  private readonly HIGH_LOAD_THRESHOLD = Number(process.env.HIGH_LOAD_THRESHOLD) || 80; // CPU 使用率80%以上
  private readonly RECOVERY_THRESHOLD_RATIO = Number(process.env.RECOVERY_THRESHOLD_RATIO) || 0.7; // 恢复阈值比例
  private readonly MONITORING_INTERVAL_MS = Number(process.env.CPU_MONITORING_INTERVAL_MS) || 30000; // 30秒检查一次
  
  // 高负载持续时间记录
  private highLoadStartTime: number | null = null;
  
  // 指标标签记录（用于详细查询）
  private logLevelSwitches: Array<{
    from_level: string;
    to_level: string;
    reason: string;
    timestamp: number;
  }> = [];

  constructor(
    private readonly featureFlags: FeatureFlags,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    this.originalLogLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    this.currentLogLevel = this.originalLogLevel;
  }

  async onModuleInit(): Promise<void> {
    if (!this.featureFlags.dynamicLogLevelEnabled) {
      this.logger.log('动态日志级别功能已禁用');
      return;
    }

    this.logger.log('动态日志级别服务初始化', {
      highLoadThreshold: this.HIGH_LOAD_THRESHOLD,
      recoveryThreshold: this.HIGH_LOAD_THRESHOLD * this.RECOVERY_THRESHOLD_RATIO,
      monitoringInterval: this.MONITORING_INTERVAL_MS,
      originalLogLevel: this.originalLogLevel
    });

    // 初始化 CPU 统计
    this.previousCPUStats = this.getCPUStats();
    
    // 启动监控
    this.startCPUMonitoring();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // 恢复原始日志级别
    this.setLogLevel(this.originalLogLevel, 'service_shutdown');
    
    this.logger.log('动态日志级别服务已停止');
  }

  /**
   * 🎯 启动 CPU 监控
   */
  private startCPUMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.updateCPUUsage();
        this.adjustLogLevelBasedOnLoad();
      } catch (error) {
        this.logger.error('CPU 监控过程中发生错误', { error: error.message });
      }
    }, this.MONITORING_INTERVAL_MS);
  }

  /**
   * 🎯 更新 CPU 使用率
   */
  private updateCPUUsage(): void {
    const currentStats = this.getCPUStats();
    
    if (this.previousCPUStats) {
      const prevTotal = this.getTotalCPUTime(this.previousCPUStats);
      const prevIdle = this.previousCPUStats.idle;
      
      const currentTotal = this.getTotalCPUTime(currentStats);
      const currentIdle = currentStats.idle;
      
      const totalDiff = currentTotal - prevTotal;
      const idleDiff = currentIdle - prevIdle;
      
      // 计算 CPU 使用率百分比
      this.currentCPUUsage = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;
      
      // 更新 Prometheus CPU 使用率指标 - 使用 Metrics 助手
      if (this.featureFlags.isPerformanceOptimizationEnabled()) {
        Metrics.setGauge(
          this.metricsRegistry, 
          'systemCpuUsagePercent', 
          this.currentCPUUsage
        );
      }
      
      this.logger.debug('CPU 使用率更新', {
        cpuUsage: this.currentCPUUsage,
        totalDiff,
        idleDiff,
        threshold: this.HIGH_LOAD_THRESHOLD
      });
    }
    
    this.previousCPUStats = currentStats;
  }

  /**
   * 🎯 获取 CPU 统计信息
   */
  private getCPUStats(): CPUUsageStats {
    const cpus = os.cpus();
    const totalStats = cpus.reduce((acc, cpu) => {
      acc.user += cpu.times.user;
      acc.nice += cpu.times.nice;
      acc.sys += cpu.times.sys;
      acc.idle += cpu.times.idle;
      acc.irq += cpu.times.irq;
      return acc;
    }, { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 });
    
    return totalStats;
  }

  /**
   * 🎯 计算总 CPU 时间
   */
  private getTotalCPUTime(stats: CPUUsageStats): number {
    return stats.user + stats.nice + stats.sys + stats.idle + stats.irq;
  }

  /**
   * 🎯 根据负载调整日志级别
   */
  private adjustLogLevelBasedOnLoad(): void {
    const recoveryThreshold = this.HIGH_LOAD_THRESHOLD * this.RECOVERY_THRESHOLD_RATIO;
    const currentTime = Date.now();
    
    if (this.currentCPUUsage > this.HIGH_LOAD_THRESHOLD) {
      // 开始或继续高负载状态
      if (!this.highLoadStartTime) {
        this.highLoadStartTime = currentTime;
      }
      
      if (this.currentLogLevel !== 'warn') {
        // 高负载时自动降级日志级别
        this.setLogLevel('warn', 'high_cpu_load');
        
        this.logger.warn(`🔧 高负载检测，日志级别降级至 WARN`, {
          cpuUsage: this.currentCPUUsage,
          threshold: this.HIGH_LOAD_THRESHOLD,
          previousLevel: this.currentLogLevel
        });
      }
      
    } else if (this.currentCPUUsage <= recoveryThreshold) {
      // 负载恢复正常
      if (this.highLoadStartTime && this.featureFlags.isPerformanceOptimizationEnabled()) {
        // 记录这次高负载持续时间
        const durationSeconds = (currentTime - this.highLoadStartTime) / 1000;
        
        // 使用 Metrics 助手更新 Prometheus 指标
        Metrics.inc(
          this.metricsRegistry, 
          'highLoadDurationSecondsTotal', 
          {}, 
          durationSeconds
        );
        
        this.highLoadStartTime = null;
      }
      
      if (this.currentLogLevel === 'warn') {
        // 恢复正常级别
        this.setLogLevel(this.originalLogLevel, 'load_recovery');
        
        this.logger.log(`✅ 负载恢复正常，日志级别恢复`, {
          cpuUsage: this.currentCPUUsage,
          recoveryThreshold,
          restoredLevel: this.originalLogLevel
        });
      }
    }
  }

  /**
   * 🎯 设置日志级别
   */
  private setLogLevel(level: string, reason: string): void {
    const previousLevel = this.currentLogLevel;
    
    if (previousLevel !== level) {
      // 更新环境变量和当前级别
      process.env.LOG_LEVEL = level;
      this.currentLogLevel = level;
      
      // 更新 Prometheus 日志级别切换计数器 - 使用 Metrics 助手
      if (this.featureFlags.isPerformanceOptimizationEnabled()) {
        Metrics.inc(
          this.metricsRegistry,
          'logLevelSwitchesTotal',
          {
            from_level: previousLevel,
            to_level: level,
            reason
          }
        );
      }
      
      // 记录详细切换信息（用于查询和调试）
      this.logLevelSwitches.push({
        from_level: previousLevel,
        to_level: level,
        reason,
        timestamp: Date.now()
      });
      
      // 保持最近100条记录
      if (this.logLevelSwitches.length > 100) {
        this.logLevelSwitches = this.logLevelSwitches.slice(-100);
      }
      
      this.logger.log(`日志级别已切换: ${previousLevel} → ${level}`, {
        reason,
        cpuUsage: this.currentCPUUsage,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🎯 获取当前系统状态
   */
  getCurrentStatus(): {
    cpuUsage: number;
    currentLogLevel: string;
    originalLogLevel: string;
    isHighLoad: boolean;
    thresholds: {
      highLoad: number;
      recovery: number;
    };
    systemInfo: {
      cpuCount: number;
      platform: string;
      arch: string;
    };
  } {
    return {
      cpuUsage: this.currentCPUUsage,
      currentLogLevel: this.currentLogLevel,
      originalLogLevel: this.originalLogLevel,
      isHighLoad: this.currentCPUUsage > this.HIGH_LOAD_THRESHOLD,
      thresholds: {
        highLoad: this.HIGH_LOAD_THRESHOLD,
        recovery: this.HIGH_LOAD_THRESHOLD * this.RECOVERY_THRESHOLD_RATIO
      },
      systemInfo: {
        cpuCount: os.cpus().length,
        platform: os.platform(),
        arch: os.arch()
      }
    };
  }

  /**
   * 🎯 手动触发日志级别调整（用于测试）
   */
  manualLogLevelAdjustment(targetLevel: string): void {
    if (!this.featureFlags.dynamicLogLevelEnabled) {
      throw new Error('动态日志级别功能未启用');
    }
    
    this.setLogLevel(targetLevel, 'manual_adjustment');
    this.logger.log('手动调整日志级别', {
      targetLevel,
      cpuUsage: this.currentCPUUsage
    });
  }

  /**
   * 🎯 获取性能指标摘要（保持向后兼容）
   */
  async getPerformanceMetrics(): Promise<{
    totalLogLevelSwitches: number;
    currentCPUUsage: number;
    totalHighLoadDuration: number;
    recentSwitches: Array<{
      from_level: string;
      to_level: string;
      reason: string;
      timestamp: number;
    }>;
  }> {
    // 从 Prometheus 指标获取最新的计数器值
    let totalSwitches = 0;
    let totalHighLoadDuration = 0;
    
    if (this.featureFlags.isPerformanceOptimizationEnabled()) {
      try {
        const switchesMetric = await this.metricsRegistry.getMetricValue('newstock_log_level_switches_total');
        const durationMetric = await this.metricsRegistry.getMetricValue('newstock_high_load_duration_seconds_total');
        
        totalSwitches = switchesMetric || 0;
        totalHighLoadDuration = durationMetric || 0;
      } catch (error) {
        this.logger.warn('获取 Prometheus 指标值失败，使用本地缓存数据', { error: error.message });
      }
    }
    
    return {
      totalLogLevelSwitches: totalSwitches,
      currentCPUUsage: this.currentCPUUsage,
      totalHighLoadDuration,
      recentSwitches: this.logLevelSwitches.slice(-10) // 最近10条记录
    };
  }

  /**
   * 🎯 获取 Prometheus 指标字符串（标准格式）
   */
  async getMetrics(): Promise<string> {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return '# 动态日志级别指标已禁用\n';
    }
    
    return await this.metricsRegistry.getMetrics();
  }
}