import { getStockBasicInfo } from "../../../../../../src/providers/longport/capabilities/get-stock-basic-info";
import { MARKETS } from "../../../../../../src/common/constants/domain/market-domain.constants";
import { REFERENCE_DATA } from '@common/constants/domain';

describe("getStockBasicInfo", () => {
  const mockQuoteContext = {
    staticInfo: jest.fn(),
  };

  const mockContextService = {
    getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should have correct _name, _description, and supported markets/formats", () => {
    expect(getStockBasicInfo.name).toBe("get-stock-basic-info");
    expect(getStockBasicInfo.description).toBe("获取股票基本信息");
    expect(getStockBasicInfo.supportedMarkets).toEqual([
      MARKETS.HK,
      MARKETS.SZ,
      MARKETS.SH,
      MARKETS.US,
    ]);
    expect(getStockBasicInfo.supportedSymbolFormats).toEqual([
      REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
      "000001.SZ",
      "600000.SH",
      "AAPL.US",
    ]);
    expect(getStockBasicInfo.rateLimit).toEqual({
      requestsPerSecond: 5,
      requestsPerDay: 1000,
    });
  });

  it("should successfully fetch and format stock basic info", async () => {
    const symbols = [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"];
    const mockLongportStaticInfos = [
      {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        nameCn: "腾讯控股",
        nameEn: "Tencent Holdings Ltd",
        nameHk: "騰訊控股",
        listingDate: "2004-06-16",
        totalShares: 9590000000,
        marketVal: 3000000000000,
        sector: "Technology",
        industry: "Internet Software & Services",
      },
      {
        symbol: "AAPL.US",
        nameCn: "苹果",
        nameEn: "Apple Inc",
        nameHk: "蘋果",
        listingDate: "1980-12-12",
        totalShares: 15700000000,
        marketVal: 2500000000000,
        sector: "Technology",
        industry: "Consumer Electronics",
      },
    ];

    mockQuoteContext.staticInfo.mockResolvedValue(mockLongportStaticInfos);

    const result = await getStockBasicInfo.execute({
      symbols,
      contextService: mockContextService,
    });

    expect(mockContextService.getQuoteContext).toHaveBeenCalledTimes(1);
    expect(mockQuoteContext.staticInfo).toHaveBeenCalledWith(symbols);
    expect(result).toEqual([
      {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        namecn: "腾讯控股",
        nameen: "Tencent Holdings Ltd",
        namehk: "騰訊控股",
        listingdate: "2004-06-16",
        sharesoutstanding: 9590000000,
        marketcap: 3000000000000,
        sector: "Technology",
        industry: "Internet Software & Services",
      },
      {
        symbol: "AAPL.US",
        name_cn: "苹果",
        name_en: "Apple Inc",
        name_hk: "蘋果",
        listing_date: "1980-12-12",
        shares_outstanding: 15700000000,
        market_cap: 2500000000000,
        sector: "Technology",
        industry: "Consumer Electronics",
      },
    ]);
  });

  it("should handle missing optional fields gracefully", async () => {
    const symbols = ["TEST.US"];
    const mockLongportStaticInfos = [
      {
        symbol: "TEST.US",
        nameCn: null,
        nameEn: undefined,
        nameHk: "测试",
        listingDate: null,
        totalShares: undefined,
        marketVal: null,
        sector: undefined,
        industry: null,
      },
    ];

    mockQuoteContext.staticInfo.mockResolvedValue(mockLongportStaticInfos);

    const result = await getStockBasicInfo.execute({
      symbols,
      contextService: mockContextService,
    });

    expect(result).toEqual([
      {
        symbol: "TEST.US",
        name_cn: "",
        name_en: "",
        name_hk: "测试",
        listing_date: "",
        shares_outstanding: 0,
        market_cap: 0,
        sector: "",
        industry: "",
      },
    ]);
  });

  it("should throw an error if contextService is not provided", async () => {
    const symbols = [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT];
    await expect(getStockBasicInfo.execute({ symbols })).rejects.toThrow(
      "LongportContextService 未提供",
    );
  });

  it("should throw an error if getQuoteContext fails", async () => {
    const symbols = [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT];
    mockContextService.getQuoteContext.mockRejectedValue(
      new Error("Quote API error"),
    );

    await expect(
      getStockBasicInfo.execute({
        symbols,
        contextService: mockContextService,
      }),
    ).rejects.toThrow("LongPort 获取股票基本信息失败: Quote API error");
  });

  it("should throw an error if staticInfo call fails", async () => {
    const symbols = [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT];
    mockQuoteContext.staticInfo.mockRejectedValue(
      new Error("Static info API error"),
    );

    await expect(
      getStockBasicInfo.execute({
        symbols,
        contextService: mockContextService,
      }),
    ).rejects.toThrow("LongPort 获取股票基本信息失败: Quote API error");
  });
});
