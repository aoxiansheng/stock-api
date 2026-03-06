jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { DataTransformerService } from "@core/02-processing/transformer/services/data-transformer.service";

describe("DataTransformerService restoreStandardSymbols", () => {
  const flexibleMappingRuleService = {} as any;

  it("数组超过 effective maxArraySize（min(request,runtime)）时抛出含上下文异常", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 2,
        maxRestoreConcurrency: 2,
      },
    );

    try {
      await (service as any).restoreStandardSymbols("longport", [
        { symbol: "AAPL" },
        { symbol: "TSLA" },
        { symbol: "MSFT" },
      ], {
        maxArraySize: 10,
        maxRestoreConcurrency: 8,
      });
      throw new Error("should throw when array size exceeds effective maxArraySize");
    } catch (error: any) {
      expect(error?.message).toContain("exceeds maxArraySize 2");
      expect(error?.context).toMatchObject({
        maxArraySizeLimit: {
          request: 10,
          runtime: 2,
          effective: 2,
        },
        maxRestoreConcurrencyLimit: {
          request: 8,
          runtime: 2,
          effective: 2,
        },
      });
    }

    expect(symbolTransformerService.transformSingleSymbol).not.toHaveBeenCalled();
  });

  it("符号还原阶段遇到异常时显式失败并阻断成功输出", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async (_provider: string, symbol: string) => {
        if (symbol === "TSLA.LP") {
          throw new Error("mock symbol service unavailable");
        }
        return "AAPL";
      }),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 1,
      },
    );

    await expect(
      (service as any).restoreStandardSymbols(
        "longport",
        [
          { symbol: "AAPL.LP", price: 1 },
          { symbol: "TSLA.LP", price: 2 },
        ],
        { maxRestoreConcurrency: 1 },
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining("Failed to restore symbol 'TSLA.LP'"),
      context: expect.objectContaining({
        provider: "longport",
        symbol: "TSLA.LP",
      }),
    });
  });

  it("映射未命中时禁止静默回退 provider symbol", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async () => "LP_AAPL"),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
    );

    await expect(
      (service as any).restoreStandardSymbols("longport", {
        symbol: "LP_AAPL",
        price: 1,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("No standard symbol mapping found"),
      context: expect.objectContaining({
        provider: "longport",
        symbol: "LP_AAPL",
        restoredSymbol: "LP_AAPL",
      }),
    });
  });

  it.each([
    "AAPL.US",
    "600000.SH",
    "000001.SZ",
    "00700.HK",
  ])("标准符号 %s 在 unchanged 场景不抛 DATA_NOT_FOUND", async (standardSymbol) => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async () => standardSymbol),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
    );

    const output = await (service as any).restoreStandardSymbols("longport", {
      symbol: standardSymbol,
      price: 123,
    });

    expect(output).toEqual({
      symbol: standardSymbol,
      price: 123,
    });
  });

  it("映射命中时返回标准符号并保留其他字段", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async () => "AAPL"),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
    );

    const output = await (service as any).restoreStandardSymbols("longport", {
      symbol: "LP_AAPL",
      price: 123,
      volume: 456,
    });

    expect(output).toEqual({
      symbol: "AAPL",
      price: 123,
      volume: 456,
    });
  });

  it("请求并发大于 runtime 时按 runtime 执行并保持输入顺序", async () => {
    const delays: Record<string, number> = {
      AAPL: 30,
      TSLA: 5,
      MSFT: 25,
      NVDA: 10,
    };

    let running = 0;
    let peakRunning = 0;
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async (_provider: string, symbol: string) => {
        running += 1;
        peakRunning = Math.max(peakRunning, running);

        await new Promise((resolve) =>
          setTimeout(resolve, delays[symbol] ?? 0),
        );

        running -= 1;
        return `${symbol}.STD`;
      }),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
    );

    const output = await (service as any).restoreStandardSymbols("longport", [
      { symbol: "AAPL", price: 1 },
      { symbol: "TSLA", price: 2 },
      { symbol: "MSFT", price: 3 },
      { symbol: "NVDA", price: 4 },
    ], {
      maxRestoreConcurrency: 8,
    });

    expect(peakRunning).toBeLessThanOrEqual(2);
    expect(output).toEqual([
      { symbol: "AAPL.STD", price: 1 },
      { symbol: "TSLA.STD", price: 2 },
      { symbol: "MSFT.STD", price: 3 },
      { symbol: "NVDA.STD", price: 4 },
    ]);
  });

  it("并发配置在 request/runtime 非法值时也有 >=1 下界保护", async () => {
    let peakRunning = 0;
    let running = 0;
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async (_provider: string, symbol: string) => {
        running += 1;
        peakRunning = Math.max(peakRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running -= 1;
        return `${symbol}.STD`;
      }),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 0,
      },
    );

    const output = await (service as any).restoreStandardSymbols("longport", [
      { symbol: "AAPL", price: 1 },
      { symbol: "TSLA", price: 2 },
    ], {
      maxRestoreConcurrency: 0,
    });

    expect(peakRunning).toBe(1);
    expect(output).toEqual([
      { symbol: "AAPL.STD", price: 1 },
      { symbol: "TSLA.STD", price: 2 },
    ]);
  });
});
