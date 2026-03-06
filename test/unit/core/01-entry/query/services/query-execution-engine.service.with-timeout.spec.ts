jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { QueryExecutionEngine } from "@core/01-entry/query/services/query-execution-engine.service";
import {
  BusinessErrorCode,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { QUERY_ERROR_CODES } from "@core/01-entry/query/constants/query-error-codes.constants";

const createService = () =>
  new QueryExecutionEngine(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

describe("QueryExecutionEngine withTimeout", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("成功完成后会 clearTimeout", async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const service = createService();

    await expect(
      (service as any).withTimeout(Promise.resolve("ok"), 1000, "timeout"),
    ).resolves.toBe("ok");

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("内部 Promise 失败后也会 clearTimeout", async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const service = createService();

    const sourceError = new Error("source failed");
    await expect(
      (service as any).withTimeout(
        Promise.reject(sourceError),
        1000,
        "timeout",
      ),
    ).rejects.toBe(sourceError);

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("超时错误契约保持不变", async () => {
    jest.useFakeTimers();
    const service = createService();

    const neverResolve = new Promise<string>(() => undefined);
    const pending = (service as any).withTimeout(neverResolve, 50, "query timeout");
    const assertion = expect(pending).rejects.toMatchObject({
      message: "query timeout",
      errorCode: BusinessErrorCode.INVALID_OPERATION,
      operation: "withTimeout",
      component: ComponentIdentifier.QUERY,
      context: {
        timeoutMs: 50,
        queryErrorCode: QUERY_ERROR_CODES.QUERY_TIMEOUT,
      },
    });

    await jest.advanceTimersByTimeAsync(50);
    await assertion;
  });
});
