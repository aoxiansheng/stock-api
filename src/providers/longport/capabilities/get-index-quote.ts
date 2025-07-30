import { createLogger } from "@common/config/logger.config";
import { MARKETS } from "@common/constants/market.constants";

import { ICapability } from "../../interfaces/capability.interface";
import { LongportQuoteResponse } from "../types";

/**
 * LongPort 指数报价获取能力
 * 注意：此函数需要与 LongportContextService 配合使用
 */
export const getIndexQuote: ICapability = {
  name: "get-index-quote", // receiverType
  description: "获取指数实时报价数据",
  supportedMarkets: [MARKETS.HK, MARKETS.SZ, MARKETS.SH],
  supportedSymbolFormats: ["HSI.HI", "000001.SH", "399001.SZ"],
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerDay: 5000,
  },

  async execute(params: {
    symbols: string[];
    contextService?: any;
  }): Promise<LongportQuoteResponse> {
    const logger = createLogger("LongportGetIndexQuote");
    try {
      logger.debug("调用 LongPort SDK 获取指数报价", {
        symbols: params.symbols,
      });

      if (!params.contextService) {
        throw new Error("LongportContextService 未提供");
      }

      // 获取共享的 QuoteContext
      const ctx = await params.contextService.getQuoteContext();
      const quotes = await ctx.quote(params.symbols);

      // 转换为标准格式
      const secu_quote = quotes.map((quote) => ({
        symbol: quote.symbol,
        last_done: quote.lastDone,
        prev_close: quote.prevClose,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        turnover: quote.turnover,
        timestamp: quote.timestamp,
        trade_status: quote.tradeStatus,
      }));

      return { secu_quote };
    } catch (error) {
      throw new Error(`LongPort 获取指数报价失败: ${error.message}`);
    }
  },
};

export default getIndexQuote;
