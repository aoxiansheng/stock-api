import { Test, TestingModule } from "@nestjs/testing";
import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Request, Response } from "express";

import { SecurityMiddleware } from "../../../../../src/auth/middleware/security.middleware";
import { GlobalExceptionFilter } from "../../../../../src/common/core/filters/global-exception.filter";
import { AuthConfigService } from "../../../../../src/auth/services/infrastructure/auth-config.service";
import { 
  EnhancedPayloadTooLargeException,
  EnhancedUnsupportedMediaTypeException,
  InputSecurityViolationException,
  SecurityMiddlewareException
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
jest.mock("xss", () => jest.fn((input) => input.replace(/<[^>]*>/g, "")));

describe("SecurityMiddleware 与 GlobalExceptionFilter 集成测试", () => {
  let securityMiddleware: SecurityMiddleware;
  let globalFilter: GlobalExceptionFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: Partial<ArgumentsHost>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMiddleware,
        {
          provide: AuthConfigService,
          useValue: {
            getIpRateLimitConfig: jest.fn().mockReturnValue({
              maxRequests: 100,
              windowMs: 60000,
            }),
            getMaxPayloadSizeString: jest.fn().mockReturnValue("1MB"),
            getMaxPayloadSizeBytes: jest.fn().mockReturnValue(1024 * 1024),
            getMaxStringLengthSanitize: jest.fn().mockReturnValue(10000),
            getMaxObjectDepthComplexity: jest.fn().mockReturnValue(10),
            getMaxObjectFieldsComplexity: jest.fn().mockReturnValue(1000),
            getMaxStringLengthComplexity: jest.fn().mockReturnValue(10000),
            getMaxRecursionDepth: jest.fn().mockReturnValue(50),
            getFindLongStringThreshold: jest.fn().mockReturnValue(5000),
            getMaxQueryParams: jest.fn().mockReturnValue(100),
            isIpRateLimitEnabled: jest.fn().mockReturnValue(true),
          },
        },
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

    securityMiddleware = module.get<SecurityMiddleware>(SecurityMiddleware);
    globalFilter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

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
    (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("500");
    (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("application/json");
    (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue("192.168.1.1");
    (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue("Test Browser");
    (HttpHeadersUtil.getSafeHeaders as jest.Mock).mockReturnValue({
      "user-agent": "Test Browser",
      "x-app-key": "test-api-key",
    });
    (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {});
  });

  describe("异常处理流程集成", () => {
    it("应该从SecurityMiddleware抛出增强异常，然后由GlobalExceptionFilter正确处理", () => {
      // 设置会触发PayloadTooLarge异常的条件
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152"); // 2MB

      let thrownException: EnhancedPayloadTooLargeException;
      
      try {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
      } catch (exception) {
        thrownException = exception as EnhancedPayloadTooLargeException;
      }

      // 验证SecurityMiddleware抛出了增强异常
      expect(thrownException).toBeInstanceOf(EnhancedPayloadTooLargeException);
      expect(thrownException.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(thrownException.actualSize).toBe(2097152);
      expect(thrownException.maxAllowedSize).toBe(1048576);

      // 第二步：GlobalExceptionFilter处理增强异常
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      // 验证GlobalExceptionFilter生成了标准化响应
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 413,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "PAYLOAD_TOO_LARGE",
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

    it("应该处理UnsupportedMediaType异常的详细信息传递", () => {
      mockRequest.method = "POST";
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("text/javascript");

      let thrownException: EnhancedUnsupportedMediaTypeException;
      
      try {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
      } catch (exception) {
        thrownException = exception as EnhancedUnsupportedMediaTypeException;
      }

      // 验证增强异常包含了所有详细信息
      expect(thrownException.contentType).toBe("text/javascript");
      expect(thrownException.reason).toBe("DANGEROUS_CONTENT_TYPE");
      expect(thrownException.securityType).toBe("ContentTypeSecurityViolation");
      expect(thrownException.requestPath).toBe("/api/test");
      expect(thrownException.clientIp).toBe("192.168.1.1");
      expect(thrownException.userAgent).toBe("Test Browser");

      // GlobalExceptionFilter应该能正确处理这个增强异常
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(415);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 415,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          details: {
            type: "SecurityError",
            path: "/api/test",
            correlationId: "test-correlation-id",
            requestId: "test-request-id",
          },
        },
      });
    });

    it("应该处理InputSecurityViolation异常", () => {
      mockRequest.originalUrl = "/test/../../../etc/passwd";

      let thrownException: InputSecurityViolationException;
      
      try {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
      } catch (exception) {
        thrownException = exception as InputSecurityViolationException;
      }

      // 验证异常类型和详细信息
      expect(thrownException).toBeInstanceOf(InputSecurityViolationException);
      expect(thrownException.violationType).toBe("MALICIOUS_URL_PATTERN");
      expect(thrownException.securityType).toBe("InputSecurityViolation");

      // GlobalExceptionFilter处理
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "INPUT_SECURITY_VIOLATION",
          details: {
            type: "SecurityError",
            path: "/test/../../../etc/passwd",
            correlationId: "test-correlation-id",
            requestId: "test-request-id",
          },
        },
      });
    });

    it("应该处理SecurityMiddleware内部错误", () => {
      const originalError = new Error("Test middleware error");
      (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {
        throw originalError;
      });

      let thrownException: SecurityMiddlewareException;
      
      try {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
      } catch (exception) {
        thrownException = exception as SecurityMiddlewareException;
      }

      // 验证异常类型
      expect(thrownException).toBeInstanceOf(SecurityMiddlewareException);
      expect(thrownException.middlewareComponent).toBe("security-middleware");
      expect(thrownException.securityType).toBe("SecurityMiddlewareError");

      // GlobalExceptionFilter处理
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: expect.any(String),
        data: null,
        timestamp: expect.any(String),
        error: {
          code: "SECURITY_MIDDLEWARE_ERROR",
          details: {
            type: "SecurityError",
            path: "/api/test",
            correlationId: "test-correlation-id",
            requestId: "test-request-id",
          },
        },
      });
    });
  });

  describe("响应格式一致性", () => {
    it("应该保持响应格式的一致性", () => {
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152");

      let thrownException: EnhancedPayloadTooLargeException;
      
      try {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
      } catch (exception) {
        thrownException = exception as EnhancedPayloadTooLargeException;
      }

      // 处理增强异常
      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

      // 验证响应格式符合标准
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      // 检查必需的字段
      expect(responseCall).toHaveProperty("statusCode", 413);
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

    it("应该与现有的请求追踪机制兼容", () => {
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
      ];

      testCases.forEach((testCase) => {
        // 重置mocks
        jest.clearAllMocks();
        
        // 设置测试用的headers
        (mockRequest as any).headers = {
          ...mockRequest.headers,
          "x-correlation-id": testCase.correlationId,
          "x-request-id": testCase.requestId,
        };

        (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152");

        let thrownException: EnhancedPayloadTooLargeException;
        
        try {
          securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
        } catch (exception) {
          thrownException = exception as EnhancedPayloadTooLargeException;
        }

        globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);

        const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        
        // 验证追踪信息正确传递
        if (testCase.correlationId) {
          expect(responseCall.error.details.correlationId).toBe(testCase.correlationId);
        } else {
          expect(responseCall.error.details.correlationId).toBeUndefined();
        }
        
        if (testCase.requestId) {
          expect(responseCall.error.details.requestId).toBe(testCase.requestId);
          expect(mockResponse.setHeader).toHaveBeenCalledWith("x-request-id", testCase.requestId);
        }
      });
    });
  });

  describe("性能和兼容性", () => {
    it("重构后的异常处理不应该显著影响性能", () => {
      const startTime = Date.now();
      
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152");

      let thrownException: EnhancedPayloadTooLargeException;
      
      try {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, jest.fn());
      } catch (e) {
        thrownException = e as EnhancedPayloadTooLargeException;
      }

      globalFilter.catch(thrownException, mockArgumentsHost as ArgumentsHost);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 异常处理应该在合理时间内完成（通常<10ms）
      expect(duration).toBeLessThan(50);
    });
  });
});