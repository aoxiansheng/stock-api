import { HttpStatus } from '@nestjs/common';
import {
  CacheException,
  CacheConnectionException,
  CacheOperationException,
  CacheValidationException,
  CacheTimeoutException,
  CacheLockException,
  CacheSerializationException,
  CacheConfigurationException,
  CacheBatchException
} from '@cache/exceptions/cache.exceptions';

describe('Cache Exceptions', () => {
  describe('CacheException (Abstract Base)', () => {
    class TestCacheException extends CacheException {}

    it('should create exception with required parameters', () => {
      const exception = new TestCacheException(
        'Test error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'test-operation'
      );

      expect(exception.message).toBe('Test error');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.operation).toBe('test-operation');
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create exception with all parameters', () => {
      const originalError = new Error('Original error');
      const exception = new TestCacheException(
        'Test error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'test-operation',
        'test-key',
        originalError
      );

      expect(exception.message).toBe('Test error');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.operation).toBe('test-operation');
      expect(exception.cacheKey).toBe('test-key');
      expect(exception.originalError).toBe(originalError);
    });

    it('should inherit from HttpException', () => {
      const exception = new TestCacheException(
        'Test error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'test-operation'
      );

      expect(exception).toBeInstanceOf(Error);
      expect(exception.name).toBe('TestCacheException');
    });
  });

  describe('CacheConnectionException', () => {
    it('should create connection exception with operation only', () => {
      const exception = new CacheConnectionException('connect');

      expect(exception.message).toBe('缓存连接失败: connect');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.operation).toBe('connect');
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create connection exception with cache key', () => {
      const exception = new CacheConnectionException('get', 'user:123');

      expect(exception.message).toBe('缓存连接失败: get (key: user:123)');
      expect(exception.operation).toBe('get');
      expect(exception.cacheKey).toBe('user:123');
      expect(exception.originalError).toBeUndefined();
    });

    it('should create connection exception with original error', () => {
      const originalError = new Error('ECONNREFUSED');
      const exception = new CacheConnectionException('set', 'user:123', originalError);

      expect(exception.originalError).toBe(originalError);
      expect(exception.operation).toBe('set');
      expect(exception.cacheKey).toBe('user:123');
    });
  });

  describe('CacheOperationException', () => {
    it('should create operation exception with operation only', () => {
      const exception = new CacheOperationException('set');

      expect(exception.message).toBe('缓存操作失败: set');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.operation).toBe('set');
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create operation exception with cache key and original error', () => {
      const originalError = new Error('Redis error');
      const exception = new CacheOperationException('set', 'config:app', originalError);

      expect(exception.message).toBe('缓存操作失败: set (key: config:app)');
      expect(exception.operation).toBe('set');
      expect(exception.cacheKey).toBe('config:app');
      expect(exception.originalError).toBe(originalError);
    });
  });

  describe('CacheValidationException', () => {
    it('should create validation exception with all required parameters', () => {
      const exception = new CacheValidationException(
        'validate-key',
        'length',
        'Key too long',
        'very-long-cache-key'
      );

      expect(exception.message).toBe('缓存参数验证失败: Key too long');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe('validate-key');
      expect(exception.validationType).toBe('length');
      expect(exception.cacheKey).toBe('very-long-cache-key');
      expect(exception.originalError).toBeUndefined();
    });

    it('should create validation exception with original error', () => {
      const originalError = new Error('Validation error');
      const exception = new CacheValidationException(
        'validate-format',
        'format',
        'Invalid format',
        'invalid-key',
        originalError
      );

      expect(exception.originalError).toBe(originalError);
      expect(exception.validationType).toBe('format');
    });
  });

  describe('CacheTimeoutException', () => {
    it('should create timeout exception with operation and timeout', () => {
      const exception = new CacheTimeoutException('get', 5000);

      expect(exception.message).toBe('缓存操作超时: get (timeout: 5000ms)');
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      expect(exception.operation).toBe('get');
      expect(exception.timeoutMs).toBe(5000);
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create timeout exception with cache key and original error', () => {
      const originalError = new Error('Timeout error');
      const exception = new CacheTimeoutException('get', 3000, 'slow-key', originalError);

      expect(exception.message).toBe('缓存操作超时: get (timeout: 3000ms) (key: slow-key)');
      expect(exception.cacheKey).toBe('slow-key');
      expect(exception.timeoutMs).toBe(3000);
      expect(exception.originalError).toBe(originalError);
    });
  });

  describe('CacheConfigurationException', () => {
    it('should create configuration exception with operation and config key', () => {
      const exception = new CacheConfigurationException('load-config', 'ttl-config');

      expect(exception.message).toBe('缓存配置错误: load-config (config: ttl-config)');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.operation).toBe('load-config');
      expect(exception.cacheKey).toBe('ttl-config'); // configKey is stored in cacheKey
      expect(exception.originalError).toBeUndefined();
    });

    it('should create configuration exception with original error', () => {
      const originalError = new Error('Config validation failed');
      const exception = new CacheConfigurationException('validate-config', 'cache-limits', originalError);

      expect(exception.originalError).toBe(originalError);
      expect(exception.cacheKey).toBe('cache-limits'); // configKey is stored in cacheKey
    });
  });

  describe('CacheSerializationException', () => {
    it('should create serialization exception with operation and serializer', () => {
      const exception = new CacheSerializationException('serialize', 'json');

      expect(exception.message).toBe('缓存序列化失败: serialize (type: json)');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe('serialize');
      expect(exception.serializationType).toBe('json'); // Correct property name
      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
    });

    it('should create serialization exception with all parameters', () => {
      const originalError = new Error('Circular reference');
      const exception = new CacheSerializationException(
        'serialize',
        'json',
        'complex-object',
        originalError
      );

      expect(exception.cacheKey).toBe('complex-object');
      expect(exception.originalError).toBe(originalError);
    });
  });

  describe('CacheLockException', () => {
    it('should create lock exception with operation and lock key', () => {
      const exception = new CacheLockException('acquire-lock', 'lock:user:123');

      expect(exception.message).toBe('缓存锁操作失败: acquire-lock (lock: lock:user:123)');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.operation).toBe('acquire-lock');
      expect(exception.lockKey).toBe('lock:user:123');
      expect(exception.originalError).toBeUndefined();
    });

    it('should create lock exception with original error', () => {
      const originalError = new Error('Lock timeout');
      const exception = new CacheLockException('acquire-lock', 'lock:resource', originalError);

      expect(exception.originalError).toBe(originalError);
      expect(exception.lockKey).toBe('lock:resource');
    });
  });

  describe('CacheBatchException', () => {
    it('should create batch exception with all required parameters', () => {
      const exception = new CacheBatchException(
        'mget',
        100,
        'Batch size exceeded'
      );

      expect(exception.message).toBe('缓存批量操作异常: Batch size exceeded (operation: mget, size: 100)');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.operation).toBe('mget');
      expect(exception.batchSize).toBe(100); // Correct property name
      expect(exception.originalError).toBeUndefined();
    });

    it('should create batch exception with original error', () => {
      const originalError = new Error('Batch processing failed');
      const exception = new CacheBatchException(
        'mset',
        50,
        'Partial batch failure',
        HttpStatus.BAD_REQUEST,
        100,
        originalError
      );

      expect(exception.originalError).toBe(originalError);
      expect(exception.batchSize).toBe(50);
      expect(exception.maxAllowed).toBe(100);
    });
  });

  describe('Exception Properties and Methods', () => {
    it('should preserve exception stack trace', () => {
      const exception = new CacheOperationException('test');

      expect(exception.stack).toBeDefined();
      expect(exception.stack).toContain('CacheOperationException');
    });

    it('should be serializable to JSON', () => {
      const originalError = new Error('Original error');
      const exception = new CacheConnectionException('connect', 'test-key', originalError);

      const serialized = JSON.stringify(exception);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('缓存连接失败: connect (key: test-key)');
      expect(parsed.operation).toBe('connect');
      expect(parsed.cacheKey).toBe('test-key');
    });

    it('should handle exceptions without optional parameters', () => {
      const exception = new CacheConnectionException('test');

      expect(exception.cacheKey).toBeUndefined();
      expect(exception.originalError).toBeUndefined();
      expect(exception.operation).toBe('test');
    });
  });

  describe('Exception Status Codes', () => {
    it('should have correct HTTP status codes', () => {
      expect(new CacheConnectionException('test').getStatus())
        .toBe(HttpStatus.SERVICE_UNAVAILABLE);

      expect(new CacheOperationException('test').getStatus())
        .toBe(HttpStatus.SERVICE_UNAVAILABLE);

      expect(new CacheValidationException('test', 'type', 'message').getStatus())
        .toBe(HttpStatus.BAD_REQUEST);

      expect(new CacheTimeoutException('test', 1000).getStatus())
        .toBe(HttpStatus.REQUEST_TIMEOUT);

      expect(new CacheLockException('test', 'lock').getStatus())
        .toBe(HttpStatus.CONFLICT);

      expect(new CacheSerializationException('test', 'json').getStatus())
        .toBe(HttpStatus.BAD_REQUEST);

      expect(new CacheConfigurationException('test', 'config').getStatus())
        .toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(new CacheBatchException('test', 100, 'message').getStatus())
        .toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Exception Inheritance', () => {
    it('should properly inherit from base exception classes', () => {
      const exceptions = [
        new CacheConnectionException('op'),
        new CacheOperationException('op'),
        new CacheValidationException('op', 'type', 'msg'),
        new CacheTimeoutException('op', 1000),
        new CacheLockException('op', 'lock'),
        new CacheSerializationException('op', 'json'),
        new CacheConfigurationException('op', 'config'),
        new CacheBatchException('op', 100, 'msg'),
      ];

      exceptions.forEach(exception => {
        expect(exception).toBeInstanceOf(Error);
        expect(exception.operation).toBeDefined();
      });
    });
  });

  describe('Error Context Information', () => {
    it('should provide sufficient context for debugging', () => {
      const originalError = new Error('Redis timeout');
      const exception = new CacheOperationException(
        'get',
        'user:session:abc123',
        originalError
      );

      expect(exception.message).toContain('缓存操作失败: get');
      expect(exception.operation).toBe('get');
      expect(exception.cacheKey).toBe('user:session:abc123');
      expect(exception.originalError.message).toBe('Redis timeout');
    });

    it('should handle edge cases gracefully', () => {
      // Long key
      const longKey = 'x'.repeat(1000);
      const longKeyException = new CacheOperationException('set', longKey);
      expect(longKeyException.cacheKey).toBe(longKey);

      // Special characters in operation
      const specialOpException = new CacheOperationException('custom-operation:v2');
      expect(specialOpException.operation).toBe('custom-operation:v2');
    });
  });
});