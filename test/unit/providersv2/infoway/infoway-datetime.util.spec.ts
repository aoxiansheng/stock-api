import {
  formatInfowayYmdByMarket,
  normalizeInfowayDay,
  normalizeInfowayTimestampToIso,
} from "@providersv2/providers/infoway/utils/infoway-datetime.util";

describe("infoway-datetime.util", () => {
  it("支持合法 YMD（YYYYMMDD 与 YYYY-MM-DD）", () => {
    expect(normalizeInfowayDay("20240229")).toBe("20240229");
    expect(normalizeInfowayDay("2024-02-29")).toBe("20240229");
  });

  it("拒绝非法日期", () => {
    expect(normalizeInfowayDay("20230229")).toBe("");
    expect(normalizeInfowayDay("2024/02/29")).toBe("");
  });

  it("仅接受 10/13 位时间戳", () => {
    expect(normalizeInfowayTimestampToIso("1709251200")).toBe(
      "2024-03-01T00:00:00.000Z",
    );
    expect(normalizeInfowayTimestampToIso("1709251200000")).toBe(
      "2024-03-01T00:00:00.000Z",
    );
    expect(normalizeInfowayTimestampToIso("2024-03-01T00:00:00Z")).toBeNull();
  });

  it("拒绝不合理范围时间戳", () => {
    expect(normalizeInfowayTimestampToIso("100000000")).toBeNull();
    expect(normalizeInfowayTimestampToIso("9999999999999")).toBeNull();
  });

  it("按 market 时区格式化交易日日期", () => {
    const fixed = new Date("2024-03-01T01:00:00.000Z");

    expect(formatInfowayYmdByMarket(fixed, "US")).toBe("20240229");
    expect(formatInfowayYmdByMarket(fixed, "HK")).toBe("20240301");
    expect(formatInfowayYmdByMarket(fixed, "CN")).toBe("20240301");
  });
});
