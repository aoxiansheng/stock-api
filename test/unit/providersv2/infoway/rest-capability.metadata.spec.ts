import { getMarketStatus } from "@providersv2/providers/infoway/capabilities/get-market-status";
import { getStockBasicInfo } from "@providersv2/providers/infoway/capabilities/get-stock-basic-info";
import { getStockQuote } from "@providersv2/providers/infoway/capabilities/get-stock-quote";
import { getTradingDays } from "@providersv2/providers/infoway/capabilities/get-trading-days";

describe("infoway REST capability metadata contract", () => {
  it.each([
    ["get-stock-quote", getStockQuote],
    ["get-stock-basic-info", getStockBasicInfo],
    ["get-market-status", getMarketStatus],
    ["get-trading-days", getTradingDays],
  ])("%s 必须声明 transport/apiType=rest", (_name, capability) => {
    expect(capability.transport).toBe("rest");
    expect(capability.apiType).toBe("rest");
  });
});
