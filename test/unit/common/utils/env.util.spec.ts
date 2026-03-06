import { readIntEnv } from "@common/utils/env.util";

describe("readIntEnv", () => {
  const KEY = "UNIT_TEST_COMMON_READ_INT_ENV";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("未设置时返回默认值", () => {
    const value = readIntEnv(KEY, 7, { min: 0, max: 10 });
    expect(value).toBe(7);
  });

  it("空白值返回默认值", () => {
    process.env[KEY] = "   ";

    const value = readIntEnv(KEY, 7, { min: 0, max: 10 });
    expect(value).toBe(7);
  });

  it("小数返回默认值", () => {
    process.env[KEY] = "1.5";

    const value = readIntEnv(KEY, 7, { min: 0, max: 10 });
    expect(value).toBe(7);
  });

  it("允许边界值", () => {
    process.env[KEY] = "10";

    const value = readIntEnv(KEY, 7, { min: 0, max: 10 });
    expect(value).toBe(10);
  });
});
