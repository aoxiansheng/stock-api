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

  describe('Error Handling and Edge Cases', () => {
    it('should handle decorator application errors gracefully', async () => {
      // Test with invalid descriptor
      const decorator = DatabasePerformance('testOperation');
      const target = {};
      const propertyName = 'testMethod';
      const invalidDescriptor = {} as PropertyDescriptor;

      expect(() => {
        decorator(target, propertyName, invalidDescriptor);
      }).not.toThrow();
    });

    it('should handle synchronous methods', () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('syncOperation')
        syncMethod() {
          return 'sync_result';
        }
      }

      const service = new TestService();
      const result = service.syncMethod();

      expect(result).toBe('sync_result');
    });

    it('should handle methods with multiple parameters', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('multiParamOperation')
        async multiParamMethod(param1: string, param2: number, param3: boolean) {
          return { param1, param2, param3 };
        }
      }

      const service = new TestService();
      const result = await service.multiParamMethod('test', 123, true);

      await new Promise(resolve => setImmediate(resolve));

      expect(result).toEqual({ param1: 'test', param2: 123, param3: true });
      expect(events).toHaveLength(1);
    });

    it('should handle methods that return undefined', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('voidOperation')
        async voidMethod(): Promise<void> {
          // Method returns void
        }
      }

      const service = new TestService();
      const result = await service.voidMethod();

      await new Promise(resolve => setImmediate(resolve));

      expect(result).toBeUndefined();
      expect(events).toHaveLength(1);
    });

    it('should handle options with recordSuccess false', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance({ operation: 'noRecordSuccess', recordSuccess: false })
        async testMethod() {
          return 'result';
        }
      }

      const service = new TestService();
      await service.testMethod();

      await new Promise(resolve => setImmediate(resolve));

      expect(events).toHaveLength(1); // Event is still emitted
      expect(events[0].tags.success).toBe(true);
    });

    it('should handle options with recordError false', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance({ operation: 'noRecordError', recordError: false })
        async testMethod() {
          throw new Error('Test error');
        }
      }

      const service = new TestService();

      await expect(service.testMethod()).rejects.toThrow('Test error');

      await new Promise(resolve => setImmediate(resolve));

      expect(events).toHaveLength(1);
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error not logged due to recordError: false
    });
  });

  describe('Performance Metric Generation', () => {
    it('should generate metrics with proper timestamp', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('timestampTest')
        async testMethod() {
          return 'result';
        }
      }

      const beforeTime = new Date();
      const service = new TestService();
      await service.testMethod();

      await new Promise(resolve => setImmediate(resolve));
      const afterTime = new Date();

      expect(events).toHaveLength(1);
      expect(events[0].timestamp).toBeInstanceOf(Date);
      expect(events[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(events[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should generate source name correctly from decorator name', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @CachePerformance('sourceNameTest')
        async testMethod() {
          return 'result';
        }
      }

      const service = new TestService();
      await service.testMethod();

      await new Promise(resolve => setImmediate(resolve));

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe('cache_performance');
    });

    it('should include all required tags in metrics', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @AuthPerformance({ operation: 'fullTagsTest', threshold: 200 })
        async testMethod() {
          return 'result';
        }
      }

      const service = new TestService();
      await service.testMethod();

      await new Promise(resolve => setImmediate(resolve));

      expect(events).toHaveLength(1);
      const tags = events[0].tags;
      expect(tags).toHaveProperty('operation', 'fullTagsTest');
      expect(tags).toHaveProperty('success', true);
      expect(tags).toHaveProperty('target', 'TestService');
      expect(tags).toHaveProperty('method', 'testMethod');
      expect(tags).toHaveProperty('type', 'auth');
      expect(tags).toHaveProperty('threshold', 200);
      expect(tags).toHaveProperty('decorator_name', 'AuthPerformance');
      expect(tags).toHaveProperty('error', undefined);
    });
  });

  describe('Decorator Factory Functions', () => {
    it('should create decorators with different metric types', () => {
      const databaseDecorator = createCustomPerformanceDecorator('TestDatabase', 'database');
      const cacheDecorator = createCustomPerformanceDecorator('TestCache', 'cache');
      const authDecorator = createCustomPerformanceDecorator('TestAuth', 'auth');

      expect(databaseDecorator).toBeInstanceOf(Function);
      expect(cacheDecorator).toBeInstanceOf(Function);
      expect(authDecorator).toBeInstanceOf(Function);
    });

    it('should preserve decorator name in custom decorators', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      const CustomDecorator = createCustomPerformanceDecorator('MyCustomDecorator', 'cache');

      class TestService {
        @CustomDecorator('customTest')
        async testMethod() {
          return 'result';
        }
      }

      const service = new TestService();
      await service.testMethod();

      await new Promise(resolve => setImmediate(resolve));

      expect(events).toHaveLength(1);
      expect(events[0].tags.decorator_name).toBe('MyCustomDecorator');
      expect(events[0].source).toBe('my_custom_decorator');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent decorated methods', async () => {
      const events: any[] = [];
      performanceDecoratorBus.on('performance-metric', (event) => {
        events.push(event);
      });

      class TestService {
        @DatabasePerformance('concurrent1')
        async method1() {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'result1';
        }

        @DatabasePerformance('concurrent2')
        async method2() {
          await new Promise(resolve => setTimeout(resolve, 30));
          return 'result2';
        }

        @DatabasePerformance('concurrent3')
        async method3() {
          await new Promise(resolve => setTimeout(resolve, 70));
          return 'result3';
        }
      }

      const service = new TestService();
      const promises = [
        service.method1(),
        service.method2(),
        service.method3()
      ];

      const results = await Promise.all(promises);

      await new Promise(resolve => setImmediate(resolve));

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(events).toHaveLength(3);

      const operations = events.map(e => e.tags.operation).sort();
      expect(operations).toEqual(['concurrent1', 'concurrent2', 'concurrent3']);
    });
  });

  describe('Event Emitter Functionality', () => {
    it('should support multiple listeners', (done) => {
      let listener1Called = false;
      let listener2Called = false;

      performanceDecoratorBus.on('test-event', () => {
        listener1Called = true;
        checkCompletion();
      });

      performanceDecoratorBus.on('test-event', () => {
        listener2Called = true;
        checkCompletion();
      });

      function checkCompletion() {
        if (listener1Called && listener2Called) {
          done();
        }
      }

      performanceDecoratorBus.emit('test-event');
    });

    it('should allow listener removal', () => {
      const listener = jest.fn();
      performanceDecoratorBus.on('removable-event', listener);

      performanceDecoratorBus.emit('removable-event');
      expect(listener).toHaveBeenCalledTimes(1);

      performanceDecoratorBus.removeListener('removable-event', listener);

      performanceDecoratorBus.emit('removable-event');
      expect(listener).toHaveBeenCalledTimes(1); // Still only called once
    });
  });
});