import { createLogger } from "@common/config/logger.config";
import { MARKETS } from "@common/constants/market.constants";

import { ICapability } from "../../interfaces/capability.interface";
import { LongportBasicInfo } from "../types";

/**
 * LongPort 股票基本信息获取能力
 * 注意：此函数需要与 LongportContextService 配合使用
 */
export const getStockBasicInfo: ICapability = {
  name: "get-stock-basic-info", // capabilityType
  description: "获取股票基本信息",
  supportedMarkets: [MARKETS.HK, MARKETS.SZ, MARKETS.SH, MARKETS.US],
  supportedSymbolFormats: ["700.HK", "000001.SZ", "600000.SH", "AAPL.US"],
  rateLimit: {
    requestsPerSecond: 5,
    requestsPerDay: 1000,
  },

  async execute(params: {
    symbols: string[];
    contextService?: any;
  }): Promise<LongportBasicInfo[]> {
    const logger = createLogger('LongportGetStockBasicInfo');
    try {
      logger.debug("调用 LongPort SDK 获取股票基本信息", { symbols: params.symbols });

      if (!params.contextService) {
        throw new Error("LongportContextService 未提供");
      }

      // 获取共享的 QuoteContext
      const ctx = await params.contextService.getQuoteContext();
      const staticInfos = await ctx.staticInfo(params.symbols);

      // 转换为标准格式
      const basicInfos: LongportBasicInfo[] = staticInfos.map((info) => ({
        symbol: info.symbol,
        name_cn: info.nameCn || "",
        name_en: info.nameEn || "",
        name_hk: info.nameHk || "",
        listing_date: info.listingDate || "",
        shares_outstanding: info.totalShares || 0,
        market_cap: info.marketVal || 0,
        sector: info.sector || "",
        industry: info.industry || "",
      }));

      return basicInfos;
    } catch (error) {
      throw new Error(`LongPort 获取股票基本信息失败: ${error.message}`);
    }
  },
};

export default getStockBasicInfo;
