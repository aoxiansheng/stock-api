/**
 * Shared组件测试通用设置
 * 在每个测试文件执行前运行
 */

import 'reflect-metadata';

// 扩展Jest匹配器
expect.extend({
  /**
   * 检查是否在指定时间内完成
   */
  toCompleteWithin(received: Promise<any>, timeMs: number) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      received
        .then((result) => {
          const duration = Date.now() - startTime;
          const pass = duration <= timeMs;
          
          resolve({
            pass,
            message: () => 
              pass 
                ? `Expected operation to take longer than ${timeMs}ms, but it completed in ${duration}ms`
                : `Expected operation to complete within ${timeMs}ms, but it took ${duration}ms`,
          });
        })
        .catch((error) => {
          resolve({
            pass: false,
            message: () => `Operation failed: ${error.message}`,
          });
        });
    });
  },

  /**
   * 检查性能基准
   */
  toMeetPerformanceBenchmark(received: number, expectedMs: number) {
    const pass = received <= expectedMs;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received}ms to be greater than ${expectedMs}ms`
          : `Expected ${received}ms to be less than or equal to ${expectedMs}ms`,
    };
  },

  /**
   * 检查缓存命中率
   */
  toHaveCacheHitRate(received: { hits: number; total: number }, expectedRate: number) {
    const actualRate = received.total === 0 ? 0 : received.hits / received.total;
    const pass = actualRate >= expectedRate;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected cache hit rate ${(actualRate * 100).toFixed(2)}% to be less than ${(expectedRate * 100).toFixed(2)}%`
          : `Expected cache hit rate ${(actualRate * 100).toFixed(2)}% to be at least ${(expectedRate * 100).toFixed(2)}%`,
    };
  },
});

// 声明自定义匹配器的类型（避免TypeScript错误）
declare global {
  namespace jest {
    interface Matchers<R> {
      toCompleteWithin(timeMs: number): R;
      toMeetPerformanceBenchmark(expectedMs: number): R;
      toHaveCacheHitRate(expectedRate: number): R;
    }
  }
}

// 全局测试配置
const globalTestConfig = {
  // 默认超时时间
  DEFAULT_TIMEOUT: 5000,
  
  // 性能基准
  PERFORMANCE_THRESHOLDS: {
    STRING_SIMILARITY: 10,     // StringUtils.calculateSimilarity < 10ms
    STRING_HASH: 5,            // StringUtils.generateHash < 5ms
    OBJECT_TRAVERSE: 20,       // ObjectUtils深度遍历 < 20ms
    MARKET_STATUS_CACHE_HIT: 1,        // 缓存命中 < 1ms
    MARKET_STATUS_CACHE_MISS: 100,     // 缓存未命中 < 100ms
    DATA_CHANGE_DETECTION: 50,         // 变更检测 < 50ms
    QUICK_CHECKSUM: 10,                // 快速校验和 < 10ms
  },
  
  // 缓存相关
  CACHE_CONFIG: {
    MIN_HIT_RATE: 0.8,        // 最低缓存命中率80%
    MAX_CACHE_SIZE: 1000,     // 测试用最大缓存大小
    TEST_TTL: 1000,           // 测试用TTL 1秒
  },
  
  // 测试数据配置
  TEST_DATA: {
    SAMPLE_SYMBOLS: ['700.HK', 'AAPL.US', '000001.SZ', '600036.SH'],
    LARGE_DATASET_SIZE: 1000,
    PERFORMANCE_TEST_ITERATIONS: 100,
  },
};

// 导出全局配置供测试使用
(global as any).testConfig = globalTestConfig;

// Console输出美化（仅在verbose模式下）
if (process.env.JEST_VERBOSE === 'true') {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const timestamp = new Date().toISOString();
    originalConsoleLog(`[${timestamp}]`, ...args);
  };
}

// 测试环境变量设置
process.env.NODE_ENV = 'test';
process.env.DISABLE_AUTO_INIT = 'true'; // 禁用自动初始化

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 测试前的清理工作
beforeEach(() => {
  // 清理所有Mock
  jest.clearAllMocks();
});

// 测试后的清理工作
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers();
});

export { globalTestConfig };