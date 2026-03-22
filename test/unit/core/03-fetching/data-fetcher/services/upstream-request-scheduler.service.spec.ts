jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
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
      UPSTREAM_SCHEDULER_ALLOWLIST: "infoway:get-stock-quote,infoway:get-market-status,infoway:get-stock-basic-info,infoway:get-stock-history,infoway:get-crypto-quote,infoway:get-crypto-basic-info,infoway:get-crypto-history",
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

  it("会在短窗口内合并 get-crypto-quote 并按 symbol 拆分结果", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({
        symbol,
        lastPrice: symbol === "BTCUSDT" ? 65000 : 3200,
      })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["BTCUSDT"],
      options: { realtime: true },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["ETHUSDT"],
      options: { realtime: true },
      execute,
    });

    await jest.advanceTimersByTimeAsync(60);

    const resultA = await resultPromiseA;
    const resultB = await resultPromiseB;

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(["BTCUSDT", "ETHUSDT"]);
    expect(resultA).toEqual({
      data: [{ symbol: "BTCUSDT", lastPrice: 65000 }],
    });
    expect(resultB).toEqual({
      data: [{ symbol: "ETHUSDT", lastPrice: 3200 }],
    });
  });

  it("single_symbol_only 模式下不同 symbol 的 crypto history 请求不会合并发车", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["BTCUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["ETHUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute,
    });

    await jest.advanceTimersByTimeAsync(1500);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ symbol: "BTCUSDT" }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ symbol: "ETHUSDT" }],
    });

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("single_symbol_only 模式下同 symbol 的 crypto history 请求会 single-flight 复用", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol, points: 10 })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["BTCUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["BTCUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute,
    });

    await jest.advanceTimersByTimeAsync(20);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ symbol: "BTCUSDT", points: 10 }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ symbol: "BTCUSDT", points: 10 }],
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(["BTCUSDT"]);
  });

  it("crypto quote 遇到 429 后会进入冷却窗口", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];
    const firstExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      throw new Error("429 too many requests");
    });
    const secondExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      return { data: [{ symbol: "ETHUSDT", lastPrice: 3200 }] };
    });

    const firstPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["BTCUSDT"],
      options: { realtime: true },
      execute: firstExecute,
    });

    await jest.advanceTimersByTimeAsync(60);
    await expect(firstPromise).rejects.toThrow("429");

    const secondPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["ETHUSDT"],
      options: { realtime: true },
      execute: secondExecute,
    });

    await jest.advanceTimersByTimeAsync(1400);
    await expect(secondPromise).resolves.toEqual({
      data: [{ symbol: "ETHUSDT", lastPrice: 3200 }],
    });

    // 第二次发车需等待 max(cooldown=100ms, effectiveMinIntervalMs=1300ms)
    expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0] + 100);
  });

  it("crypto quote + history 共享调度域：串行发车而非并发打上游", async () => {
    // beforeEach 已设置 RPS=1000，minIntervalMs=1ms，此处验证共享域 FIFO 顺序
    const scheduler = new UpstreamRequestSchedulerService();
    const callOrder: string[] = [];

    const quoteExecute = jest.fn(async (symbolsOverride: string[]) => {
      callOrder.push("quote");
      return {
        data: symbolsOverride.map((symbol) => ({ symbol, lastPrice: 65000 })),
      };
    });
    const historyExecute = jest.fn(async (symbolsOverride: string[]) => {
      callOrder.push("history");
      return {
        data: symbolsOverride.map((symbol) => ({ symbol, points: 5 })),
      };
    });

    const quotePromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["BTCUSDT"],
      options: { realtime: true },
      execute: quoteExecute,
    });
    const historyPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["ETHUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: historyExecute,
    });

    await jest.advanceTimersByTimeAsync(3000);

    await expect(quotePromise).resolves.toEqual({
      data: [{ symbol: "BTCUSDT", lastPrice: 65000 }],
    });
    await expect(historyPromise).resolves.toEqual({
      data: [{ symbol: "ETHUSDT", points: 5 }],
    });

    expect(quoteExecute).toHaveBeenCalledTimes(1);
    expect(historyExecute).toHaveBeenCalledTimes(1);
    // 共享调度域保证串行发车：两者都在同一个 dispatchScopeKey 队列中
    // history 无 merge window (0ms) 先入队，quote 有 50ms merge window 后入队
    expect(callOrder).toEqual(["history", "quote"]);
  });

  it("crypto quote 触发 429 后，同共享域的 history 发车会等待冷却", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];

    const quoteExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      throw new Error("429 too many requests");
    });
    const historyExecute = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return {
        data: symbolsOverride.map((symbol) => ({ symbol, points: 10 })),
      };
    });

    const quotePromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["BTCUSDT"],
      options: { realtime: true },
      execute: quoteExecute,
    });

    await jest.advanceTimersByTimeAsync(60);
    await expect(quotePromise).rejects.toThrow("429");

    const historyPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["DOGEUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: historyExecute,
    });

    await jest.advanceTimersByTimeAsync(1400);
    await expect(historyPromise).resolves.toEqual({
      data: [{ symbol: "DOGEUSDT", points: 10 }],
    });

    // history 发车时间应在 quote 429 之后至少 100ms（cooldown）
    expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0] + 100);
    expect(scheduler.getStats().cooldownHits).toBe(1);
  });

  it("crypto history 触发 429 后，同共享域的 quote 发车也会等待冷却", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];

    const historyExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      throw new Error("429 too many requests");
    });
    const quoteExecute = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return {
        data: symbolsOverride.map((symbol) => ({ symbol, lastPrice: 0.15 })),
      };
    });

    const historyPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["BTCUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: historyExecute,
    });

    await jest.advanceTimersByTimeAsync(10);
    await expect(historyPromise).rejects.toThrow("429");

    const quotePromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["DOGEUSDT"],
      options: { realtime: true },
      execute: quoteExecute,
    });

    await jest.advanceTimersByTimeAsync(1400);
    await expect(quotePromise).resolves.toEqual({
      data: [{ symbol: "DOGEUSDT", lastPrice: 0.15 }],
    });

    expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0] + 100);
  });

  it("共享调度域下 crypto history 仍保持单标发车，不会跨 capability 合并", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const quoteExecute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol, lastPrice: 65000 })),
    }));
    const historyExecuteA = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol, points: 5 })),
    }));
    const historyExecuteB = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({ symbol, points: 10 })),
    }));

    const quotePromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["BTCUSDT", "ETHUSDT"],
      options: { realtime: true },
      execute: quoteExecute,
    });
    const historyPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["BTCUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: historyExecuteA,
    });
    const historyPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["ETHUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: historyExecuteB,
    });

    await jest.advanceTimersByTimeAsync(4000);

    // quote 合并为一次调用
    expect(quoteExecute).toHaveBeenCalledTimes(1);
    expect(quoteExecute).toHaveBeenCalledWith(["BTCUSDT", "ETHUSDT"]);
    // history 每个标的独立发车
    expect(historyExecuteA).toHaveBeenCalledTimes(1);
    expect(historyExecuteA).toHaveBeenCalledWith(["BTCUSDT"]);
    expect(historyExecuteB).toHaveBeenCalledTimes(1);
    expect(historyExecuteB).toHaveBeenCalledWith(["ETHUSDT"]);

    // 结果正确隔离
    await expect(quotePromise).resolves.toEqual({
      data: [
        { symbol: "BTCUSDT", lastPrice: 65000 },
        { symbol: "ETHUSDT", lastPrice: 65000 },
      ],
    });
    await expect(historyPromiseA).resolves.toEqual({
      data: [{ symbol: "BTCUSDT", points: 5 }],
    });
    await expect(historyPromiseB).resolves.toEqual({
      data: [{ symbol: "ETHUSDT", points: 10 }],
    });
  });

  it("stock capability 不受 crypto 共享调度域影响", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];

    const cryptoExecute = jest.fn(async () => {
      timestamps.push(Date.now());
      throw new Error("429 too many requests");
    });
    const stockExecute = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return {
        data: symbolsOverride.map((symbol) => ({ symbol, lastPrice: 100 })),
      };
    });

    const cryptoPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-quote",
      symbols: ["BTCUSDT"],
      options: { realtime: true },
      execute: cryptoExecute,
    });

    await jest.advanceTimersByTimeAsync(60);
    await expect(cryptoPromise).rejects.toThrow("429");

    // stock quote 使用不同的 dispatchScopeKey，不应受 crypto 429 冷却影响
    const stockPromise = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-quote",
      symbols: ["00700.HK"],
      options: { realtime: true },
      execute: stockExecute,
    });

    await jest.advanceTimersByTimeAsync(60);
    await expect(stockPromise).resolves.toEqual({
      data: [{ symbol: "00700.HK", lastPrice: 100 }],
    });

    // stock 的发车不需要等 crypto 的 100ms 冷却
    expect(timestamps[1] - timestamps[0]).toBeLessThan(100);
  });

  it("会在短窗口内合并 get-crypto-basic-info 并按 symbol 拆分结果", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const execute = jest.fn(async (symbolsOverride: string[]) => ({
      data: symbolsOverride.map((symbol) => ({
        symbol,
        name: symbol === "BTCUSDT" ? "Bitcoin" : "Ethereum",
      })),
    }));

    const resultPromiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-basic-info",
      symbols: ["BTCUSDT"],
      options: { market: "CRYPTO" },
      execute,
    });
    const resultPromiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-basic-info",
      symbols: ["ETHUSDT"],
      options: { market: "CRYPTO" },
      execute,
    });

    await jest.advanceTimersByTimeAsync(100);

    await expect(resultPromiseA).resolves.toEqual({
      data: [{ symbol: "BTCUSDT", name: "Bitcoin" }],
    });
    await expect(resultPromiseB).resolves.toEqual({
      data: [{ symbol: "ETHUSDT", name: "Ethereum" }],
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(["BTCUSDT", "ETHUSDT"]);
  });

  // ========== 二次修复：共享调度域最小发车间隔覆盖测试 ==========

  it("crypto-rest 共享域使用覆盖的 1300ms 发车间隔而非全局默认值", async () => {
    // beforeEach 设置 RPS=1000 → 全局 minIntervalMs=1ms
    // 但 infoway:crypto-rest 覆盖为 1300ms
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];

    const executeA = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return { data: symbolsOverride.map((symbol) => ({ symbol })) };
    });
    const executeB = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return { data: symbolsOverride.map((symbol) => ({ symbol })) };
    });

    const promiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["BTCUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: executeA,
    });

    await jest.advanceTimersByTimeAsync(10);
    await promiseA;

    const promiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-crypto-history",
      symbols: ["ETHUSDT"],
      mergeMode: "single_symbol_only",
      options: { market: "CRYPTO", klineType: 1, klineNum: 5 },
      execute: executeB,
    });

    await jest.advanceTimersByTimeAsync(1400);
    await promiseB;

    // 两次发车间隔应 >= 1300ms（覆盖值），而非 1ms（全局默认）
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(1300);
  });

  it("stock capability 仍使用全局默认 minIntervalMs 而非 crypto 覆盖值", async () => {
    const scheduler = new UpstreamRequestSchedulerService();
    const timestamps: number[] = [];

    const executeA = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return { data: symbolsOverride.map((symbol) => ({ symbol })) };
    });
    const executeB = jest.fn(async (symbolsOverride: string[]) => {
      timestamps.push(Date.now());
      return { data: symbolsOverride.map((symbol) => ({ symbol })) };
    });

    const promiseA = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-history",
      symbols: ["00700.HK"],
      mergeMode: "single_symbol_only",
      options: { market: "HK", klineType: 1, klineNum: 5 },
      execute: executeA,
    });

    await jest.advanceTimersByTimeAsync(10);
    await promiseA;

    const promiseB = scheduler.schedule({
      provider: "infoway",
      capability: "get-stock-history",
      symbols: ["AAPL.US"],
      mergeMode: "single_symbol_only",
      options: { market: "US", klineType: 1, klineNum: 5 },
      execute: executeB,
    });

    await jest.advanceTimersByTimeAsync(10);
    await promiseB;

    // stock 两次发车间隔应远小于 1300ms（使用全局 1ms 默认值）
    expect(timestamps[1] - timestamps[0]).toBeLessThan(100);
  });

});
