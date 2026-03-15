import { Market } from "../../../../core/shared/constants/market.constants";
import {
  CAPABILITY_NAMES,
  GET_CRYPTO_HISTORY_SINGLE_SYMBOL_ERROR,
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
  normalizeAndValidateInfowayCryptoSymbols,
  normalizeInfowayMarketCode,
} from "../utils/infoway-symbols.util";

const INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE =
  "Infoway 参数错误: timestamp 必须是 10/13 位正整数时间戳";

function validateInfowayHistoryTimestamp(
  timestamp?: number,
): number | undefined {
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
      "getCryptoHistory.execute",
    );
  }

  const digitCount = Math.abs(timestamp).toString().length;
  if (digitCount !== 10 && digitCount !== 13) {
    throwInfowayDataValidationError(
      INFOWAY_HISTORY_TIMESTAMP_ERROR_MESSAGE,
      {
        timestamp,
      },
      "getCryptoHistory.execute",
    );
  }

  return timestamp;
}

/**
 * Infoway REST 加密货币分时历史能力
 * 说明：当前走 batch_kline 返回真实 K 线历史，供 fetching 层统一处理。
 */
export const getCryptoHistory: ICapability = {
  name: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
  description: "Infoway REST 获取加密货币分时历史（返回 batch_kline 原始字段）",
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
    market?: string;
    klineType?: number | string;
    klineNum?: number;
    timestamp?: number;
    contextService?: InfowayContextService;
  }): Promise<{ data: unknown[] }> {
    const contextService = requireInfowayCapabilityContextService(
      params,
      "InfowayContextService",
    );

    if (
      Array.isArray(params.symbols) &&
      params.symbols.length > INFOWAY_SYMBOL_LIMIT.HISTORY_SINGLE
    ) {
      throwInfowayDataValidationError(
        GET_CRYPTO_HISTORY_SINGLE_SYMBOL_ERROR,
        {
          symbolsCount: params.symbols.length,
        },
        "getCryptoHistory.execute",
      );
    }

    const symbols = normalizeAndValidateInfowayCryptoSymbols(
      params.symbols || [],
      {
        allowEmpty: true,
        maxCount: INFOWAY_SYMBOL_LIMIT.HISTORY_SINGLE,
      },
    );

    const hasMarketHint =
      params.market !== undefined &&
      params.market !== null &&
      String(params.market).trim() !== "";
    const normalizedMarket = normalizeInfowayMarketCode(params.market);
    if (hasMarketHint && normalizedMarket !== "CRYPTO") {
      throwInfowayDataValidationError(
        "Infoway 参数错误: market 仅支持 CRYPTO",
        {
          market: params.market,
        },
        "getCryptoHistory.execute",
      );
    }

    if (symbols.length === 0) {
      return { data: [] };
    }

    const timestamp = validateInfowayHistoryTimestamp(params.timestamp);

    const historyData = await contextService.getCryptoHistory({
      symbols,
      market: "CRYPTO",
      klineType: params.klineType,
      klineNum: params.klineNum,
      timestamp,
    });

    return { data: historyData };
  },
};

export default getCryptoHistory;
