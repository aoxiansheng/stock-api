/**
 * Cache 验证装饰器
 * 🎯 提供Cache专用的验证装饰器，复用Common组件的验证逻辑
 * ✅ 替代手动验证方法，符合NestJS最佳实践
 * 🔄 与GlobalExceptionFilter统一异常处理
 *
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

// 🎯 使用 Cache 模块内部的验证常量
import { CACHE_VALIDATION_LIMITS } from "../constants/validation.constants";
import { REDIS_KEY_CONSTRAINTS } from "@common/constants/domain/redis-specific.constants";

/**
 * 配置迁移注释:
 * 🔄 缓存验证装饰器配置迁移
 *
 * 迁移目标:
 * - CACHE_VALIDATION_LIMITS.TTL_MIN_SECONDS → commonConstantsConfig.cache.minTtlSeconds
 * - CACHE_VALIDATION_LIMITS.TTL_MAX_SECONDS → commonConstantsConfig.cache.maxTtlSeconds
 * - CACHE_VALIDATION_LIMITS.CACHE_KEY_MAX_LENGTH → commonConstantsConfig.cache.maxKeyLength
 *
 * 装饰器重构将在Phase 3完成，使用注入的配置服务
 **/

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
        message: `缓存键必须符合Redis键规范：长度1-${REDIS_KEY_CONSTRAINTS.MAX_KEY_LENGTH}字符，不含空格和特殊字符`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (
            value.length === 0 ||
            value.length > REDIS_KEY_CONSTRAINTS.MAX_KEY_LENGTH
          ) {
            return false;
          }

          // Redis键格式检查：使用通用Redis常量
          if (REDIS_KEY_CONSTRAINTS.INVALID_CHARS_PATTERN.test(value)) {
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
        message: `缓存TTL必须在 ${CACHE_VALIDATION_LIMITS.TTL_MIN_SECONDS} 到 ${CACHE_VALIDATION_LIMITS.TTL_MAX_SECONDS} 秒之间`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "number") {
            return false;
          }

          // 基本范围检查：使用通用缓存常量
          if (
            value < CACHE_VALIDATION_LIMITS.TTL_MIN_SECONDS ||
            value > CACHE_VALIDATION_LIMITS.TTL_MAX_SECONDS
          ) {
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

// 🎯 Phase 2.5: Cache专用验证常量已迁移到通用常量系统
// ✅ CACHE_VALIDATION_LIMITS 现在从 @common/constants/validation.constants 导入
// ✅ REDIS_KEY_CONSTRAINTS 现在从 @common/constants/domain/redis-specific.constants 导入
// ✅ 消除了常量重复定义，复用通用组件库
