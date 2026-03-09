import { ChartIntradayService } from "@core/01-entry/chart-intraday/services/chart-intraday.service";
import { BusinessException } from "@common/core/exceptions";
import { createHmac } from "crypto";

type CursorPayload = {
  v: number;
  symbol: string;
  market: string;
  tradingDay: string;
  provider?: string;
  lastPointTimestamp: string;
  issuedAt: string;
};

describe("ChartIntradayService", () => {
  const DEFAULT_CURSOR_SECRET = "chart-intraday-test-secret";
  const CURSOR_SECRET_ENV_KEYS = [
    "CHART_INTRADAY_CURSOR_SECRET",
    "CURSOR_SIGNING_SECRET",
    "JWT_SECRET",
    "APP_SECRET",
  ] as const;
  const originalCursorSecretEnv = Object.fromEntries(
    CURSOR_SECRET_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof CURSOR_SECRET_ENV_KEYS)[number], string | undefined>;

  function setCursorSecret(secret: string | null = DEFAULT_CURSOR_SECRET) {
    for (const key of CURSOR_SECRET_ENV_KEYS) {
      delete process.env[key];
    }
    if (secret !== null) {
      process.env.CHART_INTRADAY_CURSOR_SECRET = secret;
    }
  }

  function restoreCursorSecretEnv() {
    for (const key of CURSOR_SECRET_ENV_KEYS) {
      const original = originalCursorSecretEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  }

  function signCursorPayload(payload: CursorPayload, secret: string) {
    const raw = [
      payload.v,
      payload.symbol,
      payload.market,
      payload.tradingDay,
      payload.provider || "",
      payload.lastPointTimestamp,
      payload.issuedAt,
    ].join("|");
    return createHmac("sha256", secret).update(raw, "utf-8").digest("hex");
  }

  function encodeCursor(cursorPayload: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(cursorPayload), "utf-8").toString("base64");
  }

  function decodeCursor(cursor: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
  }

  function createSignedCursor(
    payloadInput: Omit<CursorPayload, "v" | "issuedAt"> &
      Partial<Pick<CursorPayload, "v" | "issuedAt">>,
    secret = process.env.CHART_INTRADAY_CURSOR_SECRET || DEFAULT_CURSOR_SECRET,
  ) {
    const payload: CursorPayload = {
      v: payloadInput.v ?? 1,
      issuedAt: payloadInput.issuedAt ?? new Date().toISOString(),
      symbol: payloadInput.symbol,
      market: payloadInput.market,
      tradingDay: payloadInput.tradingDay,
      provider: payloadInput.provider,
      lastPointTimestamp: payloadInput.lastPointTimestamp,
    };
    return encodeCursor({
      ...payload,
      sig: signCursorPayload(payload, secret),
    });
  }

  function createService(options?: { secret?: string | null }) {
    setCursorSecret(
      options?.secret === undefined ? DEFAULT_CURSOR_SECRET : options.secret,
    );

    const receiverService = {
      handleRequest: jest.fn(),
    };
    const streamCache = {
      getData: jest.fn(),
    };
    const streamDataFetcherService = {
      getStreamDataCache: jest.fn().mockReturnValue(streamCache),
    };

    const service = new ChartIntradayService(
      receiverService as any,
      streamDataFetcherService as any,
    );

    return {
      service,
      receiverService,
      streamDataFetcherService,
      streamCache,
    };
  }

  beforeEach(() => {
    setCursorSecret(DEFAULT_CURSOR_SECRET);
  });

  afterAll(() => {
    restoreCursorSecretEnv();
  });

  it("初始化: 未配置 cursor secret 时应 fail-fast", () => {
    expect(() => createService({ secret: null })).toThrow(
      "CHART_INTRADAY_CURSOR_SECRET 未配置",
    );
  });

  it("snapshot: 合并分钟基线与实时点，实时点可覆盖同秒历史点", async () => {
    const { service, receiverService, streamCache } = createService();
    const nowMs = Date.now();
    const t1 = Math.floor((nowMs - 120_000) / 1000);
    const t2 = Math.floor((nowMs - 60_000) / 1000);
    const t3 = Math.floor(nowMs / 1000);

    receiverService.handleRequest.mockResolvedValue({
      data: [
        {
          symbol: "AAPL.US",
          timestamp: String(t1),
          lastPrice: "100.10",
          volume: "1000",
        },
        {
          symbol: "AAPL.US",
          timestamp: String(t2),
          lastPrice: "100.20",
          volume: "2000",
        },
      ],
    });

    streamCache.getData.mockResolvedValue([
      {
        s: "AAPL.US",
        t: t2 * 1000,
        p: 101.25,
        v: 3000,
      },
      {
        s: "AAPL.US",
        t: t3 * 1000,
        p: 101.55,
        v: 4000,
      },
    ]);

    const result = await service.getSnapshot({
      symbol: "aapl.us",
      market: "us",
      provider: "infoway",
      pointLimit: 300,
    });

    expect(receiverService.handleRequest).toHaveBeenCalledTimes(1);
    expect(receiverService.handleRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        receiverType: "get-stock-history",
        symbols: ["AAPL.US"],
      }),
    );

    expect(result.line.symbol).toBe("AAPL.US");
    expect(result.line.granularity).toBe("1s");
    expect(result.line.points).toHaveLength(3);
    expect(result.line.points[1].price).toBe(101.25);
    expect(result.metadata.historyPoints).toBe(2);
    expect(result.metadata.realtimeMergedPoints).toBe(2);
    expect(result.metadata.deduplicatedPoints).toBe(1);
    expect(result.capability.supportsFullDay1sHistory).toBe(false);
    expect(result.sync.cursor).toBeTruthy();
  });

  it("snapshot: 历史基线按 tradingDay 过滤，避免跨日污染", async () => {
    const { service, receiverService, streamCache } = createService();
    streamCache.getData.mockResolvedValue([]);
    receiverService.handleRequest.mockResolvedValue({
      data: [
        {
          symbol: "AAPL.US",
          timestamp: "2026-01-15T04:59:59.000Z",
          lastPrice: "99.10",
          volume: "100",
        },
        {
          symbol: "AAPL.US",
          timestamp: "2026-01-15T05:00:00.000Z",
          lastPrice: "100.20",
          volume: "200",
        },
      ],
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260115",
      pointLimit: 300,
    });

    expect(result.line.points).toHaveLength(1);
    expect(result.line.points[0].timestamp).toBe("2026-01-15T05:00:00.000Z");
    expect(result.metadata.historyPoints).toBe(1);
  });

  it("snapshot: 显式 market 与 symbol 可推断市场不一致时返回 400", async () => {
    const { service } = createService();

    expect.assertions(3);
    try {
      await service.getSnapshot({
        symbol: "AAPL.US",
        market: "HK",
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
      expect((error as Error).message).toContain(
        "market 与 symbol 推断市场不一致",
      );
    }
  });

  it("delta: 合法 cursor 正常，并按 limit 返回分页增量", async () => {
    const { service, streamCache } = createService();
    const baseMs = Date.parse("2026-01-15T15:00:00.000Z");
    const t1 = baseMs + 1000;
    const t2 = baseMs + 2000;

    streamCache.getData.mockResolvedValue([
      { s: "AAPL.US", t: t1, p: 100.1, v: 100 },
      { s: "AAPL.US", t: t2, p: 100.2, v: 200 },
      { s: "AAPL.US", t: baseMs + 3000, p: 100.3, v: 300 },
    ]);

    const first = await service.getDelta({
      symbol: "AAPL.US",
      cursor: createSignedCursor({
        symbol: "AAPL.US",
        market: "US",
        tradingDay: "20260115",
        provider: "infoway",
        lastPointTimestamp: new Date(baseMs).toISOString(),
      }),
      limit: 1,
    });

    expect(first.delta.points).toHaveLength(1);
    expect(first.delta.points[0].timestamp).toBe(new Date(t1).toISOString());
    expect(first.delta.hasMore).toBe(true);

    const second = await service.getDelta({
      symbol: "AAPL.US",
      cursor: first.delta.nextCursor,
      limit: 10,
    });

    expect(second.delta.points).toHaveLength(2);
    expect(second.delta.hasMore).toBe(false);
  });

  it("delta: cursor 与请求上下文不匹配时返回 CURSOR_EXPIRED", async () => {
    const { service } = createService();

    await expect(
      service.getDelta({
        symbol: "MSFT.US",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
        limit: 10,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: 显式 market 与 symbol 可推断市场不一致时返回 400", async () => {
    const { service } = createService();

    expect.assertions(3);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
        market: "HK",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
      expect((error as Error).message).toContain(
        "market 与 symbol 推断市场不一致",
      );
    }
  });

  it("delta: strictProviderConsistency=true 时 provider 不一致应拒绝", async () => {
    const { service } = createService();

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        provider: "longport",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
        strictProviderConsistency: true,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: cursor 被篡改（签名不匹配）应拒绝", async () => {
    const { service } = createService();
    const validCursor = createSignedCursor({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260115",
      provider: "infoway",
      lastPointTimestamp: "2026-01-15T15:00:00.000Z",
    });
    const decoded = decodeCursor(validCursor);
    const tampered = encodeCursor({
      ...decoded,
      tradingDay: "20990101",
    });

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        cursor: tampered,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: issuedAt 过度超前（超出允许漂移）应拒绝", async () => {
    const secret = "chart-intraday-future-secret";
    const { service } = createService({ secret });
    const futureIssuedAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const payload = {
      v: 1,
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260101",
      provider: "infoway",
      lastPointTimestamp: new Date(Date.now() - 1000).toISOString(),
      issuedAt: futureIssuedAt,
    };
    const cursor = encodeCursor({
      ...payload,
      sig: signCursorPayload(payload, secret),
    });

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        market: "US",
        cursor,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: 无 cursor 时返回 400", async () => {
    const { service } = createService();

    expect.assertions(2);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
    }
  });

  it("delta: 仅 since 时返回 400", async () => {
    const { service } = createService();

    expect.assertions(3);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
        since: new Date().toISOString(),
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
      expect((error as Error).message).toContain("since 参数已废弃");
    }
  });

  it("delta: WS -> HTTP 桥接时可直接消费带 sig 的 cursor", async () => {
    const { service, streamCache } = createService();
    const wsPointMs = Date.parse("2026-01-15T15:00:00.000Z");
    const t1 = wsPointMs + 1000;
    const t2 = wsPointMs + 2000;
    streamCache.getData.mockResolvedValue([
      { s: "AAPL.US", t: t1, p: 201.1, v: 11 },
      { s: "AAPL.US", t: t2, p: 201.2, v: 22 },
    ]);

    const result = await service.getDelta({
      symbol: "AAPL.US",
      cursor: createSignedCursor({
        symbol: "AAPL.US",
        market: "US",
        tradingDay: "20260115",
        lastPointTimestamp: new Date(wsPointMs).toISOString(),
      }),
      limit: 10,
    });

    expect(result.delta.points).toHaveLength(2);
    expect(result.delta.points[0].timestamp).toBe(new Date(t1).toISOString());
    expect(result.delta.hasMore).toBe(false);
  });
});
