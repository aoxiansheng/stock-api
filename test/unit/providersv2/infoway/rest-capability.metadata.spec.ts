import { getMarketStatus } from "@providersv2/providers/infoway/capabilities/get-market-status";
import { getCryptoBasicInfo } from "@providersv2/providers/infoway/capabilities/get-crypto-basic-info";
import { getCryptoHistory } from "@providersv2/providers/infoway/capabilities/get-crypto-history";
import { getCryptoQuote } from "@providersv2/providers/infoway/capabilities/get-crypto-quote";
import { getStockBasicInfo } from "@providersv2/providers/infoway/capabilities/get-stock-basic-info";
import { getStockHistory } from "@providersv2/providers/infoway/capabilities/get-stock-history";
import { getStockQuote } from "@providersv2/providers/infoway/capabilities/get-stock-quote";
import { getSupportList } from "@providersv2/providers/infoway/capabilities/get-support-list";
import { getTradingDays } from "@providersv2/providers/infoway/capabilities/get-trading-days";

describe("infoway REST capability metadata contract", () => {
  it.each([
    ["get-stock-quote", getStockQuote],
    ["get-crypto-quote", getCryptoQuote],
    ["get-stock-history", getStockHistory],
    ["get-crypto-history", getCryptoHistory],
    ["get-stock-basic-info", getStockBasicInfo],
    ["get-crypto-basic-info", getCryptoBasicInfo],
    ["get-market-status", getMarketStatus],
    ["get-trading-days", getTradingDays],
    ["get-support-list", getSupportList],
  ])("%s 必须声明 transport/apiType=rest", (_name, capability) => {
    expect(capability.transport).toBe("rest");
    expect(capability.apiType).toBe("rest");
  });
});
