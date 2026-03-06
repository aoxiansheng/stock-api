import { BusinessErrorCode } from "@common/core/exceptions";
import { getStockBasicInfo } from "@providersv2/providers/infoway/capabilities/get-stock-basic-info";

describe("get-stock-basic-info capability", () => {
  it("market 非法时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getStockBasicInfo: jest.fn(),
    };

    await expect(getStockBasicInfo.execute({
      symbols: ["AAPL.US"],
      market: "INVALID",
      contextService: contextService as any,
    })).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("market 仅支持 HK/US/CN/SH/SZ"),
    });

    expect(contextService.getStockBasicInfo).not.toHaveBeenCalled();
  });

  it("market=SH 时规范化为 CN 并透传给 contextService", async () => {
    const contextService = {
      getStockBasicInfo: jest.fn().mockResolvedValue([{ symbol: "600000.SH" }]),
    };

    const result = await getStockBasicInfo.execute({
      symbols: ["600000.SH"],
      market: "SH",
      contextService: contextService as any,
    });

    expect(contextService.getStockBasicInfo).toHaveBeenCalledWith(
      ["600000.SH"],
      "CN",
    );
    expect(result).toEqual([{ symbol: "600000.SH" }]);
  });

  it("symbols 为空时直接返回空数组", async () => {
    const contextService = {
      getStockBasicInfo: jest.fn(),
    };

    const result = await getStockBasicInfo.execute({
      symbols: [],
      contextService: contextService as any,
    });

    expect(result).toEqual([]);
    expect(contextService.getStockBasicInfo).not.toHaveBeenCalled();
  });
});
