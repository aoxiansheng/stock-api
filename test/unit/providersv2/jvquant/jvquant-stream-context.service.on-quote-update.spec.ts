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
