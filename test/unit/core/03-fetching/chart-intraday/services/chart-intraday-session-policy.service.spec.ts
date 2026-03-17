import { MarketStatus } from "@core/shared/constants/market.constants";
import { ChartIntradaySessionPolicyService } from "@core/03-fetching/chart-intraday/services/chart-intraday-session-policy.service";

describe("ChartIntradaySessionPolicyService", () => {
  function createService() {
    const marketStatusService = {
      getMarketStatus: jest.fn(),
    };
    return {
      service: new ChartIntradaySessionPolicyService(
        marketStatusService as any,
      ),
      marketStatusService,
    };
  }

  it("CN 午休应返回 paused", async () => {
    const { service, marketStatusService } = createService();
    marketStatusService.getMarketStatus.mockResolvedValue({
      status: MarketStatus.LUNCH_BREAK,
      timezone: "Asia/Shanghai",
      nextSessionStart: new Date("2026-03-17T05:00:00.000Z"),
    });
    jest
      .spyOn(service as any, "resolveCurrentTradingDay")
      .mockReturnValue("20260317");

    const result = await service.decide({
      market: "CN",
      tradingDay: "20260317",
    });

    expect(result.mode).toBe("paused");
    expect(result.reason).toBe("LUNCH_BREAK");
    expect(result.nextSessionStart).toBe("2026-03-17T05:00:00.000Z");
  });

  it("US 盘前应返回 frozen", async () => {
    const { service, marketStatusService } = createService();
    marketStatusService.getMarketStatus.mockResolvedValue({
      status: MarketStatus.PRE_MARKET,
      timezone: "America/New_York",
      nextSessionStart: new Date("2026-03-17T13:30:00.000Z"),
    });
    jest
      .spyOn(service as any, "resolveCurrentTradingDay")
      .mockReturnValue("20260317");

    const result = await service.decide({
      market: "US",
      tradingDay: "20260317",
    });

    expect(result.mode).toBe("frozen");
    expect(result.reason).toBe("PRE_MARKET_BLOCKED");
  });

  it("CRYPTO 当前日应始终返回 live", async () => {
    const { service } = createService();
    jest
      .spyOn(service as any, "resolveCurrentTradingDay")
      .mockReturnValue("20260317");

    const result = await service.decide({
      market: "CRYPTO",
      tradingDay: "20260317",
    });

    expect(result.mode).toBe("live");
    expect(result.reason).toBe("CRYPTO_ALWAYS_LIVE");
    expect(result.marketStatus).toBe(MarketStatus.TRADING);
  });

  it("非当前 tradingDay 应直接返回 frozen", async () => {
    const { service, marketStatusService } = createService();
    jest
      .spyOn(service as any, "resolveCurrentTradingDay")
      .mockReturnValue("20260317");

    const result = await service.decide({
      market: "HK",
      tradingDay: "20260314",
    });

    expect(result.mode).toBe("frozen");
    expect(result.reason).toBe("REQUESTED_TRADING_DAY_NOT_CURRENT");
    expect(marketStatusService.getMarketStatus).not.toHaveBeenCalled();
  });
});
