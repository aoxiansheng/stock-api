/**
 * MonitoringCacheKeys Unit Tests
 * 测试监控缓存键管理工具类的功能
 */

import { Request } from 'express';
import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';
import { HttpHeadersUtil } from '@common/utils/http-headers.util';
import { UniversalExceptionFactory } from '@common/core/exceptions';

// Mock dependencies
jest.mock('@common/utils/http-headers.util');

describe('MonitoringCacheKeys', () => {
  describe('health', () => {
    it('should generate health cache key without request', () => {
      const key = MonitoringCacheKeys.health('test-key');
      expect(key).toBe('monitoring:health:test-key');
    });

    it('should generate health cache key with request', () => {
      const mockRequest = {} as Request;
      (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockReturnValue('client-123');

      const key = MonitoringCacheKeys.health('test-key', mockRequest);
      expect(key).toBe('monitoring:health:test-key:client-123');
      expect(HttpHeadersUtil.getSecureClientIdentifier).toHaveBeenCalledWith(mockRequest);
    });

    it('should fallback to basic key when client identifier fails', () => {
      const mockRequest = {} as Request;
      (HttpHeadersUtil.getSecureClientIdentifier as jest.Mock).mockImplementation(() => {
        throw new Error('Client ID error');
      });

      const key = MonitoringCacheKeys.health('test-key', mockRequest);
      expect(key).toBe('monitoring:health:test-key');
    });
  });

  describe('trend', () => {
    it('should generate trend cache key', () => {
      const key = MonitoringCacheKeys.trend('test-key');
      expect(key).toBe('monitoring:trend:test-key');
    });
  });

  describe('performance', () => {
    it('should generate performance cache key', () => {
      const key = MonitoringCacheKeys.performance('test-key');
      expect(key).toBe('monitoring:performance:test-key');
    });
  });

  describe('alert', () => {
    it('should generate alert cache key', () => {
      const key = MonitoringCacheKeys.alert('test-key');
      expect(key).toBe('monitoring:alert:test-key');
    });
  });

  describe('cacheStats', () => {
    it('should generate cache stats cache key', () => {
      const key = MonitoringCacheKeys.cacheStats('test-key');
      expect(key).toBe('monitoring:cache_stats:test-key');
    });
  });

  describe('validateKey', () => {
    it('should validate correct key format', () => {
      const key = MonitoringCacheKeys.validateKey('valid-key');
      expect(key).toBe('valid-key');
    });

    it('should throw error for null key', () => {
      expect(() => MonitoringCacheKeys.validateKey(null as any)).toThrow(
        'Cache key name cannot be empty and must be a string'
      );
    });

    it('should throw error for undefined key', () => {
      expect(() => MonitoringCacheKeys.validateKey(undefined as any)).toThrow(
        'Cache key name cannot be empty and must be a string'
      );
    });

    it('should throw error for non-string key', () => {
      expect(() => MonitoringCacheKeys.validateKey(123 as any)).toThrow(
        'Cache key name cannot be empty and must be a string'
      );
    });

    it('should throw error for empty string key', () => {
      expect(() => MonitoringCacheKeys.validateKey('')).toThrow(
        'Cache key name cannot be empty string'
      );
    });

    it('should throw error for whitespace-only key', () => {
      expect(() => MonitoringCacheKeys.validateKey('   ')).toThrow(
        'Cache key name cannot be empty string'
      );
    });

    it('should throw error for key with colons', () => {
      expect(() => MonitoringCacheKeys.validateKey('invalid:key')).toThrow(
        'Cache key name cannot contain colons, spaces, or newline characters'
      );
    });

    it('should throw error for key with spaces', () => {
      expect(() => MonitoringCacheKeys.validateKey('invalid key')).toThrow(
        'Cache key name cannot contain colons, spaces, or newline characters'
      );
    });

    it('should throw error for key with newlines', () => {
      expect(() => MonitoringCacheKeys.validateKey('invalid\nkey')).toThrow(
        'Cache key name cannot contain colons, spaces, or newline characters'
      );
    });

    it('should throw error for key exceeding 200 characters', () => {
      const longKey = 'a'.repeat(201);
      expect(() => MonitoringCacheKeys.validateKey(longKey)).toThrow(
        'Cache key name length cannot exceed 200 characters'
      );
    });

    it('should trim whitespace from key', () => {
      const key = MonitoringCacheKeys.validateKey('  valid-key  ');
      expect(key).toBe('valid-key');
    });
  });

  describe('sanitizeClientId', () => {
    it('should sanitize client ID by removing invalid characters', () => {
      const sanitized = (MonitoringCacheKeys as any).sanitizeClientId('client@123#test');
      expect(sanitized).toBe('client123test');
    });

    it('should limit client ID to 32 characters', () => {
      const longId = 'a'.repeat(40);
      const sanitized = (MonitoringCacheKeys as any).sanitizeClientId(longId);
      expect(sanitized).toHaveLength(32);
    });
  });

  describe('batch', () => {
    it('should generate batch health cache keys without request', () => {
      const keys = MonitoringCacheKeys.batch('health', ['key1', 'key2']);
      expect(keys).toEqual([
        'monitoring:health:key1',
        'monitoring:health:key2'
      ]);
    });

    it('should generate batch trend cache keys', () => {
      const keys = MonitoringCacheKeys.batch('trend', ['key1', 'key2']);
      expect(keys).toEqual([
        'monitoring:trend:key1',
        'monitoring:trend:key2'
      ]);
    });

    it('should generate batch performance cache keys', () => {
      const keys = MonitoringCacheKeys.batch('performance', ['key1', 'key2']);
      expect(keys).toEqual([
        'monitoring:performance:key1',
        'monitoring:performance:key2'
      ]);
    });

    it('should generate batch alert cache keys', () => {
      const keys = MonitoringCacheKeys.batch('alert', ['key1', 'key2']);
      expect(keys).toEqual([
        'monitoring:alert:key1',
        'monitoring:alert:key2'
      ]);
    });

    it('should generate batch cacheStats cache keys', () => {
      const keys = MonitoringCacheKeys.batch('cacheStats', ['key1', 'key2']);
      expect(keys).toEqual([
        'monitoring:cache_stats:key1',
        'monitoring:cache_stats:key2'
      ]);
    });

    it('should throw error for unsupported cache type', () => {
      expect(() => MonitoringCacheKeys.batch('invalid' as any, ['key1'])).toThrow(
        'Unsupported cache type: invalid'
      );
    });

    it('should throw error for non-array keys', () => {
      expect(() => MonitoringCacheKeys.batch('health', 'invalid' as any)).toThrow(
        'Keys must be an array'
      );
    });
  });

  describe('withTimestamp', () => {
    it('should generate key with timestamp', () => {
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
      
      const key = MonitoringCacheKeys.withTimestamp('test-key');
      expect(key).toBe('test-key:1672531200000');
      
      jest.useRealTimers();
    });

    it('should generate key with time window', () => {
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
      
      const key = MonitoringCacheKeys.withTimestamp('test-key', 3600000); // 1 hour
      expect(key).toBe('test-key:w464592');
      
      jest.useRealTimers();
    });
  });

  describe('aggregate', () => {
    it('should generate aggregate cache key', () => {
      const key = MonitoringCacheKeys.aggregate('health', 'avg', '1h', 'test-id');
      expect(key).toBe('monitoring:health:agg:avg:1h:test-id');
    });

    it('should validate aggregation type', () => {
      expect(() => MonitoringCacheKeys.aggregate('health', 'invalid' as any, '1h', 'test-id'))
        .toThrow('Cache key name cannot contain colons, spaces, or newline characters');
    });

    it('should validate time window', () => {
      expect(() => MonitoringCacheKeys.aggregate('health', 'avg', 'invalid window', 'test-id'))
        .toThrow('Cache key name cannot contain colons, spaces, or newline characters');
    });

    it('should validate identifier', () => {
      expect(() => MonitoringCacheKeys.aggregate('health', 'avg', '1h', 'invalid:id'))
        .toThrow('Cache key name cannot contain colons, spaces, or newline characters');
    });
  });
});