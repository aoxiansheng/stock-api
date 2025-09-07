/**
 * 验证规则领域常量
 * 🎯 领域层 - DTO验证相关的业务常量
 * 🔍 基于核心层构建，专注于数据验证逻辑
 */

import { CORE_LIMITS } from '../core/limits.constants';
import { CORE_TIMEOUTS } from '../core/timeouts.constants';

/**
 * 验证限制常量
 * 统一管理所有DTO验证装饰器中使用的数值限制
 */
export const VALIDATION_LIMITS = Object.freeze({
  /**
   * 时间相关验证限制 (秒)
   */
  TIME_SECONDS: {
    // 持续时间限制
    DURATION_MIN: CORE_LIMITS.TIME_SECONDS.DURATION_MIN,               // 1秒
    DURATION_MAX: CORE_LIMITS.TIME_SECONDS.DURATION_MAX,               // 3600秒
    
    // 冷却时间限制  
    COOLDOWN_MIN: CORE_LIMITS.TIME_SECONDS.COOLDOWN_MIN,               // 60秒
    COOLDOWN_MAX: CORE_LIMITS.TIME_SECONDS.COOLDOWN_MAX,               // 86400秒
    
    // 超时时间限制
    TIMEOUT_MIN: CORE_LIMITS.TIME_SECONDS.TIMEOUT_MIN,                 // 1秒
    TIMEOUT_MAX: CORE_LIMITS.TIME_SECONDS.TIMEOUT_MAX,                 // 300秒
  },

  /**
   * 计数和重试相关验证限制
   */
  COUNT_LIMITS: {
    // 重试次数限制
    RETRIES_MIN: CORE_LIMITS.RETRY_LIMITS.MIN_RETRIES,                 // 0次
    RETRIES_MAX: CORE_LIMITS.RETRY_LIMITS.MAX_RETRIES,                 // 10次
    
    // 百分比限制
    PERCENTAGE_MIN: CORE_LIMITS.NUMERIC_RANGE.PERCENTAGE_MIN,          // 1%
    PERCENTAGE_MAX: CORE_LIMITS.NUMERIC_RANGE.PERCENTAGE_MAX,          // 100%
    
    // 优先级限制
    PRIORITY_MIN: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,                 // 0
    PRIORITY_MAX: CORE_LIMITS.BATCH_LIMITS.SMALL_BATCH_SIZE,           // 50
  },

  /**
   * 字符串长度验证限制
   */
  STRING_LENGTH: {
    // 基础长度限制
    MIN_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,                  // 1
    
    // 不同用途的长度限制
    NAME_MAX: CORE_LIMITS.STRING_LENGTH.NAME_MAX,                      // 100
    TAG_MAX: CORE_LIMITS.STRING_LENGTH.TAG_MAX,                        // 50
    DESCRIPTION_MAX: CORE_LIMITS.STRING_LENGTH.DESCRIPTION_MAX,        // 500
    MESSAGE_MAX: CORE_LIMITS.STRING_LENGTH.MESSAGE_MAX,                // 1000
    TEMPLATE_MAX: CORE_LIMITS.STRING_LENGTH.TEMPLATE_MAX,              // 2000
    
    // 网络相关长度限制
    EMAIL_MAX: CORE_LIMITS.STRING_LENGTH.EMAIL_MAX,                    // 320
    URL_MAX: CORE_LIMITS.STRING_LENGTH.URL_MAX,                        // 2048
    FILENAME_MAX: CORE_LIMITS.STRING_LENGTH.FILENAME_MAX,              // 255
  },

  /**
   * 数值范围验证限制
   */
  NUMERIC_RANGE: {
    // 阈值范围
    THRESHOLD_MIN: CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MIN,            // 0
    THRESHOLD_MAX: CORE_LIMITS.NUMERIC_RANGE.THRESHOLD_MAX,            // MAX_SAFE_INTEGER
    
    // 通用数值范围
    MIN_VALUE: CORE_LIMITS.NUMERIC_RANGE.MIN_VALUE,                    // 0
    MAX_VALUE: CORE_LIMITS.NUMERIC_RANGE.MAX_VALUE,                    // MAX_SAFE_INTEGER
    
    // 计数范围
    COUNT_MIN: CORE_LIMITS.NUMERIC_RANGE.COUNT_MIN,                    // 0
    COUNT_MAX: CORE_LIMITS.NUMERIC_RANGE.COUNT_MAX,                    // MAX_SAFE_INTEGER
  },

  /**
   * 批量操作验证限制
   */
  BATCH_LIMITS: {
    // 分页限制
    PAGE_MIN: CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE,                // 1
    LIMIT_MIN: CORE_LIMITS.BATCH_LIMITS.TINY_BATCH_SIZE,               // 1
    LIMIT_MAX: CORE_LIMITS.STRING_LENGTH.NAME_MAX,                     // 100
    
    // 批量操作大小限制
    BATCH_SIZE_MAX: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE,       // 1000
    SMALL_BATCH_SIZE: CORE_LIMITS.BATCH_LIMITS.SMALL_BATCH_SIZE,       // 50
  },

  /**
   * 业务对象验证限制
   */
  OBJECT_LIMITS: {
    // 规则相关限制
    MAX_RULES_PER_USER: CORE_LIMITS.OBJECT_LIMITS.MAX_RULES_PER_USER,  // 100
    MAX_CONDITIONS_PER_RULE: CORE_LIMITS.OBJECT_LIMITS.MAX_CONDITIONS_PER_RULE, // 10
    MAX_ACTIONS_PER_RULE: CORE_LIMITS.OBJECT_LIMITS.MAX_ACTIONS_PER_RULE, // 5
    
    // 标签相关限制
    MAX_TAGS_COUNT: CORE_LIMITS.OBJECT_LIMITS.MAX_TAGS_COUNT,          // 10
    
    // 查询相关限制
    MAX_QUERY_LIMIT: CORE_LIMITS.OBJECT_LIMITS.MAX_QUERY_LIMIT,        // 100
  },

  /**
   * ID长度验证限制
   */
  ID_LENGTH: {
    MIN: CORE_LIMITS.ID_LENGTH.MIN,                                    // 1
    MAX: CORE_LIMITS.ID_LENGTH.MAX,                                    // 100
    TYPICAL_MIN: CORE_LIMITS.ID_LENGTH.TYPICAL_MIN,                    // 15
    TYPICAL_MAX: CORE_LIMITS.ID_LENGTH.TYPICAL_MAX,                    // 50
  },
});

/**
 * 验证消息模板常量
 */
export const VALIDATION_MESSAGES = Object.freeze({
  /**
   * 时间相关验证消息
   */
  TIME: {
    DURATION_RANGE: `持续时间必须在 ${VALIDATION_LIMITS.TIME_SECONDS.DURATION_MIN} 到 ${VALIDATION_LIMITS.TIME_SECONDS.DURATION_MAX} 秒之间`,
    COOLDOWN_RANGE: `冷却时间必须在 ${VALIDATION_LIMITS.TIME_SECONDS.COOLDOWN_MIN} 到 ${VALIDATION_LIMITS.TIME_SECONDS.COOLDOWN_MAX} 秒之间`,
    TIMEOUT_RANGE: `超时时间必须在 ${VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MIN} 到 ${VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MAX} 秒之间`,
  },

  /**
   * 计数相关验证消息
   */
  COUNT: {
    RETRIES_RANGE: `重试次数必须在 ${VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MIN} 到 ${VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MAX} 之间`,
    PERCENTAGE_RANGE: `百分比必须在 ${VALIDATION_LIMITS.COUNT_LIMITS.PERCENTAGE_MIN} 到 ${VALIDATION_LIMITS.COUNT_LIMITS.PERCENTAGE_MAX} 之间`,
    PRIORITY_RANGE: `优先级必须在 ${VALIDATION_LIMITS.COUNT_LIMITS.PRIORITY_MIN} 到 ${VALIDATION_LIMITS.COUNT_LIMITS.PRIORITY_MAX} 之间`,
  },

  /**
   * 字符串相关验证消息
   */
  STRING: {
    NAME_LENGTH: `名称长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.NAME_MAX} 个字符`,
    TAG_LENGTH: `标签长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.TAG_MAX} 个字符`,
    DESCRIPTION_LENGTH: `描述长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.DESCRIPTION_MAX} 个字符`,
    MESSAGE_LENGTH: `消息长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.MESSAGE_MAX} 个字符`,
    TEMPLATE_LENGTH: `模板长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.TEMPLATE_MAX} 个字符`,
    EMAIL_LENGTH: `邮箱长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.EMAIL_MAX} 个字符`,
    URL_LENGTH: `URL长度不能超过 ${VALIDATION_LIMITS.STRING_LENGTH.URL_MAX} 个字符`,
    NOT_EMPTY: '不能为空',
    MUST_BE_STRING: '必须是字符串类型',
  },

  /**
   * 数值相关验证消息
   */
  NUMERIC: {
    THRESHOLD_RANGE: `阈值必须在 ${VALIDATION_LIMITS.NUMERIC_RANGE.THRESHOLD_MIN} 到 ${VALIDATION_LIMITS.NUMERIC_RANGE.THRESHOLD_MAX} 之间`,
    MUST_BE_NUMBER: '必须是数字类型',
    MUST_BE_POSITIVE: '必须是正数',
    MUST_BE_NON_NEGATIVE: '必须是非负数',
    MUST_BE_INTEGER: '必须是整数',
  },

  /**
   * 批量操作相关验证消息
   */
  BATCH: {
    PAGE_MIN: `页码必须大于等于 ${VALIDATION_LIMITS.BATCH_LIMITS.PAGE_MIN}`,
    LIMIT_RANGE: `每页数量必须在 ${VALIDATION_LIMITS.BATCH_LIMITS.LIMIT_MIN} 到 ${VALIDATION_LIMITS.BATCH_LIMITS.LIMIT_MAX} 之间`,
    BATCH_SIZE_MAX: `批量操作大小不能超过 ${VALIDATION_LIMITS.BATCH_LIMITS.BATCH_SIZE_MAX}`,
  },

  /**
   * 业务对象相关验证消息
   */
  OBJECT: {
    MAX_RULES_PER_USER: `每个用户最多创建 ${VALIDATION_LIMITS.OBJECT_LIMITS.MAX_RULES_PER_USER} 个规则`,
    MAX_CONDITIONS_PER_RULE: `每个规则最多包含 ${VALIDATION_LIMITS.OBJECT_LIMITS.MAX_CONDITIONS_PER_RULE} 个条件`,
    MAX_ACTIONS_PER_RULE: `每个规则最多包含 ${VALIDATION_LIMITS.OBJECT_LIMITS.MAX_ACTIONS_PER_RULE} 个动作`,
    MAX_TAGS_COUNT: `最多包含 ${VALIDATION_LIMITS.OBJECT_LIMITS.MAX_TAGS_COUNT} 个标签`,
  },

  /**
   * ID相关验证消息
   */
  ID: {
    INVALID_FORMAT: '无效的ID格式',
    LENGTH_RANGE: `ID长度必须在 ${VALIDATION_LIMITS.ID_LENGTH.MIN} 到 ${VALIDATION_LIMITS.ID_LENGTH.MAX} 个字符之间`,
    TYPICAL_LENGTH_RANGE: `ID长度通常在 ${VALIDATION_LIMITS.ID_LENGTH.TYPICAL_MIN} 到 ${VALIDATION_LIMITS.ID_LENGTH.TYPICAL_MAX} 个字符之间`,
  },

  /**
   * 通用验证消息
   */
  COMMON: {
    REQUIRED: '此字段为必填项',
    INVALID_TYPE: '无效的数据类型',
    INVALID_FORMAT: '无效的格式',
    INVALID_VALUE: '无效的值',
    OUT_OF_RANGE: '超出有效范围',
  },
});

/**
 * 验证工具类
 */
export class ValidationUtil {
  /**
   * 验证持续时间
   */
  static isValidDuration(duration: number): boolean {
    return (
      typeof duration === 'number' &&
      Number.isFinite(duration) &&
      duration >= VALIDATION_LIMITS.TIME_SECONDS.DURATION_MIN &&
      duration <= VALIDATION_LIMITS.TIME_SECONDS.DURATION_MAX
    );
  }

  /**
   * 验证冷却时间
   */
  static isValidCooldown(cooldown: number): boolean {
    return (
      typeof cooldown === 'number' &&
      Number.isFinite(cooldown) &&
      cooldown >= VALIDATION_LIMITS.TIME_SECONDS.COOLDOWN_MIN &&
      cooldown <= VALIDATION_LIMITS.TIME_SECONDS.COOLDOWN_MAX
    );
  }

  /**
   * 验证超时时间
   */
  static isValidTimeout(timeout: number): boolean {
    return (
      typeof timeout === 'number' &&
      Number.isFinite(timeout) &&
      timeout >= VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MIN &&
      timeout <= VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MAX
    );
  }

  /**
   * 验证重试次数
   */
  static isValidRetryCount(retryCount: number): boolean {
    return (
      typeof retryCount === 'number' &&
      Number.isInteger(retryCount) &&
      retryCount >= VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MIN &&
      retryCount <= VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MAX
    );
  }

  /**
   * 验证百分比
   */
  static isValidPercentage(percentage: number): boolean {
    return (
      typeof percentage === 'number' &&
      Number.isFinite(percentage) &&
      percentage >= VALIDATION_LIMITS.COUNT_LIMITS.PERCENTAGE_MIN &&
      percentage <= VALIDATION_LIMITS.COUNT_LIMITS.PERCENTAGE_MAX
    );
  }

  /**
   * 验证名称长度
   */
  static isValidNameLength(name: string): boolean {
    return (
      typeof name === 'string' &&
      name.length >= VALIDATION_LIMITS.STRING_LENGTH.MIN_LENGTH &&
      name.length <= VALIDATION_LIMITS.STRING_LENGTH.NAME_MAX
    );
  }

  /**
   * 验证标签长度
   */
  static isValidTagLength(tag: string): boolean {
    return (
      typeof tag === 'string' &&
      tag.length >= VALIDATION_LIMITS.STRING_LENGTH.MIN_LENGTH &&
      tag.length <= VALIDATION_LIMITS.STRING_LENGTH.TAG_MAX
    );
  }

  /**
   * 验证消息长度
   */
  static isValidMessageLength(message: string): boolean {
    return (
      typeof message === 'string' &&
      message.length >= VALIDATION_LIMITS.STRING_LENGTH.MIN_LENGTH &&
      message.length <= VALIDATION_LIMITS.STRING_LENGTH.MESSAGE_MAX
    );
  }

  /**
   * 验证阈值
   */
  static isValidThreshold(threshold: number): boolean {
    return (
      typeof threshold === 'number' &&
      Number.isFinite(threshold) &&
      threshold >= VALIDATION_LIMITS.NUMERIC_RANGE.THRESHOLD_MIN &&
      threshold <= VALIDATION_LIMITS.NUMERIC_RANGE.THRESHOLD_MAX
    );
  }

  /**
   * 验证分页参数
   */
  static isValidPagination(page: number, limit: number): boolean {
    return (
      this.isValidPageNumber(page) &&
      this.isValidPageLimit(limit)
    );
  }

  /**
   * 验证页码
   */
  static isValidPageNumber(page: number): boolean {
    return (
      typeof page === 'number' &&
      Number.isInteger(page) &&
      page >= VALIDATION_LIMITS.BATCH_LIMITS.PAGE_MIN
    );
  }

  /**
   * 验证页面大小限制
   */
  static isValidPageLimit(limit: number): boolean {
    return (
      typeof limit === 'number' &&
      Number.isInteger(limit) &&
      limit >= VALIDATION_LIMITS.BATCH_LIMITS.LIMIT_MIN &&
      limit <= VALIDATION_LIMITS.BATCH_LIMITS.LIMIT_MAX
    );
  }

  /**
   * 验证批量操作大小
   */
  static isValidBatchSize(batchSize: number): boolean {
    return (
      typeof batchSize === 'number' &&
      Number.isInteger(batchSize) &&
      batchSize > 0 &&
      batchSize <= VALIDATION_LIMITS.BATCH_LIMITS.BATCH_SIZE_MAX
    );
  }

  /**
   * 生成验证错误消息
   */
  static getValidationMessage(field: string, messageKey: string): string {
    // 这里可以根据field和messageKey生成具体的验证错误消息
    return `字段 ${field}: ${messageKey}`;
  }

  /**
   * 验证对象的所有字段
   */
  static validateObject(obj: any, validationRules: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(validationRules)) {
      const value = obj[field];
      
      // 这里可以根据rules进行具体的验证
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field}: ${VALIDATION_MESSAGES.COMMON.REQUIRED}`);
      }
      
      // 可以添加更多验证逻辑
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 类型定义
 */
export type ValidationLimits = typeof VALIDATION_LIMITS;
export type ValidationMessages = typeof VALIDATION_MESSAGES;