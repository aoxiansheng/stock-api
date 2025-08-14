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

      // 直接返回SDK原始格式，不做任何字段名转换
      return { secu_quote: quotes };
    } catch (error) {
      throw new Error(`LongPort 获取指数报价失败: ${error.message}`);
    }
  },
};

export default getIndexQuote;
