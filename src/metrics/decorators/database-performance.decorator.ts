import { PerformanceMonitorService } from "../services/performance-monitor.service";

export function DatabasePerformance(queryType: string) {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const performanceMonitor =
        this.performanceMonitor ||
        (global["performanceMonitorService"] as PerformanceMonitorService);

      if (!performanceMonitor || typeof performanceMonitor.wrapWithTiming !== 'function') {
        return method.apply(this, args);
      }

      // 使用性能监控服务的通用方法
      return performanceMonitor.wrapWithTiming(
        () => method.apply(this, args),
        (duration: number, success: boolean) => {
          performanceMonitor.recordDatabaseQuery(queryType, duration, success);
        }
      );
    };
  };
}

export function CachePerformance(operation: string) {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const performanceMonitor =
        this.performanceMonitor ||
        (global["performanceMonitorService"] as PerformanceMonitorService);

      if (!performanceMonitor || typeof performanceMonitor.wrapWithTiming !== 'function') {
        return method.apply(this, args);
      }

      // 使用性能监控服务的通用方法
      return performanceMonitor.wrapWithTiming(
        () => method.apply(this, args),
        (duration: number, success: boolean, result?: any) => {
          // 判断缓存命中情况
          const hit = success && (operation === "get"
            ? result !== null && result !== undefined
            : true);
          performanceMonitor.recordCacheOperation(operation, hit, duration);
        }
      );
    };
  };
}

export function AuthPerformance(authType: "jwt" | "api_key") {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const performanceMonitor =
        this.performanceMonitor ||
        (global["performanceMonitorService"] as PerformanceMonitorService);

      if (!performanceMonitor || typeof performanceMonitor.wrapWithTiming !== 'function') {
        return method.apply(this, args);
      }

      // 使用性能监控服务的通用方法
      return performanceMonitor.wrapWithTiming(
        () => method.apply(this, args),
        (duration: number, success: boolean) => {
          performanceMonitor.recordAuthentication(authType, success, duration);
        }
      );
    };
  };
}
