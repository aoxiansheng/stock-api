import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import os from "os";
import { createLogger } from "@common/logging/index";
import { BackgroundTaskService } from "@common/infrastructure/services/background-task.service";
import { SYSTEM_STATUS_EVENTS } from "../../../../../monitoring/contracts/events/system-status.events";
import { SMART_CACHE_CONSTANTS } from "../constants/smart-cache.constants";
import { SMART_CACHE_COMPONENT } from "../constants/smart-cache.component.constants";

/**
 * SmartCache 性能优化器服务
 *
 * 提供独立的性能优化功能：
 * - 动态并发控制
 * - 内存压力监控
 * - 批量处理优化
 * - 系统资源感知
 *
 * 设计为可被 SmartCacheOrchestrator 组合使用的独立服务
 */
@Injectable()
export class SmartCachePerformanceOptimizer {
  private readonly logger = createLogger(
    SMART_CACHE_COMPONENT.LOG_CONTEXTS.PERFORMANCE_OPTIMIZER,
  );

  /** 系统资源监控相关 */
  private lastMemoryCheck = 0;
  private memoryCheckInterval =
    SMART_CACHE_CONSTANTS.INTERVALS_MS.MEMORY_CHECK_INTERVAL_MS;
  private cpuCheckInterval =
    SMART_CACHE_CONSTANTS.INTERVALS_MS.CPU_CHECK_INTERVAL_MS;

  /** 动态配置管理 */
  private dynamicMaxConcurrency: number;
  private originalMaxConcurrency: number;
  private currentBatchSize: number =
    SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.DEFAULT_BATCH_SIZE_COUNT;

  /** 性能统计 */
  private performanceStats = {
    concurrencyAdjustments: 0,
    memoryPressureEvents: 0,
    tasksCleared: 0,
    avgExecutionTime: 0,
    totalTasks: 0,
  };

  /** 定时器资源管理 */
  private readonly timers = new Set<NodeJS.Timeout>();
  private isShuttingDown = false;

  constructor(
    private readonly eventBus?: EventEmitter2, // 事件化监控：可选注入事件总线
    private readonly backgroundTaskService?: BackgroundTaskService, // 后台任务服务：统一异步任务管理
  ) {
    // 初始化默认并发数
    this.originalMaxConcurrency = Math.min(
      Math.max(
        SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_CONCURRENT_UPDATES_COUNT,
        os.cpus().length,
      ),
      SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MAX_CONCURRENT_UPDATES_COUNT,
    );
    this.dynamicMaxConcurrency = this.originalMaxConcurrency;

    this.logger.log("SmartCachePerformanceOptimizer initialized", {
      originalMaxConcurrency: this.originalMaxConcurrency,
      cpuCores: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
    });
  }

  /**
   * 启动性能优化监控
   */
  startOptimization(baseMaxConcurrency?: number): void {
    if (baseMaxConcurrency) {
      this.originalMaxConcurrency = baseMaxConcurrency;
      this.dynamicMaxConcurrency = baseMaxConcurrency;
    }

    this.startDynamicConcurrencyAdjustment();
    this.startMemoryHealthCheck();
    this.startBatchSizeOptimization();

    this.logger.log("Performance optimization started");
  }

  /**
   * 停止性能优化监控
   */
  stopOptimization(): void {
    this.isShuttingDown = true;

    // 清理所有定时器
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();

    this.logFinalPerformanceStats();
    this.logger.log("Performance optimization stopped");
  }

  /**
   * 基于系统资源动态计算最优并发数
   */
  async calculateOptimalConcurrency(): Promise<number> {
    return this.trackExecution(async () => {
      const systemMetrics = await this.getSystemMetrics();
      const cpuCores = os.cpus().length;
      const baseConfig = this.originalMaxConcurrency;

      // CPU使用率因子
      let cpuFactor = 1.0;
      if (systemMetrics.cpu.usage < 0.5) {
        cpuFactor = 1.5; // CPU使用率低，增加并发
      } else if (systemMetrics.cpu.usage > 0.8) {
        cpuFactor = 0.6; // CPU使用率高，减少并发
      }

      // 内存因子
      let memoryFactor = 1.0;
      if (systemMetrics.memory.percentage < 0.7) {
        memoryFactor = 1.2;
      } else if (
        systemMetrics.memory.percentage >
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.MEMORY_PRESSURE_THRESHOLD
      ) {
        memoryFactor = 0.5;
      }

      // 计算动态并发数
      const dynamicConcurrency = Math.floor(
        cpuCores * cpuFactor * memoryFactor,
      );

      // 应用边界限制
      return Math.min(
        Math.max(2, dynamicConcurrency),
        Math.min(baseConfig * 2, 32),
      );
    }, "calculateOptimalConcurrency");
  }

  /**
   * 定期调整并发限制
   */
  private startDynamicConcurrencyAdjustment(): void {
    const timer = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const optimalConcurrency = await this.calculateOptimalConcurrency();

        if (optimalConcurrency !== this.dynamicMaxConcurrency) {
          const oldConcurrency = this.dynamicMaxConcurrency;
          this.dynamicMaxConcurrency = optimalConcurrency;
          this.performanceStats.concurrencyAdjustments++;

          this.logger.log(
            `Concurrency adjusted: ${oldConcurrency} → ${optimalConcurrency}`,
          );

          // 记录并发数调整指标 - 事件化监控
          this.emitMetrics("concurrency_adjusted", optimalConcurrency, {
            oldConcurrency,
            newConcurrency: optimalConcurrency,
            memoryUsage: process.memoryUsage().heapUsed.toFixed(2),
            cpuUsage: os.loadavg()[0].toFixed(2),
            adjustmentType: "dynamic_optimization",
          });
        }
      } catch (error) {
        this.logger.error("Dynamic concurrency adjustment failed", error);
      }
    }, this.cpuCheckInterval);

    this.timers.add(timer);
  }

  /**
   * 检测内存压力
   */
  async checkMemoryPressure(): Promise<boolean> {
    try {
      const systemMetrics = await this.getSystemMetrics();
      return (
        systemMetrics.memory.percentage >
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.MEMORY_PRESSURE_THRESHOLD
      );
    } catch (error) {
      this.logger.error("Memory pressure check failed", error);
      return false;
    }
  }

  /**
   * 处理内存压力
   */
  async handleMemoryPressure(): Promise<{
    handled: boolean;
    reducedConcurrency?: number;
    clearedTasks?: number;
  }> {
    return this.trackExecution(async () => {
      const isUnderPressure = await this.checkMemoryPressure();

      if (!isUnderPressure) {
        return { handled: false };
      }

      // 减少并发数
      const newConcurrency = Math.max(
        2,
        Math.floor(this.dynamicMaxConcurrency / 2),
      );
      const oldConcurrency = this.dynamicMaxConcurrency;
      this.dynamicMaxConcurrency = newConcurrency;

      this.performanceStats.memoryPressureEvents++;

      this.logger.warn("Memory pressure handled", {
        reducedConcurrency: { from: oldConcurrency, to: newConcurrency },
        memoryPressureEvents: this.performanceStats.memoryPressureEvents,
      });

      // 记录内存压力处理事件 - 事件化监控
      this.emitMetrics("memory_pressure_handled", newConcurrency, {
        previousConcurrency: this.dynamicMaxConcurrency,
        newConcurrency,
        memoryPressureEvents: this.performanceStats.memoryPressureEvents,
        pressureLevel: "resolved",
      });

      return {
        handled: true,
        reducedConcurrency: newConcurrency,
      };
    }, "handleMemoryPressure");
  }

  /**
   * 启动内存健康检查
   */
  private startMemoryHealthCheck(): void {
    const timer = setInterval(async () => {
      if (this.isShuttingDown) return;

      const now = Date.now();
      if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
        return;
      }

      this.lastMemoryCheck = now;
      await this.handleMemoryPressure();
    }, this.memoryCheckInterval);

    this.timers.add(timer);
  }

  /**
   * 计算最优批量大小
   */
  calculateOptimalBatchSize(currentLoad = 0): number {
    return this.trackExecutionSync(() => {
      const DEFAULT_BATCH_SIZE =
        SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.DEFAULT_BATCH_SIZE_COUNT;
      const MAX_BATCH_SIZE =
        SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MAX_BATCH_SIZE_COUNT;
      const MIN_BATCH_SIZE =
        SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_BATCH_SIZE_COUNT;

      const maxConcurrency = this.dynamicMaxConcurrency;
      const loadFactor = maxConcurrency > 0 ? currentLoad / maxConcurrency : 0;

      let batchSize: number = DEFAULT_BATCH_SIZE;

      if (
        loadFactor < SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.STRONG_UPDATE_RATIO
      ) {
        batchSize = Math.min(DEFAULT_BATCH_SIZE * 2, MAX_BATCH_SIZE);
      } else if (
        loadFactor >
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.CPU_PRESSURE_THRESHOLD
      ) {
        batchSize = Math.max(DEFAULT_BATCH_SIZE / 2, MIN_BATCH_SIZE);
      }

      // 根据内存使用情况调整
      const memoryUsage = process.memoryUsage();
      const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal;

      if (
        memoryPressure >
        SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS.CPU_PRESSURE_THRESHOLD
      ) {
        batchSize = Math.max(batchSize / 2, MIN_BATCH_SIZE);
      }

      return Math.round(batchSize);
    }, "calculateOptimalBatchSize");
  }

  /**
   * 启动批量大小优化
   */
  private startBatchSizeOptimization(): void {
    const timer = setInterval(() => {
      if (this.isShuttingDown) return;

      const newBatchSize = this.calculateOptimalBatchSize();

      if (newBatchSize !== this.currentBatchSize) {
        const oldBatchSize = this.currentBatchSize;
        this.currentBatchSize = newBatchSize;

        this.logger.debug(
          `Batch size adjusted: ${oldBatchSize} → ${newBatchSize}`,
        );
      }
    }, SMART_CACHE_CONSTANTS.INTERVALS_MS.MEMORY_CHECK_INTERVAL_MS);

    this.timers.add(timer);
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<{
    cpu: { usage: number };
    memory: { usedMB: number; totalMB: number; percentage: number };
    system: { loadAvg: number[]; uptime: number };
  }> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const loadAverage = os.loadavg();
    const cpuCores = os.cpus().length;
    const cpuUsage = Math.min(1.0, loadAverage[0] / cpuCores);

    return {
      cpu: {
        usage: Math.max(0, Math.min(1, cpuUsage)),
      },
      memory: {
        usedMB: Math.round(usedMemory / (1024 * 1024)),
        totalMB: Math.round(totalMemory / (1024 * 1024)),
        percentage: usedMemory / totalMemory,
      },
      system: {
        loadAvg: loadAverage,
        uptime: os.uptime(),
      },
    };
  }

  /**
   * 跟踪异步操作的执行时间并更新性能统计
   */
  private async trackExecution<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      this.updateExecutionStats(Date.now() - startTime, operationName);
      return result;
    } catch (error) {
      this.updateExecutionStats(Date.now() - startTime, operationName);
      throw error;
    }
  }

  /**
   * 跟踪同步操作的执行时间并更新性能统计
   */
  private trackExecutionSync<T>(
    operation: () => T,
    operationName: string,
  ): T {
    const startTime = Date.now();
    try {
      const result = operation();
      this.updateExecutionStats(Date.now() - startTime, operationName);
      return result;
    } catch (error) {
      this.updateExecutionStats(Date.now() - startTime, operationName);
      throw error;
    }
  }

  /**
   * 更新执行统计信息
   */
  private updateExecutionStats(executionTime: number, operationName: string): void {
    this.performanceStats.totalTasks++;

    // 计算滚动平均执行时间
    if (this.performanceStats.totalTasks === 1) {
      this.performanceStats.avgExecutionTime = executionTime;
    } else {
      this.performanceStats.avgExecutionTime =
        (this.performanceStats.avgExecutionTime * (this.performanceStats.totalTasks - 1) + executionTime) /
        this.performanceStats.totalTasks;
    }

    this.logger.debug(`Operation ${operationName} completed`, {
      executionTime: `${executionTime}ms`,
      avgExecutionTime: `${this.performanceStats.avgExecutionTime.toFixed(2)}ms`,
      totalTasks: this.performanceStats.totalTasks,
    });
  }

  /**
   * 记录指标 - 事件化监控
   */
  private emitMetrics(
    metricName: string,
    metricValue: number,
    tags: any = {},
  ): void {
    if (!this.eventBus) return;

    try {
      // 优先使用BackgroundTaskService，回退到setImmediate
      if (this.backgroundTaskService) {
        this.backgroundTaskService.run(async () => {
          this.eventBus!.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: "smart_cache_performance_optimizer",
            metricType: "performance",
            metricName,
            metricValue,
            tags: {
              componentType: "smart_cache_performance_optimizer",
              ...tags,
            },
          });
        }, `emit_performance_metric_${metricName}`);
      } else {
        setImmediate(() => {
          this.eventBus!.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: "smart_cache_performance_optimizer",
            metricType: "performance",
            metricName,
            metricValue,
            tags: {
              componentType: "smart_cache_performance_optimizer",
              ...tags,
            },
          });
        });
      }
    } catch (error) {
      // 指标记录失败不应该影响主要功能
      this.logger.debug("Metrics recording failed", error);
    }
  }

  /**
   * 获取当前批量大小
   */
  getCurrentBatchSize(): number {
    return this.currentBatchSize;
  }

  /**
   * 获取动态并发数
   */
  getDynamicMaxConcurrency(): number {
    return this.dynamicMaxConcurrency;
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      dynamicMaxConcurrency: this.dynamicMaxConcurrency,
      originalMaxConcurrency: this.originalMaxConcurrency,
      currentBatchSize: this.currentBatchSize,
    };
  }

  /**
   * 记录最终性能统计
   */
  private logFinalPerformanceStats(): void {
    const finalStats = this.getPerformanceStats();
    this.logger.log("Final performance statistics", finalStats);

    // 记录最终性能统计 - 事件化监控
    this.emitMetrics("performance_optimizer_shutdown", 1, {
      ...finalStats,
      shutdownType: "graceful",
    });
  }
}
