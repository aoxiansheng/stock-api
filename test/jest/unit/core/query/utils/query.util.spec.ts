import {
  buildStorageKey,
  validateDataFreshness,
} from "../../../../../../src/core/query/utils/query.util";

describe("Query Utils", () => {
  describe("buildStorageKey", () => {
    it("应该使用所有提供的参数构建存储键", () => {
      const symbol = "AAPL.US";
      const provider = "longport";
      const dataTypeFilter = "stock-quote";
      const market = "US";

      const key = buildStorageKey(symbol, provider, dataTypeFilter, market);

      expect(key).toBe("US:longport:stock-quote:AAPL.US");
    });

    it("应该为缺少的参数使用通配符", () => {
      const symbol = "AAPL.US";

      const key = buildStorageKey(symbol);

      expect(key).toBe("*:*:*:AAPL.US");
    });

    it("应该处理部分缺少的参数", () => {
      const symbol = "AAPL.US";
      const provider = "longport";

      const key = buildStorageKey(symbol, provider);

      expect(key).toBe("*:longport:*:AAPL.US");
    });

    it("应该正确处理包含冒号的符号", () => {
      const symbol = "700:HK";
      const provider = "longport";
      const dataTypeFilter = "stock-quote";
      const market = "HK";

      const key = buildStorageKey(symbol, provider, dataTypeFilter, market);

      expect(key).toBe("HK:longport:stock-quote:700:HK");
    });

    it("应该处理空字符串参数", () => {
      const symbol = "AAPL.US";
      const provider = "";
      const dataTypeFilter = "";
      const market = "";

      const key = buildStorageKey(symbol, provider, dataTypeFilter, market);

      // 空字符串被视为提供的值，而不是使用通配符
      expect(key).toBe(":::AAPL.US");
    });
  });

  describe("validateDataFreshness", () => {
    // 保存并恢复 Date.now
    const originalDateNow = Date.now;

    beforeEach(() => {
      // 模拟当前时间为固定值以便于测试
      jest
        .spyOn(Date, "now")
        .mockReturnValue(new Date("2023-01-01T12:00:00Z").getTime());
    });

    afterEach(() => {
      // 恢复原始 Date.now
      jest.restoreAllMocks();
    });

    it("当未指定maxAge时应该返回true", () => {
      const data = {
        value: 100,
        timestamp: new Date("2022-12-31T12:00:00Z").toISOString(),
      };

      const result = validateDataFreshness(data);

      expect(result).toBe(true);
    });

    it("当maxAge为0时也应该有效判断新鲜度", () => {
      const data = {
        value: 100,
        timestamp: new Date("2023-01-01T12:00:00Z").toISOString(), // 当前时间
      };

      const result = validateDataFreshness(data, 0);

      expect(result).toBe(true);
    });

    it("当数据没有时间戳时应该返回false", () => {
      const data = { value: 100 };

      const result = validateDataFreshness(data, 300);

      expect(result).toBe(false);
    });

    it("当数据为null时应该返回false", () => {
      const data = null;

      const result = validateDataFreshness(data, 300);

      expect(result).toBe(false);
    });

    it("当数据为undefined时应该返回false", () => {
      const data = undefined;

      const result = validateDataFreshness(data, 300);

      expect(result).toBe(false);
    });

    it("当数据的timestamp字段不是有效日期时应该返回false", () => {
      const data = { timestamp: "invalid-date" };

      const result = validateDataFreshness(data, 300);

      // 无效日期会导致时间戳计算无效，也会返回false
      expect(result).toBe(false);
    });

    it("当时间戳在maxAge秒范围内时应该返回true", () => {
      // 创建一个5分钟前的时间戳
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const data = { timestamp: fiveMinutesAgo };

      // 设置maxAge为10分钟
      const result = validateDataFreshness(data, 600);

      expect(result).toBe(true);
    });

    it("当时间戳超过maxAge秒时应该返回false", () => {
      // 创建一个15分钟前的时间戳
      const fifteenMinutesAgo = new Date(
        Date.now() - 15 * 60 * 1000,
      ).toISOString();
      const data = { timestamp: fifteenMinutesAgo };

      // 设置maxAge为10分钟
      const result = validateDataFreshness(data, 600);

      expect(result).toBe(false);
    });

    it("应该优先使用timestamp字段，如果存在的话", () => {
      // timestamp 是新鲜的，_timestamp 不是
      const data = {
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        _timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      };

      // 设置maxAge为10分钟
      const result = validateDataFreshness(data, 600);

      expect(result).toBe(true);
    });

    it("如果timestamp不存在，应该使用_timestamp字段", () => {
      // 只有 _timestamp 存在，并且是新鲜的
      const data = {
        _timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      };

      // 设置maxAge为10分钟
      const result = validateDataFreshness(data, 600);

      expect(result).toBe(true);
    });

    it("应该正确处理时间戳格式为Date对象的情况", () => {
      const data = {
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      };

      // 设置maxAge为10分钟
      const result = validateDataFreshness(data, 600);

      expect(result).toBe(true);
    });
  });
});
