import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";
import { requireInfowayCapabilityContextService } from "../helpers/capability-context.helper";
import type { InfowayContextService } from "../services/infoway-context.service";
import {
  INFOWAY_SYMBOL_LIMIT,
  normalizeAndValidateInfowaySymbols,
} from "../utils/infoway-symbols.util";

/**
 * Infoway REST 股票报价能力
 * 说明：MVP 通过 batch_kline 最近一根K线映射为统一报价字段。
 */
export const getStockQuote: ICapability = {
  name: CAPABILITY_NAMES.GET_STOCK_QUOTE,
  description: "Infoway REST 获取股票报价（基于实时K线）",
  transport: "rest",
  apiType: "rest",
  supportedMarkets: [Market.HK, Market.US, Market.SH, Market.SZ, Market.CN],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerDay: 50000,
  },

  async execute(params: {
    symbols: string[];
    contextService?: InfowayContextService;
  }): Promise<any> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );
    const symbols = normalizeAndValidateInfowaySymbols(params.symbols || [], {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });

    if (symbols.length === 0) {
      return { quote_data: [] };
    }

    const quoteData = await contextService.getStockQuote(symbols);
    return { quote_data: quoteData };
  },
};

export default getStockQuote;
