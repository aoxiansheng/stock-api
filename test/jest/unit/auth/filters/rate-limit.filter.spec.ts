import { Test, TestingModule } from "@nestjs/testing";
import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

import { RateLimitExceptionFilter } from "../../../../../src/auth/filters/rate-limit.filter";
import {
  EnhancedRateLimitException,
  SecurityExceptionFactory,
  isSecurityException,
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
jest.mock("../../../../../src/auth/exceptions/security.exceptions", () => ({
  ...jest.requireActual(
    "../../../../../src/auth/exceptions/security.exceptions",
  ),
  SecurityExceptionFactory: {
    createRateLimitException: jest.fn(),
  },
  isSecurityException: jest.fn(),
}));

describe("RateLimitExceptionFilter - 异常增强模式", () => {
  let filter: RateLimitExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: Partial<ArgumentsHost>;
  let mockHttpHeadersUtil: jest.Mocked<typeof HttpHeadersUtil>;
  let mockSecurityExceptionFactory: jest.Mocked<
    typeof SecurityExceptionFactory
  >;
  let mockIsSecurityException: jest.MockedFunction<typeof isSecurityException>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitExceptionFilter],
    }).compile();

    filter = module.get<RateLimitExceptionFilter>(RateLimitExceptionFilter);

    // Setup mocks
    mockHttpHeadersUtil = HttpHeadersUtil as jest.Mocked<
      typeof HttpHeadersUtil
    >;
    mockSecurityExceptionFactory = SecurityExceptionFactory as jest.Mocked<
      typeof SecurityExceptionFactory
    >;
    mockIsSecurityException = isSecurityException as jest.MockedFunction<
      typeof isSecurityException
    >;

    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      method: "GET",
      url: "/api/test",
      ip: "192.168.1.1",
      headers: {
        "user-agent": "Test Browser",
        "x-app-key": "test-api-key",
        "x-correlation-id": "test-correlation-id",
        "x-request-id": "test-request-id",
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
  });

  describe("非429异常处理", () => {
    it("应该重新抛出非429异常", () => {
      const nonRateLimitException = new HttpException(
        "Not Found",
        HttpStatus.NOT_FOUND,
      );

      expect(() => {
        filter.catch(nonRateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(nonRateLimitException);
    });

    it("应该重新抛出400异常", () => {
      const badRequestException = new HttpException(
        "Bad Request",
        HttpStatus.BAD_REQUEST,
      );

      expect(() => {
        filter.catch(badRequestException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(badRequestException);
    });
  });

  describe("已增强的安全异常处理", () => {
    it("应该直接重新抛出已增强的安全异常", () => {
      const enhancedRateLimitException = new EnhancedRateLimitException(
        100,
        101,
        0,
        Date.now() + 60000,
        60,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      // Mock isSecurityException to return true
      mockIsSecurityException.mockReturnValue(true);

      expect(() => {
        filter.catch(
          enhancedRateLimitException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(enhancedRateLimitException);

      // 验证设置了Retry-After头
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", 60);
    });

    it("应该处理没有retryAfter的增强异常", () => {
      const enhancedRateLimitException = new EnhancedRateLimitException(
        100,
        101,
        0,
        Date.now() + 60000,
        0, // retryAfter = 0
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(true);

      expect(() => {
        filter.catch(
          enhancedRateLimitException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(enhancedRateLimitException);

      // 验证没有设置Retry-After头
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        "Retry-After",
        expect.anything(),
      );
    });
  });

  describe("标准429异常转换为增强异常", () => {
    it("应该将标准429异常转换为增强异常", () => {
      const rateLimitException = new HttpException(
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

      const mockEnhancedException = new EnhancedRateLimitException(
        100,
        101,
        0,
        Date.now() + 60000,
        60,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);

      // 验证调用了SecurityExceptionFactory
      expect(
        mockSecurityExceptionFactory.createRateLimitException,
      ).toHaveBeenCalledWith(
        100,
        101,
        0,
        expect.any(Number),
        60,
        mockRequest,
        "test-api-key",
        rateLimitException,
      );

      // 验证设置了Retry-After头
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", 60);
    });

    it("应该处理缺少details的429异常", () => {
      const rateLimitException = new HttpException(
        "Too Many Requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const mockEnhancedException = new EnhancedRateLimitException(
        0,
        0,
        0,
        0,
        0,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);

      // 验证使用默认值调用了SecurityExceptionFactory
      expect(
        mockSecurityExceptionFactory.createRateLimitException,
      ).toHaveBeenCalledWith(
        0,
        0,
        0,
        0,
        0,
        mockRequest,
        "test-api-key",
        rateLimitException,
      );
    });

    it("应该处理部分缺失的details", () => {
      const rateLimitException = new HttpException(
        {
          message: "Too Many Requests",
          details: {
            limit: 100,
            current: 101,
            // 缺少 remaining, resetTime, retryAfter
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const mockEnhancedException = new EnhancedRateLimitException(
        100,
        101,
        0,
        0,
        0,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);

      expect(
        mockSecurityExceptionFactory.createRateLimitException,
      ).toHaveBeenCalledWith(
        100,
        101,
        0,
        0,
        0,
        mockRequest,
        "test-api-key",
        rateLimitException,
      );
    });
  });

  describe("日志记录功能", () => {
    it("应该记录频率限制触发日志", () => {
      const rateLimitException = new HttpException(
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

      const mockEnhancedException = new EnhancedRateLimitException(
        100,
        101,
        0,
        Date.now() + 60000,
        60,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      // 由于logger被mock，我们无法直接验证日志调用
      // 但可以验证异常被正确处理
      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);

      // 验证HttpHeadersUtil被调用用于日志记录
      expect(mockHttpHeadersUtil.getUserAgent).toHaveBeenCalledWith(
        mockRequest,
      );
      expect(mockHttpHeadersUtil.getHeader).toHaveBeenCalledWith(
        mockRequest,
        "x-app-key",
      );
    });

    it("应该处理没有User-Agent的请求", () => {
      mockHttpHeadersUtil.getUserAgent.mockReturnValue(undefined);

      const rateLimitException = new HttpException(
        "Too Many Requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const mockEnhancedException = new EnhancedRateLimitException(
        0,
        0,
        0,
        0,
        0,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);

      expect(mockHttpHeadersUtil.getUserAgent).toHaveBeenCalledWith(
        mockRequest,
      );
    });
  });

  describe("Retry-After头设置", () => {
    it("应该在设置头失败时优雅处理", () => {
      const enhancedRateLimitException = new EnhancedRateLimitException(
        100,
        101,
        0,
        Date.now() + 60000,
        60,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      // Mock setHeader to throw an error
      (mockResponse.setHeader as jest.Mock).mockImplementation(() => {
        throw new Error("Response headers already sent");
      });

      mockIsSecurityException.mockReturnValue(true);

      // 应该仍然抛出异常而不会因为setHeader失败而崩溃
      expect(() => {
        filter.catch(
          enhancedRateLimitException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(enhancedRateLimitException);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", 60);
    });

    it("不应该设置retryAfter为0的头", () => {
      const enhancedRateLimitException = new EnhancedRateLimitException(
        100,
        101,
        0,
        Date.now() + 60000,
        0, // retryAfter = 0
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(true);

      expect(() => {
        filter.catch(
          enhancedRateLimitException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(enhancedRateLimitException);

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });
  });

  describe("向后兼容性", () => {
    it("应该与旧的异常格式兼容", () => {
      const legacyRateLimitException = new HttpException(
        {
          statusCode: 429,
          message: "Too Many Requests",
          error: "Rate Limit Exceeded",
          details: {
            limit: 50,
            current: 51,
            remaining: 0,
            resetTime: Date.now() + 30000,
            retryAfter: 30,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const mockEnhancedException = new EnhancedRateLimitException(
        50,
        51,
        0,
        Date.now() + 30000,
        30,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(
          legacyRateLimitException,
          mockArgumentsHost as ArgumentsHost,
        );
      }).toThrow(mockEnhancedException);

      expect(
        mockSecurityExceptionFactory.createRateLimitException,
      ).toHaveBeenCalledWith(
        50,
        51,
        0,
        expect.any(Number),
        30,
        mockRequest,
        "test-api-key",
        legacyRateLimitException,
      );
    });
  });

  describe("边缘情况处理", () => {
    it("应该处理null/undefined的异常响应", () => {
      const rateLimitException = new HttpException(
        null,
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const mockEnhancedException = new EnhancedRateLimitException(
        0,
        0,
        0,
        0,
        0,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);
    });

    it("应该处理没有x-app-key的请求", () => {
      mockHttpHeadersUtil.getHeader.mockReturnValue(undefined);

      const rateLimitException = new HttpException(
        "Too Many Requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const mockEnhancedException = new EnhancedRateLimitException(
        0,
        0,
        0,
        0,
        0,
        "/api/test",
        "192.168.1.1",
        "Test Browser",
      );

      mockIsSecurityException.mockReturnValue(false);
      mockSecurityExceptionFactory.createRateLimitException.mockReturnValue(
        mockEnhancedException,
      );

      expect(() => {
        filter.catch(rateLimitException, mockArgumentsHost as ArgumentsHost);
      }).toThrow(mockEnhancedException);

      expect(
        mockSecurityExceptionFactory.createRateLimitException,
      ).toHaveBeenCalledWith(
        0,
        0,
        0,
        0,
        0,
        mockRequest,
        undefined, // no app key
        rateLimitException,
      );
    });
  });
});
