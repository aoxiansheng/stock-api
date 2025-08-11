import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { CapabilityRegistryService } from '../../providers/services/capability-registry.service';
import { SymbolMapperService } from '../symbol-mapper/services/symbol-mapper.service';
import { FlexibleMappingRuleService } from '../data-mapper/services/flexible-mapping-rule.service';
import { TransformerService } from '../transformer/services/transformer.service';
import { BatchOptimizationService } from '../shared/services/batch-optimization.service';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { IStreamCapability } from '../../providers/interfaces/stream-capability.interface';
import { StreamSubscribeDto, StreamUnsubscribeDto } from './dto';
import { TransformRequestDto } from '../transformer/dto/transform-request.dto';
import { Subject } from 'rxjs';
import { bufferTime, filter, mergeMap } from 'rxjs/operators';
import { StreamPerformanceMetrics } from '../shared/services/stream-performance-metrics.service';

/**
 * 客户端订阅信息
 */
interface ClientSubscription {
  clientId: string;
  symbols: Set<string>;
  wsCapabilityType: string;
  providerName: string;
  capability: IStreamCapability;
  contextService: any;
}

/**
 * 批量处理的报价数据
 */
interface QuoteData {
  rawData: any;
  providerName: string;
  wsCapabilityType: string;
  timestamp: number;
}

@Injectable()
export class StreamReceiverService {
  private readonly logger = createLogger(StreamReceiverService.name);
  private readonly clientSubscriptions = new Map<string, ClientSubscription>();
  private readonly processedDataCache = new Map<string, any>();
  private readonly providerStreamListeners = new Map<string, boolean>();
  
  // 🎯 RxJS 批量处理管道
  private readonly quoteBatchSubject = new Subject<QuoteData>();
  private batchProcessingStats = {
    totalBatches: 0,
    totalQuotes: 0,
    batchProcessingTime: 0,
  };
  
  // 存储消息回调函数，用于批量处理后触发
  private readonly messageCallbacks = new Map<string, (data: any) => void>();

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly symbolMapperService: SymbolMapperService,
    private readonly flexibleMappingRuleService: FlexibleMappingRuleService,
    private readonly transformerService: TransformerService,
    private readonly batchOptimizationService: BatchOptimizationService,
    private readonly featureFlags: FeatureFlags,
    private readonly performanceMetrics: StreamPerformanceMetrics,
  ) {
    this.logger.log('StreamReceiverService 初始化，集成7组件架构和RxJS批量优化');
    this.initializeBatchProcessing();
  }

  /**
   * 🎯 初始化批量处理管道
   */
  private initializeBatchProcessing(): void {
    if (!this.featureFlags.batchProcessingEnabled) {
      this.logger.log('批量处理功能已禁用，跳过RxJS管道初始化');
      return;
    }

    // 🎯 批量处理流：1ms 内收到 ≥10 条报价触发批处理
    this.quoteBatchSubject.pipe(
      bufferTime(this.featureFlags.batchTimeWindowMs, null, this.featureFlags.batchSizeThreshold),
      filter(batch => batch.length > 0),
      mergeMap(batch => this.processBatchQuotes(batch))
    ).subscribe({
      next: () => {
        // 批量处理完成
      },
      error: (error) => {
        this.logger.error('批量处理管道错误', { error: error.message });
      }
    });

    this.logger.log('RxJS批量处理管道初始化完成', {
      bufferTimeMs: this.featureFlags.batchTimeWindowMs,
      batchSizeThreshold: this.featureFlags.batchSizeThreshold
    });
  }

  /**
   * 订阅符号数据流
   */
  async subscribeSymbols(
    clientId: string,
    subscribeDto: StreamSubscribeDto,
    messageCallback: (data: any) => void,
  ): Promise<void> {
    const { symbols, wsCapabilityType, preferredProvider } = subscribeDto;

    try {
      const markets = this.inferMarkets(symbols);
      const primaryMarket = markets[0];
      const providerName = preferredProvider || this.capabilityRegistry.getBestStreamProvider(wsCapabilityType, primaryMarket);

      if (!providerName) {
        throw new Error(`未找到支持 ${wsCapabilityType} 能力的数据提供商`);
      }

      const capability = this.capabilityRegistry.getStreamCapability(providerName, wsCapabilityType);
      if (!capability) {
        throw new Error(`提供商 ${providerName} 不支持 ${wsCapabilityType} 流能力`);
      }

      const provider = this.capabilityRegistry.getProvider(providerName);
      const contextService = provider?.getStreamContextService?.();
      if (!contextService) {
        throw new Error(`提供商 ${providerName} 未提供流上下文服务`);
      }

      // 🎯 批量预热优化：符号映射和规则预编译
      const symbolMappingStart = Date.now();
      let mappedSymbols;
      let cacheHit = false;
      
      if (this.featureFlags.batchProcessingEnabled && symbols.length > this.featureFlags.batchSizeThreshold) {
        // 使用批量优化服务预热符号映射
        const preloadResult = await this.batchOptimizationService.preloadSymbolMappings(symbols, 'standard', providerName);
        cacheHit = preloadResult.size > 0;
        mappedSymbols = await this.symbolMapperService.transformSymbols(providerName, symbols);
      } else {
        mappedSymbols = await this.symbolMapperService.transformSymbols(providerName, symbols);
      }
      
      // 🎯 记录符号映射性能指标
      const symbolMappingTime = Date.now() - symbolMappingStart;
      symbols.forEach(symbol => {
        this.performanceMetrics.recordSymbolProcessed(
          symbolMappingTime / symbols.length,
          true,
          providerName,
          this.inferMarket(symbol)
        );
      });
      
      // 🎯 记录缓存访问指标
      if (this.featureFlags.batchProcessingEnabled && symbols.length > this.featureFlags.batchSizeThreshold) {
        this.performanceMetrics.recordCacheAccess(cacheHit, 'symbol_mapping');
      }

      this.logger.debug({
        message: '订阅时符号转换为提供商格式（含批量优化）',
        provider: providerName,
        originalSymbols: symbols,
        transformedSymbols: mappedSymbols.transformedSymbols,
        batchProcessingEnabled: this.featureFlags.batchProcessingEnabled,
        symbolsCount: symbols.length,
        batchThreshold: this.featureFlags.batchSizeThreshold,
      });

      if (!capability.isConnected(contextService)) {
        await capability.initialize(contextService);
        if (!capability.isConnected(contextService)) {
          throw new Error(`流能力初始化失败：${providerName}/${wsCapabilityType}`);
        }
        this.logger.log(`流能力连接初始化成功: ${providerName}/${wsCapabilityType}`);
      }

      // 🔧 修复：先存储消息回调函数，确保批量处理模式下能找到回调
      this.messageCallbacks.set(clientId, messageCallback);

      const listenerKey = `${providerName}:${wsCapabilityType}`;
      if (!this.providerStreamListeners.has(listenerKey)) {
        contextService.onQuoteUpdate(async (rawData: any) => {
          // 🎯 根据 Feature Flag 选择处理模式
          if (this.featureFlags.batchProcessingEnabled) {
            // 批量模式：推送到 RxJS 管道
            this.quoteBatchSubject.next({
              rawData,
              providerName,
              wsCapabilityType,
              timestamp: Date.now(),
            });
          } else {
            // 传统模式：立即处理
            const processedData = await this.processAndCacheProviderData(rawData, providerName, wsCapabilityType);
            if (processedData) {
              this.clientSubscriptions.forEach((sub, clientId) => {
                if (sub.providerName === providerName && sub.wsCapabilityType === wsCapabilityType) {
                  
                  // 🔧 修复：传统模式也使用精确的符号匹配
                  const hasMatchingSymbol = processedData.symbols.some((processedSymbol: string) => {
                    if (sub.symbols.has(processedSymbol)) {
                      return true;
                    }
                    
                    for (const originalSymbol of sub.symbols) {
                      if (this.isSymbolMatch(originalSymbol, processedSymbol)) {
                        return true;
                      }
                    }
                    return false;
                  });
                  
                  if (hasMatchingSymbol) {
                    this.logger.debug({
                    message: '传统模式：触发客户端回调',
                    clientId,
                    processedSymbols: processedData.symbols,
                    clientSymbols: Array.from(sub.symbols),
                    providerName,
                    });
                    this.handleProviderMessage(sub.clientId, processedData, messageCallback);   
                  }
                }
              });
            }
          }
        });
        this.providerStreamListeners.set(listenerKey, true);
      }

      const transformedSymbols = Object.values(mappedSymbols.transformedSymbols || {}) as string[];
      const symbolsToSubscribe = transformedSymbols.length > 0 ? transformedSymbols : symbols;
      await capability.subscribe(symbolsToSubscribe, contextService);

      this.clientSubscriptions.set(clientId, {
        clientId,
        symbols: new Set(symbols),
        wsCapabilityType,
        providerName,
        capability,
        contextService,
      });

      this.logger.log({
        message: 'WebSocket 订阅成功',
        clientId,
        symbols,
        provider: providerName,
        capability: wsCapabilityType,
      });
    } catch (error) {
      // 🎯 记录订阅错误指标
      this.performanceMetrics.recordError('websocket_subscription');
      
      this.logger.error({
        message: 'WebSocket 订阅失败',
        clientId,
        symbols,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 取消订阅符号数据流
   */
  async unsubscribeSymbols(
    clientId: string,
    unsubscribeDto: StreamUnsubscribeDto,
  ): Promise<void> {
    const subscription = this.clientSubscriptions.get(clientId);
    
    if (!subscription) {
      this.logger.warn(`客户端 ${clientId} 没有活跃的订阅`);
      return;
    }

    try {
      const { symbols } = unsubscribeDto;
      
      const mappedSymbols = await this.symbolMapperService.transformSymbols(
        subscription.providerName,
        symbols,
      );

      const transformedSymbols = Object.values(mappedSymbols.transformedSymbols || {});
      const symbolsToUnsubscribe = transformedSymbols.length > 0 ? transformedSymbols : symbols;
      await subscription.capability.unsubscribe(symbolsToUnsubscribe, subscription.contextService);

      symbols.forEach(symbol => subscription.symbols.delete(symbol));

      if (subscription.symbols.size === 0) {
        await this.cleanupClientSubscription(clientId);
      }

      this.logger.log({
        message: 'WebSocket 取消订阅成功',
        clientId,
        symbols,
        provider: subscription.providerName,
      });

    } catch (error) {
      // 🎯 记录取消订阅错误指标
      this.performanceMetrics.recordError('websocket_unsubscription');
      
      this.logger.error({
        message: 'WebSocket 取消订阅失败',
        clientId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理提供商消息 - 遵循7组件架构的合规数据处理流程
   * 数据流向：符号转换 → 数据映射 → 转换 → 直接输出（跳过Storage保证实时性）
   * 🔧 增强诊断日志用于追踪数据推送问题
   */
  private async handleProviderMessage(
    clientId: string,
    processedData: any,
    messageCallback: (data: any) => void,
  ): Promise<void> {
    const messageStart = Date.now();
    
    try {
      this.logger.debug({
        message: '🔧 开始推送数据给客户端',
        clientId,
        dataSymbols: processedData.symbols,
        dataTimestamp: processedData.timestamp,
        provider: processedData.provider,
        capability: processedData.capability,
        hasCallback: typeof messageCallback === 'function',
      });
      
      messageCallback(processedData);
      
      this.logger.debug({
        message: '🔧 成功推送数据给客户端',
        clientId,
        dataSymbols: processedData.symbols,
        processingTime: Date.now() - messageStart,
      });

      // 🎯 记录消息处理成功指标
      const processingTime = Date.now() - messageStart;
      processedData.symbols.forEach(symbol => {
        this.performanceMetrics.recordSymbolProcessed(
          processingTime,
          true,
          processedData.provider,
          this.inferMarket(symbol)
        );
      });

      this.logger.debug({
        message: '实时流数据处理完成',
        clientId,
        provider: processedData.provider,
        processingTime,
        symbolsCount: processedData.symbols.length,
      });

    } catch (error) {
      // 🎯 记录消息处理失败指标
      this.performanceMetrics.recordError('message_processing');
      
      this.logger.error({
        message: '处理实时流数据失败',
        clientId,
        provider: processedData.provider,
        capability: processedData.capability,
        error: error.message,
        errorStack: error.stack,
      });
      
      const fallbackData = {
        symbols: [processedData.symbol].filter(Boolean),
        data: this.standardizeBasicData(processedData.data, processedData.symbol),
        timestamp: Date.now(),
        provider: processedData.provider,
        capability: processedData.capability,
        error: '数据处理部分失败，返回基础格式',
      };
      
      messageCallback(fallbackData);
    }
  }

  /**
   * 基础数据结构标准化（备用方案）
   */
  private standardizeBasicData(rawData: any, symbol: string): any {
    // 优先从解析出的 _raw.parsedQuoteData 获取字段，其次使用顶层字段
    const src = rawData?._raw?.parsedQuoteData || rawData || {};
    return {
      symbol,
      lastPrice: src.last_done ?? src.lastPrice ?? src.price ?? rawData?.last_done ?? rawData?.lastPrice ?? rawData?.price,
      prevClose: src.prev_close ?? src.prevClose ?? rawData?.prev_close ?? rawData?.prevClose,
      open: src.open ?? src.openPrice ?? rawData?.open ?? rawData?.openPrice,
      high: src.high ?? src.highPrice ?? rawData?.high ?? rawData?.highPrice, 
      low: src.low ?? src.lowPrice ?? rawData?.low ?? rawData?.lowPrice,
      volume: src.volume ?? src.totalVolume ?? rawData?.volume ?? rawData?.totalVolume,
      turnover: src.turnover ?? src.totalTurnover ?? rawData?.turnover ?? rawData?.totalTurnover,
      timestamp: src.timestamp ?? rawData?.timestamp ?? Date.now(),
      _provider: rawData?._provider || 'unknown',
      _raw: rawData, // 保留原始数据用于调试
    };
  }

  /**
   * 优化：处理和缓存来自提供商的数据
   */
  private async processAndCacheProviderData(
    rawData: any,
    providerName: string,
    wsCapabilityType: string,
  ): Promise<any> {
    const cacheKey = `${providerName}:${wsCapabilityType}:${rawData.symbol}`;
    if (this.processedDataCache.has(cacheKey)) {
      return this.processedDataCache.get(cacheKey);
    }

    try {
      // 1. 符号格式转换
      let standardSymbol = rawData.symbol;
      if (rawData.symbol) {
        try {
          const mappedSymbol = await this.symbolMapperService.mapSymbol(rawData.symbol, providerName, 'standard');
          standardSymbol = mappedSymbol || rawData.symbol;
          this.logger.debug({
            message: '接收数据时符号转换为标准格式',
            provider: providerName,
            originalSymbol: rawData.symbol,
            standardSymbol,
          });
        } catch (error) {
          this.logger.warn(`符号转换失败: ${error.message}`);
        }
      }

      // 2. 获取数据映射规则
      const dataRuleListType = this.getDataRuleListType(wsCapabilityType);
      let mappingRules = null;
      const ruleCompilationStart = Date.now();
      let ruleCompilationSuccess = false;
      
      this.logger.debug({
        message: '🔍 开始获取数据映射规则 - stream-receiver.service',
        provider: providerName,
        wsCapabilityType,
        dataRuleListType,
        rawDataStructure: Object.keys(rawData || {}),
      });
      
      try {
        // 通过 FlexibleMappingRuleService 获取最佳匹配的映射规则
        const bestRule = await this.flexibleMappingRuleService.findBestMatchingRule(providerName, 'stream', dataRuleListType);
        mappingRules = bestRule ? [bestRule] : null;
        ruleCompilationSuccess = true;
        
        this.logger.debug({
          message: '✅ 成功获取数据映射规则 - stream-receiver.service',
          provider: providerName,
          dataRuleListType,
          rulesCount: mappingRules?.length || 0,
          ruleNames: mappingRules?.map(rule => rule.name) || [],
        });
      } catch (error) {
        this.logger.warn({
          message: '❌ 获取映射规则失败',
          provider: providerName,
          dataRuleListType,
          error: error.message,
        });
        // 🎯 记录规则编译错误
        this.performanceMetrics.recordError('mapping_rule_compilation');
      }
      
      // 🎯 记录规则编译性能指标
      if (ruleCompilationSuccess && mappingRules) {
        const ruleCompilationTime = Date.now() - ruleCompilationStart;
        this.performanceMetrics.recordRuleCompiled(
          ruleCompilationTime,
          false, // 这里不是缓存命中，而是实时编译
          providerName,
          dataRuleListType
        );
      }

      // 3. 数据转换和标准化
      let transformedData;
      const transformationStart = Date.now();
      
      if (mappingRules && mappingRules.length > 0) {
        this.logger.debug({
          message: '🔄 开始应用数据映射规则转换 - stream-receiver.service',
          provider: providerName,
          dataRuleListType,
          rawDataKeys: Object.keys(rawData || {}),
          firstRuleName: mappingRules[0]?.name,
        });
        
        try {
          const transformRequest: TransformRequestDto = {
            rawData,
            provider: providerName,
            apiType: 'stream',
            transDataRuleListType: dataRuleListType,
          };
          const transformResponse = await this.transformerService.transform(transformRequest);
          transformedData = transformResponse.transformedData;
          
          const transformationTime = Date.now() - transformationStart;
          this.logger.debug({
            message: '✅ 数据映射规则转换成功 - stream-receiver.service',
            provider: providerName,
            transformationTime,
            originalDataKeys: Object.keys(rawData || {}),
            transformedDataKeys: Array.isArray(transformedData) 
              ? Object.keys(transformedData[0] || {})
              : Object.keys(transformedData || {}),
            transformedDataType: Array.isArray(transformedData) ? 'array' : typeof transformedData,
          });
        } catch (transformError) {
          const transformationTime = Date.now() - transformationStart;
          this.logger.error({
            message: '❌ 数据映射规则转换失败，使用基础数据标准化',
            provider: providerName,
            transformationTime,
            error: transformError.message,
            originalDataKeys: Object.keys(rawData || {}),
          });
          
          // 转换失败时使用基础标准化
          transformedData = this.standardizeBasicData(rawData, standardSymbol);
        }
      } else {
        this.logger.debug({
          message: '⚠️ 未找到映射规则，使用基础数据标准化',
          provider: providerName,
          dataRuleListType,
          rawDataKeys: Object.keys(rawData || {}),
        });
        transformedData = this.standardizeBasicData(rawData, standardSymbol);
      }


      if (Array.isArray(transformedData)) {
        transformedData = transformedData.map(item => ({ ...item, symbol: standardSymbol }));
      } else if (transformedData && typeof transformedData === 'object') {
        transformedData = { ...transformedData, symbol: standardSymbol };
      }

      // 4. 构建响应数据
      const responseData = {
        symbols: Array.isArray(transformedData)
          ? transformedData.map(item => item.symbol || standardSymbol).filter(Boolean)
          : [standardSymbol].filter(Boolean),
        data: transformedData,
        timestamp: Date.now(),
        provider: providerName,
        capability: wsCapabilityType,
                  processingChain: {
            symbolMapped: standardSymbol !== rawData.symbol,
            mappingRulesUsed: !!(mappingRules && mappingRules.length > 0),
            dataTransformed: true,
          },
      };

      this.logger.debug({
        message: '📦 构建最终响应数据',
        provider: providerName,
        capability: wsCapabilityType,
        symbolsCount: responseData.symbols.length,
        symbols: responseData.symbols,
        dataKeys: Array.isArray(transformedData) 
          ? Object.keys(transformedData[0] || {})
          : Object.keys(transformedData || {}),
        processingChain: responseData.processingChain,
      });

      this.processedDataCache.set(cacheKey, responseData);
      // 设置缓存过期时间，例如500毫秒
      setTimeout(() => this.processedDataCache.delete(cacheKey), 500);

      return responseData;
    } catch (error) {
      // 🎯 记录数据处理错误指标
      this.performanceMetrics.recordError('data_processing');
      
      this.logger.error(`处理提供商数据失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 清理客户端订阅
   */
  async cleanupClientSubscription(clientId: string): Promise<void> {
    const subscription = this.clientSubscriptions.get(clientId);
    
    if (subscription) {
      try {
        this.clientSubscriptions.delete(clientId);
        this.messageCallbacks.delete(clientId); // 清理回调函数

        const listenerKey = `${subscription.providerName}:${subscription.wsCapabilityType}`;
        const remainingSubscriptions = Array.from(this.clientSubscriptions.values())
          .some(s => s.providerName === subscription.providerName && s.wsCapabilityType === subscription.wsCapabilityType);

        if (!remainingSubscriptions) {
          await subscription.capability.cleanup();
          this.providerStreamListeners.delete(listenerKey);
          this.logger.log(`已清理提供商 ${subscription.providerName} 的 ${subscription.wsCapabilityType} 监听器`);
        }
        
        this.logger.log(`已清理客户端 ${clientId} 的订阅`);
      } catch (error) {
        this.logger.error({
          message: '清理客户端订阅失败',
          clientId,
          error: error.message,
        });
      }
    }
  }

  /**
   * 获取客户端订阅信息
   */
  getClientSubscription(clientId: string): ClientSubscription | undefined {
    return this.clientSubscriptions.get(clientId);
  }

  /**
   * 复用现有的市场推断逻辑
   */
  private inferMarkets(symbols: string[]): string[] {
    return symbols.map(symbol => this.inferMarket(symbol));
  }

  /**
   * 推断单个符号的市场
   */
  private inferMarket(symbol: string): string {
    if (symbol.endsWith('.HK') || /^\d{5}$/.test(symbol)) return 'HK';
    if (symbol.endsWith('.US') || /^[A-Z]{1,5}$/.test(symbol)) return 'US';
    if (symbol.endsWith('.SZ') || symbol.startsWith('00') || symbol.startsWith('30')) return 'SZ';
    if (symbol.endsWith('.SH') || symbol.startsWith('60') || symbol.startsWith('68')) return 'SH';
    if (symbol.endsWith('.SG')) return 'SG';
    return 'US'; // 默认美股
  }

  /**
   * 🔧 符号匹配辅助方法 - 处理不同格式间的符号匹配
   * @param originalSymbol 客户端订阅的原始符号
   * @param processedSymbol 处理后的符号
   */
  private isSymbolMatch(originalSymbol: string, processedSymbol: string): boolean {
    // 直接匹配
    if (originalSymbol === processedSymbol) {
      return true;
    }
    
    // 移除市场后缀匹配 (700.HK vs 00700)
    const removeMarketSuffix = (symbol: string): string => {
      return symbol.replace(/\.(HK|US|SZ|SH|SG)$/, '');
    };
    
    const originalBase = removeMarketSuffix(originalSymbol);
    const processedBase = removeMarketSuffix(processedSymbol);
    
    // 港股格式转换匹配 (700 vs 00700, AAPL vs AAPL.US)
    if (originalBase === processedBase) {
      return true;
    }
    
    // 港股前导零匹配 (700 vs 00700)
    if (originalBase.padStart(5, '0') === processedBase || 
        processedBase.padStart(5, '0') === originalBase) {
      return true;
    }
    
    // 日志记录不匹配的情况用于调试
    this.logger.debug({
      message: '符号匹配检查',
      originalSymbol,
      processedSymbol,
      originalBase,
      processedBase,
      matched: false,
    });
    
    return false;
  }

  /**
   * 获取数据规则列表类型
   */
  private getDataRuleListType(wsCapabilityType: string): string {
    const typeMapping: Record<string, string> = {
      'stream-stock-quote': 'quote_fields',
      'stream-stock-basic-info': 'basic_info_fields',
      'stream-index-quote': 'index_fields',
    };
    
    return typeMapping[wsCapabilityType] || 'quote_fields';
  }

  /**
   * 🎯 批量处理报价数据
   */
  private async processBatchQuotes(quotes: QuoteData[]): Promise<void> {
    if (quotes.length === 0) {
      return;
    }

    const batchStartTime = Date.now();
    this.batchProcessingStats.totalBatches++;
    this.batchProcessingStats.totalQuotes += quotes.length;

    try {
      if (quotes.length === 1) {
        // 单条直接处理，避免批量开销
        const quote = quotes[0];
        const processedData = await this.processAndCacheProviderData(quote.rawData, quote.providerName, quote.wsCapabilityType);
        
        // 🔧 修复：单条批量处理也需要触发客户端回调
        if (processedData) {
          this.clientSubscriptions.forEach((sub, clientId) => {
            if (sub.providerName === quote.providerName && 
                sub.wsCapabilityType === quote.wsCapabilityType) {
              
              const hasMatchingSymbol = processedData.symbols.some((processedSymbol: string) => {
                if (sub.symbols.has(processedSymbol)) {
                  return true;
                }
                
                for (const originalSymbol of sub.symbols) {
                  if (this.isSymbolMatch(originalSymbol, processedSymbol)) {
                    return true;
                  }
                }
                return false;
              });
              
              if (hasMatchingSymbol) {
                const messageCallback = this.messageCallbacks.get(clientId);
                if (messageCallback) {
                  this.logger.debug({
                    message: '单条批量处理：触发客户端回调',
                    clientId,
                    processedSymbols: processedData.symbols,
                    clientSymbols: Array.from(sub.symbols),
                    providerName: quote.providerName,
                  });
                  this.handleProviderMessage(clientId, processedData, messageCallback);
                } else {
                  this.logger.warn({
                    message: '单条批量处理：客户端回调函数不存在',
                    clientId,
                    hasSubscription: true,
                    totalCallbacks: this.messageCallbacks.size,
                  });
                }
              }
            }
          });
        }
        
        // 🎯 记录单条批量处理指标
        const singleProcessingTime = Date.now() - batchStartTime;
        this.performanceMetrics.recordBatchProcessed(
          1, // quotesCount
          singleProcessingTime,
          true // 成功处理
        );
        
        return;
      }

      // 按 provider 分组批量处理
      const quotesByProvider = quotes.reduce((groups, quote) => {
        const key = `${quote.providerName}:${quote.wsCapabilityType}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(quote);
        return groups;
      }, {} as Record<string, QuoteData[]>);

      // 并行处理各 provider 的批量数据
      const batchPromises = Object.entries(quotesByProvider).map(([key, providerQuotes]) => {
        const [providerName, wsCapabilityType] = key.split(':');
        return this.processBatchByProvider(providerName, wsCapabilityType, providerQuotes);
      });

      await Promise.allSettled(batchPromises);

      const batchProcessingTime = Date.now() - batchStartTime;
      this.batchProcessingStats.batchProcessingTime += batchProcessingTime;

      // 🎯 记录批量处理性能指标
      this.performanceMetrics.recordBatchProcessed(
        quotes.length,
        batchProcessingTime,
        true // 成功处理
      );

      this.logger.debug('批量处理完成', {
        quotesCount: quotes.length,
        providersCount: Object.keys(quotesByProvider).length,
        batchProcessingTime,
        avgProcessingTime: batchProcessingTime / quotes.length,
      });

    } catch (error) {
      const batchProcessingTime = Date.now() - batchStartTime;
      
      // 🎯 记录批量处理失败指标
      this.performanceMetrics.recordBatchProcessed(
        quotes.length,
        batchProcessingTime,
        false // 处理失败
      );
      
      this.logger.error('批量处理失败', {
        quotesCount: quotes.length,
        error: error.message
      });

      // 降级处理：逐个处理
      for (const quote of quotes) {
        try {
          await this.processAndCacheProviderData(quote.rawData, quote.providerName, quote.wsCapabilityType);
        } catch (individualError) {
          this.logger.warn(`单个报价处理失败: ${individualError.message}`);
        }
      }
    }
  }

  /**
   * 🎯 按提供商批量处理报价数据
   */
  private async processBatchByProvider(
    providerName: string,
    wsCapabilityType: string,
    quotes: QuoteData[]
  ): Promise<void> {
    const symbols = quotes.map(q => q.rawData.symbol).filter(Boolean);
    
    if (symbols.length === 0) {
      return;
    }

    try {
      // 批量预热符号映射
      if (symbols.length >= this.featureFlags.batchSizeThreshold) {
        const preloadResult = await this.batchOptimizationService.preloadSymbolMappings(symbols, 'standard', providerName);
        
        // 🎯 记录批量预加载缓存指标
        const hitRate = (preloadResult.size / symbols.length) * 100;
        this.performanceMetrics.recordBatchPreloadCacheHit(symbols.length, hitRate);
      }

      // 并行处理所有报价数据
      const processingPromises = quotes.map(async quote => {
        const processedData = await this.processAndCacheProviderData(quote.rawData, quote.providerName, quote.wsCapabilityType);
        return { quote, processedData };
      });

      const results = await Promise.allSettled(processingPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      // 🎯 批量处理完成后，触发客户端消息回调
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.processedData) {
          const { processedData } = result.value;
          
          // 找到匹配的客户端订阅并触发回调
          this.clientSubscriptions.forEach((sub, clientId) => {
            if (sub.providerName === providerName && 
                sub.wsCapabilityType === wsCapabilityType) {
              
              // 🔧 修复：更精确的符号匹配逻辑，考虑格式转换
              const hasMatchingSymbol = processedData.symbols.some((processedSymbol: string) => {
                // 检查直接匹配
                if (sub.symbols.has(processedSymbol)) {
                  return true;
                }
                
                // 检查原始符号匹配（处理格式转换情况）
                for (const originalSymbol of sub.symbols) {
                  if (this.isSymbolMatch(originalSymbol, processedSymbol)) {
                    return true;
                  }
                }
                return false;
              });
              
              if (hasMatchingSymbol) {
                const messageCallback = this.messageCallbacks.get(clientId);
                if (messageCallback) {
                  this.logger.debug({
                    message: '批量处理：触发客户端回调',
                    clientId,
                    processedSymbols: processedData.symbols,
                    clientSymbols: Array.from(sub.symbols),
                    providerName,
                  });
                  this.handleProviderMessage(clientId, processedData, messageCallback);
                } else {
                  this.logger.warn({
                    message: '批量处理：客户端回调函数不存在',
                    clientId,
                    hasSubscription: true,
                    totalCallbacks: this.messageCallbacks.size,
                  });
                }
              }
            }
          });
        }
      }

      this.logger.debug(`提供商 ${providerName} 批量处理结果`, {
        totalQuotes: quotes.length,
        successCount,
        failureCount: quotes.length - successCount,
        wsCapabilityType,
      });

    } catch (error) {
      this.logger.error(`提供商 ${providerName} 批量处理失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 获取批量处理统计信息
   */
  getBatchProcessingStats(): typeof this.batchProcessingStats & {
    avgBatchSize: number;
    avgBatchProcessingTime: number;
  } {
    return {
      ...this.batchProcessingStats,
      avgBatchSize: this.batchProcessingStats.totalBatches > 0 
        ? this.batchProcessingStats.totalQuotes / this.batchProcessingStats.totalBatches 
        : 0,
      avgBatchProcessingTime: this.batchProcessingStats.totalBatches > 0
        ? this.batchProcessingStats.batchProcessingTime / this.batchProcessingStats.totalBatches
        : 0,
    };
  }
}