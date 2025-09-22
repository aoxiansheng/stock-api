/**
 * StreamBatchProcessor - 专职批处理服务
 *
 * 从 StreamReceiverService 中分离出来的批处理逻辑，负责：
 * 1. 批量数据处理和管道化
 * 2. 动态批处理间隔优化
 * 3. 批处理统计和监控
 * 4. 降级处理策略
 * 5. 断路器模式实现
 */

import { Injectable, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";
import { Subject } from "rxjs";
import { bufferTime, filter, mergeMap } from "rxjs/operators";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import { DataTransformerService } from "../../../02-processing/transformer/services/data-transformer.service";
import { DataTransformRequestDto } from "../../../02-processing/transformer/dto/data-transform-request.dto";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
} from "../config/stream-receiver.config";

import {
  QuoteData,
  BatchProcessingStats,
  DynamicBatchingState,
  DynamicBatchingMetrics,
  BatchProcessingCallbacks,
  IBatchProcessor,
  StreamPipelineMetrics,
  FallbackAnalysisResult,
  PartialRecoveryResult,
} from "../interfaces/batch-processing.interface";

@Injectable()
export class StreamBatchProcessorService implements OnModuleDestroy, IBatchProcessor {
  private readonly logger = createLogger("StreamBatchProcessor");
  private readonly config: StreamReceiverConfig;

  // RxJS 批量处理管道
  private quoteBatchSubject = new Subject<QuoteData>();
  private adjustmentTimer?: NodeJS.Timeout;

  // 并发安全的批量处理统计
  private batchProcessingStats: BatchProcessingStats = {
    totalBatches: 0,
    totalQuotes: 0,
    batchProcessingTime: 0,
    totalFallbacks: 0,
    partialRecoverySuccess: 0,
  };

  // 动态批处理优化状态
  private dynamicBatchingState: DynamicBatchingState = {
    enabled: false,
    currentInterval: 50,
    lastAdjustment: Date.now(),
    adjustmentCount: 0,
    loadSamples: [],
  };

  // 动态批处理性能指标
  private dynamicBatchingMetrics: DynamicBatchingMetrics = {
    averageLoadPer5s: 0,
    loadTrend: "stable",
    throughputPerSecond: 0,
    batchCountInWindow: 0,
  };

  // 断路器状态
  private circuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  // 回调函数存储
  private callbacks?: BatchProcessingCallbacks;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventEmitter2,
    private readonly dataTransformerService: DataTransformerService,
  ) {
    // 初始化配置
    this.config = this.initializeConfig();

    this.logger.log("StreamBatchProcessor 初始化完成", {
      config: {
        batchProcessingInterval: this.config.batchProcessingInterval,
        dynamicBatching: this.config.dynamicBatching.enabled,
        maxRetryAttempts: this.config.maxRetryAttempts,
      }
    });

    // 初始化批处理管道
    this.initializeBatchProcessingPipeline();

    // 初始化动态批处理优化
    this.initializeDynamicBatching();
  }

  /**
   * 初始化配置
   */
  private initializeConfig(): StreamReceiverConfig {
    const batchProcessingInterval = this.configService.get<number>(
      "STREAM_RECEIVER_BATCH_INTERVAL",
      defaultStreamReceiverConfig.batchProcessingInterval,
    );

    const dynamicBatchingEnabled = this.configService.get<boolean>(
      "STREAM_RECEIVER_DYNAMIC_BATCHING_ENABLED",
      defaultStreamReceiverConfig.dynamicBatching.enabled,
    );

    return {
      ...defaultStreamReceiverConfig,
      batchProcessingInterval,
      dynamicBatching: {
        ...defaultStreamReceiverConfig.dynamicBatching,
        enabled: dynamicBatchingEnabled,
      },
    };
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: BatchProcessingCallbacks): void {
    this.callbacks = callbacks;
    this.logger.debug("批处理回调函数已设置");
  }

  /**
   * 初始化批处理管道
   */
  private initializeBatchProcessingPipeline(): void {
    const batchInterval = this.config.dynamicBatching.enabled
      ? this.dynamicBatchingState.currentInterval
      : this.config.batchProcessingInterval;

    this.quoteBatchSubject
      .pipe(
        // 使用配置化的批处理间隔 + 200条缓冲上限，严格满足SLA且内存安全
        bufferTime(batchInterval, undefined, 200),
        filter((batch) => batch.length > 0),
        mergeMap(async (batch) => this.processBatch(batch)),
      )
      .subscribe({
        next: () => {
          // 如果启用了动态批处理，更新负载统计
          if (this.config.dynamicBatching.enabled) {
            this.updateDynamicBatchingMetrics();
          }
        },
        error: (error) => {
          this.logger.error("批处理管道错误", {
            error: error.message,
            currentInterval: batchInterval,
          });
        },
      });

    this.logger.log("批处理管道已初始化", {
      interval: `${batchInterval}ms`,
      bufferLimit: 200,
      dynamicEnabled: this.config.dynamicBatching.enabled,
    });
  }

  /**
   * 初始化动态批处理间隔优化
   */
  private initializeDynamicBatching(): void {
    if (!this.config.dynamicBatching.enabled) {
      this.logger.log("动态批处理优化已禁用");
      return;
    }

    this.dynamicBatchingState.enabled = true;
    this.dynamicBatchingState.currentInterval =
      this.config.batchProcessingInterval;

    // 启动调整定时器
    this.adjustmentTimer = setInterval(() => {
      this.adjustBatchInterval();
    }, this.config.dynamicBatching.loadDetection.adjustmentFrequency);

    this.logger.log("动态批处理间隔优化已启用", {
      baseInterval: this.config.batchProcessingInterval,
      adjustmentFrequency: this.config.dynamicBatching.loadDetection.adjustmentFrequency,
    });
  }

  /**
   * 调整批处理间隔 - 基于负载检测
   */
  private adjustBatchInterval(): void {
    if (!this.dynamicBatchingState.enabled) return;

    const { loadDetection } = this.config.dynamicBatching;
    const { loadSamples } = this.dynamicBatchingState;

    if (loadSamples.length < loadDetection.sampleWindow) {
      return; // 样本不足，跳过调整
    }

    // 计算平均负载
    const averageLoad = loadSamples.reduce((sum, load) => sum + load, 0) / loadSamples.length;
    this.dynamicBatchingMetrics.averageLoadPer5s = averageLoad;

    // 确定负载趋势
    const recentSamples = loadSamples.slice(-Math.min(5, loadSamples.length));
    const oldSamples = loadSamples.slice(0, Math.min(5, loadSamples.length));
    const recentAvg = recentSamples.reduce((sum, load) => sum + load, 0) / recentSamples.length;
    const oldAvg = oldSamples.reduce((sum, load) => sum + load, 0) / oldSamples.length;

    if (recentAvg > oldAvg * 1.1) {
      this.dynamicBatchingMetrics.loadTrend = "increasing";
    } else if (recentAvg < oldAvg * 0.9) {
      this.dynamicBatchingMetrics.loadTrend = "decreasing";
    } else {
      this.dynamicBatchingMetrics.loadTrend = "stable";
    }

    let newInterval = this.dynamicBatchingState.currentInterval;

    // 根据负载调整间隔
    if (averageLoad > loadDetection.highLoadThreshold) {
      // 高负载：降低间隔，提高响应速度
      newInterval = Math.max(
        this.config.dynamicBatching.minInterval,
        this.dynamicBatchingState.currentInterval - loadDetection.adjustmentStep,
      );
    } else if (averageLoad < loadDetection.lowLoadThreshold) {
      // 低负载：提高间隔，节省资源
      newInterval = Math.min(
        this.config.dynamicBatching.maxInterval,
        this.dynamicBatchingState.currentInterval + loadDetection.adjustmentStep,
      );
    }

    if (newInterval !== this.dynamicBatchingState.currentInterval) {
      this.dynamicBatchingState.currentInterval = newInterval;
      this.dynamicBatchingState.lastAdjustment = Date.now();
      this.dynamicBatchingState.adjustmentCount++;

      // 重新初始化批处理管道 - 使用新的间隔
      this.reinitializeBatchPipeline();

      this.logger.log("批处理间隔已调整", {
        oldInterval: this.dynamicBatchingState.currentInterval,
        newInterval: newInterval,
        averageLoad: averageLoad,
        loadTrend: this.dynamicBatchingMetrics.loadTrend,
      });

      // 记录调整指标
      this.recordBatchIntervalAdjustment(newInterval, averageLoad);
    }

    // 清理旧样本，保持窗口大小
    this.dynamicBatchingState.loadSamples = loadSamples.slice(
      -loadDetection.sampleWindow,
    );
  }

  /**
   * 重新初始化批处理管道 - 使用新的间隔
   */
  private reinitializeBatchPipeline(): void {
    try {
      // 关闭旧的Subject
      if (this.quoteBatchSubject && !this.quoteBatchSubject.closed) {
        this.quoteBatchSubject.complete();
      }

      // 创建新的Subject
      this.quoteBatchSubject = new Subject<QuoteData>();

      // 使用新的间隔初始化批处理管道
      this.quoteBatchSubject
        .pipe(
          bufferTime(
            this.dynamicBatchingState.currentInterval,
            undefined,
            200,
          ),
          filter((batch) => batch.length > 0),
          mergeMap(async (batch) => this.processBatch(batch)),
        )
        .subscribe({
          next: () => {
            this.updateDynamicBatchingMetrics();
          },
          error: (error) => {
            this.logger.error("动态批处理管道错误", {
              error: error.message,
              currentInterval: this.dynamicBatchingState.currentInterval,
            });
          },
        });
    } catch (error) {
      this.logger.error("重新初始化批处理管道失败", {
        error: error.message,
        currentInterval: this.dynamicBatchingState.currentInterval,
      });
    }
  }

  /**
   * 更新动态批处理性能指标
   */
  private updateDynamicBatchingMetrics(): void {
    // 计算当前5秒窗口内的吞吐量
    const now = Date.now();
    const windowSize = this.config.dynamicBatching.loadDetection.adjustmentFrequency;

    if (now - (this.dynamicBatchingState.lastAdjustment || 0) >= windowSize) {
      const batchesPerSecond =
        (this.dynamicBatchingMetrics.batchCountInWindow *
          1000) /
        windowSize;

      this.dynamicBatchingState.loadSamples.push(batchesPerSecond);

      this.dynamicBatchingMetrics.throughputPerSecond = batchesPerSecond;
      // 重置窗口计数
      this.dynamicBatchingMetrics.batchCountInWindow = 0;
    }

    this.dynamicBatchingMetrics.batchCountInWindow++;
  }

  /**
   * 记录批处理间隔调整的性能指标
   */
  private recordBatchIntervalAdjustment(
    newInterval: number,
    averageLoad: number,
  ): void {
    try {
      // 发送监控事件
      this.callbacks?.emitMonitoringEvent("batch_interval_adjusted", newInterval, {
        previousInterval: this.dynamicBatchingState.currentInterval,
        averageLoad,
        loadTrend: this.dynamicBatchingMetrics.loadTrend,
        adjustmentCount: this.dynamicBatchingState.adjustmentCount,
      });

      // 记录详细的动态批处理指标
      this.callbacks?.emitMonitoringEvent(
        "dynamic_batching_adjusted",
        this.dynamicBatchingMetrics.throughputPerSecond,
        {
          metrics: this.dynamicBatchingMetrics,
          state: this.dynamicBatchingState,
          config: this.config.dynamicBatching,
        },
      );
    } catch (error) {
      this.logger.warn("记录批处理调整指标失败", { error: error.message });
    }
  }

  /**
   * 获取动态批处理状态信息
   */
  getDynamicBatchingState(): {
    state: DynamicBatchingState;
    metrics: DynamicBatchingMetrics;
  } {
    return {
      state: { ...this.dynamicBatchingState },
      metrics: { ...this.dynamicBatchingMetrics },
    };
  }

  /**
   * 添加批量数据到处理队列
   */
  addQuoteData(quoteData: QuoteData): void {
    if (this.quoteBatchSubject.closed) {
      this.logger.warn("批处理管道已关闭，无法添加数据", {
        provider: quoteData.providerName,
        capability: quoteData.wsCapabilityType,
      });
      return;
    }

    this.quoteBatchSubject.next(quoteData);
  }

  /**
   * 处理批量数据 - 主入口
   */
  private async processBatch(batch: QuoteData[]): Promise<void> {
    await this.processBatchWithRecovery(batch);
  }

  /**
   * 带重试和降级的批量处理
   */
  private async processBatchWithRecovery(batch: QuoteData[]): Promise<void> {
    // 检查断路器状态
    if (this.isCircuitBreakerOpen()) {
      this.logger.warn("断路器开启，跳过批量处理", { batchSize: batch.length });
      await this.fallbackProcessing(batch, "circuit_breaker_open");
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        await this.processBatchInternal(batch);

        // 成功处理，更新断路器状态
        this.recordCircuitBreakerSuccess();
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`批量处理失败，尝试 ${attempt}/${this.config.maxRetryAttempts}`, {
          error: error.message,
          batchSize: batch.length,
          attempt,
        });

        // 记录失败
        this.recordCircuitBreakerFailure();

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.config.maxRetryAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // 所有重试都失败，进入降级处理
    this.logger.error("批量处理彻底失败，进入降级模式", {
      batchSize: batch.length,
      attempts: this.config.maxRetryAttempts,
      lastError: lastError?.message,
    });

    await this.fallbackProcessing(batch, lastError?.message || "unknown_error");
  }

  /**
   * 内部批量处理逻辑 (可重试的核心逻辑)
   */
  private async processBatchInternal(batch: QuoteData[]): Promise<void> {
    const startTime = Date.now();

    // 按提供商和能力分组
    const groupedBatch = this.groupBatchByProviderCapability(batch);

    // 并行处理每个组
    const processingPromises = Object.entries(groupedBatch).map(
      async ([key, quotes]) => {
        const [provider, capability] = key.split(":");
        return this.processQuoteGroup(quotes, provider, capability);
      },
    );

    await Promise.all(processingPromises);

    const processingTimeMs = Date.now() - startTime;
    await this.updateBatchStatsThreadSafe(batch.length, processingTimeMs);

    // 记录批处理监控指标
    this.recordBatchProcessingMetrics(
      batch.length,
      processingTimeMs,
    );

    this.logger.debug("批量处理完成", {
      batchSize: batch.length,
      processingTimeMs,
      groupsCount: Object.keys(groupedBatch).length,
    });
  }

  /**
   * 按提供商和能力分组批量数据
   */
  private groupBatchByProviderCapability(
    batch: QuoteData[],
  ): Record<string, QuoteData[]> {
    const groups: Record<string, QuoteData[]> = {};

    batch.forEach((quote) => {
      const key = `${quote.providerName}:${quote.wsCapabilityType}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(quote);
    });

    return groups;
  }

  /**
   * 处理报价组
   */
  private async processQuoteGroup(
    quotes: QuoteData[],
    provider: string,
    capability: string,
  ): Promise<void> {
    try {
      // 使用统一的管道化数据处理
      await this.processDataThroughPipeline(quotes, provider, capability);
    } catch (error) {
      this.logger.error("报价组处理失败", {
        provider,
        capability,
        quotesCount: quotes.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 统一的管道化数据处理
   */
  private async processDataThroughPipeline(
    quotes: QuoteData[],
    provider: string,
    capability: string,
  ): Promise<void> {
    if (!this.callbacks) {
      throw new Error("BatchProcessingCallbacks 未设置");
    }

    const pipelineStartTime = Date.now();

    try {
      this.logger.debug("开始管道化数据处理", {
        provider,
        capability,
        quotesCount: quotes.length,
        pipelineId: `${provider}_${capability}_${pipelineStartTime}`,
      });

      // Step 1: 数据转换
      const transformStartTime = Date.now();
      const dataTransformRequestDto: DataTransformRequestDto = {
        provider: provider,
        apiType: "stream" as const,
        transDataRuleListType: this.mapCapabilityToTransformRuleType(capability),
        rawData: quotes.map((q) => q.rawData),
      };

      const transformedData = await this.dataTransformerService.transform(
        dataTransformRequestDto,
      );
      const transformDuration = Date.now() - transformStartTime;

      if (!transformedData?.transformedData) {
        this.logger.warn("数据转换返回空结果", {
          provider,
          capability,
          quotesCount: quotes.length,
        });
        return;
      }

      // Step 2: 标准化转换结果
      const dataArray = Array.isArray(transformedData.transformedData)
        ? transformedData.transformedData
        : [transformedData.transformedData];

      // Step 3: 提取符号信息
      const symbolsSet = new Set<string>();
      quotes.forEach((quote) => {
        quote.symbols.forEach((symbol) => symbolsSet.add(symbol));
      });
      const rawSymbols = Array.from(symbolsSet);

      // Step 4: 符号标准化
      const standardizedSymbols = await this.callbacks.ensureSymbolConsistency(
        rawSymbols,
        provider,
      );

      // Step 5: 缓存数据
      const cacheStartTime = Date.now();
      await this.callbacks.pipelineCacheData(dataArray, standardizedSymbols);
      const cacheDuration = Date.now() - cacheStartTime;

      // Step 6: 广播数据
      const broadcastStartTime = Date.now();
      await this.callbacks.pipelineBroadcastData(dataArray, standardizedSymbols);
      const broadcastDuration = Date.now() - broadcastStartTime;

      // Step 7: 性能监控埋点
      const totalDuration = Date.now() - pipelineStartTime;
      this.callbacks.recordStreamPipelineMetrics({
        provider,
        capability,
        quotesCount: quotes.length,
        symbolsCount: standardizedSymbols.length,
        durations: {
          total: totalDuration,
          transform: transformDuration,
          cache: cacheDuration,
          broadcast: broadcastDuration,
        },
      });

      this.logger.debug("管道化数据处理完成", {
        provider,
        capability,
        quotesCount: quotes.length,
        symbolsCount: standardizedSymbols.length,
        totalDuration,
        stages: {
          transform: transformDuration,
          cache: cacheDuration,
          broadcast: broadcastDuration,
        },
      });
    } catch (error) {
      const errorDuration = Date.now() - pipelineStartTime;

      this.logger.error("管道化数据处理失败", {
        provider,
        capability,
        quotesCount: quotes.length,
        error: error.message,
        duration: errorDuration,
      });

      // 记录错误指标
      this.callbacks.recordPipelineError(
        provider,
        capability,
        error.message,
        errorDuration,
      );

      throw error;
    }
  }

  /**
   * 健壮的能力映射
   */
  private mapCapabilityToTransformRuleType(capability: string): string {
    const capabilityMappingTable: Record<string, string> = {
      // WebSocket 流能力映射
      "ws-stock-quote": "quote_fields",
      "ws-option-quote": "option_fields",
      "ws-futures-quote": "futures_fields",
      "ws-forex-quote": "forex_fields",
      "ws-crypto-quote": "crypto_fields",

      // REST API 能力映射
      [API_OPERATIONS.STOCK_DATA.GET_QUOTE]: "quote_fields",
      "get-option-quote": "option_fields",
      "get-futures-quote": "futures_fields",
      "get-forex-quote": "forex_fields",
      "get-crypto-quote": "crypto_fields",

      // 实时数据流能力
      [API_OPERATIONS.STOCK_DATA.STREAM_QUOTE]: "quote_fields",
      "stream-option-quote": "option_fields",
      "stream-market-data": "market_data_fields",
      "stream-trading-data": "trading_data_fields",

      // 基础信息能力
      "get-stock-info": "basic_info_fields",
    };

    const ruleType = capabilityMappingTable[capability];
    if (!ruleType) {
      this.logger.warn(`未知的能力类型: ${capability}，使用默认映射 quote_fields`);
      return "quote_fields";
    }

    return ruleType;
  }

  /**
   * 智能降级处理策略
   */
  private async fallbackProcessing(
    batch: QuoteData[],
    reason: string,
  ): Promise<void> {
    const fallbackStartTime = Date.now();

    // 记录降级事件监控指标
    this.recordFallbackMetrics(batch, reason);

    try {
      this.logger.log("开始降级处理", {
        batchSize: batch.length,
        reason,
      });

      // 分析批次数据
      const analyzeResult = this.analyzeBatchForFallback(batch);

      // 尝试智能部分恢复
      const partialRecoveryResult = await this.attemptPartialRecovery(batch, reason);

      // 更新降级统计
      await this.updateFallbackStatsThreadSafe(
        batch.length,
        Date.now() - fallbackStartTime,
        partialRecoveryResult.attempted,
      );

      // 发送降级事件
      this.emitFallbackEvent(batch, reason, analyzeResult, partialRecoveryResult);

      this.logger.log("降级处理完成", {
        batchSize: batch.length,
        reason,
        partialRecoveryAttempted: partialRecoveryResult.attempted,
        partialRecoverySuccess: partialRecoveryResult.successCount,
      });
    } catch (fallbackError) {
      this.logger.error("降级处理失败", {
        batchSize: batch.length,
        reason,
        fallbackError: fallbackError.message,
      });

      this.recordFallbackFailureMetrics(batch, reason, fallbackError.message);
    }
  }

  /**
   * 分析批次数据用于降级处理
   */
  private analyzeBatchForFallback(batch: QuoteData[]): FallbackAnalysisResult {
    const symbols = new Set(batch.flatMap((quote) => quote.symbols));
    const providers = new Set(batch.map((quote) => quote.providerName));
    const capabilities = new Set(batch.map((quote) => quote.wsCapabilityType));

    const markets = new Set(
      batch.flatMap((quote) =>
        quote.symbols.map((symbol) => this.extractMarketFromSymbol(symbol)),
      ),
    );

    const avgTimestamp = batch.length > 0
      ? batch.reduce((sum, quote) => sum + quote.timestamp, 0) / batch.length
      : Date.now();

    return {
      symbolsCount: symbols.size,
      providersCount: providers.size,
      marketsCount: markets.size,
      capabilityTypes: Array.from(capabilities),
      avgTimestamp,
    };
  }

  /**
   * 从符号中提取市场信息
   */
  private extractMarketFromSymbol(symbol: string): string {
    if (symbol.includes(".HK")) return "HK";
    if (symbol.includes(".US")) return "US";
    if (symbol.includes(".SH")) return "SH";
    if (symbol.includes(".SZ")) return "SZ";
    return "UNKNOWN";
  }

  /**
   * 尝试智能部分恢复
   */
  private async attemptPartialRecovery(
    batch: QuoteData[],
    reason: string,
  ): Promise<PartialRecoveryResult> {
    // 如果是断路器开启或批次过大，跳过部分恢复
    if (reason === "circuit_breaker_open" || batch.length > 100) {
      return {
        attempted: false,
        successCount: 0,
        failureCount: batch.length,
      };
    }

    let successCount = 0;
    let failureCount = 0;

    try {
      // 优先处理重要的报价（如果有优先级标识）
      const priorityQuotes = batch.filter(quote =>
        quote.symbols.some(symbol =>
          symbol.includes(".HK") || symbol.includes(".US")
        )
      );

      const quotesToProcess = priorityQuotes.length > 0 ? priorityQuotes : batch.slice(0, 5);

      for (const quote of quotesToProcess) {
        try {
          await this.processSingleQuoteSimple(quote);
          successCount++;
        } catch (error) {
          failureCount++;
          this.logger.debug("单个报价降级处理失败", {
            provider: quote.providerName,
            capability: quote.wsCapabilityType,
            error: error.message,
          });
        }
      }

      return {
        attempted: true,
        successCount,
        failureCount,
      };
    } catch (error) {
      this.logger.warn("部分恢复尝试失败", { error: error.message });
      return {
        attempted: true,
        successCount,
        failureCount: batch.length - successCount,
      };
    }
  }

  /**
   * 简化的单项目处理
   */
  private async processSingleQuoteSimple(quote: QuoteData): Promise<void> {
    // 最简化的处理逻辑，仅记录关键信息
    this.logger.debug("降级模式下处理单个报价", {
      provider: quote.providerName,
      capability: quote.wsCapabilityType,
      symbolsCount: quote.symbols.length,
    });

    // 这里可以添加最基本的处理逻辑，如记录到日志或发送简化事件
  }

  /**
   * 更新包含降级信息的批处理统计
   */
  private async updateFallbackStatsThreadSafe(
    batchSize: number,
    processingTimeMs: number,
    partialRecoverySuccess: boolean,
  ): Promise<void> {
    try {
      // 更新基础统计
      await this.updateBatchStatsThreadSafe(batchSize, processingTimeMs);

      // 更新降级统计
      this.batchProcessingStats.totalFallbacks =
        (this.batchProcessingStats.totalFallbacks || 0) + 1;

      if (partialRecoverySuccess) {
        this.batchProcessingStats.partialRecoverySuccess =
          (this.batchProcessingStats.partialRecoverySuccess || 0) + 1;
      }
    } catch (error) {
      this.logger.warn("更新降级统计失败", { error: error.message });
    }
  }

  /**
   * 记录降级监控指标
   */
  private recordFallbackMetrics(batch: QuoteData[], reason: string): void {
    try {
      // 发送监控事件到事件总线
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ERROR_HANDLED, {
        timestamp: new Date(),
        source: "presenter",
        component: "StreamBatchProcessor",
        operation: "batch_processing_fallback",
        level: "warn",
        details: {
          fallbackType: "batch_processing",
          reason: reason,
          batchSize: batch.length,
          providers: Array.from(new Set(batch.map(q => q.providerName))),
          capabilities: Array.from(new Set(batch.map(q => q.wsCapabilityType))),
        },
      });
    } catch (error) {
      this.logger.warn("记录降级指标失败", {
        error: error.message,
        batchSize: batch.length,
      });
    }
  }

  /**
   * 记录降级失败指标
   */
  private recordFallbackFailureMetrics(
    batch: QuoteData[],
    reason: string,
    fallbackError: string,
  ): void {
    try {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CRITICAL_ERROR, {
        timestamp: new Date(),
        source: "presenter",
        component: "StreamBatchProcessor",
        operation: "batch_processing_fallback_failure",
        level: "error",
        details: {
          originalReason: reason,
          fallbackError: fallbackError,
          batchSize: batch.length,
        },
      });
    } catch (error) {
      this.logger.warn("记录降级失败指标失败", { error: error.message });
    }
  }

  /**
   * 发送降级事件
   */
  private emitFallbackEvent(
    batch: QuoteData[],
    reason: string,
    analyzeResult: any,
    partialRecoveryResult: any,
  ): void {
    try {
      this.eventBus.emit("stream.batch.fallback", {
        timestamp: new Date(),
        batchSize: batch.length,
        reason,
        analysis: analyzeResult,
        recovery: partialRecoveryResult,
      });
    } catch (error) {
      this.logger.warn("发送降级事件失败", { error: error.message });
    }
  }

  /**
   * 记录批处理性能指标
   */
  private recordBatchProcessingMetrics(
    batchSize: number,
    processingTimeMs: number,
  ): void {
    try {
      // 发送批处理性能事件
      this.callbacks?.emitMonitoringEvent("batch_processed", processingTimeMs, {
        batchSize,
        timestamp: Date.now(),
        avgTimePerQuote: batchSize > 0 ? processingTimeMs / batchSize : 0,
        throughputEstimate:
          batchSize > 0
            ? Math.round(
                (batchSize *
                  1000) /
                  processingTimeMs,
              )
            : 0,
      });
    } catch (error) {
      this.logger.warn(`批处理监控事件发送失败: ${error.message}`, {
        batchSize,
        processingTimeMs,
      });
    }
  }

  /**
   * 线程安全的统计更新
   */
  private async updateBatchStatsThreadSafe(
    batchSize: number,
    processingTimeMs: number,
  ): Promise<void> {
    const lockKey = "batchStats";

    try {
      // 简单的统计更新，不使用分布式锁
      this.batchProcessingStats.totalBatches++;
      this.batchProcessingStats.totalQuotes += batchSize;
      this.batchProcessingStats.batchProcessingTime += processingTimeMs;
    } catch (error) {
      this.logger.warn("更新批处理统计失败", {
        error: error.message,
        batchSize,
        processingTimeMs,
      });
    }
  }

  /**
   * 获取批处理统计信息
   */
  getBatchProcessingStats(): BatchProcessingStats {
    return { ...this.batchProcessingStats };
  }

  /**
   * 断路器相关方法
   */
  private isCircuitBreakerOpen(): boolean {
    const now = Date.now();

    // 如果断路器开启且还在重置超时期内
    if (this.circuitBreakerState.isOpen) {
      if (now - this.circuitBreakerState.lastFailureTime < this.config.circuitBreakerResetTimeout) {
        return true;
      } else {
        // 重置断路器状态
        this.circuitBreakerState.isOpen = false;
        this.circuitBreakerState.failureCount = 0;
        this.logger.log("断路器已重置");
      }
    }

    return false;
  }

  private recordCircuitBreakerFailure(): void {
    this.circuitBreakerState.failureCount++;
    this.circuitBreakerState.lastFailureTime = Date.now();

    // 检查是否达到断路器阈值
    const totalAttempts = this.circuitBreakerState.failureCount + this.circuitBreakerState.successCount;
    const failureRate = totalAttempts > 0 ? (this.circuitBreakerState.failureCount / totalAttempts) * 100 : 0;

    if (failureRate >= this.config.circuitBreakerThreshold) {
      this.circuitBreakerState.isOpen = true;
      this.logger.warn("断路器已开启", {
        failureCount: this.circuitBreakerState.failureCount,
        failureRate: `${failureRate.toFixed(2)}%`,
        threshold: `${this.config.circuitBreakerThreshold}%`,
      });
    }
  }

  private recordCircuitBreakerSuccess(): void {
    this.circuitBreakerState.successCount++;
    // 成功后可以重置失败计数器
    if (this.circuitBreakerState.successCount > 10) {
      this.circuitBreakerState.failureCount = Math.max(0, this.circuitBreakerState.failureCount - 1);
    }
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    return this.config.retryDelayBase * Math.pow(2, attempt - 1);
  }

  /**
   * 休眠工具方法
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 模块销毁时的清理
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // 停止动态批处理调整定时器
      if (this.adjustmentTimer) {
        clearInterval(this.adjustmentTimer);
        this.adjustmentTimer = undefined;
      }

      // 关闭批处理Subject
      if (this.quoteBatchSubject && !this.quoteBatchSubject.closed) {
        this.quoteBatchSubject.complete();
      }

      this.logger.log("StreamBatchProcessor 资源已清理");
    } catch (error) {
      this.logger.error("StreamBatchProcessor 清理失败", {
        error: error.message,
      });
    }
  }
}