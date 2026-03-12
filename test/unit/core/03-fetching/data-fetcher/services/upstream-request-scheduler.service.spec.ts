jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { UpstreamRequestSchedulerService } from "@core/03-fetching/data-fetcher/services/upstream-request-scheduler.service";

describe("UpstreamRequestSchedulerService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-11T00:00:00.000Z"));
    process.env = {
      ...originalEnv,
      UPSTREAM_SCHEDULER_ENABLED: "true",
      UPSTREAM_SCHEDULER_ALLOWLIST: "infoway:get-stock-quote,infoway:get-market-status,infoway:get-stock-basic-info",
      UPSTREAM_SCHEDULER_DEFAULT_RPS: "1000",
      UPSTREAM_SCHEDULER_429_COOLDOWN_MS: "100",
      UPSTREAM_SCHEDULER_QUOTE_MERGE_WINDOW_MS: "50",
      UPSTREAM_SCHEDULER_BASIC_INFO_MERGE_WINDOW_MS: "80",
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it("会在短窗口内合并 get-stock-quote 并按请求拆分结果", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({
        symbol,
        market: symbol.endsWith(".HK") ? "HK" : "US",
        lastPrice: 100,
      })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00700.HK"],
      options: { realtime: true },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00941.HK"],
      options: { realtime: true },
      execute,
    });

    await jest.advanceTimersByTimeAsync(60);

    const resultA = await resultPromiseA;
    const resultB = await resultPromiseB;

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(["00700.HK", "00941.HK"]);
    expect(resultA).toEqual({
      data: [{ symbol: "00700.HK", market: "HK", lastPrice: 100 }],
    });
    expect(resultB).toEqual({
      data: [{ symbol: "00941.HK", market: "HK", lastPrice: 100 }],
    });
  });

  it("支持通过 symbolExtractor 从 Infoway 原始 s 字段拆分 quote 结果", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({
        s: symbol,
        p: "556.000",
      })),
    }));
    const infowayExtractor = (row: unknown): string => {
      if (!row || typeof row !== "object") {
        return "";
      }
      return String((row as { s?: string }).s || "")
        .trim()
        .toUpperCase();
    };

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00700.HK"],
      options: { realtime: true },
      execute,
      symbolExtractor: infowayExtractor,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00941.HK"],
      options: { realtime: true },
      execute,
      symbolExtractor: infowayExtractor,
    });

    await jest.advanceTimersByTimeAsync(60);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ s: "00700.HK", p: "556.000" }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ s: "00941.HK", p: "556.000" }],
    });
  });

  it("遇到 429 后会进入冷却窗口再发下一次请求", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];
    const firstExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      throw new Error("429 too many requests");
    });
    const secondExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      return [{ market: "HK" }];
    });

    const firstPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-market-status",
      symbols: ["00700.HK"],
      options: { market: "HK" },
      execute: firstExecute,
    });
    const secondPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-market-status",
      symbols: ["AAPL.US"],
      options: { market: "US" },
      execute: secondExecute,
    });

    await jest.advanceTimersByTimeAsync(0);
    await expect(firstPromise).rejects.toThrow("429");

    await jest.advanceTimersByTimeAsync(100);
    await expect(secondPromise).resolves.toEqual([{ market: "HK" }]);

    expect(firstExecute).toHaveBeenCalledTimes(1);
    expect(secondExecute).toHaveBeenCalledTimes(1);
    expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0] + 100);
  });

  it("已入队未发车的同 mergeKey quote 任务会继续并入待发批次", async () => {
    process.env.UPSTREAM_SCHEDULER_DEFAULT_RPS = "1";
    process.env.UPSTREAM_SCHEDULER_QUOTE_MERGE_WINDOW_MS = "10";
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest
      .fn()
      .mockImplementationOnce(async (symbolsOverride: string[]) => ({
        data: symbolsOverride.map((symbol) => ({ symbol, market: "HK", lastPrice: 100 })),
      }))
      .mockImplementationOnce(async (symbolsOverride: string[]) => ({
        data: symbolsOverride.map((symbol) => ({ symbol, market: "HK", lastPrice: 200 })),
      }));

    const req1 = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00700.HK"],
      options: { realtime: true },
      execute,
    });
    await jest.advanceTimersByTimeAsync(15);
    await expect(req1).resolves.toEqual({
      data: [{ symbol: "00700.HK", market: "HK", lastPrice: 100 }],
    });

    const req2 = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00941.HK"],
      options: { realtime: true },
      execute,
    });
    await jest.advanceTimersByTimeAsync(15);

    const req3 = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00005.HK"],
      options: { realtime: true },
      execute,
    });

    await jest.advanceTimersByTimeAsync(1000);

    await expect(req2).resolves.toEqual({
      data: [{ symbol: "00941.HK", market: "HK", lastPrice: 200 }],
    });
    await expect(req3).resolves.toEqual({
      data: [{ symbol: "00005.HK", market: "HK", lastPrice: 200 }],
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(2, ["00941.HK", "00005.HK"]);
  });


  it("同 mergeKey 且 symbols 已被在飞请求覆盖时会复用 active dispatch", async () => {
    process.env.UPSTREAM_SCHEDULER_DEFAULT_RPS = "1";
    process.env.UPSTREAM_SCHEDULER_QUOTE_MERGE_WINDOW_MS = "10";
    const scheduler = new UpstreamRequestSchedulerService();
    let release: ((value: unknown) => void) | null = null;
    const execute = jest.fn(() => new Promise((resolve) => { release = resolve; }));

    const req1 = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00700.HK"],
      options: { realtime: true },
      execute,
    });
    await jest.advanceTimersByTimeAsync(15);

    const req2 = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00700.HK"],
      options: { realtime: true },
      execute,
    });

    release?.({
      data: [{ symbol: "00700.HK", market: "HK", lastPrice: 300 }],
    });
    await Promise.resolve();

    await expect(req1).resolves.toEqual({
      data: [{ symbol: "00700.HK", market: "HK", lastPrice: 300 }],
    });
    await expect(req2).resolves.toEqual({
      data: [{ symbol: "00700.HK", market: "HK", lastPrice: 300 }],
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("single_symbol_only 模式下不同 symbol 的 history 请求不会合并发车", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-history",
      symbols: ["00700.HK"],
      mergeMode: "single_symbol_only",
      options: { market: "HK", klineType: 1, klineNum: 5 },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-history",
      symbols: ["AAPL.US"],
      mergeMode: "single_symbol_only",
      options: { market: "US", klineType: 1, klineNum: 5 },
      execute,
    });

    await jest.advanceTimersByTimeAsync(20);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ symbol: "00700.HK" }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ symbol: "AAPL.US" }],
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(1, ["00700.HK"]);
    expect(execute).toHaveBeenNthCalledWith(2, ["AAPL.US"]);
  });

  it("single_symbol_only 模式下同 symbol 的 history 请求会 single-flight 复用", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol, points: 5 })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-history",
      symbols: ["00700.HK"],
      mergeMode: "single_symbol_only",
      options: { market: "HK", klineType: 1, klineNum: 5 },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-history",
      symbols: ["00700.HK"],
      mergeMode: "single_symbol_only",
      options: { market: "HK", klineType: 1, klineNum: 5 },
      execute,
    });

    await jest.advanceTimersByTimeAsync(20);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ symbol: "00700.HK", points: 5 }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ symbol: "00700.HK", points: 5 }],
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(["00700.HK"]);
  });


  it("会在短窗口内合并 get-stock-basic-info 并按 symbol 拆分结果", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({
        symbol,
        market: symbol.endsWith('.HK') ? 'HK' : 'US',
        exchange: symbol.endsWith('.HK') ? 'HKEX' : 'NASDAQ',
      })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: 'infoway',
      capability: 'get-stock-basic-info',
      symbols: ['00700.HK'],
      options: { market: 'HK' },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: 'infoway',
      capability: 'get-stock-basic-info',
      symbols: ['00941.HK'],
      options: { market: 'HK' },
      execute,
    });

    await jest.advanceTimersByTimeAsync(100);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ symbol: '00700.HK', market: 'HK', exchange: 'HKEX' }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ symbol: '00941.HK', market: 'HK', exchange: 'HKEX' }],
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(['00700.HK', '00941.HK']);
    expect(scheduler.getStats()).toEqual({
      mergedTasks: 1,
      dispatchedTasks: 1,
      cooldownHits: 0,
      maxQueueDepth: 1,
    });
  });


});
