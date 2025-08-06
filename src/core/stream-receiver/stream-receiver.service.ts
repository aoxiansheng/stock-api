import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { CapabilityRegistryService } from '../../providers/services/capability-registry.service';
import { SymbolMapperService } from '../symbol-mapper/services/symbol-mapper.service';
import { DataMapperService } from '../data-mapper/services/data-mapper.service';
import { TransformerService } from '../transformer/services/transformer.service';
import { IStreamCapability } from '../../providers/interfaces/stream-capability.interface';
import { StreamSubscribeDto, StreamUnsubscribeDto } from './dto';
import { TransformRequestDto } from '../transformer/dto/transform-request.dto';

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

@Injectable()
export class StreamReceiverService {
  private readonly logger = createLogger(StreamReceiverService.name);
  private readonly clientSubscriptions = new Map<string, ClientSubscription>();
  private readonly processedDataCache = new Map<string, any>();
  private readonly providerStreamListeners = new Map<string, boolean>();

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly symbolMapperService: SymbolMapperService,
    private readonly dataMapperService: DataMapperService,
    private readonly transformerService: TransformerService,
  ) {
    this.logger.log('StreamReceiverService 初始化，集成7组件架构');
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

      const mappedSymbols = await this.symbolMapperService.transformSymbols(providerName, symbols);

      this.logger.debug({
        message: '订阅时符号转换为提供商格式',
        provider: providerName,
        originalSymbols: symbols,
        transformedSymbols: mappedSymbols.transformedSymbols,
      });

      if (!capability.isConnected(contextService)) {
        await capability.initialize(contextService);
        if (!capability.isConnected(contextService)) {
          throw new Error(`流能力初始化失败：${providerName}/${wsCapabilityType}`);
        }
        this.logger.log(`流能力连接初始化成功: ${providerName}/${wsCapabilityType}`);
      }

      const listenerKey = `${providerName}:${wsCapabilityType}`;
      if (!this.providerStreamListeners.has(listenerKey)) {
        contextService.onQuoteUpdate(async (rawData: any) => {
          const processedData = await this.processAndCacheProviderData(rawData, providerName, wsCapabilityType);
          if (processedData) {
            this.clientSubscriptions.forEach(sub => {
              if (sub.providerName === providerName && sub.wsCapabilityType === wsCapabilityType && sub.symbols.has(processedData.symbols[0])) {
                this.handleProviderMessage(sub.clientId, processedData, messageCallback);
              }
            });
          }
        });
        this.providerStreamListeners.set(listenerKey, true);
      }

      const transformedSymbols = Object.values(mappedSymbols.transformedSymbols || {});
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
   */
  private async handleProviderMessage(
    clientId: string,
    processedData: any,
    messageCallback: (data: any) => void,
  ): Promise<void> {
    try {
      messageCallback(processedData);

      this.logger.debug({
        message: '实时流数据处理完成',
        clientId,
        provider: processedData.provider,
        processingTime: Date.now() - (processedData.timestamp - 5), // 估算处理时间
        symbolsCount: processedData.symbols.length,
      });

    } catch (error) {
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
    return {
      symbol,
      lastPrice: rawData.last_done || rawData.lastPrice || rawData.price,
      prevClose: rawData.prev_close || rawData.prevClose,
      open: rawData.open || rawData.openPrice,
      high: rawData.high || rawData.highPrice, 
      low: rawData.low || rawData.lowPrice,
      volume: rawData.volume || rawData.totalVolume,
      turnover: rawData.turnover || rawData.totalTurnover,
      timestamp: rawData.timestamp || Date.now(),
      _provider: rawData._provider || 'unknown',
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
      try {
        mappingRules = await this.dataMapperService.getMappingRule(providerName, dataRuleListType);
      } catch (error) {
        this.logger.warn(`获取映射规则失败: ${error.message}`);
      }

      // 3. 数据转换和标准化
      let transformedData;
      if (mappingRules && mappingRules.length > 0) {
        const transformRequest: TransformRequestDto = {
          rawData,
          provider: providerName,
          transDataRuleListType: dataRuleListType,
        };
        const transformResponse = await this.transformerService.transform(transformRequest);
        transformedData = transformResponse.transformedData;
      } else {
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
          mappingRulesUsed: !!mappingRules,
          dataTransformed: true,
        },
      };

      this.processedDataCache.set(cacheKey, responseData);
      // 设置缓存过期时间，例如500毫秒
      setTimeout(() => this.processedDataCache.delete(cacheKey), 500);

      return responseData;
    } catch (error) {
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
    return symbols.map(symbol => {
      if (symbol.endsWith('.HK') || /^\d{5}$/.test(symbol)) return 'HK';
      if (symbol.endsWith('.US') || /^[A-Z]{1,5}$/.test(symbol)) return 'US';
      if (symbol.endsWith('.SZ') || symbol.startsWith('00') || symbol.startsWith('30')) return 'SZ';
      if (symbol.endsWith('.SH') || symbol.startsWith('60') || symbol.startsWith('68')) return 'SH';
      if (symbol.endsWith('.SG')) return 'SG';
      return 'US'; // 默认美股
    });
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
}