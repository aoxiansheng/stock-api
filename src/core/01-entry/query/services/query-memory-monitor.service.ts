import { Injectable } from '@nestjs/common';

import { createLogger } from '../../../../app/config/logger.config';
import { SystemMetricsDto } from '../../../../monitoring/contracts/interfaces/collector.interface';
import { CollectorService } from '../../../../monitoring/collector/collector.service';
import { MetricsRegistryService } from '../../../../monitoring/infrastructure/metrics/metrics-registry.service';
import { QueryConfigService } from '../config/query.config';

/**
 * 内存监控结果接口
 */
export interface MemoryCheckResult {
  /** 是否可以处理请求 */
  canProcess: boolean;
  /** 当前系统指标 */
  currentUsage: SystemMetricsDto;
  /** 处理建议 */
  recommendation: 'proceed' | 'reduce_batch' | 'defer';
  /** 建议的批量大小（如果需要降级） */
  suggestedBatchSize?: number;
  /** 内存压力等级 */
  pressureLevel: 'normal' | 'warning' | 'critical';
}

/**
 * Query组件专用内存监控服务
 * 
 * 核心设计理念：
 * - 复用现有监控基础设施：基于CollectorService和MetricsRegistryService
 * - 智能内存压力检测：警告阈值和临界阈值双重保护
 * - 自动降级建议：根据内存使用情况提供批量大小调整建议
 * - 无状态设计：每次检查都基于当前系统状态
 */
@Injectable()
export class QueryMemoryMonitorService {
  private readonly logger = createLogger(QueryMemoryMonitorService.name);

  constructor(
    private readonly collectorService: CollectorService, // 🔄 复用现有收集器
    private readonly queryConfig: QueryConfigService,
    private readonly metricsRegistry: MetricsRegistryService, // 🔄 复用现有指标注册
  ) {}


  /**
   * 在批量处理前检查内存状况
   * 
   * 提供智能的内存压力评估和处理建议，支持Query组件的批量处理决策
   * 
   * @param symbolsCount 待处理的符号数量
   * @returns 内存检查结果和处理建议
   */
  async checkMemoryBeforeBatch(symbolsCount: number): Promise<MemoryCheckResult> {
    const startTime = Date.now();
    
    try {
      // 🔄 复用现有系统指标收集
      const systemMetrics = await this.collectorService.getSystemMetrics();
      const memoryPercentage = systemMetrics.memory.percentage;
      
      let canProcess = true;
      let recommendation: 'proceed' | 'reduce_batch' | 'defer' = 'proceed';
      let suggestedBatchSize: number | undefined;
      let pressureLevel: 'normal' | 'warning' | 'critical' = 'normal';

      // 🎯 内存压力等级评估
      if (memoryPercentage >= this.queryConfig.memoryCriticalThreshold) {
        // 临界状态：延迟处理
        canProcess = false;
        recommendation = 'defer';
        pressureLevel = 'critical';
        
        // 🔄 使用现有指标记录临界状态降级事件
        this.metricsRegistry.queryMemoryTriggeredDegradations
          ?.labels('batch_deferred', this.getSymbolsCountRange(symbolsCount))
          ?.inc();

        this.logger.warn('内存使用率达到临界阈值，延迟批量处理', {
          memoryPercentage: (memoryPercentage * 100).toFixed(1) + '%',
          criticalThreshold: (this.queryConfig.memoryCriticalThreshold * 100).toFixed(1) + '%',
          symbolsCount,
          recommendation,
        });

      } else if (memoryPercentage >= this.queryConfig.memoryWarningThreshold) {
        // 警告状态：降级处理
        recommendation = 'reduce_batch';
        pressureLevel = 'warning';
        
        // 计算建议的批量大小（基于压力比例和配置的降级比例）
        const pressureRatio = (memoryPercentage - this.queryConfig.memoryWarningThreshold) / 
                             (this.queryConfig.memoryCriticalThreshold - this.queryConfig.memoryWarningThreshold);
        
        const reductionFactor = this.queryConfig.memoryPressureReductionRatio * (1 - pressureRatio);
        suggestedBatchSize = Math.max(1, Math.floor(symbolsCount * reductionFactor));
        
        // 🔄 使用现有指标记录批量降级事件
        this.metricsRegistry.queryMemoryTriggeredDegradations
          ?.labels('batch_reduced', this.getSymbolsCountRange(symbolsCount))
          ?.inc();

        this.logger.warn('内存使用率达到警告阈值，建议降级批量处理', {
          memoryPercentage: (memoryPercentage * 100).toFixed(1) + '%',
          warningThreshold: (this.queryConfig.memoryWarningThreshold * 100).toFixed(1) + '%',
          symbolsCount,
          suggestedBatchSize,
          pressureRatio: (pressureRatio * 100).toFixed(1) + '%',
          recommendation,
        });
      } else {
        // 正常状态
        this.logger.debug('内存状况良好，批量处理可正常进行', {
          memoryPercentage: (memoryPercentage * 100).toFixed(1) + '%',
          symbolsCount,
          recommendation,
        });
      }

      // 🔄 复用现有监控事件记录机制
      const checkDuration = Date.now() - startTime;
      this.collectorService.recordRequest('/internal/query-memory-check', 'POST', 200, checkDuration, {
        symbolsCount,
        memoryUsage: memoryPercentage,
        pressureLevel,
        recommendation,
        componentType: 'query',
        operation: 'memory_check'
      });

      // 🔄 记录内存监控指标到现有指标体系
      this.recordMemoryMetrics(memoryPercentage, pressureLevel, symbolsCount, recommendation);

      return {
        canProcess,
        currentUsage: systemMetrics,
        recommendation,
        suggestedBatchSize,
        pressureLevel,
      };

    } catch (error) {
      this.logger.error('内存检查失败，默认允许处理', {
        error: error.message,
        symbolsCount,
      });

      // 错误情况下返回保守的结果（允许处理但记录错误）
      const checkDuration = Date.now() - startTime;
      this.collectorService.recordRequest('/internal/query-memory-check', 'POST', 500, checkDuration, {
        symbolsCount,
        error: error.message,
        componentType: 'query',
        operation: 'memory_check_failed'
      });

      return {
        canProcess: true,
        currentUsage: {
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0 },
          uptime: 0,
          timestamp: new Date()
        },
        recommendation: 'proceed',
        pressureLevel: 'normal',
      };
    }
  }

  /**
   * 记录内存监控指标到Prometheus
   * 
   * @param memoryPercentage 当前内存使用率 (0-1)
   * @param pressureLevel 内存压力等级
   * @param symbolsCount 符号数量
   * @param recommendation 处理建议
   */
  private recordMemoryMetrics(
    memoryPercentage: number, 
    pressureLevel: string, 
    symbolsCount: number, 
    recommendation: string
  ): void {
    try {
      // 记录当前内存使用率
      this.metricsRegistry.queryMemoryUsageBytes
        ?.labels('query', 'current')
        ?.set(memoryPercentage);

      // 记录内存压力等级
      this.metricsRegistry.queryMemoryPressureLevel
        ?.labels(pressureLevel, this.getSymbolsCountRange(symbolsCount))
        ?.set(pressureLevel === 'critical' ? 2 : pressureLevel === 'warning' ? 1 : 0);

      this.logger.debug('内存监控指标已记录', {
        memoryPercentage,
        pressureLevel,
        symbolsCount,
        recommendation,
      });

    } catch (error) {
      this.logger.warn('内存监控指标记录失败', {
        error: error.message,
        memoryPercentage,
        pressureLevel,
      });
    }
  }

  /**
   * 获取符号数量范围标签
   * 用于指标分类和聚合
   * 
   * @param count 符号数量
   * @returns 范围标签字符串
   */
  private getSymbolsCountRange(count: number): string {
    if (count <= 0) return '0';
    if (count <= 5) return '1-5';
    if (count <= 10) return '6-10';
    if (count <= 25) return '11-25';
    if (count <= 50) return '26-50';
    if (count <= 100) return '51-100';
    return '100+';
  }

  /**
   * 获取内存监控服务状态
   * 用于健康检查和诊断
   * 
   * @returns 服务状态信息
   */
  async getMonitorStatus(): Promise<{
    enabled: boolean;
    thresholds: {
      warning: number;
      critical: number;
    };
    currentMemoryUsage?: SystemMetricsDto;
    lastCheckTime: Date;
  }> {
    try {
      const currentMemory = await this.collectorService.getSystemMetrics();
      
      return {
        enabled: true,
        thresholds: {
          warning: this.queryConfig.memoryWarningThreshold,
          critical: this.queryConfig.memoryCriticalThreshold,
        },
        currentMemoryUsage: currentMemory,
        lastCheckTime: new Date(),
      };
    } catch (error) {
      this.logger.error('获取内存监控状态失败', error);
      
      return {
        enabled: false,
        thresholds: {
          warning: this.queryConfig.memoryWarningThreshold,
          critical: this.queryConfig.memoryCriticalThreshold,
        },
        lastCheckTime: new Date(),
      };
    }
  }
}