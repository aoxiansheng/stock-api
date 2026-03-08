import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";
import {
  requireInfowayCapabilityContextService,
  throwInfowayDataValidationError,
} from "../helpers/capability-context.helper";
import type { InfowayContextService } from "../services/infoway-context.service";
import {
  INFOWAY_SYMBOL_LIMIT,
  normalizeAndValidateInfowaySymbols,
  normalizeInfowayMarketCode,
} from "../utils/infoway-symbols.util";

/**
 * Infoway REST 股票基础信息能力
 * 说明：provider 返回上游原始字段，统一字段转换由 mapping 层处理。
 */
export const getStockBasicInfo: ICapability = {
  name: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
  description: "Infoway REST 获取股票基础信息（返回原始字段）",
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
    market?: string;
    contextService?: InfowayContextService;
  }): Promise<any[]> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );
    const symbols = normalizeAndValidateInfowaySymbols(params.symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });
    const hasMarketHint =
      params.market !== undefined &&
      params.market !== null &&
      String(params.market).trim() !== "";
    const normalizedMarketHint = normalizeInfowayMarketCode(params.market);
    if (hasMarketHint && !normalizedMarketHint) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 仅支持 HK/US/CN/SH/SZ",
        {
          market: params.market,
        },
        "getStockBasicInfo.execute",
      );
    }

    if (symbols.length === 0) {
      return [];
    }

    return await contextService.getStockBasicInfo(
      symbols,
      normalizedMarketHint || undefined,
    );
  },
};

export default getStockBasicInfo;
