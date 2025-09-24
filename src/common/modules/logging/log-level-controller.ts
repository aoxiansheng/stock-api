import { Injectable, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import {
  LogLevel,
  LogLevelConfig,
  LOG_LEVEL_VALUES,
  UpdateConfig,
  CacheEntry,
  LoggingStats,
} from "./types";

/**
 * 日志级别控制器
 *
 * 核心功能：
 * 1. 管理全局日志级别配置
 * 2. 提供级别检查逻辑
 * 3. 支持配置文件加载和环境变量覆盖
 * 4. 实现缓存机制提升性能
 * 5. 提供动态更新接口
 */
@Injectable()
export class LogLevelController implements OnModuleInit {
  private static instance: LogLevelController | null = null;
  private config: LogLevelConfig | null = null;
  private configFilePath: string | null = null;
  private levelCache = new Map<string, CacheEntry>();
  private stats: LoggingStats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0,
    hitRate: 0,
    averageResponseTime: 0,
    lastResetTime: Date.now(),
    cacheEvictions: 0,
    configurationReloads: 0,
  };
  private lastCacheCleanup = Date.now();

  /**
   * 单例模式获取实例
   */
  static getInstance(): LogLevelController {
    if (!LogLevelController.instance) {
      LogLevelController.instance = new LogLevelController();
    }
    return LogLevelController.instance;
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.loadConfiguration();
      console.log("✅ LogLevelController initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize LogLevelController:", error);
      // 使用默认配置继续运行
      this.config = this.getDefaultConfig();
      console.warn("⚠️ Using default logging configuration");
    }
  }

  /**
   * 检查是否应该记录日志
   *
   * @param context 日志上下文（类名、模块名等）
   * @param level 日志级别
   * @returns 是否应该记录
   */
  shouldLog(context: string, level: LogLevel): boolean {
    if (!this.config) {
      return true; // 配置未加载时允许所有日志
    }

    const startTime = Date.now();
    this.stats.totalQueries++;

    try {
      // 检查缓存
      const cacheKey = `${context}:${level}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached !== null) {
        this.stats.cacheHits++;
        this.updateStats(Date.now() - startTime);
        return cached;
      }

      // 执行级别检查
      const result = this.performLevelCheck(context, level);

      // 缓存结果
      if (this.config.performance.cacheEnabled) {
        this.setCacheResult(cacheKey, result);
      }

      this.stats.cacheMisses++;
      this.updateStats(Date.now() - startTime);

      return result;
    } catch (error) {
      console.error("Error in shouldLog:", error);
      return true; // 出错时允许日志输出，确保不影响业务
    }
  }

  /**
   * 执行级别检查逻辑
   */
  private performLevelCheck(context: string, level: LogLevel): boolean {
    if (!this.config) return true;

    // 1. 检查模块级别配置（最高优先级）
    const moduleLevel = this.config.modules[context];
    if (
      moduleLevel &&
      typeof moduleLevel === "string" &&
      moduleLevel !== "" &&
      !moduleLevel.startsWith("//")
    ) {
      return this.isLevelEnabled(level, moduleLevel as LogLevel);
    }

    // 2. 使用全局级别（第一阶段只实现两级控制）
    return this.isLevelEnabled(level, this.config.global);
  }

  /**
   * 检查级别是否启用
   */
  private isLevelEnabled(
    targetLevel: LogLevel,
    configLevel: LogLevel,
  ): boolean {
    const targetValue = LOG_LEVEL_VALUES[targetLevel];
    const configValue = LOG_LEVEL_VALUES[configLevel];

    if (targetValue === undefined || configValue === undefined) {
      return true; // 未知级别时允许输出
    }

    return targetValue <= configValue;
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(key: string): boolean | null {
    if (!this.config?.performance.cacheEnabled) return null;

    const entry = this.levelCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.config.performance.cacheExpiry) {
      this.levelCache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * 设置缓存结果
   */
  private setCacheResult(key: string, result: boolean): void {
    if (!this.config?.performance.cacheEnabled) return;

    // 清理过期缓存
    this.cleanupExpiredCache();

    // 检查缓存大小限制
    if (this.levelCache.size >= this.config.performance.maxCacheSize) {
      this.evictOldestCache();
    }

    this.levelCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();

    // 每30秒执行一次清理
    if (now - this.lastCacheCleanup < 30000) return;

    this.lastCacheCleanup = now;

    if (!this.config) return;

    for (const [key, entry] of this.levelCache.entries()) {
      if (now - entry.timestamp > this.config.performance.cacheExpiry) {
        this.levelCache.delete(key);
      }
    }
  }

  /**
   * 淘汰最老的缓存条目
   */
  private evictOldestCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.levelCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.levelCache.delete(oldestKey);
      this.stats.cacheEvictions++;
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(responseTime: number): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;

    // 计算移动平均响应时间
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (total - 1) + responseTime) / total;

    // 性能监控：响应时间超过阈值时记录警告
    if (
      this.config?.performance.performanceThreshold &&
      responseTime > this.config.performance.performanceThreshold
    ) {
      this.logPerformanceWarning(responseTime);
    }
  }

  /**
   * 记录性能警告
   */
  private logPerformanceWarning(responseTime: number): void {
    try {
      // 避免创建循环依赖，直接使用console输出性能警告
      // 这里不使用createLogger以免造成无限递归
      console.warn(
        `[LogLevelController] Performance warning: Level check took ${responseTime}ms (threshold: ${this.config?.performance.performanceThreshold}ms)`,
        {
          timestamp: new Date().toISOString(),
          responseTime,
          threshold: this.config?.performance.performanceThreshold,
          totalQueries: this.stats.totalQueries,
          hitRate: this.stats.hitRate,
          averageResponseTime: this.stats.averageResponseTime,
          cacheSize: this.levelCache.size,
        },
      );
    } catch (error) {
      // 静默处理性能警告记录错误，不影响主流程
      console.error(
        "[LogLevelController] Failed to log performance warning:",
        error,
      );
    }
  }

  /**
   * 获取当前配置
   */
  getConfiguration(): LogLevelConfig | null {
    return this.config;
  }

  /**
   * 获取统计信息
   */
  getStats(): LoggingStats {
    return { ...this.stats };
  }

  /**
   * 获取详细的缓存统计信息
   */
  getDetailedStats(): {
    basic: LoggingStats;
    cache: {
      currentSize: number;
      maxSize: number;
      utilizationRate: number;
      averageAge: number;
      oldestEntry: number;
    };
    performance: {
      qps: number; // 每秒查询数
      responseTime: {
        min: number;
        max: number;
        avg: number;
      };
      efficiency: number; // 效率指标
    };
  } {
    const now = Date.now();
    const uptime = (now - this.stats.lastResetTime) / 1000; // 秒

    // 计算缓存详细信息
    let totalAge = 0;
    let oldestTime = now;
    for (const entry of this.levelCache.values()) {
      totalAge += now - entry.timestamp;
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
      }
    }

    const currentSize = this.levelCache.size;
    const maxSize = this.config?.performance.maxCacheSize || 500;
    const averageAge = currentSize > 0 ? totalAge / currentSize : 0;

    return {
      basic: this.getStats(),
      cache: {
        currentSize,
        maxSize,
        utilizationRate: currentSize / maxSize,
        averageAge,
        oldestEntry: now - oldestTime,
      },
      performance: {
        qps: uptime > 0 ? this.stats.totalQueries / uptime : 0,
        responseTime: {
          min: 0, // 这些可以在未来版本中详细实现
          max: 0,
          avg: this.stats.averageResponseTime,
        },
        efficiency: this.stats.hitRate * 100, // 命中率作为效率指标
      },
    };
  }

  /**
   * 获取缓存健康状态
   */
  getCacheHealth(): {
    status: "excellent" | "good" | "warning" | "critical";
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getDetailedStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: "excellent" | "good" | "warning" | "critical" = "excellent";

    // 检查命中率
    if (stats.basic.hitRate < 0.5) {
      issues.push(`缓存命中率过低: ${(stats.basic.hitRate * 100).toFixed(1)}%`);
      recommendations.push("考虑增加TTL时间或检查日志调用模式");
      status = "critical";
    } else if (stats.basic.hitRate < 0.7) {
      issues.push(`缓存命中率较低: ${(stats.basic.hitRate * 100).toFixed(1)}%`);
      recommendations.push("检查是否存在过多的随机context名称");
      status = status === "excellent" ? "warning" : status;
    }

    // 检查缓存利用率
    if (stats.cache.utilizationRate > 0.9) {
      issues.push(
        `缓存使用率过高: ${(stats.cache.utilizationRate * 100).toFixed(1)}%`,
      );
      recommendations.push("考虑增加maxCacheSize配置");
      status = status === "excellent" ? "warning" : status;
    }

    // 检查淘汰频率
    const evictionRate =
      stats.basic.totalQueries > 0
        ? stats.basic.cacheEvictions / stats.basic.totalQueries
        : 0;
    if (evictionRate > 0.1) {
      issues.push(`缓存淘汰频率过高: ${(evictionRate * 100).toFixed(2)}%`);
      recommendations.push("缓存容量不足，频繁淘汰影响性能");
      status = "critical";
    }

    // 如果没有问题，根据命中率确定状态
    if (issues.length === 0) {
      if (stats.basic.hitRate > 0.9) {
        status = "excellent";
      } else if (stats.basic.hitRate > 0.8) {
        status = "good";
      }
    }

    return { status, issues, recommendations };
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): LogLevelConfig {
    return {
      version: "1.0.0",
      description: "Default logging configuration",
      global: "info",
      modules: {},
      features: {
        enhancedLoggingEnabled: false,
        levelCacheEnabled: true,
        structuredLogging: true,
        performanceMode: false,
        dynamicUpdateEnabled: false,
      },
      performance: {
        cacheEnabled: true,
        cacheExpiry: 5000,
        maxCacheSize: 500,
        performanceThreshold: 5,
      },
      output: {
        colorEnabled: false,
        timestampEnabled: true,
        contextEnabled: true,
        stackTraceEnabled: true,
      },
    };
  }

  /**
   * 重置控制器（用于测试）
   */
  reset(): void {
    this.config = null;
    this.configFilePath = null;
    this.levelCache.clear();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0,
      hitRate: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now(),
      cacheEvictions: 0,
      configurationReloads: 0,
    };
    this.lastCacheCleanup = Date.now();
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0,
      hitRate: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now(),
      cacheEvictions: 0,
      configurationReloads: 0,
    };
  }

  /**
   * 加载配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      // 记录配置重载
      if (this.config !== null) {
        this.stats.configurationReloads++;
      }

      // 1. 加载默认配置
      const defaultConfig = this.getDefaultConfig();

      // 2. 尝试加载配置文件
      const fileConfig = this.loadFromConfigFile();

      // 3. 加载环境变量覆盖
      const envOverrides = this.loadEnvironmentOverrides();

      // 4. 合并配置
      this.config = this.mergeConfigurations(
        defaultConfig,
        fileConfig,
        envOverrides,
      );

      // 5. 验证配置
      this.validateConfiguration();

      console.log("✅ Log configuration loaded successfully");
      if (this.configFilePath) {
        console.log(`📁 Config file: ${this.configFilePath}`);
      }
    } catch (error) {
      console.error("❌ Failed to load log configuration:", error);
      throw error;
    }
  }

  /**
   * 从配置文件加载
   */
  private loadFromConfigFile(): Partial<LogLevelConfig> | null {
    const configPaths = [
      process.env.LOG_CONFIG_PATH,
      // 优先搜索日志组件内部配置目录
      path.join(__dirname, "config", "log-levels.json"),
      path.join(
        __dirname,
        "config",
        `log-levels.${process.env.NODE_ENV || "development"}.json`,
      ),
      // 兼容旧的全局配置路径（向后兼容）
      path.join(process.cwd(), "config", "log-levels.json"),
      path.join(process.cwd(), "log-levels.json"),
      path.join(
        process.cwd(),
        `log-levels.${process.env.NODE_ENV || "development"}.json`,
      ),
    ].filter(Boolean) as string[];

    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, "utf-8");
          const config = JSON.parse(content);

          this.configFilePath = configPath;
          console.log(`📖 Loaded config from: ${configPath}`);

          return this.parseFileConfig(config);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load config from ${configPath}:`, error);
        continue;
      }
    }

    console.log(
      "📄 No config file found, using defaults with environment overrides",
    );
    return null;
  }

  /**
   * 解析配置文件
   */
  private parseFileConfig(config: any): Partial<LogLevelConfig> {
    // 基础验证
    if (!config || typeof config !== "object") {
      throw new Error("Invalid config format");
    }

    // 清理注释行和空字符串
    if (config.modules && typeof config.modules === "object") {
      const cleanedModules: Record<string, LogLevel> = {};
      for (const [key, value] of Object.entries(config.modules)) {
        if (
          typeof value === "string" &&
          value !== "" &&
          !value.startsWith("//") &&
          !key.startsWith("//")
        ) {
          cleanedModules[key] = value as LogLevel;
        }
      }
      config.modules = cleanedModules;
    }

    return config;
  }

  /**
   * 加载环境变量覆盖
   */
  private loadEnvironmentOverrides(): Partial<LogLevelConfig> {
    const overrides: Partial<LogLevelConfig> = {};

    // 全局级别覆盖
    if (process.env.LOG_LEVEL) {
      const level = process.env.LOG_LEVEL.toLowerCase() as LogLevel;
      if (LOG_LEVEL_VALUES[level] !== undefined) {
        overrides.global = level;
        console.log(`🔧 Environment override: global level = ${level}`);
      }
    }

    // 模块级别覆盖
    if (process.env.LOG_DEBUG_MODULE) {
      const modules = process.env.LOG_DEBUG_MODULE.split(",");
      overrides.modules = {};
      for (const module of modules) {
        const trimmed = module.trim();
        if (trimmed) {
          overrides.modules[trimmed] = "debug";
          console.log(`🔧 Environment override: ${trimmed} = debug`);
        }
      }
    }

    // 功能开关覆盖
    if (process.env.ENHANCED_LOGGING_ENABLED !== undefined) {
      overrides.features = {
        ...overrides.features,
        enhancedLoggingEnabled: process.env.ENHANCED_LOGGING_ENABLED === "true",
      };
    }

    if (process.env.LOG_LEVEL_CACHE_ENABLED !== undefined) {
      overrides.features = {
        ...overrides.features,
        levelCacheEnabled: process.env.LOG_LEVEL_CACHE_ENABLED === "true",
      };
    }

    return overrides;
  }

  /**
   * 合并配置
   */
  private mergeConfigurations(
    defaultConfig: LogLevelConfig,
    fileConfig: Partial<LogLevelConfig> | null,
    envOverrides: Partial<LogLevelConfig>,
  ): LogLevelConfig {
    let merged = { ...defaultConfig };

    // 合并配置文件（优先级高于默认配置）
    if (fileConfig) {
      merged = this.deepMerge(merged, fileConfig);
    }

    // 合并环境变量（优先级最低，仅用于临时覆盖）
    if (envOverrides) {
      merged = this.deepMerge(merged, envOverrides);
    }

    return merged;
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined && source[key] !== null) {
        if (
          typeof source[key] === "object" &&
          !Array.isArray(source[key]) &&
          typeof target[key] === "object" &&
          !Array.isArray(target[key])
        ) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 验证配置
   */
  private validateConfiguration(): void {
    if (!this.config) {
      throw new Error("Configuration is null");
    }

    // 验证全局级别
    if (
      !this.config.global ||
      LOG_LEVEL_VALUES[this.config.global] === undefined
    ) {
      console.warn(
        `⚠️ Invalid global log level: ${this.config.global}, using 'info'`,
      );
      this.config.global = "info";
    }

    // 验证模块级别
    if (this.config.modules) {
      for (const [module, level] of Object.entries(this.config.modules)) {
        if (
          typeof level === "string" &&
          LOG_LEVEL_VALUES[level as LogLevel] === undefined
        ) {
          console.warn(
            `⚠️ Invalid log level for module ${module}: ${level}, removing`,
          );
          delete this.config.modules[module];
        }
      }
    }

    // 验证性能配置
    if (this.config.performance) {
      const perf = this.config.performance;
      if (perf.cacheExpiry < 0 || perf.cacheExpiry > 60000) {
        console.warn(`⚠️ Invalid cacheExpiry: ${perf.cacheExpiry}, using 5000`);
        perf.cacheExpiry = 5000;
      }
      if (perf.maxCacheSize < 1 || perf.maxCacheSize > 10000) {
        console.warn(
          `⚠️ Invalid maxCacheSize: ${perf.maxCacheSize}, using 500`,
        );
        perf.maxCacheSize = 500;
      }
    }
  }

  /**
   * 动态更新日志级别（将在后续实现）
   */
  updateLogLevel(
    target: string,
    level: LogLevel,
    type: "module" | "global",
  ): void {
    // TODO: 在后续任务中实现
    console.log(`📝 Dynamic update requested: ${type}=${target}:${level}`);
  }

  /**
   * 热路径优化分析
   */
  analyzeHotPaths(): {
    hotPaths: string[];
    optimizationSuggestions: string[];
    performanceMetrics: {
      slowQueries: number;
      averageResponseTime: number;
      hitRate: number;
      cacheEffectiveness: string;
    };
  } {
    const slowQueries = this.getSlowQueriesCount();
    const suggestions: string[] = [];

    // 分析缓存命中率
    if (this.stats.hitRate < 0.8) {
      suggestions.push("缓存命中率偏低，考虑增加缓存过期时间或预热常用查询");
    }

    // 分析平均响应时间
    if (this.stats.averageResponseTime > 1.0) {
      suggestions.push("平均响应时间较高，建议检查配置文件大小和复杂度");
    }

    // 分析缓存大小
    if (
      this.levelCache.size >
      (this.config?.performance.maxCacheSize || 500) * 0.9
    ) {
      suggestions.push(
        "缓存使用率接近上限，考虑增加maxCacheSize或优化缓存策略",
      );
    }

    // 分析慢查询频率
    const slowQueryRate = slowQueries / Math.max(this.stats.totalQueries, 1);
    if (slowQueryRate > 0.01) {
      // 1%的慢查询率
      suggestions.push(
        `慢查询占比${(slowQueryRate * 100).toFixed(2)}%，建议进行性能优化`,
      );
    }

    return {
      hotPaths: this.identifyHotPaths(),
      optimizationSuggestions: suggestions,
      performanceMetrics: {
        slowQueries,
        averageResponseTime: this.stats.averageResponseTime,
        hitRate: this.stats.hitRate,
        cacheEffectiveness: this.getCacheEffectivenessLevel(),
      },
    };
  }

  /**
   * 识别热路径（频繁查询的上下文）
   */
  private identifyHotPaths(): string[] {
    // 由于我们目前没有跟踪每个context的查询频率，
    // 这里返回配置中最可能成为热路径的服务
    const hotPathCandidates = [
      "CacheService",
      "AuthService",
      "DataFetcherService",
      "QueryService",
      "ReceiverService",
      "SmartCacheStandardizedService",
    ];

    return hotPathCandidates.filter(
      (context) => this.config?.modules[context] !== undefined,
    );
  }

  /**
   * 获取慢查询计数
   */
  private getSlowQueriesCount(): number {
    // 由于我们目前没有跟踪单独的慢查询统计，
    // 这里基于平均响应时间和阈值进行估算
    const threshold = this.config?.performance.performanceThreshold || 5;
    if (this.stats.averageResponseTime > threshold) {
      // 估算慢查询数量：如果平均响应时间超过阈值，
      // 假设有一定比例的查询是慢查询
      return Math.floor(this.stats.totalQueries * 0.1);
    }
    return 0;
  }

  /**
   * 获取缓存有效性级别
   */
  private getCacheEffectivenessLevel(): string {
    if (this.stats.hitRate >= 0.95) return "excellent";
    if (this.stats.hitRate >= 0.85) return "good";
    if (this.stats.hitRate >= 0.7) return "fair";
    return "poor";
  }

  /**
   * 执行性能优化
   */
  optimizePerformance(): {
    optimizationsApplied: string[];
    beforeMetrics: any;
    afterMetrics: any;
  } {
    const beforeMetrics = {
      hitRate: this.stats.hitRate,
      averageResponseTime: this.stats.averageResponseTime,
      cacheSize: this.levelCache.size,
    };

    const optimizations: string[] = [];

    try {
      // 1. 清理过期缓存
      const beforeCacheSize = this.levelCache.size;
      this.cleanupExpiredCache();
      if (this.levelCache.size < beforeCacheSize) {
        optimizations.push(
          `清理了${beforeCacheSize - this.levelCache.size}个过期缓存条目`,
        );
      }

      // 2. 如果缓存命中率低，预热常用查询
      if (this.stats.hitRate < 0.8) {
        this.preheatCache();
        optimizations.push("执行了缓存预热操作");
      }

      // 3. 重置统计信息以获得新的基线
      if (this.stats.totalQueries > 10000) {
        this.resetStats();
        optimizations.push("重置了统计信息以建立新的性能基线");
      }

      console.log(
        `🔧 [LogLevelController] Applied ${optimizations.length} performance optimizations`,
      );
    } catch (error) {
      console.error(
        "❌ [LogLevelController] Performance optimization failed:",
        error,
      );
      optimizations.push("优化过程中发生错误，请检查日志");
    }

    const afterMetrics = {
      hitRate: this.stats.hitRate,
      averageResponseTime: this.stats.averageResponseTime,
      cacheSize: this.levelCache.size,
    };

    return {
      optimizationsApplied: optimizations,
      beforeMetrics,
      afterMetrics,
    };
  }

  /**
   * 预热缓存
   */
  private preheatCache(): void {
    if (!this.config) return;

    // 预热最常见的日志级别组合
    const commonLevels: LogLevel[] = ["error", "warn", "info"];
    const hotServices = this.identifyHotPaths();

    hotServices.forEach((context) => {
      commonLevels.forEach((level) => {
        const cacheKey = `${context}:${level}`;
        if (!this.levelCache.has(cacheKey)) {
          const result = this.performLevelCheck(context, level);
          this.setCacheResult(cacheKey, result);
        }
      });
    });
  }

  /**
   * 批量更新配置（将在后续实现）
   */
  batchUpdate(updates: UpdateConfig[]): void {
    // TODO: 在后续任务中实现
    console.log(`📝 Batch update requested: ${updates.length} updates`);
  }
}
