/**
 * Cache Keys Constants 单元测试
 * 测试缓存键值常量的完整性和构建函数的正确性
 */

import {
  CACHE_KEYS,
  buildCacheKey,
} from '@cache/constants/config/cache-keys.constants';

describe('CACHE_KEYS', () => {
  describe('constant structure validation', () => {
    it('should be frozen object (immutable)', () => {
      expect(Object.isFrozen(CACHE_KEYS)).toBe(true);
    });

    it('should have PREFIXES property', () => {
      expect(CACHE_KEYS).toHaveProperty('PREFIXES');
      expect(typeof CACHE_KEYS.PREFIXES).toBe('object');
    });

    it('should have TEMPLATES property', () => {
      expect(CACHE_KEYS).toHaveProperty('TEMPLATES');
      expect(typeof CACHE_KEYS.TEMPLATES).toBe('object');
    });
  });

  describe('PREFIXES', () => {
    it('should have all required prefix properties', () => {
      const prefixes = CACHE_KEYS.PREFIXES;

      expect(prefixes).toHaveProperty('HEALTH');
      expect(prefixes).toHaveProperty('METRICS');
      expect(prefixes).toHaveProperty('LOCK');
      expect(prefixes).toHaveProperty('CONFIG');
      expect(prefixes).toHaveProperty('UNIFIED');
    });

    it('should have consistent prefix format', () => {
      Object.values(CACHE_KEYS.PREFIXES).forEach(prefix => {
        expect(typeof prefix).toBe('string');
        expect(prefix).toMatch(/^cache:[a-z]+:$/);
        expect(prefix.startsWith('cache:')).toBe(true);
        expect(prefix.endsWith(':')).toBe(true);
      });
    });

    it('should have correct prefix values', () => {
      expect(CACHE_KEYS.PREFIXES.HEALTH).toBe('cache:health:');
      expect(CACHE_KEYS.PREFIXES.METRICS).toBe('cache:metrics:');
      expect(CACHE_KEYS.PREFIXES.LOCK).toBe('cache:lock:');
      expect(CACHE_KEYS.PREFIXES.CONFIG).toBe('cache:config:');
      expect(CACHE_KEYS.PREFIXES.UNIFIED).toBe('cache:unified:');
    });

    it('should have unique prefixes', () => {
      const prefixValues = Object.values(CACHE_KEYS.PREFIXES);
      const uniqueValues = [...new Set(prefixValues)];
      expect(prefixValues.length).toBe(uniqueValues.length);
    });
  });

  describe('TEMPLATES', () => {
    it('should have all template functions', () => {
      const templates = CACHE_KEYS.TEMPLATES;

      expect(templates).toHaveProperty('TTL_CONFIG');
      expect(templates).toHaveProperty('LIMITS_CONFIG');
      expect(templates).toHaveProperty('PERFORMANCE_CONFIG');

      expect(typeof templates.TTL_CONFIG).toBe('function');
      expect(typeof templates.LIMITS_CONFIG).toBe('function');
      expect(typeof templates.PERFORMANCE_CONFIG).toBe('function');
    });

    it('should generate correct TTL config keys', () => {
      const ttlTemplate = CACHE_KEYS.TEMPLATES.TTL_CONFIG;

      expect(ttlTemplate('component1')).toBe('cache:config:ttl:component1');
      expect(ttlTemplate('auth')).toBe('cache:config:ttl:auth');
      expect(ttlTemplate('monitoring')).toBe('cache:config:ttl:monitoring');
    });

    it('should generate correct limits config keys', () => {
      const limitsTemplate = CACHE_KEYS.TEMPLATES.LIMITS_CONFIG;

      expect(limitsTemplate('memory')).toBe('cache:config:limits:memory');
      expect(limitsTemplate('connections')).toBe('cache:config:limits:connections');
      expect(limitsTemplate('requests')).toBe('cache:config:limits:requests');
    });

    it('should generate correct performance config keys', () => {
      const perfTemplate = CACHE_KEYS.TEMPLATES.PERFORMANCE_CONFIG;

      expect(perfTemplate('latency')).toBe('cache:config:perf:latency');
      expect(perfTemplate('throughput')).toBe('cache:config:perf:throughput');
      expect(perfTemplate('hit_rate')).toBe('cache:config:perf:hit_rate');
    });

    it('should handle empty strings in templates', () => {
      expect(CACHE_KEYS.TEMPLATES.TTL_CONFIG('')).toBe('cache:config:ttl:');
      expect(CACHE_KEYS.TEMPLATES.LIMITS_CONFIG('')).toBe('cache:config:limits:');
      expect(CACHE_KEYS.TEMPLATES.PERFORMANCE_CONFIG('')).toBe('cache:config:perf:');
    });

    it('should handle special characters in templates', () => {
      expect(CACHE_KEYS.TEMPLATES.TTL_CONFIG('test-component')).toBe('cache:config:ttl:test-component');
      expect(CACHE_KEYS.TEMPLATES.LIMITS_CONFIG('max_size')).toBe('cache:config:limits:max_size');
      expect(CACHE_KEYS.TEMPLATES.PERFORMANCE_CONFIG('avg.latency')).toBe('cache:config:perf:avg.latency');
    });
  });
});

describe('buildCacheKey', () => {
  describe('structure validation', () => {
    it('should be frozen object (immutable)', () => {
      expect(Object.isFrozen(buildCacheKey)).toBe(true);
    });

    it('should have all builder functions', () => {
      expect(buildCacheKey).toHaveProperty('health');
      expect(buildCacheKey).toHaveProperty('metrics');
      expect(buildCacheKey).toHaveProperty('lock');
      expect(buildCacheKey).toHaveProperty('config');

      expect(typeof buildCacheKey.health).toBe('function');
      expect(typeof buildCacheKey.metrics).toBe('function');
      expect(typeof buildCacheKey.lock).toBe('function');
      expect(typeof buildCacheKey.config).toBe('function');
    });
  });

  describe('health key builder', () => {
    it('should build basic health keys', () => {
      expect(buildCacheKey.health('status')).toBe('cache:health:status');
      expect(buildCacheKey.health('memory')).toBe('cache:health:memory');
      expect(buildCacheKey.health('connection')).toBe('cache:health:connection');
    });

    it('should build health keys with ID', () => {
      expect(buildCacheKey.health('status', 'check1')).toBe('cache:health:status:check1');
      expect(buildCacheKey.health('memory', 'node1')).toBe('cache:health:memory:node1');
      expect(buildCacheKey.health('connection', 'redis-1')).toBe('cache:health:connection:redis-1');
    });

    it('should handle empty strings and undefined IDs', () => {
      expect(buildCacheKey.health('')).toBe('cache:health:');
      expect(buildCacheKey.health('status', '')).toBe('cache:health:status:');
      expect(buildCacheKey.health('status', undefined)).toBe('cache:health:status');
    });

    it('should handle special characters', () => {
      expect(buildCacheKey.health('health-check')).toBe('cache:health:health-check');
      expect(buildCacheKey.health('status', 'node-1')).toBe('cache:health:status:node-1');
      expect(buildCacheKey.health('memory_usage', 'server.1')).toBe('cache:health:memory_usage:server.1');
    });
  });

  describe('metrics key builder', () => {
    it('should build basic metrics keys', () => {
      expect(buildCacheKey.metrics('hit_rate')).toBe('cache:metrics:hit_rate');
      expect(buildCacheKey.metrics('latency')).toBe('cache:metrics:latency');
      expect(buildCacheKey.metrics('throughput')).toBe('cache:metrics:throughput');
    });

    it('should build metrics keys with timeframe', () => {
      expect(buildCacheKey.metrics('hit_rate', '1h')).toBe('cache:metrics:hit_rate:1h');
      expect(buildCacheKey.metrics('latency', '5m')).toBe('cache:metrics:latency:5m');
      expect(buildCacheKey.metrics('throughput', 'daily')).toBe('cache:metrics:throughput:daily');
    });

    it('should handle empty strings and undefined timeframes', () => {
      expect(buildCacheKey.metrics('')).toBe('cache:metrics:');
      expect(buildCacheKey.metrics('hit_rate', '')).toBe('cache:metrics:hit_rate:');
      expect(buildCacheKey.metrics('hit_rate', undefined)).toBe('cache:metrics:hit_rate');
    });

    it('should handle complex timeframes', () => {
      expect(buildCacheKey.metrics('performance', '1h-avg')).toBe('cache:metrics:performance:1h-avg');
      expect(buildCacheKey.metrics('errors', 'last_24h')).toBe('cache:metrics:errors:last_24h');
      expect(buildCacheKey.metrics('cpu_usage', 'p95-5m')).toBe('cache:metrics:cpu_usage:p95-5m');
    });
  });

  describe('lock key builder', () => {
    it('should build basic lock keys', () => {
      expect(buildCacheKey.lock('resource1')).toBe('cache:lock:resource1');
      expect(buildCacheKey.lock('user_data')).toBe('cache:lock:user_data');
      expect(buildCacheKey.lock('config_update')).toBe('cache:lock:config_update');
    });

    it('should build lock keys with operation', () => {
      expect(buildCacheKey.lock('resource1', 'write')).toBe('cache:lock:resource1:write');
      expect(buildCacheKey.lock('user_data', 'update')).toBe('cache:lock:user_data:update');
      expect(buildCacheKey.lock('config', 'reload')).toBe('cache:lock:config:reload');
    });

    it('should handle empty strings and undefined operations', () => {
      expect(buildCacheKey.lock('')).toBe('cache:lock:');
      expect(buildCacheKey.lock('resource', '')).toBe('cache:lock:resource:');
      expect(buildCacheKey.lock('resource', undefined)).toBe('cache:lock:resource');
    });

    it('should handle complex resource and operation names', () => {
      expect(buildCacheKey.lock('user-profile', 'batch-update')).toBe('cache:lock:user-profile:batch-update');
      expect(buildCacheKey.lock('database.table', 'schema_migration')).toBe('cache:lock:database.table:schema_migration');
      expect(buildCacheKey.lock('cache_warmup', 'full_reload')).toBe('cache:lock:cache_warmup:full_reload');
    });
  });

  describe('config key builder', () => {
    it('should build basic config keys', () => {
      expect(buildCacheKey.config('ttl')).toBe('cache:config:ttl');
      expect(buildCacheKey.config('limits')).toBe('cache:config:limits');
      expect(buildCacheKey.config('performance')).toBe('cache:config:performance');
    });

    it('should build config keys with version', () => {
      expect(buildCacheKey.config('ttl', '1')).toBe('cache:config:ttl:v1');
      expect(buildCacheKey.config('limits', '2.0')).toBe('cache:config:limits:v2.0');
      expect(buildCacheKey.config('performance', 'latest')).toBe('cache:config:performance:vlatest');
    });

    it('should handle empty strings and undefined versions', () => {
      expect(buildCacheKey.config('')).toBe('cache:config:');
      expect(buildCacheKey.config('ttl', '')).toBe('cache:config:ttl:v');
      expect(buildCacheKey.config('ttl', undefined)).toBe('cache:config:ttl');
    });

    it('should handle version prefixing consistently', () => {
      expect(buildCacheKey.config('schema', '1.0.0')).toBe('cache:config:schema:v1.0.0');
      expect(buildCacheKey.config('api', 'beta')).toBe('cache:config:api:vbeta');
      expect(buildCacheKey.config('feature_flags', '2023-12')).toBe('cache:config:feature_flags:v2023-12');
    });
  });

  describe('integration scenarios', () => {
    it('should generate keys that match expected patterns', () => {
      const healthKey = buildCacheKey.health('redis', 'node1');
      const metricsKey = buildCacheKey.metrics('latency', '5m');
      const lockKey = buildCacheKey.lock('user:123', 'write');
      const configKey = buildCacheKey.config('ttl', '1.0');

      expect(healthKey).toMatch(/^cache:health:.+:.+$/);
      expect(metricsKey).toMatch(/^cache:metrics:.+:.+$/);
      expect(lockKey).toMatch(/^cache:lock:.+:.+$/);
      expect(configKey).toMatch(/^cache:config:.+:v.+$/);
    });

    it('should support cache key validation patterns', () => {
      const keys = [
        buildCacheKey.health('status'),
        buildCacheKey.metrics('hit_rate', '1h'),
        buildCacheKey.lock('resource', 'read'),
        buildCacheKey.config('limits', '2')
      ];

      keys.forEach(key => {
        expect(key.startsWith('cache:')).toBe(true);
        expect(key.split(':').length).toBeGreaterThanOrEqual(3);
        expect(key).not.toContain('  '); // No double spaces
        expect(key).not.toMatch(/::+/); // No double colons
      });
    });

    it('should support different cache hierarchies', () => {
      // Health hierarchy
      const healthKeys = [
        buildCacheKey.health('redis'),
        buildCacheKey.health('redis', 'primary'),
        buildCacheKey.health('redis', 'secondary')
      ];

      healthKeys.forEach(key => {
        expect(key.startsWith('cache:health:')).toBe(true);
      });

      // Metrics hierarchy
      const metricsKeys = [
        buildCacheKey.metrics('performance'),
        buildCacheKey.metrics('performance', '1m'),
        buildCacheKey.metrics('performance', '1h')
      ];

      metricsKeys.forEach(key => {
        expect(key.startsWith('cache:metrics:')).toBe(true);
      });
    });

    it('should create unique keys for different parameters', () => {
      const keys = new Set([
        buildCacheKey.health('status', 'node1'),
        buildCacheKey.health('status', 'node2'),
        buildCacheKey.metrics('latency', '1m'),
        buildCacheKey.metrics('latency', '5m'),
        buildCacheKey.lock('resource1', 'read'),
        buildCacheKey.lock('resource1', 'write'),
        buildCacheKey.config('ttl', '1'),
        buildCacheKey.config('ttl', '2')
      ]);

      expect(keys.size).toBe(8); // All keys should be unique
    });
  });

  describe('consistency with CACHE_KEYS.PREFIXES', () => {
    it('should use consistent prefixes', () => {
      expect(buildCacheKey.health('test').startsWith(CACHE_KEYS.PREFIXES.HEALTH)).toBe(true);
      expect(buildCacheKey.metrics('test').startsWith(CACHE_KEYS.PREFIXES.METRICS)).toBe(true);
      expect(buildCacheKey.lock('test').startsWith(CACHE_KEYS.PREFIXES.LOCK)).toBe(true);
      expect(buildCacheKey.config('test').startsWith(CACHE_KEYS.PREFIXES.CONFIG)).toBe(true);
    });

    it('should maintain prefix format consistency', () => {
      const healthKey = buildCacheKey.health('test');
      const expectedPrefix = CACHE_KEYS.PREFIXES.HEALTH;

      expect(healthKey.substring(0, expectedPrefix.length)).toBe(expectedPrefix);
      expect(healthKey.substring(expectedPrefix.length)).toBe('test');
    });
  });
});
