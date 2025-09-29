import { SecurityMiddleware, CSRFMiddleware, RateLimitByIPMiddleware } from '@auth/middleware/security.middleware';
import { AuthConfigService } from '@auth/services/infrastructure/auth-config.service';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@common/logging/index';
import { HttpHeadersUtil } from '@common/utils/http-headers.util';
import { SecurityExceptionFactory } from '@auth/exceptions/security.exceptions';
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';

// Mock the logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock HttpHeadersUtil
jest.mock('@common/utils/http-headers.util', () => ({
  HttpHeadersUtil: {
    getContentLength: jest.fn(),
    getContentType: jest.fn(),
    getClientIP: jest.fn(),
    getUserAgent: jest.fn(),
    setSecurityHeaders: jest.fn(),
    getHeader: jest.fn(),
    getApiCredentials: jest.fn(),
    getSafeHeaders: jest.fn(),
    getSecureClientIdentifier: jest.fn(),
  },
}));

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let authConfigService: jest.Mocked<AuthConfigService>;

  const mockRequest = {
    method: 'POST',
    url: '/api/test',
    originalUrl: '/api/test',
    headers: {
      'content-type': 'application/json',
      'content-length': '1000',
    },
    body: {
      testData: 'valid data',
    },
    query: {},
    params: {},
    ip: '127.0.0.1',
    get: jest.fn().mockImplementation((header: string) => {
      return mockRequest.headers[header.toLowerCase()];
    }),
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const mockNext = jest.fn() as NextFunction;

  beforeEach(() => {
    // 创建AuthConfigService的Mock
    authConfigService = {
      getMaxPayloadSizeBytes: jest.fn().mockReturnValue(10485760), // 10MB
      getMaxPayloadSizeString: jest.fn().mockReturnValue('10MB'),
      getMaxStringLengthSanitize: jest.fn().mockReturnValue(1000),
      getMaxObjectDepthComplexity: jest.fn().mockReturnValue(10),
      getMaxObjectFieldsComplexity: jest.fn().mockReturnValue(1000),
      getMaxStringLengthComplexity: jest.fn().mockReturnValue(10000),
      getMaxRecursionDepth: jest.fn().mockReturnValue(100),
      getFindLongStringThreshold: jest.fn().mockReturnValue(50000),
      getMaxQueryParams: jest.fn().mockReturnValue(50),
      isIpRateLimitEnabled: jest.fn().mockReturnValue(true),
      getIpRateLimitConfig: jest.fn().mockReturnValue({
        enabled: true,
        maxRequests: 1000,
        windowMs: 60000,
      }),
    } as any;

    // 创建SecurityMiddleware实例
    middleware = new SecurityMiddleware(authConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('应该允许正常请求通过', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue('application/json');
      (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue('127.0.0.1');
      (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue('test-agent');

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(HttpHeadersUtil.setSecurityHeaders).toHaveBeenCalledWith(mockResponse);
    });

    it('应该拒绝过大的请求体', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('20971520'); // 20MB
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(10485760); // 10MB

      // Act & Assert
      expect(() => middleware.use(mockRequest, mockResponse, mockNext)).toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理无Content-Length头的请求', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue(null);

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝不安全的内容类型', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue('text/html');

      // Act & Assert
      expect(() => middleware.use(mockRequest, mockResponse, mockNext)).toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理恶意输入', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue('application/json');
      mockRequest.body = { test: '<script>alert("xss")</script>' };

      // Act & Assert
      expect(() => middleware.use(mockRequest, mockResponse, mockNext)).toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该记录安全信息', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue('application/json');
      (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue('127.0.0.1');
      (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue('test-agent');
      mockRequest.originalUrl = '/api/test<script>';

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(createLogger('test').warn).toHaveBeenCalled();
    });

    it('应该清理输入', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue('application/json');
      mockRequest.body = { test: '<script>alert("xss")</script>', normal: 'value' };

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('应该处理配置服务异常', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockImplementation(() => {
        throw new Error('Config service error');
      });

      // Act & Assert
      expect(() => middleware.use(mockRequest, mockResponse, mockNext)).toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理输入清理过程中的错误', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      (HttpHeadersUtil.getContentType as jest.Mock).mockReturnValue('application/json');
      jest.spyOn(middleware as any, 'sanitizeObject').mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(createLogger('test').warn).toHaveBeenCalled();
    });
  });

  describe('isRequestTooLarge', () => {
    it('应该正确检测过大的请求', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('20971520'); // 20MB
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(10485760); // 10MB

      // Act
      const result = (middleware as any).isRequestTooLarge(mockRequest);

      // Assert
      expect(result).toBe(true);
    });

    it('应该允许正常大小的请求', () => {
      // Arrange
      (HttpHeadersUtil.getContentLength as jest.Mock).mockReturnValue('1000');
      authConfigService.getMaxPayloadSizeBytes.mockReturnValue(10485760); // 10MB

      // Act
      const result = (middleware as any).isRequestTooLarge(mockRequest);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateContentTypeSecurity', () => {
    it('应该允许安全的内容类型', () => {
      // Act
      const result = (middleware as any).validateContentTypeSecurity({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('应该拒绝危险的内容类型', () => {
      // Act
      const result = (middleware as any).validateContentTypeSecurity({
        method: 'POST',
        headers: { 'content-type': 'text/html' },
      });

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('DANGEROUS_CONTENT_TYPE');
    });

    it('应该跳过没有请求体的方法', () => {
      // Act
      const result = (middleware as any).validateContentTypeSecurity({
        method: 'GET',
        headers: {},
      });

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAdvancedInputSecurity', () => {
    it('应该允许正常输入', () => {
      // Act
      const result = (middleware as any).validateAdvancedInputSecurity({
        originalUrl: '/api/test',
        body: { test: 'value' },
        query: {},
      });

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('应该拒绝恶意URL', () => {
      // Act
      const result = (middleware as any).validateAdvancedInputSecurity({
        originalUrl: '/api/test..<script>',
        body: {},
        query: {},
      });

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('MALICIOUS_URL_PATTERN');
    });
  });

  describe('sanitizeInput', () => {
    it('应该清理请求体中的恶意内容', () => {
      // Arrange
      const req = {
        body: { test: '<script>alert("xss")</script>', normal: 'value' },
        query: {},
        params: {},
      } as unknown as Request;

      // Act
      (middleware as any).sanitizeInput(req);

      // Assert
      expect(req.body.test).not.toContain('<script>');
      expect(req.body.normal).toBe('value');
    });

    it('应该处理清理过程中的错误', () => {
      // Arrange
      const req = {
        body: { test: 'value' },
        query: {},
        params: {},
      } as unknown as Request;
      jest.spyOn(middleware as any, 'sanitizeObject').mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      // Act
      (middleware as any).sanitizeInput(req);

      // Assert
      expect(createLogger('test').warn).toHaveBeenCalled();
    });
  });
});

describe('CSRFMiddleware', () => {
  let middleware: CSRFMiddleware;

  const mockRequest = {
    method: 'POST',
    originalUrl: '/api/test',
    headers: {
      'origin': 'http://localhost:3000',
      'host': 'localhost:3000',
    },
    get: jest.fn().mockImplementation((header: string) => {
      return mockRequest.headers[header.toLowerCase()];
    }),
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const mockNext = jest.fn() as NextFunction;

  beforeEach(() => {
    middleware = new CSRFMiddleware();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('应该允许有效的Origin通过', () => {
      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝无效的Origin', () => {
      // Arrange
      mockRequest.headers['origin'] = 'http://malicious.com';

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('应该跳过GET请求的CSRF检查', () => {
      // Arrange
      mockRequest.method = 'GET';

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该允许API Key认证的请求', () => {
      // Arrange
      mockRequest.headers['origin'] = 'http://malicious.com';
      (HttpHeadersUtil.getApiCredentials as jest.Mock).mockReturnValue({
        appKey: 'test-app-key',
        accessToken: 'test-access-token',
      });

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('RateLimitByIPMiddleware', () => {
  let middleware: RateLimitByIPMiddleware;
  let authConfigService: jest.Mocked<AuthConfigService>;

  const mockRequest = {
    method: 'POST',
    originalUrl: '/api/test',
    headers: {},
    ip: '127.0.0.1',
    get: jest.fn().mockImplementation((header: string) => {
      return mockRequest.headers[header.toLowerCase()];
    }),
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const mockNext = jest.fn() as NextFunction;

  beforeEach(() => {
    // 创建AuthConfigService的Mock
    authConfigService = {
      isIpRateLimitEnabled: jest.fn().mockReturnValue(true),
      getIpRateLimitConfig: jest.fn().mockReturnValue({
        enabled: true,
        maxRequests: 5,
        windowMs: 60000,
      }),
    } as any;

    // 创建RateLimitByIPMiddleware实例
    middleware = new RateLimitByIPMiddleware(authConfigService);

    // Reset mocks and clear rate limit map
    jest.clearAllMocks();
    if ((middleware as any).ipRequestCounts) {
      (middleware as any).ipRequestCounts.clear();
    }

    // Mock HttpHeadersUtil
    (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockReturnValue('127.0.0.1');
    (HttpHeadersUtil.getClientIP as jest.Mock).mockReturnValue('127.0.0.1');
    (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue('test-agent');
  });

  describe('use', () => {
    it('应该允许正常请求通过', () => {
      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-IP-RateLimit-Limit', 5);
    });

    it('应该拒绝超过频率限制的请求', () => {
      // Arrange
      for (let i = 0; i < 5; i++) {
        middleware.use(mockRequest, mockResponse, mockNext);
        jest.clearAllMocks();
      }

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('应该跳过禁用的频率限制', () => {
      // Arrange
      authConfigService.isIpRateLimitEnabled.mockReturnValue(false);

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });
  });
});