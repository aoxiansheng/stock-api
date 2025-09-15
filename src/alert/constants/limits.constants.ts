/**
 * 告警系统容量和限制常量
 * 🎯 直观的容量配置，无需抽象层查找
 * 📊 基于业务需求的容量设计
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 * @refactored 2025-01-10
 */

/**
 * 告警规则容量限制
 * 规则相关的数量限制
 */
export const RULE_LIMITS = {
  // 固定规则内容限制（不可配置的业务常量）
  MAX_ACTIONS_PER_RULE: 5,          // 5个 - 单规则最大动作数
  MAX_TAGS_PER_ENTITY: 10,          // 10个 - 单实体最大标签数
  
  // 注意：可配置参数已迁移到 alert.config.ts 的 AlertLimitsConfig:
  // - MAX_CONDITIONS_PER_RULE → alert.config.ts:limits.maxConditionsPerRule
  // - MAX_RULES_PER_USER → alert.config.ts:limits.maxRulesPerUser  
  // - DEFAULT_PAGE_SIZE → alert.config.ts:limits.defaultPageSize
  // - MAX_QUERY_RESULTS → alert.config.ts:limits.maxQueryResults
} as const;

/**
 * 字符串长度限制
 * 各类字符串的最大长度限制
 */
export const STRING_LIMITS = {
  // 标识符长度
  TAG_MAX_LENGTH: 50,               // 50 - 标签最大长度
  NAME_MAX_LENGTH: 100,             // 100 - 名称最大长度
  IDENTIFIER_MAX_LENGTH: 50,        // 50 - 标识符最大长度
  
  // 内容长度
  DESCRIPTION_MAX_LENGTH: 500,      // 500 - 描述最大长度
  MESSAGE_MAX_LENGTH: 1000,         // 1000 - 消息最大长度
  COMMENT_MAX_LENGTH: 1000,         // 1000 - 评论最大长度
  
  // 模板和配置
  TEMPLATE_MAX_LENGTH: 10000,       // 10000 - 模板最大长度
  CONFIG_MAX_LENGTH: 10000,         // 10000 - 配置最大长度
  
  // 网络相关
  URL_MAX_LENGTH: 2048,             // 2048 - URL最大长度
  EMAIL_MAX_LENGTH: 320,            // 320 - 邮箱最大长度
  FILENAME_MAX_LENGTH: 255,         // 255 - 文件名最大长度
} as const;

/**
 * 重试配置
 * 各类操作的重试次数限制
 */
export const RETRY_LIMITS = {
  // 基础重试
  MINIMAL_RETRIES: 1,               // 1次 - 轻量操作重试
  STANDARD_RETRIES: 3,              // 3次 - 标准操作重试
  CRITICAL_RETRIES: 5,              // 5次 - 关键操作重试
  MAX_RETRIES: 10,                  // 10次 - 最大允许重试
  
  // 具体场景
  DATABASE_RETRIES: 3,              // 3次 - 数据库操作重试
  API_RETRIES: 3,                   // 3次 - API调用重试
  NOTIFICATION_RETRIES: 5,          // 5次 - 通知发送重试
  VALIDATION_RETRIES: 1,            // 1次 - 验证操作重试
} as const;

/**
 * 性能限制配置
 * 并发和性能相关的限制
 */
export const PERFORMANCE_LIMITS = {
  // 并发控制
  DEFAULT_CONCURRENCY: 5,           // 5个 - 默认并发数
  MAX_CONCURRENCY: 20,              // 20个 - 最大并发数
  QUEUE_SIZE_LIMIT: 100,            // 100个 - 队列大小限制
  
  // 连接池配置
  CONNECTION_POOL_SIZE: 10,         // 10个 - 连接池大小
  MAX_CONNECTION_POOL_SIZE: 20,     // 20个 - 最大连接池大小
  
  // 速率限制
  RATE_LIMIT_PER_MINUTE: 100,       // 100个 - 每分钟请求限制
  BURST_LIMIT: 20,                  // 20个 - 突发请求限制
  
  // 资源限制
  MAX_MEMORY_USAGE_MB: 1000,        // 1000MB - 最大内存使用
  MAX_CPU_USAGE_PERCENT: 100,       // 100% - 最大CPU使用率
} as const;

/**
 * 验证限制配置
 * DTO验证使用的限制值
 * 
 * ⚠️ 已迁移到 @common/constants/validation.constants.ts
 * 请使用: import { VALIDATION_LIMITS } from '@common/constants/validation.constants';
 */

// 类型定义
export type RuleLimits = typeof RULE_LIMITS;
export type StringLimits = typeof STRING_LIMITS;
export type RetryLimits = typeof RETRY_LIMITS;
export type PerformanceLimits = typeof PERFORMANCE_LIMITS;