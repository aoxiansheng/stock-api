import { SupportListDiffService } from "@core/03-fetching/support-list/services/support-list-diff.service";

describe("SupportListDiffService", () => {
  const service = new SupportListDiffService();

  it("应正确输出 added/updated/removed", () => {
    const result = service.diff(
      [
        { symbol: "AAPL.US", name: "Apple Old" },
        { symbol: "MSFT.US", name: "Microsoft" },
      ],
      [
        { symbol: "AAPL.US", name: "Apple New" },
        { symbol: "TSLA.US", name: "Tesla" },
      ],
      "US",
    );

    expect(result.added).toEqual([{ symbol: "TSLA.US", name: "Tesla" }]);
    expect(result.updated).toEqual([{ symbol: "AAPL.US", name: "Apple New" }]);
    expect(result.removed).toEqual(["MSFT.US"]);
  });

  it("遇到重复 symbol 时应保留最新项", () => {
    const result = service.diff(
      [],
      [
        { symbol: "AAPL.US", name: "v1" },
        { symbol: "AAPL.US", name: "v2" },
      ],
      "US",
    );

    expect(result.added).toEqual([{ symbol: "AAPL.US", name: "v2" }]);
    expect(result.updated).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});
