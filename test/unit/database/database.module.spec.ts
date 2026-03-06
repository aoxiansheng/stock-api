import { readIntEnv } from "@common/utils/env.util";

describe("env.util readIntEnv", () => {
  const KEY = "UNIT_TEST_READ_INT_ENV";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("支持合法 0 值", () => {
    process.env[KEY] = "0";

    const value = readIntEnv(KEY, 9, { min: 0, max: 10 });
    expect(value).toBe(0);
  });

  it("非法整数回退默认值", () => {
    process.env[KEY] = "abc";

    const value = readIntEnv(KEY, 9, { min: 0, max: 10 });
    expect(value).toBe(9);
  });

  it("越界值回退默认值", () => {
    process.env[KEY] = "-1";

    const value = readIntEnv(KEY, 9, { min: 0, max: 10 });
    expect(value).toBe(9);
  });
});
