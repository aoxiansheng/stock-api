import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

import { GlobalExceptionFilter } from '@common/core/filters/global-exception.filter';
import { BusinessException } from '@common/core/exceptions/business.exception';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: jest.Mocked<Request>;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;

    // Setup mock objects
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    } as jest.Mocked<Request>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    } as any;

    const mockHttpContext = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('BusinessException handling', () => {
    it('should handle BusinessException correctly', () => {
      const businessException = new BusinessException({
        errorCode: 'OPERATION_FAILED',
        message: '业务操作失败',
        operation: 'testOperation',
        component: 'testComponent',
        retryable: true
      });

      filter.catch(businessException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: '业务操作失败',
          data: null,
          error: expect.objectContaining({
            code: 'OPERATION_FAILED',
            details: expect.objectContaining({
              type: 'BusinessException',
              errorCode: 'OPERATION_FAILED',
              operation: 'testOperation',
              component: 'testComponent',
              retryable: true,
            }),
          }),
        })
      );
    });

    it('should include original error details in BusinessException', () => {
      const originalError = new Error('Original error');
      const businessException = new BusinessException({
        errorCode: 'OPERATION_FAILED',
        message: '业务操作失败',
        operation: 'testOperation',
        component: 'testComponent',
        retryable: true,
        originalError
      });

      filter.catch(businessException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              originalError: {
                name: 'Error',
                message: 'Original error',
              },
            }),
          }),
        })
      );
    });
  });

  describe('HttpException handling', () => {
    it('should handle basic HttpException', () => {
      const httpException = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad Request',
          data: null,
        })
      );
    });

    it('should handle HttpException with object response', () => {
      const httpException = new HttpException(
        { message: 'Validation failed', error: 'BadRequest' },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
        })
      );
    });

    it('should handle UnauthorizedException', () => {
      const unauthorizedException = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(unauthorizedException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
    });

    it('should handle ForbiddenException', () => {
      const forbiddenException = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(forbiddenException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
    });
  });

  describe('ValidationError handling', () => {
    it('should handle validation errors array', () => {
      const validationErrors: ValidationError[] = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
            isNotEmpty: 'email should not be empty',
          },
          children: [],
        } as ValidationError,
      ];

      filter.catch(validationErrors, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should format validation error details', () => {
      const validationErrors: ValidationError[] = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
            minLength: 'name must be longer than or equal to 2 characters',
          },
          children: [],
        } as ValidationError,
      ];

      filter.catch(validationErrors, mockArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.error.details.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            code: 'isNotEmpty',
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: 'name',
            code: 'minLength',
            message: expect.any(String),
          }),
        ])
      );
    });

    it('should handle nested validation errors', () => {
      const nestedValidationError: ValidationError = {
        property: 'address',
        constraints: {},
        children: [
          {
            property: 'street',
            constraints: { isNotEmpty: 'street should not be empty' },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError;

      filter.catch([nestedValidationError], mockArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.error.details.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'address.street',
            code: 'isNotEmpty',
          }),
        ])
      );
    });
  });

  describe('MongoError handling', () => {
    it('should handle duplicate key error (code 11000)', () => {
      const mongoError = {
        name: 'MongoError',
        code: 11000,
        message: 'Duplicate key error',
        stack: 'stack trace',
      };

      filter.catch(mongoError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          error: expect.objectContaining({
            code: 'RESOURCE_CONFLICT',
          }),
        })
      );
    });

    it('should handle general mongo errors', () => {
      const mongoError = {
        name: 'MongoError',
        code: 121,
        message: 'Validation failed',
        stack: 'stack trace',
      };

      filter.catch(mongoError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
          }),
        })
      );
    });
  });

  describe('JWT Error handling', () => {
    it('should handle JsonWebTokenError', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid token',
      };

      filter.catch(jwtError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            details: expect.objectContaining({
              type: 'AuthenticationError',
              tokenType: 'JWT',
              errorName: 'JsonWebTokenError',
            }),
          }),
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const tokenExpiredError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };

      filter.catch(tokenExpiredError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
          }),
        })
      );
    });

    it('should handle NotBeforeError', () => {
      const notBeforeError = {
        name: 'NotBeforeError',
        message: 'jwt not active',
      };

      filter.catch(notBeforeError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TOKEN_NOT_ACTIVE',
          }),
        })
      );
    });
  });

  describe('Custom error handling', () => {
    it('should handle database connection errors', () => {
      const dbConnectionError = {
        name: 'DatabaseConnectionError',
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      };

      filter.catch(dbConnectionError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SERVICE_UNAVAILABLE',
          }),
        })
      );
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        name: 'TimeoutError',
        message: 'Request timeout',
        code: 'ETIMEDOUT',
      };

      filter.catch(timeoutError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.REQUEST_TIMEOUT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'REQUEST_TIMEOUT',
          }),
        })
      );
    });

    it('should handle custom status code errors', () => {
      const customError = {
        name: 'CustomError',
        message: 'Custom error message',
        statusCode: 422,
      };

      filter.catch(customError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: 'Custom error message',
        })
      );
    });

    it('should handle JSON syntax errors', () => {
      const jsonError = new Error('Unexpected token in JSON at position 10');
      jsonError.name = 'SyntaxError';

      filter.catch(jsonError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'BAD_REQUEST',
            details: expect.objectContaining({
              type: 'InvalidJSON',
              originalMessage: 'Unexpected token in JSON at position 10',
              position: 10,
            }),
          }),
        })
      );
    });
  });

  describe('Event emission', () => {
    it('should emit error metrics', () => {
      const httpException = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(httpException, mockArgumentsHost);

      setImmediate(() => {
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            source: 'global_exception_filter',
            metricType: 'error',
            metricName: 'http_exception',
            metricValue: 1,
            tags: expect.objectContaining({
              error_type: expect.any(String),
              status_code: expect.any(Number),
              method: 'GET',
              url: '/api/test',
            }),
          })
        );
      });
    });
  });

  describe('Request metadata handling', () => {
    it('should include correlation and request IDs', () => {
      mockRequest.headers = {
        'x-correlation-id': 'corr-123',
        'x-request-id': 'req-456',
      };

      const httpException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'req-456');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              correlationId: 'corr-123',
              requestId: 'req-456',
            }),
          }),
        })
      );
    });

    it('should handle missing request gracefully', () => {
      const mockHostWithoutRequest = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as any;

      const httpException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      expect(() => {
        filter.catch(httpException, mockHostWithoutRequest);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Path sanitization', () => {
    it('should sanitize malicious content in paths', () => {
      mockRequest.url = '/api/test?param=<script>alert("xss")</script>';

      const httpException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              path: '/api/test?param=[FILTERED]',
            }),
          }),
        })
      );
    });

    it('should truncate very long paths', () => {
      const longPath = '/api/test' + 'a'.repeat(200);
      mockRequest.url = longPath;

      const httpException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(httpException, mockArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      const sanitizedPath = callArgs.error.details.path;

      expect(sanitizedPath.length).toBeLessThanOrEqual(211); // 200 + "[TRUNCATED]"
      expect(sanitizedPath).toContain('[TRUNCATED]');
    });

    it('should filter SQL injection patterns', () => {
      mockRequest.url = '/api/test?query=SELECT * FROM users WHERE id=1';

      const httpException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              path: '/api/test?query=[FILTERED]',
            }),
          }),
        })
      );
    });
  });

  describe('Response error handling', () => {
    it('should handle response write failures gracefully', () => {
      mockResponse.json.mockImplementation(() => {
        throw new Error('Response write failed');
      });

      const httpException = new HttpException('Test', HttpStatus.BAD_REQUEST);

      expect(() => {
        filter.catch(httpException, mockArgumentsHost);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Message translation', () => {
    it('should translate common HTTP error messages', () => {
      const httpException = new HttpException('Cannot GET /api/nonexistent', HttpStatus.NOT_FOUND);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('路由不存在'),
        })
      );
    });

    it('should handle unauthorized message translation', () => {
      const unauthorizedException = new HttpException('缺少API凭证', HttpStatus.UNAUTHORIZED);

      filter.catch(unauthorizedException, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('API凭证'),
        })
      );
    });
  });
});