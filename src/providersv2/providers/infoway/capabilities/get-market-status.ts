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
  inferInfowayMarketsFromSymbols,
  normalizeAndValidateInfowaySymbols,
  normalizeInfowayMarketCode,
} from "../utils/infoway-symbols.util";

/**
 * Infoway REST 市场状态能力
 * 说明：provider 返回 /common/basic/markets 原始字段，统一字段转换由 mapping 层处理。
 */
export const getMarketStatus: ICapability = {
  name: CAPABILITY_NAMES.GET_MARKET_STATUS,
  description: "Infoway REST 获取市场交易时间（返回原始字段）",
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
    contextService?: InfowayContextService;
  }): Promise<any[]> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );

    const symbols = normalizeAndValidateInfowaySymbols(params.symbols || [], {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.REST,
    });
    const inferredMarkets = inferInfowayMarketsFromSymbols(symbols);

    const market = normalizeInfowayMarketCode(params.market);
    if (params.market && !market) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 仅支持 HK/US/CN/SH/SZ",
        {
          market: params.market,
        },
        "getMarketStatus.execute",
      );
    }

    if (market) {
      if (inferredMarkets.size > 0 && !inferredMarkets.has(market)) {
        throwInfowayDataValidationError(
          "Infoway 参数错误: market 与 symbols 推断市场冲突，请显式修正参数",
          {
            market,
            symbols,
            inferredMarkets: Array.from(inferredMarkets),
          },
          "getMarketStatus.execute",
        );
      }
      return await contextService.getMarketStatus([market]);
    }

    return await contextService.getMarketStatus(Array.from(inferredMarkets));
  },
};

export default getMarketStatus;
