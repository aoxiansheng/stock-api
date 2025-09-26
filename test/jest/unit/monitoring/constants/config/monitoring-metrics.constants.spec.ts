import {
  MONITORING_METRICS,
  PerformanceMetricType,
  MONITORING_METRIC_CATEGORIES,
  MONITORING_METRIC_UNITS,
  MONITORING_METRIC_THRESHOLDS,
  MONITORING_AGGREGATION_TYPES,
  MONITORING_METRIC_PRIORITIES,
  getMetricCategory,
  getMetricUnit,
  checkMetricThreshold,
} from '@monitoring/constants/config/monitoring-metrics.constants';

describe('MonitoringMetricsConstants', () => {
  describe('MONITORING_METRICS', () => {
    it('should define all core performance metrics', () => {
      // 响应性能指标
      expect(MONITORING_METRICS.RESPONSE_TIME).toBe('response_time');
      expect(MONITORING_METRICS.THROUGHPUT).toBe('throughput');
      expect(MONITORING_METRICS.REQUEST_COUNT).toBe('request_count');
      expect(MONITORING_METRICS.CONCURRENT_REQUESTS).toBe('concurrent_requests');

      // 系统资源指标
      expect(MONITORING_METRICS.CPU_USAGE).toBe('cpu_usage');
      expect(MONITORING_METRICS.MEMORY_USAGE).toBe('memory_usage');
      expect(MONITORING_METRICS.DISK_USAGE).toBe('disk_usage');
      expect(MONITORING_METRICS.NETWORK_IO).toBe('network_io');

      // 错误率指标
      expect(MONITORING_METRICS.ERROR_RATE).toBe('error_rate');
      expect(MONITORING_METRICS.ERROR_COUNT).toBe('error_count');
      expect(MONITORING_METRICS.SUCCESS_RATE).toBe('success_rate');
      expect(MONITORING_METRICS.FAILURE_COUNT).toBe('failure_count');

      // 业务指标
      expect(MONITORING_METRICS.ACTIVE_CONNECTIONS).toBe('active_connections');
      expect(MONITORING_METRICS.QUEUE_SIZE).toBe('queue_size');
      expect(MONITORING_METRICS.PROCESSED_ITEMS).toBe('processed_items');
      expect(MONITORING_METRICS.PENDING_TASKS).toBe('pending_tasks');

      // 缓存指标
      expect(MONITORING_METRICS.CACHE_HIT_RATE).toBe('cache_hit_rate');
      expect(MONITORING_METRICS.CACHE_MISS_RATE).toBe('cache_miss_rate');
      expect(MONITORING_METRICS.CACHE_SIZE).toBe('cache_size');
      expect(MONITORING_METRICS.CACHE_EVICTIONS).toBe('cache_evictions');

      // 数据库指标
      expect(MONITORING_METRICS.DB_CONNECTIONS).toBe('db_connections');
      expect(MONITORING_METRICS.DB_QUERY_TIME).toBe('db_query_time');
      expect(MONITORING_METRICS.DB_SLOW_QUERIES).toBe('db_slow_queries');
      expect(MONITORING_METRICS.DB_DEADLOCKS).toBe('db_deadlocks');
    });

    it('should have correct type for PerformanceMetricType', () => {
      const metric: PerformanceMetricType = MONITORING_METRICS.RESPONSE_TIME;
      expect(metric).toBe('response_time');
    });
  });

  describe('MONITORING_METRIC_CATEGORIES', () => {
    it('should define PERFORMANCE category with correct metrics', () => {
      expect(MONITORING_METRIC_CATEGORIES.PERFORMANCE).toEqual([
        'response_time',
        'throughput',
        'request_count',
        'concurrent_requests',
      ]);
    });

    it('should define SYSTEM category with correct metrics', () => {
      expect(MONITORING_METRIC_CATEGORIES.SYSTEM).toEqual([
        'cpu_usage',
        'memory_usage',
        'disk_usage',
        'network_io',
      ]);
    });

    it('should define ERROR category with correct metrics', () => {
      expect(MONITORING_METRIC_CATEGORIES.ERROR).toEqual([
        'error_rate',
        'error_count',
        'success_rate',
        'failure_count',
      ]);
    });

    it('should define BUSINESS category with correct metrics', () => {
      expect(MONITORING_METRIC_CATEGORIES.BUSINESS).toEqual([
        'active_connections',
        'queue_size',
        'processed_items',
        'pending_tasks',
      ]);
    });

    it('should define CACHE category with correct metrics', () => {
      expect(MONITORING_METRIC_CATEGORIES.CACHE).toEqual([
        'cache_hit_rate',
        'cache_miss_rate',
        'cache_size',
        'cache_evictions',
      ]);
    });

    it('should define DATABASE category with correct metrics', () => {
      expect(MONITORING_METRIC_CATEGORIES.DATABASE).toEqual([
        'db_connections',
        'db_query_time',
        'db_slow_queries',
        'db_deadlocks',
      ]);
    });
  });

  describe('MONITORING_METRIC_UNITS', () => {
    it('should define units for response time metrics', () => {
      expect(MONITORING_METRIC_UNITS.response_time).toBe('ms');
      expect(MONITORING_METRIC_UNITS.throughput).toBe('rps');
      expect(MONITORING_METRIC_UNITS.request_count).toBe('count');
      expect(MONITORING_METRIC_UNITS.concurrent_requests).toBe('count');
    });

    it('should define units for system metrics', () => {
      expect(MONITORING_METRIC_UNITS.cpu_usage).toBe('%');
      expect(MONITORING_METRIC_UNITS.memory_usage).toBe('MB');
      expect(MONITORING_METRIC_UNITS.disk_usage).toBe('GB');
      expect(MONITORING_METRIC_UNITS.network_io).toBe('KB/s');
    });

    it('should define units for error metrics', () => {
      expect(MONITORING_METRIC_UNITS.error_rate).toBe('%');
      expect(MONITORING_METRIC_UNITS.error_count).toBe('count');
      expect(MONITORING_METRIC_UNITS.success_rate).toBe('%');
      expect(MONITORING_METRIC_UNITS.failure_count).toBe('count');
    });

    it('should define units for business metrics', () => {
      expect(MONITORING_METRIC_UNITS.active_connections).toBe('count');
      expect(MONITORING_METRIC_UNITS.queue_size).toBe('count');
      expect(MONITORING_METRIC_UNITS.processed_items).toBe('count');
      expect(MONITORING_METRIC_UNITS.pending_tasks).toBe('count');
    });

    it('should define units for cache metrics', () => {
      expect(MONITORING_METRIC_UNITS.cache_hit_rate).toBe('%');
      expect(MONITORING_METRIC_UNITS.cache_miss_rate).toBe('%');
      expect(MONITORING_METRIC_UNITS.cache_size).toBe('KB');
      expect(MONITORING_METRIC_UNITS.cache_evictions).toBe('count');
    });

    it('should define units for database metrics', () => {
      expect(MONITORING_METRIC_UNITS.db_connections).toBe('count');
      expect(MONITORING_METRIC_UNITS.db_query_time).toBe('ms');
      expect(MONITORING_METRIC_UNITS.db_slow_queries).toBe('count');
      expect(MONITORING_METRIC_UNITS.db_deadlocks).toBe('count');
    });
  });

  describe('MONITORING_METRIC_THRESHOLDS', () => {
    it('should define thresholds for response time', () => {
      expect(MONITORING_METRIC_THRESHOLDS.response_time).toEqual({
        warning: 1000,
        critical: 3000,
      });
    });

    it('should define thresholds for CPU usage', () => {
      expect(MONITORING_METRIC_THRESHOLDS.cpu_usage).toEqual({
        warning: 70,
        critical: 90,
      });
    });

    it('should define thresholds for memory usage', () => {
      expect(MONITORING_METRIC_THRESHOLDS.memory_usage).toEqual({
        warning: 70,
        critical: 90,
      });
    });

    it('should define thresholds for error rate', () => {
      expect(MONITORING_METRIC_THRESHOLDS.error_rate).toEqual({
        warning: 5,
        critical: 20,
      });
    });

    it('should define thresholds for cache hit rate', () => {
      expect(MONITORING_METRIC_THRESHOLDS.cache_hit_rate).toEqual({
        warning: 70,
        critical: 50,
      });
    });
  });

  describe('MONITORING_AGGREGATION_TYPES', () => {
    it('should define all aggregation types', () => {
      expect(MONITORING_AGGREGATION_TYPES.MAX).toBe('maximum');
      expect(MONITORING_AGGREGATION_TYPES.MIN).toBe('minimum');
      expect(MONITORING_AGGREGATION_TYPES.COUNT).toBe('count');
      expect(MONITORING_AGGREGATION_TYPES.RATE).toBe('rate');
    });
  });

  describe('MONITORING_METRIC_PRIORITIES', () => {
    it('should define all metric priorities', () => {
      expect(MONITORING_METRIC_PRIORITIES.HIGH).toBe(2);
      expect(MONITORING_METRIC_PRIORITIES.MEDIUM).toBe(3);
      expect(MONITORING_METRIC_PRIORITIES.LOW).toBe(4);
    });
  });

  describe('Helper Functions', () => {
    describe('getMetricCategory', () => {
      it('should return correct category for response_time metric', () => {
        const category = getMetricCategory('response_time');
        expect(category).toBe('performance');
      });

      it('should return correct category for cpu_usage metric', () => {
        const category = getMetricCategory('cpu_usage');
        expect(category).toBe('system');
      });

      it('should return correct category for error_rate metric', () => {
        const category = getMetricCategory('error_rate');
        expect(category).toBe('error');
      });

      it('should return correct category for active_connections metric', () => {
        const category = getMetricCategory('active_connections');
        expect(category).toBe('business');
      });

      it('should return correct category for cache_hit_rate metric', () => {
        const category = getMetricCategory('cache_hit_rate');
        expect(category).toBe('cache');
      });

      it('should return correct category for db_connections metric', () => {
        const category = getMetricCategory('db_connections');
        expect(category).toBe('database');
      });

      it('should return null for unknown metric', () => {
        // @ts-ignore - Testing invalid input
        const category = getMetricCategory('unknown_metric');
        expect(category).toBeNull();
      });
    });

    describe('getMetricUnit', () => {
      it('should return correct unit for response_time metric', () => {
        const unit = getMetricUnit('response_time');
        expect(unit).toBe('ms');
      });

      it('should return correct unit for cpu_usage metric', () => {
        const unit = getMetricUnit('cpu_usage');
        expect(unit).toBe('%');
      });

      it('should return correct unit for active_connections metric', () => {
        const unit = getMetricUnit('active_connections');
        expect(unit).toBe('count');
      });

      it('should return "unknown" for unknown metric', () => {
        // @ts-ignore - Testing invalid input
        const unit = getMetricUnit('unknown_metric');
        expect(unit).toBe('unknown');
      });
    });

    describe('checkMetricThreshold', () => {
      it('should return normal status when value is below warning threshold', () => {
        const result = checkMetricThreshold('response_time', 500);
        expect(result).toEqual({ status: 'normal' });
      });

      it('should return warning status when value is between warning and critical thresholds', () => {
        const result = checkMetricThreshold('response_time', 2000);
        expect(result).toEqual({ status: 'warning', threshold: 1000 });
      });

      it('should return critical status when value exceeds critical threshold', () => {
        const result = checkMetricThreshold('response_time', 4000);
        expect(result).toEqual({ status: 'critical', threshold: 3000 });
      });

      it('should return normal status for metrics without thresholds', () => {
        const result = checkMetricThreshold('throughput', 100);
        expect(result).toEqual({ status: 'normal' });
      });
    });
  });
});