
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from '../../../../../../src/common/core/filters/global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: jest.Mocked<Request> & { user?: any; apiKey?: any };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    } as any;

    mockRequest = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test User Agent',
        'x-request-id': 'test-request-id',
        'x-correlation-id': 'test-correlation-id',
      },
    } as any;

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;

    // Mock console methods to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('HTTP Exceptions', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Test error message', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Test error message',
          data: null,
          timestamp: expect.any(String),
          error: expect.objectContaining({
            code: 'BAD_REQUEST',
            details: expect.objectContaining({
              type: 'HttpException',
              path: '/api/test',
              correlationId: 'test-correlation-id',
              requestId: 'test-request-id',
            }),
          }),
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exceptionResponse = {
        message: 'Validation failed',
        error: 'Bad Request',
      };
      const exception = new HttpException(exceptionResponse, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          error: expect.objectContaining({
            code: 'BAD_REQUEST',
            details: expect.objectContaining({
              type: 'Bad Request',
            }),
          }),
        }),
      );
    });

    it('should handle UnauthorizedException', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: '未授权访问',
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            details: expect.objectContaining({
              type: 'AuthenticationError',
            }),
          }),
        }),
      );
    });

    it('should handle ForbiddenException', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: '访问被禁止',
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            details: expect.objectContaining({
              type: 'ForbiddenException',
            }),
          }),
        }),
      );
    });

    it('should handle validation errors in HttpException', () => {
      const validationMessages = ['Field1 is required', 'Field2 must be a number'];
      const exceptionResponse = {
        message: validationMessages,
        error: 'Bad Request',
      };
      const exception = new HttpException(exceptionResponse, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: '验证失败:Field1 is required, Field2 must be a number',
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.objectContaining({
              type: 'ValidationError',
              fields: expect.any(Array),
            }),
          }),
        }),
      );
    });
  });

  describe('Validation Errors', () => {
    it('should handle ValidationError array', () => {
      const validationErrors: ValidationError[] = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
            isNotEmpty: 'email should not be empty',
          },
          children: [],
        } as ValidationError,
        {
          property: 'age',
          constraints: {
            isNumber: 'age must be a number',
          },
          children: [],
        } as ValidationError,
      ];

      filter.catch(validationErrors, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.any(String),
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.objectContaining({
              type: 'ValidationError',
              fields: expect.arrayContaining([
                expect.objectContaining({
                  field: 'email',
                  code: 'isEmail',
                  message: expect.any(String),
                }),
                expect.objectContaining({
                  field: 'age',
                  code: 'isNumber',
                  message: expect.any(String),
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should handle empty ValidationError array', () => {
      const validationErrors: ValidationError[] = [];

      filter.catch(validationErrors, mockArgumentsHost);

      // Should not be treated as validation error
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle nested ValidationError', () => {
      const nestedValidationError: ValidationError = {
        property: 'address',
        constraints: {},
        children: [
          {
            property: 'street',
            constraints: {
              isNotEmpty: 'street should not be empty',
            },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError;

      filter.catch([nestedValidationError], mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({
                  field: 'address.street',
                  code: 'isNotEmpty',
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('MongoDB Errors', () => {
    it('should handle duplicate key error (code 11000)', () => {
      const mongoError = {
        name: 'MongoError',
        code: 11000,
        message: 'Duplicate key error',
      };

      filter.catch(mongoError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: '数据已存在，无法重复创建',
          error: expect.objectContaining({
            code: 'RESOURCE_CONFLICT',
            details: expect.objectContaining({
              type: 'DatabaseError',
            }),
          }),
        }),
      );
    });

    it('should handle other MongoDB errors', () => {
      const mongoError = {
        name: 'MongoError',
        code: 121,
        message: 'Document validation failed',
      };

      filter.catch(mongoError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            details: expect.objectContaining({
              type: 'DatabaseError',
            }),
          }),
        }),
      );
    });
  });

  describe('JWT Errors', () => {
    it('should handle JsonWebTokenError', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid signature',
      };

      filter.catch(jwtError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'token无效',
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            details: expect.objectContaining({
              type: 'AuthenticationError',
              tokenType: 'JWT',
              errorName: 'JsonWebTokenError',
            }),
          }),
        }),
      );
    });

    it('should handle TokenExpiredError', () => {
      const jwtError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt: new Date(),
      };

      filter.catch(jwtError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'token已过期',
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
            details: expect.objectContaining({
              type: 'AuthenticationError',
              tokenType: 'JWT',
              errorName: 'TokenExpiredError',
            }),
          }),
        }),
      );
    });

    it('should handle NotBeforeError', () => {
      const jwtError = {
        name: 'NotBeforeError',
        message: 'jwt not active',
        date: new Date(),
      };

      filter.catch(jwtError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'token尚未生效',
          error: expect.objectContaining({
            code: 'TOKEN_NOT_ACTIVE',
            details: expect.objectContaining({
              type: 'AuthenticationError',
              tokenType: 'JWT',
              errorName: 'NotBeforeError',
            }),
          }),
        }),
      );
    });
  });

  describe('Database Connection Errors', () => {
    it('should handle ECONNREFUSED', () => {
      const connError = {
        name: 'Error',
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      filter.catch(connError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: '数据库服务暂时不可用，请稍后重试',
          error: expect.objectContaining({
            code: 'SERVICE_UNAVAILABLE',
            details: expect.objectContaining({
              type: 'DatabaseConnectionError',
            }),
          }),
        }),
      );
    });

    it('should handle connection timeout', () => {
      const timeoutError = {
        name: 'Error',
        code: 'ETIMEDOUT',
        message: 'Connection timeout',
      };

      filter.catch(timeoutError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(408);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 408,
          message: '请求超时，请稍后重试',
          error: expect.objectContaining({
            code: 'REQUEST_TIMEOUT',
            details: expect.objectContaining({
              type: 'TimeoutError',
            }),
          }),
        }),
      );
    });
  });

  describe('JSON Parsing Errors', () => {
    it('should handle JSON syntax error', () => {
      const jsonError = new SyntaxError('Unexpected token } in JSON at position 10');
      jsonError.name = 'SyntaxError';

      filter.catch(jsonError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'JSON格式错误',
          error: expect.objectContaining({
            code: 'BAD_REQUEST',
            details: expect.objectContaining({
              type: 'InvalidJSON',
              originalMessage: 'Unexpected token } in JSON at position 10',
              position: 10,
            }),
          }),
        }),
      );
    });
  });

  describe('Custom Status Code Errors', () => {
    it('should handle custom error with statusCode', () => {
      const customError = {
        statusCode: 422,
        name: 'CustomValidationError',
        message: 'Custom validation failed',
      };

      filter.catch(customError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: 'Custom validation failed',
          error: expect.objectContaining({
            code: 'UNKNOWN_ERROR',
            details: expect.objectContaining({
              type: 'CustomValidationError',
            }),
          }),
        }),
      );
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic Error', () => {
      const genericError = new Error('Something went wrong');

      filter.catch(genericError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Something went wrong',
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            details: expect.objectContaining({
              type: 'InternalServerError',
            }),
          }),
        }),
      );
    });

    it('should handle unknown exception type', () => {
      const unknownException = 'string exception';

      filter.catch(unknownException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: '服务器内部错误',
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            details: expect.objectContaining({
              type: 'UnknownError',
            }),
          }),
        }),
      );
    });

    it('should handle null exception', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
            details: expect.objectContaining({
              type: 'UnknownError',
            }),
          }),
        }),
      );
    });
  });

  describe('Request Context Handling', () => {
    it('should handle request without user or apiKey', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.not.objectContaining({
              userId: expect.anything(),
              apiKeyId: expect.anything(),
            }),
          }),
        }),
      );
    });

    it('should include user and apiKey info when available', () => {
      mockRequest.user = { id: 'user-123' };
      mockRequest.apiKey = { id: 'key-456' };
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              requestId: 'test-request-id',
              correlationId: 'test-correlation-id',
            }),
          }),
        }),
      );
    });

    it('should include API key in error details for 401 errors', () => {
      mockRequest.headers!['x-app-key'] = 'test-app-key';
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              providedKey: 'test-app-key',
            }),
          }),
        }),
      );
    });
  });

  describe('Path Sanitization', () => {
    it('should sanitize XSS attempts in path', () => {
      mockRequest.url = '/api/test?param=<script>alert("xss")</script>';
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              path: expect.stringContaining('[FILTERED]'),
            }),
          }),
        }),
      );
    });

    it('should sanitize SQL injection attempts in path', () => {
      mockRequest.url = '/api/test?id=1 UNION SELECT * FROM users';
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              path: expect.stringContaining('[FILTERED]'),
            }),
          }),
        }),
      );
    });

    it('should handle very long paths', () => {
      mockRequest.url = '/api/test?' + 'a'.repeat(300);
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              path: expect.stringContaining('[TRUNCATED]'),
            }),
          }),
        }),
      );
    });
  });

  describe('Response Write Errors', () => {
    it('should handle response write failures gracefully', () => {
      mockResponse.status.mockImplementation(() => {
        throw new Error('Response already sent');
      });
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const loggerSpy = jest.spyOn((filter as any).logger, 'error').mockImplementation();

      filter.catch(exception, mockArgumentsHost);

      // Should not throw, just log error
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should handle setHeader failures gracefully', () => {
      mockResponse.setHeader.mockImplementation(() => {
        throw new Error('Headers already sent');
      });
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      // Should continue processing without throwing
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Environment-specific Behavior', () => {
    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive error details');
      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '服务器内部错误',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error message');
      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Detailed error message',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Edge Cases', () => {
    it('should handle request without headers', () => {
      delete mockRequest.headers;
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.not.objectContaining({
              correlationId: expect.anything(),
              requestId: expect.anything(),
            }),
          }),
        }),
      );
    });

    it('should handle null request', () => {
      mockArgumentsHost.switchToHttp.mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(null),
      } as any);

      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: expect.objectContaining({
            details: expect.not.objectContaining({
              path: expect.anything(),
            }),
          }),
        }),
      );
    });
  });
});
