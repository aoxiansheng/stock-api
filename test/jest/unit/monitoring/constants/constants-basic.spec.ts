/**
 * Monitoring常量基础测试
 * 验证常量定义的正确性和一致性
 */

import { MONITORING_BUSINESS } from '../../../../../src/monitoring/constants/business';
import { MONITORING_SYSTEM_LIMITS } from '../../../../../src/monitoring/constants/config/monitoring-system.constants';

describe('监控常量基础验证', () => {
  describe('MONITORING_BUSINESS 常量存在性', () => {
    it('应该定义错误率阈值', () => {
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS).toBeDefined();
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.ACCEPTABLE_RATE).toBe(0.05);
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.WARNING_RATE).toBe(0.1);
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.CRITICAL_RATE).toBe(0.2);
      expect(MONITORING_BUSINESS.ERROR_THRESHOLDS.EMERGENCY_RATE).toBe(0.3);
    });

    it('应该定义健康阈值', () => {
      expect(MONITORING_BUSINESS.HEALTH_THRESHOLDS).toBeDefined();
      expect(MONITORING_BUSINESS.HEALTH_THRESHOLDS.CPU_USAGE_HIGH).toBe(80);
      expect(MONITORING_BUSINESS.HEALTH_THRESHOLDS.CPU_USAGE_CRITICAL).toBe(95);
      expect(MONITORING_BUSINESS.HEALTH_THRESHOLDS.RESPONSE_TIME_FAIR).toBe(1000);
    });

    it('应该定义采样配置', () => {
      expect(MONITORING_BUSINESS.SAMPLING_CONFIG).toBeDefined();
      expect(MONITORING_BUSINESS.SAMPLING_CONFIG.RECENT_METRICS_COUNT).toBe(5);
      expect(MONITORING_BUSINESS.SAMPLING_CONFIG.MIN_DATA_POINTS).toBe(5);
    });
  });

  describe('MONITORING_SYSTEM_LIMITS 常量存在性', () => {
    it('应该定义HTTP阈值', () => {
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD).toBe(400);
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD).toBe(500);
    });

    it('应该定义性能阈值', () => {
      expect(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.SLOW_QUERY_THRESHOLD_MS).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.CACHE_RESPONSE_THRESHOLD_MS).toBe(100);
    });

    it('应该定义系统限制', () => {
      expect(MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE).toBe(1000);
      expect(MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE).toBe(100);
      expect(MONITORING_SYSTEM_LIMITS.FULL_SCORE).toBe(100);
    });
  });

  describe('常量一致性验证', () => {
    it('阈值应该是递增的', () => {
      const errorThresholds = MONITORING_BUSINESS.ERROR_THRESHOLDS;
      expect(errorThresholds.ACCEPTABLE_RATE).toBeLessThan(errorThresholds.WARNING_RATE);
      expect(errorThresholds.WARNING_RATE).toBeLessThan(errorThresholds.CRITICAL_RATE);
      expect(errorThresholds.CRITICAL_RATE).toBeLessThan(errorThresholds.EMERGENCY_RATE);
    });

    it('CPU使用率阈值应该是递增的', () => {
      const healthThresholds = MONITORING_BUSINESS.HEALTH_THRESHOLDS;
      expect(healthThresholds.CPU_USAGE_LOW).toBeLessThan(healthThresholds.CPU_USAGE_MEDIUM);
      expect(healthThresholds.CPU_USAGE_MEDIUM).toBeLessThan(healthThresholds.CPU_USAGE_HIGH);
      expect(healthThresholds.CPU_USAGE_HIGH).toBeLessThan(healthThresholds.CPU_USAGE_CRITICAL);
    });

    it('HTTP阈值应该是递增的', () => {
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD)
        .toBeLessThan(MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD);
    });
  });

  describe('类型验证', () => {
    it('错误率阈值应该是数字类型', () => {
      const errorThresholds = MONITORING_BUSINESS.ERROR_THRESHOLDS;
      expect(typeof errorThresholds.ACCEPTABLE_RATE).toBe('number');
      expect(typeof errorThresholds.WARNING_RATE).toBe('number');
      expect(typeof errorThresholds.CRITICAL_RATE).toBe('number');
      expect(typeof errorThresholds.EMERGENCY_RATE).toBe('number');
    });

    it('系统限制应该是数字类型', () => {
      expect(typeof MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE).toBe('number');
      expect(typeof MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE).toBe('number');
      expect(typeof MONITORING_SYSTEM_LIMITS.FULL_SCORE).toBe('number');
    });
  });

  describe('常量冻结验证', () => {
    it('MONITORING_BUSINESS应该是冻结的', () => {
      expect(Object.isFrozen(MONITORING_BUSINESS)).toBe(true);
      expect(Object.isFrozen(MONITORING_BUSINESS.ERROR_THRESHOLDS)).toBe(true);
      expect(Object.isFrozen(MONITORING_BUSINESS.HEALTH_THRESHOLDS)).toBe(true);
    });

    it('MONITORING_SYSTEM_LIMITS应该是冻结的', () => {
      expect(Object.isFrozen(MONITORING_SYSTEM_LIMITS)).toBe(true);
    });
  });

  describe('业务逻辑验证', () => {
    it('错误率阈值应该在合理范围内', () => {
      const errorThresholds = MONITORING_BUSINESS.ERROR_THRESHOLDS;
      expect(errorThresholds.ACCEPTABLE_RATE).toBeGreaterThan(0);
      expect(errorThresholds.ACCEPTABLE_RATE).toBeLessThan(1);
      expect(errorThresholds.EMERGENCY_RATE).toBeLessThan(1);
    });

    it('CPU使用率阈值应该在0-100范围内', () => {
      const healthThresholds = MONITORING_BUSINESS.HEALTH_THRESHOLDS;
      expect(healthThresholds.CPU_USAGE_LOW).toBeGreaterThan(0);
      expect(healthThresholds.CPU_USAGE_CRITICAL).toBeLessThan(100);
    });

    it('响应时间阈值应该是正数', () => {
      const healthThresholds = MONITORING_BUSINESS.HEALTH_THRESHOLDS;
      expect(healthThresholds.RESPONSE_TIME_EXCELLENT).toBeGreaterThan(0);
      expect(healthThresholds.RESPONSE_TIME_FAIR).toBeGreaterThan(0);
      expect(healthThresholds.RESPONSE_TIME_POOR).toBeGreaterThan(0);
    });

    it('系统限制应该是正整数', () => {
      expect(MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE).toBeGreaterThan(0);
      expect(MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE).toBeGreaterThan(0);
      expect(Number.isInteger(MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE)).toBe(true);
      expect(Number.isInteger(MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE)).toBe(true);
    });
  });
});