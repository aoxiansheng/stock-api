import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { createLogger } from "@appcore/config/logger.config";

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

/**
 * ShutdownService - 优雅关闭服务
 * 
 * 职责：
 * - 管理应用关闭钩子
 * - 执行优雅关闭流程
 * - 处理关闭超时
 */
@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  private readonly logger = createLogger(ShutdownService.name);
  private readonly shutdownHooks: ShutdownHook[] = [];
  private isShuttingDown = false;
  private shutdownPromise: Promise<ShutdownResult> | null = null;

  /**
   * 注册关闭钩子
   */
  registerShutdownHook(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
    // 按优先级排序
    this.shutdownHooks.sort((a, b) => a.priority - b.priority);
    this.logger.debug(`注册关闭钩子: ${hook.name}, 优先级: ${hook.priority}`);
  }

  /**
   * 应用关闭处理
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      await this.shutdownPromise;
      return;
    }

    this.isShuttingDown = true;
    this.logger.log(`收到关闭信号: ${signal || 'unknown'}`);

    this.shutdownPromise = this.executeShutdownHooks(signal);
    await this.shutdownPromise;
  }

  /**
   * 执行关闭钩子
   */
  private async executeShutdownHooks(signal?: string): Promise<ShutdownResult> {
    const startTime = Date.now();
    const results: ShutdownResult['hooks'] = [];

    this.logger.log(`开始执行关闭钩子，共 ${this.shutdownHooks.length} 个`);

    for (const hook of this.shutdownHooks) {
      const hookStartTime = Date.now();
      try {
        await this.executeHookWithTimeout(hook);
        results.push({
          name: hook.name,
          success: true,
          duration: Date.now() - hookStartTime,
        });
        this.logger.log(`关闭钩子执行成功: ${hook.name}`);
      } catch (error) {
        results.push({
          name: hook.name,
          success: false,
          duration: Date.now() - hookStartTime,
          error: error.message,
        });
        this.logger.error(`关闭钩子执行失败: ${hook.name}`, error);
      }
    }

    const totalDuration = Date.now() - startTime;
    const success = results.every(result => result.success);

    this.logger.log(`关闭流程完成，总耗时: ${totalDuration}ms，成功: ${success}`);

    return {
      success,
      hooks: results,
      totalDuration,
      signal,
    };
  }

  /**
   * 执行带超时的钩子
   */
  private async executeHookWithTimeout(hook: ShutdownHook): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`关闭钩子超时: ${hook.name} (${hook.timeout}ms)`));
      }, hook.timeout);

      hook.execute()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}