jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { UpstreamSymbolSubscriptionCoordinatorService } from "@core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service";

describe("UpstreamSymbolSubscriptionCoordinatorService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env = {
      ...originalEnv,
      UPSTREAM_SUBSCRIPTION_COORDINATOR_ENABLED: "true",
      UPSTREAM_SUBSCRIPTION_UNSUBSCRIBE_GRACE_MS: "100",
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  function createCoordinator(clientCountBySymbol: Record<string, number>) {
    const clientStateManager = {
      getClientCountForSymbol: jest.fn((symbol: string) => clientCountBySymbol[symbol] || 0),
    } as any;
    return {
      coordinator: new UpstreamSymbolSubscriptionCoordinatorService(clientStateManager),
      clientStateManager,
    };
  }

  it("0 -> 1 时返回需要上游订阅的 symbol", () => {
    const { coordinator } = createCoordinator({});
    const result = coordinator.acquire({
      clientId: "client-1",
      provider: "jvquant",
      capability: "stream-stock-quote",
      symbols: ["AAPL.US", "AAPL.US"],
    });

    expect(result).toEqual(["AAPL.US"]);
  });

  it("已有订阅者时不再返回上游订阅动作", () => {
    const { coordinator } = createCoordinator({ "AAPL.US": 1 });
    const result = coordinator.acquire({
      clientId: "client-2",
      provider: "jvquant",
      capability: "stream-stock-quote",
      symbols: ["AAPL.US"],
    });

    expect(result).toEqual([]);
  });

  it("1 -> 0 时进入 grace period，超时后触发退订", async () => {
    const clientCountBySymbol = { "AAPL.US": 0 };
    const { coordinator } = createCoordinator(clientCountBySymbol);
    const onReadyToUnsubscribe = jest.fn();

    const immediate = coordinator.scheduleRelease(
      {
        clientId: "client-1",
        provider: "jvquant",
        capability: "stream-stock-quote",
        symbols: ["AAPL.US"],
      },
      onReadyToUnsubscribe,
    );

    expect(immediate).toEqual([]);
    await jest.advanceTimersByTimeAsync(100);
    expect(onReadyToUnsubscribe).toHaveBeenCalledWith(["AAPL.US"]);
  });

  it("grace period 内重新订阅会取消待退订", async () => {
    const clientCountBySymbol = { "AAPL.US": 0 };
    const { coordinator } = createCoordinator(clientCountBySymbol);
    const onReadyToUnsubscribe = jest.fn();

    coordinator.scheduleRelease(
      {
        clientId: "client-1",
        provider: "jvquant",
        capability: "stream-stock-quote",
        symbols: ["AAPL.US"],
      },
      onReadyToUnsubscribe,
    );

    clientCountBySymbol["AAPL.US"] = 1;
    coordinator.acquire({
      clientId: "client-2",
      provider: "jvquant",
      capability: "stream-stock-quote",
      symbols: ["AAPL.US"],
    });

    await jest.advanceTimersByTimeAsync(100);
    expect(onReadyToUnsubscribe).not.toHaveBeenCalled();
  });
});
