/**
 * 监控组件缓存键管理工具类
 * 替代 MonitoringCacheService.buildKey() 功能
 * 提供统一的键前缀和命名规范
 */
export class MonitoringCacheKeys {
  private static readonly NAMESPACE = 'monitoring';
  
  /**
   * 构建健康数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:health:key
   */
  static health(key: string): string {
    return `${this.NAMESPACE}:health:${key}`;
  }
  
  /**
   * 构建趋势数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:trend:key
   */
  static trend(key: string): string {
    return `${this.NAMESPACE}:trend:${key}`;
  }
  
  /**
   * 构建性能数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:performance:key
   */
  static performance(key: string): string {
    return `${this.NAMESPACE}:performance:${key}`;
  }
  
  /**
   * 构建告警数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:alert:key
   */
  static alert(key: string): string {
    return `${this.NAMESPACE}:alert:${key}`;
  }
  
  /**
   * 构建缓存统计数据缓存键
   * @param key 业务键名
   * @returns 完整的缓存键 monitoring:cache_stats:key
   */
  static cacheStats(key: string): string {
    return `${this.NAMESPACE}:cache_stats:${key}`;
  }
}