import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LRUCache } from "lru-cache";
import crypto from "crypto";
import { EventEmitter } from 'events';
import { FeatureFlags } from "@config/feature-flags.config";
import { CacheUnifiedConfigValidation } from "../../../../cache/config/cache-unified.config";
import { SymbolMappingRepository } from "../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository";
import { SymbolMappingRule } from "../../../00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { createLogger } from "@common/logging/index";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";
import {
  BatchMappingResult,
  RedisCacheRuntimeStatsDto,
} from "../interfaces/cache-stats.interface";
import {
  CACHE_CLEANUP,
  MEMORY_MONITORING,
  MappingDirection,
} from "../constants/cache.constants";
import { CACHE_EVENTS, CacheEventType, CacheHitEvent, CacheMissEvent, CacheOperationStartEvent, CacheOperationCompleteEvent, CacheOperationErrorEvent, CacheDisabledEvent } from '../interfaces/cache-events.interface';

/**
 * Symbol Mapper 统一缓存服务
 * 优化批量查询缓存和实现双向映射的核心组件
 *
 * 🎯 三层缓存架构:
 * - L1: 规则缓存 (Provider Rules Cache) - 提供商映射规则
 * - L2: 符号映射缓存 (Symbol Mapping Cache) - 单符号双向映射
 * - L3: 批量结果缓存 (Batch Result Cache) - 批量查询结果
 */
@Injectable()
export class SymbolMapperCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(SymbolMapperCacheService.name);

  // 🎯 三层缓存架构
  private providerRulesCache: LRUCache<string, SymbolMappingRule[]>; // L1: 规则缓存
  private symbolMappingCache: LRUCache<string, string>; // L2: 符号映射缓存
  private batchResultCache: LRUCache<string, BatchMappingResult>; // L3: 批量结果缓存

  // 🔒 并发控制
  private readonly pendingQueries: Map<string, Promise<any>>;

  // 📡 事件发射器 - 内部事件通信
  private readonly cacheEventEmitter = new EventEmitter();

  // 📡 变更监听
  private changeStream: any; // Change Stream 实例
  private reconnectAttempts: number = 0; // 重连尝试次数
  private readonly maxReconnectDelay: number = 30000; // 最大重连延迟 30秒
  private isMonitoringActive: boolean = false; // 监控器激活状态

  // 💾 内存监控
  private memoryCheckTimer: NodeJS.Timeout | null = null; // 内存检查定时器
  private lastMemoryCleanup: Date = new Date(); // 上次清理时间


  constructor(
    private readonly repository: SymbolMappingRepository,
    private readonly featureFlags: FeatureFlags,
    private readonly configService: ConfigService,
  ) {
    this.initializeCaches();
    this.pendingQueries = new Map();
  }

  /**
   * 事件监听器注册方法
   */
  onCacheEvent(event: CacheEventType, listener: (...args: any[]) => void): void {
    this.cacheEventEmitter.on(event, listener);
  }

  /**
   * 事件监听器移除方法
   */
  offCacheEvent(event: CacheEventType, listener: (...args: any[]) => void): void {
    this.cacheEventEmitter.off(event, listener);
  }

  /**
   * 🚀 模块初始化 - 启动变更监听和内存监控
   */
  async onModuleInit(): Promise<void> {
    // 仅在模块初始化时注册一次，避免重复监听
    this.setupChangeStreamMonitoring();

    // 启动内存水位监控
    this.startMemoryMonitoring();

    this.logger.log(
      "SymbolMapperCacheService initialized with change stream and memory monitoring",
    );
  }

  /**
   * 📊 模块销毁 - 清理资源
   */
  async onModuleDestroy(): Promise<void> {
    // 关闭 Change Stream
    if (this.changeStream) {
      try {
        await this.changeStream.close();
        this.logger.log("Change Stream 已关闭");
      } catch (error) {
        // Use unified error handling for Change Stream closure failures
        this.logger.error("关闭 Change Stream 失败", {
          error: error.message,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE
        });
        // Don't throw during module destruction - just log the error
      }
    }

    // 停止内存监控
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
      this.logger.log("Memory monitoring stopped");
    }

    // 重置监控状态
    this.isMonitoringActive = false;
    this.reconnectAttempts = 0;

    // 清理缓存
    this.providerRulesCache.clear();
    this.symbolMappingCache.clear();
    this.batchResultCache.clear();

    // 清理待处理查询
    this.pendingQueries.clear();

    this.logger.log(
      "SymbolMapperCacheService destroyed and resources cleaned up",
    );
  }


  /**
   * 🎯 缓存初始化：从FeatureFlags读取现有字段，L3使用新增字段
   */
  private initializeCaches(): void {
    // 从 FeatureFlags 读取缓存配置
    const l1Config = {
      max: this.featureFlags.ruleCacheMaxSize,
      ttl: this.featureFlags.ruleCacheTtl,
    };

    const l2Config = {
      max: this.featureFlags.symbolCacheMaxSize,
      ttl: this.featureFlags.symbolCacheTtl,
    };

    // L3配置：使用新增的 FeatureFlags 字段
    const l3Config = {
      max: this.featureFlags.batchResultCacheMaxSize,
      ttl: this.featureFlags.batchResultCacheTtl,
    };

    // L1: 规则缓存 - 规则很少变动，长期缓存
    this.providerRulesCache = new LRUCache({
      max: l1Config.max,
      ttl: l1Config.ttl,
      updateAgeOnGet: false, // 不更新访问时间，保持TTL
    });

    // L2: 符号映射缓存 - 符号映射相对稳定
    this.symbolMappingCache = new LRUCache({
      max: l2Config.max,
      ttl: l2Config.ttl,
      updateAgeOnGet: true, // 热门符号延长生命周期
    });

    // L3: 批量结果缓存 - 批量查询结果
    this.batchResultCache = new LRUCache({
      max: l3Config.max,
      ttl: l3Config.ttl,
      updateAgeOnGet: true,
    });

    this.logger.log("Caches initialized with FeatureFlags config", {
      l1Rules: l1Config,
      l2Symbols: l2Config,
      l3Batches: l3Config,
    });
  }

  /**
   * 🎯 统一入口：支持单个和批量查询
   * 替换现有的 mapSymbol 和 mapSymbols 方法
   */
  async mapSymbols(
    provider: string,
    symbols: string | string[],
    direction: MappingDirection,
    requestId?: string,
  ): Promise<BatchMappingResult> {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const isBatch = symbolArray.length > 1;
    const startTime = Date.now();

    // ✅ 发射操作开始事件 (替代 this.cacheStats.totalQueries++)
    this.cacheEventEmitter.emit(CACHE_EVENTS.OPERATION_START, {
      provider,
      symbolCount: symbolArray.length,
      direction,
      timestamp: startTime,
      isBatch,
    } as CacheOperationStartEvent);

    // 🛡️ 服务内开关兜底：即使外层已检查，这里再次确认缓存是否启用
    if (!this.featureFlags.symbolMappingCacheEnabled) {
      this.logger.warn(
        "Symbol mapping cache is disabled, bypassing cache logic",
        {
          provider,
          symbolsCount: symbolArray.length,
          direction,
        },
      );

      // ✅ 发射缓存禁用事件 (替代 this.recordCacheDisabled())
      this.cacheEventEmitter.emit(CACHE_EVENTS.DISABLED, {
        reason: "feature_flag_disabled",
        provider,
        timestamp: Date.now(),
      } as CacheDisabledEvent);

      // 直接执行数据库查询，不使用任何缓存
      const results = await this.executeUncachedQuery(
        provider,
        symbolArray,
        direction,
      );

      // 构建符合接口的返回结构
      return this.buildDirectQueryResult(
        symbolArray,
        results,
        provider,
        direction,
        startTime,
      );
    }

    try {
      // 🎯 Level 3: 批量结果缓存检查
      if (isBatch) {
        const batchKey = this.getBatchCacheKey(
          provider,
          symbolArray,
          direction,
        );
        const batchCached = this.batchResultCache.get(batchKey);
        if (batchCached) {
          // ✅ 发射L3命中事件 (替代 this.recordCacheMetrics("l3", true))
          this.cacheEventEmitter.emit(CACHE_EVENTS.HIT, {
            layer: 'l3',
            provider,
            timestamp: Date.now(),
          } as CacheHitEvent);

          return this.cloneResult(batchCached);
        }

        // ✅ 发射L3未命中事件 (替代 this.recordCacheMetrics("l3", false))
        this.cacheEventEmitter.emit(CACHE_EVENTS.MISS, {
          layer: 'l3',
          provider,
          timestamp: Date.now(),
        } as CacheMissEvent);
      }

      // 🎯 Level 2: 单符号缓存检查
      const cacheHits = new Map<string, string>();
      const uncachedSymbols = [];

      for (const symbol of symbolArray) {
        const symbolKey = this.getSymbolCacheKey(provider, symbol, direction);
        const cached = this.symbolMappingCache.get(symbolKey);
        if (cached) {
          cacheHits.set(symbol, cached);
          // ✅ 发射L2命中事件 (替代 this.recordCacheMetrics("l2", true))
          this.cacheEventEmitter.emit(CACHE_EVENTS.HIT, {
            layer: 'l2',
            provider,
            symbol,
            timestamp: Date.now(),
          } as CacheHitEvent);
        } else {
          uncachedSymbols.push(symbol);
          // ✅ 发射L2未命中事件 (替代 this.recordCacheMetrics("l2", false))
          this.cacheEventEmitter.emit(CACHE_EVENTS.MISS, {
            layer: 'l2',
            provider,
            symbol,
            timestamp: Date.now(),
          } as CacheMissEvent);
        }
      }

      // 🎯 Level 1: 规则缓存 + 数据库查询
      let uncachedResults = {};
      if (uncachedSymbols.length > 0) {
        // 并发控制：使用与批量缓存完全相同的键规范（包括MD5）
        const queryKey = this.getPendingQueryKey(
          provider,
          uncachedSymbols,
          direction,
        );

        if (this.pendingQueries.has(queryKey)) {
          uncachedResults = await this.pendingQueries.get(queryKey);
        } else {
          // 创建带超时保护的查询Promise
          const queryPromise = this.createTimeoutProtectedQuery(
            provider,
            uncachedSymbols,
            direction,
            queryKey,
          );
          this.pendingQueries.set(queryKey, queryPromise);

          try {
            uncachedResults = await queryPromise;
            // 🔄 批量结果回填单符号缓存（双向写入）
            this.backfillSingleSymbolCache(
              provider,
              uncachedResults,
              direction,
            );
          } catch (error) {
            // Use unified error handling for database query failures
            throw UniversalExceptionFactory.createFromError(
              error as Error,
              'batchMapSymbols',
              ComponentIdentifier.SYMBOL_MAPPER_CACHE,
              { queryKey, provider, symbolCount: symbolArray.length, direction }
            );
          } finally {
            this.pendingQueries.delete(queryKey);
          }
        }
      }

      // 🎯 合并所有结果
      const finalResult = this.mergeResults(
        cacheHits,
        uncachedResults,
        symbolArray,
        provider,
        direction,
        startTime,
      );

      // 🎯 存储批量结果缓存 - 结构校验后存储
      if (isBatch && uncachedSymbols.length > 0) {
        const batchKey = this.getBatchCacheKey(
          provider,
          symbolArray,
          direction,
        );

        // 重要：结构校验并补齐L3精准失效所需字段
        const validatedResult = this.validateAndFixBatchResult(finalResult);

        this.batchResultCache.set(batchKey, validatedResult);

        this.logger.debug("Batch result cached with validated structure", {
          batchKey,
          mappingDetailsCount: Object.keys(validatedResult.mappingDetails)
            .length,
          failedSymbolsCount: validatedResult.failedSymbols.length,
        });
      }

      // ✅ 发射操作完成事件 (替代 this.recordPerformanceMetrics())
      this.cacheEventEmitter.emit(CACHE_EVENTS.OPERATION_COMPLETE, {
        provider,
        symbolCount: symbolArray.length,
        cacheHits: cacheHits.size,
        processingTime: Date.now() - startTime,
        direction,
        success: true,
      } as CacheOperationCompleteEvent);

      return finalResult;
    } catch (error) {
      // ✅ 发射错误事件
      this.cacheEventEmitter.emit(CACHE_EVENTS.OPERATION_ERROR, {
        provider,
        error: error.message,
        processingTime: Date.now() - startTime,
        operation: 'mapSymbols',
        symbolCount: symbolArray.length,
      } as CacheOperationErrorEvent);

      // Use unified error handling for symbol mapping failures
      throw UniversalExceptionFactory.createFromError(
        error as Error,
        'batchMapSymbols',
        ComponentIdentifier.SYMBOL_MAPPER_CACHE,
        {
          provider,
          symbolsCount: symbolArray.length,
          direction,
          requestId,
          operation: 'symbol_mapping'
        }
      );
    }
  }



  /**
   * 🧹 清理所有缓存层 - 统一清理入口
   */
  clearAllCaches(): void {
    this.providerRulesCache.clear(); // L1: 规则缓存
    this.symbolMappingCache.clear(); // L2: 符号映射缓存
    this.batchResultCache.clear(); // L3: 批量结果缓存
    this.pendingQueries.clear(); // 清理待处理查询

    this.logger.log("All caches cleared (L1/L2/L3)");
  }

  // =============================================================================
  // 🔧 私有辅助方法区域 - 将在下一个里程碑中实现
  // =============================================================================

  /**
   * 🔄 深拷贝结果，避免调用方修改影响缓存
   */
  private cloneResult(result: BatchMappingResult): BatchMappingResult {
    // 深拷贝确保缓存数据不被外部修改
    return JSON.parse(JSON.stringify(result));
  }

  /**
   * 🔨 构建直接查询结果（缓存禁用时使用）
   */
  private buildDirectQueryResult(
    symbols: string[],
    results: Record<string, string>,
    provider: string,
    direction: MappingDirection,
    startTime: number,
  ): BatchMappingResult {
    const failedSymbols = symbols.filter((s) => !results[s]);

    return {
      success: true,
      provider,
      direction,
      totalProcessed: symbols.length,
      cacheHits: 0, // 没有缓存命中，因为缓存被禁用
      mappingDetails: results,
      failedSymbols,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * ✅ 批量结果结构校验与修复
   */
  private validateAndFixBatchResult(
    result: BatchMappingResult,
  ): BatchMappingResult {
    // 确保必需字段存在，供L3精准失效使用
    const validatedResult = { ...result };

    if (
      !validatedResult.mappingDetails ||
      typeof validatedResult.mappingDetails !== "object"
    ) {
      validatedResult.mappingDetails = {};
      this.logger.warn(
        "Missing mappingDetails in batch result, added empty object",
      );
    }

    if (!Array.isArray(validatedResult.failedSymbols)) {
      validatedResult.failedSymbols = [];
      this.logger.warn(
        "Missing failedSymbols in batch result, added empty array",
      );
    }

    return validatedResult;
  }

  /**
   * 🔑 缓存键生成策略 - 确保稳定性和一致性
   */
  private getSymbolCacheKey(
    provider: string,
    symbol: string,
    direction: MappingDirection,
  ): string {
    // 标准化provider名称（小写）避免大小写导致的缓存miss
    const normalizedProvider = provider.toLowerCase();
    return `symbol:${normalizedProvider}:${direction}:${symbol}`;
  }

  /**
   * 🔑 统一键生成方法 - 确保批量缓存与并发控制使用相同规格
   */
  private generateConsistentKey(
    prefix: string,
    provider: string,
    symbols: string[],
    direction: MappingDirection,
  ): string {
    const normalizedProvider = provider.toLowerCase();
    const sortedSymbols = [...symbols].sort().join(",");
    const symbolsHash = crypto
      .createHash("md5")
      .update(sortedSymbols)
      .digest("hex");
    return `${prefix}:${normalizedProvider}:${direction}:${symbolsHash}`;
  }

  private getBatchCacheKey(
    provider: string,
    symbols: string[],
    direction: MappingDirection,
  ): string {
    return this.generateConsistentKey("batch", provider, symbols, direction);
  }

  private getPendingQueryKey(
    provider: string,
    symbols: string[],
    direction: MappingDirection,
  ): string {
    return this.generateConsistentKey("pending", provider, symbols, direction);
  }

  private getProviderRulesKey(provider: string): string {
    const normalizedProvider = provider.toLowerCase();
    return `rules:${normalizedProvider}`;
  }


  /**
   * 🎯 统一规则获取（带缓存）- 键一致性修正
   */
  private async getProviderRules(
    provider: string,
  ): Promise<SymbolMappingRule[]> {
    const rulesKey = this.getProviderRulesKey(provider); // 使用统一键生成
    const cached = this.providerRulesCache.get(rulesKey);
    if (cached) {
      // ✅ 发射L1命中事件 (替代 this.recordCacheMetrics("l1", true))
      this.cacheEventEmitter.emit(CACHE_EVENTS.HIT, {
        layer: 'l1',
        provider,
        timestamp: Date.now(),
      } as CacheHitEvent);
      return cached;
    }

    // ✅ 发射L1未命中事件 (替代 this.recordCacheMetrics("l1", false))
    this.cacheEventEmitter.emit(CACHE_EVENTS.MISS, {
      layer: 'l1',
      provider,
      timestamp: Date.now(),
    } as CacheMissEvent);

    try {
      // 查询数据库获取规则
      const mappingConfig = await this.repository.findByDataSource(provider);
      const rules = mappingConfig?.SymbolMappingRule || [];

      // 存入L1缓存，使用统一键
      this.providerRulesCache.set(rulesKey, rules);

      this.logger.debug("Provider rules loaded and cached", {
        provider: provider.toLowerCase(),
        rulesKey,
        rulesCount: rules.length,
      });

      return rules;
    } catch (error) {
      // 数据库查询失败时返回空数组作为默认值 - use unified error handling for logging
      this.logger.error("Database query failed, returning empty rules as fallback", {
        provider: provider.toLowerCase(),
        rulesKey,
        error: error.message,
        errorCode: BusinessErrorCode.DATABASE_ERROR,
        fallbackStrategy: "empty_rules_array",
      });

      // 缓存空规则以避免重复查询失败的数据库
      const emptyRules = [];
      this.providerRulesCache.set(rulesKey, emptyRules);

      return emptyRules;
    }
  }

  /**
   * ⏱️ 创建带超时保护的查询
   * 防止底层Promise悬挂导致内存泄漏
   */
  private createTimeoutProtectedQuery(
    provider: string,
    symbols: string[],
    direction: MappingDirection,
    queryKey: string,
  ): Promise<Record<string, string>> {
    // 使用显式配置的查询超时时间
    const queryTimeout = this.featureFlags.symbolMapperQueryTimeoutMs;

    return new Promise(async (resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout;
      let isResolved = false;

      // 设置超时定时器
      timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          // 清理pendingQueries以防止内存泄漏
          this.pendingQueries.delete(queryKey);

          const errorMsg = `Query timeout after ${queryTimeout}ms`;
          this.logger.error(errorMsg, {
            provider,
            symbolsCount: symbols.length,
            direction,
            queryKey,
          });

          reject(new Error(errorMsg));
        }
      }, queryTimeout);

      try {
        // 执行实际查询
        const result = await this.executeUncachedQuery(
          provider,
          symbols,
          direction,
        );

        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          resolve(result);
        }
      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          reject(error);
        }
      }
    });
  }

  /**
   * 🔄 执行未缓存查询 - L1规则缓存 + 数据库映射
   */
  private async executeUncachedQuery(
    provider: string,
    symbols: string[],
    direction: MappingDirection,
  ): Promise<Record<string, string>> {
    this.logger.debug("Executing uncached query", {
      provider,
      symbolsCount: symbols.length,
      direction,
    });

    // 首先获取规则（可能命中L1缓存）
    const rules = await this.getProviderRules(provider);

    if (!rules || rules.length === 0) {
      this.logger.warn("No mapping rules found for provider", { provider });
      return {};
    }

    const results: Record<string, string> = {};

    // 对每个符号应用映射规则
    for (const symbol of symbols) {
      const mappedSymbol = this.applyMappingRules(symbol, rules, direction);
      if (mappedSymbol && mappedSymbol !== symbol) {
        results[symbol] = mappedSymbol;
      }
      // 注意：映射失败或无变化的符号不添加到results中，将在failedSymbols中处理
    }

    this.logger.debug("Uncached query completed", {
      provider: provider.toLowerCase(),
      inputCount: symbols.length,
      successCount: Object.keys(results).length,
      direction,
    });

    return results;
  }

  /**
   * 📋 应用映射规则到单个符号
   */
  private applyMappingRules(
    symbol: string,
    rules: SymbolMappingRule[],
    direction: MappingDirection,
  ): string | null {
    // 根据方向选择匹配字段
    const sourceField =
      direction === "to_standard" ? "sdkSymbol" : "standardSymbol";
    const targetField =
      direction === "to_standard" ? "standardSymbol" : "sdkSymbol";

    // 查找匹配的规则
    const matchingRule = rules.find(
      (rule) => rule.isActive !== false && rule[sourceField] === symbol,
    );

    if (matchingRule) {
      return matchingRule[targetField];
    }

    // 没找到匹配规则时返回原符号（保持现有行为）
    return symbol;
  }

  /**
   * 🔄 批量回源回填策略 - 详细实现规则
   */
  private backfillSingleSymbolCache(
    provider: string,
    uncachedResults: Record<string, string>,
    direction: MappingDirection,
  ): void {
    // uncachedResults 格式：{ [originalSymbol]: mappedSymbol }
    // 遍历成功映射的结果，失败项不回填

    for (const [originalSymbol, mappedSymbol] of Object.entries(
      uncachedResults,
    )) {
      // 跳过映射失败的项（值为 null、undefined 或空字符串）
      if (!mappedSymbol) {
        continue;
      }

      // 缓存当前方向的映射
      const currentKey = this.getSymbolCacheKey(
        provider,
        originalSymbol,
        direction,
      );
      this.symbolMappingCache.set(currentKey, mappedSymbol);

      // 同步双向回填：缓存反向映射
      const reverseDirection =
        direction === MappingDirection.TO_STANDARD
          ? MappingDirection.FROM_STANDARD
          : MappingDirection.TO_STANDARD;
      const reverseKey = this.getSymbolCacheKey(
        provider,
        mappedSymbol,
        reverseDirection,
      );
      this.symbolMappingCache.set(reverseKey, originalSymbol);

      this.logger.debug("Bidirectional backfill completed", {
        provider: provider.toLowerCase(),
        originalSymbol,
        mappedSymbol,
        direction,
        currentKey,
        reverseKey,
      });
    }

    this.logger.log("Batch backfill completed", {
      provider: provider.toLowerCase(),
      direction,
      successCount: Object.keys(uncachedResults).filter(
        (key) => uncachedResults[key],
      ).length,
      totalCount: Object.keys(uncachedResults).length,
    });
  }

  /**
   * 🔄 设置 Change Stream 监听器
   * 监听 symbol_mapping_rules 集合的变更事件，实现智能缓存失效
   */
  private setupChangeStreamMonitoring(): void {
    // 幂等性检查：避免重复监听
    if (this.isMonitoringActive) {
      this.logger.warn(
        "Change Stream monitoring already active, skipping setup",
      );
      return;
    }

    try {
      // 使用 repository 的 watchChanges 方法
      this.changeStream = this.repository.watchChanges();
      this.isMonitoringActive = true;

      // 监听变更事件
      this.changeStream.on("change", this.handleChangeEvent.bind(this));

      // 监听错误事件 - 实现指数退避重连策略
      this.changeStream.on("error", (error) => {
        this.logger.error("Change Stream error occurred", {
          error: error.message,
          stack: error.stack,
          reconnectAttempts: this.reconnectAttempts,
        });

        this.isMonitoringActive = false;
        this.scheduleReconnection();
      });

      // 监听关闭事件 - 也触发重连
      this.changeStream.on("close", () => {
        this.logger.warn("Change Stream connection closed");
        this.isMonitoringActive = false;
        this.scheduleReconnection();
      });

      // 成功建立连接，重置重连计数
      this.reconnectAttempts = 0;
      this.logger.log("Change Stream monitoring established successfully", {
        collection: "symbol_mapping_rules",
        watchEvents: ["insert", "update", "delete"],
      });
    } catch (error) {
      // Use unified error handling for Change Stream setup failures
      this.logger.error("Failed to setup Change Stream monitoring", {
        error: error.message,
        stack: error.stack,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        service: 'change_stream_monitoring'
      });
      this.isMonitoringActive = false;
      this.scheduleReconnection();
    }
  }

  /**
   * 📡 调度重连 - 实现指数退避策略
   */
  private scheduleReconnection(): void {
    // 计算退避延迟：1s -> 2s -> 4s -> 8s -> 16s -> 30s (max)
    const baseDelay = 1000; // 1秒基础延迟
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    this.reconnectAttempts++;

    this.logger.log("Scheduling Change Stream reconnection", {
      attempt: this.reconnectAttempts,
      delayMs: delay,
      nextAttemptAt: new Date(Date.now() + delay).toISOString(),
    });

    setTimeout(() => {
      this.logger.log("Attempting to reconnect Change Stream...", {
        attempt: this.reconnectAttempts,
      });
      this.setupChangeStreamMonitoring();
    }, delay);
  }

  /**
   * 🎯 处理 Change Stream 变更事件
   * 解析变更事件并触发智能缓存失效
   */
  private async handleChangeEvent(changeEvent: any): Promise<void> {
    try {
      const { operationType, fullDocument, documentKey, ns } = changeEvent;

      this.logger.debug("Change Stream event received", {
        operationType,
        documentId: documentKey?._id,
        hasFullDocument: !!fullDocument,
        collection: ns?.coll,
      });

      // 提取 provider 信息
      let affectedProvider: string | null = null;

      if (fullDocument?.dataSourceName) {
        // insert/update/replace 操作：从完整文档获取 provider
        affectedProvider = fullDocument.dataSourceName;

        this.logger.debug("Provider extracted from fullDocument", {
          operationType,
          provider: affectedProvider,
          documentId: documentKey?._id,
        });
      } else if (operationType === "delete") {
        // delete 操作处理策略：
        // 1. 首先尝试从 preImage 获取（如果配置了 preAndPostImages）
        // 2. 否则查询最近的数据源版本缓存
        // 3. 最后使用保守策略清空所有缓存

        affectedProvider =
          await this.extractProviderFromDeleteEvent(changeEvent);

        if (!affectedProvider) {
          this.logger.warn(
            "Cannot determine provider for delete operation, using conservative strategy",
            {
              documentKey,
              operationType,
            },
          );
          affectedProvider = "*"; // 保守策略：影响所有 provider
        }
      }

      if (affectedProvider) {
        await this.invalidateProviderCache(affectedProvider, operationType);
      } else {
        this.logger.warn(
          "Cannot determine affected provider from change event",
          {
            operationType,
            documentKey,
            hasFullDocument: !!fullDocument,
          },
        );
      }
    } catch (error) {
      this.logger.error("Error handling Change Stream event", {
        error: error.message,
        stack: error.stack,
        changeEvent: JSON.stringify(changeEvent, null, 2),
      });
    }
  }

  /**
   * 🔍 从 delete 事件中提取 provider 信息
   * 使用多种策略尝试确定被删除文档的 dataSourceName
   */
  private async extractProviderFromDeleteEvent(
    changeEvent: any,
  ): Promise<string | null> {
    const { documentKey, preImage } = changeEvent;

    try {
      // 策略 1: 从 preImage 获取（如果 Change Stream 配置了 preAndPostImages）
      if (preImage?.dataSourceName) {
        this.logger.debug("Provider extracted from preImage", {
          provider: preImage.dataSourceName,
          documentId: documentKey?._id,
        });
        return preImage.dataSourceName;
      }

      // 策略 2: 查询数据库（基于 documentKey._id）
      if (documentKey?._id) {
        try {
          const document = await this.repository.findById(
            documentKey._id.toString(),
          );
          if (document?.dataSourceName) {
            this.logger.debug("Provider extracted from database query", {
              provider: document.dataSourceName,
              documentId: documentKey._id,
            });
            return document.dataSourceName;
          }
        } catch (dbError) {
          this.logger.warn("Database query failed for deleted document", {
            documentId: documentKey._id,
            error: dbError.message,
          });
        }
      }

      // 策略 3: 无法确定具体 provider，返回 null（将使用保守策略）
      this.logger.debug("Unable to extract provider from delete event", {
        hasPreImage: !!preImage,
        hasDocumentKey: !!documentKey,
        documentId: documentKey?._id,
      });

      return null;
    } catch (error) {
      this.logger.error("Error extracting provider from delete event", {
        error: error.message,
        documentKey,
        hasPreImage: !!preImage,
      });
      return null;
    }
  }

  /**
   * 🎯 Provider缓存失效策略 (简化版2级策略)
   * 直接智能失效指定provider的缓存，失败时记录错误但不影响服务
   */
  private async invalidateProviderCache(
    provider: string,
    operationType: string,
  ): Promise<void> {
    try {
      const normalizedProvider = provider.toLowerCase();

      // 统一智能失效：清理指定provider的所有缓存层级
      let invalidatedItems = 0;

      // L1: 清理provider规则缓存
      const rulesKey = this.getProviderRulesKey(normalizedProvider);
      if (this.providerRulesCache.has(rulesKey)) {
        this.providerRulesCache.delete(rulesKey);
        invalidatedItems++;
        this.logger.debug("L1 provider rules cache invalidated", { rulesKey });
      }

      // L2: 清理相关符号映射缓存（按前缀匹配）
      const symbolPrefix = `symbol:${normalizedProvider}:`;
      const symbolKeysToDelete = [];

      // 直接使用现代LRU缓存的entries()方法
      const symbolCacheIterator = this.symbolMappingCache.entries();

      for (const entry of symbolCacheIterator) {
        const key = Array.isArray(entry) ? entry[0] : entry;
        if (key.startsWith(symbolPrefix)) {
          symbolKeysToDelete.push(key);
        }
      }

      symbolKeysToDelete.forEach((key) => this.symbolMappingCache.delete(key));
      invalidatedItems += symbolKeysToDelete.length;

      // L3: 清理相关批量结果缓存
      const batchPrefix = `batch:${normalizedProvider}:`;
      const batchKeysToDelete = [];

      // 直接使用现代LRU缓存的entries()方法
      const batchCacheIterator = this.batchResultCache.entries();

      for (const entry of batchCacheIterator) {
        const key = Array.isArray(entry) ? entry[0] : entry;
        if (key.startsWith(batchPrefix)) {
          batchKeysToDelete.push(key);
        }
      }

      batchKeysToDelete.forEach((key) => this.batchResultCache.delete(key));
      invalidatedItems += batchKeysToDelete.length;

      this.logger.log("Provider cache intelligently invalidated", {
        provider: normalizedProvider,
        operationType,
        invalidatedItems,
        layers: {
          l1Rules: rulesKey,
          l2Symbols: symbolKeysToDelete.length,
          l3Batches: batchKeysToDelete.length,
        },
      });
    } catch (error) {
      // 简化版失败处理：记录错误但不影响服务正常运行
      this.logger.error("Provider cache invalidation failed, cache may be stale", {
        provider,
        operationType,
        error: error.message,
        fallbackStrategy: "continue_service_with_stale_cache",
      });

      // 缓存失效失败不应该中断服务，让后续查询通过缓存未命中自然更新
    }
  }

  /**
   * 🔄 合并缓存命中和数据库查询结果
   */
  private mergeResults(
    cacheHits: Map<string, string>,
    uncachedResults: Record<string, string>,
    originalSymbols: string[],
    provider: string,
    direction: MappingDirection,
    startTime: number,
  ): BatchMappingResult {
    const mappingDetails: Record<string, string> = {};
    const failedSymbols: string[] = [];

    // 处理每个原始符号
    for (const symbol of originalSymbols) {
      if (cacheHits.has(symbol)) {
        // 缓存命中
        mappingDetails[symbol] = cacheHits.get(symbol);
      } else if (uncachedResults[symbol]) {
        // 数据库查询结果
        mappingDetails[symbol] = uncachedResults[symbol];
      } else {
        // 映射失败
        failedSymbols.push(symbol);
      }
    }

    return {
      success: true,
      provider,
      direction,
      totalProcessed: originalSymbols.length,
      cacheHits: cacheHits.size,
      mappingDetails,
      failedSymbols,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 💾 启动内存监控 - 使用FeatureFlags配置
   */
  private startMemoryMonitoring(): void {
    // 使用FeatureFlags中的配置，与常量保持一致
    const memoryCheckInterval =
      this.featureFlags.symbolMapperMemoryCheckInterval; // 60秒(1分钟)

    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, memoryCheckInterval);

    this.logger.debug("Memory monitoring started with FeatureFlags config", {
      checkIntervalMs: memoryCheckInterval,
      source: "FeatureFlags.symbolMapperMemoryCheckInterval",
    });
  }

  /**
   * 💾 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      // 直接计算缓存项数量，避免调用已删除的getCacheStats方法
      const totalCacheItems =
        this.providerRulesCache.size +
        this.symbolMappingCache.size +
        this.batchResultCache.size;

      this.logger.debug("Memory usage check", {
        heapUsedMB,
        heapTotalMB,
        heapUtilization: `${Math.round((heapUsedMB / heapTotalMB) * 100)}%`,
        totalCacheItems,
        lastCleanup: this.lastMemoryCleanup.toISOString(),
      });

      // 使用常量中定义的内存压力阈值
      const memoryPressureThreshold = MEMORY_MONITORING.CLEANUP_THRESHOLD; // 0.85 (85%)
      if (heapUsedMB / heapTotalMB > memoryPressureThreshold) {
        this.logger.warn("Memory pressure detected, performing cache cleanup", {
          heapUsedMB,
          heapTotalMB,
          threshold: `${memoryPressureThreshold * 100}%`,
        });

        // 执行渐进式清理：优先清理L3，然后L2
        this.performGradualCleanup();
        this.lastMemoryCleanup = new Date();
      }
    } catch (error) {
      // Use unified error handling for memory monitoring failures
      this.logger.error("Memory usage check failed", {
        error: error.message,
        errorCode: BusinessErrorCode.INTERNAL_ERROR,
        operation: 'memory_monitoring'
      });
    }
  }

  /**
   * 💾 执行渐进式缓存清理
   */
  private performGradualCleanup(): void {
    const gradualCleanupStartTime = Date.now();
    // 记录清理前的缓存大小
    const beforeStats = {
      cacheSize: {
        l1: this.providerRulesCache.size,
        l2: this.symbolMappingCache.size,
        l3: this.batchResultCache.size,
      }
    };

    // 阶段1：清理L3批量结果缓存（影响最小）
    const l3CleanupStart = Date.now();
    this.batchResultCache.clear();
    const l3CleanupTime = Date.now() - l3CleanupStart;

    // 阶段2：部分清理L2符号缓存（保留25%最热门的）
    const l2Size = this.symbolMappingCache.size;
    const keepCount = Math.floor(l2Size * CACHE_CLEANUP.RETENTION_RATIO);
    const l2CleanupStart = Date.now();

    if (l2Size > keepCount) {
      // 高级LRU清理算法：仅删除最少使用的条目，保留热门条目
      this.performAdvancedLRUCleanup(keepCount);
    }
    const l2CleanupTime = Date.now() - l2CleanupStart;

    // 记录清理后的缓存大小
    const afterStats = {
      cacheSize: {
        l1: this.providerRulesCache.size,
        l2: this.symbolMappingCache.size,
        l3: this.batchResultCache.size,
      }
    };
    const totalCleanupTime = Date.now() - gradualCleanupStartTime;

    // 计算清理效率指标
    const freedL2Items = beforeStats.cacheSize.l2 - afterStats.cacheSize.l2;
    const freedL3Items = beforeStats.cacheSize.l3 - afterStats.cacheSize.l3;
    const totalFreedItems = freedL2Items + freedL3Items;
    const memoryReductionRatio =
      totalFreedItems / (beforeStats.cacheSize.l2 + beforeStats.cacheSize.l3);

    this.logger.log("Gradual cache cleanup completed", {
      before: beforeStats.cacheSize,
      after: afterStats.cacheSize,
      freedItems: {
        l2: freedL2Items,
        l3: freedL3Items,
        total: totalFreedItems,
      },
      performanceMetrics: {
        totalCleanupTimeMs: totalCleanupTime,
        l2CleanupTimeMs: l2CleanupTime,
        l3CleanupTimeMs: l3CleanupTime,
        cleanupEfficiency: (totalFreedItems / (totalCleanupTime || 1)) * 1000, // 每秒清理的条目数
        memoryReductionRatio: Math.round(memoryReductionRatio * 100), // 内存减少百分比
        retentionRatio: CACHE_CLEANUP.RETENTION_RATIO,
        cleanupStrategy: CACHE_CLEANUP.CLEANUP_STRATEGY,
      },
      hitRatioImpactEstimate: {
        note: "命中率数据已迁移到事件驱动监控",
        expectedImprovementPercent: Math.round(
          (1 - CACHE_CLEANUP.RETENTION_RATIO) * 10,
        ), // 预估命中率改善
      },
    });
  }

  /**
   * 高级LRU清理算法
   * 替换简单的cache.clear()策略，实现智能的增量清理
   * 根据LRU顺序保留最热门的缓存条目，删除最少使用的条目
   *
   * @param keepCount 需要保留的条目数量
   * @private
   */
  private performAdvancedLRUCleanup(keepCount: number): void {
    const cleanupStartTime = Date.now();
    const currentSize = this.symbolMappingCache.size;

    if (currentSize <= keepCount) {
      this.logger.log("No cleanup needed", {
        currentSize,
        keepCount,
        cleanupStrategy: CACHE_CLEANUP.CLEANUP_STRATEGY,
        processingTimeMs: Date.now() - cleanupStartTime,
      });
      return;
    }

    const toDeleteCount = currentSize - keepCount;

    try {
      // 获取所有缓存条目，按LRU顺序排序
      // LRU缓存的entries()返回的是按访问时间排序的，最近使用的在前
      const allEntries = Array.from(this.symbolMappingCache.entries());

      // 反转数组以获得最少使用的条目在前的顺序
      allEntries.reverse();

      // 分批处理以避免大数据集性能问题
      const batchSize = this.configService.get<CacheUnifiedConfigValidation>('cacheUnified')?.lruSortBatchSize || 1000;
      let deletedCount = 0;

      for (
        let i = 0;
        i < toDeleteCount && i < allEntries.length;
        i += batchSize
      ) {
        const batchEnd = Math.min(i + batchSize, toDeleteCount);
        const batch = allEntries.slice(i, batchEnd);

        // 删除这一批最少使用的条目
        batch.forEach(([key]) => {
          if (this.symbolMappingCache.delete(key)) {
            deletedCount++;
          }
        });

        // 记录批处理进度（仅在大批量时）
        if (toDeleteCount > batchSize) {
          this.logger.debug("LRU cleanup batch completed", {
            batchStart: i,
            batchEnd,
            deletedInBatch: batch.length,
            totalDeleted: deletedCount,
            remaining: toDeleteCount - deletedCount,
          });
        }
      }

      const cleanupEndTime = Date.now();
      const processingTimeMs = cleanupEndTime - cleanupStartTime;

      this.logger.log("Advanced LRU cleanup completed", {
        originalSize: currentSize,
        targetSize: keepCount,
        actualSize: this.symbolMappingCache.size,
        deletedCount,
        retentionRatio: CACHE_CLEANUP.RETENTION_RATIO,
        cleanupStrategy: CACHE_CLEANUP.CLEANUP_STRATEGY,
        processingTimeMs,
        performanceMetrics: {
          deletionRate: (deletedCount / (processingTimeMs || 1)) * 1000, // 每秒删除条目数
          memoryFreedRatio: deletedCount / currentSize,
          batchProcessingEnabled:
            toDeleteCount > (this.configService.get<CacheUnifiedConfigValidation>('cacheUnified')?.lruSortBatchSize || 1000),
        },
      });
    } catch (error) {
      const failureTime = Date.now();
      const processingTimeMs = failureTime - cleanupStartTime;

      this.logger.error(
        "Advanced LRU cleanup failed, falling back to simple clear",
        {
          error: error.message,
          errorCode: BusinessErrorCode.INTERNAL_ERROR,
          currentSize,
          keepCount,
          processingTimeMs,
          fallbackStrategy: "simple_clear",
          operation: 'lru_cleanup'
        },
      );

      // 失败时回退到智能清理策略
      this.performIntelligentCleanup(currentSize, keepCount, cleanupStartTime);

      // 记录回退策略的完成情况
      this.logger.log("Intelligent fallback cleanup completed", {
        originalSize: currentSize,
        finalSize: this.symbolMappingCache.size,
        totalProcessingTimeMs: Date.now() - cleanupStartTime,
        strategy: "intelligent_cleanup_fallback",
      });
    }
  }

  /**
   * 🎯 智能清理策略 - 基于访问频率和时间衰减
   *
   * 清理策略优先级：
   * 1. 最老且最少访问的条目
   * 2. 超过TTL的条目
   * 3. 低价值条目（基于缓存命中率）
   *
   * @param originalSize 原始缓存大小
   * @param keepCount 需要保留的条目数量
   * @param startTime 清理开始时间
   * @private
   */
  private performIntelligentCleanup(originalSize: number, keepCount: number, startTime: number): void {
    const config = this.configService.get<CacheUnifiedConfigValidation>('cacheUnified');
    const batchSize = config?.lruSortBatchSize || 1000;
    const maxCleanupTime = config?.slowOperationMs || 100; // 限制清理时间

    try {
      // 如果缓存太大，使用分批智能清理
      if (originalSize > batchSize) {
        this.performBatchedIntelligentCleanup(originalSize, keepCount, startTime, batchSize, maxCleanupTime);
      } else {
        // 小缓存直接智能清理
        this.performDirectIntelligentCleanup(originalSize, keepCount, startTime);
      }
    } catch (error) {
      this.logger.warn("Intelligent cleanup failed, using emergency clear", {
        error: error.message,
        originalSize,
        keepCount,
        fallbackStrategy: "emergency_clear"
      });

      // 紧急情况下才使用clear()
      this.symbolMappingCache.clear();
    }
  }

  /**
   * 🔄 分批智能清理 - 避免性能影响
   *
   * @param originalSize 原始缓存大小
   * @param keepCount 需要保留的条目数量
   * @param startTime 清理开始时间
   * @param batchSize 批处理大小
   * @param maxCleanupTime 最大清理时间（毫秒）
   * @private
   */
  private performBatchedIntelligentCleanup(
    originalSize: number,
    keepCount: number,
    startTime: number,
    batchSize: number,
    maxCleanupTime: number
  ): void {
    const toDeleteCount = originalSize - keepCount;
    let deletedCount = 0;
    let batchIndex = 0;

    // 获取所有缓存条目
    const allEntries = Array.from(this.symbolMappingCache.entries());

    // 智能排序：优先删除价值最低的条目
    const sortedEntries = this.sortEntriesByDeletionPriority(allEntries);

    // 分批处理
    while (deletedCount < toDeleteCount && (Date.now() - startTime) < maxCleanupTime) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, sortedEntries.length);

      if (batchStart >= sortedEntries.length) break;

      const batch = sortedEntries.slice(batchStart, batchEnd);

      // 删除这一批条目
      for (const [key] of batch) {
        if (deletedCount >= toDeleteCount) break;
        if (this.symbolMappingCache.delete(key)) {
          deletedCount++;
        }
      }

      batchIndex++;

      // 记录批处理进度
      this.logger.debug("Intelligent cleanup batch completed", {
        batchIndex,
        deletedInBatch: Math.min(batch.length, toDeleteCount - (deletedCount - batch.length)),
        totalDeleted: deletedCount,
        remainingToDelete: toDeleteCount - deletedCount,
        elapsedTimeMs: Date.now() - startTime
      });
    }

    this.logger.log("Batched intelligent cleanup completed", {
      originalSize,
      targetKeepCount: keepCount,
      actualSize: this.symbolMappingCache.size,
      deletedCount,
      batchesProcessed: batchIndex,
      cleanupEfficiency: (deletedCount / toDeleteCount * 100).toFixed(1) + '%',
      processingTimeMs: Date.now() - startTime
    });
  }

  /**
   * ⚡ 直接智能清理 - 小缓存快速处理
   *
   * @param originalSize 原始缓存大小
   * @param keepCount 需要保留的条目数量
   * @param startTime 清理开始时间
   * @private
   */
  private performDirectIntelligentCleanup(originalSize: number, keepCount: number, startTime: number): void {
    const toDeleteCount = originalSize - keepCount;
    const allEntries = Array.from(this.symbolMappingCache.entries());

    // 智能排序：优先删除价值最低的条目
    const sortedEntries = this.sortEntriesByDeletionPriority(allEntries);

    // 删除指定数量的最低价值条目
    let deletedCount = 0;
    for (let i = 0; i < Math.min(toDeleteCount, sortedEntries.length); i++) {
      const [key] = sortedEntries[i];
      if (this.symbolMappingCache.delete(key)) {
        deletedCount++;
      }
    }

    this.logger.log("Direct intelligent cleanup completed", {
      originalSize,
      targetKeepCount: keepCount,
      actualSize: this.symbolMappingCache.size,
      deletedCount,
      cleanupEfficiency: (deletedCount / toDeleteCount * 100).toFixed(1) + '%',
      processingTimeMs: Date.now() - startTime
    });
  }

  /**
   * 🧠 智能排序 - 基于访问频率和时间衰减确定删除优先级
   *
   * 删除优先级算法：
   * - 时间衰减因子：越老的条目分数越高（优先删除）
   * - 访问频率：模拟访问频率（基于LRU位置）
   * - 数据价值：某些关键符号映射优先保留
   *
   * @param entries 缓存条目数组
   * @returns 按删除优先级排序的条目数组（优先删除的在前）
   * @private
   */
  private sortEntriesByDeletionPriority(entries: [string, any][]): [string, any][] {
    const now = Date.now();
    const config = this.configService.get<CacheUnifiedConfigValidation>('cacheUnified');
    const defaultTtl = (config?.defaultTtl || 300) * 1000; // 转换为毫秒

    // 为每个条目计算删除优先级分数（分数越高越优先删除）
    const entriesWithScore = entries.map(([key, value], index) => {
      // 1. 时间衰减因子 (0-1, 越老分数越高)
      const approximateAge = index * (defaultTtl / entries.length); // 基于LRU位置估算年龄
      const timeDecayScore = Math.min(approximateAge / defaultTtl, 1);

      // 2. 访问频率因子 (0-1, 访问频率越低分数越高)
      // LRU缓存中，index越大表示越少被访问
      const accessFrequencyScore = index / entries.length;

      // 3. 数据价值因子 (0-1, 价值越低分数越高)
      let dataValueScore = 0.5; // 默认中等价值

      // 关键符号映射（如港股主板）优先保留
      if (key.includes('.HK') || key.includes('.SZ') || key.includes('.SS')) {
        dataValueScore = 0.2; // 降低删除优先级
      }

      // 美股和其他市场的映射
      if (key.includes('.US') || key.includes('.NASDAQ') || key.includes('.NYSE')) {
        dataValueScore = 0.3; // 中等删除优先级
      }

      // 临时或测试数据优先删除
      if (key.includes('test') || key.includes('temp') || key.includes('debug')) {
        dataValueScore = 0.9; // 高删除优先级
      }

      // 4. 综合分数计算（权重分配）
      const finalScore =
        timeDecayScore * 0.4 +        // 时间衰减权重40%
        accessFrequencyScore * 0.4 +  // 访问频率权重40%
        dataValueScore * 0.2;         // 数据价值权重20%

      return {
        key,
        value,
        score: finalScore,
        debugInfo: {
          timeDecayScore: timeDecayScore.toFixed(3),
          accessFrequencyScore: accessFrequencyScore.toFixed(3),
          dataValueScore: dataValueScore.toFixed(3),
          finalScore: finalScore.toFixed(3)
        }
      };
    });

    // 按分数降序排序（分数高的优先删除）
    entriesWithScore.sort((a, b) => b.score - a.score);

    // 记录智能排序的前几个条目（用于调试）
    if (entriesWithScore.length > 0) {
      const topCandidates = entriesWithScore.slice(0, Math.min(5, entriesWithScore.length));
      this.logger.debug("Intelligent cleanup priorities (top deletion candidates)", {
        totalEntries: entriesWithScore.length,
        topCandidates: topCandidates.map(entry => ({
          key: entry.key,
          ...entry.debugInfo
        }))
      });
    }

    // 返回排序后的条目数组
    return entriesWithScore.map(entry => [entry.key, entry.value]);
  }
}
