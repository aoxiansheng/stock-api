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

import { Injectable, OnModuleDestroy, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger, shouldLog } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { DataTransformerService } from "../../../02-processing/transformer/services/data-transformer.service";
import { DataTransformRequestDto } from "../../../02-processing/transformer/dto/data-transform-request.dto";
import { SymbolTransformerService } from "../../../02-processing/symbol-transformer/services/symbol-transformer.service";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
} from "../config/stream-receiver.config";
import { StreamDataFetcherService } from "../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamClientStateManager } from "../../../03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";

import {
  QuoteData,
  DataPipelineMetrics,
  DataProcessingStats,
  DataProcessingConfig,
  IDataProcessor,
  CapabilityMappingConfig,
  IntelligentMappingResult,
} from "../interfaces/data-processing.interface";
import { StreamDataValidator } from "../validators/stream-data.validator";
import {
  applyStandardSymbolsToDataArray,
  buildProviderToStandardMap,
} from "../utils/symbol-normalization.util";
import {
  STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
  isStandardSymbolIdentityProvider,
} from "@core/shared/utils/provider-symbol-identity.util";
import { MappingDirection } from "@core/shared/constants";
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../../../03-fetching/stream-data-fetcher/providers/websocket-server.provider";
import { parseFlexibleTimestampToMs } from "@core/shared/utils/market-time.util";

@Injectable()
export class StreamDataProcessorService implements OnModuleDestroy, IDataProcessor {
  private readonly logger = createLogger("StreamDataProcessor");
  private readonly config: StreamReceiverConfig;
  private readonly processingConfig: DataProcessingConfig;

  // 数据处理统计
  private dataProcessingStats: DataProcessingStats = {
    totalProcessed: 0,
    totalSymbolsProcessed: 0,
    totalProcessingTimeMs: 0,
    averageProcessingTimeMs: 0,
    totalErrors: 0,
    errorRate: 0,
    lastProcessedAt: 0,
  };
  private readonly pipelineCanonicalizationCache = new WeakMap<
    object,
    {
      validItems: any[];
      droppedReasons: Record<string, number>;
      droppedTotal: number;
      inputCount: number;
    }
  >();

  // 能力映射配置
  private readonly capabilityMapping: CapabilityMappingConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventEmitter2,
    private readonly dataTransformerService: DataTransformerService,
    private readonly symbolTransformerService: SymbolTransformerService,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly dataValidator: StreamDataValidator,
    @Optional() @Inject(WEBSOCKET_SERVER_TOKEN)
    private readonly webSocketProvider?: WebSocketServerProvider,
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
        "stream-stock-quote": "quote_fields",
        "stream-option-quote": "option_fields",
        "stream-futures-quote": "futures_fields",
        "stream-forex-quote": "forex_fields",
        "stream-crypto-quote": "crypto_fields",
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
    const pipelineStartTime = Date.now();
    const shouldTraceIntraday = this.shouldTraceIntradayCapability(capability);

    try {
      if (shouldTraceIntraday) {
        this.logger.debug("分时诊断: 流处理入口", {
          provider,
          capability,
          quotesCount: quotes.length,
          firstQuoteSymbols: quotes[0]?.symbols?.slice(0, 5) || [],
          hasRawData: Boolean(quotes[0]?.rawData),
        });
      }

      this.logger.debug("开始管道化数据处理", {
        provider,
        capability,
        quotesCount: quotes.length,
        pipelineId: `${provider}_${capability}_${pipelineStartTime}`,
      });

      // Step 1: 数据转换 - 仅通过 DataTransformerService
      const transformStartTime = Date.now();
      const marketType =
        quotes.find((quote) => quote.marketContext?.marketType)?.marketContext
          ?.marketType || "UNKNOWN";
      const dataTransformRequestDto: DataTransformRequestDto = {
        provider: provider,
        apiType: "stream" as const,
        transDataRuleListType: this.mapCapabilityToTransformRuleType(capability),
        rawData: quotes.map((q) => q.rawData),
        marketType,
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
        () => this.ensureSymbolConsistency(rawSymbols, provider),
        this.processingConfig.transformTimeoutMs,
        "符号标准化",
      );
      if (shouldTraceIntraday) {
        this.logger.debug("分时诊断: 符号标准化结果", {
          provider,
          capability,
          rawSymbolsCount: rawSymbols.length,
          standardizedSymbolsCount: standardizedSymbols.length,
          rawSymbols: rawSymbols.slice(0, 10),
          standardizedSymbols: standardizedSymbols.slice(0, 10),
        });
      }
      const symbolDuration = Date.now() - symbolStartTime;
      const providerToStandardMap = buildProviderToStandardMap(
        rawSymbols,
        standardizedSymbols,
      );
      const normalizedDataArray = applyStandardSymbolsToDataArray(
        dataArray,
        providerToStandardMap,
      );

      // Step 5: 使用标准化符号进行缓存
      const cacheStartTime = Date.now();
      await this.executeWithTimeout(
        () =>
          this.pipelineCacheData(
            normalizedDataArray,
            standardizedSymbols,
            shouldTraceIntraday,
          ),
        this.processingConfig.cacheTimeoutMs,
        "数据缓存",
      );
      const cacheDuration = Date.now() - cacheStartTime;

      // Step 6: 使用标准化符号进行广播
      const broadcastStartTime = Date.now();
      await this.executeWithTimeout(
        () => this.pipelineBroadcastData(normalizedDataArray, standardizedSymbols),
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
      this.recordPipelineError(provider, capability, error.message, errorDuration);

      throw error;
    }
  }

  private readBooleanConfig(key: string, defaultValue: boolean): boolean {
    const rawValue = this.configService.get<boolean | string | number>(key);
    if (typeof rawValue === "boolean") {
      return rawValue;
    }
    if (typeof rawValue === "number") {
      return rawValue !== 0;
    }
    if (typeof rawValue === "string") {
      const normalized = rawValue.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    return defaultValue;
  }

  private toCanonicalSymbol(symbol: string): string {
    if (typeof symbol !== "string") {
      return "";
    }
    const canonicalSymbol = symbol.trim().toUpperCase();
    if (canonicalSymbol.length === 0) {
      return "";
    }
    return canonicalSymbol;
  }

  private buildCanonicalSymbolKey(symbol: string, prefix = ""): string {
    const canonicalSymbol = this.toCanonicalSymbol(symbol);
    if (!canonicalSymbol) {
      return "";
    }
    return `${prefix}${canonicalSymbol}`;
  }

  private buildSymbolBroadcastKey(symbol: string): string {
    const canonicalSymbol = this.toCanonicalSymbol(symbol);
    if (!canonicalSymbol) {
      return "";
    }

    if (!this.dataValidator.isValidSymbolFormat(canonicalSymbol)) {
      return "";
    }

    return canonicalSymbol;
  }

  private buildSymbolCacheKey(symbol: string): string {
    return this.buildCanonicalSymbolKey(symbol, "quote:");
  }

  private getStandardSymbolIdentityProvidersConfig(): string {
    return this.configService.get<string>(
      STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
      "",
    );
  }

  private isProviderUsingStandardSymbolIdentity(providerName: string): boolean {
    return isStandardSymbolIdentityProvider(
      providerName,
      this.getStandardSymbolIdentityProvidersConfig(),
    );
  }

  /**
   * 确保符号一致性：用于管道处理时的端到端标准化
   */
  private async ensureSymbolConsistency(
    symbols: string[],
    provider: string,
  ): Promise<string[]> {
    if (this.isProviderUsingStandardSymbolIdentity(provider)) {
      return symbols.map((symbol) => this.buildSymbolBroadcastKey(symbol) || symbol);
    }

    try {
      const result = await this.symbolTransformerService.transformSymbols(
        provider,
        symbols,
        MappingDirection.TO_STANDARD,
      );
      return symbols.map((symbol) => result.mappingDetails[symbol] || symbol);
    } catch (error) {
      this.logger.warn("符号标准化失败，使用原始符号", {
        provider,
        symbols,
        error: error.message,
      });
      return symbols;
    }
  }

  private canonicalizePipelinePayload(
    rawItem: any,
  ): { item?: any; reason?: string } {
    const canonicalSymbol = this.buildSymbolBroadcastKey(rawItem?.symbol);
    if (!canonicalSymbol) {
      return { reason: "invalid_symbol" };
    }

    const rawPrice = rawItem?.lastPrice ?? rawItem?.price;
    const normalizedPrice =
      typeof rawPrice === "string" ? rawPrice.trim() : rawPrice;
    if (typeof normalizedPrice === "string" && normalizedPrice.length === 0) {
      return { reason: "invalid_price" };
    }
    const price =
      typeof normalizedPrice === "number"
        ? normalizedPrice
        : Number(normalizedPrice);
    if (!Number.isFinite(price) || price < 0) {
      return { reason: "invalid_price" };
    }

    if (
      typeof rawItem?.timestamp === "number" &&
      !Number.isInteger(rawItem.timestamp)
    ) {
      return { reason: "invalid_timestamp" };
    }

    const timestamp = parseFlexibleTimestampToMs(rawItem?.timestamp);
    if (!Number.isInteger(timestamp) || timestamp <= 0) {
      return { reason: "invalid_timestamp" };
    }

    const rawVolume = rawItem?.volume ?? 0;
    const volume = typeof rawVolume === "number" ? rawVolume : Number(rawVolume);
    if (!Number.isFinite(volume) || volume < 0) {
      return { reason: "invalid_volume" };
    }

    return {
      item: {
        ...rawItem,
        symbol: canonicalSymbol,
        price,
        lastPrice: price,
        timestamp,
        volume,
      },
    };
  }

  private canonicalizePipelinePayloads(
    transformedData: any[],
    stage: "cache" | "broadcast",
  ): any[] {
    if (!Array.isArray(transformedData)) {
      return [];
    }

    const validItems: any[] = [];
    const droppedReasons: Record<string, number> = {};

    for (const rawItem of transformedData) {
      const { item, reason } = this.canonicalizePipelinePayload(rawItem);
      if (item) {
        validItems.push(item);
        continue;
      }

      const dropReason = reason || "unknown_payload";
      droppedReasons[dropReason] = (droppedReasons[dropReason] || 0) + 1;
    }

    const droppedTotal = Object.values(droppedReasons).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (droppedTotal > 0) {
      this.logger.warn("流数据因无效payload被丢弃", {
        stage,
        inputCount: transformedData.length,
        droppedTotal,
        reasons: droppedReasons,
      });
    }

    return validItems;
  }

  private async pipelineCacheData(
    transformedData: any[],
    symbols: string[],
    shouldTraceIntraday: boolean,
  ): Promise<void> {
    try {
      const cacheEnabled = this.readBooleanConfig("STREAM_CACHE_ENABLED", true);
      if (!cacheEnabled) {
        if (shouldTraceIntraday) {
          this.logger.debug("分时诊断: 流缓存已关闭，跳过写入", {
            symbolsCount: symbols.length,
          });
        }
        this.logger.debug("流缓存已禁用，跳过缓存写入", { symbolsCount: symbols.length });
        return;
      }

      const streamCache: any = this.streamDataFetcher.getStreamDataCache?.();
      if (!streamCache) {
        if (shouldTraceIntraday) {
          this.logger.debug("分时诊断: StreamCache 服务不可用", {
            symbolsCount: symbols.length,
          });
        }
        this.logger.warn("StreamCache 服务不可用，跳过缓存写入");
        return;
      }

      const canonicalizedData = this.canonicalizePipelinePayloads(
        transformedData,
        "cache",
      );
      if (canonicalizedData.length === 0) {
        if (shouldTraceIntraday) {
          this.logger.debug("分时诊断: 流数据规范化后为空，未写入缓存", {
            inputCount: Array.isArray(transformedData) ? transformedData.length : 0,
            symbolsCount: symbols.length,
            symbols: symbols.slice(0, 10),
          });
        }
        return;
      }

      const bySymbol = new Map<string, any[]>();
      for (const item of canonicalizedData) {
        const canonicalSymbol = item.symbol;
        const point = {
          s: canonicalSymbol,
          p: item.lastPrice,
          v: item.volume,
          t: item.timestamp,
          c: item?.change,
          cp: item?.changePercent,
        };
        if (!bySymbol.has(canonicalSymbol)) bySymbol.set(canonicalSymbol, []);
        bySymbol.get(canonicalSymbol)!.push(point);
      }

      for (const [canonicalSymbol, points] of bySymbol.entries()) {
        const key = this.buildSymbolCacheKey(canonicalSymbol);
        if (!key) continue;
        try {
          await streamCache.setData(key, points, "hot");
          if (shouldTraceIntraday) {
            this.logger.debug("分时诊断: 写入流缓存", {
              symbol: canonicalSymbol,
              key,
              pointsCount: points.length,
              firstTimestamp: points[0]?.t ?? null,
              lastTimestamp: points[points.length - 1]?.t ?? null,
            });
          }
        } catch (err) {
          this.logger.warn("写入StreamCache失败(忽略)", {
            symbol: canonicalSymbol,
            error: (err as any)?.message,
          });
        }
      }

      if (shouldTraceIntraday) {
        this.logger.debug("分时诊断: 本次缓存写入摘要", {
          symbolsCount: bySymbol.size,
          symbols: Array.from(bySymbol.keys()).slice(0, 10),
        });
      }

      this.logger.debug("流缓存写入完成", {
        symbols: Array.from(bySymbol.keys()).slice(0, 5),
        total: bySymbol.size,
      });
    } catch (error) {
      this.logger.warn("流缓存处理异常(忽略)", { error: (error as any)?.message });
    }
  }

  private async pipelineBroadcastData(
    transformedData: any[],
    symbols: string[],
  ): Promise<void> {
    try {
      const broadcastEnabled = this.readBooleanConfig(
        "STREAM_BROADCAST_ENABLED",
        true,
      );
      if (!broadcastEnabled) {
        this.logger.debug("流广播已禁用，跳过广播", { symbolsCount: symbols.length });
        return;
      }

      if (!this.webSocketProvider || !this.webSocketProvider.isServerAvailable()) {
        this.logger.warn("WebSocketProvider不可用，跳过广播");
        return;
      }

      const canonicalizedData = this.canonicalizePipelinePayloads(
        transformedData,
        "broadcast",
      );
      if (canonicalizedData.length === 0) {
        return;
      }

      const bySymbol = new Map<string, any[]>();
      for (const item of canonicalizedData) {
        const canonicalSymbol = item.symbol;
        if (!bySymbol.has(canonicalSymbol)) bySymbol.set(canonicalSymbol, []);
        bySymbol.get(canonicalSymbol)!.push(item);
      }

      for (const [canonicalSymbol, items] of bySymbol.entries()) {
        try {
          await this.clientStateManager.broadcastToSymbolViaGateway(
            canonicalSymbol,
            items,
            this.webSocketProvider,
          );
        } catch (err) {
          this.logger.warn("广播到房间失败(忽略)", {
            symbol: canonicalSymbol,
            error: (err as any)?.message,
          });
        }
      }

      this.logger.debug("流广播完成", {
        symbols: Array.from(bySymbol.keys()).slice(0, 5),
        total: bySymbol.size,
      });
    } catch (error) {
      this.logger.warn("流广播处理异常(忽略)", { error: (error as any)?.message });
    }
  }

  private shouldTraceIntradayCapability(capability: string): boolean {
    return capability === "stream-stock-quote" && shouldLog("StreamDataProcessor", "debug");
  }

  /**
   * 记录管道错误指标
   */
  private recordPipelineError(
    provider: string,
    capability: string,
    errorMessage: string,
    duration: number,
  ): void {
    this.logger.error("管道处理错误指标", {
      provider,
      capability,
      errorType: this.classifyPipelineError(errorMessage),
      duration,
      error: errorMessage,
    });
  }

  /**
   * 分类管道错误类型
   */
  private classifyPipelineError(errorMessage: string): string {
    if (errorMessage.includes("transform")) return "transform_error";
    if (errorMessage.includes("cache")) return "cache_error";
    if (errorMessage.includes("broadcast")) return "broadcast_error";
    if (errorMessage.includes("timeout")) return "timeout_error";
    if (errorMessage.includes("network")) return "network_error";
    return "unknown_error";
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
      { pattern: /option/, ruleType: "option_fields", confidence: 0.95 },
      { pattern: /futures?/, ruleType: "futures_fields", confidence: 0.95 },
      { pattern: /forex|currency/, ruleType: "forex_fields", confidence: 0.9 },
      { pattern: /crypto|bitcoin|eth/, ruleType: "crypto_fields", confidence: 0.9 },
      { pattern: /market/, ruleType: "market_data_fields", confidence: 0.8 },
      { pattern: /trading/, ruleType: "trading_data_fields", confidence: 0.8 },
      { pattern: /historical?|history/, ruleType: "historical_data_fields", confidence: 0.9 },
      { pattern: /news/, ruleType: "news_fields", confidence: 0.95 },
      { pattern: /announcement/, ruleType: "announcement_fields", confidence: 0.95 },
      { pattern: /info|basic/, ruleType: "basic_info_fields", confidence: 0.85 },
      { pattern: /company/, ruleType: "company_info_fields", confidence: 0.9 },
      // 将宽泛的规则移到最后
      { pattern: /quote|price/, ruleType: "quote_fields", confidence: 0.9 },
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
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`${operationName}超时 (${timeoutMs}ms)`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * 记录流管道指标
   */
  private recordStreamPipelineMetrics(metrics: DataPipelineMetrics): void {
    try {
      // 发送监控事件
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）
      this.logger.debug("流管道性能事件已记录", {
        provider: metrics.provider,
        capability: metrics.capability,
        quotesCount: metrics.quotesCount,
        totalDuration: metrics.durations.total,
      });
    } catch (error) {
      this.logger.warn("记录管道指标失败", { error: error.message });
    }
  }

  /**
   * 更新处理统计
   */
  private updateProcessingStats(quotesCount: number, symbolsCount: number, processingTimeMs: number): void {
    this.dataProcessingStats.totalProcessed += quotesCount;
    this.dataProcessingStats.totalSymbolsProcessed += symbolsCount;
    this.dataProcessingStats.totalProcessingTimeMs += processingTimeMs;
    this.dataProcessingStats.averageProcessingTimeMs =
      this.dataProcessingStats.totalProcessed > 0
        ? this.dataProcessingStats.totalProcessingTimeMs / this.dataProcessingStats.totalProcessed
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
      totalProcessingTimeMs: 0,
      averageProcessingTimeMs: 0,
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
