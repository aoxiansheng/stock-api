import {
  inferSingleInfowayMarketFromSymbols,
  normalizeAndValidateInfowaySymbols,
} from "@providersv2/providers/infoway/utils/infoway-symbols.util";

describe("infoway-symbols.util", () => {
  it("应规范化、去重并保留顺序", () => {
    const symbols = normalizeAndValidateInfowaySymbols(
      [" aapl.us ", "AAPL.US", "00700.hk", ""],
      {
        allowEmpty: true,
        maxCount: 10,
      },
    );

    expect(symbols).toEqual(["AAPL.US", "00700.HK"]);
  });

  it("symbol 格式非法时抛参数错误", () => {
    expect(() =>
      normalizeAndValidateInfowaySymbols(["AAPL"], {
        allowEmpty: true,
        maxCount: 10,
      }),
    ).toThrow("symbol 格式无效");
  });

  it("数量超过上限时抛参数错误", () => {
    expect(() =>
      normalizeAndValidateInfowaySymbols(
        ["AAPL.US", "MSFT.US", "GOOG.US"],
        {
          allowEmpty: true,
          maxCount: 2,
        },
      ),
    ).toThrow("symbols 数量超过上限");
  });

  it("混合市场推断时抛出显式 market 要求", () => {
    expect(() =>
      inferSingleInfowayMarketFromSymbols(["AAPL.US", "00700.HK"]),
    ).toThrow("请显式传入 market");
  });
});
