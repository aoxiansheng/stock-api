/**
 * Foundation层统一导出
 * 🏛️ 基础层 - 纯数值定义，零依赖
 * 🎯 提供所有基础常量的统一访问入口
 */
// 导出所有基础常量
export { CORE_VALUES } from "./core-values.constants";
export { CORE_TIMEOUTS, CORE_TTL } from "./core-timeouts.constants";
export {
  CORE_TIMEZONES,
  CORE_TRADING_TIMES,
  TimezoneUtil,
} from "./core-timezones.constants";
export {
  PROCESSING_BASE_CONSTANTS,
  PROCESSING_BATCH_SETTINGS,
  PROCESSING_RETRY_SETTINGS,
  PROCESSING_STRATEGIES,
  PROCESSING_ERROR_HANDLING,
  PROCESSING_PERFORMANCE_SETTINGS,
} from "./processing-base.constants";
// 导出类型定义
// Sizes类型已移除，使用CORE_VALUES.QUANTITIES替代
export type { CoreTimeouts } from "./core-timeouts.constants";
// 导入用于对象定义
import { NUMERIC_CONSTANTS } from "../core";
import { CORE_VALUES } from "./core-values.constants";
import { CORE_TIMEOUTS, CORE_TTL } from "./core-timeouts.constants";
import { CORE_TIMEZONES, CORE_TRADING_TIMES } from "./core-timezones.constants";
import { PROCESSING_BASE_CONSTANTS } from "./processing-base.constants";
// Foundation层统一常量对象
export const FOUNDATION_CONSTANTS = Object.freeze({
  VALUES: CORE_VALUES,
  TIMEOUTS: CORE_TIMEOUTS,
  TTL: CORE_TTL,
  TIMEZONES: CORE_TIMEZONES,
  TRADING_TIMES: CORE_TRADING_TIMES,
  PROCESSING_BASE: PROCESSING_BASE_CONSTANTS,
} as const);
/**
 * Foundation层工具函数
 */
export class FoundationUtils {
  /**
   * 检查数值是否在合理范围内
   */
  static isValidSize(value: number, maxSize: number): boolean {
    return value > 0 && value <= maxSize;
  }
  /**
   * 检查超时配置是否合理
   */
  static isValidTimeout(timeoutMs: number): boolean {
    return (
      timeoutMs >= NUMERIC_CONSTANTS.N_1000 &&
      timeoutMs <= NUMERIC_CONSTANTS.N_3600000
    );
  }
  /**
   * 根据数据大小获取推荐的超时时间
   */
  static getRecommendedTimeout(dataSize: number): number {
    if (dataSize <= NUMERIC_CONSTANTS.N_50) {
      return CORE_TIMEOUTS.OPERATION.QUICK_MS;
    } else if (dataSize <= NUMERIC_CONSTANTS.N_500) {
      return CORE_TIMEOUTS.OPERATION.STANDARD_MS;
    } else {
      return CORE_TIMEOUTS.OPERATION.LONG_RUNNING_MS;
    }
  }
}
