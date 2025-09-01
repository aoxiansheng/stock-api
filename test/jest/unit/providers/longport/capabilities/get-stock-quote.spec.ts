/* eslint-disable @typescript-eslint/no-unused-vars */
import { getStockQuote } from "../../../../../../src/providers/longport/capabilities/get-stock-quote";
import { MARKETS } from "../../../../../../src/common/constants/market.constants";

describe("getStockQuote", () => {
  const mockQuoteContext = {
    quote: jest.fn(),
  };

  const mockContextService = {
    getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should have correct _name, _description, and supported markets/formats", () => {
    expect(getStockQuote.name).toBe("get-stock-quote");
    expect(getStockQuote.description).toBe("获取股票实时报价数据");
    expect(getStockQuote.supportedMarkets).toEqual([
      MARKETS.HK,
      MARKETS.SZ,
      MARKETS.SH,
      MARKETS.US,
    ]);
    expect(getStockQuote.supportedSymbolFormats).toEqual([
      "700.HK",
      "000001.SZ",
      "600000.SH",
      "AAPL.US",
    ]);
    expect(getStockQuote.rateLimit).toEqual({
      requestsPerSecond: 10,
      requestsPerDay: 10000,
    });
  });

  it("should successfully fetch and format stock quotes", async () => {
    const symbols = ["700.HK", "AAPL.US"];
    const mockLongportQuotes = [
      {
        symbol: "700.HK",
        lastDone: 300,
        prevClose: 290,
        open: 295,
        high: 305,
        low: 285,
        volume: 10000000,
        turnover: 3000000000,
        timestamp: 1678886400,
        tradeStatus: "TRADING",
      },
      {
        symbol: "AAPL.US",
        lastDone: 170,
        prevClose: 168,
        open: 169,
        high: 172,
        low: 167,
        volume: 50000000,
        turnover: 8500000000,
        timestamp: 1678886400,
        tradeStatus: "TRADING",
      },
    ];

    mockQuoteContext.quote.mockResolvedValue(mockLongportQuotes);

    const result = await getStockQuote.execute({
      symbols,
      contextService: mockContextService,
    });

    expect(mockContextService.getQuoteContext).toHaveBeenCalledTimes(1);
    expect(mockQuoteContext.quote).toHaveBeenCalledWith(symbols);
    expect(result).toEqual({
      secu_quote: [
        {
          symbol: "700.HK",
          lastdone: 300,
          prevclose: 290,
          open: 295,
          high: 305,
          low: 285,
          volume: 10000000,
          turnover: 3000000000,
          timestamp: 1678886400,
          tradestatus: "TRADING",
        },
        {
          symbol: "AAPL.US",
          last_done: 170,
          prev_close: 168,
          open: 169,
          high: 172,
          low: 167,
          volume: 50000000,
          turnover: 8500000000,
          timestamp: 1678886400,
          trade_status: "TRADING",
        },
      ],
    });
  });

  it("should throw an error if contextService is not provided", async () => {
    const symbols = ["700.HK"];
    await expect(getStockQuote.execute({ symbols })).rejects.toThrow(
      "LongportContextService 未提供",
    );
  });

  it("should throw an error if getQuoteContext fails", async () => {
    const symbols = ["700.HK"];
    mockContextService.getQuoteContext.mockRejectedValue(
      new Error("Quote API error"),
    );

    await expect(
      getStockQuote.execute({ symbols, contextService: mockContextService }),
    ).rejects.toThrow("LongPort 获取股票报价失败: Quote API error");
  });

  it("should throw an error if quote call fails", async () => {
    const symbols = ["700.HK"];
    mockQuoteContext.quote.mockRejectedValue(new Error("Quote API error"));

    await expect(
      getStockQuote.execute({ symbols, contextService: mockContextService }),
    ).rejects.toThrow("LongPort 获取股票报价失败: Quote API error");
  });
});
