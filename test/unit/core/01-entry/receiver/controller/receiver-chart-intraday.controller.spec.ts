import { ReceiverChartIntradayController } from "@core/01-entry/receiver/controller/receiver-chart-intraday.controller";

describe("ReceiverChartIntradayController", () => {
  it("snapshot: 应透传到 service.getSnapshot", async () => {
    const receiverChartIntradayService = {
      getSnapshot: jest.fn().mockResolvedValue({ ok: true }),
      getDelta: jest.fn(),
    };
    const controller = new ReceiverChartIntradayController(
      receiverChartIntradayService as any,
    );

    const request = {
      symbol: "AAPL.US",
      market: "US",
      pointLimit: 1000,
    };

    const result = await controller.getSnapshot(request as any);
    expect(receiverChartIntradayService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(receiverChartIntradayService.getSnapshot).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });

  it("delta: 应透传到 service.getDelta", async () => {
    const receiverChartIntradayService = {
      getSnapshot: jest.fn(),
      getDelta: jest.fn().mockResolvedValue({ ok: true }),
    };
    const controller = new ReceiverChartIntradayController(
      receiverChartIntradayService as any,
    );

    const request = {
      symbol: "AAPL.US",
      cursor: "cursor",
      limit: 200,
    };

    const result = await controller.getDelta(request as any);
    expect(receiverChartIntradayService.getDelta).toHaveBeenCalledTimes(1);
    expect(receiverChartIntradayService.getDelta).toHaveBeenCalledWith(request);
    expect(result).toEqual({ ok: true });
  });
});
