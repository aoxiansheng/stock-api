import { 
  MONITORING_BUSINESS, 
  MonitoringBusinessUtil,
  ErrorRateLevel,
  ChangeLevel,
  PerformanceLevel,
  HealthLevel 
} from '../../../../../src/monitoring/constants/business';

describe('MONITORING_BUSINESS Constants', () => {
  describe('ERROR_THRESHOLDS', () => {
    it('应该定义正确的错误率阈值', () => {
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.ACCEPTABLE_RATE).toBe(0.05);
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.WARNING_RATE).toBe(0.1);
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.CRITICAL_RATE).toBe(0.2);
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.EMERGENCY_RATE).toBe(0.3);
    });

    it('错误率阈值应该是递增的', () => {
      const { ERROR_THRESHOLDS } = MONITORING_BUSINESS;
      expect(ERROR_THRESHOLDS.ACCEPTABLE_RATE).toBeLessThan(ERROR_THRESHOLDS.WARNING_RATE);
      expect(ERROR_THRESHOLDS.WARNING_RATE).toBeLessThan(ERROR_THRESHOLDS.CRITICAL_RATE);
      expect(ERROR_THRESHOLDS.CRITICAL_RATE).toBeLessThan(ERROR_THRESHOLDS.EMERGENCY_RATE);
    });
  });

  describe('HEALTH_THRESHOLDS', () => {
    it('应该定义正确的CPU使用率阈值', () => {
      const { HEALTH_THRESHOLDS } = MONITORING_BUSINESS;
      expect(HEALTH_THRESHOLDS.CPU_USAGE_LOW).toBe(30);
      expect(HEALTH_THRESHOLDS.CPU_USAGE_MEDIUM).toBe(60);
      expect(HEALTH_THRESHOLDS.CPU_USAGE_HIGH).toBe(80);
      expect(HEALTH_THRESHOLDS.CPU_USAGE_CRITICAL).toBe(95);
    });

    it('CPU使用率阈值应该是递增的', () => {
      const { HEALTH_THRESHOLDS } = MONITORING_BUSINESS;
      expect(HEALTH_THRESHOLDS.CPU_USAGE_LOW).toBeLessThan(HEALTH_THRESHOLDS.CPU_USAGE_MEDIUM);
      expect(HEALTH_THRESHOLDS.CPU_USAGE_MEDIUM).toBeLessThan(HEALTH_THRESHOLDS.CPU_USAGE_HIGH);
      expect(HEALTH_THRESHOLDS.CPU_USAGE_HIGH).toBeLessThan(HEALTH_THRESHOLDS.CPU_USAGE_CRITICAL);
    });

    it('应该定义正确的响应时间阈值', () => {
      const { HEALTH_THRESHOLDS } = MONITORING_BUSINESS;
      expect(HEALTH_THRESHOLDS.RESPONSE_TIME_EXCELLENT).toBe(100);
      expect(HEALTH_THRESHOLDS.RESPONSE_TIME_GOOD).toBe(300);
      expect(HEALTH_THRESHOLDS.RESPONSE_TIME_FAIR).toBe(1000);
      expect(HEALTH_THRESHOLDS.RESPONSE_TIME_POOR).toBe(3000);
    });
  });

  describe('SAMPLING_CONFIG', () => {
    it('应该定义正确的采样配置', () => {
      const { SAMPLING_CONFIG } = MONITORING_BUSINESS;
      expect(SAMPLING_CONFIG.RECENT_METRICS_COUNT).toBe(5);
      expect(SAMPLING_CONFIG.MIN_DATA_POINTS).toBe(5);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_SMALL).toBe(10);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM).toBe(50);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_LARGE).toBe(100);
      expect(SAMPLING_CONFIG.MAX_SAMPLE_SIZE).toBe(1000);
    });

    it('采样大小应该是递增的', () => {
      const { SAMPLING_CONFIG } = MONITORING_BUSINESS;
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_SMALL).toBeLessThan(SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM).toBeLessThan(SAMPLING_CONFIG.SAMPLE_SIZE_LARGE);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_LARGE).toBeLessThan(SAMPLING_CONFIG.MAX_SAMPLE_SIZE);
    });
  });
});

describe('MonitoringBusinessUtil', () => {
  describe('getErrorRateLevel', () => {
    it('应该正确判断错误率级别', () => {
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.01)).toBe('normal');
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.08)).toBe('warning');
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.25)).toBe('critical');
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.35)).toBe('emergency');
    });

    it('边界值应该归类到正确级别', () => {
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.05)).toBe('normal'); // 等于ACCEPTABLE_RATE
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.1)).toBe('warning');  // 等于WARNING_RATE
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.2)).toBe('critical'); // 等于CRITICAL_RATE
      expect(MonitoringBusinessUtil.getErrorRateLevel(0.3)).toBe('emergency'); // 等于EMERGENCY_RATE
    });
  });

  describe('getChangeLevel', () => {
    it('应该正确判断变化级别', () => {
      expect(MonitoringBusinessUtil.getChangeLevel(3)).toBe('minimal');
      expect(MonitoringBusinessUtil.getChangeLevel(15)).toBe('significant');
      expect(MonitoringBusinessUtil.getChangeLevel(25)).toBe('major');
      expect(MonitoringBusinessUtil.getChangeLevel(60)).toBe('critical');
    });

    it('应该处理负数变化', () => {
      expect(MonitoringBusinessUtil.getChangeLevel(-15)).toBe('significant');
      expect(MonitoringBusinessUtil.getChangeLevel(-60)).toBe('critical');
    });
  });

  describe('getPerformanceLevel', () => {
    it('应该正确判断性能评分级别', () => {
      expect(MonitoringBusinessUtil.getPerformanceLevel(45)).toBe('poor');
      expect(MonitoringBusinessUtil.getPerformanceLevel(75)).toBe('fair');
      expect(MonitoringBusinessUtil.getPerformanceLevel(85)).toBe('good');
      expect(MonitoringBusinessUtil.getPerformanceLevel(92)).toBe('excellent');
      expect(MonitoringBusinessUtil.getPerformanceLevel(98)).toBe('perfect');
    });

    it('边界值应该归类到正确级别', () => {
      expect(MonitoringBusinessUtil.getPerformanceLevel(70)).toBe('fair');
      expect(MonitoringBusinessUtil.getPerformanceLevel(80)).toBe('good');
      expect(MonitoringBusinessUtil.getPerformanceLevel(90)).toBe('excellent');
      expect(MonitoringBusinessUtil.getPerformanceLevel(95)).toBe('perfect');
    });
  });

  describe('getHealthLevel', () => {
    it('应该正确判断响应时间健康级别', () => {
      expect(MonitoringBusinessUtil.getHealthLevel('response_time', 50)).toBe('excellent');
      expect(MonitoringBusinessUtil.getHealthLevel('response_time', 200)).toBe('good');
      expect(MonitoringBusinessUtil.getHealthLevel('response_time', 800)).toBe('fair');
      expect(MonitoringBusinessUtil.getHealthLevel('response_time', 2000)).toBe('poor');
      expect(MonitoringBusinessUtil.getHealthLevel('response_time', 4000)).toBe('critical');
    });

    it('应该正确判断CPU使用率健康级别', () => {
      expect(MonitoringBusinessUtil.getHealthLevel('cpu_usage', 25)).toBe('excellent');
      expect(MonitoringBusinessUtil.getHealthLevel('cpu_usage', 50)).toBe('good');
      expect(MonitoringBusinessUtil.getHealthLevel('cpu_usage', 75)).toBe('fair');
      expect(MonitoringBusinessUtil.getHealthLevel('cpu_usage', 90)).toBe('poor');
      expect(MonitoringBusinessUtil.getHealthLevel('cpu_usage', 98)).toBe('critical');
    });

    it('应该正确判断内存使用率健康级别', () => {
      expect(MonitoringBusinessUtil.getHealthLevel('memory_usage', 35)).toBe('excellent');
      expect(MonitoringBusinessUtil.getHealthLevel('memory_usage', 65)).toBe('good');
      expect(MonitoringBusinessUtil.getHealthLevel('memory_usage', 80)).toBe('fair');
      expect(MonitoringBusinessUtil.getHealthLevel('memory_usage', 92)).toBe('poor');
      expect(MonitoringBusinessUtil.getHealthLevel('memory_usage', 98)).toBe('critical');
    });
  });

  describe('needsMoreData', () => {
    it('应该正确判断是否需要更多数据', () => {
      expect(MonitoringBusinessUtil.needsMoreData(3)).toBe(true);
      expect(MonitoringBusinessUtil.needsMoreData(5)).toBe(false);
      expect(MonitoringBusinessUtil.needsMoreData(10)).toBe(false);
    });
  });

  describe('getRecommendedSampleSize', () => {
    it('应该根据数据量推荐正确的采样大小', () => {
      expect(MonitoringBusinessUtil.getRecommendedSampleSize('small')).toBe(10);
      expect(MonitoringBusinessUtil.getRecommendedSampleSize('medium')).toBe(50);
      expect(MonitoringBusinessUtil.getRecommendedSampleSize('large')).toBe(100);
    });
  });

  describe('canSendAlert', () => {
    it('应该正确判断是否可以发送告警', () => {
      // 1分钟窗口
      expect(MonitoringBusinessUtil.canSendAlert(3, 1)).toBe(true);
      expect(MonitoringBusinessUtil.canSendAlert(5, 1)).toBe(false);
      
      // 1小时窗口
      expect(MonitoringBusinessUtil.canSendAlert(50, 60)).toBe(true);
      expect(MonitoringBusinessUtil.canSendAlert(60, 60)).toBe(false);
      
      // 1天窗口
      expect(MonitoringBusinessUtil.canSendAlert(400, 1440)).toBe(true);
      expect(MonitoringBusinessUtil.canSendAlert(500, 1440)).toBe(false);
    });
  });

  describe('getAlertCooldown', () => {
    it('应该返回正确的告警冷却时间', () => {
      expect(MonitoringBusinessUtil.getAlertCooldown('emergency')).toBe(60);
      expect(MonitoringBusinessUtil.getAlertCooldown('critical')).toBe(300);
      expect(MonitoringBusinessUtil.getAlertCooldown('warning')).toBe(900);
      expect(MonitoringBusinessUtil.getAlertCooldown('info')).toBe(1800);
    });
  });

  describe('getCollectionInterval', () => {
    it('应该返回正确的收集间隔', () => {
      expect(MonitoringBusinessUtil.getCollectionInterval('realtime')).toBe(1);
      expect(MonitoringBusinessUtil.getCollectionInterval('high')).toBe(5);
      expect(MonitoringBusinessUtil.getCollectionInterval('normal')).toBe(30);
      expect(MonitoringBusinessUtil.getCollectionInterval('low')).toBe(300);
    });
  });

  describe('getDataRetention', () => {
    it('应该返回正确的数据保留时间', () => {
      expect(MonitoringBusinessUtil.getDataRetention('realtime')).toBe(3600);
      expect(MonitoringBusinessUtil.getDataRetention('hourly')).toBe(86400 * 7);
      expect(MonitoringBusinessUtil.getDataRetention('daily')).toBe(86400 * 30);
      expect(MonitoringBusinessUtil.getDataRetention('monthly')).toBe(86400 * 365);
    });
  });
});

describe('常量不变性验证', () => {
  it('MONITORING_BUSINESS常量应该是冻结的', () => {
    expect(Object.isFrozen(MONITORING_BUSINESS)).toBe(true);
    expect(Object.isFrozen(MONITORING_BUSINESS.ERROR_THRESHOLDS)).toBe(true);
    expect(Object.isFrozen(MONITORING_BUSINESS.HEALTH_THRESHOLDS)).toBe(true);
    expect(Object.isFrozen(MONITORING_BUSINESS.SAMPLING_CONFIG)).toBe(true);
  });

  it('不应该允许修改常量值', () => {
    const originalValue = MONITORING_BUSINESS.ERROR_THRESHOLDS.ACCEPTABLE_RATE;
    
    // 测试冻结对象的不可变性 - 在冻结对象上赋值在严格模式下会失败
    const modifyResult = (() => {
      try {
        const temp = MONITORING_BUSINESS.ERROR_THRESHOLDS as any;
        temp.ACCEPTABLE_RATE = 0.1;
        return false;
      } catch (error) {
        return true;
      }
    })();
    
    expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.ACCEPTABLE_RATE).toBe(originalValue);
  });
});