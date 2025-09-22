/**
 * 轻量任务限流器
 * 用于控制异步任务的并发数量，防止内存泄漏
 */
export class AsyncTaskLimiter {
  private pendingCount = 0;
  private readonly maxPending: number;
  private readonly taskTimeout: number;

  constructor(maxPending = 30, taskTimeoutMs = 5000) {
    this.maxPending = maxPending;
    this.taskTimeout = taskTimeoutMs;
  }

  /**
   * 调度异步任务执行
   * @param task 要执行的异步任务
   */
  async schedule<T>(task: () => Promise<T>): Promise<void> {
    if (this.pendingCount >= this.maxPending) {
      return; // 简单丢弃，而非队列
    }

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
      }
    });
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
}
