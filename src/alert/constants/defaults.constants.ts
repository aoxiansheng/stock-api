/**
 * 告警系统默认值常量
 * 🎯 直观的默认配置，业务逻辑一目了然
 * 📊 基于实际使用场景的默认值设计
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 * @refactored 2025-01-10
 */

import { AlertSeverity } from './enums';

/**
 * 告警规则默认值
 * 创建新规则时使用的默认配置
 */
export const ALERT_DEFAULTS = {
  // 规则基础默认值
  operator: '>',                      // 默认操作符
  duration: 60,                       // 60秒 - 默认持续时间
  severity: AlertSeverity.MEDIUM,     // 'medium' - 默认严重程度
  enabled: true,                      // true - 默认启用
  cooldown: 300,                      // 300秒 - 默认冷却期
  
  // 容量默认值
  MAX_CONDITIONS: 10,                 // 10 - 最大条件数
  MAX_ACTIONS: 5,                     // 5 - 最大动作数
  BATCH_SIZE: 100,                    // 100 - 批量操作大小
  
  // 字符串长度默认值
  NAME_MAX_LENGTH: 100,               // 100 - 名称最大长度
  DESCRIPTION_MAX_LENGTH: 500,        // 500 - 描述最大长度
  
  // 超时默认值
  TIMEOUT_DEFAULT: 5000,              // 5000ms - 默认超时
  EVALUATION_INTERVAL: 60,            // 60秒 - 评估间隔
  COOLDOWN_PERIOD: 300,               // 300秒 - 冷却期
  
  // 重试默认值
  RETRY_COUNT: 3,                     // 3 - 默认重试次数
} as const;

/**
 * 配置预设组合
 * 常见业务场景的配置组合
 */
export const ALERT_CONFIG_PRESETS = {
  /**
   * 规则配置预设
   */
  RULE_PRESETS: {
    // 快速规则配置
    QUICK: {
      duration: 30,                     // 30秒
      cooldown: 300,                    // 300秒
      maxConditions: 3,                 // 3个
      maxActions: 2,                    // 2个
    },
    
    // 标准规则配置
    STANDARD: {
      duration: 60,                     // 60秒
      cooldown: 300,                    // 300秒
      maxConditions: 10,                // 10个
      maxActions: 5,                    // 5个
    },
    
    // 复杂规则配置
    COMPLEX: {
      duration: 120,                    // 120秒
      cooldown: 600,                    // 600秒
      maxConditions: 10,                // 10个
      maxActions: 5,                    // 5个
    },
  },

  /**
   * 通知配置预设
   */
  NOTIFICATION_PRESETS: {
    // 即时通知
    INSTANT: {
      timeout: 5000,                    // 5000ms
      retries: 5,                       // 5次
      channels: ['sms', 'webhook'],
    },
    
    // 标准通知
    STANDARD: {
      timeout: 30000,                   // 30000ms
      retries: 3,                       // 3次
      channels: ['email', 'in_app'],
    },
    
    // 批量通知
    BATCH: {
      timeout: 60000,                   // 60000ms
      retries: 1,                       // 1次
      batchSize: 50,                    // 50个
    },
  },

  /**
   * 性能配置预设
   */
  PERFORMANCE_PRESETS: {
    // 高性能配置
    HIGH_PERFORMANCE: {
      concurrency: 20,                  // 20个 - 最大并发
      batchSize: 1000,                  // 1000个
      timeout: 1000,                    // 1000ms
    },
    
    // 平衡配置
    BALANCED: {
      concurrency: 5,                   // 5个 - 默认并发
      batchSize: 100,                   // 100个
      timeout: 5000,                    // 5000ms
    },
    
    // 资源节约配置
    CONSERVATIVE: {
      concurrency: 3,                   // 3个
      batchSize: 50,                    // 50个
      timeout: 30000,                   // 30000ms
    },
  },
} as const;

/**
 * 环境特定配置
 * 不同环境的配置调整
 */
export const ALERT_ENV_CONFIG = {
  // 开发环境配置
  DEVELOPMENT: {
    cacheEnabled: false,                // false - 不启用缓存
    batchSize: 20,                      // 20个
    timeout: 1000,                      // 1000ms
    retentionDays: 7,                   // 7天
    logLevel: 'debug',
  },
  
  // 测试环境配置
  TEST: {
    cacheEnabled: false,                // false - 不启用缓存
    batchSize: 5,                       // 5个
    timeout: 1000,                      // 1000ms
    retentionDays: 1,                   // 1天
    logLevel: 'info',
  },
  
  // 生产环境配置
  PRODUCTION: {
    cacheEnabled: true,                 // true - 启用缓存
    batchSize: 1000,                    // 1000个
    timeout: 60000,                     // 60000ms
    retentionDays: 90,                  // 90天
    logLevel: 'warn',
  },
} as const;

// 类型定义
export type AlertDefaults = typeof ALERT_DEFAULTS;
export type AlertConfigPresets = typeof ALERT_CONFIG_PRESETS;
export type AlertEnvConfig = typeof ALERT_ENV_CONFIG;