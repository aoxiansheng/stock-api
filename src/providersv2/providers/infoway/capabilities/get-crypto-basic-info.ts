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
 * Infoway REST 加密货币基础信息能力
 * 说明：provider 返回上游原始字段，统一字段转换由 mapping 层处理。
 */
export const getCryptoBasicInfo: ICapability = {
  name: CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
  description: "Infoway REST 获取加密货币基础信息（返回原始字段）",
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
  }): Promise<any[]> {
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
      return [];
    }

    return await contextService.getCryptoBasicInfo(symbols);
  },
};

export default getCryptoBasicInfo;
