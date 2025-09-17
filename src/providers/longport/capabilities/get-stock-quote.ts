import { createLogger } from "@common/logging/index";
import { CONSTANTS } from "@common/constants";

// Extract Market enum for backward compatibility
import { Market } from "../../../core/shared/constants/market.constants";

import { ICapability } from "../../interfaces/capability.interface";
import { LongportQuoteResponse } from "../types";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../constants";

/**
 * LongPort 股票报价获取能力
 * 注意：此函数需要与 LongportContextService 配合使用
 */
export const getStockQuote: ICapability = {
  name: CAPABILITY_NAMES.GET_STOCK_QUOTE, // receiverType
  description: "获取股票实时报价数据",
  supportedMarkets: [Market.HK, Market.SZ, Market.SH, Market.US],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerDay: 10000,
  },

  async execute(params: {
    symbols: string[];
    contextService?: any;
  }): Promise<LongportQuoteResponse> {
    const logger = createLogger("LongportGetStockQuote");
    try {
      logger.debug("调用 LongPort SDK 获取股票报价", {
        symbols: params.symbols,
      });

      if (!params.contextService) {
        throw new Error("LongportContextService 未提供");
      }

      // 获取共享的 QuoteContext
      const ctx = await params.contextService.getQuoteContext();
      const quotes = await ctx.quote(params.symbols);

      // 直接返回SDK原始格式，不做任何字段名转换
      return { secu_quote: quotes };
    } catch (error) {
      throw new Error(`LongPort 获取股票报价失败了: ${error.message}`);
    }
  },
};

export default getStockQuote;
