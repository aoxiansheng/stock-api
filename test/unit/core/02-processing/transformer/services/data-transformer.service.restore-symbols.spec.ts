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
import { BusinessErrorCode } from "@common/core/exceptions";

describe("DataTransformerService restoreStandardSymbols", () => {
  const flexibleMappingRuleService = {} as any;
  const standardSymbolIdentityProvidersEnvKey = "STANDARD_SYMBOL_IDENTITY_PROVIDERS";
  const createConfigService = (identityProviders?: string) => ({
    get: jest.fn((key: string) =>
      key === standardSymbolIdentityProvidersEnvKey ? identityProviders : undefined,
    ),
  });
  let previousStandardSymbolIdentityProviders: string | undefined;

  beforeEach(() => {
    previousStandardSymbolIdentityProviders =
      process.env[standardSymbolIdentityProvidersEnvKey];
    delete process.env[standardSymbolIdentityProvidersEnvKey];
  });

  afterEach(() => {
    if (previousStandardSymbolIdentityProviders === undefined) {
      delete process.env[standardSymbolIdentityProvidersEnvKey];
    } else {
      process.env[standardSymbolIdentityProvidersEnvKey] =
        previousStandardSymbolIdentityProviders;
    }
  });

  it("provider 命中 STANDARD_SYMBOL_IDENTITY_PROVIDERS 时执行 canonicalization 并跳过符号还原", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async () => "AAPL"),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === standardSymbolIdentityProvidersEnvKey
          ? " infoway, LONGPORT "
          : undefined,
      ),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
      configService as any,
    );

    const input = [
      { symbol: " aapl.us ", price: 1 },
      { symbol: "00700.hk", price: 2 },
    ];

    const output = await (service as any).restoreStandardSymbols(
      "longport",
      input,
    );

    expect(output).toEqual([
      { symbol: "AAPL.US", price: 1 },
      { symbol: "00700.HK", price: 2 },
    ]);
    expect(symbolTransformerService.transformSingleSymbol).not.toHaveBeenCalled();
    expect(configService.get).toHaveBeenCalledWith(
      standardSymbolIdentityProvidersEnvKey,
    );
  });

  it.each([" AAPL ", "00700"])(
    "identity provider 的 symbol %s 后置校验失败时抛异常",
    async (invalidSymbol) => {
      const symbolTransformerService = {
        transformSingleSymbol: jest.fn(async () => "AAPL"),
      };
      const configService = {
        get: jest.fn((key: string) =>
          key === standardSymbolIdentityProvidersEnvKey ? "longport" : undefined,
        ),
      };

      const service = new DataTransformerService(
        flexibleMappingRuleService,
        symbolTransformerService as any,
        {
          maxArraySize: 10,
          maxRestoreConcurrency: 2,
        },
        configService as any,
      );

      await expect(
        (service as any).restoreStandardSymbols("longport", {
          symbol: invalidSymbol,
          price: 123,
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("produced non-standard symbol"),
        context: expect.objectContaining({
          provider: "longport",
          symbol: invalidSymbol,
        }),
      });
      expect(symbolTransformerService.transformSingleSymbol).not.toHaveBeenCalled();
      expect(configService.get).toHaveBeenCalledWith(
        standardSymbolIdentityProvidersEnvKey,
      );
    },
  );

  it.each([" ", "   ", "\t"])(
    "identity provider 的空白 symbol %p 抛 DATA_VALIDATION_FAILED",
    async (invalidSymbol) => {
      const symbolTransformerService = {
        transformSingleSymbol: jest.fn(async () => "AAPL"),
      };
      const configService = {
        get: jest.fn((key: string) =>
          key === standardSymbolIdentityProvidersEnvKey ? "longport" : undefined,
        ),
      };

      const service = new DataTransformerService(
        flexibleMappingRuleService,
        symbolTransformerService as any,
        {
          maxArraySize: 10,
          maxRestoreConcurrency: 2,
        },
        configService as any,
      );

      await expect(
        (service as any).restoreStandardSymbols("longport", {
          symbol: invalidSymbol,
          price: 123,
        }),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        message: expect.stringContaining("non-empty string"),
        context: expect.objectContaining({
          provider: "longport",
          symbol: invalidSymbol,
        }),
      });
      expect(symbolTransformerService.transformSingleSymbol).not.toHaveBeenCalled();
      expect(configService.get).toHaveBeenCalledWith(
        standardSymbolIdentityProvidersEnvKey,
      );
    },
  );

  it.each([123, null, {}, []])(
    "identity provider 的非字符串 symbol %p 抛 DATA_VALIDATION_FAILED",
    async (invalidSymbol) => {
      const symbolTransformerService = {
        transformSingleSymbol: jest.fn(async () => "AAPL"),
      };
      const configService = {
        get: jest.fn((key: string) =>
          key === standardSymbolIdentityProvidersEnvKey ? "longport" : undefined,
        ),
      };

      const service = new DataTransformerService(
        flexibleMappingRuleService,
        symbolTransformerService as any,
        {
          maxArraySize: 10,
          maxRestoreConcurrency: 2,
        },
        configService as any,
      );

      await expect(
        (service as any).restoreStandardSymbols("longport", {
          symbol: invalidSymbol,
          price: 123,
        }),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        message: expect.stringContaining("non-empty string"),
        context: expect.objectContaining({
          provider: "longport",
          symbol: invalidSymbol,
        }),
      });
      expect(symbolTransformerService.transformSingleSymbol).not.toHaveBeenCalled();
      expect(configService.get).toHaveBeenCalledWith(
        standardSymbolIdentityProvidersEnvKey,
      );
    },
  );

  it("provider 未命中 STANDARD_SYMBOL_IDENTITY_PROVIDERS 时保持原行为", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(async () => "AAPL"),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === standardSymbolIdentityProvidersEnvKey ? "infoway" : undefined,
      ),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
      configService as any,
    );

    const output = await (service as any).restoreStandardSymbols("longport", {
      symbol: "LP_AAPL",
      price: 123,
    });

    expect(output).toEqual({
      symbol: "AAPL",
      price: 123,
    });
    expect(symbolTransformerService.transformSingleSymbol).toHaveBeenCalledTimes(1);
    expect(configService.get).toHaveBeenCalledWith(
      standardSymbolIdentityProvidersEnvKey,
    );
  });

  it("数组超过 effective maxArraySize（min(request,runtime)）时抛出含上下文异常", async () => {
    const symbolTransformerService = {
      transformSingleSymbol: jest.fn(),
    };
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 2,
        maxRestoreConcurrency: 2,
      },
      configService as any,
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
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 1,
      },
      configService as any,
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
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
      configService as any,
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
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
      configService as any,
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
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
      configService as any,
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
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 2,
      },
      configService as any,
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
    const configService = createConfigService();

    const service = new DataTransformerService(
      flexibleMappingRuleService,
      symbolTransformerService as any,
      {
        maxArraySize: 10,
        maxRestoreConcurrency: 0,
      },
      configService as any,
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
