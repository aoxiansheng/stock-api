import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { CapabilityRegistryService } from '../../providers/services/capability-registry.service';
import { SymbolMapperService } from '../symbol-mapper/services/symbol-mapper.service';
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
    private readonly transformerService: TransformerService,
  ) {}

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
      if (!capability.isConnected()) {
        await capability.initialize(contextService);
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
   * 处理提供商消息
   */
  private async handleProviderMessage(
    clientId: string,
    rawData: any,
    providerName: string,
    capabilityType: string,
    messageCallback: (data: any) => void,
  ): Promise<void> {
    try {
      // 1. 数据转换（复用现有 Transformer）
      const dataRuleListType = this.getDataRuleListType(capabilityType);
      const transformRequest: TransformRequestDto = {
        rawData,
        provider: providerName,
        transDataRuleListType: dataRuleListType,
      };
      const transformResponse = await this.transformerService.transform(transformRequest);
      const transformedData = transformResponse.transformedData;

      // 2. 构造响应数据
      const responseData = {
        symbols: Array.isArray(transformedData) 
          ? transformedData.map(item => item.symbol).filter(Boolean)
          : [rawData.symbol].filter(Boolean),
        data: transformedData,
        timestamp: Date.now(),
        provider: providerName,
        capability: capabilityType,
      };

      // 3. 推送给客户端（无缓存，直接推送）
      messageCallback(responseData);

    } catch (error) {
      this.logger.error({
        message: '处理流数据失败',
        clientId,
        provider: providerName,
        error: error.message,
      });
    }
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