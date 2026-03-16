import { Market } from "@core/shared/constants/market.constants";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants";
import { ICapability } from "@providersv2/providers/interfaces/capability.interface";
import { requireCoinGeckoCapabilityContextService } from "../helpers/capability-context.helper";
import type { CoinGeckoContextService } from "../services/coingecko-context.service";
import {
  COINGECKO_SYMBOL_LIMIT,
  normalizeAndValidateCoinGeckoCryptoSymbols,
} from "../utils/coingecko-symbols.util";

export const getCryptoBasicInfo: ICapability = {
  name: CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
  description: "CoinGecko REST 获取加密货币基础信息",
  transport: "rest",
  apiType: "rest",
  supportedMarkets: [Market.CRYPTO],
  supportedSymbolFormats: ["BTCUSDT", "ETHUSDT", "BTC"],
  rateLimit: {
    requestsPerSecond: 1,
    requestsPerDay: 10000,
  },
  async execute(params: {
    symbols: string[];
    contextService?: CoinGeckoContextService;
  }): Promise<any[]> {
    const contextService = requireCoinGeckoCapabilityContextService(
      params,
      "CoinGeckoContextService",
    );
    const symbols = normalizeAndValidateCoinGeckoCryptoSymbols(
      params.symbols || [],
      {
        allowEmpty: true,
        maxCount: COINGECKO_SYMBOL_LIMIT.REST,
      },
    );
    if (symbols.length === 0) {
      return [];
    }

    return await contextService.getCryptoBasicInfo(symbols);
  },
};

export default getCryptoBasicInfo;
