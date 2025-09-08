/**
 * Foundation层统一导出
 * 🏛️ 基础层 - 纯数值定义，零依赖
 * 🎯 提供所有基础常量的统一访问入口
 */

// 导出所有基础常量
export { CORE_VALUES } from './core-values.constants';
export { CORE_TIMEOUTS, CORE_TTL } from './core-timeouts.constants';
export { CORE_LIMITS } from './core-limits.constants';
export { 
  PROCESSING_BASE_CONSTANTS,
  PROCESSING_BATCH_SETTINGS,
  PROCESSING_RETRY_SETTINGS,
  PROCESSING_STRATEGIES,
  PROCESSING_ERROR_HANDLING,
  PROCESSING_PERFORMANCE_SETTINGS,
  calculateBaseBatchSize,
  calculateBaseRetryDelay,
  isBaseRetryableError,
  isBaseRetryableHttpCode
} from './processing-base.constants';

// 导出类型定义
export type { 
  CoreValues, 
  TimeMS, 
  TimeSeconds, 
  Sizes, 
  Quantities 
} from './core-values.constants';

export type { 
  CoreTimeouts, 
  CoreTTL 
} from './core-timeouts.constants';

export type { 
  CoreLimits 
} from './core-limits.constants';

export type { 
  ProcessingBaseConstants,
  ProcessingBatchSettings,
  ProcessingRetrySettings,
  ProcessingStrategies,
  ProcessingErrorHandling,
  ProcessingPerformanceSettings,
  BatchStrategyType,
  RetryStrategyType,
  FailureStrategyType
} from './processing-base.constants';

// 导入用于对象定义
import { CORE_VALUES } from './core-values.constants';
import { CORE_TIMEOUTS, CORE_TTL } from './core-timeouts.constants';
import { CORE_LIMITS } from './core-limits.constants';
import { PROCESSING_BASE_CONSTANTS } from './processing-base.constants';

// Foundation层统一常量对象
export const FOUNDATION_CONSTANTS = Object.freeze({
  VALUES: CORE_VALUES,
  TIMEOUTS: CORE_TIMEOUTS,
  TTL: CORE_TTL,
  LIMITS: CORE_LIMITS,
  PROCESSING_BASE: PROCESSING_BASE_CONSTANTS,
} as const);

/**
 * Foundation层工具函数
 */
export class FoundationUtils {
  /**
   * 检查数值是否在合理范围内
   */
  static isValidSize(value: number, category: keyof typeof CORE_VALUES.SIZES): boolean {
    return value > 0 && value <= CORE_VALUES.SIZES[category];
  }

  /**
   * 检查超时配置是否合理
   */
  static isValidTimeout(timeoutMs: number): boolean {
    return timeoutMs >= CORE_VALUES.TIME_MS.ONE_SECOND && 
           timeoutMs <= CORE_VALUES.TIME_MS.ONE_HOUR;
  }

  /**
   * 获取推荐的批量大小
   */
  static getOptimalBatchSize(): number {
    return CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE;
  }

  /**
   * 根据数据大小获取推荐的超时时间
   */
  static getRecommendedTimeout(dataSize: number): number {
    if (dataSize <= CORE_VALUES.SIZES.SMALL) {
      return CORE_TIMEOUTS.OPERATION.QUICK_MS;
    } else if (dataSize <= CORE_VALUES.SIZES.LARGE) {
      return CORE_TIMEOUTS.OPERATION.STANDARD_MS;
    } else {
      return CORE_TIMEOUTS.OPERATION.LONG_RUNNING_MS;
    }
  }
}