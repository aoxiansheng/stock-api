import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { createLogger } from "@app/config/logger.config";
import { StartupConfig } from "../config/startup.config";
import { OPERATION_LIMITS } from '@common/constants/domain';

export interface ShutdownHook {
  name: string;
  priority: number; // 数字越小优先级越高
  timeout: number;
  execute: () => Promise<void>;
}

export interface ShutdownResult {
  success: boolean;
  hooks: Array<{
    name: string;
    success: boolean;
    duration: number;
    error?: string;
  }>;
  totalDuration: number;
  signal?: string;
}

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = createLogger(GracefulShutdownService.name);
  private readonly shutdownHooks: ShutdownHook[] = [];
  private isShuttingDown = false;
  private shutdownPromise: Promise<ShutdownResult> | null = null;

  constructor() {
    this.setupSignalHandlers();
  }

  /**
   * 注册关闭钩子
   */
  registerShutdownHook(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
    // 按优先级排序
    this.shutdownHooks.sort((a, b) => a.priority - b.priority);

    this.logger.debug(`Registered shutdown hook: ${hook.name}`, {
      priority: hook.priority,
      timeout: hook.timeout,
    });
  }

  /**
   * 执行优雅关闭
   */
  async performGracefulShutdown(
    signal?: string,
    startupConfig?: StartupConfig,
  ): Promise<ShutdownResult> {
    if (this.isShuttingDown) {
      this.logger.warn("Graceful shutdown already in progress");
      return this.shutdownPromise as any;
    }

    this.isShuttingDown = true;
    const startTime = Date.now();

    this.logger.log("Starting graceful shutdown...", { signal });

    const timeout = startupConfig?.shutdown.timeout || 10000;

    this.shutdownPromise = this.executeShutdownWithTimeout(timeout, signal);
    return this.shutdownPromise as any;
  }

  /**
   * 使用超时执行关闭
   */
  private async executeShutdownWithTimeout(
    timeout: number,
    signal?: string,
  ): Promise<ShutdownResult> {
    const startTime = Date.now();

    try {
      // 使用Promise.race实现超时
      const shutdownPromise = this.executeShutdownHooks();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Graceful shutdown timed out after ${timeout}ms`));
        }, timeout);
      });

      const result = await Promise.race([shutdownPromise, timeoutPromise]);

      return {
        ...result,
        signal,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error("Graceful shutdown failed or timed out", {
        error: error.message,
        signal,
        duration: Date.now() - startTime,
      });

      return {
        success: false,
        hooks: [],
        totalDuration: Date.now() - startTime,
        signal,
      };
    }
  }

  /**
   * 执行所有关闭钩子
   */
  private async executeShutdownHooks(): Promise<ShutdownResult> {
    const startTime = Date.now();
    const hookResults: Array<{
      name: string;
      success: boolean;
      duration: number;
      error?: string;
    }> = [];

    let overallSuccess = true;

    // 注册默认关闭钩子
    this.registerDefaultShutdownHooks();

    this.logger.debug(
      `Executing ${this.shutdownHooks.length} shutdown hooks...`,
    );

    // 按优先级执行关闭钩子
    for (const hook of this.shutdownHooks) {
      const hookStartTime = Date.now();

      try {
        this.logger.debug(`Executing shutdown hook: ${hook.name}`, {
          priority: hook.priority,
          timeout: hook.timeout,
        });

        // 使用钩子特定的超时
        await this.executeHookWithTimeout(hook);

        const duration = Date.now() - hookStartTime;
        hookResults.push({
          name: hook.name,
          success: true,
          duration,
        });

        this.logger.debug(`Shutdown hook completed: ${hook.name}`, {
          duration,
        });
      } catch (error) {
        const duration = Date.now() - hookStartTime;
        const errorMessage = error.message || "Unknown error";

        hookResults.push({
          name: hook.name,
          success: false,
          duration,
          error: errorMessage,
        });

        this.logger.error(`Shutdown hook failed: ${hook.name}`, {
          error: errorMessage,
          duration,
        });

        // 关闭钩子失败不阻止其他钩子执行
        overallSuccess = false;
      }
    }

    return {
      success: overallSuccess,
      hooks: hookResults,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * 注册默认关闭钩子
   */
  private registerDefaultShutdownHooks(): void {
    // 避免重复注册
    const defaultHooksNames = [
      "stop-accepting-connections",
      "close-database-connections",
      "close-cache-connections",
      "cleanup-resources",
    ];

    const existingNames = this.shutdownHooks.map((h) => h.name);
    const needsRegistration = defaultHooksNames.filter(
      (name) => !existingNames.includes(name),
    );

    if (needsRegistration.length === 0) return;

    // 停止接受新连接 (最高优先级)
    if (needsRegistration.includes("stop-accepting-connections")) {
      this.registerShutdownHook({
        name: "stop-accepting-connections",
        priority: 1,
        timeout: 2000,
        execute: async () => {
          this.logger.debug("Stopping acceptance of new connections...");
          // 这里可以添加停止HTTP服务器接受新连接的逻辑
        },
      });
    }

    // 关闭数据库连接
    if (needsRegistration.includes("close-database-connections")) {
      this.registerShutdownHook({
        name: "close-database-connections",
        priority: 10,
        timeout: OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST,
        execute: async () => {
          this.logger.debug("Closing database connections...");
          try {
            // 这里可以添加关闭MongoDB连接的逻辑
            // 如果使用Mongoose，可以调用mongoose.disconnect()
          } catch (error) {
            this.logger.warn("Error closing database connections", {
              error: error.message,
            });
          }
        },
      });
    }

    // 关闭缓存连接
    if (needsRegistration.includes("close-cache-connections")) {
      this.registerShutdownHook({
        name: "close-cache-connections",
        priority: 15,
        timeout: 3000,
        execute: async () => {
          this.logger.debug("Closing cache connections...");
          try {
            // 这里可以添加关闭Redis连接的逻辑
          } catch (error) {
            this.logger.warn("Error closing cache connections", {
              error: error.message,
            });
          }
        },
      });
    }

    // 清理资源 (最低优先级)
    if (needsRegistration.includes("cleanup-resources")) {
      this.registerShutdownHook({
        name: "cleanup-resources",
        priority: 100,
        timeout: 2000,
        execute: async () => {
          this.logger.debug("Cleaning up remaining resources...");
          // 清理临时文件、内存缓存等
        },
      });
    }
  }

  /**
   * 使用超时执行钩子
   */
  private async executeHookWithTimeout(hook: ShutdownHook): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Shutdown hook '${hook.name}' timed out after ${hook.timeout}ms`,
          ),
        );
      }, hook.timeout);
    });

    return Promise.race([hook.execute(), timeoutPromise]);
  }

  /**
   * 设置信号处理器
   */
  private setupSignalHandlers(): void {
    const signals = ["SIGTERM", "SIGINT"] as const;

    signals.forEach((signal) => {
      process.on(signal, async (receivedSignal) => {
        this.logger.log(
          `Received ${receivedSignal} signal, initiating graceful shutdown...`,
        );

        try {
          await this.performGracefulShutdown(receivedSignal);
          this.logger.log("Graceful shutdown completed, exiting...");
          process.exit(0);
        } catch (error) {
          this.logger.error("Graceful shutdown failed, forcing exit...", {
            error: error.message,
          });
          process.exit(1);
        }
      });
    });

    // 处理未捕获的异常
    process.on("uncaughtException", (error) => {
      this.logger.error(
        "Uncaught Exception, initiating emergency shutdown...",
        {
          error: error.message,
          stack: error.stack,
        },
      );

      // 紧急关闭，较短超时
      this.performGracefulShutdown("uncaughtException").finally(() => {
        process.exit(1);
      });
    });

    // 处理未处理的Promise拒绝
    process.on("unhandledRejection", (reason) => {
      this.logger.error(
        "Unhandled Rejection, initiating emergency shutdown...",
        {
          reason: reason instanceof Error ? reason.message : reason,
        },
      );

      // 紧急关闭
      this.performGracefulShutdown("unhandledRejection").finally(() => {
        process.exit(1);
      });
    });
  }

  /**
   * NestJS应用关闭钩子
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    if (!this.isShuttingDown) {
      await this.performGracefulShutdown(signal);
    }
  }

  /**
   * 检查是否正在关闭
   */
  isApplicationShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * 获取注册的关闭钩子信息
   */
  getShutdownHooks(): Array<{
    name: string;
    priority: number;
    timeout: number;
  }> {
    return this.shutdownHooks.map((hook) => ({
      name: hook.name,
      priority: hook.priority,
      timeout: hook.timeout,
    }));
  }
}
