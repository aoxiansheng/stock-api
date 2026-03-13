import { BusinessErrorCode } from "@common/core/exceptions";
import {
  inferSingleInfowayMarketFromSymbols,
  normalizeAndValidateInfowayCryptoSymbols,
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
    expect.assertions(2);
    expect(() =>
      normalizeAndValidateInfowaySymbols(["AAPL"], {
        allowEmpty: true,
        maxCount: 10,
      }),
    ).toThrow("symbol 格式无效");

    try {
      normalizeAndValidateInfowaySymbols(["AAPL"], {
        allowEmpty: true,
        maxCount: 10,
      });
      throw new Error("预期抛出异常");
    } catch (error: any) {
      expect(error).toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      });
    }
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
    expect.assertions(1);
    try {
      inferSingleInfowayMarketFromSymbols(["AAPL.US", "00700.HK"]);
      throw new Error("预期抛出异常");
    } catch (error: any) {
      expect(error).toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      });
    }
  });

  it("crypto symbols 支持纯交易对与 .CRYPTO 后缀输入，并统一去重", () => {
    const symbols = normalizeAndValidateInfowayCryptoSymbols(
      [" btcusdt ", "BTCUSDT.CRYPTO", "ETHUSDT.CRYPTO", "ethusdt"],
      {
        allowEmpty: true,
        maxCount: 10,
      },
    );

    expect(symbols).toEqual(["BTCUSDT", "ETHUSDT"]);
  });

  it("crypto symbols 缺少合法计价后缀时抛参数错误", () => {
    expect.assertions(2);
    expect(() =>
      normalizeAndValidateInfowayCryptoSymbols(["DOGE"], {
        allowEmpty: true,
        maxCount: 10,
      }),
    ).toThrow("crypto symbol 交易对格式无效");

    try {
      normalizeAndValidateInfowayCryptoSymbols(["DOGE"], {
        allowEmpty: true,
        maxCount: 10,
      });
      throw new Error("预期抛出异常");
    } catch (error: any) {
      expect(error).toMatchObject({
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      });
    }
  });

  it("crypto symbols 可被推断为 CRYPTO 市场", () => {
    expect(inferSingleInfowayMarketFromSymbols(["BTCUSDT"])).toBe("CRYPTO");
    expect(inferSingleInfowayMarketFromSymbols(["ETHUSDT.CRYPTO"])).toBe(
      "CRYPTO",
    );
  });
});
