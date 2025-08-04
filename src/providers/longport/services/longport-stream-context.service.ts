import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@common/config/logger.config';

// LongPort SDK 导入
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Config, QuoteContext, SubType } = require('longport');

/**
 * LongPort WebSocket 流上下文服务
 * 管理 LongPort WebSocket 连接和订阅
 */
@Injectable()
export class LongportStreamContextService implements OnModuleDestroy {
  private readonly logger = createLogger(LongportStreamContextService.name);
  private quoteContext: any; // LongPort QuoteContext
  private config: any; // LongPort Config
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒
  private messageCallbacks: ((data: any) => void)[] = [];
  private subscribedSymbols = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化 WebSocket 连接
   */
  async initializeWebSocket(): Promise<void> {
    try {
      if (this.isConnected && this.quoteContext) {
        this.logger.log('LongPort WebSocket 已连接');
        return;
      }

      // 创建 LongPort 配置
      this.config = Config.fromEnv();
      
      // 如果环境变量不存在，使用配置服务中的值
      if (!process.env.LONGPORT_APP_KEY) {
        const appKey = this.configService.get('LONGPORT_APP_KEY');
        const appSecret = this.configService.get('LONGPORT_APP_SECRET');
        const accessToken = this.configService.get('LONGPORT_ACCESS_TOKEN');

        if (appKey && appSecret && accessToken) {
          this.config = new Config(appKey, appSecret, accessToken);
        } else {
          throw new Error('LongPort 配置不完整：缺少 APP_KEY、APP_SECRET 或 ACCESS_TOKEN');
        }
      }

      // 创建 QuoteContext
      this.quoteContext = await QuoteContext.new(this.config);

      // 设置报价数据回调
      this.quoteContext.setOnQuote((_, event) => {
        this.handleQuoteUpdate(event);
      });

      // LongPort SDK 不提供连接状态监听方法
      // 假设连接成功，使用其他方式检测连接状态
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('LongPort WebSocket 初始化成功');

    } catch (error) {
      this.logger.error({
        message: 'LongPort WebSocket 初始化失败',
        error: error.message,
      });
      throw new Error(`LongPort WebSocket 初始化失败: ${error.message}`);
    }
  }

  /**
   * 订阅符号数据
   * @param symbols 股票符号数组（最多500个）
   * @param subTypes 订阅类型（默认：Quote）
   * @param isFirstPush 是否首次推送（默认：true）
   */
  async subscribe(
    symbols: string[], 
    subTypes: any[] = [SubType.Quote], 
    isFirstPush: boolean = true
  ): Promise<void> {
    try {
      // 检查符号数量限制（文档显示最多500个）
      if (symbols.length > 500) {
        throw new Error(`符号数量超过限制，最多支持500个，当前：${symbols.length}`);
      }

      if (!this.isConnected || !this.quoteContext) {
        throw new Error('LongPort WebSocket 未连接');
      }

      // 过滤已订阅的符号
      const newSymbols = symbols.filter(symbol => !this.subscribedSymbols.has(symbol));
      
      if (newSymbols.length === 0) {
        this.logger.log('所有符号已订阅，跳过');
        return;
      }

      // 执行订阅，严格按照文档参数格式
      await this.quoteContext.subscribe(newSymbols, subTypes, isFirstPush);

      // 记录已订阅符号
      newSymbols.forEach(symbol => this.subscribedSymbols.add(symbol));

      this.logger.log({
        message: 'LongPort WebSocket 订阅成功',
        symbols: newSymbols,
        subTypes: subTypes.map(type => type.toString()),
        isFirstPush,
        totalSubscribed: this.subscribedSymbols.size,
      });

    } catch (error) {
      this.logger.error({
        message: 'LongPort WebSocket 订阅失败',
        symbols,
        error: error.message,
        errorCode: this.parseErrorCode(error),
      });
      throw new Error(`LongPort WebSocket 订阅失败: ${error.message}`);
    }
  }

  /**
   * 解析LongPort错误代码
   */
  private parseErrorCode(error: any): string | null {
    if (!error || !error.message) return null;
    
    const message = error.message.toString();
    
    // 根据文档定义的错误代码
    if (message.includes('301606')) return '301606: Rate limiting exceeded';
    if (message.includes('301605')) return '301605: Subscription quantity exceeded';
    if (message.includes('301600')) return '301600: Invalid request parameters';
    
    return null;
  }

  /**
   * 取消订阅符号数据
   * @param symbols 股票符号数组
   * @param subTypes 订阅类型（默认：Quote）
   */
  async unsubscribe(symbols: string[], subTypes: any[] = [SubType.Quote]): Promise<void> {
    try {
      if (!this.isConnected || !this.quoteContext) {
        this.logger.warn('LongPort WebSocket 未连接，无法取消订阅');
        return;
      }

      // 过滤已订阅的符号
      const subscribedSymbols = symbols.filter(symbol => this.subscribedSymbols.has(symbol));
      
      if (subscribedSymbols.length === 0) {
        this.logger.log('没有符号需要取消订阅');
        return;
      }

      // 执行取消订阅，使用与订阅相同的参数格式
      await this.quoteContext.unsubscribe(subscribedSymbols, subTypes);

      // 移除已订阅符号记录
      subscribedSymbols.forEach(symbol => this.subscribedSymbols.delete(symbol));

      this.logger.log({
        message: 'LongPort WebSocket 取消订阅成功',
        symbols: subscribedSymbols,
        subTypes: subTypes.map(type => type.toString()),
        totalSubscribed: this.subscribedSymbols.size,
      });

    } catch (error) {
      this.logger.error({
        message: 'LongPort WebSocket 取消订阅失败',
        symbols,
        error: error.message,
        errorCode: this.parseErrorCode(error),
      });
      throw new Error(`LongPort WebSocket 取消订阅失败: ${error.message}`);
    }
  }

  /**
   * 添加消息回调
   */
  onQuoteUpdate(callback: (data: any) => void): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * 获取连接状态
   * 由于LongPort SDK不提供直接的连接状态检查，我们基于QuoteContext是否存在来判断
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.quoteContext !== null;
  }

  /**
   * 获取已订阅符号
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * 处理报价更新
   */
  private handleQuoteUpdate(event: any): void {
    try {
      // 解析 LongPort 报价事件
      const eventData = this.parseLongportQuoteEvent(event);
      
      // 通知所有回调
      this.messageCallbacks.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          this.logger.error({
            message: '报价回调处理失败',
            error: error.message,
          });
        }
      });

    } catch (error) {
      this.logger.error({
        message: '处理报价更新失败',
        error: error.message,
      });
    }
  }

  /**
   * 解析 LongPort 报价事件
   * 根据文档，LongPort返回的数据格式需要正确解析
   */
  private parseLongportQuoteEvent(event: any): any {
    try {
      // LongPort SDK可能直接返回对象或需要toString()解析
      let parsedEvent: any;
      
      if (typeof event === 'object' && event !== null) {
        parsedEvent = event;
      } else {
        const eventStr = event.toString();
        parsedEvent = JSON.parse(eventStr || '{}');
      }

      // 标准化字段名，确保与文档一致
      const standardizedEvent = {
        symbol: parsedEvent.symbol || parsedEvent.code,
        last_done: parsedEvent.last_done || parsedEvent.lastPrice || parsedEvent.price,
        prev_close: parsedEvent.prev_close || parsedEvent.prevClose,
        open: parsedEvent.open || parsedEvent.openPrice,
        high: parsedEvent.high || parsedEvent.highPrice,
        low: parsedEvent.low || parsedEvent.lowPrice,
        volume: parsedEvent.volume || parsedEvent.totalVolume,
        turnover: parsedEvent.turnover || parsedEvent.totalTurnover,
        timestamp: parsedEvent.timestamp || parsedEvent.time || Date.now(),
        trade_status: parsedEvent.trade_status || parsedEvent.tradeStatus,
        // LongPort特有字段
        current_volume: parsedEvent.current_volume,
        current_turnover: parsedEvent.current_turnover,
        // 保留原始数据用于调试
        _raw: parsedEvent,
        _provider: 'longport',
      };

      // 验证必要字段
      if (!standardizedEvent.symbol) {
        this.logger.warn('LongPort 报价事件缺少symbol字段', { event: parsedEvent });
      }

      return standardizedEvent;

    } catch (error) {
      this.logger.error({
        message: '解析 LongPort 报价事件失败',
        error: error.message,
        event: typeof event === 'object' ? JSON.stringify(event) : event.toString(),
      });
      
      // 返回基础数据结构
      return {
        symbol: 'UNKNOWN',
        timestamp: Date.now(),
        _raw: event,
        _provider: 'longport',
        _error: 'parse_failed',
      };
    }
  }

  /**
   * 手动重连方法
   * 由于LongPort SDK不提供连接状态监听，需要外部触发重连
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('LongPort WebSocket 重连次数超限，停止重连');
      throw new Error('重连次数超限');
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.log({
      message: 'LongPort WebSocket 准备重连',
      attempt: this.reconnectAttempts,
      delay,
    });

    try {
      // 清理当前连接
      this.isConnected = false;
      this.quoteContext = null;
      
      // 等待重连延迟
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 重新初始化
      await this.initializeWebSocket();
      
      // 重新订阅之前的符号
      if (this.subscribedSymbols.size > 0) {
        const symbolsToResubscribe = Array.from(this.subscribedSymbols);
        this.subscribedSymbols.clear();
        await this.subscribe(symbolsToResubscribe);
      }

      this.logger.log('LongPort WebSocket 重连成功');
      
    } catch (error) {
      this.logger.error({
        message: 'LongPort WebSocket 重连失败',
        attempt: this.reconnectAttempts,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      if (this.quoteContext) {
        // 取消所有订阅
        if (this.subscribedSymbols.size > 0) {
          await this.unsubscribe(Array.from(this.subscribedSymbols));
        }

        // 关闭连接
        this.quoteContext = null;
        this.isConnected = false;
        this.messageCallbacks = [];
        this.subscribedSymbols.clear();

        this.logger.log('LongPort WebSocket 资源清理完成');
      }
    } catch (error) {
      this.logger.error({
        message: 'LongPort WebSocket 资源清理失败',
        error: error.message,
      });
    }
  }

  /**
   * 模块销毁时清理
   */
  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }
}