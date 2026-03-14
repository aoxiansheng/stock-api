import { SupportListDiffService } from "@core/03-fetching/support-list/services/support-list-diff.service";

describe("SupportListDiffService", () => {
  let service: SupportListDiffService;

  beforeEach(() => {
    service = new SupportListDiffService();
  });

  it("CRYPTO diff 不再兼容旧 .CRYPTO symbol", () => {
    const result = service.diff(
      [{ symbol: "BTCUSDT", name: "BTC/USDT" }],
      [{ symbol: "BTCUSDT.CRYPTO", name: "BTC/USDT" }],
      "CRYPTO",
    );

    expect(result).toEqual({
      added: [],
      updated: [],
      removed: ["BTCUSDT"],
    });
  });

  it("CRYPTO diff 输出应保持裸 pair 标准 symbol", () => {
    const result = service.diff(
      [],
      [{ symbol: "ethusdt", name: "ETH/USDT" }],
      "CRYPTO",
    );

    expect(result).toEqual({
      added: [{ symbol: "ETHUSDT", name: "ETH/USDT" }],
      updated: [],
      removed: [],
    });
  });
});
