import { 
  CachePerformance,
  DatabasePerformance,
  AuthPerformance
} from '../../../../../src/metrics/decorators/database-performance.decorator';
import { PerformanceMonitorService } from '../../../../../src/metrics/services/performance-monitor.service';

describe('Performance Decorators', () => {
  let mockPerformanceMonitor: any;
  
  beforeEach(() => {
    // 创建模拟的PerformanceMonitorService
    mockPerformanceMonitor = {
      wrapWithTiming: jest.fn((fn, callback) => {
        try {
          const result = fn();
          if (result instanceof Promise) {
            return result
              .then((value) => {
                callback(100, true, value); // 模拟100ms的成功执行
                return value;
              })
              .catch((err) => {
                callback(50, false); // 模拟50ms的失败执行
                throw err;
              });
          } else {
            callback(5, true, result); // 模拟5ms的同步成功执行
            return result;
          }
        } catch (err) {
          callback(5, false); // 模拟5ms的同步失败执行
          throw err;
        }
      }),
      recordDatabaseQuery: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordAuthentication: jest.fn()
    };

    // 设置全局模拟对象
    global['performanceMonitorService'] = mockPerformanceMonitor;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global['performanceMonitorService'];
  });

  describe('DatabasePerformance Decorator', () => {
    it('应该被正确定义', () => {
      expect(DatabasePerformance).toBeDefined();
      expect(typeof DatabasePerformance).toBe('function');
    });

    it('应该包装同步方法并测量性能', () => {
      class TestClass {
        @DatabasePerformance('find_query')
        findItems(filter: any): any[] {
          return [{ id: 1, name: 'Test' }];
        }
      }

      const instance = new TestClass();
      const result = instance.findItems({ status: 'active' });

      expect(result).toEqual([{ id: 1, name: 'Test' }]);
      expect(mockPerformanceMonitor.wrapWithTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordDatabaseQuery).toHaveBeenCalledWith('find_query', 5, true);
    });

    it('应该包装异步方法并测量性能', async () => {
      class TestClass {
        @DatabasePerformance('aggregate_query')
        async aggregateData(): Promise<any[]> {
          return Promise.resolve([{ count: 5 }]);
        }
      }

      const instance = new TestClass();
      const result = await instance.aggregateData();

      expect(result).toEqual([{ count: 5 }]);
      expect(mockPerformanceMonitor.wrapWithTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordDatabaseQuery).toHaveBeenCalledWith('aggregate_query', 100, true);
    });

    it('应该处理方法错误并记录失败', async () => {
      class TestClass {
        @DatabasePerformance('error_query')
        async errorQuery(): Promise<any> {
          throw new Error('Database error');
        }
      }

      const instance = new TestClass();
      
      await expect(instance.errorQuery()).rejects.toThrow('Database error');
      expect(mockPerformanceMonitor.recordDatabaseQuery).toHaveBeenCalledWith('error_query', 50, false);
    });

    it('应该在无性能监控服务时正常运行方法', async () => {
      delete global['performanceMonitorService'];
      
      class TestClass {
        @DatabasePerformance('no_monitor_query')
        getData(): string {
          return 'test_data';
        }
      }

      const instance = new TestClass();
      const result = instance.getData();
      
      expect(result).toBe('test_data');
    });

    it('应该处理类中有性能监控服务实例的情况', () => {
      class TestClass {
        performanceMonitor = mockPerformanceMonitor;

        @DatabasePerformance('class_monitor_query')
        getData(): string {
          return 'class_data';
        }
      }

      const instance = new TestClass();
      const result = instance.getData();
      
      expect(result).toBe('class_data');
      expect(mockPerformanceMonitor.recordDatabaseQuery).toHaveBeenCalledWith('class_monitor_query', 5, true);
    });
  });

  describe('AuthPerformance Decorator', () => {
    it('应该被正确定义', () => {
      expect(AuthPerformance).toBeDefined();
      expect(typeof AuthPerformance).toBe('function');
    });

    it('应该包装JWT认证方法并测量性能', async () => {
      class TestClass {
        @AuthPerformance('jwt')
        async validateJwtToken(token: string): Promise<any> {
          return Promise.resolve({ userId: '123', username: 'testuser' });
        }
      }

      const instance = new TestClass();
      const result = await instance.validateJwtToken('test-token');

      expect(result).toEqual({ userId: '123', username: 'testuser' });
      expect(mockPerformanceMonitor.wrapWithTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordAuthentication).toHaveBeenCalledWith('jwt', true, 100);
    });

    it('应该包装API Key认证方法并测量性能', () => {
      class TestClass {
        @AuthPerformance('api_key')
        validateApiKey(apiKey: string): boolean {
          return apiKey === 'valid-key';
        }
      }

      const instance = new TestClass();
      
      const validResult = instance.validateApiKey('valid-key');
      expect(validResult).toBe(true);
      expect(mockPerformanceMonitor.recordAuthentication).toHaveBeenCalledWith('api_key', true, 5);

      mockPerformanceMonitor.recordAuthentication.mockClear();
      
      const invalidResult = instance.validateApiKey('invalid-key');
      expect(invalidResult).toBe(false);
      // 即使结果是false，认证尝试成功执行了
      expect(mockPerformanceMonitor.recordAuthentication).toHaveBeenCalledWith('api_key', true, 5);
    });

    it('应该处理认证错误并记录失败', async () => {
      class TestClass {
        @AuthPerformance('jwt')
        async verifyTokenWithError(): Promise<any> {
          throw new Error('Invalid token');
        }
      }

      const instance = new TestClass();
      
      await expect(instance.verifyTokenWithError()).rejects.toThrow('Invalid token');
      expect(mockPerformanceMonitor.recordAuthentication).toHaveBeenCalledWith('jwt', false, 50);
    });

    it('应该在无性能监控服务时正常运行方法', () => {
      delete global['performanceMonitorService'];
      
      class TestClass {
        @AuthPerformance('api_key')
        validateKey(): boolean {
          return true;
        }
      }

      const instance = new TestClass();
      const result = instance.validateKey();
      
      expect(result).toBe(true);
    });

    it('应该处理类中有性能监控服务实例的情况', async () => {
      class TestClass {
        performanceMonitor = mockPerformanceMonitor;

        @AuthPerformance('jwt')
        async validateUser(): Promise<any> {
          return { isValid: true };
        }
      }

      const instance = new TestClass();
      const result = await instance.validateUser();
      
      expect(result).toEqual({ isValid: true });
      expect(mockPerformanceMonitor.recordAuthentication).toHaveBeenCalledWith('jwt', true, 100);
    });
  });

  describe('CachePerformance Decorator', () => {
    it('应该被正确定义', () => {
      expect(CachePerformance).toBeDefined();
      expect(typeof CachePerformance).toBe('function');
    });

    it('应该包装缓存获取方法并记录命中情况', async () => {
      class TestClass {
        @CachePerformance('get')
        async getFromCache(key: string): Promise<any> {
          return { data: 'cached_value' };
        }
      }

      const instance = new TestClass();
      const result = await instance.getFromCache('test-key');

      expect(result).toEqual({ data: 'cached_value' });
      expect(mockPerformanceMonitor.wrapWithTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordCacheOperation).toHaveBeenCalledWith('get', true, 100);
    });

    it('应该记录缓存未命中情况', async () => {
      class TestClass {
        @CachePerformance('get')
        async getCacheMiss(key: string): Promise<any> {
          return null; // 缓存未命中返回null
        }
      }

      const instance = new TestClass();
      const result = await instance.getCacheMiss('test-key');

      expect(result).toBeNull();
      expect(mockPerformanceMonitor.recordCacheOperation).toHaveBeenCalledWith('get', false, 100);
    });

    it('应该记录缓存设置操作', () => {
      class TestClass {
        @CachePerformance('set')
        setToCache(key: string, value: any): boolean {
          return true; // 成功设置缓存
        }
      }

      const instance = new TestClass();
      const result = instance.setToCache('test-key', { data: 'value' });

      expect(result).toBe(true);
      expect(mockPerformanceMonitor.recordCacheOperation).toHaveBeenCalledWith('set', true, 5);
    });

    it('应该处理缓存操作错误', async () => {
      class TestClass {
        @CachePerformance('delete')
        async deleteFromCache(): Promise<void> {
          throw new Error('Cache error');
        }
      }

      const instance = new TestClass();
      
      await expect(instance.deleteFromCache()).rejects.toThrow('Cache error');
      expect(mockPerformanceMonitor.recordCacheOperation).toHaveBeenCalledWith('delete', false, 50);
    });

    it('should in無性能監控服務時正常運行方法', () => {
      delete global['performanceMonitorService'];
      
      class TestClass {
        @CachePerformance('get')
        getFromCache(): any {
          return { value: 'test' };
        }
      }

      const instance = new TestClass();
      const result = instance.getFromCache();
      
      expect(result).toEqual({ value: 'test' });
    });
  });
});