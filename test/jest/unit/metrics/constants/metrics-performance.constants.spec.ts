import {
  PERFORMANCE_REDIS_KEYS,
  PERFORMANCE_INTERVALS,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TTL,
  METRIC_NAMES,
  METRIC_UNITS,
  HEALTH_SCORE_CONFIG,
  PERFORMANCE_DEFAULTS,
  PERFORMANCE_EVENTS,
  API_KEY_CONSTANTS,
  REDIS_INFO,
} from '../../../../../src/metrics/constants/metrics-performance.constants';

describe('Metrics Performance Constants', () => {
  describe('PERFORMANCE_REDIS_KEYS', () => {
    it('should have all required Redis key prefixes', () => {
      expect(PERFORMANCE_REDIS_KEYS.METRICS_PREFIX).toBe('metrics');
      expect(PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX).toBe('metrics:endpoint_stats');
      expect(PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY).toBe('metrics:db_query_times');
      expect(PERFORMANCE_REDIS_KEYS.SYSTEM_METRICS_PREFIX).toBe('metrics:system');
      expect(PERFORMANCE_REDIS_KEYS.CACHE_METRICS_PREFIX).toBe('metrics:cache');
      expect(PERFORMANCE_REDIS_KEYS.AUTH_METRICS_PREFIX).toBe('metrics:auth');
      expect(PERFORMANCE_REDIS_KEYS.RATE_LIMIT_METRICS_PREFIX).toBe('metrics:rate_limit');
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(PERFORMANCE_REDIS_KEYS)).toBe(true);
    });

    it('should have consistent naming pattern', () => {
      Object.values(PERFORMANCE_REDIS_KEYS).forEach(key => {
        expect(key).toMatch(/^metrics(:[a-z_]+)*$/);
      });
    });
  });

  describe('PERFORMANCE_INTERVALS', () => {
    it('should have all required intervals in milliseconds', () => {
      expect(PERFORMANCE_INTERVALS.FLUSH_INTERVAL).toBe(10000);
      expect(PERFORMANCE_INTERVALS.CLEANUP_INTERVAL).toBe(3600000);
      expect(PERFORMANCE_INTERVALS.SYSTEM_METRICS_INTERVAL).toBe(30000);
      expect(PERFORMANCE_INTERVALS.HEALTH_CHECK_INTERVAL).toBe(60000);
    });

    it('should have reasonable interval values', () => {
      expect(PERFORMANCE_INTERVALS.FLUSH_INTERVAL).toBeGreaterThan(0);
      expect(PERFORMANCE_INTERVALS.CLEANUP_INTERVAL).toBeGreaterThan(PERFORMANCE_INTERVALS.HEALTH_CHECK_INTERVAL);
      expect(PERFORMANCE_INTERVALS.HEALTH_CHECK_INTERVAL).toBeGreaterThan(PERFORMANCE_INTERVALS.SYSTEM_METRICS_INTERVAL);
      expect(PERFORMANCE_INTERVALS.SYSTEM_METRICS_INTERVAL).toBeGreaterThan(PERFORMANCE_INTERVALS.FLUSH_INTERVAL);
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(PERFORMANCE_INTERVALS)).toBe(true);
    });
  });

  describe('PERFORMANCE_LIMITS', () => {
    it('should have all required limits', () => {
      expect(PERFORMANCE_LIMITS.MAX_METRIC_BUFFER_SIZE).toBe(2000);
      expect(PERFORMANCE_LIMITS.MAX_DB_QUERY_TIMES).toBe(1000);
      expect(PERFORMANCE_LIMITS.MAX_RESPONSE_TIMES_PER_ENDPOINT).toBe(500);
      expect(PERFORMANCE_LIMITS.MAX_REDIS_KEY_SCAN_COUNT).toBe(1000);
      expect(PERFORMANCE_LIMITS.MAX_ALERT_BUFFER_SIZE).toBe(100);
    });

    it('should have positive limit values', () => {
      Object.values(PERFORMANCE_LIMITS).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
      });
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(PERFORMANCE_LIMITS)).toBe(true);
    });
  });

  describe('PERFORMANCE_TTL', () => {
    it('should have all required TTL values in seconds', () => {
      expect(typeof PERFORMANCE_TTL.ENDPOINT_STATS).toBe('number');
      expect(typeof PERFORMANCE_TTL.DB_QUERY_TIMES).toBe('number');
      expect(typeof PERFORMANCE_TTL.SYSTEM_METRICS).toBe('number');
      expect(PERFORMANCE_TTL.ALERT_HISTORY).toBe(604800); // 7 days
    });

    it('should have positive TTL values', () => {
      Object.values(PERFORMANCE_TTL).forEach(ttl => {
        expect(ttl).toBeGreaterThan(0);
      });
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(PERFORMANCE_TTL)).toBe(true);
    });
  });

  describe('METRIC_NAMES', () => {
    it('should have all metric names defined', () => {
      const expectedNames = [
        'API_REQUEST_DURATION', 'API_REQUEST_TOTAL',
        'DB_QUERY_DURATION', 'DB_CONNECTION_POOL_SIZE', 'DB_ACTIVE_CONNECTIONS',
        'CACHE_OPERATION_TOTAL', 'CACHE_OPERATION_DURATION', 'CACHE_HIT_RATE',
        'AUTH_DURATION', 'AUTH_TOTAL',
        'RATE_LIMIT_CHECK', 'RATE_LIMIT_REMAINING',
        'SYSTEM_CPU_USAGE', 'SYSTEM_MEMORY_USAGE', 'SYSTEM_HEAP_USED', 'SYSTEM_UPTIME', 'SYSTEM_EVENT_LOOP_LAG',
        'HEALTH_SCORE', 'HEALTH_STATUS'
      ];

      expectedNames.forEach(name => {
        expect(METRIC_NAMES[name]).toBeDefined();
        expect(typeof METRIC_NAMES[name]).toBe('string');
      });
    });

    it('should have snake_case metric names', () => {
      Object.values(METRIC_NAMES).forEach(name => {
        expect(name).toMatch(/^[a-z][a-z_]*[a-z]$/);
      });
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(METRIC_NAMES)).toBe(true);
    });
  });

  describe('METRIC_UNITS', () => {
    it('should have all standard units', () => {
      expect(METRIC_UNITS.MILLISECONDS).toBe('ms');
      expect(METRIC_UNITS.SECONDS).toBe('seconds');
      expect(METRIC_UNITS.BYTES).toBe('bytes');
      expect(METRIC_UNITS.PERCENT).toBe('percent');
      expect(METRIC_UNITS.COUNT).toBe('count');
      expect(METRIC_UNITS.RATE).toBe('rate');
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(METRIC_UNITS)).toBe(true);
    });
  });

  describe('HEALTH_SCORE_CONFIG', () => {
    it('should have all health score components with weights', () => {
      expect(HEALTH_SCORE_CONFIG.errorRate.weight).toBe(30);
      expect(HEALTH_SCORE_CONFIG.responseTime.weight).toBe(25);
      expect(HEALTH_SCORE_CONFIG.cpuUsage.weight).toBe(20);
      expect(HEALTH_SCORE_CONFIG.memoryUsage.weight).toBe(15);
      expect(HEALTH_SCORE_CONFIG.dbPerformance.weight).toBe(10);
    });

    it('should have total weight sum to 100', () => {
      const totalWeight = Object.values(HEALTH_SCORE_CONFIG)
        .reduce((sum, config) => sum + config.weight, 0);
      expect(totalWeight).toBe(100);
    });

    it('should have tiers with thresholds and penalties', () => {
      const configsWithTiers = [
        'responseTime', 'cpuUsage', 'memoryUsage', 'dbPerformance'
      ];

      configsWithTiers.forEach(configName => {
        const config = HEALTH_SCORE_CONFIG[configName];
        if (config.tiers) {
          config.tiers.forEach((tier: { threshold: number; penalty: number }) => {
            expect(tier.threshold).toBeGreaterThan(0);
            expect(tier.penalty).toBeGreaterThan(0);
            expect(tier.penalty).toBeLessThanOrEqual(1);
          });
        }
      });
    });
  });

  describe('PERFORMANCE_DEFAULTS', () => {
    it('should have all default values', () => {
      expect(PERFORMANCE_DEFAULTS.DB_POOL_SIZE).toBe(50);
      expect(PERFORMANCE_DEFAULTS.REDIS_MEMORY_USAGE).toBe(0);
      expect(PERFORMANCE_DEFAULTS.SYSTEM_CPU_USAGE).toBe(0);
      expect(PERFORMANCE_DEFAULTS.SYSTEM_MEMORY_USAGE).toBe(0);
      expect(PERFORMANCE_DEFAULTS.CACHE_HIT_RATE).toBe(0);
      expect(PERFORMANCE_DEFAULTS.HEALTH_SCORE).toBe(100);
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(PERFORMANCE_DEFAULTS)).toBe(true);
    });
  });

  describe('PERFORMANCE_EVENTS', () => {
    it('should have all event names with proper namespace', () => {
      Object.values(PERFORMANCE_EVENTS).forEach(eventName => {
        expect(eventName).toMatch(/^performance\.[a-z_]+$/);
      });
    });

    it('should be frozen object', () => {
      expect(Object.isFrozen(PERFORMANCE_EVENTS)).toBe(true);
    });
  });

  describe('API_KEY_CONSTANTS', () => {
    it('should have prefix length defined', () => {
      expect(API_KEY_CONSTANTS.PREFIX_LENGTH).toBe(8);
      expect(typeof API_KEY_CONSTANTS.PREFIX_LENGTH).toBe('number');
    });
  });

  describe('REDIS_INFO', () => {
    it('should have all Redis info sections', () => {
      expect(REDIS_INFO.SECTIONS.MEMORY).toBe('memory');
      expect(REDIS_INFO.SECTIONS.STATS).toBe('stats');
      expect(REDIS_INFO.SECTIONS.CLIENTS).toBe('clients');
    });

    it('should have all Redis info keys', () => {
      const expectedKeys = [
        'USED_MEMORY', 'CONNECTED_CLIENTS', 'TOTAL_COMMANDS_PROCESSED',
        'KEYSPACE_HITS', 'KEYSPACE_MISSES', 'EVICTED_KEYS', 'EXPIRED_KEYS'
      ];

      expectedKeys.forEach(key => {
        expect(REDIS_INFO.KEYS[key]).toBeDefined();
        expect(typeof REDIS_INFO.KEYS[key]).toBe('string');
      });
    });
  });
});
