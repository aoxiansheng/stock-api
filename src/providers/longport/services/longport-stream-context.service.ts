import { Injectable, OnModuleDestroy, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@app/config/logger.config";
import { PROVIDER_TIMEOUT, ConnectionStatus, IConnectionState, CONNECTION_CONFIG } from "../../constants";
import { REFERENCE_DATA } from '@common/constants/domain';

// LongPort SDK 导入
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Config, QuoteContext, SubType } = require(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);

/**
 * LongPort WebSocket 流上下文服务
 * 使用严格单例模式管理 LongPort WebSocket 连接和订阅
 *
 * 遵循NestJS最佳实践：
 * - 使用@Injectable装饰器
 * - 实现OnModuleDestroy接口进行资源清理
 * - 使用静态单例模式确保全局唯一实例
 * - 线程安全的初始化机制
 */
@Injectable({ scope: Scope.DEFAULT }) // 明确声明为默认作用域（单例）
export class LongportStreamContextService implements OnModuleDestroy {
  private readonly logger = createLogger(LongportStreamContextService.name);

  // === 单例模式实现 ===
  private static instance: LongportStreamContextService | null = null;
  private static initializationLock = false;
  private static readonly lockTimeout = PROVIDER_TIMEOUT.LOCK_TIMEOUT_MS;

  // === 连接管理 ===
  private quoteContext: any | null = null; // LongPort QuoteContext
  private config: any | null = null; // LongPort Config
  private connectionState: IConnectionState = {
    status: ConnectionStatus.NOT_STARTED,
    isInitialized: false,
    lastConnectionTime: null,
    subscriptionCount: 0,
    connectionId: null,
    healthStatus: CONNECTION_CONFIG.HEALTH_STATUS.HEALTHY,
  };

  // === 重连机制 ===
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = PROVIDER_TIMEOUT.MAX_RECONNECT_ATTEMPTS;
  private readonly reconnectDelay = PROVIDER_TIMEOUT.RECONNECT_DELAY_MS;

  // === 回调和订阅管理 ===
  private messageCallbacks: ((data: any) => void)[] = [];
  private subscribedSymbols = new Set<string>(); // 当前连接下已订阅的符号

  constructor(private readonly configService: ConfigService) {
    this.logger.log("LongportStreamContextService 构造函数调用");
  }

  /**
   * 获取单例实例
   * 遵循NestJS依赖注入原则，通过工厂方法提供单例实例
   */
  public static async getInstance(
    configService: ConfigService,
  ): Promise<LongportStreamContextService> {
    if (LongportStreamContextService.instance) {
      return LongportStreamContextService.instance;
    }

    // 实现线程安全的单例初始化
    if (LongportStreamContextService.initializationLock) {
      // 等待其他线程完成初始化
      await LongportStreamContextService.waitForInitialization();
      if (LongportStreamContextService.instance) {
        return LongportStreamContextService.instance;
      }
    }

    LongportStreamContextService.initializationLock = true;

    try {
      if (!LongportStreamContextService.instance) {
        LongportStreamContextService.instance =
          new LongportStreamContextService(configService);
        const logger = createLogger("LongportStreamContextService.getInstance");
        logger.log("单例实例创建成功");
      }
      return LongportStreamContextService.instance;
    } finally {
      LongportStreamContextService.initializationLock = false;
    }
  }

  /**
   * 等待初始化完成（线程安全）
   */
  private static async waitForInitialization(): Promise<void> {
    const startTime = Date.now();
    while (LongportStreamContextService.initializationLock) {
      if (Date.now() - startTime > LongportStreamContextService.lockTimeout) {
        throw new Error("LongportStreamContextService 初始化超时");
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 重置单例实例（主要用于测试环境）
   * 遵循测试最佳实践，提供清理机制
   */
  public static async resetInstance(): Promise<void> {
    if (LongportStreamContextService.instance) {
      await LongportStreamContextService.instance.cleanup();
      LongportStreamContextService.instance = null;
    }
    LongportStreamContextService.initializationLock = false;
  }

  /**
   * 获取当前连接状态
   */
  public getConnectionState(): IConnectionState {
    return { ...this.connectionState };
  }

  /**
   * 初始化 WebSocket 连接
   * 实现连接状态管理和联动清理机制
   */
  async initializeWebSocket(): Promise<void> {
    try {
      // 检查是否已经连接
      if (
        this.connectionState.status === ConnectionStatus.CONNECTED &&
        this.quoteContext
      ) {
        this.logger.log("LongPort WebSocket 已连接，跳过初始化");
        return;
      }

      // 设置初始化状态
      this.connectionState.status = ConnectionStatus.INITIALIZING;
      this.logger.log("开始初始化 LongPort WebSocket 连接");

      // 创建 LongPort 配置
      this.config = Config.fromEnv();

      // 如果环境变量不存在，使用配置服务中的值
      if (!process.env.LONGPORT_APP_KEY) {
        const appKey = this.configService.get("LONGPORT_APP_KEY");
        const appSecret = this.configService.get("LONGPORT_APP_SECRET");
        const accessToken = this.configService.get("LONGPORT_ACCESS_TOKEN");

        if (appKey && appSecret && accessToken) {
          this.config = new Config(appKey, appSecret, accessToken);
        } else {
          this.connectionState.status = ConnectionStatus.FAILED;
          this.connectionState.healthStatus = CONNECTION_CONFIG.HEALTH_STATUS.FAILED;
          throw new Error(
            "LongPort 配置不完整：缺少 APP_KEY、APP_SECRET 或 ACCESS_TOKEN",
          );
        }
      }

      // 创建 QuoteContext
      this.quoteContext = await QuoteContext.new(this.config);
      this.logger.debug("LongPort QuoteContext 创建成功");

      // 设置报价数据回调
      this.quoteContext.setOnQuote((symbol, event) => {
        this.logger.debug({
          message: "LongPort SDK WebSocket 原始报价数据",
          symbol,
          event: typeof event === "object" ? event : event?.toString(),
          eventType: typeof event,
          timestamp: Date.now(),
        });
        this.handleQuoteUpdate(event);
      });

      // 更新连接状态
      const currentTime = Date.now();
      this.connectionState = {
        status: ConnectionStatus.CONNECTED,
        isInitialized: true,
        lastConnectionTime: currentTime,
        subscriptionCount: this.subscribedSymbols.size,
        connectionId: `longport_${currentTime}`, // 生成连接ID
        healthStatus: CONNECTION_CONFIG.HEALTH_STATUS.HEALTHY,
      };

      this.reconnectAttempts = 0;

      this.logger.log({
        message: "LongPort WebSocket 初始化成功",
        connectionId: this.connectionState.connectionId,
        status: this.connectionState.status,
        quotContextCreated: !!this.quoteContext,
        configCreated: !!this.config,
        messageCallbacksCount: this.messageCallbacks.length,
      });
    } catch (error) {
      // 更新失败状态
      this.connectionState.status = ConnectionStatus.FAILED;
      this.connectionState.healthStatus = CONNECTION_CONFIG.HEALTH_STATUS.FAILED;

      this.logger.error({
        message: "LongPort WebSocket 初始化失败",
        error: error.message,
        connectionState: this.connectionState,
      });
      throw new Error(`LongPort WebSocket 初始化失败: ${error.message}`);
    }
  }

  /**
   * 处理连接断开事件
   * 实现连接状态与订阅状态联动清理
   */
  private handleConnectionLost(): void {
    this.logger.warn("LongPort WebSocket 连接断开，清理订阅状态");

    // 清理订阅状态（因为SDK连接断开后所有订阅都会失效）
    this.subscribedSymbols.clear();

    // 更新连接状态
    this.connectionState.status = ConnectionStatus.DISCONNECTED;
    this.connectionState.subscriptionCount = 0;
    this.connectionState.healthStatus = CONNECTION_CONFIG.HEALTH_STATUS.DEGRADED;
    this.connectionState.connectionId = null;

    this.logger.log({
      message: "连接断开处理完成",
      subscribedSymbolsCleared: true,
      connectionState: this.connectionState,
    });
  }

  /**
   * 处理连接恢复事件
   */
  private handleConnectionRestored(): void {
    this.logger.log("LongPort WebSocket 连接恢复");

    // 连接恢复时重置连接ID，订阅状态已在连接断开时清理
    const currentTime = Date.now();
    this.connectionState.connectionId = `longport_${currentTime}`;
    this.connectionState.lastConnectionTime = currentTime;
    this.connectionState.status = ConnectionStatus.CONNECTED;
    this.connectionState.healthStatus = CONNECTION_CONFIG.HEALTH_STATUS.HEALTHY;

    this.logger.log({
      message: "连接恢复处理完成",
      newConnectionId: this.connectionState.connectionId,
      waitingForNewSubscriptions: true,
    });
  }

  /**
   * 订阅符号数据
   * 基于连接状态的智能订阅逻辑
   * @param symbols 股票符号数组（最多500个）
   * @param subTypes 订阅类型（默认：Quote）
   * @param isFirstPush 是否首次推送（默认：true）
   */
  async subscribe(
    symbols: string[],
    subTypes: any[] = [SubType.Quote],
    isFirstPush: boolean = true,
  ): Promise<void> {
    try {
      // 检查符号数量限制（文档显示最多500个）
      if (symbols.length > 500) {
        throw new Error(
          `符号数量超过限制，最多支持500个，当前：${symbols.length}`,
        );
      }

      // 检查连接状态
      if (
        this.connectionState.status !== ConnectionStatus.CONNECTED ||
        !this.quoteContext
      ) {
        throw new Error(
          `LongPort WebSocket 未连接，当前状态: ${this.connectionState.status}`,
        );
      }

      // 基于当前连接状态过滤已订阅的符号
      // 只有在当前连接下未向SDK发起过订阅的符号才需要订阅
      const newSymbols = symbols.filter(
        (symbol) => !this.subscribedSymbols.has(symbol),
      );

      if (newSymbols.length === 0) {
        this.logger.log({
          message: "当前连接下所有符号已订阅，跳过",
          connectionId: this.connectionState.connectionId,
          requestedSymbols: symbols,
          alreadySubscribed: symbols.length,
        });
        return;
      }

      // 执行订阅，严格按照文档参数格式
      this.logger.debug({
        message: "LongPort SDK 开始执行订阅",
        connectionId: this.connectionState.connectionId,
        symbols: newSymbols,
        subTypes: subTypes.map((type) => type.toString()),
        isFirstPush,
        quotContextStatus: this.quoteContext ? "available" : "null",
      });

      await this.quoteContext.subscribe(newSymbols, subTypes, isFirstPush);

      this.logger.debug({
        message: "LongPort SDK 订阅调用完成",
        connectionId: this.connectionState.connectionId,
        symbols: newSymbols,
        subTypesUsed: subTypes.map((type) => type.toString()),
        isFirstPushUsed: isFirstPush,
      });

      // 记录已订阅符号（仅限当前连接）
      newSymbols.forEach((symbol) => this.subscribedSymbols.add(symbol));

      // 更新连接状态中的订阅计数
      this.connectionState.subscriptionCount = this.subscribedSymbols.size;

      this.logger.log({
        message: "LongPort WebSocket 订阅成功",
        connectionId: this.connectionState.connectionId,
        symbols: newSymbols,
        subTypes: subTypes.map((type) => type.toString()),
        isFirstPush,
        totalSubscribed: this.subscribedSymbols.size,
        subscribedSymbolsList: Array.from(this.subscribedSymbols),
      });
    } catch (error) {
      // 更新健康状态
      this.connectionState.healthStatus = CONNECTION_CONFIG.HEALTH_STATUS.DEGRADED;

      this.logger.error({
        message: "LongPort WebSocket 订阅失败",
        connectionId: this.connectionState.connectionId,
        symbols,
        error: error.message,
        errorCode: this.parseErrorCode(error),
        connectionState: this.connectionState,
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
    if (message.includes("301606")) return "301606: Rate limiting exceeded";
    if (message.includes("301605"))
      return "301605: Subscription quantity exceeded";
    if (message.includes("301600")) return "301600: Invalid request parameters";

    return null;
  }

  /**
   * 取消订阅符号数据
   * @param symbols 股票符号数组
   * @param subTypes 订阅类型（默认：Quote）
   */
  async unsubscribe(
    symbols: string[],
    subTypes: any[] = [SubType.Quote],
  ): Promise<void> {
    try {
      if (!this.isWebSocketConnected() || !this.quoteContext) {
        this.logger.warn("LongPort WebSocket 未连接，无法取消订阅");
        return;
      }

      // 过滤已订阅的符号
      const subscribedSymbols = symbols.filter((symbol) =>
        this.subscribedSymbols.has(symbol),
      );

      if (subscribedSymbols.length === 0) {
        this.logger.log("没有符号需要取消订阅");
        return;
      }

      // 执行取消订阅，使用与订阅相同的参数格式
      await this.quoteContext.unsubscribe(subscribedSymbols, subTypes);

      // 移除已订阅符号记录
      subscribedSymbols.forEach((symbol) =>
        this.subscribedSymbols.delete(symbol),
      );

      this.logger.log({
        message: "LongPort WebSocket 取消订阅成功",
        symbols: subscribedSymbols,
        subTypes: subTypes.map((type) => type.toString()),
        totalSubscribed: this.subscribedSymbols.size,
      });
    } catch (error) {
      this.logger.error({
        message: "LongPort WebSocket 取消订阅失败",
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
    const callbackIndex = this.messageCallbacks.length;
    this.messageCallbacks.push(callback);

    this.logger.debug({
      message: "LongPort 报价回调注册",
      callbackIndex,
      totalCallbacks: this.messageCallbacks.length,
      callbackType: typeof callback,
      isFunction: typeof callback === "function",
    });
  }

  /**
   * 获取WebSocket连接状态
   * 基于新的连接状态管理系统
   */
  isWebSocketConnected(): boolean {
    return (
      this.connectionState.status === ConnectionStatus.CONNECTED &&
      this.quoteContext !== null &&
      this.connectionState.isInitialized
    );
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
      this.logger.debug({
        message: "LongPort SDK 原始事件处理开始",
        eventType: typeof event,
        eventConstructor: event?.constructor?.name,
        eventString: event?.toString ? event.toString() : "N/A",
        eventKeys:
          typeof event === "object" && event ? Object.keys(event) : "N/A",
      });

      // 解析 LongPort 报价事件
      const eventData = this.parseLongportQuoteEvent(event);

      this.logger.debug({
        message: "LongPort 报价事件解析完成",
        parsedData: eventData,
        hasSymbol: !!eventData.symbol,
        hasPrice: !!eventData.last_done,
        hasTimestamp: !!eventData.timestamp,
      });

      // 通知所有回调
      this.messageCallbacks.forEach((callback, index) => {
        try {
          this.logger.debug({
            message: `调用报价回调 #${index}`,
            callbackIndex: index,
            totalCallbacks: this.messageCallbacks.length,
            symbol: eventData.symbol,
          });
          callback(eventData);
        } catch (error) {
          this.logger.error({
            message: "报价回调处理失败",
            callbackIndex: index,
            error: error.message,
            eventData,
          });
        }
      });

      this.logger.debug({
        message: "LongPort 报价更新处理完成",
        symbol: eventData.symbol,
        callbacksNotified: this.messageCallbacks.length,
      });
    } catch (error) {
      this.logger.error({
        message: "处理报价更新失败",
        error: error.message,
        errorStack: error.stack,
        originalEvent: event,
      });
    }
  }

  /**
   * 解析 LongPort 报价事件
   * 根据SDK实际返回格式，从PushQuoteEvent对象中提取数据
   * 🔧 增强容错能力和调试信息
   */
  private parseLongportQuoteEvent(event: any): any {
    try {
      this.logger.debug({
        message: "LongPort 报价事件解析开始",
        eventType: typeof event,
        isNull: event === null,
        isUndefined: event === undefined,
        hasToString: typeof event?.toString === "function",
        constructor: event?.constructor?.name,
      });

      let symbol: string | null = null;
      let quoteData: any = null;

      // 从日志分析可知，LongPort返回的是特殊对象（PushQuoteEvent）
      // 需要通过toString()解析或访问特定属性
      if (event && typeof event === "object") {
        // 尝试从toString()解析数据
        try {
          const eventString = event.toString();
          this.logger.debug({
            message: "LongPort 事件字符串解析",
            eventString,
            stringLength: eventString.length,
          });

          // 解析格式: PushQuoteEvent { symbol: "AAPL.US", data: PushQuote { ... } }
          const symbolMatch = eventString.match(/symbol:\s*"([^"]+)"/);
          if (symbolMatch) {
            symbol = symbolMatch[1];
          }

          // 解析报价数据
          const dataMatch = eventString.match(
            /data:\s*PushQuote\s*\{([^}]+)\}/,
          );
          if (dataMatch) {
            const dataStr = dataMatch[1];

            // 解析各个字段
            const parseField = (fieldName: string): any => {
              const regex = new RegExp(`${fieldName}:\\s*([^,}]+)`);
              const match = dataStr.match(regex);
              if (match) {
                const value = match[1].trim();
                // 尝试解析为数字
                if (!isNaN(Number(value))) {
                  return Number(value);
                }
                // 移除引号
                return value.replace(/^"(.*)"$/, "$1");
              }
              return null;
            };

            quoteData = {
              last_done: parseField("last_done"),
              open: parseField("open"),
              high: parseField("high"),
              low: parseField("low"),
              volume: parseField("volume"),
              turnover: parseField("turnover"),
              trade_status: parseField("trade_status"),
              trade_session: parseField("trade_session"),
              current_volume: parseField("current_volume"),
              current_turnover: parseField("current_turnover"),
              timestamp: parseField("timestamp"),
            };

            this.logger.debug({
              message: "LongPort 报价数据解析成功",
              symbol,
              quoteData,
              fieldsExtracted: Object.keys(quoteData).filter(
                (k) => quoteData[k] !== null,
              ).length,
            });
          }
        } catch (parseError) {
          this.logger.warn(`toString()解析失败: ${parseError.message}`);
        }

        // 尝试直接访问属性（如果SDK提供）
        if (!symbol && event.symbol) {
          symbol = event.symbol;
          this.logger.debug("从event.symbol获取符号", { symbol });
        }
        if (!quoteData && event.data) {
          quoteData = event.data;
          this.logger.debug("从event.data获取报价数据", { quoteData });
        }

        // 🔧 增强：尝试其他可能的属性访问方式
        if (!symbol) {
          // 尝试其他可能的符号字段
          symbol = event.stock_symbol || event.sym || event.code;
          if (symbol) {
            this.logger.debug("从备用字段获取符号", {
              symbol,
              source: "alternative_fields",
            });
          }
        }

        if (!quoteData) {
          // 如果没有嵌套data对象，尝试直接从event获取字段
          if (event.last_done || event.price || event.last_price) {
            quoteData = {
              last_done: event.last_done || event.price || event.last_price,
              open: event.open || event.open_price,
              high: event.high || event.high_price,
              low: event.low || event.low_price,
              volume: event.volume || event.total_volume,
              turnover: event.turnover || event.total_turnover,
              timestamp: event.timestamp || event.time,
              trade_status: event.trade_status || event.status,
            };
            this.logger.debug("从event直接字段构建报价数据", { quoteData });
          }
        }
      }

      // 构建标准化事件数据
      const standardizedEvent = {
        symbol: symbol || "UNKNOWN",
        last_done: quoteData?.last_done,
        prev_close: quoteData?.prev_close,
        open: quoteData?.open,
        high: quoteData?.high,
        low: quoteData?.low,
        volume: quoteData?.volume,
        turnover: quoteData?.turnover,
        timestamp: quoteData?.timestamp || Date.now(),
        trade_status: quoteData?.trade_status,
        trade_session: quoteData?.trade_session,
        // LongPort特有字段
        current_volume: quoteData?.current_volume,
        current_turnover: quoteData?.current_turnover,
        // 保留原始数据用于调试
        _raw: {
          originalEvent: event,
          parsedQuoteData: quoteData,
          extractedSymbol: symbol,
        },
        _provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      };

      // 验证必要字段
      if (!standardizedEvent.symbol || standardizedEvent.symbol === "UNKNOWN") {
        this.logger.warn("LongPort 报价事件缺少symbol字段", {
          event: event?.toString?.() || event,
          extractedSymbol: symbol,
        });
      }

      this.logger.debug({
        message: "LongPort 报价事件解析完成",
        symbol: standardizedEvent.symbol,
        hasPrice: !!standardizedEvent.last_done,
        hasVolume: !!standardizedEvent.volume,
        timestamp: standardizedEvent.timestamp,
      });

      return standardizedEvent;
    } catch (error) {
      this.logger.error({
        message: "解析 LongPort 报价事件失败",
        error: error.message,
        errorStack: error.stack,
        event: event?.toString?.() || event,
      });

      // 返回基础数据结构
      return {
        symbol: "PARSE_ERROR",
        timestamp: Date.now(),
        _raw: {
          originalEvent: event,
          error: error.message,
        },
        _provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        _error: "parse_failed",
      };
    }
  }

  /**
   * 手动重连方法
   * 由于LongPort SDK不提供连接状态监听，需要外部触发重连
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("LongPort WebSocket 重连次数超限，停止重连");
      throw new Error("重连次数超限");
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.log({
      message: "LongPort WebSocket 准备重连",
      attempt: this.reconnectAttempts,
      delay,
    });

    try {
      // 清理当前连接
      // 更新连接状态
      this.connectionState.status = ConnectionStatus.DISCONNECTED;
      this.quoteContext = null;

      // 等待重连延迟
      await new Promise((resolve) => setTimeout(resolve, delay));

      // 重新初始化
      await this.initializeWebSocket();

      // 重新订阅之前的符号
      if (this.subscribedSymbols.size > 0) {
        const symbolsToResubscribe = Array.from(this.subscribedSymbols);
        this.subscribedSymbols.clear();
        await this.subscribe(symbolsToResubscribe);
      }

      this.logger.log("LongPort WebSocket 重连成功");
    } catch (error) {
      this.logger.error({
        message: "LongPort WebSocket 重连失败",
        attempt: this.reconnectAttempts,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 彻底清理资源
   * 遵循NestJS最佳实践的资源清理
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log("开始清理 LongPort WebSocket 资源");

      // 1. 取消所有订阅
      if (this.quoteContext && this.subscribedSymbols.size > 0) {
        try {
          await this.unsubscribe(Array.from(this.subscribedSymbols));
        } catch (error) {
          this.logger.warn(`取消订阅时出错: ${error.message}`);
        }
      }

      // 2. 清理SDK资源
      this.quoteContext = null;
      this.config = null;

      // 3. 重置所有状态
      this.connectionState = {
        status: ConnectionStatus.NOT_STARTED,
        isInitialized: false,
        lastConnectionTime: null,
        subscriptionCount: 0,
        connectionId: null,
        healthStatus: CONNECTION_CONFIG.HEALTH_STATUS.HEALTHY,
      };

      // 4. 清理回调和订阅记录
      this.messageCallbacks = [];
      this.subscribedSymbols.clear();

      // 5. 重置重连计数
      this.reconnectAttempts = 0;

      this.logger.log({
        message: "LongPort WebSocket 资源清理完成",
        connectionState: this.connectionState,
        callbacksCleared: true,
        subscriptionsCleared: true,
      });
    } catch (error) {
      this.logger.error({
        message: "LongPort WebSocket 资源清理失败",
        error: error.message,
        errorStack: error.stack,
      });

      // 即使清理失败，也要重置基本状态
      this.connectionState.status = ConnectionStatus.FAILED;
      this.connectionState.healthStatus = CONNECTION_CONFIG.HEALTH_STATUS.FAILED;
    }
  }

  /**
   * 模块销毁时清理
   */
  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }
}
