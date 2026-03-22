import { ChartIntradaySessionService } from "@core/03-fetching/chart-intraday/services/chart-intraday-session.service";

describe("ChartIntradaySessionService", () => {
  function createCacheHarness() {
    const store = new Map<string, string>();
    const expiries = new Map<string, number>();

    const purgeExpiredKey = (key: string) => {
      const expiresAt = expiries.get(key);
      if (typeof expiresAt === "number" && Date.now() >= expiresAt) {
        expiries.delete(key);
        store.delete(key);
      }
    };

    const readRaw = (key: string): string | null => {
      purgeExpiredKey(key);
      return store.has(key) ? String(store.get(key)) : null;
    };

    const setExpiry = (key: string, ttlSeconds?: number) => {
      if (ttlSeconds && ttlSeconds > 0) {
        expiries.set(key, Date.now() + ttlSeconds * 1000);
        return;
      }
      expiries.delete(key);
    };

    const redis = {
      get: jest.fn(async (key: string) => readRaw(key)),
      setex: jest.fn(async (key: string, ttlSeconds: number, value: string) => {
        store.set(key, String(value));
        setExpiry(key, ttlSeconds);
        return "OK";
      }),
      del: jest.fn(async (key: string) => {
        purgeExpiredKey(key);
        expiries.delete(key);
        return store.delete(key) ? 1 : 0;
      }),
      scan: jest.fn(async (_cursor: string, _match: string, pattern: string) => {
        const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
        const keys = Array.from(store.keys()).filter((key) =>
          key.startsWith(prefix),
        );
        return ["0", keys] as [string, string[]];
      }),
    };

    const basicCache = {
      get: jest.fn(async <T>(key: string): Promise<T | null> => {
        const raw = readRaw(key);
        if (raw === null) {
          return null;
        }
        return JSON.parse(raw) as T;
      }),
      mget: jest.fn(async <T>(keys: string[]): Promise<(T | null)[]> =>
        keys.map((key) => {
          const raw = readRaw(key);
          if (raw === null) {
            return null;
          }
          return JSON.parse(raw) as T;
        }),
      ),
      set: jest.fn(async (key: string, value: unknown, opts?: { ttlSeconds?: number }) => {
        store.set(key, JSON.stringify(value));
        setExpiry(key, opts?.ttlSeconds);
      }),
      del: jest.fn(async (key: string) => redis.del(key)),
      incr: jest.fn(async (key: string, by = 1) => {
        const raw = readRaw(key);
        const current = raw === null ? 0 : Number(JSON.parse(raw));
        const next = current + by;
        store.set(key, JSON.stringify(next));
        return next;
      }),
      expire: jest.fn(async (key: string, ttlSeconds: number) => {
        if (!store.has(key)) {
          return false;
        }
        setExpiry(key, ttlSeconds);
        return true;
      }),
    };

    return {
      store,
      redis,
      basicCache,
    };
  }

  function buildSessionFixture() {
    return {
      sessionId: "chart_session_existing",
      symbol: "BTCUSDT",
      market: "CRYPTO",
      provider: "infoway",
      wsCapabilityType: "stream-crypto-quote",
      clientId: "chart-intraday:infoway:stream-crypto-quote:BTCUSDT",
      ownerIdentity: "user:test-owner",
      upstreamKey: "infoway:stream-crypto-quote:BTCUSDT",
      createdAt: 1,
      lastSeenAt: 1,
      runtimeOwnerId: null,
      boundClientIds: [],
    };
  }

  function buildServiceWithExistingOwnerLease(rawOwnerLeaseValue: string) {
    const harness = createCacheHarness();
    const service = new ChartIntradaySessionService(
      harness.basicCache as any,
      harness.redis as any,
    );
    const session = buildSessionFixture();
    const sessionKey = `chart-intraday:session:v1:${session.sessionId}`;
    const ownerLeaseKey =
      "chart-intraday:owner-lease:v1:user:test-owner:infoway:stream-crypto-quote:BTCUSDT";

    harness.store.set(sessionKey, JSON.stringify(session));
    harness.store.set(ownerLeaseKey, rawOwnerLeaseValue);

    return {
      harness,
      service,
      session,
      ownerLeaseKey,
    };
  }

  it("能复用 Redis Lua 脚本写入的裸 sessionId owner-lease", async () => {
    const fixture = buildSessionFixture();
    const { harness, service, session, ownerLeaseKey } =
      buildServiceWithExistingOwnerLease(fixture.sessionId);

    const result = await service.getOrCreateSessionByOwnerLease({
      symbol: session.symbol,
      market: session.market,
      provider: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      clientId: session.clientId,
      ownerIdentity: session.ownerIdentity,
    });

    expect(result.leaseCreated).toBe(false);
    expect(result.session.sessionId).toBe(session.sessionId);
    expect(harness.redis.get).toHaveBeenCalledWith(ownerLeaseKey);
    expect(harness.basicCache.get).not.toHaveBeenCalledWith(ownerLeaseKey);
    expect(harness.store.get(ownerLeaseKey)).toBe(session.sessionId);
  });

  it("兼容历史 JSON 包裹字符串 owner-lease，并回写为裸 sessionId", async () => {
    const fixture = buildSessionFixture();
    const { harness, service, session, ownerLeaseKey } =
      buildServiceWithExistingOwnerLease(JSON.stringify(fixture.sessionId));

    const result = await service.getOrCreateSessionByOwnerLease({
      symbol: session.symbol,
      market: session.market,
      provider: session.provider,
      wsCapabilityType: session.wsCapabilityType,
      clientId: session.clientId,
      ownerIdentity: session.ownerIdentity,
    });

    expect(result.leaseCreated).toBe(false);
    expect(result.session.sessionId).toBe(session.sessionId);
    expect(harness.store.get(ownerLeaseKey)).toBe(session.sessionId);
  });
});
