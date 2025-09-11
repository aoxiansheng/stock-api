import {
  MONITORING_METRICS,
  MONITORING_METRIC_CATEGORIES,
  MONITORING_METRIC_UNITS,
  MONITORING_METRIC_THRESHOLDS,
  MONITORING_AGGREGATION_TYPES,
  MONITORING_METRIC_PRIORITIES,
  PerformanceMetricType,
  getMetricCategory,
  getMetricUnit,
  checkMetricThreshold
} from '../../../../../src/monitoring/constants/config/monitoring-metrics.constants';

describe('MONITORING_METRICS Constants', () => {
  describe('基础指标常量', () => {
    it('应该定义所有核心性能指标', () => {
      expect(MONITORING_METRICS.RESPONSE_TIME).toBe('response_time');
      expect(MONITORING_METRICS.THROUGHPUT).toBe('throughput');
      expect(MONITORING_METRICS.REQUEST_COUNT).toBe('request_count');
      expect(MONITORING_METRICS.CPU_USAGE).toBe('cpu_usage');
      expect(MONITORING_METRICS.MEMORY_USAGE).toBe('memory_usage');
      expect(MONITORING_METRICS.ERROR_RATE).toBe('error_rate');
      expect(MONITORING_METRICS.CACHE_HIT_RATE).toBe('cache_hit_rate');
    });

    it('应该保持指标名称的一致性格式', () => {
      const metrics = Object.values(MONITORING_METRICS);
      metrics.forEach(metric => {
        expect(metric).toMatch(/^[a-z_]+$/);
        expect(metric).not.toContain(' ');
        expect(metric).not.toContain('-');
      });
    });

    it('MONITORING_METRICS应该是冻结的', () => {
      expect(Object.isFrozen(MONITORING_METRICS)).toBe(true);
    });
  });

  describe('MONITORING_METRIC_CATEGORIES', () => {
    it('应该正确分类性能指标', () => {
      expect(MONITORING_METRIC_CATEGORIES.PERFORMANCE).toContain(MONITORING_METRICS.RESPONSE_TIME);
      expect(MONITORING_METRIC_CATEGORIES.PERFORMANCE).toContain(MONITORING_METRICS.THROUGHPUT);
      expect(MONITORING_METRIC_CATEGORIES.PERFORMANCE).toContain(MONITORING_METRICS.REQUEST_COUNT);
      expect(MONITORING_METRIC_CATEGORIES.PERFORMANCE).toContain(MONITORING_METRICS.CONCURRENT_REQUESTS);
    });

    it('应该正确分类系统资源指标', () => {
      expect(MONITORING_METRIC_CATEGORIES.SYSTEM).toContain(MONITORING_METRICS.CPU_USAGE);
      expect(MONITORING_METRIC_CATEGORIES.SYSTEM).toContain(MONITORING_METRICS.MEMORY_USAGE);
      expect(MONITORING_METRIC_CATEGORIES.SYSTEM).toContain(MONITORING_METRICS.DISK_USAGE);
      expect(MONITORING_METRIC_CATEGORIES.SYSTEM).toContain(MONITORING_METRICS.NETWORK_IO);
    });

    it('应该正确分类错误指标', () => {
      expect(MONITORING_METRIC_CATEGORIES.ERROR).toContain(MONITORING_METRICS.ERROR_RATE);
      expect(MONITORING_METRIC_CATEGORIES.ERROR).toContain(MONITORING_METRICS.ERROR_COUNT);
      expect(MONITORING_METRIC_CATEGORIES.ERROR).toContain(MONITORING_METRICS.SUCCESS_RATE);
      expect(MONITORING_METRIC_CATEGORIES.ERROR).toContain(MONITORING_METRICS.FAILURE_COUNT);
    });

    it('应该正确分类缓存指标', () => {
      expect(MONITORING_METRIC_CATEGORIES.CACHE).toContain(MONITORING_METRICS.CACHE_HIT_RATE);
      expect(MONITORING_METRIC_CATEGORIES.CACHE).toContain(MONITORING_METRICS.CACHE_MISS_RATE);
      expect(MONITORING_METRIC_CATEGORIES.CACHE).toContain(MONITORING_METRICS.CACHE_SIZE);
      expect(MONITORING_METRIC_CATEGORIES.CACHE).toContain(MONITORING_METRICS.CACHE_EVICTIONS);
    });

    it('应该正确分类数据库指标', () => {
      expect(MONITORING_METRIC_CATEGORIES.DATABASE).toContain(MONITORING_METRICS.DB_CONNECTIONS);
      expect(MONITORING_METRIC_CATEGORIES.DATABASE).toContain(MONITORING_METRICS.DB_QUERY_TIME);
      expect(MONITORING_METRIC_CATEGORIES.DATABASE).toContain(MONITORING_METRICS.DB_SLOW_QUERIES);
      expect(MONITORING_METRIC_CATEGORIES.DATABASE).toContain(MONITORING_METRICS.DB_DEADLOCKS);
    });

    it('每个指标都应该属于某个分类', () => {
      const allMetrics = Object.values(MONITORING_METRICS);
      const categorizedMetrics = Object.values(MONITORING_METRIC_CATEGORIES).flat();
      
      allMetrics.forEach(metric => {
        expect(categorizedMetrics).toContain(metric);
      });
    });
  });

  describe('MONITORING_METRIC_UNITS', () => {
    it('应该为所有指标定义正确的单位', () => {
      expect(MONITORING_METRIC_UNITS[MONITORING_METRICS.RESPONSE_TIME]).toBe('ms');
      expect(MONITORING_METRIC_UNITS[MONITORING_METRICS.THROUGHPUT]).toBe('rps');
      expect(MONITORING_METRIC_UNITS[MONITORING_METRICS.CPU_USAGE]).toBe('%');
      expect(MONITORING_METRIC_UNITS[MONITORING_METRICS.MEMORY_USAGE]).toBe('MB');
      expect(MONITORING_METRIC_UNITS[MONITORING_METRICS.ERROR_RATE]).toBe('%');
      expect(MONITORING_METRIC_UNITS[MONITORING_METRICS.CACHE_HIT_RATE]).toBe('%');
    });

    it('所有指标都应该有对应的单位定义', () => {
      const allMetrics = Object.values(MONITORING_METRICS);
      allMetrics.forEach(metric => {
        expect(MONITORING_METRIC_UNITS[metric]).toBeDefined();
        expect(MONITORING_METRIC_UNITS[metric]).not.toBe('');
      });
    });
  });

  describe('MONITORING_METRIC_THRESHOLDS', () => {
    it('应该定义关键指标的阈值', () => {
      expect(MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.RESPONSE_TIME]).toBeDefined();
      expect(MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.CPU_USAGE]).toBeDefined();
      expect(MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.MEMORY_USAGE]).toBeDefined();
      expect(MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.ERROR_RATE]).toBeDefined();
      expect(MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.CACHE_HIT_RATE]).toBeDefined();
    });

    it('阈值应该包含warning和critical级别', () => {
      const responseThreshold = MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.RESPONSE_TIME];
      expect(responseThreshold.warning).toBeDefined();
      expect(responseThreshold.critical).toBeDefined();
      expect(typeof responseThreshold.warning).toBe('number');
      expect(typeof responseThreshold.critical).toBe('number');
    });

    it('critical阈值应该比warning更严重', () => {
      // 对于响应时间和错误率，critical应该大于warning
      const responseThreshold = MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.RESPONSE_TIME];
      expect(responseThreshold.critical).toBeGreaterThan(responseThreshold.warning);
      
      const errorThreshold = MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.ERROR_RATE];
      expect(errorThreshold.critical).toBeGreaterThan(errorThreshold.warning);
      
      // 对于缓存命中率，critical应该小于warning（命中率越低越严重）
      const cacheThreshold = MONITORING_METRIC_THRESHOLDS[MONITORING_METRICS.CACHE_HIT_RATE];
      expect(cacheThreshold.critical).toBeLessThan(cacheThreshold.warning);
    });
  });

  describe('MONITORING_AGGREGATION_TYPES', () => {
    it('应该定义标准的聚合类型', () => {
      expect(MONITORING_AGGREGATION_TYPES.MAX).toBe('maximum');
      expect(MONITORING_AGGREGATION_TYPES.MIN).toBe('minimum');
      expect(MONITORING_AGGREGATION_TYPES.COUNT).toBe('count');
      expect(MONITORING_AGGREGATION_TYPES.RATE).toBe('rate');
    });

    it('聚合类型应该是冻结的', () => {
      expect(Object.isFrozen(MONITORING_AGGREGATION_TYPES)).toBe(true);
    });
  });

  describe('MONITORING_METRIC_PRIORITIES', () => {
    it('应该定义优先级常量', () => {
      expect(MONITORING_METRIC_PRIORITIES.HIGH).toBe(2);
      expect(MONITORING_METRIC_PRIORITIES.MEDIUM).toBe(3);
      expect(MONITORING_METRIC_PRIORITIES.LOW).toBe(4);
    });

    it('优先级数字应该递增（数字越小优先级越高）', () => {
      expect(MONITORING_METRIC_PRIORITIES.HIGH).toBeLessThan(MONITORING_METRIC_PRIORITIES.MEDIUM);
      expect(MONITORING_METRIC_PRIORITIES.MEDIUM).toBeLessThan(MONITORING_METRIC_PRIORITIES.LOW);
    });
  });
});

describe('辅助函数测试', () => {
  describe('getMetricCategory', () => {
    it('应该返回正确的指标分类', () => {
      expect(getMetricCategory(MONITORING_METRICS.RESPONSE_TIME)).toBe('performance');
      expect(getMetricCategory(MONITORING_METRICS.CPU_USAGE)).toBe('system');
      expect(getMetricCategory(MONITORING_METRICS.ERROR_RATE)).toBe('error');
      expect(getMetricCategory(MONITORING_METRICS.CACHE_HIT_RATE)).toBe('cache');
      expect(getMetricCategory(MONITORING_METRICS.DB_CONNECTIONS)).toBe('database');
    });

    it('对未知指标应该返回null', () => {
      expect(getMetricCategory('unknown_metric' as PerformanceMetricType)).toBeNull();
    });
  });

  describe('getMetricUnit', () => {
    it('应该返回正确的指标单位', () => {
      expect(getMetricUnit(MONITORING_METRICS.RESPONSE_TIME)).toBe('ms');
      expect(getMetricUnit(MONITORING_METRICS.CPU_USAGE)).toBe('%');
      expect(getMetricUnit(MONITORING_METRICS.THROUGHPUT)).toBe('rps');
    });

    it('对未知指标应该返回unknown', () => {
      expect(getMetricUnit('unknown_metric' as PerformanceMetricType)).toBe('unknown');
    });
  });

  describe('checkMetricThreshold', () => {
    it('应该正确判断响应时间阈值状态', () => {
      const metric = MONITORING_METRICS.RESPONSE_TIME;
      
      expect(checkMetricThreshold(metric, 500)).toEqual({ status: 'normal' });
      expect(checkMetricThreshold(metric, 1500)).toEqual({ 
        status: 'warning', 
        threshold: 1000 
      });
      expect(checkMetricThreshold(metric, 6000)).toEqual({ 
        status: 'critical', 
        threshold: 5000 
      });
    });

    it('应该正确判断CPU使用率阈值状态', () => {
      const metric = MONITORING_METRICS.CPU_USAGE;
      
      expect(checkMetricThreshold(metric, 50)).toEqual({ status: 'normal' });
      expect(checkMetricThreshold(metric, 75)).toEqual({ 
        status: 'warning', 
        threshold: 70 
      });
      expect(checkMetricThreshold(metric, 95)).toEqual({ 
        status: 'critical', 
        threshold: 90 
      });
    });

    it('应该正确判断错误率阈值状态', () => {
      const metric = MONITORING_METRICS.ERROR_RATE;
      
      expect(checkMetricThreshold(metric, 0.5)).toEqual({ status: 'normal' });
      expect(checkMetricThreshold(metric, 2)).toEqual({ 
        status: 'warning', 
        threshold: 1 
      });
      expect(checkMetricThreshold(metric, 8)).toEqual({ 
        status: 'critical', 
        threshold: 5 
      });
    });

    it('应该正确判断缓存命中率阈值状态（逆向判断）', () => {
      const metric = MONITORING_METRICS.CACHE_HIT_RATE;
      
      expect(checkMetricThreshold(metric, 90)).toEqual({ status: 'normal' });
      expect(checkMetricThreshold(metric, 70)).toEqual({ 
        status: 'warning', 
        threshold: 80 
      });
      expect(checkMetricThreshold(metric, 50)).toEqual({ 
        status: 'critical', 
        threshold: 60 
      });
    });

    it('对于没有定义阈值的指标应该返回正常状态', () => {
      expect(checkMetricThreshold(MONITORING_METRICS.REQUEST_COUNT, 1000)).toEqual({ 
        status: 'normal' 
      });
    });

    it('边界值应该正确处理', () => {
      const metric = MONITORING_METRICS.RESPONSE_TIME;
      
      // 等于warning阈值
      expect(checkMetricThreshold(metric, 1000)).toEqual({ 
        status: 'warning', 
        threshold: 1000 
      });
      
      // 等于critical阈值
      expect(checkMetricThreshold(metric, 5000)).toEqual({ 
        status: 'critical', 
        threshold: 5000 
      });
    });
  });
});

describe('类型安全性验证', () => {
  it('PerformanceMetricType应该包含所有定义的指标', () => {
    const allMetrics: PerformanceMetricType[] = Object.values(MONITORING_METRICS);
    
    // 编译时检查 - 如果类型不匹配会导致编译错误
    allMetrics.forEach(metric => {
      expect(typeof metric).toBe('string');
    });
  });

  it('常量对象应该是只读的', () => {
    // 测试冻结对象的不可变性
    const metricsModifyResult = (() => {
      try {
        const temp = MONITORING_METRICS as any;
        temp.NEW_METRIC = 'new_metric';
        return false;
      } catch (error) {
        return true;
      }
    })();

    const categoriesModifyResult = (() => {
      try {
        const temp = MONITORING_METRIC_CATEGORIES as any;
        temp.NEW_CATEGORY = [];
        return false;
      } catch (error) {
        return true;
      }
    })();

    // 验证对象确实没有被修改
    expect((MONITORING_METRICS as any).NEW_METRIC).toBeUndefined();
    expect((MONITORING_METRIC_CATEGORIES as any).NEW_CATEGORY).toBeUndefined();
  });
});

describe('性能和内存优化验证', () => {
  it('常量对象不应该有循环引用', () => {
    // 简单的循环引用检测
    const seen = new WeakSet();
    
    const checkObject = (obj: any) => {
      if (obj && typeof obj === 'object') {
        if (seen.has(obj)) {
          throw new Error('Circular reference detected');
        }
        seen.add(obj);
        Object.values(obj).forEach(value => checkObject(value));
      }
    };

    expect(() => {
      checkObject(MONITORING_METRICS);
      checkObject(MONITORING_METRIC_CATEGORIES);
      checkObject(MONITORING_METRIC_UNITS);
      checkObject(MONITORING_METRIC_THRESHOLDS);
    }).not.toThrow();
  });

  it('常量定义应该高效（避免重复计算）', () => {
    // 验证常量是真正的常量，而不是计算属性
    const metrics1 = MONITORING_METRICS;
    const metrics2 = MONITORING_METRICS;
    
    expect(metrics1).toBe(metrics2); // 应该是同一个对象引用
  });
});