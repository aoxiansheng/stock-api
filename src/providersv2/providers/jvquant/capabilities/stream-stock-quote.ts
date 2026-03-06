import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";

/**
 * JvQuant 流式股票报价能力
 * 说明：当前流式链路通过 StreamContextService 工作，execute 仅做兼容占位。
 */
export const streamStockQuote: ICapability = {
  name: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
  description: "JvQuant 流式股票报价（港股/美股/沪深）",
  transport: "websocket",
  apiType: "stream",
  supportedMarkets: [Market.HK, Market.US, Market.SH, Market.SZ, Market.CN],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  async execute(params: any): Promise<any> {
    return params;
  },
};

export default streamStockQuote;
