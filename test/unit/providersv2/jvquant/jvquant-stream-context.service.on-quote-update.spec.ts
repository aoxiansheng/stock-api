jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { JvQuantStreamContextService } from "@providersv2/providers/jvquant/services/jvquant-stream-context.service";

describe("JvQuantStreamContextService onQuoteUpdate", () => {
  it("返回反注册函数，并可移除已注册回调", () => {
    const service = new JvQuantStreamContextService({
      get: jest.fn(),
    } as any);
    const callback = jest.fn();

    const unregister = service.onQuoteUpdate(callback);

    expect(typeof unregister).toBe("function");
    expect((service as any).messageCallbacks).toContain(callback);

    unregister();
    expect((service as any).messageCallbacks).not.toContain(callback);

    unregister();
    expect((service as any).messageCallbacks).toHaveLength(0);
  });
});


describe("JvQuantStreamContextService subscribe dedupe", () => {
  it("不重复发送已订阅 code 的 add", async () => {
    const { JvQuantStreamContextService } = await import("@providersv2/providers/jvquant/services/jvquant-stream-context.service");
    const service = new JvQuantStreamContextService({
      get: (key: string) => {
        if (key === "JVQUANT_TOKEN") return "token";
        if (key === "JVQUANT_SERVER_API") return "http://example.test";
        return undefined;
      },
    } as any);

    jest.spyOn(service as any, "initializeWebSocket").mockResolvedValue(undefined);
    jest.spyOn(service as any, "ensureMarketSocketConnected").mockResolvedValue(undefined);
    const sendCommand = jest.spyOn(service as any, "sendCommand").mockResolvedValue(undefined);
    (service as any).subscribedCodesByMarket.set("us", new Set(["aapl"]));

    await service.subscribe(["AAPL.US", "MSFT.US"]);

    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand).toHaveBeenCalledWith("us", "add", ["msft"]);
  });
});
