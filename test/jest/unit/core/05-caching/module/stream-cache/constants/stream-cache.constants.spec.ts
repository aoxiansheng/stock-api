import {
  STREAM_CACHE_CONFIG,
  DEFAULT_STREAM_CACHE_CONFIG
} from '@core/05-caching/module/stream-cache/constants/stream-cache.constants';
import {
  CACHE_CORE_TTL,
  CACHE_CORE_INTERVALS,
  CACHE_CORE_BATCH_SIZES
} from '@core/05-caching/foundation/constants/core-values.constants';

describe('Stream Cache Constants', () => {
  describe('STREAM_CACHE_CONFIG', () => {
    describe('TTL Configuration', () => {
      it('should have hot cache TTL mapped to real-time TTL', () => {
        expect(STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S).toBe(CACHE_CORE_TTL.REAL_TIME_TTL_SECONDS);
      });

      it('should have warm cache TTL mapped to batch query TTL', () => {
        expect(STREAM_CACHE_CONFIG.TTL.WARM_CACHE_TTL_S).toBe(CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS);
      });

      it('should use appropriate TTL values for stream cache', () => {
        expect(STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S).toBeGreaterThan(0);
        expect(STREAM_CACHE_CONFIG.TTL.WARM_CACHE_TTL_S).toBeGreaterThan(STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S);
      });
    });

    describe('Capacity Configuration', () => {
      it('should have max hot cache size defined', () => {
        expect(STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE).toBe(1000);
        expect(typeof STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE).toBe('number');
      });

      it('should have max batch size mapped to stream batch size', () => {
        expect(STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE).toBe(CACHE_CORE_BATCH_SIZES.STREAM_BATCH_SIZE);
      });

      it('should use reasonable capacity values', () => {
        expect(STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE).toBeGreaterThan(0);
        expect(STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE).toBeGreaterThan(0);
      });
    });

    describe('Cleanup Configuration', () => {
      it('should have cleanup interval mapped to core cleanup interval', () => {
        expect(STREAM_CACHE_CONFIG.CLEANUP.INTERVAL_MS).toBe(CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS);
      });

      it('should have max cleanup items mapped to large batch size', () => {
        expect(STREAM_CACHE_CONFIG.CLEANUP.MAX_CLEANUP_ITEMS).toBe(CACHE_CORE_BATCH_SIZES.LARGE_BATCH_SIZE);
      });

      it('should use appropriate cleanup timing', () => {
        expect(STREAM_CACHE_CONFIG.CLEANUP.INTERVAL_MS).toBeGreaterThan(0);
        expect(STREAM_CACHE_CONFIG.CLEANUP.MAX_CLEANUP_ITEMS).toBeGreaterThan(0);
      });
    });

    describe('Stream-Specific Configuration', () => {
      it('should have compression threshold defined', () => {
        expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.COMPRESSION_THRESHOLD_BYTES).toBe(1024);
        expect(typeof STREAM_CACHE_CONFIG.STREAM_SPECIFIC.COMPRESSION_THRESHOLD_BYTES).toBe('number');
      });

      it('should have connection timeout mapped to core connection timeout', () => {
        expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.CONNECTION_TIMEOUT_MS).toBe(CACHE_CORE_INTERVALS.CONNECTION_TIMEOUT_MS);
      });

      it('should have heartbeat interval mapped to core heartbeat interval', () => {
        expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.HEARTBEAT_INTERVAL_MS).toBe(CACHE_CORE_INTERVALS.HEARTBEAT_INTERVAL_MS);
      });

      it('should use reasonable stream-specific values', () => {
        expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.COMPRESSION_THRESHOLD_BYTES).toBeGreaterThan(0);
        expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.CONNECTION_TIMEOUT_MS).toBeGreaterThan(0);
        expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.HEARTBEAT_INTERVAL_MS).toBeGreaterThan(0);
      });
    });

    describe('Cache Keys Configuration', () => {
      it('should have warm cache prefix defined', () => {
        expect(STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX).toBe('stream_cache_warm');
        expect(typeof STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX).toBe('string');
      });

      it('should follow naming convention (module_function_type)', () => {
        const prefix = STREAM_CACHE_CONFIG.KEYS.WARM_CACHE_PREFIX;
        const parts = prefix.split('_');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('stream');
        expect(parts[1]).toBe('cache');
        expect(parts[2]).toBe('warm');
      });
    });

    describe('Constant Immutability', () => {
      it('should be a readonly object', () => {
        expect(() => {
          (STREAM_CACHE_CONFIG as any).TTL = {};
        }).toThrow();
      });

      it('should have readonly nested properties', () => {
        expect(() => {
          (STREAM_CACHE_CONFIG.TTL as any).HOT_CACHE_TTL_S = 999;
        }).toThrow();
      });
    });
  });

  describe('DEFAULT_STREAM_CACHE_CONFIG', () => {
    describe('Stream-Specific Properties', () => {
      it('should have hot cache TTL from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL).toBe(STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S);
      });

      it('should have warm cache TTL from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL).toBe(STREAM_CACHE_CONFIG.TTL.WARM_CACHE_TTL_S);
      });

      it('should have max hot cache size from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize).toBe(STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE);
      });

      it('should have stream batch size from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize).toBe(STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE);
      });

      it('should have connection timeout from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout).toBe(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.CONNECTION_TIMEOUT_MS);
      });

      it('should have heartbeat interval from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval).toBe(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.HEARTBEAT_INTERVAL_MS);
      });
    });

    describe('Basic Configuration Properties', () => {
      it('should have default TTL from core constants', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.defaultTTL).toBe(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS);
      });

      it('should have min TTL from core constants', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.minTTL).toBe(CACHE_CORE_TTL.MIN_TTL_SECONDS);
      });

      it('should have max TTL from core constants', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxTTL).toBe(CACHE_CORE_TTL.MAX_TTL_SECONDS);
      });

      it('should have max cache size matching hot cache size', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxCacheSize).toBe(STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE);
      });

      it('should have max batch size matching stream batch size', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxBatchSize).toBe(STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE);
      });

      it('should have cleanup interval from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.cleanupInterval).toBe(STREAM_CACHE_CONFIG.CLEANUP.INTERVAL_MS);
      });

      it('should have max cleanup items from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxCleanupItems).toBe(STREAM_CACHE_CONFIG.CLEANUP.MAX_CLEANUP_ITEMS);
      });

      it('should have memory cleanup threshold as a valid percentage', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold).toBe(0.85);
        expect(DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold).toBeGreaterThan(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold).toBeLessThanOrEqual(1);
      });
    });

    describe('Compression Configuration', () => {
      it('should have compression threshold from STREAM_CACHE_CONFIG', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold).toBe(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.COMPRESSION_THRESHOLD_BYTES);
      });

      it('should have compression enabled by default', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.compressionEnabled).toBe(true);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.compressionEnabled).toBe('boolean');
      });

      it('should have compression data type as "stream"', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.compressionDataType).toBe('stream');
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.compressionDataType).toBe('string');
      });
    });

    describe('Performance Monitoring Configuration', () => {
      it('should have slow operation threshold defined', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.slowOperationThreshold).toBe(100);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.slowOperationThreshold).toBe('number');
      });

      it('should have stats log interval from core constants', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.statsLogInterval).toBe(CACHE_CORE_INTERVALS.STATS_LOG_INTERVAL_MS);
      });

      it('should have performance monitoring enabled by default', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.performanceMonitoring).toBe(true);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.performanceMonitoring).toBe('boolean');
      });

      it('should have verbose logging disabled by default', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.verboseLogging).toBe(false);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.verboseLogging).toBe('boolean');
      });

      it('should use reasonable performance thresholds', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.slowOperationThreshold).toBeGreaterThan(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.statsLogInterval).toBeGreaterThan(0);
      });
    });

    describe('Error Handling Configuration', () => {
      it('should have max retry attempts defined', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxRetryAttempts).toBe(3);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.maxRetryAttempts).toBe('number');
      });

      it('should have retry base delay defined', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.retryBaseDelay).toBe(100);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.retryBaseDelay).toBe('number');
      });

      it('should have retry delay multiplier defined', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.retryDelayMultiplier).toBe(2);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.retryDelayMultiplier).toBe('number');
      });

      it('should have fallback enabled by default', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.enableFallback).toBe(true);
        expect(typeof DEFAULT_STREAM_CACHE_CONFIG.enableFallback).toBe('boolean');
      });

      it('should use reasonable retry configuration', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxRetryAttempts).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.retryBaseDelay).toBeGreaterThan(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.retryDelayMultiplier).toBeGreaterThan(1);
      });
    });

    describe('Configuration Consistency', () => {
      it('should have consistent TTL ordering', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.minTTL).toBeLessThan(DEFAULT_STREAM_CACHE_CONFIG.defaultTTL);
        expect(DEFAULT_STREAM_CACHE_CONFIG.defaultTTL).toBeLessThan(DEFAULT_STREAM_CACHE_CONFIG.maxTTL);
        expect(DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL).toBeLessThan(DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL);
      });

      it('should have consistent batch size configuration', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize).toBe(DEFAULT_STREAM_CACHE_CONFIG.maxBatchSize);
      });

      it('should have consistent cache size configuration', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize).toBe(DEFAULT_STREAM_CACHE_CONFIG.maxCacheSize);
      });

      it('should have consistent timeout configuration', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout).toBeGreaterThan(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval).toBeGreaterThan(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval).toBeLessThan(DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout);
      });
    });

    describe('Configuration Validation', () => {
      it('should have all required properties defined', () => {
        const requiredProperties = [
          'hotCacheTTL', 'warmCacheTTL', 'maxHotCacheSize', 'streamBatchSize',
          'connectionTimeout', 'heartbeatInterval', 'defaultTTL', 'minTTL', 'maxTTL',
          'maxCacheSize', 'maxBatchSize', 'cleanupInterval', 'maxCleanupItems',
          'memoryCleanupThreshold', 'compressionThreshold', 'compressionEnabled',
          'compressionDataType', 'slowOperationThreshold', 'statsLogInterval',
          'performanceMonitoring', 'verboseLogging', 'maxRetryAttempts',
          'retryBaseDelay', 'retryDelayMultiplier', 'enableFallback'
        ];

        requiredProperties.forEach(property => {
          expect(DEFAULT_STREAM_CACHE_CONFIG).toHaveProperty(property);
        });
      });

      it('should have proper data types for all properties', () => {
        const numericProperties = [
          'hotCacheTTL', 'warmCacheTTL', 'maxHotCacheSize', 'streamBatchSize',
          'connectionTimeout', 'heartbeatInterval', 'defaultTTL', 'minTTL', 'maxTTL',
          'maxCacheSize', 'maxBatchSize', 'cleanupInterval', 'maxCleanupItems',
          'memoryCleanupThreshold', 'compressionThreshold', 'slowOperationThreshold',
          'statsLogInterval', 'maxRetryAttempts', 'retryBaseDelay', 'retryDelayMultiplier'
        ];

        const booleanProperties = [
          'compressionEnabled', 'performanceMonitoring', 'verboseLogging', 'enableFallback'
        ];

        const stringProperties = ['compressionDataType'];

        numericProperties.forEach(property => {
          expect(typeof DEFAULT_STREAM_CACHE_CONFIG[property]).toBe('number');
        });

        booleanProperties.forEach(property => {
          expect(typeof DEFAULT_STREAM_CACHE_CONFIG[property]).toBe('boolean');
        });

        stringProperties.forEach(property => {
          expect(typeof DEFAULT_STREAM_CACHE_CONFIG[property]).toBe('string');
        });
      });

      it('should have positive values for size and timing properties', () => {
        const positiveProperties = [
          'hotCacheTTL', 'warmCacheTTL', 'maxHotCacheSize', 'streamBatchSize',
          'connectionTimeout', 'heartbeatInterval', 'defaultTTL', 'minTTL', 'maxTTL',
          'maxCacheSize', 'maxBatchSize', 'cleanupInterval', 'maxCleanupItems',
          'compressionThreshold', 'slowOperationThreshold', 'statsLogInterval',
          'retryBaseDelay', 'retryDelayMultiplier'
        ];

        positiveProperties.forEach(property => {
          expect(DEFAULT_STREAM_CACHE_CONFIG[property]).toBeGreaterThan(0);
        });
      });

      it('should have non-negative values for retry attempts', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.maxRetryAttempts).toBeGreaterThanOrEqual(0);
      });

      it('should have memory cleanup threshold within valid range', () => {
        expect(DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold).toBeGreaterThan(0);
        expect(DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Integration with Core Constants', () => {
    it('should properly inherit from core TTL constants', () => {
      expect(STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S).toBeDefined();
      expect(STREAM_CACHE_CONFIG.TTL.WARM_CACHE_TTL_S).toBeDefined();
      expect(DEFAULT_STREAM_CACHE_CONFIG.defaultTTL).toBeDefined();
      expect(DEFAULT_STREAM_CACHE_CONFIG.minTTL).toBeDefined();
      expect(DEFAULT_STREAM_CACHE_CONFIG.maxTTL).toBeDefined();
    });

    it('should properly inherit from core interval constants', () => {
      expect(STREAM_CACHE_CONFIG.CLEANUP.INTERVAL_MS).toBeDefined();
      expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.CONNECTION_TIMEOUT_MS).toBeDefined();
      expect(STREAM_CACHE_CONFIG.STREAM_SPECIFIC.HEARTBEAT_INTERVAL_MS).toBeDefined();
      expect(DEFAULT_STREAM_CACHE_CONFIG.statsLogInterval).toBeDefined();
    });

    it('should properly inherit from core batch size constants', () => {
      expect(STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE).toBeDefined();
      expect(STREAM_CACHE_CONFIG.CLEANUP.MAX_CLEANUP_ITEMS).toBeDefined();
      expect(DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize).toBeDefined();
      expect(DEFAULT_STREAM_CACHE_CONFIG.maxBatchSize).toBeDefined();
    });
  });

  describe('Stream Cache Specific Features', () => {
    it('should define stream-specific compression settings', () => {
      expect(DEFAULT_STREAM_CACHE_CONFIG.compressionDataType).toBe('stream');
      expect(DEFAULT_STREAM_CACHE_CONFIG.compressionEnabled).toBe(true);
      expect(DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold).toBeGreaterThan(0);
    });

    it('should define stream-specific timing requirements', () => {
      // Hot cache should have much shorter TTL than warm cache for stream data
      expect(DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL).toBeLessThan(DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL);

      // Connection timeout should be reasonable for streaming
      expect(DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout).toBeGreaterThan(1000); // > 1 second
      expect(DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout).toBeLessThan(30000); // < 30 seconds

      // Heartbeat should be frequent enough for real-time data
      expect(DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval).toBeGreaterThan(1000); // > 1 second
      expect(DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval).toBeLessThan(60000); // < 1 minute
    });

    it('should define appropriate batch sizes for streaming', () => {
      // Stream batch size should be reasonable for real-time processing
      expect(DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize).toBeGreaterThan(1);
      expect(DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize).toBeLessThan(10000);
    });
  });
});