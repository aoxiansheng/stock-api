/**
 * 通用验证常量
 * 🎯 提供跨模块共享的验证限制常量
 *
 * @description 从Alert模块迁移出的通用验证常量，避免模块间硬依赖
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

/**
 * ❌ 基础时间常量已迁移到统一TTL配置
 * 🎯 这些是可调节的时间参数，不应作为常量
 *
 * @deprecated 使用 @appcore/config/unified-ttl.config.ts 替代
 * - COOLDOWN_PERIOD: 300 → unifiedTtl.defaultTtl
 * - BATCH_OPERATION: 3600 → unifiedTtl.transformerResultTtl
 */
// 时间常量已迁移到配置文件

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
 * ❌ 超时常量已迁移到通用配置
 * 🎯 这些是可调节的性能参数，不应作为常量
 *
 * @deprecated 使用 @common/config/common-constants.config.ts 替代
 */
// 超时常量已迁移到配置文件

/**
 * ❌ 重试限制已迁移到通用配置
 * 🎯 这些是可调节的网络参数，不应作为常量
 *
 * @deprecated 使用 @common/config/common-constants.config.ts 替代
 */
// 重试限制已迁移到配置文件

/**
 * 通用验证限制常量
 * 替代Alert模块的VALIDATION_LIMITS，供所有模块使用
 */
export const VALIDATION_LIMITS = Object.freeze({
  // 字符串长度限制
  NAME_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX, // 100
  DESCRIPTION_MAX_LENGTH: BASE_STRING_LENGTHS.DESCRIPTION_MAX, // 500
  TAG_MAX_LENGTH: BASE_STRING_LENGTHS.TAG_MAX, // 50
  COMMENT_MAX_LENGTH: BASE_STRING_LENGTHS.COMMENT_MAX, // 200
  URL_MAX_LENGTH: BASE_STRING_LENGTHS.URL_MAX, // 2083
  EMAIL_MAX_LENGTH: BASE_STRING_LENGTHS.EMAIL_MAX, // 254

  // 数量限制
  CONDITIONS_PER_RULE: BASE_QUANTITIES.SMALL_BATCH, // 10
  ACTIONS_PER_RULE: BASE_QUANTITIES.MINIMAL * 5, // 5
  RULES_PER_USER: BASE_QUANTITIES.LARGE_BATCH, // 100
  CHANNELS_PER_RULE: BASE_QUANTITIES.SMALL_BATCH, // 10

  // ⚠️ 临时保留：向后兼容（TODO: 迁移引用后删除）
  DURATION_MIN: 30, // 30秒 - 最小持续时间
  DURATION_MAX: 600, // 600秒 - 最大持续时间
  COOLDOWN_MIN: 60, // 60秒 - 最小冷却时间
  COOLDOWN_MAX: 3000, // 3000秒 - 最大冷却时间

  // ⚠️ Alert DTO所需的重试和超时验证常量（临时保留）
  RETRIES_MIN: 0, // 0次 - 最小重试次数
  RETRIES_MAX: 10, // 10次 - 最大重试次数
  TIMEOUT_MIN: 1000, // 1000毫秒 - 最小超时时间
  TIMEOUT_MAX: 60000, // 60000毫秒 - 最大超时时间

  // ❌ 其他时间、超时、重试限制已迁移到配置文件
  // 🎯 这些参数现在从配置服务获取，不再作为常量定义

  /**
   * @deprecated 超时限制已迁移到 @common/config/common-constants.config.ts
   * @deprecated 重试限制已迁移到 @common/config/common-constants.config.ts
   */
  // HTTP_TIMEOUT_MIN, HTTP_TIMEOUT_MAX → 通用配置
  // RETRIES_DEFAULT → 通用配置
});

/**
 * 缓存相关验证限制
 * 🎯 Phase 2.3: 从 Cache 模块迁移的缓存专用验证常量
 * 专门针对缓存模块的验证常量
 */
export const CACHE_VALIDATION_LIMITS = Object.freeze({
  // Redis 键格式限制（Cache 特有）
  CACHE_KEY_MAX_LENGTH: 250, // Redis键最大长度限制
  
  // TTL 限制（复用通用系统）
  TTL_MIN_SECONDS: 1, // 最小1秒TTL
  TTL_MAX_SECONDS: 7 * 24 * 3600, // 最妒7天TTL (604800秒)
  
  // 批量操作限制（复用通用系统）
  BATCH_MAX_SIZE: 1000, // 最大批量操作大小（复用 OPERATION_LIMITS.BATCH_SIZES.LARGE_BATCH）
});

/**
 * 通知相关验证限制
 * 专门针对通知模块的验证常量
 */
export const NOTIFICATION_VALIDATION_LIMITS = Object.freeze({
  // 通知内容限制
  TITLE_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX * 2, // 200
  CONTENT_MAX_LENGTH: BASE_STRING_LENGTHS.DESCRIPTION_MAX * 4, // 2000
  CONTENT_MAX_LENGTH_EXTENDED: 10000, // 10000 - 针对通知模块的扩展内容长度（保持兼容性）

  // 通知渠道限制
  CHANNEL_NAME_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX, // 100
  WEBHOOK_URL_MAX_LENGTH: BASE_STRING_LENGTHS.URL_MAX, // 2083
  EMAIL_MAX_LENGTH: BASE_STRING_LENGTHS.EMAIL_MAX, // 254
  EMAIL_SUBJECT_MAX_LENGTH: BASE_STRING_LENGTHS.NAME_MAX, // 100

  // 🆕 补充缺失的通知特有限制（从notification模块迁移）
  MAX_RECIPIENTS: BASE_QUANTITIES.LARGE_BATCH, // 100 - 最大接收者数量
  MAX_TAGS: BASE_QUANTITIES.SMALL_BATCH * 2, // 20 - 最大标签数量
  MAX_BATCH_SIZE: BASE_QUANTITIES.MEDIUM_BATCH, // 50 - 最大批量操作大小
  PHONE_MAX_LENGTH: 20, // 20 - 手机号最大长度

  // ❌ 批量、超时、重试配置已迁移到通知组件配置

  /**
   * @deprecated 批量配置已迁移到 @notification/config/notification.config.ts
   * @deprecated 超时配置已迁移到 @notification/config/notification.config.ts
   * @deprecated 重试配置已迁移到 @notification/config/notification.config.ts
   */
  // BATCH_SIZE_MIN, BATCH_SIZE_MAX → 通知配置
  // SEND_TIMEOUT_MIN, SEND_TIMEOUT_MAX, SEND_TIMEOUT_DEFAULT → 通知配置
  // SEND_RETRIES_MIN, SEND_RETRIES_MAX, SEND_RETRIES_DEFAULT → 通知配置
});

/**
 * 验证工具类
 * ✅ 保留 - 这是真正的通用工具类，不依赖可配置参数
 */
export class ValidationLimitsUtil {
  /**
   * 验证字符串长度
   */
  static validateStringLength(
    value: string,
    maxLength: number,
    fieldName: string = "field",
  ): { valid: boolean; error?: string } {
    if (value.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${maxLength} 个字符，当前长度: ${value.length}`,
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
    fieldName: string = "field",
  ): { valid: boolean; error?: string } {
    if (value < min || value > max) {
      return {
        valid: false,
        error: `${fieldName} 必须在 ${min} 到 ${max} 之间，当前值: ${value}`,
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
    fieldName: string = "array",
  ): { valid: boolean; error?: string } {
    if (array.length > maxLength) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${maxLength} 个元素，当前长度: ${array.length}`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证邮箱格式（复用验证器逻辑）
   * 🎯 提供编程式邮箱验证，复用装饰器中的验证逻辑
   */
  static validateEmailFormat(
    email: string,
    fieldName: string = "邮箱"
  ): { valid: boolean; error?: string } {
    if (!email || typeof email !== "string") {
      return {
        valid: false,
        error: `${fieldName} 必须是有效的字符串`,
      };
    }

    // 邮箱格式正则表达式（与 @IsValidEmail 装饰器保持一致）
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // 基本格式验证
    if (!emailPattern.test(email)) {
      return {
        valid: false,
        error: `${fieldName} 格式不正确: ${email}`,
      };
    }

    // 长度限制
    if (email.length > BASE_STRING_LENGTHS.EMAIL_MAX) {
      return {
        valid: false,
        error: `${fieldName} 长度不能超过 ${BASE_STRING_LENGTHS.EMAIL_MAX} 个字符，当前长度: ${email.length}`,
      };
    }

    // 本地部分长度限制（@符号前）
    const localPart = email.split("@")[0];
    if (localPart.length > 64) {
      return {
        valid: false,
        error: `${fieldName} 本地部分长度不能超过 64 个字符`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证URL格式（复用验证器逻辑）
   * 🎯 提供编程式URL验证，复用装饰器中的验证逻辑
   */  
  static validateUrlFormat(
    url: string,
    fieldName: string = "URL"
  ): { valid: boolean; error?: string } {
    if (!url || typeof url !== "string") {
      return {
        valid: false,
        error: `${fieldName} 必须是有效的字符串`,
      };
    }

    try {
      const urlObj = new URL(url);

      // 只允许HTTP和HTTPS协议（与 @IsValidUrl 装饰器保持一致）
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return {
          valid: false,
          error: `${fieldName} 只支持 HTTP 或 HTTPS 协议: ${url}`,
        };
      }

      // 检查主机名
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return {
          valid: false,
          error: `${fieldName} 缺少有效主机名: ${url}`,
        };
      }

      // URL长度限制
      if (url.length > BASE_STRING_LENGTHS.URL_MAX) {
        return {
          valid: false,
          error: `${fieldName} 长度不能超过 ${BASE_STRING_LENGTHS.URL_MAX} 个字符，当前长度: ${url.length}`,
        };
      }

      // 基本格式验证（与 @IsValidUrl 装饰器保持一致）
      const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?$/;
      if (!urlPattern.test(url)) {
        return {
          valid: false,
          error: `${fieldName} 格式不正确: ${url}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `${fieldName} 格式不正确: ${url}`,
      };
    }
  }
}
