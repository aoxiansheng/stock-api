import { ChartIntradaySessionService } from "@core/03-fetching/chart-intraday/services/chart-intraday-session.service";
import { ChartIntradayStreamSubscriptionService } from "@core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

describe("ChartIntradayStreamSubscriptionService", () => {
  const originalSessionTtl = process.env.CHART_INTRADAY_SESSION_TTL_MS;
  const originalReleaseGrace = process.env.CHART_INTRADAY_RELEASE_GRACE_MS;
  const originalCleanupInterval =
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS;
  const originalReleaseLockTtl =
    process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS;
  const originalReleaseLockWait =
    process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS;
  const originalReleaseLockPoll =
    process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS;

  function createBasicCacheMock() {
    const store = new Map<string, unknown>();
    const expiries = new Map<string, number>();
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    const purgeExpiredKey = (key: string) => {
      const expiresAt = expiries.get(key);
      if (typeof expiresAt === "number" && Date.now() >= expiresAt) {
        store.delete(key);
        expiries.delete(key);
      }
    };
    const purgeExpiredKeys = () => {
      for (const key of Array.from(expiries.keys())) {
        purgeExpiredKey(key);
      }
    };
    const readValue = (key: string) => {
      purgeExpiredKey(key);
      return store.get(key);
    };
    const cloneStoredValue = <T>(key: string): T | null => {
      const value = readValue(key);
      if (value === undefined) {
        return null;
      }
      if (typeof value === "string") {
        return clone(JSON.parse(value) as T);
      }
      return clone(value as T);
    };
    const toNumber = (value: unknown) => {
      const normalized =
        typeof value === "number"
          ? value
          : Number(value === undefined ? 0 : value);
      return Number.isFinite(normalized) ? normalized : 0;
    };

    return {
      store,
      redis: {
        scan: jest.fn(
          async (
            cursor: string,
            _matchKeyword: string,
            pattern: string,
          ): Promise<[string, string[]]> => {
            purgeExpiredKeys();
            const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
            const keys = Array.from(store.keys()).filter((key) =>
              key.startsWith(prefix),
            );
            return ["0", keys];
          },
        ),
        set: jest.fn(
          async (
            key: string,
            value: string,
            ...args: Array<string | number>
          ): Promise<"OK" | null> => {
            purgeExpiredKey(key);
            const normalizedArgs = args.map((arg) => String(arg).toUpperCase());
            const hasNx = normalizedArgs.includes("NX");
            if (hasNx && store.has(key)) {
              return null;
            }
            const exIndex = normalizedArgs.indexOf("EX");
            store.set(key, value);
            if (exIndex >= 0) {
              expiries.set(
                key,
                Date.now() + Number(args[exIndex + 1] || 0) * 1000,
              );
            } else {
              expiries.delete(key);
            }
            return "OK";
          },
        ),
        del: jest.fn(async (key: string) => {
          purgeExpiredKey(key);
          expiries.delete(key);
          const existed = store.delete(key);
          return existed ? 1 : 0;
        }),
        eval: jest.fn(
          async (
            _script: string,
            keyCount: number,
            ...args: string[]
          ): Promise<number | [number, number]> => {
            purgeExpiredKeys();

            if (keyCount === 1) {
              const [lockKey, lockToken] = args;
              if (store.get(lockKey) === lockToken) {
                expiries.delete(lockKey);
                return store.delete(lockKey) ? 1 : 0;
              }
              return 0;
            }

            const [
              lockKey,
              sessionKey,
              countKey,
              releasedKey,
              lockToken,
              releasedTtlSeconds,
              countTtlSeconds,
              releasedPayload,
            ] = args;

            if (store.get(lockKey) !== lockToken) {
              return [0, 0];
            }

            const deleted = store.delete(sessionKey) ? 1 : 0;
            if (deleted !== 1) {
              return [2, 0];
            }
            const next = Math.max(0, toNumber(store.get(countKey)) - 1);
            store.set(countKey, next);
            expiries.set(
              countKey,
              Date.now() + Number(countTtlSeconds || 0) * 1000,
            );
            store.set(releasedKey, releasedPayload);
            expiries.set(
              releasedKey,
              Date.now() + Number(releasedTtlSeconds || 0) * 1000,
            );
            return [1, next];
          },
        ),
      },
      service: {
        get: jest.fn(async (key: string) => cloneStoredValue(key)),
        mget: jest.fn(async (keys: string[]) => keys.map((key) => cloneStoredValue(key))),
        set: jest.fn(async (key: string, value: unknown, opts?: { ttlSeconds?: number }) => {
          store.set(key, clone(value));
          if (opts?.ttlSeconds) {
            expiries.set(key, Date.now() + opts.ttlSeconds * 1000);
          } else {
            expiries.delete(key);
          }
        }),
        del: jest.fn(async (key: string) => {
          purgeExpiredKey(key);
          expiries.delete(key);
          const existed = store.delete(key);
          return existed ? 1 : 0;
        }),
        incr: jest.fn(async (key: string, by = 1) => {
          purgeExpiredKey(key);
          const next = toNumber(store.get(key)) + by;
          store.set(key, next);
          return next;
        }),
        expire: jest.fn(async (key: string, ttlSeconds: number) => {
          purgeExpiredKey(key);
          if (!store.has(key)) {
            return false;
          }
          expiries.set(key, Date.now() + ttlSeconds * 1000);
          return true;
        }),
      },
    };
  }

  function createService(options?: {
    basicCache?: ReturnType<typeof createBasicCacheMock>;
  }) {
    const subscriptions = new Map<string, any>();
    const streamReceiverService = {
      subscribeStream: jest.fn(async (payload: any, clientId?: string) => {
        if (!clientId) {
          return;
        }
        subscriptions.set(clientId, {
          providerName: payload.preferredProvider,
          wsCapabilityType: payload.wsCapabilityType,
          symbols: new Set(payload.symbols || []),
        });
      }),
      unsubscribeStream: jest.fn(async (payload: any, clientId?: string) => {
        if (!clientId) {
          return;
        }
        const current = subscriptions.get(clientId);
        if (!current) {
          return;
        }
        const symbols =
          Array.isArray(payload?.symbols) && payload.symbols.length > 0
            ? payload.symbols
            : Array.from(current.symbols);
        for (const symbol of symbols) {
          current.symbols.delete(symbol);
        }
        if (current.symbols.size === 0) {
          subscriptions.delete(clientId);
          return;
        }
        subscriptions.set(clientId, current);
      }),
    };

    const streamClientStateManager = {
      getClientSubscription: jest.fn((clientId: string) =>
        subscriptions.get(clientId) || null,
      ),
    };

    const basicCache = options?.basicCache || createBasicCacheMock();
    const chartIntradaySessionService = new ChartIntradaySessionService(
      basicCache.service as any,
      basicCache.redis as any,
    );
    const service = new ChartIntradayStreamSubscriptionService(
      streamReceiverService as any,
      streamClientStateManager as any,
      chartIntradaySessionService,
    );

    return {
      service,
      streamReceiverService,
      streamClientStateManager,
      chartIntradaySessionService,
      basicCache,
      subscriptions,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.CHART_INTRADAY_SESSION_TTL_MS = "60000";
    process.env.CHART_INTRADAY_RELEASE_GRACE_MS = "60000";
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS = "60000";
    process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS = "5";
    process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS = "500";
    process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS = "25";
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalSessionTtl === undefined) {
      delete process.env.CHART_INTRADAY_SESSION_TTL_MS;
    } else {
      process.env.CHART_INTRADAY_SESSION_TTL_MS = originalSessionTtl;
    }

    if (originalReleaseGrace === undefined) {
      delete process.env.CHART_INTRADAY_RELEASE_GRACE_MS;
    } else {
      process.env.CHART_INTRADAY_RELEASE_GRACE_MS = originalReleaseGrace;
    }

    if (originalCleanupInterval === undefined) {
      delete process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS;
    } else {
      process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS =
        originalCleanupInterval;
    }

    if (originalReleaseLockTtl === undefined) {
      delete process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS;
    } else {
      process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS =
        originalReleaseLockTtl;
    }

    if (originalReleaseLockWait === undefined) {
      delete process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS;
    } else {
      process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS =
        originalReleaseLockWait;
    }

    if (originalReleaseLockPoll === undefined) {
      delete process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS;
    } else {
      process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS =
        originalReleaseLockPoll;
    }
  });

  it("snapshot 会创建 session 并建立内部 stock 实时订阅", async () => {
    const { service, streamReceiverService, subscriptions } = createService();

    const result = await service.openRealtimeSession({
      symbol: "aapl.us",
      market: "us",
      provider: "InfoWay",
      ownerIdentity: "appkey:test-key",
    });

    expect(result).toEqual(
      expect.objectContaining({
        sessionId: expect.stringContaining("chart_session_"),
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
    );
    expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        preferredProvider: "infoway",
      },
      "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      undefined,
      { connectionAuthenticated: true },
    );

    subscriptions.set(result.clientId, {
      providerName: result.provider,
      wsCapabilityType: result.wsCapabilityType,
      symbols: new Set([result.symbol]),
    });
    await service.onModuleDestroy();
  });

  it("CRYPTO 市场应建立 stream-crypto-quote 内部订阅", async () => {
    const { service, streamReceiverService } = createService();

    const result = await service.openRealtimeSession({
      symbol: "btcusdt",
      market: "crypto",
      provider: "InfoWay",
      ownerIdentity: "appkey:test-key",
    });

    expect(result.wsCapabilityType).toBe(CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE);
    expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["BTCUSDT"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE,
        preferredProvider: "infoway",
      },
      "chart-intraday:auto:infoway:stream-crypto-quote:BTCUSDT",
      undefined,
      { connectionAuthenticated: true },
    );

    await service.onModuleDestroy();
  });

  it("同一 upstream 下第二个 session 在内部订阅已活跃时不重复订阅", async () => {
    const { service, streamReceiverService, subscriptions } = createService();

    const first = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(first.clientId, {
      providerName: first.provider,
      wsCapabilityType: first.wsCapabilityType,
      symbols: new Set([first.symbol]),
    });

    await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    expect(streamReceiverService.subscribeStream).toHaveBeenCalledTimes(1);
    await service.onModuleDestroy();
  });

  it("上游订阅建立失败时应回滚刚创建的 session 与 upstream", async () => {
    const { service, streamReceiverService, chartIntradaySessionService } =
      createService();
    streamReceiverService.subscribeStream.mockRejectedValueOnce(
      new Error("subscribe-failed"),
    );

    await expect(
      service.openRealtimeSession({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
    ).rejects.toThrow("subscribe-failed");

    expect(await chartIntradaySessionService.listUpstreams()).toHaveLength(0);
    expect(await chartIntradaySessionService.listIdleUpstreamKeys()).toHaveLength(
      0,
    );
  });

  it("session 状态写入共享缓存后，新实例应能继续 touch 同一 session", async () => {
    const {
      service,
      streamReceiverService,
      streamClientStateManager,
      basicCache,
      subscriptions,
    } = createService();

    const first = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(first.clientId, {
      providerName: first.provider,
      wsCapabilityType: first.wsCapabilityType,
      symbols: new Set([first.symbol]),
    });

    const nextInstanceSessionService = new ChartIntradaySessionService(
      basicCache.service as any,
      basicCache.redis as any,
    );
    const nextInstanceService = new ChartIntradayStreamSubscriptionService(
      streamReceiverService as any,
      streamClientStateManager as any,
      nextInstanceSessionService,
    );

    const touched = await nextInstanceService.touchRealtimeSession({
      sessionId: first.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    expect(touched).toEqual(
      expect.objectContaining({
        sessionId: first.sessionId,
        symbol: "AAPL.US",
        provider: "infoway",
      }),
    );

    await service.onModuleDestroy();
    await nextInstanceService.onModuleDestroy();
  });

  it("跨实例 touch 后，旧实例应在巡检中回收本地订阅", async () => {
    process.env.CHART_INTRADAY_RELEASE_GRACE_MS = "0";
    const sharedCache = createBasicCacheMock();
    const firstInstance = createService({ basicCache: sharedCache });
    const secondInstance = createService({ basicCache: sharedCache });

    const session = await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    firstInstance.subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    await secondInstance.service.touchRealtimeSession({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    secondInstance.subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    await (firstInstance.service as any).cleanupExpiredSessions();
    expect(firstInstance.streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(
      1,
    );

    await secondInstance.service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(secondInstance.streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(
      1,
    );

    await (firstInstance.service as any).cleanupExpiredSessions();
    expect(firstInstance.streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(
      1,
    );

    await firstInstance.service.onModuleDestroy();
    await secondInstance.service.onModuleDestroy();
  });

  it("双 session 共享时先释放一个不会退上游，最后一个释放后进入宽限期再退订", async () => {
    const { service, streamReceiverService, subscriptions } = createService();

    const first = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(first.clientId, {
      providerName: first.provider,
      wsCapabilityType: first.wsCapabilityType,
      symbols: new Set([first.symbol]),
    });

    const second = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    const firstRelease = await service.releaseRealtimeSubscription({
      sessionId: first.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(firstRelease).toEqual(
      expect.objectContaining({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        activeSessionCount: 1,
        graceExpiresAt: null,
      }),
    );
    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();

    const secondRelease = await service.releaseRealtimeSubscription({
      sessionId: second.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(secondRelease).toEqual(
      expect.objectContaining({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        activeSessionCount: 0,
        graceExpiresAt: expect.any(String),
      }),
    );
    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(60_000);

    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      },
      "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
    );

    await service.onModuleDestroy();
  });

  it("session 过期后应先释放共享 session，并交由本地回收流程后续处理", async () => {
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS = "300000";
    const {
      service,
      streamReceiverService,
      subscriptions,
      chartIntradaySessionService,
    } = createService();

    const result = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(result.clientId, {
      providerName: result.provider,
      wsCapabilityType: result.wsCapabilityType,
      symbols: new Set([result.symbol]),
    });

    await jest.advanceTimersByTimeAsync(61_000);

    await (service as any).cleanupExpiredSessions();
    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();
    await expect(
      chartIntradaySessionService.getRequiredSession(result.sessionId),
    ).rejects.toThrow("SESSION_NOT_FOUND");

    await service.onModuleDestroy();
  });

  it("按 symbol 解绑 client 后，仅剩余 session 会被 ping 续期", async () => {
    const { service, chartIntradaySessionService } = createService();

    const aapl = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    const msft = await service.openRealtimeSession({
      symbol: "MSFT.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    await service.bindRealtimeClientToSession({
      sessionId: aapl.sessionId,
      clientId: "client-1",
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    await service.bindRealtimeClientToSession({
      sessionId: msft.sessionId,
      clientId: "client-1",
      symbol: "MSFT.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    const aaplSessionBefore = await chartIntradaySessionService.getRequiredSession(
      aapl.sessionId,
    );
    const msftSessionBefore = await chartIntradaySessionService.getRequiredSession(
      msft.sessionId,
    );
    const aaplLastSeenAt = aaplSessionBefore.lastSeenAt;
    const msftLastSeenAt = msftSessionBefore.lastSeenAt;

    await jest.advanceTimersByTimeAsync(1_000);
    await service.unbindRealtimeClientSessions({
      clientId: "client-1",
      symbols: ["AAPL.US"],
    });

    const aaplSessionAfter = await chartIntradaySessionService.getRequiredSession(
      aapl.sessionId,
    );
    const msftSessionAfter = await chartIntradaySessionService.getRequiredSession(
      msft.sessionId,
    );

    expect(aaplSessionAfter.boundClientIds.has("client-1")).toBe(false);
    expect(msftSessionAfter.boundClientIds.has("client-1")).toBe(true);
    expect(service.touchRealtimeSessionsForClient("client-1")).toBe(1);
    expect(aaplSessionAfter.lastSeenAt).toBe(aaplLastSeenAt);

    await jest.advanceTimersByTimeAsync(1);

    const msftSessionTouched = await chartIntradaySessionService.getRequiredSession(
      msft.sessionId,
    );
    expect(msftSessionTouched.lastSeenAt).toBeGreaterThan(msftLastSeenAt);
  });

  it("同一 client 的同 symbol 多 session 解绑时，应保守保留全部绑定避免误解绑", async () => {
    const { service, chartIntradaySessionService } = createService();

    const first = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    const second = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    await service.bindRealtimeClientToSession({
      sessionId: first.sessionId,
      clientId: "client-1",
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    await service.bindRealtimeClientToSession({
      sessionId: second.sessionId,
      clientId: "client-1",
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    await service.unbindRealtimeClientSessions({
      clientId: "client-1",
      symbols: ["AAPL.US"],
    });

    const firstAfter = await chartIntradaySessionService.getRequiredSession(
      first.sessionId,
    );
    const secondAfter = await chartIntradaySessionService.getRequiredSession(
      second.sessionId,
    );

    expect(firstAfter.boundClientIds.has("client-1")).toBe(true);
    expect(secondAfter.boundClientIds.has("client-1")).toBe(true);
    expect(service.touchRealtimeSessionsForClient("client-1")).toBe(2);
  });

  it("零宽限期显式释放失败后，cleanup 周期仍会重试回收 idle upstream", async () => {
    process.env.CHART_INTRADAY_RELEASE_GRACE_MS = "0";
    const { service, streamReceiverService, subscriptions, chartIntradaySessionService } =
      createService();

    const session = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    streamReceiverService.unsubscribeStream
      .mockRejectedValueOnce(new Error("unsubscribe-failed"))
      .mockResolvedValueOnce(undefined);

    const releaseResult = await service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(releaseResult).toEqual(
      expect.objectContaining({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        activeSessionCount: 0,
      }),
    );
    expect(await chartIntradaySessionService.listIdleUpstreamKeys()).toHaveLength(
      0,
    );

    await (service as any).cleanupExpiredSessions();

    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(2);
    expect(await chartIntradaySessionService.listIdleUpstreamKeys()).toHaveLength(
      0,
    );
  });

  it("onModuleDestroy 应释放残留 upstream，且单个失败不阻断其他清理", async () => {
    const { service, streamReceiverService, subscriptions } = createService();

    const stock = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    const crypto = await service.openRealtimeSession({
      symbol: "BTCUSDT",
      market: "CRYPTO",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(stock.clientId, {
      providerName: stock.provider,
      wsCapabilityType: stock.wsCapabilityType,
      symbols: new Set([stock.symbol]),
    });
    subscriptions.set(crypto.clientId, {
      providerName: crypto.provider,
      wsCapabilityType: crypto.wsCapabilityType,
      symbols: new Set([crypto.symbol]),
    });

    streamReceiverService.unsubscribeStream
      .mockRejectedValueOnce(new Error("unsubscribe-failed"))
      .mockResolvedValueOnce(undefined);

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();

    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(2);
  });

  it("同一个 session 重复 release 应返回 ALREADY_RELEASED 且不再重复退订", async () => {
    const { service, streamReceiverService, subscriptions } = createService();

    const session = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    const firstRelease = await service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(firstRelease).toEqual(
      expect.objectContaining({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        activeSessionCount: 0,
        graceExpiresAt: expect.any(String),
      }),
    );

    const secondRelease = await service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(secondRelease).toEqual(
      expect.objectContaining({
        sessionReleased: false,
        upstreamReleased: false,
        reason: "ALREADY_RELEASED",
        activeSessionCount: 0,
        graceExpiresAt: firstRelease.graceExpiresAt,
      }),
    );

    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
  });

  it("同一个 session 并发重复 release 不应重复扣减引用或抛错", async () => {
    const { service, streamReceiverService, subscriptions, chartIntradaySessionService } =
      createService();

    const session = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    const results = await Promise.all([
      service.releaseRealtimeSubscription({
        sessionId: session.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
      service.releaseRealtimeSubscription({
        sessionId: session.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
    ]);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionReleased: true,
          reason: "RELEASED",
          activeSessionCount: 0,
        }),
        expect.objectContaining({
          sessionReleased: false,
          reason: "ALREADY_RELEASED",
          activeSessionCount: 0,
        }),
      ]),
    );
    expect(
      await chartIntradaySessionService.getUpstreamActiveSessionCount(
        `infoway:${CAPABILITY_NAMES.STREAM_STOCK_QUOTE}:AAPL.US`,
      ),
    ).toBe(0);
    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();

    await service.onModuleDestroy();
  });

  it("跨实例并发重复 release 不应把共享 activeSessionCount 误扣为 0", async () => {
    const sharedCache = createBasicCacheMock();
    const firstInstance = createService({ basicCache: sharedCache });
    const secondInstance = createService({ basicCache: sharedCache });

    const first = await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    const second = await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    firstInstance.subscriptions.set(first.clientId, {
      providerName: first.provider,
      wsCapabilityType: first.wsCapabilityType,
      symbols: new Set([first.symbol]),
    });

    const pendingResults = Promise.all([
      firstInstance.service.releaseRealtimeSubscription({
        sessionId: first.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
      secondInstance.service.releaseRealtimeSubscription({
        sessionId: first.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
    ]);
    await jest.advanceTimersByTimeAsync(500);
    const results = await pendingResults;

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionReleased: true,
          reason: "RELEASED",
          activeSessionCount: 1,
        }),
        expect.objectContaining({
          sessionReleased: false,
          reason: "ALREADY_RELEASED",
          activeSessionCount: 1,
        }),
      ]),
    );
    expect(
      await firstInstance.chartIntradaySessionService.getUpstreamActiveSessionCount(
        `infoway:${CAPABILITY_NAMES.STREAM_STOCK_QUOTE}:AAPL.US`,
      ),
    ).toBe(1);

    await firstInstance.service.onModuleDestroy();
    await secondInstance.service.onModuleDestroy();
    void second;
  });

  it("跨实例重复 release 应返回共享宽限期状态，而不是本地推断", async () => {
    const sharedCache = createBasicCacheMock();
    const firstInstance = createService({ basicCache: sharedCache });
    const secondInstance = createService({ basicCache: sharedCache });

    const session = await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    firstInstance.subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    const firstRelease = await firstInstance.service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(firstRelease).toEqual(
      expect.objectContaining({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        activeSessionCount: 0,
        graceExpiresAt: expect.any(String),
      }),
    );

    const secondRelease = await secondInstance.service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(secondRelease).toEqual(
      expect.objectContaining({
        sessionReleased: false,
        upstreamReleased: false,
        reason: "ALREADY_RELEASED",
        activeSessionCount: 0,
        graceExpiresAt: firstRelease.graceExpiresAt,
      }),
    );

    await jest.advanceTimersByTimeAsync(60_000);

    const afterGrace = await secondInstance.service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(afterGrace).toEqual(
      expect.objectContaining({
        sessionReleased: false,
        upstreamReleased: true,
        reason: "ALREADY_RELEASED",
        activeSessionCount: 0,
        graceExpiresAt: null,
      }),
    );

    await firstInstance.service.onModuleDestroy();
    await secondInstance.service.onModuleDestroy();
  });

  it("session 因 TTL 过期后再 release 应按 ALREADY_RELEASED 返回", async () => {
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS = "300000";
    const { service, subscriptions } = createService();

    const session = await service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    subscriptions.set(session.clientId, {
      providerName: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      symbols: new Set([session.symbol]),
    });

    await jest.advanceTimersByTimeAsync(60_001);
    await (service as any).cleanupExpiredSessions();

    const releaseResult = await service.releaseRealtimeSubscription({
      sessionId: session.sessionId,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    expect(releaseResult).toEqual(
      expect.objectContaining({
        sessionReleased: false,
        reason: "ALREADY_RELEASED",
        activeSessionCount: 0,
      }),
    );

    await service.onModuleDestroy();
  });

  it("锁租约过期后，旧持有者恢复时不得再次扣减共享 activeSessionCount", async () => {
    process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS = "1";
    process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS = "2000";
    process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS = "20";

    const sharedCache = createBasicCacheMock();
    const firstInstance = createService({ basicCache: sharedCache });
    const secondInstance = createService({ basicCache: sharedCache });

    const first = await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });
    await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    firstInstance.subscriptions.set(first.clientId, {
      providerName: first.provider,
      wsCapabilityType: first.wsCapabilityType,
      symbols: new Set([first.symbol]),
    });

    const originalEval = sharedCache.redis.eval;
    let delayed = false;
    sharedCache.redis.eval = jest.fn(
      async (
        script: string,
        keyCount: number,
        ...args: string[]
      ): Promise<number | [number, number]> => {
        if (!delayed && keyCount === 4) {
          delayed = true;
          await new Promise((resolve) => setTimeout(resolve, 1_200));
        }
        return originalEval(script, keyCount, ...args);
      },
    );

    const pendingResults = Promise.all([
      firstInstance.service.releaseRealtimeSubscription({
        sessionId: first.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
      secondInstance.service.releaseRealtimeSubscription({
        sessionId: first.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
    ]);

    await jest.advanceTimersByTimeAsync(2_500);
    const results = await pendingResults;

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionReleased: true,
          reason: "RELEASED",
          activeSessionCount: 1,
        }),
        expect.objectContaining({
          sessionReleased: false,
          reason: "ALREADY_RELEASED",
          activeSessionCount: 1,
        }),
      ]),
    );
    expect(
      await firstInstance.chartIntradaySessionService.getUpstreamActiveSessionCount(
        `infoway:${CAPABILITY_NAMES.STREAM_STOCK_QUOTE}:AAPL.US`,
      ),
    ).toBe(1);

    await firstInstance.service.onModuleDestroy();
    await secondInstance.service.onModuleDestroy();
  });

  it("慢 release 在锁等待期间应收敛为幂等结果，而不是忙碌错误", async () => {
    process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS = "5";
    process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS = "200";
    process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS = "20";

    const sharedCache = createBasicCacheMock();
    const firstInstance = createService({ basicCache: sharedCache });
    const secondInstance = createService({ basicCache: sharedCache });

    const session = await firstInstance.service.openRealtimeSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "appkey:test-key",
    });

    const originalEval = sharedCache.redis.eval;
    let delayed = false;
    sharedCache.redis.eval = jest.fn(
      async (
        script: string,
        keyCount: number,
        ...args: string[]
      ): Promise<number | [number, number]> => {
        if (!delayed && keyCount === 4) {
          delayed = true;
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
        return originalEval(script, keyCount, ...args);
      },
    );

    const pendingResults = Promise.allSettled([
      firstInstance.service.releaseRealtimeSubscription({
        sessionId: session.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
      secondInstance.service.releaseRealtimeSubscription({
        sessionId: session.sessionId,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        ownerIdentity: "appkey:test-key",
      }),
    ]);

    await jest.advanceTimersByTimeAsync(1_500);
    const results = await pendingResults;

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "fulfilled",
          value: expect.objectContaining({
            reason: "RELEASED",
          }),
        }),
        expect.objectContaining({
          status: "fulfilled",
          value: expect.objectContaining({
            reason: "ALREADY_RELEASED",
          }),
        }),
      ]),
    );

    await firstInstance.service.onModuleDestroy();
    await secondInstance.service.onModuleDestroy();
  });
});
