import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../../../../../src/common/filters/global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockLogger: jest.Mocked<Logger>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockHttpArgumentsHost: any;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
      setHeader: jest.fn(),
    };

    mockRequest = {
      url: '/api/v1/test',
      method: 'POST',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Test Agent',
        'x-request-id': 'req-123',
      },
      user: {
        id: 'user-123',
        username: 'testuser',
      },
      body: {
        testData: 'value',
      },
    };

    mockHttpArgumentsHost = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };

    filter = new GlobalExceptionFilter();
    // Replace the logger with our mock
    (filter as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException properly', () => {
      const httpException = new HttpException(
        {
          statusCode: 400,
          message: '参数验证失败',
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: '参数验证失败',
        data: null,
        timestamp: expect.any(String),
        error: {
          code: 'BAD_REQUEST',
          details: {
            type: 'Bad Request',
            path: '/api/v1/test',
            requestId: 'req-123',
          },
        },
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle HttpException with string message', () => {
      const httpException = new HttpException('简单错误信息', HttpStatus.UNAUTHORIZED);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        message: '未授权访问',
        data: null,
        timestamp: expect.any(String),
        error: {
          code: 'UNAUTHORIZED',
          details: {
            type: 'AuthenticationError',
            path: '/api/v1/test',
            requestId: 'req-123',
          },
        },
      });
    });

    it('should handle ValidationPipe errors', () => {
      const validationException = new HttpException(
        {
          statusCode: 400,
          message: [
            'username should not be empty',
            'email must be a valid email',
          ],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(validationException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: '验证失败: username should not be empty, email must be a valid email',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'VALIDATION_ERROR',
            details: {
              type: 'ValidationError',
              fields: [
                { field: 'unknown', message: 'username should not be empty' },
                { field: 'unknown', message: 'email must be a valid email' },
              ],
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should handle generic Error with proper fallback', () => {
      const genericError = new Error('数据库连接失败');

      filter.catch(genericError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: '数据库连接失败', // 开发环境显示原始错误消息
        data: null,
        timestamp: expect.any(String),
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          details: {
            type: 'InternalServerError',
            path: '/api/v1/test',
            requestId: 'req-123',
          },
        },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('未知异常'),
        expect.any(Object)
      );
    });

    it('should handle unknown error types', () => {
      const unknownError = 'string error';

      filter.catch(unknownError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: '服务器内部错误',
        data: null,
        timestamp: expect.any(String),
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          details: {
            type: 'UnknownError',
            path: '/api/v1/test',
            requestId: 'req-123',
          },
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle null/undefined errors', () => {
      filter.catch(null as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: '服务器内部错误',
        data: null,
        timestamp: expect.any(String),
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          details: {
            type: 'UnknownError',
            path: '/api/v1/test',
            requestId: 'req-123',
          },
        },
      });
    });

    it('should handle MongoDB duplicate key error', () => {
      const mongoError = {
        name: 'MongoError',
        code: 11000,
        message: 'E11000 duplicate key error',
        keyPattern: { username: 1 },
        keyValue: { username: 'testuser' },
      };

      filter.catch(mongoError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: '数据已存在，无法重复创建',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'RESOURCE_CONFLICT',
            details: {
              type: 'DatabaseError',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should handle JWT token errors', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid token',
      };

      filter.catch(jwtError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'token无效',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'INVALID_TOKEN',
            details: {
              type: 'AuthenticationError',
              tokenType: 'JWT',
              errorName: 'JsonWebTokenError',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should handle JWT token expired errors', () => {
      const jwtExpiredError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt: new Date(),
      };

      filter.catch(jwtExpiredError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'token已过期',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'TOKEN_EXPIRED',
            details: {
              type: 'AuthenticationError',
              tokenType: 'JWT',
              errorName: 'TokenExpiredError',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should handle rate limiting errors', () => {
      const rateLimitError = new HttpException(
        {
          statusCode: 429,
          message: 'Too Many Requests',
          error: 'Rate Limit Exceeded',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );

      filter.catch(rateLimitError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          message: '请求频率超出限制',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              type: 'Rate Limit Exceeded',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should include request details in error log', () => {
      const error = new Error('Test error for logging');

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/v1/test - 500'),
        expect.objectContaining({
          message: 'Test error for logging',
          statusCode: 500,
          error: 'InternalServerError',
        })
      );
    });

    it('should handle errors without request context', () => {
      const mockArgsHostWithoutRequest = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getType: jest.fn().mockReturnValue('http'),
      } as any;

      const error = new Error('No request context');

      filter.catch(error, mockArgsHostWithoutRequest);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'No request context',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            details: {
              type: 'InternalServerError',
            },
          },
        })
      );
    });

    it('should handle errors with sensitive data filtering', () => {
      const requestWithSensitiveData = {
        ...mockRequest,
        body: {
          password: 'secret123',
          apiKey: 'sk-1234567890',
          normalData: 'safe',
        },
        headers: {
          ...mockRequest.headers,
          authorization: 'Bearer token123',
        },
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(requestWithSensitiveData);

      const error = new Error('Error with sensitive data');

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalled();
      const logCall = JSON.stringify(mockLogger.error.mock.calls[0]);

      // Should not contain sensitive data in logs
      expect(logCall).not.toContain('secret123');
      expect(logCall).not.toContain('sk-1234567890');
      expect(logCall).not.toContain('Bearer token123');
    });

    it('should preserve error stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');
      error.stack = 'Error: Development error\n    at Test.spec.ts:123:45';

      filter.catch(error, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/v1/test - 500'),
        expect.objectContaining({
          message: 'Development error',
          statusCode: 500,
          error: 'InternalServerError',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle circular reference in error objects', () => {
      const circularError: any = new Error('Circular reference error');
      circularError.self = circularError;

      filter.catch(circularError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle database connection errors', () => {
      const dbError = {
        name: 'MongoNetworkError',
        message: 'Connection failed',
        code: 'ECONNREFUSED',
      };

      filter.catch(dbError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: '数据库服务暂时不可用，请稍后重试',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'SERVICE_UNAVAILABLE',
            details: {
              type: 'DatabaseConnectionError',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        name: 'TimeoutError',
        message: 'Request timeout',
        code: 'ETIMEDOUT',
      };

      filter.catch(timeoutError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(408);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 408,
          message: '请求超时，请稍后重试',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'REQUEST_TIMEOUT',
            details: {
              type: 'TimeoutError',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });

    it('should include correlation ID if present', () => {
      const requestWithCorrelationId = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          'x-correlation-id': 'corr-123',
        },
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(requestWithCorrelationId);

      const error = new Error('Error with correlation ID');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            details: expect.objectContaining({
              correlationId: 'corr-123',
            }),
          },
        })
      );
    });

    it('should handle errors during response writing', () => {
      mockResponse.json.mockImplementation(() => {
        throw new Error('Response write failed');
      });

      const originalError = new Error('Original error');

      // Should not throw, but should log the secondary error
      expect(() => {
        filter.catch(originalError, mockArgumentsHost);
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should format timestamp correctly', () => {
      const error = new Error('Timestamp test');

      filter.catch(error, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach(method => {
        const requestWithMethod = { ...mockRequest, method };
        mockHttpArgumentsHost.getRequest.mockReturnValue(requestWithMethod);

        const error = new Error(`${method} error`);
        filter.catch(error, mockArgumentsHost);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining(`${method} /api/v1/test - 500`),
          expect.objectContaining({
            message: `${method} error`,
            statusCode: 500,
            error: 'InternalServerError',
          })
        );
      });
    });

    it('should handle errors with custom error codes', () => {
      const customError = {
        name: 'CustomBusinessError',
        code: 'BUSINESS_RULE_VIOLATION',
        message: '业务规则违反',
        statusCode: 422,
      };

      filter.catch(customError as any, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: '业务规则违反',
          data: null,
          timestamp: expect.any(String),
          error: {
            code: 'UNKNOWN_ERROR',
            details: {
              type: 'CustomBusinessError',
              path: '/api/v1/test',
              requestId: 'req-123',
            },
          },
        })
      );
    });
  });
});