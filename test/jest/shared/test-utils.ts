/**
 * 共享测试工具类
 * 提供统一的Mock对象、数据生成器和测试辅助函数
 */

export class TestUtils {
  /**
   * 创建Mock CollectorService用于监控测试
   * 所有shared组件都依赖此服务进行监控
   */
  static createMockCollectorService() {
    return {
      recordRequest: jest.fn().mockResolvedValue(undefined),
      recordCacheOperation: jest.fn().mockResolvedValue(undefined),
      recordPerformanceMetric: jest.fn().mockResolvedValue(undefined),
      recordError: jest.fn().mockResolvedValue(undefined),
      recordHealthCheck: jest.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * 生成测试用的市场数据
   */
  static generateMarketData(overrides: Partial<any> = {}) {
    return {
      symbol: '700.HK',
      price: 350.5,
      volume: 1000000,
      timestamp: Date.now(),
      market: 'HK',
      currency: 'HKD',
      ...overrides,
    };
  }

  /**
   * 生成批量测试数据
   */
  static generateBatchMarketData(count: number, baseOverrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.generateMarketData({
        symbol: `TEST${index}.HK`,
        price: 100 + index * 10,
        ...baseOverrides,
      })
    );
  }

  /**
   * 性能测试辅助函数 - 测量执行时间
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // 转换为毫秒
    return { result, duration };
  }

  /**
   * 同步版本的性能测试
   */
  static measureSyncExecutionTime<T>(fn: () => T): { result: T; duration: number } {
    const start = process.hrtime.bigint();
    const result = fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000;
    return { result, duration };
  }

  /**
   * 创建Mock Redis缓存用于测试
   */
  static createMockCache() {
    const store = new Map<string, any>();
    
    return {
      get: jest.fn().mockImplementation((key: string) => 
        Promise.resolve(store.get(key))
      ),
      set: jest.fn().mockImplementation((key: string, value: any, ttl?: number) => 
        Promise.resolve(store.set(key, value))
      ),
      del: jest.fn().mockImplementation((key: string) => 
        Promise.resolve(store.delete(key))
      ),
      clear: jest.fn().mockImplementation(() => 
        Promise.resolve(store.clear())
      ),
      has: jest.fn().mockImplementation((key: string) => 
        Promise.resolve(store.has(key))
      ),
      keys: jest.fn().mockImplementation(() => 
        Promise.resolve(Array.from(store.keys()))
      ),
      size: jest.fn().mockImplementation(() => 
        Promise.resolve(store.size)
      ),
    };
  }

  /**
   * 创建Mock Logger用于测试
   */
  static createMockLogger() {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  }

  /**
   * 等待指定时间（测试用）
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成随机字符串（测试用）
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成大型对象用于性能测试
   */
  static generateLargeObject(depth: number = 3, breadth: number = 10): any {
    if (depth <= 0) {
      return this.generateRandomString();
    }

    const obj: any = {};
    for (let i = 0; i < breadth; i++) {
      const key = `key_${i}`;
      if (i % 3 === 0) {
        obj[key] = this.generateLargeObject(depth - 1, breadth);
      } else if (i % 3 === 1) {
        obj[key] = Array.from({ length: 5 }, (_, idx) => `array_item_${idx}`);
      } else {
        obj[key] = Math.random() * 1000;
      }
    }
    return obj;
  }

  /**
   * 创建Market枚举的Mock值
   */
  static getTestMarkets() {
    return ['HK', 'US', 'SH', 'SZ'] as const;
  }

  /**
   * 验证对象是否符合预期结构
   */
  static validateObjectStructure(obj: any, expectedKeys: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    return expectedKeys.every(key => obj.hasOwnProperty(key));
  }

  /**
   * 创建性能基准测试辅助函数
   */
  static createPerformanceBenchmark(name: string, thresholdMs: number) {
    return {
      name,
      thresholdMs,
      run: async (fn: () => Promise<any>) => {
        const { result, duration } = await this.measureExecutionTime(fn);
        
        expect(duration).toBeLessThan(thresholdMs);
        
        return {
          result,
          duration,
          passed: duration < thresholdMs,
          message: `${name}: ${duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`
        };
      }
    };
  }

  /**
   * 测试数据快照比较辅助函数
   */
  static compareSnapshots(snapshot1: any, snapshot2: any): boolean {
    return JSON.stringify(snapshot1) === JSON.stringify(snapshot2);
  }

  /**
   * 生成时间序列数据用于测试
   */
  static generateTimeSeriesData(count: number, intervalMs: number = 1000) {
    const baseTime = Date.now();
    return Array.from({ length: count }, (_, index) => ({
      timestamp: baseTime + (index * intervalMs),
      value: Math.random() * 100,
      index,
    }));
  }

  /**
   * 创建测试对象，包含多层嵌套结构供ObjectUtils测试使用
   */
  static createTestObject(complexity: number = 50): any {
    return {
      level1: {
        level2: {
          level3: {
            value: 'test-value',
            number: 42,
            boolean: true
          }
        }
      },
      array: Array.from({ length: Math.min(complexity, 20) }, (_, index) => ({
        id: index,
        name: `Item ${index}`,
        nested: {
          name: `Nested ${index}`,
          values: [index * 10, index * 20, index * 30]
        }
      })),
      metadata: {
        timestamp: Date.now(),
        version: '1.0.0',
        complexity,
        description: 'Test object for ObjectUtils testing'
      },
      // Add many properties to test performance
      ...Array.from({ length: complexity }, (_, index) => ({
        [`dynamicProp${index}`]: {
          id: index,
          value: `dynamic-value-${index}`,
          data: {
            nested: true,
            level: index % 5
          }
        }
      })).reduce((acc, item) => ({ ...acc, ...item }), {})
    };
  }
}