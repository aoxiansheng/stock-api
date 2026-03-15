import { BusinessErrorCode } from "@common/core/exceptions";
import { GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR } from "@providersv2/providers/constants/capability-names.constants";
import { getStockHistory } from "@providersv2/providers/infoway/capabilities/get-stock-history";

describe("get-stock-history capability", () => {
  it("market 非法时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getStockHistory: jest.fn(),
    };

    await expect(
      getStockHistory.execute({
        symbols: ["AAPL.US"],
        market: "INVALID",
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("market 仅支持 HK/US/CN/SH/SZ"),
    });

    expect(contextService.getStockHistory).not.toHaveBeenCalled();
  });

  it("symbols 超过 1 个时抛 DATA_VALIDATION_FAILED（与 receiver 错误文案一致）", async () => {
    const contextService = {
      getStockHistory: jest.fn(),
    };

    await expect(
      getStockHistory.execute({
        symbols: ["AAPL.US", "MSFT.US"],
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR,
      operation: "getStockHistory.execute",
      context: {
        symbolsCount: 2,
      },
    });

    expect(contextService.getStockHistory).not.toHaveBeenCalled();
  });

  it("market=SH 时规范化为 CN 并透传扩展参数", async () => {
    const contextService = {
      getStockHistory: jest.fn().mockResolvedValue([{ symbol: "600000.SH" }]),
    };

    const result = await getStockHistory.execute({
      symbols: ["600000.SH"],
      market: "SH",
      klineType: 8,
      klineNum: 240,
      timestamp: 1758553860,
      contextService: contextService as any,
    });

    expect(contextService.getStockHistory).toHaveBeenCalledWith({
      symbols: ["600000.SH"],
      market: "CN",
      klineType: 8,
      klineNum: 240,
      timestamp: 1758553860,
    });
    expect(result).toEqual({ data: [{ symbol: "600000.SH" }] });
  });

  it("symbols 为空时直接返回空数组，不调用 contextService", async () => {
    const contextService = {
      getStockHistory: jest.fn(),
    };

    const result = await getStockHistory.execute({
      symbols: [],
      contextService: contextService as any,
    });

    expect(result).toEqual({ data: [] });
    expect(contextService.getStockHistory).not.toHaveBeenCalled();
  });

  it.each(["1758553860", "2024-03-01T09:30:00Z"])(
    "timestamp 为字符串(%p)时抛 DATA_VALIDATION_FAILED 且不调用 contextService",
    async (timestamp) => {
      const contextService = {
        getStockHistory: jest.fn(),
      };

      await expect(
        getStockHistory.execute({
          symbols: ["AAPL.US"],
          timestamp,
          contextService: contextService as any,
        } as any),
      ).rejects.toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        message: expect.stringContaining(
          "timestamp 必须是 10/13 位正整数时间戳",
        ),
        operation: "getStockHistory.execute",
      });

      expect(contextService.getStockHistory).not.toHaveBeenCalled();
    },
  );
});
