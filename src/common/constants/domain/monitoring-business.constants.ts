/**
 * 监控业务常量
 * 🎯 Domain层 - 监控相关的业务领域专用常量
 * 🔍 统一监控阈值、变化检测、采样配置等重复数字
 * 
 * 解决的重复问题：
 * - 0.05 错误率阈值 (505次重复中的一部分)
 * - 5 采样数量、变化百分比 (505次重复中的一部分)  
 * - 90, 95 性能评分阈值等
 */

import { CORE_VALUES } from '../foundation';

/**
 * 监控业务配置常量
 * 🎯 解决监控系统中大量重复的阈值和配置数字
 */
export const MONITORING_BUSINESS = Object.freeze({
  /**
   * 错误率阈值配置
   * 🔥 解决 0.05 在错误率判断中的505次重复
   */
  ERROR_THRESHOLDS: {
    ACCEPTABLE_RATE: 0.05,         // 5% - 可接受错误率
    WARNING_RATE: 0.1,             // 10% - 警告错误率  
    CRITICAL_RATE: 0.2,            // 20% - 严重错误率
    EMERGENCY_RATE: 0.3,           // 30% - 紧急错误率
  },
  
  /**
   * 变化检测配置
   * 🔥 解决数字 5 在变化百分比判断中的重复
   */
  CHANGE_DETECTION: {
    SIGNIFICANT_CHANGE_PERCENT: 10, // 10% - 显著变化
    MAJOR_CHANGE_PERCENT: 20,      // 20% - 重大变化
    CRITICAL_CHANGE_PERCENT: 50,   // 50% - 关键变化
  },
  
  /**
   * 采样和数据处理配置
   * 🔥 解决 slice(-5) 和数据点数量的重复
   */
  SAMPLING_CONFIG: {
    RECENT_METRICS_COUNT: 5,       // 最近数据点数量 - slice(-5)
    MIN_DATA_POINTS: 5,            // 最小数据要求 - < 5 判断
    SAMPLE_SIZE_SMALL: 10,         // 小样本大小
    SAMPLE_SIZE_MEDIUM: 50,        // 中等样本大小  
    SAMPLE_SIZE_LARGE: 100,        // 大样本大小
  },
  
  /**
   * 性能评分阈值
   * 🔥 解决 90, 95 等评分阈值的重复
   */
  PERFORMANCE_BENCHMARKS: {
    FAIR_SCORE_THRESHOLD: 70,      // 70分以上为一般
    GOOD_SCORE_THRESHOLD: 80,      // 80分以上为良好
    EXCELLENT_SCORE_THRESHOLD: 90, // 90分以上为优秀
    PERFECT_SCORE_THRESHOLD: 95,   // 95分以上为完美
    
    // 缓存命中率阈值
  },
  
  /**
   * 健康检查阈值
   * 🔥 统一健康状态判断标准
   */
  HEALTH_THRESHOLDS: {
    
    
  },
  
  /**
   * 告警频率控制
   * 🔥 统一告警触发和频率限制
   */
  ALERT_FREQUENCY: {
    MAX_ALERTS_PER_MINUTE: 5,     // 每分钟最大告警数
    MAX_ALERTS_PER_HOUR: 60,      // 每小时最大告警数
  },
  
  /**
   * 趋势分析配置
   * 🔥 统一趋势判断标准
   */
  TREND_ANALYSIS: {
  }
} as const);

/**
 * 监控业务工具函数
 * 🛠️ 提供基于常量的业务逻辑判断
 */
export class MonitoringBusinessUtil {
  /**
   * 判断错误率级别
   */
  static getErrorRateLevel(errorRate: number): 'normal' | 'warning' | 'critical' | 'emergency' {
    if (errorRate >= MONITORING_BUSINESS.ERROR_THRESHOLDS.EMERGENCY_RATE) return 'emergency';
    if (errorRate >= MONITORING_BUSINESS.ERROR_THRESHOLDS.CRITICAL_RATE) return 'critical';
    if (errorRate >= MONITORING_BUSINESS.ERROR_THRESHOLDS.WARNING_RATE) return 'warning';
    return 'normal';
  }
  
  /**
   * 判断变化级别
   */
  static getChangeLevel(changePercent: number): 'minimal' | 'significant' | 'major' | 'critical' {
    const absChange = Math.abs(changePercent);
    if (absChange >= MONITORING_BUSINESS.CHANGE_DETECTION.CRITICAL_CHANGE_PERCENT) return 'critical';
    if (absChange >= MONITORING_BUSINESS.CHANGE_DETECTION.MAJOR_CHANGE_PERCENT) return 'major';
    if (absChange >= MONITORING_BUSINESS.CHANGE_DETECTION.SIGNIFICANT_CHANGE_PERCENT) return 'significant';
    return 'minimal';
  }
  
  /**
   * 判断性能评分级别
   */
  static getPerformanceLevel(score: number): 'poor' | 'fair' | 'good' | 'excellent' | 'perfect' {
    if (score >= MONITORING_BUSINESS.PERFORMANCE_BENCHMARKS.PERFECT_SCORE_THRESHOLD) return 'perfect';
    if (score >= MONITORING_BUSINESS.PERFORMANCE_BENCHMARKS.EXCELLENT_SCORE_THRESHOLD) return 'excellent';
    if (score >= MONITORING_BUSINESS.PERFORMANCE_BENCHMARKS.GOOD_SCORE_THRESHOLD) return 'good';
    if (score >= MONITORING_BUSINESS.PERFORMANCE_BENCHMARKS.FAIR_SCORE_THRESHOLD) return 'fair';
    return 'poor';
  }
  
  /**
   * 判断是否需要采样更多数据
   */
  static needsMoreData(currentDataPoints: number): boolean {
    return currentDataPoints < MONITORING_BUSINESS.SAMPLING_CONFIG.MIN_DATA_POINTS;
  }
  
  /**
   * 获取推荐的采样大小
   */
  static getRecommendedSampleSize(dataVolume: 'small' | 'medium' | 'large'): number {
    switch (dataVolume) {
      case 'small': return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_SMALL;
      case 'medium': return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM;
      case 'large': return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_LARGE;
      default: return MONITORING_BUSINESS.SAMPLING_CONFIG.SAMPLE_SIZE_MEDIUM;
    }
  }
  
  /**
   * 判断是否可以发送告警
   */
  static canSendAlert(recentAlertCount: number, timeWindowMinutes: number = 1): boolean {
    if (timeWindowMinutes === 1) {
      return recentAlertCount < MONITORING_BUSINESS.ALERT_FREQUENCY.MAX_ALERTS_PER_MINUTE;
    }
    if (timeWindowMinutes === 60) {
      return recentAlertCount < MONITORING_BUSINESS.ALERT_FREQUENCY.MAX_ALERTS_PER_HOUR;
    }
    return true;
  }
}

/**
 * 类型定义
 */
export type ErrorRateLevel = 'normal' | 'warning' | 'critical' | 'emergency';
export type ChangeLevel = 'minimal' | 'significant' | 'major' | 'critical';
export type PerformanceLevel = 'poor' | 'fair' | 'good' | 'excellent' | 'perfect';
export type DataVolume = 'small' | 'medium' | 'large';

export type MonitoringBusinessConstants = typeof MONITORING_BUSINESS;
export type ErrorThresholds = typeof MONITORING_BUSINESS.ERROR_THRESHOLDS;
export type ChangeDetection = typeof MONITORING_BUSINESS.CHANGE_DETECTION;
export type SamplingConfig = typeof MONITORING_BUSINESS.SAMPLING_CONFIG;
export type PerformanceBenchmarks = typeof MONITORING_BUSINESS.PERFORMANCE_BENCHMARKS;