import { ReceiverChartIntradayService } from "@core/01-entry/receiver/services/receiver-chart-intraday.service";

describe("ReceiverChartIntradayService", () => {
  it("snapshot: 应透传到 ChartIntradayReadService.getSnapshot", async () => {
    const chartIntradayReadService = {
      getSnapshot: jest.fn().mockResolvedValue({ ok: true }),
      getDelta: jest.fn(),
      releaseRealtimeSubscription: jest.fn(),
    };
    const service = new ReceiverChartIntradayService(
      chartIntradayReadService as any,
    );

    const request = {
      symbol: "AAPL.US",
      market: "US",
      ownerIdentity: "user:user-1",
    };
    const result = await service.getSnapshot(request as any);

    expect(chartIntradayReadService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(chartIntradayReadService.getSnapshot).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });

  it("delta: 应透传到 ChartIntradayReadService.getDelta", async () => {
    const chartIntradayReadService = {
      getSnapshot: jest.fn(),
      getDelta: jest.fn().mockResolvedValue({ ok: true }),
      releaseRealtimeSubscription: jest.fn(),
    };
    const service = new ReceiverChartIntradayService(
      chartIntradayReadService as any,
    );

    const request = {
      symbol: "AAPL.US",
      cursor: "cursor",
      ownerIdentity: "anonymous:chart-intraday",
    };
    const result = await service.getDelta(request as any);

    expect(chartIntradayReadService.getDelta).toHaveBeenCalledTimes(1);
    expect(chartIntradayReadService.getDelta).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });

  it("release: 应透传到 ChartIntradayReadService.releaseRealtimeSubscription", async () => {
    const chartIntradayReadService = {
      getSnapshot: jest.fn(),
      getDelta: jest.fn(),
      releaseRealtimeSubscription: jest.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ReceiverChartIntradayService(
      chartIntradayReadService as any,
    );

    const request = {
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    };
    const result = await service.releaseRealtimeSubscription(request as any);

    expect(
      chartIntradayReadService.releaseRealtimeSubscription,
    ).toHaveBeenCalledTimes(1);
    expect(
      chartIntradayReadService.releaseRealtimeSubscription,
    ).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });
});
