import { Request, Response, NextFunction } from "express";
import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { SecurityMiddleware } from "../../../../../src/auth/middleware/security.middleware";
import { AuthConfigService } from "../../../../../src/auth/services/infrastructure/auth-config.service";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import { 
  EnhancedPayloadTooLargeException,
  EnhancedUnsupportedMediaTypeException, 
  InputSecurityViolationException,
  SecurityMiddlewareException,
  SecurityExceptionFactory
} from "../../../../../src/auth/exceptions/security.exceptions";

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

// Mock the SecurityExceptionFactory
jest.mock("../../../../../src/auth/exceptions/security.exceptions", () => ({
  ...jest.requireActual("../../../../../src/auth/exceptions/security.exceptions"),
  SecurityExceptionFactory: {
    createPayloadTooLargeException: jest.fn(),
    createUnsupportedMediaTypeException: jest.fn(),
    createInputSecurityViolationException: jest.fn(),
    createSecurityMiddlewareException: jest.fn(),
  },
}));

describe("SecurityMiddleware - 异常增强模式", () => {
  let securityMiddleware: SecurityMiddleware;
  let authConfigService: jest.Mocked<AuthConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockSecurityExceptionFactory: jest.Mocked<typeof SecurityExceptionFactory>;

  beforeEach(async () => {
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
      ],
    }).compile();

    securityMiddleware = module.get<SecurityMiddleware>(SecurityMiddleware);
    authConfigService = module.get<AuthConfigService>(AuthConfigService) as jest.Mocked<AuthConfigService>;

    // Setup mock factory
    mockSecurityExceptionFactory = SecurityExceptionFactory as jest.Mocked<typeof SecurityExceptionFactory>;

    mockRequest = {
      method: "GET",
      url: "/test",
      originalUrl: "/test",
      headers: {},
      query: {},
      body: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock HttpHeadersUtil methods
    (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("500");
    (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("application/json");
    (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue("127.0.0.1");
    (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue("Test Agent");
    (HttpHeadersUtil.getSafeHeaders as jest.Mock).mockReturnValue({});
    (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {});
    (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockReturnValue("secure-id-123");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("正常请求处理", () => {
    it("应该对有效请求调用next()", () => {
      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(HttpHeadersUtil.setSecurityHeaders).toHaveBeenCalled();
    });

    it("应该设置安全响应头", () => {
      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(HttpHeadersUtil.setSecurityHeaders).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe("PAYLOAD_TOO_LARGE异常处理", () => {
    it("应该抛出EnhancedPayloadTooLargeException而非直接构造响应", () => {
      const mockException = new EnhancedPayloadTooLargeException(
        2097152, 1048576, "1MB", "/test", "127.0.0.1", "Test Agent"
      );

      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152"); // 2MB
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(1048576); // 1MB
      mockSecurityExceptionFactory.createPayloadTooLargeException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createPayloadTooLargeException).toHaveBeenCalledWith(
        2097152,
        1048576,
        "1MB",
        mockRequest
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("应该处理缺少Content-Length的情况", () => {
      const mockException = new EnhancedPayloadTooLargeException(
        0, 1048576, "1MB", "/test", "127.0.0.1", "Test Agent"
      );

      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue(null);
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(1048576);
      mockSecurityExceptionFactory.createPayloadTooLargeException.mockReturnValue(mockException);

      // 当没有Content-Length时，应该正常通过
      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockSecurityExceptionFactory.createPayloadTooLargeException).not.toHaveBeenCalled();
    });

    it("应该正确记录超大请求的日志信息", () => {
      const mockException = new EnhancedPayloadTooLargeException(
        2097152, 1048576, "1MB", "/test", "127.0.0.1", "Test Agent"
      );

      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152");
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(1048576);
      authConfigService.getMaxPayloadSizeString.mockReturnValue("1MB");
      mockSecurityExceptionFactory.createPayloadTooLargeException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      // 验证日志参数包含必要信息
      expect(mockSecurityExceptionFactory.createPayloadTooLargeException).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        "1MB",
        expect.any(Object)
      );
    });
  });

  describe("UNSUPPORTED_MEDIA_TYPE异常处理", () => {
    it("应该抛出EnhancedUnsupportedMediaTypeException而非直接构造响应", () => {
      const mockException = new EnhancedUnsupportedMediaTypeException(
        "text/javascript", "DANGEROUS_CONTENT_TYPE", "/test", "127.0.0.1", "Test Agent"
      );

      mockRequest.method = "POST";
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("text/javascript");
      mockSecurityExceptionFactory.createUnsupportedMediaTypeException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createUnsupportedMediaTypeException).toHaveBeenCalledWith(
        "text/javascript",
        "DANGEROUS_CONTENT_TYPE",
        mockRequest
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("应该处理缺少Content-Type的POST请求", () => {
      const mockException = new EnhancedUnsupportedMediaTypeException(
        "unknown", "MISSING_CONTENT_TYPE", "/test", "127.0.0.1", "Test Agent"
      );

      mockRequest.method = "POST";
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue(null);
      mockSecurityExceptionFactory.createUnsupportedMediaTypeException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createUnsupportedMediaTypeException).toHaveBeenCalledWith(
        "unknown",
        "MISSING_CONTENT_TYPE",
        mockRequest
      );
    });

    it("应该允许GET请求不检查Content-Type", () => {
      mockRequest.method = "GET";
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue(null);

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockSecurityExceptionFactory.createUnsupportedMediaTypeException).not.toHaveBeenCalled();
    });

    it("应该拒绝危险的字符集", () => {
      const mockException = new EnhancedUnsupportedMediaTypeException(
        "text/html; charset=utf-7", "DANGEROUS_CHARSET", "/test", "127.0.0.1", "Test Agent"
      );

      mockRequest.method = "POST";
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("text/html; charset=utf-7");
      mockSecurityExceptionFactory.createUnsupportedMediaTypeException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createUnsupportedMediaTypeException).toHaveBeenCalledWith(
        "text/html; charset=utf-7",
        "DANGEROUS_CHARSET",
        mockRequest
      );
    });
  });

  describe("BAD_REQUEST异常处理", () => {
    it("应该抛出InputSecurityViolationException而非直接构造响应", () => {
      const mockException = new InputSecurityViolationException(
        "MALICIOUS_URL_PATTERN", { pattern: "/\\.\\.[/\\\\]/" }, "/test", "127.0.0.1", "Test Agent"
      );

      mockRequest.originalUrl = "/test/../../../etc/passwd";
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createInputSecurityViolationException).toHaveBeenCalledWith(
        "MALICIOUS_URL_PATTERN",
        expect.any(Object),
        mockRequest
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("应该拒绝过深的对象嵌套", () => {
      const mockException = new InputSecurityViolationException(
        "EXCESSIVE_NESTING", { actualDepth: 5, maxDepth: 3 }, "/test", "127.0.0.1", "Test Agent"
      );

      const deepObject = { level1: { level2: { level3: { level4: { level5: {} } } } } };
      mockRequest.body = deepObject;
      authConfigService.getMaxObjectDepthComplexity.mockReturnValue(3);
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createInputSecurityViolationException).toHaveBeenCalledWith(
        "EXCESSIVE_NESTING",
        expect.objectContaining({
          actualDepth: expect.any(Number),
          maxDepth: 3
        }),
        mockRequest
      );
    });

    it("应该拒绝JSON炸弹攻击", () => {
      const mockException = new InputSecurityViolationException(
        "JSON_BOMB", { actualFields: 1500, maxFields: 1000 }, "/test", "127.0.0.1", "Test Agent"
      );

      // 创建一个包含很多字段的对象
      const largeObject = {};
      for (let i = 0; i < 1500; i++) {
        largeObject[`field${i}`] = `value${i}`;
      }
      mockRequest.body = largeObject;
      authConfigService.getMaxObjectFieldsComplexity.mockReturnValue(1000);
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createInputSecurityViolationException).toHaveBeenCalledWith(
        "JSON_BOMB",
        expect.objectContaining({
          actualFields: expect.any(Number),
          maxFields: 1000
        }),
        mockRequest
      );
    });

    it("应该拒绝过长的字符串", () => {
      const mockException = new InputSecurityViolationException(
        "EXCESSIVE_STRING_LENGTH", { length: 15000, maxLength: 10000 }, "/test", "127.0.0.1", "Test Agent"
      );

      const longString = "a".repeat(15000);
      mockRequest.body = { longField: longString };
      authConfigService.getMaxStringLengthComplexity.mockReturnValue(10000);
      authConfigService.getFindLongStringThreshold.mockReturnValue(5000);
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);
    });

    it("应该拒绝包含危险Unicode字符的请求", () => {
      const mockException = new InputSecurityViolationException(
        "DANGEROUS_UNICODE_CHARACTERS", { patterns: expect.any(Array) }, "/test", "127.0.0.1", "Test Agent"
      );

      // 包含零宽字符的字符串
      mockRequest.body = { maliciousField: "normal\u200Btext" };
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);
    });

    it("应该拒绝过多的查询参数", () => {
      const mockException = new InputSecurityViolationException(
        "EXCESSIVE_QUERY_PARAMETERS", { count: 150, maxAllowed: 100 }, "/test", "127.0.0.1", "Test Agent"
      );

      const largeQuery = {};
      for (let i = 0; i < 150; i++) {
        largeQuery[`param${i}`] = `value${i}`;
      }
      mockRequest.query = largeQuery;
      authConfigService.getMaxQueryParams.mockReturnValue(100);
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);
    });

    it("应该处理验证复杂度攻击", () => {
      const mockException = new InputSecurityViolationException(
        "VALIDATION_COMPLEXITY_ATTACK", { error: "Maximum call stack exceeded" }, "/test", "127.0.0.1", "Test Agent"
      );

      // Mock一个会导致验证过程出错的请求
      mockRequest.body = { complexField: "test" };
      authConfigService.getMaxObjectDepthComplexity.mockImplementation(() => {
        throw new Error("Maximum call stack exceeded");
      });
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);
    });
  });

  describe("INTERNAL_SERVER_ERROR异常处理", () => {
    it("应该抛出SecurityMiddlewareException而非直接构造响应", () => {
      const originalError = new Error("Test error");
      const mockException = new SecurityMiddlewareException(
        "security-middleware", "安全中间件处理失败: Test error", "/test", "127.0.0.1", "Test Agent", originalError
      );

      (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {
        throw originalError;
      });
      mockSecurityExceptionFactory.createSecurityMiddlewareException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      expect(mockSecurityExceptionFactory.createSecurityMiddlewareException).toHaveBeenCalledWith(
        "security-middleware",
        "安全中间件处理失败: Test error",
        mockRequest,
        originalError
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("应该在异常处理前记录错误日志", () => {
      const originalError = new Error("Input sanitization failed");
      const mockException = new SecurityMiddlewareException(
        "security-middleware", "安全中间件处理失败: Input sanitization failed", "/test", "127.0.0.1", "Test Agent", originalError
      );

      // Mock an error during input sanitization
      (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {
        throw originalError;
      });
      mockSecurityExceptionFactory.createSecurityMiddlewareException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      // 验证异常包含原始错误信息
      expect(mockSecurityExceptionFactory.createSecurityMiddlewareException).toHaveBeenCalledWith(
        "security-middleware",
        expect.stringContaining("Input sanitization failed"),
        mockRequest,
        originalError
      );
    });
  });

  describe("输入清理功能", () => {
    it("应该清理XSS攻击尝试", () => {
      mockRequest.body = {
        message: '<script>alert("xss")</script>Hello World',
        content: "Normal content",
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // XSS content should be sanitized
      expect(mockRequest.body.message).not.toContain("<script>");
      expect(mockRequest.body.message).toContain("Hello World");
    });

    it("应该防止原型污染攻击", () => {
      mockRequest.body = {
        "__proto__": { polluted: true },
        "constructor": { polluted: true },
        "prototype": { polluted: true },
        normalField: "normal value"
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Dangerous keys should be removed
      expect(mockRequest.body).not.toHaveProperty("__proto__");
      expect(mockRequest.body).not.toHaveProperty("constructor");
      expect(mockRequest.body).not.toHaveProperty("prototype");
      expect(mockRequest.body.normalField).toBe("normal value");
    });

    it("应该清理NoSQL注入攻击", () => {
      mockRequest.body = {
        query: '$where function() { return true; }',
        filter: { '$ne': null },
        search: 'javascript:alert(1)'
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // NoSQL injection patterns should be removed
      expect(mockRequest.body.query).not.toContain("$where");
      expect(JSON.stringify(mockRequest.body.filter)).not.toContain("$ne");
      expect(mockRequest.body.search).not.toContain("javascript:");
    });

    it("应该限制字符串长度防止DoS攻击", () => {
      const longString = "a".repeat(20000);
      mockRequest.body = { longField: longString };
      authConfigService.getMaxStringLengthSanitize.mockReturnValue(10000);

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // String should be truncated
      expect(mockRequest.body.longField.length).toBe(10000);
    });
  });

  describe("向后兼容性", () => {
    it("重构后应该保持相同的安全防护级别", () => {
      // 测试多种攻击同时存在的情况
      mockRequest.originalUrl = "/test/../../../etc/passwd";
      const mockException = new InputSecurityViolationException(
        "MALICIOUS_URL_PATTERN", { pattern: "/\\.\\.[/\\\\]/" }, "/test", "127.0.0.1", "Test Agent"
      );
      mockSecurityExceptionFactory.createInputSecurityViolationException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      // 应该在第一个检查点就被拦截
      expect(mockSecurityExceptionFactory.createInputSecurityViolationException).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("应该保持日志记录的完整性", () => {
      const mockException = new EnhancedPayloadTooLargeException(
        2097152, 1048576, "1MB", "/test", "127.0.0.1", "Test Agent"
      );

      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2097152");
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(1048576);
      mockSecurityExceptionFactory.createPayloadTooLargeException.mockReturnValue(mockException);

      expect(() => {
        securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(mockException);

      // 验证异常创建时包含了所有必要的安全上下文
      expect(mockSecurityExceptionFactory.createPayloadTooLargeException).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number), 
        expect.any(String),
        expect.objectContaining({
          method: expect.any(String),
          url: expect.any(String),
          originalUrl: expect.any(String)
        })
      );
    });
  });
});