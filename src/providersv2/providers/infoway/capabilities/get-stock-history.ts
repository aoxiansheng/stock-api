import { Market } from "../../../../core/shared/constants/market.constants";
import {
  CAPABILITY_NAMES,
  GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR,
  SYMBOL_FORMATS,
} from "../../../providers/constants";
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

const INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE =
  "Infoway 参数错误: timestamp 必须是 10/13 位正整数时间戳";

function validateInfowayHistoryTimestamp(timestamp?: number): number | undefined {
  if (timestamp === undefined || timestamp === null) {
    return undefined;
  }
  if (
    typeof timestamp !== "number" ||
    !Number.isSafeInteger(timestamp) ||
    timestamp <= 0
  ) {
    throwInfowayDataValidationError(
      INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE,
      {
        timestamp,
      },
      "getStockHistory.execute",
    );
  }

  const digitCount = Math.abs(timestamp).toString().length;
  if (digitCount !== 10 && digitCount !== 13) {
    throwInfowayDataValidationError(
      INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE,
      {
        timestamp,
      },
      "getStockHistory.execute",
    );
  }

  return timestamp;
}

/**
 * Infoway REST 分时历史能力
 * 说明：基于 batch_kline 提供 1m 历史分时序列（MVP 单标的）。
 */
export const getStockHistory: ICapability = {
  name: CAPABILITY_NAMES.GET_STOCK_HISTORY,
  description: "Infoway REST 获取股票分时历史（1m）",
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
    klineType?: number | string;
    klineNum?: number;
    timestamp?: number;
    contextService?: InfowayContextService;
  }): Promise<any> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );

    if (
      Array.isArray(params.symbols) &&
      params.symbols.length > INFOWAY_SYMBOL_LIMIT.HISTORY_SINGLE
    ) {
      throwInfowayDataValidationError(
        GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR,
        {
          symbolsCount: params.symbols.length,
        },
        "getStockHistory.execute",
      );
    }

    const symbols = normalizeAndValidateInfowaySymbols(params.symbols || [], {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.HISTORY_SINGLE,
    });

    const hasMarketHint =
      params.market !== undefined &&
      params.market !== null &&
      String(params.market).trim() !== "";
    const normalizedMarket = normalizeInfowayMarketCode(params.market);
    if (hasMarketHint && !normalizedMarket) {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 仅支持 HK/US/CN/SH/SZ",
        {
          market: params.market,
        },
        "getStockHistory.execute",
      );
    }

    if (symbols.length === 0) {
      return { quote_data: [] };
    }

    const timestamp = validateInfowayHistoryTimestamp(params.timestamp);

    const historyData = await contextService.getStockHistory({
      symbols,
      market: normalizedMarket || undefined,
      klineType: params.klineType,
      klineNum: params.klineNum,
      timestamp,
    });

    return { quote_data: historyData };
  },
};

export default getStockHistory;
