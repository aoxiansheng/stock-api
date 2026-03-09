import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";
import { requireInfowayCapabilityContextService } from "../helpers/capability-context.helper";
import type { InfowayContextService } from "../services/infoway-context.service";
import {
  normalizeInfowaySupportListSymbols,
  normalizeInfowaySupportListType,
} from "../utils/infoway-support-list.util";

/**
 * Infoway REST 产品清单能力
 * 说明：provider 返回 /common/basic/symbols 原始字段，统一字段转换由 mapping 层处理。
 */
export const getSupportList: ICapability = {
  name: CAPABILITY_NAMES.GET_SUPPORT_LIST,
  description: "Infoway REST 获取上游产品清单（返回原始字段）",
  transport: "rest",
  apiType: "rest",
  supportedMarkets: [
    Market.HK,
    Market.US,
    Market.SH,
    Market.SZ,
    Market.CN,
    Market.CRYPTO,
  ],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerDay: 50000,
  },
  async execute(params: {
    type: string;
    symbols?: unknown;
    contextService?: InfowayContextService;
  }): Promise<any[]> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );

    const type = normalizeInfowaySupportListType(params.type, {
      operation: "getSupportList.execute",
    });
    const symbols = normalizeInfowaySupportListSymbols(params.symbols, {
      allowEmpty: true,
      operation: "getSupportList.execute",
    });

    return await contextService.getSupportList({
      type,
      symbols,
    });
  },
};

export default getSupportList;

