import { validateYmdDateRange } from "@core/shared/utils/ymd-date.util";

describe("validateYmdDateRange", () => {
  it("strict=true 且仅提供 beginDay 非法时返回失败", () => {
    const result = validateYmdDateRange("20260230", undefined, {
      strict: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("beginDay 必须是合法 YYYYMMDD 日期");
  });

  it("strict=true 且仅提供 endDay 非法时返回失败", () => {
    const result = validateYmdDateRange(undefined, "20260230", {
      strict: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("endDay 必须是合法 YYYYMMDD 日期");
  });

  it("strict=true 且仅提供单边合法日期返回通过", () => {
    const beginOnly = validateYmdDateRange("20260101", undefined, {
      strict: true,
    });
    const endOnly = validateYmdDateRange(undefined, "20260131", {
      strict: true,
    });

    expect(beginOnly).toEqual({ isValid: true });
    expect(endOnly).toEqual({ isValid: true });
  });

  it("strict=true 且 beginDay 非法时返回失败", () => {
    const result = validateYmdDateRange("20260230", "20260301", {
      strict: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("beginDay 必须是合法 YYYYMMDD 日期");
  });

  it("strict=true 且合法日期范围返回通过", () => {
    const result = validateYmdDateRange("20260101", "20260131", {
      strict: true,
    });

    expect(result).toEqual({ isValid: true });
  });

  it("strict=false 保持原行为（仅按字符串区间比较）", () => {
    const result = validateYmdDateRange("20260230", "20260301");
    expect(result).toEqual({ isValid: true });
  });

  it("启用 minYmd 时，早于下限返回失败", () => {
    const result = validateYmdDateRange("18991231", "19000101", {
      strict: true,
      minYmd: "19000101",
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("beginDay 不能早于 19000101");
  });

  it("启用 maxYmd 时，晚于上限返回失败", () => {
    const result = validateYmdDateRange("20991231", "21000101", {
      strict: true,
      maxYmd: "20991231",
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("endDay 不能晚于 20991231");
  });

  it("启用 maxSpanDays 时，超过上限返回失败", () => {
    const result = validateYmdDateRange("20240101", "20250101", {
      strict: true,
      maxSpanDays: 366,
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("日期跨度不能超过 366 天");
  });

  it("启用 maxSpanDays 时，等于上限返回通过", () => {
    const result = validateYmdDateRange("20240101", "20241231", {
      strict: true,
      maxSpanDays: 366,
    });

    expect(result).toEqual({ isValid: true });
  });
});
