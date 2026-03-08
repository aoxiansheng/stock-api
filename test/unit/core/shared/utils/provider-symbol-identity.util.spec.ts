import {
  buildIdentitySymbolMappingPair,
  buildIdentitySymbolTransformResult,
  findNonStandardSymbolsForIdentityProvider,
  isStandardIdentitySymbol,
  isStandardSymbolIdentityProvider,
  parseStandardSymbolIdentityProviders,
} from "@core/shared/utils/provider-symbol-identity.util";

describe("provider-symbol-identity.util", () => {
  let originalStandardSymbolIdentityProviders: string | undefined;

  beforeEach(() => {
    originalStandardSymbolIdentityProviders =
      process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS;
  });

  afterEach(() => {
    if (originalStandardSymbolIdentityProviders === undefined) {
      delete process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS;
      return;
    }

    process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS =
      originalStandardSymbolIdentityProviders;
  });

  it("parseStandardSymbolIdentityProviders 按逗号分隔并执行 trim/小写/去重", () => {
    const result = parseStandardSymbolIdentityProviders(
      " Infoway, longport,INFOWAY , jvquant ,, longport ",
    );

    expect(result).toEqual(["infoway", "longport", "jvquant"]);
  });

  it("isStandardSymbolIdentityProvider 按标准化 provider 命中", () => {
    expect(
      isStandardSymbolIdentityProvider(
        " INFOWAY ",
        "infoway,longport,jvquant",
      ),
    ).toBe(true);

    expect(
      isStandardSymbolIdentityProvider("futu", "infoway,longport,jvquant"),
    ).toBe(false);
  });

  it("isStandardSymbolIdentityProvider 传 undefined/空字符串时不读取 env 回退", () => {
    process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS = "infoway,longport";

    expect(isStandardSymbolIdentityProvider("infoway", undefined)).toBe(false);
    expect(isStandardSymbolIdentityProvider("infoway", "")).toBe(false);
    expect(isStandardSymbolIdentityProvider("jvquant", undefined)).toBe(false);
    expect(parseStandardSymbolIdentityProviders()).toEqual([]);
  });

  it("parseStandardSymbolIdentityProviders 对非字符串 rawValue 安全降级", () => {
    const rawValue: unknown = { providers: "infoway,longport" };

    expect(() => parseStandardSymbolIdentityProviders(rawValue)).not.toThrow();
    expect(parseStandardSymbolIdentityProviders(rawValue)).toEqual([]);
    expect(isStandardSymbolIdentityProvider("infoway", rawValue)).toBe(false);
  });

  it("findNonStandardSymbolsForIdentityProvider 返回非标准格式 symbol", () => {
    const result = findNonStandardSymbolsForIdentityProvider([
      "AAPL.US",
      "00700",
      "AAPL",
      "AAPL US",
      "700.HK ",
      "BAD$SYMBOL",
    ]);

    expect(result).toEqual(["00700", "AAPL", "AAPL US", "700.HK ", "BAD$SYMBOL"]);
  });

  it("isStandardIdentitySymbol 仅接受带市场后缀的标准格式", () => {
    expect(isStandardIdentitySymbol("AAPL.US")).toBe(true);
    expect(isStandardIdentitySymbol("00700.HK")).toBe(true);
    expect(isStandardIdentitySymbol("HSI.HK")).toBe(true);
    expect(isStandardIdentitySymbol("600519.SH")).toBe(true);
    expect(isStandardIdentitySymbol("000001.SZ")).toBe(true);

    expect(isStandardIdentitySymbol("AAPL")).toBe(false);
    expect(isStandardIdentitySymbol("00700")).toBe(false);
    expect(isStandardIdentitySymbol("HSIA.HK")).toBe(false);
    expect(isStandardIdentitySymbol("123456.HK")).toBe(false);
    expect(isStandardIdentitySymbol(" AAPL.US ")).toBe(false);
  });

  it("parseStandardSymbolIdentityProviders 在原始值变化后应反映最新配置", () => {
    const first = parseStandardSymbolIdentityProviders("infoway,longport");
    const second = parseStandardSymbolIdentityProviders("infoway");

    expect(first).toEqual(["infoway", "longport"]);
    expect(second).toEqual(["infoway"]);
  });

  it("buildIdentitySymbolTransformResult 构造 canonical identity 映射结果", () => {
    const result = buildIdentitySymbolTransformResult("infoway", [
      " aapl.us ",
      "00700.hk",
    ]);

    expect(result).toEqual({
      transformedSymbols: ["AAPL.US", "00700.HK"],
      mappingResults: {
        transformedSymbols: {
          " aapl.us ": "AAPL.US",
          "00700.hk": "00700.HK",
        },
        failedSymbols: [],
        metadata: {
          provider: "infoway",
          totalSymbols: 2,
          successfulTransformations: 2,
          failedTransformations: 0,
          processingTimeMs: 0,
        },
      },
    });
  });

  it("buildIdentitySymbolMappingPair 返回 canonical 双通道符号", () => {
    const result = buildIdentitySymbolMappingPair([" aapl.us ", "00700.hk"]);

    expect(result).toEqual({
      standardSymbols: ["AAPL.US", "00700.HK"],
      providerSymbols: ["AAPL.US", "00700.HK"],
    });
  });
});
