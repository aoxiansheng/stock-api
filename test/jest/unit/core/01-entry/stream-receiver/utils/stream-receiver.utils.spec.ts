import {
  LatencyUtils,
  ConnectionHealthUtils,
  ConnectionStatsUtils,
  CollectionUtils,
  ConnectionHealthInfo
} from '@core/01-entry/stream-receiver/utils/stream-receiver.utils';

describe('Stream Receiver Utils', () => {
  describe('LatencyUtils', () => {
    describe('categorizeLatency', () => {
      it('should categorize latency as excellent for <= 10ms', () => {
        expect(LatencyUtils.categorizeLatency(5)).toBe('excellent');
        expect(LatencyUtils.categorizeLatency(10)).toBe('excellent');
        expect(LatencyUtils.categorizeLatency(0)).toBe('excellent');
      });

      it('should categorize latency as good for 11-50ms', () => {
        expect(LatencyUtils.categorizeLatency(11)).toBe('good');
        expect(LatencyUtils.categorizeLatency(25)).toBe('good');
        expect(LatencyUtils.categorizeLatency(50)).toBe('good');
      });

      it('should categorize latency as acceptable for 51-200ms', () => {
        expect(LatencyUtils.categorizeLatency(51)).toBe('acceptable');
        expect(LatencyUtils.categorizeLatency(100)).toBe('acceptable');
        expect(LatencyUtils.categorizeLatency(200)).toBe('acceptable');
      });

      it('should categorize latency as poor for > 200ms', () => {
        expect(LatencyUtils.categorizeLatency(201)).toBe('poor');
        expect(LatencyUtils.categorizeLatency(500)).toBe('poor');
        expect(LatencyUtils.categorizeLatency(1000)).toBe('poor');
      });
    });

    describe('getLatencyScore', () => {
      it('should return correct scores for different latency ranges', () => {
        expect(LatencyUtils.getLatencyScore(5)).toBe(4);   // excellent
        expect(LatencyUtils.getLatencyScore(25)).toBe(3);  // good
        expect(LatencyUtils.getLatencyScore(100)).toBe(2); // acceptable
        expect(LatencyUtils.getLatencyScore(300)).toBe(1); // poor
      });

      it('should handle boundary values correctly', () => {
        expect(LatencyUtils.getLatencyScore(10)).toBe(4);  // excellent boundary
        expect(LatencyUtils.getLatencyScore(50)).toBe(3);  // good boundary
        expect(LatencyUtils.getLatencyScore(200)).toBe(2); // acceptable boundary
      });
    });
  });

  describe('ConnectionHealthUtils', () => {
    let mockHealth: {
      errorCount: number;
      consecutiveErrors: number;
      lastActivity: number;
      lastHeartbeat: number;
    };

    beforeEach(() => {
      mockHealth = {
        errorCount: 0,
        consecutiveErrors: 0,
        lastActivity: Date.now(),
        lastHeartbeat: Date.now()
      };
    });

    describe('calculateConnectionHealthStatus', () => {
      it('should return true for healthy connections', () => {
        const result = ConnectionHealthUtils.calculateConnectionHealthStatus(mockHealth);
        expect(result).toBe(true);
      });

      it('should return false when consecutive errors exceed threshold', () => {
        mockHealth.consecutiveErrors = 5;
        const result = ConnectionHealthUtils.calculateConnectionHealthStatus(mockHealth);
        expect(result).toBe(false);
      });

      it('should return false when total error count exceeds threshold', () => {
        mockHealth.errorCount = 10;
        const result = ConnectionHealthUtils.calculateConnectionHealthStatus(mockHealth);
        expect(result).toBe(false);
      });

      it('should return false when heartbeat is stale (> 2 minutes)', () => {
        mockHealth.lastHeartbeat = Date.now() - (3 * 60 * 1000); // 3 minutes ago
        const result = ConnectionHealthUtils.calculateConnectionHealthStatus(mockHealth);
        expect(result).toBe(false);
      });

      it('should return false when activity is stale (> 30 minutes)', () => {
        mockHealth.lastActivity = Date.now() - (31 * 60 * 1000); // 31 minutes ago
        const result = ConnectionHealthUtils.calculateConnectionHealthStatus(mockHealth);
        expect(result).toBe(false);
      });

      it('should handle edge cases at thresholds', () => {
        // Just below thresholds should be healthy
        mockHealth.consecutiveErrors = 4;
        mockHealth.errorCount = 9;
        mockHealth.lastHeartbeat = Date.now() - (119 * 1000); // 1 minute 59 seconds
        mockHealth.lastActivity = Date.now() - (29 * 60 * 1000); // 29 minutes

        expect(ConnectionHealthUtils.calculateConnectionHealthStatus(mockHealth)).toBe(true);
      });
    });

    describe('calculateConnectionQuality', () => {
      it('should return excellent for error-free connections', () => {
        const quality = ConnectionHealthUtils.calculateConnectionQuality(mockHealth);
        expect(quality).toBe('excellent');
      });

      it('should return good for connections with minimal errors', () => {
        mockHealth.consecutiveErrors = 1;
        expect(ConnectionHealthUtils.calculateConnectionQuality(mockHealth)).toBe('good');

        mockHealth.consecutiveErrors = 0;
        mockHealth.errorCount = 2;
        expect(ConnectionHealthUtils.calculateConnectionQuality(mockHealth)).toBe('good');
      });

      it('should return poor for connections with moderate errors', () => {
        mockHealth.consecutiveErrors = 2;
        expect(ConnectionHealthUtils.calculateConnectionQuality(mockHealth)).toBe('poor');

        mockHealth.consecutiveErrors = 0;
        mockHealth.errorCount = 5;
        expect(ConnectionHealthUtils.calculateConnectionQuality(mockHealth)).toBe('poor');
      });

      it('should return critical for connections with high error rates', () => {
        mockHealth.consecutiveErrors = 3;
        expect(ConnectionHealthUtils.calculateConnectionQuality(mockHealth)).toBe('critical');

        mockHealth.consecutiveErrors = 0;
        mockHealth.errorCount = 8;
        expect(ConnectionHealthUtils.calculateConnectionQuality(mockHealth)).toBe('critical');
      });
    });

    describe('getQualityPriority', () => {
      it('should return correct priority values for each quality level', () => {
        expect(ConnectionHealthUtils.getQualityPriority('critical')).toBe(1);
        expect(ConnectionHealthUtils.getQualityPriority('poor')).toBe(2);
        expect(ConnectionHealthUtils.getQualityPriority('good')).toBe(3);
        expect(ConnectionHealthUtils.getQualityPriority('excellent')).toBe(4);
      });

      it('should handle invalid quality levels with default priority', () => {
        expect(ConnectionHealthUtils.getQualityPriority('invalid' as any)).toBe(2);
      });
    });

    describe('createInitialHealthInfo', () => {
      it('should create health info with default current time', () => {
        const healthInfo = ConnectionHealthUtils.createInitialHealthInfo();

        expect(healthInfo.errorCount).toBe(0);
        expect(healthInfo.consecutiveErrors).toBe(0);
        expect(healthInfo.isHealthy).toBe(true);
        expect(healthInfo.connectionQuality).toBe('excellent');
        expect(healthInfo.lastErrorTime).toBe(0);
        expect(typeof healthInfo.lastHeartbeat).toBe('number');
        expect(typeof healthInfo.lastActivity).toBe('number');
      });

      it('should create health info with specified time', () => {
        const customTime = 1640995200000;
        const healthInfo = ConnectionHealthUtils.createInitialHealthInfo(customTime);

        expect(healthInfo.lastHeartbeat).toBe(customTime);
        expect(healthInfo.lastActivity).toBe(customTime);
      });
    });

    describe('updateHealthOnSuccess', () => {
      let healthInfo: ConnectionHealthInfo;

      beforeEach(() => {
        healthInfo = ConnectionHealthUtils.createInitialHealthInfo(1640995200000);
        // Make it unhealthy first
        healthInfo.errorCount = 3;
        healthInfo.consecutiveErrors = 2;
        healthInfo.connectionQuality = 'poor';
      });

      it('should reset consecutive errors to 0', () => {
        ConnectionHealthUtils.updateHealthOnSuccess(healthInfo, 1640995300000);
        expect(healthInfo.consecutiveErrors).toBe(0);
      });

      it('should reduce total error count gradually', () => {
        const initialErrorCount = healthInfo.errorCount;
        ConnectionHealthUtils.updateHealthOnSuccess(healthInfo, 1640995300000);
        expect(healthInfo.errorCount).toBe(initialErrorCount - 1);
      });

      it('should update activity and heartbeat timestamps', () => {
        const updateTime = 1640995300000;
        ConnectionHealthUtils.updateHealthOnSuccess(healthInfo, updateTime);

        expect(healthInfo.lastActivity).toBe(updateTime);
        expect(healthInfo.lastHeartbeat).toBe(updateTime);
      });

      it('should not reduce error count below 0', () => {
        healthInfo.errorCount = 0;
        ConnectionHealthUtils.updateHealthOnSuccess(healthInfo);
        expect(healthInfo.errorCount).toBe(0);
      });

      it('should recalculate health status and quality', () => {
        jest.spyOn(ConnectionHealthUtils, 'calculateConnectionHealthStatus');
        jest.spyOn(ConnectionHealthUtils, 'calculateConnectionQuality');

        ConnectionHealthUtils.updateHealthOnSuccess(healthInfo);

        expect(ConnectionHealthUtils.calculateConnectionHealthStatus).toHaveBeenCalledWith(healthInfo);
        expect(ConnectionHealthUtils.calculateConnectionQuality).toHaveBeenCalledWith(healthInfo);

        jest.restoreAllMocks();
      });
    });

    describe('updateHealthOnError', () => {
      let healthInfo: ConnectionHealthInfo;

      beforeEach(() => {
        healthInfo = ConnectionHealthUtils.createInitialHealthInfo(1640995200000);
      });

      it('should increment error counters', () => {
        const initialErrorCount = healthInfo.errorCount;
        const initialConsecutiveErrors = healthInfo.consecutiveErrors;

        ConnectionHealthUtils.updateHealthOnError(healthInfo, 1640995300000);

        expect(healthInfo.errorCount).toBe(initialErrorCount + 1);
        expect(healthInfo.consecutiveErrors).toBe(initialConsecutiveErrors + 1);
      });

      it('should update timestamps including last error time', () => {
        const errorTime = 1640995300000;
        ConnectionHealthUtils.updateHealthOnError(healthInfo, errorTime);

        expect(healthInfo.lastActivity).toBe(errorTime);
        expect(healthInfo.lastHeartbeat).toBe(errorTime);
        expect(healthInfo.lastErrorTime).toBe(errorTime);
      });

      it('should recalculate health status and quality', () => {
        jest.spyOn(ConnectionHealthUtils, 'calculateConnectionHealthStatus');
        jest.spyOn(ConnectionHealthUtils, 'calculateConnectionQuality');

        ConnectionHealthUtils.updateHealthOnError(healthInfo);

        expect(ConnectionHealthUtils.calculateConnectionHealthStatus).toHaveBeenCalledWith(healthInfo);
        expect(ConnectionHealthUtils.calculateConnectionQuality).toHaveBeenCalledWith(healthInfo);

        jest.restoreAllMocks();
      });
    });
  });

  describe('ConnectionStatsUtils', () => {
    describe('calculateHealthStats', () => {
      let healthMap: Map<string, ConnectionHealthInfo>;

      beforeEach(() => {
        healthMap = new Map();
      });

      it('should calculate stats for empty map', () => {
        const stats = ConnectionStatsUtils.calculateHealthStats(healthMap);

        expect(stats.total).toBe(0);
        expect(stats.healthy).toBe(0);
        expect(stats.unhealthy).toBe(0);
        expect(stats.healthRatio).toBe(0);
        expect(stats.excellent).toBe(0);
        expect(stats.good).toBe(0);
        expect(stats.poor).toBe(0);
        expect(stats.critical).toBe(0);
      });

      it('should calculate stats for mixed health conditions', () => {
        // Create health info with different qualities
        const excellentHealth: ConnectionHealthInfo = {
          ...ConnectionHealthUtils.createInitialHealthInfo(),
          isHealthy: true,
          connectionQuality: 'excellent'
        };

        const goodHealth: ConnectionHealthInfo = {
          ...ConnectionHealthUtils.createInitialHealthInfo(),
          isHealthy: true,
          connectionQuality: 'good'
        };

        const poorHealth: ConnectionHealthInfo = {
          ...ConnectionHealthUtils.createInitialHealthInfo(),
          isHealthy: false,
          connectionQuality: 'poor'
        };

        const criticalHealth: ConnectionHealthInfo = {
          ...ConnectionHealthUtils.createInitialHealthInfo(),
          isHealthy: false,
          connectionQuality: 'critical'
        };

        healthMap.set('conn1', excellentHealth);
        healthMap.set('conn2', goodHealth);
        healthMap.set('conn3', poorHealth);
        healthMap.set('conn4', criticalHealth);

        const stats = ConnectionStatsUtils.calculateHealthStats(healthMap);

        expect(stats.total).toBe(4);
        expect(stats.excellent).toBe(1);
        expect(stats.good).toBe(1);
        expect(stats.poor).toBe(1);
        expect(stats.critical).toBe(1);
        expect(stats.healthy).toBe(2);
        expect(stats.unhealthy).toBe(2);
        expect(stats.healthRatio).toBe(0.5);
      });

      it('should handle all healthy connections', () => {
        for (let i = 0; i < 5; i++) {
          healthMap.set(`conn${i}`, {
            ...ConnectionHealthUtils.createInitialHealthInfo(),
            isHealthy: true,
            connectionQuality: 'excellent'
          });
        }

        const stats = ConnectionStatsUtils.calculateHealthStats(healthMap);

        expect(stats.total).toBe(5);
        expect(stats.healthy).toBe(5);
        expect(stats.unhealthy).toBe(0);
        expect(stats.healthRatio).toBe(1);
        expect(stats.excellent).toBe(5);
      });
    });

    describe('shouldWarnAboutHealth', () => {
      it('should return false for healthy systems', () => {
        const healthStats = { total: 10, unhealthy: 1 };
        expect(ConnectionStatsUtils.shouldWarnAboutHealth(healthStats)).toBe(false);
      });

      it('should return true when unhealthy ratio exceeds threshold', () => {
        const healthStats = { total: 10, unhealthy: 3 }; // 30% unhealthy
        expect(ConnectionStatsUtils.shouldWarnAboutHealth(healthStats)).toBe(true);
      });

      it('should use custom threshold', () => {
        const healthStats = { total: 10, unhealthy: 1 }; // 10% unhealthy
        expect(ConnectionStatsUtils.shouldWarnAboutHealth(healthStats, 0.05)).toBe(true);
      });

      it('should return false for empty systems', () => {
        const healthStats = { total: 0, unhealthy: 0 };
        expect(ConnectionStatsUtils.shouldWarnAboutHealth(healthStats)).toBe(false);
      });

      it('should handle edge case at exact threshold', () => {
        const healthStats = { total: 10, unhealthy: 2 }; // exactly 20%
        expect(ConnectionStatsUtils.shouldWarnAboutHealth(healthStats, 0.2)).toBe(false);
        expect(ConnectionStatsUtils.shouldWarnAboutHealth(healthStats, 0.19)).toBe(true);
      });
    });
  });

  describe('CollectionUtils', () => {
    describe('getOrCreate', () => {
      let testMap: Map<string, number>;
      let factoryMock: jest.Mock;

      beforeEach(() => {
        testMap = new Map();
        factoryMock = jest.fn(() => 42);
      });

      it('should return existing value if key exists', () => {
        testMap.set('existing', 100);
        const result = CollectionUtils.getOrCreate(testMap, 'existing', factoryMock);

        expect(result).toBe(100);
        expect(factoryMock).not.toHaveBeenCalled();
      });

      it('should create and store new value if key does not exist', () => {
        const result = CollectionUtils.getOrCreate(testMap, 'new', factoryMock);

        expect(result).toBe(42);
        expect(factoryMock).toHaveBeenCalledTimes(1);
        expect(testMap.get('new')).toBe(42);
      });

      it('should handle different data types', () => {
        const objectMap = new Map<string, { count: number }>();
        const objectFactory = () => ({ count: 0 });

        const result = CollectionUtils.getOrCreate(objectMap, 'test', objectFactory);

        expect(result).toEqual({ count: 0 });
        expect(objectMap.get('test')).toBe(result);
      });

      it('should only call factory once per key', () => {
        CollectionUtils.getOrCreate(testMap, 'test', factoryMock);
        CollectionUtils.getOrCreate(testMap, 'test', factoryMock);

        expect(factoryMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('deleteBatch', () => {
      let testMap: Map<string, number>;

      beforeEach(() => {
        testMap = new Map([
          ['key1', 1],
          ['key2', 2],
          ['key3', 3],
          ['key4', 4]
        ]);
      });

      it('should delete existing keys and return count', () => {
        const deletedCount = CollectionUtils.deleteBatch(testMap, ['key1', 'key3']);

        expect(deletedCount).toBe(2);
        expect(testMap.has('key1')).toBe(false);
        expect(testMap.has('key3')).toBe(false);
        expect(testMap.has('key2')).toBe(true);
        expect(testMap.has('key4')).toBe(true);
      });

      it('should handle non-existing keys', () => {
        const deletedCount = CollectionUtils.deleteBatch(testMap, ['key1', 'nonexistent', 'key2']);

        expect(deletedCount).toBe(2);
        expect(testMap.has('key1')).toBe(false);
        expect(testMap.has('key2')).toBe(false);
        expect(testMap.size).toBe(2);
      });

      it('should handle empty key list', () => {
        const originalSize = testMap.size;
        const deletedCount = CollectionUtils.deleteBatch(testMap, []);

        expect(deletedCount).toBe(0);
        expect(testMap.size).toBe(originalSize);
      });

      it('should handle deleting all keys', () => {
        const allKeys = Array.from(testMap.keys());
        const deletedCount = CollectionUtils.deleteBatch(testMap, allKeys);

        expect(deletedCount).toBe(4);
        expect(testMap.size).toBe(0);
      });
    });

    describe('filterMapKeys', () => {
      let testMap: Map<string, { value: number; active: boolean }>;

      beforeEach(() => {
        testMap = new Map([
          ['key1', { value: 10, active: true }],
          ['key2', { value: 20, active: false }],
          ['key3', { value: 30, active: true }],
          ['key4', { value: 40, active: false }]
        ]);
      });

      it('should filter keys by value predicate', () => {
        const activeKeys = CollectionUtils.filterMapKeys(testMap, (value) => value.active);

        expect(activeKeys).toEqual(['key1', 'key3']);
      });

      it('should filter keys by combined value and key predicate', () => {
        const filteredKeys = CollectionUtils.filterMapKeys(testMap, (value, key) => {
          return value.value > 15 && key.includes('3');
        });

        expect(filteredKeys).toEqual(['key3']);
      });

      it('should return empty array when no matches', () => {
        const filteredKeys = CollectionUtils.filterMapKeys(testMap, (value) => value.value > 100);

        expect(filteredKeys).toEqual([]);
      });

      it('should return all keys when all match', () => {
        const filteredKeys = CollectionUtils.filterMapKeys(testMap, () => true);

        expect(filteredKeys).toEqual(['key1', 'key2', 'key3', 'key4']);
      });

      it('should handle empty map', () => {
        const emptyMap = new Map();
        const filteredKeys = CollectionUtils.filterMapKeys(emptyMap, () => true);

        expect(filteredKeys).toEqual([]);
      });
    });
  });

  describe('integration tests', () => {
    it('should work together to manage connection health lifecycle', () => {
      const healthMap = new Map<string, ConnectionHealthInfo>();

      // Create initial connections
      for (let i = 1; i <= 5; i++) {
        const health = ConnectionHealthUtils.createInitialHealthInfo();
        healthMap.set(`conn${i}`, health);
      }

      // Simulate some errors
      const conn1 = healthMap.get('conn1')!;
      ConnectionHealthUtils.updateHealthOnError(conn1);
      ConnectionHealthUtils.updateHealthOnError(conn1);

      const conn2 = healthMap.get('conn2')!;
      ConnectionHealthUtils.updateHealthOnError(conn2);
      ConnectionHealthUtils.updateHealthOnError(conn2);
      ConnectionHealthUtils.updateHealthOnError(conn2);

      // Calculate stats
      const stats = ConnectionStatsUtils.calculateHealthStats(healthMap);
      expect(stats.total).toBe(5);
      expect(stats.poor).toBe(2); // conn1 and conn2
      expect(stats.excellent).toBe(3); // conn3, conn4, conn5

      // Check if warning needed
      const shouldWarn = ConnectionStatsUtils.shouldWarnAboutHealth(stats);
      expect(shouldWarn).toBe(false); // Only 40% poor, threshold is 20% unhealthy

      // Find connections to clean up (poor quality)
      const poorConnections = CollectionUtils.filterMapKeys(healthMap, (health) =>
        health.connectionQuality === 'poor'
      );
      expect(poorConnections).toEqual(['conn1', 'conn2']);

      // Clean up poor connections
      const deletedCount = CollectionUtils.deleteBatch(healthMap, poorConnections);
      expect(deletedCount).toBe(2);
      expect(healthMap.size).toBe(3);
    });

    it('should categorize latency and update connection quality accordingly', () => {
      const health = ConnectionHealthUtils.createInitialHealthInfo();

      // Simulate varying latencies
      const latencies = [5, 25, 150, 300];
      const categories = latencies.map(latency => LatencyUtils.categorizeLatency(latency));
      const scores = latencies.map(latency => LatencyUtils.getLatencyScore(latency));

      expect(categories).toEqual(['excellent', 'good', 'acceptable', 'poor']);
      expect(scores).toEqual([4, 3, 2, 1]);

      // Higher scores should indicate better performance
      expect(scores[0] > scores[1]).toBe(true);
      expect(scores[1] > scores[2]).toBe(true);
      expect(scores[2] > scores[3]).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle negative latency values', () => {
      expect(LatencyUtils.categorizeLatency(-5)).toBe('excellent');
      expect(LatencyUtils.getLatencyScore(-10)).toBe(4);
    });

    it('should handle very large latency values', () => {
      expect(LatencyUtils.categorizeLatency(999999)).toBe('poor');
      expect(LatencyUtils.getLatencyScore(999999)).toBe(1);
    });

    it('should handle null/undefined in collections safely', () => {
      const map = new Map<string, any>();
      map.set('valid', { test: true });
      map.set('null', null);
      map.set('undefined', undefined);

      const validKeys = CollectionUtils.filterMapKeys(map, (value) => value != null);
      expect(validKeys).toEqual(['valid']);
    });

    it('should handle concurrent access patterns', () => {
      const map = new Map<string, number>();
      const factory = jest.fn(() => Math.random());

      // Simulate concurrent access to same key
      const result1 = CollectionUtils.getOrCreate(map, 'concurrent', factory);
      const result2 = CollectionUtils.getOrCreate(map, 'concurrent', factory);

      expect(result1).toBe(result2);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
});