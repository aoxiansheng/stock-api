import { ReceiverChartIntradayController } from "@core/01-entry/receiver/controller/receiver-chart-intraday.controller";

describe("ReceiverChartIntradayController", () => {
  function createController() {
    const receiverChartIntradayService = {
      getSnapshot: jest.fn().mockResolvedValue({ ok: true }),
      getDelta: jest.fn().mockResolvedValue({ ok: true }),
      releaseRealtimeSubscription: jest.fn().mockResolvedValue({ ok: true }),
    };

    return {
      controller: new ReceiverChartIntradayController(
        receiverChartIntradayService as any,
      ),
      receiverChartIntradayService,
    };
  }

  it("snapshot: req.user 存在 userId 时应优先透传 user ownerIdentity", async () => {
    const { controller, receiverChartIntradayService } = createController();

    const request = {
      symbol: "AAPL.US",
      market: "US",
      pointLimit: 1000,
    };
    const req = {
      user: {
        userId: "user-1",
        appKey: "app-key-1",
      },
    };

    const result = await controller.getSnapshot(request as any, req as any);
    expect(receiverChartIntradayService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(receiverChartIntradayService.getSnapshot).toHaveBeenCalledWith(
      {
        ...request,
        ownerIdentity: "user:user-1",
      },
    );
    expect(result).toEqual({ ok: true });
  });

  it("delta: 匿名请求应透传 anonymous ownerIdentity", async () => {
    const { controller, receiverChartIntradayService } = createController();

    const request = {
      symbol: "AAPL.US",
      cursor: "cursor",
      sessionId: "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a",
      limit: 200,
    };
    const req = {};

    const result = await controller.getDelta(request as any, req as any);
    expect(receiverChartIntradayService.getDelta).toHaveBeenCalledTimes(1);
    expect(receiverChartIntradayService.getDelta).toHaveBeenCalledWith(
      {
        ...request,
        ownerIdentity: "anonymous:chart-intraday",
      },
    );
    expect(result).toEqual({ ok: true });
  });

  it("release: 匿名请求应透传 anonymous ownerIdentity", async () => {
    const { controller, receiverChartIntradayService } = createController();

    const request = {
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      sessionId: "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a",
    };
    const req = {};

    const result = await controller.releaseRealtimeSubscription(
      request as any,
      req as any,
    );
    expect(
      receiverChartIntradayService.releaseRealtimeSubscription,
    ).toHaveBeenCalledTimes(1);
    expect(
      receiverChartIntradayService.releaseRealtimeSubscription,
    ).toHaveBeenCalledWith({
      ...request,
      ownerIdentity: "anonymous:chart-intraday",
    });
    expect(result).toEqual({ ok: true });
  });
});
