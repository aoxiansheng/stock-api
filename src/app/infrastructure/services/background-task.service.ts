import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger, sanitizeLogData } from "@app/config/logger.config";
import { SYSTEM_STATUS_EVENTS } from "../../../monitoring/contracts/events/system-status.events";

@Injectable()
export class BackgroundTaskService {
  private readonly logger = createLogger(BackgroundTaskService.name);
  private readonly taskCounter = new Map<string, number>(); // 任务类型计数器

  constructor(
    private readonly eventBus: EventEmitter2, // ✅ 事件化监控依赖
  ) {}

  /**
   * Executes a task in the background without blocking the main thread.
   * Catches and logs any errors to prevent unhandled promise rejections.
   * @param task A function that returns a Promise.
   * @param description A description of the task for logging purposes.
   */
  run(task: () => Promise<any>, description: string): void {
    const taskId = `${description}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    this.logger.debug(`Executing background task: ${description}`);

    // 更新任务计数
    const currentCount = this.taskCounter.get(description) || 0;
    this.taskCounter.set(description, currentCount + 1);

    // Use setImmediate to ensure the task runs on the next I/O cycle,
    // completely detaching it from the current request-response cycle.
    setImmediate(() => {
      Promise.resolve()
        .then(task)
        .then(() => {
          // ✅ 任务成功监控 - 事件化
          this.emitTaskEvent("background_task_completed", {
            duration: Date.now() - startTime,
            task_type: description,
            task_id: taskId,
            status: "success",
          });
        })
        .catch((error) => {
          // ✅ 任务失败监控 - 事件化
          this.emitTaskEvent("background_task_failed", {
            duration: Date.now() - startTime,
            task_type: description,
            task_id: taskId,
            status: "error",
            error: error.message,
          });

          // 保持原有错误日志
          this.logger.error(
            `Background task "${description}" failed.`,
            sanitizeLogData({
              error: error.message,
              stack: error.stack,
            }),
          );
        })
        .finally(() => {
          // 减少任务计数
          const count = this.taskCounter.get(description) || 1;
          if (count <= 1) {
            this.taskCounter.delete(description);
          } else {
            this.taskCounter.set(description, count - 1);
          }
        });
    });
  }

  // ✅ 获取任务统计（新增功能）
  getTaskStatistics(): Record<string, number> {
    return Object.fromEntries(this.taskCounter.entries());
  }

  /**
   * 发送后台任务监控事件
   * @param metricName 事件名称
   * @param data 事件数据
   */
  private emitTaskEvent(
    metricName: string,
    data: {
      duration?: number;
      task_type?: string;
      task_id?: string;
      status?: string;
      error?: string;
    },
  ): void {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "background_task_service",
          metricType: "business",
          metricName,
          metricValue: data.duration || 1,
          tags: {
            operation: "background_task",
            task_type: data.task_type,
            task_id: data.task_id,
            status: data.status,
            error: data.error,
          },
        });
      } catch (error) {
        this.logger.warn("后台任务监控事件发送失败", {
          error: error.message,
          metricName,
        });
      }
    });
  }
}
