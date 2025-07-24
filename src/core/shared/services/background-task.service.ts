import { Injectable } from '@nestjs/common';
import { createLogger, sanitizeLogData } from '@common/config/logger.config';

@Injectable()
export class BackgroundTaskService {
  private readonly logger = createLogger(BackgroundTaskService.name);

  /**
   * Executes a task in the background without blocking the main thread.
   * Catches and logs any errors to prevent unhandled promise rejections.
   * @param task A function that returns a Promise.
   * @param description A description of the task for logging purposes.
   */
  run(task: () => Promise<any>, description: string): void {
    this.logger.debug(`Executing background task: ${description}`);
    
    // Use setImmediate to ensure the task runs on the next I/O cycle,
    // completely detaching it from the current request-response cycle.
    setImmediate(() => {
      Promise.resolve()
        .then(task)
        .catch((error) => {
          this.logger.error(
            `Background task "${description}" failed.`,
            sanitizeLogData({
              error: error.message,
              stack: error.stack,
            }),
          );
        });
    });
  }
} 