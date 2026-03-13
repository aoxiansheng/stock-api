import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";
import { requireInfowayCapabilityContextService } from "../helpers/capability-context.helper";
import type { InfowayContextService } from "../services/infoway-context.service";
import {
  INFOWAY_SYMBOL_LIMIT,
  normalizeAndValidateInfowayCryptoSymbols,
} from "../utils/infoway-symbols.util";

/**
 * Infoway REST 加密货币报价能力
 * 说明：provider 返回标准格式 { data: [...] }，供 fetching 层统一处理。
 */
export const getCryptoQuote: ICapability = {
  name: CAPABILITY_NAMES.GET_CRYPTO_QUOTE,
  description: "Infoway REST 获取加密货币报价（返回实时成交原始字段）",
  transport: "rest",
  apiType: "rest",
  supportedMarkets: [Market.CRYPTO],
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
    const symbols = normalizeAndValidateInfowayCryptoSymbols(
      params.symbols || [],
      {
        allowEmpty: true,
        maxCount: INFOWAY_SYMBOL_LIMIT.REST,
      },
    );

    if (symbols.length === 0) {
      return { data: [] };
    }

    const quoteData = await contextService.getCryptoQuote(symbols);
    return { data: quoteData };
  },
};

export default getCryptoQuote;
