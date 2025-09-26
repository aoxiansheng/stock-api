import { Request, Response } from 'express';
import { HttpHeadersUtil } from '@common/utils/http-headers.util';

describe('HttpHeadersUtil', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      connection: { remoteAddress: '192.168.1.1' } as any,
      socket: { remoteAddress: '192.168.1.1' } as any,
      get: jest.fn(),
    };

    mockResponse = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.TRUSTED_PROXY;
    delete process.env.TRUSTED_PROXY_IPS;
    delete process.env.ALLOW_PROXY_HEADERS_IN_TEST;
  });

  describe('getHeader', () => {
    it('should get header using req.get() method when available', () => {
      const mockGet = jest.fn().mockReturnValue('test-value');
      mockRequest.get = mockGet;

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'test-header');

      expect(mockGet).toHaveBeenCalledWith('test-header');
      expect(result).toBe('test-value');
    });

    it('should fallback to direct headers access when req.get() is not available', () => {
      mockRequest.get = undefined;
      mockRequest.headers = { 'test-header': 'direct-value' };

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'test-header');

      expect(result).toBe('direct-value');
    });

    it('should handle case-insensitive header names', () => {
      mockRequest.get = undefined;
      mockRequest.headers = { 'Content-Type': 'application/json' };

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'content-type');

      expect(result).toBe('application/json');
    });

    it('should return first non-empty value from array headers', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.headers = { 'test-header': ['', 'second-value', 'third-value'] };

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'test-header');

      expect(result).toBe('second-value');
    });

    it('should return undefined for missing headers', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.headers = {};

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'missing-header');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string headers', () => {
      mockRequest.get = jest.fn().mockReturnValue('');

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'empty-header');

      expect(result).toBeUndefined();
    });

    it('should handle non-string header values', () => {
      mockRequest.get = jest.fn().mockReturnValue(123);

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'numeric-header');

      expect(result).toBeUndefined();
    });

    it('should handle missing headers object', () => {
      mockRequest.get = undefined;
      mockRequest.headers = undefined;

      const result = HttpHeadersUtil.getHeader(mockRequest as Request, 'test-header');

      expect(result).toBeUndefined();
    });
  });

  describe('getRequiredHeader', () => {
    it('should return header value when present', () => {
      mockRequest.get = jest.fn().mockReturnValue('required-value');

      const result = HttpHeadersUtil.getRequiredHeader(mockRequest as Request, 'required-header');

      expect(result).toBe('required-value');
    });

    it('should throw error when header is missing', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      expect(() => {
        HttpHeadersUtil.getRequiredHeader(mockRequest as Request, 'missing-header');
      }).toThrow('Missing required header: missing-header');
    });

    it('should throw custom error message', () => {
      mockRequest.get = jest.fn().mockReturnValue('');

      expect(() => {
        HttpHeadersUtil.getRequiredHeader(mockRequest as Request, 'empty-header', 'Custom error');
      }).toThrow('Custom error');
    });

    it('should throw error for empty string header', () => {
      mockRequest.get = jest.fn().mockReturnValue('');

      expect(() => {
        HttpHeadersUtil.getRequiredHeader(mockRequest as Request, 'empty-header');
      }).toThrow('Missing required header: empty-header');
    });
  });

  describe('getMultipleHeaders', () => {
    it('should return array of string values', () => {
      mockRequest.headers = { 'multi-header': ['value1', 'value2', 'value3'] };

      const result = HttpHeadersUtil.getMultipleHeaders(mockRequest as Request, 'multi-header');

      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should filter out empty values', () => {
      mockRequest.headers = { 'multi-header': ['value1', '', '   ', 'value2'] };

      const result = HttpHeadersUtil.getMultipleHeaders(mockRequest as Request, 'multi-header');

      expect(result).toEqual(['value1', 'value2']);
    });

    it('should handle single string value', () => {
      mockRequest.headers = { 'single-header': 'single-value' };

      const result = HttpHeadersUtil.getMultipleHeaders(mockRequest as Request, 'single-header');

      expect(result).toEqual(['single-value']);
    });

    it('should return empty array for missing header', () => {
      mockRequest.headers = {};

      const result = HttpHeadersUtil.getMultipleHeaders(mockRequest as Request, 'missing-header');

      expect(result).toEqual([]);
    });

    it('should trim string values', () => {
      mockRequest.headers = { 'trimmed-header': '  spaced-value  ' };

      const result = HttpHeadersUtil.getMultipleHeaders(mockRequest as Request, 'trimmed-header');

      expect(result).toEqual(['spaced-value']);
    });
  });

  describe('getClientIP', () => {
    it('should return IP from x-forwarded-for header', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '203.0.113.1, 198.51.100.1';
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('203.0.113.1');
    });

    it('should try multiple headers in priority order', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-real-ip') return '203.0.113.2';
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('203.0.113.2');
    });

    it('should fallback to connection remote address', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = { remoteAddress: '192.168.1.100' } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('192.168.1.100');
    });

    it('should fallback to socket remote address', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = undefined;
      mockRequest.socket = { remoteAddress: '10.0.0.1' } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('10.0.0.1');
    });

    it('should return "unknown" when no IP is available', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = undefined;
      mockRequest.socket = undefined;
      (mockRequest as any).ip = undefined;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('unknown');
    });

    it('should validate IP format', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return 'invalid-ip-format';
        if (header === 'x-real-ip') return '192.168.1.50';
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('192.168.1.50');
    });
  });

  describe('getSecureClientIdentifier', () => {
    it('should return identifier with real IP in untrusted environment', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.connection = { remoteAddress: '192.168.1.1' } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0 Test Browser';
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest as Request);

      expect(result).toMatch(/^192\.168\.1\.1:[a-z0-9]+$/);
    });

    it('should use forwarded IP in trusted production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUSTED_PROXY = 'true';
      process.env.TRUSTED_PROXY_IPS = '192.168.1';

      mockRequest.connection = { remoteAddress: '192.168.1.100' } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '203.0.113.1';
        if (header === 'user-agent') return 'Test Browser';
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest as Request);

      expect(result).toMatch(/^203\.0\.113\.1:[a-z0-9]+$/);
    });

    it('should use forwarded IP in test environment with proxy headers enabled', () => {
      process.env.NODE_ENV = 'test';
      process.env.ALLOW_PROXY_HEADERS_IN_TEST = 'true';
      process.env.TRUSTED_PROXY_IPS = '192.168.1';

      mockRequest.connection = { remoteAddress: '192.168.1.100' } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '203.0.113.5';
        if (header === 'user-agent') return 'Test Agent';
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest as Request);

      expect(result).toMatch(/^203\.0\.113\.5:[a-z0-9]+$/);
    });

    it('should not trust forwarded IP from untrusted proxy', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUSTED_PROXY = 'true';
      process.env.TRUSTED_PROXY_IPS = '10.0.0';

      mockRequest.connection = { remoteAddress: '192.168.1.100' } as any; // Not in trusted range
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '203.0.113.1';
        if (header === 'user-agent') return 'Test Browser';
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest as Request);

      expect(result).toMatch(/^192\.168\.1\.100:[a-z0-9]+$/); // Uses real IP, not forwarded
    });

    it('should handle missing user agent', () => {
      mockRequest.connection = { remoteAddress: '192.168.1.1' } as any;
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest as Request);

      expect(result).toMatch(/^192\.168\.1\.1:[a-z0-9]+$/);
    });
  });

  describe('getApiCredentials', () => {
    it('should extract API credentials from headers', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-app-key') return 'test-app-key';
        if (header === 'x-access-token') return 'test-access-token';
        return undefined;
      });

      const result = HttpHeadersUtil.getApiCredentials(mockRequest as Request);

      expect(result).toEqual({
        appKey: 'test-app-key',
        accessToken: 'test-access-token',
      });
    });

    it('should handle missing credentials', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getApiCredentials(mockRequest as Request);

      expect(result).toEqual({
        appKey: undefined,
        accessToken: undefined,
      });
    });
  });

  describe('validateApiCredentials', () => {
    it('should return valid credentials', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-app-key') return 'valid-app-key';
        if (header === 'x-access-token') return 'valid-access-token';
        return undefined;
      });

      const result = HttpHeadersUtil.validateApiCredentials(mockRequest as Request);

      expect(result).toEqual({
        appKey: 'valid-app-key',
        accessToken: 'valid-access-token',
      });
    });

    it('should throw error for missing app key', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-access-token') return 'valid-access-token';
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow('缺少API凭证');
    });

    it('should throw error for missing access token', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-app-key') return 'valid-app-key';
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow('缺少API凭证');
    });

    it('should throw error for app key with whitespace', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-app-key') return 'invalid app key';
        if (header === 'x-access-token') return 'valid-access-token';
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow('API凭证格式无效：App Key包含空格或无效字符');
    });

    it('should throw error for access token with whitespace', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-app-key') return 'valid-app-key';
        if (header === 'x-access-token') return 'invalid\ttoken';
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow('API凭证格式无效：Access Token包含空格或无效字符');
    });

    it('should handle various whitespace characters', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-app-key') return 'key\nwith\nnewlines';
        if (header === 'x-access-token') return 'valid-token';
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow('API凭证格式无效：App Key包含空格或无效字符');
    });
  });

  describe('getUserAgent', () => {
    it('should return user agent from header', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0 Custom Browser';
        return undefined;
      });

      const result = HttpHeadersUtil.getUserAgent(mockRequest as Request);

      expect(result).toBe('Mozilla/5.0 Custom Browser');
    });

    it('should return "Unknown" for missing user agent', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getUserAgent(mockRequest as Request);

      expect(result).toBe('Unknown');
    });
  });

  describe('getContentType', () => {
    it('should return content type', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'content-type') return 'application/json';
        return undefined;
      });

      const result = HttpHeadersUtil.getContentType(mockRequest as Request);

      expect(result).toBe('application/json');
    });

    it('should return undefined for missing content type', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getContentType(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe('isJsonContent', () => {
    it('should identify JSON content type', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'content-type') return 'application/json; charset=utf-8';
        return undefined;
      });

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(true);
    });

    it('should return false for non-JSON content', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'content-type') return 'text/html';
        return undefined;
      });

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(false);
    });

    it('should return false for missing content type', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(false);
    });
  });

  describe('getAuthorization', () => {
    it('should return authorization header', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'authorization') return 'Bearer token123';
        return undefined;
      });

      const result = HttpHeadersUtil.getAuthorization(mockRequest as Request);

      expect(result).toBe('Bearer token123');
    });
  });

  describe('getBearerToken', () => {
    it('should extract bearer token', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'authorization') return 'Bearer abc123def456';
        return undefined;
      });

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBe('abc123def456');
    });

    it('should return undefined for non-bearer authorization', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'authorization') return 'Basic dXNlcjpwYXNz';
        return undefined;
      });

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it('should trim bearer token', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'authorization') return 'Bearer   spaced-token   ';
        return undefined;
      });

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBe('spaced-token');
    });
  });

  describe('getSafeHeaders', () => {
    it('should filter sensitive headers', () => {
      mockRequest.headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer secret-token',
        'x-access-token': 'secret-access',
        'user-agent': 'Test Browser',
        'cookie': 'session=secret',
      };

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest as Request);

      expect(result).toEqual({
        'content-type': 'application/json',
        'authorization': '[FILTERED]',
        'x-access-token': '[FILTERED]',
        'user-agent': 'Test Browser',
        'cookie': '[FILTERED]',
      });
    });

    it('should handle case-insensitive sensitive headers', () => {
      mockRequest.headers = {
        'Authorization': 'Bearer secret',
        'X-API-Key': 'secret-key',
        'Set-Cookie': 'session=value',
      };

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest as Request);

      expect(result['Authorization']).toBe('[FILTERED]');
      expect(result['X-API-Key']).toBe('[FILTERED]');
      expect(result['Set-Cookie']).toBe('[FILTERED]');
    });
  });

  describe('setSecurityHeaders', () => {
    it('should set all security headers in production', () => {
      process.env.NODE_ENV = 'production';

      HttpHeadersUtil.setSecurityHeaders(mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Server', 'API Gateway');
    });

    it('should skip HSTS header in non-production', () => {
      process.env.NODE_ENV = 'development';

      HttpHeadersUtil.setSecurityHeaders(mockResponse as Response);

      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
    });

    it('should set all other security headers regardless of environment', () => {
      process.env.NODE_ENV = 'test';

      HttpHeadersUtil.setSecurityHeaders(mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Download-Options', 'noopen');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'none');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );
    });
  });

  describe('getContentLength', () => {
    it('should return content length header', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'content-length') return '1024';
        return undefined;
      });

      const result = HttpHeadersUtil.getContentLength(mockRequest as Request);

      expect(result).toBe('1024');
    });

    it('should return undefined for missing content length', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getContentLength(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle request without headers object', () => {
      const emptyRequest = {} as Request;

      expect(() => {
        HttpHeadersUtil.getHeader(emptyRequest, 'test');
      }).not.toThrow();

      expect(HttpHeadersUtil.getHeader(emptyRequest, 'test')).toBeUndefined();
    });

    it('should handle malformed IP addresses in forwarded headers', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return 'not.an.ip.address';
        if (header === 'x-real-ip') return '999.999.999.999';
        return undefined;
      });
      mockRequest.connection = { remoteAddress: '192.168.1.1' } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('192.168.1.1');
    });

    it('should handle special IP addresses', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '::1';
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('::1');
    });

    it('should handle localhost IP', () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'x-forwarded-for') return 'localhost';
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe('localhost');
    });
  });
});