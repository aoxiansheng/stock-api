/**
 * 默认值配置常量
 * 🎯 应用层 - 整个Alert模块的默认值统一管理
 * 🔧 消除DTO和Schema之间的默认值不一致，提供单一真实来源
 */

import { ALERT_RULE_CONSTANTS } from '../domain/alert-rules.constants';
import { NOTIFICATION_CONSTANTS } from '../domain/notifications.constants';
import { ALERT_HISTORY_CONSTANTS } from '../domain/alert-history.constants';
import { CORE_LIMITS } from '../core/limits.constants';
import { CORE_TIMEOUTS } from '../core/timeouts.constants';
import { AlertSeverity } from '../../types/alert.types';

/**
 * Alert模块统一默认值配置
 * 用于DTO、Schema、配置文件等所有需要默认值的地方
 */
export const ALERT_DEFAULTS = Object.freeze({
  /**
   * 告警规则默认配置
   * 确保DTO和Schema使用相同的默认值
   */
  RULE: {
    // 时间配置 - 引用领域层配置
    duration: ALERT_RULE_CONSTANTS.TIME_CONFIG.DURATION_DEFAULT,       // 60秒
    cooldown: ALERT_RULE_CONSTANTS.TIME_CONFIG.COOLDOWN_DEFAULT,       // 300秒
    
    // 状态配置
    enabled: true,
    severity: AlertSeverity.WARNING,
    
    // 操作配置
    operator: ALERT_RULE_CONSTANTS.OPERATIONS.DEFAULT_OPERATOR,        // "gt"
    threshold: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,                    // 0
  },

  /**
   * 分页默认配置
   */
  PAGINATION: {
    page: CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE,                    // 1
    limit: 20,                                                         // 20
    maxLimit: CORE_LIMITS.STRING_LENGTH.NAME_MAX,                      // 100
  },

  /**
   * 数据保留默认配置
   */
  RETENTION: {
    historyDays: ALERT_HISTORY_CONSTANTS.TIME_CONFIG.DEFAULT_CLEANUP_DAYS,  // 90天
    archiveDays: 365,                                                        // 365天
  },

  /**
   * 通知渠道默认配置
   */
  NOTIFICATION: {
    enabled: true,
    retryCount: NOTIFICATION_CONSTANTS.RETRY.MAX_RETRIES,              // 5
    timeout: NOTIFICATION_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_SECONDS,  // 30秒
    priority: CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE,                // 1
  },

  /**
   * 统计数据默认配置
   */
  STATS: {
    activeAlerts: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,                 // 0
    criticalAlerts: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,               // 0
    warningAlerts: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,                // 0
    infoAlerts: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,                   // 0
    totalAlertsToday: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,             // 0
    resolvedAlertsToday: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,          // 0
    averageResolutionTime: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,        // 0 (分钟)
  },

  /**
   * 系统性能默认配置
   */
  PERFORMANCE: {
    // 缓存配置
    cacheEnabled: true,
    cacheTTL: CORE_TIMEOUTS.CACHE_TTL_SECONDS.STATS,                   // 300秒
    
    // 批处理配置
    batchSize: 20,
    maxBatchSize: CORE_LIMITS.BATCH_LIMITS.SMALL_BATCH_SIZE,           // 50
    
    // 连接池配置
    connectionPoolSize: CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE,      // 10
    queryTimeout: ALERT_HISTORY_CONSTANTS.TIME_CONFIG.DB_QUERY_TIMEOUT_MS, // 5000ms
  },

  /**
   * 安全相关默认配置
   */
  SECURITY: {
    // 密码配置
    minPasswordLength: 8,
    maxPasswordLength: 128,
    
    // 登录限制
    maxLoginAttempts: CORE_LIMITS.RETRY_LIMITS.NOTIFICATION_MAX_RETRIES, // 5
    accountLockoutSeconds: CORE_TIMEOUTS.SECURITY_TIMEOUTS_SECONDS.ACCOUNT_LOCKOUT, // 1800秒
    
    // JWT配置
    jwtExpiresSeconds: CORE_TIMEOUTS.SECURITY_TIMEOUTS_SECONDS.JWT_EXPIRES, // 3600秒
    refreshTokenExpiresSeconds: CORE_TIMEOUTS.SECURITY_TIMEOUTS_SECONDS.REFRESH_TOKEN_EXPIRES, // 86400秒
    
    // 速率限制
    rateLimitWindowSeconds: CORE_TIMEOUTS.SECURITY_TIMEOUTS_SECONDS.RATE_LIMIT_WINDOW, // 60秒
    rateLimitMaxRequests: CORE_LIMITS.STRING_LENGTH.NAME_MAX,           // 100
  },
});

/**
 * 默认值类型定义
 * 提供类型安全保障
 */
export type AlertDefaults = typeof ALERT_DEFAULTS;

/**
 * 默认值工具类
 * 提供便捷的默认值获取和操作方法
 */
export class AlertDefaultsUtil {
  /**
   * 获取告警规则默认配置
   */
  static getRuleDefaults() {
    return { ...ALERT_DEFAULTS.RULE };
  }

  /**
   * 获取分页默认配置
   */
  static getPaginationDefaults() {
    return { ...ALERT_DEFAULTS.PAGINATION };
  }

  /**
   * 获取通知渠道默认配置
   */
  static getNotificationDefaults() {
    return { ...ALERT_DEFAULTS.NOTIFICATION };
  }

  /**
   * 获取统计数据默认值
   */
  static getStatsDefaults() {
    return { ...ALERT_DEFAULTS.STATS };
  }

  /**
   * 获取性能配置默认值
   */
  static getPerformanceDefaults() {
    return { ...ALERT_DEFAULTS.PERFORMANCE };
  }

  /**
   * 获取安全配置默认值
   */
  static getSecurityDefaults() {
    return { ...ALERT_DEFAULTS.SECURITY };
  }

  /**
   * 创建带默认值的告警规则对象
   */
  static createRuleWithDefaults(overrides: Partial<typeof ALERT_DEFAULTS.RULE> = {}) {
    return {
      ...this.getRuleDefaults(),
      ...overrides
    };
  }

  /**
   * 创建带默认值的分页对象
   */
  static createPaginationWithDefaults(overrides: Partial<typeof ALERT_DEFAULTS.PAGINATION> = {}) {
    return {
      ...this.getPaginationDefaults(),
      ...overrides
    };
  }

  /**
   * 创建带默认值的通知配置对象
   */
  static createNotificationWithDefaults(overrides: Partial<typeof ALERT_DEFAULTS.NOTIFICATION> = {}) {
    return {
      ...this.getNotificationDefaults(),
      ...overrides
    };
  }

  /**
   * 验证默认值一致性
   * 确保所有默认值都在有效范围内
   */
  static validateDefaults(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证规则默认值
    if (ALERT_DEFAULTS.RULE.duration < ALERT_RULE_CONSTANTS.TIME_CONFIG.DURATION_MIN ||
        ALERT_DEFAULTS.RULE.duration > ALERT_RULE_CONSTANTS.TIME_CONFIG.DURATION_MAX) {
      errors.push(`默认持续时间 ${ALERT_DEFAULTS.RULE.duration} 超出有效范围`);
    }

    if (ALERT_DEFAULTS.RULE.cooldown < ALERT_RULE_CONSTANTS.TIME_CONFIG.COOLDOWN_MIN ||
        ALERT_DEFAULTS.RULE.cooldown > ALERT_RULE_CONSTANTS.TIME_CONFIG.COOLDOWN_MAX) {
      errors.push(`默认冷却时间 ${ALERT_DEFAULTS.RULE.cooldown} 超出有效范围`);
    }

    // 验证通知默认值
    if (ALERT_DEFAULTS.NOTIFICATION.timeout < NOTIFICATION_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_SECONDS) {
      errors.push(`默认通知超时时间过短`);
    }

    // 验证分页默认值
    if (ALERT_DEFAULTS.PAGINATION.page < 1) {
      errors.push(`默认页码 ${ALERT_DEFAULTS.PAGINATION.page} 必须大于0`);
    }

    if (ALERT_DEFAULTS.PAGINATION.limit < 1) {
      errors.push(`默认每页条数 ${ALERT_DEFAULTS.PAGINATION.limit} 必须大于0`);
    }

    if (ALERT_DEFAULTS.PAGINATION.maxLimit < ALERT_DEFAULTS.PAGINATION.limit) {
      errors.push(`最大每页条数不能小于默认每页条数`);
    }

    // 验证性能默认值
    if (ALERT_DEFAULTS.PERFORMANCE.batchSize > ALERT_DEFAULTS.PERFORMANCE.maxBatchSize) {
      errors.push(`默认批处理大小不能超过最大批处理大小`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认值摘要信息
   */
  static getSummary(): string {
    return `Alert模块默认值配置:
- 告警持续时间: ${ALERT_DEFAULTS.RULE.duration}秒
- 告警冷却时间: ${ALERT_DEFAULTS.RULE.cooldown}秒
- 告警严重级别: ${ALERT_DEFAULTS.RULE.severity}
- 告警启用状态: ${ALERT_DEFAULTS.RULE.enabled}
- 分页大小: ${ALERT_DEFAULTS.PAGINATION.limit}条/页
- 通知重试次数: ${ALERT_DEFAULTS.NOTIFICATION.retryCount}次
- 缓存TTL: ${ALERT_DEFAULTS.PERFORMANCE.cacheTTL}秒
- 数据保留期: ${ALERT_DEFAULTS.RETENTION.historyDays}天`;
  }

  /**
   * 获取环境相关的默认值配置
   */
  static getEnvironmentDefaults(environment: 'development' | 'production' | 'test'): Partial<AlertDefaults> {
    const baseDefaults: Record<string, any> = {
      development: {
        PERFORMANCE: {
          ...ALERT_DEFAULTS.PERFORMANCE,
          cacheTTL: 30, // 开发环境缓存时间短一些
          queryTimeout: 2000, // 开发环境超时时间短一些
        }
      },
      production: {
        PERFORMANCE: {
          ...ALERT_DEFAULTS.PERFORMANCE,
          connectionPoolSize: 20, // 生产环境连接池更大
          maxBatchSize: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE, // 生产环境支持更大批量
        }
      },
      test: {
        PERFORMANCE: {
          ...ALERT_DEFAULTS.PERFORMANCE,
          cacheTTL: 5, // 测试环境缓存时间很短
          queryTimeout: 1000, // 测试环境超时时间更短
        },
        PAGINATION: {
          ...ALERT_DEFAULTS.PAGINATION,
          limit: 5, // 测试环境分页更小
        }
      }
    };

    return baseDefaults[environment] || {};
  }

  /**
   * 获取功能模块的默认值
   */
  static getModuleDefaults(module: 'rules' | 'notifications' | 'history' | 'stats'): any {
    const moduleDefaults = {
      rules: this.getRuleDefaults(),
      notifications: this.getNotificationDefaults(), 
      history: {
        retentionDays: ALERT_DEFAULTS.RETENTION.historyDays,
        cleanupBatchSize: ALERT_HISTORY_CONSTANTS.BUSINESS_LIMITS.CLEANUP_BATCH_SIZE,
      },
      stats: this.getStatsDefaults(),
    };

    return moduleDefaults[module];
  }
}

/**
 * 默认值常量导出
 * 保持向后兼容性
 */
export const {
  RULE: ALERT_RULE_DEFAULTS,
  PAGINATION: ALERT_PAGINATION_DEFAULTS, 
  NOTIFICATION: ALERT_NOTIFICATION_DEFAULTS,
  STATS: ALERT_STATS_DEFAULTS,
  PERFORMANCE: ALERT_PERFORMANCE_DEFAULTS,
  SECURITY: ALERT_SECURITY_DEFAULTS,
} = ALERT_DEFAULTS;