/**
 * Alert常量统一导出入口
 * 🎯 清洁的新架构导出，无向后兼容包袱
 * 📊 三层架构：基础数值 → 语义映射 → 业务配置
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 * @cleaned 2025-01-10
 */

// ================================
// 内部导入（用于验证器和默认导出）
// ================================
import { BASE_VALUES, BaseValueValidator } from './base-values.constants';
import { SEMANTIC_VALUES, SemanticMappingValidator } from './semantic-mapping.constants';
import { ALERT_BUSINESS_CONFIG, BusinessConfigUtil } from './business-config.constants';
import { AlertSeverity } from './enums';

// ================================
// 三层架构核心导出
// ================================

// 第一层：基础数值层
export { 
  BASE_VALUES,
  SECONDS,
  QUANTITIES, 
  SPECIAL,
  MILLISECONDS,
  BaseValueValidator,
  BaseTimeConverter,
} from './base-values.constants';
export type { BaseValues } from './base-values.constants';

// 第二层：语义映射层
export { 
  SEMANTIC_VALUES,
  RESPONSE_TIME,
  CAPACITY_LIMITS,
  CACHE_DURATION,
  SECURITY_TIMEOUTS,
  RETRY_POLICIES,
  STRING_LENGTHS,
  DATA_RETENTION,
  OPERATION_TIMEOUTS,
  PERFORMANCE_LIMITS,
  SemanticMappingValidator,
} from './semantic-mapping.constants';
export type { SemanticValues } from './semantic-mapping.constants';

// 第三层：业务配置层
export { 
  ALERT_BUSINESS_CONFIG,
  RULE_CONFIG,
  NOTIFICATION_CONFIG,
  PERFORMANCE_CONFIG,
  SECURITY_CONFIG,
  DATA_MANAGEMENT_CONFIG,
  VALIDATION_CONFIG,
  MONITORING_CONFIG,
  BusinessConfigUtil,
} from './business-config.constants';
export type { AlertBusinessConfig } from './business-config.constants';

// ================================
// 业务枚举和消息导出（保留原有）
// ================================

// 枚举定义
export { AlertSeverity, AlertStatus, AlertType, NotificationChannel } from './enums';

// 消息模板
export { 
  ALERT_MESSAGES, 
  ALERT_NOTIFICATION_TEMPLATES,
  ALERT_HISTORY_MESSAGES,
  AlertMessageUtil,
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  ALERT_OPERATIONS,
  ALERT_METRICS,
  OPERATOR_SYMBOLS,
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_ERROR_TEMPLATES,
} from './messages';

// 工具类
export { AlertRuleUtil } from '../utils/rule.utils';

// ================================
// 操作符常量（在快捷访问之前定义）
// ================================

/**
 * 有效操作符列表
 */
export const VALID_OPERATORS = ['>', '>=', '<', '<=', '==', '!=', 'contains', 'not_contains', 'regex'] as const;

/**
 * 操作符类型定义
 */
export type Operator = typeof VALID_OPERATORS[number];

// ================================
// 快捷访问导出
// ================================

/**
 * 最常用数值的快捷访问
 * 🎯 为开发者提供便捷的常用数值访问方式
 */
export const ALERT_QUICK_ACCESS = Object.freeze({
  
  // 时间快捷访问（秒）
  TIME: {
    INSTANT: 1,                    // 1秒 - 即时响应
    QUICK_RESPONSE: 5,             // 5秒 - 快速响应（紧急告警）
    NORMAL_RESPONSE: 30,           // 30秒 - 正常响应（普通告警）
    EVALUATION_CYCLE: 60,          // 60秒 - 规则评估周期
    COOLDOWN_PERIOD: 300,          // 300秒 - 告警冷却期
    CONFIG_CACHE_TTL: 1800,        // 1800秒 - 配置缓存时间
    STATS_CACHE_TTL: 3600,         // 3600秒 - 统计缓存时间
    JWT_LIFETIME: 3600,            // 3600秒 - JWT生命周期
    SESSION_LIFETIME: 86400,       // 86400秒 - 会话生命周期
  },
  
  // 容量快捷访问（个数）
  LIMITS: {
    ACTIONS_PER_RULE: 5,           // 5个 - 单规则最大动作数
    CONDITIONS_PER_RULE: 10,       // 10个 - 单规则最大条件数
    TAGS_PER_ENTITY: 10,           // 10个 - 单实体最大标签数
    PAGE_SIZE: 20,                 // 20个 - 默认分页大小
    SMALL_BATCH: 50,               // 50个 - 小批量操作
    STANDARD_BATCH: 100,           // 100个 - 标准批量操作
    RULES_PER_USER: 100,           // 100个 - 单用户最大规则数
    LARGE_BATCH: 1000,             // 1000个 - 大批量操作
    MAX_ACTIVE_ALERTS: 10000,      // 10000个 - 最大活跃告警数
  },

  // 超时快捷访问（毫秒）
  TIMEOUTS: {
    QUICK_VALIDATION: 1000,        // 1000ms - 快速验证
    CACHE_OPERATION: 5000,         // 5000ms - 缓存操作
    DATABASE_QUERY: 5000,          // 5000ms - 数据库查询
    SMS_SEND: 5000,                // 5000ms - 短信发送
    EMAIL_SEND: 30000,             // 30000ms - 邮件发送
    API_REQUEST: 30000,            // 30000ms - API请求
    BATCH_OPERATION: 60000,        // 60000ms - 批量操作
    REPORT_GENERATION: 300000,     // 300000ms - 报表生成
    DATA_EXPORT: 600000,           // 600000ms - 数据导出
  },

  // 重试快捷访问（次数）
  RETRIES: {
    MINIMAL: 1,                    // 1次 - 轻量操作重试
    STANDARD: 3,                   // 3次 - 标准操作重试
    CRITICAL: 5,                   // 5次 - 关键操作重试
    MAX_ALLOWED: 10,               // 10次 - 最大允许重试
  },

  // 字符串长度快捷访问（字符数）
  STRING_LENGTHS: {
    TAG_MAX: 50,                   // 50 - 标签最大长度
    NAME_MAX: 100,                 // 100 - 名称最大长度
    DESCRIPTION_MAX: 500,          // 500 - 描述最大长度
    MESSAGE_MAX: 1000,             // 1000 - 消息最大长度
    TEMPLATE_MAX: 10000,           // 10000 - 模板最大长度
    URL_MAX: 2048,                 // 2048 - URL最大长度
    EMAIL_MAX: 320,                // 320 - 邮箱最大长度
  },

  // 数据保留快捷访问（天数）
  RETENTION: {
    METRICS_DAYS: 30,              // 30天 - 指标数据保留
    ALERT_HISTORY_DAYS: 90,        // 90天 - 告警历史保留
    ARCHIVE_DAYS: 365,             // 365天 - 归档数据保留
  },

  // 性能配置快捷访问
  PERFORMANCE: {
    DEFAULT_CONCURRENCY: 5,        // 5个 - 默认并发数
    MAX_CONCURRENCY: 20,           // 20个 - 最大并发数
    CONNECTION_POOL_SIZE: 10,      // 10个 - 连接池大小
    QUEUE_SIZE_LIMIT: 100,         // 100个 - 队列大小限制
    RATE_LIMIT_PER_MINUTE: 100,    // 100个 - 每分钟请求限制
  },
});

/**
 * 常用配置组合的快捷访问
 * 🎯 提供常见业务场景的配置组合
 */
export const ALERT_CONFIG_PRESETS = Object.freeze({
  
  /**
   * 规则配置预设
   */
  RULE_PRESETS: {
    // 快速规则配置
    QUICK: {
      duration: ALERT_QUICK_ACCESS.TIME.NORMAL_RESPONSE,
      cooldown: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,
      maxConditions: 3,
      maxActions: 2,
    },
    
    // 标准规则配置
    STANDARD: {
      duration: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE,
      cooldown: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,
      maxConditions: ALERT_QUICK_ACCESS.LIMITS.CONDITIONS_PER_RULE,
      maxActions: ALERT_QUICK_ACCESS.LIMITS.ACTIONS_PER_RULE,
    },
    
    // 复杂规则配置
    COMPLEX: {
      duration: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE * 2,
      cooldown: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD * 2,
      maxConditions: ALERT_QUICK_ACCESS.LIMITS.CONDITIONS_PER_RULE,
      maxActions: ALERT_QUICK_ACCESS.LIMITS.ACTIONS_PER_RULE,
    },
  },

  /**
   * 通知配置预设
   */
  NOTIFICATION_PRESETS: {
    // 即时通知
    INSTANT: {
      timeout: ALERT_QUICK_ACCESS.TIMEOUTS.SMS_SEND,
      retries: ALERT_QUICK_ACCESS.RETRIES.CRITICAL,
      channels: ['sms', 'webhook'],
    },
    
    // 标准通知
    STANDARD: {
      timeout: ALERT_QUICK_ACCESS.TIMEOUTS.EMAIL_SEND,
      retries: ALERT_QUICK_ACCESS.RETRIES.STANDARD,
      channels: ['email', 'in_app'],
    },
    
    // 批量通知
    BATCH: {
      timeout: ALERT_QUICK_ACCESS.TIMEOUTS.BATCH_OPERATION,
      retries: ALERT_QUICK_ACCESS.RETRIES.MINIMAL,
      batchSize: ALERT_QUICK_ACCESS.LIMITS.SMALL_BATCH,
    },
  },

  /**
   * 性能配置预设
   */
  PERFORMANCE_PRESETS: {
    // 高性能配置
    HIGH_PERFORMANCE: {
      concurrency: ALERT_QUICK_ACCESS.PERFORMANCE.MAX_CONCURRENCY,
      batchSize: ALERT_QUICK_ACCESS.LIMITS.LARGE_BATCH,
      timeout: ALERT_QUICK_ACCESS.TIMEOUTS.QUICK_VALIDATION,
    },
    
    // 平衡配置
    BALANCED: {
      concurrency: ALERT_QUICK_ACCESS.PERFORMANCE.DEFAULT_CONCURRENCY,
      batchSize: ALERT_QUICK_ACCESS.LIMITS.STANDARD_BATCH,
      timeout: ALERT_QUICK_ACCESS.TIMEOUTS.DATABASE_QUERY,
    },
    
    // 资源节约配置
    CONSERVATIVE: {
      concurrency: 3,
      batchSize: ALERT_QUICK_ACCESS.LIMITS.SMALL_BATCH,
      timeout: ALERT_QUICK_ACCESS.TIMEOUTS.API_REQUEST,
    },
  },
});

/**
 * 环境特定配置
 * 🎯 根据不同环境提供调整后的配置
 */
export const ALERT_ENV_CONFIG = Object.freeze({
  
  // 开发环境配置
  DEVELOPMENT: {
    cacheEnabled: false,
    batchSize: ALERT_QUICK_ACCESS.LIMITS.PAGE_SIZE,
    timeout: ALERT_QUICK_ACCESS.TIMEOUTS.QUICK_VALIDATION,
    retentionDays: 7,
    logLevel: 'debug',
  },
  
  // 测试环境配置
  TEST: {
    cacheEnabled: false,
    batchSize: 5,
    timeout: ALERT_QUICK_ACCESS.TIMEOUTS.QUICK_VALIDATION,
    retentionDays: 1,
    logLevel: 'info',
  },
  
  // 生产环境配置
  PRODUCTION: {
    cacheEnabled: true,
    batchSize: ALERT_QUICK_ACCESS.LIMITS.LARGE_BATCH,
    timeout: ALERT_QUICK_ACCESS.TIMEOUTS.BATCH_OPERATION,
    retentionDays: ALERT_QUICK_ACCESS.RETENTION.ALERT_HISTORY_DAYS,
    logLevel: 'warn',
  },
});

// ================================
// DTO支持常量（在快捷访问之后定义）
// ================================

/**
 * 验证限制常量
 */
export const VALIDATION_LIMITS = Object.freeze({
  NAME_MAX_LENGTH: ALERT_QUICK_ACCESS.STRING_LENGTHS.NAME_MAX,           // 100
  DESCRIPTION_MAX_LENGTH: ALERT_QUICK_ACCESS.STRING_LENGTHS.DESCRIPTION_MAX, // 500
  TAG_MAX_LENGTH: ALERT_QUICK_ACCESS.STRING_LENGTHS.TAG_MAX,             // 50
  CONDITIONS_PER_RULE: ALERT_QUICK_ACCESS.LIMITS.CONDITIONS_PER_RULE,    // 10
  ACTIONS_PER_RULE: ALERT_QUICK_ACCESS.LIMITS.ACTIONS_PER_RULE,          // 5
  RULES_PER_USER: ALERT_QUICK_ACCESS.LIMITS.RULES_PER_USER,              // 100
  DURATION_MIN: ALERT_QUICK_ACCESS.TIME.NORMAL_RESPONSE,                 // 30秒
  DURATION_MAX: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE * 10,           // 600秒
  COOLDOWN_MIN: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,                 // 300秒
  COOLDOWN_MAX: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD * 10,            // 3000秒
  TIMEOUT_MIN: ALERT_QUICK_ACCESS.TIMEOUTS.QUICK_VALIDATION,             // 1000ms
  TIMEOUT_MAX: ALERT_QUICK_ACCESS.TIMEOUTS.BATCH_OPERATION,              // 60000ms
  RETRIES_MIN: ALERT_QUICK_ACCESS.RETRIES.MINIMAL,                       // 1次
  RETRIES_MAX: ALERT_QUICK_ACCESS.RETRIES.MAX_ALLOWED,                   // 10次
});

/**
 * 告警默认值常量
 */
export const ALERT_DEFAULTS = Object.freeze({
  EVALUATION_INTERVAL: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE,         // 60秒
  COOLDOWN_PERIOD: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,              // 300秒
  MAX_CONDITIONS: ALERT_QUICK_ACCESS.LIMITS.CONDITIONS_PER_RULE,         // 10
  MAX_ACTIONS: ALERT_QUICK_ACCESS.LIMITS.ACTIONS_PER_RULE,               // 5
  BATCH_SIZE: ALERT_QUICK_ACCESS.LIMITS.STANDARD_BATCH,                  // 100
  TIMEOUT_DEFAULT: ALERT_QUICK_ACCESS.TIMEOUTS.DATABASE_QUERY,           // 5000ms
  RETRY_COUNT: ALERT_QUICK_ACCESS.RETRIES.STANDARD,                      // 3
  NAME_MAX_LENGTH: ALERT_QUICK_ACCESS.STRING_LENGTHS.NAME_MAX,           // 100
  DESCRIPTION_MAX_LENGTH: ALERT_QUICK_ACCESS.STRING_LENGTHS.DESCRIPTION_MAX, // 500
  operator: VALID_OPERATORS[0],                                          // '>'
  duration: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE,                    // 60
  severity: AlertSeverity.MEDIUM,                                        // 'medium'
  enabled: true,                                                         // true
  cooldown: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,                     // 300
});

// ================================
// 常量验证和工具
// ================================

/**
 * 常量验证工具
 * 🎯 验证新架构的完整性和一致性
 */
export class AlertConstantsValidator {
  /**
   * 验证所有常量的完整性
   */
  static validateAll(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证基础数值
    const baseValidation = BaseValueValidator.validateConsistency();
    if (!baseValidation.isValid) {
      errors.push(...baseValidation.errors.map(e => `基础数值: ${e}`));
    }

    // 验证语义映射
    const semanticValidation = SemanticMappingValidator.validateMappings();
    if (!semanticValidation.isValid) {
      errors.push(...semanticValidation.errors.map(e => `语义映射: ${e}`));
    }

    // 验证业务配置
    const businessValidation = BusinessConfigUtil.validateConfiguration();
    if (!businessValidation.isValid) {
      errors.push(...businessValidation.errors.map(e => `业务配置: ${e}`));
    }

    // 验证快捷访问的一致性
    const quickAccessValidation = this.validateQuickAccess();
    if (!quickAccessValidation.isValid) {
      errors.push(...quickAccessValidation.errors.map(e => `快捷访问: ${e}`));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证快捷访问的一致性
   */
  private static validateQuickAccess(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证快捷访问的时间值是否与基础值一致
    if (ALERT_QUICK_ACCESS.TIME.INSTANT !== BASE_VALUES.SECONDS.INSTANT) {
      errors.push('快捷访问的INSTANT时间值不一致');
    }

    if (ALERT_QUICK_ACCESS.TIME.QUICK_RESPONSE !== BASE_VALUES.SECONDS.QUICK) {
      errors.push('快捷访问的QUICK_RESPONSE时间值不一致');
    }

    if (ALERT_QUICK_ACCESS.TIME.NORMAL_RESPONSE !== BASE_VALUES.SECONDS.SHORT) {
      errors.push('快捷访问的NORMAL_RESPONSE时间值不一致');
    }

    // 验证快捷访问的数量值是否与基础值一致
    if (ALERT_QUICK_ACCESS.LIMITS.ACTIONS_PER_RULE !== BASE_VALUES.QUANTITIES.FEW) {
      errors.push('快捷访问的ACTIONS_PER_RULE数量值不一致');
    }

    if (ALERT_QUICK_ACCESS.LIMITS.CONDITIONS_PER_RULE !== BASE_VALUES.QUANTITIES.SMALL) {
      errors.push('快捷访问的CONDITIONS_PER_RULE数量值不一致');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成完整的常量报告
   */
  static generateReport(): string {
    const validation = this.validateAll();
    const baseStats = BaseValueValidator.getSummary();
    const semanticStats = SemanticMappingValidator.generateReport();
    const businessStats = BusinessConfigUtil.getConfigurationSummary();

    return `
🔍 Alert常量系统完整性报告（清洁版）
========================================

📊 架构概览:
- 三层架构: 基础数值 → 语义映射 → 业务配置
- 快捷访问: ${Object.keys(ALERT_QUICK_ACCESS).length}个分类
- 配置预设: ${Object.keys(ALERT_CONFIG_PRESETS).length}个预设组
- 环境配置: ${Object.keys(ALERT_ENV_CONFIG).length}个环境

✅ 验证结果: ${validation.isValid ? '全部通过' : '发现问题'}
${validation.errors.length > 0 ? `\n❌ 错误列表:\n${validation.errors.map(e => `  - ${e}`).join('\n')}` : ''}

📈 统计信息:
${baseStats}

${semanticStats}

${businessStats}

🎯 清洁架构特点:
- 无向后兼容负担
- 单一数值来源
- 三层职责清晰
- 完整类型支持
- 验证工具完善
`;
  }
}

// ================================
// 工具函数导出
// ================================

/**
 * 根据环境获取配置
 */
export function getAlertConfigForEnvironment(env: 'development' | 'test' | 'production') {
  const baseConfig = BusinessConfigUtil.getEnvironmentConfig(env);
  const envConfig = ALERT_ENV_CONFIG[env.toUpperCase() as keyof typeof ALERT_ENV_CONFIG];
  
  return {
    ...baseConfig,
    ...envConfig,
  };
}

/**
 * 获取预设配置
 */
export function getAlertPresetConfig(
  type: 'RULE' | 'NOTIFICATION' | 'PERFORMANCE',
  preset: string
) {
  const presets = ALERT_CONFIG_PRESETS[`${type}_PRESETS` as keyof typeof ALERT_CONFIG_PRESETS];
  return (presets as any)[preset] || null;
}

/**
 * 验证常量系统
 */
export function validateAlertConstants() {
  return AlertConstantsValidator.validateAll();
}

/**
 * 生成常量系统报告
 */
export function generateAlertConstantsReport() {
  return AlertConstantsValidator.generateReport();
}

// ================================
// 默认导出（新架构）
// ================================

export default {
  // 快捷访问
  ...ALERT_QUICK_ACCESS,
  
  // 三层架构
  BASE_VALUES,
  SEMANTIC_VALUES,
  ALERT_BUSINESS_CONFIG,
  
  // 工具类
  BaseValueValidator,
  SemanticMappingValidator,
  BusinessConfigUtil,
  AlertConstantsValidator,
  
  // 工具函数
  getAlertConfigForEnvironment,
  getAlertPresetConfig,
  validateAlertConstants,
  generateAlertConstantsReport,
};