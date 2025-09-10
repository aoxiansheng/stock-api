/**
 * 业务配置层 - 组合语义数值形成完整业务配置
 * 🎯 各个业务模块的完整配置组合
 * 📊 基于语义映射层，提供Ready-to-use的业务配置
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 */

import { SEMANTIC_VALUES } from './semantic-mapping.constants';

// 需要从枚举文件导入的类型（当前使用字符串替代）
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'emergency';
type AlertStatus = 'pending' | 'active' | 'triggered' | 'resolved' | 'dismissed' | 'expired';
type NotificationChannel = 'email' | 'sms' | 'webhook' | 'push' | 'in_app';

/**
 * Alert业务配置
 * 组合语义数值形成各个业务模块的完整配置
 */
export const ALERT_BUSINESS_CONFIG = Object.freeze({

  /**
   * 告警规则配置
   * 告警规则创建、管理、执行的完整配置
   */
  RULE_CONFIG: {
    // 默认配置
    defaults: {
      enabled: true,
      severity: 'medium' as AlertSeverity,
      status: 'pending' as AlertStatus,
      duration: SEMANTIC_VALUES.RESPONSE_TIME.BATCH_PROCESSING_CYCLE,      // 60秒 - 规则执行持续时间
      cooldown: SEMANTIC_VALUES.RESPONSE_TIME.COOLDOWN_PERIOD,             // 300秒 - 告警冷却期
      evaluationCycle: SEMANTIC_VALUES.RESPONSE_TIME.EVALUATION_CYCLE,     // 60秒 - 规则评估周期
    },
    
    // 容量限制
    limits: {
      maxConditions: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_CONDITIONS_PER_RULE,  // 10个 - 单规则最大条件数
      maxActions: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_ACTIONS_PER_RULE,        // 5个 - 单规则最大动作数
      maxPerUser: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_RULES_PER_USER,          // 100个 - 单用户最大规则数
      maxTags: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_TAGS_PER_ENTITY,            // 10个 - 单规则最大标签数
    },
    
    // 缓存配置
    cache: {
      configTTL: SEMANTIC_VALUES.CACHE_DURATION.RULE_CONFIG_TTL,           // 1800秒 - 规则配置缓存时间
      statsTTL: SEMANTIC_VALUES.CACHE_DURATION.STATISTICAL_DATA_TTL,       // 3600秒 - 规则统计缓存时间
      activeTTL: SEMANTIC_VALUES.CACHE_DURATION.ACTIVE_DATA_TTL,           // 300秒 - 活跃规则缓存时间
    },
    
    // 性能配置
    performance: {
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.STANDARD_BATCH_SIZE,      // 100个 - 规则批处理大小
      concurrency: SEMANTIC_VALUES.PERFORMANCE_LIMITS.DEFAULT_CONCURRENCY, // 5个 - 规则并发执行数
      timeout: SEMANTIC_VALUES.OPERATION_TIMEOUTS.BATCH_OPERATION_TIMEOUT, // 60000ms - 规则执行超时
    },
    
    // 重试配置
    retry: {
      maxAttempts: SEMANTIC_VALUES.RETRY_POLICIES.MAX_CRITICAL_OPERATION_RETRIES, // 5次 - 关键操作最大重试
      backoffMs: SEMANTIC_VALUES.OPERATION_TIMEOUTS.QUICK_VALIDATION_TIMEOUT,     // 1000ms - 重试间隔
    },
  },

  /**
   * 通知系统配置
   * 告警通知发送、管理、追踪的完整配置
   */
  NOTIFICATION_CONFIG: {
    // 超时配置
    timeouts: {
      normalResponse: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE, // 30秒 - 普通通知响应时间
      criticalResponse: SEMANTIC_VALUES.RESPONSE_TIME.CRITICAL_ALERT_RESPONSE, // 5秒 - 紧急通知响应时间
      emailSend: SEMANTIC_VALUES.OPERATION_TIMEOUTS.EMAIL_SEND_TIMEOUT,    // 30000ms - 邮件发送超时
      smsSend: SEMANTIC_VALUES.OPERATION_TIMEOUTS.SMS_SEND_TIMEOUT,        // 5000ms - 短信发送超时
      webhookCall: SEMANTIC_VALUES.OPERATION_TIMEOUTS.WEBHOOK_CALL_TIMEOUT, // 5000ms - Webhook调用超时
    },
    
    // 重试配置
    retries: {
      maxAttempts: SEMANTIC_VALUES.RETRY_POLICIES.MAX_NOTIFICATION_RETRIES, // 5次 - 通知最大重试次数
      backoffMs: SEMANTIC_VALUES.OPERATION_TIMEOUTS.QUICK_VALIDATION_TIMEOUT, // 1000ms - 重试间隔
    },
    
    // 渠道配置
    channels: {
      default: 'email' as NotificationChannel,
      priority: ['sms', 'email', 'webhook'] as NotificationChannel[],
      fallback: ['email', 'in_app'] as NotificationChannel[],
    },
    
    // 批量配置
    batching: {
      enabled: true,
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.SMALL_BATCH_SIZE,         // 50个 - 通知批量大小
      flushInterval: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE,  // 30秒 - 批量发送间隔
    },
    
    // 限流配置
    rateLimit: {
      enabled: true,
      maxPerMinute: SEMANTIC_VALUES.PERFORMANCE_LIMITS.RATE_LIMIT_PER_MINUTE, // 100个 - 每分钟最大通知数
      burstLimit: SEMANTIC_VALUES.PERFORMANCE_LIMITS.BURST_LIMIT,          // 20个 - 突发通知限制
    },
  },

  /**
   * 性能配置
   * 系统性能、资源管理、负载控制的完整配置
   */
  PERFORMANCE_CONFIG: {
    // 批处理配置
    batching: {
      smallSize: SEMANTIC_VALUES.CAPACITY_LIMITS.SMALL_BATCH_SIZE,         // 50个 - 小批量处理
      standardSize: SEMANTIC_VALUES.CAPACITY_LIMITS.STANDARD_BATCH_SIZE,   // 100个 - 标准批量处理
      largeSize: SEMANTIC_VALUES.CAPACITY_LIMITS.LARGE_BATCH_SIZE,         // 1000个 - 大批量处理
      pageSize: SEMANTIC_VALUES.CAPACITY_LIMITS.DEFAULT_PAGE_SIZE,         // 20个 - 分页大小
    },
    
    // 并发控制
    concurrency: {
      default: SEMANTIC_VALUES.PERFORMANCE_LIMITS.DEFAULT_CONCURRENCY,     // 5个 - 默认并发数
      maximum: SEMANTIC_VALUES.PERFORMANCE_LIMITS.MAX_CONCURRENCY,         // 20个 - 最大并发数
      queueSize: SEMANTIC_VALUES.PERFORMANCE_LIMITS.QUEUE_SIZE_LIMIT,      // 100个 - 队列大小限制
    },
    
    // 连接池配置
    connectionPool: {
      size: SEMANTIC_VALUES.PERFORMANCE_LIMITS.CONNECTION_POOL_SIZE,       // 10个 - 连接池大小
      maxSize: SEMANTIC_VALUES.PERFORMANCE_LIMITS.MAX_CONNECTION_POOL_SIZE, // 20个 - 最大连接池大小
      timeout: SEMANTIC_VALUES.PERFORMANCE_LIMITS.CONNECTION_TIMEOUT,      // 30秒 - 连接超时
    },
    
    // 资源限制
    resources: {
      maxMemoryMB: SEMANTIC_VALUES.PERFORMANCE_LIMITS.MAX_MEMORY_USAGE_MB, // 1000MB - 最大内存使用
      maxCpuPercent: SEMANTIC_VALUES.PERFORMANCE_LIMITS.MAX_CPU_USAGE_PERCENT, // 100% - 最大CPU使用率
    },
    
    // 评估配置
    evaluation: {
      cycle: SEMANTIC_VALUES.RESPONSE_TIME.EVALUATION_CYCLE,               // 60秒 - 评估周期
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.STANDARD_BATCH_SIZE,      // 100个 - 评估批量大小
      timeout: SEMANTIC_VALUES.OPERATION_TIMEOUTS.BATCH_OPERATION_TIMEOUT, // 60000ms - 评估超时
    },
  },

  /**
   * 安全配置
   * 认证、授权、会话管理的完整安全配置
   */
  SECURITY_CONFIG: {
    // 认证配置
    authentication: {
      jwtLifetime: SEMANTIC_VALUES.SECURITY_TIMEOUTS.JWT_TOKEN_LIFETIME,       // 3600秒 - JWT生命周期
      refreshLifetime: SEMANTIC_VALUES.SECURITY_TIMEOUTS.REFRESH_TOKEN_LIFETIME, // 86400秒 - 刷新令牌生命周期
      apiKeyRotation: SEMANTIC_VALUES.SECURITY_TIMEOUTS.API_KEY_ROTATION_CYCLE, // 86400秒 - API密钥轮换周期
    },
    
    // 会话管理
    session: {
      timeout: SEMANTIC_VALUES.RESPONSE_TIME.SESSION_TIMEOUT,              // 30秒 - 会话超时
      idleTimeout: SEMANTIC_VALUES.SECURITY_TIMEOUTS.IDLE_SESSION_TIMEOUT, // 1800秒 - 空闲会话超时
      maxDuration: SEMANTIC_VALUES.SECURITY_TIMEOUTS.MAX_SESSION_DURATION, // 86400秒 - 最大会话持续时间
    },
    
    // 速率限制
    rateLimit: {
      windowSeconds: SEMANTIC_VALUES.SECURITY_TIMEOUTS.RATE_LIMIT_WINDOW,  // 60秒 - 限流窗口
      maxRequests: SEMANTIC_VALUES.PERFORMANCE_LIMITS.RATE_LIMIT_PER_MINUTE, // 100个 - 窗口内最大请求数
      lockoutDuration: SEMANTIC_VALUES.SECURITY_TIMEOUTS.ACCOUNT_LOCKOUT_DURATION, // 1800秒 - 锁定持续时间
    },
    
    // 密码配置
    password: {
      minLength: SEMANTIC_VALUES.STRING_LENGTHS.TAG_MAX_LENGTH / 5,        // 10个字符 - 最小密码长度
      maxLength: SEMANTIC_VALUES.STRING_LENGTHS.MESSAGE_MAX_LENGTH / 8,    // 125个字符 - 最大密码长度
      maxAttempts: SEMANTIC_VALUES.RETRY_POLICIES.MAX_NOTIFICATION_RETRIES, // 5次 - 最大密码尝试次数
    },
    
    // 暴力破解防护
    bruteForce: {
      maxAttempts: SEMANTIC_VALUES.RETRY_POLICIES.MAX_NOTIFICATION_RETRIES, // 5次 - 最大尝试次数
      resetTime: SEMANTIC_VALUES.SECURITY_TIMEOUTS.BRUTE_FORCE_RESET_TIME, // 3600秒 - 重置时间
      lockoutTime: SEMANTIC_VALUES.SECURITY_TIMEOUTS.ACCOUNT_LOCKOUT_DURATION, // 1800秒 - 锁定时间
    },
  },

  /**
   * 数据管理配置
   * 数据保留、清理、归档的完整配置
   */
  DATA_MANAGEMENT_CONFIG: {
    // 保留策略
    retention: {
      alertHistory: SEMANTIC_VALUES.DATA_RETENTION.ALERT_HISTORY_DAYS,     // 90天 - 告警历史保留
      alertMetrics: SEMANTIC_VALUES.DATA_RETENTION.ALERT_METRICS_DAYS,     // 30天 - 告警指标保留
      systemLogs: SEMANTIC_VALUES.DATA_RETENTION.SYSTEM_LOG_DAYS,          // 30天 - 系统日志保留
      errorLogs: SEMANTIC_VALUES.DATA_RETENTION.ERROR_LOG_DAYS,            // 90天 - 错误日志保留
      auditLogs: SEMANTIC_VALUES.DATA_RETENTION.AUDIT_LOG_DAYS,            // 365天 - 审计日志保留
      userActivity: SEMANTIC_VALUES.DATA_RETENTION.USER_ACTIVITY_DAYS,     // 90天 - 用户活动保留
    },
    
    // 缓存策略
    cache: {
      activeTTL: SEMANTIC_VALUES.CACHE_DURATION.ACTIVE_DATA_TTL,           // 300秒 - 活跃数据缓存
      configTTL: SEMANTIC_VALUES.CACHE_DURATION.RULE_CONFIG_TTL,           // 1800秒 - 配置数据缓存
      statsTTL: SEMANTIC_VALUES.CACHE_DURATION.STATISTICAL_DATA_TTL,       // 3600秒 - 统计数据缓存
      historicalTTL: SEMANTIC_VALUES.CACHE_DURATION.HISTORICAL_DATA_TTL,   // 43200秒 - 历史数据缓存
      archivedTTL: SEMANTIC_VALUES.CACHE_DURATION.ARCHIVED_DATA_TTL,       // 86400秒 - 归档数据缓存
    },
    
    // 清理配置
    cleanup: {
      enabled: true,
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.LARGE_BATCH_SIZE,         // 1000个 - 清理批量大小
      interval: SEMANTIC_VALUES.CACHE_DURATION.STATISTICAL_DATA_TTL,       // 3600秒 - 清理间隔
      timeout: SEMANTIC_VALUES.OPERATION_TIMEOUTS.BATCH_OPERATION_TIMEOUT, // 60000ms - 清理超时
    },
    
    // 归档配置
    archival: {
      enabled: true,
      threshold: SEMANTIC_VALUES.DATA_RETENTION.ALERT_HISTORY_DAYS,        // 90天 - 归档阈值
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.STANDARD_BATCH_SIZE,      // 100个 - 归档批量大小
      compression: true,
    },
  },

  /**
   * 验证配置
   * 输入验证、数据校验的完整配置
   */
  VALIDATION_CONFIG: {
    // 字符串验证
    stringLengths: {
      tagMax: SEMANTIC_VALUES.STRING_LENGTHS.TAG_MAX_LENGTH,               // 50 - 标签最大长度
      nameMax: SEMANTIC_VALUES.STRING_LENGTHS.NAME_MAX_LENGTH,             // 100 - 名称最大长度
      descriptionMax: SEMANTIC_VALUES.STRING_LENGTHS.DESCRIPTION_MAX_LENGTH, // 500 - 描述最大长度
      messageMax: SEMANTIC_VALUES.STRING_LENGTHS.MESSAGE_MAX_LENGTH,       // 1000 - 消息最大长度
      templateMax: SEMANTIC_VALUES.STRING_LENGTHS.TEMPLATE_MAX_LENGTH,     // 10000 - 模板最大长度
      urlMax: SEMANTIC_VALUES.STRING_LENGTHS.URL_MAX_LENGTH,               // 2048 - URL最大长度
      emailMax: SEMANTIC_VALUES.STRING_LENGTHS.EMAIL_MAX_LENGTH,           // 320 - 邮箱最大长度
    },
    
    // 数值验证
    numericRanges: {
      timeoutMin: SEMANTIC_VALUES.RESPONSE_TIME.CRITICAL_ALERT_RESPONSE,   // 5秒 - 最小超时时间
      timeoutMax: SEMANTIC_VALUES.RESPONSE_TIME.COOLDOWN_PERIOD,           // 300秒 - 最大超时时间
      retryMin: SEMANTIC_VALUES.RETRY_POLICIES.MAX_VALIDATION_RETRIES,     // 1次 - 最小重试次数
      retryMax: SEMANTIC_VALUES.RETRY_POLICIES.MAX_NOTIFICATION_RETRIES,   // 5次 - 最大重试次数
      batchMin: SEMANTIC_VALUES.CAPACITY_LIMITS.DEFAULT_PAGE_SIZE,         // 20个 - 最小批量大小
      batchMax: SEMANTIC_VALUES.CAPACITY_LIMITS.LARGE_BATCH_SIZE,          // 1000个 - 最大批量大小
    },
    
    // 业务规则验证
    businessRules: {
      maxRulesPerUser: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_RULES_PER_USER,     // 100个 - 单用户最大规则数
      maxConditionsPerRule: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_CONDITIONS_PER_RULE, // 10个 - 单规则最大条件数
      maxActionsPerRule: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_ACTIONS_PER_RULE,        // 5个 - 单规则最大动作数
      maxTagsPerEntity: SEMANTIC_VALUES.CAPACITY_LIMITS.MAX_TAGS_PER_ENTITY,          // 10个 - 单实体最大标签数
    },
    
    // 验证超时
    timeouts: {
      quickValidation: SEMANTIC_VALUES.OPERATION_TIMEOUTS.QUICK_VALIDATION_TIMEOUT, // 1000ms - 快速验证超时
      complexValidation: SEMANTIC_VALUES.OPERATION_TIMEOUTS.DATABASE_QUERY_TIMEOUT, // 5000ms - 复杂验证超时
    },
  },

  /**
   * 监控配置
   * 系统监控、指标收集、健康检查的完整配置
   */
  MONITORING_CONFIG: {
    // 健康检查
    healthCheck: {
      interval: SEMANTIC_VALUES.RESPONSE_TIME.EVALUATION_CYCLE,            // 60秒 - 健康检查间隔
      timeout: SEMANTIC_VALUES.OPERATION_TIMEOUTS.QUICK_VALIDATION_TIMEOUT, // 1000ms - 健康检查超时
      retries: SEMANTIC_VALUES.RETRY_POLICIES.MAX_DATABASE_RETRIES,        // 3次 - 健康检查重试
    },
    
    // 指标收集
    metrics: {
      collectionInterval: SEMANTIC_VALUES.RESPONSE_TIME.EVALUATION_CYCLE,  // 60秒 - 指标收集间隔
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.STANDARD_BATCH_SIZE,      // 100个 - 指标批量大小
      retentionDays: SEMANTIC_VALUES.DATA_RETENTION.ALERT_METRICS_DAYS,    // 30天 - 指标保留天数
    },
    
    // 告警阈值
    thresholds: {
      errorRate: 5,  // 5% - 错误率阈值
      responseTime: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE,   // 30秒 - 响应时间阈值
      memoryUsage: 80, // 80% - 内存使用阈值
      cpuUsage: 80,    // 80% - CPU使用阈值
    },
    
    // 日志配置
    logging: {
      level: 'info',
      retention: SEMANTIC_VALUES.DATA_RETENTION.SYSTEM_LOG_DAYS,           // 30天 - 日志保留天数
      batchSize: SEMANTIC_VALUES.CAPACITY_LIMITS.SMALL_BATCH_SIZE,         // 50个 - 日志批量大小
      flushInterval: SEMANTIC_VALUES.RESPONSE_TIME.NORMAL_ALERT_RESPONSE,  // 30秒 - 日志刷新间隔
    },
  },
});

/**
 * 业务配置类型定义
 */
export type AlertBusinessConfig = typeof ALERT_BUSINESS_CONFIG;

/**
 * 业务配置工具类
 * 提供便捷的配置访问和操作方法
 */
export class BusinessConfigUtil {
  /**
   * 获取指定模块的配置
   */
  static getModuleConfig<T extends keyof AlertBusinessConfig>(module: T): AlertBusinessConfig[T] {
    return ALERT_BUSINESS_CONFIG[module];
  }

  /**
   * 获取告警规则默认配置
   */
  static getRuleDefaults() {
    return { ...ALERT_BUSINESS_CONFIG.RULE_CONFIG.defaults };
  }

  /**
   * 获取通知系统配置
   */
  static getNotificationConfig() {
    return { ...ALERT_BUSINESS_CONFIG.NOTIFICATION_CONFIG };
  }

  /**
   * 获取性能配置
   */
  static getPerformanceConfig() {
    return { ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG };
  }

  /**
   * 获取安全配置
   */
  static getSecurityConfig() {
    return { ...ALERT_BUSINESS_CONFIG.SECURITY_CONFIG };
  }

  /**
   * 获取数据管理配置
   */
  static getDataManagementConfig() {
    return { ...ALERT_BUSINESS_CONFIG.DATA_MANAGEMENT_CONFIG };
  }

  /**
   * 获取验证配置
   */
  static getValidationConfig() {
    return { ...ALERT_BUSINESS_CONFIG.VALIDATION_CONFIG };
  }

  /**
   * 获取监控配置
   */
  static getMonitoringConfig() {
    return { ...ALERT_BUSINESS_CONFIG.MONITORING_CONFIG };
  }

  /**
   * 验证配置的一致性
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证超时配置的合理性
    const ruleTimeout = ALERT_BUSINESS_CONFIG.RULE_CONFIG.performance.timeout;
    const notificationTimeout = ALERT_BUSINESS_CONFIG.NOTIFICATION_CONFIG.timeouts.normalResponse * 1000;
    
    if (ruleTimeout < notificationTimeout) {
      errors.push('规则执行超时时间不应小于通知超时时间');
    }

    // 验证批量大小的合理性
    const smallBatch = ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG.batching.smallSize;
    const standardBatch = ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG.batching.standardSize;
    const largeBatch = ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG.batching.largeSize;

    if (smallBatch >= standardBatch || standardBatch >= largeBatch) {
      errors.push('批量大小配置不合理：small < standard < large');
    }

    // 验证重试配置的合理性
    const maxRetries = ALERT_BUSINESS_CONFIG.RULE_CONFIG.retry.maxAttempts;
    const notificationRetries = ALERT_BUSINESS_CONFIG.NOTIFICATION_CONFIG.retries.maxAttempts;

    if (maxRetries < notificationRetries) {
      errors.push('规则重试次数不应小于通知重试次数');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成配置摘要
   */
  static getConfigurationSummary(): string {
    const config = ALERT_BUSINESS_CONFIG;
    
    return `Alert业务配置摘要:
📋 规则配置:
  - 默认持续时间: ${config.RULE_CONFIG.defaults.duration}秒
  - 默认冷却期: ${config.RULE_CONFIG.defaults.cooldown}秒
  - 最大规则数/用户: ${config.RULE_CONFIG.limits.maxPerUser}个
  - 最大条件数/规则: ${config.RULE_CONFIG.limits.maxConditions}个

📧 通知配置:
  - 普通响应时间: ${config.NOTIFICATION_CONFIG.timeouts.normalResponse}秒
  - 紧急响应时间: ${config.NOTIFICATION_CONFIG.timeouts.criticalResponse}秒
  - 最大重试次数: ${config.NOTIFICATION_CONFIG.retries.maxAttempts}次

⚡ 性能配置:
  - 标准批量大小: ${config.PERFORMANCE_CONFIG.batching.standardSize}个
  - 默认并发数: ${config.PERFORMANCE_CONFIG.concurrency.default}个
  - 连接池大小: ${config.PERFORMANCE_CONFIG.connectionPool.size}个

🔒 安全配置:
  - JWT生命周期: ${config.SECURITY_CONFIG.authentication.jwtLifetime}秒
  - 会话超时: ${config.SECURITY_CONFIG.session.timeout}秒
  - 速率限制窗口: ${config.SECURITY_CONFIG.rateLimit.windowSeconds}秒

🗄️ 数据管理:
  - 告警历史保留: ${config.DATA_MANAGEMENT_CONFIG.retention.alertHistory}天
  - 系统日志保留: ${config.DATA_MANAGEMENT_CONFIG.retention.systemLogs}天
  - 活跃数据缓存: ${config.DATA_MANAGEMENT_CONFIG.cache.activeTTL}秒`;
  }

  /**
   * 根据环境获取调整后的配置
   */
  static getEnvironmentConfig(environment: 'development' | 'production' | 'test'): Partial<AlertBusinessConfig> {
    const envAdjustments = {
      development: {
        PERFORMANCE_CONFIG: {
          ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG,
          batching: {
            ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG.batching,
            smallSize: 10,  // 开发环境使用更小的批量
            standardSize: 20,
          },
        },
        DATA_MANAGEMENT_CONFIG: {
          ...ALERT_BUSINESS_CONFIG.DATA_MANAGEMENT_CONFIG,
          cache: {
            ...ALERT_BUSINESS_CONFIG.DATA_MANAGEMENT_CONFIG.cache,
            activeTTL: 60,  // 开发环境使用更短的缓存时间
          },
        },
      },
      production: {
        PERFORMANCE_CONFIG: {
          ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG,
          concurrency: {
            ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG.concurrency,
            default: 10,  // 生产环境使用更高的并发
            maximum: 50,
          },
        },
      },
      test: {
        PERFORMANCE_CONFIG: {
          ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG,
          batching: {
            ...ALERT_BUSINESS_CONFIG.PERFORMANCE_CONFIG.batching,
            smallSize: 5,   // 测试环境使用最小的批量
            standardSize: 10,
            largeSize: 50,
          },
        },
        DATA_MANAGEMENT_CONFIG: {
          ...ALERT_BUSINESS_CONFIG.DATA_MANAGEMENT_CONFIG,
          retention: {
            ...ALERT_BUSINESS_CONFIG.DATA_MANAGEMENT_CONFIG.retention,
            alertHistory: 7,    // 测试环境使用更短的保留期
            systemLogs: 3,
          },
        },
      },
    };

    return envAdjustments[environment] || {};
  }
}

// 导出快捷访问
export const {
  RULE_CONFIG,
  NOTIFICATION_CONFIG,
  PERFORMANCE_CONFIG,
  SECURITY_CONFIG,
  DATA_MANAGEMENT_CONFIG,
  VALIDATION_CONFIG,
  MONITORING_CONFIG,
} = ALERT_BUSINESS_CONFIG;