jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamDataValidator } from "@core/01-entry/stream-receiver/validators/stream-data.validator";

describe("StreamDataValidator defensive symbols validation", () => {
  const createValidator = () =>
    new StreamDataValidator({
      getProvider: jest.fn(),
    } as any);

  it.each([null, 123, { foo: "bar" }, "AAPL.US"])(
    "validateSymbols: 非数组输入(%p)返回明确错误且不抛异常",
    (input) => {
      const validator = createValidator();

      expect(() => validator.validateSymbols(input as any)).not.toThrow();
      expect(validator.validateSymbols(input as any)).toEqual(
        expect.objectContaining({
          validSymbols: [],
          duplicateSymbols: [],
          sanitizedSymbols: [],
          invalidSymbols: ["symbols 必须是字符串数组"],
        }),
      );
    },
  );

  it("validateSymbols: 数组中含非字符串元素时返回明确错误且不中断", () => {
    const validator = createValidator();
    const result = validator.validateSymbols(["AAPL.US", 1 as any, null as any]);

    expect(result.sanitizedSymbols).toEqual(["AAPL.US"]);
    expect(result.invalidSymbols).toEqual(
      expect.arrayContaining(["非字符串符号: 1", "非字符串符号: null"]),
    );
  });
});
