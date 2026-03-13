import { BusinessErrorCode } from "@common/core/exceptions";
import { getCryptoQuote } from "@providersv2/providers/infoway/capabilities/get-crypto-quote";

describe("get-crypto-quote capability", () => {
  it("symbols 为空时直接返回 data 空数组", async () => {
    const contextService = {
      getCryptoQuote: jest.fn(),
    };

    const result = await getCryptoQuote.execute({
      symbols: [],
      contextService: contextService as any,
    });

    expect(result).toEqual({ data: [] });
    expect(contextService.getCryptoQuote).not.toHaveBeenCalled();
  });

  it("symbols 规范化后透传到 contextService", async () => {
    const contextService = {
      getCryptoQuote: jest.fn().mockResolvedValue([{ s: "BTCUSDT" }]),
    };

    const result = await getCryptoQuote.execute({
      symbols: [" btcusdt.crypto ", "BTCUSDT.CRYPTO"],
      contextService: contextService as any,
    });

    expect(contextService.getCryptoQuote).toHaveBeenCalledWith([
      "BTCUSDT.CRYPTO",
    ]);
    expect(result).toEqual({ data: [{ s: "BTCUSDT" }] });
  });

  it("非法 crypto symbol 时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getCryptoQuote: jest.fn(),
    };

    await expect(
      getCryptoQuote.execute({
        symbols: ["DOGE"],
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("crypto symbol 必须使用 .CRYPTO 后缀"),
    });

    expect(contextService.getCryptoQuote).not.toHaveBeenCalled();
  });
});
