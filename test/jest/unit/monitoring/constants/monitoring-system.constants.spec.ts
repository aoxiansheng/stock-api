import {
  MONITORING_SYSTEM_LIMITS,
  MonitoringSystemLimitUtils,
  MonitoringSystemLimitKeys,
  MonitoringSystemLimits
} from '../../../../../src/monitoring/constants/config/monitoring-system.constants';

describe('MONITORING_SYSTEM_LIMITS Constants', () => {
  describe('HTTP状态码阈值', () => {
    it('应该定义正确的HTTP阈值', () => {
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD).toBe(400);
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD).toBe(500);
    });

    it('HTTP阈值应该是递增的', () => {
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD)
        .toBeLessThan(MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD);
    });
  });

  describe('性能阈值（毫秒）', () => {
    it('应该定义正确的性能阈值', () => {
      expect(MONITORING_SYSTEM_LIMITS.SLOW_QUERY_THRESHOLD_MS).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.CACHE_RESPONSE_THRESHOLD_MS).toBe(100);
      expect(MONITORING_SYSTEM_LIMITS.API_RESPONSE_TIME_MS).toBe(100);
    });

    it('性能阈值应该合理', () => {
      // 缓存应该比API响应快
      expect(MONITORING_SYSTEM_LIMITS.CACHE_RESPONSE_THRESHOLD_MS)
        .toBeLessThanOrEqual(MONITORING_SYSTEM_LIMITS.API_RESPONSE_TIME_MS);
      
      // API响应应该比慢请求阈值快
      expect(MONITORING_SYSTEM_LIMITS.API_RESPONSE_TIME_MS)
        .toBeLessThan(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS);
    });
  });

  describe('系统限制', () => {
    it('应该定义正确的系统限制', () => {
      expect(MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE).toBe(100);
      expect(MONITORING_SYSTEM_LIMITS.MAX_KEY_LENGTH).toBe(100);
      expect(MONITORING_SYSTEM_LIMITS.MAX_QUEUE_SIZE).toBe(10000);
      expect(MONITORING_SYSTEM_LIMITS.MAX_OPERATION_TIMES).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.MAX_QUERY_LIMIT).toBe(1000);
    });

    it('系统限制应该合理', () => {
      // 批量大小应该小于缓冲区大小
      expect(MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE)
        .toBeLessThanOrEqual(MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE);
      
      // 缓冲区大小应该小于队列大小
      expect(MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE)
        .toBeLessThan(MONITORING_SYSTEM_LIMITS.MAX_QUEUE_SIZE);
    });
  });

  describe('计算精度', () => {
    it('应该定义正确的计算精度常量', () => {
      expect(MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR).toBe(10000);
      expect(MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER).toBe(100);
    });

    it('精度因子应该是10的倍数', () => {
      expect(MONITORING_SYSTEM_LIMITS.DECIMAL_PRECISION_FACTOR % 10).toBe(0);
      expect(MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER % 10).toBe(0);
    });
  });

  describe('时间窗口（毫秒）', () => {
    it('应该定义正确的时间常量', () => {
      expect(MONITORING_SYSTEM_LIMITS.MINUTE_IN_MS).toBe(60000);
      expect(MONITORING_SYSTEM_LIMITS.HOUR_IN_MS).toBe(3600000);
      expect(MONITORING_SYSTEM_LIMITS.DAY_IN_MS).toBe(86400000);
    });

    it('时间换算应该正确', () => {
      expect(MONITORING_SYSTEM_LIMITS.HOUR_IN_MS)
        .toBe(MONITORING_SYSTEM_LIMITS.MINUTE_IN_MS * 60);
      expect(MONITORING_SYSTEM_LIMITS.DAY_IN_MS)
        .toBe(MONITORING_SYSTEM_LIMITS.HOUR_IN_MS * 24);
    });
  });

  describe('评分和比率', () => {
    it('应该定义满分基数', () => {
      expect(MONITORING_SYSTEM_LIMITS.FULL_SCORE).toBe(100);
    });

    it('满分应该是正数', () => {
      expect(MONITORING_SYSTEM_LIMITS.FULL_SCORE).toBeGreaterThan(0);
    });
  });

  describe('批处理配置', () => {
    it('应该定义正确的批处理配置', () => {
      expect(MONITORING_SYSTEM_LIMITS.DEFAULT_FLUSH_INTERVAL_MS).toBe(100);
      expect(MONITORING_SYSTEM_LIMITS.DEFAULT_BATCH_SIZE).toBe(100);
      expect(MONITORING_SYSTEM_LIMITS.EVENT_COUNTER_THRESHOLD).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.FORCE_FLUSH_INTERVAL_MS).toBe(5000);
    });

    it('批处理配置应该合理', () => {
      // 强制刷新间隔应该大于默认刷新间隔
      expect(MONITORING_SYSTEM_LIMITS.FORCE_FLUSH_INTERVAL_MS)
        .toBeGreaterThan(MONITORING_SYSTEM_LIMITS.DEFAULT_FLUSH_INTERVAL_MS);
      
      // 事件计数器阈值应该大于默认批处理大小
      expect(MONITORING_SYSTEM_LIMITS.EVENT_COUNTER_THRESHOLD)
        .toBeGreaterThan(MONITORING_SYSTEM_LIMITS.DEFAULT_BATCH_SIZE);
    });
  });

  describe('监控指标配置', () => {
    it('应该定义监控缓存过期时间', () => {
      expect(MONITORING_SYSTEM_LIMITS.MONITORING_CACHE_STALE_TIME_MS).toBe(300000); // 5分钟
    });

    it('缓存过期时间应该合理', () => {
      expect(MONITORING_SYSTEM_LIMITS.MONITORING_CACHE_STALE_TIME_MS)
        .toBeGreaterThan(MONITORING_SYSTEM_LIMITS.MINUTE_IN_MS); // 大于1分钟
    });
  });
});

describe('MonitoringSystemLimitUtils', () => {
  describe('HTTP状态码判断', () => {
    it('应该正确判断客户端错误', () => {
      expect(MonitoringSystemLimitUtils.isClientError(399)).toBe(false);
      expect(MonitoringSystemLimitUtils.isClientError(400)).toBe(true);
      expect(MonitoringSystemLimitUtils.isClientError(404)).toBe(true);
      expect(MonitoringSystemLimitUtils.isClientError(499)).toBe(true);
      expect(MonitoringSystemLimitUtils.isClientError(500)).toBe(true);
    });

    it('应该正确判断服务器错误', () => {
      expect(MonitoringSystemLimitUtils.isServerError(499)).toBe(false);
      expect(MonitoringSystemLimitUtils.isServerError(500)).toBe(true);
      expect(MonitoringSystemLimitUtils.isServerError(502)).toBe(true);
      expect(MonitoringSystemLimitUtils.isServerError(503)).toBe(true);
    });
  });

  describe('性能判断', () => {
    it('应该正确判断慢查询', () => {
      expect(MonitoringSystemLimitUtils.isSlowQuery(999)).toBe(false);
      expect(MonitoringSystemLimitUtils.isSlowQuery(1000)).toBe(false); // 等于阈值不算慢
      expect(MonitoringSystemLimitUtils.isSlowQuery(1001)).toBe(true);
      expect(MonitoringSystemLimitUtils.isSlowQuery(2000)).toBe(true);
    });

    it('应该正确判断慢请求', () => {
      expect(MonitoringSystemLimitUtils.isSlowRequest(999)).toBe(false);
      expect(MonitoringSystemLimitUtils.isSlowRequest(1000)).toBe(false); // 等于阈值不算慢
      expect(MonitoringSystemLimitUtils.isSlowRequest(1001)).toBe(true);
      expect(MonitoringSystemLimitUtils.isSlowRequest(5000)).toBe(true);
    });

    it('应该正确判断缓存性能', () => {
      expect(MonitoringSystemLimitUtils.isCacheSlow(99)).toBe(false);
      expect(MonitoringSystemLimitUtils.isCacheSlow(100)).toBe(false); // 等于阈值不算慢
      expect(MonitoringSystemLimitUtils.isCacheSlow(101)).toBe(true);
      expect(MonitoringSystemLimitUtils.isCacheSlow(200)).toBe(true);
    });
  });

  describe('时间转换', () => {
    it('应该正确转换秒到毫秒', () => {
      expect(MonitoringSystemLimitUtils.secondsToMs(1)).toBe(1000);
      expect(MonitoringSystemLimitUtils.secondsToMs(0.5)).toBe(500);
      expect(MonitoringSystemLimitUtils.secondsToMs(60)).toBe(60000);
    });

    it('应该正确转换毫秒到秒', () => {
      expect(MonitoringSystemLimitUtils.msToSeconds(1000)).toBe(1);
      expect(MonitoringSystemLimitUtils.msToSeconds(500)).toBe(0.5);
      expect(MonitoringSystemLimitUtils.msToSeconds(60000)).toBe(60);
    });

    it('时间转换应该是可逆的', () => {
      const seconds = 123.456;
      const roundTrip = MonitoringSystemLimitUtils.msToSeconds(
        MonitoringSystemLimitUtils.secondsToMs(seconds)
      );
      expect(roundTrip).toBeCloseTo(seconds, 3);
    });
  });

  describe('百分比计算', () => {
    it('应该正确计算百分比', () => {
      expect(MonitoringSystemLimitUtils.calculatePercentage(50, 100)).toBe(50);
      expect(MonitoringSystemLimitUtils.calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
      expect(MonitoringSystemLimitUtils.calculatePercentage(0, 100)).toBe(0);
    });

    it('应该处理边界情况', () => {
      expect(MonitoringSystemLimitUtils.calculatePercentage(100, 100)).toBe(100);
      expect(MonitoringSystemLimitUtils.calculatePercentage(200, 100)).toBe(200); // 超过100%
    });

    it('应该处理精度问题', () => {
      // 测试精度保留
      const result = MonitoringSystemLimitUtils.calculatePercentage(1, 6);
      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(16.67, 2);
    });

    it('应该处理除零情况', () => {
      expect(MonitoringSystemLimitUtils.calculatePercentage(10, 0)).toBe(Infinity);
    });
  });
});

describe('类型定义验证', () => {
  describe('MonitoringSystemLimitKeys', () => {
    it('应该包含所有限制常量的键', () => {
      const keys: MonitoringSystemLimitKeys[] = [
        'HTTP_SUCCESS_THRESHOLD',
        'HTTP_SERVER_ERROR_THRESHOLD',
        'SLOW_QUERY_THRESHOLD_MS',
        'SLOW_REQUEST_THRESHOLD_MS',
        'MAX_BUFFER_SIZE',
        'FULL_SCORE',
        'MINUTE_IN_MS',
        'MONITORING_CACHE_STALE_TIME_MS'
      ];

      keys.forEach(key => {
        expect(MONITORING_SYSTEM_LIMITS[key]).toBeDefined();
      });
    });
  });

  describe('MonitoringSystemLimits', () => {
    it('应该与MONITORING_SYSTEM_LIMITS类型兼容', () => {
      const limits: MonitoringSystemLimits = MONITORING_SYSTEM_LIMITS;
      
      // 类型检查 - 这些应该编译通过
      expect(typeof limits.HTTP_SUCCESS_THRESHOLD).toBe('number');
      expect(typeof limits.SLOW_QUERY_THRESHOLD_MS).toBe('number');
      expect(typeof limits.MAX_BUFFER_SIZE).toBe('number');
    });
  });
});

describe('常量不变性验证', () => {
  it('MONITORING_SYSTEM_LIMITS应该是冻结的', () => {
    expect(Object.isFrozen(MONITORING_SYSTEM_LIMITS)).toBe(true);
  });

  it('不应该允许修改常量值', () => {
    const originalValue = MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD;
    
    // 测试冻结对象的不可变性
    const modifyResult = (() => {
      try {
        const temp = MONITORING_SYSTEM_LIMITS as any;
        temp.HTTP_SUCCESS_THRESHOLD = 500;
        return false;
      } catch (error) {
        return true;
      }
    })();
    
    expect(MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD).toBe(originalValue);
  });

  it('不应该允许添加新的常量', () => {
    // 测试冻结对象的不可变性
    const addResult = (() => {
      try {
        const temp = MONITORING_SYSTEM_LIMITS as any;
        temp.NEW_CONSTANT = 123;
        return false;
      } catch (error) {
        return true;
      }
    })();
    
    // 验证对象确实没有被修改
    expect((MONITORING_SYSTEM_LIMITS as any).NEW_CONSTANT).toBeUndefined();
  });
});

describe('性能和内存验证', () => {
  it('常量应该高效访问', () => {
    // 多次访问应该返回相同的值（性能测试）
    const startTime = performance.now();
    
    for (let i = 0; i < 10000; i++) {
      const _ = MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 10000次访问应该在合理时间内完成（< 10ms）
    expect(duration).toBeLessThan(10);
  });

  it('工具函数应该高效执行', () => {
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      MonitoringSystemLimitUtils.isClientError(404);
      MonitoringSystemLimitUtils.isSlowQuery(1500);
      MonitoringSystemLimitUtils.calculatePercentage(i, 1000);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 3000次函数调用应该在合理时间内完成（< 50ms）
    expect(duration).toBeLessThan(50);
  });
});

describe('边界值和异常情况', () => {
  it('应该正确处理边界HTTP状态码', () => {
    expect(MonitoringSystemLimitUtils.isClientError(399)).toBe(false);
    expect(MonitoringSystemLimitUtils.isClientError(400)).toBe(true);
    expect(MonitoringSystemLimitUtils.isServerError(499)).toBe(false);
    expect(MonitoringSystemLimitUtils.isServerError(500)).toBe(true);
  });

  it('应该正确处理负数时间', () => {
    expect(MonitoringSystemLimitUtils.isSlowQuery(-100)).toBe(false);
    expect(MonitoringSystemLimitUtils.isSlowRequest(-100)).toBe(false);
    expect(MonitoringSystemLimitUtils.isCacheSlow(-100)).toBe(false);
  });

  it('应该正确处理极大数值', () => {
    expect(MonitoringSystemLimitUtils.isSlowQuery(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(MonitoringSystemLimitUtils.calculatePercentage(1, Number.MAX_SAFE_INTEGER)).toBe(0);
  });

  it('应该正确处理NaN和Infinity', () => {
    expect(MonitoringSystemLimitUtils.isSlowQuery(NaN)).toBe(false);
    expect(MonitoringSystemLimitUtils.isSlowQuery(Infinity)).toBe(true);
    expect(MonitoringSystemLimitUtils.calculatePercentage(NaN, 100)).toBeNaN();
  });
});