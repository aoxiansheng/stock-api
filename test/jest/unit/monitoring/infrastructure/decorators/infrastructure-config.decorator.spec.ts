/**
 * InfrastructureConfigDecorator Unit Tests
 * 测试基础设施配置装饰器的功能
 */

import {
  PerformanceMonitoring,
  LightPerformanceMonitoring,
  NoPerformanceMonitoring,
  PERFORMANCE_MONITORING_KEY,
  PerformanceMonitoringConfig
} from '@monitoring/infrastructure/decorators/infrastructure-config.decorator';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

describe('InfrastructureConfigDecorator', () => {
  describe('PerformanceMonitoring', () => {
    it('should define metadata with default configuration', () => {
      const decorator = PerformanceMonitoring();
      const target = class TestClass {};

      // Apply decorator
      decorator(target);

      // Get metadata
      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
      
      expect(metadata).toBeDefined();
      expect(metadata.enabled).toBe(true);
      expect(metadata.trackSlowRequests).toBe(true);
      expect(metadata.slowRequestThreshold).toBe(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS);
      expect(metadata.recordMetrics).toBe(true);
      expect(metadata.sampleRate).toBe(1.0);
    });

    it('should define metadata with custom configuration', () => {
      const customConfig: PerformanceMonitoringConfig = {
        enabled: false,
        trackSlowRequests: false,
        slowRequestThreshold: 2000,
        recordMetrics: false,
        sampleRate: 0.5,
      };

      const decorator = PerformanceMonitoring(customConfig);
      const target = class TestClass {};

      // Apply decorator
      decorator(target);

      // Get metadata
      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
      
      expect(metadata).toEqual(customConfig);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: PerformanceMonitoringConfig = {
        slowRequestThreshold: 3000,
        sampleRate: 0.8,
      };

      const decorator = PerformanceMonitoring(customConfig);
      const target = class TestClass {};

      // Apply decorator
      decorator(target);

      // Get metadata
      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
      
      expect(metadata.enabled).toBe(true); // Default
      expect(metadata.trackSlowRequests).toBe(true); // Default
      expect(metadata.slowRequestThreshold).toBe(3000); // Custom
      expect(metadata.recordMetrics).toBe(true); // Default
      expect(metadata.sampleRate).toBe(0.8); // Custom
    });

    it('should work as both class and method decorator', () => {
      const decorator = PerformanceMonitoring();
      const target = class TestClass {};
      const methodTarget = class TestClass {};
      const methodName = 'testMethod';

      // Apply as class decorator
      decorator(target);

      // Apply as method decorator
      decorator(methodTarget, methodName, Object.getOwnPropertyDescriptor(methodTarget, methodName) || {});

      // Get metadata for both
      const classMetadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
      const methodMetadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, methodTarget, methodName);
      
      expect(classMetadata).toBeDefined();
      expect(methodMetadata).toBeDefined();
      expect(classMetadata).toEqual(methodMetadata);
    });
  });

  describe('LightPerformanceMonitoring', () => {
    it('should define metadata with light configuration', () => {
      const decorator = LightPerformanceMonitoring();
      const target = class TestClass {};

      // Apply decorator
      decorator(target);

      // Get metadata
      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
      
      expect(metadata).toBeDefined();
      expect(metadata.enabled).toBe(true);
      expect(metadata.trackSlowRequests).toBe(true);
      expect(metadata.slowRequestThreshold).toBe(2000);
      expect(metadata.recordMetrics).toBe(false);
      expect(metadata.sampleRate).toBe(0.1);
    });
  });

  describe('NoPerformanceMonitoring', () => {
    it('should define metadata with disabled configuration', () => {
      const decorator = NoPerformanceMonitoring();
      const target = class TestClass {};

      // Apply decorator
      decorator(target);

      // Get metadata
      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
      
      expect(metadata).toBeDefined();
      expect(metadata.enabled).toBe(false);
      expect(metadata.trackSlowRequests).toBe(false);
      expect(metadata.recordMetrics).toBe(false);
      expect(metadata.sampleRate).toBe(0);
    });
  });

  describe('PERFORMANCE_MONITORING_KEY', () => {
    it('should define the correct metadata key', () => {
      expect(PERFORMANCE_MONITORING_KEY).toBe('performance-monitoring');
    });
  });
});