/**
 * StreamReceiver 工具函数模块
 * 从主服务中抽取的通用工具函数
 */

/**
 * 连接健康信息接口
 */
export interface ConnectionHealthInfo {
  lastHeartbeat: number;
  errorCount: number;
  lastActivity: number;
  isHealthy: boolean;
  consecutiveErrors: number;
  lastErrorTime: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

/**
 * 延迟分类工具
 * 将延迟时间归类为性能等级
 */
export class LatencyUtils {
  /**
   * 分类延迟等级
   */
  static categorizeLatency(ms: number): string {
    if (ms <= 10) return "excellent";
    if (ms <= 50) return "good";
    if (ms <= 200) return "acceptable";
    return "poor";
  }

  /**
   * 获取延迟等级的数值表示（用于排序）
   */
  static getLatencyScore(ms: number): number {
    if (ms <= 10) return 4; // excellent
    if (ms <= 50) return 3; // good
    if (ms <= 200) return 2; // acceptable
    return 1; // poor
  }
}

/**
 * 连接健康管理工具
 */
export class ConnectionHealthUtils {
  /**
   * 计算连接健康状态
   */
  static calculateConnectionHealthStatus(health: {
    errorCount: number;
    consecutiveErrors: number;
    lastActivity: number;
    lastHeartbeat: number;
  }): boolean {
    const now = Date.now();

    // 连续错误超过阈值
    if (health.consecutiveErrors >= 5) {
      return false;
    }

    // 总错误计数超过阈值
    if (health.errorCount >= 10) {
      return false;
    }

    // 心跳超时 (2分钟)
    if (now - health.lastHeartbeat > 2 * 60 * 1000) {
      return false;
    }

    // 活动超时 (30分钟)
    if (now - health.lastActivity > 30 * 60 * 1000) {
      return false;
    }

    return true;
  }

  /**
   * 计算连接质量等级
   */
  static calculateConnectionQuality(health: {
    errorCount: number;
    consecutiveErrors: number;
    lastActivity: number;
  }): 'excellent' | 'good' | 'poor' | 'critical' {
    if (health.consecutiveErrors >= 3 || health.errorCount >= 8) {
      return 'critical';
    }

    if (health.consecutiveErrors >= 2 || health.errorCount >= 5) {
      return 'poor';
    }

    if (health.consecutiveErrors >= 1 || health.errorCount >= 2) {
      return 'good';
    }

    return 'excellent';
  }

  /**
   * 获取连接质量优先级（数值越小优先级越高，即越先被清理）
   */
  static getQualityPriority(quality: 'excellent' | 'good' | 'poor' | 'critical'): number {
    switch (quality) {
      case 'critical': return 1; // 最高优先级清理
      case 'poor': return 2;
      case 'good': return 3;
      case 'excellent': return 4; // 最低优先级清理
      default: return 2; // 默认为poor级别
    }
  }

  /**
   * 创建初始健康记录
   */
  static createInitialHealthInfo(now: number = Date.now()): ConnectionHealthInfo {
    return {
      lastHeartbeat: now,
      errorCount: 0,
      lastActivity: now,
      isHealthy: true,
      consecutiveErrors: 0,
      lastErrorTime: 0,
      connectionQuality: 'excellent'
    };
  }

  /**
   * 更新健康记录（成功操作）
   */
  static updateHealthOnSuccess(health: ConnectionHealthInfo, now: number = Date.now()): void {
    health.lastActivity = now;
    health.lastHeartbeat = now;
    health.consecutiveErrors = 0;

    // 逐渐恢复健康状态
    if (health.errorCount > 0) {
      health.errorCount = Math.max(0, health.errorCount - 1);
    }

    // 重新计算健康状态
    health.isHealthy = this.calculateConnectionHealthStatus(health);
    health.connectionQuality = this.calculateConnectionQuality(health);
  }

  /**
   * 更新健康记录（失败操作）
   */
  static updateHealthOnError(health: ConnectionHealthInfo, now: number = Date.now()): void {
    health.lastActivity = now;
    health.lastHeartbeat = now;
    health.errorCount++;
    health.consecutiveErrors++;
    health.lastErrorTime = now;

    // 重新计算健康状态
    health.isHealthy = this.calculateConnectionHealthStatus(health);
    health.connectionQuality = this.calculateConnectionQuality(health);
  }
}

/**
 * 连接统计工具
 */
export class ConnectionStatsUtils {
  /**
   * 计算健康统计
   */
  static calculateHealthStats(healthMap: Map<string, ConnectionHealthInfo>): {
    total: number;
    excellent: number;
    good: number;
    poor: number;
    critical: number;
    healthy: number;
    unhealthy: number;
    healthRatio: number;
  } {
    const stats = {
      total: healthMap.size,
      excellent: 0,
      good: 0,
      poor: 0,
      critical: 0,
      healthy: 0,
      unhealthy: 0,
      healthRatio: 0
    };

    for (const [, health] of healthMap) {
      stats[health.connectionQuality]++;
      if (health.isHealthy) {
        stats.healthy++;
      } else {
        stats.unhealthy++;
      }
    }

    stats.healthRatio = stats.total > 0 ? (stats.healthy / stats.total) : 0;

    return stats;
  }

  /**
   * 检查健康状况是否需要警告
   */
  static shouldWarnAboutHealth(healthStats: {
    total: number;
    unhealthy: number;
  }, threshold: number = 0.2): boolean {
    return healthStats.total > 0 && (healthStats.unhealthy / healthStats.total) > threshold;
  }
}

/**
 * 时间戳工具
 */
export class TimestampUtils {
  /**
   * 检查时间戳是否超时
   */
  static isTimeout(timestamp: number, timeoutMs: number, now: number = Date.now()): boolean {
    return now - timestamp > timeoutMs;
  }

  /**
   * 格式化时长
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * 计算时间差的分类
   */
  static categorizeTimeDiff(ms: number): 'recent' | 'moderate' | 'old' | 'stale' {
    if (ms < 60000) return 'recent'; // < 1分钟
    if (ms < 600000) return 'moderate'; // < 10分钟
    if (ms < 1800000) return 'old'; // < 30分钟
    return 'stale'; // >= 30分钟
  }
}

/**
 * 数组和集合工具
 */
export class CollectionUtils {
  /**
   * 安全地从Map中获取值，如果不存在则创建
   */
  static getOrCreate<K, V>(
    map: Map<K, V>,
    key: K,
    factory: () => V
  ): V {
    let value = map.get(key);
    if (value === undefined) {
      value = factory();
      map.set(key, value);
    }
    return value;
  }

  /**
   * 批量删除Map中的键
   */
  static deleteBatch<K, V>(map: Map<K, V>, keys: K[]): number {
    let deletedCount = 0;
    for (const key of keys) {
      if (map.delete(key)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * 过滤Map并返回匹配的键
   */
  static filterMapKeys<K, V>(
    map: Map<K, V>,
    predicate: (value: V, key: K) => boolean
  ): K[] {
    const result: K[] = [];
    for (const [key, value] of map) {
      if (predicate(value, key)) {
        result.push(key);
      }
    }
    return result;
  }
}