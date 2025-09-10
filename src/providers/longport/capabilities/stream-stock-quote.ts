import { createLogger } from "@app/config/logger.config";
import { CONSTANTS } from "@common/constants";
import { REFERENCE_DATA } from '@common/constants/domain';

// Extract Market enum for backward compatibility
import { Market } from '../../../core/shared/constants/market.constants';
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";
import { IStreamCapability } from "../../interfaces/stream-capability.interface";
import { LongportStreamContextService } from "../services/longport-stream-context.service";
import { PROVIDER_TIMEOUT, CAPABILITY_NAMES } from "../../constants";

/**
 * LongPort 股票报价 WebSocket 流能力
 * 基于 LongPort WebSocket API 实现无缓存的实时数据流
 */
export const streamStockQuote: IStreamCapability = {
  name: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
  description: "获取股票实时报价数据流（WebSocket）",
  supportedMarkets: [Market.HK, Market.SZ, Market.SH, Market.US],
  supportedSymbolFormats: [
    REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
    "00700.HK",
    "09618.HK",
    "00700",
    "09618",
    "000001.SZ",
    "600000.SH",
    "AAPL.US",
  ],
  rateLimit: {
    maxConnections: 100,
    maxSubscriptionsPerConnection: 200,
    reconnectDelay: PROVIDER_TIMEOUT.RECONNECT_DELAY_MS,
    maxReconnectAttempts: PROVIDER_TIMEOUT.MAX_RECONNECT_ATTEMPTS,
  },

  /**
   * 初始化 WebSocket 连接
   */
  async initialize(
    contextService: LongportStreamContextService,
  ): Promise<void> {
    const logger = createLogger("LongportStreamStockQuote");

    try {
      logger.debug("初始化 LongPort WebSocket 流连接");

      if (!contextService) {
        throw new Error("LongportStreamContextService 未提供");
      }

      // 初始化 WebSocket 连接
      await contextService.initializeWebSocket();

      logger.log("LongPort WebSocket 流连接初始化成功");
    } catch (error) {
      logger.error({
        message: "LongPort WebSocket 流连接初始化失败",
        error: error.message,
      });
      throw new Error(`LongPort WebSocket 流初始化失败: ${error.message}`);
    }
  },

  /**
   * 订阅符号数据流
   */
  async subscribe(
    symbols: string[],
    contextService: LongportStreamContextService,
  ): Promise<void> {
    const logger = createLogger("LongportStreamStockQuote");

    try {
      logger.debug("订阅 LongPort WebSocket 股票报价流", { symbols });

      if (!contextService) {
        throw new Error("LongportStreamContextService 未提供");
      }

      if (!symbols || symbols.length === 0) {
        throw new Error("订阅符号列表不能为空");
      }

      // 使用统一的符号验证逻辑
      const { valid: validSymbols, invalid: invalidSymbols } =
        SymbolValidationUtils.validateSymbols(symbols);
      if (invalidSymbols.length > 0) {
        logger.warn("发现无效符号格式", {
          invalidSymbols,
          validSymbols: validSymbols.length,
          totalSymbols: symbols.length,
        });
        // 修改：当有无效符号时，抛出错误并拒绝订阅
        throw new Error(
          `无效的股票符号格式，拒绝订阅: ${invalidSymbols.join(", ")}`,
        );
      }

      // 检查符号数量限制（LongPort最大500个）
      if (SymbolValidationUtils.isSymbolCountExceeded(symbols, 500)) {
        throw new Error(
          `符号数量超过LongPort限制，最多支持500个，当前：${symbols.length}`,
        );
      }

      // 执行订阅
      await contextService.subscribe(symbols);

      logger.log({
        message: "LongPort WebSocket 股票报价流订阅成功",
        symbols,
        count: symbols.length,
      });
    } catch (error) {
      logger.error({
        message: "LongPort WebSocket 股票报价流订阅失败",
        symbols,
        error: error.message,
      });
      throw new Error(`LongPort 流订阅失败: ${error.message}`);
    }
  },

  /**
   * 取消订阅符号数据流
   */
  async unsubscribe(
    symbols: string[],
    contextService: LongportStreamContextService,
  ): Promise<void> {
    const logger = createLogger("LongportStreamStockQuote");

    try {
      logger.debug("取消订阅 LongPort WebSocket 股票报价流", { symbols });

      if (!contextService) {
        throw new Error("LongportStreamContextService 未提供");
      }

      if (!symbols || symbols.length === 0) {
        logger.warn("取消订阅符号列表为空");
        return;
      }

      // 执行取消订阅
      await contextService.unsubscribe(symbols);

      logger.log({
        message: "LongPort WebSocket 股票报价流取消订阅成功",
        symbols,
        count: symbols.length,
      });
    } catch (error) {
      logger.error({
        message: "LongPort WebSocket 股票报价流取消订阅失败",
        symbols,
        error: error.message,
      });
      throw new Error(`LongPort 流取消订阅失败: ${error.message}`);
    }
  },

  /**
   * 设置消息回调处理器
   */
  onMessage(callback: (data: any) => void): void {
    const logger = createLogger("LongportStreamStockQuote");

    try {
      // 注意：这里需要通过 contextService 来设置回调
      // 由于 IStreamCapability 接口的限制，我们需要在 StreamReceiverService 中处理
      logger.debug("设置 LongPort WebSocket 消息回调");

      // 这个方法会在 StreamReceiverService 中通过 contextService.onQuoteUpdate 调用
      if (typeof callback === "function") {
        // 存储回调引用，实际的设置在 subscribe 方法中通过 contextService 完成
        (this as any)._messageCallback = callback;
      }
    } catch (error) {
      logger.error({
        message: "设置 LongPort WebSocket 消息回调失败",
        error: error.message,
      });
    }
  },

  /**
   * 清理资源和关闭连接
   */
  async cleanup(): Promise<void> {
    const logger = createLogger("LongportStreamStockQuote");

    try {
      logger.debug("清理 LongPort WebSocket 流资源");

      // 清理操作由 LongportStreamContextService 处理
      // 这里只需要清理能力层面的资源
      (this as any)._messageCallback = null;

      logger.log("LongPort WebSocket 流资源清理完成");
    } catch (error) {
      logger.error({
        message: "LongPort WebSocket 流资源清理失败",
        error: error.message,
      });
    }
  },

  /**
   * 检查 WebSocket 连接状态
   */
  isConnected(contextService?: LongportStreamContextService): boolean {
    // 如果没有提供 contextService，返回 false 确保会触发初始化
    if (!contextService) {
      return false;
    }

    // 检查实际的连接状态
    return contextService.isWebSocketConnected();
  },
};

// 重要：必须默认导出，用于自动发现机制
export default streamStockQuote;
