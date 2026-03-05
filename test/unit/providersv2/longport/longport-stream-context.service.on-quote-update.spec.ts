jest.mock("longport", () => ({
  Config: class MockConfig {},
  QuoteContext: {
    new: jest.fn(),
  },
  SubType: {
    Quote: "Quote",
  },
}));

jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { LongportStreamContextService } from "@providersv2/providers/longport/services/longport-stream-context.service";

describe("LongportStreamContextService onQuoteUpdate", () => {
  it("返回反注册函数，并可移除已注册回调", () => {
    const service = new LongportStreamContextService({
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
