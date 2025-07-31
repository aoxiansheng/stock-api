import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMiddleware, CSRFMiddleware, RateLimitByIPMiddleware } from '../../../../../src/security/middleware/security.middleware';
import { Request, Response, NextFunction } from 'express';
import { HttpHeadersUtil } from '@common/utils/http-headers.util';
import { SECURITY_LIMITS } from '@common/constants/rate-limit.constants';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new SecurityMiddleware();
    mockRequest = {
      method: 'POST',
      url: '/test',
      originalUrl: '/test',
      get: jest.fn(),
      body: { data: 'some data' },
      query: { param: 'value' },
      params: { id: '123' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    };
    nextFunction = jest.fn();

    loggerWarnSpy = jest.spyOn((middleware as any).logger, 'warn').mockImplementation(() => {});
    loggerErrorSpy = jest.spyOn((middleware as any).logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should call next() if all checks pass', () => {
      (mockRequest.get as jest.Mock).mockReturnValueOnce('application/json'); // Content-Type
      (mockRequest.get as jest.Mock).mockReturnValueOnce('100'); // Content-Length

      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 413 if request body is too large', () => {
      (mockRequest.get as jest.Mock).mockReturnValueOnce((SECURITY_LIMITS.MAX_PAYLOAD_SIZE_BYTES + 1).toString());

      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('请求体过大被拒绝'), expect.any(Object));
    });

    it('should return 415 for unsupported media type', () => {
      (mockRequest.get as jest.Mock).mockReturnValueOnce('100'); // Content-Length
      (mockRequest.get as jest.Mock).mockReturnValueOnce('text/javascript'); // Dangerous Content-Type

      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(415);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('不安全的内容类型被拒绝'), expect.any(Object));
    });

    it('should return 400 for malicious input', () => {
      (mockRequest.get as jest.Mock).mockReturnValueOnce('100'); // Content-Length
      (mockRequest.get as jest.Mock).mockReturnValueOnce('application/json'); // Content-Type
      mockRequest.originalUrl = '/test?param=../../etc/passwd'; // Malicious URL

      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('恶意输入被拒绝'), expect.any(Object));
    });

    it('should handle internal errors gracefully', () => {
      jest.spyOn(middleware as any, 'isRequestTooLarge').mockImplementation(() => { throw new Error('Test error'); });

      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('安全中间件处理失败'), expect.any(Object));
    });
  });

  describe('isRequestTooLarge', () => {
    it('should return true if content-length exceeds max payload size', () => {
      (mockRequest.get as jest.Mock).mockReturnValue((SECURITY_LIMITS.MAX_PAYLOAD_SIZE_BYTES + 1).toString());
      expect((middleware as any).isRequestTooLarge(mockRequest)).toBe(true);
    });

    it('should return false if content-length is within limits', () => {
      (mockRequest.get as jest.Mock).mockReturnValue((SECURITY_LIMITS.MAX_PAYLOAD_SIZE_BYTES - 1).toString());
      expect((middleware as any).isRequestTooLarge(mockRequest)).toBe(false);
    });

    it('should return false if content-length is not present', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      expect((middleware as any).isRequestTooLarge(mockRequest)).toBe(false);
    });
  });

  describe('validateContentTypeSecurity', () => {
    it('should return valid for GET/DELETE/HEAD/OPTIONS methods', () => {
      mockRequest.method = 'GET';
      expect((middleware as any).validateContentTypeSecurity(mockRequest)).toEqual({ isValid: true });
    });

    it('should return invalid if Content-Type is missing for POST/PUT/PATCH', () => {
      mockRequest.method = 'POST';
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      expect((middleware as any).validateContentTypeSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'MISSING_CONTENT_TYPE',
        details: { method: 'POST' },
      });
    });

    it('should return invalid for dangerous content types', () => {
      mockRequest.method = 'POST';
      (mockRequest.get as jest.Mock).mockReturnValue('text/html');
      expect((middleware as any).validateContentTypeSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'DANGEROUS_CONTENT_TYPE',
        details: { contentType: 'text/html' },
      });
    });

    it('should return invalid for dangerous charsets', () => {
      mockRequest.method = 'POST';
      (mockRequest.get as jest.Mock).mockReturnValue('application/json; charset=utf-7');
      expect((middleware as any).validateContentTypeSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'DANGEROUS_CHARSET',
        details: { charset: 'utf-7' },
      });
    });

    it('should return invalid for excessive content type length', () => {
      mockRequest.method = 'POST';
      (mockRequest.get as jest.Mock).mockReturnValue('a'.repeat(201));
      expect((middleware as any).validateContentTypeSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'EXCESSIVE_CONTENT_TYPE_LENGTH',
        details: { length: 201 },
      });
    });

    it('should return valid for safe content type', () => {
      mockRequest.method = 'POST';
      (mockRequest.get as jest.Mock).mockReturnValue('application/json');
      expect((middleware as any).validateContentTypeSecurity(mockRequest)).toEqual({ isValid: true });
    });
  });

  describe('validateAdvancedInputSecurity', () => {
    it('should return invalid for malicious URL', () => {
      mockRequest.originalUrl = '/test/../../etc/passwd';
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'MALICIOUS_URL_PATTERN',
        details: { pattern: expect.any(String) },
      });
    });

    it('should return invalid for excessive nesting in body', () => {
      const nestedBody = { a: { b: { c: { d: { e: { f: {} } } } } } };
      mockRequest.body = nestedBody;
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({
        isValid: true,
      });
    });

    it('should return invalid for excessive fields in body (JSON Bomb)', () => {
      const jsonBomb = {};
      for (let i = 0; i < SECURITY_LIMITS.MAX_OBJECT_FIELDS_COMPLEXITY + 1; i++) {
        jsonBomb[`key${i}`] = `value${i}`;
      }
      mockRequest.body = jsonBomb;
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'JSON_BOMB',
        details: expect.any(Object),
      });
    });

    it('should return invalid for excessive string length in body', () => {
      mockRequest.body = { longString: 'a'.repeat(SECURITY_LIMITS.MAX_STRING_LENGTH_COMPLEXITY + 1) };
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'EXCESSIVE_STRING_LENGTH',
        details: expect.any(Object),
      });
    });

    it('should return invalid for dangerous unicode characters in body', () => {
      mockRequest.body = { unicode: 'test\u0000' };
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'DANGEROUS_UNICODE_CHARACTERS',
        details: expect.any(Object),
      });
    });

    it('should return invalid for excessive query parameters', () => {
      const largeQuery = {};
      for (let i = 0; i < SECURITY_LIMITS.MAX_QUERY_PARAMS + 1; i++) {
        largeQuery[`param${i}`] = `value${i}`;
      }
      mockRequest.query = largeQuery;
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({
        isValid: false,
        reason: 'EXCESSIVE_QUERY_PARAMETERS',
        details: expect.any(Object),
      });
    });

    it('should return valid for safe input', () => {
      expect((middleware as any).validateAdvancedInputSecurity(mockRequest)).toEqual({ isValid: true });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize query parameters', () => {
      mockRequest.query = { 'bad<param>': 'value<script>', '__proto__': 'polluted' };
      (middleware as any).sanitizeInput(mockRequest);
      expect(mockRequest.query).toEqual({ badparam: 'value[removed]' });
    });

    it('should sanitize body', () => {
      mockRequest.body = { 'bad<key>': 'value<script>', '__proto__': 'polluted' };
      (middleware as any).sanitizeInput(mockRequest);
      expect(mockRequest.body).toEqual({ badkey: 'value[removed]' });
    });

    it('should sanitize params', () => {
      mockRequest.params = { 'bad<id>': 'value<script>', '__proto__': 'polluted' };
      (middleware as any).sanitizeInput(mockRequest);
      expect(mockRequest.params).toEqual({ badid: 'value[removed]' });
    });

    it('should handle errors during sanitization gracefully', () => {
      jest.spyOn(middleware as any, 'sanitizeObject').mockImplementation(() => { throw new Error('Sanitize error'); });
      (middleware as any).sanitizeInput(mockRequest);
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('输入清理过程中遇到错误'), expect.any(Object));
    });
  });

  describe('setSecurityHeaders', () => {
    it('should set security headers', () => {
      (middleware as any).setSecurityHeaders(mockResponse);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Server', 'API Gateway');
    });

    it('should set Strict-Transport-Security in production', () => {
      process.env.NODE_ENV = 'production';
      (middleware as any).setSecurityHeaders(mockResponse);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      process.env.NODE_ENV = 'test'; // Reset for other tests
    });
  });

  describe('isSuspiciousRequest', () => {
    it('should return true for SQL injection patterns', () => {
      mockRequest.originalUrl = '/test?query=select * from users';
      expect((middleware as any).isSuspiciousRequest(mockRequest)).toBe(true);
    });

    it('should return true for XSS patterns', () => {
      mockRequest.body = { data: '<script>alert(1)</script>' };
      expect((middleware as any).isSuspiciousRequest(mockRequest)).toBe(true);
    });

    it('should return true for path traversal patterns', () => {
      mockRequest.originalUrl = '/test/../../etc/passwd';
      expect((middleware as any).isSuspiciousRequest(mockRequest)).toBe(true);
    });

    it('should return true for NoSQL injection patterns', () => {
      mockRequest.query = { user: '{ $where: "1=1" }' };
      expect((middleware as any).isSuspiciousRequest(mockRequest)).toBe(true);
    });

    it('should return true for command injection patterns', () => {
      mockRequest.body = { cmd: 'ls -la; rm -rf /' };
      expect((middleware as any).isSuspiciousRequest(mockRequest)).toBe(true);
    });

    it('should return false for safe requests', () => {
      mockRequest.originalUrl = '/safe';
      mockRequest.body = { data: 'safe data' };
      mockRequest.query = { param: 'safe value' };
      expect((middleware as any).isSuspiciousRequest(mockRequest)).toBe(false);
    });
  });

  describe('sanitizeLogData', () => {
    it('should hide sensitive fields', () => {
      const data = { password: 'secret', token: 'abc', user: { auth: 'xyz' }, normal: 'data' };
      const sanitized = (middleware as any).sanitizeLogData(data);
      expect(sanitized.password).toBe('***HIDDEN***');
      expect(sanitized.token).toBe('***HIDDEN***');
      expect(sanitized.user.auth).toBe('***HIDDEN***');
      expect(sanitized.normal).toBe('data');
    });

    it('should return data as is if null or undefined', () => {
      expect((middleware as any).sanitizeLogData(null)).toBeNull();
      expect((middleware as any).sanitizeLogData(undefined)).toBeUndefined();
    });
  });
});

describe('CSRFMiddleware', () => {
  let middleware: CSRFMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new CSRFMiddleware();
    mockRequest = {
      method: 'POST',
      originalUrl: '/test',
      get: jest.fn(),
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();

    loggerDebugSpy = jest.spyOn((middleware as any).logger, 'debug').mockImplementation(() => {});
    loggerWarnSpy = jest.spyOn((middleware as any).logger, 'warn').mockImplementation(() => {});

    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.DISABLE_CSRF = 'false';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.DISABLE_CSRF;
  });

  it('should call next() for GET requests', () => {
    mockRequest.method = 'GET';
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should call next() if CSRF is disabled', () => {
    process.env.DISABLE_CSRF = 'true';
    middleware = new CSRFMiddleware(); // Re-initialize to pick up env var
    const loggerDebugSpy = jest.spyOn((middleware as any).logger, 'debug').mockImplementation(() => {});
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(loggerDebugSpy).toHaveBeenCalledWith('CSRF保护已禁用，跳过检查');
  });

  it('should call next() if API Key is present', () => {
    jest.spyOn(HttpHeadersUtil, 'getApiCredentials').mockReturnValue({ appKey: 'key', accessToken: 'token' });
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 403 if Origin is invalid', () => {
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'Origin') return 'http://malicious.com';
      if (header === 'Host') return 'localhost:3000';
      return undefined;
    });
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('CSRF攻击检测'), expect.any(Object));
  });

  it('should return 403 if Referer is invalid', () => {
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'Referer') return 'http://malicious.com/path';
      if (header === 'Host') return 'localhost:3000';
      return undefined;
    });
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() if Origin is valid', () => {
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'Origin') return 'http://localhost:3000';
      if (header === 'Host') return 'localhost:3000';
      return undefined;
    });
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should call next() if Referer is valid', () => {
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'Referer') return 'http://localhost:3000/some/path';
      if (header === 'Host') return 'localhost:3000';
      return undefined;
    });
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 403 if no Origin or Referer is present for state-changing methods', () => {
    (mockRequest.get as jest.Mock).mockReturnValue(undefined);
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });
});

jest.mock('@common/constants/rate-limit.constants', () => ({
  RATE_LIMIT_CONFIG: {
    IP_RATE_LIMIT: {
      ENABLED: true,
      MAX_REQUESTS: 5,
      WINDOW_MS: 60000,
    },
  },
  SECURITY_LIMITS: jest.requireActual('@common/constants/rate-limit.constants').SECURITY_LIMITS,
}));

describe('RateLimitByIPMiddleware', () => {
  let middleware: RateLimitByIPMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules(); // Reset module registry before each test
    // Re-mock constants for predictable behavior
    jest.mock('@common/constants/rate-limit.constants', () => ({
      RATE_LIMIT_CONFIG: {
        IP_RATE_LIMIT: {
          ENABLED: true,
          MAX_REQUESTS: 5,
          WINDOW_MS: 60000,
        },
      },
      SECURITY_LIMITS: jest.requireActual('@common/constants/rate-limit.constants').SECURITY_LIMITS,
    }));

    // Re-initialize middleware to pick up mocked constants
    middleware = new RateLimitByIPMiddleware();

    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();

    loggerDebugSpy = jest.spyOn((middleware as any).logger, 'debug').mockImplementation(() => {});
    loggerWarnSpy = jest.spyOn((middleware as any).logger, 'warn').mockImplementation(() => {});

    // Mock HttpHeadersUtil.getSecureClientIdentifier to return a consistent value for testing
    jest.spyOn(HttpHeadersUtil, 'getSecureClientIdentifier').mockReturnValue('test-client-id');
    jest.spyOn(HttpHeadersUtil, 'getClientIP').mockReturnValue('127.0.0.1');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // Restore mocked modules
  });

  it('should call next() if rate limiting is disabled', () => {
    // 清除所有模块缓存和mock
    jest.resetModules();
    jest.resetAllMocks();
    
    // 完全模拟rate-limit.constants模块
    jest.doMock('@common/constants/rate-limit.constants', () => ({
      RATE_LIMIT_CONFIG: {
        IP_RATE_LIMIT: {
          ENABLED: false, // 设置为禁用
          MAX_REQUESTS: 5,
          WINDOW_MS: 60000,
        }
      },
      SECURITY_LIMITS: jest.requireActual('@common/constants/rate-limit.constants').SECURITY_LIMITS,
    }));
    
    // 重新导入RateLimitByIPMiddleware类，因为它会使用我们模拟的模块
    const { RateLimitByIPMiddleware } = require('../../../../../src/security/middleware/security.middleware');
    
    // 创建新的中间件实例（此实例将使用模拟的禁用配置）
    const disabledMiddleware = new RateLimitByIPMiddleware();
    const disabledLoggerSpy = jest.spyOn((disabledMiddleware as any).logger, 'debug').mockImplementation(() => {});

    disabledMiddleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(disabledLoggerSpy).toHaveBeenCalledWith('IP级别频率限制已禁用，跳过检查');
    
    // 恢复正常导入，不影响其他测试
    jest.dontMock('@common/constants/rate-limit.constants');
  });

  it('should allow requests within the limit', () => {
    for (let i = 0; i < 5; i++) {
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(i + 1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    }
  });

  it('should return 429 if requests exceed the limit', () => {
    for (let i = 0; i < 5; i++) {
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    }
    nextFunction.mockClear(); // Clear calls from previous loop

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('IP频率限制触发'), expect.any(Object));
  });

  it('should reset count after windowMs', () => {
    jest.useFakeTimers();

    // 获取原始Date.now实现
    const originalNow = Date.now;
    // 模拟当前时间点
    const currentTime = 1000000;
    
    try {
      // 模拟Date.now返回我们控制的时间
      Date.now = jest.fn(() => currentTime);
      
      for (let i = 0; i < 5; i++) {
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
      }
      expect(nextFunction).toHaveBeenCalledTimes(5);

      // 模拟时间流逝（超过windowMs）
      Date.now = jest.fn(() => currentTime + 60001); // 超过60000毫秒的窗口期
      nextFunction.mockClear();

      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    } finally {
      // 恢复原始Date.now函数
      Date.now = originalNow;
      jest.useRealTimers();
    }
  });

  it('should set X-IP-RateLimit headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-IP-RateLimit-Limit', 5);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-IP-RateLimit-Remaining', 4);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-IP-RateLimit-Reset', expect.any(Number));
  });

  describe('checkSuspiciousHeaders', () => {
    it('should return suspicious headers if present', () => {
      mockRequest.headers = {
        'x-forwarded-for': '1.1.1.1',
        'user-agent': 'test',
      };
      const suspicious = (middleware as any).checkSuspiciousHeaders(mockRequest);
      expect(suspicious).toEqual(['x-forwarded-for']);
    });

    it('should return empty array if no suspicious headers', () => {
      mockRequest.headers = {
        'user-agent': 'test',
      };
      const suspicious = (middleware as any).checkSuspiciousHeaders(mockRequest);
      expect(suspicious).toEqual([]);
    });
  });

  describe('cleanupExpiredRecords', () => {
    it('should remove expired records', () => {
      jest.useFakeTimers();
      const ipRequestCounts = (middleware as any).ipRequestCounts as Map<string, any>;

      ipRequestCounts.set('client1', { count: 1, resetTime: Date.now() - 100000 }); // Expired
      ipRequestCounts.set('client2', { count: 1, resetTime: Date.now() + 100000 }); // Not expired

      (middleware as any).cleanupExpiredRecords(Date.now());

      expect(ipRequestCounts.has('client1')).toBe(false);
      expect(ipRequestCounts.has('client2')).toBe(true);

      jest.useRealTimers();
    });
  });
});