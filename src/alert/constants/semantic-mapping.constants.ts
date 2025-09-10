/**
 * 语义映射层 - 将基础数值映射到具体业务语义
 * 🎯 每个业务场景使用什么数值，在这里明确定义
 * 📊 基于现有Alert系统的业务分析，提供清晰的语义映射
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 */

import { BASE_VALUES } from './base-values.constants';

/**
 * 语义化数值映射
 * 将抽象的基础数值映射到具体的业务语义
 */
export const SEMANTIC_VALUES = Object.freeze({

  /**
   * 响应时间语义映射
   * 基于告警系统的响应时间要求
   */
  RESPONSE_TIME: {
    CRITICAL_ALERT_RESPONSE: BASE_VALUES.SECONDS.QUICK,      // 5秒 - 严重告警必须快速响应
    NORMAL_ALERT_RESPONSE: BASE_VALUES.SECONDS.SHORT,       // 30秒 - 普通告警响应时间
    BATCH_PROCESSING_CYCLE: BASE_VALUES.SECONDS.MINUTE,     // 60秒 - 批处理执行周期
    COOLDOWN_PERIOD: BASE_VALUES.SECONDS.MEDIUM,            // 300秒 - 告警冷却周期，避免重复通知
    EVALUATION_CYCLE: BASE_VALUES.SECONDS.MINUTE,           // 60秒 - 规则评估周期
    SESSION_TIMEOUT: BASE_VALUES.SECONDS.SHORT,             // 30秒 - 会话超时
  },

  /**
   * 容量限制语义映射
   * 基于系统性能和用户体验的容量设计
   */
  CAPACITY_LIMITS: {
    // 规则相关容量
    MAX_ACTIONS_PER_RULE: BASE_VALUES.QUANTITIES.FEW,       // 5个 - 单规则最大动作数，避免过度复杂
    MAX_CONDITIONS_PER_RULE: BASE_VALUES.QUANTITIES.SMALL,  // 10个 - 单规则最大条件数，保持逻辑清晰
    MAX_TAGS_PER_ENTITY: BASE_VALUES.QUANTITIES.SMALL,      // 10个 - 单实体最大标签数
    
    // 用户相关容量
    MAX_RULES_PER_USER: BASE_VALUES.QUANTITIES.LARGE,       // 100个 - 单用户最大规则数，防止滥用
    
    // 分页和显示容量
    DEFAULT_PAGE_SIZE: BASE_VALUES.QUANTITIES.NORMAL,       // 20个 - 默认分页大小，平衡性能和体验
    MAX_QUERY_RESULTS: BASE_VALUES.QUANTITIES.LARGE,        // 100个 - 单次查询最大结果数
    
    // 批处理容量
    SMALL_BATCH_SIZE: BASE_VALUES.QUANTITIES.MEDIUM,        // 50个 - 小批量操作
    STANDARD_BATCH_SIZE: BASE_VALUES.QUANTITIES.LARGE,      // 100个 - 标准批量操作
    LARGE_BATCH_SIZE: BASE_VALUES.QUANTITIES.HUGE,          // 1000个 - 大批量操作，后台处理
    BATCH_PROCESSING_SIZE: BASE_VALUES.QUANTITIES.HUGE,     // 1000个 - 批处理大小
    
    // 活跃数据容量
    MAX_ACTIVE_ALERTS: BASE_VALUES.QUANTITIES.MAXIMUM,      // 10000个 - 最大活跃告警数
    MAX_CONCURRENT_OPERATIONS: BASE_VALUES.QUANTITIES.NORMAL, // 20个 - 最大并发操作数
  },

  /**
   * 缓存时间语义映射
   * 基于数据变化频率和查询模式的缓存策略
   */
  CACHE_DURATION: {
    // 实时数据缓存（变化频繁）
    ACTIVE_DATA_TTL: BASE_VALUES.SECONDS.MEDIUM,            // 300秒 - 活跃告警数据缓存
    REAL_TIME_STATS_TTL: BASE_VALUES.SECONDS.MEDIUM,        // 300秒 - 实时统计数据缓存
    
    // 配置数据缓存（变化较少）
    RULE_CONFIG_TTL: BASE_VALUES.SECONDS.HALF_HOUR,         // 1800秒 - 规则配置缓存
    USER_SETTINGS_TTL: BASE_VALUES.SECONDS.HALF_HOUR,       // 1800秒 - 用户设置缓存
    
    // 统计数据缓存（可容忍延迟）
    STATISTICAL_DATA_TTL: BASE_VALUES.SECONDS.HOUR,         // 3600秒 - 统计数据缓存
    REPORT_DATA_TTL: BASE_VALUES.SECONDS.HOUR,              // 3600秒 - 报表数据缓存
    
    // 历史数据缓存（变化很少）
    HISTORICAL_DATA_TTL: BASE_VALUES.SECONDS.HALF_DAY,      // 43200秒 - 历史数据缓存
    ARCHIVED_DATA_TTL: BASE_VALUES.SECONDS.DAY,             // 86400秒 - 归档数据缓存
  },

  /**
   * 安全相关语义映射
   * 基于安全策略和合规要求的时间设计
   */
  SECURITY_TIMEOUTS: {
    // 认证相关
    JWT_TOKEN_LIFETIME: BASE_VALUES.SECONDS.HOUR,           // 3600秒 - JWT令牌生命周期
    REFRESH_TOKEN_LIFETIME: BASE_VALUES.SECONDS.DAY,        // 86400秒 - 刷新令牌生命周期
    API_KEY_ROTATION_CYCLE: BASE_VALUES.SECONDS.DAY,        // 86400秒 - API密钥轮换周期
    
    // 锁定和限制
    ACCOUNT_LOCKOUT_DURATION: BASE_VALUES.SECONDS.HALF_HOUR, // 1800秒 - 账户锁定时长
    RATE_LIMIT_WINDOW: BASE_VALUES.SECONDS.MINUTE,          // 60秒 - 速率限制窗口
    BRUTE_FORCE_RESET_TIME: BASE_VALUES.SECONDS.HOUR,       // 3600秒 - 暴力破解重置时间
    
    // 会话管理
    IDLE_SESSION_TIMEOUT: BASE_VALUES.SECONDS.HALF_HOUR,    // 1800秒 - 空闲会话超时
    MAX_SESSION_DURATION: BASE_VALUES.SECONDS.DAY,          // 86400秒 - 最大会话持续时间
  },

  /**
   * 重试机制语义映射
   * 基于不同操作类型的可靠性要求
   */
  RETRY_POLICIES: {
    // 关键操作重试
    MAX_NOTIFICATION_RETRIES: BASE_VALUES.QUANTITIES.FEW,   // 5次 - 通知发送最大重试
    MAX_CRITICAL_OPERATION_RETRIES: BASE_VALUES.QUANTITIES.FEW, // 5次 - 关键操作最大重试
    
    // 一般操作重试
    MAX_DATABASE_RETRIES: BASE_VALUES.SPECIAL.DEFAULT_RETRY_COUNT, // 3次 - 数据库操作重试
    MAX_API_RETRIES: BASE_VALUES.SPECIAL.DEFAULT_RETRY_COUNT,      // 3次 - API调用重试
    MAX_CACHE_RETRIES: BASE_VALUES.SPECIAL.DEFAULT_RETRY_COUNT,    // 3次 - 缓存操作重试
    
    // 轻量操作重试
    MAX_VALIDATION_RETRIES: BASE_VALUES.QUANTITIES.MINIMAL, // 1次 - 验证操作重试
    MAX_LOGGING_RETRIES: BASE_VALUES.QUANTITIES.MINIMAL,    // 1次 - 日志记录重试
  },

  /**
   * 字符串长度语义映射
   * 基于用户体验和存储效率的长度设计
   */
  STRING_LENGTHS: {
    // 标识符长度
    TAG_MAX_LENGTH: BASE_VALUES.SPECIAL.TAG_LENGTH_LIMIT,         // 50 - 标签最大长度，简洁明了
    NAME_MAX_LENGTH: BASE_VALUES.SPECIAL.NAME_LENGTH_LIMIT,       // 100 - 名称最大长度，适合显示
    IDENTIFIER_MAX_LENGTH: BASE_VALUES.SPECIAL.TAG_LENGTH_LIMIT,  // 50 - 标识符最大长度
    
    // 内容长度
    DESCRIPTION_MAX_LENGTH: BASE_VALUES.QUANTITIES.MEDIUM * 10,   // 500 - 描述最大长度
    MESSAGE_MAX_LENGTH: BASE_VALUES.SPECIAL.MESSAGE_LENGTH_LIMIT, // 1000 - 消息最大长度
    COMMENT_MAX_LENGTH: BASE_VALUES.SPECIAL.MESSAGE_LENGTH_LIMIT, // 1000 - 评论最大长度
    
    // 模板和配置长度
    TEMPLATE_MAX_LENGTH: BASE_VALUES.SPECIAL.TEMPLATE_LENGTH_LIMIT, // 10000 - 模板最大长度
    CONFIG_MAX_LENGTH: BASE_VALUES.SPECIAL.TEMPLATE_LENGTH_LIMIT,   // 10000 - 配置最大长度
    
    // 网络相关长度
    URL_MAX_LENGTH: BASE_VALUES.SPECIAL.URL_LENGTH_LIMIT,         // 2048 - URL最大长度
    EMAIL_MAX_LENGTH: BASE_VALUES.SPECIAL.EMAIL_LENGTH_LIMIT,     // 320 - 邮箱最大长度
  },

  /**
   * 数据保留语义映射
   * 基于法规要求和存储成本的保留策略
   */
  DATA_RETENTION: {
    // 告警数据保留
    ALERT_HISTORY_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_90,  // 90天 - 告警历史保留期
    ALERT_METRICS_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_30,  // 30天 - 告警指标保留期
    
    // 系统日志保留
    SYSTEM_LOG_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_30,     // 30天 - 系统日志保留期
    ERROR_LOG_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_90,      // 90天 - 错误日志保留期
    AUDIT_LOG_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_365,     // 365天 - 审计日志保留期
    
    // 通知数据保留
    NOTIFICATION_LOG_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_30, // 30天 - 通知日志保留期
    DELIVERY_STATUS_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_30,  // 30天 - 投递状态保留期
    
    // 用户数据保留
    USER_ACTIVITY_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_90,   // 90天 - 用户活动保留期
    SESSION_LOG_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_30,     // 30天 - 会话日志保留期
    
    // 归档数据保留
    ARCHIVED_DATA_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_365,  // 365天 - 归档数据保留期
    BACKUP_DATA_DAYS: BASE_VALUES.SPECIAL.RETENTION_DAYS_365,    // 365天 - 备份数据保留期
  },

  /**
   * 操作超时语义映射
   * 基于用户体验和系统性能的超时设计
   */
  OPERATION_TIMEOUTS: {
    // 快速操作超时（毫秒）
    QUICK_VALIDATION_TIMEOUT: BASE_VALUES.MILLISECONDS.INSTANT,  // 1000ms - 快速验证超时
    CACHE_OPERATION_TIMEOUT: BASE_VALUES.MILLISECONDS.QUICK,     // 5000ms - 缓存操作超时
    
    // 标准操作超时（毫秒）
    DATABASE_QUERY_TIMEOUT: BASE_VALUES.MILLISECONDS.QUICK,      // 5000ms - 数据库查询超时
    API_REQUEST_TIMEOUT: BASE_VALUES.MILLISECONDS.SHORT,         // 30000ms - API请求超时
    
    // 长时间操作超时（毫秒）
    BATCH_OPERATION_TIMEOUT: BASE_VALUES.MILLISECONDS.MINUTE,    // 60000ms - 批量操作超时
    REPORT_GENERATION_TIMEOUT: BASE_VALUES.MILLISECONDS.MEDIUM,  // 300000ms - 报表生成超时
    DATA_EXPORT_TIMEOUT: BASE_VALUES.MILLISECONDS.LONG,          // 600000ms - 数据导出超时
    
    // 通知操作超时（毫秒）
    EMAIL_SEND_TIMEOUT: BASE_VALUES.MILLISECONDS.SHORT,          // 30000ms - 邮件发送超时
    SMS_SEND_TIMEOUT: BASE_VALUES.MILLISECONDS.QUICK,            // 5000ms - 短信发送超时
    WEBHOOK_CALL_TIMEOUT: BASE_VALUES.MILLISECONDS.QUICK,        // 5000ms - Webhook调用超时
  },

  /**
   * 网络和并发语义映射
   * 基于系统负载和资源管理的配置
   */
  PERFORMANCE_LIMITS: {
    // 并发控制
    DEFAULT_CONCURRENCY: BASE_VALUES.SPECIAL.DEFAULT_CONCURRENCY, // 5 - 默认并发数
    MAX_CONCURRENCY: BASE_VALUES.SPECIAL.MAX_CONCURRENCY,         // 20 - 最大并发数
    QUEUE_SIZE_LIMIT: BASE_VALUES.QUANTITIES.LARGE,               // 100 - 队列大小限制
    
    // 连接池配置
    CONNECTION_POOL_SIZE: BASE_VALUES.QUANTITIES.SMALL,           // 10 - 连接池大小
    MAX_CONNECTION_POOL_SIZE: BASE_VALUES.QUANTITIES.NORMAL,      // 20 - 最大连接池大小
    CONNECTION_TIMEOUT: BASE_VALUES.SECONDS.SHORT,                // 30秒 - 连接超时
    
    // 请求限制
    RATE_LIMIT_PER_MINUTE: BASE_VALUES.QUANTITIES.LARGE,          // 100 - 每分钟请求限制
    BURST_LIMIT: BASE_VALUES.QUANTITIES.NORMAL,                   // 20 - 突发请求限制
    
    // 资源限制
    MAX_MEMORY_USAGE_MB: BASE_VALUES.QUANTITIES.HUGE,             // 1000MB - 最大内存使用
    MAX_CPU_USAGE_PERCENT: BASE_VALUES.SPECIAL.PERCENTAGE_MAX,    // 100% - 最大CPU使用率
  },
});

/**
 * 语义值类型定义
 */
export type SemanticValues = typeof SEMANTIC_VALUES;

/**
 * 语义映射验证工具
 * 确保语义映射的正确性和一致性
 */
export class SemanticMappingValidator {
  /**
   * 验证所有语义映射都指向有效的基础数值
   */
  static validateMappings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 递归检查所有语义值是否都引用了基础值
    const checkValue = (obj: any, path: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'number') {
          // 检查数值是否在基础值中定义
          const isBaseValue = this.isDefinedInBaseValues(value);
          if (!isBaseValue) {
            errors.push(`语义值 ${currentPath} = ${value} 未在基础值中定义`);
          }
        } else if (typeof value === 'object' && value !== null) {
          checkValue(value, currentPath);
        }
      }
    };

    checkValue(SEMANTIC_VALUES);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查数值是否在基础值中定义
   */
  private static isDefinedInBaseValues(value: number): boolean {
    const checkInObject = (obj: any): boolean => {
      for (const val of Object.values(obj)) {
        if (typeof val === 'number' && val === value) {
          return true;
        } else if (typeof val === 'object' && val !== null) {
          if (checkInObject(val)) {
            return true;
          }
        }
      }
      return false;
    };

    return checkInObject(BASE_VALUES);
  }

  /**
   * 获取语义映射统计信息
   */
  static getStatistics(): Record<string, number> {
    const stats = {
      总语义分类: Object.keys(SEMANTIC_VALUES).length,
      响应时间映射: Object.keys(SEMANTIC_VALUES.RESPONSE_TIME).length,
      容量限制映射: Object.keys(SEMANTIC_VALUES.CAPACITY_LIMITS).length,
      缓存时间映射: Object.keys(SEMANTIC_VALUES.CACHE_DURATION).length,
      安全超时映射: Object.keys(SEMANTIC_VALUES.SECURITY_TIMEOUTS).length,
      重试策略映射: Object.keys(SEMANTIC_VALUES.RETRY_POLICIES).length,
      字符串长度映射: Object.keys(SEMANTIC_VALUES.STRING_LENGTHS).length,
      数据保留映射: Object.keys(SEMANTIC_VALUES.DATA_RETENTION).length,
      操作超时映射: Object.keys(SEMANTIC_VALUES.OPERATION_TIMEOUTS).length,
      性能限制映射: Object.keys(SEMANTIC_VALUES.PERFORMANCE_LIMITS).length,
    };

    return stats;
  }

  /**
   * 生成语义映射报告
   */
  static generateReport(): string {
    const stats = this.getStatistics();
    const validation = this.validateMappings();

    return `Alert语义映射报告:
${Object.entries(stats).map(([key, value]) => `- ${key}: ${value}个`).join('\n')}

验证结果: ${validation.isValid ? '✅ 通过' : '❌ 失败'}
${validation.errors.length > 0 ? `错误:\n${validation.errors.map(e => `  - ${e}`).join('\n')}` : ''}`;
  }
}

// 导出快捷访问
export const {
  RESPONSE_TIME,
  CAPACITY_LIMITS,
  CACHE_DURATION,
  SECURITY_TIMEOUTS,
  RETRY_POLICIES,
  STRING_LENGTHS,
  DATA_RETENTION,
  OPERATION_TIMEOUTS,
  PERFORMANCE_LIMITS,
} = SEMANTIC_VALUES;