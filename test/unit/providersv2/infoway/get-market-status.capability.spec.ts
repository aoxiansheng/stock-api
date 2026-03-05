import { getMarketStatus } from "@providersv2/providers/infoway/capabilities/get-market-status";

describe("get-market-status capability", () => {
  it("显式 market 存在时仅使用显式 market", async () => {
    const contextService = {
      getMarketStatus: jest.fn().mockResolvedValue([{ market: "US" }]),
    };

    const result = await getMarketStatus.execute({
      market: "US",
      symbols: ["AAPL.US"],
      contextService: contextService as any,
    });

    expect(contextService.getMarketStatus).toHaveBeenCalledWith(["US"]);
    expect(result).toEqual([{ market: "US" }]);
  });

  it("market 与 symbols 推断冲突时抛参数错误", async () => {
    const contextService = {
      getMarketStatus: jest.fn(),
    };

    await expect(
      getMarketStatus.execute({
        market: "US",
        symbols: ["00700.HK"],
        contextService: contextService as any,
      }),
    ).rejects.toThrow("market 与 symbols 推断市场冲突");

    expect(contextService.getMarketStatus).not.toHaveBeenCalled();
  });
});
