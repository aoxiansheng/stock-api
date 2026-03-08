import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";
import { requireInfowayCapabilityContextService } from "../helpers/capability-context.helper";
import type { InfowayContextService } from "../services/infoway-context.service";

/**
 * Infoway REST 交易日能力
 * 说明：provider 返回 /common/basic/markets/trading_days 原始字段，统一字段转换由 mapping 层处理。
 */
export const getTradingDays: ICapability = {
  name: CAPABILITY_NAMES.GET_TRADING_DAYS,
  description: "Infoway REST 获取交易日信息（返回原始字段）",
  transport: "rest",
  apiType: "rest",
  supportedMarkets: [Market.HK, Market.US, Market.SH, Market.SZ, Market.CN],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerDay: 50000,
  },
  async execute(params: {
    symbols?: string[];
    market?: string;
    beginDay?: string;
    endDay?: string;
    contextService?: InfowayContextService;
  }): Promise<any[]> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );

    return await contextService.getTradingDays({
      market: params.market,
      symbols: params.symbols || [],
      beginDay: params.beginDay,
      endDay: params.endDay,
    });
  },
};

export default getTradingDays;
