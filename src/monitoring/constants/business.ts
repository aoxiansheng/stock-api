/**
 * Monitoring 业务常量 - 零抽象架构
 * 🎯 从 common/constants/domain/monitoring-business.constants.ts 剥离的监控业务配置
 * 专用于 Monitoring 模块的业务常量
 * 
 * ✅ 零抽象原则：所有数值直观可见，无复杂嵌套结构
 * ✅ 直观优先：常量名称直接体现业务含义
 * ✅ 就近原则：相关常量组织在一起
 * 
 * 零抽象架构：MONITORING_BUSINESS 统一定义
 */

/**
 * 监控业务配置常量 - 零抽象架构
 * 🎯 解决监控系统中大量重复的阈值和配置数字
 */
export const MONITORING_BUSINESS = Object.freeze({
  /**
   * 错误率阈值配置 - 直观数值
   * 🔥 所有数值直观可见，无抽象层引用
   */
  ERROR_THRESHOLDS: {
    ACCEPTABLE_RATE: 0.05,     // 5% - 可接受错误率
    WARNING_RATE: 0.1,         // 10% - 警告错误率  
    CRITICAL_RATE: 0.2,        // 20% - 严重错误率
    EMERGENCY_RATE: 0.3,       // 30% - 紧急错误率
  },
  
  /**
   * 变化检测配置 - 直观数值
   * 🔥 解决数字在变化百分比判断中的重复
   */
  CHANGE_DETECTION: {
    MINIMAL_CHANGE_PERCENT: 5,     // 5% - 最小变化
    SIGNIFICANT_CHANGE_PERCENT: 10, // 10% - 显著变化
    MAJOR_CHANGE_PERCENT: 20,      // 20% - 重大变化
    CRITICAL_CHANGE_PERCENT: 50,   // 50% - 关键变化
  },
  
  /**
   * 采样和数据处理配置 - 直观数值
   * 🔥 解决 slice(-5) 和数据点数量的重复
   */
  SAMPLING_CONFIG: {
    RECENT_METRICS_COUNT: 5,       // 最近数据点数量 - slice(-5)
    MIN_DATA_POINTS: 5,            // 最小数据要求 - < 5 判断
    SAMPLE_SIZE_SMALL: 10,         // 小样本大小
    SAMPLE_SIZE_MEDIUM: 50,        // 中等样本大小  
    SAMPLE_SIZE_LARGE: 100,        // 大样本大小
    MAX_SAMPLE_SIZE: 1000,         // 最大样本大小
  },
  
  /**
   * 性能评分阈值 - 直观数值
   * 🔥 解决 90, 95 等评分阈值的重复
   */
  PERFORMANCE_BENCHMARKS: {
    POOR_SCORE_THRESHOLD: 50,      // 50分以下为差
    FAIR_SCORE_THRESHOLD: 70,      // 70分以上为一般
    GOOD_SCORE_THRESHOLD: 80,      // 80分以上为良好
    EXCELLENT_SCORE_THRESHOLD: 90, // 90分以上为优秀
    PERFECT_SCORE_THRESHOLD: 95,   // 95分以上为完美
    
    // 缓存命中率阈值 - 直观数值
    CACHE_HIT_RATE_EXCELLENT: 0.95,  // 95% - 优秀命中率
    CACHE_HIT_RATE_GOOD: 0.8,        // 80% - 良好命中率
    CACHE_HIT_RATE_FAIR: 0.7,        // 70% - 一般命中率
    CACHE_HIT_RATE_POOR: 0.5,        // 50% - 较差命中率
  },
  
  /**
   * 健康检查阈值 - 直观数值
   * 🔥 所有阈值直观可见，确保阈值一致性
   */
  HEALTH_THRESHOLDS: {
    // 响应时间阈值 (毫秒) - 直观数值
    RESPONSE_TIME_EXCELLENT: 100,  // 100ms
    RESPONSE_TIME_GOOD: 300,       // 300ms
    RESPONSE_TIME_FAIR: 1000,      // 1000ms
    RESPONSE_TIME_POOR: 2000,      // 2000ms
    
    // CPU使用率阈值 - 直观数值
    CPU_USAGE_LOW: 0.3,      // 30%
    CPU_USAGE_MEDIUM: 0.5,   // 50%
    CPU_USAGE_HIGH: 0.7,     // 70%
    CPU_USAGE_CRITICAL: 0.9, // 90%
    
    // 内存使用率阈值 - 直观数值
    MEMORY_USAGE_LOW: 0.4,      // 40%
    MEMORY_USAGE_MEDIUM: 0.6,   // 60%
    MEMORY_USAGE_HIGH: 0.75,    // 75%
    MEMORY_USAGE_CRITICAL: 0.95, // 95%
  },
  
  /**
   * 告警频率控制 - 直观数值
   * 🔥 统一告警触发和频率限制
   */
  ALERT_FREQUENCY: {
    MAX_ALERTS_PER_MINUTE: 5,      // 5次/分钟
    MAX_ALERTS_PER_HOUR: 60,       // 60次/小时
    MAX_ALERTS_PER_DAY: 500,       // 500次/天
    
    // 不同级别告警的冷却时间 (秒) - 直观数值
    COOLDOWN_EMERGENCY: 60,        // 60秒 - 紧急告警冷却
    COOLDOWN_CRITICAL: 300,        // 300秒 - 严重告警冷却
    COOLDOWN_WARNING: 900,         // 900秒 - 警告告警冷却
    COOLDOWN_INFO: 1800,           // 1800秒 - 信息告警冷却
  },
  
  /**
   * 趋势分析配置 - 直观数值
   * 🔥 统一趋势判断标准
   */
  TREND_ANALYSIS: {
    // 时间窗口 (秒) - 直观数值
    SHORT_TERM_WINDOW: 300,        // 5分钟短期趋势
    MEDIUM_TERM_WINDOW: 1800,      // 30分钟中期趋势
    LONG_TERM_WINDOW: 3600,        // 1小时长期趋势
    
    // 趋势强度阈值 - 直观数值
    TREND_STRENGTH_WEAK: 0.3,      // 弱趋势
    TREND_STRENGTH_MODERATE: 0.6,  // 中等趋势
    TREND_STRENGTH_STRONG: 0.8,    // 强趋势
  },

  /**
   * 数据收集配置 - 直观数值
   * 🔥 统一数据收集频率和批量处理
   */
  DATA_COLLECTION: {
    // 收集频率 (秒) - 直观数值
    REALTIME_INTERVAL: 1,          // 1秒 - 实时采集
    HIGH_FREQUENCY_INTERVAL: 5,    // 5秒 - 高频采集
    NORMAL_INTERVAL: 30,           // 30秒 - 常规采集
    LOW_FREQUENCY_INTERVAL: 300,   // 300秒 - 低频采集
    
    // 批量处理大小 - 直观数值
    BATCH_SIZE_SMALL: 10,          // 小批量
    BATCH_SIZE_MEDIUM: 50,         // 中等批量
    BATCH_SIZE_LARGE: 100,         // 大批量
    
    // 数据保留时间 (秒) - 直观数值
    RETENTION_REALTIME: 3600,      // 1小时 - 实时数据保留
    RETENTION_HOURLY: 604800,      // 7天 - 小时数据保留
    RETENTION_DAILY: 2592000,      // 30天 - 日数据保留
    RETENTION_MONTHLY: 31536000,   // 365天 - 月数据保留
  },

  /**
   * 系统资源监控配置 - 直观数值
   * 🔥 系统资源监控的阈值和限制
   */
  SYSTEM_RESOURCES: {
    // 磁盘使用率阈值 - 直观数值
    DISK_USAGE_WARNING: 0.8,       // 80% - 磁盘使用率警告
    DISK_USAGE_CRITICAL: 0.9,      // 90% - 磁盘使用率严重
    DISK_USAGE_EMERGENCY: 0.95,    // 95% - 磁盘使用率紧急
    
    // 网络连接数阈值 - 直观数值
    CONNECTION_COUNT_WARNING: 1000,     // 1000 - 连接数警告
    CONNECTION_COUNT_CRITICAL: 5000,    // 5000 - 连接数严重
    CONNECTION_COUNT_EMERGENCY: 10000,  // 10000 - 连接数紧急
    
    // 文件描述符使用率阈值 - 直观数值
    FD_USAGE_WARNING: 0.7,         // 70% 文件描述符警告
    FD_USAGE_CRITICAL: 0.85,       // 85% 文件描述符严重
    FD_USAGE_EMERGENCY: 0.95,      // 95% 文件描述符紧急
  },
} as const);

/**
 * 监控业务工具类 - 零抽象架构
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
   * 判断健康状态级别
   */
  static getHealthLevel(metric: 'response_time' | 'cpu_usage' | 'memory_usage' | 'disk_usage', value: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const thresholds = MONITORING_BUSINESS.HEALTH_THRESHOLDS;
    
    switch (metric) {
      case 'response_time':
        if (value <= thresholds.RESPONSE_TIME_EXCELLENT) return 'excellent';
        if (value <= thresholds.RESPONSE_TIME_GOOD) return 'good';
        if (value <= thresholds.RESPONSE_TIME_FAIR) return 'fair';
        if (value <= thresholds.RESPONSE_TIME_POOR) return 'poor';
        return 'critical';
        
      case 'cpu_usage':
        if (value <= thresholds.CPU_USAGE_LOW) return 'excellent';
        if (value <= thresholds.CPU_USAGE_MEDIUM) return 'good';
        if (value <= thresholds.CPU_USAGE_HIGH) return 'fair';
        if (value <= thresholds.CPU_USAGE_CRITICAL) return 'poor';
        return 'critical';
        
      case 'memory_usage':
        if (value <= thresholds.MEMORY_USAGE_LOW) return 'excellent';
        if (value <= thresholds.MEMORY_USAGE_MEDIUM) return 'good';
        if (value <= thresholds.MEMORY_USAGE_HIGH) return 'fair';
        if (value <= thresholds.MEMORY_USAGE_CRITICAL) return 'poor';
        return 'critical';
        
      default:
        return 'fair';
    }
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
    if (timeWindowMinutes === 1440) { // 24 hours
      return recentAlertCount < MONITORING_BUSINESS.ALERT_FREQUENCY.MAX_ALERTS_PER_DAY;
    }
    return true;
  }

  /**
   * 获取告警冷却时间
   */
  static getAlertCooldown(level: 'emergency' | 'critical' | 'warning' | 'info'): number {
    const cooldowns = MONITORING_BUSINESS.ALERT_FREQUENCY;
    switch (level) {
      case 'emergency': return cooldowns.COOLDOWN_EMERGENCY;
      case 'critical': return cooldowns.COOLDOWN_CRITICAL;
      case 'warning': return cooldowns.COOLDOWN_WARNING;
      case 'info': return cooldowns.COOLDOWN_INFO;
      default: return cooldowns.COOLDOWN_INFO;
    }
  }

  /**
   * 根据数据量选择收集频率
   */
  static getCollectionInterval(priority: 'realtime' | 'high' | 'normal' | 'low'): number {
    const intervals = MONITORING_BUSINESS.DATA_COLLECTION;
    switch (priority) {
      case 'realtime': return intervals.REALTIME_INTERVAL;
      case 'high': return intervals.HIGH_FREQUENCY_INTERVAL;
      case 'normal': return intervals.NORMAL_INTERVAL;
      case 'low': return intervals.LOW_FREQUENCY_INTERVAL;
      default: return intervals.NORMAL_INTERVAL;
    }
  }

  /**
   * 根据数据类型选择保留时间
   */
  static getDataRetention(dataType: 'realtime' | 'hourly' | 'daily' | 'monthly'): number {
    const retention = MONITORING_BUSINESS.DATA_COLLECTION;
    switch (dataType) {
      case 'realtime': return retention.RETENTION_REALTIME;
      case 'hourly': return retention.RETENTION_HOURLY;
      case 'daily': return retention.RETENTION_DAILY;
      case 'monthly': return retention.RETENTION_MONTHLY;
      default: return retention.RETENTION_DAILY;
    }
  }
}

/**
 * 类型定义 - 零抽象架构
 */
export type ErrorRateLevel = 'normal' | 'warning' | 'critical' | 'emergency';
export type ChangeLevel = 'minimal' | 'significant' | 'major' | 'critical';
export type PerformanceLevel = 'poor' | 'fair' | 'good' | 'excellent' | 'perfect';
export type HealthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type DataVolume = 'small' | 'medium' | 'large';
export type AlertLevel = 'emergency' | 'critical' | 'warning' | 'info';
export type CollectionPriority = 'realtime' | 'high' | 'normal' | 'low';
export type DataType = 'realtime' | 'hourly' | 'daily' | 'monthly';

export type MonitoringBusinessConstants = typeof MONITORING_BUSINESS;