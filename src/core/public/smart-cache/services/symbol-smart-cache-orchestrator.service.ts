import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { StorageService } from '../../storage/services/storage.service';
import { DataChangeDetectorService } from '../../shared/services/data-change-detector.service';
import { MarketStatusService, MarketStatusResult } from '../../shared/services/market-status.service';
import { BackgroundTaskService } from '../../shared/services/background-task.service';
import { MetricsRegistryService } from '../../../../monitoring/metrics/services/metrics-registry.service';
import { Market } from '../../../../common/constants/market.constants';
import { MarketStatus } from '../../../../common/constants/market-trading-hours.constants';
import { 
  CacheStrategy, 
  CacheOrchestratorRequest, 
  CacheOrchestratorResult,
  BackgroundUpdateTask,
  MarketStatusQueryResult
} from '../interfaces/symbol-smart-cache-orchestrator.interface';
import { type SmartCacheOrchestratorConfig, SMART_CACHE_ORCHESTRATOR_CONFIG } from '../interfaces/symbol-smart-cache-config.interface';
import { SmartCacheOptionsDto } from '../../storage/dto/smart-cache-request.dto';

/**
 * 智能缓存编排器服务
 * 
 * 核心功能：
 * - 统一Receiver与Query的缓存调用骨架
 * - 策略映射：将CacheStrategy转换为StorageService可识别的SmartCacheOptionsDto
 * - 后台更新调度：TTL节流、去重、优先级计算
 * - 生命周期管理：初始化和优雅关闭
 * 
 * 设计原则：
 * - 复用现有StorageService.getWithSmartCache基础设施
 * - 统一缓存键管理，避免命名空间冲突
 * - 保持与Query现有监控指标的一致性
 */
@Injectable()
export class SmartCacheOrchestrator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmartCacheOrchestrator.name);
  
  /** 后台更新任务管理Map：cacheKey -> BackgroundUpdateTask */
  private readonly backgroundUpdateTasks = new Map<string, BackgroundUpdateTask>();
  
  /** 更新任务队列：按优先级排序的待执行任务 */
  private readonly updateQueue: BackgroundUpdateTask[] = [];
  
  /** 正在处理的任务数量 */
  private activeTaskCount = 0;
  
  /** 服务状态：是否正在关闭 */
  private isShuttingDown = false;
  
  /** 上次市场状态查询结果缓存 */
  private lastMarketStatusQuery: MarketStatusQueryResult | null = null;
  
  constructor(
    @Inject(SMART_CACHE_ORCHESTRATOR_CONFIG)
    private readonly config: SmartCacheOrchestratorConfig,
    
    private readonly storageService: StorageService,
    private readonly dataChangeDetectorService: DataChangeDetectorService,
    private readonly marketStatusService: MarketStatusService,
    private readonly backgroundTaskService: BackgroundTaskService,
    private readonly metricsRegistryService: MetricsRegistryService,
  ) {
    this.logger.log('SmartCacheOrchestrator service initializing...');
  }

  /**
   * 模块初始化
   * 设置后台任务处理和监控指标
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('SmartCacheOrchestrator service started');
    
    // 初始化监控指标（复用Query现有指标名称）
    if (this.config.enableMetrics) {
      this.initializeMetrics();
    }
    
    // 启动后台任务处理队列
    if (this.config.enableBackgroundUpdate) {
      this.startBackgroundTaskProcessor();
    }
    
    this.logger.log(`SmartCacheOrchestrator initialized with config: ${JSON.stringify({
      defaultMinUpdateInterval: this.config.defaultMinUpdateInterval,
      maxConcurrentUpdates: this.config.maxConcurrentUpdates,
      enableBackgroundUpdate: this.config.enableBackgroundUpdate,
      enableDataChangeDetection: this.config.enableDataChangeDetection,
    })}`);
  }

  /**
   * 模块销毁 - 优雅关闭
   * 等待所有backgroundUpdateTasks至超时，超时后停止新任务、清空待执行队列并记录告警
   * 不强制取消进行中任务
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('SmartCacheOrchestrator shutting down...');
    this.isShuttingDown = true;

    // 停止接受新的后台更新任务
    this.backgroundUpdateTasks.clear();
    
    // 等待所有进行中的任务完成或超时
    const shutdownTimeout = this.config.gracefulShutdownTimeout;
    const startTime = Date.now();
    
    while (this.activeTaskCount > 0 && (Date.now() - startTime) < shutdownTimeout) {
      this.logger.log(`Waiting for ${this.activeTaskCount} active tasks to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 每秒检查一次
    }
    
    // 超时处理
    if (this.activeTaskCount > 0) {
      this.logger.warn(`Graceful shutdown timeout reached. ${this.activeTaskCount} tasks still active.`);
      
      // 记录告警指标
      if (this.config.enableMetrics) {
        this.metricsRegistryService.queryBackgroundTasksFailed.inc();
      }
    }
    
    // 清空待执行队列
    const pendingTaskCount = this.updateQueue.length;
    this.updateQueue.length = 0;
    
    if (pendingTaskCount > 0) {
      this.logger.warn(`Cleared ${pendingTaskCount} pending background update tasks during shutdown`);
    }
    
    this.logger.log('SmartCacheOrchestrator shutdown completed');
  }

  /**
   * 初始化监控指标
   * 复用Query现有指标名称：queryBackgroundTasksActive/Completed/Failed
   */
  private initializeMetrics(): void {
    try {
      // 指标已在MetricsRegistryService中注册：
      // - queryBackgroundTasksActive (Gauge)
      // - queryBackgroundTasksCompleted (Counter)
      // - queryBackgroundTasksFailed (Counter)
      
      this.logger.log('Metrics initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize metrics', error);
    }
  }

  /**
   * 启动后台任务处理器
   * 定期检查队列并执行任务
   */
  private startBackgroundTaskProcessor(): void {
    const processingInterval = Math.min(this.config.defaultMinUpdateInterval / 2, 5000); // 最多5秒检查一次
    
    setInterval(() => {
      if (!this.isShuttingDown) {
        this.processUpdateQueue();
      }
    }, processingInterval);
    
    this.logger.log(`Background task processor started with ${processingInterval}ms interval`);
  }

  /**
   * 处理更新任务队列
   * 按优先级执行等待中的后台更新任务
   */
  private async processUpdateQueue(): Promise<void> {
    // 检查并发限制
    if (this.activeTaskCount >= this.config.maxConcurrentUpdates) {
      return;
    }

    // 按优先级排序（高优先级在前）
    this.updateQueue.sort((a, b) => b.priority - a.priority);

    // 执行可用的任务
    while (this.updateQueue.length > 0 && this.activeTaskCount < this.config.maxConcurrentUpdates) {
      const task = this.updateQueue.shift()!;
      
      if (Date.now() >= task.scheduledAt) {
        this.executeBackgroundUpdate(task);
      } else {
        // 任务未到执行时间，放回队列
        this.updateQueue.unshift(task);
        break;
      }
    }
  }

  /**
   * 执行后台更新任务
   * 包含错误处理和指标更新
   */
  private async executeBackgroundUpdate(task: BackgroundUpdateTask): Promise<void> {
    this.activeTaskCount++;
    task.status = 'running';

    // 更新活跃任务指标
    if (this.config.enableMetrics) {
      this.metricsRegistryService.queryBackgroundTasksActive.set(this.activeTaskCount);
    }

    try {
      this.logger.debug(`Executing background update for cache key: ${task.cacheKey}`);
      
      // 执行数据获取
      const freshData = await task.fetchFn();
      
      // 使用StorageService的forceRefresh写回缓存
      await this.storageService.getWithSmartCache(
        task.cacheKey,
        () => Promise.resolve(freshData),
        {
          symbols: task.symbols || [],
          forceRefresh: true,
          // 注意：不传keyPrefix，避免双重命名空间
        }
      );

      // 数据变化检测（如果启用）
      // TODO: 实现数据变化检测逻辑
      // if (this.config.enableDataChangeDetection) {
      //   await this.dataChangeDetectorService.detectChanges(task.cacheKey, freshData);
      // }

      task.status = 'completed';
      this.logger.debug(`Background update completed for cache key: ${task.cacheKey}`);

      // 更新完成指标
      if (this.config.enableMetrics) {
        this.metricsRegistryService.queryBackgroundTasksCompleted.inc();
      }
      
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.retryCount++;

      this.logger.error(`Background update failed for cache key: ${task.cacheKey}`, error);

      // 重试逻辑
      if (task.retryCount < task.maxRetries) {
        task.status = 'pending';
        task.scheduledAt = Date.now() + (task.retryCount * 30000); // 递增延迟重试
        this.updateQueue.push(task);
        this.logger.log(`Scheduled retry ${task.retryCount}/${task.maxRetries} for cache key: ${task.cacheKey}`);
      } else {
        this.logger.error(`Background update failed permanently for cache key: ${task.cacheKey} after ${task.maxRetries} retries`);
      }

      // 更新失败指标
      if (this.config.enableMetrics) {
        this.metricsRegistryService.queryBackgroundTasksFailed.inc();
      }
    } finally {
      this.activeTaskCount--;
      
      // 从任务管理Map中移除已完成/失败的任务
      if (task.status !== 'pending') {
        this.backgroundUpdateTasks.delete(task.cacheKey);
      }

      // 更新活跃任务指标
      if (this.config.enableMetrics) {
        this.metricsRegistryService.queryBackgroundTasksActive.set(this.activeTaskCount);
      }
    }
  }

  // ===================
  // 公共接口方法
  // 后续Task中将实现这些方法
  // ===================

  /**
   * 获取单个数据的智能缓存
   * 复用StorageService.getWithSmartCache基础设施
   */
  async getDataWithSmartCache<T>(request: CacheOrchestratorRequest<T>): Promise<CacheOrchestratorResult<T>> {
    try {
      // 处理NO_CACHE策略的直取直返
      if (request.strategy === CacheStrategy.NO_CACHE) {
        this.logger.debug(`NO_CACHE strategy for key: ${request.cacheKey}, fetching fresh data`);
        
        const freshData = await request.fetchFn();
        
        return {
          data: freshData,
          hit: false,
          strategy: request.strategy,
          storageKey: request.cacheKey,
          timestamp: new Date().toISOString(),
        };
      }

      // 根据策略映射获取缓存选项
      const cacheOptions = await this.mapStrategyToOptionsAsync(
        request.strategy, 
        request.symbols, 
        request.metadata
      );

      // 调用StorageService.getWithSmartCache
      const cacheResult = await this.storageService.getWithSmartCache(
        request.cacheKey,
        request.fetchFn,
        cacheOptions
      );

      // 转换为标准化结果格式
      const result: CacheOrchestratorResult<T> = {
        data: cacheResult.data as T,
        hit: cacheResult.hit,
        ttlRemaining: cacheResult.metadata?.ttlRemaining,
        dynamicTtl: cacheResult.metadata?.dynamicTtl,
        strategy: request.strategy,
        storageKey: cacheResult.metadata?.key || request.cacheKey,
        timestamp: cacheResult.metadata?.generatedAt || new Date().toISOString(),
      };

      // 触发后台更新任务（如果策略支持且缓存命中）
      if (cacheResult.hit && this.shouldScheduleBackgroundUpdate(request.strategy, cacheResult)) {
        const priority = this.calculateUpdatePriority(request.symbols, request.metadata?.market);
        
        this.scheduleBackgroundUpdate(
          request.cacheKey,
          request.symbols,
          request.fetchFn,
          priority
        );
      }

      this.logger.debug(`Cache operation completed for key: ${request.cacheKey}`, {
        hit: result.hit,
        strategy: result.strategy,
        ttlRemaining: result.ttlRemaining,
      });

      return result;

    } catch (error) {
      this.logger.error(`Cache operation failed for key: ${request.cacheKey}`, error);
      
      // 发生错误时，尝试直接获取数据
      try {
        const fallbackData = await request.fetchFn();
        
        return {
          data: fallbackData,
          hit: false,
          strategy: request.strategy,
          storageKey: request.cacheKey,
          timestamp: new Date().toISOString(),
          error: error.message,
        };
      } catch (fetchError) {
        this.logger.error(`Fallback fetch also failed for key: ${request.cacheKey}`, fetchError);
        throw fetchError;
      }
    }
  }

  /**
   * 判断是否应该调度后台更新
   * 基于策略配置和缓存状态决定
   */
  private shouldScheduleBackgroundUpdate(strategy: CacheStrategy, cacheResult: any): boolean {
    const strategyConfig = this.config.strategies[strategy];
    
    if (!strategyConfig || !this.config.enableBackgroundUpdate) {
      return false;
    }

    // NO_CACHE策略不需要后台更新
    if (strategy === CacheStrategy.NO_CACHE) {
      return false;
    }

    // 检查策略是否启用后台更新
    const enableBackgroundUpdate = (strategyConfig as any).enableBackgroundUpdate;
    if (!enableBackgroundUpdate) {
      return false;
    }

    // 检查TTL阈值
    if (cacheResult.metadata?.ttlRemaining && cacheResult.metadata?.dynamicTtl) {
      const thresholdRatio = (strategyConfig as any).updateThresholdRatio || 0.3;
      const remainingRatio = cacheResult.metadata.ttlRemaining / cacheResult.metadata.dynamicTtl;
      
      return remainingRatio <= thresholdRatio;
    }

    // 默认不触发更新
    return false;
  }

  /**
   * 批量获取数据的智能缓存
   * 复用StorageService.batchgetWithSmartCache基础设施
   * 🚨语义说明: 单个失败不影响整体，失败项返回miss(null)，与StorageService行为一致
   */
  async batchGetDataWithSmartCache<T>(requests: CacheOrchestratorRequest<T>[]): Promise<CacheOrchestratorResult<T>[]> {
    if (!requests || requests.length === 0) {
      return [];
    }

    // const results: CacheOrchestratorResult<T>[] = [];
    
    try {
      // 分组处理：按策略分组以便批量优化
      const strategyGroups = new Map<CacheStrategy, CacheOrchestratorRequest<T>[]>();
      
      requests.forEach((request, index) => {
        if (!strategyGroups.has(request.strategy)) {
          strategyGroups.set(request.strategy, []);
        }
        strategyGroups.get(request.strategy)!.push({ ...request, originalIndex: index } as any);
      });

      // 处理每个策略组
      const allGroupResults: Array<{ result: CacheOrchestratorResult<T>; originalIndex: number }> = [];

      for (const [strategy, groupRequests] of strategyGroups) {
        try {
          const groupResults = await this.processBatchGroup(strategy, groupRequests);
          allGroupResults.push(...groupResults);
        } catch (error) {
          this.logger.error(`Batch group processing failed for strategy ${strategy}:`, error);
          
          // 为失败的组创建fallback结果
          for (const request of groupRequests) {
            const originalIndex = (request as any).originalIndex;
            allGroupResults.push({
              result: {
                data: null as any,
                hit: false,
                strategy: request.strategy,
                storageKey: request.cacheKey,
                timestamp: new Date().toISOString(),
                error: error.message,
              },
              originalIndex,
            });
          }
        }
      }

      // 按原始顺序重新排列结果
      const sortedResults = new Array(requests.length);
      allGroupResults.forEach(({ result, originalIndex }) => {
        sortedResults[originalIndex] = result;
      });

      // 批量处理后台更新触发
      await this.batchScheduleBackgroundUpdates(sortedResults, requests);

      this.logger.debug(`Batch cache operation completed`, {
        totalRequests: requests.length,
        successCount: sortedResults.filter(r => !r.error).length,
        errorCount: sortedResults.filter(r => r.error).length,
      });

      return sortedResults;

    } catch (error) {
      this.logger.error('Batch cache operation failed:', error);
      
      // 全局失败时，为每个请求创建fallback结果
      return requests.map((request) => ({
        data: null as any,
        hit: false,
        strategy: request.strategy,
        storageKey: request.cacheKey,
        timestamp: new Date().toISOString(),
        error: error.message,
      }));
    }
  }

  /**
   * 处理批量缓存组（按策略分组）
   * 针对相同策略的请求进行批量优化
   */
  private async processBatchGroup<T>(
    strategy: CacheStrategy, 
    requests: CacheOrchestratorRequest<T>[]
  ): Promise<Array<{ result: CacheOrchestratorResult<T>; originalIndex: number }>> {
    const results: Array<{ result: CacheOrchestratorResult<T>; originalIndex: number }> = [];

    // 处理NO_CACHE策略：并行执行所有fetchFn
    if (strategy === CacheStrategy.NO_CACHE) {
      const promises = requests.map(async (request) => {
        try {
          const data = await request.fetchFn();
          return {
            result: {
              data,
              hit: false,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
            },
            originalIndex: (request as any).originalIndex,
          };
        } catch (error) {
          this.logger.error(`NO_CACHE fetch failed for key: ${request.cacheKey}`, error);
          return {
            result: {
              data: null as any,
              hit: false,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
              error: error.message,
            },
            originalIndex: (request as any).originalIndex,
          };
        }
      });

      return await Promise.all(promises);
    }

    // 对于其他策略，尝试使用批量缓存API（如果StorageService支持）
    try {
      // 收集所有符号用于市场状态查询（优化：一次查询多个市场）
      const allSymbols = requests.flatMap(req => req.symbols);
      const uniqueSymbols = [...new Set(allSymbols)];

      // 获取统一的缓存选项（对于相同策略的请求）
      const cacheOptions = await this.mapStrategyToOptionsAsync(strategy, uniqueSymbols);

      // 准备批量请求
      const batchRequests = requests.map(request => ({
        key: request.cacheKey,
        fetchFn: request.fetchFn,
        options: cacheOptions,
      }));

      // 调用StorageService的批量API
      const batchResults = await this.storageService.batchGetWithSmartCache(batchRequests);

      // 转换结果格式
      batchResults.forEach((cacheResult, index) => {
        const originalRequest = requests[index];
        
        results.push({
          result: {
            data: cacheResult.data as T,
            hit: cacheResult.hit,
            ttlRemaining: cacheResult.metadata?.ttlRemaining,
            dynamicTtl: cacheResult.metadata?.dynamicTtl,
            strategy: originalRequest.strategy,
            storageKey: cacheResult.metadata?.key || originalRequest.cacheKey,
            timestamp: cacheResult.metadata?.generatedAt || new Date().toISOString(),
          },
          originalIndex: (originalRequest as any).originalIndex,
        });
      });

    } catch (error) {
      this.logger.warn(`Batch cache API failed for strategy ${strategy}, falling back to individual requests:`, error);
      
      // Fallback：逐个处理请求
      for (const request of requests) {
        try {
          const individualResult = await this.getDataWithSmartCache(request);
          results.push({
            result: individualResult,
            originalIndex: (request as any).originalIndex,
          });
        } catch (individualError) {
          this.logger.error(`Individual cache request failed for key: ${request.cacheKey}`, individualError);
          results.push({
            result: {
              data: null as any,
              hit: false,
              strategy: request.strategy,
              storageKey: request.cacheKey,
              timestamp: new Date().toISOString(),
              error: individualError.message,
            },
            originalIndex: (request as any).originalIndex,
          });
        }
      }
    }

    return results;
  }

  /**
   * 批量处理后台更新触发
   * 对需要后台更新的请求进行批量调度
   */
  private async batchScheduleBackgroundUpdates<T>(
    results: CacheOrchestratorResult<T>[], 
    originalRequests: CacheOrchestratorRequest<T>[]
  ): Promise<void> {
    if (!this.config.enableBackgroundUpdate) {
      return;
    }

    const updateTasks: Array<{
      cacheKey: string;
      symbols: string[];
      fetchFn: () => Promise<T>;
      priority: number;
    }> = [];

    results.forEach((result, index) => {
      const originalRequest = originalRequests[index];
      
      if (result.hit && this.shouldScheduleBackgroundUpdate(result.strategy, { metadata: result })) {
        const priority = this.calculateUpdatePriority(
          originalRequest.symbols, 
          originalRequest.metadata?.market
        );
        
        updateTasks.push({
          cacheKey: originalRequest.cacheKey,
          symbols: originalRequest.symbols,
          fetchFn: originalRequest.fetchFn,
          priority,
        });
      }
    });

    // 批量调度后台更新任务
    updateTasks.forEach(task => {
      this.scheduleBackgroundUpdate(
        task.cacheKey,
        task.symbols,
        task.fetchFn,
        task.priority
      );
    });

    if (updateTasks.length > 0) {
      this.logger.debug(`Scheduled ${updateTasks.length} background update tasks from batch operation`);
    }
  }

  /**
   * 策略映射：同步版本
   * 将CacheStrategy转换为StorageService可识别的SmartCacheOptionsDto
   * 注意：策略映射对象不传keyPrefix字段，避免与cacheKey双重命名空间
   */
  mapStrategyToOptions(strategy: CacheStrategy, symbols: string[] = []): SmartCacheOptionsDto {
    const strategyConfig = this.config.strategies[strategy];
    
    if (!strategyConfig) {
      throw new Error(`Unknown cache strategy: ${strategy}`);
    }

    const options: SmartCacheOptionsDto = {
      symbols,
      forceRefresh: false,
      // 🚨注意: 不传keyPrefix字段，避免与cacheKey双重命名空间
    };

    switch (strategy) {
      case CacheStrategy.STRONG_TIMELINESS:
        const strongConfig = strategyConfig as any;
        options.minCacheTtl = Math.min(strongConfig.ttl, strongConfig.forceRefreshInterval);
        options.maxCacheTtl = strongConfig.forceRefreshInterval;
        break;

      case CacheStrategy.WEAK_TIMELINESS:
        const weakConfig = strategyConfig as any;
        options.minCacheTtl = weakConfig.ttl;
        options.maxCacheTtl = weakConfig.ttl;
        break;

      case CacheStrategy.NO_CACHE:
        options.forceRefresh = true;
        options.minCacheTtl = 0;
        options.maxCacheTtl = 0;
        break;

      case CacheStrategy.ADAPTIVE:
        const adaptiveConfig = strategyConfig as any;
        options.minCacheTtl = adaptiveConfig.minTtl;
        options.maxCacheTtl = adaptiveConfig.maxTtl;
        break;

      case CacheStrategy.MARKET_AWARE:
        // 市场感知策略需要异步处理，这里使用基础值
        const marketConfig = strategyConfig as any;
        options.minCacheTtl = marketConfig.openMarketTtl;
        options.maxCacheTtl = marketConfig.closedMarketTtl;
        break;

      default:
        throw new Error(`Unsupported cache strategy: ${strategy}`);
    }

    this.logger.debug(`Mapped strategy ${strategy} to options:`, options);
    return options;
  }

  /**
   * 策略映射：异步版本（用于市场感知策略）
   * 查询市场状态后动态调整TTL
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async mapStrategyToOptionsAsync(strategy: CacheStrategy, symbols: string[], _metadata?: any): Promise<SmartCacheOptionsDto> {
    // 对于非市场感知策略，直接使用同步映射
    if (strategy !== CacheStrategy.MARKET_AWARE) {
      return this.mapStrategyToOptions(strategy, symbols);
    }

    // 市场感知策略需要查询市场状态
    const marketStatus = await this.getMarketStatusForSymbols(symbols);
    const options = this.mapStrategyToOptions(strategy, symbols);
    
    // 将市场状态添加到选项中
    options.marketStatus = marketStatus.marketStatus;

    // 根据市场状态动态调整TTL
    const marketConfig = this.config.strategies[CacheStrategy.MARKET_AWARE] as any;
    const isAnyMarketOpen = Object.values(marketStatus.marketStatus).some(status => status.status === 'TRADING');
    
    if (isAnyMarketOpen) {
      // 开市时使用短TTL
      options.minCacheTtl = marketConfig.openMarketTtl;
      options.maxCacheTtl = marketConfig.openMarketTtl;
    } else {
      // 闭市时使用长TTL
      options.minCacheTtl = marketConfig.closedMarketTtl;
      options.maxCacheTtl = marketConfig.closedMarketTtl;
    }

    this.logger.debug(`Market-aware strategy mapped for symbols ${symbols.join(',')}:`, {
      isAnyMarketOpen,
      ttl: options.minCacheTtl,
    });

    return options;
  }

  /**
   * 获取符号列表对应的市场状态
   * 返回Record<Market, MarketStatusResult>格式（Market为强类型枚举）
   */
  async getMarketStatusForSymbols(symbols: string[]): Promise<MarketStatusQueryResult> {
    try {
      // 检查缓存的市场状态（避免频繁查询）
      const cacheValidDuration = this.config.strategies[CacheStrategy.MARKET_AWARE].marketStatusCheckInterval * 1000;
      
      if (this.lastMarketStatusQuery && 
          (Date.now() - new Date(this.lastMarketStatusQuery.timestamp).getTime()) < cacheValidDuration) {
        return this.lastMarketStatusQuery;
      }

      // 从符号推断涉及的市场
      const markets = new Set<Market>();
      symbols.forEach(symbol => {
        const market = this.inferMarketFromSymbol(symbol);
        markets.add(market);
      });

      // 查询各市场状态
      const marketStatus: Record<Market, MarketStatusResult> = {} as any;
      
      for (const market of markets) {
        try {
          const status = await this.marketStatusService.getMarketStatus(market);
          marketStatus[market] = status;
        } catch (error) {
          this.logger.warn(`Failed to get market status for ${market}:`, error);
          // 默认为闭市状态
          marketStatus[market] = {
            market: market as Market,
            status: MarketStatus.CLOSED,
            currentTime: new Date(),
            marketTime: new Date(),
            timezone: 'UTC',
            realtimeCacheTTL: 300, // 默认5分钟缓存
            analyticalCacheTTL: 1800, // 默认30分钟缓存
            isHoliday: false,
            isDST: false,
            confidence: 0.5, // 低置信度
          };
        }
      }

      const result: MarketStatusQueryResult = {
        marketStatus,
        timestamp: new Date().toISOString(),
        success: true,
      };

      // 缓存结果
      this.lastMarketStatusQuery = result;
      
      return result;
      
    } catch (error) {
      this.logger.error('Failed to get market status for symbols:', error);
      
      // 返回失败结果，默认所有市场闭市
      return {
        marketStatus: {} as Record<Market, MarketStatusResult>,
        timestamp: new Date().toISOString(),
        success: false,
      };
    }
  }

  /**
   * 从单个符号推断市场
   * 复用cache-request.utils.ts中的实现逻辑
   */
  private inferMarketFromSymbol(symbol: string): Market {
    const upperSymbol = symbol.toUpperCase().trim();

    // 香港市场: .HK 后缀或5位数字
    if (upperSymbol.includes(".HK") || /^\d{5}$/.test(upperSymbol)) {
      return Market.HK;
    }

    // 美国市场: 1-5位字母
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return Market.US;
    }

    // 深圳市场: .SZ 后缀或 00/30 前缀
    if (
      upperSymbol.includes(".SZ") ||
      ["00", "30"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SZ;
    }

    // 上海市场: .SH 后缀或 60/68 前缀
    if (
      upperSymbol.includes(".SH") ||
      ["60", "68"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SH;
    }

    // 默认美股
    return Market.US;
  }

  /**
   * 调度后台更新任务
   * TTL节流、去重检查、并发限制
   */
  scheduleBackgroundUpdate<T>(
    cacheKey: string,
    symbols: string[],
    fetchFn: () => Promise<T>,
    priority?: number
  ): void {
    // 检查是否正在关闭
    if (this.isShuttingDown) {
      this.logger.debug(`Skipping background update for ${cacheKey} - service is shutting down`);
      return;
    }

    // 检查是否启用后台更新
    if (!this.config.enableBackgroundUpdate) {
      this.logger.debug(`Background updates disabled, skipping ${cacheKey}`);
      return;
    }

    // 去重检查：如果已有相同cacheKey的任务在队列中，跳过
    if (this.backgroundUpdateTasks.has(cacheKey)) {
      this.logger.debug(`Background update already scheduled for ${cacheKey}, skipping duplicate`);
      return;
    }

    // 计算最小更新间隔进行TTL节流
    const minInterval = this.getMinUpdateInterval(symbols);
    const now = Date.now();
    
    // 检查该cacheKey的上次更新时间（防止频繁更新）
    const lastUpdateKey = `last_update_${cacheKey}`;
    const lastUpdateTime = this.getLastUpdateTime(lastUpdateKey);
    
    if (lastUpdateTime && (now - lastUpdateTime) < minInterval) {
      this.logger.debug(`TTL throttling: skipping ${cacheKey}, last update too recent`);
      return;
    }

    // 并发限制检查
    if (this.activeTaskCount >= this.config.maxConcurrentUpdates) {
      this.logger.debug(`Max concurrent updates reached (${this.config.maxConcurrentUpdates}), queuing ${cacheKey}`);
    }

    // 计算优先级
    const taskPriority = priority !== undefined ? priority : this.calculateUpdatePriority(symbols);

    // 创建后台更新任务
    const task: BackgroundUpdateTask = {
      taskId: `${cacheKey}_${Date.now()}`,
      cacheKey,
      symbols,
      fetchFn,
      priority: taskPriority,
      createdAt: now,
      scheduledAt: now, // 立即调度
      retryCount: 0,
      maxRetries: 3, // 最大重试3次
      status: 'pending',
      market: symbols.length > 0 ? this.inferMarketFromSymbol(symbols[0]) : undefined,
    };

    // 添加到任务管理Map和队列
    this.backgroundUpdateTasks.set(cacheKey, task);
    this.updateQueue.push(task);

    // 记录当前调度时间
    this.setLastUpdateTime(lastUpdateKey, now);

    this.logger.debug(`Scheduled background update for ${cacheKey}`, {
      priority: taskPriority,
      queueLength: this.updateQueue.length,
      activeTaskCount: this.activeTaskCount,
    });
  }

  /**
   * 获取策略对应的最小更新间隔
   * 基于策略配置和全局配置计算
   */
  getMinUpdateInterval(symbols: string[]): number {
    // 从符号推断主要市场
    const primaryMarket = symbols.length > 0 ? this.inferMarketFromSymbol(symbols[0]) : Market.US;
    
    // 基础间隔使用全局配置
    let baseInterval = this.config.defaultMinUpdateInterval;

    // 根据市场类型调整间隔（优化：不同市场可能有不同的更新频率需求）
    switch (primaryMarket) {
      case Market.US:
        // 美股市场，保持基础间隔
        break;
      case Market.HK:
        // 港股市场，略微降低频率
        baseInterval = Math.max(baseInterval, 45000); // 最少45秒
        break;
      case Market.SZ:
      case Market.SH:
        // A股市场，降低频率
        baseInterval = Math.max(baseInterval, 60000); // 最少60秒
        break;
      default:
        break;
    }

    return baseInterval;
  }

  /**
   * 获取上次更新时间
   * 使用简单的内存存储，实际生产中可以考虑持久化
   */
  private lastUpdateTimes = new Map<string, number>();

  private getLastUpdateTime(key: string): number | undefined {
    return this.lastUpdateTimes.get(key);
  }

  private setLastUpdateTime(key: string, time: number): void {
    this.lastUpdateTimes.set(key, time);
    
    // 清理过期的记录（保留最近1小时的记录）
    const oneHourAgo = time - 3600000;
    for (const [k, t] of this.lastUpdateTimes.entries()) {
      if (t < oneHourAgo) {
        this.lastUpdateTimes.delete(k);
      }
    }
  }

  /**
   * 计算更新任务优先级
   * 迁移Query现有"基础分值+市场权重+随机微扰"逻辑
   * 确保指标口径不变（queryBackgroundTasksActive/Completed/Failed）
   */
  calculateUpdatePriority(symbols: string[], market?: Market): number {
    // 基础优先级分值
    let priority = 1;
    
    // 推断主要市场（如果未提供）
    const primaryMarket = market || (symbols.length > 0 ? this.inferMarketFromSymbol(symbols[0]) : Market.US);
    
    // 市场权重：美股 > 港股 > A股（保持与Query现有逻辑一致）
    switch (primaryMarket) {
      case Market.US:
        priority += 3; // 美股优先级最高
        break;
      case Market.HK:
        priority += 2; // 港股优先级中等
        break;
      case Market.SZ:
      case Market.SH:
        priority += 1; // A股优先级较低
        break;
      default:
        priority += 1; // 其他市场默认较低优先级
        break;
    }
    
    // 符号数量影响：更多符号的批量请求优先级略高
    if (symbols.length > 1) {
      priority += Math.min(symbols.length * 0.1, 1); // 最多增加1分
    }
    
    // 随机微扰避免饥饿（保持与Query现有逻辑一致）
    priority += Math.random() * 0.1;
    
    this.logger.debug(`Calculated priority for symbols ${symbols.join(',')}:`, {
      symbols: symbols.length,
      market: primaryMarket,
      finalPriority: priority,
    });
    
    return priority;
  }
}