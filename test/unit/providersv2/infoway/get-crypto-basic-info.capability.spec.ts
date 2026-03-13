import { BusinessErrorCode } from "@common/core/exceptions";
import { getCryptoBasicInfo } from "@providersv2/providers/infoway/capabilities/get-crypto-basic-info";

describe("get-crypto-basic-info capability", () => {
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

  it("symbols 规范化后透传到 contextService", async () => {
    const contextService = {
      getCryptoBasicInfo: jest.fn().mockResolvedValue([{ symbol: "BTCUSDT" }]),
    };

    const result = await getCryptoBasicInfo.execute({
      symbols: ["BTCUSDT.CRYPTO", " btcusdt.crypto "],
      contextService: contextService as any,
    });

    expect(contextService.getCryptoBasicInfo).toHaveBeenCalledWith([
      "BTCUSDT.CRYPTO",
    ]);
    expect(result).toEqual([{ symbol: "BTCUSDT" }]);
  });

  it("非法 crypto symbol 时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getCryptoBasicInfo: jest.fn(),
    };

    await expect(
      getCryptoBasicInfo.execute({
        symbols: ["DOGE"],
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("crypto symbol 必须使用 .CRYPTO 后缀"),
    });

    expect(contextService.getCryptoBasicInfo).not.toHaveBeenCalled();
  });
});
