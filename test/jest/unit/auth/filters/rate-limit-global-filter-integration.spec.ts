import { Test, TestingModule } from "@nestjs/testing";
import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Request, Response } from "express";

import { RateLimitExceptionFilter } from "../../../../../src/auth/filters/rate-limit.filter";
import { GlobalExceptionFilter } from "../../../../../src/common/core/filters/global-exception.filter";
import {
  EnhancedRateLimitException,
  SecurityExceptionFactory,
} from "../../../../../src/auth/exceptions/security.exceptions";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";

// Mock dependencies
jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock("@common/utils/http-headers.util");

describe("RateLimitExceptionFilter 与 GlobalExceptionFilter 集成测试", () => {
  let rateLimitFilter: RateLimitExceptionFilter;
  let globalFilter: GlobalExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: Partial<ArgumentsHost>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockHttpHeadersUtil: jest.Mocked<typeof HttpHeadersUtil>;

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitExceptionFilter,
        {
          provide: GlobalExceptionFilter,
          useFactory: () => new GlobalExceptionFilter(mockEventEmitter),
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    rateLimitFilter = module.get<RateLimitExceptionFilter>(
      RateLimitExceptionFilter,
    );
    globalFilter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockHttpHeadersUtil = HttpHeadersUtil as jest.Mocked<
      typeof HttpHeadersUtil
    >;

    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      method: "POST",
      url: "/api/test",
      originalUrl: "/api/test",
      ip: "192.168.1.1",
      headers: {
        "user-agent": "Test Browser",
        "x-app-key": "test-api-key",
        "x-correlation-id": "test-correlation-id",
        "x-request-id": "test-request-id",
      },
      connection: {
        remoteAddress: "192.168.1.1",
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    };

    // Setup HttpHeadersUtil mocks
    mockHttpHeadersUtil.getUserAgent.mockReturnValue("Test Browser");
    mockHttpHeadersUtil.getHeader.mockReturnValue("test-api-key");
    mockHttpHeadersUtil.getClientIP.mockReturnValue("192.168.1.1");
    mockHttpHeadersUtil.getSafeHeaders.mockReturnValue({
      "user-agent": "Test Browser",
      "x-app-key": "test-api-key",
    });
  });

  describe("异常处理流程集成", () => {
    it("应该从RateLimitFilter抛出增强异常，然后由GlobalExceptionFilter正确处理", () => {
      // 创建标准429异常
      const originalException = new HttpException(
        {
          message: "Too Many Requests",
          details: {
            limit: 100,
            current: 101,
            remaining: 0,
            resetTime: Date.now() + 60000,
            retryAfter: 60,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      // 第一步：RateLimitFilter处理异常
      let thrownException: EnhancedRateLimitException;

      try {
        rateLimitFilter.catch(
          originalException,
          mockArgumentsHost as ArgumentsHost,
        );
      } catch (exception) {
        thrownException = exception as EnhancedRateLimitException;
      }

      // 验证RateLimitFilter抛出了增强异常
      expect(thrownException).toBeInstanceOf(EnhancedRateLimitException);
      expect(thrownException.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(thrownException.limit).toBe(100);
      expect(thrownException.current).toBe(101);
      expect(thrownException.retryAfter).toBe(60);

      // 验证设置了Retry-After头
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", 60);

      // 第二步：GlobalExceptionFilter处理增强异常
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      // 验证GlobalExceptionFilter生成了标准化响应
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 429,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            type: "SecurityError",
            path: "/api/test",
            correlationId: "test-correlation-id",
            requestId: "test-request-id",
          },
        },
      });

      // 验证发送了监控事件
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it("应该处理增强异常的详细信息传递", () => {
      const originalException = new HttpException(
        {
          message: "Rate limit exceeded",
          details: {
            limit: 50,
            current: 55,
            remaining: 0,
            resetTime: Date.now() + 30000,
            retryAfter: 30,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      let thrownException: EnhancedRateLimitException;

      try {
        rateLimitFilter.catch(
          originalException,
          mockArgumentsHost as ArgumentsHost,
        );
      } catch (exception) {
        thrownException = exception as EnhancedRateLimitException;
      }

      // 验证增强异常包含了所有详细信息
      expect(thrownException.limit).toBe(50);
      expect(thrownException.current).toBe(55);
      expect(thrownException.remaining).toBe(0);
      expect(thrownException.retryAfter).toBe(30);
      expect(thrownException.securityType).toBe("RateLimitError");
      expect(thrownException.requestPath).toBe("/api/test");
      expect(thrownException.clientIp).toBe("192.168.1.1");
      expect(thrownException.userAgent).toBe("Test Browser");

      // GlobalExceptionFilter应该能正确处理这个增强异常
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 429,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            type: "SecurityError",
            path: "/api/test",
            correlationId: "test-correlation-id",
            requestId: "test-request-id",
          },
        },
      });
    });

    it("应该保持响应格式的一致性", () => {
      const originalException = new HttpException(
        "Too Many Requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );

      let thrownException: EnhancedRateLimitException;

      try {
        rateLimitFilter.catch(
          originalException,
          mockArgumentsHost as ArgumentsHost,
        );
      } catch (exception) {
        thrownException = exception as EnhancedRateLimitException;
      }

      // 处理增强异常
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      // 验证响应格式符合标准
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // 检查必需的字段
      expect(responseCall).toHaveProperty("statusCode", 429);
      expect(responseCall).toHaveProperty("message");
      expect(responseCall).toHaveProperty("data", null);
      expect(responseCall).toHaveProperty("timestamp");
      expect(responseCall).toHaveProperty("error");

      // 检查error对象结构
      expect(responseCall.error).toHaveProperty("code");
      expect(responseCall.error).toHaveProperty("details");
      expect(responseCall.error.details).toHaveProperty("type");
      expect(responseCall.error.details).toHaveProperty("path");

      // 检查追踪信息
      expect(responseCall.error.details).toHaveProperty("correlationId");
      expect(responseCall.error.details).toHaveProperty("requestId");
    });
  });

  describe("错误处理边缘情况", () => {
    it("应该处理RateLimitFilter和GlobalExceptionFilter的异常传递", () => {
      // 测试非429异常应该直接传递给GlobalExceptionFilter
      const notFoundException = new HttpException(
        "Not Found",
        HttpStatus.NOT_FOUND,
      );

      expect(() => {
        rateLimitFilter.catch(
          notFoundException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(notFoundException);

      // 然后GlobalExceptionFilter应该能处理这个异常
      globalFilter.catch(notFoundException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 404,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "NOT_FOUND",
          details: {
            type: "HttpException",
            path: "/api/test",
            correlationId: "test-correlation-id",
            requestId: "test-request-id",
          },
        },
      });
    });

    it("应该处理已经是增强异常的情况", () => {
      // 创建一个已经增强的异常
      const enhancedException = new EnhancedRateLimitException(
        200,
        201,
        0,
        Date.now() + 60000,
        60,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      // RateLimitFilter应该直接重新抛出
      expect(() => {
        rateLimitFilter.catch(
          enhancedException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(enhancedException);

      // 验证仍然设置了Retry-After头
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", 60);

      // GlobalExceptionFilter应该能正确处理
      globalFilter.catch(enhancedException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });
  });

  describe("性能和兼容性", () => {
    it("重构后的异常处理不应该显著影响性能", () => {
      const startTime = Date.now();

      const exception = new HttpException(
        {
          details: {
            limit: 100,
            current: 101,
            remaining: 0,
            resetTime: Date.now() + 60000,
            retryAfter: 60,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      let thrownException: EnhancedRateLimitException;

      try {
        rateLimitFilter.catch(exception, mockArgumentsHost as ArgumentsHost);
      } catch (e) {
        thrownException = e as EnhancedRateLimitException;
      }

      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 异常处理应该在合理时间内完成（通常<10ms）
      expect(duration).toBeLessThan(50);
    });

    it("应该与现有的请求追踪机制兼容", () => {
      const exception = new HttpException(
        "Too Many Requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );

      // 测试各种追踪头组合
      const testCases = [
        {
          correlationId: "test-correlation",
          requestId: "test-request",
        },
        {
          correlationId: undefined,
          requestId: "test-request",
        },
        {
          correlationId: "test-correlation",
          requestId: undefined,
        },
        {
          correlationId: undefined,
          requestId: undefined,
        },
      ];

      testCases.forEach((testCase, index) => {
        // 重置mocks
        jest.clearAllMocks();

        // 设置测试用的headers
        (mockRequest as any).headers = {
          ...mockRequest.headers,
          "x-correlation-id": testCase.correlationId,
          "x-request-id": testCase.requestId,
        };

        let thrownException: EnhancedRateLimitException;

        try {
          rateLimitFilter.catch(exception, mockArgumentsHost as ArgumentsHost);
        } catch (e) {
          thrownException = e as EnhancedRateLimitException;
        }

        globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

        const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

        // 验证追踪信息正确传递
        if (testCase.correlationId) {
          expect(responseCall.error.details.correlationId).toBe(
            testCase.correlationId,
          );
        } else {
          expect(responseCall.error.details.correlationId).toBeUndefined();
        }

        if (testCase.requestId) {
          expect(responseCall.error.details.requestId).toBe(testCase.requestId);
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            "x-request-id",
            testCase.requestId,
          );
        }
      });
    });
  });
});
