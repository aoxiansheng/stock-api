import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Config, QuoteContext } from "longport"; // REFERENCE_DATA.PROVIDER_IDS.LONGPORT

import { createLogger } from "@app/config/logger.config";
import { REFERENCE_DATA } from '@common/constants/domain';

/**
 * LongPort 上下文服务 - 单例模式管理 SDK 连接
 */
@Injectable()
export class LongportSgContextService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(LongportSgContextService.name);
  private quoteContext: QuoteContext | null = null;
  private initializationPromise: Promise<void> | null = null;

  async onModuleInit() {
    // 模块初始化时触发，但不阻塞启动流程
    this.initialize().catch((error) => {
      this.logger.warn(
        {
          error: error.message,
        },
        "启动时 LongPort SDK 异步初始化失败，将在首次使用时重试",
      );
    });
  }

  async onModuleDestroy() {
    await this.close();
  }

  private initialize(): Promise<void> {
    if (this.quoteContext) {
      return Promise.resolve();
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.logger.log("开始初始化 LongPort SDK 连接...");
        const config = Config.fromEnv();
        this.quoteContext = await QuoteContext.new(config);
        this.logger.log("LongPort SDK 连接初始化成功");
      } catch (error) {
        // 添加防御性检查，确保错误对象存在
        const errorStack = error?.stack || "未知错误";
        const errorMessage = error?.message || "未知错误";

        this.logger.error(
          {
            error: errorStack,
          },
          "LongPort SDK 连接初始化失败",
        );
        this.initializationPromise = null; // 允许下次调用时重试
        throw new Error(`LongPort SDK 连接初始化失败: ${errorMessage}`);
      }
    })();

    return this.initializationPromise;
  }

  async getQuoteContext(): Promise<QuoteContext> {
    await this.initialize();

    if (!this.quoteContext) {
      this.logger.error(
        "获取 LongPort QuoteContext 失败，因初始化后实例仍为空",
      );
    }

    return this.quoteContext;
  }

  async close(): Promise<void> {
    if (this.quoteContext) {
      this.logger.log("正在关闭 LongPort SDK 连接...");
      try {
        // 检查close方法是否存在，LongPort SDK可能使用不同的方法名
        const context = this.quoteContext as any;
        if (typeof context.close === "function") {
          await context.close();
        } else if (typeof context.disconnect === "function") {
          await context.disconnect();
        } else if (typeof context.destroy === "function") {
          await context.destroy();
        } else {
          // 如果没有明确的关闭方法，仅清空引用
          this.logger.log("LongPort SDK 未提供关闭方法，仅清空连接引用");
        }
        this.quoteContext = null;
        this.initializationPromise = null;
        this.logger.log("LongPort SDK 连接已成功关闭");
      } catch (error) {
        this.logger.error(
          { error: error?.stack || "未知错误" },
          "关闭 LongPort SDK 连接时发生错误",
        );
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger.log("正在测试 LongPort SDK 连接...");
      const ctx = await this.getQuoteContext();
      // 使用一个不可能的 symbol 来测试API调用路径，而不是依赖特定股票
      await ctx.quote(["HEALTHCHECK.TEST"]);
      this.logger.log("LongPort 连接测试成功");
      return true;
    } catch (error) {
      // 防御性检查错误对象
      const errorStack = error?.stack || "未知错误";
      const errorMessage = String(error?.message || "");

      // 某些错误（例如代码101004：找不到标的）表明连接本身是通的
      if (errorMessage.includes("101004")) {
        this.logger.log(
          "LongPort 连接测试成功（API返回标的未找到，但连接正常）",
        );
        return true;
      }
      this.logger.error({ error: errorStack }, "LongPort 连接测试失败");
      return false;
    }
  }
}
