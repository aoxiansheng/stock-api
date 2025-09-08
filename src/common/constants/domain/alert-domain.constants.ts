/**
 * 告警领域常量
 * 🏢 Domain层 - 告警系统相关的业务领域专用常量
 * 🚨 基于Semantic层构建，专注于告警业务逻辑
 */

import {
  HTTP_TIMEOUTS,
  CACHE_TTL_SEMANTICS,
  RETRY_CONFIG_TEMPLATES,
  BATCH_SIZE_SEMANTICS
} from '../semantic';

/**
 * 告警类型枚举
 * 🎯 统一告警类型分类
 */
export enum AlertType {
  PRICE_ALERT = 'price_alert',           // 价格告警
  VOLUME_ALERT = 'volume_alert',         // 成交量告警
  TECHNICAL_ALERT = 'technical_alert',   // 技术指标告警
  NEWS_ALERT = 'news_alert',             // 新闻告警
  SYSTEM_ALERT = 'system_alert',         // 系统告警
  CUSTOM_ALERT = 'custom_alert',         // 自定义告警
}

/**
 * 告警严重程度枚举
 * 🎯 统一告警严重程度分级
 */
export enum AlertSeverity {
  LOW = 'low',               // 低
  MEDIUM = 'medium',         // 中
  HIGH = 'high',             // 高
  CRITICAL = 'critical',     // 严重
  EMERGENCY = 'emergency',   // 紧急
}

/**
 * 告警状态枚举
 * 🎯 统一告警状态管理
 */
export enum AlertStatus {
  PENDING = 'pending',       // 待处理
  ACTIVE = 'active',         // 活跃
  TRIGGERED = 'triggered',   // 已触发
  RESOLVED = 'resolved',     // 已解决
  DISMISSED = 'dismissed',   // 已忽略
  EXPIRED = 'expired',       // 已过期
}

/**
 * 通知渠道枚举
 * 🎯 统一通知渠道类型
 */
export enum NotificationChannel {
  EMAIL = 'email',           // 邮件
  SMS = 'sms',              // 短信
  WEBHOOK = 'webhook',       // Webhook
  PUSH = 'push',            // 推送通知
  IN_APP = 'in_app',        // 应用内通知
}

/**
 * 告警频率限制配置
 * 🎯 基于Semantic层构建，解决告警频率限制重复定义
 */
export const ALERT_RATE_LIMIT_CONFIG = Object.freeze({
  // 手动触发告警评估限制
  TRIGGER_EVALUATION: {
    MAX_REQUESTS_PER_MINUTE: 5,                                      // 每分钟最多5次
    WINDOW_MS: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC * 1000, // 1分钟窗口
    COOLDOWN_MS: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC * 1000 / 2,    // 5分钟冷却期
  },

  // 告警通知频率限制
  NOTIFICATION: {
    MAX_REQUESTS_PER_MINUTE: 10,                                     // 每分钟最多10次通知
    WINDOW_MS: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC * 1000, // 1分钟窗口
    COOLDOWN_MS: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC * 1000 / 2,    // 5分钟冷却期
  },

  // 批量操作限制
  BATCH_OPERATIONS: {
    MAX_REQUESTS_PER_MINUTE: 3,                                      // 每分钟最多3次批量操作
    WINDOW_MS: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC * 1000, // 1分钟窗口
    MAX_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,   // 50 - 批量操作大小限制
  },

  // 严重程度相关限制
  SEVERITY_BASED: {
    [AlertSeverity.EMERGENCY]: {
      MAX_PER_HOUR: 100,                                             // 紧急告警每小时限制
      MIN_INTERVAL_MS: 30 * 1000,                                    // 最小间隔30秒
    },
    [AlertSeverity.CRITICAL]: {
      MAX_PER_HOUR: 50,                                              // 严重告警每小时限制
      MIN_INTERVAL_MS: 60 * 1000,                                    // 最小间隔1分钟
    },
    [AlertSeverity.HIGH]: {
      MAX_PER_HOUR: 20,                                              // 高级告警每小时限制
      MIN_INTERVAL_MS: 300 * 1000,                                   // 最小间隔5分钟
    },
    [AlertSeverity.MEDIUM]: {
      MAX_PER_HOUR: 10,                                              // 中级告警每小时限制
      MIN_INTERVAL_MS: 600 * 1000,                                   // 最小间隔10分钟
    },
    [AlertSeverity.LOW]: {
      MAX_PER_HOUR: 5,                                               // 低级告警每小时限制
      MIN_INTERVAL_MS: 1800 * 1000,                                  // 最小间隔30分钟
    },
  },
});

/**
 * 告警缓存配置
 * 🎯 基于Semantic层缓存策略，针对告警数据特化
 */
export const ALERT_CACHE_CONFIG = Object.freeze({
  // 告警规则缓存
  RULES: {
    ACTIVE_RULES_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,      // 10分钟 - 活跃规则
    RULE_CONFIG_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.SLOW_UPDATE_SEC,  // 1小时 - 规则配置
    RULE_STATS_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,        // 10分钟 - 规则统计
  },

  // 告警历史缓存
  HISTORY: {
    RECENT_ALERTS_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC, // 1分钟 - 最近告警
    ALERT_LOG_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,         // 10分钟 - 告警日志
    STATISTICS_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.SLOW_UPDATE_SEC,   // 1小时 - 告警统计
  },

  // 通知缓存
  NOTIFICATIONS: {
    TEMPLATE_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.STATIC_SEC,          // 1天 - 通知模板
    CHANNEL_CONFIG_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.SLOW_UPDATE_SEC, // 1小时 - 渠道配置
    DELIVERY_STATUS_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,   // 10分钟 - 发送状态
  },
});

/**
 * 告警API超时配置
 * 🎯 基于Semantic层HTTP超时，针对告警API特化
 */
export const ALERT_API_TIMEOUTS = Object.freeze({
  // 规则操作超时
  RULE_OPERATIONS: {
    CREATE_RULE_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,            // 30秒 - 创建规则
    UPDATE_RULE_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,            // 30秒 - 更新规则
    DELETE_RULE_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,              // 5秒 - 删除规则
    EVALUATE_RULE_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS,            // 60秒 - 规则评估
  },

  // 告警处理超时
  ALERT_PROCESSING: {
    TRIGGER_ALERT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,            // 5秒 - 触发告警
    RESOLVE_ALERT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,            // 5秒 - 解决告警
    BATCH_PROCESS_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS,            // 60秒 - 批量处理
  },

  // 通知发送超时
  NOTIFICATION: {
    EMAIL_SEND_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,             // 30秒 - 邮件发送
    SMS_SEND_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS * 2,             // 10秒 - 短信发送
    WEBHOOK_SEND_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,             // 5秒 - Webhook发送
    PUSH_SEND_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,                // 5秒 - 推送发送
  },
});

/**
 * 告警批量处理配置
 * 🎯 基于Semantic层批量配置，针对告警处理特化
 */
export const ALERT_BATCH_CONFIG = Object.freeze({
  // 规则批量处理
  RULE_PROCESSING: {
    EVALUATION_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,    // 50 - 规则评估批量
    UPDATE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH,         // 25 - 规则更新批量
    DELETE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH,         // 25 - 规则删除批量
  },

  // 告警批量处理
  ALERT_PROCESSING: {
    TRIGGER_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH,        // 100 - 告警触发批量
    RESOLVE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,       // 50 - 告警解决批量
    CLEANUP_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH,        // 100 - 告警清理批量
  },

  // 通知批量发送
  NOTIFICATION_BATCH: {
    EMAIL_BATCH_SIZE: BATCH_SIZE_SEMANTICS.SCENARIO.NOTIFICATION_BATCH,      // 50 - 邮件批量发送
    SMS_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH,            // 25 - 短信批量发送
    WEBHOOK_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,       // 50 - Webhook批量发送
  },
});

/**
 * 告警重试配置
 * 🎯 基于Semantic层重试配置，针对告警操作特化
 */
export const ALERT_RETRY_CONFIG = Object.freeze({
  // 规则评估重试
  RULE_EVALUATION: {
    ...RETRY_CONFIG_TEMPLATES.DATABASE_OPERATION,  // 基于数据库操作模板
    maxAttempts: 2,                                // 减少重试次数，快速失败
  },

  // 通知发送重试
  NOTIFICATION_DELIVERY: {
    ...RETRY_CONFIG_TEMPLATES.EXTERNAL_API,        // 基于外部API模板
    maxAttempts: 3,                                // 通知发送允许多次重试
  },

  // 告警触发重试
  ALERT_TRIGGERING: {
    ...RETRY_CONFIG_TEMPLATES.CRITICAL_OPERATION,  // 基于关键操作模板
    maxAttempts: 1,                                // 告警触发不重试，避免重复告警
  },

  // 数据查询重试
  DATA_QUERY: {
    ...RETRY_CONFIG_TEMPLATES.NETWORK_OPERATION,   // 基于网络操作模板
    maxAttempts: 3,                                // 数据查询允许重试
  },
});

/**
 * 告警消息模板
 * 🎯 统一告警消息格式
 */
export const ALERT_MESSAGES = Object.freeze({
  // 成功消息
  SUCCESS: {
    RULE_CREATED: "告警规则创建成功",
    RULE_UPDATED: "告警规则更新成功", 
    RULE_DELETED: "告警规则删除成功",
    RULE_STATUS_TOGGLED: "切换告警规则状态成功",
    NOTIFICATION_SENT: "通知发送成功",
    ALERT_RESOLVED: "告警已解决",
  },

  // 错误消息
  ERRORS: {
    RULE_NOT_FOUND: "告警规则不存在",
    RULE_CREATION_FAILED: "创建告警规则失败",
    RULE_UPDATE_FAILED: "更新告警规则失败",
    RULE_DELETE_FAILED: "删除告警规则失败",
    NOTIFICATION_FAILED: "通知发送失败",
    EVALUATION_FAILED: "规则评估失败",
    INVALID_RULE_CONFIG: "无效的规则配置",
    RATE_LIMIT_EXCEEDED: "操作频率超出限制",
  },

  // 状态消息
  STATUS: {
    RULE_ACTIVE: "规则已激活",
    RULE_INACTIVE: "规则已停用", 
    ALERT_TRIGGERED: "告警已触发",
    ALERT_PENDING: "告警待处理",
    NOTIFICATION_QUEUED: "通知已加入队列",
    PROCESSING: "处理中...",
  },

  // 频率限制消息
  RATE_LIMIT: {
    TRIGGER_RATE_EXCEEDED: "手动触发频率过高，请稍后再试",
    NOTIFICATION_RATE_EXCEEDED: "通知发送频率过高，请稍后再试",
    BATCH_RATE_EXCEEDED: "批量操作频率过高，请稍后再试",
    SEVERITY_RATE_EXCEEDED: "该严重程度告警频率超限，请稍后再试",
  },
});

/**
 * 告警配置验证规则
 * 🎯 告警配置的验证标准
 */
export const ALERT_VALIDATION_RULES = Object.freeze({
  // 规则名称验证
  RULE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9_\-\u4e00-\u9fa5\s]+$/,  // 支持中英文、数字、下划线、连字符
  },

  // 阈值验证
  THRESHOLD: {
    MIN_VALUE: 0,
    MAX_VALUE: Number.MAX_SAFE_INTEGER,
    DECIMAL_PLACES: 6,
  },

  // 时间间隔验证
  INTERVAL: {
    MIN_SECONDS: 30,                               // 最小30秒间隔
    MAX_SECONDS: 24 * 60 * 60,                     // 最大24小时间隔
    DEFAULT_SECONDS: 300,                          // 默认5分钟间隔
  },

  // 批量操作验证
  BATCH: {
    MIN_SIZE: 1,
    MAX_SIZE: ALERT_BATCH_CONFIG.ALERT_PROCESSING.TRIGGER_BATCH_SIZE,
  },
});

/**
 * 告警域工具函数
 */
export class AlertDomainUtil {
  /**
   * 判断告警严重程度优先级
   */
  static getSeverityPriority(severity: AlertSeverity): number {
    const priorities = {
      [AlertSeverity.EMERGENCY]: 5,
      [AlertSeverity.CRITICAL]: 4,
      [AlertSeverity.HIGH]: 3,
      [AlertSeverity.MEDIUM]: 2,
      [AlertSeverity.LOW]: 1,
    };
    return priorities[severity] || 0;
  }

  /**
   * 比较告警严重程度
   */
  static compareSeverity(severity1: AlertSeverity, severity2: AlertSeverity): number {
    return this.getSeverityPriority(severity2) - this.getSeverityPriority(severity1);
  }

  /**
   * 获取推荐的通知渠道
   */
  static getRecommendedChannels(severity: AlertSeverity): NotificationChannel[] {
    const channelMap = {
      [AlertSeverity.EMERGENCY]: [NotificationChannel.SMS, NotificationChannel.WEBHOOK, NotificationChannel.PUSH],
      [AlertSeverity.CRITICAL]: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.WEBHOOK],
      [AlertSeverity.HIGH]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [AlertSeverity.MEDIUM]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      [AlertSeverity.LOW]: [NotificationChannel.IN_APP],
    };
    return channelMap[severity] || [NotificationChannel.IN_APP];
  }

  /**
   * 计算告警冷却时间
   */
  static calculateCooldownMs(severity: AlertSeverity): number {
    return ALERT_RATE_LIMIT_CONFIG.SEVERITY_BASED[severity]?.MIN_INTERVAL_MS || 
           ALERT_RATE_LIMIT_CONFIG.SEVERITY_BASED[AlertSeverity.LOW].MIN_INTERVAL_MS;
  }

  /**
   * 验证告警规则配置
   */
  static validateRuleConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证规则名称
    if (!config.name || config.name.length < ALERT_VALIDATION_RULES.RULE_NAME.MIN_LENGTH) {
      errors.push('规则名称不能为空');
    }
    if (config.name && config.name.length > ALERT_VALIDATION_RULES.RULE_NAME.MAX_LENGTH) {
      errors.push(`规则名称长度不能超过${ALERT_VALIDATION_RULES.RULE_NAME.MAX_LENGTH}字符`);
    }

    // 验证阈值
    if (config.threshold !== undefined) {
      if (config.threshold < ALERT_VALIDATION_RULES.THRESHOLD.MIN_VALUE) {
        errors.push('阈值不能小于0');
      }
      if (config.threshold > ALERT_VALIDATION_RULES.THRESHOLD.MAX_VALUE) {
        errors.push('阈值超出允许范围');
      }
    }

    // 验证时间间隔
    if (config.interval !== undefined) {
      if (config.interval < ALERT_VALIDATION_RULES.INTERVAL.MIN_SECONDS) {
        errors.push(`时间间隔不能小于${ALERT_VALIDATION_RULES.INTERVAL.MIN_SECONDS}秒`);
      }
      if (config.interval > ALERT_VALIDATION_RULES.INTERVAL.MAX_SECONDS) {
        errors.push(`时间间隔不能超过${ALERT_VALIDATION_RULES.INTERVAL.MAX_SECONDS}秒`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 格式化告警消息
   */
  static formatAlertMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 获取推荐的批量处理大小
   */
  static getRecommendedBatchSize(operation: 'evaluation' | 'trigger' | 'notification'): number {
    switch (operation) {
      case 'evaluation':
        return ALERT_BATCH_CONFIG.RULE_PROCESSING.EVALUATION_BATCH_SIZE;
      case 'trigger':
        return ALERT_BATCH_CONFIG.ALERT_PROCESSING.TRIGGER_BATCH_SIZE;
      case 'notification':
        return ALERT_BATCH_CONFIG.NOTIFICATION_BATCH.EMAIL_BATCH_SIZE;
      default:
        return ALERT_BATCH_CONFIG.ALERT_PROCESSING.TRIGGER_BATCH_SIZE;
    }
  }
}

/**
 * 类型定义
 */
export type AlertRateLimitConfig = typeof ALERT_RATE_LIMIT_CONFIG;
export type AlertCacheConfig = typeof ALERT_CACHE_CONFIG;
export type AlertApiTimeouts = typeof ALERT_API_TIMEOUTS;