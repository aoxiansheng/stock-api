import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryStatisticsService } from '@core/01-entry/query/services/query-statistics.service';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { QueryStatsDto } from '@core/01-entry/query/dto/query-response.dto';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { QUERY_PERFORMANCE_CONFIG, QUERY_WARNING_MESSAGES, QUERY_OPERATIONS } from '@core/01-entry/query/constants/query.constants';

describe('QueryStatisticsService', () => {
  let service: QueryStatisticsService;
  let mockEventBus: jest.Mocked<EventEmitter2>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryStatisticsService,
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<QueryStatisticsService>(QueryStatisticsService);

    // Mock logger
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Lifecycle', () => {
    describe('onModuleDestroy', () => {
      it('should emit shutdown event on module destroy', async () => {
        await service.onModuleDestroy();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'query_statistics',
            metricType: 'system',
            metricName: 'service_shutdown',
            metricValue: 1,
            tags: expect.objectContaining({
              operation: 'module_destroy',
              componentType: 'query_statistics',
            }),
          })
        );
        expect(mockLogger.log).toHaveBeenCalledWith('QueryStatisticsService关闭事件已发送');
      });

      it('should handle event emission failure gracefully', async () => {
        const error = new Error('Event emission failed');
        mockEventBus.emit.mockImplementation(() => {
          throw error;
        });

        await service.onModuleDestroy();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          `QueryStatisticsService关闭事件发送失败: ${error.message}`
        );
      });
    });
  });

  describe('recordQueryPerformance', () => {
    const queryType = QueryType.BY_SYMBOLS;
    const executionTime = 150;
    const success = true;
    const cacheUsed = true;

    it('should emit query performance metric event', () => {
      service.recordQueryPerformance(queryType, executionTime, success, cacheUsed);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              timestamp: expect.any(Date),
              source: 'query_statistics',
              metricType: 'performance',
              metricName: 'query_performance',
              metricValue: executionTime,
              tags: expect.objectContaining({
                queryType,
                success,
                cacheUsed,
                operation: 'query_performance',
                componentType: 'query_statistics',
              }),
            })
          );
          resolve();
        });
      });
    });

    it('should emit slow query alert for queries exceeding threshold', () => {
      const slowExecutionTime = QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS + 100;

      service.recordQueryPerformance(queryType, slowExecutionTime, success, cacheUsed);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          // Should emit both performance metric and slow query alert
          expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              source: 'query_statistics',
              metricType: 'alert',
              metricName: 'slow_query_detected',
              metricValue: slowExecutionTime,
              tags: expect.objectContaining({
                queryType,
                threshold: QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS,
                severity: 'warning',
                operation: 'slow_query_alert',
                componentType: 'query_statistics',
              }),
            })
          );

          expect(mockLogger.warn).toHaveBeenCalledWith(
            QUERY_WARNING_MESSAGES.SLOW_QUERY_DETECTED,
            expect.objectContaining({
              queryType,
              executionTime: slowExecutionTime,
              threshold: QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS,
              operation: QUERY_OPERATIONS.RECORD_QUERY_PERFORMANCE,
            })
          );
          resolve();
        });
      });
    });

    it('should not emit slow query alert for fast queries', () => {
      const fastExecutionTime = QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS - 100;

      service.recordQueryPerformance(queryType, fastExecutionTime, success, cacheUsed);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          // Should only emit performance metric, not slow query alert
          expect(mockEventBus.emit).toHaveBeenCalledTimes(1);
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              metricType: 'performance',
              metricName: 'query_performance',
            })
          );

          // Should not log slow query warning
          expect(mockLogger.warn).not.toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should handle event emission failure gracefully for performance metrics', () => {
      const error = new Error('Event emission failed');
      mockEventBus.emit.mockImplementation(() => {
        throw error;
      });

      service.recordQueryPerformance(queryType, executionTime, success, cacheUsed);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `查询性能监控事件发送失败: ${error.message}`,
            expect.objectContaining({
              queryType,
              executionTime,
            })
          );
          resolve();
        });
      });
    });

    it('should handle event emission failure gracefully for slow query alerts', () => {
      const slowExecutionTime = QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS + 100;
      const error = new Error('Slow query alert failed');

      // Mock to fail only on the second call (slow query alert)
      mockEventBus.emit
        .mockImplementationOnce(() => true) // First call succeeds (performance metric)
        .mockImplementationOnce(() => {    // Second call fails (slow query alert)
          throw error;
        });

      service.recordQueryPerformance(queryType, slowExecutionTime, success, cacheUsed);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `慢查询警告事件发送失败: ${error.message}`,
            expect.objectContaining({
              queryType,
              executionTime: slowExecutionTime,
            })
          );
          resolve();
        });
      });
    });

    it('should record performance for different query types', () => {
      const queryTypes = [
        QueryType.BY_SYMBOLS,
        QueryType.BY_MARKET,
        QueryType.BY_PROVIDER,
        QueryType.BY_CATEGORY,
      ];

      queryTypes.forEach(type => {
        service.recordQueryPerformance(type, executionTime, success, cacheUsed);
      });

      // Wait for all setImmediate calls to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledTimes(queryTypes.length);

          queryTypes.forEach(type => {
            expect(mockEventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
              expect.objectContaining({
                tags: expect.objectContaining({
                  queryType: type,
                }),
              })
            );
          });
          resolve();
        });
      });
    });

    it('should record performance for different success states', () => {
      service.recordQueryPerformance(queryType, executionTime, true, cacheUsed);
      service.recordQueryPerformance(queryType, executionTime, false, cacheUsed);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                success: true,
              }),
            })
          );

          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                success: false,
              }),
            })
          );
          resolve();
        });
      });
    });

    it('should record performance for different cache usage states', () => {
      service.recordQueryPerformance(queryType, executionTime, success, true);
      service.recordQueryPerformance(queryType, executionTime, success, false);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                cacheUsed: true,
              }),
            })
          );

          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                cacheUsed: false,
              }),
            })
          );
          resolve();
        });
      });
    });
  });

  describe('incrementCacheHits', () => {
    it('should emit cache hit metric event', () => {
      service.incrementCacheHits();

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              timestamp: expect.any(Date),
              source: 'query_statistics',
              metricType: 'cache',
              metricName: 'cache_hit',
              metricValue: 1,
              tags: expect.objectContaining({
                cache_type: 'query',
                hit: true,
                operation: 'increment_cache_hits',
                componentType: 'query_statistics',
              }),
            })
          );
          resolve();
        });
      });
    });

    it('should handle event emission failure gracefully', () => {
      const error = new Error('Cache hit event failed');
      mockEventBus.emit.mockImplementation(() => {
        throw error;
      });

      service.incrementCacheHits();

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `缓存命中事件发送失败: ${error.message}`
          );
          resolve();
        });
      });
    });

    it('should emit multiple cache hit events correctly', () => {
      const hitCount = 5;

      for (let i = 0; i < hitCount; i++) {
        service.incrementCacheHits();
      }

      // Wait for all setImmediate calls to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledTimes(hitCount);

          for (let i = 0; i < hitCount; i++) {
            expect(mockEventBus.emit).toHaveBeenNthCalledWith(i + 1,
              SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
              expect.objectContaining({
                metricType: 'cache',
                metricName: 'cache_hit',
                metricValue: 1,
              })
            );
          }
          resolve();
        });
      });
    });
  });

  describe('getQueryStats', () => {
    it('should return default query statistics structure', async () => {
      const stats = await service.getQueryStats();

      expect(stats).toBeInstanceOf(QueryStatsDto);
      expect(stats.performance).toEqual({
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      });
      expect(stats.queryTypes).toEqual({});
      expect(stats.dataSources).toEqual({
        cache: { queries: 0, avgTime: 0, successRate: 1 },
        persistent: { queries: 0, avgTime: 0, successRate: 1 },
        realtime: { queries: 0, avgTime: 0, successRate: 1 },
      });
      expect(stats.popularQueries).toEqual([]);
    });

    it('should log debug information when getting stats', async () => {
      await service.getQueryStats();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '查询统计信息获取成功',
        expect.objectContaining({
          hasPerformanceData: true,
          operation: 'get_query_stats',
        })
      );
    });

    it('should handle errors gracefully and return default structure', async () => {
      // Mock an error in the logger to simulate internal error handling
      const error = new Error('Stats gathering failed');
      mockLogger.debug.mockImplementation(() => {
        throw error;
      });

      const stats = await service.getQueryStats();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '获取查询指标失败',
        expect.objectContaining({
          error: error.message,
        })
      );

      expect(stats).toBeInstanceOf(QueryStatsDto);
      expect(stats.performance).toEqual({
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      });
    });

    it('should always return consistent structure', async () => {
      // Call multiple times to ensure consistency
      const stats1 = await service.getQueryStats();
      const stats2 = await service.getQueryStats();
      const stats3 = await service.getQueryStats();

      expect(stats1).toEqual(stats2);
      expect(stats2).toEqual(stats3);

      // Ensure all have the required structure
      [stats1, stats2, stats3].forEach(stats => {
        expect(stats).toHaveProperty('performance');
        expect(stats).toHaveProperty('queryTypes');
        expect(stats).toHaveProperty('dataSources');
        expect(stats).toHaveProperty('popularQueries');

        expect(stats.performance).toHaveProperty('totalQueries');
        expect(stats.performance).toHaveProperty('averageExecutionTime');
        expect(stats.performance).toHaveProperty('cacheHitRate');
        expect(stats.performance).toHaveProperty('errorRate');
        expect(stats.performance).toHaveProperty('queriesPerSecond');
      });
    });
  });

  describe('resetQueryStats', () => {
    it('should emit stats reset event', () => {
      service.resetQueryStats();

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              timestamp: expect.any(Date),
              source: 'query_statistics',
              metricType: 'system',
              metricName: 'stats_reset',
              metricValue: 1,
              tags: expect.objectContaining({
                operation: 'reset_query_stats',
                componentType: 'query_statistics',
                resetTimestamp: expect.any(String),
              }),
            })
          );

          expect(mockLogger.log).toHaveBeenCalledWith('查询统计重置事件已发送');
          resolve();
        });
      });
    });

    it('should handle event emission failure gracefully', () => {
      const error = new Error('Reset event failed');
      mockEventBus.emit.mockImplementation(() => {
        throw error;
      });

      service.resetQueryStats();

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `查询统计重置事件发送失败: ${error.message}`
          );
          resolve();
        });
      });
    });

    it('should include reset timestamp in event', () => {
      const beforeReset = new Date().toISOString();

      service.resetQueryStats();

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                resetTimestamp: expect.any(String),
              }),
            })
          );

          const emittedEvent = mockEventBus.emit.mock.calls[0][1];
          const resetTimestamp = emittedEvent.tags.resetTimestamp;

          // Verify the timestamp is valid and recent
          expect(new Date(resetTimestamp).getTime()).toBeGreaterThanOrEqual(
            new Date(beforeReset).getTime()
          );
          resolve();
        });
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple concurrent operations', () => {
      // Simulate concurrent operations
      service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, true);
      service.incrementCacheHits();
      service.recordQueryPerformance(QueryType.BY_MARKET, 200, false, false);
      service.resetQueryStats();
      service.incrementCacheHits();

      // Wait for all setImmediate calls to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          // Should have emitted 5 events total
          expect(mockEventBus.emit).toHaveBeenCalledTimes(5);

          // Verify different event types were emitted
          const calls = mockEventBus.emit.mock.calls;
          const eventTypes = calls.map(call => call[1].metricName);

          expect(eventTypes).toContain('query_performance');
          expect(eventTypes).toContain('cache_hit');
          expect(eventTypes).toContain('stats_reset');
          resolve();
        });
      });
    });

    it('should maintain service state consistency across operations', async () => {
      // Perform various operations
      service.recordQueryPerformance(QueryType.BY_SYMBOLS, 150, true, true);
      service.incrementCacheHits();

      const statsBefore = await service.getQueryStats();

      service.resetQueryStats();

      const statsAfter = await service.getQueryStats();

      // Stats should have the same structure before and after reset
      expect(Object.keys(statsBefore)).toEqual(Object.keys(statsAfter));
      expect(Object.keys(statsBefore.performance)).toEqual(Object.keys(statsAfter.performance));
      expect(Object.keys(statsBefore.dataSources)).toEqual(Object.keys(statsAfter.dataSources));
    });

    it('should handle rapid successive calls without issues', () => {
      const operations = 100;

      // Rapidly call various methods
      for (let i = 0; i < operations; i++) {
        service.recordQueryPerformance(QueryType.BY_SYMBOLS, i * 10, i % 2 === 0, i % 3 === 0);
        if (i % 5 === 0) service.incrementCacheHits();
        if (i % 10 === 0) service.resetQueryStats();
      }

      // Wait for all setImmediate calls to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          // Should handle all operations without errors
          expect(mockEventBus.emit.mock.calls.length).toBeGreaterThan(operations);
          expect(mockLogger.warn).not.toHaveBeenCalled();
          resolve();
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative execution times', () => {
      service.recordQueryPerformance(QueryType.BY_SYMBOLS, -100, true, true);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              metricValue: -100,
            })
          );
          resolve();
        });
      });
    });

    it('should handle zero execution times', () => {
      service.recordQueryPerformance(QueryType.BY_SYMBOLS, 0, true, true);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              metricValue: 0,
            })
          );

          // Should not trigger slow query alert for zero execution time
          expect(mockLogger.warn).not.toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should handle very large execution times', () => {
      const largeTime = Number.MAX_SAFE_INTEGER;
      service.recordQueryPerformance(QueryType.BY_SYMBOLS, largeTime, true, true);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              metricValue: largeTime,
            })
          );

          // Should trigger slow query alert for large execution time
          expect(mockLogger.warn).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should handle null/undefined query types gracefully', () => {
      // TypeScript would catch this, but testing runtime behavior
      service.recordQueryPerformance(null as any, 100, true, true);
      service.recordQueryPerformance(undefined as any, 100, true, true);

      // Wait for setImmediate to execute
      return new Promise<void>((resolve) => {
        setImmediate(() => {
          expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
          resolve();
        });
      });
    });
  });
});