import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { createLogger } from "@common/logging/index";

/**
 * LifecycleService - 应用生命周期管理服务
 *
 * 职责：
 * - 管理应用生命周期事件
 * - 注册关闭钩子
 * - 处理优雅关闭
 */
@Injectable()
export class LifecycleService implements OnApplicationShutdown {
  private readonly logger = createLogger(LifecycleService.name);
  private shutdownCallbacks: Array<() => Promise<void>> = [];

  /**
   * 注册关闭钩子
   */
  async registerShutdownHooks(): Promise<void> {
    this.logger.log("注册应用关闭钩子...");

    // 监听进程信号
    process.on("SIGTERM", () => this.handleShutdown("SIGTERM"));
    process.on("SIGINT", () => this.handleShutdown("SIGINT"));

    this.logger.log("关闭钩子注册完成");
  }

  /**
   * 添加关闭回调
   */
  addShutdownCallback(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * 处理应用关闭
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`应用关闭中... Signal: ${signal}`);

    // 执行所有关闭回调
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        this.logger.error("执行关闭回调失败:", error);
      }
    }

    this.logger.log("应用关闭完成");
  }

  /**
   * 处理关闭信号
   */
  private async handleShutdown(signal: string): Promise<void> {
    this.logger.log(`收到关闭信号: ${signal}`);
    await this.onApplicationShutdown(signal);
    process.exit(0);
  }
}
