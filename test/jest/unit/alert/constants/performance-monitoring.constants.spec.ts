import { 
  ConstantPerformanceMonitor, 
  PERFORMANCE_MONITORING_CONFIG,
  MonitorConstantAccess 
} from "../../../../../src/alert/constants/performance-monitoring.constants";

describe("ConstantPerformanceMonitor", () => {
  beforeEach(() => {
    // 重置监控数据
    ConstantPerformanceMonitor.resetMetrics();
  });

  describe("常量加载监控", () => {
    it("应能开始和结束加载监控", () => {
      // 开始监控
      ConstantPerformanceMonitor.startConstantLoading();
      
      // 模拟一些处理时间
      const start = Date.now();
      while (Date.now() - start < 1) {
        // 等待1ms
      }
      
      // 结束监控
      ConstantPerformanceMonitor.endConstantLoading(25);
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      expect(report.summary.totalConstants).toBe(25);
      expect(report.loadingMetrics.loadDuration).toBeGreaterThan(0);
      expect(report.loadingMetrics.constantsCount).toBe(25);
    });

    it("应记录内存使用情况", () => {
      ConstantPerformanceMonitor.startConstantLoading();
      
      // 模拟内存分配
      const tempArray = new Array(1000).fill("test");
      
      ConstantPerformanceMonitor.endConstantLoading(10);
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      expect(report.loadingMetrics.memoryUsage.before).toBeDefined();
      expect(report.loadingMetrics.memoryUsage.after).toBeDefined();
      expect(typeof report.summary.memoryImpact).toBe('number');
    });
  });

  describe("常量访问监控", () => {
    it("应记录常量访问", () => {
      ConstantPerformanceMonitor.recordConstantAccess("TEST_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("TEST_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("ANOTHER_CONSTANT");
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      expect(report.summary.totalAccesses).toBe(3);
      expect(report.usageMetrics.TEST_CONSTANT.accessCount).toBe(2);
      expect(report.usageMetrics.ANOTHER_CONSTANT.accessCount).toBe(1);
      
      expect(report.usageMetrics.TEST_CONSTANT.lastAccessed).toBeInstanceOf(Date);
      expect(report.usageMetrics.ANOTHER_CONSTANT.lastAccessed).toBeInstanceOf(Date);
    });

    it("应计算访问时间", () => {
      ConstantPerformanceMonitor.recordConstantAccess("TIMED_CONSTANT", 10);
      ConstantPerformanceMonitor.recordConstantAccess("TIMED_CONSTANT", 20);
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      expect(report.usageMetrics.TIMED_CONSTANT.totalAccessTime).toBe(30);
      expect(report.usageMetrics.TIMED_CONSTANT.averageAccessTime).toBe(15);
    });
  });

  describe("性能报告", () => {
    it("应生成完整的性能报告", () => {
      // 模拟加载
      ConstantPerformanceMonitor.startConstantLoading();
      ConstantPerformanceMonitor.endConstantLoading(50);
      
      // 模拟访问
      ConstantPerformanceMonitor.recordConstantAccess("POPULAR_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("POPULAR_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("POPULAR_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("RARE_CONSTANT");
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      // 验证报告结构
      expect(report.summary).toBeDefined();
      expect(report.loadingMetrics).toBeDefined();
      expect(report.usageMetrics).toBeDefined();
      expect(report.systemMetrics).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      
      // 验证热门常量排序
      expect(report.summary.topUsedConstants[0].name).toBe("POPULAR_CONSTANT");
      expect(report.summary.topUsedConstants[0].accessCount).toBe(3);
    });

    it("应生成性能建议", () => {
      // 模拟慢加载
      ConstantPerformanceMonitor.startConstantLoading();
      
      // 手动设置一个长加载时间
      (ConstantPerformanceMonitor as any).metrics.constantLoading.loadDuration = 150; // 超过100ms阈值
      
      ConstantPerformanceMonitor.endConstantLoading(100);
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(rec => rec.includes("加载时间较长"))).toBe(true);
    });

    it("应处理无使用数据的情况", () => {
      ConstantPerformanceMonitor.startConstantLoading();
      ConstantPerformanceMonitor.endConstantLoading(5);
      
      const report = ConstantPerformanceMonitor.getPerformanceReport();
      
      expect(report.summary.totalAccesses).toBe(0);
      expect(report.summary.topUsedConstants).toHaveLength(0);
      expect(report.recommendations.includes("常量系统性能良好，无需特别优化")).toBe(true);
    });
  });

  describe("性能快照", () => {
    it("应生成实时性能快照", () => {
      ConstantPerformanceMonitor.recordConstantAccess("SNAP_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("SNAP_CONSTANT");
      ConstantPerformanceMonitor.recordConstantAccess("ANOTHER_SNAP");
      
      const snapshot = ConstantPerformanceMonitor.getPerformanceSnapshot();
      
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.memoryUsage).toBeDefined();
      expect(snapshot.activeConstants).toBe(2);
      expect(snapshot.totalAccesses).toBe(3);
      expect(snapshot.topConstants).toHaveLength(2);
      expect(snapshot.topConstants[0].name).toBe("SNAP_CONSTANT");
      expect(snapshot.topConstants[0].accessCount).toBe(2);
    });
  });

  describe("指标重置", () => {
    it("应能重置所有指标", () => {
      // 添加一些数据
      ConstantPerformanceMonitor.startConstantLoading();
      ConstantPerformanceMonitor.endConstantLoading(10);
      ConstantPerformanceMonitor.recordConstantAccess("TEST");
      
      let report = ConstantPerformanceMonitor.getPerformanceReport();
      expect(report.summary.totalConstants).toBe(10);
      expect(report.summary.totalAccesses).toBe(1);
      
      // 重置
      ConstantPerformanceMonitor.resetMetrics();
      
      report = ConstantPerformanceMonitor.getPerformanceReport();
      expect(report.summary.totalConstants).toBe(0);
      expect(report.summary.totalAccesses).toBe(0);
      expect(Object.keys(report.usageMetrics)).toHaveLength(0);
    });
  });
});

describe("PERFORMANCE_MONITORING_CONFIG", () => {
  it("应包含所有必需的配置", () => {
    expect(PERFORMANCE_MONITORING_CONFIG.SAMPLING_INTERVAL_MS).toBe(60000);
    
    expect(PERFORMANCE_MONITORING_CONFIG.THRESHOLDS.MAX_LOAD_TIME_MS).toBe(100);
    expect(PERFORMANCE_MONITORING_CONFIG.THRESHOLDS.MAX_MEMORY_IMPACT_MB).toBe(5);
    expect(PERFORMANCE_MONITORING_CONFIG.THRESHOLDS.MIN_USAGE_THRESHOLD).toBe(0.1);
    expect(PERFORMANCE_MONITORING_CONFIG.THRESHOLDS.HIGH_USAGE_THRESHOLD).toBe(3.0);
    
    expect(PERFORMANCE_MONITORING_CONFIG.REPORT.MAX_TOP_CONSTANTS).toBe(10);
    expect(PERFORMANCE_MONITORING_CONFIG.REPORT.HISTORY_RETENTION_DAYS).toBe(7);
    expect(PERFORMANCE_MONITORING_CONFIG.REPORT.AUTO_REPORT_INTERVAL_MS).toBe(3600000);
    
    expect(PERFORMANCE_MONITORING_CONFIG.MONITORING.ENABLE_LOAD_TIME_TRACKING).toBe(true);
    expect(PERFORMANCE_MONITORING_CONFIG.MONITORING.ENABLE_MEMORY_TRACKING).toBe(true);
    expect(PERFORMANCE_MONITORING_CONFIG.MONITORING.ENABLE_ACCESS_TRACKING).toBe(true);
    expect(PERFORMANCE_MONITORING_CONFIG.MONITORING.ENABLE_AUTO_RECOMMENDATIONS).toBe(true);
  });

  it("应是不可变的配置对象", () => {
    expect(() => {
      (PERFORMANCE_MONITORING_CONFIG as any).SAMPLING_INTERVAL_MS = 30000;
    }).toThrow();
    
    expect(() => {
      (PERFORMANCE_MONITORING_CONFIG.THRESHOLDS as any).MAX_LOAD_TIME_MS = 200;
    }).toThrow();
  });
});

describe("MonitorConstantAccess 装饰器", () => {
  class TestClass {
    @MonitorConstantAccess("TestMethod")
    testMethod(delay = 0): string {
      if (delay > 0) {
        const start = Date.now();
        while (Date.now() - start < delay) {
          // 等待指定时间
        }
      }
      return "test result";
    }

    @MonitorConstantAccess("AnotherMethod")
    anotherMethod(): number {
      return 42;
    }
  }

  beforeEach(() => {
    ConstantPerformanceMonitor.resetMetrics();
  });

  it("应监控装饰的方法调用", () => {
    const instance = new TestClass();
    
    const result = instance.testMethod();
    expect(result).toBe("test result");
    
    const report = ConstantPerformanceMonitor.getPerformanceReport();
    expect(report.usageMetrics["TestClass.testMethod"]).toBeDefined();
    expect(report.usageMetrics["TestClass.testMethod"].accessCount).toBe(1);
  });

  it("应记录多次调用", () => {
    const instance = new TestClass();
    
    instance.testMethod();
    instance.testMethod();
    instance.anotherMethod();
    
    const report = ConstantPerformanceMonitor.getPerformanceReport();
    expect(report.usageMetrics["TestClass.testMethod"].accessCount).toBe(2);
    expect(report.usageMetrics["TestClass.anotherMethod"].accessCount).toBe(1);
  });

  it("应记录方法执行时间", () => {
    const instance = new TestClass();
    
    instance.testMethod(5); // 等待5ms
    
    const report = ConstantPerformanceMonitor.getPerformanceReport();
    const methodStats = report.usageMetrics["TestClass.testMethod"];
    
    expect(methodStats.totalAccessTime).toBeGreaterThan(0);
    expect(methodStats.averageAccessTime).toBeGreaterThan(0);
  });

  it("应保持原方法的返回值和参数", () => {
    const instance = new TestClass();
    
    expect(instance.testMethod()).toBe("test result");
    expect(instance.testMethod(10)).toBe("test result");
    expect(instance.anotherMethod()).toBe(42);
  });
});