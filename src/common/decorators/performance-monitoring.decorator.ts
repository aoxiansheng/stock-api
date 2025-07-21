import { SetMetadata } from "@nestjs/common";

/**
 * 性能监控装饰器的元数据键
 */
export const PERFORMANCE_MONITORING_KEY = "performance-monitoring";

/**
 * 性能监控配置接口
 */
export interface PerformanceMonitoringConfig {
  enabled?: boolean;
  trackSlowRequests?: boolean;
  slowRequestThreshold?: number; // 毫秒
  recordMetrics?: boolean;
  sampleRate?: number; // 采样率，0-1之间
}

/**
 * 性能监控装饰器
 *
 * 用于标记需要详细性能监控的控制器或方法
 *
 * @example
 * ```typescript
 * @PerformanceMonitoring()
 * @Controller('heavy-operations')
 * export class HeavyOperationsController {
 *   @PerformanceMonitoring({ slowRequestThreshold: 500 })
 *   @Get('complex-query')
 *   async complexQuery() {}
 * }
 * ```
 */
export function PerformanceMonitoring(
  config: PerformanceMonitoringConfig = {},
): ClassDecorator & MethodDecorator {
  const defaultConfig: PerformanceMonitoringConfig = {
    enabled: true,
    trackSlowRequests: true,
    slowRequestThreshold: 1000,
    recordMetrics: true,
    sampleRate: 1.0,
    ...config,
  };

  return SetMetadata(PERFORMANCE_MONITORING_KEY, defaultConfig);
}

/**
 * 轻量级性能监控装饰器
 * 只记录基本的响应时间，不记录详细指标
 */
export function LightPerformanceMonitoring(): ClassDecorator & MethodDecorator {
  return PerformanceMonitoring({
    enabled: true,
    trackSlowRequests: true,
    slowRequestThreshold: 2000,
    recordMetrics: false,
    sampleRate: 0.1, // 10%采样率
  });
}

/**
 * 禁用性能监控装饰器
 * 用于跳过性能监控的端点（如健康检查）
 */
export function NoPerformanceMonitoring(): ClassDecorator & MethodDecorator {
  return PerformanceMonitoring({
    enabled: false,
    trackSlowRequests: false,
    recordMetrics: false,
    sampleRate: 0,
  });
}
