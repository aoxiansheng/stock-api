/**
 * 🎯 事件批处理器
 *
 * 职责：高性能事件批处理，支持背压控制和优雅关闭
 * 设计理念：非阻塞、内存安全、可监控
 */

import { MONITORING_SYSTEM_LIMITS } from '../../constants/config/monitoring-system.constants';

interface BatchedEvent {
  type: string;
  events: any[];
  count: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

// 批处理结果
export interface BatchResult {
  accepted: boolean;
  reason?: "queue_full" | "rate_limit" | "shutdown";
  shouldFlush?: boolean;
  droppedCount?: number;
}

// 批处理统计
export interface BatcherMetrics {
  totalEvents: number;
  droppedEvents: number;
  batchCount: number;
  isShuttingDown: boolean;
  queueUtilization: number;
}

export class EventBatcher {
  private batches = new Map<string, BatchedEvent>();
  private flushTimer?: NodeJS.Timeout;
  private totalEventCount = 0;
  private droppedEvents = 0;
  private isShuttingDown = false;

  // 背压控制参数
  private readonly maxTotalEvents: number;
  private readonly highWaterMark: number;

  constructor(
    private readonly flushIntervalMs: number = 100,
    private readonly maxBatchSize: number = MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE,
    private readonly maxQueueSize: number = 10000,
  ) {
    this.maxTotalEvents = maxQueueSize;
    this.highWaterMark = Math.floor(maxQueueSize * 0.8); // 80% 为高水位
  }

  /**
   * 添加事件到批处理队列
   */
  add(eventType: string, event: any): BatchResult {
    // 关闭状态检查
    if (this.isShuttingDown) {
      return {
        accepted: false,
        reason: "shutdown",
      };
    }

    // 背压控制 - 总事件数检查
    if (this.totalEventCount >= this.maxTotalEvents) {
      this.droppedEvents++;
      return {
        accepted: false,
        reason: "queue_full",
        shouldFlush: true,
        droppedCount: this.droppedEvents,
      };
    }

    const now = Date.now();
    const batch = this.batches.get(eventType) || {
      type: eventType,
      events: [],
      count: 0,
      firstTimestamp: now,
      lastTimestamp: now,
    };

    batch.events.push(event);
    batch.count++;
    batch.lastTimestamp = now;
    this.totalEventCount++;

    this.batches.set(eventType, batch);

    // 检查是否需要立即刷新
    let shouldFlush = false;

    // 批次大小触发刷新
    if (batch.count >= this.maxBatchSize) {
      this.flushType(eventType);
      shouldFlush = true;
    }

    // 高水位触发刷新
    if (this.totalEventCount >= this.highWaterMark) {
      this.flushAll();
      shouldFlush = true;
    }

    // 启动定时刷新
    if (!this.flushTimer && !shouldFlush) {
      this.flushTimer = setTimeout(() => this.flushAll(), this.flushIntervalMs);
    }

    return {
      accepted: true,
      shouldFlush,
    };
  }

  /**
   * 刷新指定类型的批次
   */
  flushType(eventType: string): BatchedEvent | null {
    const batch = this.batches.get(eventType);
    if (!batch) return null;

    this.batches.delete(eventType);
    this.totalEventCount -= batch.count;
    return batch;
  }

  /**
   * 刷新所有批次
   */
  flushAll(): BatchedEvent[] {
    const results = Array.from(this.batches.values());
    this.batches.clear();
    this.totalEventCount = 0;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    return results;
  }

  /**
   * 获取统计信息
   */
  getMetrics(): BatcherMetrics {
    return {
      totalEvents: this.totalEventCount,
      droppedEvents: this.droppedEvents,
      batchCount: this.batches.size,
      isShuttingDown: this.isShuttingDown,
      queueUtilization: (this.totalEventCount / this.maxTotalEvents) * MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER,
    };
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // 刷新所有待处理事件
    const finalBatches = this.flushAll();

    // 清理资源
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    return Promise.resolve();
  }

  /**
   * 重置统计
   */
  resetMetrics(): void {
    this.droppedEvents = 0;
  }

  /**
   * 检查批处理器健康状态
   */
  isHealthy(): boolean {
    return (
      !this.isShuttingDown &&
      this.totalEventCount < this.maxTotalEvents &&
      this.droppedEvents < MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE
    ); // 丢弃事件少于100个认为健康
  }

  /**
   * 获取批处理器状态摘要
   */
  getStatus(): {
    status: "healthy" | "degraded" | "unhealthy";
    reason?: string;
    metrics: BatcherMetrics;
  } {
    const metrics = this.getMetrics();

    if (this.isShuttingDown) {
      return {
        status: "unhealthy",
        reason: "shutting_down",
        metrics,
      };
    }

    if (metrics.queueUtilization > 90) {
      return {
        status: "unhealthy",
        reason: "queue_nearly_full",
        metrics,
      };
    }

    if (metrics.queueUtilization > 70 || metrics.droppedEvents > 50) {
      return {
        status: "degraded",
        reason:
          metrics.queueUtilization > 70 ? "high_utilization" : "events_dropped",
        metrics,
      };
    }

    return {
      status: "healthy",
      metrics,
    };
  }

  /**
   * 强制刷新特定事件类型（用于测试或紧急情况）
   */
  forceFlush(eventType?: string): BatchedEvent[] {
    if (eventType) {
      const batch = this.flushType(eventType);
      return batch ? [batch] : [];
    }

    return this.flushAll();
  }
}
