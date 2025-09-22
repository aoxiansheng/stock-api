/**
 * StreamDataProcessor - 专职数据流处理服务
 *
 * 从 StreamReceiverService 中分离出来的数据流处理逻辑，负责：
 * 1. 数据管道化处理和转换
 * 2. 符号标准化和一致性保证
 * 3. 数据缓存和广播
 * 4. 能力映射和转换规则匹配
 * 5. 性能监控和错误处理
 */

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { DataTransformerService } from "../../../02-processing/transformer/services/data-transformer.service";
import { DataTransformRequestDto } from "../../../02-processing/transformer/dto/data-transform-request.dto";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
} from "../config/stream-receiver.config";

import {
  QuoteData,
  DataPipelineMetrics,
  DataProcessingStats,
  SymbolConsistencyResult,
  DataProcessingCallbacks,
  DataProcessingConfig,
  IDataProcessor,
  CapabilityMappingConfig,
  IntelligentMappingResult,
} from "../interfaces/data-processing.interface";

@Injectable()
export class StreamDataProcessorService implements OnModuleDestroy, IDataProcessor {
  private readonly logger = createLogger("StreamDataProcessor");
  private readonly config: StreamReceiverConfig;
  private readonly processingConfig: DataProcessingConfig;

  // 数据处理统计
  private dataProcessingStats: DataProcessingStats = {
    totalProcessed: 0,
    totalSymbolsProcessed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    totalErrors: 0,
    errorRate: 0,
    lastProcessedAt: 0,
  };

  // 回调函数存储
  private callbacks?: DataProcessingCallbacks;

  // 能力映射配置
  private readonly capabilityMapping: CapabilityMappingConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventEmitter2,
    private readonly dataTransformerService: DataTransformerService,
  ) {
    // 初始化配置
    this.config = this.initializeConfig();
    this.processingConfig = this.initializeProcessingConfig();
    this.capabilityMapping = this.initializeCapabilityMapping();

    this.logger.log("StreamDataProcessor 初始化完成", {
      config: {
        transformTimeoutMs: this.processingConfig.transformTimeoutMs,
        enablePerformanceMetrics: this.processingConfig.enablePerformanceMetrics,
        enableRetry: this.processingConfig.enableRetry,
        maxRetryAttempts: this.processingConfig.maxRetryAttempts,
      }
    });
  }

  /**
   * 初始化配置
   */
  private initializeConfig(): StreamReceiverConfig {
    return {
      ...defaultStreamReceiverConfig,
    };
  }

  /**
   * 初始化数据处理配置
   */
  private initializeProcessingConfig(): DataProcessingConfig {
    return {
      transformTimeoutMs: this.configService.get<number>("DATA_PROCESSING_TRANSFORM_TIMEOUT", 5000),
      cacheTimeoutMs: this.configService.get<number>("DATA_PROCESSING_CACHE_TIMEOUT", 3000),
      broadcastTimeoutMs: this.configService.get<number>("DATA_PROCESSING_BROADCAST_TIMEOUT", 2000),
      enablePerformanceMetrics: this.configService.get<boolean>("DATA_PROCESSING_ENABLE_METRICS", true),
      enableRetry: this.configService.get<boolean>("DATA_PROCESSING_ENABLE_RETRY", true),
      maxRetryAttempts: this.configService.get<number>("DATA_PROCESSING_MAX_RETRY", 3),
      retryDelayBase: this.configService.get<number>("DATA_PROCESSING_RETRY_DELAY_BASE", 100),
    };
  }

  /**
   * 初始化能力映射配置
   */
  private initializeCapabilityMapping(): CapabilityMappingConfig {
    return {
      websocketCapabilities: {
        "ws-stock-quote": "quote_fields",
        "ws-option-quote": "option_fields",
        "ws-futures-quote": "futures_fields",
        "ws-forex-quote": "forex_fields",
        "ws-crypto-quote": "crypto_fields",
      },
      restApiCapabilities: {
        [API_OPERATIONS.STOCK_DATA.GET_QUOTE]: "quote_fields",
        "get-option-quote": "option_fields",
        "get-futures-quote": "futures_fields",
        "get-forex-quote": "forex_fields",
        "get-crypto-quote": "crypto_fields",
      },
      streamingCapabilities: {
        [API_OPERATIONS.STOCK_DATA.STREAM_QUOTE]: "quote_fields",
        "stream-option-quote": "option_fields",
        "stream-market-data": "market_data_fields",
        "stream-trading-data": "trading_data_fields",
      },
      basicInfoCapabilities: {
        "get-stock-info": "basic_info_fields",
        "get-company-info": "company_info_fields",
        "get-market-info": "market_info_fields",
      },
      historicalDataCapabilities: {
        "get-historical-data": "historical_data_fields",
        "get-historical-quotes": "quote_fields",
      },
      newsAndAnnouncementCapabilities: {
        "get-news": "news_fields",
        "get-announcements": "announcement_fields",
      },
      defaultFallbackMapping: "quote_fields",
    };
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: DataProcessingCallbacks): void {
    this.callbacks = callbacks;
    this.logger.debug("数据处理回调函数已设置");
  }

  /**
   * 🎯 统一的管道化数据处理 - 核心方法
   *
   * 数据流向：RawData → Transform → Cache → Broadcast
   * - 仅通过 DataTransformerService 进行数据转换
   * - 统一的错误处理和性能监控
   * - 支持重试和超时控制
   */
  async processDataThroughPipeline(
    quotes: QuoteData[],
    provider: string,
    capability: string,
  ): Promise<void> {
    if (!this.callbacks) {
      throw new Error("DataProcessingCallbacks 未设置");
    }

    const pipelineStartTime = Date.now();

    try {
      this.logger.debug("开始管道化数据处理", {
        provider,
        capability,
        quotesCount: quotes.length,
        pipelineId: `${provider}_${capability}_${pipelineStartTime}`,
      });

      // Step 1: 数据转换 - 仅通过 DataTransformerService
      const transformStartTime = Date.now();
      const dataTransformRequestDto: DataTransformRequestDto = {
        provider: provider,
        apiType: "stream" as const,
        transDataRuleListType: this.mapCapabilityToTransformRuleType(capability),
        rawData: quotes.map((q) => q.rawData),
      };

      const transformedData = await this.executeWithTimeout(
        () => this.dataTransformerService.transform(dataTransformRequestDto),
        this.processingConfig.transformTimeoutMs,
        "数据转换",
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

      // Step 4: 符号标准化（确保缓存键和广播键一致）
      const symbolStartTime = Date.now();
      const standardizedSymbols = await this.executeWithTimeout(
        () => this.callbacks!.ensureSymbolConsistency(rawSymbols, provider),
        this.processingConfig.transformTimeoutMs,
        "符号标准化",
      );
      const symbolDuration = Date.now() - symbolStartTime;

      // Step 5: 使用标准化符号进行缓存
      const cacheStartTime = Date.now();
      await this.executeWithTimeout(
        () => this.callbacks!.pipelineCacheData(dataArray, standardizedSymbols),
        this.processingConfig.cacheTimeoutMs,
        "数据缓存",
      );
      const cacheDuration = Date.now() - cacheStartTime;

      // Step 6: 使用标准化符号进行广播
      const broadcastStartTime = Date.now();
      await this.executeWithTimeout(
        () => this.callbacks!.pipelineBroadcastData(dataArray, standardizedSymbols),
        this.processingConfig.broadcastTimeoutMs,
        "数据广播",
      );
      const broadcastDuration = Date.now() - broadcastStartTime;

      // Step 7: 性能监控埋点
      const totalDuration = Date.now() - pipelineStartTime;
      if (this.processingConfig.enablePerformanceMetrics) {
        this.recordStreamPipelineMetrics({
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
      }

      // Step 8: 更新处理统计
      this.updateProcessingStats(quotes.length, standardizedSymbols.length, totalDuration);

      this.logger.debug("管道化数据处理完成", {
        provider,
        capability,
        quotesCount: quotes.length,
        symbolsCount: standardizedSymbols.length,
        totalDuration,
        stages: {
          transform: transformDuration,
          symbol: symbolDuration,
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

      // 更新错误统计
      this.updateErrorStats();

      // 记录错误指标
      this.callbacks?.recordPipelineError(
        provider,
        capability,
        error.message,
        errorDuration,
      );

      throw error;
    }
  }

  /**
   * 健壮的能力映射 - 替换脆弱的字符串替换
   */
  mapCapabilityToTransformRuleType(capability: string): string {
    // 合并所有映射表进行查找
    const allMappings = {
      ...this.capabilityMapping.websocketCapabilities,
      ...this.capabilityMapping.restApiCapabilities,
      ...this.capabilityMapping.streamingCapabilities,
      ...this.capabilityMapping.basicInfoCapabilities,
      ...this.capabilityMapping.historicalDataCapabilities,
      ...this.capabilityMapping.newsAndAnnouncementCapabilities,
    };

    // 1. 直接查表映射
    const mappedRuleType = allMappings[capability];
    if (mappedRuleType) {
      this.logger.debug("能力映射成功", {
        capability,
        mappedRuleType,
        method: "direct_mapping",
      });
      return mappedRuleType;
    }

    // 2. 智能后缀分析 (作为回退机制)
    const intelligentMapping = this.intelligentCapabilityMapping(capability);
    if (intelligentMapping.mappedRuleType) {
      this.logger.debug("智能能力映射成功", {
        capability,
        mappedRuleType: intelligentMapping.mappedRuleType,
        method: "intelligent_analysis",
        confidence: intelligentMapping.confidence,
      });
      return intelligentMapping.mappedRuleType;
    }

    // 3. 兜底策略：基于关键词的推断
    const fallbackMapping = this.fallbackCapabilityMapping(capability);

    this.logger.warn("使用兜底能力映射", {
      capability,
      mappedRuleType: fallbackMapping,
      method: "fallback_inference",
      warning: "建议在 capabilityMapping 中添加明确映射",
    });

    return fallbackMapping;
  }

  /**
   * 智能能力映射分析
   */
  private intelligentCapabilityMapping(capability: string): IntelligentMappingResult {
    const lowerCapability = capability.toLowerCase();

    // 定义模式匹配规则和置信度
    const patterns = [
      { pattern: /quote|price/, ruleType: "quote_fields", confidence: 0.9 },
      { pattern: /option/, ruleType: "option_fields", confidence: 0.95 },
      { pattern: /futures?/, ruleType: "futures_fields", confidence: 0.95 },
      { pattern: /forex|currency/, ruleType: "forex_fields", confidence: 0.9 },
      { pattern: /crypto|bitcoin|eth/, ruleType: "crypto_fields", confidence: 0.9 },
      { pattern: /market/, ruleType: "market_data_fields", confidence: 0.8 },
      { pattern: /trading/, ruleType: "trading_data_fields", confidence: 0.8 },
      { pattern: /info|basic/, ruleType: "basic_info_fields", confidence: 0.85 },
      { pattern: /company/, ruleType: "company_info_fields", confidence: 0.9 },
      { pattern: /historical?|history/, ruleType: "historical_data_fields", confidence: 0.9 },
      { pattern: /news/, ruleType: "news_fields", confidence: 0.95 },
      { pattern: /announcement/, ruleType: "announcement_fields", confidence: 0.95 },
    ];

    for (const { pattern, ruleType, confidence } of patterns) {
      if (pattern.test(lowerCapability)) {
        return {
          mappedRuleType: ruleType,
          confidence,
          method: "intelligent_analysis",
          matchedPattern: pattern.source,
        };
      }
    }

    return {
      mappedRuleType: "",
      confidence: 0,
      method: "intelligent_analysis",
    };
  }

  /**
   * 兜底能力映射
   */
  private fallbackCapabilityMapping(capability: string): string {
    // 基于关键词的最后推断
    const lowerCapability = capability.toLowerCase();

    if (lowerCapability.includes("stream") || lowerCapability.includes("ws")) {
      return "quote_fields"; // 大多数流数据是报价
    }

    if (lowerCapability.includes("get") || lowerCapability.includes("fetch")) {
      return "quote_fields"; // 大多数获取操作是报价
    }

    // 最终兜底
    return this.capabilityMapping.defaultFallbackMapping;
  }

  /**
   * 带超时控制的执行器
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${operationName}超时 (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);
  }

  /**
   * 记录流管道指标
   */
  private recordStreamPipelineMetrics(metrics: DataPipelineMetrics): void {
    try {
      this.callbacks?.recordStreamPipelineMetrics(metrics);

      // 发送监控事件
      this.callbacks?.emitMonitoringEvent("data_pipeline_processed", metrics.quotesCount, {
        provider: metrics.provider,
        capability: metrics.capability,
        symbolsCount: metrics.symbolsCount,
        durations: metrics.durations,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.warn("记录管道指标失败", { error: error.message });
    }
  }

  /**
   * 更新处理统计
   */
  private updateProcessingStats(quotesCount: number, symbolsCount: number, processingTime: number): void {
    this.dataProcessingStats.totalProcessed += quotesCount;
    this.dataProcessingStats.totalSymbolsProcessed += symbolsCount;
    this.dataProcessingStats.totalProcessingTime += processingTime;
    this.dataProcessingStats.averageProcessingTime =
      this.dataProcessingStats.totalProcessed > 0
        ? this.dataProcessingStats.totalProcessingTime / this.dataProcessingStats.totalProcessed
        : 0;
    this.dataProcessingStats.lastProcessedAt = Date.now();

    // 重新计算错误率
    this.calculateErrorRate();
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(): void {
    this.dataProcessingStats.totalErrors++;
    this.calculateErrorRate();
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): void {
    const totalOperations = this.dataProcessingStats.totalProcessed + this.dataProcessingStats.totalErrors;
    this.dataProcessingStats.errorRate =
      totalOperations > 0
        ? (this.dataProcessingStats.totalErrors / totalOperations) * 100
        : 0;
  }

  /**
   * 获取数据处理统计信息
   */
  getDataProcessingStats(): DataProcessingStats {
    return { ...this.dataProcessingStats };
  }

  /**
   * 重置数据处理统计
   */
  resetDataProcessingStats(): void {
    this.dataProcessingStats = {
      totalProcessed: 0,
      totalSymbolsProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      totalErrors: 0,
      errorRate: 0,
      lastProcessedAt: 0,
    };

    this.logger.log("数据处理统计已重置");
  }

  /**
   * 模块销毁时的清理
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log("StreamDataProcessor 资源已清理");
    } catch (error) {
      this.logger.error("StreamDataProcessor 清理失败", {
        error: error.message,
      });
    }
  }
}