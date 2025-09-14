import { createLogger } from "@common/logging";
import { CONSTANTS } from "@common/constants";

// Extract Market enum for backward compatibility
import { Market } from '../../../core/shared/constants/market.constants';

import { ICapability } from "../../interfaces/capability.interface";
import { LongportBasicInfo } from "../types";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../constants";

/**
 * LongPort 股票基本信息获取能力
 * 注意：此函数需要与 LongportSgContextService 配合使用
 */
export const getStockBasicInfo: ICapability = {
  name: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO, // receiverType
  description: "获取股票基本信息",
  supportedMarkets: [Market.HK, Market.SZ, Market.SH, Market.US],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  rateLimit: {
    requestsPerSecond: 5,
    requestsPerDay: 1000,
  },

  async execute(params: {
    symbols: string[];
    contextService?: any;
  }): Promise<LongportBasicInfo[]> {
    const logger = createLogger("LongportGetStockBasicInfo");
    try {
      logger.debug("调用 LongPort SDK 获取股票基本信息", {
        symbols: params.symbols,
      });

      if (!params.contextService) {
        throw new Error("LongportSgContextService 未提供");
      }

      // 获取共享的 QuoteContext
      const ctx = await params.contextService.getQuoteContext();
      const staticInfos = await ctx.staticInfo(params.symbols);

      // 直接返回SDK原始格式，不做任何字段名转换
      return staticInfos;
    } catch (error) {
      throw new Error(`LongPort 获取股票基本信息失败: ${error.message}`);
    }
  },
};

export default getStockBasicInfo;
