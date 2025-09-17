/**
 * Cache 验证装饰器
 * 🎯 提供Cache专用的验证装饰器，复用Common组件的验证逻辑
 * ✅ 替代手动验证方法，符合NestJS最佳实践
 * 🔄 与GlobalExceptionFilter统一异常处理
 *
 * 🎯 Phase 2.3: 重构后只保留Cache特定的业务验证器
 * - 通用验证逻辑已迁移到 @common/validators
 * - 保留Cache业务特定的验证器
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { VALIDATION_LIMITS } from "@common/constants/validation.constants";
// 通用验证器现在由使用方直接导入，不在此文件中使用

/**
 * 验证Cache键格式和Redis兼容性
 * 🎯 Phase 2.3: 保留Cache特定的业务验证器
 * 包含Redis键的特定格式要求，不仅仅是长度限制
 */
export function IsValidCacheKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidCacheKey",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `缓存键必须符合Redis键规范：长度1-${CACHE_KEY_MAX_LENGTH}字符，不含空格和特殊字符`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (value.length === 0 || value.length > CACHE_KEY_MAX_LENGTH) {
            return false;
          }

          // Redis键格式检查：不包含空格和一些特殊字符
          const invalidChars = /[\s\r\n\t]/;
          if (invalidChars.test(value)) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

// 废弃的装饰器已删除
// 使用通用验证器：@IsValidStringLength 和 @MaxValueSize

/**
 * 验证Cache TTL值的业务规则
 * 🎯 Phase 2.3: 保留Cache特定的TTL业务验证
 * 包含Cache模块特定的TTL限制和业务规则
 */
export function IsValidCacheTTL(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidCacheTTL",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `缓存TTL必须在 ${TTL_MIN_SECONDS} 到 ${TTL_MAX_SECONDS} 秒之间`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "number") {
            return false;
          }

          // 基本范围检查
          if (value < TTL_MIN_SECONDS || value > TTL_MAX_SECONDS) {
            return false;
          }

          // Cache特定的业务规则：不允许负数，不允许0（除非明确为永不过期的-1）
          if (value === 0) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

// 废弃的装饰器已删除
// 使用通用验证器：@IsNumberInRange
// 使用明确命名：@IsValidCacheTTL

// Cache专用验证常量
// 复用Common组件限制，但为Cache模块特化
const CACHE_KEY_MAX_LENGTH = 250; // Redis键最大长度限制
const TTL_MIN_SECONDS = 1; // 最小1秒TTL
const TTL_MAX_SECONDS = 7 * 24 * 3600; // 最大7天TTL
const BATCH_MAX_SIZE = 1000; // 最大批量操作大小

// 导出常量供其他模块使用
export const CACHE_VALIDATION_LIMITS = Object.freeze({
  CACHE_KEY_MAX_LENGTH,
  TTL_MIN_SECONDS,
  TTL_MAX_SECONDS,
  BATCH_MAX_SIZE,
});
