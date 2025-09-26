/**
 * InfrastructureDatabaseDecorator Unit Tests
 * 测试数据库和缓存性能监控装饰器的功能
 */

import { EventEmitter } from 'events';
import {
  DatabasePerformance,
  CachePerformance,
  AuthPerformance,
  createCustomPerformanceDecorator,
  performanceDecoratorBus
} from '@monitoring/infrastructure/decorators/infrastructure-database.decorator';
import { createLogger } from '@common/logging/index';

// Mock dependencies
jest.mock('@common/logging/index');

describe('InfrastructureDatabaseDecorator', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('DatabasePerformance', () => {
    it('should monitor database operation performance', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('testOperation')
        async testMethod() {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'result';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe('result');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        source: 'database_performance',
        metricType: 'performance',
        metricName: 'database_operation_processed',
        tags: {
          operation: 'testOperation',
          success: true,
          target: 'TestService',
          method: 'testMethod',
          type: 'database',
          decorator_name: 'DatabasePerformance'
        }
      });
      expect(events[0].metricValue).toBeGreaterThanOrEqual(10);
    });

    it('should handle database operation errors', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('testOperation')
        async testMethod() {
          throw new Error('Database error');
        }
      }

      const service = new TestService();

      await expect(service.testMethod()).rejects.toThrow('Database error');

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        tags: {
          operation: 'testOperation',
          success: false,
          target: 'TestService',
          method: 'testMethod',
          type: 'database',
          error: 'Database error',
          decorator_name: 'DatabasePerformance'
        }
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'database操作失败',
        expect.objectContaining({
          operation: 'testOperation',
          error: 'Database error'
        })
      );
    });

    it('should log slow database operations', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance({ operation: 'slowOperation', threshold: 5 })
        async testMethod() {
          // Simulate slow operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'result';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe('result');
      expect(events).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '慢database操作检测',
        expect.objectContaining({
          operation: 'slowOperation',
          duration: expect.any(Number),
          threshold: 5
        })
      );
    });
  });

  describe('CachePerformance', () => {
    it('should monitor cache operation performance', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @CachePerformance('cacheGet')
        async getFromCache() {
          return 'cached_value';
        }
      }

      const service = new TestService();
      const result = await service.getFromCache();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe('cached_value');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        source: 'cache_performance',
        metricName: 'cache_operation_processed',
        tags: {
          operation: 'cacheGet',
          success: true,
          target: 'TestService',
          method: 'getFromCache',
          type: 'cache',
          decorator_name: 'CachePerformance'
        }
      });
    });
  });

  describe('AuthPerformance', () => {
    it('should monitor auth operation performance', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @AuthPerformance('authenticate')
        async authenticateUser() {
          return true;
        }
      }

      const service = new TestService();
      const result = await service.authenticateUser();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        source: 'auth_performance',
        metricName: 'auth_operation_processed',
        tags: {
          operation: 'authenticate',
          success: true,
          target: 'TestService',
          method: 'authenticateUser',
          type: 'auth',
          decorator_name: 'AuthPerformance'
        }
      });
    });
  });

  describe('createCustomPerformanceDecorator', () => {
    it('should create custom performance decorator', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      const CustomPerformance = createCustomPerformanceDecorator('CustomPerformance', 'database');

      class TestService {
        @CustomPerformance('customOperation')
        async customMethod() {
          return 'custom_result';
        }
      }

      const service = new TestService();
      const result = await service.customMethod();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe('custom_result');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        source: 'custom_performance',
        metricName: 'database_operation_processed',
        tags: {
          operation: 'customOperation',
          success: true,
          target: 'TestService',
          method: 'customMethod',
          type: 'database',
          decorator_name: 'CustomPerformance'
        }
      });
    });
  });

  describe('performanceDecoratorBus', () => {
    it('should be an EventEmitter instance', () => {
      expect(performanceDecoratorBus).toBeInstanceOf(EventEmitter);
    });

    it('should emit and receive performance metrics', (done) => {
      const testEvent = {
        timestamp: new Date(),
        source: 'test',
        metricType: 'performance',
        metricName: 'test_metric',
        metricValue: 100,
        tags: { operation: 'test' }
      };

      performanceDecoratorBus.on('performance-metric', (event) => {
        expect(event).toEqual(testEvent);
        done();
      });

      performanceDecoratorBus.emit('performance-metric', testEvent);
    });
  });

  describe('Decorator with default options', () => {
    it('should use default operation name when not provided', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance()
        async defaultMethod() {
          return 'result';
        }
      }

      const service = new TestService();
      const result = await service.defaultMethod();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe('result');
      expect(events).toHaveLength(1);
      expect(events[0].tags.operation).toBe('TestService.defaultMethod');
    });

    it('should use default threshold of 100ms', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('defaultThresholdTest')
        async slowMethod() {
          // Simulate operation slower than default threshold
          await new Promise(resolve => setTimeout(resolve, 150));
          return 'result';
        }
      }

      const service = new TestService();
      const result = await service.slowMethod();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBe('result');
      expect(events).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '慢database操作检测',
        expect.objectContaining({
          operation: 'defaultThresholdTest',
          threshold: 100
        })
      );
    });
  });
});