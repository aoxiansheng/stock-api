/**
 * 轻量任务限流器
 * 用于控制异步任务的并发数量，防止内存泄漏
 */
export class AsyncTaskLimiter {
  private pendingCount = 0;
  private readonly maxPending: number;
  private readonly taskTimeout: number;
  private readonly taskQueue: Array<() => Promise<any>> = [];
  private readonly maxQueueSize: number;

  constructor(maxPending = 30, taskTimeoutMs = 5000, maxQueueSize = 100) {
    this.maxPending = maxPending;
    this.taskTimeout = taskTimeoutMs;
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * 调度异步任务执行
   * @param task 要执行的异步任务
   */
  async schedule<T>(task: () => Promise<T>): Promise<void> {
    // 如果当前运行任务数未达到限制，直接执行
    if (this.pendingCount < this.maxPending) {
      this.executeTask(task);
      return;
    }

    // 如果队列未满，加入队列等待
    if (this.taskQueue.length < this.maxQueueSize) {
      this.taskQueue.push(task);
      return;
    }

    // 队列已满，丢弃任务（避免内存无限增长）
    return;
  }

  /**
   * 执行任务并处理队列
   * @param task 要执行的任务
   */
  private executeTask<T>(task: () => Promise<T>): void {
    this.pendingCount++;

    setImmediate(async () => {
      try {
        // 创建超时Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task timeout after ${this.taskTimeout}ms`));
          }, this.taskTimeout);
        });

        // 使用Promise.race来实现超时机制
        await Promise.race([task(), timeoutPromise]);
      } catch (error) {
        // 忽略异步任务错误，不影响主业务
        // 包括超时错误也会被忽略
      } finally {
        this.pendingCount--;
        // 任务完成后，处理队列中的下一个任务
        this.processNextTask();
      }
    });
  }

  /**
   * 处理队列中的下一个任务
   */
  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.pendingCount < this.maxPending) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        this.executeTask(nextTask);
      }
    }
  }

  /**
   * 获取当前待处理任务数量
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   * 获取最大并发数量
   */
  getMaxPending(): number {
    return this.maxPending;
  }

  /**
   * 获取任务超时时间（毫秒）
   */
  getTaskTimeout(): number {
    return this.taskTimeout;
  }

  /**
   * 获取当前队列长度
   */
  getQueueLength(): number {
    return this.taskQueue.length;
  }

  /**
   * 获取最大队列长度
   */
  getMaxQueueSize(): number {
    return this.maxQueueSize;
  }

  /**
   * 获取队列状态信息
   */
  getStats(): {
    pending: number;
    queued: number;
    maxPending: number;
    maxQueueSize: number;
    taskTimeout: number;
  } {
    return {
      pending: this.pendingCount,
      queued: this.taskQueue.length,
      maxPending: this.maxPending,
      maxQueueSize: this.maxQueueSize,
      taskTimeout: this.taskTimeout,
    };
  }
}
