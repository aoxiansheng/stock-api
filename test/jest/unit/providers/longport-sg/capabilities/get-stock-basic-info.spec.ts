/* eslint-disable @typescript-eslint/no-unused-vars */
import { getStockBasicInfo } from "../../../../../../src/providers/longport-sg/capabilities/get-stock-basic-info";

describe("LongportSgGetStockBasicInfo Capability", () => {
  // 测试当 contextService 未提供时的情况
  it("should throw an error if contextService is not provided", async () => {
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getStockBasicInfo.execute({ symbols: ["700.HK"] }),
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
      getStockBasicInfo.execute({
        symbols: ["700.HK"],
        contextService: mockContextService,
      }),
    ).rejects.toThrow("LongPort 获取股票基本信息失败: Failed to get context");
  });

  // 测试当 ctx.staticInfo 抛出错误时的情况
  it("should throw an error if staticInfo fails", async () => {
    // 创建一个模拟的 quote context
    const mockQuoteContext = {
      staticInfo: jest
        .fn()
        .mockRejectedValue(new Error("Failed to get static info")),
    };
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
    };
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getStockBasicInfo.execute({
        symbols: ["700.HK"],
        contextService: mockContextService,
      }),
    ).rejects.toThrow(
      "LongPort 获取股票基本信息失败: Failed to get static info",
    );
  });

  // 测试成功获取基本信息时的情况
  it("should return basic info successfully", async () => {
    // 创建一个模拟的基本信息数据
    const mockStaticInfos = [
      {
        symbol: "700.HK",
        nameCn: "腾讯控股",
        listingDate: "2004-06-16",
      },
    ];
    // 创建一个模拟的 quote context
    const mockQuoteContext = {
      staticInfo: jest.fn().mockResolvedValue(mockStaticInfos),
    };
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
    };

    // 调用 execute 方法
    const result = await getStockBasicInfo.execute({
      symbols: ["700.HK"],
      contextService: mockContextService,
    });

    // 断言返回的结果是否正确
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("700.HK");
    expect(result[0].namecn).toBe("腾讯控股");
  });
});
