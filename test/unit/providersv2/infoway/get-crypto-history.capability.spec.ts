import { BusinessErrorCode } from "@common/core/exceptions";
import { GET_CRYPTO_HISTORY_SINGLE_SYMBOL_ERROR } from "@providersv2/providers/constants/capability-names.constants";
import { getCryptoHistory } from "@providersv2/providers/infoway/capabilities/get-crypto-history";

describe("get-crypto-history capability", () => {
  it("market 非法时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getCryptoHistory: jest.fn(),
    };

    await expect(
      getCryptoHistory.execute({
        symbols: ["BTCUSDT.CRYPTO"],
        market: "US",
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("market 仅支持 CRYPTO"),
    });

    expect(contextService.getCryptoHistory).not.toHaveBeenCalled();
  });

  it("symbols 超过 1 个时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getCryptoHistory: jest.fn(),
    };

    await expect(
      getCryptoHistory.execute({
        symbols: ["BTCUSDT.CRYPTO", "ETHUSDT.CRYPTO"],
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: GET_CRYPTO_HISTORY_SINGLE_SYMBOL_ERROR,
      operation: "getCryptoHistory.execute",
      context: {
        symbolsCount: 2,
      },
    });

    expect(contextService.getCryptoHistory).not.toHaveBeenCalled();
  });

  it("symbols 规范化后透传到 contextService", async () => {
    const contextService = {
      getCryptoHistory: jest.fn().mockResolvedValue([{ s: "BTCUSDT" }]),
    };

    const result = await getCryptoHistory.execute({
      symbols: [" btcusdt.crypto "],
      market: "CRYPTO",
      klineNum: 120,
      timestamp: 1758553860,
      contextService: contextService as any,
    });

    expect(contextService.getCryptoHistory).toHaveBeenCalledWith({
      symbols: ["BTCUSDT.CRYPTO"],
      market: "CRYPTO",
      klineNum: 120,
      timestamp: 1758553860,
    });
    expect(result).toEqual({ data: [{ s: "BTCUSDT" }] });
  });

  it("symbols 为空时直接返回空数组，不调用 contextService", async () => {
    const contextService = {
      getCryptoHistory: jest.fn(),
    };

    const result = await getCryptoHistory.execute({
      symbols: [],
      contextService: contextService as any,
    });

    expect(result).toEqual({ data: [] });
    expect(contextService.getCryptoHistory).not.toHaveBeenCalled();
  });

  it.each(["1758553860", "2024-03-01T09:30:00Z"])(
    "timestamp 为字符串(%p)时抛 DATA_VALIDATION_FAILED",
    async (timestamp) => {
      const contextService = {
        getCryptoHistory: jest.fn(),
      };

      await expect(
        getCryptoHistory.execute({
          symbols: ["BTCUSDT.CRYPTO"],
          timestamp,
          contextService: contextService as any,
        } as any),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        message: expect.stringContaining("timestamp 必须是 10/13 位正整数时间戳"),
        operation: "getCryptoHistory.execute",
      });

      expect(contextService.getCryptoHistory).not.toHaveBeenCalled();
    },
  );
});
