jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { UpstreamSymbolSubscriptionCoordinatorService } from "@core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";

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

  function createCoordinator(clientCountByUpstream: Record<string, number>) {
    const clientStateManager = {
      getClientCountForUpstream: jest.fn(
        (provider: string, capability: string, symbol: string) =>
          clientCountByUpstream[
            `${provider}:${capability}:${String(symbol || "").toUpperCase()}`
          ] || 0,
      ),
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
    const { coordinator } = createCoordinator({
      "jvquant:stream-stock-quote:AAPL.US": 1,
    });
    const result = coordinator.acquire({
      clientId: "client-2",
      provider: "jvquant",
      capability: "stream-stock-quote",
      symbols: ["AAPL.US"],
    });

    expect(result).toEqual([]);
  });

  it("1 -> 0 时进入 grace period，超时后触发退订", async () => {
    const clientCountByUpstream = { "jvquant:stream-stock-quote:AAPL.US": 0 };
    const { coordinator } = createCoordinator(clientCountByUpstream);
    const onReadyToUnsubscribe = jest.fn();

    const result = coordinator.scheduleRelease(
      {
        clientId: "client-1",
        provider: "jvquant",
        capability: "stream-stock-quote",
        symbols: ["AAPL.US"],
      },
      onReadyToUnsubscribe,
    );

    expect(result.immediateSymbols).toEqual([]);
    expect(result.scheduledSymbols).toEqual([
      expect.objectContaining({
        symbol: "AAPL.US",
        graceExpiresAt: expect.any(String),
      }),
    ]);
    await jest.advanceTimersByTimeAsync(100);
    expect(onReadyToUnsubscribe).toHaveBeenCalledWith(["AAPL.US"]);
  });

  it("grace period 内重新订阅会取消待退订", async () => {
    const clientCountByUpstream = { "jvquant:stream-stock-quote:AAPL.US": 0 };
    const { coordinator } = createCoordinator(clientCountByUpstream);
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

    clientCountByUpstream["jvquant:stream-stock-quote:AAPL.US"] = 1;
    coordinator.acquire({
      clientId: "client-2",
      provider: "jvquant",
      capability: "stream-stock-quote",
      symbols: ["AAPL.US"],
    });

    await jest.advanceTimersByTimeAsync(100);
    expect(onReadyToUnsubscribe).not.toHaveBeenCalled();
  });

  it("同 symbol 跨 provider 订阅时，第二个 provider 仍需发起真实上游订阅", () => {
    const { coordinator } = createCoordinator({
      "jvquant:stream-stock-quote:AAPL.US": 1,
      "infoway:stream-stock-quote:AAPL.US": 0,
    });

    const result = coordinator.acquire({
      clientId: "client-2",
      provider: "infoway",
      capability: "stream-stock-quote",
      symbols: ["AAPL.US"],
    });

    expect(result).toEqual(["AAPL.US"]);
  });

  it("同 symbol 跨 provider 释放时，不应被其他 provider 的订阅阻塞", () => {
    const { coordinator } = createCoordinator({
      "jvquant:stream-stock-quote:AAPL.US": 1,
      "infoway:stream-stock-quote:AAPL.US": 0,
    });

    const result = coordinator.scheduleRelease(
      {
        clientId: "client-2",
        provider: "infoway",
        capability: "stream-stock-quote",
        symbols: ["AAPL.US"],
      },
      jest.fn(),
    );

    expect(result.immediateSymbols).toEqual([]);
    expect(result.scheduledSymbols).toEqual([
      expect.objectContaining({
        symbol: "AAPL.US",
        graceExpiresAt: expect.any(String),
      }),
    ]);
  });

  it("真实状态管理器通过 updateSubscriptionState 添加订阅后，不应重复发起上游订阅", async () => {
    const clientStateManager = new StreamClientStateManager();
    const coordinator = new UpstreamSymbolSubscriptionCoordinatorService(
      clientStateManager,
    );

    try {
      clientStateManager.addClientSubscription(
        "client-1",
        [],
        "stream-stock-quote",
        "jvquant",
      );
      clientStateManager.updateSubscriptionState(
        "client-1",
        ["AAPL.US"],
        "subscribed",
      );

      expect(
        coordinator.acquire({
          clientId: "client-2",
          provider: "jvquant",
          capability: "stream-stock-quote",
          symbols: ["AAPL.US"],
        }),
      ).toEqual([]);
    } finally {
      coordinator.onModuleDestroy();
      await clientStateManager.onModuleDestroy();
    }
  });

  it("真实状态管理器通过 updateSubscriptionState 移除订阅后，应允许进入 release 判定", async () => {
    const clientStateManager = new StreamClientStateManager();
    const coordinator = new UpstreamSymbolSubscriptionCoordinatorService(
      clientStateManager,
    );

    try {
      clientStateManager.addClientSubscription(
        "client-1",
        ["AAPL.US"],
        "stream-stock-quote",
        "jvquant",
      );
      clientStateManager.updateSubscriptionState(
        "client-1",
        ["AAPL.US"],
        "unsubscribed",
      );

      const result = coordinator.scheduleRelease(
        {
          clientId: "client-1",
          provider: "jvquant",
          capability: "stream-stock-quote",
          symbols: ["AAPL.US"],
        },
        jest.fn(),
      );

      expect(result.immediateSymbols).toEqual([]);
      expect(result.scheduledSymbols).toEqual([
        expect.objectContaining({
          symbol: "AAPL.US",
          graceExpiresAt: expect.any(String),
        }),
      ]);
    } finally {
      coordinator.onModuleDestroy();
      await clientStateManager.onModuleDestroy();
    }
  });
});
