import {
  PerformanceMetric,
  EndpointMetrics,
  DatabaseMetrics,
  RedisMetrics,
  SystemMetrics,
} from '../../../../../src/metrics/interfaces/performance-metrics.interface';

describe('Performance Metrics Interfaces', () => {
  describe('PerformanceMetric', () => {
    it('should have all required properties with correct types', () => {
      const metric: PerformanceMetric = {
        name: 'api_request_duration',
        value: 150.5,
        unit: 'ms',
        timestamp: new Date(),
        tags: {
          endpoint: '/api/v1/data',
          method: 'GET',
          status: '200'
        }
      };

      expect(typeof metric.name).toBe('string');
      expect(typeof metric.value).toBe('number');
      expect(typeof metric.unit).toBe('string');
      expect(metric.timestamp).toBeInstanceOf(Date);
      expect(typeof metric.tags).toBe('object');
      expect(metric.tags).not.toBeNull();
    });

    it('should support numeric values', () => {
      const metric: PerformanceMetric = {
        name: 'test_metric',
        value: 42,
        unit: 'count',
        timestamp: new Date(),
        tags: {}
      };

      expect(metric.value).toBe(42);
      expect(Number.isFinite(metric.value)).toBe(true);
    });

    it('should support decimal values', () => {
      const metric: PerformanceMetric = {
        name: 'cpu_usage',
        value: 75.123,
        unit: 'percent',
        timestamp: new Date(),
        tags: {}
      };

      expect(metric.value).toBe(75.123);
    });

    it('should support empty tags object', () => {
      const metric: PerformanceMetric = {
        name: 'memory_usage',
        value: 1024,
        unit: 'bytes',
        timestamp: new Date(),
        tags: {}
      };

      expect(Object.keys(metric.tags)).toHaveLength(0);
    });
  });

  describe('EndpointMetrics', () => {
    it('should have all required properties with correct types', () => {
      const metrics: EndpointMetrics = {
        endpoint: '/api/v1/receiver/data',
        method: 'POST',
        totalRequests: 1000,
        successfulRequests: 950,
        failedRequests: 50,
        averageResponseTime: 125.5,
        p95ResponseTime: 200.0,
        p99ResponseTime: 350.0,
        lastMinuteRequests: 15,
        errorRate: 0.05
      };

      expect(typeof metrics.endpoint).toBe('string');
      expect(typeof metrics.method).toBe('string');
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.successfulRequests).toBe('number');
      expect(typeof metrics.failedRequests).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.p95ResponseTime).toBe('number');
      expect(typeof metrics.p99ResponseTime).toBe('number');
      expect(typeof metrics.lastMinuteRequests).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
    });

    it('should support HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        const metrics: EndpointMetrics = {
          endpoint: '/api/test',
          method,
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 100,
          p95ResponseTime: 150,
          p99ResponseTime: 200,
          lastMinuteRequests: 10,
          errorRate: 0.05
        };

        expect(metrics.method).toBe(method);
      });
    });

    it('should calculate error rate correctly', () => {
      const metrics: EndpointMetrics = {
        endpoint: '/test',
        method: 'GET',
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 100,
        p95ResponseTime: 150,
        p99ResponseTime: 200,
        lastMinuteRequests: 10,
        errorRate: 0.05
      };

      expect(metrics.errorRate).toBe(metrics.failedRequests / metrics.totalRequests);
    });
  });

  describe('DatabaseMetrics', () => {
    it('should have all required properties with correct types', () => {
      const metrics: DatabaseMetrics = {
        connectionPoolSize: 50,
        activeConnections: 25,
        waitingConnections: 5,
        averageQueryTime: 15.5,
        slowQueries: 3,
        totalQueries: 1000
      };

      expect(typeof metrics.connectionPoolSize).toBe('number');
      expect(typeof metrics.activeConnections).toBe('number');
      expect(typeof metrics.waitingConnections).toBe('number');
      expect(typeof metrics.averageQueryTime).toBe('number');
      expect(typeof metrics.slowQueries).toBe('number');
      expect(typeof metrics.totalQueries).toBe('number');
    });

    it('should support reasonable database metric values', () => {
      const metrics: DatabaseMetrics = {
        connectionPoolSize: 50,
        activeConnections: 25,
        waitingConnections: 0,
        averageQueryTime: 10.25,
        slowQueries: 0,
        totalQueries: 500
      };

      expect(metrics.activeConnections).toBeLessThanOrEqual(metrics.connectionPoolSize);
      expect(metrics.slowQueries).toBeLessThanOrEqual(metrics.totalQueries);
      expect(metrics.waitingConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('RedisMetrics', () => {
    it('should have all required properties with correct types', () => {
      const metrics: RedisMetrics = {
        memoryUsage: 1024000000,
        connectedClients: 10,
        opsPerSecond: 500,
        hitRate: 0.85,
        evictedKeys: 100,
        expiredKeys: 200
      };

      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.connectedClients).toBe('number');
      expect(typeof metrics.opsPerSecond).toBe('number');
      expect(typeof metrics.hitRate).toBe('number');
      expect(typeof metrics.evictedKeys).toBe('number');
      expect(typeof metrics.expiredKeys).toBe('number');
    });

    it('should support valid hit rate values', () => {
      const metrics: RedisMetrics = {
        memoryUsage: 1024000000,
        connectedClients: 10,
        opsPerSecond: 500,
        hitRate: 0.95,
        evictedKeys: 10,
        expiredKeys: 50
      };

      expect(metrics.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('SystemMetrics', () => {
    it('should have all required properties with correct types', () => {
      const metrics: SystemMetrics = {
        cpuUsage: 0.45,
        memoryUsage: 0.65,
        heapUsed: 1024000000,
        heapTotal: 2048000000,
        uptime: 3600000,
        eventLoopLag: 2.5
      };

      expect(typeof metrics.cpuUsage).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.heapUsed).toBe('number');
      expect(typeof metrics.heapTotal).toBe('number');
      expect(typeof metrics.uptime).toBe('number');
      expect(typeof metrics.eventLoopLag).toBe('number');
    });

    it('should support reasonable system metric values', () => {
      const metrics: SystemMetrics = {
        cpuUsage: 0.45,
        memoryUsage: 0.65,
        heapUsed: 1024000000,
        heapTotal: 2048000000,
        uptime: 3600000,
        eventLoopLag: 1.2
      };

      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(1);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(1);
      expect(metrics.heapUsed).toBeLessThanOrEqual(metrics.heapTotal);
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.eventLoopLag).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Interface compatibility', () => {
    it('should support optional properties extension', () => {
      // Test that interfaces can be extended with optional properties
      const extendedMetric: PerformanceMetric & { optional?: string } = {
        name: 'test',
        value: 123,
        unit: 'ms',
        timestamp: new Date(),
        tags: {},
        optional: 'extra data'
      };

      expect(extendedMetric.optional).toBe('extra data');
    });

    it('should work with arrays of metrics', () => {
      const metrics: PerformanceMetric[] = [
        {
          name: 'metric1',
          value: 100,
          unit: 'ms',
          timestamp: new Date(),
          tags: {}
        },
        {
          name: 'metric2',
          value: 200,
          unit: 'count',
          timestamp: new Date(),
          tags: { type: 'counter' }
        }
      ];

      expect(metrics).toHaveLength(2);
      expect(metrics[0].name).toBe('metric1');
      expect(metrics[1].tags.type).toBe('counter');
    });
  });
});
