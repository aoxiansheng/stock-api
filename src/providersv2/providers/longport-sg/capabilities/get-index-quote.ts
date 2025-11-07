import { createLogger } from "@common/logging/index";
import { CONSTANTS } from "@common/constants";

// Extract Market enum for backward compatibility
import { Market } from "../../../../core/shared/constants/market.constants";

import { ICapability } from "../../../providers/interfaces/capability.interface";
import { LongportQuoteResponse } from "../types";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";

/**
 * LongPort 指数报价获取能力
 * 注意：此函数需要与 LongportSgContextService 配合使用
 */
export const getIndexQuote: ICapability = {
  name: CAPABILITY_NAMES.GET_INDEX_QUOTE, // receiverType
  description: "获取指数实时报价数据",
  supportedMarkets: [Market.HK, Market.SZ, Market.SH],
  supportedSymbolFormats: SYMBOL_FORMATS.INDEX_FORMATS,
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
        throw new Error("LongportSgContextService 未提供");
      }

      // 获取共享的 QuoteContext
      const ctx = await params.contextService.getQuoteContext();
      const quotes = await ctx.quote(params.symbols);

      // 直接返回SDK原始格式，不做任何字段名转换
      return { secu_quote: quotes };
    } catch (error) {
      throw new Error(`LongPort 获取指数报价失败: ${error.message}`);
    }
  },
};

export default getIndexQuote;
