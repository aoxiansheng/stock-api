import { streamStockQuote as infowayStreamStockQuote } from "@providersv2/providers/infoway/capabilities/stream-stock-quote";
import { streamStockQuote as jvquantStreamStockQuote } from "@providersv2/providers/jvquant/capabilities/stream-stock-quote";

describe("stream capability metadata contract", () => {
  it.each([
    ["infoway", infowayStreamStockQuote],
    ["jvquant", jvquantStreamStockQuote],
  ])("%s stream-stock-quote 必须声明 transport/apiType", (_provider, capability) => {
    expect(capability.transport).toBe("websocket");
    expect(capability.apiType).toBe("stream");
  });
});
