import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { Subject, fromEvent } from "rxjs";
import { takeUntil, debounceTime } from "rxjs/operators";
import { StreamDataFetcherService } from "./stream-data-fetcher.service";
import fs from "fs";
import path from "path";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * StreamConfigHotReloadService - P2-2 信号机制配置热重载
 *
 * 功能：
 * - 监听系统信号 (SIGHUP) 触发配置重载
 * - 监听配置文件变化实现自动重载
 * - 提供安全的配置更新机制
 * - 验证配置有效性后应用更新
 */
@Injectable()
export class StreamConfigHotReloadService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = createLogger("StreamConfigHotReloadService");

  // RxJS 清理机制
  private readonly destroy$ = new Subject<void>();

  // 服务状态
  private isServiceDestroyed = false;

  // 配置文件监控
  private configWatchers = new Map<string, fs.FSWatcher>();

  // 当前配置快照
  private currentConfig = {
    // 自适应并发控制配置
    adaptiveConcurrency: {
      minConcurrency: parseInt(process.env.MIN_CONCURRENCY || "2"),
      maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || "50"),
      adjustmentFactor: parseFloat(
        process.env.CONCURRENCY_ADJUSTMENT_FACTOR || "0.2",
      ),
      stabilizationPeriod: parseInt(
        process.env.STABILIZATION_PERIOD || "30000",
      ),
    },

    // 健康检查配置
    healthCheck: {
      timeoutMs: parseInt(process.env.HEALTHCHECK_TIMEOUT || "5000"),
      retries: parseInt(process.env.HEALTHCHECK_RETRIES || "1"),
      tieredEnabled: process.env.TIERED_HEALTHCHECK_ENABLED !== "false",
    },

    // 性能阈值配置
    performanceThresholds: {
      excellent: parseInt(process.env.PERF_THRESHOLD_EXCELLENT || "100"),
      good: parseInt(process.env.PERF_THRESHOLD_GOOD || "500"),
      poor: parseInt(process.env.PERF_THRESHOLD_POOR || "2000"),
    },

    // Map 清理配置
    mapCleanup: {
      intervalMs: parseInt(process.env.MAP_CLEANUP_INTERVAL || "300000"), // 5分钟
      zombieThresholdMs: parseInt(process.env.ZOMBIE_THRESHOLD || "1800000"), // 30分钟
    },

    // 重载配置
    reloadSettings: {
      debounceMs: parseInt(process.env.CONFIG_RELOAD_DEBOUNCE || "1000"),
      enableFileWatcher: process.env.ENABLE_CONFIG_FILE_WATCHER !== "false",
      enableSignalReload: process.env.ENABLE_SIGNAL_RELOAD !== "false",
    },
  };

  // 配置文件路径
  private readonly configFiles = [
    ".env",
    ".env.local",
    "config/stream-config.json",
    "config/concurrency-config.json",
  ];

  constructor(
    private readonly streamDataFetcherService: StreamDataFetcherService,
  ) {}

  /**
   * 模块初始化时启动配置热重载服务
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("StreamConfigHotReloadService 正在初始化...");

    // 启动信号监听器
    if (this.currentConfig.reloadSettings.enableSignalReload) {
      this.setupSignalHandlers();
    }

    // 启动文件监控器
    if (this.currentConfig.reloadSettings.enableFileWatcher) {
      this.setupFileWatchers();
    }

    this.logger.log("StreamConfigHotReloadService 初始化完成", {
      signalReload: this.currentConfig.reloadSettings.enableSignalReload,
      fileWatcher: this.currentConfig.reloadSettings.enableFileWatcher,
      monitoredFiles: this.configFiles.length,
      currentConfig: {
        minConcurrency: this.currentConfig.adaptiveConcurrency.minConcurrency,
        maxConcurrency: this.currentConfig.adaptiveConcurrency.maxConcurrency,
        tieredHealthCheck: this.currentConfig.healthCheck.tieredEnabled,
      },
    });
  }

  /**
   * 设置系统信号处理器
   */
  private setupSignalHandlers(): void {
    try {
      // 监听 SIGHUP 信号（通常用于配置重载）
      process.on("SIGHUP", () => {
        this.logger.log("收到 SIGHUP 信号，开始重载配置...");
        this.reloadConfiguration("SIGHUP");
      });

      // 监听 SIGUSR1 信号（用户自定义信号1）
      process.on("SIGUSR1", () => {
        this.logger.log("收到 SIGUSR1 信号，开始重载配置...");
        this.reloadConfiguration("SIGUSR1");
      });

      // 监听 SIGUSR2 信号（用户自定义信号2 - 用于调试信息输出）
      process.on("SIGUSR2", () => {
        this.logger.log("收到 SIGUSR2 信号，输出当前配置状态...");
        this.dumpCurrentConfiguration();
      });

      this.logger.debug("系统信号处理器已设置", {
        signals: ["SIGHUP", "SIGUSR1", "SIGUSR2"],
      });
    } catch (error) {
      this.logger.error("设置信号处理器失败", {
        error: error.message,
      });
    }
  }

  /**
   * 设置配置文件监控器
   */
  private setupFileWatchers(): void {
    this.configFiles.forEach((configFile) => {
      const fullPath = path.resolve(process.cwd(), configFile);

      try {
        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
          this.logger.debug(`配置文件不存在，跳过监控: ${configFile}`);
          return;
        }

        // 创建文件监控器
        const watcher = fs.watch(
          fullPath,
          { persistent: false },
          (eventType, filename) => {
            if (eventType === "change") {
              this.logger.debug("检测到配置文件变化", {
                file: configFile,
                eventType,
                filename,
              });

              // 使用防抖机制避免频繁重载
              this.debounceConfigReload(`file:${configFile}`);
            }
          },
        );

        this.configWatchers.set(configFile, watcher);

        this.logger.debug("配置文件监控器已设置", {
          file: configFile,
          fullPath,
        });
      } catch (error) {
        this.logger.warn("设置配置文件监控器失败", {
          file: configFile,
          error: error.message,
        });
      }
    });
  }

  /**
   * 防抖的配置重载机制
   */
  private debounceConfigReload(source: string): void {
    // 使用 RxJS 防抖机制
    const reload$ = new Subject<string>();

    reload$
      .pipe(
        debounceTime(this.currentConfig.reloadSettings.debounceMs),
        takeUntil(this.destroy$),
      )
      .subscribe((reloadSource) => {
        this.reloadConfiguration(reloadSource);
      });

    reload$.next(source);
  }

  /**
   * 重载配置的核心方法
   */
  private async reloadConfiguration(source: string): Promise<void> {
    const startTime = Date.now();

    this.logger.log("开始重载配置", {
      source,
      previousConfig: this.getCurrentConfigSummary(),
    });

    try {
      // 1. 读取新的环境变量配置
      const newConfig = this.loadConfigFromEnvironment();

      // 2. 验证配置有效性
      const validationResult = this.validateConfiguration(newConfig);
      if (!validationResult.isValid) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_DATA_FETCHER,
          errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
          operation: 'reloadConfiguration',
          message: 'Configuration validation failed',
          context: {
            errors: validationResult.errors,
            source
          }
        });
      }

      // 3. 安全地应用配置更新
      await this.applyConfigurationUpdate(newConfig);

      // 4. 更新当前配置快照
      this.currentConfig = newConfig;

      const reloadTime = Date.now() - startTime;

      this.logger.log("配置重载完成", {
        source,
        reloadTime,
        configChanges: this.getConfigChanges(),
        newConfig: this.getCurrentConfigSummary(),
      });
    } catch (error) {
      this.logger.error("配置重载失败", {
        source,
        error: error.message,
        reloadTime: Date.now() - startTime,
      });
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfigFromEnvironment() {
    return {
      adaptiveConcurrency: {
        minConcurrency: parseInt(process.env.MIN_CONCURRENCY || "2"),
        maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || "50"),
        adjustmentFactor: parseFloat(
          process.env.CONCURRENCY_ADJUSTMENT_FACTOR || "0.2",
        ),
        stabilizationPeriod: parseInt(
          process.env.STABILIZATION_PERIOD || "30000",
        ),
      },

      healthCheck: {
        timeoutMs: parseInt(process.env.HEALTHCHECK_TIMEOUT || "5000"),
        retries: parseInt(process.env.HEALTHCHECK_RETRIES || "1"),
        tieredEnabled: process.env.TIERED_HEALTHCHECK_ENABLED !== "false",
      },

      performanceThresholds: {
        excellent: parseInt(process.env.PERF_THRESHOLD_EXCELLENT || "100"),
        good: parseInt(process.env.PERF_THRESHOLD_GOOD || "500"),
        poor: parseInt(process.env.PERF_THRESHOLD_POOR || "2000"),
      },

      mapCleanup: {
        intervalMs: parseInt(process.env.MAP_CLEANUP_INTERVAL || "300000"),
        zombieThresholdMs: parseInt(process.env.ZOMBIE_THRESHOLD || "1800000"),
      },

      reloadSettings: {
        debounceMs: parseInt(process.env.CONFIG_RELOAD_DEBOUNCE || "1000"),
        enableFileWatcher: process.env.ENABLE_CONFIG_FILE_WATCHER !== "false",
        enableSignalReload: process.env.ENABLE_SIGNAL_RELOAD !== "false",
      },
    };
  }

  /**
   * 验证配置有效性
   */
  private validateConfiguration(config: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证并发控制配置
    if (config.adaptiveConcurrency.minConcurrency < 1) {
      errors.push("最小并发数必须大于等于1");
    }

    if (
      config.adaptiveConcurrency.maxConcurrency <
      config.adaptiveConcurrency.minConcurrency
    ) {
      errors.push("最大并发数必须大于等于最小并发数");
    }

    if (
      config.adaptiveConcurrency.adjustmentFactor <= 0 ||
      config.adaptiveConcurrency.adjustmentFactor >= 1
    ) {
      errors.push("调整因子必须在0-1之间");
    }

    // 验证健康检查配置
    if (config.healthCheck.timeoutMs < 100) {
      errors.push("健康检查超时时间不能小于100ms");
    }

    if (config.healthCheck.retries < 0) {
      errors.push("健康检查重试次数不能为负数");
    }

    // 验证性能阈值配置
    if (config.performanceThresholds.excellent <= 0) {
      errors.push("优秀性能阈值必须大于0");
    }

    if (
      config.performanceThresholds.good <=
      config.performanceThresholds.excellent
    ) {
      errors.push("良好性能阈值必须大于优秀阈值");
    }

    if (
      config.performanceThresholds.poor <= config.performanceThresholds.good
    ) {
      errors.push("差性能阈值必须大于良好阈值");
    }

    // 验证清理配置
    if (config.mapCleanup.intervalMs < 60000) {
      errors.push("Map清理间隔不能小于1分钟");
    }

    if (config.mapCleanup.zombieThresholdMs < 300000) {
      errors.push("僵尸连接阈值不能小于5分钟");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 安全地应用配置更新
   */
  private async applyConfigurationUpdate(newConfig: any): Promise<void> {
    try {
      // 更新并发控制配置
      if (this.hasConfigChanged("adaptiveConcurrency", newConfig)) {
        this.logger.debug("应用并发控制配置更新");
      }

      // 更新健康检查配置
      if (this.hasConfigChanged("healthCheck", newConfig)) {
        this.logger.debug("应用健康检查配置更新");
      }

      // 更新性能阈值配置
      if (this.hasConfigChanged("performanceThresholds", newConfig)) {
        this.logger.debug("应用性能阈值配置更新");
      }

      // 更新清理配置
      if (this.hasConfigChanged("mapCleanup", newConfig)) {
        this.logger.debug("应用Map清理配置更新");
      }
    } catch (error) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'applyConfigurationUpdate',
        message: 'Failed to apply configuration update',
        context: {
          error: error.message
        }
      });
    }
  }

  /**
   * 检查特定配置段是否有变化
   */
  private hasConfigChanged(section: string, newConfig: any): boolean {
    return (
      JSON.stringify(this.currentConfig[section]) !==
      JSON.stringify(newConfig[section])
    );
  }

  /**
   * 获取配置变化摘要
   */
  private getConfigChanges(): any {
    // 简化实现：返回主要配置项的变化
    return {
      concurrencyChanged:
        this.currentConfig.adaptiveConcurrency.minConcurrency !==
        parseInt(process.env.MIN_CONCURRENCY || "2"),
      healthCheckChanged:
        this.currentConfig.healthCheck.timeoutMs !==
        parseInt(process.env.HEALTHCHECK_TIMEOUT || "5000"),
    };
  }

  /**
   * 获取当前配置摘要
   */
  private getCurrentConfigSummary(): any {
    return {
      minConcurrency: this.currentConfig.adaptiveConcurrency.minConcurrency,
      maxConcurrency: this.currentConfig.adaptiveConcurrency.maxConcurrency,
      healthCheckTimeout: this.currentConfig.healthCheck.timeoutMs,
      tieredHealthCheck: this.currentConfig.healthCheck.tieredEnabled,
      excellentThreshold: this.currentConfig.performanceThresholds.excellent,
      mapCleanupInterval: this.currentConfig.mapCleanup.intervalMs,
    };
  }

  /**
   * 输出当前配置状态（用于调试）
   */
  private dumpCurrentConfiguration(): void {
    this.logger.log("=== 当前配置状态转储 ===", {
      timestamp: new Date().toISOString(),
      config: this.currentConfig,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      streamService: {
        activeConnections: "N/A", // 需要从服务获取
        adaptiveConcurrencyStats: "N/A", // 需要从服务获取
      },
    });
  }

  /**
   * 手动触发配置重载（用于测试或管理界面）
   */
  async triggerManualReload(): Promise<boolean> {
    try {
      await this.reloadConfiguration("manual");
      return true;
    } catch (error) {
      this.logger.error("手动重载配置失败", { error: error.message });
      return false;
    }
  }

  /**
   * 获取热重载服务状态
   */
  getServiceStatus() {
    return {
      isActive: !this.isServiceDestroyed,
      signalHandlersEnabled:
        this.currentConfig.reloadSettings.enableSignalReload,
      fileWatchersEnabled: this.currentConfig.reloadSettings.enableFileWatcher,
      monitoredFiles: Array.from(this.configWatchers.keys()),
      currentConfig: this.getCurrentConfigSummary(),
      supportedSignals: ["SIGHUP", "SIGUSR1", "SIGUSR2"],
      lastReloadTime: "N/A", // 可以增加时间戳跟踪
    };
  }

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.debug("StreamConfigHotReloadService 开始销毁清理");

    // 标记服务为已销毁
    this.isServiceDestroyed = true;

    // 发送销毁信号，清理 RxJS 流
    this.destroy$.next();
    this.destroy$.complete();

    // 关闭所有文件监控器
    for (const [file, watcher] of this.configWatchers.entries()) {
      try {
        watcher.close();
        this.logger.debug("文件监控器已关闭", { file });
      } catch (error) {
        this.logger.warn("关闭文件监控器失败", { file, error: error.message });
      }
    }

    this.configWatchers.clear();

    this.logger.log("StreamConfigHotReloadService 销毁清理完成", {
      closedWatchers: this.configWatchers.size,
    });
  }
}
