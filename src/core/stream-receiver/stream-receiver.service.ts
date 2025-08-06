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
  capabilityType: string;
  providerName: string;
  capability: IStreamCapability;
  contextService: any;
}

@Injectable()
export class StreamReceiverService {
  private readonly logger = createLogger(StreamReceiverService.name);
  private readonly clientSubscriptions = new Map<string, ClientSubscription>();

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
    const { symbols, capabilityType, preferredProvider } = subscribeDto;

    try {
      // 1. 智能市场推断（复用现有逻辑）
      const markets = this.inferMarkets(symbols);
      const primaryMarket = markets[0];

      // 2. 获取最佳提供商（使用流能力注册表）
      const providerName = preferredProvider || 
        this.capabilityRegistry.getBestStreamProvider(capabilityType, primaryMarket);

      if (!providerName) {
        throw new Error(`未找到支持 ${capabilityType} 能力的数据提供商`);
      }

      // 3. 获取流能力
      const capability = this.capabilityRegistry.getStreamCapability(providerName, capabilityType);
      if (!capability) {
        throw new Error(`提供商 ${providerName} 不支持 ${capabilityType} 流能力`);
      }

      // 4. 获取提供商上下文服务
      const provider = this.capabilityRegistry.getProvider(providerName);
      const contextService = provider?.getStreamContextService?.();

      if (!contextService) {
        throw new Error(`提供商 ${providerName} 未提供流上下文服务`);
      }

      // 5. 符号映射转换（复用现有组件）
      const mappedSymbols = await this.symbolMapperService.transformSymbols(
        providerName,
        symbols,
      );

      // 6. 初始化连接（如果尚未连接）
      if (!capability.isConnected(contextService)) {
        this.logger.debug({
          message: '开始初始化流能力连接',
          provider: providerName,
          capability: capabilityType,
          clientId,
        });
        await capability.initialize(contextService);
        
        // 验证初始化是否成功
        if (!capability.isConnected(contextService)) {
          throw new Error(`流能力初始化失败：${providerName}/${capabilityType} 连接状态仍为未连接`);
        }
        
        this.logger.log({
          message: '流能力连接初始化成功',
          provider: providerName,
          capability: capabilityType,
          clientId,
        });
      }

      // 7. 设置消息回调（通过上下文服务）
      contextService.onQuoteUpdate(async (rawData: any) => {
        await this.handleProviderMessage(
          clientId,
          rawData,
          providerName,
          capabilityType,
          messageCallback,
        );
      });

      // 8. 执行订阅 - 使用转换后的符号
      const transformedSymbols = Object.values(mappedSymbols.transformedSymbols || {});
      const symbolsToSubscribe = transformedSymbols.length > 0 ? transformedSymbols : symbols;
      await capability.subscribe(symbolsToSubscribe, contextService);

      // 9. 记录客户端订阅信息
      this.clientSubscriptions.set(clientId, {
        clientId,
        symbols: new Set(symbols),
        capabilityType,
        providerName,
        capability,
        contextService,
      });

      this.logger.log({
        message: 'WebSocket 订阅成功',
        clientId,
        symbols,
        provider: providerName,
        capability: capabilityType,
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
      
      // 符号映射转换
      const mappedSymbols = await this.symbolMapperService.transformSymbols(
        subscription.providerName,
        symbols,
      );

      // 执行取消订阅 - 使用转换后的符号
      const transformedSymbols = Object.values(mappedSymbols.transformedSymbols || {});
      const symbolsToUnsubscribe = transformedSymbols.length > 0 ? transformedSymbols : symbols;
      await subscription.capability.unsubscribe(symbolsToUnsubscribe, subscription.contextService);

      // 更新订阅状态
      symbols.forEach(symbol => subscription.symbols.delete(symbol));

      // 如果没有更多订阅，清理客户端信息
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
    rawData: any,
    providerName: string,
    capabilityType: string,
    messageCallback: (data: any) => void,
  ): Promise<void> {
    try {
      this.logger.debug({
        message: '开始处理实时流数据',
        clientId,
        provider: providerName,
        capability: capabilityType,
        hasSymbol: !!rawData.symbol,
      });

      // 1. 符号格式转换（SymbolMapper）
      let standardSymbol = rawData.symbol;
      if (rawData.symbol) {
        try {
          // 使用正确的方法名称：mapSymbol(originalSymbol, fromProvider, toProvider)
          // 这里我们从provider格式转换为标准格式，所以toProvider使用'standard'
          const mappedSymbol = await this.symbolMapperService.mapSymbol(rawData.symbol, providerName, 'standard');
          standardSymbol = mappedSymbol || rawData.symbol;
          
          this.logger.debug({
            message: '符号转换完成',
            originalSymbol: rawData.symbol,
            standardSymbol,
            provider: providerName,
          });
        } catch (error) {
          this.logger.warn(`符号转换失败，使用原始符号: ${error.message}`);
        }
      }

      // 2. 获取数据映射规则（DataMapper）
      const dataRuleListType = this.getDataRuleListType(capabilityType);
      let mappingRules = null;
      
      try {
        mappingRules = await this.dataMapperService.getMappingRule(providerName, dataRuleListType);
        
        this.logger.debug({
          message: '数据映射规则获取完成',
          provider: providerName,
          ruleType: dataRuleListType,
          rulesCount: mappingRules?.length || 0,
        });
      } catch (error) {
        this.logger.warn(`获取映射规则失败，使用默认转换: ${error.message}`);
      }

      // 3. 数据转换和标准化（Transformer）
      let transformedData;
      
      if (mappingRules && mappingRules.length > 0) {
        // 使用映射规则进行精确转换
        const transformRequest: TransformRequestDto = {
          rawData,
          provider: providerName,
          transDataRuleListType: dataRuleListType,
        };
        const transformResponse = await this.transformerService.transform(transformRequest);
        transformedData = transformResponse.transformedData;
      } else {
        // 备用：基础数据结构标准化
        transformedData = this.standardizeBasicData(rawData, standardSymbol);
      }

      this.logger.debug({
        message: '数据转换完成',
        hasTransformedData: !!transformedData,
        dataType: typeof transformedData,
        isArray: Array.isArray(transformedData),
      });

      // 4. 直接输出标准化数据（跳过Storage，保证实时性）
      const responseData = {
        symbols: Array.isArray(transformedData) 
          ? transformedData.map(item => item.symbol || standardSymbol).filter(Boolean)
          : [standardSymbol].filter(Boolean),
        data: transformedData,
        timestamp: Date.now(),
        provider: providerName,
        capability: capabilityType,
        // 添加处理链路信息用于调试
        processingChain: {
          symbolMapped: standardSymbol !== rawData.symbol,
          mappingRulesUsed: !!mappingRules,
          dataTransformed: true,
        },
      };

      // 5. 推送给客户端（实时推送，无持久化）
      messageCallback(responseData);

      this.logger.debug({
        message: '实时流数据处理完成',
        clientId,
        provider: providerName,
        processingTime: Date.now() - (responseData.timestamp - 5), // 估算处理时间
        symbolsCount: responseData.symbols.length,
      });

    } catch (error) {
      this.logger.error({
        message: '处理实时流数据失败',
        clientId,
        provider: providerName,
        capability: capabilityType,
        error: error.message,
        errorStack: error.stack,
      });
      
      // 错误情况下推送基础数据结构
      const fallbackData = {
        symbols: [rawData.symbol].filter(Boolean),
        data: this.standardizeBasicData(rawData, rawData.symbol),
        timestamp: Date.now(),
        provider: providerName,
        capability: capabilityType,
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
   * 清理客户端订阅
   */
  async cleanupClientSubscription(clientId: string): Promise<void> {
    const subscription = this.clientSubscriptions.get(clientId);
    
    if (subscription) {
      try {
        // 清理能力资源
        await subscription.capability.cleanup();
        
        // 移除订阅记录
        this.clientSubscriptions.delete(clientId);
        
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
  private getDataRuleListType(capabilityType: string): string {
    const typeMapping: Record<string, string> = {
      'stream-stock-quote': 'quote_fields',
      'stream-stock-basic-info': 'basic_info_fields',
      'stream-index-quote': 'index_fields',
    };
    
    return typeMapping[capabilityType] || 'quote_fields';
  }
}