jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { WebSocketRateLimitGuard } from "@core/03-fetching/stream-data-fetcher/guards/websocket-rate-limit.guard";

describe("WebSocketRateLimitGuard 生命周期", () => {
  const createStreamConfigServiceMock = () => ({
    getSecurityConfig: jest.fn(() => ({
      websocket: {
        maxConnectionsPerIP: 10,
        maxConnectionsPerUser: 3,
        messagesPerMinute: 60,
        maxSubscriptionsPerConnection: 20,
        burstMessages: 10,
      },
    })),
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("构造时会注册 setInterval 并调用 unref", () => {
    const fakeTimer = { unref: jest.fn() } as unknown as NodeJS.Timeout;
    const setIntervalSpy = jest
      .spyOn(global, "setInterval")
      .mockReturnValue(fakeTimer);
    const clearIntervalSpy = jest
      .spyOn(global, "clearInterval")
      .mockImplementation(() => undefined as any);

    const guard = new WebSocketRateLimitGuard(
      createStreamConfigServiceMock() as any,
    );

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 1000);
    expect((fakeTimer as any).unref).toHaveBeenCalledTimes(1);

    guard.onModuleDestroy();
    expect(clearIntervalSpy).toHaveBeenCalledWith(fakeTimer);
  });

  it("onModuleDestroy 幂等：重复调用不会重复 clearInterval", () => {
    const fakeTimer = { unref: jest.fn() } as unknown as NodeJS.Timeout;
    const clearIntervalSpy = jest
      .spyOn(global, "clearInterval")
      .mockImplementation(() => undefined as any);
    jest.spyOn(global, "setInterval").mockReturnValue(fakeTimer);

    const guard = new WebSocketRateLimitGuard(
      createStreamConfigServiceMock() as any,
    );

    guard.onModuleDestroy();
    guard.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect((guard as any).cleanupTimer).toBeNull();
  });

  it("fake timers 驱动下，定时器会触发 cleanup", () => {
    const cleanupSpy = jest.spyOn(
      WebSocketRateLimitGuard.prototype as any,
      "cleanup",
    );
    const guard = new WebSocketRateLimitGuard(
      createStreamConfigServiceMock() as any,
    );

    expect(cleanupSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60 * 1000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    guard.onModuleDestroy();
  });
});
