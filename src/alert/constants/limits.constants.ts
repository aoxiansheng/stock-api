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
  MAX_ACTIONS_PER_RULE: 5, // 5个 - 单规则最大动作数
  MAX_TAGS_PER_ENTITY: 10, // 10个 - 单实体最大标签数
} as const;

// ❌ 删除：字符串长度限制（已在@common/constants/validation.constants.ts）
// export const STRING_LIMITS = { ... };  // 删除整个对象

/**
 * 重试配置
 * 各类操作的重试次数限制
 */
export const RETRY_LIMITS = {
  // 基础重试
  MINIMAL_RETRIES: 1, // 1次 - 轻量操作重试
  STANDARD_RETRIES: 3, // 3次 - 标准操作重试
  CRITICAL_RETRIES: 5, // 5次 - 关键操作重试
  MAX_RETRIES: 10, // 10次 - 最大允许重试

  // 具体场景
  DATABASE_RETRIES: 3, // 3次 - 数据库操作重试
  API_RETRIES: 3, // 3次 - API调用重试
  NOTIFICATION_RETRIES: 5, // 5次 - 通知发送重试
  VALIDATION_RETRIES: 1, // 1次 - 验证操作重试
} as const;

// 类型定义
export type RuleLimits = typeof RULE_LIMITS;
export type RetryLimits = typeof RETRY_LIMITS;
