import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger } from "@common/logging/index";
import { SystemMetricsDto } from "../../../../monitoring/contracts/interfaces/collector.interface";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import { MetricsRegistryService } from "../../../../monitoring/infrastructure/metrics/metrics-registry.service";
import { QueryConfigService } from "../config/query.config";

/**
 * 内存监控结果接口
 */
export interface MemoryCheckResult {
  /** 是否可以处理请求 */
  canProcess: boolean;
  /** 当前系统指标 */
  currentUsage: SystemMetricsDto;
  /** 处理建议 */
  recommendation: "proceed" | "reduce_batch" | "defer";
  /** 建议的批量大小（如果需要降级） */
  suggestedBatchSize?: number;
  /** 内存压力等级 */
  pressureLevel: "normal" | "warning" | "critical";
}

/**
 * Query组件专用内存监控服务
 *
 * 核心设计理念：
 * - 复用现有监控基础设施：基于事件驱动和MetricsRegistryService
 * - 智能内存压力检测：警告阈值和临界阈值双重保护
 * - 自动降级建议：根据内存使用情况提供批量大小调整建议
 * - 无状态设计：每次检查都基于当前系统状态
 */
@Injectable()
export class QueryMemoryMonitorService implements OnModuleDestroy {
  private readonly logger = createLogger(QueryMemoryMonitorService.name);

  constructor(
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控
    private readonly queryConfig: QueryConfigService,
    private readonly metricsRegistry: MetricsRegistryService, // 🔄 复用现有指标注册
  ) {}

  /**
   * 模块销毁时清理资源
   *
   * 注意：虽然当前服务只发送事件不监听事件，但作为生命周期管理的最佳实践，
   * 仍然实现 onModuleDestroy 方法以备将来扩展
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("QueryMemoryMonitorService模块正在关闭");

    // 发送最终的监控状态事件
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_memory_monitor",
          metricType: "system",
          metricName: "service_shutdown",
          metricValue: 1,
          tags: {
            operation: "module_destroy",
            componentType: "query",
          },
        });
      } catch (error) {
        this.logger.warn(`服务关闭事件发送失败: ${error.message}`);
      }
    });
  }

  /**
   * 在批量处理前检查内存状况
   *
   * 提供智能的内存压力评估和处理建议，支持Query组件的批量处理决策
   *
   * @param symbolsCount 待处理的符号数量
   * @returns 内存检查结果和处理建议
   */
  async checkMemoryBeforeBatch(
    symbolsCount: number,
  ): Promise<MemoryCheckResult> {
    const startTime = Date.now();

    try {
      // ✅ 使用 Node.js 原生 API 获取真实系统指标
      const systemMetrics = await this.getCurrentSystemMetrics();

      let canProcess = true;
      let recommendation: "proceed" | "reduce_batch" | "defer" = "proceed";
      let suggestedBatchSize: number | undefined;
      let pressureLevel: "normal" | "warning" | "critical" = "normal";

      // 获取内存使用百分比
      const memoryPercentage = systemMetrics.memory.percentage;

      // 🎯 内存压力等级评估
      if (memoryPercentage >= this.queryConfig.memoryCriticalThreshold) {
        // 临界状态：延迟处理
        canProcess = false;
        recommendation = "defer";
        pressureLevel = "critical";

        // 🔄 使用现有指标记录临界状态降级事件
        this.metricsRegistry.queryMemoryTriggeredDegradations
          ?.labels("batch_deferred", this.getSymbolsCountRange(symbolsCount))
          ?.inc();

        this.logger.warn("内存使用率达到临界阈值，延迟批量处理", {
          memoryPercentage: (memoryPercentage * 100).toFixed(1) + "%",
          criticalThreshold:
            (this.queryConfig.memoryCriticalThreshold * 100).toFixed(1) + "%",
          symbolsCount,
          recommendation,
        });
      } else if (memoryPercentage >= this.queryConfig.memoryWarningThreshold) {
        // 警告状态：降级处理
        recommendation = "reduce_batch";
        pressureLevel = "warning";

        // 计算建议的批量大小（基于压力比例和配置的降级比例）
        const pressureRatio =
          (memoryPercentage - this.queryConfig.memoryWarningThreshold) /
          (this.queryConfig.memoryCriticalThreshold -
            this.queryConfig.memoryWarningThreshold);

        const reductionFactor =
          this.queryConfig.memoryPressureReductionRatio * (1 - pressureRatio);
        suggestedBatchSize = Math.max(
          1,
          Math.floor(symbolsCount * reductionFactor),
        );

        // 🔄 使用现有指标记录批量降级事件
        this.metricsRegistry.queryMemoryTriggeredDegradations
          ?.labels("batch_reduced", this.getSymbolsCountRange(symbolsCount))
          ?.inc();

        this.logger.warn("内存使用率达到警告阈值，建议降级批量处理", {
          memoryPercentage: (memoryPercentage * 100).toFixed(1) + "%",
          warningThreshold:
            (this.queryConfig.memoryWarningThreshold * 100).toFixed(1) + "%",
          symbolsCount,
          suggestedBatchSize,
          pressureRatio: (pressureRatio * 100).toFixed(1) + "%",
          recommendation,
        });
      } else {
        // 正常状态
        this.logger.debug("内存状况良好，批量处理可正常进行", {
          memoryPercentage: (memoryPercentage * 100).toFixed(1) + "%",
          symbolsCount,
          recommendation,
        });
      }

      // ✅ 事件驱动监控：内存检查结果
      const checkDuration = Date.now() - startTime;
      setImmediate(() => {
        try {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: "query_memory_monitor",
            metricType: "memory",
            metricName: "memory_check",
            metricValue: checkDuration,
            tags: {
              symbolsCount,
              memoryUsage: memoryPercentage,
              pressureLevel,
              recommendation,
              componentType: "query",
              operation: "memory_check",
            },
          });
        } catch (error) {
          this.logger.warn(`内存检查事件发送失败: ${error.message}`);
        }
      });

      // 🔄 记录内存监控指标到现有指标体系
      this.recordMemoryMetrics(
        memoryPercentage,
        pressureLevel,
        symbolsCount,
        recommendation,
      );

      return {
        canProcess,
        currentUsage: systemMetrics,
        recommendation,
        suggestedBatchSize,
        pressureLevel,
      };
    } catch (error) {
      this.logger.error("内存检查失败，默认允许处理", {
        error: error.message,
        symbolsCount,
      });

      // ✅ 事件驱动监控：内存检查错误
      const checkDuration = Date.now() - startTime;
      setImmediate(() => {
        try {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: "query_memory_monitor",
            metricType: "error",
            metricName: "memory_check_failed",
            metricValue: checkDuration,
            tags: {
              symbolsCount,
              error: error.message,
              componentType: "query",
              operation: "memory_check_failed",
            },
          });
        } catch (eventError) {
          this.logger.warn(`内存检查错误事件发送失败: ${eventError.message}`);
        }
      });

      return {
        canProcess: true,
        currentUsage: {
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0 },
          uptime: 0,
          timestamp: new Date(),
        },
        recommendation: "proceed",
        pressureLevel: "normal",
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
    recommendation: string,
  ): void {
    try {
      // 记录当前内存使用率
      this.metricsRegistry.queryMemoryUsageBytes
        ?.labels("query", "current")
        ?.set(memoryPercentage);

      // 记录内存压力等级
      this.metricsRegistry.queryMemoryPressureLevel
        ?.labels(pressureLevel, this.getSymbolsCountRange(symbolsCount))
        ?.set(
          pressureLevel === "critical"
            ? 2
            : pressureLevel === "warning"
              ? 1
              : 0,
        );

      this.logger.debug("内存监控指标已记录", {
        memoryPercentage,
        pressureLevel,
        symbolsCount,
        recommendation,
      });
    } catch (error) {
      this.logger.warn("内存监控指标记录失败", {
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
    if (count <= 0) return "0";
    if (count <= 5) return "1-5";
    if (count <= 10) return "6-10";
    if (count <= 25) return "11-25";
    if (count <= 50) return "26-50";
    if (count <= 100) return "51-100";
    return "100+";
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
    // ✅ 事件驱动监控：获取监控状态
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_memory_monitor",
          metricType: "system",
          metricName: "monitor_status_check",
          metricValue: 1,
          tags: {
            operation: "get_monitor_status",
            componentType: "query",
          },
        });
      } catch (error) {
        this.logger.warn(`监控状态检查事件发送失败: ${error.message}`);
      }
    });

    try {
      // ✅ 使用真实的系统指标
      const currentMemory = await this.getCurrentSystemMetrics();

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
      this.logger.error("获取内存监控状态失败", error);

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

  /**
   * 获取当前真实的系统指标
   *
   * 使用 Node.js 原生 API 替代硬编码值
   *
   * @returns Promise<SystemMetricsDto> 包含真实内存、CPU 和运行时间的系统指标
   */
  private async getCurrentSystemMetrics(): Promise<SystemMetricsDto> {
    try {
      // 使用 Node.js 原生 API 获取内存使用情况
      const memoryUsage = process.memoryUsage();

      // 获取系统总内存（仅在支持的平台上可用）
      let totalMemory: number;
      let usedMemory: number;

      if (typeof process.memoryUsage.rss === 'function') {
        // 使用 RSS (Resident Set Size) 作为进程已使用内存
        usedMemory = memoryUsage.rss;

        // 尝试获取系统总内存
        try {
          const os = await import('os');
          totalMemory = os.totalmem();
        } catch {
          // 如果无法获取系统总内存，使用进程堆内存限制作为基准
          totalMemory = memoryUsage.rss + memoryUsage.heapUsed + memoryUsage.external;
        }
      } else {
        // 回退到堆内存统计
        usedMemory = memoryUsage.heapUsed;
        totalMemory = memoryUsage.heapTotal;
      }

      // 计算内存使用百分比
      const memoryPercentage = totalMemory > 0 ? usedMemory / totalMemory : 0;

      // 获取进程运行时间
      const uptime = process.uptime();

      // CPU 使用率需要通过采样计算，这里提供一个简化版本
      const cpuUsage = await this.getCpuUsage();

      const systemMetrics: SystemMetricsDto = {
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.min(memoryPercentage, 1), // 确保不超过 100%
        },
        cpu: {
          usage: cpuUsage,
        },
        uptime: uptime,
        timestamp: new Date(),
      };

      this.logger.debug("系统指标获取成功", {
        memoryUsedMB: Math.round(usedMemory / 1024 / 1024),
        memoryTotalMB: Math.round(totalMemory / 1024 / 1024),
        memoryPercentage: (memoryPercentage * 100).toFixed(1) + "%",
        cpuUsage: (cpuUsage * 100).toFixed(1) + "%",
        uptimeSeconds: Math.round(uptime),
      });

      return systemMetrics;
    } catch (error) {
      this.logger.warn("获取系统指标失败，使用默认值", {
        error: error.message,
      });

      // 发生错误时返回安全的默认值
      return {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: 0.3, // 保守的默认值
        },
        cpu: {
          usage: 0.1, // 保守的默认CPU使用率
        },
        uptime: process.uptime(),
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取 CPU 使用率
   *
   * 使用进程 CPU 时间采样来估算 CPU 使用率
   *
   * @returns Promise<number> CPU 使用率 (0-1)
   */
  private async getCpuUsage(): Promise<number> {
    try {
      // 获取进程 CPU 时间
      const cpuUsageBefore = process.cpuUsage();
      const timeBefore = Date.now();

      // 短暂等待以获得采样
      await new Promise(resolve => setTimeout(resolve, 100));

      const cpuUsageAfter = process.cpuUsage(cpuUsageBefore);
      const timeAfter = Date.now();

      // 计算 CPU 使用率
      const timeDiff = timeAfter - timeBefore;
      const totalCpuTime = (cpuUsageAfter.user + cpuUsageAfter.system) / 1000; // 转换为毫秒

      const cpuUsagePercentage = timeDiff > 0 ? totalCpuTime / timeDiff : 0;

      // 限制在合理范围内
      return Math.min(Math.max(cpuUsagePercentage, 0), 1);
    } catch (error) {
      this.logger.debug("CPU使用率获取失败，使用默认值", {
        error: error.message,
      });

      // 返回保守的默认值
      return 0.1;
    }
  }
}
