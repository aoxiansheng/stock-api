import { RateLimitExceptionFilter } from '@auth/filters/rate-limit.filter';
import { ArgumentsHost, HttpStatus, HttpException } from '@nestjs/common';
import { Response, Request } from 'express';
import { createLogger } from '@common/logging/index';
import { HttpHeadersUtil } from '@common/utils/http-headers.util';
import { SecurityExceptionFactory, EnhancedRateLimitException } from '@auth/exceptions/security.exceptions';

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn().mockReturnValue({
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock HttpHeadersUtil
jest.mock('@common/utils/http-headers.util', () => ({
  HttpHeadersUtil: {
    getUserAgent: jest.fn(),
    getHeader: jest.fn(),
  },
}));

describe('RateLimitExceptionFilter', () => {
  let filter: RateLimitExceptionFilter;
  let mockRequest: jest.Mocked<Request>;
  let mockResponse: jest.Mocked<Response>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;

  beforeEach(() => {
    filter = new RateLimitExceptionFilter();
    
    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: {},
    } as any;

    mockResponse = {
      setHeader: jest.fn(),
    } as any;

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should re-throw non-429 exceptions', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      
      expect(() => {
        filter.catch(exception, mockArgumentsHost);
      }).toThrow(exception);
      
      expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
    });

    it('should re-throw already enhanced security exceptions', () => {
      // Create a mock enhanced rate limit exception
      const exception = new EnhancedRateLimitException(
        100, 105, -5, 1234567890, 60
      );
      
      expect(() => {
        filter.catch(exception, mockArgumentsHost);
      }).toThrow(exception);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', 60);
    });

    it('should create and throw enhanced exception for 429 errors', () => {
      const originalException = new HttpException(
        {
          details: {
            limit: 100,
            current: 105,
            remaining: -5,
            resetTime: 1234567890,
            retryAfter: 60,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
      
      // Mock logger and HttpHeadersUtil
      (HttpHeadersUtil.getUserAgent as jest.Mock).mockReturnValue('test-agent');
      (HttpHeadersUtil.getHeader as jest.Mock).mockReturnValue('test-app-key');
      
      expect(() => {
        filter.catch(originalException, mockArgumentsHost);
      }).toThrow(EnhancedRateLimitException);
      
      expect(createLogger('test').warn).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', 60);
    });

    it('should handle exceptions with missing details', () => {
      const originalException = new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS
      );
      
      expect(() => {
        filter.catch(originalException, mockArgumentsHost);
      }).toThrow(EnhancedRateLimitException);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', 0);
    });

    it('should handle errors when setting Retry-After header', () => {
      const exception = new EnhancedRateLimitException(
        100, 105, -5, 1234567890, 60
      );
      
      mockResponse.setHeader.mockImplementation(() => {
        throw new Error('Header set error');
      });
      
      expect(() => {
        filter.catch(exception, mockArgumentsHost);
      }).toThrow(exception);
      
      expect(createLogger('test').debug).toHaveBeenCalled();
    });
  });

  describe('setRetryAfterHeader', () => {
    it('should set Retry-After header when retryAfter is positive', () => {
      const exception = new EnhancedRateLimitException(
        100, 105, -5, 1234567890, 60
      );
      
      (filter as any).setRetryAfterHeader(exception, mockResponse);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', 60);
    });

    it('should not set Retry-After header when retryAfter is zero', () => {
      const exception = new EnhancedRateLimitException(
        100, 105, -5, 1234567890, 0
      );
      
      (filter as any).setRetryAfterHeader(exception, mockResponse);
      
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it('should not set Retry-After header when retryAfter is negative', () => {
      const exception = new EnhancedRateLimitException(
        100, 105, -5, 1234567890, -10
      );
      
      (filter as any).setRetryAfterHeader(exception, mockResponse);
      
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });
  });
});