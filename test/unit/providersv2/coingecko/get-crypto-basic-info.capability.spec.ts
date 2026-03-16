import { BusinessErrorCode } from "@common/core/exceptions";
import { getCryptoBasicInfo } from "@providersv2/providers/coingecko/capabilities/get-crypto-basic-info";

describe("coingecko get-crypto-basic-info capability", () => {
  it("symbols 为空时直接返回空数组", async () => {
    const contextService = {
      getCryptoBasicInfo: jest.fn(),
    };

    const result = await getCryptoBasicInfo.execute({
      symbols: [],
      contextService: contextService as any,
    });

    expect(result).toEqual([]);
    expect(contextService.getCryptoBasicInfo).not.toHaveBeenCalled();
  });

  it("支持 BTCUSDT 与 BTC，并在规范化后透传", async () => {
    const contextService = {
      getCryptoBasicInfo: jest.fn().mockResolvedValue([{ symbol: "BTCUSDT" }]),
    };

    const result = await getCryptoBasicInfo.execute({
      symbols: [" btcusdt ", "BTCUSDT", "btc"],
      contextService: contextService as any,
    });

    expect(contextService.getCryptoBasicInfo).toHaveBeenCalledWith([
      "BTCUSDT",
      "BTC",
    ]);
    expect(result).toEqual([{ symbol: "BTCUSDT" }]);
  });

  it("非法 symbol 时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getCryptoBasicInfo: jest.fn(),
    };

    await expect(
      getCryptoBasicInfo.execute({
        symbols: ["BTC-USDT"],
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("crypto symbol 格式无效"),
    });

    expect(contextService.getCryptoBasicInfo).not.toHaveBeenCalled();
  });
});
