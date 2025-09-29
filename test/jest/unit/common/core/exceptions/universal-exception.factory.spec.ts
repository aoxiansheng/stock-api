import { HttpStatus } from '@nestjs/common';
import { MongoError } from 'mongodb';
import { UniversalExceptionFactory } from '@common/core/exceptions/universal-exception.factory';
import {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions/business.exception';

describe('UniversalExceptionFactory', () => {
  describe('createBusinessException', () => {
    it('should create business exception with all required parameters', () => {
      const options = {
        message: 'Test error message',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'test-operation',
        component: ComponentIdentifier.AUTH,
      };

      const exception = UniversalExceptionFactory.createBusinessException(options);

      expect(exception).toBeInstanceOf(BusinessException);
      expect(exception.message).toBe(options.message);
      expect(exception.errorCode).toBe(options.errorCode);
      expect(exception.operation).toBe(options.operation);
      expect(exception.component).toBe(options.component);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST); // Auto-determined
      expect(exception.retryable).toBe(false); // Auto-determined
    });

    it('should create business exception with custom status code and retryable flag', () => {
      const options = {
        message: 'Service temporarily unavailable',
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'fetch-data',
        component: ComponentIdentifier.CACHE,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        retryable: true,
        context: { serviceName: 'redis' },
      };

      const exception = UniversalExceptionFactory.createBusinessException(options);

      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.retryable).toBe(true);
      expect(exception.context).toEqual({ serviceName: 'redis' });
    });

    it('should create business exception with original error', () => {
      const originalError = new Error('Connection failed');
      const options = {
        message: 'Database connection error',
        errorCode: BusinessErrorCode.DATABASE_CONNECTION_ERROR,
        operation: 'connect-db',
        component: ComponentIdentifier.CACHE,
        originalError,
      };

      const exception = UniversalExceptionFactory.createBusinessException(options);

      expect(exception.originalError).toBe(originalError);
    });

    it('should auto-determine HTTP status code for different error codes', () => {
      const testCases = [
        { errorCode: BusinessErrorCode.DATA_NOT_FOUND, expectedStatus: HttpStatus.NOT_FOUND },
        { errorCode: BusinessErrorCode.RESOURCE_CONFLICT, expectedStatus: HttpStatus.CONFLICT },
        { errorCode: BusinessErrorCode.RESOURCE_EXHAUSTED, expectedStatus: HttpStatus.TOO_MANY_REQUESTS },
        { errorCode: BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT, expectedStatus: HttpStatus.REQUEST_TIMEOUT },
        { errorCode: BusinessErrorCode.CONFIGURATION_ERROR, expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR },
      ];

      testCases.forEach(({ errorCode, expectedStatus }) => {
        const exception = UniversalExceptionFactory.createBusinessException({
          message: 'Test message',
          errorCode,
          operation: 'test',
          component: ComponentIdentifier.AUTH,
        });

        expect(exception.getStatus()).toBe(expectedStatus);
      });
    });

    it('should auto-determine retryability for different error codes', () => {
      const retryableErrorCodes = [
        BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        BusinessErrorCode.DATABASE_CONNECTION_ERROR,
        BusinessErrorCode.CACHE_ERROR,
        BusinessErrorCode.RESOURCE_EXHAUSTED,
      ];

      const nonRetryableErrorCodes = [
        BusinessErrorCode.DATA_VALIDATION_FAILED,
        BusinessErrorCode.DATA_NOT_FOUND,
        BusinessErrorCode.RESOURCE_CONFLICT,
        BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      ];

      retryableErrorCodes.forEach(errorCode => {
        const exception = UniversalExceptionFactory.createBusinessException({
          message: 'Test message',
          errorCode,
          operation: 'test',
          component: ComponentIdentifier.AUTH,
        });

        expect(exception.retryable).toBe(true);
      });

      nonRetryableErrorCodes.forEach(errorCode => {
        const exception = UniversalExceptionFactory.createBusinessException({
          message: 'Test message',
          errorCode,
          operation: 'test',
          component: ComponentIdentifier.AUTH,
        });

        expect(exception.retryable).toBe(false);
      });
    });
  });

  describe('createFromError', () => {
    it('should return existing BusinessException unchanged', () => {
      const originalException = UniversalExceptionFactory.createBusinessException({
        message: 'Original error',
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'find-user',
        component: ComponentIdentifier.AUTH,
      });

      const result = UniversalExceptionFactory.createFromError(
        originalException,
        'new-operation',
        ComponentIdentifier.CACHE
      );

      expect(result).toBe(originalException);
    });

    it('should convert MongoDB duplicate key error', () => {
      const mongoError = new Error('Duplicate key error') as any;
      mongoError.name = 'MongoError';
      mongoError.code = 11000;

      const exception = UniversalExceptionFactory.createFromError(
        mongoError,
        'create-user',
        ComponentIdentifier.AUTH
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.RESOURCE_CONFLICT);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.retryable).toBe(false);
      expect(exception.message).toContain('数据已存在');
    });

    it('should convert MongoDB validation error', () => {
      const mongoError = new Error('Document validation failed') as any;
      mongoError.name = 'MongoError';
      mongoError.code = 121;

      const exception = UniversalExceptionFactory.createFromError(
        mongoError,
        'save-document',
        ComponentIdentifier.CACHE
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.DATA_VALIDATION_FAILED);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.retryable).toBe(false);
    });

    it('should convert timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const exception = UniversalExceptionFactory.createFromError(
        timeoutError,
        'fetch-data',
        ComponentIdentifier.AUTH
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT);
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      expect(exception.retryable).toBe(true);
    });

    it('should convert connection errors', () => {
      const connectionError = new Error('Connection refused') as any;
      connectionError.code = 'ECONNREFUSED';

      const exception = UniversalExceptionFactory.createFromError(
        connectionError,
        'connect-service',
        ComponentIdentifier.CACHE
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.retryable).toBe(true);
    });

    it('should convert validation errors', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      const exception = UniversalExceptionFactory.createFromError(
        validationError,
        'validate-input',
        ComponentIdentifier.AUTH
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.DATA_VALIDATION_FAILED);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.retryable).toBe(false);
    });

    it('should convert JSON syntax errors', () => {
      const jsonError = new SyntaxError('Unexpected token in JSON at position 0');

      const exception = UniversalExceptionFactory.createFromError(
        jsonError,
        'parse-json',
        ComponentIdentifier.CACHE
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.DATA_SERIALIZATION_FAILED);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.retryable).toBe(false);
    });

    it('should handle generic Error objects', () => {
      const genericError = new Error('Something went wrong');

      const exception = UniversalExceptionFactory.createFromError(
        genericError,
        'generic-operation',
        ComponentIdentifier.AUTH
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.UNKNOWN_ERROR);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.retryable).toBe(false);
      expect(exception.context.errorName).toBe('Error');
    });

    it('should handle string errors', () => {
      const stringError = 'String error message';

      const exception = UniversalExceptionFactory.createFromError(
        stringError,
        'string-error-operation',
        ComponentIdentifier.CACHE
      );

      expect(exception.message).toBe(stringError);
      expect(exception.errorCode).toBe(BusinessErrorCode.UNKNOWN_ERROR);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.context.originalType).toBe('string');
    });

    it('should handle non-error objects', () => {
      const objectError = { error: 'Something went wrong', code: 500 };

      const exception = UniversalExceptionFactory.createFromError(
        objectError,
        'object-error-operation',
        ComponentIdentifier.AUTH
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.UNKNOWN_ERROR);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.context.originalType).toBe('object');
      expect(exception.context.value).toContain('Something went wrong');
    });

    it('should handle context merging', () => {
      const error = new Error('Test error');
      const context = { customField: 'customValue', userId: 123 };

      const exception = UniversalExceptionFactory.createFromError(
        error,
        'test-operation',
        ComponentIdentifier.AUTH,
        context
      );

      const resultContext = exception.context;
      expect(resultContext.customField).toBe('customValue');
      expect(resultContext.userId).toBe(123);
      expect(resultContext.errorName).toBe('Error');
    });
  });

  describe('convenience methods', () => {
    describe('createNotFoundError', () => {
      it('should create not found error with correct properties', () => {
        const exception = UniversalExceptionFactory.createNotFoundError(
          'User',
          'find-by-id',
          ComponentIdentifier.AUTH,
          { userId: '123' }
        );

        expect(exception.message).toBe('User未找到');
        expect(exception.errorCode).toBe(BusinessErrorCode.DATA_NOT_FOUND);
        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(exception.retryable).toBe(false);
        expect(exception.context.resource).toBe('User');
        expect(exception.context.userId).toBe('123');
      });
    });

    describe('createValidationError', () => {
      it('should create validation error with validation details', () => {
        const validationDetails = { field: 'email', reason: 'invalid format' };
        const exception = UniversalExceptionFactory.createValidationError(
          'Email validation failed',
          'validate-user',
          ComponentIdentifier.AUTH,
          validationDetails
        );

        expect(exception.message).toBe('Email validation failed');
        expect(exception.errorCode).toBe(BusinessErrorCode.DATA_VALIDATION_FAILED);
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.retryable).toBe(false);
        expect(exception.context.validationDetails).toEqual(validationDetails);
      });
    });

    describe('createServiceUnavailableError', () => {
      it('should create service unavailable error', () => {
        const exception = UniversalExceptionFactory.createServiceUnavailableError(
          'Redis',
          'cache-get',
          ComponentIdentifier.CACHE,
          { host: 'localhost', port: 6379 }
        );

        expect(exception.message).toBe('Redis服务不可用');
        expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE);
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(exception.retryable).toBe(true);
        expect(exception.context.serviceName).toBe('Redis');
        expect(exception.context.host).toBe('localhost');
      });
    });
  });

  describe('error detection methods', () => {
    it('should detect MongoDB errors correctly', () => {
      const mongoErrors = [
        { name: 'MongoError', code: 11000 },
        { name: 'MongoServerError', code: 121 },
        { name: 'CustomError', code: 123 }, // Has numeric code
      ];

      mongoErrors.forEach(errorProps => {
        const error = new Error('Test mongo error') as any;
        Object.assign(error, errorProps);

        const exception = UniversalExceptionFactory.createFromError(
          error,
          'test-mongo',
          ComponentIdentifier.CACHE
        );

        // Should be detected as MongoDB error and handled accordingly
        expect(exception.context.mongoCode).toBe(errorProps.code);
      });
    });

    it('should detect timeout errors by name', () => {
      const timeoutNames = ['TimeoutError', 'RequestTimeoutError'];

      timeoutNames.forEach(name => {
        const error = new Error('Timeout occurred');
        error.name = name;

        const exception = UniversalExceptionFactory.createFromError(
          error,
          'test-timeout',
          ComponentIdentifier.AUTH
        );

        expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT);
        expect(exception.retryable).toBe(true);
      });
    });

    it('should detect timeout errors by code', () => {
      const timeoutCodes = ['ETIMEDOUT', 'TIMEOUT'];

      timeoutCodes.forEach(code => {
        const error = new Error('Timeout occurred') as any;
        error.code = code;

        const exception = UniversalExceptionFactory.createFromError(
          error,
          'test-timeout',
          ComponentIdentifier.AUTH
        );

        expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT);
        expect(exception.retryable).toBe(true);
      });
    });

    it('should detect timeout errors by message content', () => {
      const error = new Error('Operation timeout occurred');

      const exception = UniversalExceptionFactory.createFromError(
        error,
        'test-timeout',
        ComponentIdentifier.CACHE
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT);
      expect(exception.retryable).toBe(true);
    });

    it('should detect connection errors by code', () => {
      const connectionCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ENETUNREACH'];

      connectionCodes.forEach(code => {
        const error = new Error('Connection failed') as any;
        error.code = code;

        const exception = UniversalExceptionFactory.createFromError(
          error,
          'test-connection',
          ComponentIdentifier.AUTH
        );

        expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE);
        expect(exception.retryable).toBe(true);
      });
    });

    it('should detect connection errors by name', () => {
      const connectionNames = ['ConnectionError', 'NetworkError'];

      connectionNames.forEach(name => {
        const error = new Error('Connection failed');
        error.name = name;

        const exception = UniversalExceptionFactory.createFromError(
          error,
          'test-connection',
          ComponentIdentifier.CACHE
        );

        expect(exception.errorCode).toBe(BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE);
        expect(exception.retryable).toBe(true);
      });
    });
  });

  describe('MongoDB specific error handling', () => {
    it('should handle connection-related MongoDB errors as retryable', () => {
      const connectionErrorCodes = [6, 7, 89, 91, 227]; // HostUnreachable, HostNotFound, etc.

      connectionErrorCodes.forEach(code => {
        const mongoError = new Error('MongoDB connection error') as any;
        mongoError.name = 'MongoError';
        mongoError.code = code;

        const exception = UniversalExceptionFactory.createFromError(
          mongoError,
          'test-mongo-connection',
          ComponentIdentifier.CACHE
        );

        expect(exception.errorCode).toBe(BusinessErrorCode.DATABASE_CONNECTION_ERROR);
        expect(exception.retryable).toBe(true);
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      });
    });

    it('should handle permission denied MongoDB error', () => {
      const mongoError = new Error('Not authorized') as any;
      mongoError.name = 'MongoError';
      mongoError.code = 13;

      const exception = UniversalExceptionFactory.createFromError(
        mongoError,
        'test-mongo-permission',
        ComponentIdentifier.AUTH
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.DATABASE_ERROR);
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.retryable).toBe(false);
    });

    it('should handle query syntax MongoDB error', () => {
      const mongoError = new Error('Bad query syntax') as any;
      mongoError.name = 'MongoError';
      mongoError.code = 2;

      const exception = UniversalExceptionFactory.createFromError(
        mongoError,
        'test-mongo-query',
        ComponentIdentifier.CACHE
      );

      expect(exception.errorCode).toBe(BusinessErrorCode.DATABASE_ERROR);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.retryable).toBe(false);
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle errors with very long stack traces', () => {
      const error = new Error('Test error');
      // Create a very long stack trace
      error.stack = 'Error: Test error\n' + 'at '.repeat(200) + 'someFunction()';

      const exception = UniversalExceptionFactory.createFromError(
        error,
        'test-long-stack',
        ComponentIdentifier.AUTH
      );

      const stack = exception.context.stack;
      expect(stack).toBeDefined();
      expect(stack.length).toBeLessThanOrEqual(500); // Should be truncated
    });

    it('should handle errors without messages', () => {
      const error = new Error();
      error.message = '';

      const exception = UniversalExceptionFactory.createFromError(
        error,
        'test-no-message',
        ComponentIdentifier.CACHE
      );

      expect(exception.message).toBe('未知错误');
      expect(exception.errorCode).toBe(BusinessErrorCode.UNKNOWN_ERROR);
    });

    it('should handle very large object errors', () => {
      const largeObject = {
        data: 'x'.repeat(1000),
        nested: { moreData: 'y'.repeat(1000) }
      };

      const exception = UniversalExceptionFactory.createFromError(
        largeObject,
        'test-large-object',
        ComponentIdentifier.AUTH
      );

      const value = exception.context.value;
      expect(value).toBeDefined();
      expect(value.length).toBeLessThanOrEqual(200); // Should be truncated
    });

    it('should preserve all required BusinessException properties', () => {
      const originalError = new Error('Original error');
      const exception = UniversalExceptionFactory.createBusinessException({
        message: 'Test message',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'test-operation',
        component: ComponentIdentifier.AUTH,
        context: { testField: 'testValue' },
        originalError,
      });

      // Verify all BusinessException interface methods work
      expect(exception.errorCode).toBeDefined();
      expect(exception.operation).toBeDefined();
      expect(exception.component).toBeDefined();
      expect(exception.context).toBeDefined();
      expect(exception.retryable).toBeDefined();
      expect(exception.originalError).toBeDefined();
      expect(exception.getStatus()).toBeDefined();
      expect(exception.message).toBeDefined();
    });
  });
});
