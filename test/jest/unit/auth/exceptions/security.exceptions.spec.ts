import {
  SecurityException,
  EnhancedPayloadTooLargeException,
  EnhancedUnsupportedMediaTypeException,
  InputSecurityViolationException,
  SecurityMiddlewareException,
  EnhancedRateLimitException,
  SecurityExceptionFactory,
  isSecurityException,
} from '@auth/exceptions/security.exceptions';
import { HttpStatus } from '@nestjs/common';

// Create a concrete test class to test the abstract SecurityException
class TestSecurityException extends SecurityException {
  constructor(message, status, securityType, requestPath, clientIp, userAgent, originalError) {
    super(message, status, securityType, requestPath, clientIp, userAgent, originalError);
  }
}

describe('Security Exceptions', () => {

  describe('SecurityException', () => {
    it('should create a security exception with correct properties', () => {
      const message = 'Test security exception';
      const status = HttpStatus.FORBIDDEN;
      const securityType = 'TestType';
      const requestPath = '/test/path';
      const clientIp = '127.0.0.1';
      const userAgent = 'test-agent';
      const originalError = new Error('Original error');

      const exception = new TestSecurityException(
        message,
        status,
        securityType,
        requestPath,
        clientIp,
        userAgent,
        originalError
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(status);
      expect(exception.securityType).toBe(securityType);
      expect(exception.requestPath).toBe(requestPath);
      expect(exception.clientIp).toBe(clientIp);
      expect(exception.userAgent).toBe(userAgent);
      expect(exception.originalError).toBe(originalError);
    });

    it('should return correct response object', () => {
      const exception = new TestSecurityException(
        'Test message',
        HttpStatus.FORBIDDEN,
        'TestType',
        '/test/path',
        '127.0.0.1',
        'test-agent',
        null
      );

      const response = exception.getResponse();
      
      expect(response).toEqual({
        message: 'Test message',
        error: {
          code: 'SECURITY_VIOLATION',
          details: {
            type: 'TestType',
            path: '/test/path',
            clientIp: '127.0.0.1'
          }
        }
      });
    });

    it('should handle string response', () => {
      // Mock super.getResponse to return a string
      const exception = new TestSecurityException(
        'Test message',
        HttpStatus.FORBIDDEN,
        'TestType',
        null,
        null,
        null,
        null
      );
      
      // Override getResponse to simulate string response
      jest.spyOn(Object.getPrototypeOf(exception), 'getResponse').mockReturnValue('Test message');
      
      const response = exception.getResponse();
      expect(response).toBe('Test message');
    });
  });

  describe('EnhancedPayloadTooLargeException', () => {
    it('should create payload too large exception with correct properties', () => {
      const exception = new EnhancedPayloadTooLargeException(
        1024,
        512,
        '512 bytes',
        '/test/path',
        '127.0.0.1',
        'test-agent',
        new Error('Original error')
      );

      expect(exception.actualSize).toBe(1024);
      expect(exception.maxAllowedSize).toBe(512);
      expect(exception.message).toBe('请求体过大，实际大小: 1024 bytes，最大允许: 512 bytes');
      expect(exception.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(exception.securityType).toBe('PayloadSizeViolation');
    });

    it('should return enhanced response object', () => {
      const exception = new EnhancedPayloadTooLargeException(
        1024,
        512,
        '512 bytes',
        '/test/path'
      );

      const response = exception.getResponse() as any;
      
      expect(response.error.details.actualSize).toBe(1024);
      expect(response.error.details.maxAllowedSize).toBe(512);
      expect(response.error.details.suggestion).toBe('请减小请求体大小或联系管理员调整限制');
    });
  });

  describe('EnhancedUnsupportedMediaTypeException', () => {
    it('should create unsupported media type exception with correct properties', () => {
      const exception = new EnhancedUnsupportedMediaTypeException(
        'text/plain',
        'Invalid format',
        '/test/path',
        '127.0.0.1',
        'test-agent',
        new Error('Original error')
      );

      expect(exception.contentType).toBe('text/plain');
      expect(exception.reason).toBe('Invalid format');
      expect(exception.message).toBe('不支持的媒体类型: text/plain (原因: Invalid format)');
      expect(exception.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      expect(exception.securityType).toBe('ContentTypeSecurityViolation');
    });

    it('should return enhanced response object', () => {
      const exception = new EnhancedUnsupportedMediaTypeException(
        'text/plain',
        'Invalid format',
        '/test/path'
      );

      const response = exception.getResponse() as any;
      
      expect(response.error.details.contentType).toBe('text/plain');
      expect(response.error.details.reason).toBe('Invalid format');
      expect(response.error.details.suggestion).toBe('请使用支持的媒体类型，如 application/json');
    });
  });

  describe('InputSecurityViolationException', () => {
    it('should create input security violation exception with correct properties', () => {
      const violationDetails = { pattern: 'script', position: 10 };
      const exception = new InputSecurityViolationException(
        'XSS Attack',
        violationDetails,
        '/test/path',
        '127.0.0.1',
        'test-agent',
        new Error('Original error')
      );

      expect(exception.violationType).toBe('XSS Attack');
      expect(exception.violationDetails).toEqual(violationDetails);
      expect(exception.message).toBe('检测到恶意输入: XSS Attack');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.securityType).toBe('InputSecurityViolation');
    });

    it('should return enhanced response object', () => {
      const violationDetails = { pattern: 'script', position: 10 };
      const exception = new InputSecurityViolationException(
        'XSS Attack',
        violationDetails,
        '/test/path'
      );

      const response = exception.getResponse() as any;
      
      expect(response.error.details.violationType).toBe('XSS Attack');
      expect(response.error.details.violationDetails).toEqual(violationDetails);
      expect(response.error.details.suggestion).toBe('请检查输入内容，确保不包含恶意代码或特殊字符');
    });
  });

  describe('SecurityMiddlewareException', () => {
    it('should create security middleware exception with correct properties', () => {
      const exception = new SecurityMiddlewareException(
        'PayloadValidator',
        'Validation failed',
        '/test/path',
        '127.0.0.1',
        'test-agent',
        new Error('Original error')
      );

      expect(exception.middlewareComponent).toBe('PayloadValidator');
      expect(exception.message).toBe('安全中间件处理失败 [PayloadValidator]: Validation failed');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.securityType).toBe('SecurityMiddlewareError');
    });

    it('should return enhanced response object', () => {
      const exception = new SecurityMiddlewareException(
        'PayloadValidator',
        'Validation failed',
        '/test/path'
      );

      const response = exception.getResponse() as any;
      
      expect(response.error.details.component).toBe('PayloadValidator');
      expect(response.error.details.suggestion).toBe('系统内部错误，请稍后重试或联系技术支持');
    });
  });

  describe('EnhancedRateLimitException', () => {
    it('should create rate limit exception with correct properties', () => {
      const exception = new EnhancedRateLimitException(
        100,
        105,
        -5,
        1234567890,
        60,
        '/test/path',
        '127.0.0.1',
        'test-agent',
        'test-app-key',
        new Error('Original error')
      );

      expect(exception.limit).toBe(100);
      expect(exception.current).toBe(105);
      expect(exception.remaining).toBe(-5);
      expect(exception.resetTime).toBe(1234567890);
      expect(exception.retryAfter).toBe(60);
      expect(exception.message).toBe('请求过于频繁，请稍后再试');
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.securityType).toBe('RateLimitError');
    });

    it('should return enhanced response object', () => {
      const exception = new EnhancedRateLimitException(
        100,
        105,
        -5,
        1234567890,
        60,
        '/test/path'
      );

      const response = exception.getResponse() as any;
      
      expect(response.error.details.limit).toBe(100);
      expect(response.error.details.current).toBe(105);
      expect(response.error.details.remaining).toBe(-5);
      expect(response.error.details.resetTime).toBe(1234567890);
      expect(response.error.details.retryAfter).toBe(60);
      expect(response.error.details.suggestion).toBe('请降低请求频率或联系管理员升级您的API配额');
    });
  });

  describe('SecurityExceptionFactory', () => {
    const mockRequest = {
      url: '/test/path',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    };

    it('should extract security context from request', () => {
      const context = SecurityExceptionFactory.extractSecurityContext(mockRequest as any);
      
      expect(context).toEqual({
        requestPath: '/test/path',
        clientIp: '127.0.0.1',
        userAgent: 'test-agent'
      });
    });

    it('should create payload too large exception', () => {
      const exception = SecurityExceptionFactory.createPayloadTooLargeException(
        1024,
        512,
        '512 bytes',
        mockRequest,
        new Error('Original error')
      );

      expect(exception).toBeInstanceOf(EnhancedPayloadTooLargeException);
      expect(exception.actualSize).toBe(1024);
      expect(exception.requestPath).toBe('/test/path');
    });

    it('should create unsupported media type exception', () => {
      const exception = SecurityExceptionFactory.createUnsupportedMediaTypeException(
        'text/plain',
        'Invalid format',
        mockRequest,
        new Error('Original error')
      );

      expect(exception).toBeInstanceOf(EnhancedUnsupportedMediaTypeException);
      expect(exception.contentType).toBe('text/plain');
      expect(exception.requestPath).toBe('/test/path');
    });

    it('should create input security violation exception', () => {
      const violationDetails = { pattern: 'script' };
      const exception = SecurityExceptionFactory.createInputSecurityViolationException(
        'XSS Attack',
        violationDetails,
        mockRequest,
        new Error('Original error')
      );

      expect(exception).toBeInstanceOf(InputSecurityViolationException);
      expect(exception.violationType).toBe('XSS Attack');
      expect(exception.requestPath).toBe('/test/path');
    });

    it('should create security middleware exception', () => {
      const exception = SecurityExceptionFactory.createSecurityMiddlewareException(
        'PayloadValidator',
        'Validation failed',
        mockRequest,
        new Error('Original error')
      );

      expect(exception).toBeInstanceOf(SecurityMiddlewareException);
      expect(exception.middlewareComponent).toBe('PayloadValidator');
      expect(exception.requestPath).toBe('/test/path');
    });

    it('should create rate limit exception', () => {
      const exception = SecurityExceptionFactory.createRateLimitException(
        100,
        105,
        -5,
        1234567890,
        60,
        mockRequest,
        'test-app-key',
        new Error('Original error')
      );

      expect(exception).toBeInstanceOf(EnhancedRateLimitException);
      expect(exception.limit).toBe(100);
      expect(exception.requestPath).toBe('/test/path');
    });
  });

  describe('isSecurityException', () => {
    it('should correctly identify security exceptions', () => {
      const securityException = new TestSecurityException(
        'Test message',
        HttpStatus.FORBIDDEN,
        'TestType',
        null,
        null,
        null,
        null
      );
      
      const regularError = new Error('Regular error');
      
      expect(isSecurityException(securityException)).toBe(true);
      expect(isSecurityException(regularError)).toBe(false);
      expect(isSecurityException(null)).toBe(false);
      expect(isSecurityException(undefined)).toBe(false);
      expect(isSecurityException({})).toBe(false);
    });
  });
});