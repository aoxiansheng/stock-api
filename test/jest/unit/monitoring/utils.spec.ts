import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';
import { MonitoringSerializer } from '@monitoring/utils/monitoring-serializer';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

describe('Monitoring Utilities', () => {
  describe('MonitoringCacheKeys', () => {
    describe('health', () => {
      it('should generate health cache keys', () => {
        const key1 = MonitoringCacheKeys.health('score');
        const key2 = MonitoringCacheKeys.health('report_abc123');
        const key3 = MonitoringCacheKeys.health('status');

        expect(key1).toBe('monitoring:health:score');
        expect(key2).toBe('monitoring:health:report_abc123');
        expect(key3).toBe('monitoring:health:status');
      });

      it('should handle empty suffix', () => {
        const key = MonitoringCacheKeys.health('');
        expect(key).toBe('monitoring:health:');
      });

      it('should handle special characters in suffix', () => {
        const key = MonitoringCacheKeys.health('user:123_report-v2');
        expect(key).toBe('monitoring:health:user:123_report-v2');
      });
    });

    describe('trend', () => {
      it('should generate trend cache keys', () => {
        const key1 = MonitoringCacheKeys.trend('performance_1h');
        const key2 = MonitoringCacheKeys.trend('error_rate_24h');
        const key3 = MonitoringCacheKeys.trend('throughput_1d');

        expect(key1).toBe('monitoring:trend:performance_1h');
        expect(key2).toBe('monitoring:trend:error_rate_24h');
        expect(key3).toBe('monitoring:trend:throughput_1d');
      });

      it('should handle numeric suffixes', () => {
        const key = MonitoringCacheKeys.trend('123456');
        expect(key).toBe('monitoring:trend:123456');
      });
    });

    describe('performance', () => {
      it('should generate performance cache keys', () => {
        const key1 = MonitoringCacheKeys.performance('optimization_suggestions');
        const key2 = MonitoringCacheKeys.performance('endpoint_metrics');
        const key3 = MonitoringCacheKeys.performance('database_stats');

        expect(key1).toBe('monitoring:performance:optimization_suggestions');
        expect(key2).toBe('monitoring:performance:endpoint_metrics');
        expect(key3).toBe('monitoring:performance:database_stats');
      });

      it('should handle complex performance identifiers', () => {
        const key = MonitoringCacheKeys.performance('api_v2_users_endpoint_2023-12');
        expect(key).toBe('monitoring:performance:api_v2_users_endpoint_2023-12');
      });
    });

    describe('alert', () => {
      it('should generate alert cache keys', () => {
        const key1 = MonitoringCacheKeys.alert('critical_issues');
        const key2 = MonitoringCacheKeys.alert('notification_queue');
        const key3 = MonitoringCacheKeys.alert('suppression_rules');

        expect(key1).toBe('monitoring:alert:critical_issues');
        expect(key2).toBe('monitoring:alert:notification_queue');
        expect(key3).toBe('monitoring:alert:suppression_rules');
      });

      it('should handle alert rule identifiers', () => {
        const key = MonitoringCacheKeys.alert('rule_high_cpu_usage_server_01');
        expect(key).toBe('monitoring:alert:rule_high_cpu_usage_server_01');
      });
    });

    describe('cacheStats', () => {
      it('should generate cache stats keys', () => {
        const key1 = MonitoringCacheKeys.cacheStats('hit_rate_metrics');
        const key2 = MonitoringCacheKeys.cacheStats('operation_latency');
        const key3 = MonitoringCacheKeys.cacheStats('memory_usage');

        expect(key1).toBe('monitoring:cache_stats:hit_rate_metrics');
        expect(key2).toBe('monitoring:cache_stats:operation_latency');
        expect(key3).toBe('monitoring:cache_stats:memory_usage');
      });

      it('should handle different cache layer stats', () => {
        const key1 = MonitoringCacheKeys.cacheStats('redis_layer_stats');
        const key2 = MonitoringCacheKeys.cacheStats('memory_layer_stats');
        const key3 = MonitoringCacheKeys.cacheStats('l2_cache_stats');

        expect(key1).toBe('monitoring:cache_stats:redis_layer_stats');
        expect(key2).toBe('monitoring:cache_stats:memory_layer_stats');
        expect(key3).toBe('monitoring:cache_stats:l2_cache_stats');
      });
    });

    describe('pattern consistency', () => {
      it('should follow consistent naming pattern', () => {
        const healthKey = MonitoringCacheKeys.health('test');
        const trendKey = MonitoringCacheKeys.trend('test');
        const performanceKey = MonitoringCacheKeys.performance('test');
        const alertKey = MonitoringCacheKeys.alert('test');
        const cacheStatsKey = MonitoringCacheKeys.cacheStats('test');

        expect(healthKey).toMatch(/^monitoring:[a-z_]+:test$/);
        expect(trendKey).toMatch(/^monitoring:[a-z_]+:test$/);
        expect(performanceKey).toMatch(/^monitoring:[a-z_]+:test$/);
        expect(alertKey).toMatch(/^monitoring:[a-z_]+:test$/);
        expect(cacheStatsKey).toMatch(/^monitoring:[a-z_]+:test$/);

        // All should start with 'monitoring:'
        [healthKey, trendKey, performanceKey, alertKey, cacheStatsKey].forEach(key => {
          expect(key.startsWith('monitoring:')).toBe(true);
        });
      });

      it('should generate unique keys for different categories', () => {
        const keys = [
          MonitoringCacheKeys.health('test'),
          MonitoringCacheKeys.trend('test'),
          MonitoringCacheKeys.performance('test'),
          MonitoringCacheKeys.alert('test'),
          MonitoringCacheKeys.cacheStats('test'),
        ];

        // All keys should be different
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      });
    });

    describe('edge cases', () => {
      it('should handle null and undefined suffixes', () => {
        expect(() => MonitoringCacheKeys.health(null as any)).not.toThrow();
        expect(() => MonitoringCacheKeys.trend(undefined as any)).not.toThrow();

        const nullKey = MonitoringCacheKeys.health(null as any);
        const undefinedKey = MonitoringCacheKeys.trend(undefined as any);

        expect(nullKey).toBe('monitoring:health:null');
        expect(undefinedKey).toBe('monitoring:trend:undefined');
      });

      it('should handle very long suffixes', () => {
        const longSuffix = 'a'.repeat(1000);
        const key = MonitoringCacheKeys.performance(longSuffix);

        expect(key).toBe(`monitoring:performance:${longSuffix}`);
        expect(key.length).toBe(1000 + 'monitoring:performance:'.length);
      });

      it('should handle Unicode characters in suffixes', () => {
        const unicodeKey = MonitoringCacheKeys.health('用户健康状态_2023');
        expect(unicodeKey).toBe('monitoring:health:用户健康状态_2023');
      });
    });
  });

  describe('MonitoringSerializer', () => {
    describe('serialize', () => {
      it('should serialize simple objects', () => {
        const data = { name: 'test', value: 42, active: true };
        const serialized = MonitoringSerializer.serializeTags(data);

        expect(typeof serialized.serialized).toBe('string');
        expect(JSON.parse(serialized.serialized)).toEqual(data);
      });

      it('should serialize complex nested objects', () => {
        const data = {
          metadata: {
            timestamp: new Date('2023-01-01T00:00:00Z'),
            tags: ['monitoring', 'health', 'critical'],
            metrics: {
              cpu: 85.5,
              memory: 1024,
              disk: { used: 500, total: 1000, percentage: 0.5 },
            },
          },
          results: [
            { id: 1, status: 'ok', score: 95 },
            { id: 2, status: 'warning', score: 75 },
          ],
        };

        const serialized = MonitoringSerializer.serializeTags(data);
        const deserialized = JSON.parse(serialized.serialized);

        expect(deserialized.metadata.tags).toEqual(data.metadata.tags);
        expect(deserialized.metadata.metrics.disk.percentage).toBe(0.5);
        expect(deserialized.results).toHaveLength(2);
      });

      it('should handle arrays', () => {
        const data = [1, 2, 3, { name: 'test' }, [4, 5, 6]];
        const serialized = MonitoringSerializer.serializeTags(data);
        const deserialized = JSON.parse(serialized.serialized);

        expect(deserialized).toEqual(data);
        expect(Array.isArray(deserialized)).toBe(true);
        expect(deserialized[3].name).toBe('test');
        expect(Array.isArray(deserialized[4])).toBe(true);
      });

      it('should handle null and undefined values', () => {
        const data = {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zeroNumber: 0,
          falseBool: false,
        };

        const serialized = MonitoringSerializer.serializeTags(data);
        const deserialized = JSON.parse(serialized.serialized);

        expect(deserialized.nullValue).toBe(null);
        expect('undefinedValue' in deserialized).toBe(false); // undefined is not serialized by JSON
        expect(deserialized.emptyString).toBe('');
        expect(deserialized.zeroNumber).toBe(0);
        expect(deserialized.falseBool).toBe(false);
      });

      it('should handle Date objects', () => {
        const now = new Date();
        const data = { timestamp: now, createdAt: now };

        const serialized = MonitoringSerializer.serializeTags(data);
        const deserialized = JSON.parse(serialized.serialized);

        expect(deserialized.timestamp).toBe(now.toISOString());
        expect(deserialized.createdAt).toBe(now.toISOString());
      });

      it('should handle circular references gracefully', () => {
        const data: any = { name: 'test' };
        data.self = data; // Create circular reference

        // JSON.stringify should handle circular references or throw
        expect(() => MonitoringSerializer.serializeTags(data)).toThrow();
      });

      it('should handle very large objects', () => {
        const largeData = {
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `item_${i}`,
            value: Math.random() * 1000,
            tags: [`tag_${i % 10}`, `category_${i % 5}`],
          })),
        };

        const serialized = MonitoringSerializer.serializeTags(largeData);
        const deserialized = JSON.parse(serialized.serialized);

        expect(deserialized.items).toHaveLength(1000);
        expect(deserialized.items[0].id).toBe(0);
        expect(deserialized.items[999].id).toBe(999);
      });
    });

    describe('deserialize', () => {
      it('should deserialize simple objects', () => {
        const original = { name: 'test', value: 42, active: true };
        const serialized = JSON.stringify(original);
        const deserialized = MonitoringSerializer.deserializeTags(serialized);

        expect(deserialized).toEqual(original);
      });

      it('should deserialize complex nested objects', () => {
        const original = {
          metadata: {
            tags: ['monitoring', 'health'],
            metrics: {
              cpu: 85.5,
              memory: { used: 1024, total: 2048 },
            },
          },
          results: [{ id: 1, status: 'ok' }],
        };

        const serialized = JSON.stringify(original);
        const deserialized = MonitoringSerializer.deserializeTags(serialized);

        expect(deserialized).toEqual(original);
        expect(Array.isArray(deserialized.metadata.tags)).toBe(true);
        expect(typeof deserialized.metadata.metrics.cpu).toBe('number');
      });

      it('should handle arrays', () => {
        const original = [1, 'test', { id: 1 }, [2, 3]];
        const serialized = JSON.stringify(original);
        const deserialized = MonitoringSerializer.deserializeTags(serialized);

        expect(deserialized).toEqual(original);
        expect(Array.isArray(deserialized)).toBe(true);
      });

      it('should handle invalid JSON gracefully', () => {
        const invalidJson = '{ invalid json }';

        expect(() => MonitoringSerializer.deserializeTags(invalidJson)).toThrow();
      });

      it('should handle empty strings', () => {
        expect(() => MonitoringSerializer.deserializeTags('')).toThrow();
      });

      it('should handle null and undefined input', () => {
        expect(() => MonitoringSerializer.deserializeTags(null as any)).toThrow();
        expect(() => MonitoringSerializer.deserializeTags(undefined as any)).toThrow();
      });

      it('should preserve data types correctly', () => {
        const original = {
          string: 'test',
          number: 42,
          boolean: true,
          nullValue: null,
          array: [1, 2, 3],
          object: { nested: 'value' },
          float: 3.14159,
          negative: -100,
          zero: 0,
          emptyArray: [],
          emptyObject: {},
        };

        const serialized = JSON.stringify(original);
        const deserialized = MonitoringSerializer.deserializeTags(serialized);

        expect(typeof deserialized.string).toBe('string');
        expect(typeof deserialized.number).toBe('number');
        expect(typeof deserialized.boolean).toBe('boolean');
        expect(deserialized.nullValue).toBe(null);
        expect(Array.isArray(deserialized.array)).toBe(true);
        expect(typeof deserialized.object).toBe('object');
        expect(typeof deserialized.float).toBe('number');
        expect(typeof deserialized.negative).toBe('number');
        expect(typeof deserialized.zero).toBe('number');
        expect(Array.isArray(deserialized.emptyArray)).toBe(true);
        expect(typeof deserialized.emptyObject).toBe('object');
      });
    });

    describe('round-trip serialization', () => {
      it('should preserve data integrity through serialize-deserialize cycle', () => {
        const testCases = [
          { simple: 'object' },
          [1, 2, 3, 'array'],
          { complex: { nested: { deep: [1, { very: 'deep' }] } } },
          { metrics: { cpu: 85.5, memory: 1024, uptime: 3600000 } },
          {
            healthReport: {
              timestamp: '2023-01-01T00:00:00Z',
              score: 95,
              recommendations: ['optimize queries', 'increase cache'],
              details: {
                cpu: { score: 90, status: 'good' },
                memory: { score: 100, status: 'excellent' },
              }
            }
          },
        ];

        testCases.forEach((testCase, index) => {
          const serialized = MonitoringSerializer.serializeTags(testCase);
          const deserialized = MonitoringSerializer.deserializeTags(serialized.serialized);

          expect(deserialized).toEqual(testCase);
        });
      });

      it('should handle monitoring-specific data structures', () => {
        const monitoringData = {
          collectedMetrics: {
            timestamp: new Date().toISOString(),
            source: 'collector',
            metrics: {
              requests: {
                total: 1000,
                successful: 950,
                failed: 50,
                averageResponseTime: 250.5,
              },
              cache: {
                operations: 500,
                hits: 425,
                misses: 75,
                hitRate: 0.85,
              },
              system: {
                cpu: { usage: 0.65, cores: 8 },
                memory: { used: 1024, total: 4096, percentage: 0.25 },
                uptime: 86400,
              },
            },
          },
          healthAnalysis: {
            overallScore: 88,
            status: 'good',
            trends: {
              responseTime: { current: 250, previous: 220, trend: 'increasing' },
              errorRate: { current: 0.05, previous: 0.03, trend: 'increasing' },
            },
            recommendations: [
              'Consider optimizing slow database queries',
              'Monitor error rate trend closely',
            ],
          },
        };

        const serialized = MonitoringSerializer.serializeTags(monitoringData);
        const deserialized = MonitoringSerializer.deserializeTags(serialized.serialized);

        expect(deserialized).toEqual(monitoringData);
        expect(deserialized.collectedMetrics.metrics.requests.averageResponseTime).toBe(250.5);
        expect(deserialized.healthAnalysis.recommendations).toHaveLength(2);
        expect(deserialized.healthAnalysis.trends.responseTime.trend).toBe('increasing');
      });
    });

    describe('performance characteristics', () => {
      it('should handle large datasets efficiently', () => {
        const largeDataset = {
          metrics: Array.from({ length: 10000 }, (_, i) => ({
            timestamp: Date.now() - i * 1000,
            value: Math.random() * 100,
            tags: {
              endpoint: `/api/endpoint${i % 100}`,
              method: i % 2 === 0 ? 'GET' : 'POST',
              status: i % 10 === 0 ? 500 : 200,
            },
          })),
        };

        const startTime = Date.now();
        const serialized = MonitoringSerializer.serializeTags(largeDataset);
        const serializeTime = Date.now() - startTime;

        const deserializeStartTime = Date.now();
        const deserialized = MonitoringSerializer.deserializeTags(serialized.serialized);
        const deserializeTime = Date.now() - deserializeStartTime;

        expect(deserialized.metrics).toHaveLength(10000);
        expect(serializeTime).toBeLessThan(1000); // Should complete within 1 second
        expect(deserializeTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should handle deeply nested objects', () => {
        let deepObject: any = { value: 'leaf' };
        for (let i = 0; i < 100; i++) {
          deepObject = { level: i, nested: deepObject };
        }

        const serialized = MonitoringSerializer.serializeTags(deepObject);
        const deserialized = MonitoringSerializer.deserializeTags(serialized.serialized);

        // Navigate to the leaf to verify structure
        let current = deserialized;
        for (let i = 0; i < 100; i++) {
          expect(current.level).toBe(99 - i);
          current = current.nested;
        }
        expect(current.value).toBe('leaf');
      });
    });
  });

  describe('Integration between MonitoringCacheKeys and MonitoringSerializer', () => {
    it('should work together for complete cache operations', () => {
      const healthData = {
        score: 95,
        status: 'excellent',
        timestamp: new Date().toISOString(),
        details: {
          cpu: { usage: 0.3, status: 'good' },
          memory: { usage: 0.4, status: 'good' },
          disk: { usage: 0.6, status: 'warning' },
        },
        recommendations: ['Monitor disk usage', 'Consider cleanup'],
      };

      // Generate cache key
      const cacheKey = MonitoringCacheKeys.health('detailed_report_2023_12');
      expect(cacheKey).toBe('monitoring:health:detailed_report_2023_12');

      // Serialize data for storage
      const serializedData = MonitoringSerializer.serializeTags(healthData);
      expect(typeof serializedData.serialized).toBe('string');

      // Deserialize data after retrieval
      const deserializedData = MonitoringSerializer.deserializeTags(serializedData.serialized);
      expect(deserializedData).toEqual(healthData);

      // Verify data integrity
      expect(deserializedData.score).toBe(95);
      expect(deserializedData.details.cpu.usage).toBe(0.3);
      expect(deserializedData.recommendations).toHaveLength(2);
    });

    it('should handle different cache categories with their respective data', () => {
      const testData = {
        health: {
          score: 85,
          status: 'good',
          checks: ['cpu', 'memory', 'disk'],
        },
        trend: {
          period: '1h',
          responseTime: { current: 250, previous: 200, change: 25 },
          errorRate: { current: 0.05, previous: 0.03, change: 66.67 },
        },
        performance: {
          summary: { totalRequests: 1000, averageResponse: 250 },
          endpoints: [
            { path: '/api/users', requests: 500, avgTime: 200 },
            { path: '/api/posts', requests: 300, avgTime: 180 },
          ],
        },
      };

      Object.entries(testData).forEach(([category, data]) => {
        // Generate appropriate cache key
        let cacheKey: string;
        switch (category) {
          case 'health':
            cacheKey = MonitoringCacheKeys.health('current_status');
            break;
          case 'trend':
            cacheKey = MonitoringCacheKeys.trend('1h_analysis');
            break;
          case 'performance':
            cacheKey = MonitoringCacheKeys.performance('endpoint_summary');
            break;
          default:
            throw new Error(`Unknown category: ${category}`);
        }

        // Serialize and deserialize
        const serialized = MonitoringSerializer.serializeTags(data);
        const deserialized = MonitoringSerializer.deserializeTags(serialized.serialized);

        // Verify integrity
        expect(deserialized).toEqual(data);
        expect(cacheKey.startsWith('monitoring:')).toBe(true);
        expect(cacheKey.includes(category)).toBe(true);
      });
    });
  });
});