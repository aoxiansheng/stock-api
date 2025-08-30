/**
 * 数据库和缓存性能监控装饰器
 * 基于重构后的三层架构，集成到现有的监控体系中
 */

import { createLogger } from '../../../app/config/logger.config';

const logger = createLogger('PerformanceDecorators');

/**
 * 性能装饰器选项
 */
export interface PerformanceOptions {
  operation?: string;
  threshold?: number; // 慢操作阈值（毫秒）
  recordSuccess?: boolean;
  recordError?: boolean;
}

/**
 * 获取全局CollectorService实例
 * 兼容现有代码中的全局变量访问方式
 */
function getCollectorService() {
  try {
    return global['CollectorService'];
  } catch (error) {
    logger.debug('CollectorService全局实例不可用，将跳过性能收集');
    return null;
  }
}


/**
 * 创建性能装饰器的通用工厂函数
 */
function createPerformanceDecorator(
  decoratorName: string,
  metricType: 'database' | 'cache' | 'auth'
) {
  return function (operationOrOptions?: string | PerformanceOptions) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      // 解析参数
      let operation: string;
      let options: PerformanceOptions = {
        threshold: 100, // 默认100ms阈值
        recordSuccess: true,
        recordError: true,
      };

      if (typeof operationOrOptions === 'string') {
        operation = operationOrOptions;
      } else if (operationOrOptions) {
        operation = operationOrOptions.operation || `${target.constructor.name}.${propertyName}`;
        options = { ...options, ...operationOrOptions };
      } else {
        operation = `${target.constructor.name}.${propertyName}`;
      }

      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        let success = true;
        let error: Error | null = null;

        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } catch (err) {
          success = false;
          error = err as Error;
          throw err;
        } finally {
          const duration = Date.now() - startTime;
          
          // 异步记录性能数据，不影响主业务流程
          setImmediate(() => {
            recordPerformanceData({
              decoratorName,
              metricType,
              operation,
              duration,
              success,
              error,
              options,
              target: target.constructor.name,
              method: propertyName,
            });
          });
        }
      };

      return descriptor;
    };
  };
}

/**
 * 记录性能数据
 */
async function recordPerformanceData(data: {
  decoratorName: string;
  metricType: 'database' | 'cache' | 'auth';
  operation: string;
  duration: number;
  success: boolean;
  error: Error | null;
  options: PerformanceOptions;
  target: string;
  method: string;
}) {
  try {
    // 1. 通过CollectorService收集数据（事件驱动方式）
    const collectorService = getCollectorService();
    if (collectorService && typeof collectorService.collectPerformanceData === 'function') {
      await collectorService.collectPerformanceData({
        timestamp: new Date(),
        source: data.decoratorName,
        layer: 'collector',
        operation: data.operation,
        duration: data.duration,
        success: data.success,
        metadata: {
          type: data.metricType,
          target: data.target,
          method: data.method,
          error: data.error?.message,
          threshold: data.options.threshold,
        },
      });
    }

    // 2. 记录慢操作日志
    if (data.duration > data.options.threshold) {
      logger.warn(`慢${data.metricType}操作检测`, {
        operation: data.operation,
        duration: data.duration,
        threshold: data.options.threshold,
        target: data.target,
        method: data.method,
        success: data.success,
        error: data.error?.message,
      });
    }

    // 3. 记录错误日志
    if (!data.success && data.options.recordError) {
      logger.error(`${data.metricType}操作失败`, {
        operation: data.operation,
        duration: data.duration,
        target: data.target,
        method: data.method,
        error: data.error?.message,
        stack: data.error?.stack,
      });
    }

  } catch (recordError) {
    logger.error('性能数据记录失败', {
      operation: data.operation,
      recordError: recordError.message,
    });
  }
}


/**
 * 数据库性能监控装饰器
 * @param operationOrOptions 操作名称或配置选项
 */
export const DatabasePerformance = createPerformanceDecorator(
  'DatabasePerformance',
  'database'
);

/**
 * 缓存性能监控装饰器  
 * @param operationOrOptions 操作名称或配置选项
 */
export const CachePerformance = createPerformanceDecorator(
  'CachePerformance',
  'cache'
);

/**
 * 认证性能监控装饰器
 * @param operationOrOptions 操作名称或配置选项
 */
export const AuthPerformance = createPerformanceDecorator(
  'AuthPerformance',
  'auth'
);

/**
 * 性能监控装饰器工厂
 * 用于创建自定义性能装饰器
 */
export function createCustomPerformanceDecorator(
  name: string,
  metricType: 'database' | 'cache' | 'auth'
) {
  return createPerformanceDecorator(name, metricType);
}