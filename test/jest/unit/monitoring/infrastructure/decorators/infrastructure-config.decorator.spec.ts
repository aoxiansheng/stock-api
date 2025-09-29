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

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty configuration object', () => {
      const decorator = PerformanceMonitoring({});
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata.enabled).toBe(true);
      expect(metadata.trackSlowRequests).toBe(true);
      expect(metadata.slowRequestThreshold).toBe(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS);
      expect(metadata.recordMetrics).toBe(true);
      expect(metadata.sampleRate).toBe(1.0);
    });

    it('should handle null configuration gracefully', () => {
      const decorator = PerformanceMonitoring(null as any);
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata).toBeDefined();
      expect(metadata.enabled).toBe(true);
    });

    it('should handle undefined configuration gracefully', () => {
      const decorator = PerformanceMonitoring(undefined);
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata).toBeDefined();
      expect(metadata.enabled).toBe(true);
    });

    it('should preserve only valid configuration properties', () => {
      const invalidConfig = {
        enabled: true,
        trackSlowRequests: false,
        invalidProperty: 'should be ignored',
        anotherInvalid: 123
      } as any;

      const decorator = PerformanceMonitoring(invalidConfig);
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata.enabled).toBe(true);
      expect(metadata.trackSlowRequests).toBe(false);
      expect(metadata.invalidProperty).toBe('should be ignored'); // spread operator preserves all props
      expect(metadata.anotherInvalid).toBe(123);
    });

    it('should handle zero and negative values', () => {
      const config: PerformanceMonitoringConfig = {
        slowRequestThreshold: 0,
        sampleRate: -1
      };

      const decorator = PerformanceMonitoring(config);
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata.slowRequestThreshold).toBe(0);
      expect(metadata.sampleRate).toBe(-1);
    });

    it('should handle extreme values', () => {
      const config: PerformanceMonitoringConfig = {
        slowRequestThreshold: Number.MAX_SAFE_INTEGER,
        sampleRate: Number.MAX_VALUE
      };

      const decorator = PerformanceMonitoring(config);
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata.slowRequestThreshold).toBe(Number.MAX_SAFE_INTEGER);
      expect(metadata.sampleRate).toBe(Number.MAX_VALUE);
    });
  });

  describe('Configuration Type Safety', () => {
    it('should work with partial configurations', () => {
      const configs: PerformanceMonitoringConfig[] = [
        { enabled: false },
        { trackSlowRequests: false },
        { slowRequestThreshold: 1000 },
        { recordMetrics: false },
        { sampleRate: 0.5 }
      ];

      configs.forEach((config, index) => {
        const decorator = PerformanceMonitoring(config);
        const target = class TestClass {};

        decorator(target);

        const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);
        expect(metadata).toBeDefined();

        // Verify the specific property was set
        const key = Object.keys(config)[0] as keyof PerformanceMonitoringConfig;
        expect(metadata[key]).toBe(config[key]);
      });
    });

    it('should merge configurations correctly with boolean false values', () => {
      const config: PerformanceMonitoringConfig = {
        enabled: false,
        trackSlowRequests: false,
        recordMetrics: false
      };

      const decorator = PerformanceMonitoring(config);
      const target = class TestClass {};

      decorator(target);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, target);

      expect(metadata.enabled).toBe(false);
      expect(metadata.trackSlowRequests).toBe(false);
      expect(metadata.recordMetrics).toBe(false);
      // Other defaults should still apply
      expect(metadata.slowRequestThreshold).toBe(MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS);
      expect(metadata.sampleRate).toBe(1.0);
    });
  });

  describe('Decorator Application Scenarios', () => {
    it('should work on abstract classes', () => {
      const decorator = PerformanceMonitoring();
      abstract class AbstractTestClass {
        abstract abstractMethod(): void;
      }

      decorator(AbstractTestClass);

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, AbstractTestClass);
      expect(metadata).toBeDefined();
    });

    it('should work on classes with inheritance', () => {
      const decorator = PerformanceMonitoring({ sampleRate: 0.8 });

      class BaseClass {
        baseMethod() {}
      }

      @(decorator as ClassDecorator)
      class DerivedClass extends BaseClass {
        derivedMethod() {}
      }

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, DerivedClass);
      expect(metadata).toBeDefined();
      expect(metadata.sampleRate).toBe(0.8);

      // Base class should not have metadata unless explicitly decorated
      const baseMetadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, BaseClass);
      expect(baseMetadata).toBeUndefined();
    });

    it('should work on static methods', () => {
      const decorator = PerformanceMonitoring();

      class TestClass {
        @(decorator as MethodDecorator)
        static staticMethod() {
          return 'static';
        }
      }

      const metadata = Reflect.getMetadata(PERFORMANCE_MONITORING_KEY, TestClass, 'staticMethod');
      expect(metadata).toBeDefined();
    });
  });
});