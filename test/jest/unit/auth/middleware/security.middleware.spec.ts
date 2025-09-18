import type { Request, Response, NextFunction } from "express";
import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { SecurityMiddleware, CSRFMiddleware, RateLimitByIPMiddleware } from "../../../../../src/auth/middleware/security.middleware";
import { AuthConfigService } from "../../../../../src/auth/services/infrastructure/auth-config.service";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import { CONSTANTS } from "@common/constants";

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

describe("SecurityMiddleware", () => {
  let securityMiddleware: SecurityMiddleware;
  let authConfigService: jest.Mocked<AuthConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

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

  describe("use()", () => {
    it("should call next() for valid requests", () => {
      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(HttpHeadersUtil.setSecurityHeaders).toHaveBeenCalled();
    });

    it("should reject requests with large payloads", () => {
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue("2000000"); // 2MB
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(1024 * 1024); // 1MB

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          error: expect.objectContaining({
            code: "PAYLOAD_TOO_LARGE",
            details: expect.objectContaining({
              type: "PayloadSizeError",
            }),
          }),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests with dangerous content types", () => {
      mockRequest.method = "POST";
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue("text/javascript");

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          error: expect.objectContaining({
            code: "UNSUPPORTED_MEDIA_TYPE",
            details: expect.objectContaining({
              type: "ContentTypeSecurityViolation",
              reason: "DANGEROUS_CONTENT_TYPE",
            }),
          }),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests with malicious URL patterns", () => {
      mockRequest.originalUrl = "/test/../../../etc/passwd";

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests with excessive object nesting", () => {
      const deepObject = { level1: { level2: { level3: { level4: { level5: {} } } } } };
      mockRequest.body = deepObject;
      authConfigService.getMaxObjectDepthComplexity.mockReturnValue(3);

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle internal errors gracefully", () => {
      (HttpHeadersUtil.setSecurityHeaders as jest.Mock).mockImplementation(() => {
        throw new Error("Test error");
      });

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: expect.objectContaining({
            code: "INTERNAL_SERVER_ERROR",
            details: expect.objectContaining({
              type: "SecurityMiddlewareError",
            }),
          }),
        }),
      );
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize XSS attempts in request body", () => {
      mockRequest.body = {
        message: '<script>alert("xss")</script>Hello World',
        content: "Normal content",
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // XSS content should be sanitized
      expect(mockRequest.body.message).not.toContain("<script>");
    });

    it("should prevent prototype pollution attempts", () => {
      mockRequest.body = {
        "__proto__": { polluted: true },
        "constructor": { polluted: true },
        normalField: "safe content",
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Dangerous keys should be removed
      expect(mockRequest.body).not.toHaveProperty("__proto__");
      expect(mockRequest.body).not.toHaveProperty("constructor");
      expect(mockRequest.body).toHaveProperty("normalField");
    });

    it("should detect and remove NoSQL injection patterns", () => {
      mockRequest.body = {
        query: '$where function() { return true; }',
        filter: { "$ne": null },
        normalField: "safe content",
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // NoSQL injection patterns should be removed
      expect(mockRequest.body.query).not.toContain("$where");
      expect(JSON.stringify(mockRequest.body.filter)).not.toContain("$ne");
    });
  });

  describe("Advanced Security Checks", () => {
    it("should detect Unicode-based attacks", () => {
      mockRequest.body = {
        content: "Hello\u0000World", // Null byte injection
        message: "Normal\u202Etext", // Bidirectional text override
      };

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should prevent JSON bomb attacks", () => {
      const massiveObject = {};
      for (let i = 0; i < 2000; i++) {
        massiveObject[`field${i}`] = `value${i}`;
      }
      mockRequest.body = massiveObject;
      authConfigService.getMaxObjectFieldsComplexity.mockReturnValue(1000);

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should limit excessive query parameters", () => {
      const massiveQuery = {};
      for (let i = 0; i < 150; i++) {
        massiveQuery[`param${i}`] = `value${i}`;
      }
      mockRequest.query = massiveQuery;
      authConfigService.getMaxQueryParams.mockReturnValue(100);

      securityMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe("CSRFMiddleware", () => {
  let csrfMiddleware: CSRFMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    csrfMiddleware = new CSRFMiddleware();

    mockRequest = {
      method: "POST",
      originalUrl: "/test",
      headers: {
        host: "example.com",
        origin: "https://example.com",
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock HttpHeadersUtil methods
    (HttpHeadersUtil.getHeader as jest.Mock).mockImplementation((req, headerName) => {
      return req.headers[headerName.toLowerCase()];
    });
    (HttpHeadersUtil.getApiCredentials as jest.Mock).mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DISABLE_CSRF;
  });

  it("should allow requests with valid Origin header", () => {
    csrfMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it("should block requests with invalid Origin", () => {
    mockRequest.headers.origin = "https://malicious.com";

    csrfMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should allow GET requests without CSRF checks", () => {
    mockRequest.method = "GET";
    delete mockRequest.headers.origin;

    csrfMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it("should skip CSRF checks when disabled via environment", () => {
    process.env.DISABLE_CSRF = "true";
    delete mockRequest.headers.origin;

    csrfMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it("should allow API Key authenticated requests", () => {
    (HttpHeadersUtil.getApiCredentials as jest.Mock).mockReturnValue({
      appKey: "test-key",
      accessToken: "test-token",
    });
    delete mockRequest.headers.origin;

    csrfMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});

describe("RateLimitByIPMiddleware", () => {
  let rateLimitMiddleware: RateLimitByIPMiddleware;
  let authConfigService: jest.Mocked<AuthConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitByIPMiddleware,
        {
          provide: AuthConfigService,
          useValue: {
            isIpRateLimitEnabled: jest.fn().mockReturnValue(true),
            getIpRateLimitConfig: jest.fn().mockReturnValue({
              maxRequests: 5,
              windowMs: 60000,
            }),
          },
        },
      ],
    }).compile();

    rateLimitMiddleware = module.get<RateLimitByIPMiddleware>(RateLimitByIPMiddleware);
    authConfigService = module.get<AuthConfigService>(AuthConfigService) as jest.Mocked<AuthConfigService>;

    mockRequest = {
      method: "GET",
      originalUrl: "/test",
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock HttpHeadersUtil methods
    (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockReturnValue("client-123");
    (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue("192.168.1.1");
    (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue("Test Agent");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should allow requests within rate limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(5);
    expect(mockResponse.status).not.toHaveBeenCalledWith(429);
  });

  it("should block requests exceeding rate limit", () => {
    // Make 6 requests (limit is 5)
    for (let i = 0; i < 6; i++) {
      rateLimitMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(5);
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        error: expect.objectContaining({
          code: "RATE_LIMIT_EXCEEDED",
          details: expect.objectContaining({
            type: "IPRateLimit",
            limit: 5,
            current: 6,
          }),
        }),
      }),
    );
  });

  it("should set appropriate rate limit headers", () => {
    rateLimitMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.setHeader).toHaveBeenCalledWith("X-IP-RateLimit-Limit", 5);
    expect(mockResponse.setHeader).toHaveBeenCalledWith("X-IP-RateLimit-Remaining", 4);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "X-IP-RateLimit-Reset",
      expect.any(Number),
    );
  });

  it("should skip rate limiting when disabled", () => {
    authConfigService.isIpRateLimitEnabled.mockReturnValue(false);

    // Make many requests
    for (let i = 0; i < 10; i++) {
      rateLimitMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(mockResponse.status).not.toHaveBeenCalledWith(429);
  });

  it("should track different clients separately", () => {
    const client1Id = "client-1";
    const client2Id = "client-2";

    // Client 1 makes 5 requests
    (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockReturnValue(client1Id);
    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
    }

    // Client 2 should be able to make 5 requests as well
    (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockReturnValue(client2Id);
    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware.use(mockRequest as Request, mockResponse as Response, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(mockResponse.status).not.toHaveBeenCalledWith(429);
  });
});