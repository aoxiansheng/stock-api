import { Market } from "../../../../core/shared/constants/market.constants";
import { CAPABILITY_NAMES, SYMBOL_FORMATS } from "../../../providers/constants";
import { ICapability } from "../../../providers/interfaces/capability.interface";
import {
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";

/**
 * Infoway 流式股票报价能力
 * 说明：当前通过 WebSocket 实时K线推送映射报价字段。
 */
export const streamStockQuote: ICapability = {
  name: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
  description: "Infoway WebSocket 实时股票报价（K线推送映射）",
  transport: "websocket",
  apiType: "stream",
  supportedMarkets: [Market.HK, Market.US, Market.SH, Market.SZ, Market.CN],
  supportedSymbolFormats: SYMBOL_FORMATS.COMMON_MARKETS,
  async execute(params: any): Promise<any> {
    throw UniversalExceptionFactory.createBusinessException({
      message: `能力 ${CAPABILITY_NAMES.STREAM_STOCK_QUOTE} 属于实时流能力，不能通过 REST 执行链调用。请改用 StreamReceiver/StreamDataFetcher 订阅链路。`,
      errorCode: BusinessErrorCode.INVALID_OPERATION,
      operation: "fetchRawData",
      component: ComponentIdentifier.DATA_FETCHER,
      context: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        apiType: String(params?.apiType || "rest"),
        requestId: params?.requestId,
        expectedApiType: "stream",
        guide: "use-stream-receiver-subscribe-flow",
      },
    });
  },
};

export default streamStockQuote;
