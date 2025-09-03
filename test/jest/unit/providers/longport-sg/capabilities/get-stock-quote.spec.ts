import { getStockQuote } from "../../../../../../src/providers/longport-sg/capabilities/get-stock-quote";

describe("LongportSgGetStockQuote Capability", () => {
  // 测试当 contextService 未提供时的情况
  it("should throw an error if contextService is not provided", async () => {
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getStockQuote.execute({ symbols: ["700.HK"] }),
    ).rejects.toThrow("LongportContextService 未提供");
  });

  // 测试当 contextService.getQuoteContext 抛出错误时的情况
  it("should throw an error if getQuoteContext fails", async () => {
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest
        .fn()
        .mockRejectedValue(new Error("Failed to get context")),
    };
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getStockQuote.execute({
        symbols: ["700.HK"],
        contextService: mockContextService,
      }),
    ).rejects.toThrow("LongPort 获取股票报价失败: Failed to get context");
  });

  // 测试当 ctx.quote 抛出错误时的情况
  it("should throw an error if quote fails", async () => {
    // 创建一个模拟的 quote context
    const mockQuoteContext = {
      quote: jest.fn().mockRejectedValue(new Error("Failed to get quote")),
    };
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
    };
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getStockQuote.execute({
        symbols: ["700.HK"],
        contextService: mockContextService,
      }),
    ).rejects.toThrow("LongPort 获取股票报价失败: Failed to get quote");
  });

  // 测试成功获取报价时的情况
  it("should return quotes successfully", async () => {
    // 创建一个模拟的报价数据
    const mockQuotes = [
      {
        symbol: "700.HK",
        lastDone: 100,
        prevClose: 99,
        open: 99.5,
        high: 101,
        low: 99,
        volume: 10000,
        turnover: 1000000,
        timestamp: new Date(),
        tradeStatus: "TRADING",
      },
    ];
    // 创建一个模拟的 quote context
    const mockQuoteContext = {
      quote: jest.fn().mockResolvedValue(mockQuotes),
    };
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
    };

    // 调用 execute 方法
    const result = await getStockQuote.execute({
      symbols: ["700.HK"],
      contextService: mockContextService,
    });

    // 断言返回的结果是否正确
    expect(result.secu_quote).toHaveLength(1);
    expect(result.secu_quote[0].symbol).toBe("700.HK");
  });
});
