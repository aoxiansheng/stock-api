/**
 * Alert模块统一默认值管理
 * 🎯 单一真实来源原则 - 消除DTO和Schema之间的默认值不一致
 * 🔧 用于DTO、Schema、配置文件等所有需要默认值的地方
 * 
 * 📋 使用场景说明:
 * - DTO验证: 为API请求提供合理的默认值
 * - Schema定义: 确保数据库字段的默认值一致性  
 * - 配置初始化: 系统启动时的默认配置项
 * - 表单预填充: 前端界面的默认选项
 * - 测试数据: 单元测试和集成测试的基础数据
 */

import { TIMING_CONSTANTS } from './timing.constants';
import { AlertSeverity } from '../types/alert.types';
import { BASE_RETRY_CONFIG } from './retry.constants';

/**
 * 告警规则默认值配置
 * 确保DTO和Schema使用相同的默认值
 */
export const ALERT_DEFAULTS = Object.freeze({
  /**
   * 告警规则默认配置
   */
  RULE: {
    /** 默认持续时间 (秒) - 引用统一时间配置 */
    duration: TIMING_CONSTANTS.DURATION.DEFAULT_SECONDS,
    /** 默认冷却时间 (秒) - 引用统一时间配置 */
    cooldown: TIMING_CONSTANTS.COOLDOWN.DEFAULT_SECONDS,
    /** 默认启用状态 */
    enabled: true,
    /** 默认告警严重级别 */
    severity: AlertSeverity.WARNING,
    /** 默认比较操作符 */
    operator: "gt" as const,
    /** 默认阈值 */
    threshold: 0,
  },

  /**
   * 分页默认配置
   */
  PAGINATION: {
    /** 默认页码 */
    page: 1,
    /** 默认每页条数 */
    limit: 20,
    /** 最大每页条数 */
    maxLimit: 100,
  },

  /**
   * 数据保留默认配置
   */
  RETENTION: {
    /** 历史数据保留天数 */
    historyDays: 90,
    /** 归档数据保留天数 */
    archiveDays: 365,
  },

  /**
   * 通知渠道默认配置
   */
  NOTIFICATION: {
    /** 默认启用状态 */
    enabled: true,
    /** 默认重试次数 - 使用统一重试配置 */
    retryCount: BASE_RETRY_CONFIG.MAX_RETRIES,
    /** 默认超时时间 (秒) */
    timeout: TIMING_CONSTANTS.TIMEOUT.DEFAULT_SECONDS,
    /** 默认优先级 */
    priority: 1,
  },

  /**
   * 统计数据默认配置
   */
  STATS: {
    /** 活跃告警数 */
    activeAlerts: 0,
    /** 严重告警数 */
    criticalAlerts: 0,
    /** 警告告警数 */
    warningAlerts: 0,
    /** 信息告警数 */
    infoAlerts: 0,
    /** 今日总告警数 */
    totalAlertsToday: 0,
    /** 今日已解决告警数 */
    resolvedAlertsToday: 0,
    /** 平均解决时间 (分钟) */
    averageResolutionTime: 0,
  }
});

/**
 * 默认值类型定义
 * 提供类型安全保障
 */
export type AlertDefaults = typeof ALERT_DEFAULTS;

/**
 * 默认值工具类
 * 提供便捷的默认值获取方法
 */
export class AlertDefaultsUtil {
  /**
   * 获取告警规则默认配置
   * @returns 告警规则默认配置对象
   */
  static getRuleDefaults() {
    return { ...ALERT_DEFAULTS.RULE };
  }

  /**
   * 获取分页默认配置
   * @returns 分页默认配置对象
   */
  static getPaginationDefaults() {
    return { ...ALERT_DEFAULTS.PAGINATION };
  }

  /**
   * 获取通知渠道默认配置
   * @returns 通知渠道默认配置对象
   */
  static getNotificationDefaults() {
    return { ...ALERT_DEFAULTS.NOTIFICATION };
  }

  /**
   * 获取统计数据默认值
   * @returns 统计数据默认对象
   */
  static getStatsDefaults() {
    return { ...ALERT_DEFAULTS.STATS };
  }

  /**
   * 验证默认值一致性
   * @returns 验证结果
   */
  static validateDefaults(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证持续时间默认值在有效范围内
    if (ALERT_DEFAULTS.RULE.duration < TIMING_CONSTANTS.DURATION.MIN_SECONDS ||
        ALERT_DEFAULTS.RULE.duration > TIMING_CONSTANTS.DURATION.MAX_SECONDS) {
      errors.push(`默认持续时间 ${ALERT_DEFAULTS.RULE.duration} 超出有效范围 [${TIMING_CONSTANTS.DURATION.MIN_SECONDS}, ${TIMING_CONSTANTS.DURATION.MAX_SECONDS}]`);
    }

    // 验证冷却时间默认值在有效范围内
    if (ALERT_DEFAULTS.RULE.cooldown < TIMING_CONSTANTS.COOLDOWN.MIN_SECONDS ||
        ALERT_DEFAULTS.RULE.cooldown > TIMING_CONSTANTS.COOLDOWN.MAX_SECONDS) {
      errors.push(`默认冷却时间 ${ALERT_DEFAULTS.RULE.cooldown} 超出有效范围 [${TIMING_CONSTANTS.COOLDOWN.MIN_SECONDS}, ${TIMING_CONSTANTS.COOLDOWN.MAX_SECONDS}]`);
    }

    // 验证通知超时默认值在有效范围内
    if (ALERT_DEFAULTS.NOTIFICATION.timeout < TIMING_CONSTANTS.TIMEOUT.MIN_SECONDS ||
        ALERT_DEFAULTS.NOTIFICATION.timeout > TIMING_CONSTANTS.TIMEOUT.MAX_SECONDS) {
      errors.push(`默认通知超时时间 ${ALERT_DEFAULTS.NOTIFICATION.timeout} 超出有效范围 [${TIMING_CONSTANTS.TIMEOUT.MIN_SECONDS}, ${TIMING_CONSTANTS.TIMEOUT.MAX_SECONDS}]`);
    }

    // 验证分页配置合理性
    if (ALERT_DEFAULTS.PAGINATION.page < 1) {
      errors.push(`默认页码 ${ALERT_DEFAULTS.PAGINATION.page} 必须大于0`);
    }

    if (ALERT_DEFAULTS.PAGINATION.limit < 1) {
      errors.push(`默认每页条数 ${ALERT_DEFAULTS.PAGINATION.limit} 必须大于0`);
    }

    if (ALERT_DEFAULTS.PAGINATION.maxLimit < ALERT_DEFAULTS.PAGINATION.limit) {
      errors.push(`最大每页条数 ${ALERT_DEFAULTS.PAGINATION.maxLimit} 不能小于默认每页条数 ${ALERT_DEFAULTS.PAGINATION.limit}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 创建带默认值的告警规则对象
   * @param overrides 覆盖的属性
   * @returns 合并后的告警规则对象
   */
  static createRuleWithDefaults(overrides: Partial<typeof ALERT_DEFAULTS.RULE> = {}) {
    return {
      ...this.getRuleDefaults(),
      ...overrides
    };
  }

  /**
   * 创建带默认值的分页对象
   * @param overrides 覆盖的属性
   * @returns 合并后的分页对象
   */
  static createPaginationWithDefaults(overrides: Partial<typeof ALERT_DEFAULTS.PAGINATION> = {}) {
    return {
      ...this.getPaginationDefaults(),
      ...overrides
    };
  }

  /**
   * 获取默认值摘要
   * @returns 默认值摘要字符串
   */
  static getSummary(): string {
    return `Alert默认值配置:
- 持续时间: ${ALERT_DEFAULTS.RULE.duration}秒
- 冷却时间: ${ALERT_DEFAULTS.RULE.cooldown}秒
- 告警级别: ${ALERT_DEFAULTS.RULE.severity}
- 启用状态: ${ALERT_DEFAULTS.RULE.enabled}
- 分页大小: ${ALERT_DEFAULTS.PAGINATION.limit}条/页`;
  }
}