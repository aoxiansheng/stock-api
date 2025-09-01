/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { RateLimitExceptionFilter } from "../../../../../src/auth/filters/rate-limit.filter";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ArgumentsHost } from "@nestjs/common";

describe("RateLimitExceptionFilter", () => {
  let filter: RateLimitExceptionFilter;

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitExceptionFilter],
    }).compile();

    filter = module.get<RateLimitExceptionFilter>(RateLimitExceptionFilter);
  });

  // 测试当异常不是 429 时的情况
  it("should re-throw exception if not a 429", () => {
    // 创建一个非 429 的异常
    const exception = new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    // 创建一个模拟的 ArgumentsHost
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({}),
        getRequest: () => ({}),
      }),
    } as ArgumentsHost;

    // 断言当异常不是 429 时，会重新抛出异常
    expect(() => filter.catch(exception, host)).toThrow(exception);
  });

  // 测试当异常是 429 时的情况
  it("should handle a 429 exception", () => {
    // 创建一个 429 的异常
    const exception = new HttpException(
      { message: "Too Many Requests", details: { retryAfter: 60 } },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    // 创建一个模拟的 Response 对象
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    // 创建一个模拟的 ArgumentsHost
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: "/" }),
      }),
    } as ArgumentsHost;

    // 调用 catch 方法
    filter.catch(exception, host);

    // 断言返回的状态码和消息是否正确
    expect(response.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.json).toHaveBeenCalledWith(expect.any(Object));
    // 断言设置了 Retry-After 响应头
    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", 60);
  });
});
