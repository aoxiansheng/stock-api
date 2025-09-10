/**
 * 通用验证常量
 * 🎯 提供跨模块共享的验证限制常量
 * 
 * @description 从Alert模块迁移出的通用验证常量，避免模块间硬依赖
 * @author Claude Code Assistant 
 * @date 2025-09-10
 */

/**
 * 基础时间常量（秒）
 */
const BASE_TIME_SECONDS = {
  MINIMAL: 1,                    // 1秒
  QUICK_RESPONSE: 5,            // 5秒
  NORMAL_RESPONSE: 30,          // 30秒
  EVALUATION_CYCLE: 60,         // 60秒（1分钟）
  COOLDOWN_PERIOD: 300,         // 300秒（5分钟）
  BATCH_OPERATION: 3600,        // 3600秒（1小时）
  DAILY_PERIOD: 86400,          // 86400秒（24小时）
} as const;

/**
 * 基础数量限制
 */
const BASE_QUANTITIES = {
  MINIMAL: 1,
  SMALL_BATCH: 10,
  MEDIUM_BATCH: 50, 
  LARGE_BATCH: 100,
  MAX_BATCH: 1000,
} as const;

/**
 * 字符串长度限制
 */
const BASE_STRING_LENGTHS = {
  NAME_MAX: 100,
  DESCRIPTION_MAX: 500,
  TAG_MAX: 50,
  COMMENT_MAX: 200,
  URL_MAX: 2083,
  EMAIL_MAX: 254,
} as const;

/**
 * 超时时间常量（毫秒）
 */
const BASE_TIMEOUT_MS = {
  QUICK_VALIDATION: 1000,       // 1秒
  NORMAL_OPERATION: 5000,       // 5秒
  SLOW_OPERATION: 15000,        // 15秒
  BATCH_OPERATION: 60000,       // 1分钟
  EXTERNAL_API: 30000,          // 30秒
} as const;

/**
 * 重试次数限制
 */
const BASE_RETRY_LIMITS = {
  MINIMAL: 1,
  NORMAL: 3,
  AGGRESSIVE: 5,
  MAX_ALLOWED: 10,
} as const;

/**
 * 通用验证限制常量
 * 替代Alert模块的VALIDATION_LIMITS，供所有模块使用
 */
export const VALIDATION_LIMITS = Object.freeze({
  // 字符串长度限制
  NAME_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX,                    // 100
  DESCRIPTION_MAX_LENGTH: BASE_STRING_LENGTHS.DESCRIPTION_MAX,      // 500  
  TAG_MAX_LENGTH: BASE_STRING_LENGTHS.TAG_MAX,                     // 50
  COMMENT_MAX_LENGTH: BASE_STRING_LENGTHS.COMMENT_MAX,             // 200
  URL_MAX_LENGTH: BASE_STRING_LENGTHS.URL_MAX,                     // 2083
  EMAIL_MAX_LENGTH: BASE_STRING_LENGTHS.EMAIL_MAX,                 // 254
  
  // 数量限制
  CONDITIONS_PER_RULE: BASE_QUANTITIES.SMALL_BATCH,                // 10
  ACTIONS_PER_RULE: BASE_QUANTITIES.MINIMAL * 5,                   // 5
  RULES_PER_USER: BASE_QUANTITIES.LARGE_BATCH,                     // 100
  CHANNELS_PER_RULE: BASE_QUANTITIES.SMALL_BATCH,                  // 10
  
  // 时间限制（秒）
  DURATION_MIN: BASE_TIME_SECONDS.NORMAL_RESPONSE,                 // 30秒
  DURATION_MAX: BASE_TIME_SECONDS.EVALUATION_CYCLE * 10,           // 600秒
  COOLDOWN_MIN: BASE_TIME_SECONDS.COOLDOWN_PERIOD,                 // 300秒 (5分钟)
  COOLDOWN_MAX: BASE_TIME_SECONDS.COOLDOWN_PERIOD * 10,            // 3000秒 (50分钟)
  
  // 超时限制（毫秒）
  TIMEOUT_MIN: BASE_TIMEOUT_MS.QUICK_VALIDATION,                   // 1000ms
  TIMEOUT_MAX: BASE_TIMEOUT_MS.BATCH_OPERATION,                    // 60000ms
  HTTP_TIMEOUT_MIN: BASE_TIMEOUT_MS.NORMAL_OPERATION,              // 5000ms
  HTTP_TIMEOUT_MAX: BASE_TIMEOUT_MS.EXTERNAL_API,                  // 30000ms
  
  // 重试限制
  RETRIES_MIN: BASE_RETRY_LIMITS.MINIMAL,                          // 1次
  RETRIES_MAX: BASE_RETRY_LIMITS.MAX_ALLOWED,                      // 10次
  RETRIES_DEFAULT: BASE_RETRY_LIMITS.NORMAL,                       // 3次
});

/**
 * 通知相关验证限制
 * 专门针对通知模块的验证常量
 */
export const NOTIFICATION_VALIDATION_LIMITS = Object.freeze({
  // 通知内容限制
  TITLE_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX * 2,              // 200
  CONTENT_MAX_LENGTH: BASE_STRING_LENGTHS.DESCRIPTION_MAX * 4,     // 2000
  
  // 通知渠道限制
  CHANNEL_NAME_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX,           // 100
  WEBHOOK_URL_MAX_LENGTH: BASE_STRING_LENGTHS.URL_MAX,             // 2083
  EMAIL_SUBJECT_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX,          // 100
  
  // 批量通知限制
  BATCH_SIZE_MIN: BASE_QUANTITIES.MINIMAL,                        // 1
  BATCH_SIZE_MAX: BASE_QUANTITIES.MEDIUM_BATCH,                   // 50
  
  // 超时配置
  SEND_TIMEOUT_MIN: BASE_TIMEOUT_MS.NORMAL_OPERATION,              // 5000ms
  SEND_TIMEOUT_MAX: BASE_TIMEOUT_MS.EXTERNAL_API,                  // 30000ms
  SEND_TIMEOUT_DEFAULT: BASE_TIMEOUT_MS.SLOW_OPERATION,            // 15000ms
  
  // 重试配置
  SEND_RETRIES_MIN: BASE_RETRY_LIMITS.MINIMAL,                     // 1
  SEND_RETRIES_MAX: BASE_RETRY_LIMITS.NORMAL * 2,                  // 6
  SEND_RETRIES_DEFAULT: BASE_RETRY_LIMITS.NORMAL,                  // 3
});

/**
 * 验证工具类
 */
export class ValidationLimitsUtil {
  /**
   * 验证字符串长度
   */
  static validateStringLength(
    value: string, 
    maxLength: number, 
    fieldName: string = 'field'
  ): { valid: boolean; error?: string } {
    if (value.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${maxLength} 个字符，当前长度: ${value.length}`
      };
    }
    return { valid: true };
  }
  
  /**
   * 验证数值范围
   */
  static validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string = 'field'
  ): { valid: boolean; error?: string } {
    if (value < min || value > max) {
      return {
        valid: false,
        error: `${fieldName} 必须在 ${min} 到 ${max} 之间，当前值: ${value}`
      };
    }
    return { valid: true };
  }
  
  /**
   * 验证数组长度
   */
  static validateArrayLength(
    array: any[],
    maxLength: number,
    fieldName: string = 'array'
  ): { valid: boolean; error?: string } {
    if (array.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${maxLength} 个元素，当前长度: ${array.length}`
      };
    }
    return { valid: true };
  }
}