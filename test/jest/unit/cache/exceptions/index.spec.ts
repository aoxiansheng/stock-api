/**
 * Cache Exceptions 单元测试
 * 测试缓存异常类的完整性和继承关系
 */

import { HttpStatus } from '@nestjs/common';
import {
  CacheException,
  CacheConnectionException,
  CacheOperationException,
  CacheSerializationException,
  CacheValidationException,
  CacheConfigurationException,
  CacheTimeoutException,
  CacheLockException,
  CacheBatchException,
} from '@cache/exceptions/cache.exceptions';

describe('Cache Exceptions', () => {
  describe('CacheException (Base Class)', () => {
    class TestCacheException extends CacheException {
      constructor(operation: string, cacheKey?: string) {
        super('Test exception', HttpStatus.BAD_REQUEST, operation, cacheKey);
      }
    }

    it('should create exception with all properties', () => {
      const operation = 'test-operation';
      const cacheKey = 'test-key';
      const originalError = new Error('Original error');

      const exception = new TestCacheException(operation, cacheKey);
      (exception as any).originalError = originalError;

      expect(exception.message).toBe('Test exception');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(cacheKey);
      expect((exception as any).originalError).toBe(originalError);
    });

    it('should create exception without optional parameters', () => {
      const operation = 'test-operation';
      const exception = new TestCacheException(operation);

      expect(exception.message).toBe('Test exception');
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBeUndefined();
    });

    it('should be instance of HttpException', () => {
      const exception = new TestCacheException('test');
      expect(exception).toBeInstanceOf(Error);
      expect(exception.name).toBe('Error');
    });
  });

  describe('CacheConnectionException', () => {
    it('should create connection exception with all parameters', () => {
      const operation = 'connect';
      const cacheKey = 'redis-primary';
      const originalError = new Error('Connection refused');

      const exception = new CacheConnectionException(operation, cacheKey, originalError);

      expect(exception.message).toBe('缓存连接失败: connect (key: redis-primary)');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(cacheKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create connection exception without optional parameters', () => {
      const operation = 'ping';

      const exception = new CacheConnectionException(operation);

      expect(exception.message).toBe('缓存连接失败: ping');
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create connection exception with operation and key only', () => {
      const operation = 'authenticate';
      const cacheKey = 'auth-token';

      const exception = new CacheConnectionException(operation, cacheKey);

      expect(exception.message).toBe('缓存连接失败: authenticate (key: auth-token)');
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(cacheKey);
      expect(exception.originalError).toBeUndefined();
    });

    it('should extend ServiceUnavailableException', () => {
      const exception = new CacheConnectionException('test');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('CacheOperationException', () => {
    it('should create operation exception with all parameters', () => {
      const operation = 'set';
      const cacheKey = 'user:123';
      const originalError = new Error('Write failed');

      const exception = new CacheOperationException(operation, cacheKey, originalError);

      expect(exception.message).toBe('缓存操作失败: set (key: user:123)');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(cacheKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create operation exception without optional parameters', () => {
      const operation = 'flush';

      const exception = new CacheOperationException(operation);

      expect(exception.message).toBe('缓存操作失败: flush');
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should handle complex operation names', () => {
      const operation = 'batch-delete';
      const cacheKey = 'session:batch:*';

      const exception = new CacheOperationException(operation, cacheKey);

      expect(exception.message).toBe('缓存操作失败: batch-delete (key: session:batch:*)');
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(cacheKey);
    });
  });

  describe('CacheSerializationException', () => {
    it('should create serialization exception with all parameters', () => {
      const operation = 'serialize';
      const serializationType = 'json';
      const cacheKey = 'complex-object';
      const originalError = new Error('Circular reference');

      const exception = new CacheSerializationException(
        operation,
        serializationType,
        cacheKey,
        originalError
      );

      expect(exception.message).toBe('缓存序列化失败: serialize (type: json) (key: complex-object)');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe(operation);
      expect(exception.serializationType).toBe(serializationType);
      expect(exception.cacheKey).toBe(cacheKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create serialization exception without optional parameters', () => {
      const operation = 'deserialize';
      const serializationType = 'msgpack';

      const exception = new CacheSerializationException(operation, serializationType);

      expect(exception.message).toBe('缓存序列化失败: deserialize (type: msgpack)');
      expect(exception.operation).toBe(operation);
      expect(exception.serializationType).toBe(serializationType);
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should handle different serialization types', () => {
      const serializers = ['json', 'msgpack', 'protobuf', 'avro'];

      serializers.forEach(serializer => {
        const exception = new CacheSerializationException('test', serializer);
        expect(exception.message).toContain(`(type: ${serializer})`);
        expect(exception.serializationType).toBe(serializer);
      });
    });

    it('should extend BadRequestException', () => {
      const exception = new CacheSerializationException('test', 'json');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('CacheValidationException', () => {
    it('should create validation exception with all parameters', () => {
      const operation = 'validate-key';
      const validationType = 'key-format';
      const validationMessage = 'Key must not contain spaces';
      const cacheKey = 'invalid key';
      const originalError = new Error('Validation failed');

      const exception = new CacheValidationException(
        operation,
        validationType,
        validationMessage,
        cacheKey,
        originalError
      );

      expect(exception.message).toBe('缓存参数验证失败: Key must not contain spaces');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe(operation);
      expect(exception.validationType).toBe(validationType);
      expect(exception.cacheKey).toBe(cacheKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create validation exception without optional parameters', () => {
      const operation = 'validate-ttl';
      const validationType = 'ttl-range';
      const validationMessage = 'TTL must be positive';

      const exception = new CacheValidationException(
        operation,
        validationType,
        validationMessage
      );

      expect(exception.message).toBe('缓存参数验证失败: TTL must be positive');
      expect(exception.operation).toBe(operation);
      expect(exception.validationType).toBe(validationType);
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should handle different validation types', () => {
      const validationTypes = [
        'key-format',
        'ttl-range',
        'value-size',
        'data-type',
        'permission'
      ];

      validationTypes.forEach(type => {
        const exception = new CacheValidationException(
          'validate',
          type,
          `${type} validation failed`
        );
        expect(exception.validationType).toBe(type);
        expect(exception.message).toContain(`${type} validation failed`);
      });
    });

    it('should extend BadRequestException', () => {
      const exception = new CacheValidationException('test', 'type', 'message');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('CacheConfigurationException', () => {
    it('should create configuration exception with all parameters', () => {
      const operation = 'load-config';
      const configKey = 'redis-cluster';
      const originalError = new Error('Config not found');

      const exception = new CacheConfigurationException(operation, configKey, originalError);

      expect(exception.message).toBe('缓存配置错误: load-config (config: redis-cluster)');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(configKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create configuration exception without optional parameters', () => {
      const operation = 'validate-config';
      const configKey = 'ttl-defaults';

      const exception = new CacheConfigurationException(operation, configKey);

      expect(exception.message).toBe('缓存配置错误: validate-config (config: ttl-defaults)');
      expect(exception.operation).toBe(operation);
      expect(exception.cacheKey).toBe(configKey);
      expect(exception.originalError).toBeUndefined();
    });

    it('should handle different configuration keys', () => {
      const configKeys = [
        'redis.host',
        'cache.ttl.default',
        'compression.enabled',
        'serialization.type'
      ];

      configKeys.forEach(key => {
        const exception = new CacheConfigurationException('test', key);
        expect(exception.message).toContain(`(config: ${key})`);
        expect(exception.cacheKey).toBe(key);
      });
    });

    it('should extend InternalServerErrorException', () => {
      const exception = new CacheConfigurationException('test', 'config');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('CacheTimeoutException', () => {
    it('should create timeout exception with all parameters', () => {
      const operation = 'get';
      const timeoutMs = 5000;
      const cacheKey = 'slow-operation';
      const originalError = new Error('Operation timed out');

      const exception = new CacheTimeoutException(
        operation,
        timeoutMs,
        cacheKey,
        originalError
      );

      expect(exception.message).toBe('缓存操作超时: get (timeout: 5000ms) (key: slow-operation)');
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      expect(exception.operation).toBe(operation);
      expect(exception.timeoutMs).toBe(timeoutMs);
      expect(exception.cacheKey).toBe(cacheKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create timeout exception without optional parameters', () => {
      const operation = 'batch-set';
      const timeoutMs = 10000;

      const exception = new CacheTimeoutException(operation, timeoutMs);

      expect(exception.message).toBe('缓存操作超时: batch-set (timeout: 10000ms)');
      expect(exception.operation).toBe(operation);
      expect(exception.timeoutMs).toBe(timeoutMs);
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should handle different timeout values', () => {
      const timeouts = [1000, 5000, 30000, 60000];

      timeouts.forEach(timeout => {
        const exception = new CacheTimeoutException('test', timeout);
        expect(exception.message).toContain(`(timeout: ${timeout}ms)`);
        expect(exception.timeoutMs).toBe(timeout);
      });
    });

    it('should extend RequestTimeoutException', () => {
      const exception = new CacheTimeoutException('test', 5000);
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
    });
  });

  describe('CacheLockException', () => {
    it('should create lock exception with all parameters', () => {
      const operation = 'acquire-lock';
      const lockKey = 'resource:user:123';
      const originalError = new Error('Lock already held');

      const exception = new CacheLockException(operation, lockKey, originalError);

      expect(exception.message).toBe('缓存锁操作失败: acquire-lock (lock: resource:user:123)');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.operation).toBe(operation);
      expect(exception.lockKey).toBe(lockKey);
      expect(exception.cacheKey).toBe(lockKey);
      expect(exception.originalError).toBe(originalError);
    });

    it('should create lock exception without optional parameters', () => {
      const operation = 'release-lock';
      const lockKey = 'mutex:config-update';

      const exception = new CacheLockException(operation, lockKey);

      expect(exception.message).toBe('缓存锁操作失败: release-lock (lock: mutex:config-update)');
      expect(exception.operation).toBe(operation);
      expect(exception.lockKey).toBe(lockKey);
      expect(exception.cacheKey).toBe(lockKey);
      expect(exception.originalError).toBeUndefined();
    });

    it('should handle different lock operations', () => {
      const operations = ['acquire', 'release', 'extend', 'check'];

      operations.forEach(op => {
        const exception = new CacheLockException(op, 'test-lock');
        expect(exception.message).toContain(`缓存锁操作失败: ${op}`);
        expect(exception.operation).toBe(op);
      });
    });

    it('should extend ConflictException', () => {
      const exception = new CacheLockException('test', 'lock');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('CacheBatchException', () => {
    it('should create batch exception with all parameters', () => {
      const operation = 'batch-set';
      const batchSize = 1000;
      const message = 'Batch size exceeds limit';
      const status = HttpStatus.BAD_REQUEST;
      const maxAllowed = 500;
      const originalError = new Error('Too many items');

      const exception = new CacheBatchException(
        operation,
        batchSize,
        message,
        status,
        maxAllowed,
        originalError
      );

      expect(exception.message).toBe(
        '缓存批量操作异常: Batch size exceeds limit (operation: batch-set, size: 1000, max: 500)'
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe(operation);
      expect(exception.batchSize).toBe(batchSize);
      expect(exception.maxAllowed).toBe(maxAllowed);
      expect(exception.originalError).toBe(originalError);
      expect(exception.cacheKey).toBeUndefined();
    });

    it('should create batch exception with minimal parameters', () => {
      const operation = 'batch-get';
      const batchSize = 100;
      const message = 'Batch operation failed';

      const exception = new CacheBatchException(operation, batchSize, message);

      expect(exception.message).toBe(
        '缓存批量操作异常: Batch operation failed (operation: batch-get, size: 100)'
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe(operation);
      expect(exception.batchSize).toBe(batchSize);
      expect(exception.maxAllowed).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create batch exception with custom status', () => {
      const exception = new CacheBatchException(
        'test',
        100,
        'Custom error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );

      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle different batch sizes', () => {
      const sizes = [10, 100, 1000, 10000];

      sizes.forEach(size => {
        const exception = new CacheBatchException('test', size, 'test message');
        expect(exception.message).toContain(`size: ${size}`);
        expect(exception.batchSize).toBe(size);
      });
    });

    describe('createPayloadTooLarge static method', () => {
      it('should create PayloadTooLargeException with all parameters', () => {
        const operation = 'bulk-insert';
        const batchSize = 10000;
        const maxAllowed = 1000;
        const originalError = new Error('Payload too large');

        const exception = CacheBatchException.createPayloadTooLarge(
          operation,
          batchSize,
          maxAllowed,
          originalError
        );

        expect(exception.message).toBe(
          '缓存批量操作数据过大: bulk-insert (size: 10000, max: 1000)'
        );
        expect(exception.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      });

      it('should create PayloadTooLargeException without optional parameters', () => {
        const operation = 'upload-batch';
        const batchSize = 5000;
        const maxAllowed = 1000;

        const exception = CacheBatchException.createPayloadTooLarge(
          operation,
          batchSize,
          maxAllowed
        );

        expect(exception.message).toBe(
          '缓存批量操作数据过大: upload-batch (size: 5000, max: 1000)'
        );
        expect(exception.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      });

      it('should handle different size combinations', () => {
        const testCases = [
          { size: 100, max: 50 },
          { size: 1000, max: 500 },
          { size: 10000, max: 1000 }
        ];

        testCases.forEach(({ size, max }) => {
          const exception = CacheBatchException.createPayloadTooLarge('test', size, max);
          expect(exception.message).toContain(`size: ${size}, max: ${max}`);
        });
      });
    });

    it('should extend BadRequestException', () => {
      const exception = new CacheBatchException('test', 100, 'message');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Exception inheritance and type checking', () => {
    it('should properly extend appropriate base classes', () => {
      const connectionEx = new CacheConnectionException('test');
      const operationEx = new CacheOperationException('test');
      const serializationEx = new CacheSerializationException('test', 'json');
      const validationEx = new CacheValidationException('test', 'type', 'message');
      const configEx = new CacheConfigurationException('test', 'config');
      const timeoutEx = new CacheTimeoutException('test', 5000);
      const lockEx = new CacheLockException('test', 'lock');
      const batchEx = new CacheBatchException('test', 100, 'message');

      // All should be instances of Error
      [connectionEx, operationEx, serializationEx, validationEx, configEx, timeoutEx, lockEx, batchEx]
        .forEach(ex => {
          expect(ex).toBeInstanceOf(Error);
        });

      // Check specific status codes
      expect(connectionEx.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(operationEx.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(serializationEx.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(validationEx.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(configEx.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(timeoutEx.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      expect(lockEx.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(batchEx.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should have proper operation property on all exceptions', () => {
      const exceptions = [
        new CacheConnectionException('test-op'),
        new CacheOperationException('test-op'),
        new CacheSerializationException('test-op', 'json'),
        new CacheValidationException('test-op', 'type', 'message'),
        new CacheConfigurationException('test-op', 'config'),
        new CacheTimeoutException('test-op', 5000),
        new CacheLockException('test-op', 'lock'),
        new CacheBatchException('test-op', 100, 'message')
      ];

      exceptions.forEach(ex => {
        expect(ex.operation).toBe('test-op');
      });
    });

    it('should handle error serialization for logging', () => {
      const originalError = new Error('Original cause');
      const exception = new CacheConnectionException('test', 'key', originalError);

      const serialized = JSON.stringify(exception, Object.getOwnPropertyNames(exception));
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe(exception.message);
      expect(parsed.operation).toBe(exception.operation);
      expect(parsed.cacheKey).toBe(exception.cacheKey);
    });
  });

  describe('Error message formatting', () => {
    it('should format messages consistently', () => {
      const exceptions = [
        new CacheConnectionException('connect', 'redis:primary'),
        new CacheOperationException('get', 'user:123'),
        new CacheSerializationException('serialize', 'json', 'complex-object'),
        new CacheValidationException('validate', 'key', 'Invalid format', 'bad key'),
        new CacheConfigurationException('load', 'redis.config'),
        new CacheTimeoutException('set', 5000, 'slow-key'),
        new CacheLockException('acquire', 'mutex:resource'),
        new CacheBatchException('batch-set', 1000, 'Too many items', HttpStatus.BAD_REQUEST, 500)
      ];

      exceptions.forEach(ex => {
        expect(ex.message).toBeTruthy();
        expect(ex.message.length).toBeGreaterThan(0);
        expect(typeof ex.message).toBe('string');
      });
    });

    it('should include operation in all error messages', () => {
      const testOperations = [
        'get', 'set', 'delete', 'batch-get', 'batch-set',
        'acquire-lock', 'release-lock', 'serialize', 'deserialize'
      ];

      testOperations.forEach(operation => {
        const connectionEx = new CacheConnectionException(operation);
        const operationEx = new CacheOperationException(operation);

        expect(connectionEx.message).toContain(operation);
        expect(operationEx.message).toContain(operation);
      });
    });

    it('should include cache key when provided', () => {
      const testKeys = [
        'user:123',
        'session:abc-def',
        'config:app-settings',
        'cache:health:check'
      ];

      testKeys.forEach(key => {
        const exception = new CacheConnectionException('test', key);
        expect(exception.message).toContain(key);
      });
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should handle Redis connection failure scenario', () => {
      const originalError = new Error('ECONNREFUSED 127.0.0.1:6379');
      const exception = new CacheConnectionException('connect', 'redis:primary', originalError);

      expect(exception.operation).toBe('connect');
      expect(exception.cacheKey).toBe('redis:primary');
      expect(exception.originalError).toBe(originalError);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should handle serialization failure scenario', () => {
      const circularObj = { a: {} };
      circularObj.a = circularObj; // Create circular reference
      const originalError = new TypeError('Converting circular structure to JSON');

      const exception = new CacheSerializationException(
        'serialize',
        'json',
        'user:profile:123',
        originalError
      );

      expect(exception.operation).toBe('serialize');
      expect(exception.serializationType).toBe('json');
      expect(exception.cacheKey).toBe('user:profile:123');
      expect(exception.originalError).toBe(originalError);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should handle validation failure scenario', () => {
      const invalidKey = 'user key with spaces';
      const exception = new CacheValidationException(
        'validate-key',
        'key-format',
        'Cache keys cannot contain spaces',
        invalidKey
      );

      expect(exception.operation).toBe('validate-key');
      expect(exception.validationType).toBe('key-format');
      expect(exception.cacheKey).toBe(invalidKey);
      expect(exception.message).toContain('Cache keys cannot contain spaces');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should handle timeout scenario', () => {
      const timeoutMs = 5000;
      const exception = new CacheTimeoutException('get', timeoutMs, 'large-dataset');

      expect(exception.operation).toBe('get');
      expect(exception.timeoutMs).toBe(timeoutMs);
      expect(exception.cacheKey).toBe('large-dataset');
      expect(exception.message).toContain('5000ms');
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
    });

    it('should handle distributed lock conflict scenario', () => {
      const lockKey = 'lock:user:123:update';
      const originalError = new Error('Lock already acquired by another process');

      const exception = new CacheLockException('acquire', lockKey, originalError);

      expect(exception.operation).toBe('acquire');
      expect(exception.lockKey).toBe(lockKey);
      expect(exception.cacheKey).toBe(lockKey);
      expect(exception.originalError).toBe(originalError);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('should handle batch size limit scenario', () => {
      const batchSize = 10000;
      const maxAllowed = 1000;

      const exception = CacheBatchException.createPayloadTooLarge(
        'bulk-insert',
        batchSize,
        maxAllowed
      );

      expect(exception.message).toContain('bulk-insert');
      expect(exception.message).toContain('10000');
      expect(exception.message).toContain('1000');
      expect(exception.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    });
  });
});
