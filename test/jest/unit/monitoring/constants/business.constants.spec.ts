import {
  MONITORING_BUSINESS,
  MonitoringBusinessUtil,
  DataVolume,
} from "../../../../../src/monitoring/constants/business";
import {
  MonitoringEnhancedConfig,
  MonitoringConfigFactory,
} from "../../../../../src/monitoring/config/unified/monitoring-enhanced.config";

describe("MONITORING_BUSINESS Constants - Phase 3 精简版本", () => {
  let testConfig: MonitoringEnhancedConfig;

  beforeEach(() => {
    testConfig = MonitoringConfigFactory.createForTesting();
  });

  describe("迁移通知 - 错误率阈值已迁移", () => {
    it("错误率阈值现在在新配置系统中", () => {
      // 旧的ERROR_THRESHOLDS已经迁移到统一配置系统
      expect(
        testConfig.performanceThresholds.errorRateAvailability,
      ).toBeDefined();
      expect(
        testConfig.performanceThresholds.errorRateAvailability
          .errorRateAcceptable,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.errorRateAvailability.errorRateWarning,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.errorRateAvailability
          .errorRateCritical,
      ).toBeGreaterThan(0);
    });
  });

  describe("迁移通知 - 健康阈值已迁移", () => {
    it("健康阈值现在在新配置系统中", () => {
      // 旧的HEALTH_THRESHOLDS已经迁移到统一配置系统
      expect(testConfig.performanceThresholds.systemResource).toBeDefined();
      expect(
        testConfig.performanceThresholds.systemResource.cpuUsageLow,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.systemResource.cpuUsageMedium,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.systemResource.cpuUsageHigh,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.systemResource.cpuUsageCritical,
      ).toBeGreaterThan(0);

      expect(testConfig.performanceThresholds.apiResponse).toBeDefined();
      expect(
        testConfig.performanceThresholds.apiResponse.apiExcellentMs,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.apiResponse.apiGoodMs,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.apiResponse.apiWarningMs,
      ).toBeGreaterThan(0);
      expect(
        testConfig.performanceThresholds.apiResponse.apiPoorMs,
      ).toBeGreaterThan(0);
    });
  });

  describe("SAMPLING_CONFIG", () => {
    it("应该定义正确的采样配置", () => {
      const { SAMPLING_CONFIG } = MONITORING_BUSINESS;
      expect(SAMPLING_CONFIG.RECENT_METRICS_COUNT).toBe(5);
      expect(SAMPLING_CONFIG.MIN_DATA_POINTS).toBe(5);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_SMALL).toBe(10);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM).toBe(50);
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_LARGE).toBe(100);
      expect(SAMPLING_CONFIG.MAX_SAMPLE_SIZE).toBe(1000);
    });

    it("采样大小应该是递增的", () => {
      const { SAMPLING_CONFIG } = MONITORING_BUSINESS;
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_SMALL).toBeLessThan(
        SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM,
      );
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM).toBeLessThan(
        SAMPLING_CONFIG.SAMPLE_SIZE_LARGE,
      );
      expect(SAMPLING_CONFIG.SAMPLE_SIZE_LARGE).toBeLessThan(
        SAMPLING_CONFIG.MAX_SAMPLE_SIZE,
      );
    });
  });
});

describe("MonitoringBusinessUtil - Phase 3 精简版本", () => {
  describe("needsMoreData", () => {
    it("应该正确判断是否需要更多数据", () => {
      expect(MonitoringBusinessUtil.needsMoreData(3)).toBe(true);
      expect(MonitoringBusinessUtil.needsMoreData(5)).toBe(false);
      expect(MonitoringBusinessUtil.needsMoreData(10)).toBe(false);
    });
  });

  describe("getRecommendedSampleSize", () => {
    it("应该根据数据量推荐正确的采样大小", () => {
      expect(MonitoringBusinessUtil.getRecommendedSampleSize("small")).toBe(10);
      expect(MonitoringBusinessUtil.getRecommendedSampleSize("medium")).toBe(
        50,
      );
      expect(MonitoringBusinessUtil.getRecommendedSampleSize("large")).toBe(
        100,
      );
    });
  });

  describe("getSafeSampleSize", () => {
    it("应该返回安全的样本大小", () => {
      expect(MonitoringBusinessUtil.getSafeSampleSize(3)).toBe(5); // 小于最小值，返回最小值
      expect(MonitoringBusinessUtil.getSafeSampleSize(50)).toBe(50); // 在范围内
      expect(MonitoringBusinessUtil.getSafeSampleSize(1500)).toBe(1000); // 超过最大值，返回最大值
    });
  });

  describe("isValidSampleSize", () => {
    it("应该正确验证样本大小", () => {
      expect(MonitoringBusinessUtil.isValidSampleSize(3)).toBe(false); // 小于最小值
      expect(MonitoringBusinessUtil.isValidSampleSize(5)).toBe(true); // 等于最小值
      expect(MonitoringBusinessUtil.isValidSampleSize(100)).toBe(true); // 在范围内
      expect(MonitoringBusinessUtil.isValidSampleSize(1000)).toBe(true); // 等于最大值
      expect(MonitoringBusinessUtil.isValidSampleSize(1500)).toBe(false); // 超过最大值
    });
  });
});

describe("常量不变性验证 - Phase 3 精简版本", () => {
  it("MONITORING_BUSINESS常量应该是冻结的", () => {
    expect(Object.isFrozen(MONITORING_BUSINESS)).toBe(true);
    expect(Object.isFrozen(MONITORING_BUSINESS.SAMPLING_CONFIG)).toBe(true);
  });

  it("不应该允许修改采样配置值", () => {
    const originalValue =
      MONITORING_BUSINESS.SAMPLING_CONFIG.RECENT_METRICS_COUNT;

    // 测试冻结对象的不可变性 - 在冻结对象上赋值在严格模式下会失败
    const modifyResult = (() => {
      try {
        const temp = MONITORING_BUSINESS.SAMPLING_CONFIG as any;
        temp.RECENT_METRICS_COUNT = 10;
        return false;
      } catch (error) {
        return true;
      }
    })();

    expect(MONITORING_BUSINESS.SAMPLING_CONFIG.RECENT_METRICS_COUNT).toBe(
      originalValue,
    );
  });

  it("新配置系统与旧常量的集成", () => {
    const testConfig = MonitoringConfigFactory.createForTesting();

    // 验证新配置系统已经替换了旧的ERROR_THRESHOLDS和HEALTH_THRESHOLDS
    expect(
      testConfig.performanceThresholds.errorRateAvailability,
    ).toBeDefined();
    expect(testConfig.performanceThresholds.systemResource).toBeDefined();
    expect(testConfig.performanceThresholds.apiResponse).toBeDefined();

    // 但保留了算法常量
    expect(MONITORING_BUSINESS.SAMPLING_CONFIG).toBeDefined();
    expect(MonitoringBusinessUtil.needsMoreData).toBeDefined();
    expect(MonitoringBusinessUtil.getRecommendedSampleSize).toBeDefined();
  });
});
