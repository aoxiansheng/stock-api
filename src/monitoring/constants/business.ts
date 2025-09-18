/**
 * @version 3.0.0 - Phase 3 Constants File Cleanup
 * @since 2025-09-16 (Phase 3: Constants File Cleanup)
 * @author Claude Code
 */

/**
 * 监控业务算法常量 - Phase 3 精简版本
 * 🎯 仅保留核心算法常量，90%已迁移到统一配置系统
 */
export const MONITORING_BUSINESS = Object.freeze({
  /**
   * 采样和数据处理配置 - 算法固定常量
   * 🔥 基于统计学和算法的固定参数，不可配置
   *
   * 🧮 算法依据：
   * - RECENT_METRICS_COUNT: 基于时间序列分析，5个点是短期趋势的最小样本
   * - MIN_DATA_POINTS: 统计学中有效样本的最小要求
   * - SAMPLE_SIZE_*: 基于中央极限定理和处理效率的算法优化
   */
  SAMPLING_CONFIG: Object.freeze({
    RECENT_METRICS_COUNT: 5, // 最近数据点数量 - slice(-5) 算法需求
    MIN_DATA_POINTS: 5, // 最小数据要求 - 统计有效性门槛
    SAMPLE_SIZE_SMALL: 10, // 小样本大小 - 算法处理优化
    SAMPLE_SIZE_MEDIUM: 50, // 中等样本大小 - 平衡精度与性能
    SAMPLE_SIZE_LARGE: 100, // 大样本大小 - 高精度分析
    MAX_SAMPLE_SIZE: 1000, // 最大样本大小 - 内存限制保护
  }),
} as const);

/**
 * 监控业务算法工具类 - Phase 3 精简版本
 * 🛠️ 仅保留基于算法常量的核心判断逻辑
 */
export class MonitoringBusinessUtil {
  /**
   * 判断是否需要采样更多数据
   * 🧮 基于统计学最小样本要求的算法判断
   */
  static needsMoreData(currentDataPoints: number): boolean {
    return (
      currentDataPoints < MONITORING_BUSINESS.SAMPLING_CONFIG.MIN_DATA_POINTS
    );
  }

  /**
   * 获取推荐的采样大小
   * 🧮 基于数据量和算法效率的优化选择
   */
  static getRecommendedSampleSize(
    dataVolume: "small" | "medium" | "large",
  ): number {
    switch (dataVolume) {
      case "small":
        return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_SMALL;
      case "medium":
        return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM;
      case "large":
        return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_LARGE;
      default:
        return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM;
    }
  }

  /**
   * 获取最近数据点数量
   * 🧮 基于时间序列分析算法的固定参数
   */
  static getRecentMetricsCount(): number {
    return MONITORING_BUSINESS.SAMPLING_CONFIG.RECENT_METRICS_COUNT;
  }

  /**
   * 验证样本大小是否在算法允许范围内
   * 🧮 基于内存限制和算法效率的边界检查
   */
  static isValidSampleSize(sampleSize: number): boolean {
    return (
      sampleSize >= MONITORING_BUSINESS.SAMPLING_CONFIG.MIN_DATA_POINTS &&
      sampleSize <= MONITORING_BUSINESS.SAMPLING_CONFIG.MAX_SAMPLE_SIZE
    );
  }

  /**
   * 获取安全的样本大小（限制在算法边界内）
   * 🧮 确保样本大小在算法处理能力范围内
   */
  static getSafeSampleSize(requestedSize: number): number {
    return Math.min(
      Math.max(
        requestedSize,
        MONITORING_BUSINESS.SAMPLING_CONFIG.MIN_DATA_POINTS,
      ),
      MONITORING_BUSINESS.SAMPLING_CONFIG.MAX_SAMPLE_SIZE,
    );
  }
}

/**
 * 类型定义 - Phase 3 精简版本
 * 🏷️ 仅保留算法相关的类型定义
 */
export type DataVolume = "small" | "medium" | "large";
export type SamplingConfig = typeof MONITORING_BUSINESS.SAMPLING_CONFIG;
export type MonitoringBusinessConstants = typeof MONITORING_BUSINESS;
