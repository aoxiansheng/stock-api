import { ChartIntradayController } from "@core/01-entry/chart-intraday/controller/chart-intraday.controller";

describe("ChartIntradayController", () => {
  it("snapshot: 应透传到 service.getSnapshot", async () => {
    const chartIntradayService = {
      getSnapshot: jest.fn().mockResolvedValue({ ok: true }),
      getDelta: jest.fn(),
    };
    const controller = new ChartIntradayController(chartIntradayService as any);

    const request = {
      symbol: "AAPL.US",
      market: "US",
      pointLimit: 1000,
    };

    const result = await controller.getSnapshot(request as any);
    expect(chartIntradayService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(chartIntradayService.getSnapshot).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });

  it("delta: 应透传到 service.getDelta", async () => {
    const chartIntradayService = {
      getSnapshot: jest.fn(),
      getDelta: jest.fn().mockResolvedValue({ ok: true }),
    };
    const controller = new ChartIntradayController(chartIntradayService as any);

    const request = {
      symbol: "AAPL.US",
      cursor: "cursor",
      limit: 200,
    };

    const result = await controller.getDelta(request as any);
    expect(chartIntradayService.getDelta).toHaveBeenCalledTimes(1);
    expect(chartIntradayService.getDelta).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });
});
