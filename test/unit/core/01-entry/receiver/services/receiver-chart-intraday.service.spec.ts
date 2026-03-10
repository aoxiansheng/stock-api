import { ReceiverChartIntradayService } from "@core/01-entry/receiver/services/receiver-chart-intraday.service";

describe("ReceiverChartIntradayService", () => {
  it("snapshot: 应透传到 ChartIntradayReadService.getSnapshot", async () => {
    const chartIntradayReadService = {
      getSnapshot: jest.fn().mockResolvedValue({ ok: true }),
      getDelta: jest.fn(),
    };
    const service = new ReceiverChartIntradayService(chartIntradayReadService as any);

    const request = { symbol: "AAPL.US", market: "US" };
    const result = await service.getSnapshot(request as any);

    expect(chartIntradayReadService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(chartIntradayReadService.getSnapshot).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });

  it("delta: 应透传到 ChartIntradayReadService.getDelta", async () => {
    const chartIntradayReadService = {
      getSnapshot: jest.fn(),
      getDelta: jest.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ReceiverChartIntradayService(chartIntradayReadService as any);

    const request = { symbol: "AAPL.US", cursor: "cursor" };
    const result = await service.getDelta(request as any);

    expect(chartIntradayReadService.getDelta).toHaveBeenCalledTimes(1);
    expect(chartIntradayReadService.getDelta).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });
});
