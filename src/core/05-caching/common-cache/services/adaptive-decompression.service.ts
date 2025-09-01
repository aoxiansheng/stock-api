import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '../../../../app/config/logger.config';
import { CACHE_CONFIG } from '../constants/cache-config.constants';

/**
 * 解压缩性能指标接口
 */
export interface DecompressionMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  currentConcurrency: number;
  maxConcurrency: number;
  queueSize: number;
  memoryUsage: number;
  cpuUsage: number;
  lastAdjustment: Date | null;
}

/**
 * 解压缩任务接口
 */
export interface DecompressionTask {
  id: string;
  data: string;
  startTime: Date;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
  retryCount: number;
  priority: 'low' | 'normal' | 'high';
}

/**
 * 动态并发控制策略枚举
 */
export enum ConcurrencyStrategy {
  CONSERVATIVE = 'conservative', // 保守策略：低并发，高稳定性
  BALANCED = 'balanced',         // 平衡策略：中等并发，平衡性能和稳定性
  AGGRESSIVE = 'aggressive',     // 激进策略：高并发，追求最大性能
  ADAPTIVE = 'adaptive'          // 自适应策略：根据系统状态动态调整
}

/**
 * 自适应解压缩服务
 * 
 * 提供动态并发控制的解压缩操作，特性包括：
 * - 实时性能监控和并发调整
 * - 基于系统资源的智能限流
 * - 任务优先级管理
 * - 自动重试和降级机制
 * - 内存和CPU使用率监控
 * - 多种并发策略支持
 */
@Injectable()
export class AdaptiveDecompressionService {
  private readonly logger = createLogger(AdaptiveDecompressionService.name);

  // 并发控制参数
  private currentMaxConcurrency: number;
  private readonly initialMaxConcurrency: number;
  private readonly minConcurrency: number = 1;
  private readonly maxConcurrency: number;
  
  // 任务管理
  private activeTasks: Map<string, DecompressionTask> = new Map();
  private taskQueue: DecompressionTask[] = [];
  private taskIdCounter: number = 0;

  // 性能指标
  private metrics: DecompressionMetrics;
  private performanceHistory: Array<{ timestamp: Date; duration: number; success: boolean }> = [];
  private readonly historyLimit = 1000;

  // 自适应调整参数
  private lastAdjustmentTime: Date | null = null;
  private adjustmentCooldown: number = 5000; // 5秒调整冷却期
  private strategy: ConcurrencyStrategy;

  // 性能阈值配置
  private readonly performanceThresholds = {
    highCpuUsage: 0.8,         // CPU使用率超过80%
    highMemoryUsage: 0.8,      // 内存使用率超过80%
    lowSuccessRate: 0.9,       // 成功率低于90%
    highAverageDuration: 5000, // 平均处理时间超过5秒
    maxQueueSize: 100          // 最大队列长度
  };

  constructor(private readonly configService: ConfigService) {
    // 初始化配置
    this.initialMaxConcurrency = this.configService.get<number>(
      'cache.decompression.maxConcurrent', 
      CACHE_CONFIG.DECOMPRESSION.MAX_CONCURRENT
    );
    this.maxConcurrency = Math.max(this.initialMaxConcurrency * 2, 50); // 最大可扩展到初始值的2倍或50
    this.currentMaxConcurrency = this.initialMaxConcurrency;

    // 初始化策略
    this.strategy = this.configService.get<ConcurrencyStrategy>(
      'cache.decompression.strategy', 
      ConcurrencyStrategy.ADAPTIVE
    );

    // 初始化指标
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      currentConcurrency: 0,
      maxConcurrency: this.currentMaxConcurrency,
      queueSize: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastAdjustment: null
    };

    // 启动定期性能监控
    this.startPerformanceMonitoring();
    
    this.logger.log('AdaptiveDecompressionService initialized', {
      initialMaxConcurrency: this.initialMaxConcurrency,
      maxConcurrency: this.maxConcurrency,
      strategy: this.strategy
    });
  }

  /**
   * 执行解压缩操作
   * @param data 压缩数据
   * @param priority 任务优先级
   * @returns 解压缩后的数据
   */
  async decompress(data: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<string> {
    return new Promise((resolve, reject) => {
      const taskId = `decomp_${++this.taskIdCounter}_${Date.now()}`;
      const task: DecompressionTask = {
        id: taskId,
        data,
        startTime: new Date(),
        resolve,
        reject,
        retryCount: 0,
        priority
      };

      // 检查队列大小限制
      if (this.taskQueue.length >= this.performanceThresholds.maxQueueSize) {
        reject(new Error('Decompression queue is full'));
        return;
      }

      // 添加到队列（按优先级排序）
      this.addTaskToQueue(task);
      this.processQueue();
    });
  }

  /**
   * 按优先级添加任务到队列
   */
  private addTaskToQueue(task: DecompressionTask): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    // 找到正确的插入位置
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (priorityOrder[task.priority] < priorityOrder[this.taskQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
    this.updateMetrics();
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.currentMaxConcurrency) {
      const task = this.taskQueue.shift();
      if (!task) break;

      this.activeTasks.set(task.id, task);
      this.executeTask(task);
    }
  }

  /**
   * 执行单个解压缩任务
   */
  private async executeTask(task: DecompressionTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 模拟解压缩操作（实际实现应调用压缩服务）
      const result = await this.performDecompression(task.data);
      
      const duration = Date.now() - startTime;
      
      // 记录性能数据
      this.recordPerformance(duration, true);
      
      // 任务成功完成
      task.resolve(result);
      
      this.logger.debug(`Decompression task ${task.id} completed successfully`, {
        duration,
        priority: task.priority,
        dataSize: task.data.length
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance(duration, false);

      // 检查是否需要重试
      if (task.retryCount < 2) {
        task.retryCount++;
        
        this.logger.warn(`Decompression task ${task.id} failed, retrying`, {
          error: error.message,
          retryCount: task.retryCount
        });

        // 重新添加到队列
        this.addTaskToQueue(task);
      } else {
        task.reject(error);
        
        this.logger.error(`Decompression task ${task.id} failed after retries`, {
          error: error.message,
          totalRetries: task.retryCount
        });
      }
    } finally {
      // 清理活跃任务
      this.activeTasks.delete(task.id);
      this.updateMetrics();
      
      // 继续处理队列
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * 执行实际的解压缩操作
   * 这里应该调用实际的解压缩服务
   */
  private async performDecompression(data: string): Promise<string> {
    // 模拟解压缩延迟
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // 模拟偶尔的解压缩失败
    if (Math.random() < 0.05) { // 5%失败率
      throw new Error('Decompression failed: corrupted data');
    }

    // 模拟解压缩结果
    return `decompressed:${data}`;
  }

  /**
   * 记录性能数据
   */
  private recordPerformance(duration: number, success: boolean): void {
    this.performanceHistory.push({
      timestamp: new Date(),
      duration,
      success
    });

    // 限制历史记录大小
    if (this.performanceHistory.length > this.historyLimit) {
      this.performanceHistory.shift();
    }

    // 更新指标
    this.metrics.totalOperations++;
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }

    // 更新平均持续时间
    const recentOperations = this.performanceHistory.slice(-100);
    this.metrics.averageDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;
  }

  /**
   * 更新指标
   */
  private updateMetrics(): void {
    this.metrics.currentConcurrency = this.activeTasks.size;
    this.metrics.maxConcurrency = this.currentMaxConcurrency;
    this.metrics.queueSize = this.taskQueue.length;
    this.metrics.lastAdjustment = this.lastAdjustmentTime;

    // 更新系统资源使用情况
    this.updateSystemMetrics();
  }

  /**
   * 更新系统指标
   */
  private updateSystemMetrics(): void {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      this.metrics.memoryUsage = memUsage.rss / totalMemory;

      // CPU使用率简化计算
      this.metrics.cpuUsage = Math.min(this.activeTasks.size / this.currentMaxConcurrency, 1);
    } catch (error) {
      this.logger.warn('Failed to update system metrics', error);
    }
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMetrics();
      this.adjustConcurrencyIfNeeded();
    }, 2000); // 每2秒检查一次
  }

  /**
   * 根据性能指标调整并发数
   */
  private adjustConcurrencyIfNeeded(): void {
    if (this.strategy !== ConcurrencyStrategy.ADAPTIVE) {
      return;
    }

    const now = Date.now();
    if (this.lastAdjustmentTime && (now - this.lastAdjustmentTime.getTime()) < this.adjustmentCooldown) {
      return; // 冷却期内不调整
    }

    const shouldIncrease = this.shouldIncreaseConcurrency();
    const shouldDecrease = this.shouldDecreaseConcurrency();

    if (shouldIncrease && !shouldDecrease) {
      this.increaseConcurrency();
    } else if (shouldDecrease && !shouldIncrease) {
      this.decreaseConcurrency();
    }
  }

  /**
   * 判断是否应该增加并发数
   */
  private shouldIncreaseConcurrency(): boolean {
    const recentOperations = this.performanceHistory.slice(-50);
    if (recentOperations.length < 10) return false;

    const successRate = recentOperations.filter(op => op.success).length / recentOperations.length;
    const avgDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;

    return (
      this.currentMaxConcurrency < this.maxConcurrency &&
      successRate > 0.95 &&
      avgDuration < 2000 &&
      this.metrics.memoryUsage < 0.7 &&
      this.metrics.cpuUsage < 0.7 &&
      this.metrics.queueSize > 5
    );
  }

  /**
   * 判断是否应该减少并发数
   */
  private shouldDecreaseConcurrency(): boolean {
    const recentOperations = this.performanceHistory.slice(-50);
    if (recentOperations.length < 10) return false;

    const successRate = recentOperations.filter(op => op.success).length / recentOperations.length;
    const avgDuration = recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length;

    return (
      this.currentMaxConcurrency > this.minConcurrency &&
      (
        successRate < 0.9 ||
        avgDuration > 4000 ||
        this.metrics.memoryUsage > 0.8 ||
        this.metrics.cpuUsage > 0.8
      )
    );
  }

  /**
   * 增加并发数
   */
  private increaseConcurrency(): void {
    const oldConcurrency = this.currentMaxConcurrency;
    this.currentMaxConcurrency = Math.min(
      this.currentMaxConcurrency + 1,
      this.maxConcurrency
    );

    this.lastAdjustmentTime = new Date();

    this.logger.log(`Increased decompression concurrency`, {
      from: oldConcurrency,
      to: this.currentMaxConcurrency,
      reason: 'Good performance metrics'
    });

    // 处理等待的任务
    setImmediate(() => this.processQueue());
  }

  /**
   * 减少并发数
   */
  private decreaseConcurrency(): void {
    const oldConcurrency = this.currentMaxConcurrency;
    this.currentMaxConcurrency = Math.max(
      this.currentMaxConcurrency - 1,
      this.minConcurrency
    );

    this.lastAdjustmentTime = new Date();

    this.logger.log(`Decreased decompression concurrency`, {
      from: oldConcurrency,
      to: this.currentMaxConcurrency,
      reason: 'Performance degradation detected'
    });
  }

  /**
   * 设置并发策略
   */
  setConcurrencyStrategy(strategy: ConcurrencyStrategy): void {
    this.strategy = strategy;
    
    switch (strategy) {
      case ConcurrencyStrategy.CONSERVATIVE:
        this.currentMaxConcurrency = Math.max(1, Math.floor(this.initialMaxConcurrency * 0.5));
        break;
      case ConcurrencyStrategy.BALANCED:
        this.currentMaxConcurrency = this.initialMaxConcurrency;
        break;
      case ConcurrencyStrategy.AGGRESSIVE:
        this.currentMaxConcurrency = Math.min(this.maxConcurrency, this.initialMaxConcurrency * 1.5);
        break;
      case ConcurrencyStrategy.ADAPTIVE:
        // 保持当前值，让自适应算法调整
        break;
    }

    this.logger.log(`Concurrency strategy changed to ${strategy}`, {
      newConcurrency: this.currentMaxConcurrency
    });
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): DecompressionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * 获取服务健康状态
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    metrics: DecompressionMetrics;
  } {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    // 检查性能指标
    if (metrics.memoryUsage > this.performanceThresholds.highMemoryUsage) {
      issues.push(`High memory usage: ${(metrics.memoryUsage * 100).toFixed(1)}%`);
    }

    if (metrics.cpuUsage > this.performanceThresholds.highCpuUsage) {
      issues.push(`High CPU usage: ${(metrics.cpuUsage * 100).toFixed(1)}%`);
    }

    const successRate = metrics.totalOperations > 0 ? 
      metrics.successfulOperations / metrics.totalOperations : 1;
    
    if (successRate < this.performanceThresholds.lowSuccessRate) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
    }

    if (metrics.averageDuration > this.performanceThresholds.highAverageDuration) {
      issues.push(`High average duration: ${metrics.averageDuration.toFixed(0)}ms`);
    }

    if (metrics.queueSize >= this.performanceThresholds.maxQueueSize) {
      issues.push(`Queue is full: ${metrics.queueSize} tasks`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics
    };
  }

  /**
   * 清理资源（用于测试或重置）
   */
  cleanup(): void {
    // 拒绝所有等待中的任务
    this.taskQueue.forEach(task => {
      task.reject(new Error('Service is shutting down'));
    });
    this.taskQueue = [];

    // 等待活跃任务完成的简单处理
    // 在实际实现中，应该给活跃任务一些时间来完成
    this.activeTasks.clear();

    // 重置指标
    this.performanceHistory = [];
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      currentConcurrency: 0,
      maxConcurrency: this.currentMaxConcurrency,
      queueSize: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastAdjustment: null
    };

    this.logger.log('AdaptiveDecompressionService cleaned up');
  }
}